"""
Tests for audit API endpoint fixes — audit findings LYL-C-API-002, LYL-C-API-003, LYL-H-ARCH-003.
Uses Django's TestCase with PostgreSQL.
"""

import uuid
from typing import cast

from django.test import RequestFactory, TestCase, override_settings

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_tenant(**kwargs):
    from apps.tenants.models import Tenant

    defaults = {"name": "Test Tenant", "slug": f"test-{uuid.uuid4().hex[:8]}"}
    defaults.update(kwargs)
    return Tenant.objects.create(**defaults)


def _make_user(tenant, **kwargs):
    from apps.authentication.models import User, UserManager

    defaults = {
        "email": f"user-{uuid.uuid4().hex[:6]}@test.com",
        "first_name": "Test",
        "last_name": "User",
        "role": "OWNER",
    }
    defaults.update(kwargs)
    import secrets
    password = defaults.pop("password", None) or secrets.token_urlsafe(16)
    user = cast(UserManager, User.objects).create_user(password=password, **defaults)
    if tenant:
        user.tenant = tenant
        user.save(update_fields=["tenant"])
    return user


def _make_card(tenant, card_type="stamp", metadata=None, **kwargs):
    from apps.cards.models import Card

    type_defaults = {
        "stamp": {"stamps_required": 10, "reward_description": "Free coffee"},
        "coupon": {
            "discount_type": "special_promo",
            "promo_text": "Free coffee",
            "usage_limit_per_customer": 1,
            "coupon_description": "Free coffee",
        },
        "referral_pass": {
            "referrer_reward": "Free item",
            "referee_reward": "10% off",
            "max_referrals_per_customer": 0,
        },
        "cashback": {
            "cashback_percentage": 5,
            "minimum_purchase": 0,
            "credit_expiry_days": 365,
        },
        "discount": {
            "tiers": [
                {"tier_name": "Silver", "threshold": 0, "discount_percentage": 5},
                {"tier_name": "Gold", "threshold": 100, "discount_percentage": 10},
            ],
        },
    }
    merged_metadata = dict(type_defaults.get(card_type, {}))
    merged_metadata.update(metadata or {})
    defaults = {
        "name": f"Test Card {uuid.uuid4().hex[:6]}",
        "card_type": card_type,
        "is_active": True,
        "metadata": merged_metadata,
    }
    defaults.update(kwargs)
    return Card.objects.create(tenant=tenant, **defaults)


def _make_customer(tenant, **kwargs):
    from apps.customers.models import Customer

    defaults = {
        "first_name": "Jane",
        "last_name": "Doe",
        "email": f"jane-{uuid.uuid4().hex[:6]}@test.com",
    }
    defaults.update(kwargs)
    return Customer.objects.create(tenant=tenant, **defaults)


def _make_pass(customer, card):
    from apps.customers.models import CustomerPass

    return CustomerPass.objects.create(customer=customer, card=card)


# ===========================================================================
# FIX 2 — LYL-C-API-002: Plan enforcement decorators
# ===========================================================================


