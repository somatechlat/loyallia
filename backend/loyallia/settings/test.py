"""
Loyallia Django Settings -- Test Workbench

Local non-Docker tests use SQLite. Docker test runs use PostgreSQL with the
database password resolved from Vault so threaded/concurrency tests exercise
real row-locking behavior.
"""

import os

from .development import *  # noqa: F401, F403

MIDDLEWARE = [
    middleware
    for middleware in MIDDLEWARE  # noqa: F405
    if middleware != "common.rate_limit.RateLimitMiddleware"
]

if (
    os.environ.get("VAULT_TOKEN_FILE")
    or os.environ.get("LOYALLIA_TEST_DATABASE") == "postgres"
):
    from common.vault import get_secret

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("POSTGRES_DB", "loyallia"),
            "USER": os.environ.get("POSTGRES_USER", "loyallia"),
            "PASSWORD": get_secret("postgres_password", strict=True),
            "HOST": os.environ.get("POSTGRES_HOST", "postgres"),
            "PORT": os.environ.get("POSTGRES_PORT", "5432"),
            "TEST": {
                "NAME": os.environ.get("POSTGRES_TEST_DB", "test_loyallia"),
            },
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "test.sqlite3",  # noqa: F405
        }
    }

DATABASE_ROUTERS = []

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "loyallia-test-cache",
    }
}

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
