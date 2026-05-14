"""
Loyallia — PgBouncer-Compatible Test Runner

SEC: Ensures tests run through PgBouncer (production-identical path) while
handling the DDL limitation: PgBouncer's transaction mode cannot execute
CREATE/DROP DATABASE or advisory locks needed by Django's migration framework.

Architecture:
    1. Temporarily routes 'default' to direct PostgreSQL for DB creation
    2. Creates test database and applies all migrations
    3. Restores PgBouncer routing before any test code runs
    4. All test queries go through PgBouncer (production-identical)

Called by: pytest (DJANGO_SETTINGS_MODULE=loyallia.settings.test)
"""

import logging

from django.test.runner import DiscoverRunner

logger = logging.getLogger(__name__)


class PgBouncerTestRunner(DiscoverRunner):
    """Test runner that creates test DB via direct postgres, queries via PgBouncer.

    PgBouncer's transaction pooling mode does not support:
      - CREATE/DROP DATABASE (DDL outside transactions)
      - Advisory locks (used by Django's migration framework)
      - SET/RESET session variables

    This runner bypasses PgBouncer for DDL operations only, then restores
    the PgBouncer path for all actual test execution.
    """

    def setup_databases(self, **kwargs):
        """Create test database via direct PostgreSQL, skipping PgBouncer.

        Strategy: temporarily swap 'default' to point at direct postgres
        for the entire setup phase (DB creation + migrations + post_migrate).
        Once setup is complete, restore PgBouncer routing.
        """
        from django.conf import settings
        from django.db import connections

        test_db_name = settings.DATABASES["default"]["TEST"].get(
            "NAME", "test_loyallia"
        )

        # Terminate any existing connections to the test database
        self._terminate_backends(test_db_name)

        # Save original PgBouncer config
        self._original_host = settings.DATABASES["default"]["HOST"]
        self._original_port = settings.DATABASES["default"]["PORT"]

        # Route 'default' to direct PostgreSQL for DDL
        direct_cfg = settings.DATABASES["direct"]
        settings.DATABASES["default"]["HOST"] = direct_cfg["HOST"]
        settings.DATABASES["default"]["PORT"] = direct_cfg["PORT"]

        # Temporarily disable the PgBouncer router so migrations run on 'default'
        self._original_routers = settings.DATABASE_ROUTERS
        settings.DATABASE_ROUTERS = []

        # Close existing connections
        for alias in connections:
            connections[alias].close()

        # If test DB already exists, force-drop it via psycopg2 so Django's
        # setup_databases doesn't hit 'database is being accessed by other users'
        try:
            import psycopg2

            conn = psycopg2.connect(
                host=direct_cfg["HOST"],
                port=direct_cfg["PORT"],
                user=direct_cfg["USER"],
                password=direct_cfg["PASSWORD"],
                dbname=direct_cfg["NAME"],
            )
            conn.autocommit = True
            with conn.cursor() as cur:
                cur.execute(
                    "DROP DATABASE IF EXISTS %s WITH (FORCE)"
                    % psycopg2.extensions.quote_ident(test_db_name, conn)
                )
            conn.close()
        except Exception:
            pass  # DB may not exist; let Django handle it

        logger.info(
            "Test DB setup: routing 'default' to direct PostgreSQL (%s:%s)",
            direct_cfg["HOST"],
            direct_cfg["PORT"],
        )

        result = super().setup_databases(**kwargs)

        # Restore PgBouncer routing for test execution
        settings.DATABASES["default"]["HOST"] = self._original_host
        settings.DATABASES["default"]["PORT"] = self._original_port
        settings.DATABASE_ROUTERS = self._original_routers

        # Re-grant connect permission so tests can access the DB
        self._grant_connect(test_db_name)

        # Close connections so new ones use PgBouncer
        for alias in connections:
            connections[alias].close()

        logger.info("Test DB setup complete. Routing restored to PgBouncer.")
        return result

    def teardown_databases(self, old_config, **kwargs):
        """Drop test database via direct PostgreSQL.

        Uses a connection to the 'direct' database (not the test DB itself)
        because PostgreSQL refuses to DROP a database you are connected to.
        """
        from django.conf import settings
        from django.db import connections

        test_db_name = settings.DATABASES["default"]["TEST"].get(
            "NAME", "test_loyallia"
        )
        self._terminate_backends(test_db_name)

        # Close all connections to the test database before dropping
        for alias in connections:
            connections[alias].close()

        # Drop the test database using a fresh connection to 'direct'
        # (not to the test DB itself — that would fail)
        direct_cfg = settings.DATABASES["direct"]
        try:
            import psycopg2

            conn = psycopg2.connect(
                host=direct_cfg["HOST"],
                port=direct_cfg["PORT"],
                user=direct_cfg["USER"],
                password=direct_cfg["PASSWORD"],
                dbname=direct_cfg["NAME"],
            )
            conn.autocommit = True
            with conn.cursor() as cur:
                cur.execute(
                    "DROP DATABASE IF EXISTS %s WITH (FORCE)"
                    % psycopg2.extensions.quote_ident(test_db_name, conn)
                )
            conn.close()
        except Exception as exc:
            logger.warning("Failed to drop test database %s: %s", test_db_name, exc)
            # Fallback to Django's default behavior
            settings.DATABASES["default"]["HOST"] = direct_cfg["HOST"]
            settings.DATABASES["default"]["PORT"] = direct_cfg["PORT"]
            settings.DATABASE_ROUTERS = []
            super().teardown_databases(old_config, **kwargs)

    @staticmethod
    def _terminate_backends(db_name):
        """Terminate all PostgreSQL sessions connected to the given database
        and revoke connect permission to prevent reconnection races.

        PERF: Single SQL call terminates all sessions, preventing
        'database is being accessed by other users' errors during
        test DB creation/teardown.
        """
        from django.conf import settings

        try:
            import psycopg2

            direct = settings.DATABASES["direct"]
            conn = psycopg2.connect(
                host=direct["HOST"],
                port=direct["PORT"],
                user=direct["USER"],
                password=direct["PASSWORD"],
                dbname=direct["NAME"],
            )
            conn.autocommit = True
            with conn.cursor() as cur:
                # Terminate existing sessions
                cur.execute(
                    "SELECT pg_terminate_backend(pid) "
                    "FROM pg_stat_activity "
                    "WHERE datname = %s AND pid <> pg_backend_pid()",
                    [db_name],
                )
                # Prevent new sessions while we drop/create
                cur.execute(
                    "REVOKE CONNECT ON DATABASE %s FROM PUBLIC"
                    % psycopg2.extensions.quote_ident(db_name, conn)
                )
            conn.close()
        except Exception:
            # Non-fatal: test DB may not exist yet on first run
            pass

    @staticmethod
    def _grant_connect(db_name):
        """Re-grant connect permission after test DB is created."""
        from django.conf import settings

        try:
            import psycopg2

            direct = settings.DATABASES["direct"]
            conn = psycopg2.connect(
                host=direct["HOST"],
                port=direct["PORT"],
                user=direct["USER"],
                password=direct["PASSWORD"],
                dbname=direct["NAME"],
            )
            conn.autocommit = True
            with conn.cursor() as cur:
                cur.execute(
                    "GRANT CONNECT ON DATABASE %s TO PUBLIC"
                    % psycopg2.extensions.quote_ident(db_name, conn)
                )
            conn.close()
        except Exception:
            pass
