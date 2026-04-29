"""
Loyallia — Plan Enforcement Tests
Tests for check_plan_limit, check_feature_access, get_tenant_limits,
get_current_usage, and all enforcement decorators.
"""

import uuid
from unittest.mock import MagicMock, patch

from django.test import TestCase
from ninja.errors import HttpError

from apps.billing.models import SubscriptionStatus
from apps.cards.models import CardType
from common.plan_enforcement import (
    check_feature_access,
    check_plan_limit,
    enforce_limit,
    get_current_usage,
    get_tenant_limits,
    require_active_subscription,
    require_feature,
)
from tests.factories import (
    make_card,
    make_customer,
    make_customer_pass,
    make_full_stack,
    make_plan,
    make_subscription,
    make_tenant,
    make_user,
)


# =============================================================================
# get_tenant_limits Tests
# =============================================================================

class GetTenantLimitsTest(TestCase):
    """Tests for get_tenant_limits helper."""

    def test_returns_limits_from_plan(self):
        plan = make_plan(
            max_customers=500, max_programs=5, max_locations=20,
            max_users=10, max_notifications_month=1000, max_transactions_month=5000,
        )
        t = make_tenant()
        make_subscription(t, plan=plan)
        limits = get_tenant_limits(t)
        self.assertEqual(limits["customers"], 500)
        self.assertEqual(limits["programs"], 5)
        self.assertEqual(limits["locations"], 20)
        self.assertEqual(limits["users"], 10)
        self.assertEqual(limits["notifications_month"], 1000)
        self.assertEqual(limits["transactions_month"], 5000)

    def test_returns_empty_for_no_subscription(self):
        t = make_tenant()
        limits = get_tenant_limits(t)
        self.assertEqual(limits, {})

    def test_trial_unlimited_limits(self):
        t = make_tenant()
        sub = make_subscription(t, status=SubscriptionStatus.TRIALING)
        sub.trial_end = None  # no plan = trial unlimited
        sub.subscription_plan = None
        sub.save(update_fields=["subscription_plan"])
        limits = get_tenant_limits(t)
        self.assertEqual(limits["customers"], 999999)

    def test_no_plan_returns_empty(self):
        t = make_tenant()
        sub = make_subscription(t, status=SubscriptionStatus.ACTIVE)
        sub.subscription_plan = None
        sub.save(update_fields=["subscription_plan"])
        limits = get_tenant_limits(t)
        self.assertEqual(limits, {})


# =============================================================================
# get_current_usage Tests
# =============================================================================

class GetCurrentUsageTest(TestCase):
    """Tests for get_current_usage helper."""

    def test_zero_customers(self):
        t = make_tenant()
        self.assertEqual(get_current_usage(t, "customers"), 0)

    def test_counts_customers(self):
        t = make_tenant()
        make_customer(t, email="a@test.com")
        make_customer(t, email="b@test.com")
        self.assertEqual(get_current_usage(t, "customers"), 2)

    def test_counts_programs(self):
        t = make_tenant()
        make_card(t)
        make_card(t, name="Second Program")
        self.assertEqual(get_current_usage(t, "programs"), 2)

    def test_counts_active_users(self):
        t = make_tenant()
        make_user(tenant=t, role="OWNER")
        make_user(tenant=t, role="STAFF")
        make_user(tenant=t, role="STAFF", is_active=False)
        self.assertEqual(get_current_usage(t, "users"), 2)

    def test_unknown_resource_returns_zero(self):
        t = make_tenant()
        self.assertEqual(get_current_usage(t, "nonexistent_resource"), 0)


# =============================================================================
# check_plan_limit Tests
# =============================================================================

class CheckPlanLimitTest(TestCase):
    """Tests for check_plan_limit function."""

    def test_passes_when_under_limit(self):
        plan = make_plan(max_customers=100)
        t = make_tenant()
        make_subscription(t, plan=plan)
        make_customer(t, email="a@test.com")
        check_plan_limit(t, "customers")  # Should not raise

    def test_raises_402_when_no_subscription(self):
        t = make_tenant()
        with self.assertRaises(HttpError) as ctx:
            check_plan_limit(t, "customers")
        self.assertEqual(ctx.exception.status_code, 402)

    def test_raises_403_when_at_limit(self):
        plan = make_plan(max_customers=2)
        t = make_tenant()
        make_subscription(t, plan=plan)
        make_customer(t, email="a@test.com")
        make_customer(t, email="b@test.com")
        with self.assertRaises(HttpError) as ctx:
            check_plan_limit(t, "customers")
        self.assertEqual(ctx.exception.status_code, 403)

    def test_raises_403_when_over_limit(self):
        plan = make_plan(max_programs=1)
        t = make_tenant()
        make_subscription(t, plan=plan)
        make_card(t, name="Card 1")
        make_card(t, name="Card 2")
        with self.assertRaises(HttpError) as ctx:
            check_plan_limit(t, "programs")
        self.assertEqual(ctx.exception.status_code, 403)

    def test_trial_allows_unlimited(self):
        t = make_tenant()
        sub = make_subscription(t, status=SubscriptionStatus.TRIALING)
        sub.subscription_plan = None
        sub.save(update_fields=["subscription_plan"])
        for i in range(5):
            make_customer(t, email=f"c{i}@test.com")
        check_plan_limit(t, "customers")  # Should not raise

    def test_zero_limit_raises_403(self):
        plan = make_plan(max_locations=0)
        t = make_tenant()
        make_subscription(t, plan=plan)
        with self.assertRaises(HttpError) as ctx:
            check_plan_limit(t, "locations")
        self.assertEqual(ctx.exception.status_code, 403)


