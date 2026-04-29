"""
Loyallia — Billing Tests
Tests for Invoice, PaymentMethod, BillingService, Subscription lifecycle,
plan limits, and trial period behavior.
"""

import uuid
from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from apps.billing.models import Subscription, SubscriptionPlan, SubscriptionStatus
from apps.billing.payment_models import Invoice, PaymentMethod, WebhookEvent
from apps.billing.service import BillingService
from apps.tenants.models import Tenant
from tests.factories import (
    make_card,
    make_customer,
    make_plan,
    make_subscription,
    make_tenant,
    make_user,
)


# =============================================================================
# Invoice Model Tests
# =============================================================================

class InvoiceModelTest(TestCase):
    """Tests for Invoice model."""

    def setUp(self):
        self.tenant = make_tenant()
        self.plan = make_plan(price_monthly=Decimal("75.00"))
        self.subscription = make_subscription(self.tenant, plan=self.plan)

    def test_create_invoice(self):
        invoice = Invoice.objects.create(
            tenant=self.tenant,
            subscription=self.subscription,
            invoice_number="LYL-TEST-00001",
            subtotal=Decimal("75.00"),
            tax_rate=Decimal("0.1500"),
            tax_amount=Decimal("11.25"),
            total=Decimal("86.25"),
            period_start=timezone.now(),
            period_end=timezone.now() + timedelta(days=30),
        )
        self.assertIsNotNone(invoice.id)
        self.assertEqual(invoice.status, Invoice.InvoiceStatus.DRAFT)

    def test_invoice_str(self):
        invoice = Invoice.objects.create(
            tenant=self.tenant,
            subscription=self.subscription,
            invoice_number="LYL-TEST-00002",
            subtotal=Decimal("75.00"),
            tax_amount=Decimal("11.25"),
            total=Decimal("86.25"),
            period_start=timezone.now(),
            period_end=timezone.now() + timedelta(days=30),
        )
        self.assertIn("LYL-TEST-00002", str(invoice))

    def test_generate_invoice_number_sequential(self):
        num1 = Invoice.generate_invoice_number(self.tenant)
        Invoice.objects.create(
            tenant=self.tenant,
            subscription=self.subscription,
            invoice_number=num1,
            subtotal=Decimal("75.00"),
            tax_amount=Decimal("11.25"),
            total=Decimal("86.25"),
            period_start=timezone.now(),
            period_end=timezone.now() + timedelta(days=30),
        )
        num2 = Invoice.generate_invoice_number(self.tenant)
        self.assertNotEqual(num1, num2)

    def test_calculate_amounts(self):
        invoice = Invoice(
            tenant=self.tenant,
            subscription=self.subscription,
            invoice_number="LYL-CALC-00001",
            subtotal=Decimal("100.00"),
            tax_rate=Decimal("0.1500"),
            period_start=timezone.now(),
            period_end=timezone.now() + timedelta(days=30),
        )
        invoice.calculate_amounts()
        self.assertEqual(invoice.tax_amount, Decimal("15.00"))
        self.assertEqual(invoice.total, Decimal("115.00"))

    def test_calculate_amounts_rounding(self):
        invoice = Invoice(
            tenant=self.tenant,
            subscription=self.subscription,
            invoice_number="LYL-ROUND-00001",
            subtotal=Decimal("33.33"),
            tax_rate=Decimal("0.1500"),
            period_start=timezone.now(),
            period_end=timezone.now() + timedelta(days=30),
        )
        invoice.calculate_amounts()
        self.assertEqual(invoice.tax_amount, Decimal("5.00"))
        self.assertEqual(invoice.total, Decimal("38.33"))

    def test_mark_paid(self):
        invoice = Invoice.objects.create(
            tenant=self.tenant,
            subscription=self.subscription,
            invoice_number="LYL-PAID-00001",
            subtotal=Decimal("75.00"),
            tax_amount=Decimal("11.25"),
            total=Decimal("86.25"),
            period_start=timezone.now(),
            period_end=timezone.now() + timedelta(days=30),
        )
        invoice.mark_paid("charge_abc123")
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, Invoice.InvoiceStatus.PAID)
        self.assertEqual(invoice.gateway_charge_id, "charge_abc123")
        self.assertIsNotNone(invoice.paid_at)

    def test_invoice_status_choices(self):
        expected = ["draft", "open", "paid", "void", "uncollectible"]
        actual = [s.value for s in Invoice.InvoiceStatus]
        self.assertEqual(sorted(actual), sorted(expected))

    def test_invoice_currency_default(self):
        invoice = Invoice.objects.create(
            tenant=self.tenant,
            subscription=self.subscription,
            invoice_number="LYL-CURR-00001",
            subtotal=Decimal("75.00"),
            tax_amount=Decimal("11.25"),
            total=Decimal("86.25"),
            period_start=timezone.now(),
            period_end=timezone.now() + timedelta(days=30),
        )
        self.assertEqual(invoice.currency, "USD")


