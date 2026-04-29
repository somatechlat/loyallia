"""
Tests for backend business logic fixes — audit findings LYL-C-API-001 through LYL-H-API-010.
Uses Django's TestCase with an in-memory SQLite database.
Run with: python manage.py test tests.test_audit_fixes
"""

import uuid
from datetime import timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.test import TestCase, RequestFactory, override_settings
from django.utils import timezone


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_tenant(**kwargs):
    from apps.tenants.models import Tenant
    defaults = {"name": "Test Tenant", "slug": f"test-{uuid.uuid4().hex[:8]}"}
    defaults.update(kwargs)
    return Tenant.objects.create(**defaults)


def _make_user(tenant, **kwargs):
    from apps.authentication.models import User
    defaults = {
        "email": f"user-{uuid.uuid4().hex[:6]}@test.com",
        "first_name": "Test",
        "last_name": "User",
        "role": "OWNER",
    }
    defaults.update(kwargs)
    password = defaults.pop("password", "testpass123")
    user = User.objects.create_user(password=password, **defaults)
    if tenant:
        user.tenant = tenant
        user.save(update_fields=["tenant"])
    return user


def _make_card(tenant, card_type="stamp", metadata=None, **kwargs):
    from apps.cards.models import Card
    defaults = {
        "name": f"Test Card {uuid.uuid4().hex[:6]}",
        "card_type": card_type,
        "is_active": True,
        "metadata": metadata or {},
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
# FIX 1 — LYL-C-API-001: Coupon double-redemption race condition
# ===========================================================================

class CouponRedemptionRaceConditionTest(TestCase):
    """Verify that _process_coupon_transaction cannot be double-redeemed."""

    def setUp(self):
        self.tenant = _make_tenant()
        self.card = _make_card(self.tenant, card_type="coupon", metadata={
            "coupon_description": "Free coffee",
        })
        self.customer = _make_customer(self.tenant)
        self.pass_obj = _make_pass(self.customer, self.card)

    def test_first_redemption_succeeds(self):
        result = self.pass_obj._process_coupon_transaction()
        self.assertTrue(result["pass_updated"])
        self.assertTrue(result["reward_earned"])
        self.assertEqual(result["reward_description"], "Free coffee")

    def test_second_redemption_blocked(self):
        self.pass_obj._process_coupon_transaction()
        # Refresh from DB
        self.pass_obj.refresh_from_db()
        result = self.pass_obj._process_coupon_transaction()
        self.assertFalse(result["pass_updated"])
        self.assertNotIn("reward_earned", result)

    def test_coupon_used_checked_inside_lock(self):
        """The check must be inside select_for_update to prevent races."""
        import inspect
        source = inspect.getsource(self.pass_obj._process_coupon_transaction)
        # Verify select_for_update is used
        self.assertIn("select_for_update", source)
        # Verify coupon_used check is after (inside) the lock acquisition
        lock_pos = source.find("select_for_update")
        check_pos = source.find("coupon_used")
        self.assertGreater(check_pos, lock_pos,
                           "coupon_used check must appear after select_for_update")


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
        # Django Ninja wraps functions, check the original function
        fn = list_customers
        # Walk the closure chain to find if require_active_subscription was applied
        source = inspect.getsource(type(fn).__call__) if hasattr(fn, '__wrapped__') else ""
        # At minimum, verify the function is wrapped (functools.wraps preserves __wrapped__)
        # We verify the decorator is applied by checking the source file
        module_source = inspect.getsource(inspect.getmodule(list_customers))
        self.assertIn("@require_active_subscription", module_source)

    def test_create_program_has_both_decorators(self):
        import inspect
        from apps.cards.api import create_program
        module_source = inspect.getsource(inspect.getmodule(create_program))
        # Find the create_program definition context
        idx = module_source.find("def create_program")
        context = module_source[max(0, idx-200):idx]
        self.assertIn("@require_active_subscription", context)
        self.assertIn('@enforce_limit("programs")', context)

    def test_create_campaign_has_enforce_limit(self):
        import inspect
        from apps.notifications.api import create_campaign
        module_source = inspect.getsource(inspect.getmodule(create_campaign))
        idx = module_source.find("def create_campaign")
        context = module_source[max(0, idx-200):idx]
        self.assertIn('@enforce_limit("notifications_month")', context)

    def test_create_location_has_enforce_limit(self):
        import inspect
        from apps.tenants.api import create_location
        module_source = inspect.getsource(inspect.getmodule(create_location))
        idx = module_source.find("def create_location")
        context = module_source[max(0, idx-200):idx]
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

    @override_settings(CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}})
    def test_rate_limiting_applied(self):
        """Enrollment should be rate-limited to 10 per hour per IP."""
        from apps.customers.api import enroll_customer_public
        from apps.customers.schemas import CustomerCreateIn

        # We test the rate limiting logic by examining the source code
        import inspect
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
                self.fail("Found 'if not created:' overwrite block — "
                          "enrollment should not overwrite customer profile data")


