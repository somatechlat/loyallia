"""
Loyallia Customers API router.
Phase 5 implementation of customer + pass management endpoints.
"""

import logging

from django.http import HttpRequest, HttpResponse
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError
from ninja.files import UploadedFile

from apps.audit.models import AuditAction
from apps.audit.service import log_action
from apps.cards.models import Card
from apps.customers import services
from apps.customers.models import Customer
from apps.customers.schemas import (
    CustomerCreateIn,
    CustomerListOut,
    CustomerOut,
    CustomerPassOut,
    CustomerSearchOut,
    CustomerUpdateIn,
    MessageOut,
    ResendPassIn,
)
from common.messages import get_message
from common.permissions import is_manager_or_owner, is_owner, jwt_auth
from common.plan_enforcement import check_plan_limit, require_active_subscription
from common.rate_limit import check_rate_limit, get_client_ip
from common.request import require_tenant

logger = logging.getLogger(__name__)
router = Router()

# ENDPOINTS


@router.get("/", auth=jwt_auth, response=CustomerListOut, summary="Listar clientes")
@require_active_subscription
def list_customers(
    request: HttpRequest, search: str | None = None, limit: int = 50, offset: int = 0
) -> CustomerListOut:
    """List customers for the current tenant with optional search. MANAGER+ only."""
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    tenant = require_tenant(request)
    result = services.list_customers(tenant, search, limit, offset)

    log_action(
        request=request,
        action=AuditAction.READ,
        resource_type="customer_list",
        details={
            "search": search,
            "limit": limit,
            "offset": offset,
            "returned_count": len(result["customers"]),
        },
    )

    return {
        "customers": [CustomerOut.from_model(c) for c in result["customers"]],
        "total": result["total"],
    }


@router.get(
    "/search/",
    auth=jwt_auth,
    response=list[CustomerSearchOut],
    summary="Buscar clientes filtrados",
)
def search_customers(
    request: HttpRequest,
    query: str | None = None,
    program_ids: str | None = None,
    device_type: str | None = None,
    wallet_platform: str | None = None,
) -> list[CustomerSearchOut]:
    """Search customers with filters. MANAGER+ only. Max 50 results."""
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    tenant = require_tenant(request)
    results = services.search_customers(tenant, query, program_ids, device_type, wallet_platform)

    return [
        CustomerSearchOut(
            id=str(r["customer"].id),
            name=r["customer"].full_name,
            email=r["customer"].email,
            phone=r["customer"].phone,
            programs=r["programs"],
            wallet_platforms=r["wallet_platforms"],
        )
        for r in results
    ]


