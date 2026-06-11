"""
Loyallia Customer Self-Service Portal API

Public endpoints for customers to manage their own data:
- Generate password (login by email)
- Login with password
- View all my cards across all businesses
- Disenroll from a program
- Export my personal data
- Delete my personal data
- Delete my account
"""

import logging
import secrets
from typing import Any

from django.db import transaction
from django.http import HttpRequest
from ninja import Router, Schema
from ninja.errors import HttpError

from apps.customers.models import Customer, CustomerPass, CustomerPortalAccount
from apps.customers.portal_auth import (
    create_customer_access_token,
    portal_auth,
)
from apps.customers.services.portal_email import send_portal_password_email
from common.messages import get_message, get_message_for_request
from common.rate_limit import check_rate_limit
from django.conf import settings

logger = logging.getLogger(__name__)
router = Router()

# Schemas


class GeneratePasswordIn(Schema):
    email: str


class GeneratePasswordOut(Schema):
    success: bool
    message: str


class PortalLoginIn(Schema):
    email: str
    password: str


class PortalLoginOut(Schema):
    success: bool
    access_token: str = ""
    refresh_token: str = ""
    message: str = ""


class PortalPassOut(Schema):
    pass_id: str
    card_id: str
    card_name: str
    card_type: str
    tenant_name: str
    qr_code: str
    is_active: bool
    enrolled_at: str
    balance_display: str = ""


class PortalPassListOut(Schema):
    passes: list[PortalPassOut]


class PortalDisenrollIn(Schema):
    pass_id: str


class PortalDisenrollOut(Schema):
    success: bool
    message: str


class PortalExportOut(Schema):
    success: bool
    data: dict[str, Any]
    message: str = ""


class PortalDeleteDataIn(Schema):
    password: str


class PortalDeleteDataOut(Schema):
    success: bool
    message: str


class PortalDeleteAccountIn(Schema):
    password: str
    confirmation_phrase: str


class PortalDeleteAccountOut(Schema):
    success: bool
    message: str


# Helpers


def _generate_temp_password(length: int = 16) -> str:
    """Generate a secure random temporary password."""
    alphabet = (
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*-_+=?"
    )
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _get_customer_passes(portal_customer: CustomerPortalAccount) -> list[PortalPassOut]:
    """Fetch all passes for a customer across all tenants."""
    customers = Customer.objects.filter(
        email=portal_customer.email,
        is_active=True,
    ).select_related("tenant", "tenant__subscription")

    customer_ids = [c.id for c in customers]
    passes = (
        CustomerPass.objects.filter(customer_id__in=customer_ids)
        .select_related("customer", "customer__tenant", "card")
        .order_by("-enrolled_at")
    )

    results: list[PortalPassOut] = []
    for p in passes:
        balance = ""
        if p.card.card_type == "stamp":
            balance = f"{p.stamp_count_val} / {p.card.metadata.get('stamps_required', 10)} sellos"
        elif p.card.card_type == "cashback":
            balance = f"${p.cashback_balance_val:.2f} crédito"
        elif p.card.card_type == "vip_membership":
            balance = p.pass_data.get("membership_tier", "VIP")
        elif p.card.card_type == "referral_pass":
            balance = f"{p.referral_count_val} referidos"

        results.append(
            PortalPassOut(
                pass_id=str(p.id),
                card_id=str(p.card.id),
                card_name=p.card.name,
                card_type=p.card.card_type,
                tenant_name=p.customer.tenant.name,
                qr_code=p.qr_code,
                is_active=p.is_active,
                enrolled_at=p.enrolled_at.isoformat(),
                balance_display=balance,
            )
        )
    return results


# Endpoints


@router.post(
    "/generate-password/",
    response=GeneratePasswordOut,
    auth=None,
    summary="Generar contraseña de portal",
)
def generate_portal_password(
    request: HttpRequest, data: GeneratePasswordIn
) -> GeneratePasswordOut:
    """Generate a temporary password and email it to the customer.

    Rate limited to 3 requests per email per hour.
    """
    email = data.email.strip().lower()

    # Rate limit before any DB query to prevent timing attacks
    allowed, _ = check_rate_limit(
        f"portal_password:{email}", max_requests=settings.PORTAL_PASSWORD_RATE_LIMIT_MAX, window_seconds=settings.PORTAL_PASSWORD_RATE_LIMIT_WINDOW
    )
    if not allowed:
        # Return same message as non-existent email to prevent enumeration
        return GeneratePasswordOut(
            success=True,
            message=get_message_for_request("PORTAL_PASSWORD_SENT", request),
        )

    # Verify this email exists in at least one customer record.
    # NOTE: Global lookup by design — portal accounts are cross-tenant.
    # Rate limiting above prevents enumeration attacks.
    has_customer = Customer.objects.filter(email=email, is_active=True).exists()
    if not has_customer:
        # Return same message to prevent email enumeration
        return GeneratePasswordOut(
            success=True,
            message=get_message_for_request("PORTAL_PASSWORD_SENT", request),
        )

    account, _ = CustomerPortalAccount.objects.get_or_create(
        email=email,
        defaults={"is_active": True},
    )

    temp_password = _generate_temp_password()
    account.set_password(temp_password)
    account.save(update_fields=["password", "updated_at"])

    try:
        send_portal_password_email(email, temp_password)
    except Exception as e:
        logger.error("Failed to send portal password email: %s", e)
        return GeneratePasswordOut(
            success=False,
            message=get_message_for_request("EMAIL_SEND_ERROR", request),
        )

    return GeneratePasswordOut(
        success=True,
        message=get_message_for_request("PORTAL_PASSWORD_SENT", request),
    )


