"""
Loyallia Redemption Engine — Cashback Card Strategies

Implements the earn and redeem flows for cashback-based loyalty cards.
Customers earn a percentage of their purchase as credit and can later
redeem that credit against new purchases.
"""

import logging
from decimal import Decimal, InvalidOperation
from typing import TYPE_CHECKING

from apps.transactions.models import TransactionType
from common.messages import get_message

from ..context import RedemptionContext
from .base import BaseRedemptionStrategy, PassStateMutation

if TYPE_CHECKING:
    from apps.customers.models import CustomerPass

logger = logging.getLogger(__name__)


class CashbackEarnStrategy(BaseRedemptionStrategy):
    """Earn cashback credit based on purchase amount.

    Credit is only awarded when ``amount`` meets or exceeds the card's
    ``minimum_purchase`` threshold. The earned value is calculated as
    ``amount * cashback_percentage / 100`` and added to both the typed
    ``cashback_balance`` column and ``pass_data``.
    """

    def __init__(self) -> None:
        """Initialize the earn strategy for cashback cards."""
        super().__init__(card_type="cashback")

    def validate(self, context: RedemptionContext) -> list[str]:
        """Validate that the purchase meets the minimum threshold."""
        violations: list[str] = []
        metadata = context.card.metadata or {}

        try:
            minimum_purchase = Decimal(str(metadata.get("minimum_purchase", 0)))
        except (InvalidOperation, TypeError, ValueError):
            minimum_purchase = Decimal("0")

        if context.amount < minimum_purchase:
            violations.append("minimum_purchase_not_met")

        return violations

    def _compute_mutation(self, locked_pass: "CustomerPass", context: RedemptionContext) -> PassStateMutation:
        """Compute the cashback earned and updated balance."""
        metadata = context.card.metadata or {}

        try:
            percentage = Decimal(str(metadata.get("cashback_percentage", 0)))
        except (InvalidOperation, TypeError, ValueError):
            percentage = Decimal("0")

        earned = (context.amount * percentage / Decimal("100")).quantize(Decimal("0.01"))

        current_balance = locked_pass.cashback_balance or Decimal("0")
        new_balance = current_balance + earned
        new_balance_str = str(new_balance)

        updates = {
            "cashback_balance": new_balance_str,
        }

        return PassStateMutation(
            is_valid=True,
            updates=updates,
            transaction_type=TransactionType.CASHBACK_EARNED,
            transaction_amount=earned,
            reward_description=get_message("TRANSACTION_CASHBACK_EARNED").format(
                amount=str(earned), balance=new_balance_str
            ),
            new_balance=new_balance_str,
        )

    def _resolve_intent(self, context: RedemptionContext) -> str:
        """Return the resolved intent for cashback earn."""
        return "earn"


class CashbackRedeemStrategy(BaseRedemptionStrategy):
    """Redeem cashback credit against a purchase.

    Validates that the requested ``amount`` does not exceed the current
    ``cashback_balance``. If the card metadata defines a
    ``minimum_redemption`` threshold, the requested amount must also meet
    or exceed it. The deducted balance is serialized as a string in
    ``pass_data`` to preserve Decimal precision.
    """

    def __init__(self) -> None:
        """Initialize the redeem strategy for cashback cards."""
        super().__init__(card_type="cashback")

    def validate(self, context: RedemptionContext) -> list[str]:
        """Validate that the redemption amount is within balance limits."""
        violations: list[str] = []
        current_balance = context.customer_pass.cashback_balance or Decimal(
            str(context.customer_pass.pass_data.get("cashback_balance", "0"))
        )

        if context.amount > current_balance:
            violations.append("insufficient_cashback_balance")

        metadata = context.card.metadata or {}
        minimum_redemption = metadata.get("minimum_redemption")
        if minimum_redemption is not None:
            try:
                if context.amount < Decimal(str(minimum_redemption)):
                    violations.append("minimum_redemption_not_met")
            except (InvalidOperation, TypeError, ValueError):
                logger.warning("Invalid minimum_redemption config, ignoring.")

        return violations

    def _compute_mutation(self, locked_pass: "CustomerPass", context: RedemptionContext) -> PassStateMutation:
        """Compute the balance deduction after locking."""
        current_balance = locked_pass.cashback_balance or Decimal(
            str(locked_pass.pass_data.get("cashback_balance", "0"))
        )

        if context.amount > current_balance:
            return PassStateMutation(
                is_valid=False,
                violations=["insufficient_cashback_balance"],
            )

        new_balance = current_balance - context.amount
        new_balance_str = str(new_balance)

        updates = {
            "cashback_balance": new_balance_str,
        }

        return PassStateMutation(
            is_valid=True,
            updates=updates,
            transaction_type=TransactionType.CASHBACK_REDEEMED,
            transaction_amount=context.amount,
            reward_description=get_message("TRANSACTION_CASHBACK_REDEEMED").format(amount=str(context.amount)),
            new_balance=new_balance_str,
        )

    def _resolve_intent(self, context: RedemptionContext) -> str:
        """Return the resolved intent for cashback redeem."""
        return "redeem"
