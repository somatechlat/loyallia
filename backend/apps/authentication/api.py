"""
Loyallia — Authentication API (Django Ninja Router)
Handles: registration, login, refresh, logout, password reset, email verification,
         user invitation, user listing, user deactivation.

All strings via get_message() — Rule #11.
All auth via JWTAuth — Rule #8.
"""

import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone as dj_timezone
from ninja import Router
from ninja.errors import HttpError

from apps.authentication.models import RefreshToken, User, UserRole
from apps.authentication.schemas import (
    ChangePasswordIn,
    ForgotPasswordIn,
    InviteIn,
    LoginIn,
    LogoutIn,
    MessageOut,
    PasswordResetConfirmIn,
    PasswordResetRequestIn,
    ProfileUpdateIn,
    RefreshIn,
    RefreshOut,
    RegisterIn,
    RegisterOut,
    ResetPasswordIn,
    TokenOut,
    UserOut,
    VerifyEmailIn,
)
from apps.authentication.tokens import (
    create_access_token,
    create_refresh_token_string,
    hash_token,
)
from apps.tenants.models import Tenant
from common.messages import get_message
from common.permissions import is_owner, jwt_auth

logger = logging.getLogger(__name__)
router = Router()


# =============================================================================
# HELPERS
# =============================================================================


def _slugify_business(name: str) -> str:
    """Generate a unique slug from business name."""
    import re

    slug_base = re.sub(r"[^a-z0-9]+", "-", name.lower().strip()).strip("-")
    slug = slug_base[:80]
    counter = 1
    candidate = slug
    while Tenant.objects.filter(slug=candidate).exists():
        candidate = f"{slug}-{counter}"
        counter += 1
    return candidate


def _send_otp_email(email: str, otp: str, subject: str, body: str) -> None:
    """Send OTP email. Logs failure but does not raise — prevents timing attacks."""
    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception as exc:
        logger.error("Failed to send OTP email to %s: %s", email, exc)


def _store_otp(email: str, otp: str, purpose: str) -> None:
    """Store OTP in Django cache with 15-minute TTL."""
    from django.core.cache import cache

    cache.set(f"otp:{purpose}:{email}", otp, timeout=900)


def _verify_otp(email: str, otp: str, purpose: str) -> bool:
    """Verify OTP from cache. Deletes key after verification (single-use)."""
    from django.core.cache import cache

    key = f"otp:{purpose}:{email}"
    stored = cache.get(key)
    if stored and stored == otp:
        cache.delete(key)
        return True
    return False


def _issue_tokens(user: User) -> dict:
    """Create access + refresh token pair, persist refresh token hash in DB."""
    access = create_access_token(
        user_id=str(user.id),
        tenant_id=str(user.tenant_id) if user.tenant_id else None,
        role=user.role,
    )
    refresh_str = create_refresh_token_string()
    expires_at = dj_timezone.now() + timedelta(
        days=settings.JWT_REFRESH_TOKEN_LIFETIME_DAYS
    )
    RefreshToken.objects.create(
        user=user, token_hash=hash_token(refresh_str), expires_at=expires_at
    )
    user.last_login = dj_timezone.now()
    user.save(update_fields=["last_login"])
    return {
        "access_token": access,
        "refresh_token": refresh_str,
        "token_type": "bearer",
        "user_id": str(user.id),
        "tenant_id": str(user.tenant_id) if user.tenant_id else None,
        "role": user.role,
    }


# =============================================================================
# AUTH ENDPOINTS
# =============================================================================


@router.post(
    "/register/", auth=None, response=RegisterOut, summary="Registrar nuevo negocio"
)
def register(request, payload: RegisterIn):
    """Creates a Tenant + OWNER user in a single atomic transaction."""
    from django.db import transaction

    if User.objects.filter(email=payload.email).exists():
        raise HttpError(409, get_message("AUTH_INVALID_CREDENTIALS"))

    with transaction.atomic():
        slug = _slugify_business(payload.business_name)
        tenant = Tenant.objects.create(name=payload.business_name.strip(), slug=slug)
        tenant.activate_trial()
        user = User.objects.create_user(
            email=payload.email,
            password=payload.password,
            first_name=payload.first_name.strip(),
            last_name=payload.last_name.strip(),
            tenant=tenant,
            role=UserRole.OWNER,
            is_active=True,
            is_email_verified=False,
        )

    otp = secrets.token_hex(3).upper()
    _store_otp(payload.email, otp, "verify_email")
    _send_otp_email(
        email=payload.email,
        otp=otp,
        subject="Verifica tu correo -- Loyallia",
        body=f"Hola {user.first_name or payload.email},\n\nTu codigo de verificacion es: {otp}\n\nEste codigo expira en 15 minutos.\n\n-- Loyallia",
    )
    return RegisterOut(
        success=True,
        message=get_message("TENANT_CREATED", days=settings.TRIAL_DAYS),
        tenant_id=str(tenant.id),
        user_id=str(user.id),
    )


