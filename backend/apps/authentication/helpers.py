"""
Loyallia — Authentication Helpers
Internal utility functions for the authentication module.
"""

import hashlib
import hmac as hmac_module
import logging
import re
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone as dj_timezone

from apps.authentication.models import RefreshToken, User
from apps.authentication.tokens import (
    create_access_token,
    create_refresh_token_string,
    hash_token,
)
from apps.tenants.models import Tenant

logger = logging.getLogger(__name__)


def slugify_business(name: str) -> str:
    """Generate a unique slug from business name."""
    slug_base = re.sub(r"[^a-z0-9]+", "-", name.lower().strip()).strip("-")
    slug = slug_base[:80]
    counter = 1
    candidate = slug
    while Tenant.objects.filter(slug=candidate).exists():
        candidate = f"{slug}-{counter}"
        counter += 1
    return candidate


def send_otp_email(email: str, otp: str, subject: str, body: str) -> None:
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


def _hash_otp(otp: str) -> str:
    """Hash an OTP using SHA-256 for secure storage."""
    return hashlib.sha256(otp.encode("utf-8")).hexdigest()


def store_otp(email: str, otp: str, purpose: str) -> None:
    """Store hashed OTP in Django cache with 15-minute TTL."""
    from django.core.cache import cache

    cache.set(f"otp:{purpose}:{email}", _hash_otp(otp), timeout=900)


def verify_otp(email: str, otp: str, purpose: str) -> bool:
    """Verify OTP from cache using constant-time comparison.

    Tracks failed attempts: after 5 failures the OTP is deleted (lockout).
    Successful verification clears both the OTP and the attempt counter.
    """
    from django.core.cache import cache

    key = f"otp:{purpose}:{email}"
    attempts_key = f"otp_attempts:{purpose}:{email}"

    stored_hash = cache.get(key)
    if not stored_hash:
        return False

    attempts = cache.get(attempts_key, 0)
    if attempts >= 5:
        cache.delete(key)
        return False

    if hmac_module.compare_digest(stored_hash, _hash_otp(otp)):
        cache.delete(key)
        cache.delete(attempts_key)
        return True

    cache.set(attempts_key, attempts + 1, 900)
    return False


def issue_tokens(user: User) -> dict:
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