# =============================================================================
# check_feature_access Tests
# =============================================================================

class CheckFeatureAccessTest(TestCase):
    """Tests for check_feature_access function."""

    def test_passes_when_feature_in_plan(self):
        plan = make_plan(features=["automation", "geo_fencing"])
        t = make_tenant()
        make_subscription(t, plan=plan)
        check_feature_access(t, "automation")  # Should not raise

    def test_raises_403_when_feature_missing(self):
        plan = make_plan(features=["automation"])
        t = make_tenant()
        make_subscription(t, plan=plan)
        with self.assertRaises(HttpError) as ctx:
            check_feature_access(t, "ai_assistant")
        self.assertEqual(ctx.exception.status_code, 403)

    def test_raises_402_when_no_subscription(self):
        t = make_tenant()
        with self.assertRaises(HttpError) as ctx:
            check_feature_access(t, "automation")
        self.assertEqual(ctx.exception.status_code, 402)

    def test_trial_grants_all_features(self):
        t = make_tenant()
        sub = make_subscription(t, status=SubscriptionStatus.TRIALING)
        check_feature_access(t, "any_feature")  # Should not raise


# =============================================================================
# Decorator Tests
# =============================================================================

class RequireActiveSubscriptionDecoratorTest(TestCase):
    """Tests for @require_active_subscription decorator."""

    def setUp(self):
        self.factory = MagicMock()

    def test_passes_with_active_subscription(self):
        t = make_tenant()
        make_subscription(t, status=SubscriptionStatus.ACTIVE)
        request = MagicMock()
        request.tenant = t

        @require_active_subscription
        def view(req):
            return "ok"

        result = view(request)
        self.assertEqual(result, "ok")

    def test_raises_402_when_suspended(self):
        t = make_tenant()
        make_subscription(t, status=SubscriptionStatus.SUSPENDED)
        request = MagicMock()
        request.tenant = t

        @require_active_subscription
        def view(req):
            return "ok"

        with self.assertRaises(HttpError) as ctx:
            view(request)
        self.assertEqual(ctx.exception.status_code, 402)

    def test_raises_402_when_no_subscription(self):
        t = make_tenant()
        request = MagicMock()
        request.tenant = t

        @require_active_subscription
        def view(req):
            return "ok"

        with self.assertRaises(HttpError) as ctx:
            view(request)
        self.assertEqual(ctx.exception.status_code, 402)

    def test_passes_with_trial(self):
        t = make_tenant()
        make_subscription(
            t, status=SubscriptionStatus.TRIALING,
            trial_end=None,
        )
        request = MagicMock()
        request.tenant = t

        @require_active_subscription
        def view(req):
            return "ok"

        result = view(request)
        self.assertEqual(result, "ok")


class EnforceLimitDecoratorTest(TestCase):
    """Tests for @enforce_limit decorator factory."""

    def test_passes_when_under_limit(self):
        plan = make_plan(max_customers=100)
        t = make_tenant()
        make_subscription(t, plan=plan)
        request = MagicMock()
        request.tenant = t

        @enforce_limit("customers")
        def view(req):
            return "ok"

        result = view(request)
        self.assertEqual(result, "ok")

    def test_raises_403_when_at_limit(self):
        plan = make_plan(max_customers=1)
        t = make_tenant()
        make_subscription(t, plan=plan)
        make_customer(t, email="c@test.com")
        request = MagicMock()
        request.tenant = t

        @enforce_limit("customers")
        def view(req):
            return "ok"

        with self.assertRaises(HttpError) as ctx:
            view(request)
        self.assertEqual(ctx.exception.status_code, 403)


class RequireFeatureDecoratorTest(TestCase):
    """Tests for @require_feature decorator factory."""

    def test_passes_when_feature_available(self):
        plan = make_plan(features=["automation"])
        t = make_tenant()
        make_subscription(t, plan=plan)
        request = MagicMock()
        request.tenant = t

        @require_feature("automation")
        def view(req):
            return "ok"

        result = view(request)
        self.assertEqual(result, "ok")

    def test_raises_403_when_feature_unavailable(self):
        plan = make_plan(features=["automation"])
        t = make_tenant()
        make_subscription(t, plan=plan)
        request = MagicMock()
        request.tenant = t

        @require_feature("ai_assistant")
        def view(req):
            return "ok"

        with self.assertRaises(HttpError) as ctx:
            view(request)
        self.assertEqual(ctx.exception.status_code, 403)