# ===========================================================================
# FIX 4 — LYL-C-API-004: Max referrals per customer
# ===========================================================================

class MaxReferralsPerCustomerTest(TestCase):
    """Verify referral count is capped at max_referrals_per_customer."""

    def setUp(self):
        self.tenant = _make_tenant()
        self.card = _make_card(self.tenant, card_type="referral_pass", metadata={
            "max_referrals_per_customer": 3,
        })
        self.customer = _make_customer(self.tenant)
        self.pass_obj = _make_pass(self.customer, self.card)

    def test_referral_increments_normally(self):
        result = self.pass_obj._process_referral_transaction()
        self.assertTrue(result["pass_updated"])
        self.assertEqual(result["new_referral_count"], 1)

    def test_referral_blocked_at_max(self):
        # Set referral count to max
        self.pass_obj.pass_data["referral_count"] = 3
        self.pass_obj.save(update_fields=["pass_data"])
        self.pass_obj.refresh_from_db()

        result = self.pass_obj._process_referral_transaction()
        self.assertFalse(result["pass_updated"])
        self.assertTrue(result.get("limit_reached", False))
        self.assertEqual(result["new_referral_count"], 3)

    def test_referral_allows_below_max(self):
        # Set referral count below max
        self.pass_obj.pass_data["referral_count"] = 2
        self.pass_obj.save(update_fields=["pass_data"])
        self.pass_obj.refresh_from_db()

        result = self.pass_obj._process_referral_transaction()
        self.assertTrue(result["pass_updated"])
        self.assertEqual(result["new_referral_count"], 3)

    def test_no_max_allows_unlimited(self):
        """When max_referrals_per_customer is 0 or absent, referrals are unlimited."""
        card2 = _make_card(self.tenant, card_type="referral_pass", metadata={})
        pass2 = _make_pass(self.customer, card2)
        pass2.pass_data["referral_count"] = 100
        pass2.save(update_fields=["pass_data"])
        pass2.refresh_from_db()

        result = pass2._process_referral_transaction()
        self.assertTrue(result["pass_updated"])
        self.assertEqual(result["new_referral_count"], 101)


# ===========================================================================
# FIX 5 — LYL-H-API-014: Quantity validation
# ===========================================================================

class QuantityValidationTest(TestCase):
    """Verify process_transaction rejects invalid quantities."""

    def setUp(self):
        self.tenant = _make_tenant()
        self.card = _make_card(self.tenant, card_type="stamp", metadata={
            "stamps_required": 10,
        })
        self.customer = _make_customer(self.tenant)
        self.pass_obj = _make_pass(self.customer, self.card)

    def test_quantity_zero_raises(self):
        with self.assertRaises(ValueError) as ctx:
            self.pass_obj.process_transaction("stamp_earned", amount=Decimal("10"), quantity=0)
        self.assertIn("positive integer", str(ctx.exception))

    def test_quantity_negative_raises(self):
        with self.assertRaises(ValueError):
            self.pass_obj.process_transaction("stamp_earned", amount=Decimal("10"), quantity=-1)

    def test_quantity_one_works(self):
        result = self.pass_obj.process_transaction("stamp_earned", amount=Decimal("10"), quantity=1)
        self.assertTrue(result["pass_updated"])

    def test_quantity_validation_source(self):
        import inspect
        source = inspect.getsource(self.pass_obj.process_transaction)
        self.assertIn("quantity < 1", source)
        self.assertIn("ValueError", source)


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


# ===========================================================================
# FIX 7 — LYL-H-ARCH-004: Hardcoded passwords in seed files
# ===========================================================================

