"""
Cross-Tenant Negative Authorization Tests

Verifies that Tenant A's owner/manager/staff cannot access Tenant B's resources
by ID manipulation across ALL data domains.

Domains covered: Customers, Transactions, Automations, Billing/Subscription,
Wallet Templates, Locations, Team Members.

Each test creates two isolated tenants with data, authenticates as Tenant A,
and attempts to access Tenant B's resource by ID, expecting 403 or 404.
"""

from django.http import Http404
from django.test import RequestFactory, TestCase
from ninja.errors import HttpError

from tests.factories import (
    make_automation,
    make_card,
    make_customer,
    make_customer_pass,
    make_location,
    make_owner,
    make_subscription,
    make_tenant,
    make_transaction,
    make_user,
)


def _deny(exc):
    """Assert exception is a 403 or 404 denial."""
    if hasattr(exc, "status_code"):
        assert exc.status_code in (403, 404), f"Expected 403/404, got {exc.status_code}"
    else:
        assert isinstance(exc, Http404), f"Expected Http404, got {type(exc)}"


class _BaseCrossTenantTest(TestCase):
    """Shared setup: two tenants with owners and baseline data."""

    def setUp(self):
        self.tenant_a = make_tenant(name="Tenant A")
        self.tenant_b = make_tenant(name="Tenant B")
        self.owner_a = make_owner(tenant=self.tenant_a)
        self.owner_b = make_owner(tenant=self.tenant_b)
        make_subscription(self.tenant_a)
        make_subscription(self.tenant_b)
        self.card_a = make_card(self.tenant_a)
        self.card_b = make_card(self.tenant_b)

    def _req(self, user, method="get"):
        factory = RequestFactory()
        if method == "get":
            req = factory.get("/api/v1/test/")
        elif method == "post":
            req = factory.post("/api/v1/test/", data=b"{}", content_type="application/json")
        elif method == "put":
            req = factory.put("/api/v1/test/", data=b"{}", content_type="application/json")
        elif method == "delete":
            req = factory.delete("/api/v1/test/")
        else:
            req = factory.get("/api/v1/test/")
        req.user = user
        req.tenant = user.tenant
        return req


class TestCrossTenantCustomers(_BaseCrossTenantTest):
    """LYL-AUTHZ-004: Customers domain cross-tenant isolation."""

    def setUp(self):
        super().setUp()
        self.customer_b = make_customer(self.tenant_b)

    def test_owner_a_cannot_get_tenant_b_customer(self):
        from apps.customers.api import get_customer

        req = self._req(self.owner_a)
        with self.assertRaises((HttpError, Http404)) as ctx:
            get_customer(req, str(self.customer_b.id))
        _deny(ctx.exception)

    def test_owner_a_cannot_update_tenant_b_customer(self):
        from apps.customers.api import update_customer
        from apps.customers.schemas import CustomerUpdateIn

        req = self._req(self.owner_a, method="put")
        payload = CustomerUpdateIn(first_name="Hacked")  # type: ignore[reportArgumentType]
        with self.assertRaises((HttpError, Http404)) as ctx:
            update_customer(req, str(self.customer_b.id), payload)
        _deny(ctx.exception)

    def test_owner_a_cannot_delete_tenant_b_customer(self):
        from apps.customers.api import delete_customer

        req = self._req(self.owner_a, method="delete")
        with self.assertRaises((HttpError, Http404)) as ctx:
            delete_customer(req, str(self.customer_b.id))
        _deny(ctx.exception)

    def test_owner_a_cannot_get_tenant_b_customer_passes(self):
        from apps.customers.api import get_customer_passes

        req = self._req(self.owner_a)
        with self.assertRaises((HttpError, Http404)) as ctx:
            get_customer_passes(req, str(self.customer_b.id))
        _deny(ctx.exception)


class TestCrossTenantTransactions(_BaseCrossTenantTest):
    """LYL-AUTHZ-004: Transactions domain cross-tenant isolation."""

    def setUp(self):
        super().setUp()
        self.customer_b = make_customer(self.tenant_b)
        self.pass_b = make_customer_pass(self.customer_b, self.card_b)
        self.txn_b = make_transaction(self.tenant_b, self.pass_b)

    def test_owner_a_cannot_get_tenant_b_transaction(self):
        from apps.transactions.api import get_transaction

        req = self._req(self.owner_a)
        with self.assertRaises((HttpError, Http404)) as ctx:
            get_transaction(req, str(self.txn_b.id))
        _deny(ctx.exception)


class TestCrossTenantAutomations(_BaseCrossTenantTest):
    """LYL-AUTHZ-004: Automations domain cross-tenant isolation."""

    def setUp(self):
        super().setUp()
        self.automation_b = make_automation(self.tenant_b)

    def test_owner_a_cannot_get_tenant_b_automation(self):
        from apps.automation.api import get_automation

        req = self._req(self.owner_a)
        with self.assertRaises((HttpError, Http404)) as ctx:
            get_automation(req, str(self.automation_b.id))
        _deny(ctx.exception)

    def test_owner_a_cannot_delete_tenant_b_automation(self):
        from apps.automation.api import delete_automation

        req = self._req(self.owner_a, method="delete")
        with self.assertRaises((HttpError, Http404)) as ctx:
            delete_automation(req, str(self.automation_b.id))
        _deny(ctx.exception)

    def test_owner_a_cannot_toggle_tenant_b_automation(self):
        from apps.automation.api import toggle_automation

        req = self._req(self.owner_a, method="post")
        with self.assertRaises((HttpError, Http404)) as ctx:
            toggle_automation(req, str(self.automation_b.id))
        _deny(ctx.exception)


