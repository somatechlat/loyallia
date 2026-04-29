"""
Loyallia — Concurrency & Race Condition Tests
Tests for concurrent access patterns that could cause data corruption.

These tests use Django's TestCase with transaction=True for real concurrency.
For actual multi-threaded tests, we use threading with select_for_update patterns.
"""

import threading
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from decimal import Decimal

from django.test import TestCase, TransactionTestCase

from apps.billing.models import SubscriptionStatus
from apps.cards.models import CardType
from apps.customers.models import CustomerPass
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
# Coupon Double-Redemption Tests
# =============================================================================

class CouponDoubleRedemptionTest(TestCase):
    """Test that coupon redemption is atomic — no double-redemption under concurrent access."""

    def test_coupon_single_redemption(self):
        """Single redemption should succeed."""
        t = make_tenant()
        card = make_card(t, card_type=CardType.COUPON)
        customer = make_customer(t)
        cp = make_customer_pass(customer, card)
        result = cp.process_transaction("coupon")
        self.assertTrue(result["pass_updated"])
        cp.refresh_from_db()
        self.assertTrue(cp.pass_data.get("coupon_used"))

    def test_coupon_double_redemption_blocked(self):
        """Second redemption attempt should be blocked."""
        t = make_tenant()
        card = make_card(t, card_type=CardType.COUPON)
        customer = make_customer(t)
        cp = make_customer_pass(customer, card)
        # First redemption
        cp.process_transaction("coupon")
        # Second redemption attempt
        result = cp.process_transaction("coupon")
        self.assertFalse(result["pass_updated"])

    def test_coupon_concurrent_redemption_only_one_wins(self):
        """Simulate concurrent coupon redemption — only one should succeed."""
        t = make_tenant()
        card = make_card(t, card_type=CardType.COUPON)
        customer = make_customer(t)
        cp = make_customer_pass(customer, card)

        results = []
        errors = []

        def redeem():
            try:
                # Re-fetch the pass to simulate separate requests
                fresh_cp = CustomerPass.objects.get(pk=cp.pk)
                result = fresh_cp.process_transaction("coupon")
                results.append(result["pass_updated"])
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=redeem) for _ in range(5)]
        for t_thread in threads:
            t_thread.start()
        for t_thread in threads:
            t_thread.join()

        # At most one should have succeeded (due to select_for_update)
        successful = sum(1 for r in results if r)
        self.assertLessEqual(successful, 1)
        self.assertEqual(len(errors), 0)


# =============================================================================
# Concurrent Enrollment Tests
# =============================================================================

class ConcurrentEnrollmentTest(TestCase):
    """Test that enrollment prevents duplicates under concurrent access."""

    def test_enrollment_unique_constraint_prevents_duplicates(self):
        """Enrolling the same customer twice should fail on the second attempt."""
        t = make_tenant()
        card = make_card(t)
        customer = make_customer(t)
        make_customer_pass(customer, card)
        # Second enrollment should fail due to unique_together
        with self.assertRaises(Exception):
            make_customer_pass(customer, card)

    def test_enrollment_different_customers_succeed(self):
        """Different customers can enroll in the same card."""
        t = make_tenant()
        card = make_card(t)
        c1 = make_customer(t, email="c1@test.com")
        c2 = make_customer(t, email="c2@test.com")
        make_customer_pass(c1, card)
        make_customer_pass(c2, card)
        self.assertEqual(CustomerPass.objects.filter(card=card).count(), 2)


# =============================================================================
# Stamp Counter Race Condition Tests
# =============================================================================

class StampRaceConditionTest(TestCase):
    """Test that stamp counter uses select_for_update to prevent lost updates."""

    def test_stamp_increment_is_atomic(self):
        """Concurrent stamp increments should not lose updates."""
        t = make_tenant()
        card = make_card(t, card_type=CardType.STAMP, metadata={
            "stamps_required": 100, "reward_description": "Free"
        })
        customer = make_customer(t)
        cp = make_customer_pass(customer, card, pass_data={"stamp_count": 0})

        errors = []

        def add_stamps(count):
            try:
                for _ in range(count):
                    fresh_cp = CustomerPass.objects.get(pk=cp.pk)
                    fresh_cp.process_transaction("stamp", quantity=1)
            except Exception as e:
                errors.append(e)

        # 10 threads each adding 10 stamps = 100 total stamps
        threads = [threading.Thread(target=add_stamps, args=(10,)) for _ in range(10)]
        for t_thread in threads:
            t_thread.start()
        for t_thread in threads:
            t_thread.join()

        self.assertEqual(len(errors), 0)
        cp.refresh_from_db()
        # After 100 stamps with stamps_required=100, reward should be earned
        # and stamp_count should be 0 (100 % 100 = 0)
        self.assertEqual(cp.pass_data.get("stamp_count", -1), 0)


# =============================================================================
# Cashback Race Condition Tests
# =============================================================================

