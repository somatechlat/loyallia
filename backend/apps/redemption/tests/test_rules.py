"""
Integration tests for Redemption Rule Validators.

Runs against real PostgreSQL in Docker. No mocks.
"""

from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from apps.cards.models import Card
from apps.customers.models import Customer, CustomerPass
from apps.redemption.context import RedemptionContext
from apps.redemption.rules import (
    CooldownValidator,
    LocationValidator,
    MinPurchaseValidator,
    TimeWindowValidator,
    UsageLimitValidator,
)
from apps.tenants.models import Tenant
from apps.transactions.models import Transaction, TransactionType


class RuleValidatorTestCase(TestCase):
    """Base test case with real tenant, customer, card, and pass."""

    def setUp(self):
        self.tenant = Tenant.objects.create(
            name="Test Cafe",
            email="test@cafe.com",
            phone="1234567890",
        )
        self.customer = Customer.objects.create(
            tenant=self.tenant,
            first_name="Test",
            last_name="Customer",
            email="customer@test.com",
        )
        self.card = Card.objects.create(
            tenant=self.tenant,
            card_type="coupon",
            name="Test Coupon",
            is_active=True,
            is_published=True,
            metadata={"discount_type": "percentage", "discount_value": 10, "usage_limit_per_customer": 1},
        )
        self.customer_pass = CustomerPass.objects.create(
            customer=self.customer,
            card=self.card,
            is_active=True,
        )

    def make_context(self, amount=Decimal("0"), scanned_at=None, location_id=None):
        return RedemptionContext(
            tenant=self.tenant,
            customer_pass=self.customer_pass,
            card=self.card,
            amount=amount,
            quantity=1,
            staff_id=None,
            location_id=location_id,
            scanned_at=scanned_at or timezone.now(),
            intent="redeem",
        )


class UsageLimitValidatorTest(RuleValidatorTestCase):
    def test_per_customer_limit_not_exceeded(self):
        rules = {"usage_limit_per_customer": 3}
        violations = UsageLimitValidator().validate(self.make_context(), rules)
        self.assertEqual(len(violations), 0)

    def test_per_customer_limit_exceeded(self):
        rules = {"usage_limit_per_customer": 1}
        # Create a prior redemption transaction
        Transaction.objects.create(
            tenant=self.tenant,
            customer_pass=self.customer_pass,
            transaction_type=TransactionType.COUPON_REDEEMED,
            amount=Decimal("0"),
        )
        violations = UsageLimitValidator().validate(self.make_context(), rules)
        self.assertEqual(len(violations), 1)
        self.assertEqual(violations[0].rule_code, "usage_limit_per_customer")


class TimeWindowValidatorTest(RuleValidatorTestCase):
    def test_valid_from_not_started(self):
        future = timezone.now() + timedelta(days=1)
        rules = {"valid_from": future.isoformat()}
        violations = TimeWindowValidator().validate(self.make_context(), rules)
        self.assertEqual(len(violations), 1)
        self.assertEqual(violations[0].rule_code, "valid_from")

    def test_valid_until_expired(self):
        past = timezone.now() - timedelta(days=1)
        rules = {"valid_until": past.isoformat()}
        violations = TimeWindowValidator().validate(self.make_context(), rules)
        self.assertEqual(len(violations), 1)
        self.assertEqual(violations[0].rule_code, "valid_until")

    def test_allowed_days_restriction(self):
        today = timezone.now()
        tomorrow_weekday = (today.weekday() + 1) % 7
        rules = {"allowed_days_of_week": [tomorrow_weekday]}
        violations = TimeWindowValidator().validate(self.make_context(), rules)
        self.assertEqual(len(violations), 1)
        self.assertEqual(violations[0].rule_code, "allowed_days_of_week")

    def test_allowed_hours_restriction(self):
        rules = {"allowed_hours": {"start": "02:00", "end": "03:00"}}
        violations = TimeWindowValidator().validate(self.make_context(), rules)
        self.assertEqual(len(violations), 1)
        self.assertEqual(violations[0].rule_code, "allowed_hours")


class CooldownValidatorTest(RuleValidatorTestCase):
    def test_cooldown_active(self):
        self.customer_pass.last_redemption_at = timezone.now() - timedelta(hours=1)
        self.customer_pass.save()
        rules = {"cooldown_hours": 2}
        violations = CooldownValidator().validate(self.make_context(), rules)
        self.assertEqual(len(violations), 1)
        self.assertEqual(violations[0].rule_code, "cooldown_hours")

    def test_cooldown_expired(self):
        self.customer_pass.last_redemption_at = timezone.now() - timedelta(hours=3)
        self.customer_pass.save()
        rules = {"cooldown_hours": 2}
        violations = CooldownValidator().validate(self.make_context(), rules)
        self.assertEqual(len(violations), 0)


class LocationValidatorTest(RuleValidatorTestCase):
    def test_location_allowed(self):
        rules = {"allowed_locations": ["loc-1", "loc-2"]}
        violations = LocationValidator().validate(self.make_context(location_id="loc-1"), rules)
        self.assertEqual(len(violations), 0)

    def test_location_denied(self):
        rules = {"allowed_locations": ["loc-1"]}
        violations = LocationValidator().validate(self.make_context(location_id="loc-2"), rules)
        self.assertEqual(len(violations), 1)
        self.assertEqual(violations[0].rule_code, "allowed_locations")

    def test_location_missing(self):
        rules = {"allowed_locations": ["loc-1"]}
        violations = LocationValidator().validate(self.make_context(location_id=None), rules)
        self.assertEqual(len(violations), 1)


class MinPurchaseValidatorTest(RuleValidatorTestCase):
    def test_min_purchase_not_met(self):
        rules = {"min_purchase": Decimal("50.00")}
        violations = MinPurchaseValidator().validate(self.make_context(amount=Decimal("10.00")), rules)
        self.assertEqual(len(violations), 1)
        self.assertEqual(violations[0].rule_code, "min_purchase")

    def test_min_purchase_met(self):
        rules = {"min_purchase": Decimal("50.00")}
        violations = MinPurchaseValidator().validate(self.make_context(amount=Decimal("100.00")), rules)
        self.assertEqual(len(violations), 0)

    def test_max_purchase_exceeded(self):
        rules = {"max_purchase": Decimal("100.00")}
        violations = MinPurchaseValidator().validate(self.make_context(amount=Decimal("150.00")), rules)
        self.assertEqual(len(violations), 1)
        self.assertEqual(violations[0].rule_code, "max_purchase")
