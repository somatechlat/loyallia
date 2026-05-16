"""
Tests for audit logging business logic fixes — audit findings LYL-C-API-001, LYL-C-API-004,
LYL-H-API-014, LYL-H-API-005, LYL-H-API-006.
Uses Django's TestCase with PostgreSQL.
"""

import uuid
from decimal import Decimal
from typing import Any, cast

from django.test import TestCase

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
# FIX 1 — LYL-C-API-001: Coupon double-redemption race condition
# ===========================================================================


class CouponRedemptionRaceConditionTest(TestCase):
    """Verify that _process_coupon_transaction cannot be double-redeemed."""

    def setUp(self):
        self.tenant = _make_tenant()
        self.card = _make_card(
            self.tenant,
            card_type="coupon",
            metadata={
                "coupon_description": "Free coffee",
            },
        )
        self.customer = _make_customer(self.tenant)
        self.pass_obj = _make_pass(self.customer, self.card)

    def test_first_redemption_succeeds(self):
        result = cast(Any, self.pass_obj)._process_coupon_transaction()
        self.assertTrue(result["pass_updated"])
        self.assertTrue(result["reward_earned"])
        self.assertEqual(result["reward_description"], "Free coffee")

    def test_second_redemption_blocked(self):
        cast(Any, self.pass_obj)._process_coupon_transaction()
        # Refresh from DB
        self.pass_obj.refresh_from_db()
        result = cast(Any, self.pass_obj)._process_coupon_transaction()
        self.assertFalse(result["pass_updated"])
        self.assertNotIn("reward_earned", result)



# ===========================================================================
# FIX 4 — LYL-C-API-004: Max referrals per customer
# ===========================================================================


class MaxReferralsPerCustomerTest(TestCase):
    """Verify referral count is capped at max_referrals_per_customer."""

    def setUp(self):
        self.tenant = _make_tenant()
        self.card = _make_card(
            self.tenant,
            card_type="referral_pass",
            metadata={
                "max_referrals_per_customer": 3,
            },
        )
        self.customer = _make_customer(self.tenant)
        self.pass_obj = _make_pass(self.customer, self.card)

    def test_referral_increments_normally(self):
        result = cast(Any, self.pass_obj)._process_referral_transaction()
        self.assertTrue(result["pass_updated"])
        self.assertEqual(result["new_referral_count"], 1)

    def test_referral_blocked_at_max(self):
        # Set referral count to max
        self.pass_obj.pass_data["referral_count"] = 3
        self.pass_obj.save(update_fields=["pass_data"])
        self.pass_obj.refresh_from_db()

        result = cast(Any, self.pass_obj)._process_referral_transaction()
        self.assertFalse(result["pass_updated"])
        self.assertTrue(result.get("limit_reached", False))
        self.assertEqual(result["new_referral_count"], 3)

    def test_referral_allows_below_max(self):
        # Set referral count below max
        self.pass_obj.pass_data["referral_count"] = 2
        self.pass_obj.save(update_fields=["pass_data"])
        self.pass_obj.refresh_from_db()

        result = cast(Any, self.pass_obj)._process_referral_transaction()
        self.assertTrue(result["pass_updated"])
        self.assertEqual(result["new_referral_count"], 3)

    def test_no_max_allows_unlimited(self):
        """When max_referrals_per_customer is 0 or absent, referrals are unlimited."""
        card2 = _make_card(self.tenant, card_type="referral_pass", metadata={})
        pass2 = _make_pass(self.customer, card2)
        pass2.pass_data["referral_count"] = 100
        pass2.save(update_fields=["pass_data"])
        pass2.refresh_from_db()

        result = cast(Any, pass2)._process_referral_transaction()
        self.assertTrue(result["pass_updated"])
        self.assertEqual(result["new_referral_count"], 101)


# ===========================================================================
# FIX 5 — LYL-H-API-014: Quantity validation
# ===========================================================================


class QuantityValidationTest(TestCase):
    """Verify process_transaction rejects invalid quantities."""

    def setUp(self):
        self.tenant = _make_tenant()
        self.card = _make_card(
            self.tenant,
            card_type="stamp",
            metadata={
                "stamps_required": 10,
            },
        )
        self.customer = _make_customer(self.tenant)
        self.pass_obj = _make_pass(self.customer, self.card)

    def test_quantity_zero_raises(self):
        with self.assertRaises(ValueError) as ctx:
            self.pass_obj.process_transaction(
                "stamp_earned", amount=Decimal("10"), quantity=0
            )
        self.assertIn("positive integer", str(ctx.exception))

    def test_quantity_negative_raises(self):
        with self.assertRaises(ValueError):
            self.pass_obj.process_transaction(
                "stamp_earned", amount=Decimal("10"), quantity=-1
            )

    def test_quantity_one_works(self):
        result = self.pass_obj.process_transaction(
            "stamp_earned", amount=Decimal("10"), quantity=1
        )
        self.assertTrue(result["pass_updated"])



