"""
Loyallia — Authentication API (Django Ninja Router)
Handles: registration, login, refresh, logout, password reset, email verification,
         user invitation, user listing, user deactivation.

All strings via get_message() — Rule #11.
All auth via JWTAuth — Rule #8.
"""

import hashlib
import logging
import secrets

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone as dj_timezone
from ninja import Router
from ninja.errors import HttpError

from apps.authentication.helpers import (
    issue_tokens,
    send_otp_email,
    slugify_business,
    store_otp,
    verify_otp,
)
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
    hash_token,
)
from apps.tenants.models import Tenant
from common.messages import get_message
from common.permissions import is_owner, jwt_auth

logger = logging.getLogger(__name__)
router = Router()


# =============================================================================
# AUTH ENDPOINTS
# =============================================================================


@router.post(
    "/register/", auth=None, response=RegisterOut, summary="Registrar nuevo negocio"
)
def register(request, payload: RegisterIn):
    """Creates a Tenant + OWNER user in a single atomic transaction."""
    from django.db import transaction

    # LYL-M-SEC-016: Generic error to prevent user enumeration
    if User.objects.filter(email=payload.email).exists():
        return RegisterOut(
            success=True,
            message=get_message("TENANT_CREATED", days=settings.TRIAL_DAYS),
            tenant_id="",
            user_id="",
        )

    with transaction.atomic():
        slug = slugify_business(payload.business_name)
        tenant = Tenant.objects.create(name=payload.business_name.strip(), slug=slug)
        tenant.activate_trial()
        user = User.objects.create_user(
            email=payload.email,
            password=payload.password,
            first_name=payload.first_name.strip(),
            last_name=payload.last_name.strip(),
            phone_number=payload.phone_number.strip(),
            tenant=tenant,
            role=UserRole.OWNER,
            is_active=True,
            is_email_verified=False,
        )

    otp = secrets.token_urlsafe(8)
    store_otp(payload.email, otp, "verify_email")
    send_otp_email(
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
    return issue_tokens(user)


@router.post(
    "/refresh/", auth=None, response=RefreshOut, summary="Renovar token de acceso"
)
def refresh_token(request, payload: RefreshIn):
    """Validates a refresh token and issues a new access token.

    B-002: Implements refresh token rotation — old token is revoked after use
    and a new refresh token is issued. Stolen tokens become single-use.
    """
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

    # B-002: Revoke the old refresh token (one-time use)
    db_token.revoked_at = dj_timezone.now()
    db_token.save(update_fields=["revoked_at"])

    # Issue new tokens (access + refresh rotation)
    from apps.authentication.helpers import issue_tokens

    return issue_tokens(user)


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
    """Sends a 6-char OTP. Always returns 200 to prevent email enumeration.

    B-003: Rate limited to 3 requests per hour per email.
    """
    from django.core.cache import cache

    # B-003: Rate limit — 3 password reset requests per hour per email
    cache_key = f"pwd_reset_rate:{payload.email}"
    attempts = cache.get(cache_key, 0)
    if attempts >= 3:
        # Still return 200 to prevent enumeration
        return MessageOut(
            success=True,
            message=get_message("AUTH_PASSWORD_RESET_SENT", email=payload.email),
        )
    cache.set(cache_key, attempts + 1, 3600)  # 1 hour TTL

    try:
        user = User.objects.get(email=payload.email, is_active=True)
        otp = secrets.token_urlsafe(8)
        store_otp(payload.email, otp, "password_reset")
        send_otp_email(
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
    from django.core.cache import cache

    # Rate limit OTP verification attempts — 5 per 15 min per email
    cache_key = f"otp_attempts:password_reset:{payload.email}"
    attempts = cache.get(cache_key, 0)
    if attempts >= 5:
        raise HttpError(429, get_message("RATE_LIMITED"))
    cache.set(cache_key, attempts + 1, 900)

    if not verify_otp(payload.email, payload.otp, "password_reset"):
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
    from django.core.cache import cache

    # Rate limit OTP verification attempts — 5 per 15 min per email
    cache_key = f"otp_attempts:verify_email:{payload.email}"
    attempts = cache.get(cache_key, 0)
    if attempts >= 5:
        raise HttpError(429, get_message("RATE_LIMITED"))
    cache.set(cache_key, attempts + 1, 900)

    if not verify_otp(payload.email, payload.otp, "verify_email"):
        raise HttpError(400, get_message("AUTH_TOKEN_INVALID"))
    try:
        user = User.objects.get(email=payload.email)
    except User.DoesNotExist:
        raise HttpError(400, get_message("AUTH_TOKEN_INVALID"))
    user.is_email_verified = True
    user.save(update_fields=["is_email_verified", "updated_at"])
    return MessageOut(success=True, message=get_message("AUTH_EMAIL_VERIFIED"))


# =============================================================================
# FORGOT PASSWORD (unauthenticated) — Request + Confirm
# =============================================================================


@router.post(
    "/forgot-password/",
    response=MessageOut,
    summary="Solicitar restablecimiento de contrasena",
)
def forgot_password(request, payload: ForgotPasswordIn):
    """Send a password reset email with a one-time token.

    B-003: Rate limited to 3 requests per hour per email.
    """
    from django.contrib.auth.tokens import default_token_generator
    from django.core.cache import cache
    from django.utils.encoding import force_bytes
    from django.utils.http import urlsafe_base64_encode

    # B-003: Rate limit — 3 password reset requests per hour per email
    cache_key = f"pwd_reset_rate:{payload.email}"
    attempts = cache.get(cache_key, 0)
    if attempts >= 3:
        return MessageOut(success=True, message=get_message("AUTH_RESET_EMAIL_SENT"))
    cache.set(cache_key, attempts + 1, 3600)  # 1 hour TTL

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


# =============================================================================
# GOOGLE OAUTH 2.0 — Social Login
# =============================================================================

from apps.authentication.schemas import GoogleTokenIn  # noqa: E402


@router.get(
    "/google/config/",
    auth=None,
    summary="Obtener configuración de Google OAuth",
)
def google_oauth_config(request):
    """Returns Google OAuth enabled status only.

    SECURITY (LYL-H-SEC-008): Do NOT expose client_id to the frontend.
    The frontend only needs to know whether Google login is enabled.
    """
    client_id = settings.GOOGLE_OAUTH_CLIENT_ID
    return {
        "enabled": bool(client_id),
    }


@router.post(
    "/google/login/",
    auth=None,
    response=TokenOut,
    summary="Iniciar sesión con Google",
)
def google_login(request, payload: GoogleTokenIn):
    """Verify Google ID token server-side and issue JWT tokens.

    Flow:
    1. Frontend uses Google Identity Services (GSI) to get an ID token
    2. Frontend sends the ID token here
    3. Backend verifies the token with Google's tokeninfo endpoint
    4. If user exists → login
    5. If user doesn't exist → create tenant + OWNER user (auto-verified email)

    LYL-L-SEC-023: Rate limited to 20 attempts per hour per IP to prevent abuse.
    """
    import httpx
    from django.core.cache import cache

    # LYL-L-SEC-023: Rate limit Google OAuth login (20/hour per IP)
    client_ip = request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
    if not client_ip:
        client_ip = request.META.get("REMOTE_ADDR", "unknown")
    cache_key = f"gauth_rate:{client_ip}"
    attempt_count = cache.get(cache_key, 0)
    if attempt_count >= 20:
        raise HttpError(429, "Too many login attempts. Please try again later.")
    cache.set(cache_key, attempt_count + 1, 3600)

    client_id = settings.GOOGLE_OAUTH_CLIENT_ID
    if not client_id:
        raise HttpError(503, get_message("AUTH_GOOGLE_NOT_CONFIGURED"))

    # Verify the ID token with Google's tokeninfo endpoint
    try:
        resp = httpx.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": payload.credential},
            timeout=10.0,
        )
        if resp.status_code != 200:
            logger.warning("Google token verification failed: %s", resp.text)
            raise HttpError(401, get_message("AUTH_GOOGLE_FAILED"))
        google_data = resp.json()
    except httpx.HTTPError as exc:
        logger.error("Google token verification network error: %s", exc)
        raise HttpError(502, get_message("AUTH_GOOGLE_FAILED"))

    # Validate the audience (must match our client ID)
    if google_data.get("aud") != client_id:
        logger.warning(
            "Google token audience mismatch: got %s, expected %s",
            google_data.get("aud"),
            client_id,
        )
        raise HttpError(401, get_message("AUTH_GOOGLE_FAILED"))

    # Validate email is verified by Google
    if google_data.get("email_verified") != "true":
        raise HttpError(401, get_message("AUTH_GOOGLE_FAILED"))

    email = google_data.get("email", "").lower().strip()
    if not email:
        raise HttpError(401, get_message("AUTH_GOOGLE_FAILED"))

    first_name = google_data.get("given_name", "")
    last_name = google_data.get("family_name", "")

    # Check if user already exists
    try:
        user = User.objects.select_related("tenant").get(email=email)
        if not user.is_active:
            raise HttpError(401, get_message("AUTH_INVALID_CREDENTIALS"))
        # Mark email as verified (Google already verified it)
        if not user.is_email_verified:
            user.is_email_verified = True
            user.save(update_fields=["is_email_verified", "updated_at"])
        user.reset_failed_login()
        logger.info("Google OAuth login: existing user %s", email)
        return issue_tokens(user)
    except User.DoesNotExist:
        if payload.is_login_only:
            logger.warning("Google OAuth login failed: unregistered user %s", email)
            raise HttpError(404, get_message("AUTH_USER_NOT_FOUND_REGISTER"))

    # New user — create tenant + OWNER
    from django.db import transaction

    business_name = payload.business_name.strip()
    if not business_name:
        # Use the user's name as default business name
        business_name = f"{first_name} {last_name}".strip() or email.split("@")[0]

    with transaction.atomic():
        slug = slugify_business(business_name)
        tenant = Tenant.objects.create(name=business_name, slug=slug)
        tenant.activate_trial()
        user = User.objects.create_user(
            email=email,
            password=secrets.token_urlsafe(32),  # Random password (user logs in via Google)
            first_name=first_name,
            last_name=last_name,
            tenant=tenant,
            role=UserRole.OWNER,
            is_active=True,
            is_email_verified=True,  # Google already verified this
        )

    logger.info("Google OAuth register: new user %s, tenant %s", email, tenant.slug)
    return issue_tokens(user)