@router.post("/login/", auth=None, response=TokenOut, summary="Iniciar sesion")
def login(request, payload: LoginIn):
    """Authenticates email+password. Returns JWT access + refresh tokens."""
    try:
        user = User.objects.select_related("tenant").get(email=payload.email)
    except User.DoesNotExist:
        raise HttpError(401, get_message("AUTH_INVALID_CREDENTIALS"))

    if user.is_locked:
        remaining = max(
            0, int((user.locked_until - dj_timezone.now()).total_seconds() / 60)
        )
        raise HttpError(423, get_message("AUTH_ACCOUNT_LOCKED", minutes=remaining))
    if not user.is_active:
        raise HttpError(401, get_message("AUTH_INVALID_CREDENTIALS"))
    if not user.check_password(payload.password):
        user.record_failed_login()
        raise HttpError(401, get_message("AUTH_INVALID_CREDENTIALS"))

    user.reset_failed_login()
    return _issue_tokens(user)


@router.post(
    "/refresh/", auth=None, response=RefreshOut, summary="Renovar token de acceso"
)
def refresh_token(request, payload: RefreshIn):
    """Validates a refresh token and issues a new access token."""
    token_hash = hash_token(payload.refresh_token)
    try:
        db_token = RefreshToken.objects.select_related("user__tenant").get(
            token_hash=token_hash
        )
    except RefreshToken.DoesNotExist:
        raise HttpError(401, get_message("AUTH_TOKEN_INVALID"))

    if not db_token.is_valid:
        raise HttpError(401, get_message("AUTH_TOKEN_INVALID"))
    user = db_token.user
    if not user.is_active:
        raise HttpError(401, get_message("AUTH_TOKEN_INVALID"))

    access = create_access_token(
        user_id=str(user.id),
        tenant_id=str(user.tenant_id) if user.tenant_id else None,
        role=user.role,
    )
    return RefreshOut(access_token=access, token_type="bearer")


@router.post("/logout/", auth=jwt_auth, response=MessageOut, summary="Cerrar sesion")
def logout(request, payload: LogoutIn):
    """Revokes the given refresh token."""
    token_hash = hash_token(payload.refresh_token)
    RefreshToken.objects.filter(
        token_hash=token_hash, user=request.user, revoked_at__isnull=True
    ).update(revoked_at=dj_timezone.now())
    return MessageOut(success=True, message=get_message("AUTH_LOGOUT_SUCCESS"))


@router.post(
    "/password-reset/request/",
    auth=None,
    response=MessageOut,
    summary="Solicitar restablecimiento de contrasena",
)
def password_reset_request(request, payload: PasswordResetRequestIn):
    """Sends a 6-char OTP. Always returns 200 to prevent email enumeration."""
    try:
        user = User.objects.get(email=payload.email, is_active=True)
        otp = secrets.token_hex(3).upper()
        _store_otp(payload.email, otp, "password_reset")
        _send_otp_email(
            email=payload.email,
            otp=otp,
            subject="Restablecer contrasena -- Loyallia",
            body=f"Hola {user.first_name or payload.email},\n\nTu codigo de restablecimiento es: {otp}\n\nEste codigo expira en 15 minutos.\n\n-- Loyallia",
        )
    except User.DoesNotExist:
        pass
    return MessageOut(
        success=True,
        message=get_message("AUTH_PASSWORD_RESET_SENT", email=payload.email),
    )


@router.post(
    "/password-reset/confirm/",
    auth=None,
    response=MessageOut,
    summary="Confirmar restablecimiento de contrasena",
)
def password_reset_confirm(request, payload: PasswordResetConfirmIn):
    """Validates OTP and sets new password."""
    if not _verify_otp(payload.email, payload.otp, "password_reset"):
        raise HttpError(400, get_message("AUTH_PASSWORD_RESET_EXPIRED"))
    try:
        user = User.objects.get(email=payload.email, is_active=True)
    except User.DoesNotExist:
        raise HttpError(400, get_message("AUTH_PASSWORD_RESET_EXPIRED"))

    user.set_password(payload.new_password)
    user.failed_login_count = 0
    user.locked_until = None
    user.save(
        update_fields=["password", "failed_login_count", "locked_until", "updated_at"]
    )
    RefreshToken.objects.filter(user=user, revoked_at__isnull=True).update(
        revoked_at=dj_timezone.now()
    )
    return MessageOut(success=True, message=get_message("AUTH_PASSWORD_RESET_SUCCESS"))


