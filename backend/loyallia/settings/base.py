"""
Loyallia Django Settings  BASE
All environments inherit from this.
Production-sensitive values are loaded from Vault. Non-secret routing values may
come from environment or compose configuration.
"""

import os
from pathlib import Path

from decouple import Csv, config

from common.vault import get_secret

# Base directory of the Django project (backend/)
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# SECURITY

SECRET_KEY = get_secret(
    "secret_key",
    default="",
)
# Fallback: read from Vault runtime file for resilient container startup
if not SECRET_KEY:
    _vault_sk_file = "/run/loyallia-vault/secret_key"
    if os.path.isfile(_vault_sk_file):
        with open(_vault_sk_file, encoding="utf-8") as _f:
            SECRET_KEY = _f.read().strip()
DEBUG = config("DEBUG", default=False, cast=bool)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())

# APPLICATIONS

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "corsheaders",
    "django_celery_beat",
    "django_celery_results",
    "storages",
]

LOCAL_APPS = [
    "apps.tenants.apps.TenantsConfig",
    "apps.authentication.apps.AuthenticationConfig",
    "apps.cards.apps.CardsConfig",
    "apps.customers.apps.CustomersConfig",
    "apps.transactions.apps.TransactionsConfig",
    "apps.notifications.apps.NotificationsConfig",
    "apps.automation.apps.AutomationConfig",
    "apps.analytics.apps.AnalyticsConfig",
    "apps.billing.apps.BillingConfig",
    "apps.agent_api.apps.AgentApiConfig",
    "apps.audit.apps.AuditConfig",
    "apps.api.apps.ApiConfig",
    "apps.backup.apps.BackupConfig",
    "apps.redemption.apps.RedemptionConfig",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# MIDDLEWARE

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "common.middleware.RequestIDMiddleware",  # B-011: Request tracing
    "common.middleware.CSPNonceMiddleware",  #
    "common.rate_limit.RateLimitMiddleware",  # Rate limiting (Redis-backed, fails open)
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",  # i18n language detection
    "common.middleware.CSRFExemptAPIMiddleware",  #
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.tenants.middleware.TenantMiddleware",  # Tenant resolution from JWT
]

ROOT_URLCONF = "loyallia.urls"

# TEMPLATES

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "loyallia.wsgi.application"
ASGI_APPLICATION = "loyallia.asgi.application"

# DATABASE PostgreSQL via PgBouncer connection pool
# conn_max_age=0 is MANDATORY for PgBouncer transaction-mode pooling.
# Non-zero values cause "server connection was reset" under concurrent load.

import dj_database_url

DATABASES = {
    # Default: routed through PgBouncer (transaction pooling)
    "default": dj_database_url.config(
        env="PGBOUNCER_URL",
        default="postgres://loyallia@pgbouncer:6432/loyallia",
        conn_max_age=0,  # REQUIRED for PgBouncer transaction mode
        conn_health_checks=False,  # PgBouncer manages health; skip Django checks
    ),
    # Direct: bypasses PgBouncer for migrations and schema operations
    "direct": dj_database_url.config(
        env="DATABASE_DIRECT_URL",
        default="postgres://loyallia@postgres:5432/loyallia",
        conn_max_age=0,
    ),
}

_database_password = get_secret("postgres_password", default="")
# Fallback: read from Vault runtime file for resilient container startup
# (matches pattern used by postgres, pgbouncer, redis, minio containers)
if not _database_password:
    _vault_pw_file = "/run/loyallia-vault/postgres_password"
    if os.path.isfile(_vault_pw_file):
        with open(_vault_pw_file, encoding="utf-8") as _f:
            _database_password = _f.read().strip()
if _database_password:
    DATABASES["default"]["PASSWORD"] = _database_password
    DATABASES["direct"]["PASSWORD"] = _database_password

# Database router: send migrations to 'direct', everything else to 'default' (PgBouncer)
DATABASE_ROUTERS = ["common.db_routers.PgBouncerRouter"]

# CUSTOM USER MODEL

AUTH_USER_MODEL = "authentication.User"

# PASSWORD VALIDATION
# 12+ chars with complexity requirements.

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 12},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
    {
        "NAME": "common.validators.ComplexityValidator",
    },
]

# Argon2 password hasher (most secure)
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",  # fallback
]

# INTERNATIONALIZATION (REQ-I18N-001)

LANGUAGE_CODE = "es"
TIME_ZONE = "UTC"  # All timestamps stored in UTC; converted per-tenant in display
USE_I18N = True
USE_L10N = True
USE_TZ = True

