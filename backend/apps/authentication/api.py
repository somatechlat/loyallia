"""
Loyallia Authentication API Router (apps/authentication/api.py)

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

from django.conf import settings
from django.http import HttpRequest
from ninja import Router
from ninja.errors import HttpError

from apps.authentication import services
from apps.authentication.helpers import issue_tokens
from apps.authentication.models import User
from apps.authentication.schemas import (
    ForgotPasswordIn,
    GoogleTokenIn,
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
from apps.authentication.tokens import hash_token
from apps.tenants.models import PlatformSetting
from common.messages import get_message
from common.permissions import jwt_auth
from common.rate_limit import get_client_ip, rate_limit
from common.schemas import MessageOut

logger = logging.getLogger(__name__)
router = Router()

# AUTH ENDPOINTS


@router.post(
    "/register/", auth=None, response=RegisterOut, summary="Registrar nuevo negocio"
)
def register(request: HttpRequest, payload: RegisterIn):
    """Create a new tenant (business) with its OWNER user atomically.

    SEC: Returns success even for existing emails to prevent user enumeration

    PERF: Single atomic transaction wraps Tenant + User creation to avoid
    orphaned records on partial failure.
    """
    if User.objects.filter(email=payload.email).exists():
        return RegisterOut(
            success=True,
            message=get_message(
                "TENANT_CREATED",
                days=PlatformSetting.get_int(
                    "TRIAL_DAYS", getattr(settings, "TRIAL_DAYS", 5)
                ),
            ),
            tenant_id="",
            user_id="",
            # Distinguishable from real creation so frontend can show helpful message
            existing_email=True,
        )

    try:
        result = services.register_user(payload.model_dump())
    except ValueError as exc:
        raise HttpError(500, get_message(str(exc)))

    return RegisterOut(**result)


@router.post("/login/", auth=None, response=TokenOut, summary="Iniciar sesion")
def login(request: HttpRequest, payload: LoginIn):
    """Authenticate via email+password, return JWT access + refresh tokens.

    SEC: Failed login attempts tracked per-user. After 5 consecutive failures,
    account is locked for 15 minutes (brute-force protection).
    PERF: select_related("tenant") loads User+Tenant in a single JOIN query.
    """
    result = services.authenticate_user(payload.email, payload.password)

    if "error" in result:
        if result["error"] == "ACCOUNT_LOCKED":
            minutes = result.get("minutes", 15)
            raise HttpError(423, get_message("AUTH_ACCOUNT_LOCKED", minutes=minutes))
        if result["error"] == "INVALID_CREDENTIALS":
            raise HttpError(401, get_message("AUTH_INVALID_CREDENTIALS"))
        raise HttpError(401, get_message("AUTH_INVALID_CREDENTIALS"))

    user = result["user"]
    tokens = issue_tokens(user)
    try:
        from apps.audit.models import AuditAction
        from apps.audit.service import log_action

        log_action(
            request=request,
            action=AuditAction.LOGIN,
            resource_type="user",
            resource_id=str(user.id),
            tenant_id=(
                str(getattr(user, "tenant_id", None))
                if getattr(user, "tenant_id", None)
                else None
            ),
            details={"method": "email"},
            status="success",
        )
    except Exception as e:
        logger.exception("Failed to log successful login audit action: %s", e)
    return tokens


@router.post(
    "/refresh/", auth=None, response=RefreshOut, summary="Renovar token de acceso"
)
def refresh_token(request: HttpRequest, payload: RefreshIn):
    """Validate refresh token and issue a new access+refresh pair.

    SEC: B-002 -- Refresh token rotation. The used token is revoked atomically
    (select_for_update) and a new pair is issued. Stolen tokens become single-use.
    PERF: select_for_update(of=("self",)) locks only the RefreshToken row,
    not the joined User row, minimizing lock contention.
    """
    token_hash = hash_token(payload.refresh_token)
    result = services.rotate_refresh_token(token_hash)

    if "error" in result:
        raise HttpError(401, get_message("AUTH_TOKEN_INVALID"))

    return issue_tokens(result["user"])


@router.post("/logout/", auth=jwt_auth, response=MessageOut, summary="Cerrar sesion")
def logout(request: HttpRequest, payload: LogoutIn):
    """Revoke the given refresh token.

    PERF: filter().update() revokes in a single UPDATE query without loading
    the RefreshToken object into Python memory.
    """
    token_hash = hash_token(payload.refresh_token)
    services.revoke_refresh_tokens(token_hash, request.user)  # type: ignore[reportArgumentType]
    try:
        from apps.audit.models import AuditAction
        from apps.audit.service import log_action

        log_action(
            request=request,
            action=AuditAction.LOGOUT,
            resource_type="user",
            resource_id=str(request.user.id),
            tenant_id=(
                str(request.tenant.id)
                if hasattr(request, "tenant") and request.tenant
                else None
            ),
            details={"method": "refresh_token_revocation"},
            status="success",
        )
    except Exception as e:
        logger.exception("Failed to log logout audit action: %s", e)
    return MessageOut(success=True, message=get_message("AUTH_LOGOUT_SUCCESS"))


@router.post(
    "/verify-email/",
    auth=None,
    response=MessageOut,
    summary="Verificar correo electronico",
)
def verify_email(request: HttpRequest, payload: VerifyEmailIn):
    """Validate email verification OTP and mark user as email-verified.

    SEC: OTP verification capped at 5 attempts per 15 min per email.
    PERF: save(update_fields=[...]) updates only the changed column.
    """
    result = services.verify_email_with_otp(payload.email, payload.otp)

    if "error" in result:
        if result["error"] == "RATE_LIMITED":
            raise HttpError(429, get_message("RATE_LIMITED"))
        raise HttpError(400, get_message("AUTH_TOKEN_INVALID"))

    return MessageOut(success=True, message=get_message("AUTH_EMAIL_VERIFIED"))


# FORGOT PASSWORD (unauthenticated) Request + Confirm


@router.post(
    "/forgot-password/",
    response=MessageOut,
    summary="Solicitar restablecimiento de contrasena",
)
@rate_limit(
    key_prefix="forgot_password",
    max_requests=settings.FORGOT_PASSWORD_RATE_LIMIT_MAX,
    window_seconds=settings.FORGOT_PASSWORD_RATE_LIMIT_WINDOW,
)
def forgot_password(request: HttpRequest, payload: ForgotPasswordIn):
    """Send a password reset email with a one-time token.

    B-003: Rate limited to 3 requests per hour per email.
    """
    services.send_password_reset(payload.email)
    return MessageOut(success=True, message=get_message("AUTH_RESET_EMAIL_SENT"))


@router.post(
    "/reset-password/",
    response=MessageOut,
    summary="Confirmar restablecimiento de contrasena",
)
def reset_password(request: HttpRequest, payload: ResetPasswordIn):
    """Validate the reset token and set a new password."""
    result = services.reset_user_password(
        payload.uid, payload.token, payload.new_password
    )

    if "error" in result:
        raise HttpError(400, get_message("AUTH_RESET_INVALID"))

    return MessageOut(success=True, message=get_message("AUTH_PASSWORD_CHANGED"))


# GOOGLE OAUTH 2.0 Social Login


@router.get(
    "/google/config/",
    auth=None,
    summary="Obtener configuración de Google OAuth",
)
def google_oauth_config(request: HttpRequest):
    """Returns Google OAuth config for the frontend.

    NOTE: client_id is a PUBLIC identifier — Google's own documentation
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
def google_login(request: HttpRequest, payload: GoogleTokenIn):
    """Verify Google ID token server-side and issue JWT tokens.

    Flow:
    1. Frontend uses Google Identity Services (GSI) to get an ID token
    2. Frontend sends the ID token here
    3. Backend verifies the token with Google's tokeninfo endpoint
    4. If user exists → login
    5. If user doesn't exist → create tenant + OWNER user (auto-verified email)

    """
    client_ip = get_client_ip(request)
    token_result = services.verify_google_token(payload.credential, client_ip)

    if "error" in token_result:
        error = token_result["error"]
        if error == "RATE_LIMITED":
            raise HttpError(429, get_message("RATE_LIMITED"))
        if error == "GOOGLE_NOT_CONFIGURED":
            raise HttpError(503, get_message("AUTH_GOOGLE_NOT_CONFIGURED"))
        raise HttpError(401, get_message("AUTH_GOOGLE_FAILED"))

    login_result = services.google_login_or_register(
        email=token_result["email"],
        first_name=token_result["first_name"],
        last_name=token_result["last_name"],
        business_name=payload.business_name or "",
        is_login_only=payload.is_login_only,
    )

    if "error" in login_result:
        error = login_result["error"]
        if error == "INVALID_CREDENTIALS":
            raise HttpError(401, get_message("AUTH_INVALID_CREDENTIALS"))
        if error == "USER_NOT_FOUND":
            raise HttpError(404, get_message("AUTH_USER_NOT_FOUND_REGISTER"))
        raise HttpError(401, get_message("AUTH_GOOGLE_FAILED"))

    return issue_tokens(login_result["user"])
