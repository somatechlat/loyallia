"""
Loyallia — Customers API router.
Phase 5 implementation of customer + pass management endpoints.
"""

import logging
from typing import Any

from django.db.models import Q
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError
from ninja.files import UploadedFile

from apps.audit.models import AuditAction
from apps.audit.service import log_action, log_data_export
from apps.cards.models import Card
from apps.customers.models import Customer, CustomerPass
from apps.customers.schemas import (
    CustomerCreateIn,
    CustomerListOut,
    CustomerOut,
    CustomerPassOut,
    CustomerUpdateIn,
)
from common.messages import get_message
from common.permissions import is_manager_or_owner, is_owner, jwt_auth
from common.plan_enforcement import enforce_limit, require_active_subscription
from common.rate_limit import get_client_ip
from common.request import require_tenant

logger = logging.getLogger(__name__)
router = Router()


# =============================================================================
# ENDPOINTS
# =============================================================================


@router.get("/", auth=jwt_auth, response=CustomerListOut, summary="Listar clientes")
@require_active_subscription
def list_customers(
    request, search: str | None = None, limit: int = 50, offset: int = 0
):
    """List customers for the current tenant with optional search. MANAGER+ only."""
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    tenant = require_tenant(request)
    queryset = Customer.objects.filter(tenant=tenant).select_related("tenant")

    if search:
        queryset = queryset.filter(
            Q(first_name__icontains=search)
            | Q(last_name__icontains=search)
            | Q(email__icontains=search)
            | Q(phone__icontains=search)
        )

    customers = queryset.order_by("-created_at")[offset : offset + limit]
    total = queryset.count()

    log_action(
        request=request,
        action=AuditAction.READ,
        resource_type="customer_list",
        details={
            "search": search,
            "limit": limit,
            "offset": offset,
            "returned_count": len(customers),
        },
    )

    return {"customers": [CustomerOut.from_model(c) for c in customers], "total": total}


