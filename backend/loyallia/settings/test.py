"""
Loyallia Django Settings  Test

Inherits from base.py (NOT development.py).
Ensures production-fidelity configuration.
Django uses loyallia_dev as the test database template (--reuse-db recommended).
"""

from .base import *  # noqa: F401, F403

# TEST DATABASE ISOLATION
# Django creates test_loyallia_dev automatically and destroys it after tests.
# Use --reuse-db to keep the test database across runs.

# Bypass PgBouncer in tests connection pooling is unnecessary and breaks
# test DB creation/destruction. Route everything through direct PostgreSQL.
if "direct" in DATABASES:  # noqa: F405
    DATABASES["default"] = DATABASES["direct"].copy()  # noqa: F405
    # Let Django auto-name test DB (test_loyallia_dev) so pytest-xdist can
    # append worker suffixes (test_loyallia_dev_gw0, gw1, etc.) automatically.
    # Hardcoding NAME breaks parallel test database creation.
    DATABASES["default"]["TEST"] = {"NAME": None}  # noqa: F405
    del DATABASES["direct"]  # noqa: F405
    DATABASE_ROUTERS = []  # noqa: F405

# DISABLE RATE LIMITING IN TESTS
# Tests must not be blocked by Redis-backed rate limiting.

MIDDLEWARE = [  # noqa: F405
    m for m in MIDDLEWARE if m != "common.rate_limit.RateLimitMiddleware"  # noqa: F405
]

# PRODUCTION-FIDELITY TEST SETTINGS

DEBUG = False

# Email captured in-memory for test assertions and isolation
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# Celery runs synchronously in tests for deterministic behavior
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Use in-memory cache to avoid requiring a live Redis on the host
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

# Disable Sentry in tests to avoid polluting error tracking
SENTRY_DSN = None

# CORS: explicit whitelist (not allow-all) for production fidelity
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    "http://localhost:33906",
    "http://localhost:3000",
]

# MinIO test bucket to avoid polluting dev/prod buckets
AWS_STORAGE_BUCKET_NAME = "loyallia-test"

# LOGGING quieter in tests

import logging  # noqa: E402

logging.getLogger("django.db.backends").setLevel(logging.WARNING)
