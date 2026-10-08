"""
Integration tests for all Redemption Strategies.

Runs against real PostgreSQL. No mocks. Tests earn/redeem/validate
flows for all 10 card types with real state mutations.
"""

from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from apps.cards.models import Card
from apps.customers.models import Customer, CustomerPass
from apps.redemption.context import RedemptionContext
from apps.redemption.strategies.registry import get_strategy
from apps.tenants.models import Tenant
from apps.transactions.models import Transaction, TransactionType


class StrategyTestCase(TestCase):
    """Base with real tenant, customer, card, pass."""

    def setUp(self):
        self.tenant = Tenant.objects.create(
            name="Test Cafe", email="test@cafe.com", phone="1234567890"
        )
        self.customer = Customer.objects.create(
            tenant=self.tenant,
            first_name="Test",
            last_name="Customer",
            email="customer@test.com",
        )

    def make_pass(self, card_type: str, **card_kwargs):
        metadata_defaults = {
            "stamp": {"stamps_required": 5, "reward_description": "Free coffee"},
            "cashback": {
                "cashback_percentage": 10,
                "minimum_purchase": 0,
                "credit_expiry_days": 365,
            },
            "coupon": {
                "discount_type": "percentage",
                "discount_value": 10,
                "usage_limit_per_customer": 1,
            },
            "gift_certificate": {"denominations": [25, 50, 100], "expiry_days": 365},
            "vip_membership": {
                "membership_name": "Gold",
                "monthly_fee": 10,
                "validity_period": "monthly",
            },
            "multipass": {"bundle_size": 10, "bundle_price": 50},
            "discount": {
                "tiers": [
                    {"tier_name": "Bronze", "threshold": 0, "discount_percentage": 5}
                ]
            },
            "referral_pass": {
                "referrer_reward": "10",
                "referee_reward": "10",
                "max_referrals_per_customer": 5,
            },
            "corporate_discount": {},
            "affiliate": {},
        }
        meta = metadata_defaults.get(card_type, {})
        meta.update(card_kwargs.pop("metadata", {}))
        card = Card.objects.create(
            tenant=self.tenant,
            card_type=card_type,
            name=f"Test {card_type}",
            is_active=True,
            is_published=True,
            metadata=meta,
            **card_kwargs,
        )
        return CustomerPass.objects.create(
            customer=self.customer, card=card, is_active=True
        )

    def make_context(self, customer_pass, amount=Decimal("0"), intent="redeem"):
        return RedemptionContext(
            tenant=self.tenant,
            customer_pass=customer_pass,
            card=customer_pass.card,
            amount=amount,
            quantity=1,
            staff_id=None,
            location_id=None,
            scanned_at=timezone.now(),
            intent=intent,
        )

    def get_strategy_result(
        self,
        customer_pass,
        card_type: str,
        intent: str,
        amount=Decimal("0"),
    ):
        """Execute the registry strategy for (card_type, intent)."""
        strategy = get_strategy(card_type, intent)
        context = self.make_context(customer_pass, amount=amount, intent=intent)
        return strategy.execute(context)


class StampStrategyTest(StrategyTestCase):
    def test_stamp_earn_adds_stamps(self):
        cp = self.make_pass("stamp", metadata={"stamps_required": 5})
        strategy = get_strategy("stamp", "earn")
        result = strategy.execute(self.make_context(cp, intent="earn"))
        self.assertTrue(result.success)
        cp.refresh_from_db()
        self.assertEqual(cp.stamp_count, 1)

    def test_stamp_earn_reaches_threshold(self):
        cp = self.make_pass("stamp", metadata={"stamps_required": 3})
        cp.stamp_count = 2
        cp.save()
        strategy = get_strategy("stamp", "earn")
        result = strategy.execute(self.make_context(cp, intent="earn"))
        self.assertTrue(result.success)
        cp.refresh_from_db()
        self.assertEqual(cp.stamp_count, 0)
        self.assertEqual(cp.lifecycle_state, CustomerPass.LifecycleState.REWARD_READY)

    def test_stamp_redeem_consumes_reward(self):
        cp = self.make_pass("stamp", metadata={"stamps_required": 3})
        cp.lifecycle_state = CustomerPass.LifecycleState.REWARD_READY
        cp.save()
        strategy = get_strategy("stamp", "redeem")
        result = strategy.execute(self.make_context(cp, intent="redeem"))
        self.assertTrue(result.success)
        cp.refresh_from_db()
        self.assertEqual(cp.lifecycle_state, CustomerPass.LifecycleState.ACTIVE)

    def test_stamp_redeem_without_reward_fails(self):
        cp = self.make_pass("stamp", metadata={"stamps_required": 3})
        strategy = get_strategy("stamp", "redeem")
        result = strategy.execute(self.make_context(cp, intent="redeem"))
        self.assertFalse(result.success)
        self.assertIn("reward_not_ready", result.denial_reasons)