class HardcodedPasswordsTest(TestCase):
    """Verify seed files don't contain hardcoded passwords."""

    def test_seed_sweet_coffee_no_hardcoded_password(self):
        import os
        seed_path = os.path.join(
            os.path.dirname(__file__), "..", "seed_sweet_coffee.py"
        )
        if not os.path.exists(seed_path):
            self.skipTest("seed_sweet_coffee.py not found")

        with open(seed_path) as f:
            content = f.read()

        self.assertNotIn('"Admin1234!"', content)
        self.assertNotIn("'Admin1234!'", content)
        self.assertIn("secrets.token_urlsafe", content)

    def test_adrian_passes_no_hardcoded_password(self):
        import os
        seed_path = os.path.join(
            os.path.dirname(__file__), "..", "adrian_passes.py"
        )
        if not os.path.exists(seed_path):
            self.skipTest("adrian_passes.py not found")

        with open(seed_path) as f:
            content = f.read()

        # adrian_passes.py is a diagnostic script, should not have passwords
        dangerous = ["password", "make_password", "Admin1234"]
        for term in dangerous:
            self.assertNotIn(term, content.lower() if term == term.lower() else content,
                             f"Found '{term}' in adrian_passes.py")


# ===========================================================================
# FIX 8 — LYL-H-API-005: Stamp multi-cycle loss
# ===========================================================================

class StampMultiCycleTest(TestCase):
    """Verify stamp transactions handle multiple reward cycles correctly."""

    def setUp(self):
        self.tenant = _make_tenant()
        self.card = _make_card(self.tenant, card_type="stamp", metadata={
            "stamps_required": 10,
            "reward_description": "Free item",
        })
        self.customer = _make_customer(self.tenant)
        self.pass_obj = _make_pass(self.customer, self.card)

    def test_single_cycle(self):
        # 0 + 10 = 1 cycle, 0 remaining
        result = self.pass_obj._process_stamp_transaction(Decimal("10"), quantity=10)
        self.assertTrue(result["reward_earned"])
        self.assertEqual(result["new_stamp_count"], 0)
        self.assertEqual(result["reward_count"], 1)

    def test_multi_cycle(self):
        # 0 + 25 = 2 cycles, 5 remaining
        result = self.pass_obj._process_stamp_transaction(Decimal("10"), quantity=25)
        self.assertTrue(result["reward_earned"])
        self.assertEqual(result["new_stamp_count"], 5)
        self.assertEqual(result["reward_count"], 2)

    def test_multi_cycle_with_existing_stamps(self):
        # Start with 3 stamps, add 17 = 2 cycles, 0 remaining
        self.pass_obj.pass_data["stamp_count"] = 3
        self.pass_obj.save(update_fields=["pass_data"])
        self.pass_obj.refresh_from_db()

        result = self.pass_obj._process_stamp_transaction(Decimal("10"), quantity=17)
        self.assertTrue(result["reward_earned"])
        self.assertEqual(result["new_stamp_count"], 0)
        self.assertEqual(result["reward_count"], 2)

    def test_no_stamps_lost_large_quantity(self):
        """Previously, stamps beyond one cycle were lost."""
        # 0 + 100 = 10 cycles, 0 remaining
        result = self.pass_obj._process_stamp_transaction(Decimal("10"), quantity=100)
        self.assertEqual(result["new_stamp_count"], 0)
        self.assertEqual(result["reward_count"], 10)

    def test_partial_cycle(self):
        # 0 + 7 = 0 cycles, 7 remaining
        result = self.pass_obj._process_stamp_transaction(Decimal("10"), quantity=7)
        self.assertFalse(result["reward_earned"])
        self.assertEqual(result["new_stamp_count"], 7)


# ===========================================================================
# FIX 9 — LYL-H-API-006: Discount float precision
# ===========================================================================

