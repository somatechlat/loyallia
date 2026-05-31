"""
Loyallia Automation Engine (apps/automation/engine.py)

Evaluates automation triggers and executes configured actions.
This is the core dispatcher that connects business events to automated responses.

Entry points:
    fire_trigger(trigger, customer, context) → synchronous, called from API events.
    fire_trigger_async(trigger, customer_id, context) → async via Celery.
    evaluate_scheduled_automations() → called by Celery Beat daily.

Performance (Rule 12):
    - PERF: fire_trigger_async() is the primary entry from scanner endpoints.
      It enqueues to Celery and returns immediately  scanner response is never blocked.
    - PERF: prefetch_related("target_programs") on matching automations prevents N+1.
    - PERF: _MAX_TRIGGER_DEPTH=3 caps recursion for self-triggering rules.

Security (SEC):
      (e.g. transaction_completed → issue_reward → transaction_completed → ...).
      from a parameter override, to prevent cross-tenant data access.
Called by: apps/transactions/api.py (transact), apps/customers/api.py (enroll).
"""

import logging
from datetime import timedelta

from django.db import models
from django.utils import timezone

logger = logging.getLogger(__name__)

# Maximum depth for nested automation triggers to prevent infinite loops
_MAX_TRIGGER_DEPTH = 3

# ---------------------------------------------------------------------------
# Trigger condition evaluators
# ---------------------------------------------------------------------------

def check_points_threshold(automation, customer) -> bool:
    """Check if customer's total points meet or exceed the configured threshold.

    Evaluates the 'points_threshold' trigger_config against the customer's
    total accumulated points across all transactions.
    """
    threshold = automation.trigger_config.get("points_threshold", 0)
    if threshold <= 0:
        return True  # No threshold configured, always pass

    from apps.transactions.models import Transaction

    customer_points = (
        Transaction.objects.filter(customer=customer, tenant=automation.tenant).aggregate(
            total=models.Sum("points")
        )["total"]
        or 0
    )
    logger.debug(
        "check_points_threshold: customer=%s threshold=%d actual=%d",
        customer.id,
        threshold,
        customer_points,
    )
    return customer_points >= threshold

def check_inactivity(automation, customer) -> bool:
    """Check if customer has been inactive for the configured number of days.

    Returns True if the customer's last transaction is older than the
    configured inactive_days threshold, or if the customer has never
    made a transaction.
    """
    days = automation.trigger_config.get("inactive_days", 30)
    if days <= 0:
        return True  # No inactivity threshold, always pass

    cutoff = timezone.now() - timedelta(days=days)

    from apps.transactions.models import Transaction

    last_activity = (
        Transaction.objects.filter(customer=customer, tenant=automation.tenant)
        .order_by("-created_at")
        .values_list("created_at", flat=True)
        .first()
    )

    if not last_activity:
        logger.debug(
            "check_inactivity: customer=%s never active → INACTIVE",
            customer.id,
        )
        return True  # Never active = inactive

    is_inactive = last_activity < cutoff
    logger.debug(
        "check_inactivity: customer=%s last_activity=%s cutoff=%s → %s",
        customer.id,
        last_activity.isoformat(),
        cutoff.isoformat(),
        "INACTIVE" if is_inactive else "ACTIVE",
    )
    return is_inactive

def check_milestone(automation, customer) -> bool:
    """Check if customer has reached the configured milestone.

    Milestone can be defined as:
    - min_visits: minimum number of transactions
    - min_points: minimum total points accumulated
    """
    from apps.transactions.models import Transaction

    min_visits = automation.trigger_config.get("min_visits", 0)
    min_points = automation.trigger_config.get("min_points", 0)

    if min_visits <= 0 and min_points <= 0:
        return True  # No milestone configured, always pass

    aggregates = Transaction.objects.filter(
        customer=customer, tenant=automation.tenant
    ).aggregate(
        count=models.Count("id"),
        total_points=models.Sum("points"),
    )

    visit_count = aggregates["count"] or 0
    total_points = aggregates["total_points"] or 0

    meets_visits = min_visits <= 0 or visit_count >= min_visits
    meets_points = min_points <= 0 or total_points >= min_points

    logger.debug(
        "check_milestone: customer=%s visits=%d/%d points=%d/%d → %s",
        customer.id,
        visit_count,
        min_visits,
        total_points,
        min_points,
        "PASS" if (meets_visits and meets_points) else "FAIL",
    )
    return meets_visits and meets_points

