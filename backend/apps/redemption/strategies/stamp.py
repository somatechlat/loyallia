"""
Loyallia Redemption Engine — Stamp Card Strategies

Implements the earn and redeem flows for stamp-based loyalty cards.
A customer collects stamps until reaching a configurable threshold,
at which point a reward becomes available for redemption.
"""

import logging
from typing import TYPE_CHECKING

from apps.customers.models import CustomerPass
from apps.transactions.models import TransactionType
from common.messages import get_message

from ..context import RedemptionContext
from .base import BaseRedemptionStrategy, PassStateMutation

if TYPE_CHECKING:
    from apps.customers.models import CustomerPass as CustomerPassType

logger = logging.getLogger(__name__)


class StampEarnStrategy(BaseRedemptionStrategy):
    """Earn stamps toward a reward on a stamp card.

    Each scan adds ``quantity`` stamps. When the cumulative count crosses
    ``stamps_required`` (default 10) the pass transitions to
    ``REWARD_READY`` and the counter resets to the remainder.
    """

    def __init__(self) -> None:
        super().__init__(card_type="stamp")

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def validate(self, context: RedemptionContext) -> list[str]:
        violations: list[str] = []
        if context.quantity <= 0:
            violations.append("invalid_quantity")
        return violations

    # ------------------------------------------------------------------
    # Mutation
    # ------------------------------------------------------------------

    def _compute_mutation(self, locked_pass: "CustomerPassType", context: RedemptionContext) -> PassStateMutation:
        metadata = context.card.metadata or {}

        try:
            stamps_required = int(metadata.get("stamps_required", 10))
            if stamps_required <= 0:
                stamps_required = 10
        except (TypeError, ValueError):
            stamps_required = 10

        current_stamps = locked_pass.stamp_count or locked_pass.pass_data.get("stamp_count", 0)
        added = context.quantity
        new_stamps = current_stamps + added

        updates: dict = {}
        reward_earned = False
        reward_description = ""

        if new_stamps >= stamps_required:
            reward_earned = True
            reward_description = get_message("TRANSACTION_REWARD_READY")
            updates["reward_ready"] = True
            updates["lifecycle_state"] = CustomerPass.LifecycleState.REWARD_READY
            new_stamps = new_stamps % stamps_required

        updates["stamp_count"] = new_stamps

        return PassStateMutation(
            is_valid=True,
            updates=updates,
            transaction_type=TransactionType.STAMP_EARNED,
            transaction_quantity=added,
            reward_earned=reward_earned,
            reward_description=reward_description,
            new_balance=str(new_stamps),
        )

    # ------------------------------------------------------------------
    # Intent resolution
    # ------------------------------------------------------------------

    def _resolve_intent(self, context: RedemptionContext) -> str:
        return "earn"


class StampRedeemStrategy(BaseRedemptionStrategy):
    """Redeem a completed stamp reward.

    The pass must be in ``REWARD_READY`` state (either via the typed
    ``lifecycle_state`` column or the legacy ``reward_ready`` flag in
    ``pass_data``). On success the reward is consumed and the pass
    returns to ``ACTIVE``.
    """

    def __init__(self) -> None:
        super().__init__(card_type="stamp")

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def validate(self, context: RedemptionContext) -> list[str]:
        violations: list[str] = []
        if not self._is_reward_ready(context.customer_pass):
            violations.append("reward_not_ready")
        return violations

    # ------------------------------------------------------------------
    # Mutation
    # ------------------------------------------------------------------

    def _compute_mutation(self, locked_pass: "CustomerPassType", context: RedemptionContext) -> PassStateMutation:
        if not self._is_reward_ready(locked_pass):
            return PassStateMutation(
                is_valid=False,
                violations=["reward_not_ready"],
            )

        updates = {
            "reward_ready": False,
            "lifecycle_state": CustomerPass.LifecycleState.ACTIVE,
        }

        return PassStateMutation(
            is_valid=True,
            updates=updates,
            transaction_type=TransactionType.STAMP_REDEEMED,
            reward_description=get_message("TRANSACTION_REWARD_REDEEMED"),
            new_balance=str(locked_pass.stamp_count),
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _is_reward_ready(customer_pass: "CustomerPassType") -> bool:
        return customer_pass.lifecycle_state == CustomerPass.LifecycleState.REWARD_READY or customer_pass.pass_data.get(
            "reward_ready", False
        )

    def _resolve_intent(self, context: RedemptionContext) -> str:
        return "redeem"
