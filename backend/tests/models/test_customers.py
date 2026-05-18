"""
Loyallia  Customer, Card & Enrollment Model Unit Tests
Tests for Customer, Card, Enrollment, and related models.
"""

from decimal import Decimal

from django.db import IntegrityError
from django.test import TestCase

from apps.cards.models import CardType
from tests.factories import (
    make_card,
    make_customer,
    make_customer_pass,
    make_enrollment,
    make_tenant,
)

# Card Model Tests


class CardModelTest(TestCase):
    """Tests for Card model and card-type validations."""

    def test_create_stamp_card(self):
        t = make_tenant()
        card = make_card(t, card_type=CardType.STAMP)
        self.assertEqual(card.card_type, CardType.STAMP)

    def test_card_str(self):
        t = make_tenant(name="TestBiz")
        card = make_card(t, name="Coffee Card")
        self.assertIn("Coffee Card", str(card))

    def test_get_metadata_field(self):
        t = make_tenant()
        card = make_card(t, metadata={"stamps_required": 10, "reward_description": "Free"})
        self.assertEqual(card.get_metadata_field("stamps_required"), 10)
        self.assertIsNone(card.get_metadata_field("nonexistent"))
        self.assertEqual(card.get_metadata_field("nonexistent", "default"), "default")

    def test_validate_stamp_config_valid(self):
        t = make_tenant()
        card = make_card(t, card_type=CardType.STAMP)
        card.validate_stamp_config()  # Should not raise

    def test_validate_stamp_config_invalid_count(self):
        t = make_tenant()
        card = make_card(
            t,
            card_type=CardType.STAMP,
            metadata={"stamps_required": 0, "reward_description": "X"},
        )
        with self.assertRaises(ValueError):
            card.validate_stamp_config()

    def test_validate_cashback_config_valid(self):
        t = make_tenant()
        card = make_card(t, card_type=CardType.CASHBACK)
        card.validate_cashback_config()  # Should not raise

    def test_validate_cashback_config_invalid_percentage(self):
        t = make_tenant()
        card = make_card(
            t,
            card_type=CardType.CASHBACK,
            metadata={
                "cashback_percentage": 0,
                "minimum_purchase": 0,
                "credit_expiry_days": 365,
            },
        )
        with self.assertRaises(ValueError):
            card.validate_cashback_config()

    def test_validate_coupon_config_valid(self):
        t = make_tenant()
        card = make_card(t, card_type=CardType.COUPON)
        card.validate_coupon_config()  # Should not raise

    def test_validate_coupon_config_invalid_type(self):
        t = make_tenant()
        card = make_card(t, card_type=CardType.COUPON, metadata={"discount_type": "invalid"})
        with self.assertRaises(ValueError):
            card.validate_coupon_config()

    def test_validate_coupon_date_ordering(self):
        t = make_tenant()
        card = make_card(
            t,
            card_type=CardType.COUPON,
            metadata={
                "discount_type": "percentage",
                "discount_value": 10,
                "usage_limit_per_customer": 1,
                "coupon_start_date": "2026-05-01",
                "coupon_end_date": "2026-04-01",
            },
        )
        with self.assertRaises(ValueError):
            card.validate_coupon_config()

    def test_validate_discount_config_valid(self):
        t = make_tenant()
        card = make_card(t, card_type=CardType.DISCOUNT)
        card.validate_discount_config()

    def test_validate_discount_config_empty_tiers(self):
        t = make_tenant()
        card = make_card(t, card_type=CardType.DISCOUNT, metadata={"tiers": []})
        with self.assertRaises(ValueError):
            card.validate_discount_config()

    def test_validate_gift_certificate_config_valid(self):
        t = make_tenant()
        card = make_card(t, card_type=CardType.GIFT_CERTIFICATE)
        card.validate_gift_certificate_config()

    def test_validate_vip_membership_config_valid(self):
        t = make_tenant()
        card = make_card(t, card_type=CardType.VIP_MEMBERSHIP)
        card.validate_vip_membership_config()

    def test_validate_vip_membership_missing_name(self):
        t = make_tenant()
        card = make_card(
            t,
            card_type=CardType.VIP_MEMBERSHIP,
            metadata={
                "membership_name": "",
                "monthly_fee": 10,
                "validity_period": "monthly",
            },
        )
        with self.assertRaises(ValueError):
            card.validate_vip_membership_config()

    def test_validate_referral_config_valid(self):
        t = make_tenant()
        card = make_card(t, card_type=CardType.REFERRAL_PASS)
        card.validate_referral_config()

    def test_validate_multipass_config_valid(self):
        t = make_tenant()
        card = make_card(t, card_type=CardType.MULTIPASS)
        card.validate_multipass_config()

    def test_card_unique_together_tenant_name(self):
        t = make_tenant()
        make_card(t, name="Unique Card")
        with self.assertRaises(IntegrityError):
            make_card(t, name="Unique Card")


