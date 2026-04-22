"""
Loyallia — JWT Token Utilities
Issue and verify access + refresh tokens using HS256 with Django SECRET_KEY.
"""
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional
import jwt
from django.conf import settings


def _utcnow() -> datetime:
    return datetime.now(tz=timezone.utc)


def create_access_token(user_id: str, tenant_id: Optional[str], role: str) -> str:
    """
    Create a short-lived JWT access token (15 minutes).

    Payload:
        user_id: str UUID
        tenant_id: str UUID or None (SUPER_ADMIN)
        role: str role name
        iat: issued at
        exp: expiry
    """
    now = _utcnow()
    payload = {
        "user_id": str(user_id),
        "tenant_id": str(tenant_id) if tenant_id else None,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_LIFETIME_MINUTES)).timestamp()),
        "type": "access",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token_string() -> str:
    """Generate a cryptographically secure random refresh token string."""
    return secrets.token_urlsafe(64)


def hash_token(token: str) -> str:
    """SHA-256 hash for storing refresh tokens in DB."""
    return hashlib.sha256(token.encode()).hexdigest()


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and verify a JWT access token.
    Returns payload dict on success, None on any failure.
    Does NOT raise exceptions.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("type") != "access":
            return None
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
