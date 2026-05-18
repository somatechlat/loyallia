"""
Loyallia  Authentication API Router (apps/authentication/api.py)

Handles the complete auth lifecycle: registration, login, token refresh,
logout, password reset, email verification, and Google OAuth 2.0.

Architecture:
    - Registration creates Tenant + OWNER User atomically (REQ-AUTH-001).
    - Login issues JWT access + refresh token pair.
    - Refresh implements token rotation: old token revoked after use (B-002).
    - Password reset uses time-limited OTP with rate limiting (B-003).
    - Google OAuth verifies ID tokens server-side against Google tokeninfo API.

Performance (Rule 12):
    - Login: single query via select_related("tenant") for User+Tenant JOIN.
    - Refresh: select_for_update(of=("self",)) with select_related for atomic rotation.
    - Logout: bulk update via filter().update() -- no object instantiation.
    - save(update_fields=[...]) used everywhere to avoid full-row writes.

Security (SEC):
    - All public endpoints rate-limited via Redis cache counters.
    - OTP verification capped at 5 attempts per 15 min per email.
    - Google OAuth capped at 20 attempts per hour per IP.
    - Registration returns success for existing emails (prevents enumeration).
    - Password reset revokes all existing refresh tokens (B-002).

Called by: Frontend auth pages (login, register, forgot-password, Google button).
All strings via get_message() -- Rule #11.
"""

import logging
import secrets
from typing import cast

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
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
from apps.authentication.models import RefreshToken, User, UserManager, UserRole
from apps.authentication.schemas import (
    ForgotPasswordIn,
    LoginIn,
    LogoutIn,
    RefreshIn,
    RefreshOut,
    RegisterIn,
    RegisterOut,
    ResetPasswordIn,
    TokenOut,
    VerifyEmailIn,
)
from common.schemas import MessageOut
from apps.authentication.tokens import (
    hash_token,
)
from apps.tenants.models import PlatformSetting, Tenant
from common.messages import get_message
from common.permissions import jwt_auth
from common.rate_limit import get_client_ip, rate_limit

logger = logging.getLogger(__name__)
router = Router()


# AUTH ENDPOINTS