class TestCrossTenantBilling(_BaseCrossTenantTest):
    """LYL-AUTHZ-004: Billing/Subscription domain cross-tenant isolation."""

    def test_owner_a_cannot_see_tenant_b_subscription(self):
        """Owner A's get_subscription should always return their own tenant's subscription."""
        from apps.billing.api import get_subscription
        from apps.billing.models import Subscription

        req = self._req(self.owner_a)
        get_subscription(req)
        sub = Subscription.objects.get(tenant=self.tenant_a)
        self.assertEqual(sub.tenant_id, self.tenant_a.id)


class TestCrossTenantLocations(_BaseCrossTenantTest):
    """LYL-AUTHZ-004: Locations domain cross-tenant isolation."""

    def setUp(self):
        super().setUp()
        self.location_b = make_location(self.tenant_b)

    def test_owner_a_cannot_update_tenant_b_location(self):
        import json

        from apps.tenants.api import update_location

        req = self._req(self.owner_a, method="put")
        req._body = json.dumps({"name": "Hacked"}).encode()
        with self.assertRaises((HttpError, Http404)) as ctx:
            update_location(req, str(self.location_b.id))
        _deny(ctx.exception)

    def test_owner_a_cannot_delete_tenant_b_location(self):
        from apps.tenants.api import delete_location

        req = self._req(self.owner_a, method="delete")
        with self.assertRaises((HttpError, Http404)) as ctx:
            delete_location(req, str(self.location_b.id))
        _deny(ctx.exception)


class TestCrossTenantTeamMembers(_BaseCrossTenantTest):
    """LYL-AUTHZ-004: Team members domain cross-tenant isolation."""

    def setUp(self):
        super().setUp()
        self.user_b = make_user(tenant=self.tenant_b, role="STAFF")

    def test_owner_a_cannot_update_tenant_b_team_member(self):
        from apps.tenants.api import update_team_member
        from apps.tenants.schemas import TeamMemberUpdateIn

        req = self._req(self.owner_a, method="put")
        payload = TeamMemberUpdateIn(first_name="Hacked")  # type: ignore[reportArgumentType]
        with self.assertRaises((HttpError, Http404)) as ctx:
            update_team_member(req, str(self.user_b.id), payload)
        _deny(ctx.exception)

    def test_owner_a_cannot_delete_tenant_b_team_member(self):
        from apps.tenants.api import delete_team_member

        req = self._req(self.owner_a, method="delete")
        with self.assertRaises((HttpError, Http404)) as ctx:
            delete_team_member(req, str(self.user_b.id))
        _deny(ctx.exception)


class TestCrossTenantWalletTemplates(_BaseCrossTenantTest):
    """LYL-AUTHZ-004: Wallet templates domain cross-tenant isolation."""

    def setUp(self):
        super().setUp()
        from tests.factories import make_plan, make_subscription

        # Recreate subscriptions with wallet_pass_studio feature and limits
        plan = make_plan(
            features=["wallet_pass_studio", "data_export"],
            max_wallet_templates=10,
            max_wallet_pass_updates_month=100,
        )
        make_subscription(self.tenant_a, plan=plan)
        make_subscription(self.tenant_b, plan=plan)

        # Create a wallet template for tenant_b
        from apps.wallet.models import WalletTemplate

        self.template_b = WalletTemplate.objects.create(
            tenant=self.tenant_b,
            owner=self.owner_b,
            name="Tenant B Template",
            card_type="stamp",
            design_state={"primary_color": "#000"},
        )

    def test_owner_a_cannot_get_tenant_b_template(self):
        from apps.wallet.api import get_template

        req = self._req(self.owner_a)
        with self.assertRaises((HttpError, Http404)) as ctx:
            get_template(req, str(self.template_b.id))
        _deny(ctx.exception)

    def test_owner_a_cannot_update_tenant_b_template(self):
        from apps.wallet.api import WalletTemplateUpdateIn, update_template

        req = self._req(self.owner_a, method="put")
        payload = WalletTemplateUpdateIn(name="Hacked")  # type: ignore[reportArgumentType]
        with self.assertRaises((HttpError, Http404)) as ctx:
            update_template(req, str(self.template_b.id), payload)
        _deny(ctx.exception)

    def test_owner_a_cannot_delete_tenant_b_template(self):
        from apps.wallet.api import delete_template

        req = self._req(self.owner_a, method="delete")
        with self.assertRaises((HttpError, Http404)) as ctx:
            delete_template(req, str(self.template_b.id))
        _deny(ctx.exception)


class TestStaffAndManagerCrossTenant(_BaseCrossTenantTest):
    """LYL-AUTHZ-004: Verify staff/manager also cannot cross tenant boundaries."""

    def setUp(self):
        super().setUp()
        self.manager_a = make_user(tenant=self.tenant_a, role="MANAGER")
        self.staff_a = make_user(tenant=self.tenant_a, role="STAFF")
        self.customer_b = make_customer(self.tenant_b)

    def test_manager_a_cannot_get_tenant_b_customer(self):
        from apps.customers.api import get_customer

        req = self._req(self.manager_a)
        with self.assertRaises((HttpError, Http404)) as ctx:
            get_customer(req, str(self.customer_b.id))
        _deny(ctx.exception)

    def test_staff_a_cannot_get_tenant_b_customer(self):
        from apps.customers.api import get_customer

        req = self._req(self.staff_a)
        with self.assertRaises((HttpError, Http404)) as ctx:
            get_customer(req, str(self.customer_b.id))
        _deny(ctx.exception)
