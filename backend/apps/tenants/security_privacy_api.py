"""
Loyallia — Tenant Security & Privacy API
Handles owner security PIN, full tenant export, and account deletion.
"""


import logging
from datetime import datetime, timedelta

from django.http import HttpResponse
from django.utils import timezone
from ninja import Router, Schema
from ninja.errors import HttpError

from common.messages import get_message
from common.permissions import is_owner, jwt_auth
from common.plan_enforcement import check_plan_limit

logger = logging.getLogger(__name__)

router = Router()

DELETION_PHRASE = "ACEPTO ELIMINACIÓN COMPLETA"


class SecurityPinIn(Schema):
    current_password: str
    pin: str


class DeleteAccountIn(Schema):
    confirmation_phrase: str
    current_password: str


@router.post(
    "/security-pin/",
    auth=jwt_auth,
    response=dict,
    summary="Establecer PIN de seguridad (OWNER)",
)
def set_security_pin(request, payload: SecurityPinIn):
    """Set or update the 6-digit security PIN for impersonation verification."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    user = request.user
    if not user.check_password(payload.current_password):
        raise HttpError(403, get_message("AUTH_INVALID_CREDENTIALS"))

    try:
        user.set_security_pin(payload.pin)
    except ValueError:
        raise HttpError(400, get_message("SECURITY_PIN_INVALID_FORMAT"))

    logger.info(
        "OWNER %s set security PIN for tenant %s", user.email, request.tenant.name
    )
    return {"success": True, "message": get_message("SECURITY_PIN_SET")}


@router.get(
    "/data-export/",
    auth=jwt_auth,
    summary="Exportar todos los datos del negocio (LOPDP Art. 17/20)",
)
def export_tenant_data(request):
    """Generate a ZIP with all tenant data in JSON and CSV."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    check_plan_limit(request.tenant, "exports_month")

    from apps.tenants.data_export_service import generate_tenant_export

    buf = generate_tenant_export(request.tenant)

    try:
        from apps.audit.models import AuditAction
        from apps.audit.service import log_action

        log_action(
            request=request,
            action=AuditAction.EXPORT,
            resource_type="tenant_data",
            resource_id=str(request.tenant.id),
            details={"type": "full_data_export", "format": "zip"},
        )
    except Exception:
        logger.warning("Failed to log data export audit", exc_info=True)

    date_str = datetime.now().strftime("%Y-%m-%d")
    response = HttpResponse(buf.getvalue(), content_type="application/zip")
    response["Content-Disposition"] = (
        f'attachment; filename="loyallia_datos_completos_{date_str}.zip"'
    )
    return response


@router.post(
    "/delete-account/",
    auth=jwt_auth,
    summary="Eliminar cuenta permanentemente (LOPDP Art. 18)",
)
def delete_account(request, payload: DeleteAccountIn):
    """Schedule full tenant deletion after a 24-hour grace period."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    tenant = request.tenant
    user = request.user

    if tenant.scheduled_deletion_at is not None:
        raise HttpError(400, get_message("ACCOUNT_DELETION_ALREADY_SCHEDULED"))
    if payload.confirmation_phrase != DELETION_PHRASE:
        raise HttpError(400, get_message("ACCOUNT_DELETION_WRONG_PHRASE"))
    if not user.check_password(payload.current_password):
        raise HttpError(403, get_message("ACCOUNT_DELETION_WRONG_PASSWORD"))

    from apps.tenants.data_export_service import generate_tenant_export

    buf = generate_tenant_export(tenant)

    tenant.is_active = False
    tenant.scheduled_deletion_at = timezone.now() + timedelta(hours=24)
    tenant.save(update_fields=["is_active", "scheduled_deletion_at", "updated_at"])

    # Deactivate user and revoke all refresh tokens to prevent re-authentication
    user.is_active = False
    user.save(update_fields=["is_active", "updated_at"])
    user.refresh_tokens.filter(revoked_at__isnull=True).update(revoked_at=timezone.now())

    try:
        from celery import current_app

        current_app.send_task(  # pyright: ignore[reportCallIssue]
            "apps.tenants.tasks.delete_tenant_cascade",
            args=[str(tenant.id)],
            eta=tenant.scheduled_deletion_at,
        )
    except Exception:
        logger.error("Failed to schedule Celery deletion task", exc_info=True)

    try:
        from apps.audit.models import AuditAction
        from apps.audit.service import log_action

        log_action(
            request=request,
            action=AuditAction.DELETE,
            resource_type="tenant",
            resource_id=str(tenant.id),
            details={
                "event": "ACCOUNT_DELETION_SCHEDULED",
                "scheduled_at": tenant.scheduled_deletion_at.isoformat(),
                "grace_period_hours": 24,
            },
        )
    except Exception:
        logger.warning("Failed to log deletion audit", exc_info=True)

    logger.info(
        "OWNER %s scheduled deletion for tenant %s at %s",
        user.email,
        tenant.name,
        tenant.scheduled_deletion_at,
    )

    date_str = datetime.now().strftime("%Y-%m-%d")
    response = HttpResponse(buf.getvalue(), content_type="application/zip")
    response["Content-Disposition"] = (
        f'attachment; filename="loyallia_datos_finales_{date_str}.zip"'
    )
    return response
