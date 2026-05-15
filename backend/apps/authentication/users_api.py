"""
Loyallia — Users & Profile API (Django Ninja Router)
Split from authentication/api.py per Rule 245 (600-line limit).
Handles: profile updates, user invitations, team management, phone verification.
"""

import hashlib
import logging
import secrets
import uuid
from typing import cast

from django.conf import settings
from ninja import Router
from ninja.errors import HttpError

from apps.authentication.helpers import (
    send_otp_email,
)
from apps.authentication.models import RefreshToken, User, UserManager
from apps.authentication.schemas import (
    ChangePasswordIn,
    InviteIn,
    MessageOut,
    PhoneVerifyCheckOut,
    PhoneVerifyConfirmIn,
    PhoneVerifyRequestIn,
    PhoneVerifyStartOut,
    ProfileUpdateIn,
    UserOut,
)
from common.messages import get_message
from common.permissions import is_owner, jwt_auth
from common.request import require_tenant

logger = logging.getLogger(__name__)
router = Router()


# =============================================================================
# USER & PROFILE ENDPOINTS
# =============================================================================


@router.get("/me/", auth=jwt_auth, summary="Perfil del usuario actual")
def me(request):
    """Returns the authenticated user's profile with tenant info."""
    u = request.user
    return {
        "id": str(u.id),
        "email": u.email,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "full_name": u.full_name,
        "role": u.role,
        "is_active": u.is_active,
        "is_email_verified": u.is_email_verified,
        "phone_number": u.phone_number,
        "is_phone_verified": u.is_phone_verified,
        "tenant_id": str(u.tenant_id) if u.tenant_id else None,
        "tenant_name": u.tenant.name if u.tenant else "",
        "date_joined": u.date_joined.isoformat(),
    }


@router.put("/profile/", auth=jwt_auth, response=MessageOut, summary="Actualizar perfil")
def update_profile(request, payload: ProfileUpdateIn):
    """Update the authenticated user's profile (name fields only)."""
    u = request.user
    update_fields = []
    if payload.first_name is not None:
        u.first_name = payload.first_name.strip()
        update_fields.append("first_name")
    if payload.last_name is not None:
        u.last_name = payload.last_name.strip()
        update_fields.append("last_name")
    if update_fields:
        u.save(update_fields=update_fields + ["updated_at"])
    return MessageOut(success=True, message=get_message("AUTH_PROFILE_UPDATED"))


@router.post(
    "/change-password/",
    auth=jwt_auth,
    response=MessageOut,
    summary="Cambiar contrasena",
)
def change_password(request, payload: ChangePasswordIn):
    """Change the authenticated user's password."""
    u = request.user
    if not u.check_password(payload.current_password):
        raise HttpError(400, get_message("AUTH_PASSWORD_WRONG"))
    u.set_password(payload.new_password)
    u.save(update_fields=["password", "updated_at"])
    try:
        from apps.audit.models import AuditAction
        from apps.audit.service import log_action
        log_action(
            request=request,
            action=AuditAction.UPDATE,
            resource_type="user_password",
            resource_id=str(u.id),
            tenant_id=str(request.tenant.id) if hasattr(request, 'tenant') and request.tenant else None,
            details={"event": "password_changed"},
            status="success",
        )
    except Exception:
        pass
    return MessageOut(success=True, message=get_message("AUTH_PASSWORD_CHANGED"))


# =============================================================================
# TEAM MANAGEMENT (OWNER ONLY)
# =============================================================================


@router.post("/invite/", auth=jwt_auth, response=MessageOut, summary="Invitar usuario al equipo")
def invite_user(request, payload: InviteIn):
    """OWNER invites a MANAGER or STAFF user."""
    tenant = require_tenant(request)
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    if User.objects.filter(email=payload.email, tenant=tenant).exists():
        raise HttpError(409, get_message("AUTH_INVALID_CREDENTIALS"))

    # SECURITY (LYL-H-SEC-007): Generate token, store SHA-256 hash in DB.
    invitation_token = secrets.token_urlsafe(32)
    invitation_token_hash = hashlib.sha256(invitation_token.encode()).hexdigest()
    from django.db import transaction

    with transaction.atomic():
        existing = User.objects.filter(email=payload.email).first()
        if existing:
            raise HttpError(409, get_message("AUTH_INVALID_CREDENTIALS"))
        user_manager = cast(UserManager, User.objects)
        user_manager.create_user(
            email=payload.email,
            password=secrets.token_urlsafe(16),
            first_name=payload.first_name.strip(),
            last_name=payload.last_name.strip(),
            tenant=tenant,
            role=payload.role,
            is_active=False,
            invited_by=request.user,
            invitation_token=invitation_token_hash,
        )

    invite_url = f"{settings.APP_URL}/invite/accept/?token={invitation_token}"
    send_otp_email(
        email=payload.email,
        otp="",
        subject=f"Invitacion a {tenant.name} -- Loyallia",
        body=f"Has sido invitado a unirte a {tenant.name} en Loyallia como {payload.role}.\n\n"
        f"Haz clic en el siguiente enlace para aceptar la invitacion:\n{invite_url}\n\nEste enlace expirara en 7 dias.\n\n-- Loyallia",
    )
    return MessageOut(success=True, message=get_message("AUTH_INVITE_SENT", email=payload.email))