@router.post("/", auth=jwt_auth, response=CustomerOut, summary="Crear cliente")
def create_customer(request: HttpRequest, data: CustomerCreateIn) -> CustomerOut:
    """Create a customer for the current tenant. OWNER only."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    tenant = require_tenant(request)
    from apps.billing.models import Subscription

    subscription = Subscription.objects.filter(tenant=tenant).first()
    if not subscription or not subscription.is_access_allowed:
        raise HttpError(402, get_message("BILLING_PLAN_REQUIRED"))
    check_plan_limit(tenant, "customers", write=True)

    try:
        customer = services.create_customer(tenant, data.model_dump())
    except ValueError as exc:
        msg = str(exc)
        if msg == "CUSTOMER_DUPLICATE_EMAIL":
            raise HttpError(400, get_message("CUSTOMER_DUPLICATE_EMAIL"))
        raise HttpError(400, get_message("VALIDATION_ERROR", detail=msg))

    log_action(
        request=request,
        action=AuditAction.CREATE,
        resource_type="customer",
        resource_id=str(customer.id),
        details={"email": customer.email},
    )
    return CustomerOut.from_model(customer)


@router.post(
    "/import/", auth=jwt_auth, summary="Importar clientes desde archivo (XLSX, CSV)"
)
def import_customers(request: HttpRequest, file: UploadedFile) -> dict:
    """
    Import customers from an Excel or CSV file. OWNER only.
    Delegates processing to CustomerImportService.
    """
    tenant = require_tenant(request)
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    from apps.billing.models import Subscription

    subscription = Subscription.objects.filter(tenant=tenant).first()
    if not subscription or not subscription.is_access_allowed:
        raise HttpError(402, get_message("BILLING_PLAN_REQUIRED"))
    check_plan_limit(tenant, "customers", write=True)

    from apps.customers.import_service import CustomerImportService

    # SECURITY HARDENING: Prevent OOM (Memory Exhaustion) Attacks
    if file.size is None or file.size > CustomerImportService.MAX_FILE_SIZE:
        max_mb = CustomerImportService.MAX_FILE_SIZE // (1024 * 1024)
        raise HttpError(
            413,
            get_message(
                "VALIDATION_FILE_TOO_LARGE",
                max_mb=max_mb,
            ),
        )

    service = CustomerImportService(tenant)
    result = service.process_import(file.file, file.name or "")

    if not result.get("success", False):
        raise HttpError(400, result.get("error", get_message("SERVER_ERROR")))

    log_action(
        request=request,
        action=AuditAction.IMPORT,
        resource_type="customer_database",
        details={
            "imported": result["imported"],
            "skipped_duplicate": result["skipped_duplicate"],
            "skipped_invalid": result["skipped_invalid"],
        },
    )

    return result


@router.post("/enroll/", response=CustomerPassOut, summary="Auto-inscripcion de cliente")
def enroll_customer_public(
    request: HttpRequest, card_id: str, customer_data: CustomerCreateIn
) -> CustomerPassOut:
    """Public endpoint for customer self-enrollment via QR code scan.

    Rate limited to 10 enrollments per hour per IP address.
    Does NOT overwrite existing customer profile data — only creates/updates the pass.
    """

    # Rate limiting: 10 per hour per IP (atomic via Redis/Cache INCR)
    client_ip = get_client_ip(request)
    cache_key = f"enroll_rate:{client_ip}"
    allowed, _ = check_rate_limit(cache_key, max_requests=10, window_seconds=3600)
    if not allowed:
        raise HttpError(429, get_message("RATE_LIMITED"))

    try:
        card = Card.objects.select_related("tenant").get(
            id=card_id, is_active=True, is_published=True, tenant__is_active=True
        )
    except Card.DoesNotExist:
        raise HttpError(404, get_message("PROGRAM_NOT_FOUND"))

    # Only enforce customer limit if tenant has an active subscription
    # Public enrollment should work during trial or for basic free tier
    from apps.billing.models import Subscription

    subscription = Subscription.objects.filter(tenant=card.tenant).first()
    if subscription and subscription.is_access_allowed:
        check_plan_limit(card.tenant, "customers", write=True)

    try:
        pass_obj, customer, already_enrolled = services.public_enroll(
            card, customer_data.model_dump()
        )
    except ValueError as exc:
        raise HttpError(400, get_message("VALIDATION_ERROR", detail=str(exc)))

    if already_enrolled:
        return CustomerPassOut.from_model(pass_obj, already_enrolled=True)

    log_action(
        request=request,
        action=AuditAction.CREATE,
        resource_type="enrollment",
        resource_id=str(pass_obj.id),
        details={
            "customer_id": str(customer.id),
            "card_id": str(card.id),
            "enrollment_method": "qr_scan",
            "is_new_customer": Customer.objects.filter(
                tenant=card.tenant, email=customer_data.email
            ).count()
            == 1,
        },
    )
    return CustomerPassOut.from_model(pass_obj)


@router.post("/resend-pass/", response=MessageOut, summary="Reenviar pase por email")
def resend_pass_email(request: HttpRequest, data: ResendPassIn) -> MessageOut:
    """Public endpoint to resend a customer's pass link via email.

    Used when a customer is already enrolled and wants to receive
    their pass link again (e.g., on a new device or after reinstall).

    Rate limited to 3 requests per email per hour.
    """
    email = data.email.strip().lower()
    allowed, _ = check_rate_limit(
        f"resend_pass_email:{email}", max_requests=3, window_seconds=3600
    )
    if not allowed:
        return MessageOut(success=False, message=get_message("RATE_LIMIT_EXCEEDED"))

    try:
        card = Card.objects.select_related("tenant").get(
            id=data.card_id, is_active=True, is_published=True, tenant__is_active=True
        )
    except Card.DoesNotExist:
        raise HttpError(404, get_message("PROGRAM_NOT_FOUND"))

    base_url = ""
    if hasattr(request, "build_absolute_uri"):
        base_url = request.build_absolute_uri("/").rstrip("/")
    else:
        from django.conf import settings

        from common.platform_config import get_platform_config

        base_url = get_platform_config(
            "public_base_url", getattr(settings, "PUBLIC_BASE_URL", "")
        )

    try:
        result = services.resend_pass_email(card, data.email, base_url)
    except ValueError as exc:
        msg = str(exc)
        if msg == "CUSTOMER_NOT_FOUND":
            raise HttpError(404, get_message("CUSTOMER_NOT_FOUND"))
        if msg == "PASS_NOT_FOUND":
            raise HttpError(404, get_message("PASS_NOT_FOUND"))
        raise HttpError(400, get_message("VALIDATION_ERROR", detail=msg))

    return MessageOut(
        success=True, message=get_message("PASS_RESENT", email=result["email"])
    )


# CUSTOMER CRUD


@router.get(
    "/{customer_id}/", auth=jwt_auth, response=CustomerOut, summary="Perfil del cliente"
)
def get_customer(request: HttpRequest, customer_id: str) -> CustomerOut:
    """Customer profile with pass and transaction history. MANAGER+ only."""
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    customer = get_object_or_404(
        Customer, id=customer_id, tenant=require_tenant(request)
    )

    log_action(
        request=request,
        action=AuditAction.READ,
        resource_type="customer",
        resource_id=str(customer.id),
        details={"email": customer.email},
    )

    return CustomerOut.from_model(customer)


@router.patch(
    "/{customer_id}/", auth=jwt_auth, response=CustomerOut, summary="Actualizar cliente"
)
@require_active_subscription
def update_customer(
    request: HttpRequest, customer_id: str, data: CustomerUpdateIn
) -> CustomerOut:
    """Update customer information. MANAGER+ can edit; OWNER only for hard delete."""
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    customer = get_object_or_404(
        Customer, id=customer_id, tenant=require_tenant(request)
    )

    customer, update_fields = services.update_customer(customer, data.model_dump())

    if update_fields:
        log_action(
            request=request,
            action=AuditAction.UPDATE,
            resource_type="customer",
            resource_id=str(customer.id),
            details={"updated_fields": update_fields},
        )

    return CustomerOut.from_model(customer)


@router.put(
    "/{customer_id}/", auth=jwt_auth, response=CustomerOut, summary="Actualizar cliente"
)
@require_active_subscription
def replace_customer(
    request: HttpRequest, customer_id: str, data: CustomerUpdateIn
) -> CustomerOut:
    """Compatibility alias for clients that send PUT for partial customer updates."""
    return update_customer(request, customer_id, data)


@router.delete(
    "/{customer_id}/", auth=jwt_auth, summary="Eliminar cliente permanentemente"
)
@require_active_subscription
def delete_customer(request: HttpRequest, customer_id: str) -> HttpResponse:
    """Permanent delete of a customer and all associated data. OWNER only."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    customer = get_object_or_404(
        Customer, id=customer_id, tenant=require_tenant(request)
    )

    log_action(
        request=request,
        action=AuditAction.DELETE,
        resource_type="customer",
        resource_id=str(customer.id),
        details={"email": customer.email},
    )

    services.delete_customer(customer)

    return HttpResponse(status=204)


