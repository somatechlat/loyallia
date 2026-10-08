"""
Field-diff tests: old vs new Apple pass fields must contain at least one
changeMessage field whose value changed after the redemption mutation.

This is the only test that catches "Apple silence" — a redemption that
updates state but leaves every changeMessage field's value identical, so
Wallet never shows a notification.
"""

from decimal import Decimal

from apps.customers.models import CustomerPass
from apps.customers.pass_engine.apple_field_builders import _build_fields_for_type
from apps.redemption.tests.test_strategies import StrategyTestCase


def _change_message_values(fields: dict) -> dict[str, str]:
    """Map field key → value for every field that has a changeMessage."""
    values: dict[str, str] = {}
    for group_fields in fields.values():
        for field in group_fields:
            if field.get("changeMessage"):
                values[str(field.get("key"))] = str(field.get("value", ""))
    return values


class AppleFieldDiffTest(StrategyTestCase):
    """Per card type: a successful mutation must diff a changeMessage field."""

    def assert_visible_diff(self, customer_pass, execute) -> None:
        old_fields = _change_message_values(
            _build_fields_for_type(customer_pass.card, customer_pass)
        )
        self.assertTrue(old_fields, "pass layout must expose changeMessage fields")

        result = execute()
        self.assertTrue(result.success)

        customer_pass.refresh_from_db()
        new_fields = _change_message_values(
            _build_fields_for_type(customer_pass.card, customer_pass)
        )

        changed = [
            key
            for key, old_value in old_fields.items()
            if key in new_fields and new_fields[key] != old_value
        ]
        self.assertTrue(
            changed,
            "no changeMessage field changed — Apple Wallet would stay silent. "
            f"old={old_fields} new={new_fields}",
        )

    def test_stamp_earn_diff(self):
        cp = self.make_pass("stamp", metadata={"stamps_required": 5})
        self.assert_visible_diff(
            cp,
            lambda: self.get_strategy_result(cp, "stamp", "earn"),
        )

    def test_stamp_redeem_diff(self):
        cp = self.make_pass("stamp", metadata={"stamps_required": 3})
        cp.lifecycle_state = CustomerPass.LifecycleState.REWARD_READY
        cp.save()
        self.assert_visible_diff(
            cp,
            lambda: self.get_strategy_result(cp, "stamp", "redeem"),
        )

    def test_cashback_earn_diff(self):
        cp = self.make_pass("cashback")
        self.assert_visible_diff(
            cp,
            lambda: self.get_strategy_result(
                cp, "cashback", "earn", amount=Decimal("50.00")
            ),
        )

    def test_cashback_redeem_diff(self):
        cp = self.make_pass("cashback")
        cp.cashback_balance = Decimal("50.00")
        cp.save()
        self.assert_visible_diff(
            cp,
            lambda: self.get_strategy_result(
                cp, "cashback", "redeem", amount=Decimal("20.00")
            ),
        )

    def test_coupon_redeem_diff(self):
        cp = self.make_pass("coupon")
        self.assert_visible_diff(
            cp,
            lambda: self.get_strategy_result(cp, "coupon", "redeem"),
        )

    def test_gift_redeem_diff(self):
        cp = self.make_pass("gift_certificate")
        cp.gift_balance = Decimal("100.00")
        cp.save()
        self.assert_visible_diff(
            cp,
            lambda: self.get_strategy_result(
                cp, "gift_certificate", "redeem", amount=Decimal("30.00")
            ),
        )

    def test_multipass_redeem_diff(self):
        cp = self.make_pass("multipass")
        cp.multipass_remaining = 5
        cp.save()
        self.assert_visible_diff(
            cp,
            lambda: self.get_strategy_result(cp, "multipass", "redeem"),
        )

    def test_discount_tier_change_diff(self):
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
        self.assert_visible_diff(
            cp,
            lambda: self.get_strategy_result(
                cp, "discount", "redeem", amount=Decimal("150.00")
            ),
        )

    def test_referral_diff(self):
        cp = self.make_pass("referral_pass", metadata={"max_referrals_per_customer": 5})
        self.assert_visible_diff(
            cp,
            lambda: self.get_strategy_result(
                cp, "referral_pass", "redeem"
            ),
        )

    def test_vip_validate_diff(self):
        cp = self.make_pass("vip_membership")
        self.assert_visible_diff(
            cp,
            lambda: self.get_strategy_result(
                cp, "vip_membership", "validate"
            ),
        )

    def test_affiliate_validate_diff(self):
        cp = self.make_pass("affiliate")
        self.assert_visible_diff(
            cp,
            lambda: self.get_strategy_result(
                cp, "affiliate", "validate"
            ),
        )

    def test_corporate_validate_diff(self):
        cp = self.make_pass("corporate_discount")
        self.assert_visible_diff(
            cp,
            lambda: self.get_strategy_result(
                cp, "corporate_discount", "validate"
            ),
        )
