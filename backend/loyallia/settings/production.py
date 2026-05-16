"""
Loyallia Django Settings — PRODUCTION
Inherits from base. Enforces HTTPS, strict security headers.
All sensitive secrets are fetched via Vault (no env fallback).
"""

from decouple import Csv, config

# Import Vault client — all production secrets go through Vault first
from common.vault import get_secret

from .base import *  # noqa: F401, F403
from .base import vault_bool

DEBUG = False

from common.environment_guard import enforce_settings_environment

enforce_settings_environment(mode="production", databases=DATABASES)  # noqa: F405

# =============================================================================
# SECURITY — HTTPS enforcement via Nginx reverse proxy
# =============================================================================
# Nginx sets X-Forwarded-Proto: https — Django uses this to detect SSL
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
X_FRAME_OPTIONS = "DENY"
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
# SECRETS VIA VAULT (STRICT MODE: Vault or fail)
# =============================================================================
SECRET_KEY = get_secret("secret_key", strict=True)

# Redis / Celery URLs from Vault.
REDIS_URL = get_secret("redis_url", strict=True)
CELERY_BROKER_URL = get_secret("celery_broker_url", strict=True)
CELERY_RESULT_BACKEND = get_secret("celery_result_backend", strict=True)
CACHES["default"]["LOCATION"] = REDIS_URL  # noqa: F405

# Database — override password from Vault (Strict)
_pg_password = get_secret("postgres_password", strict=True)
if _pg_password:
    DATABASES["default"]["PASSWORD"] = _pg_password  # noqa: F405
    if "direct" in DATABASES:  # noqa: F405
        DATABASES["direct"]["PASSWORD"] = _pg_password  # noqa: F405

# MinIO (S3-compatible storage)
MINIO_ACCESS_KEY = get_secret("minio_access_key", strict=True)
MINIO_SECRET_KEY = get_secret("minio_secret_key", strict=True)
AWS_ACCESS_KEY_ID = MINIO_ACCESS_KEY
AWS_SECRET_ACCESS_KEY = MINIO_SECRET_KEY
STORAGES["default"]["OPTIONS"]["access_key"] = MINIO_ACCESS_KEY  # noqa: F405
STORAGES["default"]["OPTIONS"]["secret_key"] = MINIO_SECRET_KEY  # noqa: F405

# JWT / Auth tokens — separate key from SECRET_KEY (Vault Only)
JWT_SECRET_KEY = get_secret("jwt_secret_key", strict=True)

# Pass HMAC signing
PASS_HMAC_SECRET = get_secret("pass_hmac_secret", strict=True)

# Apple Wallet web PKPass identifiers. Certificate material is validated by
# readiness checks and read directly from Vault at signing time.
APPLE_WALLET_ENABLED = vault_bool(
    "apple_wallet_enabled", "APPLE_WALLET_ENABLED", default=False
)
if APPLE_WALLET_ENABLED:
    APPLE_PASS_TYPE_IDENTIFIER = get_secret("apple_pass_type_identifier", strict=True)
    APPLE_TEAM_IDENTIFIER = get_secret("apple_team_identifier", strict=True)
    # Apple Wallet webServiceURL — derive from APP_URL if not explicitly set
    if not PASS_WEB_SERVICE_URL:  # noqa: F405
        PASS_WEB_SERVICE_URL = (
            f"{config('APP_URL', default='https://rewards.loyallia.com')}/wallet/apple"
        )

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID = get_secret("google_oauth_client_id", strict=True)
GOOGLE_OAUTH_CLIENT_SECRET = get_secret("google_oauth_client_secret", strict=True)
GOOGLE_WALLET_ISSUER_ID = get_secret("google_wallet_issuer_id", strict=True)

# Payment Gateway
PAYMENT_GATEWAY_ENABLED = vault_bool(
    "payment_gateway_enabled", "PAYMENT_GATEWAY_ENABLED", default=False
)
PAYMENT_GATEWAY_PROVIDER = get_secret("payment_gateway_provider", default="manual")
if PAYMENT_GATEWAY_ENABLED:
    PAYMENT_GATEWAY_LOGIN = get_secret("payment_gateway_login", strict=True)
    PAYMENT_GATEWAY_TRAN_KEY = get_secret("payment_gateway_tran_key", strict=True)
    PAYMENT_GATEWAY_WEBHOOK_SECRET = get_secret(
        "payment_gateway_webhook_secret",
        strict=True,
    )

# Email
EMAIL_HOST = "in-v3.mailjet.com"
EMAIL_HOST_USER = get_secret("mailjet_api_key", strict=True)
EMAIL_HOST_PASSWORD = get_secret("mailjet_secret_key", strict=True)
DEFAULT_FROM_EMAIL = get_secret("mailjet_sender_email", strict=True)