@router.get(
    "/users/",
    auth=jwt_auth,
    response=list[UserOut],
    summary="Listar usuarios del negocio",
)
def list_users(request):
    """Lists all users for the current tenant. OWNER only."""
    tenant = require_tenant(request)
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    users = User.objects.filter(tenant=tenant).order_by("role", "email")
    return [UserOut.from_user(u) for u in users]


@router.delete(
    "/users/{user_id}/",
    auth=jwt_auth,
    response=MessageOut,
    summary="Desactivar usuario del equipo",
)
def deactivate_user(request, user_id: str):
    """Deactivates a user. OWNER only. Cannot deactivate self."""
    tenant = require_tenant(request)
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    if str(request.user.id) == user_id:
        raise HttpError(400, get_message("AUTH_PERMISSION_DENIED"))
    try:
        target = User.objects.get(id=uuid.UUID(user_id), tenant=tenant)
    except (User.DoesNotExist, ValueError):
        raise HttpError(404, get_message("NOT_FOUND"))
    target.is_active = False
    target.save(update_fields=["is_active", "updated_at"])

    from django.utils import timezone as dj_timezone

    RefreshToken.objects.filter(user=target, revoked_at__isnull=True).update(revoked_at=dj_timezone.now())
    return MessageOut(success=True, message=get_message("AUTH_USER_DEACTIVATED"))


# =============================================================================
# PHONE NUMBER VERIFICATION
# =============================================================================


@router.post(
    "/phone/verify/request/",
    auth=jwt_auth,
    response=PhoneVerifyStartOut,
    summary="Solicitar verificación de teléfono",
)
def phone_verify_request(request, payload: PhoneVerifyRequestIn):
    """Send OTP for phone verification via Twilio Verify (real SMS).

    REAL PRODUCTION CODE — OTP is sent via Twilio Verify API.
    No DEV bypass. No mock. The code arrives on the actual phone.
    """
    from django.core.cache import cache

    from apps.authentication.otp_service import send_otp

    user = request.user
    user.phone_number = payload.phone_number
    user.is_phone_verified = False
    user.save(update_fields=["phone_number", "is_phone_verified", "updated_at"])

    try:
        result = send_otp(
            recipient=payload.phone_number,
            purpose="phone_verification",
            custom_friendly_name="Loyallia",
        )
    except Exception as exc:
        logger.error("Phone verify request failed for %s: %s", payload.phone_number, exc)
        return PhoneVerifyStartOut(
            success=False,
            message=get_message("VERIFY_OTP_FAILED", detail=str(exc)),
        )

    # Store SID in Redis for confirm step
    cache.set(
        f"phone_verify_sid:{payload.phone_number}",
        result.get("sid", ""),
        timeout=300,
    )

    return PhoneVerifyStartOut(
        success=True,
        message=get_message("VERIFY_OTP_SENT", channel=result.get("channel", "sms")),
        sid=result.get("sid", ""),
        strategy=result.get("strategy", ""),
        channel=result.get("channel", ""),
    )


@router.post(
    "/phone/verify/confirm/",
    auth=jwt_auth,
    response=PhoneVerifyCheckOut,
    summary="Confirmar verificación de teléfono",
)
def phone_verify_confirm(request, payload: PhoneVerifyConfirmIn):
    """Validate OTP via Twilio Verify and mark phone as verified.

    REAL PRODUCTION CODE — Validates against Twilio Verify API.
    """
    from django.core.cache import cache

    from apps.authentication.otp_service import check_otp

    # Rate limit check
    cache_key = f"otp_attempts:phone_verify:{payload.phone_number}"
    attempts = cache.get(cache_key, 0)
    if attempts >= 5:
        return PhoneVerifyCheckOut(
            success=False,
            message=get_message("VERIFY_RATE_LIMITED", minutes=15),
            valid=False,
        )
    cache.set(cache_key, attempts + 1, 900)

    # Retrieve SID from Redis
    sid = cache.get(f"phone_verify_sid:{payload.phone_number}", "")

    try:
        is_valid = check_otp(
            recipient=payload.phone_number,
            code=payload.otp,
            sid=sid or None,
            purpose="phone_verification",
        )
    except Exception as exc:
        logger.error("Phone verify confirm failed for %s: %s", payload.phone_number, exc)
        return PhoneVerifyCheckOut(
            success=False,
            message=get_message("VERIFY_OTP_FAILED", detail=str(exc)),
            valid=False,
        )

    if not is_valid:
        return PhoneVerifyCheckOut(
            success=False,
            message=get_message("VERIFY_OTP_INVALID"),
            valid=False,
        )

    user = request.user
    if user.phone_number != payload.phone_number:
        return PhoneVerifyCheckOut(
            success=False,
            message=get_message("VERIFY_OTP_INVALID"),
            valid=False,
        )

    user.is_phone_verified = True
    user.save(update_fields=["is_phone_verified", "updated_at"])

    # Clean up
    cache.delete(f"phone_verify_sid:{payload.phone_number}")
    cache.delete(cache_key)

    logger.info("Phone verified for user %s: %s", user.email, payload.phone_number)
    return PhoneVerifyCheckOut(
        success=True,
        message=get_message("VERIFY_OTP_VALID"),
        valid=True,
    )
