"""
Loyallia Django Settings — Test

Inherits from base.py (NOT development.py).
Ensures production-fidelity configuration.
Django automatically creates test_loyallia and destroys it after tests complete.
"""
from .base import *  # noqa: F401, F403

# =============================================================================
# TEST DATABASE ISOLATION
# Django creates test_loyallia automatically and destroys it after tests.
# =============================================================================
DATABASES["default"]["TEST"] = {"NAME": "test_loyallia"}  # noqa: F405

# Keep PgBouncerRouter for production-identical query path.
# Keep direct connection for DDL (CREATE DATABASE, migrations).

# =============================================================================
# DISABLE RATE LIMITING IN TESTS
# Tests must not be blocked by Redis-backed rate limiting.
# =============================================================================
MIDDLEWARE = [  # noqa: F405
    m
    for m in MIDDLEWARE  # noqa: F405
    if m != "common.rate_limit.RateLimitMiddleware"
]

# =============================================================================
# PRODUCTION-FIDELITY TEST SETTINGS
# =============================================================================
DEBUG = False

# Email captured in-memory for test assertions and isolation
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# Celery runs synchronously in tests for deterministic behavior
CELERY_TASK_ALWAYS_EAGER = True
CELERY_EAGER_PROPAGATES_EXCEPTIONS = True

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

# =============================================================================
# LOGGING — quieter in tests
# =============================================================================
import logging

logging.getLogger("django.db.backends").setLevel(logging.WARNING)