@router.post("/", auth=jwt_auth, response=CustomerOut, summary="Crear cliente")
@require_active_subscription
@enforce_limit("customers")
def create_customer(request, data: CustomerCreateIn):
    """Create a customer for the current tenant. OWNER only."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    tenant = require_tenant(request)

    if Customer.objects.filter(tenant=tenant, email=data.email).exists():
        raise HttpError(400, get_message("CUSTOMER_DUPLICATE_EMAIL"))

    date_of_birth = None
    if data.date_of_birth:
        from django.utils.dateparse import parse_date

        date_of_birth = parse_date(data.date_of_birth)

    customer = Customer.objects.create(
        tenant=tenant,
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        phone=data.phone or "",
        date_of_birth=date_of_birth,
        gender=data.gender or "",
        notes=data.notes or "",
    )

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
@require_active_subscription
@enforce_limit("customers")
def import_customers(request, file: UploadedFile):
    """
    Import customers from an Excel or CSV file. OWNER only.
    Delegates processing to CustomerImportService.
    """
    tenant = require_tenant(request)
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    from apps.customers.import_service import CustomerImportService

    # SECURITY HARDENING: Prevent OOM (Memory Exhaustion) Attacks
    if file.size is None or file.size > CustomerImportService.MAX_FILE_SIZE:
        max_mb = CustomerImportService.MAX_FILE_SIZE // (1024 * 1024)
        raise HttpError(
            413,
            get_message(
                "VALIDATION_ERROR",
                detail=f"El archivo es demasiado grande (máx {max_mb}MB).",
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


@router.post(
    "/enroll/", response=CustomerPassOut, summary="Auto-inscripcion de cliente"
)
def enroll_customer_public(request, card_id: str, customer_data: CustomerCreateIn):
    """Public endpoint for customer self-enrollment via QR code scan.

    Rate limited to 10 enrollments per hour per IP address.
    Does NOT overwrite existing customer profile data — only creates/updates the pass.
    """
    from django.core.cache import cache

    # Rate limiting: 10 per hour per IP
    client_ip = get_client_ip(request)
    cache_key = f"enroll_rate:{client_ip}"
    enroll_count = cache.get(cache_key, 0)
    if enroll_count >= 10:
        raise HttpError(429, get_message("RATE_LIMITED"))
    cache.set(cache_key, enroll_count + 1, 3600)  # 1 hour TTL

    try:
        card = Card.objects.select_related("tenant").get(id=card_id, is_active=True)
    except Card.DoesNotExist:
        raise HttpError(404, get_message("PROGRAM_NOT_FOUND"))

    date_of_birth = None
    if customer_data.date_of_birth:
        from django.utils.dateparse import parse_date

        date_of_birth = parse_date(customer_data.date_of_birth)

    customer, created = Customer.objects.get_or_create(
        tenant=card.tenant,
        email=customer_data.email,
        defaults={
            "first_name": customer_data.first_name,
            "last_name": customer_data.last_name,
            "phone": customer_data.phone,
            "date_of_birth": date_of_birth,
            "gender": customer_data.gender,
            "notes": customer_data.notes,
        },
    )

    # SECURITY: Do NOT overwrite existing customer profile data on re-enrollment.
    # Only the pass (CustomerPass) is created/updated — customer fields stay as-is.

    existing_pass = CustomerPass.objects.filter(customer=customer, card=card).first()
    if existing_pass:
        raise HttpError(400, get_message("ENROLLMENT_DUPLICATE", email=customer.email))

    # Extract any dynamic extra fields from the Pydantic model
    standard_fields = {
        "first_name",
        "last_name",
        "email",
        "phone",
        "date_of_birth",
        "gender",
        "notes",
    }
    dynamic_fields = {
        k: v for k, v in customer_data.model_dump().items() if k not in standard_fields
    }

    pass_obj = CustomerPass.objects.create(customer=customer, card=card)

    # Store custom enrollment metadata in pass_data
    if dynamic_fields:
        pass_obj.update_pass_data({"enrollment_data": dynamic_fields})

    from apps.transactions.models import Enrollment

    Enrollment.objects.create(
        tenant=card.tenant, customer=customer, card=card, enrollment_method="qr_scan"
    )

    from apps.automation.engine import fire_trigger_async

    fire_trigger_async(
        trigger="customer_enrolled",
        customer_id=str(customer.id),
        context={
            "card_id": str(card.id),
            "card_type": card.card_type,
            "method": "qr_scan",
            "is_new_customer": created,
        },
    )

    from apps.customers.tasks import generate_qr_for_pass

    try:
        task_fn: Any = generate_qr_for_pass
        task_fn.delay(str(pass_obj.id))
    except Exception:
        logger.warning(
            "Could not queue QR generation task for pass %s",
            str(pass_obj.id),
            exc_info=True,
        )

    return CustomerPassOut.from_model(pass_obj)


# =============================================================================
# CUSTOMER CRUD
# =============================================================================


@router.get(
    "/{customer_id}/", auth=jwt_auth, response=CustomerOut, summary="Perfil del cliente"
)
def get_customer(request, customer_id: str):
    """Customer profile with pass and transaction history."""
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
def update_customer(request, customer_id: str, data: CustomerUpdateIn):
    """Update customer information. OWNER only."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    customer = get_object_or_404(
        Customer, id=customer_id, tenant=require_tenant(request)
    )

    update_fields = []
    if data.first_name is not None:
        customer.first_name = data.first_name
        update_fields.append("first_name")
    if data.last_name is not None:
        customer.last_name = data.last_name
        update_fields.append("last_name")
    if data.phone is not None:
        customer.phone = data.phone
        update_fields.append("phone")
    if data.date_of_birth is not None:
        from django.utils.dateparse import parse_date

        customer.date_of_birth = parse_date(data.date_of_birth)
        update_fields.append("date_of_birth")
    if data.gender is not None:
        customer.gender = data.gender
        update_fields.append("gender")
    if data.notes is not None:
        customer.notes = data.notes
        update_fields.append("notes")
    if data.is_active is not None:
        customer.is_active = data.is_active
        update_fields.append("is_active")
    if update_fields:
        customer.save(update_fields=update_fields + ["updated_at"])

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
def replace_customer(request, customer_id: str, data: CustomerUpdateIn):
    """Compatibility alias for clients that send PUT for partial customer updates."""
    return update_customer(request, customer_id, data)


