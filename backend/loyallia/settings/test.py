"""
Loyallia Django Settings -- Test Workbench

Database path:
  - Test DB creation + migrations → direct PostgreSQL (PgBouncer can't do DDL)
  - All test queries → direct PostgreSQL (PgBouncer transaction mode breaks
    Django TestCase savepoints; see LYL-TEST-NOTE-001)

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
# DATABASE — Direct PostgreSQL for both DDL and queries in tests
# ---------------------------------------------------------------------------
_db_password = os.environ.get("POSTGRES_PASSWORD", "")
_db_user = os.environ.get("POSTGRES_USER", "loyallia")
_db_name = os.environ.get("POSTGRES_DB", "loyallia")

# Detect Docker environment so tests work both inside containers and on host
if os.path.exists("/.dockerenv"):
    _pg_direct_host = os.environ.get("POSTGRES_HOST", "postgres")
    _pg_direct_port = os.environ.get("POSTGRES_PORT", "5432")
else:
    _pg_direct_host = os.environ.get("POSTGRES_HOST", "localhost")
    _pg_direct_port = os.environ.get("POSTGRES_PORT", "33900")

# If Vault is available, use Vault password
if os.environ.get("VAULT_TOKEN_FILE") or os.environ.get("VAULT_ADDR"):
    try:
        from common.vault import get_secret

        _vault_password = get_secret("postgres_password", strict=False)
        if _vault_password:
            _db_password = _vault_password
    except Exception:
        pass

DATABASES = {
    # Default: direct PostgreSQL — PgBouncer transaction mode breaks Django
    # TestCase savepoints, so we bypass PgBouncer entirely for tests.
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": _db_name,
        "USER": _db_user,
        "PASSWORD": _db_password,
        "HOST": _pg_direct_host,
        "PORT": _pg_direct_port,
        "CONN_MAX_AGE": 0,
        "CONN_HEALTH_CHECKS": False,
        "TEST": {
            "NAME": os.environ.get("POSTGRES_TEST_DB", "test_loyallia"),
        },
    },
    # Direct: same as default; kept for compatibility with PgBouncerTestRunner
    # and conftest.py which reference settings.DATABASES["direct"].
    "direct": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": _db_name,
        "USER": _db_user,
        "PASSWORD": _db_password,
        "HOST": _pg_direct_host,
        "PORT": _pg_direct_port,
        "TEST": {
            "NAME": os.environ.get("POSTGRES_TEST_DB", "test_loyallia"),
        },
    },
}

# Disable PgBouncer router in tests — direct PostgreSQL for everything
DATABASE_ROUTERS = []

# ---------------------------------------------------------------------------
# CUSTOM TEST RUNNER — Handles test DB create/drop via direct PostgreSQL
# ---------------------------------------------------------------------------
TEST_RUNNER = "common.test_runner.PgBouncerTestRunner"

# ---------------------------------------------------------------------------
# CACHES — In-memory for tests
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