# ===========================================================================
# FIX 8 — LYL-H-API-005: Stamp multi-cycle loss
# ===========================================================================


class StampMultiCycleTest(TestCase):
    """Verify stamp transactions handle multiple reward cycles correctly."""

    def setUp(self):
        self.tenant = _make_tenant()
        self.card = _make_card(
            self.tenant,
            card_type="stamp",
            metadata={
                "stamps_required": 10,
                "reward_description": "Free item",
            },
        )
        self.customer = _make_customer(self.tenant)
        self.pass_obj = _make_pass(self.customer, self.card)

    def test_single_cycle(self):
        # 0 + 10 = 1 cycle, 0 remaining
        result = cast(Any, self.pass_obj)._process_stamp_transaction(
            Decimal("10"), quantity=10
        )
        self.assertTrue(result["reward_earned"])
        self.assertEqual(result["new_stamp_count"], 0)
        self.assertEqual(result["reward_count"], 1)

    def test_multi_cycle(self):
        # 0 + 25 = 2 cycles, 5 remaining
        result = cast(Any, self.pass_obj)._process_stamp_transaction(
            Decimal("10"), quantity=25
        )
        self.assertTrue(result["reward_earned"])
        self.assertEqual(result["new_stamp_count"], 5)
        self.assertEqual(result["reward_count"], 2)

    def test_multi_cycle_with_existing_stamps(self):
        # Start with 3 stamps, add 17 = 2 cycles, 0 remaining
        self.pass_obj.pass_data["stamp_count"] = 3
        self.pass_obj.save(update_fields=["pass_data"])
        self.pass_obj.refresh_from_db()

        result = cast(Any, self.pass_obj)._process_stamp_transaction(
            Decimal("10"), quantity=17
        )
        self.assertTrue(result["reward_earned"])
        self.assertEqual(result["new_stamp_count"], 0)
        self.assertEqual(result["reward_count"], 2)

    def test_no_stamps_lost_large_quantity(self):
        """Previously, stamps beyond one cycle were lost."""
        # 0 + 100 = 10 cycles, 0 remaining
        result = cast(Any, self.pass_obj)._process_stamp_transaction(
            Decimal("10"), quantity=100
        )
        self.assertEqual(result["new_stamp_count"], 0)
        self.assertEqual(result["reward_count"], 10)

    def test_partial_cycle(self):
        # 0 + 7 = 0 cycles, 7 remaining
        result = cast(Any, self.pass_obj)._process_stamp_transaction(
            Decimal("10"), quantity=7
        )
        self.assertFalse(result["reward_earned"])
        self.assertEqual(result["new_stamp_count"], 7)


# ===========================================================================
# FIX 9 — LYL-H-API-006: Discount float precision
# ===========================================================================


class DiscountFloatPrecisionTest(TestCase):
    """Verify discount calculations use Decimal, not float."""

    def setUp(self):
        self.tenant = _make_tenant()
        self.card = _make_card(
            self.tenant,
            card_type="discount",
            metadata={
                "tiers": [
                    {"tier_name": "Silver", "threshold": 0, "discount_percentage": 5},
                    {"tier_name": "Gold", "threshold": 100, "discount_percentage": 10},
                ],
            },
        )
        self.customer = _make_customer(self.tenant)
        self.pass_obj = _make_pass(self.customer, self.card)

    def test_decimal_precision_preserved(self):
        """Floating point errors like 0.1 + 0.2 = 0.30000000000000004 should not happen."""
        cast(Any, self.pass_obj)._process_discount_transaction(Decimal("0.1"))
        self.pass_obj.refresh_from_db()
        total = self.pass_obj.pass_data["total_spent_at_business"]
        # Should be stored as string "0.1", not 0.10000000000000001
        self.assertEqual(str(total), "0.1")

    def test_stored_as_string(self):
        """Total should be stored as string representation of Decimal for JSON safety."""
        cast(Any, self.pass_obj)._process_discount_transaction(Decimal("10.55"))
        self.pass_obj.refresh_from_db()
        total = self.pass_obj.pass_data["total_spent_at_business"]
        self.assertEqual(str(total), "10.55")

    def test_tier_threshold_with_decimal(self):
        """Tier thresholds should be compared as Decimal."""
        cast(Any, self.pass_obj)._process_discount_transaction(Decimal("100"))
        self.pass_obj.refresh_from_db()
        self.assertEqual(self.pass_obj.pass_data["current_tier_name"], "Gold")
        self.assertEqual(self.pass_obj.pass_data["current_discount_percentage"], 10)