@router.delete(
    "/{customer_id}/", auth=jwt_auth, summary="Eliminar cliente permanentemente"
)
@require_active_subscription
def delete_customer(request, customer_id: str):
    """Permanent delete of a customer and all associated data. OWNER only.
    LYL-M-API-023: Return 204 No Content on successful delete.
    """
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

    customer.delete()

    from django.http import HttpResponse

    return HttpResponse(status=204)


@router.get(
    "/{customer_id}/passes/",
    auth=jwt_auth,
    response=list[CustomerPassOut],
    summary="Pases del cliente",
)
def get_customer_passes(request, customer_id: str):
    """Get all passes for a customer."""
    customer = get_object_or_404(
        Customer, id=customer_id, tenant=require_tenant(request)
    )
    passes = CustomerPass.objects.filter(customer=customer).select_related("card")
    return [CustomerPassOut.from_model(pass_obj) for pass_obj in passes]


@router.post(
    "/{customer_id}/enroll/",
    auth=jwt_auth,
    response=CustomerPassOut,
    summary="Inscribir cliente en programa",
)
def enroll_customer(request, customer_id: str, card_id: str):
    """Enroll customer in a loyalty program. OWNER only."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    tenant = require_tenant(request)
    customer = get_object_or_404(Customer, id=customer_id, tenant=tenant)
    card = get_object_or_404(Card, id=card_id, tenant=tenant, is_active=True)

    if CustomerPass.objects.filter(customer=customer, card=card).exists():
        raise HttpError(400, get_message("ENROLLMENT_DUPLICATE", email=customer.email))

    pass_obj = CustomerPass.objects.create(customer=customer, card=card)

    from apps.transactions.models import Enrollment

    Enrollment.objects.create(
        tenant=tenant, customer=customer, card=card, enrollment_method="manual"
    )

    from apps.automation.engine import fire_trigger_async

    fire_trigger_async(
        trigger="customer_enrolled",
        customer_id=str(customer.id),
        context={
            "card_id": str(card.id),
            "card_type": card.card_type,
            "method": "manual",
        },
    )

    from apps.customers.tasks import generate_qr_for_pass

    try:
        task_fn: Any = generate_qr_for_pass
        task_fn.delay(str(pass_obj.id))
    except Exception:
        logger.warning(
            "Could not queue QR generation task for pass %s",
            str(pass_obj.id),
            exc_info=True,
        )

    return CustomerPassOut.from_model(pass_obj)


import csv

from django.http import HttpResponse


def _sanitize_csv_cell(value: str) -> str:
    """Sanitize a CSV cell value to prevent CSV injection attacks.
    Prefixes dangerous characters with a single quote."""
    if not value:
        return value
    value_str = str(value)
    if value_str and value_str[0] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + value_str
    return value_str


@router.get("/export/", auth=jwt_auth, summary="Exportar clientes a CSV")
def export_customers(request):
    """Export all customer data to CSV. OWNER only. Forensic tracking enabled."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    customers = Customer.objects.filter(tenant=require_tenant(request)).order_by(
        "created_at"
    )

    # LOPDP Forensic Audit Log
    log_data_export(
        request=request,
        resource_type="customer_database",
        record_count=customers.count(),
    )

    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="clientes_loyallia.csv"'

    writer = csv.writer(response)
    writer.writerow(
        [
            "ID",
            "Email",
            "Nombre",
            "Apellido",
            "Telefono",
            "Genero",
            "Fecha Nacimiento",
            "Gasto Total",
            "Visitas Totales",
            "Notas",
            "Registrado El",
        ]
    )

    for c in customers:
        writer.writerow(
            [
                _sanitize_csv_cell(str(c.id)),
                _sanitize_csv_cell(c.email),
                _sanitize_csv_cell(c.first_name),
                _sanitize_csv_cell(c.last_name),
                _sanitize_csv_cell(c.phone),
                _sanitize_csv_cell(c.gender),
                _sanitize_csv_cell(str(c.date_of_birth) if c.date_of_birth else ""),
                c.total_spent,
                c.total_visits,
                _sanitize_csv_cell(c.notes),
                _sanitize_csv_cell(c.created_at.strftime("%Y-%m-%d %H:%M:%S")),
            ]
        )

    return response