@router.post(
    "/verify-email/",
    auth=None,
    response=MessageOut,
    summary="Verificar correo electronico",
)
def verify_email(request, payload: VerifyEmailIn):
    """Validates email verification OTP and marks user as verified."""
    if not _verify_otp(payload.email, payload.otp, "verify_email"):
        raise HttpError(400, get_message("AUTH_TOKEN_INVALID"))
    try:
        user = User.objects.get(email=payload.email)
    except User.DoesNotExist:
        raise HttpError(400, get_message("AUTH_TOKEN_INVALID"))
    user.is_email_verified = True
    user.save(update_fields=["is_email_verified", "updated_at"])
    return MessageOut(success=True, message=get_message("AUTH_EMAIL_VERIFIED"))


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


@router.post(
    "/invite/", auth=jwt_auth, response=MessageOut, summary="Invitar usuario al equipo"
)
def invite_user(request, payload: InviteIn):
    """OWNER invites a MANAGER or STAFF user."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    if User.objects.filter(email=payload.email, tenant=request.tenant).exists():
        raise HttpError(409, get_message("AUTH_INVALID_CREDENTIALS"))

    invitation_token = secrets.token_urlsafe(32)
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
            invitation_token=invitation_token,
        )

    invite_url = f"{settings.APP_URL}/invite/accept/?token={invitation_token}"
    _send_otp_email(
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
        import uuid

        target = User.objects.get(id=uuid.UUID(user_id), tenant=request.tenant)
    except (User.DoesNotExist, ValueError):
        raise HttpError(404, get_message("NOT_FOUND"))
    target.is_active = False
    target.save(update_fields=["is_active", "updated_at"])
    RefreshToken.objects.filter(user=target, revoked_at__isnull=True).update(
        revoked_at=dj_timezone.now()
    )
    return MessageOut(success=True, message=get_message("AUTH_USER_DEACTIVATED"))


# =============================================================================
# FORGOT PASSWORD (unauthenticated) — Request + Confirm
# =============================================================================


@router.post(
    "/forgot-password/",
    response=MessageOut,
    summary="Solicitar restablecimiento de contrasena",
)
def forgot_password(request, payload: ForgotPasswordIn):
    """Send a password reset email with a one-time token."""
    from django.contrib.auth.tokens import default_token_generator
    from django.utils.encoding import force_bytes
    from django.utils.http import urlsafe_base64_encode

    try:
        user = User.objects.get(email=payload.email, is_active=True)
    except User.DoesNotExist:
        return MessageOut(success=True, message=get_message("AUTH_RESET_EMAIL_SENT"))

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    app_url = getattr(settings, "FRONTEND_URL", "http://localhost:33906")
    reset_link = f"{app_url}/reset-password?uid={uid}&token={token}"

    try:
        send_mail(
            subject="Loyallia -- Restablecer contrasena",
            message=(
                f"Hola {user.first_name or user.email},\n\n"
                f"Recibimos una solicitud para restablecer tu contrasena.\n"
                f"Haz clic en el siguiente enlace:\n\n{reset_link}\n\n"
                f"Este enlace expira en 24 horas.\nSi no solicitaste esto, ignora este correo.\n\n-- Loyallia"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
    except Exception:
        logger.exception("Failed to send password reset email to %s", user.email)

    logger.info("Password reset requested for %s", payload.email)
    return MessageOut(success=True, message=get_message("AUTH_RESET_EMAIL_SENT"))


@router.post(
    "/reset-password/",
    response=MessageOut,
    summary="Confirmar restablecimiento de contrasena",
)
def reset_password(request, payload: ResetPasswordIn):
    """Validate the reset token and set a new password."""
    from django.contrib.auth.tokens import default_token_generator
    from django.utils.http import urlsafe_base64_decode

    try:
        uid_bytes = urlsafe_base64_decode(payload.uid)
        user = User.objects.get(pk=uid_bytes.decode())
    except (User.DoesNotExist, ValueError, TypeError, OverflowError):
        raise HttpError(400, get_message("AUTH_RESET_INVALID"))

    if not default_token_generator.check_token(user, payload.token):
        raise HttpError(400, get_message("AUTH_RESET_INVALID"))

    user.set_password(payload.new_password)
    user.save(update_fields=["password", "updated_at"])
    RefreshToken.objects.filter(user=user, revoked_at__isnull=True).update(
        revoked_at=dj_timezone.now()
    )
    logger.info("Password reset completed for %s", user.email)
    return MessageOut(success=True, message=get_message("AUTH_PASSWORD_CHANGED"))
