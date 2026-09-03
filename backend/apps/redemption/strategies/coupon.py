"""
Loyallia Redemption Engine — Coupon Redemption Strategy

Implements redemption for coupon cards using the NEW ``coupon_redemption_count``
field.  Validates against ``card.redemption_rules`` (usage limits, time windows,
and minimum purchase) and increments the per-customer redemption counter.
"""

import logging
from datetime import date, datetime

from apps.transactions.models import Transaction, TransactionType

from ..context import RedemptionContext
from .base import BaseRedemptionStrategy, PassStateMutation

logger = logging.getLogger(__name__)


class CouponRedeemStrategy(BaseRedemptionStrategy):
    """Redemption strategy for coupon ("coupon") cards."""

    def __init__(self) -> None:
        """Initialize the strategy for coupon cards."""
        super().__init__("coupon")

    def validate(self, context: RedemptionContext) -> list[str]:
        """Validate the redemption request before locking.

        Checks (in order):
        1. ``usage_limit_per_customer`` — count of prior ``coupon_redeemed``
           transactions for this pass.
        2. ``valid_from`` / ``valid_until`` — time-window bounds.
        3. ``min_purchase`` — required spend threshold.
        """
        violations: list[str] = []
        rules = context.card.redemption_rules or {}
        customer_pass = context.customer_pass
        scanned_at = context.scanned_at

        usage_limit = rules.get("usage_limit_per_customer")
        if usage_limit is not None:
            try:
                usage_limit = int(usage_limit)
            except (TypeError, ValueError):
                usage_limit = None

            if usage_limit is not None and usage_limit > 0:
                redemption_count = Transaction.objects.filter(
                    customer_pass=customer_pass,
                    transaction_type=TransactionType.COUPON_REDEEMED,
                ).count()
                if redemption_count >= usage_limit:
                    violations.append("usage_limit_exceeded")

        valid_from = rules.get("valid_from")
        valid_until = rules.get("valid_until")

        if valid_from is not None:
            valid_from_dt = self._parse_rule_datetime(valid_from)
            if valid_from_dt and scanned_at < valid_from_dt:
                violations.append("time_window_invalid")

        if valid_until is not None:
            valid_until_dt = self._parse_rule_datetime(valid_until)
            if valid_until_dt and scanned_at > valid_until_dt:
                violations.append("time_window_invalid")

        min_purchase = rules.get("min_purchase")
        if min_purchase is not None:
            try:
                min_purchase = float(min_purchase)
            except (TypeError, ValueError):
                min_purchase = None

            if min_purchase is not None and float(context.amount) < min_purchase:
                violations.append("min_purchase_not_met")

        return violations

    def _compute_mutation(self, locked_pass, context: RedemptionContext) -> PassStateMutation:
        """Compute the state change for a coupon redemption.

        Re-checks the usage limit after acquiring the row lock to guard
        against race conditions. Also respects legacy ``pass_data.coupon_used``.
        """
        # Legacy pass_data flag or prior redemption via new engine
        if locked_pass.pass_data.get("coupon_used", False) or (locked_pass.coupon_redemption_count or 0) > 0:
            return PassStateMutation(
                is_valid=False,
                violations=["usage_limit_exceeded"],
            )

        rules = context.card.redemption_rules or {}

        usage_limit = rules.get("usage_limit_per_customer")
        if usage_limit is not None:
            try:
                usage_limit = int(usage_limit)
            except (TypeError, ValueError):
                usage_limit = None

            if usage_limit is not None and usage_limit > 0:
                redemption_count = Transaction.objects.filter(
                    customer_pass=locked_pass,
                    transaction_type=TransactionType.COUPON_REDEEMED,
                ).count()
                if redemption_count >= usage_limit:
                    return PassStateMutation(
                        is_valid=False,
                        violations=["usage_limit_exceeded"],
                    )

        current_count = locked_pass.coupon_redemption_count or 0
        new_count = current_count + 1

        metadata = context.card.metadata or {}
        reward_description = metadata.get("coupon_description", "Cupón canjeado")

        return PassStateMutation(
            is_valid=True,
            updates={"coupon_redemption_count": new_count, "coupon_used": True},
            transaction_type=TransactionType.COUPON_REDEEMED,
            transaction_amount=context.amount,
            transaction_quantity=1,
            reward_earned=True,
            reward_description=reward_description,
        )

    def _resolve_intent(self, context) -> str:
        """Return the resolved intent for coupon redemption."""
        return "redeem"

    @staticmethod
    def _parse_rule_datetime(value, tz=None):
        """Parse a datetime/date value from ``redemption_rules`` JSON.

        Supports ``datetime``, ``date``, and ISO-formatted strings.
        ``date`` values are normalised to ``datetime`` at 00:00:00 so they
        can be compared against ``context.scanned_at``.
        Naive datetimes are assumed to be in the provided timezone.
        """
        from django.utils import timezone

        if tz is None:
            tz = timezone.get_current_timezone()
        parsed = None
        if isinstance(value, datetime):
            parsed = value
        elif isinstance(value, str):
            try:
                parsed = datetime.fromisoformat(value)
            except ValueError:
                try:
                    parsed = datetime.combine(date.fromisoformat(value), datetime.min.time())
                except ValueError:
                    return None
        elif isinstance(value, date):
            parsed = datetime.combine(value, datetime.min.time())
        if parsed is not None and parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=tz)
        return parsed
