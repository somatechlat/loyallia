"""
Loyallia Django Settings -- Test Workbench

Production-identical database path:
  - Test DB creation + migrations → direct PostgreSQL (PgBouncer can't do DDL)
  - All test queries → PgBouncer (same as production runtime)

SEC: Tests run through the same connection pooler as production to catch
     real-world session/connection issues.

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
# DATABASE — Production-identical: PgBouncer for queries, direct PG for DDL
# ---------------------------------------------------------------------------
_db_password = os.environ.get("POSTGRES_PASSWORD", "")
_db_user = os.environ.get("POSTGRES_USER", "loyallia")
_db_name = os.environ.get("POSTGRES_DB", "loyallia")
_pg_direct_host = os.environ.get("POSTGRES_HOST", "localhost")
_pg_direct_port = os.environ.get("POSTGRES_PORT", "33900")
_pgbouncer_host = os.environ.get("PGBOUNCER_HOST", "localhost")
_pgbouncer_port = os.environ.get("PGBOUNCER_PORT", "33901")

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
    # Default: PgBouncer — production-identical query path
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": _db_name,
        "USER": _db_user,
        "PASSWORD": _db_password,
        "HOST": _pgbouncer_host,
        "PORT": _pgbouncer_port,
        "CONN_MAX_AGE": 0,
        "CONN_HEALTH_CHECKS": False,
        "TEST": {
            "NAME": os.environ.get("POSTGRES_TEST_DB", "test_loyallia"),
            # CREATE_DB: use the 'direct' alias (bypass PgBouncer for DDL)
            "CREATE_DB": False,
        },
    },
    # Direct: used for DDL (CREATE/DROP DATABASE, migrations)
    # PgBouncer's transaction mode can't handle these operations
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

# Route migrations to 'direct' — same router as production
DATABASE_ROUTERS = ["common.db_routers.PgBouncerRouter"]

# ---------------------------------------------------------------------------
# CUSTOM TEST RUNNER — Handles PgBouncer DDL limitations
# Creates/migrates test DB via 'direct', routes queries via PgBouncer
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