class CashbackStrategyTest(StrategyTestCase):
    def test_cashback_earn_adds_credit(self):
        cp = self.make_pass(
            "cashback", metadata={"cashback_percentage": 10, "minimum_purchase": 0}
        )
        strategy = get_strategy("cashback", "earn")
        result = strategy.execute(
            self.make_context(cp, amount=Decimal("100.00"), intent="earn")
        )
        self.assertTrue(result.success)
        cp.refresh_from_db()
        self.assertEqual(cp.cashback_balance, Decimal("10.00"))

    def test_cashback_earn_below_minimum_fails(self):
        cp = self.make_pass(
            "cashback", metadata={"cashback_percentage": 10, "minimum_purchase": 50}
        )
        strategy = get_strategy("cashback", "earn")
        result = strategy.execute(
            self.make_context(cp, amount=Decimal("10.00"), intent="earn")
        )
        self.assertFalse(result.success)

    def test_cashback_redeem_deducts_balance(self):
        cp = self.make_pass("cashback")
        cp.cashback_balance = Decimal("50.00")
        cp.save()
        strategy = get_strategy("cashback", "redeem")
        result = strategy.execute(
            self.make_context(cp, amount=Decimal("20.00"), intent="redeem")
        )
        self.assertTrue(result.success)
        cp.refresh_from_db()
        self.assertEqual(cp.cashback_balance, Decimal("30.00"))

    def test_cashback_redeem_insufficient_fails(self):
        cp = self.make_pass("cashback")
        cp.cashback_balance = Decimal("10.00")
        cp.save()
        strategy = get_strategy("cashback", "redeem")
        result = strategy.execute(
            self.make_context(cp, amount=Decimal("20.00"), intent="redeem")
        )
        self.assertFalse(result.success)


class CouponStrategyTest(StrategyTestCase):
    def test_coupon_redeem_increments_counter(self):
        cp = self.make_pass("coupon")
        cp.card.redemption_rules = {"usage_limit_per_customer": 3}
        cp.card.save()
        strategy = get_strategy("coupon", "redeem")
        result = strategy.execute(self.make_context(cp, intent="redeem"))
        self.assertTrue(result.success)
        cp.refresh_from_db()
        self.assertEqual(cp.coupon_redemption_count, 1)

    def test_coupon_usage_limit_enforced(self):
        cp = self.make_pass("coupon")
        cp.card.redemption_rules = {"usage_limit_per_customer": 1}
        cp.card.save()
        cp.coupon_redemption_count = 1
        cp.save()
        Transaction.objects.create(
            tenant=self.tenant,
            customer_pass=cp,
            transaction_type=TransactionType.COUPON_REDEEMED,
            amount=Decimal("0"),
        )
        strategy = get_strategy("coupon", "redeem")
        result = strategy.execute(self.make_context(cp, intent="redeem"))
        self.assertFalse(result.success)
        self.assertIn("usage_limit_exceeded", result.denial_reasons)

    def test_coupon_time_window_enforced(self):
        cp = self.make_pass("coupon")
        cp.card.redemption_rules = {
            "valid_from": "2099-01-01T00:00:00",
        }
        cp.card.save()
        strategy = get_strategy("coupon", "redeem")
        result = strategy.execute(self.make_context(cp, intent="redeem"))
        self.assertFalse(result.success)
        self.assertIn("time_window_invalid", result.denial_reasons)


class GiftStrategyTest(StrategyTestCase):
    def test_gift_redeem_deducts_balance(self):
        cp = self.make_pass("gift_certificate")
        cp.gift_balance = Decimal("100.00")
        cp.save()
        strategy = get_strategy("gift_certificate", "redeem")
        result = strategy.execute(
            self.make_context(cp, amount=Decimal("30.00"), intent="redeem")
        )
        self.assertTrue(result.success)
        cp.refresh_from_db()
        self.assertEqual(cp.gift_balance, Decimal("70.00"))

    def test_gift_redeem_insufficient_fails(self):
        cp = self.make_pass("gift_certificate")
        cp.gift_balance = Decimal("10.00")
        cp.save()
        strategy = get_strategy("gift_certificate", "redeem")
        result = strategy.execute(
            self.make_context(cp, amount=Decimal("30.00"), intent="redeem")
        )
        self.assertFalse(result.success)
        self.assertIn("insufficient_balance", result.denial_reasons)


