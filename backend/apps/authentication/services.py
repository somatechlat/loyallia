"""Loyallia Authentication Service Layer.

Extracted business logic from authentication API views.
"""

import logging
import secrets
from typing import cast

from django.conf import settings
from django.core.mail import send_mail
from django.db import IntegrityError, transaction
from django.utils import timezone as dj_timezone

from apps.authentication.helpers import (
    issue_tokens,
    send_otp_email,
    slugify_business,
    store_otp,
    verify_otp,
)
from apps.authentication.models import RefreshToken, User, UserManager, UserRole
from apps.authentication.tokens import hash_token
from apps.tenants.models import PlatformSetting, Tenant
from common.email_config import get_default_from_email
from common.messages import get_message

logger = logging.getLogger(__name__)


def register_user(payload: dict) -> dict:
    """Create a new tenant (business) with its OWNER user atomically.

    Returns registration result dict.
    """
    from apps.notifications.twilio_verify.client import VerifyClient

    is_phone_verified = False
    phone = payload.get("phone_number", "").strip()
    phone_sid = payload.get("phone_verification_sid", "")
    if phone and phone_sid:
        try:
            client = VerifyClient()
            verification = client.fetch_verification(phone_sid)
            if verification.get("status") == "approved":
                is_phone_verified = True
                logger.info("Registration phone verified via Twilio: %s", phone)
        except Exception as exc:
            logger.warning(
                "Registration phone verification failed for %s: %s",
                phone,
                exc,
            )

    max_slug_attempts = 5
    tenant = None
    user = None
    for _attempt in range(max_slug_attempts):
        try:
            with transaction.atomic():
                slug = slugify_business(payload["business_name"])
                tenant = Tenant.objects.create(
                    name=payload["business_name"].strip(), slug=slug
                )
                tenant.activate_trial()
                user_manager = cast(UserManager, User.objects)
                user = user_manager.create_user(
                    email=payload["email"],
                    password=payload["password"],
                    first_name=payload["first_name"].strip(),
                    last_name=payload["last_name"].strip(),
                    phone_number=phone,
                    tenant=tenant,
                    role=UserRole.OWNER,
                    is_active=True,
                    is_email_verified=False,
                    is_phone_verified=is_phone_verified,
                )
            break
        except IntegrityError:
            continue

    if tenant is None or user is None:
        raise ValueError("TENANT_CREATE_ERROR")

    otp = secrets.token_urlsafe(8)
    store_otp(payload["email"], otp, "verify_email")
    send_otp_email(
        email=payload["email"],
        otp=otp,
        subject="Verifica tu correo -- Loyallia",
        body=f"Hola {user.first_name or payload['email']},\n\nTu codigo de verificacion es: {otp}\n\nEste codigo expira en 15 minutos.\n\n-- Loyallia",
    )

    return {
        "success": True,
        "message": get_message("TENANT_CREATED", days=settings.TRIAL_DAYS),
        "tenant_id": str(tenant.id),
        "user_id": str(user.id),
    }


def authenticate_user(email: str, password: str) -> dict:
    """Authenticate via email+password.

    Returns {"user": user} on success or {"error": code, ...} on failure.
    """
    try:
        user = User.objects.select_related("tenant").get(email=email)
    except User.DoesNotExist:
        return {"error": "INVALID_CREDENTIALS"}

    if user.is_locked:
        if user.locked_until is None:
            return {"error": "ACCOUNT_LOCKED", "minutes": 15}
        remaining = max(
            0, int((user.locked_until - dj_timezone.now()).total_seconds() / 60)
        )
        return {"error": "ACCOUNT_LOCKED", "minutes": remaining}

    if not user.is_active:
        return {"error": "INVALID_CREDENTIALS"}

    if not user.check_password(password):
        user.record_failed_login()
        return {"error": "INVALID_CREDENTIALS"}

    user.reset_failed_login()
    return {"user": user}


def rotate_refresh_token(token_hash: str) -> dict:
    """Validate refresh token and return the associated user.

    Returns {"user": user} on success or {"error": code} on failure.
    """
    try:
        with transaction.atomic():
            db_token = (
                RefreshToken.objects.select_for_update(of=("self",))
                .select_related("user__tenant")
                .get(token_hash=token_hash)
            )

            if not db_token.is_valid:
                return {"error": "INVALID_TOKEN"}
            user = db_token.user
            if not user.is_active:
                return {"error": "INVALID_TOKEN"}

            db_token.revoked_at = dj_timezone.now()
            db_token.save(update_fields=["revoked_at"])
    except RefreshToken.DoesNotExist:
        return {"error": "INVALID_TOKEN"}

    return {"user": user}


def revoke_refresh_tokens(token_hash: str, user: User) -> None:
    """Revoke the given refresh token for a user."""
    RefreshToken.objects.filter(
        token_hash=token_hash, user=user, revoked_at__isnull=True
    ).update(revoked_at=dj_timezone.now())


def verify_email_with_otp(email: str, otp: str) -> dict:
    """Validate email verification OTP and mark user as email-verified.

    Returns {"success": True} or {"error": code}.
    """
    from django.core.cache import cache

    cache_key = f"otp_attempts:verify_email:{email}"
    attempts = cache.get(cache_key, 0)
    if attempts >= 5:
        return {"error": "RATE_LIMITED"}
    cache.set(cache_key, attempts + 1, 900)

    if not verify_otp(email, otp, "verify_email"):
        return {"error": "INVALID_OTP"}

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return {"error": "INVALID_OTP"}

    user.is_email_verified = True
    user.save(update_fields=["is_email_verified", "updated_at"])
    return {"success": True}


