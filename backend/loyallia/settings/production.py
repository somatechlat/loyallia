"""
Loyallia Django Settings — PRODUCTION
Inherits from base. Enforces HTTPS, strict security headers.
All sensitive secrets are fetched via Vault (with env fallback).
"""

from decouple import Csv, config

from .base import *  # noqa: F401, F403

# Import Vault client — all production secrets go through Vault first
from common.vault import get_secret

DEBUG = False

# =============================================================================
# SECURITY — HTTPS enforcement via Nginx reverse proxy
# =============================================================================
# Nginx sets X-Forwarded-Proto: https — Django uses this to detect SSL
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True  # LYL-M-SEC-019: Prevent JS access to session cookie
SESSION_COOKIE_SAMESITE = "Lax"  # CSRF protection complement
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True  # Prevent JS access to CSRF cookie

# LYL-M-SEC-017: Verify TLS certificate for S3/MinIO connections in production
AWS_S3_VERIFY = True

# Trust the Nginx proxy for host validation
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="rewards.loyallia.com", cast=Csv())

# =============================================================================
# SECRETS VIA VAULT (Vault → env fallback → hardcoded default)
# =============================================================================
SECRET_KEY = get_secret("secret_key", env_fallback="SECRET_KEY")

# Database — override password from Vault
_pg_password = get_secret("postgres_password", env_fallback="POSTGRES_PASSWORD")
if _pg_password:
    DATABASES["default"]["PASSWORD"] = _pg_password
    if "direct" in DATABASES:
        DATABASES["direct"]["PASSWORD"] = _pg_password

# MinIO (S3-compatible storage)
MINIO_SECRET_KEY = get_secret("minio_secret_key", env_fallback="MINIO_ROOT_PASSWORD")
AWS_SECRET_ACCESS_KEY = MINIO_SECRET_KEY
STORAGES["default"]["OPTIONS"]["secret_key"] = MINIO_SECRET_KEY

# JWT / Auth tokens — separate key from SECRET_KEY (Vault → env fallback)
JWT_SECRET_KEY = get_secret("jwt_secret_key", env_fallback="JWT_SECRET_KEY")
if not JWT_SECRET_KEY:
    JWT_SECRET_KEY = SECRET_KEY

# Pass HMAC signing
PASS_HMAC_SECRET = get_secret(
    "pass_hmac_secret", env_fallback="PASS_HMAC_SECRET", default="change-me-hmac-secret"
)

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID = get_secret(
    "google_oauth_client_id", env_fallback="GOOGLE_OAUTH_CLIENT_ID"
)
GOOGLE_OAUTH_CLIENT_SECRET = get_secret(
    "google_oauth_client_secret", env_fallback="GOOGLE_OAUTH_CLIENT_SECRET"
)

# Payment Gateway
PAYMENT_GATEWAY_LOGIN = get_secret(
    "payment_gateway_login", env_fallback="PAYMENT_GATEWAY_LOGIN"
)
PAYMENT_GATEWAY_TRAN_KEY = get_secret(
    "payment_gateway_tran_key", env_fallback="PAYMENT_GATEWAY_TRAN_KEY"
)
PAYMENT_GATEWAY_WEBHOOK_SECRET = get_secret(
    "payment_gateway_webhook_secret", env_fallback="PAYMENT_GATEWAY_WEBHOOK_SECRET"
)

# Email
EMAIL_HOST_PASSWORD = get_secret(
    "email_host_password", env_fallback="EMAIL_HOST_PASSWORD"
)
