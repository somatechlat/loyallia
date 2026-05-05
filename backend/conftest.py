"""
Loyallia — Root conftest for pytest-django

Overrides pytest-django's `django_db_setup` fixture to handle the
PgBouncer DDL limitation. Migrations and DB creation go through direct
PostgreSQL; all test queries route through PgBouncer (production path).

Architecture:
    1. Terminates PgBouncer-held sessions via direct PostgreSQL
    2. Creates test database and applies all migrations via direct PostgreSQL
    3. Restores PgBouncer routing before any test code runs
    4. All test queries go through PgBouncer (production-identical)

SEC: Tests run through the same connection pooler as production.
Called by: pytest (DJANGO_SETTINGS_MODULE=loyallia.settings.test)
"""

import logging

import psycopg2
import pytest

logger = logging.getLogger(__name__)


def _terminate_and_drop(direct_cfg, db_name):
    """Terminate all sessions and drop a database if it exists.

    PERF: Runs terminate + DROP in quick succession to prevent PgBouncer
    from re-establishing pooled connections between calls.
    """
    conn = psycopg2.connect(
        host=direct_cfg["HOST"],
        port=direct_cfg["PORT"],
        user=direct_cfg["USER"],
        password=direct_cfg["PASSWORD"],
        dbname=direct_cfg["NAME"],
    )
    conn.autocommit = True
    with conn.cursor() as cur:
        # Terminate all backends connected to the test database
        cur.execute(
            "SELECT pg_terminate_backend(pid) "
            "FROM pg_stat_activity "
            "WHERE datname = %s AND pid <> pg_backend_pid()",
            [db_name],
        )
        terminated = cur.rowcount
        logger.info("Terminated %d sessions on '%s'", terminated, db_name)

        # Drop immediately before PgBouncer reconnects
        cur.execute(f'DROP DATABASE IF EXISTS "{db_name}"')
        logger.info("Dropped database '%s'", db_name)
    conn.close()


def _create_test_db(direct_cfg, db_name, template_db):
    """Create a fresh test database via direct PostgreSQL."""
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
            f'CREATE DATABASE "{db_name}" TEMPLATE template0 '
            f"ENCODING 'UTF8' LC_COLLATE 'en_US.utf8' LC_CTYPE 'en_US.utf8'"
        )
        logger.info("Created database '%s'", db_name)
    conn.close()


@pytest.fixture(scope="session")
def django_db_setup(django_test_environment, django_db_blocker):
    """Create test database via direct PostgreSQL, bypassing PgBouncer.

    PgBouncer's transaction pooling mode cannot execute CREATE/DROP DATABASE
    or advisory locks. This fixture handles DDL via direct postgres, then
    restores PgBouncer routing for test execution.
    """
    from django.conf import settings
    from django.core.management import call_command
    from django.db import connections

    direct_cfg = settings.DATABASES["direct"]
    test_db_name = settings.DATABASES["default"]["TEST"].get("NAME", "test_loyallia")

    # Step 1: Drop existing test database (terminate PgBouncer sessions first)
    try:
        _terminate_and_drop(direct_cfg, test_db_name)
    except Exception as exc:
        logger.warning("Could not drop test DB (may not exist): %s", exc)

    # Step 2: Create fresh test database via direct postgres
    _create_test_db(direct_cfg, test_db_name, settings.DATABASES["default"]["NAME"])

    # Step 3: Apply migrations via direct postgres (PgBouncer can't do DDL)
    # Temporarily point 'default' to direct postgres
    original_host = settings.DATABASES["default"]["HOST"]
    original_port = settings.DATABASES["default"]["PORT"]
    original_routers = settings.DATABASE_ROUTERS[:]

    settings.DATABASES["default"]["HOST"] = direct_cfg["HOST"]
    settings.DATABASES["default"]["PORT"] = direct_cfg["PORT"]
    settings.DATABASES["default"]["NAME"] = test_db_name
    settings.DATABASE_ROUTERS = []

    for alias in connections:
        connections[alias].close()

    with django_db_blocker.unblock():
        call_command("migrate", "--run-syncdb", verbosity=1)

    logger.info("Migrations applied to '%s' via direct postgres", test_db_name)

    # Step 4: Restore PgBouncer routing for test queries
    settings.DATABASES["default"]["HOST"] = original_host
    settings.DATABASES["default"]["PORT"] = original_port
    settings.DATABASE_ROUTERS = original_routers

    for alias in connections:
        connections[alias].close()

    logger.info(
        "Test DB ready. Queries routed through PgBouncer (%s:%s)",
        original_host,
        original_port,
    )

    yield

    # Teardown: drop test database
    for alias in connections:
        connections[alias].close()

    try:
        _terminate_and_drop(direct_cfg, test_db_name)
    except Exception as exc:
        logger.warning("Could not drop test DB during teardown: %s", exc)