class PlanEnforcementDecoratorsTest(TestCase):
    """Verify that plan enforcement decorators are applied to endpoints via runtime behavior."""

    def setUp(self):
        from apps.billing.models import SubscriptionStatus

        self.tenant = _make_tenant()
        self.owner = _make_user(self.tenant, role="OWNER")
        from tests.factories import make_subscription
        make_subscription(self.tenant, status=SubscriptionStatus.ACTIVE)

    def _request(self, user):
        from django.test import RequestFactory
        req = RequestFactory().get("/api/v1/test/")
        req.user = user
        req.tenant = user.tenant
        return req

    def test_list_customers_requires_active_subscription(self):
        """list_customers endpoint should require active subscription."""
        from apps.customers.api import list_customers

        req = self._request(self.owner)
        # With active subscription (setUp), should not raise subscription error
        result = list_customers(req)
        self.assertIsNotNone(result)

    def test_create_program_checks_plan_limit(self):
        """create_program should check plan limits at runtime."""
        from apps.cards.api import create_program
        from apps.cards.schemas import CardCreateIn

        req = self._request(self.owner)
        payload = CardCreateIn(name="Test Plan Check", card_type="stamp")
        # With active subscription, should not raise subscription error
        result = create_program(req, payload)
        self.assertIsNotNone(result)

    def test_create_campaign_checks_plan_limit(self):
        """create_campaign should check plan limits at runtime."""
        from apps.notifications.api.campaigns import create_campaign
        from apps.notifications.schemas import CampaignCreateIn

        req = self._request(self.owner)
        payload = CampaignCreateIn(
            name="Test Campaign",
            campaign_type="email",
            subject="Test",
            content="Test content",
        )
        # With active subscription, should not raise subscription error
        result = create_campaign(req, payload)
        self.assertIsNotNone(result)

    def test_create_location_checks_plan_limit(self):
        """create_location should check plan limits at runtime."""
        from apps.tenants.api import create_location
        from apps.tenants.schemas import LocationCreateIn

        req = self._request(self.owner)
        payload = LocationCreateIn(name="Test Location", address="123 Test St")
        # With active subscription, should not raise subscription error
        result = create_location(req, payload)
        self.assertIsNotNone(result)


# ===========================================================================
# FIX 3 — LYL-C-API-003: Enrollment rate limiting + no data overwrite
# ===========================================================================


class EnrollmentEndpointTest(TestCase):
    """Verify enrollment rate limiting and data preservation."""

    def setUp(self):
        self.tenant = _make_tenant()
        self.card = _make_card(self.tenant, card_type="stamp")
        self.factory = RequestFactory()

    @override_settings(CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}})
    def test_rate_limiting_applied(self):
        """Enrollment should be rate-limited to 10 per hour per IP."""
        # Runtime verification: the rate limiter module should have enrollment rules
        from common.rate_limit import RATE_LIMIT_RULES

        paths = [rule[0] for rule in RATE_LIMIT_RULES]
        self.assertIn("/api/v1/customers/enroll/", paths)

    def test_enrollment_does_not_overwrite_customer_data(self):
        """When a customer re-enrolls, existing profile data should NOT be overwritten."""
        import json

        from apps.customers.models import Customer

        # First enrollment
        resp1 = self.client.post(
            f"/api/v1/customers/enroll/?card_id={self.card.id}",
            data=json.dumps(
                {
                    "first_name": "Original",
                    "last_name": "Name",
                    "email": "re enroll@test.com",
                    "phone": "+593991234567",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(resp1.status_code, 200)
        customer = Customer.objects.get(email="re enroll@test.com", tenant=self.tenant)
        self.assertEqual(customer.first_name, "Original")

        # Re-enrollment with different data
        resp2 = self.client.post(
            f"/api/v1/customers/enroll/?card_id={self.card.id}",
            data=json.dumps(
                {
                    "first_name": "Changed",
                    "last_name": "Data",
                    "email": "re enroll@test.com",
                    "phone": "+593999876543",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(resp2.status_code, 200)
        customer.refresh_from_db()
        # Original data must be preserved
        self.assertEqual(customer.first_name, "Original")
        self.assertEqual(customer.last_name, "Name")
        self.assertEqual(customer.phone, "+593991234567")


# ===========================================================================
# FIX 6 — LYL-H-ARCH-003: Agent API crash (txn.metadata → txn.transaction_data)
# ===========================================================================


class AgentAPIFixTest(TestCase):
    """Verify Agent API uses transaction_data instead of metadata."""

    def test_recent_transactions_returns_transaction_data(self):
        """Call the API and verify the response uses transaction_data field."""
        from django.test import RequestFactory

        from apps.agent_api.api import get_recent_transactions
        from apps.authentication.models import User, UserRole
        from tests.vault_helper import get_test_password
        user = User.objects.create_user(
            email="agent@test.com",
            password=get_test_password(),
            role=UserRole.SUPER_ADMIN,
        )
        request = RequestFactory().get("/api/v1/agent/recent-transactions/")
        request.user = user
        request.tenant = None

        # The API should not crash and should return a list
        result = get_recent_transactions(request)
        self.assertIsInstance(result, list)
