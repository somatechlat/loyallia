"""
Loyallia Redemption Engine — Referral Tracking Strategy

Increments the referral counter for a customer up to a configurable per-customer
limit defined in card metadata.
"""

import logging
from typing import TYPE_CHECKING

from apps.transactions.models import TransactionType

from ..context import RedemptionContext
from ..result import RedemptionResult
from .base import BaseRedemptionStrategy, PassStateMutation

if TYPE_CHECKING:
    from apps.customers.models import CustomerPass

logger = logging.getLogger(__name__)


class ReferralTrackStrategy(BaseRedemptionStrategy):
    """Track a successful referral for a referral pass.

    Card metadata:
        ``max_referrals_per_customer`` — hard cap on referrals per customer.

    Denies with ``usage_limit_exceeded`` when the cap is reached.
    """

    def __init__(self):
        super().__init__(card_type="referral_pass")

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def validate(self, context: RedemptionContext) -> list[str]:
        """Pre-lock check against the referral limit."""
        max_referrals = context.card.get_metadata_field("max_referrals_per_customer", 0)
        current_count = context.customer_pass.referral_count_val

        if max_referrals > 0 and current_count >= max_referrals:
            return ["usage_limit_exceeded"]
        return []

    # ------------------------------------------------------------------
    # Mutation
    # ------------------------------------------------------------------

    def _compute_mutation(
        self, locked_pass: "CustomerPass", context: RedemptionContext
    ) -> PassStateMutation:
        # Re-evaluate under the lock in case a concurrent request changed the count
        max_referrals = context.card.get_metadata_field("max_referrals_per_customer", 0)
        current_count = locked_pass.referral_count_val

        if max_referrals > 0 and current_count >= max_referrals:
            return PassStateMutation(
                is_valid=False,
                violations=["usage_limit_exceeded"],
                transaction_type=TransactionType.REFERRAL_REWARD,
            )

        new_count = current_count + 1

        return PassStateMutation(
            is_valid=True,
            updates={"referral_count": new_count},
            transaction_type=TransactionType.REFERRAL_REWARD,
            transaction_quantity=1,
            remaining_uses=max_referrals - new_count if max_referrals > 0 else None,
        )

    # ------------------------------------------------------------------
    # Result builders
    # ------------------------------------------------------------------

    def _build_success_result(
        self,
        txn,
        mutation: PassStateMutation,
        context: RedemptionContext,
    ) -> RedemptionResult:
        new_count = mutation.updates.get("referral_count", 0) if mutation.updates else 0

        return RedemptionResult(
            success=True,
            transaction_id=str(txn.id) if txn else None,
            transaction_type=mutation.transaction_type,
            pass_updated=True,
            reward_earned=False,
            reward_description="",
            message_code="TRANSACTION_RECORDED",
            intent_resolved=self._resolve_intent(context),
            remaining_uses=mutation.remaining_uses,
            new_state={
                "new_referral_count": new_count,
                "limit_reached": False,
            },
        )

    def _resolve_intent(self, context) -> str:
        return "track"
