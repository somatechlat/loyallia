"""
Loyallia — JWT Token Utilities
Issue and verify access + refresh tokens.

LYL-H-SEC-005: Supports both HS256 (symmetric, default) and RS256 (asymmetric).
RS256 uses a private key for signing and public key for verification.
Private key is loaded from Vault or file path; public key is derived automatically.
When JWT_ALGORITHM is set to "RS256", the system uses asymmetric signing.
Falls back to HS256 if RS256 keys are not configured.

Decision: Default to HS256 for single-service deployments. RS256 available for
multi-service architectures needing asymmetric key distribution. Key rotation
invalidates existing tokens (acceptable given 60min access / 30d refresh TTLs).
"""

import hashlib
import logging
import os
import secrets
from datetime import UTC, datetime, timedelta

import jwt
from django.conf import settings

logger = logging.getLogger(__name__)

# Cached key material (loaded once per process)
_signing_key: str | None = None
_verification_key: str | None = None
_keys_loaded: bool = False


def _load_keys() -> tuple[str, str]:
    """Load JWT signing and verification keys based on algorithm config.

    For HS256: Both keys are the same (JWT_SECRET_KEY).
    For RS256: Private key from JWT_PRIVATE_KEY_PATH or Vault; public key derived.

    Returns:
        (signing_key, verification_key) tuple
    """
    global _signing_key, _verification_key, _keys_loaded

    if _keys_loaded:
        return _signing_key, _verification_key

    algorithm = getattr(settings, "JWT_ALGORITHM", "HS256")

    if algorithm == "RS256":
        # Load private key
        private_key_path = getattr(settings, "JWT_PRIVATE_KEY_PATH", "")
        if private_key_path and os.path.isfile(private_key_path):
            with open(private_key_path, "r") as f:
                _signing_key = f.read()
        else:
            # Try Vault
            try:
                from common.vault import get_secret

                _signing_key = get_secret("jwt_private_key", env_fallback="JWT_PRIVATE_KEY")
            except Exception:
                logger.warning("RS256 configured but private key not found. Falling back to HS256.")
                _signing_key = settings.JWT_SECRET_KEY
                _verification_key = settings.JWT_SECRET_KEY
                _keys_loaded = True
                return _signing_key, _verification_key

        # Load public key
        public_key_path = getattr(settings, "JWT_PUBLIC_KEY_PATH", "")
        if public_key_path and os.path.isfile(public_key_path):
            with open(public_key_path, "r") as f:
                _verification_key = f.read()
        else:
            # Try Vault
            try:
                from common.vault import get_secret

                _verification_key = get_secret("jwt_public_key", env_fallback="JWT_PUBLIC_KEY")
            except Exception:
                _verification_key = _signing_key

        if not _signing_key or not _verification_key:
            logger.warning("RS256 keys incomplete. Falling back to HS256.")
            _signing_key = settings.JWT_SECRET_KEY
            _verification_key = settings.JWT_SECRET_KEY

    else:
        # HS256: symmetric key
        _signing_key = settings.JWT_SECRET_KEY
        _verification_key = settings.JWT_SECRET_KEY

    _keys_loaded = True
    return _signing_key, _verification_key


def _get_signing_key() -> str:
    """Get the key used for signing JWTs."""
    key, _ = _load_keys()
    return key


def _get_verification_key() -> str:
    """Get the key used for verifying JWTs."""
    _, key = _load_keys()
    return key


def create_access_token(user_id: str, tenant_id: str | None, role: str) -> str:
    """Create a short-lived JWT access token.

    Payload:
        user_id: str UUID
        tenant_id: str UUID or None (SUPER_ADMIN)
        role: str role name
        iat: issued at
        exp: expiry
        type: "access"

    Uses the configured algorithm (HS256 or RS256).
    """
    now = _utcnow()
    payload = {
        "user_id": str(user_id),
        "tenant_id": str(tenant_id) if tenant_id else None,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(
            (
                now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_LIFETIME_MINUTES)
            ).timestamp()
        ),
        "type": "access",
    }
    return jwt.encode(
        payload, _get_signing_key(), algorithm=settings.JWT_ALGORITHM
    )


def _utcnow() -> datetime:
    return datetime.now(tz=UTC)


def create_refresh_token_string() -> str:
    """Generate a cryptographically secure random refresh token string."""
    return secrets.token_urlsafe(64)


def hash_token(token: str) -> str:
    """SHA-256 hash for storing refresh tokens in DB."""
    return hashlib.sha256(token.encode()).hexdigest()


def decode_access_token(token: str) -> dict | None:
    """Decode and verify a JWT access token.

    Returns payload dict on success, None on any failure.
    Does NOT raise exceptions.
    Supports both HS256 and RS256 verification.
    """
    try:
        payload = jwt.decode(
            token,
            _get_verification_key(),
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("type") != "access":
            return None
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
