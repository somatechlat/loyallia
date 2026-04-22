"""
Loyallia — Automation Engine
Evaluates automation triggers and executes configured actions.

Entry points:
  fire_trigger(trigger_name, customer, context)  → called from API on events
  evaluate_scheduled_automations()               → called by Celery Beat daily
"""
import logging

logger = logging.getLogger(__name__)


def fire_trigger(
    trigger: str,
    customer,
    tenant=None,
    context: dict | None = None,
) -> int:
    """
    Fire all active automations matching a trigger event for a customer.
    Called synchronously from API endpoints after business events.

    Args:
        trigger:  AutomationTrigger value (e.g. "customer_enrolled")
        customer: Customer model instance
        tenant:   Tenant (defaults to customer.tenant if omitted)
        context:  Optional dict of event context (e.g. {"card_id": "...", "amount": 10})

    Returns:
        Number of automations successfully executed
    """
    from apps.automation.models import Automation, AutomationExecution

    if tenant is None:
        tenant = customer.tenant

    matching = Automation.objects.filter(
        tenant=tenant,
        trigger=trigger,
        is_active=True,
    ).prefetch_related("target_programs")

    executed = 0
    ctx = context or {}

    for automation in matching:
        if not automation.can_execute_for_customer(customer):
            continue

        success = automation.execute(customer, ctx)

        # Log execution regardless of success
        AutomationExecution.objects.create(
            automation=automation,
            customer=customer,
            trigger_event=trigger,
            execution_context=ctx,
            success=success,
        )

        if success:
            executed += 1

    logger.debug(
        "fire_trigger: trigger=%s customer=%s tenant=%s → %d/%d executed",
        trigger, customer.id, tenant.id, executed, matching.count()
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
