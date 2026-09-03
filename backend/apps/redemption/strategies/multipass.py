"""
Loyallia Redemption Engine — Multipass Redemption Strategy

Consumes one use from a multipass bundle.  Validates that at least one use
remains and decrements the typed ``multipass_remaining`` column (synced to
``pass_data`` by the base ``_apply_mutation``).
"""

import logging

from apps.transactions.models import TransactionType

from ..context import RedemptionContext
from .base import BaseRedemptionStrategy, PassStateMutation

logger = logging.getLogger(__name__)


class MultipassRedeemStrategy(BaseRedemptionStrategy):
    """Redemption strategy for multipass ("multipass") cards."""

    def __init__(self) -> None:
        """Initialize the strategy for multipass cards."""
        super().__init__("multipass")

    # ------------------------------------------------------------------
    # Pre-lock validation (fast-fail)
    # ------------------------------------------------------------------

    def validate(self, context: RedemptionContext) -> list[str]:
        """Validate that the pass has at least one remaining use."""
        current_remaining = getattr(
            context.customer_pass, "multipass_remaining", None
        ) or context.customer_pass.pass_data.get("multipass_remaining", 0)

        if current_remaining <= 0:
            return ["insufficient_balance"]
        return []

    # ------------------------------------------------------------------
    # Post-lock mutation
    # ------------------------------------------------------------------

    def _compute_mutation(self, locked_pass, context: RedemptionContext) -> PassStateMutation:
        """Compute the use deduction after acquiring the row lock."""
        current_remaining = locked_pass.multipass_remaining or locked_pass.pass_data.get("multipass_remaining", 0)

        if current_remaining <= 0:
            return PassStateMutation(
                is_valid=False,
                violations=["insufficient_balance"],
            )

        new_remaining = current_remaining - 1

        return PassStateMutation(
            is_valid=True,
            updates={"multipass_remaining": new_remaining},
            transaction_type=TransactionType.MULTIPASS_USED,
            transaction_quantity=1,
            remaining_uses=new_remaining,
        )

    def _resolve_intent(self, context) -> str:
        """Return the resolved intent for multipass cards."""
        return "redeem"
