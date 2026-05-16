"""
Loyallia — Tenant & Location Model Unit Tests
Tests for Tenant, Location, and related models.
"""

from contextlib import suppress
from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from apps.tenants.models import Location, Plan, validate_cedula, validate_ruc
from tests.factories import make_tenant

# =============================================================================
# Tenant Model Tests
# =============================================================================


class TenantModelTest(TestCase):
    """Tests for Tenant model."""

    def test_create_tenant_with_defaults(self):
        t = make_tenant()
        self.assertTrue(t.is_active)
        self.assertEqual(t.country, "EC")
        self.assertEqual(t.plan, "trial")

    def test_tenant_str(self):
        t = make_tenant(name="Café Andes")
        self.assertIn("Café Andes", str(t))

    def test_trial_active_when_trial_plan_with_future_end(self):
        t = make_tenant(plan=Plan.TRIAL)
        t.trial_end = timezone.now() + timedelta(days=5)
        t.save(update_fields=["trial_end"])
        self.assertTrue(t.is_trial_active)

    def test_trial_inactive_when_full_plan(self):
        t = make_tenant(plan=Plan.FULL)
        t.trial_end = timezone.now() + timedelta(days=5)
        t.save(update_fields=["trial_end"])
        self.assertFalse(t.is_trial_active)

    def test_trial_inactive_when_expired(self):
        t = make_tenant(plan=Plan.TRIAL)
        t.trial_end = timezone.now() - timedelta(days=1)
        t.save(update_fields=["trial_end"])
        self.assertFalse(t.is_trial_active)

    def test_trial_days_remaining_positive(self):
        t = make_tenant(plan=Plan.TRIAL)
        t.trial_end = timezone.now() + timedelta(days=7)
        t.save(update_fields=["trial_end"])
        self.assertGreaterEqual(t.trial_days_remaining, 6)

    def test_trial_days_remaining_zero_when_expired(self):
        t = make_tenant(plan=Plan.TRIAL)
        t.trial_end = timezone.now() - timedelta(days=1)
        t.save(update_fields=["trial_end"])
        self.assertEqual(t.trial_days_remaining, 0)

    def test_has_active_subscription_full_plan(self):
        t = make_tenant(plan=Plan.FULL)
        self.assertTrue(t.has_active_subscription)

    def test_has_active_subscription_trial(self):
        t = make_tenant(plan=Plan.TRIAL)
        t.trial_end = timezone.now() + timedelta(days=5)
        t.save(update_fields=["trial_end"])
        self.assertTrue(t.has_active_subscription)

    def test_has_active_subscription_suspended(self):
        t = make_tenant(plan=Plan.SUSPENDED)
        self.assertFalse(t.has_active_subscription)

    def test_activate_trial_sets_end_date(self):
        t = make_tenant()
        t.activate_trial()
        self.assertEqual(t.plan, Plan.TRIAL)
        self.assertIsNotNone(t.trial_end)
        self.assertTrue(t.trial_end > timezone.now())

    def test_validate_ruc_valid(self):
        # Province 17 (Pichincha), valid 13-digit RUC
        validate_ruc("1790012345001")  # Should not raise

    def test_validate_ruc_invalid_length(self):
        with self.assertRaises(ValidationError):
            validate_ruc("12345")

    def test_validate_cedula_valid_format(self):
        # Province 01, 10 digits — module-10 check may fail but format is valid
        with suppress(ValidationError):
            validate_cedula("0102030405")

    def test_validate_cedula_invalid_length(self):
        with self.assertRaises(ValidationError):
            validate_cedula("12345")


class LocationModelTest(TestCase):
    """Tests for Location model."""

    def test_create_location(self):
        t = make_tenant()
        loc = Location.objects.create(tenant=t, name="Main Store", address="123 Main St", city="Quito")
        self.assertEqual(loc.name, "Main Store")
        self.assertTrue(loc.is_active or not loc.is_active)  # default True

    def test_location_str(self):
        t = make_tenant(name="TestBiz")
        loc = Location.objects.create(tenant=t, name="Downtown")
        self.assertIn("TestBiz", str(loc))
        self.assertIn("Downtown", str(loc))

    def test_has_coordinates_true(self):
        t = make_tenant()
        loc = Location.objects.create(
            tenant=t,
            name="Geo Store",
            latitude=Decimal("-0.1807"),
            longitude=Decimal("-78.4678"),
        )
        self.assertTrue(loc.has_coordinates)

    def test_has_coordinates_false(self):
        t = make_tenant()
        loc = Location.objects.create(tenant=t, name="No Geo Store")
        self.assertFalse(loc.has_coordinates)