# =============================================================================
# PaymentMethod Model Tests
# =============================================================================

class PaymentMethodModelTest(TestCase):
    """Tests for PaymentMethod model."""

    def setUp(self):
        self.tenant = make_tenant()

    def test_create_payment_method(self):
        pm = PaymentMethod.objects.create(
            tenant=self.tenant,
            gateway_token="tok_test123",
            card_brand="Visa",
            card_last_four="4242",
            card_exp_month=12,
            card_exp_year=2027,
        )
        self.assertIsNotNone(pm.id)
        self.assertTrue(pm.is_active)

    def test_display_name(self):
        pm = PaymentMethod.objects.create(
            tenant=self.tenant,
            gateway_token="tok_test456",
            card_brand="Mastercard",
            card_last_four="5555",
        )
        self.assertIn("Mastercard", pm.display_name)
        self.assertIn("5555", pm.display_name)

    def test_str_representation(self):
        pm = PaymentMethod.objects.create(
            tenant=self.tenant,
            gateway_token="tok_test789",
            card_brand="Visa",
            card_last_four="1234",
        )
        self.assertIn("Visa", str(pm))
        self.assertIn("1234", str(pm))

    def test_default_flag(self):
        pm = PaymentMethod.objects.create(
            tenant=self.tenant,
            gateway_token="tok_default",
            is_default=True,
        )
        self.assertTrue(pm.is_default)


# =============================================================================
# WebhookEvent Model Tests
# =============================================================================

class WebhookEventModelTest(TestCase):
    """Tests for WebhookEvent idempotency model."""

    def test_create_webhook_event(self):
        event = WebhookEvent.objects.create(
            event_id="evt_123",
            event_type="invoice.paid",
            payload_hash="abc123hash",
        )
        self.assertIsNotNone(event.id)

    def test_unique_event_id(self):
        WebhookEvent.objects.create(
            event_id="evt_dup",
            event_type="invoice.paid",
            payload_hash="hash1",
        )
        with self.assertRaises(Exception):
            WebhookEvent.objects.create(
                event_id="evt_dup",
                event_type="invoice.paid",
                payload_hash="hash2",
            )

    def test_str_representation(self):
        event = WebhookEvent.objects.create(
            event_id="evt_str",
            event_type="subscription.created",
            payload_hash="hash_str",
        )
        self.assertIn("subscription.created", str(event))


# =============================================================================
# BillingService Tests
# =============================================================================

