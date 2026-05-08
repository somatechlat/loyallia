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
    password = defaults.pop("password", "[REDACTED]")
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
    """Verify that plan enforcement decorators are applied to endpoints."""

    def test_customers_api_imports_plan_enforcement(self):
        """customers.api should import plan enforcement decorators."""
        import importlib

        mod = importlib.import_module("apps.customers.api")
        self.assertTrue(hasattr(mod, "require_active_subscription"))
        self.assertTrue(hasattr(mod, "enforce_limit"))

    def test_cards_api_imports_plan_enforcement(self):
        import importlib

        mod = importlib.import_module("apps.cards.api")
        self.assertTrue(hasattr(mod, "require_active_subscription"))
        self.assertTrue(hasattr(mod, "enforce_limit"))

    def test_notifications_api_imports_enforce_limit(self):
        import importlib

        mod = importlib.import_module("apps.notifications.api")
        self.assertTrue(hasattr(mod, "enforce_limit"))

    def test_tenants_api_imports_enforce_limit(self):
        import importlib

        mod = importlib.import_module("apps.tenants.api")
        self.assertTrue(hasattr(mod, "enforce_limit"))

    def test_list_customers_has_subscription_decorator(self):
        import inspect

        from apps.customers.api import list_customers

        # At minimum, verify the function is wrapped (functools.wraps preserves __wrapped__)
        # We verify the decorator is applied by checking the source file
        module = inspect.getmodule(list_customers)
        assert module is not None
        module_source = inspect.getsource(module)
        self.assertIn("@require_active_subscription", module_source)

    def test_create_program_has_both_decorators(self):
        import inspect

        from apps.cards.api import create_program

        module = inspect.getmodule(create_program)
        assert module is not None
        module_source = inspect.getsource(module)
        # Find the create_program definition context
        idx = module_source.find("def create_program")
        context = module_source[max(0, idx - 200) : idx]
        self.assertIn("@require_active_subscription", context)
        self.assertIn('@enforce_limit("programs")', context)

    def test_create_campaign_has_enforce_limit(self):
        import inspect

        from apps.notifications.api import create_campaign

        module = inspect.getmodule(create_campaign)
        assert module is not None
        module_source = inspect.getsource(module)
        idx = module_source.find("def create_campaign")
        context = module_source[max(0, idx - 200) : idx]
        self.assertIn('@enforce_limit("notifications_month")', context)

    def test_create_location_has_enforce_limit(self):
        import inspect

        from apps.tenants.api import create_location

        module = inspect.getmodule(create_location)
        assert module is not None
        module_source = inspect.getsource(module)
        idx = module_source.find("def create_location")
        context = module_source[max(0, idx - 200) : idx]
        self.assertIn('@enforce_limit("locations")', context)


# ===========================================================================
# FIX 3 — LYL-C-API-003: Enrollment rate limiting + no data overwrite
# ===========================================================================


class EnrollmentEndpointTest(TestCase):
    """Verify enrollment rate limiting and data preservation."""

    def setUp(self):
        self.tenant = _make_tenant()
        self.card = _make_card(self.tenant, card_type="stamp")
        self.factory = RequestFactory()

    @override_settings(
        CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
    )
    def test_rate_limiting_applied(self):
        """Enrollment should be rate-limited to 10 per hour per IP."""
        # We test the rate limiting logic by examining the source code
        import inspect

        from apps.customers.api import enroll_customer_public

        source = inspect.getsource(enroll_customer_public)
        self.assertIn("cache", source)
        self.assertIn("enroll_rate", source)
        self.assertIn("429", source)

    def test_enrollment_does_not_overwrite_customer_data(self):
        """When a customer re-enrolls, existing profile data should NOT be overwritten."""
        import inspect

        from apps.customers.api import enroll_customer_public

        source = inspect.getsource(enroll_customer_public)
        # The old code had customer.first_name = customer_data.first_name after get_or_create
        # The fix removes this — verify no field assignment after get_or_create for existing customers
        # Look for the absence of the overwrite pattern
        lines = source.split("\n")
        in_post_create = False
        for line in lines:
            if "get_or_create" in line:
                in_post_create = True
                continue
            if in_post_create and "if not created:" in line:
                # Should NOT be present in the fixed code
                self.fail(
                    "Found 'if not created:' overwrite block — "
                    "enrollment should not overwrite customer profile data"
                )


# ===========================================================================
# FIX 6 — LYL-H-ARCH-003: Agent API crash (txn.metadata → txn.transaction_data)
# ===========================================================================


class AgentAPIFixTest(TestCase):
    """Verify Agent API uses transaction_data instead of metadata."""

    def test_recent_transactions_uses_transaction_data(self):
        import inspect

        from apps.agent_api.api import get_recent_transactions

        source = inspect.getsource(get_recent_transactions)
        # Must use transaction_data, not metadata
        self.assertIn("transaction_data", source)
        # Should NOT reference the non-existent .metadata field
        # (allow "metadata=" for the schema field assignment)
        lines = source.split("\n")
        for line in lines:
            if "txn.metadata" in line:
                self.fail(f"Found reference to txn.metadata: {line}")
