"""
Loyallia Redemption Engine — Rule Validators

Evaluates card-level redemption_rules against a RedemptionContext.
Each validator is stateless and idempotent; they may query the database
but never mutate data.

Usage::

    from apps.redemption.context import RedemptionContext
    from apps.redemption.rules import RuleViolation, UsageLimitValidator

    violations = UsageLimitValidator().validate(context, context.card.redemption_rules)
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal
from typing import TYPE_CHECKING

from django.utils.dateparse import parse_datetime

from apps.transactions.models import Transaction, TransactionType
from common.messages import get_message

if TYPE_CHECKING:
    from apps.redemption.context import RedemptionContext

logger = logging.getLogger(__name__)

# Transaction types that constitute a "redemption" for usage-limit checks.
_REDEEMED_TYPES: tuple[str, ...] = (
    TransactionType.STAMP_REDEEMED,
    TransactionType.CASHBACK_REDEEMED,
    TransactionType.COUPON_REDEEMED,
    TransactionType.GIFT_REDEEMED,
    TransactionType.MEMBERSHIP_VALIDATED,
    TransactionType.CORPORATE_VALIDATED,
    TransactionType.MULTIPASS_USED,
)


@dataclass(frozen=True, slots=True)
class RuleViolation:
    """Immutable record of a single rule failure."""

    rule_code: str
    message: str


class RuleValidator(ABC):
    """Abstract base for all redemption-rule validators."""

    @abstractmethod
    def validate(self, context: RedemptionContext, rules: dict) -> list[RuleViolation]:
        """Evaluate *rules* against *context* and return any violations.

        Args:
            context: Runtime redemption context.
            rules: The ``card.redemption_rules`` dictionary.

        Returns:
            A (possibly empty) list of ``RuleViolation`` objects.
        """
        raise NotImplementedError


class UsageLimitValidator(RuleValidator):
    """Enforce per-customer and global redemption limits.

    Queries the ``Transaction`` table for prior redemption-type
    transactions.  If the configured limit has been reached (or
    exceeded) the validator returns a violation.
    """

    def validate(self, context: RedemptionContext, rules: dict) -> list[RuleViolation]:
        """Check per-customer and global usage limits."""
        violations: list[RuleViolation] = []

        # Per-customer limit
        per_customer_limit = rules.get("usage_limit_per_customer")
        if per_customer_limit is not None:
            redeemed_count = Transaction.objects.filter(
                customer_pass=context.customer_pass,
                transaction_type__in=_REDEEMED_TYPES,
            ).count()
            if redeemed_count >= int(per_customer_limit):
                violations.append(
                    RuleViolation(
                        rule_code="usage_limit_per_customer",
                        message=get_message(
                            "REDEMPTION_USAGE_LIMIT_PER_CUSTOMER_EXCEEDED",
                            limit=per_customer_limit,
                            used=redeemed_count,
                        ),
                    )
                )

        # Global limit
        global_limit = rules.get("usage_limit_global")
        if global_limit is not None:
            global_count = Transaction.objects.filter(
                customer_pass__card=context.card,
                transaction_type__in=_REDEEMED_TYPES,
            ).count()
            if global_count >= int(global_limit):
                violations.append(
                    RuleViolation(
                        rule_code="usage_limit_global",
                        message=get_message(
                            "REDEMPTION_USAGE_LIMIT_GLOBAL_EXCEEDED",
                            limit=global_limit,
                            used=global_count,
                        ),
                    )
                )

        return violations


class TimeWindowValidator(RuleValidator):
    """Enforce temporal redemption windows.

    Supports:
    * ``valid_from`` / ``valid_until`` — absolute datetimes
    * ``allowed_days_of_week`` — list of weekday integers (0=Mon … 6=Sun)
    * ``allowed_hours`` — dict ``{"start": "HH:MM", "end": "HH:MM"}``
    """

    def validate(self, context: RedemptionContext, rules: dict) -> list[RuleViolation]:
        """Check temporal redemption windows."""
        violations: list[RuleViolation] = []
        scanned = context.scanned_at

        # Absolute date range
        valid_from = rules.get("valid_from")
        if valid_from is not None:
            dt_from = (
                parse_datetime(str(valid_from))
                if isinstance(valid_from, str)
                else valid_from
            )
            if dt_from is not None and scanned < dt_from:
                violations.append(
                    RuleViolation(
                        rule_code="valid_from",
                        message=get_message(
                            "REDEMPTION_NOT_STARTED_YET",
                            valid_from=dt_from.isoformat(),
                        ),
                    )
                )

        valid_until = rules.get("valid_until")
        if valid_until is not None:
            dt_until = (
                parse_datetime(str(valid_until))
                if isinstance(valid_until, str)
                else valid_until
            )
            if dt_until is not None and scanned > dt_until:
                violations.append(
                    RuleViolation(
                        rule_code="valid_until",
                        message=get_message(
                            "REDEMPTION_EXPIRED",
                            valid_until=dt_until.isoformat(),
                        ),
                    )
                )

        # Day-of-week restriction
        allowed_days = rules.get("allowed_days_of_week")
        if allowed_days is not None:
            try:
                allowed_set = {int(d) for d in allowed_days}
                if scanned.weekday() not in allowed_set:
                    violations.append(
                        RuleViolation(
                            rule_code="allowed_days_of_week",
                            message=get_message(
                                "REDEMPTION_DAY_NOT_ALLOWED",
                                day=scanned.strftime("%A"),
                            ),
                        )
                    )
            except (TypeError, ValueError):
                logger.warning("Invalid allowed_days_of_week config: %s", allowed_days)

        # Hour restriction
        allowed_hours = rules.get("allowed_hours")
        if allowed_hours is not None:
            try:
                start_str = allowed_hours.get("start", "00:00")
                end_str = allowed_hours.get("end", "23:59")
                start_hour, start_minute = map(int, str(start_str).split(":"))
                end_hour, end_minute = map(int, str(end_str).split(":"))
                current_time = scanned.time()
                from datetime import time as dt_time

                start_time = dt_time(start_hour, start_minute)
                end_time = dt_time(end_hour, end_minute)

                if not (start_time <= current_time <= end_time):
                    violations.append(
                        RuleViolation(
                            rule_code="allowed_hours",
                            message=get_message(
                                "REDEMPTION_HOURS_NOT_ALLOWED",
                                start=start_str,
                                end=end_str,
                            ),
                        )
                    )
            except Exception:
                logger.warning(
                    "Invalid allowed_hours config: %s", allowed_hours, exc_info=True
                )

        return violations


class CooldownValidator(RuleValidator):
    """Enforce a cooldown period between redemptions.

    Uses ``customer_pass.last_redemption_at`` to determine whether
    enough time has elapsed since the previous redemption.
    """

    def validate(self, context: RedemptionContext, rules: dict) -> list[RuleViolation]:
        """Check cooldown period between redemptions."""
        violations: list[RuleViolation] = []
        cooldown_hours = rules.get("cooldown_hours")

        if cooldown_hours is not None:
            last = context.customer_pass.last_redemption_at
            if last is not None:
                delta = context.scanned_at - last
                required = timedelta(hours=float(cooldown_hours))
                if delta < required:
                    remaining_minutes = int((required - delta).total_seconds() // 60)
                    violations.append(
                        RuleViolation(
                            rule_code="cooldown_hours",
                            message=get_message(
                                "REDEMPTION_COOLDOWN_ACTIVE",
                                cooldown_hours=cooldown_hours,
                                remaining_minutes=remaining_minutes,
                            ),
                        )
                    )

        return violations


class LocationValidator(RuleValidator):
    """Restrict redemption to specific business locations.

    ``allowed_locations`` must be a list of location identifier strings.
    """

    def validate(self, context: RedemptionContext, rules: dict) -> list[RuleViolation]:
        """Check location-based restrictions."""
        violations: list[RuleViolation] = []
        allowed_locations = rules.get("allowed_locations")

        if allowed_locations is not None:
            allowed_set = {str(loc) for loc in allowed_locations}
            if (
                context.location_id is None
                or str(context.location_id) not in allowed_set
            ):
                violations.append(
                    RuleViolation(
                        rule_code="allowed_locations",
                        message=get_message(
                            "REDEMPTION_LOCATION_NOT_ALLOWED",
                        ),
                    )
                )

        return violations


class MinPurchaseValidator(RuleValidator):
    """Enforce minimum and/or maximum purchase amount.

    Compares ``context.amount`` against ``min_purchase`` and
    ``max_purchase`` rule thresholds.
    """

    def validate(self, context: RedemptionContext, rules: dict) -> list[RuleViolation]:
        """Check minimum and maximum purchase thresholds."""
        violations: list[RuleViolation] = []
        amount = context.amount

        min_purchase = rules.get("min_purchase")
        if min_purchase is not None and amount < Decimal(str(min_purchase)):
            violations.append(
                RuleViolation(
                    rule_code="min_purchase",
                    message=get_message(
                        "REDEMPTION_MIN_PURCHASE_NOT_MET",
                        min_purchase=min_purchase,
                        amount=amount,
                    ),
                )
            )

        max_purchase = rules.get("max_purchase")
        if max_purchase is not None and amount > Decimal(str(max_purchase)):
            violations.append(
                RuleViolation(
                    rule_code="max_purchase",
                    message=get_message(
                        "REDEMPTION_MAX_PURCHASE_EXCEEDED",
                        max_purchase=max_purchase,
                        amount=amount,
                    ),
                )
            )

        return violations


class StaffRoleValidator(RuleValidator):
    """Restrict redemption to staff members with allowed roles.

    Looks up the ``User`` record for ``context.staff_id`` and compares
    the user's ``role`` against ``allowed_staff_roles``.
    """

    def validate(self, context: RedemptionContext, rules: dict) -> list[RuleViolation]:
        """Check staff role permissions."""
        violations: list[RuleViolation] = []
        allowed_roles = rules.get("allowed_staff_roles")

        if allowed_roles is not None:
            if context.staff_id is None:
                violations.append(
                    RuleViolation(
                        rule_code="allowed_staff_roles",
                        message=get_message(
                            "REDEMPTION_STAFF_ROLE_NOT_ALLOWED",
                        ),
                    )
                )
                return violations

            from apps.authentication.models import User

            try:
                user = User.objects.get(id=context.staff_id)
                if user.role not in allowed_roles:
                    violations.append(
                        RuleViolation(
                            rule_code="allowed_staff_roles",
                            message=get_message(
                                "REDEMPTION_STAFF_ROLE_NOT_ALLOWED",
                                role=user.role,
                                allowed=", ".join(allowed_roles),
                            ),
                        )
                    )
            except User.DoesNotExist:
                violations.append(
                    RuleViolation(
                        rule_code="allowed_staff_roles",
                        message=get_message(
                            "REDEMPTION_STAFF_ROLE_NOT_ALLOWED",
                        ),
                    )
                )

        return violations