def send_password_reset(email: str) -> dict:
    """Send a password reset email with a one-time token.

    Returns {"success": True} whether or not the email exists (prevents enumeration).
    """
    from django.contrib.auth.tokens import default_token_generator
    from django.core.cache import cache
    from django.utils.encoding import force_bytes
    from django.utils.http import urlsafe_base64_encode

    cache_key = f"pwd_reset_rate:{email}"
    attempts = cache.get(cache_key, 0)
    if attempts >= 3:
        return {"success": True}
    cache.set(cache_key, attempts + 1, 3600)

    try:
        user = User.objects.get(email=email, is_active=True)
    except User.DoesNotExist:
        return {"success": True}

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
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
            from_email=get_default_from_email(),
            recipient_list=[user.email],
            fail_silently=True,
        )
    except Exception as e:
        logger.exception("Failed to send password reset email to %s: %s", user.email, e)

    logger.info("Password reset requested for %s", email)
    return {"success": True}


def reset_user_password(uid: str, token: str, new_password: str) -> dict:
    """Validate the reset token and set a new password.

    Returns {"success": True} or {"error": code}.
    """
    from django.contrib.auth.tokens import default_token_generator
    from django.utils.http import urlsafe_base64_decode

    try:
        uid_bytes = urlsafe_base64_decode(uid)
        user = User.objects.get(pk=uid_bytes.decode())
    except (User.DoesNotExist, ValueError, TypeError, OverflowError):
        return {"error": "INVALID_RESET"}

    if not default_token_generator.check_token(user, token):
        return {"error": "INVALID_RESET"}

    with transaction.atomic():
        user.set_password(new_password)
        user.save(update_fields=["password", "updated_at"])
        RefreshToken.objects.filter(user=user, revoked_at__isnull=True).update(
            revoked_at=dj_timezone.now()
        )
    logger.info("Password reset completed for %s", user.email)
    return {"success": True}


def verify_google_token(credential: str, client_ip: str) -> dict:
    """Verify Google ID token server-side.

    Returns Google user data or {"error": code}.
    """
    import httpx
    from django.core.cache import cache

    cache_key = f"gauth_rate:{client_ip}"
    attempt_count = cache.get(cache_key, 0)
    if attempt_count >= 20:
        return {"error": "RATE_LIMITED"}
    cache.set(cache_key, attempt_count + 1, 3600)

    client_id = settings.GOOGLE_OAUTH_CLIENT_ID
    if not client_id:
        return {"error": "GOOGLE_NOT_CONFIGURED"}

    try:
        resp = httpx.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": credential},
            timeout=10.0,
        )
        if resp.status_code != 200:
            logger.warning(
                "Google token verification failed: status=%s", resp.status_code
            )
            return {"error": "GOOGLE_AUTH_FAILED"}
        google_data = resp.json()
    except httpx.HTTPError as exc:
        logger.error("Google token verification network error: %s", exc)
        return {"error": "GOOGLE_AUTH_FAILED"}

    if google_data.get("aud") != client_id:
        logger.warning(
            "Google token audience mismatch: got %s, expected %s",
            google_data.get("aud"),
            client_id,
        )
        return {"error": "GOOGLE_AUTH_FAILED"}

    if google_data.get("email_verified") != "true":
        return {"error": "GOOGLE_AUTH_FAILED"}

    email = google_data.get("email", "").lower().strip()
    if not email:
        return {"error": "GOOGLE_AUTH_FAILED"}

    return {
        "email": email,
        "first_name": google_data.get("given_name", ""),
        "last_name": google_data.get("family_name", ""),
    }


def google_login_or_register(
    email: str,
    first_name: str,
    last_name: str,
    business_name: str,
    is_login_only: bool,
) -> dict:
    """Check if user exists and return them, or create tenant + OWNER user.

    Returns {"user": user} or {"error": code}.
    """
    try:
        user = User.objects.select_related("tenant").get(email=email)
        if not user.is_active:
            return {"error": "INVALID_CREDENTIALS"}
        if not user.is_email_verified:
            user.is_email_verified = True
            user.save(update_fields=["is_email_verified", "updated_at"])
        user.reset_failed_login()
        logger.info("Google OAuth login: existing user %s", email)
        return {"user": user}
    except User.DoesNotExist:
        if is_login_only:
            logger.warning(
                "Google OAuth login failed: unregistered user %s", email
            )
            return {"error": "USER_NOT_FOUND"}

    business_name = business_name.strip()
    if not business_name:
        business_name = f"{first_name} {last_name}".strip() or email.split("@")[0]

    with transaction.atomic():
        slug = slugify_business(business_name)
        tenant = Tenant.objects.create(name=business_name, slug=slug)
        tenant.activate_trial()
        user_manager = cast(UserManager, User.objects)
        user = user_manager.create_user(
            email=email,
            password=secrets.token_urlsafe(32),
            first_name=first_name,
            last_name=last_name,
            tenant=tenant,
            role=UserRole.OWNER,
            is_active=True,
            is_email_verified=True,
        )

    logger.info("Google OAuth register: new user %s, tenant %s", email, tenant.slug)
    return {"user": user}
