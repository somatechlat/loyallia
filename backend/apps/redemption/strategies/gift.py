"""
Loyallia Redemption Engine — Gift Certificate Redemption Strategy

Deducts a requested amount from the customer's gift-card balance.  Performs a
pre-lock balance check for fast failure and a definitive post-lock check to
avoid race conditions.
"""

import logging
from decimal import Decimal

from apps.transactions.models import TransactionType

from ..context import RedemptionContext
from .base import BaseRedemptionStrategy, PassStateMutation

logger = logging.getLogger(__name__)


class GiftRedeemStrategy(BaseRedemptionStrategy):
    """Redemption strategy for gift certificate ("gift_certificate") cards."""

    def __init__(self) -> None:
        super().__init__("gift_certificate")

    # ------------------------------------------------------------------
    # Pre-lock validation (fast-fail)
    # ------------------------------------------------------------------

    def validate(self, context: RedemptionContext) -> list[str]:
        """Validate that the pass holds enough balance to cover ``context.amount``."""
        current_balance = getattr(
            context.customer_pass, "gift_balance", None
        ) or Decimal(str(context.customer_pass.pass_data.get("gift_balance", "0")))

        if current_balance < context.amount:
            return ["insufficient_balance"]
        return []

    # ------------------------------------------------------------------
    # Post-lock mutation
    # ------------------------------------------------------------------

    def _compute_mutation(
        self, locked_pass, context: RedemptionContext
    ) -> PassStateMutation:
        """Compute the balance deduction after acquiring the row lock.

        The balance is re-read from the locked row so that concurrent
        redemptions cannot over-draw the card.
        """
        current_balance = locked_pass.gift_balance or Decimal(
            str(locked_pass.pass_data.get("gift_balance", "0"))
        )

        if current_balance < context.amount:
            return PassStateMutation(
                is_valid=False,
                violations=["insufficient_balance"],
            )

        new_balance = current_balance - context.amount

        return PassStateMutation(
            is_valid=True,
            updates={"gift_balance": str(new_balance)},
            transaction_type=TransactionType.GIFT_REDEEMED,
            transaction_amount=context.amount,
            new_balance=str(new_balance),
        )

    def _resolve_intent(self, context) -> str:
        return "redeem"
