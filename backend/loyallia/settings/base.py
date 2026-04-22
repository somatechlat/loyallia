"""
Loyallia Django Settings — BASE
All environments inherit from this.
Production-sensitive values are loaded from environment variables via decouple.
"""

import sys
from pathlib import Path

from decouple import Csv, config

# Base directory of the Django project (backend/)
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# =============================================================================
# SECURITY
# =============================================================================
SECRET_KEY = config("SECRET_KEY")
DEBUG = config("DEBUG", default=False, cast=bool)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())

# =============================================================================
# APPLICATIONS
# =============================================================================
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
    "apps.api.apps.ApiConfig",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# =============================================================================
# MIDDLEWARE
# =============================================================================
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.tenants.middleware.TenantMiddleware",  # Tenant resolution from JWT
]

ROOT_URLCONF = "loyallia.urls"

# =============================================================================
# TEMPLATES
# =============================================================================
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

# =============================================================================
# DATABASE — PostgreSQL via PgBouncer connection pool
# =============================================================================
import dj_database_url

DATABASES = {
    "default": dj_database_url.config(
        env="DATABASE_URL",
        default="postgres://loyallia:loyallia_dev_password@localhost:6432/loyallia",
        conn_max_age=600,
        conn_health_checks=True,
    )
}
# Separate direct connection for migrations (bypasses pgbouncer)
_direct_db = config("DATABASE_DIRECT_URL", default="")
if _direct_db:
    DATABASES["direct"] = dj_database_url.parse(_direct_db, conn_max_age=0)

# =============================================================================
# CUSTOM USER MODEL
# =============================================================================
AUTH_USER_MODEL = "authentication.User"

# =============================================================================
# PASSWORD VALIDATION
# =============================================================================
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Argon2 password hasher (most secure)
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",  # fallback
]

# =============================================================================
# INTERNATIONALIZATION
# =============================================================================
LANGUAGE_CODE = "es-ec"
TIME_ZONE = "UTC"  # All timestamps stored in UTC; converted per-tenant in display
USE_I18N = True
USE_TZ = True

# =============================================================================
# STATIC & MEDIA FILES
# =============================================================================
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "mediafiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# =============================================================================
# CACHE — Redis
# =============================================================================
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": config("REDIS_URL", default="redis://localhost:6379/0"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
        "KEY_PREFIX": "loyallia",
        "TIMEOUT": 300,  # 5 minutes default
    }
}

# =============================================================================
# CELERY CONFIGURATION
# =============================================================================
CELERY_BROKER_URL = config("CELERY_BROKER_URL", default="redis://localhost:6379/1")
CELERY_RESULT_BACKEND = config(
    "CELERY_RESULT_BACKEND", default="redis://localhost:6379/2"
)
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "UTC"
CELERY_ENABLE_UTC = True
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 300  # 5 minutes hard limit
CELERY_TASK_SOFT_TIME_LIMIT = (
    240  # 4 minutes soft time limit (triggers SoftTimeLimitExceeded)
)
CELERY_WORKER_PREFETCH_MULTIPLIER = 1  # Fair task distribution
CELERY_ACKS_LATE = True  # Acknowledge after completion (prevents task loss)

# During Django test runs, execute Celery tasks synchronously so tests do not require a live broker.
CELERY_TASK_ALWAYS_EAGER = "test" in sys.argv
CELERY_TASK_EAGER_PROPAGATES = "test" in sys.argv

# Task routing — matches actual task names in apps.*.tasks
CELERY_TASK_ROUTES = {
    "apps.customers.tasks.generate_qr_for_pass": {"queue": "pass_generation"},
    "apps.customers.tasks.trigger_pass_update": {"queue": "pass_generation"},
    "apps.customers.tasks.update_customer_analytics": {"queue": "pass_generation"},
    "apps.notifications.tasks.send_single_notification": {"queue": "push_delivery"},
    "apps.notifications.tasks.send_campaign_blast": {"queue": "push_delivery"},
    "apps.notifications.tasks.send_birthday_notifications": {"queue": "push_delivery"},
    "apps.notifications.tasks.send_inactive_reminders": {"queue": "push_delivery"},
    "apps.automation.tasks.evaluate_trigger_for_customer": {"queue": "default"},
    "apps.automation.tasks.evaluate_scheduled_automations": {"queue": "default"},
    "apps.automation.tasks.evaluate_inactive_triggers": {"queue": "default"},
    "*": {"queue": "default"},
}

CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"

from celery.schedules import crontab  # noqa: E402

CELERY_BEAT_SCHEDULE = {
    "birthday-notifications-daily": {
        "task": "apps.notifications.tasks.send_birthday_notifications",
        "schedule": crontab(hour=10, minute=0),
        "options": {"queue": "push_delivery"},
    },
    "inactive-reminders-daily": {
        "task": "apps.notifications.tasks.send_inactive_reminders",
        "schedule": crontab(hour=9, minute=0),
        "kwargs": {"days_inactive": 30},
        "options": {"queue": "push_delivery"},
    },
    "scheduled-automations-daily": {
        "task": "apps.automation.tasks.evaluate_scheduled_automations",
        "schedule": crontab(hour=8, minute=0),
    },
    "inactive-automation-triggers-daily": {
        "task": "apps.automation.tasks.evaluate_inactive_triggers",
        "schedule": crontab(hour=8, minute=30),
        "kwargs": {"days_threshold": 30},
    },
}

