"""
Loyallia Super Admin Impersonation API
PIN-gated tenant owner impersonation with audit logging.
"""

import logging
import uuid
from datetime import UTC, datetime, timedelta

import jwt as pyjwt
from django.conf import settings
from django.core.cache import cache
from ninja import Router
from ninja.errors import HttpError

from apps.authentication.models import User, UserRole
from apps.authentication.tokens import _get_signing_key
from apps.tenants.models import Tenant
from apps.tenants.super_admin_api.schemas import ImpersonateIn, ImpersonateOut
from common.messages import get_message
from common.permissions import is_super_admin, jwt_auth

logger = logging.getLogger(__name__)

router = Router()

LOCKOUT_SECONDS = 900
MAX_PIN_ATTEMPTS = 3


def _require_super_admin(request) -> None:
    if not is_super_admin(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))


def _get_tenant_or_404(tenant_id: str) -> Tenant:
    try:
        return Tenant.objects.get(id=uuid.UUID(tenant_id))
    except (Tenant.DoesNotExist, ValueError):
        raise HttpError(404, get_message("NOT_FOUND"))


def _audit_impersonation(request, tenant, justification: str, status: str, reason: str):
    try:
        from apps.audit.models import AuditAction
        from apps.audit.service import log_action

        log_action(
            request=request,
            action=AuditAction.IMPERSONATE,
            resource_type="tenant",
            resource_id=str(tenant.id),
            tenant_id=tenant.id,
            justification=justification,
            details={"tenant_name": tenant.name, "reason": reason},
            status=status,
        )
    except Exception as e:
        logger.warning("Failed to audit impersonation attempt: %s", e, exc_info=True)


@router.post(
    "/tenants/{tenant_id}/impersonate/", auth=jwt_auth, response=ImpersonateOut
)
def impersonate_tenant(request, tenant_id: str, payload: ImpersonateIn):
    """Impersonate a tenant owner using a security PIN and justification.

    Generates a short-lived JWT scoped to the owner user. Audit logged.
    """
    _require_super_admin(request)
    tenant = _get_tenant_or_404(tenant_id)

    try:
        owner = User.objects.get(tenant=tenant, role=UserRole.OWNER, is_active=True)
    except User.DoesNotExist:
        raise HttpError(404, get_message("NOT_FOUND"))

    from apps.audit.models import AuditStatus

    justification = payload.justification.strip()
    cache_key = f"impersonate_fails:{request.user.id}:{owner.id}"
    failed_attempts = int(cache.get(cache_key, 0) or 0)
    if failed_attempts >= MAX_PIN_ATTEMPTS:
        _audit_impersonation(
            request,
            tenant,
            justification,
            AuditStatus.DENIED,
            "pin_lockout",
        )
        raise HttpError(
            429,
            get_message("IMPERSONATION_PIN_LOCKED", minutes=LOCKOUT_SECONDS // 60),
        )

    if not owner.has_security_pin:
        _audit_impersonation(
            request,
            tenant,
            justification,
            AuditStatus.DENIED,
            "owner_pin_not_set",
        )
        raise HttpError(400, get_message("SECURITY_PIN_NOT_SET"))

    if not owner.verify_security_pin(payload.owner_pin):
        failed_attempts += 1
        cache.set(cache_key, failed_attempts, timeout=LOCKOUT_SECONDS)
        _audit_impersonation(
            request,
            tenant,
            justification,
            AuditStatus.DENIED,
            "invalid_pin",
        )
        raise HttpError(403, get_message("IMPERSONATION_PIN_INVALID"))

    cache.delete(cache_key)

    now = datetime.now(tz=UTC)
    token_payload = {
        "user_id": str(owner.id),
        "tenant_id": str(tenant.id),
        "role": owner.role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=60)).timestamp()),
        "type": "access",
        "impersonated_by": str(request.user.id),
        "impersonated": True,
    }
    access = pyjwt.encode(
        token_payload, _get_signing_key(), algorithm=settings.JWT_ALGORITHM
    )

    _audit_impersonation(
        request,
        tenant,
        justification,
        AuditStatus.SUCCESS,
        "success",
    )
    logger.warning(
        "IMPERSONATION: SUPER_ADMIN %s impersonated OWNER %s of tenant %s (%s)",
        request.user.email,
        owner.email,
        tenant.id,
        tenant.name,
    )
    return ImpersonateOut(
        access_token=access,
        impersonated_tenant_id=str(tenant.id),
        impersonated_user_id=str(owner.id),
    )


@router.post("/impersonation/revoke", auth=jwt_auth)
def revoke_impersonation(request):
    """Revoke the current impersonation session immediately."""
    _require_super_admin(request)

    user_id = str(request.user.id)
    cache_key = f"impersonation:{user_id}"
    cache.set(cache_key, "revoked", timeout=settings.CACHE_TTL_IMPERSONATION_REVOKED)

    try:
        from apps.audit.models import AuditAction, AuditStatus
        from apps.audit.service import log_action

        log_action(
            request=request,
            action=AuditAction.UPDATE,
            resource_type="impersonation",
            resource_id=user_id,
            details={"event": "IMPERSONATION_REVOKED"},
            status=AuditStatus.SUCCESS,
        )
    except Exception as e:
        logger.warning("Failed to audit impersonation revocation: %s", e, exc_info=True)

    logger.info(
        "SUPER_ADMIN %s revoked impersonation for user %s",
        request.user.email,
        user_id,
    )
    return {"message": "Impersonation revoked successfully"}
