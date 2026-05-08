"""
Loyallia — Automation Engine (apps/automation/engine.py)

Evaluates automation triggers and executes configured actions.
This is the core dispatcher that connects business events to automated responses.

Entry points:
    fire_trigger(trigger, customer, context) → synchronous, called from API events.
    fire_trigger_async(trigger, customer_id, context) → async via Celery.
    evaluate_scheduled_automations() → called by Celery Beat daily.

Performance (Rule 12):
    - PERF: fire_trigger_async() is the primary entry from scanner endpoints.
      It enqueues to Celery and returns immediately — scanner response is never blocked.
    - PERF: prefetch_related("target_programs") on matching automations prevents N+1.
    - PERF: _MAX_TRIGGER_DEPTH=3 caps recursion for self-triggering rules.

Security (SEC):
    - SEC: LYL-M-API-021 — Self-trigger loop guard prevents infinite recursion
      (e.g. transaction_completed → issue_reward → transaction_completed → ...).
    - SEC: LYL-M-API-025 — Tenant is ALWAYS resolved from customer.tenant, never
      from a parameter override, to prevent cross-tenant data access.

Called by: apps/transactions/api.py (transact), apps/customers/api.py (enroll).
"""


import logging

logger = logging.getLogger(__name__)

# Maximum depth for nested automation triggers to prevent infinite loops
_MAX_TRIGGER_DEPTH = 3


def fire_trigger(
    trigger: str,
    customer,
    tenant=None,
    context: dict | None = None,
    _depth: int = 0,
) -> int:
    """Fire all active automations matching a trigger event for a customer.

    SEC: LYL-M-API-021 — Depth guard prevents self-trigger loops.
    SEC: LYL-M-API-025 — Tenant always resolved from customer.tenant.
    PERF: prefetch_related("target_programs") prevents N+1 on matching automations.

    Args:
        trigger:  AutomationTrigger value (e.g. "customer_enrolled")
        customer: Customer model instance
        tenant:   IGNORED — always uses customer.tenant (SEC: LYL-M-API-025)
        context:  Optional event context dict
        _depth:   Internal recursion depth counter (do not pass manually)

    Returns:
        Number of automations successfully executed
    """
    from apps.automation.models import Automation

    # SEC: LYL-M-API-025 — always use customer's tenant, ignore tenant parameter
    resolved_tenant = customer.tenant

    # SEC: LYL-M-API-021 — cap recursion depth to prevent infinite loops
    if _depth >= _MAX_TRIGGER_DEPTH:
        logger.warning(
            "fire_trigger: max recursion depth (%d) reached for trigger=%s "
            "customer=%s — possible self-trigger loop. Aborting.",
            _MAX_TRIGGER_DEPTH,
            trigger,
            customer.id,
        )
        return 0

    # SEC: LYL-M-API-021 — detect self-trigger via chain tracking
    trigger_chain = (context or {}).get("_trigger_chain", [])
    if trigger in trigger_chain:
        logger.warning(
            "fire_trigger: self-trigger loop detected — trigger=%s already in "
            "chain %s for customer=%s. Skipping.",
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