# =============================================================================
# FILE STORAGE — MinIO (S3-compatible)
# =============================================================================
MINIO_ENDPOINT = config("MINIO_ENDPOINT", default="http://localhost:9000")
MINIO_ACCESS_KEY = config("MINIO_ACCESS_KEY", default="minioadmin")
MINIO_SECRET_KEY = config("MINIO_SECRET_KEY", default="minioadmin")
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
AWS_S3_VERIFY = False  # Set True in production with valid TLS

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

# =============================================================================
# JWT / AUTH TOKENS
# =============================================================================
JWT_ACCESS_TOKEN_LIFETIME_MINUTES = 60  # FR-008: 60 minutes per spec
JWT_REFRESH_TOKEN_LIFETIME_DAYS = 30
JWT_ALGORITHM = "HS256"
JWT_SECRET_KEY = config("SECRET_KEY")  # Uses Django SECRET_KEY

# =============================================================================
# PASS SIGNING
# =============================================================================
APPLE_PASS_TYPE_IDENTIFIER = config(
    "APPLE_PASS_TYPE_IDENTIFIER", default="pass.com.loyallia.cards"
)
APPLE_TEAM_IDENTIFIER = config("APPLE_TEAM_IDENTIFIER", default="")
APPLE_CERT_PATH = config("APPLE_CERT_PATH", default="/app/certs/apple_pass.pem")
APPLE_CERT_KEY_PATH = config("APPLE_CERT_KEY_PATH", default="/app/certs/apple_pass.key")
APPLE_WWDR_CERT_PATH = config(
    "APPLE_WWDR_CERT_PATH", default="/app/certs/apple_wwdr.pem"
)
PASS_HMAC_SECRET = config("PASS_HMAC_SECRET", default="change-me-hmac-secret")

# APNs token-based auth (JWT) — for push notifications to iOS
# Separate from the PassKit signing certificates above
APPLE_APNS_KEY_ID = config("APPLE_APNS_KEY_ID", default="")
APPLE_APNS_AUTH_KEY_PATH = config(
    "APPLE_APNS_AUTH_KEY_PATH", default="/app/certs/apns_auth_key.p8"
)

GOOGLE_SERVICE_ACCOUNT_FILE = config(
    "GOOGLE_SERVICE_ACCOUNT_FILE",
    default="/app/certs/google_wallet_service_account.json",
)
GOOGLE_WALLET_ISSUER_ID = config("GOOGLE_WALLET_ISSUER_ID", default="")

# =============================================================================
# FIREBASE (Android Push)
# =============================================================================
FIREBASE_CREDENTIAL_FILE = config(
    "FIREBASE_CREDENTIAL_FILE", default="/app/certs/firebase_service_account.json"
)

# =============================================================================
# CLARO PAY (Ecuador Payment Gateway)
# =============================================================================
CLARO_PAY_BASE_URL = config(
    "CLARO_PAY_BASE_URL", default="https://api-uat.claropay.com.ec"
)
CLARO_PAY_MERCHANT_ID = config("CLARO_PAY_MERCHANT_ID", default="")
CLARO_PAY_API_KEY = config("CLARO_PAY_API_KEY", default="")
CLARO_PAY_API_SECRET = config("CLARO_PAY_API_SECRET", default="")
CLARO_PAY_WEBHOOK_SECRET = config("CLARO_PAY_WEBHOOK_SECRET", default="")


# =============================================================================
# EMAIL
# =============================================================================
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = config("EMAIL_HOST", default="localhost")
EMAIL_PORT = config("EMAIL_PORT", default=587, cast=int)
EMAIL_USE_TLS = config("EMAIL_USE_TLS", default=True, cast=bool)
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = config("EMAIL_FROM", default="noreply@loyallia.com")

# =============================================================================
# CORS
# =============================================================================
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:3000",
    cast=Csv(),
)
CORS_ALLOW_CREDENTIALS = True

# =============================================================================
# SECURITY HEADERS (enforced in production settings)
# =============================================================================
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "SAMEORIGIN"

# =============================================================================
# BUSINESS RULES CONFIGURATION
# =============================================================================
TRIAL_DAYS = config("TRIAL_DAYS", default=14, cast=int)
MAX_PROGRAMS_PER_TENANT = config("MAX_PROGRAMS_PER_TENANT", default=10, cast=int)
MAX_LOCATIONS_PER_TENANT = config("MAX_LOCATIONS_PER_TENANT", default=50, cast=int)
GEO_PUSH_COOLDOWN_HOURS = config("GEO_PUSH_COOLDOWN_HOURS", default=4, cast=int)
GEO_FENCE_RADIUS_METERS = config("GEO_FENCE_RADIUS_METERS", default=100, cast=int)
PLAN_FULL_PRICE_USD = config("PLAN_FULL_PRICE_USD", default="75.00")
PLAN_ADDITIONAL_POS_PRICE_USD = config("PLAN_ADDITIONAL_POS_PRICE_USD", default="10.00")
TAX_RATE_ECUADOR = config(
    "TAX_RATE_ECUADOR", default=0.15, cast=float
)  # Ecuador 2024 IVA

APP_URL = config("APP_URL", default="http://localhost")
FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:33906")

# =============================================================================
# LOGGING
# =============================================================================
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
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
    },
}
