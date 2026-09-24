"""
Loyallia Billing Model Unit Tests
Tests for Subscription, Invoice, Plan, and related billing models.
"""

from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from apps.billing.models import Subscription, SubscriptionStatus
from tests.factories import make_plan, make_subscription, make_tenant

# Billing Model Tests


class SubscriptionPlanModelTest(TestCase):
    """Tests for SubscriptionPlan model."""

    def test_create_plan(self):
        plan = make_plan()
        self.assertIsNotNone(plan.id)
        self.assertTrue(plan.is_active)

    def test_plan_str(self):
        plan = make_plan(name="Pro Plan", price_monthly=Decimal("99.00"))
        self.assertIn("Pro Plan", str(plan))

    def test_has_feature_true(self):
        plan = make_plan(features=["automation", "geo_fencing"])
        self.assertTrue(plan.has_feature("automation"))

    def test_has_feature_false(self):
        plan = make_plan(features=["automation"])
        self.assertFalse(plan.has_feature("ai_assistant"))

    def test_price_monthly_with_tax(self):
        plan = make_plan(price_monthly=Decimal("100.00"))
        with self.settings(TAX_RATE_ECUADOR="0.15"):
            self.assertEqual(plan.price_monthly_with_tax, Decimal("115.00"))

    def test_price_annual_with_tax(self):
        plan = make_plan(price_annual=Decimal("1000.00"))
        with self.settings(TAX_RATE_ECUADOR="0.15"):
            self.assertEqual(plan.price_annual_with_tax, Decimal("1150.00"))


class SubscriptionModelTest(TestCase):
    """Tests for Subscription model."""

    def test_create_subscription(self):
        t = make_tenant()
        sub = make_subscription(t)
        self.assertIsNotNone(sub.id)

    def test_subscription_str(self):
        t = make_tenant(name="TestBiz")
        sub = make_subscription(t)
        self.assertIn("TestBiz", str(sub))

    def test_is_trial_active_true(self):
        t = make_tenant()
        sub = make_subscription(
            t,
            status=SubscriptionStatus.TRIALING,
            trial_end=timezone.now() + timedelta(days=5),
        )
        self.assertTrue(sub.is_trial_active)

    def test_is_trial_active_false_when_active(self):
        t = make_tenant()
        sub = make_subscription(t, status=SubscriptionStatus.ACTIVE)
        self.assertFalse(sub.is_trial_active)

    def test_is_access_allowed_active(self):
        t = make_tenant()
        sub = make_subscription(t, status=SubscriptionStatus.ACTIVE)
        self.assertTrue(sub.is_access_allowed)

    def test_is_access_allowed_trial(self):
        t = make_tenant()
        sub = make_subscription(
            t,
            status=SubscriptionStatus.TRIALING,
            trial_end=timezone.now() + timedelta(days=5),
        )
        self.assertTrue(sub.is_access_allowed)

    def test_is_access_allowed_suspended(self):
        t = make_tenant()
        sub = make_subscription(t, status=SubscriptionStatus.SUSPENDED)
        self.assertFalse(sub.is_access_allowed)

    def test_get_limit_trial_unlimited(self):
        t = make_tenant()
        sub = make_subscription(
            t,
            status=SubscriptionStatus.TRIALING,
            trial_end=timezone.now() + timedelta(days=5),
        )
        # C4/H4: Trial limits are finite (500 customers), not infinite
        self.assertEqual(sub.get_limit("customers"), 500)

    def test_get_limit_active_plan(self):
        plan = make_plan(max_customers=500)
        t = make_tenant()
        sub = make_subscription(t, plan=plan, status=SubscriptionStatus.ACTIVE)
        self.assertEqual(sub.get_limit("customers"), 500)

    def test_get_limit_no_plan(self):
        t = make_tenant()
        sub = Subscription.objects.create(tenant=t, status=SubscriptionStatus.ACTIVE)
        self.assertEqual(sub.get_limit("customers"), 0)

    def test_has_feature_trial_all_features(self):
        t = make_tenant()
        sub = make_subscription(
            t,
            status=SubscriptionStatus.TRIALING,
            trial_end=timezone.now() + timedelta(days=5),
        )
        self.assertTrue(sub.has_feature("anything"))

    def test_has_feature_from_plan(self):
        plan = make_plan(features=["automation"])
        t = make_tenant()
        sub = make_subscription(t, plan=plan, status=SubscriptionStatus.ACTIVE)
        self.assertTrue(sub.has_feature("automation"))
        self.assertFalse(sub.has_feature("ai_assistant"))

    def test_activate_paid(self):
        t = make_tenant()
        plan = make_plan()
        sub = make_subscription(t, plan=plan, status=SubscriptionStatus.TRIALING)
        sub.activate_paid()
        self.assertEqual(sub.status, SubscriptionStatus.ACTIVE)
        self.assertIsNotNone(sub.current_period_end)

    def test_activate_paid_annual_cycle(self):
        t = make_tenant()
        plan = make_plan()
        sub = make_subscription(
            t, plan=plan, status=SubscriptionStatus.TRIALING, billing_cycle="annual"
        )
        sub.activate_paid()
        self.assertEqual(sub.status, SubscriptionStatus.ACTIVE)

    def test_record_payment_failure_past_due(self):
        t = make_tenant()
        sub = make_subscription(t, status=SubscriptionStatus.ACTIVE)
        sub.record_payment_failure("Card declined")
        sub.refresh_from_db()
        self.assertEqual(sub.status, SubscriptionStatus.PAST_DUE)
        self.assertEqual(sub.failed_payment_count, 1)

    def test_record_payment_failure_suspends_after_3(self):
        t = make_tenant()
        sub = make_subscription(t, status=SubscriptionStatus.ACTIVE)
        for _ in range(3):
            sub.record_payment_failure("Card declined")
        sub.refresh_from_db()
        self.assertEqual(sub.status, SubscriptionStatus.SUSPENDED)

    def test_cancel_sets_flag(self):
        t = make_tenant()
        sub = make_subscription(t, status=SubscriptionStatus.ACTIVE)
        sub.cancel()
        sub.refresh_from_db()
        self.assertTrue(sub.cancel_at_period_end)

    def test_execute_cancellation(self):
        t = make_tenant()
        sub = make_subscription(t, status=SubscriptionStatus.ACTIVE)
        sub.execute_cancellation()
        sub.refresh_from_db()
        self.assertEqual(sub.status, SubscriptionStatus.CANCELED)
        self.assertIsNotNone(sub.canceled_at)

    def test_days_until_trial_end(self):
        t = make_tenant()
        sub = make_subscription(
            t,
            status=SubscriptionStatus.TRIALING,
            trial_end=timezone.now() + timedelta(days=10),
        )
        self.assertGreaterEqual(sub.days_until_trial_end, 9)

    def test_days_until_trial_end_zero_when_no_trial(self):
        t = make_tenant()
        sub = make_subscription(t, status=SubscriptionStatus.ACTIVE)
        self.assertEqual(sub.days_until_trial_end, 0)

    def test_effective_plan_returns_plan(self):
        plan = make_plan()
        t = make_tenant()
        sub = make_subscription(t, plan=plan)
        self.assertEqual(sub.effective_plan, plan)
