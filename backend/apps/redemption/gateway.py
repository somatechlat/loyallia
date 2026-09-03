"""
Loyallia Redemption Engine — Redemption Gateway

Main orchestrator that coordinates:
  1. Idempotency check
  2. Context assembly
  3. Rule validation
  4. Strategy resolution + execution
  5. Result caching
  6. Denied-transaction audit logging
  7. Async side effects (analytics, automation, wallet update)

Usage::

    from apps.redemption.gateway import RedemptionGateway
    from apps.redemption.command import RedemptionCommand

    gateway = RedemptionGateway()
    result = gateway.process(command)
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from django.db import transaction as db_transaction

from common.messages import get_message

from .command import RedemptionCommand
from .context import RedemptionContext
from .idempotency import check as idempotency_check
from .idempotency import store as idempotency_store
from .result import RedemptionResult
from .rules import (
    CooldownValidator,
    LocationValidator,
    MinPurchaseValidator,
    RuleViolation,
    StaffRoleValidator,
    TimeWindowValidator,
    UsageLimitValidator,
)
from .strategies.registry import get_strategy

if TYPE_CHECKING:
    from apps.tenants.models import Tenant

logger = logging.getLogger(__name__)

# Ordered list of rule validators applied to every redemption.
_DEFAULT_VALIDATORS = [
    UsageLimitValidator(),
    TimeWindowValidator(),
    CooldownValidator(),
    LocationValidator(),
    MinPurchaseValidator(),
    StaffRoleValidator(),
]


class RedemptionGateway:
    """High-level facade for the redemption engine."""

    def __init__(self, validators: list | None = None):
        """Initialize the gateway with optional custom validators."""
        self.validators = validators or list(_DEFAULT_VALIDATORS)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def process(self, command: RedemptionCommand, tenant: Tenant) -> RedemptionResult:
        """Process a redemption command end-to-end.

        Args:
            command: Immutable redemption request.
            tenant: The tenant scope (from request).

        Returns:
            RedemptionResult with success/failure details.
        """
        idempotency_key = command.resolved_key()

        # Step 1: Idempotency check
        cached = idempotency_check(str(tenant.id), idempotency_key)
        if cached is not None:
            logger.info("Idempotency hit for tenant=%s key=%s", tenant.id, idempotency_key)
            return RedemptionResult(**cached)

        # Step 2: Lookup pass (tenant-scoped)
        from apps.customers.models import CustomerPass

        try:
            customer_pass = CustomerPass.objects.select_related("customer", "card").get(
                qr_code=command.qr_code, is_active=True, card__tenant=tenant
            )
        except CustomerPass.DoesNotExist:
            return self._deny("pass_not_found", get_message("PASS_NOT_FOUND"))

        # Step 3: Build context
        context = RedemptionContext(
            tenant=tenant,
            customer_pass=customer_pass,
            card=customer_pass.card,
            amount=command.amount,
            quantity=command.quantity,
            staff_id=command.staff_id,
            location_id=command.location_id,
            scanned_at=command.scanned_at,
            intent=command.intent,
            notes=command.notes,
            is_remote=command.is_remote,
        )

        # Step 4: Resolve intent if AUTO
        resolved_intent = self._resolve_intent(context)
        context.intent = resolved_intent

        # Step 5: Run rule validators
        rules = customer_pass.card.redemption_rules or {}
        rule_violations: list[RuleViolation] = []
        for validator in self.validators:
            rule_violations.extend(validator.validate(context, rules))

        if rule_violations:
            result = self._deny_from_violations(rule_violations)
            self._record_denied_transaction(context, result, idempotency_key, rules)
            return result

        # Audit fields for successful transactions
        context.idempotency_key = idempotency_key
        context.rules_evaluated = []  # rules passed; empty = all validators succeeded

        # Step 6: Resolve and execute strategy
        strategy = self._resolve_strategy(context)
        if strategy is None:
            return self._deny("no_strategy", "No strategy available for this card type and intent.")

        result = strategy.execute(context)

        # Step 7: Record idempotency + audit
        if result.success:
            idempotency_store(str(tenant.id), idempotency_key, result)

        return result

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _resolve_intent(self, context: RedemptionContext) -> str:
        """AUTO intent resolution based on card type and pass state."""
        if context.intent != "auto":
            return context.intent

        card_type = context.card_type

        # Stamp: earn if not reward_ready, else redeem
        if card_type == "stamp":
            from apps.customers.models import CustomerPass

            is_ready = (
                context.customer_pass.lifecycle_state == CustomerPass.LifecycleState.REWARD_READY
                or context.customer_pass.pass_data.get("reward_ready", False)
            )
            return "redeem" if is_ready else "earn"

        # Cashback: earn by default (redeem requires explicit intent)
        if card_type == "cashback":
            return "earn"

        # Everything else: redeem/validate
        if card_type in ("vip_membership", "corporate_discount", "affiliate"):
            return "validate"

        return "redeem"

    def _resolve_strategy(self, context: RedemptionContext):
        """Resolve strategy from registry."""
        try:
            return get_strategy(context.card_type, context.intent)
        except ValueError:
            return None

    def _deny(self, code: str, message: str) -> RedemptionResult:
        """Build a simple denial result from a single reason code."""
        return RedemptionResult.from_denial(reasons=[code])

    _RULE_TO_DENIAL: dict[str, str] = {
        "usage_limit_per_customer": "usage_limit_exceeded",
        "usage_limit_global": "usage_limit_exceeded",
        "valid_from": "time_window_invalid",
        "valid_until": "time_window_invalid",
        "allowed_days_of_week": "time_window_invalid",
        "allowed_hours": "time_window_invalid",
        "cooldown_hours": "cooldown_active",
        "allowed_locations": "location_invalid",
        "min_purchase": "min_purchase_not_met",
        "max_purchase": "min_purchase_not_met",
        "allowed_staff_roles": "staff_role_denied",
    }

    def _deny_from_violations(self, violations: list[RuleViolation]) -> RedemptionResult:
        """Build a denial result from rule violations.

        Maps each rule code to a canonical denial reason.
        """
        reasons = [self._RULE_TO_DENIAL.get(v.rule_code, v.rule_code) for v in violations]
        return RedemptionResult.from_denial(
            reasons=reasons,
            rules_evaluated=[{"rule_code": v.rule_code, "message": v.message} for v in violations],
        )

    def _record_denied_transaction(
        self,
        context: RedemptionContext,
        result: RedemptionResult,
        idempotency_key: str,
        rules: dict,
    ) -> None:
        """Record an audit row for a denied redemption (does NOT update pass state)."""
        from apps.transactions.models import Transaction, TransactionType

        try:
            with db_transaction.atomic():
                Transaction.objects.create(
                    tenant=context.tenant,
                    customer_pass=context.customer_pass,
                    staff_id=context.staff_id,
                    location_id=context.location_id,
                    transaction_type=TransactionType.DENIED,
                    amount=context.amount,
                    quantity=context.quantity,
                    notes=context.notes,
                    idempotency_key=idempotency_key,
                    denial_reason=(result.denial_reasons[0] if result.denial_reasons else ""),
                    rules_evaluated=result.rules_evaluated,
                )
        except Exception as e:
            logger.exception("Failed to record denied transaction audit row: %s", e)
