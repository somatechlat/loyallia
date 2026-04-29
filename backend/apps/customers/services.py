"""
Loyallia — Customer Pass Services
Handles business logic for processing transactions across 10 card types.
Split from customers/models.py per Rule 245.
"""

import logging
from decimal import Decimal
from django.db import transaction as db_transaction
from apps.transactions.models import TransactionType

logger = logging.getLogger(__name__)


class PassProcessor:
    """Service to process loyalty transactions for CustomerPass instances."""

    def __init__(self, customer_pass):
        self.customer_pass = customer_pass
        self.card = customer_pass.card

    def process_transaction(self, transaction_type: str, amount: Decimal = 0, quantity: int = 1) -> dict:
        """
        Main entry point for processing a transaction.
        """
        if quantity < 1:
            raise ValueError("Quantity must be a positive integer")

        result = {
            "transaction_type": transaction_type,
            "amount": amount,
            "quantity": quantity,
            "pass_updated": False,
            "reward_earned": False,
            "reward_description": "",
        }

        card_type = self.card.card_type

        if card_type == "stamp":
            result.update(self._process_stamp(amount, quantity))
        elif card_type == "cashback":
            result.update(self._process_cashback(amount))
        elif card_type == "coupon":
            result.update(self._process_coupon())
        elif card_type == "affiliate":
            result.update(self._process_membership())
        elif card_type == "discount":
            result.update(self._process_discount(amount))
        elif card_type == "gift_certificate":
            result.update(self._process_gift(amount))
        elif card_type == "vip_membership":
            result.update(self._process_membership())
        elif card_type == "corporate_discount":
            result.update(self._process_corporate())
        elif card_type == "referral_pass":
            result.update(self._process_referral())
        elif card_type == "multipass":
            result.update(self._process_multipass())
        else:
            logger.warning(
                "Unknown card type '%s' for pass %s",
                card_type,
                self.customer_pass.id,
            )

        return result

    def _process_stamp(self, amount: Decimal, quantity: int) -> dict:
        stamps_required = self.card.get_metadata_field("stamps_required", 10)
        reward_description = self.card.get_metadata_field("reward_description", "Free item")

        with db_transaction.atomic():
            from apps.customers.models import CustomerPass
            locked = CustomerPass.objects.select_for_update().get(pk=self.customer_pass.pk)
            current_stamps = locked.pass_data.get("stamp_count", 0)
            new_stamps = current_stamps + quantity

            reward_count = new_stamps // stamps_required
            remaining_stamps = new_stamps % stamps_required

            updates = {}
            if reward_count > 0:
                updates["reward_ready"] = True
            updates["stamp_count"] = remaining_stamps
            locked.pass_data.update(updates)
            locked.save(update_fields=["pass_data", "last_updated"])

        return {
            "transaction_type": TransactionType.STAMP_EARNED,
            "pass_updated": True,
            "reward_earned": reward_count > 0,
            "reward_description": reward_description if reward_count > 0 else "",
            "new_stamp_count": remaining_stamps,
            "reward_count": reward_count,
        }

    def _process_cashback(self, amount: Decimal) -> dict:
        percentage = Decimal(str(self.card.get_metadata_field("cashback_percentage", 0)))
        min_purchase = Decimal(str(self.card.get_metadata_field("minimum_purchase", 0)))

        if amount >= min_purchase:
            earned = (amount * percentage) / Decimal("100")

            with db_transaction.atomic():
                from apps.customers.models import CustomerPass
                locked = CustomerPass.objects.select_for_update().get(pk=self.customer_pass.pk)
                current_balance = Decimal(str(locked.pass_data.get("cashback_balance", "0")))
                new_balance = current_balance + earned
                locked.pass_data["cashback_balance"] = str(new_balance)
                locked.save(update_fields=["pass_data", "last_updated"])

            return {
                "transaction_type": TransactionType.CASHBACK_EARNED,
                "pass_updated": True,
                "earned_amount": earned,
                "new_balance": new_balance,
            }

        return {"transaction_type": TransactionType.CASHBACK_EARNED, "pass_updated": False}

    def _process_coupon(self) -> dict:
        with db_transaction.atomic():
            from apps.customers.models import CustomerPass
            locked = CustomerPass.objects.select_for_update().get(pk=self.customer_pass.pk)
            if locked.pass_data.get("coupon_used", False):
                return {"transaction_type": TransactionType.COUPON_REDEEMED, "pass_updated": False}
            locked.pass_data["coupon_used"] = True
            locked.save(update_fields=["pass_data", "last_updated"])

        reward_description = self.card.get_metadata_field("coupon_description", "Coupon redeemed")
        return {
            "transaction_type": TransactionType.COUPON_REDEEMED,
            "pass_updated": True,
            "reward_earned": True,
            "reward_description": reward_description,
        }

    def _process_discount(self, amount: Decimal) -> dict:
        tiers = self.card.get_metadata_field("tiers", [])
        if not isinstance(tiers, list) or not tiers:
            return {"transaction_type": TransactionType.MEMBERSHIP_VALIDATED, "pass_updated": False}

        try:
            with db_transaction.atomic():
                from apps.customers.models import CustomerPass
                locked = CustomerPass.objects.select_for_update().get(pk=self.customer_pass.pk)
                total_spent = locked.pass_data.get("total_spent_at_business", 0)
                new_total = Decimal(str(total_spent)) + amount

                applicable_tier = None
                for tier in sorted(tiers, key=lambda t: t.get("threshold", 0)):
                    if new_total >= Decimal(str(tier.get("threshold", 0))):
                        applicable_tier = tier

                discount_pct = applicable_tier.get("discount_percentage", 0) if applicable_tier else 0
                tier_name = applicable_tier.get("tier_name", "") if applicable_tier else ""

                locked.pass_data["total_spent_at_business"] = str(new_total)
                locked.pass_data["current_discount_percentage"] = discount_pct
                locked.pass_data["current_tier_name"] = tier_name
                locked.save(update_fields=["pass_data", "last_updated"])

            return {
                "transaction_type": TransactionType.MEMBERSHIP_VALIDATED,
                "pass_updated": True,
                "discount_percentage": discount_pct,
                "tier_name": tier_name,
            }
        except Exception:
            logger.exception("Discount processing failed")
            return {"transaction_type": TransactionType.MEMBERSHIP_VALIDATED, "pass_updated": False}

    def _process_referral(self) -> dict:
        max_referrals = self.card.get_metadata_field("max_referrals_per_customer", 0)

        with db_transaction.atomic():
            from apps.customers.models import CustomerPass
            locked = CustomerPass.objects.select_for_update().get(pk=self.customer_pass.pk)
            current_count = locked.pass_data.get("referral_count", 0)

            if max_referrals > 0 and current_count >= max_referrals:
                return {
                    "transaction_type": TransactionType.REFERRAL_REWARD,
                    "pass_updated": False,
                    "new_referral_count": current_count,
                    "limit_reached": True,
                }

            new_count = current_count + 1
            locked.pass_data["referral_count"] = new_count
            locked.save(update_fields=["pass_data", "last_updated"])

        return {
            "transaction_type": TransactionType.REFERRAL_REWARD,
            "pass_updated": True,
            "new_referral_count": new_count,
        }

    def _process_membership(self) -> dict:
        from django.utils import timezone
        from django.utils.dateparse import parse_datetime

        expiry_str = self.customer_pass.pass_data.get("membership_expiry")
        is_valid = True
        reason = ""

        if expiry_str:
            expiry = parse_datetime(expiry_str)
            if expiry and timezone.now() > expiry:
                is_valid = False
                reason = "membership_expired"

        if not self.customer_pass.is_active:
            is_valid = False
            reason = "pass_inactive"

        return {
            "transaction_type": TransactionType.MEMBERSHIP_VALIDATED,
            "pass_updated": False,
            "membership_valid": is_valid,
            "reason": reason,
            "membership_expiry": expiry_str,
        }

    def _process_corporate(self) -> dict:
        return {"transaction_type": TransactionType.CORPORATE_VALIDATED, "pass_updated": False}

    def _process_gift(self, amount: Decimal) -> dict:
        with db_transaction.atomic():
            from apps.customers.models import CustomerPass
            locked = CustomerPass.objects.select_for_update().get(pk=self.customer_pass.pk)
            current_balance = Decimal(str(locked.pass_data.get("gift_balance", "0")))
            if current_balance >= amount:
                new_balance = current_balance - amount
                locked.pass_data["gift_balance"] = str(new_balance)
                locked.save(update_fields=["pass_data", "last_updated"])
                return {
                    "transaction_type": TransactionType.GIFT_REDEEMED,
                    "pass_updated": True,
                    "amount_redeemed": amount,
                    "new_balance": new_balance,
                }
        return {"transaction_type": TransactionType.GIFT_REDEEMED, "pass_updated": False}

    def _process_multipass(self) -> dict:
        with db_transaction.atomic():
            from apps.customers.models import CustomerPass
            locked = CustomerPass.objects.select_for_update().get(pk=self.customer_pass.pk)
            remaining = locked.pass_data.get("multipass_remaining", 0)
            if remaining > 0:
                new_remaining = remaining - 1
                locked.pass_data["multipass_remaining"] = new_remaining
                locked.save(update_fields=["pass_data", "last_updated"])
                return {
                    "transaction_type": TransactionType.MULTIPASS_USED,
                    "pass_updated": True,
                    "stamps_used": 1,
                    "remaining_stamps": new_remaining,
                }
        return {"transaction_type": TransactionType.MULTIPASS_USED, "pass_updated": False}