@router.post(
    "/login/",
    response=PortalLoginOut,
    auth=None,
    summary="Iniciar sesión en portal",
)
def portal_login(request: HttpRequest, data: PortalLoginIn) -> PortalLoginOut:
    """Authenticate a customer with email + password."""
    email = data.email.strip().lower()

    try:
        account = CustomerPortalAccount.objects.get(email=email, is_active=True)
    except CustomerPortalAccount.DoesNotExist:
        raise HttpError(401, get_message("AUTH_INVALID_CREDENTIALS"))

    if not account.password or not account.check_password(data.password):
        raise HttpError(401, get_message("AUTH_INVALID_CREDENTIALS"))

    access_token = create_customer_access_token(str(account.id))
    refresh_token = secrets.token_urlsafe(64)

    return PortalLoginOut(
        success=True,
        access_token=access_token,
        refresh_token=refresh_token,
        message=get_message_for_request("AUTH_LOGIN_SUCCESS", request),
    )


@router.get(
    "/passes/",
    response=PortalPassListOut,
    auth=portal_auth,
    summary="Mis tarjetas",
)
def list_my_passes(request: HttpRequest) -> PortalPassListOut:
    """List all loyalty cards the customer is enrolled in across all businesses."""
    portal_customer = getattr(request, "portal_customer", None)
    if not portal_customer:
        raise HttpError(401, get_message("AUTH_UNAUTHORIZED"))

    passes = _get_customer_passes(portal_customer)
    return PortalPassListOut(passes=passes)


@router.delete(
    "/passes/{pass_id}/",
    response=PortalDisenrollOut,
    auth=portal_auth,
    summary="Salir del programa",
)
def disenroll_from_pass(request: HttpRequest, pass_id: str) -> PortalDisenrollOut:
    """Disenroll (delete) a customer pass."""
    portal_customer = getattr(request, "portal_customer", None)
    if not portal_customer:
        raise HttpError(401, get_message("AUTH_UNAUTHORIZED"))

    try:
        customer_ids = Customer.objects.filter(
            email=portal_customer.email,
            is_active=True,
        ).values_list("id", flat=True)

        cp = CustomerPass.objects.get(
            id=pass_id,
            customer_id__in=list(customer_ids),
        )
    except CustomerPass.DoesNotExist:
        raise HttpError(404, get_message("PASS_NOT_FOUND"))

    cp.is_active = False
    cp.save(update_fields=["is_active", "updated_at"])

    try:
        from apps.audit.models import AuditAction, AuditStatus
        from apps.audit.service import log_action

        log_action(
            request=request,
            action=AuditAction.DELETE,
            resource_type="customer_pass",
            resource_id=pass_id,
            tenant_id=str(cp.card.tenant_id),
            details={"customer_email": portal_customer.email},
            status=AuditStatus.SUCCESS,
        )
    except Exception as e:
        logger.warning("Failed to audit pass disenrollment: %s", e, exc_info=True)

    return PortalDisenrollOut(
        success=True,
        message=get_message_for_request("PASS_DISENROLLED", request),
    )


