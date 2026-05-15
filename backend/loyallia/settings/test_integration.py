"""
Loyallia Django Settings — Integration Tests through PgBouncer

Uses the REAL production connection path:
  Django → PgBouncerRouter → PgBouncer (transaction mode, port 6432) → PostgreSQL

Django TestCase is INCOMPATIBLE with PgBouncer transaction pooling because
TestCase wraps each test in a transaction rollback, and transaction mode can
switch backend connections between statements. Integration tests MUST use
TransactionTestCase (table truncation instead of rollback).
"""

import os

from .test import *  # noqa: F401, F403

# ---------------------------------------------------------------------------
# DATABASE — Production-identical path through PgBouncer
# ---------------------------------------------------------------------------
_db_password = os.environ.get("POSTGRES_PASSWORD", "")
_db_user = os.environ.get("POSTGRES_USER", "loyallia")
_db_name = os.environ.get("POSTGRES_DB", "loyallia")

# Direct PostgreSQL host (for migrations/DDL)
if os.path.exists("/.dockerenv"):
    _pg_direct_host = os.environ.get("POSTGRES_HOST", "postgres")
    _pg_direct_port = os.environ.get("POSTGRES_PORT", "5432")
    _pgbouncer_host = os.environ.get("PGBOUNCER_HOST", "pgbouncer")
    _pgbouncer_port = os.environ.get("PGBOUNCER_PORT", "6432")
else:
    _pg_direct_host = os.environ.get("POSTGRES_HOST", "localhost")
    _pg_direct_port = os.environ.get("POSTGRES_PORT", "33900")
    _pgbouncer_host = os.environ.get("PGBOUNCER_HOST", "localhost")
    _pgbouncer_port = os.environ.get("PGBOUNCER_PORT", "33901")

# Vault password override
if os.environ.get("VAULT_TOKEN_FILE") or os.environ.get("VAULT_ADDR"):
    try:
        from common.vault import get_secret  # noqa: F811

        _vault_password = get_secret("postgres_password", strict=False)
        if _vault_password:
            _db_password = _vault_password
    except Exception:
        pass

DATABASES = {
    # Default: routed through PgBouncer (production-identical)
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
            "NAME": os.environ.get("POSTGRES_TEST_DB", "test_loyallia_integration"),
        },
    },
    # Direct: bypasses PgBouncer for migrations and DDL
    "direct": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": _db_name,
        "USER": _db_user,
        "PASSWORD": _db_password,
        "HOST": _pg_direct_host,
        "PORT": _pg_direct_port,
        "TEST": {
            "NAME": os.environ.get("POSTGRES_TEST_DB", "test_loyallia_integration"),
        },
    },
}

# PgBouncer router: migrations → 'direct', queries → 'default' (PgBouncer)
DATABASE_ROUTERS = ["common.db_routers.PgBouncerRouter"]
