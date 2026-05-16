"""
Loyallia Django Settings — Integration Tests

Inherits from test.py.
Integration tests exercise the real PgBouncer query path (port 6432)
to verify production-identical database routing.
"""

from .test import *  # noqa: F401, F403
