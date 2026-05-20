"""
Loyallia Redemption Engine — Corporate Discount Validation Strategy

Minimal read-only validation for corporate discount passes.
Active passes are always considered valid.
"""

import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING

from apps.transactions.models import TransactionType

from ..context import RedemptionContext
from ..result import RedemptionResult
from .base import BaseRedemptionStrategy, PassStateMutation

if TYPE_CHECKING:
    from apps.customers.models import CustomerPass

logger = logging.getLogger(__name__)


@dataclass
class CorporateStateMutation(PassStateMutation):
    """Mutation descriptor for corporate validation (no DB state changes)."""

    membership_valid: bool = True
    reason: str = ""


class CorporateValidateStrategy(BaseRedemptionStrategy):
    """Validate a corporate discount pass.

    Checks:
        1. ``customer_pass.is_active``
        2. ``card.is_active``

    The pass state is never mutated; only a validation transaction is recorded.
    """

    def __init__(self):
        super().__init__(card_type="corporate_discount")

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def validate(self, context: RedemptionContext) -> list[str]:
        """No hard pre-lock violations; activation status is evaluated inside the atomic block."""
        return []

    # ------------------------------------------------------------------
    # Mutation
    # ------------------------------------------------------------------

    def _compute_mutation(self, locked_pass: "CustomerPass", context: RedemptionContext) -> CorporateStateMutation:
        membership_valid = True
        reason = ""

        if not locked_pass.is_active:
            membership_valid = False
            reason = "pass_inactive"
        elif not context.card.is_active:
            membership_valid = False
            reason = "card_inactive"

        return CorporateStateMutation(
            is_valid=True,
            transaction_type=TransactionType.CORPORATE_VALIDATED,
            membership_valid=membership_valid,
            reason=reason,
        )

    def _apply_mutation(self, locked_pass: "CustomerPass", mutation: PassStateMutation) -> None:
        """Corporate validation is read-only; no pass state is modified."""
        pass

    # ------------------------------------------------------------------
    # Result builders
    # ------------------------------------------------------------------

    def _build_success_result(
        self,
        txn,
        mutation: PassStateMutation,
        context: RedemptionContext,
    ) -> RedemptionResult:
        if isinstance(mutation, CorporateStateMutation):
            membership_valid = mutation.membership_valid
            reason = mutation.reason
        else:
            membership_valid = True
            reason = ""

        return RedemptionResult(
            success=True,
            transaction_id=str(txn.id) if txn else None,
            transaction_type=mutation.transaction_type,
            pass_updated=False,
            reward_earned=False,
            reward_description="",
            message_code="TRANSACTION_RECORDED",
            intent_resolved=self._resolve_intent(context),
            new_state={
                "membership_valid": membership_valid,
                "reason": reason,
            },
        )

    def _resolve_intent(self, context) -> str:
        return "validate"
