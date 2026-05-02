"""
Loyallia Django Settings -- Test Workbench

Local unit/integration tests should not depend on Docker DNS names such as
pgbouncer/postgres. Production and compose environments keep the PgBouncer
router from base/production settings; this module gives pytest a deterministic
single-database workbench.
"""

from .development import *  # noqa: F401, F403

MIDDLEWARE = [
    middleware
    for middleware in MIDDLEWARE  # noqa: F405
    if middleware != "common.rate_limit.RateLimitMiddleware"
]

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
