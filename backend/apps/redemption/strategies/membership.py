"""
Loyallia Redemption Engine — Membership Validation Strategy

Validates VIP and affiliate membership passes by checking expiry dates
and activation status. On success a visible ``last_message`` is written so
the wallet pass diff is non-empty and Apple changeMessage can fire. An
invalid membership is a denial — never a SUCCESS transaction.
"""

import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING

from django.utils import timezone

from apps.transactions.models import TransactionType
from common.messages import get_message

from ..context import RedemptionContext
from ..result import RedemptionResult
from .base import BaseRedemptionStrategy, PassStateMutation

if TYPE_CHECKING:
    from apps.customers.models import CustomerPass

logger = logging.getLogger(__name__)


@dataclass
class MembershipStateMutation(PassStateMutation):
    """Mutation descriptor for membership validation."""

    membership_valid: bool = True
    reason: str = ""
    membership_expiry: str | None = None


class MembershipValidateStrategy(BaseRedemptionStrategy):
    """Validate a VIP or affiliate membership pass.

    Checks:
        1. ``customer_pass.is_active``
        2. ``card.is_active``
        3. ``membership_expiry`` vs ``timezone.now()``

    A successful validation writes ``last_message`` (notify-on-validate) so
    the pass.json diff is visible. An expired/inactive membership returns
    ``is_valid=False`` — no SUCCESS transaction is recorded.
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

    def _compute_mutation(
        self, locked_pass: "CustomerPass", context: RedemptionContext
    ) -> MembershipStateMutation:
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

        if not membership_valid:
            # Honesty rule: an invalid membership is a denial, never a
            # SUCCESS transaction.
            return MembershipStateMutation(
                is_valid=False,
                violations=[reason],
                membership_valid=False,
                reason=reason,
                membership_expiry=expiry_str,
            )

        return MembershipStateMutation(
            is_valid=True,
            updates={"last_message": get_message("TRANSACTION_MEMBERSHIP_VALIDATED")},
            transaction_type=TransactionType.MEMBERSHIP_VALIDATED,
            membership_valid=True,
            reason="",
            membership_expiry=expiry_str,
        )

    def _apply_mutation(
        self, locked_pass: "CustomerPass", mutation: PassStateMutation
    ) -> None:
        """Write only the visible last_message; membership state stays read-only."""
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
        if isinstance(mutation, MembershipStateMutation):
            result.new_state = {
                **result.new_state,
                "membership_valid": mutation.membership_valid,
                "reason": mutation.reason,
                "membership_expiry": mutation.membership_expiry,
            }
        return result

    def _resolve_intent(self, context) -> str:
        """Return the resolved intent for membership passes."""
        return "validate"