@router.get(
    "/export-data/",
    response=PortalExportOut,
    auth=portal_auth,
    summary="Descargar mis datos",
)
def export_my_data(request: HttpRequest) -> PortalExportOut:
    """Export all personal data for GDPR/LOPDP compliance."""
    portal_customer = getattr(request, "portal_customer", None)
    if not portal_customer:
        raise HttpError(401, get_message("AUTH_UNAUTHORIZED"))

    customers = Customer.objects.filter(
        email=portal_customer.email,
        is_active=True,
    ).select_related("tenant")

    customer_data: list[dict[str, Any]] = []
    for c in customers:
        passes = CustomerPass.objects.filter(customer=c).select_related("card")
        passes_data = []
        for p in passes:
            passes_data.append(
                {
                    "program_name": p.card.name,
                    "program_type": p.card.card_type,
                    "qr_code": p.qr_code,
                    "enrolled_at": p.enrolled_at.isoformat(),
                    "is_active": p.is_active,
                    "pass_data": p.pass_data,
                }
            )

        customer_data.append(
            {
                "business": c.tenant.name,
                "first_name": c.first_name,
                "last_name": c.last_name,
                "email": c.email,
                "phone": c.phone,
                "date_of_birth": str(c.date_of_birth) if c.date_of_birth else None,
                "total_visits": c.total_visits,
                "total_spent": str(c.total_spent),
                "last_visit": c.last_visit.isoformat() if c.last_visit else None,
                "passes": passes_data,
            }
        )

    return PortalExportOut(
        success=True,
        data={
            "portal_email": portal_customer.email,
            "export_date": __import__("datetime")
            .datetime.now(__import__("datetime").timezone.utc)
            .isoformat(),
            "accounts": customer_data,
        },
        message=get_message_for_request("PORTAL_DATA_EXPORTED", request),
    )


@router.post(
    "/delete-data/",
    response=PortalDeleteDataOut,
    auth=portal_auth,
    summary="Eliminar mis datos personales",
)
def delete_my_data(
    request: HttpRequest, data: PortalDeleteDataIn
) -> PortalDeleteDataOut:
    """Delete personal data while keeping anonymized transaction records."""
    portal_customer = getattr(request, "portal_customer", None)
    if not portal_customer:
        raise HttpError(401, get_message("AUTH_UNAUTHORIZED"))

    if not portal_customer.check_password(data.password):
        raise HttpError(403, get_message("AUTH_INVALID_PASSWORD"))

    with transaction.atomic():
        customers = Customer.objects.filter(
            email=portal_customer.email,
            is_active=True,
        )
        for c in customers:
            c.first_name = "[ELIMINADO]"
            c.last_name = "[ELIMINADO]"
            c.phone = ""
            c.email = f"deleted_{c.id}@loyallia.anon"
            c.date_of_birth = None
            c.gender = ""
            c.notes = ""
            c.referral_code = ""
            c.is_active = False
            c.save(
                update_fields=[
                    "first_name",
                    "last_name",
                    "phone",
                    "email",
                    "date_of_birth",
                    "gender",
                    "notes",
                    "referral_code",
                    "is_active",
                    "updated_at",
                ]
            )

    try:
        from apps.audit.models import AuditAction, AuditStatus
        from apps.audit.service import log_action

        log_action(
            request=request,
            action=AuditAction.DELETE,
            resource_type="customer_data",
            resource_id=portal_customer.email,
            details={"affected_customers": customers.count()},
            status=AuditStatus.SUCCESS,
        )
    except Exception as e:
        logger.warning("Failed to audit data deletion: %s", e, exc_info=True)

    return PortalDeleteDataOut(
        success=True,
        message=get_message_for_request("PORTAL_DATA_DELETED", request),
    )


@router.post(
    "/delete-account/",
    response=PortalDeleteAccountOut,
    auth=portal_auth,
    summary="Eliminar mi cuenta",
)
def delete_my_account(
    request: HttpRequest, data: PortalDeleteAccountIn
) -> PortalDeleteAccountOut:
    """Permanently delete the customer portal account and all associated data."""
    portal_customer = getattr(request, "portal_customer", None)
    if not portal_customer:
        raise HttpError(401, get_message("AUTH_UNAUTHORIZED"))

    if not portal_customer.check_password(data.password):
        raise HttpError(403, get_message("AUTH_INVALID_PASSWORD"))

    expected = "ACEPTO ELIMINAR MI CUENTA"
    if data.confirmation_phrase.strip().upper() != expected:
        raise HttpError(
            400,
            get_message_for_request(
                "PORTAL_CONFIRMATION_PHRASE_REQUIRED", request, phrase=expected
            ),
        )

    customer_email = portal_customer.email
    with transaction.atomic():
        customers = Customer.objects.filter(email=portal_customer.email)
        for c in customers:
            CustomerPass.objects.filter(customer=c).delete()
        customers.delete()

        # Deactivate portal account
        portal_customer.is_active = False
        portal_customer.password = ""
        portal_customer.save(update_fields=["is_active", "password", "updated_at"])

    try:
        from apps.audit.models import AuditAction, AuditStatus
        from apps.audit.service import log_action

        log_action(
            request=request,
            action=AuditAction.DELETE,
            resource_type="portal_account",
            resource_id=customer_email,
            details={"event": "account_permanently_deleted"},
            status=AuditStatus.SUCCESS,
        )
    except Exception as e:
        logger.warning("Failed to audit account deletion: %s", e, exc_info=True)

    return PortalDeleteAccountOut(
        success=True,
        message=get_message_for_request("ACCOUNT_DELETION_COMPLETED", request),
    )
