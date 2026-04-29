"""
Loyallia — Users & Profile API (Django Ninja Router)
Split from authentication/api.py per Rule 245 (650-line limit).
Handles: profile updates, user invitations, team management, phone verification.
"""

import hashlib
import logging
import secrets
import uuid

from django.conf import settings
from ninja import Router
from ninja.errors import HttpError

from apps.authentication.helpers import (
    send_otp_email,
    store_otp,
    verify_otp,
)
from apps.authentication.models import RefreshToken, User, UserRole
from apps.authentication.schemas import (
    ChangePasswordIn,
    InviteIn,
    MessageOut,
    PhoneVerifyConfirmIn,
    PhoneVerifyRequestIn,
    ProfileUpdateIn,
    UserOut,
)
from common.messages import get_message
from common.permissions import is_owner, jwt_auth

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


@router.put(
    "/profile/", auth=jwt_auth, response=MessageOut, summary="Actualizar perfil"
)
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
    return MessageOut(success=True, message=get_message("AUTH_PASSWORD_CHANGED"))


# =============================================================================
# TEAM MANAGEMENT (OWNER ONLY)
# =============================================================================


@router.post(
    "/invite/", auth=jwt_auth, response=MessageOut, summary="Invitar usuario al equipo"
)
def invite_user(request, payload: InviteIn):
    """OWNER invites a MANAGER or STAFF user."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    if User.objects.filter(email=payload.email, tenant=request.tenant).exists():
        raise HttpError(409, get_message("AUTH_INVALID_CREDENTIALS"))

    # SECURITY (LYL-H-SEC-007): Generate token, store SHA-256 hash in DB.
    invitation_token = secrets.token_urlsafe(32)
    invitation_token_hash = hashlib.sha256(invitation_token.encode()).hexdigest()
    from django.db import transaction

    with transaction.atomic():
        existing = User.objects.filter(email=payload.email).first()
        if existing:
            raise HttpError(409, get_message("AUTH_INVALID_CREDENTIALS"))
        User.objects.create_user(
            email=payload.email,
            password=secrets.token_urlsafe(16),
            first_name=payload.first_name.strip(),
            last_name=payload.last_name.strip(),
            tenant=request.tenant,
            role=payload.role,
            is_active=False,
            invited_by=request.user,
            invitation_token=invitation_token_hash,
        )

    invite_url = f"{settings.APP_URL}/invite/accept/?token={invitation_token}"
    send_otp_email(
        email=payload.email,
        otp="",
        subject=f"Invitacion a {request.tenant.name} -- Loyallia",
        body=f"Has sido invitado a unirte a {request.tenant.name} en Loyallia como {payload.role}.\n\n"
        f"Haz clic en el siguiente enlace para aceptar la invitacion:\n{invite_url}\n\nEste enlace expirara en 7 dias.\n\n-- Loyallia",
    )
    return MessageOut(
        success=True, message=get_message("AUTH_INVITE_SENT", email=payload.email)
    )


@router.get(
    "/users/",
    auth=jwt_auth,
    response=list[UserOut],
    summary="Listar usuarios del negocio",
)
def list_users(request):
    """Lists all users for the current tenant. OWNER only."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    users = User.objects.filter(tenant=request.tenant).order_by("role", "email")
    return [UserOut.from_user(u) for u in users]


@router.delete(
    "/users/{user_id}/",
    auth=jwt_auth,
    response=MessageOut,
    summary="Desactivar usuario del equipo",
)
def deactivate_user(request, user_id: str):
    """Deactivates a user. OWNER only. Cannot deactivate self."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    if str(request.user.id) == user_id:
        raise HttpError(400, get_message("AUTH_PERMISSION_DENIED"))
    try:
        target = User.objects.get(id=uuid.UUID(user_id), tenant=request.tenant)
    except (User.DoesNotExist, ValueError):
        raise HttpError(404, get_message("NOT_FOUND"))
    target.is_active = False
    target.save(update_fields=["is_active", "updated_at"])
    
    from django.utils import timezone as dj_timezone
    RefreshToken.objects.filter(user=target, revoked_at__isnull=True).update(
        revoked_at=dj_timezone.now()
    )
    return MessageOut(success=True, message=get_message("AUTH_USER_DEACTIVATED"))


# =============================================================================
# PHONE NUMBER VERIFICATION
# =============================================================================


@router.post(
    "/phone/verify/request/",
    auth=jwt_auth,
    response=MessageOut,
    summary="Solicitar verificación de teléfono",
)
def phone_verify_request(request, payload: PhoneVerifyRequestIn):
    """Send a 6-digit OTP for phone verification."""
    otp = secrets.token_urlsafe(8)
    store_otp(payload.phone_number, otp, "phone_verify")

    user = request.user
    user.phone_number = payload.phone_number
    user.is_phone_verified = False
    user.save(update_fields=["phone_number", "is_phone_verified", "updated_at"])

    masked_phone = payload.phone_number[:4] + "****" + payload.phone_number[-2:]

    if settings.DEBUG:
        logger.info(
            "📱 PHONE VERIFY OTP for %s: %s (DEV MODE — not sent via SMS)",
            payload.phone_number,
            otp,
        )

    try:
        send_otp_email(
            email=user.email,
            otp=otp,
            subject="Loyallia — Código de verificación telefónica",
            body=(
                f"Hola {user.first_name or user.email},\n\n"
                f"Tu código de verificación para {masked_phone} es: {otp}\n\n"
                f"Este código expira en 15 minutos.\n\n-- Loyallia"
            ),
        )
    except Exception:
        logger.exception("Failed to send phone OTP for %s", payload.phone_number)

    return MessageOut(
        success=True,
        message=get_message("AUTH_PHONE_OTP_SENT", phone=masked_phone),
    )


@router.post(
    "/phone/verify/confirm/",
    auth=jwt_auth,
    response=MessageOut,
    summary="Confirmar verificación de teléfono",
)
def phone_verify_confirm(request, payload: PhoneVerifyConfirmIn):
    """Validate the OTP and mark the phone as verified."""
    from django.core.cache import cache

    cache_key = f"otp_attempts:phone_verify:{payload.phone_number}"
    attempts = cache.get(cache_key, 0)
    if attempts >= 5:
        raise HttpError(429, get_message("RATE_LIMITED"))
    cache.set(cache_key, attempts + 1, 900)

    if not verify_otp(payload.phone_number, payload.otp, "phone_verify"):
        raise HttpError(400, get_message("AUTH_PHONE_OTP_INVALID"))

    user = request.user
    if user.phone_number != payload.phone_number:
        raise HttpError(400, get_message("AUTH_PHONE_OTP_INVALID"))

    user.is_phone_verified = True
    user.save(update_fields=["is_phone_verified", "updated_at"])
    logger.info("Phone verified for user %s: %s", user.email, payload.phone_number)
    return MessageOut(success=True, message=get_message("AUTH_PHONE_VERIFIED"))