class MultipassStrategyTest(StrategyTestCase):
    def test_multipass_redeem_decrements(self):
        cp = self.make_pass("multipass")
        cp.multipass_remaining = 5
        cp.save()
        strategy = get_strategy("multipass", "redeem")
        result = strategy.execute(self.make_context(cp, intent="redeem"))
        self.assertTrue(result.success)
        cp.refresh_from_db()
        self.assertEqual(cp.multipass_remaining, 4)
        self.assertEqual(result.remaining_uses, 4)

    def test_multipass_redeem_empty_fails(self):
        cp = self.make_pass("multipass")
        cp.multipass_remaining = 0
        cp.save()
        strategy = get_strategy("multipass", "redeem")
        result = strategy.execute(self.make_context(cp, intent="redeem"))
        self.assertFalse(result.success)
        self.assertIn("insufficient_balance", result.denial_reasons)


class MembershipStrategyTest(StrategyTestCase):
    def test_membership_valid(self):
        cp = self.make_pass("vip_membership")
        strategy = get_strategy("vip_membership", "validate")
        result = strategy.execute(self.make_context(cp, intent="validate"))
        self.assertTrue(result.success)
        self.assertTrue(result.new_state.get("membership_valid"))
        self.assertIn("last_message", result.field_keys)
        cp.refresh_from_db()
        self.assertTrue(cp.pass_data.get("last_message"))

    def test_membership_expired_is_denied(self):
        cp = self.make_pass("vip_membership")
        cp.pass_data["membership_expiry"] = "2020-01-01T00:00:00"
        cp.save()
        strategy = get_strategy("vip_membership", "validate")
        result = strategy.execute(self.make_context(cp, intent="validate"))
        # Honesty rule: an expired membership is a denial, never a SUCCESS
        # transaction.
        self.assertFalse(result.success)
        self.assertIn("membership_expired", result.denial_reasons)
        self.assertFalse(
            Transaction.objects.filter(
                tenant=self.tenant,
                customer_pass=cp,
                transaction_type=TransactionType.MEMBERSHIP_VALIDATED,
            ).exists()
        )

    def test_membership_inactive_pass_is_denied(self):
        cp = self.make_pass("vip_membership")
        cp.is_active = False
        cp.save()
        strategy = get_strategy("vip_membership", "validate")
        result = strategy.execute(self.make_context(cp, intent="validate"))
        self.assertFalse(result.success)
        self.assertIn("pass_inactive", result.denial_reasons)


class CorporateStrategyTest(StrategyTestCase):
    def test_corporate_valid(self):
        cp = self.make_pass("corporate_discount")
        strategy = get_strategy("corporate_discount", "validate")
        result = strategy.execute(self.make_context(cp, intent="validate"))
        self.assertTrue(result.success)
        self.assertTrue(result.new_state.get("membership_valid"))
        self.assertIn("last_message", result.field_keys)

    def test_corporate_inactive_pass_is_denied(self):
        cp = self.make_pass("corporate_discount")
        cp.is_active = False
        cp.save()
        strategy = get_strategy("corporate_discount", "validate")
        result = strategy.execute(self.make_context(cp, intent="validate"))
        self.assertFalse(result.success)
        self.assertIn("pass_inactive", result.denial_reasons)
        self.assertFalse(
            Transaction.objects.filter(
                tenant=self.tenant,
                customer_pass=cp,
                transaction_type=TransactionType.CORPORATE_VALIDATED,
            ).exists()
        )


class ReferralStrategyTest(StrategyTestCase):
    def test_referral_tracks(self):
        cp = self.make_pass("referral_pass", metadata={"max_referrals_per_customer": 5})
        strategy = get_strategy("referral_pass", "redeem")
        result = strategy.execute(self.make_context(cp, intent="redeem"))
        self.assertTrue(result.success)
        cp.refresh_from_db()
        self.assertEqual(cp.referral_count, 1)

    def test_referral_limit_enforced(self):
        cp = self.make_pass("referral_pass", metadata={"max_referrals_per_customer": 1})
        cp.referral_count = 1
        cp.save()
        strategy = get_strategy("referral_pass", "redeem")
        result = strategy.execute(self.make_context(cp, intent="redeem"))
        self.assertFalse(result.success)
        self.assertIn("usage_limit_exceeded", result.denial_reasons)


class DiscountStrategyTest(StrategyTestCase):
    def test_discount_tracks_spend(self):
        cp = self.make_pass(
            "discount",
            metadata={
                "tiers": [
                    {"tier_name": "Bronze", "threshold": 0, "discount_percentage": 5},
                    {
                        "tier_name": "Silver",
                        "threshold": 100,
                        "discount_percentage": 10,
                    },
                ]
            },
        )
        strategy = get_strategy("discount", "redeem")
        result = strategy.execute(
            self.make_context(cp, amount=Decimal("150.00"), intent="redeem")
        )
        self.assertTrue(result.success)
        cp.refresh_from_db()
        self.assertEqual(cp.pass_data.get("current_tier_name"), "Silver")