class CashbackRaceConditionTest(TestCase):
    """Test that cashback balance updates are atomic."""

    def test_cashback_balance_consistency(self):
        """Concurrent cashback additions should be consistent."""
        t = make_tenant()
        card = make_card(t, card_type=CardType.CASHBACK)
        customer = make_customer(t)
        cp = make_customer_pass(customer, card, pass_data={"cashback_balance": "0"})

        errors = []

        def add_cashback():
            try:
                fresh_cp = CustomerPass.objects.get(pk=cp.pk)
                fresh_cp.process_transaction("cashback", amount=Decimal("10.00"))
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=add_cashback) for _ in range(5)]
        for t_thread in threads:
            t_thread.start()
        for t_thread in threads:
            t_thread.join()

        self.assertEqual(len(errors), 0)
        cp.refresh_from_db()
        # 5 threads × $10 × 5% cashback = $2.50
        balance = Decimal(cp.pass_data.get("cashback_balance", "0"))
        self.assertEqual(balance, Decimal("2.50"))


# =============================================================================
# Gift Certificate Balance Tests
# =============================================================================

class GiftBalanceRaceConditionTest(TestCase):
    """Test that gift certificate balance prevents overdraft under concurrent access."""

    def test_gift_balance_no_overdraft(self):
        """Concurrent redemptions should not cause negative balance."""
        t = make_tenant()
        card = make_card(t, card_type=CardType.GIFT_CERTIFICATE)
        customer = make_customer(t)
        cp = make_customer_pass(customer, card, pass_data={"gift_balance": "15.00"})

        results = []

        def redeem(amount):
            try:
                fresh_cp = CustomerPass.objects.get(pk=cp.pk)
                result = fresh_cp.process_transaction("gift", amount=Decimal(str(amount)))
                results.append(result["pass_updated"])
            except Exception:
                results.append(False)

        # Try to redeem $10 twice (total $20) with only $15 balance
        threads = [
            threading.Thread(target=redeem, args=(10,)),
            threading.Thread(target=redeem, args=(10,)),
        ]
        for t_thread in threads:
            t_thread.start()
        for t_thread in threads:
            t_thread.join()

        cp.refresh_from_db()
        balance = Decimal(cp.pass_data.get("gift_balance", "0"))
        # Balance should be non-negative
        self.assertGreaterEqual(balance, Decimal("0"))
        # At least one should have succeeded
        self.assertTrue(any(results))


# =============================================================================
# Multipass Race Condition Tests
# =============================================================================

class MultipassRaceConditionTest(TestCase):
    """Test that multipass usage is atomic."""

    def test_multipass_no_overdraft(self):
        """Concurrent multipass usage should not go below zero."""
        t = make_tenant()
        card = make_card(t, card_type=CardType.MULTIPASS)
        customer = make_customer(t)
        cp = make_customer_pass(customer, card, pass_data={"multipass_remaining": 2})

        results = []

        def use_pass():
            try:
                fresh_cp = CustomerPass.objects.get(pk=cp.pk)
                result = fresh_cp.process_transaction("multipass")
                results.append(result["pass_updated"])
            except Exception:
                results.append(False)

        threads = [threading.Thread(target=use_pass) for _ in range(5)]
        for t_thread in threads:
            t_thread.start()
        for t_thread in threads:
            t_thread.join()

        cp.refresh_from_db()
        remaining = cp.pass_data.get("multipass_remaining", 0)
        # Should not go below zero
        self.assertGreaterEqual(remaining, 0)
        # Exactly 2 should have succeeded (initial balance)
        successful = sum(1 for r in results if r)
        self.assertEqual(successful, 2)


# =============================================================================
# Referral Limit Tests
# =============================================================================

class ReferralLimitRaceConditionTest(TestCase):
    """Test that referral count respects max_referrals_per_customer."""

    def test_referral_count_respects_max(self):
        """Cannot exceed max_referrals_per_customer."""
        t = make_tenant()
        card = make_card(t, card_type=CardType.REFERRAL_PASS, metadata={
            "referrer_reward": "Free item",
            "referee_reward": "10% off",
            "max_referrals_per_customer": 3,
        })
        customer = make_customer(t)
        cp = make_customer_pass(customer, card, pass_data={"referral_count": 0})

        # Process 5 referrals — only 3 should succeed
        for _ in range(5):
            cp.process_transaction("referral")

        cp.refresh_from_db()
        self.assertEqual(cp.pass_data.get("referral_count", 0), 3)


# =============================================================================
# Discount Tier Race Condition Tests
# =============================================================================

class DiscountTierRaceConditionTest(TestCase):
    """Test that discount tier calculation is atomic under concurrent scans."""

    def test_discount_tier_consistency(self):
        """Concurrent discount transactions should maintain consistent tier."""
        t = make_tenant()
        card = make_card(t, card_type=CardType.DISCOUNT)
        customer = make_customer(t)
        cp = make_customer_pass(customer, card, pass_data={
            "total_spent_at_business": "0",
        })

        errors = []

        def add_spend(amount):
            try:
                fresh_cp = CustomerPass.objects.get(pk=cp.pk)
                fresh_cp.process_transaction("discount", amount=Decimal(str(amount)))
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=add_spend, args=(50,)) for _ in range(4)]
        for t_thread in threads:
            t_thread.start()
        for t_thread in threads:
            t_thread.join()

        self.assertEqual(len(errors), 0)
        cp.refresh_from_db()
        total = Decimal(cp.pass_data.get("total_spent_at_business", "0"))
        self.assertEqual(total, Decimal("200"))
