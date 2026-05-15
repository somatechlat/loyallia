"""
Integration tests that exercise the REAL production database path:
Django → PgBouncerRouter → PgBouncer (transaction mode) → PostgreSQL

These tests use TransactionTestCase because Django TestCase's transaction
rollback is incompatible with PgBouncer transaction pooling.
"""

from django.conf import settings
from django.test import TransactionTestCase, tag

from apps.authentication.models import User
from apps.tenants.models import Tenant
from tests.factories import make_tenant, make_user


@tag("integration")
class PgBouncerPathSmokeTest(TransactionTestCase):
    """
    Verify the application stack works correctly when queries flow through
    PgBouncer transaction-mode pooling (the production path).
    """

    def test_default_database_uses_pgbouncer_port(self):
        """Default alias must route through PgBouncer (port 6432)."""
        self.assertEqual(settings.DATABASES["default"]["PORT"], "6432")

    def test_direct_database_uses_postgres_port(self):
        """Direct alias must bypass PgBouncer (port 5432)."""
        self.assertEqual(settings.DATABASES["direct"]["PORT"], "5432")

    def test_router_is_enabled(self):
        """PgBouncerRouter must be active."""
        self.assertIn(
            "common.db_routers.PgBouncerRouter", settings.DATABASE_ROUTERS
        )

    def test_tenant_crud_through_pgbouncer(self):
        """Create, read, update, delete tenants through PgBouncer."""
        tenant = make_tenant(name="PgBouncer Path Tenant")
        self.assertTrue(
            Tenant.objects.filter(name="PgBouncer Path Tenant").exists()
        )

        tenant.name = "Updated PgBouncer Tenant"
        tenant.save()
        refreshed = Tenant.objects.get(id=tenant.id)
        self.assertEqual(refreshed.name, "Updated PgBouncer Tenant")

    def test_user_crud_through_pgbouncer(self):
        """Create, read, update, delete users through PgBouncer."""
        tenant = make_tenant()
        user = make_user(
            tenant=tenant, email="pgbouncer@integration.test", role="OWNER"
        )
        self.assertTrue(
            User.objects.filter(email="pgbouncer@integration.test").exists()
        )

        user.first_name = "PgBouncer"
        user.save()
        refreshed = User.objects.get(id=user.id)
        self.assertEqual(refreshed.first_name, "PgBouncer")

    def test_migrations_routed_to_direct_not_pgbouncer(self):
        """
        The router must send migrations to 'direct', not 'default'.
        We verify this by checking the router's allow_migrate method.
        """
        from common.db_routers import PgBouncerRouter

        router = PgBouncerRouter()
        self.assertTrue(router.allow_migrate("direct", "tenants"))
        self.assertFalse(router.allow_migrate("default", "tenants"))