# Supported languages (ES=default for Ecuador, EN, FR, DE)
LANGUAGES = [
    ("es", "Español"),
    ("en", "English"),
    ("fr", "Français"),
    ("de", "Deutsch"),
]

# Path to .po/.mo translation files
LOCALE_PATHS = [
    BASE_DIR / "locale",
]

# STATIC & MEDIA FILES

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "mediafiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# CACHE Redis

_redis_url = get_secret("redis_url", default="redis://localhost:6379/0")
# Fallback: read from Vault runtime file for resilient container startup
if not _redis_url or _redis_url == "redis://localhost:6379/0":
    _vault_redis_file = "/run/loyallia-vault/redis_url"
    if os.path.isfile(_vault_redis_file):
        with open(_vault_redis_file, encoding="utf-8") as _f:
            _redis_url = _f.read().strip()

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": _redis_url,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
        "KEY_PREFIX": "loyallia",
        "TIMEOUT": 300,  # 5 minutes default
    }
}

# CELERY CONFIGURATION Extracted to celery_config.py (Rule 245)

from loyallia.settings.celery_config import *  # noqa: F401,F403,E402

# FILE STORAGE MinIO (S3-compatible)

MINIO_ENDPOINT = config("MINIO_ENDPOINT", default="http://localhost:9000")
MINIO_PUBLIC_ENDPOINT = config("MINIO_PUBLIC_ENDPOINT", default=MINIO_ENDPOINT)
MINIO_ACCESS_KEY = get_secret("minio_access_key", default="")
MINIO_SECRET_KEY = get_secret("minio_secret_key", default="")
MINIO_BUCKET_PASSES = config("MINIO_BUCKET_PASSES", default="passes")
MINIO_BUCKET_ASSETS = config("MINIO_BUCKET_ASSETS", default="assets")
MINIO_USE_SSL = config("MINIO_USE_SSL", default=False, cast=bool)

# django-storages S3-compatible backend configuration
AWS_S3_ENDPOINT_URL = MINIO_ENDPOINT
AWS_ACCESS_KEY_ID = MINIO_ACCESS_KEY
AWS_SECRET_ACCESS_KEY = MINIO_SECRET_KEY
AWS_STORAGE_BUCKET_NAME = MINIO_BUCKET_ASSETS
AWS_S3_OBJECT_PARAMETERS = {"CacheControl": "max-age=86400"}
AWS_DEFAULT_ACL = None
AWS_S3_VERIFY = False  #

STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        "OPTIONS": {
            "bucket_name": MINIO_BUCKET_ASSETS,
            "endpoint_url": MINIO_ENDPOINT,
            "access_key": MINIO_ACCESS_KEY,
            "secret_key": MINIO_SECRET_KEY,
        },
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

# JWT / AUTH TOKENS

JWT_ACCESS_TOKEN_LIFETIME_MINUTES = 60  # FR-008: 60 minutes per spec
JWT_REFRESH_TOKEN_LIFETIME_DAYS = 30
#
# For RS256, set JWT_PRIVATE_KEY_PATH and JWT_PUBLIC_KEY_PATH (or use Vault).
JWT_ALGORITHM = config("JWT_ALGORITHM", default="HS256")
JWT_SECRET_KEY = get_secret("jwt_secret_key", default=SECRET_KEY)  # B-001: Separate from Django SECRET_KEY
# Fallback: read from Vault runtime file for resilient container startup
if JWT_SECRET_KEY == SECRET_KEY:
    _vault_jwt_file = "/run/loyallia-vault/jwt_secret_key"
    if os.path.isfile(_vault_jwt_file):
        with open(_vault_jwt_file, encoding="utf-8") as _f:
            JWT_SECRET_KEY = _f.read().strip()
JWT_PRIVATE_KEY_PATH = config("JWT_PRIVATE_KEY_PATH", default="")  # RS256 private key file
JWT_PUBLIC_KEY_PATH = config("JWT_PUBLIC_KEY_PATH", default="")  # RS256 public key file

# PASS SIGNING

def vault_bool(key: str, env_name: str = "", default: bool = False) -> bool:
    """Read a feature flag from Vault using explicit boolean strings."""
    value = get_secret(key, default=str(default).lower())
    return str(value).strip().lower() in {"1", "true", "yes", "on", "enabled"}

APPLE_WALLET_ENABLED = vault_bool("apple_wallet_enabled", "APPLE_WALLET_ENABLED", default=False)
GOOGLE_WALLET_ENABLED = vault_bool("google_wallet_enabled", "GOOGLE_WALLET_ENABLED", default=True)

