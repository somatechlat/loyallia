"""
Loyallia Redemption Engine — Corporate Discount Validation Strategy

Validation for corporate discount passes. Active passes are valid and get a
visible ``last_message`` so the wallet pass diff is non-empty. An inactive
pass/card is a denial — never a SUCCESS transaction.
"""

import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING

from apps.transactions.models import TransactionType
from common.messages import get_message

from ..context import RedemptionContext
from ..result import RedemptionResult
from .base import BaseRedemptionStrategy, PassStateMutation

if TYPE_CHECKING:
    from apps.customers.models import CustomerPass

logger = logging.getLogger(__name__)


@dataclass
class CorporateStateMutation(PassStateMutation):
    """Mutation descriptor for corporate validation."""

    membership_valid: bool = True
    reason: str = ""


class CorporateValidateStrategy(BaseRedemptionStrategy):
    """Validate a corporate discount pass.

    Checks:
        1. ``customer_pass.is_active``
        2. ``card.is_active``

    A successful validation writes ``last_message`` (notify-on-validate).
    An inactive pass/card returns ``is_valid=False`` — no SUCCESS
    transaction is recorded.
    """

    def __init__(self):
        """Initialize the strategy for corporate discount cards."""
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

    def _compute_mutation(
        self, locked_pass: "CustomerPass", context: RedemptionContext
    ) -> CorporateStateMutation:
        membership_valid = True
        reason = ""

        if not locked_pass.is_active:
            membership_valid = False
            reason = "pass_inactive"
        elif not context.card.is_active:
            membership_valid = False
            reason = "card_inactive"

        if not membership_valid:
            return CorporateStateMutation(
                is_valid=False,
                violations=[reason],
                membership_valid=False,
                reason=reason,
            )

        return CorporateStateMutation(
            is_valid=True,
            updates={"last_message": get_message("TRANSACTION_CORPORATE_VALIDATED")},
            transaction_type=TransactionType.CORPORATE_VALIDATED,
            membership_valid=True,
            reason="",
        )

    def _apply_mutation(
        self, locked_pass: "CustomerPass", mutation: PassStateMutation
    ) -> None:
        """Write only the visible last_message; corporate state stays read-only."""
        from django.utils import timezone as django_timezone

        updates = mutation.updates or {}
        if not updates:
            return
        locked_pass.pass_data.update(updates)
        locked_pass.last_updated = django_timezone.now()
        locked_pass.save(update_fields=["pass_data", "last_updated"])

    # ------------------------------------------------------------------
    # Result builders
    # ------------------------------------------------------------------

    def _build_success_result(
        self,
        txn,
        mutation: PassStateMutation,
        context: RedemptionContext,
    ) -> RedemptionResult:
        result = super()._build_success_result(txn, mutation, context)
        if isinstance(mutation, CorporateStateMutation):
            result.new_state = {
                **result.new_state,
                "membership_valid": mutation.membership_valid,
                "reason": mutation.reason,
            }
        return result

    def _resolve_intent(self, context) -> str:
        """Return the resolved intent for corporate passes."""
        return "validate"