@router.get(
    "/{customer_id}/passes/",
    auth=jwt_auth,
    response=list[CustomerPassOut],
    summary="Pases del cliente",
)
def get_customer_passes(
    request: HttpRequest, customer_id: str
) -> list[CustomerPassOut]:
    """Get all passes for a customer. MANAGER+ only."""
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    customer = get_object_or_404(
        Customer, id=customer_id, tenant=require_tenant(request)
    )
    passes = services.get_customer_passes(customer)
    return [CustomerPassOut.from_model(pass_obj) for pass_obj in passes]


@router.post(
    "/{customer_id}/enroll/",
    auth=jwt_auth,
    response=CustomerPassOut,
    summary="Inscribir cliente en programa",
)
def enroll_customer(
    request: HttpRequest, customer_id: str, card_id: str
) -> CustomerPassOut:
    """Enroll customer in a loyalty program. OWNER only."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    tenant = require_tenant(request)
    customer = get_object_or_404(Customer, id=customer_id, tenant=tenant)
    card = get_object_or_404(Card, id=card_id, tenant=tenant, is_active=True)

    try:
        pass_obj = services.enroll_customer(tenant, customer, card)
    except ValueError as exc:
        msg = str(exc)
        if msg == "ALREADY_ENROLLED":
            raise HttpError(400, get_message("ENROLLMENT_DUPLICATE", email=customer.email))
        raise HttpError(400, get_message("VALIDATION_ERROR", detail=msg))

    return CustomerPassOut.from_model(pass_obj)