APPLE_PASS_TYPE_IDENTIFIER = get_secret(
    "apple_pass_type_identifier",
    default="",
)
APPLE_TEAM_IDENTIFIER = get_secret("apple_team_identifier", default="")
APPLE_CERT_PATH = config("APPLE_CERT_PATH", default="/app/certs/apple_pass.pem")
APPLE_CERT_KEY_PATH = config("APPLE_CERT_KEY_PATH", default="/app/certs/apple_pass.key")
APPLE_WWDR_CERT_PATH = config("APPLE_WWDR_CERT_PATH", default="/app/certs/apple_wwdr.pem")
PASS_HMAC_SECRET = get_secret("pass_hmac_secret", default="")
# Apple Wallet webServiceURL the base URL Apple Wallet calls for pass
# registration, update checking, and pass re-download. Must be HTTPS in production.
# Set in pass.json as "webServiceURL". Defaults to APP_URL + /wallet/apple
PASS_WEB_SERVICE_URL = config(
    "PASS_WEB_SERVICE_URL",
    default="",  # Computed in production.py from APP_URL
)

# APNs token-based auth (JWT) for push notifications to iOS
# Separate from the PassKit signing certificates above
APPLE_APNS_KEY_ID = config("APPLE_APNS_KEY_ID", default="")
APPLE_APNS_AUTH_KEY_PATH = config("APPLE_APNS_AUTH_KEY_PATH", default="/app/certs/apns_auth_key.p8")

GOOGLE_SERVICE_ACCOUNT_FILE = config(
    "GOOGLE_SERVICE_ACCOUNT_FILE",
    default="/app/certs/google_wallet_service_account.json",
)
GOOGLE_WALLET_ISSUER_ID = get_secret("google_wallet_issuer_id", default="")

# FIREBASE (Android Push)

FIREBASE_CREDENTIAL_FILE = config("FIREBASE_CREDENTIAL_FILE", default="/app/certs/firebase_service_account.json")

# PAYMENT GATEWAY (Pluggable Manual / Disabled)

PAYMENT_GATEWAY_ENABLED = vault_bool("payment_gateway_enabled", "PAYMENT_GATEWAY_ENABLED", default=False)
PAYMENT_GATEWAY_PROVIDER = get_secret(
    "payment_gateway_provider",
    default="manual",
)
PAYMENT_GATEWAY_BASE_URL = config("PAYMENT_GATEWAY_BASE_URL", default="")

# Public base URL for absolute link generation (wallet passes, emails, etc.)
# In production this should be https://rewards.loyallia.com (or your domain)
PUBLIC_BASE_URL = config("PUBLIC_BASE_URL", default="")
PAYMENT_GATEWAY_LOGIN = get_secret("payment_gateway_login", default="")
PAYMENT_GATEWAY_TRAN_KEY = get_secret("payment_gateway_tran_key", default="")
PAYMENT_GATEWAY_WEBHOOK_SECRET = get_secret(
    "payment_gateway_webhook_secret",
    default="",
)

# EMAIL

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = config("EMAIL_HOST", default="in-v3.mailjet.com")
EMAIL_PORT = config("EMAIL_PORT", default=587, cast=int)
EMAIL_USE_TLS = config("EMAIL_USE_TLS", default=True, cast=bool)
EMAIL_HOST_USER = get_secret("mailjet_api_key", default="")
EMAIL_HOST_PASSWORD = get_secret("mailjet_secret_key", default="")
# Default sender email fallback.
# Runtime code MUST use common.email_config.get_default_from_email() to read
# the live PlatformSetting value. This module-level constant is only a safe
# fallback for code paths that do not (yet) use the helper.
DEFAULT_FROM_EMAIL = "noreply@loyallia.com"

# WHATSAPP BRIDGE

WHATSAPP_BRIDGE_URL = config("WHATSAPP_BRIDGE_URL", default="http://whatsapp-bridge:3001")
WHATSAPP_BRIDGE_API_KEY = get_secret(
    "whatsapp_bridge_api_key",
    default="",
)
WHATSAPP_MAX_PER_MINUTE = config("WHATSAPP_MAX_PER_MINUTE", default=8, cast=int)
WHATSAPP_MAX_PER_HOUR = config("WHATSAPP_MAX_PER_HOUR", default=200, cast=int)

# TWILIO SMS

TWILIO_ACCOUNT_SID = get_secret("twilio_account_sid", default="")
TWILIO_AUTH_TOKEN = get_secret("twilio_auth_token", default="")
TWILIO_FROM_NUMBER = get_secret("twilio_from_number", default="")
TWILIO_MAX_PER_DAY = config("TWILIO_MAX_PER_DAY", default=200, cast=int)

