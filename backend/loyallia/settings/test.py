"""
Loyallia Django Settings -- Test Workbench

Tests use the PRODUCTION stack: PgBouncer → PostgreSQL.
Run `docker compose up -d` before running tests.
"""

import os

from .development import *  # noqa: F401, F403

# ---------------------------------------------------------------------------
# Disable rate limiting in tests
# ---------------------------------------------------------------------------
MIDDLEWARE = [
    middleware
    for middleware in MIDDLEWARE  # noqa: F405
    if middleware != "common.rate_limit.RateLimitMiddleware"
]

# ---------------------------------------------------------------------------
# DATABASE — PgBouncer (production-identical path)
# ---------------------------------------------------------------------------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "loyallia"),
        "USER": os.environ.get("POSTGRES_USER", "loyallia"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", ""),
        "HOST": os.environ.get("PGBOUNCER_HOST", "localhost"),
        "PORT": os.environ.get("PGBOUNCER_PORT", "33901"),
        "OPTIONS": {
            "connect_timeout": 5,
        },
        "CONN_MAX_AGE": 0,  # Required for PgBouncer transaction pooling
        "CONN_HEALTH_CHECKS": False,  # PgBouncer manages health
        "TEST": {
            "NAME": os.environ.get("POSTGRES_TEST_DB", "test_loyallia"),
        },
    }
}

# If Vault is available, override the password from Vault
if os.environ.get("VAULT_TOKEN_FILE") or os.environ.get("VAULT_ADDR"):
    try:
        from common.vault import get_secret

        _vault_password = get_secret("postgres_password", strict=False)
        if _vault_password:
            DATABASES["default"]["PASSWORD"] = _vault_password
    except Exception:
        pass  # Fall through to env var password

DATABASE_ROUTERS = []

# ---------------------------------------------------------------------------
# CACHES — In-memory for tests (no Redis dependency for cache assertions)
# ---------------------------------------------------------------------------
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "loyallia-test-cache",
    }
}

# ---------------------------------------------------------------------------
# EMAIL — In-memory backend for test assertions
# ---------------------------------------------------------------------------
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# ---------------------------------------------------------------------------
# CELERY — Synchronous execution in tests
# ---------------------------------------------------------------------------
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# ---------------------------------------------------------------------------
# PASSWORD HASHING — MD5 for speed (tests only)
# ---------------------------------------------------------------------------
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