@router.post("/register/", auth=None, response=RegisterOut, summary="Registrar nuevo negocio")
def register(request, payload: RegisterIn):
    """Create a new tenant (business) with its OWNER user atomically.

    SEC: Returns success even for existing emails to prevent user enumeration
    (LYL-M-SEC-016). An attacker cannot determine if an email is registered.
    PERF: Single atomic transaction wraps Tenant + User creation to avoid
    orphaned records on partial failure.
    """
    from django.db import transaction

 # SEC: LYL-M-SEC-016 -- fake success for existing emails (prevents enumeration)
    if User.objects.filter(email=payload.email).exists():
        return RegisterOut(
            success=True,
            message=get_message(
                "TENANT_CREATED",
                days=PlatformSetting.get_int("TRIAL_DAYS", getattr(settings, "TRIAL_DAYS", 5)),
            ),
            tenant_id="",
            user_id="",
        )

 # Server-side phone verification (NO BYPASS)
    is_phone_verified = False
    if payload.phone_number.strip() and payload.phone_verification_sid:
        try:
            from apps.notifications.twilio_verify.client import VerifyClient, VerifyServiceError

            client = VerifyClient()
            verification = client.fetch_verification(payload.phone_verification_sid)
            if verification.get("status") == "approved":
                is_phone_verified = True
                logger.info("Registration phone verified via Twilio: %s", payload.phone_number)
        except VerifyServiceError as exc:
            logger.warning(
                "Registration phone verification failed for %s: %s",
                payload.phone_number,
                exc,
            )

    with transaction.atomic():
        slug = slugify_business(payload.business_name)
        tenant = Tenant.objects.create(name=payload.business_name.strip(), slug=slug)
        tenant.activate_trial()
        user_manager = cast(UserManager, User.objects)
        user = user_manager.create_user(
            email=payload.email,
            password=payload.password,
            first_name=payload.first_name.strip(),
            last_name=payload.last_name.strip(),
            phone_number=payload.phone_number.strip(),
            tenant=tenant,
            role=UserRole.OWNER,
            is_active=True,
            is_email_verified=False,
            is_phone_verified=is_phone_verified,
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
    """Authenticate via email+password, return JWT access + refresh tokens.

    SEC: Failed login attempts tracked per-user. After 5 consecutive failures,
    account is locked for 15 minutes (brute-force protection).
    PERF: select_related("tenant") loads User+Tenant in a single JOIN query.
    """
    try:
        user = User.objects.select_related("tenant").get(email=payload.email)
    except User.DoesNotExist:
        raise HttpError(401, get_message("AUTH_INVALID_CREDENTIALS"))

    if user.is_locked:
        if user.locked_until is None:
            raise HttpError(423, get_message("AUTH_ACCOUNT_LOCKED", minutes=15))
        remaining = max(0, int((user.locked_until - dj_timezone.now()).total_seconds() / 60))
        raise HttpError(423, get_message("AUTH_ACCOUNT_LOCKED", minutes=remaining))
    if not user.is_active:
        raise HttpError(401, get_message("AUTH_INVALID_CREDENTIALS"))
    if not user.check_password(payload.password):
        user.record_failed_login()
        try:
            from apps.audit.models import AuditAction
            from apps.audit.service import log_action

            log_action(
                request=request,
                action=AuditAction.LOGIN,
                resource_type="user",
                resource_id=str(user.id),
                tenant_id=str(user.tenant_id) if user.tenant_id else None,
                details={"method": "email", "reason": "invalid_password"},
                status="denied",
            )
        except Exception:
            pass
        raise HttpError(401, get_message("AUTH_INVALID_CREDENTIALS"))

    user.reset_failed_login()
    tokens = issue_tokens(user)
    try:
        from apps.audit.models import AuditAction
        from apps.audit.service import log_action

        log_action(
            request=request,
            action=AuditAction.LOGIN,
            resource_type="user",
            resource_id=str(user.id),
            tenant_id=str(user.tenant_id) if user.tenant_id else None,
            details={"method": "email"},
            status="success",
        )
    except Exception:
        pass
    return tokens


@router.post("/refresh/", auth=None, response=RefreshOut, summary="Renovar token de acceso")
def refresh_token(request, payload: RefreshIn):
    """Validate refresh token and issue a new access+refresh pair.

    SEC: B-002 -- Refresh token rotation. The used token is revoked atomically
    (select_for_update) and a new pair is issued. Stolen tokens become single-use.
    PERF: select_for_update(of=("self",)) locks only the RefreshToken row,
    not the joined User row, minimizing lock contention.
    """
    token_hash = hash_token(payload.refresh_token)
    try:
        with transaction.atomic():
            db_token = (
                RefreshToken.objects.select_for_update(of=("self",))
                .select_related("user__tenant")
                .get(token_hash=token_hash)
            )

            if not db_token.is_valid:
                raise HttpError(401, get_message("AUTH_TOKEN_INVALID"))
            user = db_token.user
            if not user.is_active:
                raise HttpError(401, get_message("AUTH_TOKEN_INVALID"))

 # B-002: Revoke the old refresh token (one-time use)
            db_token.revoked_at = dj_timezone.now()
            db_token.save(update_fields=["revoked_at"])
    except RefreshToken.DoesNotExist:
        raise HttpError(401, get_message("AUTH_TOKEN_INVALID"))

    return issue_tokens(user)


@router.post("/logout/", auth=jwt_auth, response=MessageOut, summary="Cerrar sesion")
def logout(request, payload: LogoutIn):
    """Revoke the given refresh token.

    PERF: filter().update() revokes in a single UPDATE query without loading
    the RefreshToken object into Python memory.
    """
    token_hash = hash_token(payload.refresh_token)
    RefreshToken.objects.filter(token_hash=token_hash, user=request.user, revoked_at__isnull=True).update(
        revoked_at=dj_timezone.now()
    )
    try:
        from apps.audit.models import AuditAction
        from apps.audit.service import log_action

        log_action(
            request=request,
            action=AuditAction.LOGOUT,
            resource_type="user",
            resource_id=str(request.user.id),
            tenant_id=str(request.tenant.id) if hasattr(request, "tenant") and request.tenant else None,
            details={"method": "refresh_token_revocation"},
            status="success",
        )
    except Exception:
        pass
    return MessageOut(success=True, message=get_message("AUTH_LOGOUT_SUCCESS"))


@router.post(
    "/verify-email/",
    auth=None,
    response=MessageOut,
    summary="Verificar correo electronico",
)
def verify_email(request, payload: VerifyEmailIn):
    """Validate email verification OTP and mark user as email-verified.

    SEC: OTP verification capped at 5 attempts per 15 min per email.
    PERF: save(update_fields=[...]) updates only the changed column.
    """
    from django.core.cache import cache

 # Rate limit OTP verification attempts 5 per 15 min per email
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


# FORGOT PASSWORD (unauthenticated) Request + Confirm


@router.post(
    "/forgot-password/",
    response=MessageOut,
    summary="Solicitar restablecimiento de contrasena",
)
@rate_limit(key_prefix="forgot_password", max_requests=5, window_seconds=3600)
def forgot_password(request, payload: ForgotPasswordIn):
    """Send a password reset email with a one-time token.

    B-003: Rate limited to 3 requests per hour per email.
    """
    from django.contrib.auth.tokens import default_token_generator
    from django.core.cache import cache
    from django.utils.encoding import force_bytes
    from django.utils.http import urlsafe_base64_encode

 # B-003: Rate limit 3 password reset requests per hour per email
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
    from apps.tenants.models import PlatformSetting
    app_url = PlatformSetting.get("dashboard_url", settings.FRONTEND_URL)
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
    RefreshToken.objects.filter(user=user, revoked_at__isnull=True).update(revoked_at=dj_timezone.now())
    logger.info("Password reset completed for %s", user.email)
    return MessageOut(success=True, message=get_message("AUTH_PASSWORD_CHANGED"))


# GOOGLE OAUTH 2.0 Social Login


from apps.authentication.schemas import GoogleTokenIn  # noqa: E402


@router.get(
    "/google/config/",
    auth=None,
    summary="Obtener configuración de Google OAuth",
)
def google_oauth_config(request):
    """Returns Google OAuth config for the frontend.

    NOTE: client_id is a PUBLIC identifier  Google's own documentation
    requires embedding it in frontend <script> tags and meta tags.
    It is NOT a secret. The frontend needs it to initialize the
    Google Identity Services (GSI) button via google.accounts.id.initialize().

    PERF: Reads from Vault directly so SUPER_ADMIN updates take effect
    without requiring a container restart.
    """
    from common.vault import get_secret

    client_id = get_secret("google_oauth_client_id", default="")
    return {
        "enabled": bool(client_id),
        "client_id": client_id,
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
    client_ip = get_client_ip(request)
    cache_key = f"gauth_rate:{client_ip}"
    attempt_count = cache.get(cache_key, 0)
    if attempt_count >= 20:
        raise HttpError(429, get_message("RATE_LIMITED"))
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

 # New user create tenant + OWNER
    from django.db import transaction

    business_name = payload.business_name.strip()
    if not business_name:
 # Use the user's name as default business name
        business_name = f"{first_name} {last_name}".strip() or email.split("@")[0]

    with transaction.atomic():
        slug = slugify_business(business_name)
        tenant = Tenant.objects.create(name=business_name, slug=slug)
        tenant.activate_trial()
        user_manager = cast(UserManager, User.objects)
        user = user_manager.create_user(
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