# TWILIO VERIFY v2 ()

TWILIO_VERIFY_SERVICE_SID = get_secret("twilio_verify_service_sid", default="")
TWILIO_VERIFY_ENABLED = get_secret("twilio_verify_enabled", default="false").lower() == "true"
TWILIO_VERIFY_DEFAULT_CHANNEL = get_secret(
    "twilio_verify_default_channel",
    default="sms",
)
TWILIO_API_KEY_SID = get_secret("twilio_api_key_sid", default="")
TWILIO_API_KEY_SECRET = get_secret("twilio_api_key_secret", default="")
TWILIO_TEST_ACCOUNT_SID = get_secret("twilio_test_account_sid", default="")
TWILIO_TEST_AUTH_TOKEN = get_secret("twilio_test_auth_token", default="")

# CORS

CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:3000",
    cast=Csv(),
)
CORS_ALLOW_CREDENTIALS = True
CORS_PREFLIGHT_MAX_AGE = 86400  # 24 hours reduce preflight overhead

# SECURITY HEADERS (enforced in production settings)

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "SAMEORIGIN"
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"

# Content-Security-Policy set via custom middleware or Nginx in production
# Default CSP header (can be overridden in production settings)
# CSP is set via CSPNonceMiddleware with per-request nonces.
# These settings are kept as documentation; the middleware generates the actual header.
CSP_DEFAULT_SRC = "'self'"
CSP_IMG_SRC = "'self' data: https:"
CSP_FONT_SRC = "'self' https://fonts.gstatic.com"
CSP_CONNECT_SRC = "'self' https://oauth2.googleapis.com"
CSP_FRAME_SRC = "'self' https://accounts.google.com"

#
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"

# BUSINESS RULES CONFIGURATION
# Limits are DB-driven via SubscriptionPlan. These are fallback defaults.

TRIAL_DAYS = config("TRIAL_DAYS", default=5, cast=int)
GEO_PUSH_COOLDOWN_HOURS = config("GEO_PUSH_COOLDOWN_HOURS", default=4, cast=int)
GEO_FENCE_RADIUS_METERS = config("GEO_FENCE_RADIUS_METERS", default=100, cast=int)
TAX_RATE_ECUADOR = config("TAX_RATE_ECUADOR", default=0.15, cast=float)  # Ecuador IVA 15%

# GOOGLE OAUTH 2.0 (Social Login) Google Identity Services (GIS)

# Loyallia uses GIS (modern "Sign in with Google" button), NOT traditional
# OAuth 2.0 redirect flow. The frontend gets an ID token directly from Google
# and sends it to POST /api/v1/auth/google/login/ for verification.
#
# ENVIRONMENT SEPARATION:
# LOCAL DEV: Create a separate OAuth client for localhost:
# Authorized JS origins: http://localhost:3000
# Authorized redirect URIs: http://localhost:33905/api/v1/auth/google/callback/
# PRODUCTION: Use the live rewards.loyallia.com client:
# Authorized JS origins: https://rewards.loyallia.com
# Authorized redirect URIs: https://rewards.loyallia.com/api/v1/auth/google/callback/
#
# NEVER commit client_id/client_secret to any file. They live ONLY in Vault.
# Get credentials from: https://console.cloud.google.com/apis/credentials

GOOGLE_OAUTH_CLIENT_ID = get_secret("google_oauth_client_id", default="")
GOOGLE_OAUTH_CLIENT_SECRET = get_secret("google_oauth_client_secret", default="")
GOOGLE_OAUTH_REDIRECT_URI = config(
    "GOOGLE_OAUTH_REDIRECT_URI",
    default="http://localhost:33905/api/v1/auth/google/callback/",
)

APP_URL = config("APP_URL", default="http://localhost")
FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:33906")

# SENTRY Error Tracking (B-013)

SENTRY_DSN = str(config("SENTRY_DSN", default=""))
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        traces_sample_rate=config("SENTRY_TRACES_SAMPLE_RATE", default=0.1, cast=float),
        send_default_pii=False,
        environment=str(config("SENTRY_ENVIRONMENT", default="production")),
    )

# LOGGING Structured JSON for production log aggregation (ELK / CloudWatch)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
        "json": {
            "()": "common.logging_utils.JsonFormatter",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json" if not DEBUG else "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {"handlers": ["console"], "level": "WARNING", "propagate": False},
        "django.db.backends": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
        "celery": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "apps": {"handlers": ["console"], "level": "DEBUG", "propagate": False},
        "common.rate_limit": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}