# Customer Model Tests


class CustomerModelTest(TestCase):
    """Tests for Customer model."""

    def test_create_customer(self):
        t = make_tenant()
        c = make_customer(t, first_name="Alice", email="alice@test.com")
        self.assertEqual(c.first_name, "Alice")
        self.assertTrue(c.is_active)

    def test_customer_str(self):
        t = make_tenant()
        c = make_customer(t, first_name="Alice", last_name="Smith", email="a@b.com")
        self.assertIn("Alice", str(c))
        self.assertIn("a@b.com", str(c))

    def test_full_name_property(self):
        t = make_tenant()
        c = make_customer(t, first_name="Alice", last_name="Smith")
        self.assertEqual(c.full_name, "Alice Smith")

    def test_referral_code_auto_generated(self):
        t = make_tenant()
        c = make_customer(t)
        self.assertTrue(len(c.referral_code) > 0)

    def test_referral_code_unique(self):
        t = make_tenant()
        c1 = make_customer(t)
        c2 = make_customer(t)
        self.assertNotEqual(c1.referral_code, c2.referral_code)

    def test_unique_together_tenant_email(self):
        t = make_tenant()
        make_customer(t, email="same@test.com")
        with self.assertRaises(IntegrityError):
            make_customer(t, email="same@test.com")


