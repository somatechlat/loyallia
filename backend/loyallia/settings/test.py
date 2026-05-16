"""
Loyallia Django Settings — Test

Tests run DIRECTLY against the development database.
No separate test database. No creation. No teardown.
Tests WILL alter data. This is development.
"""

from .development import *  # noqa: F401, F403

# Disable rate limiting so tests don't get blocked
MIDDLEWARE = [
    middleware
    for middleware in MIDDLEWARE  # noqa: F405
    if middleware != "common.rate_limit.RateLimitMiddleware"
]

# Use the SAME database as development — no test database
DATABASES["default"]["TEST"] = {"NAME": None}  # noqa: F405
if "direct" in DATABASES:  # noqa: F405
    del DATABASES["direct"]  # noqa: F405

# No database routers in tests — direct to the one DB
DATABASE_ROUTERS = []
