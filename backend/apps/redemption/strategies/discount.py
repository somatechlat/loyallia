"""
Loyallia Redemption Engine — Discount Tier Tracking Strategy

Tracks lifetime spend at the business and re-evaluates the customer's
applicable discount tier based on card metadata thresholds.
"""

import logging
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import TYPE_CHECKING

from apps.transactions.models import TransactionType

from ..context import RedemptionContext
from ..result import RedemptionResult
from .base import BaseRedemptionStrategy, PassStateMutation

if TYPE_CHECKING:
    from apps.customers.models import CustomerPass

logger = logging.getLogger(__name__)


@dataclass
class DiscountStateMutation(PassStateMutation):
    """Mutation descriptor for discount tier evaluation."""

    tier_name: str = ""
    discount_percentage: int = 0


class DiscountTrackStrategy(BaseRedemptionStrategy):
    """Track spend and update discount tier for a discount card.

    Card metadata must contain a ``tiers`` list:
        [
            {"tier_name": "Bronze", "threshold": 0,   "discount_percentage": 5},
            {"tier_name": "Silver", "threshold": 100, "discount_percentage": 10},
            ...
        ]

    The highest tier whose threshold is <= total spend is applied.
    """

    def __init__(self):
        super().__init__(card_type="discount")

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def validate(self, context: RedemptionContext) -> list[str]:
        """Ensure the card has a valid tiers configuration."""
        tiers = context.card.get_metadata_field("tiers", [])
        if not isinstance(tiers, list) or not tiers:
            return ["invalid_card_configuration"]
        return []

    # ------------------------------------------------------------------
    # Mutation
    # ------------------------------------------------------------------

    def _compute_mutation(self, locked_pass: "CustomerPass", context: RedemptionContext) -> DiscountStateMutation:
        tiers = context.card.get_metadata_field("tiers", [])

        # Current lifetime spend (stored as string in JSONB)
        try:
            current_total = Decimal(str(locked_pass.pass_data.get("total_spent_at_business", "0")))
        except (InvalidOperation, TypeError, ValueError):
            logger.warning(
                "Invalid total_spent_at_business for pass %s, resetting to 0",
                locked_pass.pk,
            )
            current_total = Decimal("0")

        new_total = current_total + context.amount

        # Find highest applicable tier
        applicable_tier = None
        try:
            sorted_tiers = sorted(
                tiers,
                key=lambda t: Decimal(str(t.get("threshold", 0))),
            )
            for tier in sorted_tiers:
                threshold = Decimal(str(tier.get("threshold", 0)))
                if new_total >= threshold:
                    applicable_tier = tier
        except (InvalidOperation, TypeError, ValueError):
            logger.exception("Tier parsing failed for card %s", context.card.pk)
            return DiscountStateMutation(
                is_valid=False,
                violations=["tier_calculation_error"],
                transaction_type=TransactionType.MEMBERSHIP_VALIDATED,
            )

        discount_pct = 0
        tier_name = ""
        if applicable_tier:
            discount_pct = applicable_tier.get("discount_percentage", 0)
            tier_name = applicable_tier.get("tier_name", "")

        updates = {
            "total_spent_at_business": str(new_total),
            "current_discount_percentage": discount_pct,
            "current_tier_name": tier_name,
        }

        return DiscountStateMutation(
            is_valid=True,
            updates=updates,
            transaction_type=TransactionType.MEMBERSHIP_VALIDATED,
            transaction_amount=context.amount,
            transaction_quantity=context.quantity,
            tier_name=tier_name,
            discount_percentage=discount_pct,
            new_balance=str(new_total),
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
        if isinstance(mutation, DiscountStateMutation):
            tier_name = mutation.tier_name
            discount_pct = mutation.discount_percentage
        else:
            tier_name = ""
            discount_pct = Decimal("0")

        return RedemptionResult(
            success=True,
            transaction_id=str(txn.id) if txn else None,
            transaction_type=mutation.transaction_type,
            pass_updated=True,
            reward_earned=False,
            reward_description="",
            message_code="TRANSACTION_RECORDED",
            intent_resolved=self._resolve_intent(context),
            new_balance=mutation.new_balance,
            new_state={
                "tier_name": tier_name,
                "discount_percentage": discount_pct,
            },
        )

    def _resolve_intent(self, context) -> str:
        return "track"