class BillingServiceGetPlansTest(TestCase):
    """Tests for BillingService.get_plans."""

    def test_returns_active_plans(self):
        make_plan(name="Starter", slug="starter")
        make_plan(name="Pro", slug="pro")
        plans = BillingService.get_plans()
        self.assertGreaterEqual(len(plans), 2)

    def test_excludes_inactive_plans(self):
        make_plan(name="Active", slug="active-plan")
        make_plan(name="Inactive", slug="inactive-plan", is_active=False)
        plans = BillingService.get_plans()
        slugs = [p["slug"] for p in plans]
        self.assertIn("active-plan", slugs)
        self.assertNotIn("inactive-plan", slugs)

    def test_plan_contains_limits(self):
        make_plan()
        plans = BillingService.get_plans()
        self.assertIn("limits", plans[0])
        self.assertIn("max_customers", plans[0]["limits"])

    def test_plan_contains_pricing(self):
        make_plan(price_monthly=Decimal("99.00"), price_annual=Decimal("990.00"))
        plans = BillingService.get_plans()
        plan = plans[0]
        self.assertIn("price_monthly", plan)
        self.assertIn("price_annual", plan)
        self.assertIn("price_monthly_with_tax", plan)

    def test_plan_contains_trial_days(self):
        make_plan(trial_days=14)
        plans = BillingService.get_plans()
        self.assertEqual(plans[0]["trial_days"], 14)


class BillingServiceCheckUsageTest(TestCase):
    """Tests for BillingService.check_usage."""

    def setUp(self):
        self.plan = make_plan(
            max_customers=100, max_programs=10, max_users=5,
            max_locations=20, max_notifications_month=1000,
            max_transactions_month=5000,
        )
        self.tenant = make_tenant()
        self.subscription = make_subscription(self.tenant, plan=self.plan)

    def test_zero_usage(self):
        usage = BillingService.check_usage(self.tenant)
        self.assertEqual(usage["customers"]["used"], 0)
        self.assertEqual(usage["programs"]["used"], 0)

    def test_customer_usage(self):
        for i in range(5):
            make_customer(self.tenant, email=f"u{i}@test.com")
        usage = BillingService.check_usage(self.tenant)
        self.assertEqual(usage["customers"]["used"], 5)
        self.assertEqual(usage["customers"]["limit"], 100)

    def test_program_usage(self):
        for i in range(3):
            make_card(self.tenant, name=f"Program {i}")
        usage = BillingService.check_usage(self.tenant)
        self.assertEqual(usage["programs"]["used"], 3)

    def test_usage_percentage(self):
        for i in range(50):
            make_customer(self.tenant, email=f"p{i}@test.com")
        usage = BillingService.check_usage(self.tenant)
        self.assertEqual(usage["customers"]["percentage"], 50.0)

    def test_is_over_limit(self):
        plan = make_plan(max_customers=2)
        make_subscription(self.tenant, plan=plan)
        for i in range(3):
            make_customer(self.tenant, email=f"o{i}@test.com")
        usage = BillingService.check_usage(self.tenant)
        self.assertTrue(usage["customers"]["is_over_limit"])

    def test_all_resource_keys_present(self):
        usage = BillingService.check_usage(self.tenant)
        expected = [
            "customers", "programs", "users", "locations",
            "transactions_month", "notifications_month",
        ]
        for key in expected:
            self.assertIn(key, usage)


# =============================================================================
# Subscription Lifecycle Tests
# =============================================================================

