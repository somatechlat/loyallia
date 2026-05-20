"""
Loyallia Redemption Engine — Base Strategy (Template Method Pattern)

Defines the algorithm skeleton for all redemption strategies.
Subclasses implement card-type-specific validation, mutation, and side effects.
"""

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from typing import TYPE_CHECKING

from django.db import transaction as db_transaction

from apps.transactions.models import Transaction

from ..context import RedemptionContext
from ..result import RedemptionResult

if TYPE_CHECKING:
    from apps.customers.models import CustomerPass

logger = logging.getLogger(__name__)


@dataclass
class PassStateMutation:
    """Describes what changes to apply to a CustomerPass."""

    is_valid: bool = True
    violations: list[str] = None  # type: ignore[assignment]
    updates: dict = None  # type: ignore[assignment]
    transaction_type: str = ""
    transaction_amount: Decimal | None = None
    transaction_quantity: int | None = None
    reward_earned: bool = False
    reward_description: str = ""
    new_balance: str | None = None
    remaining_uses: int | None = None

    def __post_init__(self):
        if self.violations is None:
            self.violations = []
        if self.updates is None:
            self.updates = {}


class BaseRedemptionStrategy(ABC):
    """Template method base for all redemption strategies.

    Algorithm:
        1. validate(context)   → check rules without locking
        2. _lock_pass()        → select_for_update()
        3. _compute_mutation() → determine state changes
        4. _apply_mutation()   → write to database
        5. _record_transaction() → create Transaction row
        6. _update_customer_stats() → F() expression increment
        7. _build_success_result() → return RedemptionResult
    """

    def __init__(self, card_type: str):
        self.card_type = card_type

    def execute(self, context: RedemptionContext) -> RedemptionResult:
        """Execute the full redemption flow (Template Method)."""
        # Step 1: Pre-lock validation (fast fail)
        violations = self.validate(context)
        if violations:
            return self._build_denied_result(violations)

        # Step 2-6: Atomic block
        with db_transaction.atomic():
            locked_pass = self._lock_pass(context.customer_pass)
            mutation = self._compute_mutation(locked_pass, context)

            if not mutation.is_valid:
                return self._build_denied_result(mutation.violations)

            self._apply_mutation(locked_pass, mutation)
            txn = self._record_transaction(context, mutation, locked_pass)
            self._update_customer_stats(context, txn)

        # Step 7: Build success result
        return self._build_success_result(txn, mutation, context)

    @abstractmethod
    def validate(self, context: RedemptionContext) -> list[str]:
        """Validate the redemption request BEFORE acquiring a lock.

        Return a list of violation reason codes. Empty list = valid.
        This is called outside the atomic block for speed.
        """
        ...

    def _lock_pass(self, customer_pass: "CustomerPass") -> "CustomerPass":
        """Acquire a pessimistic lock on the pass row."""
        from apps.customers.models import CustomerPass as CPModel

        return CPModel.objects.select_for_update().get(pk=customer_pass.pk)

    @abstractmethod
    def _compute_mutation(
        self, locked_pass: "CustomerPass", context: RedemptionContext
    ) -> PassStateMutation:
        """Determine what state changes to apply.

        Called inside the atomic block with the locked pass.
        """
        ...

    def _apply_mutation(
        self, locked_pass: "CustomerPass", mutation: PassStateMutation
    ) -> None:
        """Apply computed state changes to the locked pass."""
        from django.utils import timezone

        if mutation.updates:
            locked_pass.pass_data.update(mutation.updates)
            # Map known pass_data keys to typed columns
            if "stamp_count" in mutation.updates:
                locked_pass.stamp_count = mutation.updates["stamp_count"]
            if "cashback_balance" in mutation.updates:
                locked_pass.cashback_balance = Decimal(
                    str(mutation.updates["cashback_balance"])
                )
            if "gift_balance" in mutation.updates:
                locked_pass.gift_balance = Decimal(
                    str(mutation.updates["gift_balance"])
                )
            if "multipass_remaining" in mutation.updates:
                locked_pass.multipass_remaining = mutation.updates[
                    "multipass_remaining"
                ]
            if "referral_count" in mutation.updates:
                locked_pass.referral_count = mutation.updates["referral_count"]
            if "coupon_redemption_count" in mutation.updates:
                locked_pass.coupon_redemption_count = mutation.updates[
                    "coupon_redemption_count"
                ]
            if "lifecycle_state" in mutation.updates:
                locked_pass.lifecycle_state = mutation.updates["lifecycle_state"]

            locked_pass.last_redemption_at = timezone.now()
            locked_pass.save(
                update_fields=[
                    "pass_data",
                    "stamp_count",
                    "cashback_balance",
                    "gift_balance",
                    "multipass_remaining",
                    "referral_count",
                    "coupon_redemption_count",
                    "lifecycle_state",
                    "last_redemption_at",
                    "last_updated",
                ]
            )

    def _record_transaction(
        self,
        context: RedemptionContext,
        mutation: PassStateMutation,
        locked_pass: "CustomerPass",
    ) -> Transaction | None:
        """Create a Transaction record for a successful redemption."""
        if not mutation.transaction_type:
            return None

        return Transaction.objects.create(
            tenant=context.tenant,
            customer_pass=locked_pass,
            staff_id=context.staff_id,
            location_id=context.location_id,
            transaction_type=mutation.transaction_type,
            amount=mutation.transaction_amount,
            quantity=mutation.transaction_quantity,
            notes=context.notes,
            is_remote=context.is_remote,
            idempotency_key=context.idempotency_key,
            denial_reason="",
            rules_evaluated=context.rules_evaluated or [],
        )

    def _update_customer_stats(
        self, context: RedemptionContext, txn: Transaction | None
    ) -> None:
        """Update customer aggregate stats via F() expressions."""
        from django.db.models import F

        from apps.customers.models import Customer

        Customer.objects.filter(pk=context.customer_pass.customer.pk).update(
            total_visits=F("total_visits") + 1,
            total_spent=F("total_spent") + context.amount,
            last_visit=txn.created_at if txn else None,
        )

    def _build_denied_result(self, violations: list[str]) -> RedemptionResult:
        """Build a result for a denied redemption."""
        return RedemptionResult(
            success=False,
            denial_reasons=violations,
            message_code="TRANSACTION_DENIED",
        )

    def _build_success_result(
        self,
        txn: Transaction | None,
        mutation: PassStateMutation,
        context: RedemptionContext,
    ) -> RedemptionResult:
        """Build a result for a successful redemption."""
        return RedemptionResult(
            success=True,
            transaction_id=str(txn.id) if txn else None,
            transaction_type=mutation.transaction_type,
            pass_updated=True,
            reward_earned=mutation.reward_earned,
            reward_description=mutation.reward_description,
            message_code="TRANSACTION_RECORDED",
            intent_resolved=self._resolve_intent(context),
            new_balance=mutation.new_balance,
            remaining_uses=mutation.remaining_uses,
            new_state={},
        )

    def _resolve_intent(self, context: RedemptionContext) -> str:
        """Return the resolved intent (earn/redeem/none)."""
        return "none"