class CustomerPassModelTest(TestCase):
    """Tests for CustomerPass model."""

    def test_create_pass(self):
        t = make_tenant()
        card = make_card(t)
        customer = make_customer(t)
        cp = make_customer_pass(customer, card)
        self.assertTrue(cp.is_active)
        self.assertIsNotNone(cp.qr_code)

    def test_qr_code_auto_generated(self):
        t = make_tenant()
        card = make_card(t)
        customer = make_customer(t)
        cp = make_customer_pass(customer, card)
        self.assertTrue(len(cp.qr_code) >= 16)

    def test_stamp_count_default_zero(self):
        t = make_tenant()
        card = make_card(t)
        customer = make_customer(t)
        cp = make_customer_pass(customer, card)
        self.assertEqual(cp.stamp_count, 0)

    def test_cashback_balance_default_zero(self):
        t = make_tenant()
        card = make_card(t)
        customer = make_customer(t)
        cp = make_customer_pass(customer, card)
        self.assertEqual(cp.cashback_balance, Decimal("0"))

    def test_coupon_used_default_false(self):
        t = make_tenant()
        card = make_card(t)
        customer = make_customer(t)
        cp = make_customer_pass(customer, card)
        self.assertFalse(cp.coupon_used)

    def test_unique_together_customer_card(self):
        t = make_tenant()
        card = make_card(t)
        customer = make_customer(t)
        make_customer_pass(customer, card)
        with self.assertRaises(IntegrityError):
            make_customer_pass(customer, card)

    def test_process_stamp_transaction_basic(self):
        t = make_tenant()
        card = make_card(t, card_type=CardType.STAMP)
        customer = make_customer(t)
        cp = make_customer_pass(customer, card)
        result = cp.process_transaction("stamp", quantity=1)
        self.assertTrue(result["pass_updated"])
        self.assertFalse(result["reward_earned"])

    def test_process_stamp_transaction_reward_earned(self):
        t = make_tenant()
        card = make_card(
            t,
            card_type=CardType.STAMP,
            metadata={"stamps_required": 3, "reward_description": "Free coffee"},
        )
        customer = make_customer(t)
        cp = make_customer_pass(customer, card, pass_data={"stamp_count": 2})
        result = cp.process_transaction("stamp", quantity=1)
        self.assertTrue(result["reward_earned"])

    def test_process_coupon_transaction(self):
        t = make_tenant()
        card = make_card(t, card_type=CardType.COUPON)
        customer = make_customer(t)
        cp = make_customer_pass(customer, card)
        result = cp.process_transaction("coupon")
        self.assertTrue(result["pass_updated"])
        self.assertTrue(result["reward_earned"])

    def test_process_coupon_double_redemption_blocked(self):
        t = make_tenant()
        card = make_card(t, card_type=CardType.COUPON)
        customer = make_customer(t)
        cp = make_customer_pass(customer, card, pass_data={"coupon_used": True})
        result = cp.process_transaction("coupon")
        self.assertFalse(result["pass_updated"])

    def test_process_gift_insufficient_balance(self):
        t = make_tenant()
        card = make_card(t, card_type=CardType.GIFT_CERTIFICATE)
        customer = make_customer(t)
        cp = make_customer_pass(customer, card, pass_data={"gift_balance": "5.00"})
        result = cp.process_transaction("gift", amount=Decimal("10.00"))
        self.assertFalse(result["pass_updated"])

    def test_process_gift_sufficient_balance(self):
        t = make_tenant()
        card = make_card(t, card_type=CardType.GIFT_CERTIFICATE)
        customer = make_customer(t)
        cp = make_customer_pass(customer, card, pass_data={"gift_balance": "50.00"})
        result = cp.process_transaction("gift", amount=Decimal("10.00"))
        self.assertTrue(result["pass_updated"])
        self.assertEqual(result["amount_redeemed"], Decimal("10.00"))

    def test_process_multipass_usage(self):
        t = make_tenant()
        card = make_card(t, card_type=CardType.MULTIPASS)
        customer = make_customer(t)
        cp = make_customer_pass(customer, card, pass_data={"multipass_remaining": 5})
        result = cp.process_transaction("multipass")
        self.assertTrue(result["pass_updated"])
        self.assertEqual(result["remaining_stamps"], 4)

    def test_process_multipass_no_remaining(self):
        t = make_tenant()
        card = make_card(t, card_type=CardType.MULTIPASS)
        customer = make_customer(t)
        cp = make_customer_pass(customer, card, pass_data={"multipass_remaining": 0})
        result = cp.process_transaction("multipass")
        self.assertFalse(result["pass_updated"])

    def test_process_transaction_invalid_quantity(self):
        t = make_tenant()
        card = make_card(t)
        customer = make_customer(t)
        cp = make_customer_pass(customer, card)
        with self.assertRaises(ValueError):
            cp.process_transaction("stamp", quantity=0)

    def test_process_cashback_transaction(self):
        t = make_tenant()
        card = make_card(t, card_type=CardType.CASHBACK)
        customer = make_customer(t)
        cp = make_customer_pass(customer, card)
        result = cp.process_transaction("cashback", amount=Decimal("100.00"))
        self.assertTrue(result["pass_updated"])

    def test_update_pass_data_atomic(self):
        t = make_tenant()
        card = make_card(t)
        customer = make_customer(t)
        cp = make_customer_pass(customer, card, pass_data={"counter": 0})
        cp.update_pass_data({"counter": 5, "extra": "data"})
        cp.refresh_from_db()
        self.assertEqual(cp.pass_data["counter"], 5)
        self.assertEqual(cp.pass_data["extra"], "data")


# Enrollment Model Tests


class EnrollmentModelTest(TestCase):
    """Tests for Enrollment model."""

    def test_create_enrollment(self):
        t = make_tenant()
        card = make_card(t)
        customer = make_customer(t)
        enrollment = make_enrollment(t, customer, card)
        self.assertIsNotNone(enrollment.id)
        self.assertEqual(enrollment.enrollment_method, "manual")

    def test_enrollment_str(self):
        t = make_tenant()
        card = make_card(t, name="Coffee Club")
        customer = make_customer(t, first_name="Alice")
        enrollment = make_enrollment(t, customer, card)
        self.assertIn("Alice", str(enrollment))
        self.assertIn("Coffee Club", str(enrollment))