class SubscriptionLifecycleTest(TestCase):
    """Tests for subscription status transitions."""

    def setUp(self):
        self.tenant = make_tenant()
        self.plan = make_plan()

    def test_trial_to_active(self):
        sub = make_subscription(
            self.tenant, plan=self.plan, status=SubscriptionStatus.TRIALING,
            trial_end=timezone.now() + timedelta(days=10),
        )
        sub.activate_paid()
        self.assertEqual(sub.status, SubscriptionStatus.ACTIVE)

    def test_active_to_past_due(self):
        sub = make_subscription(self.tenant, plan=self.plan)
        sub.record_payment_failure("Card declined")
        self.assertEqual(sub.status, SubscriptionStatus.PAST_DUE)

    def test_past_due_to_suspended_after_3_failures(self):
        sub = make_subscription(self.tenant, plan=self.plan)
        for _ in range(3):
            sub.record_payment_failure("Card declined")
        self.assertEqual(sub.status, SubscriptionStatus.SUSPENDED)

    def test_suspend_after_exactly_3_failures(self):
        sub = make_subscription(self.tenant, plan=self.plan)
        sub.record_payment_failure("Error 1")
        self.assertEqual(sub.status, SubscriptionStatus.PAST_DUE)
        sub.record_payment_failure("Error 2")
        self.assertEqual(sub.status, SubscriptionStatus.PAST_DUE)
        sub.record_payment_failure("Error 3")
        self.assertEqual(sub.status, SubscriptionStatus.SUSPENDED)

    def test_cancel_and_execute(self):
        sub = make_subscription(self.tenant, plan=self.plan)
        sub.cancel()
        self.assertTrue(sub.cancel_at_period_end)
        sub.execute_cancellation()
        self.assertEqual(sub.status, SubscriptionStatus.CANCELED)
        self.assertIsNotNone(sub.canceled_at)

    def test_annual_billing_cycle_period(self):
        sub = make_subscription(
            self.tenant, plan=self.plan,
            status=SubscriptionStatus.TRIALING, billing_cycle="annual",
        )
        sub.activate_paid()
        self.assertEqual(sub.status, SubscriptionStatus.ACTIVE)
        days_diff = (sub.current_period_end - sub.current_period_start).days
        self.assertGreaterEqual(days_diff, 364)


# =============================================================================
# Plan Limit Tests
# =============================================================================

class PlanLimitTest(TestCase):
    """Tests for plan limit enforcement per resource."""

    def test_customers_limit(self):
        plan = make_plan(max_customers=5)
        t = make_tenant()
        make_subscription(t, plan=plan)
        for i in range(5):
            make_customer(t, email=f"lim{i}@test.com")
        usage = BillingService.check_usage(t)
        self.assertTrue(usage["customers"]["is_over_limit"])

    def test_programs_limit(self):
        plan = make_plan(max_programs=2)
        t = make_tenant()
        make_subscription(t, plan=plan)
        make_card(t, name="Card 1")
        make_card(t, name="Card 2")
        usage = BillingService.check_usage(t)
        self.assertTrue(usage["programs"]["is_over_limit"])

    def test_users_limit(self):
        plan = make_plan(max_users=3)
        t = make_tenant()
        make_subscription(t, plan=plan)
        for i in range(3):
            make_user(tenant=t, role="STAFF")
        usage = BillingService.check_usage(t)
        self.assertTrue(usage["users"]["is_over_limit"])


# =============================================================================
# Trial Period Tests
# =============================================================================

class TrialPeriodTest(TestCase):
    """Tests for trial period behavior."""

    def test_trial_days_remaining(self):
        t = make_tenant()
        sub = make_subscription(t, status=SubscriptionStatus.TRIALING)
        sub.trial_end = timezone.now() + timedelta(days=7)
        sub.save(update_fields=["trial_end"])
        self.assertGreaterEqual(sub.days_until_trial_end, 6)

    def test_trial_expired_zero_days(self):
        t = make_tenant()
        sub = make_subscription(t, status=SubscriptionStatus.TRIALING)
        sub.trial_end = timezone.now() - timedelta(days=1)
        sub.save(update_fields=["trial_end"])
        self.assertEqual(sub.days_until_trial_end, 0)

    def test_trial_grants_unlimited_access(self):
        t = make_tenant()
        sub = make_subscription(t, status=SubscriptionStatus.TRIALING)
        self.assertEqual(sub.get_limit("customers"), 999999)
        self.assertTrue(sub.has_feature("any_feature"))

    def test_trial_is_access_allowed(self):
        t = make_tenant()
        sub = make_subscription(
            t, status=SubscriptionStatus.TRIALING,
            trial_end=timezone.now() + timedelta(days=5),
        )
        self.assertTrue(sub.is_access_allowed)

    def test_activate_trial_sets_dates(self):
        t = make_tenant()
        sub = make_subscription(t, status=SubscriptionStatus.ACTIVE)
        sub.activate_trial()
        self.assertEqual(sub.status, SubscriptionStatus.TRIALING)
        self.assertIsNotNone(sub.trial_end)