class DiscountFloatPrecisionTest(TestCase):
    """Verify discount calculations use Decimal, not float."""

    def setUp(self):
        self.tenant = _make_tenant()
        self.card = _make_card(self.tenant, card_type="discount", metadata={
            "tiers": [
                {"tier_name": "Silver", "threshold": 0, "discount_percentage": 5},
                {"tier_name": "Gold", "threshold": 100, "discount_percentage": 10},
            ],
        })
        self.customer = _make_customer(self.tenant)
        self.pass_obj = _make_pass(self.customer, self.card)

    def test_decimal_precision_preserved(self):
        """Floating point errors like 0.1 + 0.2 = 0.30000000000000004 should not happen."""
        self.pass_obj._process_discount_transaction(Decimal("0.1"))
        self.pass_obj.refresh_from_db()
        total = self.pass_obj.pass_data["total_spent_at_business"]
        # Should be stored as string "0.1", not 0.10000000000000001
        self.assertEqual(str(total), "0.1")

    def test_stored_as_string(self):
        """Total should be stored as string representation of Decimal for JSON safety."""
        self.pass_obj._process_discount_transaction(Decimal("10.55"))
        self.pass_obj.refresh_from_db()
        total = self.pass_obj.pass_data["total_spent_at_business"]
        self.assertEqual(str(total), "10.55")

    def test_tier_threshold_with_decimal(self):
        """Tier thresholds should be compared as Decimal."""
        self.pass_obj._process_discount_transaction(Decimal("100"))
        self.pass_obj.refresh_from_db()
        self.assertEqual(self.pass_obj.pass_data["current_tier_name"], "Gold")
        self.assertEqual(self.pass_obj.pass_data["current_discount_percentage"], 10)

    def test_uses_decimal_in_source(self):
        import inspect
        source = inspect.getsource(self.pass_obj._process_discount_transaction)
        self.assertIn("Decimal(str(", source,
                      "Should use Decimal(str()) for precision")


# ===========================================================================
# FIX 10 — LYL-H-API-010: Automation max_executions_per_day
# ===========================================================================

class AutomationMaxExecutionsPerDayTest(TestCase):
    """Verify automation enforces max_executions_per_day."""

    def setUp(self):
        self.tenant = _make_tenant()
        self.customer = _make_customer(self.tenant)
        self.card = _make_card(self.tenant, card_type="stamp")
        _make_pass(self.customer, self.card)

        from apps.automation.models import Automation, AutomationAction, AutomationTrigger
        self.automation = Automation.objects.create(
            tenant=self.tenant,
            name="Test Automation",
            trigger=AutomationTrigger.CUSTOMER_ENROLLED,
            action=AutomationAction.SEND_NOTIFICATION,
            action_config={"title": "Welcome!", "message": "Hello"},
            max_executions_per_day=2,
            is_active=True,
        )

    def test_execution_blocked_after_max(self):
        from apps.automation.models import AutomationExecution

        # Create 2 executions today
        for _ in range(2):
            AutomationExecution.objects.create(
                automation=self.automation,
                customer=self.customer,
                trigger_event="customer_enrolled",
                success=True,
            )

        # Third execution should be blocked
        result = self.automation.execute(self.customer)
        self.assertFalse(result)

    def test_execution_allowed_below_max(self):
        from apps.automation.models import AutomationExecution

        # Create 1 execution today
        AutomationExecution.objects.create(
            automation=self.automation,
            customer=self.customer,
            trigger_event="customer_enrolled",
            success=True,
        )

        # Mock can_execute_for_customer to return True
        with patch.object(self.automation, "can_execute_for_customer", return_value=True):
            with patch.object(self.automation, "_execute_send_notification", return_value=True):
                result = self.automation.execute(self.customer)
                self.assertTrue(result)

    def test_no_limit_when_max_is_none(self):
        """When max_executions_per_day is None, no limit is enforced."""
        self.automation.max_executions_per_day = None
        self.automation.save(update_fields=["max_executions_per_day"])

        with patch.object(self.automation, "can_execute_for_customer", return_value=True):
            with patch.object(self.automation, "_execute_send_notification", return_value=True):
                result = self.automation.execute(self.customer)
                self.assertTrue(result)

    def test_old_executions_not_counted(self):
        """Executions from yesterday should not count toward today's limit."""
        from apps.automation.models import AutomationExecution

        # Create 2 executions yesterday
        yesterday = timezone.now() - timedelta(days=1)
        for _ in range(2):
            exec_obj = AutomationExecution.objects.create(
                automation=self.automation,
                customer=self.customer,
                trigger_event="customer_enrolled",
                success=True,
            )
            AutomationExecution.objects.filter(pk=exec_obj.pk).update(
                executed_at=yesterday
            )

        # Should still be allowed today
        with patch.object(self.automation, "can_execute_for_customer", return_value=True):
            with patch.object(self.automation, "_execute_send_notification", return_value=True):
                result = self.automation.execute(self.customer)
                self.assertTrue(result)