def fire_trigger(
    trigger: str,
    customer,
    tenant=None,
    context: dict | None = None,
    _depth: int = 0,
) -> int:
    """Fire all active automations matching a trigger event for a customer.

    PERF: prefetch_related("target_programs") prevents N+1 on matching automations.

    Args:
        trigger:  AutomationTrigger value (e.g. "customer_enrolled")
        customer: Customer model instance

        context:  Optional event context dict
        _depth:   Internal recursion depth counter (do not pass manually)

    Returns:
        Number of automations successfully executed
    """
    from apps.automation.models import Automation

    resolved_tenant = customer.tenant
    if _depth >= _MAX_TRIGGER_DEPTH:
        logger.warning(
            "fire_trigger: max recursion depth (%d) reached for trigger=%s "
            "customer=%s  possible self-trigger loop. Aborting.",
            _MAX_TRIGGER_DEPTH,
            trigger,
            customer.id,
        )
        return 0
    trigger_chain = (context or {}).get("_trigger_chain", [])
    if trigger in trigger_chain:
        logger.warning(
            "fire_trigger: self-trigger loop detected  trigger=%s already in chain %s for customer=%s. Skipping.",
            trigger,
            trigger_chain,
            customer.id,
        )
        return 0
    matching = Automation.objects.filter(
        tenant=resolved_tenant,
        trigger=trigger,
        is_active=True,
    ).prefetch_related("target_programs")

    executed = 0
    ctx = dict(context or {})
 # Track trigger chain for loop detection
    ctx["_trigger_chain"] = [*trigger_chain, trigger]

    for automation in matching:
        if not automation.can_execute_for_customer(customer):
            continue

        # Evaluate trigger-specific conditions
        trigger_passes = True
        if automation.trigger == "points_threshold":
            trigger_passes = check_points_threshold(automation, customer)
        elif automation.trigger == "inactive_reminder":
            trigger_passes = check_inactivity(automation, customer)
        elif automation.trigger == "milestone_reached":
            trigger_passes = check_milestone(automation, customer)

        if not trigger_passes:
            logger.debug(
                "fire_trigger: trigger condition not met for automation=%s "
                "customer=%s trigger=%s",
                automation.id,
                customer.id,
                automation.trigger,
            )
            continue

        success = automation.execute(customer, ctx)

        if success:
            executed += 1

    logger.debug(
        "fire_trigger: trigger=%s customer=%s tenant=%s depth=%d → %d/%d executed",
        trigger,
        customer.id,
        resolved_tenant.id,
        _depth,
        executed,
        matching.count(),
    )
    return executed

def fire_trigger_async(
    trigger: str,
    customer_id: str,
    tenant_id: str | None = None,
    context: dict | None = None,
) -> None:
    """Enqueue automation trigger evaluation as a Celery task.

    PERF: Use this from API endpoints to avoid blocking the response.
    The scanner endpoint uses this to fire automation triggers without
    adding latency to the QR scan response.

    Failure is non-fatal: if Celery is unavailable, the event is logged
    and the API response continues normally.
    """
    import logging

    from apps.automation.tasks import evaluate_trigger_for_customer

    try:
        evaluate_trigger_for_customer.delay(  # type: ignore[reportCallIssue]
            trigger=trigger,
            customer_id=customer_id,
            tenant_id=tenant_id,
            context=context or {},
        )
    except Exception:
        logging.getLogger(__name__).warning(
            "Could not queue automation trigger %s for customer %s; event continues.",
            trigger,
            customer_id,
            exc_info=True,
        )
