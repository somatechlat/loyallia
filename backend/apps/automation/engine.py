"""
Loyallia — Automation Engine
Evaluates automation triggers and executes configured actions.

Entry points:
  fire_trigger(trigger_name, customer, context)  → called from API on events
  evaluate_scheduled_automations()               → called by Celery Beat daily

LYL-M-API-021: Self-trigger loop guard — prevents automations from triggering
  themselves in an infinite loop (e.g. transaction_completed → issue_reward →
  transaction_completed → ...).
LYL-M-API-025: Tenant is always resolved from customer, never from a parameter
  override to prevent cross-tenant data access.
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

    LYL-M-API-021: Includes a depth guard to prevent self-trigger loops.
    LYL-M-API-025: Tenant is always resolved from customer.tenant to prevent
    cross-tenant override.

    Args:
        trigger:  AutomationTrigger value (e.g. "customer_enrolled")
        customer: Customer model instance
        tenant:   Ignored — kept for backward compat. Always uses customer.tenant.
        context:  Optional dict of event context (e.g. {"card_id": "...", "amount": 10})
        _depth:   Internal recursion depth counter (do not pass manually)

    Returns:
        Number of automations successfully executed
    """
    from apps.automation.models import Automation, AutomationExecution

    # LYL-M-API-025: Always use customer's tenant, ignore tenant parameter
    resolved_tenant = customer.tenant

    # LYL-M-API-021: Self-trigger loop guard
    if _depth >= _MAX_TRIGGER_DEPTH:
        logger.warning(
            "fire_trigger: max recursion depth (%d) reached for trigger=%s "
            "customer=%s — possible self-trigger loop. Aborting.",
            _MAX_TRIGGER_DEPTH,
            trigger,
            customer.id,
        )
        return 0

    # LYL-M-API-021: Check if context indicates a self-trigger
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

        # Log execution regardless of success
        AutomationExecution.objects.create(
            automation=automation,
            customer=customer,
            trigger_event=trigger,
            execution_context={k: v for k, v in ctx.items() if not k.startswith("_")},
            success=success,
        )

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
    """
    Enqueue automation trigger evaluation as a Celery task.
    Use this from API endpoints where you don't want to block the response.

    Args:
        trigger:     AutomationTrigger value
        customer_id: UUID string of the Customer
        tenant_id:   UUID string of the Tenant (optional, resolved from customer if omitted)
        context:     Optional event context dict
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