class MutationUpdatesKeysTest(StrategyTestCase):
    """Per-strategy: mutation.updates / result.field_keys must expose the real
    mutated pass-data keys so the notify agent can emit honest field_keys."""

    def test_stamp_earn_updates_keys(self):
        cp = self.make_pass("stamp", metadata={"stamps_required": 5})
        result = get_strategy("stamp", "earn").execute(
            self.make_context(cp, intent="earn")
        )
        self.assertTrue(result.success)
        self.assertEqual(
            set(result.field_keys), {"stamp_count", "last_message"}
        )

    def test_stamp_redeem_updates_keys(self):
        cp = self.make_pass("stamp", metadata={"stamps_required": 3})
        cp.lifecycle_state = CustomerPass.LifecycleState.REWARD_READY
        cp.save()
        result = get_strategy("stamp", "redeem").execute(
            self.make_context(cp, intent="redeem")
        )
        self.assertTrue(result.success)
        self.assertIn("last_message", result.field_keys)
        self.assertIn("reward_ready", result.field_keys)
        cp.refresh_from_db()
        self.assertTrue(cp.pass_data.get("last_message"))

    def test_cashback_earn_updates_keys(self):
        cp = self.make_pass("cashback")
        result = get_strategy("cashback", "earn").execute(
            self.make_context(cp, amount=Decimal("50.00"), intent="earn")
        )
        self.assertTrue(result.success)
        self.assertEqual(set(result.field_keys), {"cashback_balance", "last_message"})
        self.assertEqual(result.new_state.get("cashback_balance"), "5.00")

    def test_cashback_redeem_updates_keys(self):
        cp = self.make_pass("cashback")
        cp.cashback_balance = Decimal("50.00")
        cp.save()
        result = get_strategy("cashback", "redeem").execute(
            self.make_context(cp, amount=Decimal("20.00"), intent="redeem")
        )
        self.assertTrue(result.success)
        self.assertEqual(set(result.field_keys), {"cashback_balance", "last_message"})
        self.assertEqual(result.new_state.get("cashback_balance"), "30.00")

    def test_coupon_updates_keys(self):
        cp = self.make_pass("coupon")
        result = get_strategy("coupon", "redeem").execute(
            self.make_context(cp, intent="redeem")
        )
        self.assertTrue(result.success)
        self.assertEqual(
            set(result.field_keys),
            {"coupon_redemption_count", "coupon_used", "last_message"},
        )

    def test_gift_updates_keys(self):
        cp = self.make_pass("gift_certificate")
        cp.gift_balance = Decimal("100.00")
        cp.save()
        result = get_strategy("gift_certificate", "redeem").execute(
            self.make_context(cp, amount=Decimal("30.00"), intent="redeem")
        )
        self.assertTrue(result.success)
        self.assertEqual(set(result.field_keys), {"gift_balance", "last_message"})
        self.assertEqual(result.new_state.get("gift_balance"), "70.00")

    def test_multipass_updates_keys(self):
        cp = self.make_pass("multipass")
        cp.multipass_remaining = 5
        cp.save()
        result = get_strategy("multipass", "redeem").execute(
            self.make_context(cp, intent="redeem")
        )
        self.assertTrue(result.success)
        self.assertEqual(
            set(result.field_keys), {"multipass_remaining", "last_message"}
        )
        self.assertEqual(result.new_state.get("multipass_remaining"), 4)

    def test_discount_updates_keys(self):
        cp = self.make_pass("discount")
        result = get_strategy("discount", "redeem").execute(
            self.make_context(cp, amount=Decimal("10.00"), intent="redeem")
        )
        self.assertTrue(result.success)
        self.assertEqual(
            set(result.field_keys),
            {
                "total_spent_at_business",
                "current_discount_percentage",
                "current_tier_name",
                "discount_tier",
                "last_message",
            },
        )

    def test_referral_updates_keys(self):
        cp = self.make_pass("referral_pass", metadata={"max_referrals_per_customer": 5})
        result = get_strategy("referral_pass", "redeem").execute(
            self.make_context(cp, intent="redeem")
        )
        self.assertTrue(result.success)
        self.assertEqual(set(result.field_keys), {"referral_count", "last_message"})

    def test_membership_validate_updates_keys(self):
        cp = self.make_pass("vip_membership")
        result = get_strategy("vip_membership", "validate").execute(
            self.make_context(cp, intent="validate")
        )
        self.assertTrue(result.success)
        self.assertEqual(set(result.field_keys), {"last_message"})
        self.assertTrue(result.pass_updated)

    def test_corporate_validate_updates_keys(self):
        cp = self.make_pass("corporate_discount")
        result = get_strategy("corporate_discount", "validate").execute(
            self.make_context(cp, intent="validate")
        )
        self.assertTrue(result.success)
        self.assertEqual(set(result.field_keys), {"last_message"})
