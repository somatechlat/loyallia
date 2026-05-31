"""
Loyallia PgBouncer-Aware Test Runner

PgBouncer in transaction pooling mode cannot execute DDL (CREATE DATABASE,
DROP DATABASE) or advisory locks (used by Django migrations). This runner
bridges that gap by routing schema operations through the direct PostgreSQL
connection while keeping normal test queries routed through PgBouncer.
"""

import logging

import psycopg2
from django.test.runner import DiscoverRunner

logger = logging.getLogger(__name__)


class PgBouncerTestRunner(DiscoverRunner):
    """
    Test runner that routes DDL (CREATE/DROP DATABASE) through the direct
    PostgreSQL connection while routing normal test queries through PgBouncer.
    """

    def setup_databases(self, **kwargs):
        """Create test databases using direct PostgreSQL (bypasses PgBouncer)."""
        old_default = self._swap_to_direct()
        try:
            return super().setup_databases(**kwargs)
        finally:
            self._restore_connection(old_default)

    def teardown_databases(self, old_config, **kwargs):
        """Drop test databases using direct PostgreSQL (bypasses PgBouncer)."""
        old_default = self._swap_to_direct()
        try:
            return super().teardown_databases(old_config, **kwargs)
        finally:
            self._restore_connection(old_default)

    def _swap_to_direct(self):
        """Temporarily replace default DB config with direct config for DDL."""
        from django.conf import settings

        old_default = settings.DATABASES["default"].copy()
        if "direct" in settings.DATABASES:
            settings.DATABASES["default"] = settings.DATABASES["direct"].copy()
 # Preserve the logical database name from the original default
            settings.DATABASES["default"]["NAME"] = old_default["NAME"]
 # Disable routers so Django doesn't try to route DDL to PgBouncer
        settings.DATABASE_ROUTERS = []
        return old_default

    def _restore_connection(self, old_default):
        """Restore original default DB config and routers."""
        from django.conf import settings

        settings.DATABASES["default"] = old_default
        settings.DATABASE_ROUTERS = ["common.db_routers.PgBouncerRouter"]

    def _terminate_backends(self, db_name):
        """Kill existing connections to the test DB before dropping it."""
        from django.conf import settings

        direct = settings.DATABASES.get("direct", settings.DATABASES["default"])
        conn = None
        try:
            conn = psycopg2.connect(
                host=direct["HOST"],
                port=direct["PORT"],
                user=direct["USER"],
                password=direct["PASSWORD"],
                database="postgres",
            )
            conn.autocommit = True
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT pg_terminate_backend(pid) "
                    "FROM pg_stat_activity WHERE datname = %s AND pid <> pg_backend_pid()",
                    (db_name,),
                )
        except Exception as exc:
            logger.warning("Could not terminate backends for %s: %s", db_name, exc)
        finally:
            if conn is not None:
                conn.close()
