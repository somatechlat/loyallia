"""
Loyallia Redemption Engine — Membership Validation Strategy

Validates VIP and affiliate membership passes by checking expiry dates
and activation status. Does not mutate pass state.
"""

import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING

from django.utils import timezone

from apps.transactions.models import TransactionType

from ..context import RedemptionContext
from ..result import RedemptionResult
from .base import BaseRedemptionStrategy, PassStateMutation

if TYPE_CHECKING:
    from apps.customers.models import CustomerPass

logger = logging.getLogger(__name__)


@dataclass
class MembershipStateMutation(PassStateMutation):
    """Mutation descriptor for membership validation (no DB state changes)."""

    membership_valid: bool = True
    reason: str = ""
    membership_expiry: str | None = None


class MembershipValidateStrategy(BaseRedemptionStrategy):
    """Validate a VIP or affiliate membership pass.

    Checks:
        1. ``customer_pass.is_active``
        2. ``card.is_active``
        3. ``membership_expiry`` vs ``timezone.now()``

    The pass state is never mutated; only a validation transaction is recorded.
    """

    def __init__(self):
        """Initialize the strategy for VIP/affiliate membership cards."""
        super().__init__(card_type="vip_membership")

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def validate(self, context: RedemptionContext) -> list[str]:
        """No hard pre-lock violations; business rules are evaluated inside the atomic block."""
        return []

    # ------------------------------------------------------------------
    # Mutation
    # ------------------------------------------------------------------

    def _compute_mutation(self, locked_pass: "CustomerPass", context: RedemptionContext) -> MembershipStateMutation:
        membership_valid = True
        reason = ""

        if not locked_pass.is_active:
            membership_valid = False
            reason = "pass_inactive"
        elif not context.card.is_active:
            membership_valid = False
            reason = "card_inactive"
        else:
            expiry = locked_pass.membership_expiry
            if expiry:
                now = timezone.now()
                if expiry.tzinfo is None:
                    expiry = expiry.replace(tzinfo=now.tzinfo)
                if now > expiry:
                    membership_valid = False
                    reason = "membership_expired"

        expiry_str = locked_pass.pass_data.get("membership_expiry")

        return MembershipStateMutation(
            is_valid=True,
            transaction_type=TransactionType.MEMBERSHIP_VALIDATED,
            membership_valid=membership_valid,
            reason=reason,
            membership_expiry=expiry_str,
        )

    def _apply_mutation(self, locked_pass: "CustomerPass", mutation: PassStateMutation) -> None:
        """Membership validation is read-only; no pass state is modified."""
        logger.debug("Membership validation is read-only; no pass state modified.")

    # ------------------------------------------------------------------
    # Result builders
    # ------------------------------------------------------------------

    def _build_success_result(
        self,
        txn,
        mutation: PassStateMutation,
        context: RedemptionContext,
    ) -> RedemptionResult:
        if isinstance(mutation, MembershipStateMutation):
            membership_valid = mutation.membership_valid
            reason = mutation.reason
            expiry = mutation.membership_expiry
        else:
            membership_valid = True
            reason = ""
            expiry = None

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
                "membership_expiry": expiry,
            },
        )

    def _resolve_intent(self, context) -> str:
        """Return the resolved intent for membership passes."""
        return "validate"
