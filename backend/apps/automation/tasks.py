"""
Loyallia — Automation Celery Tasks
"""
import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    queue="default",
    name="apps.automation.tasks.evaluate_trigger_for_customer",
)
def evaluate_trigger_for_customer(
    self,
    trigger: str,
    customer_id: str,
    tenant_id: str = None,
    context: dict = None,
) -> dict:
    """
    Evaluate all automations for a trigger + customer combination.
    Called asynchronously via engine.fire_trigger_async().
    """
    import uuid
    from apps.customers.models import Customer
    from apps.automation.engine import fire_trigger

    try:
        customer = Customer.objects.select_related("tenant").get(
            id=uuid.UUID(customer_id)
        )
    except Customer.DoesNotExist:
        logger.error("evaluate_trigger: customer %s not found", customer_id)
        return {"success": False}

    try:
        executed = fire_trigger(
            trigger=trigger,
            customer=customer,
            context=context or {},
        )
        return {"success": True, "executed": executed}
    except Exception as exc:
        logger.error("evaluate_trigger failed: %s", exc)
        raise self.retry(exc=exc)


@shared_task(
    queue="default",
    name="apps.automation.tasks.evaluate_scheduled_automations",
)
def evaluate_scheduled_automations() -> dict:
    """
    Daily Celery Beat task: evaluate all SCHEDULED_TIME automations.
    Runs all active scheduled automations against their target customer segments.
    """
    from apps.automation.models import Automation, AutomationTrigger, AutomationExecution
    from apps.customers.models import Customer

    scheduled = Automation.objects.filter(
        trigger=AutomationTrigger.SCHEDULED_TIME,
        is_active=True,
    ).select_related("tenant").prefetch_related("target_programs")

    total_executed = 0

    for automation in scheduled:
        # Get all customers for this tenant
        customers = Customer.objects.filter(
            tenant=automation.tenant,
            is_active=True,
        )

        for customer in customers.iterator(chunk_size=100):
            if not automation.can_execute_for_customer(customer):
                continue

            success = automation.execute(customer, {"source": "scheduled"})

            AutomationExecution.objects.create(
                automation=automation,
                customer=customer,
                trigger_event=AutomationTrigger.SCHEDULED_TIME,
                execution_context={"source": "scheduled"},
                success=success,
            )

            if success:
                total_executed += 1

    logger.info("evaluate_scheduled_automations: %d executions", total_executed)
    return {"executed": total_executed}


@shared_task(
    queue="default",
    name="apps.automation.tasks.evaluate_inactive_triggers",
)
def evaluate_inactive_triggers(days_threshold: int = 30) -> dict:
    """
    Daily task: fire INACTIVE_REMINDER trigger for customers who haven't
    visited in `days_threshold` days.
    """
    from datetime import timedelta
    from django.utils import timezone
    from apps.customers.models import Customer
    from apps.automation.engine import fire_trigger

    cutoff = timezone.now() - timedelta(days=days_threshold)
    inactive = Customer.objects.filter(
        last_visit__lt=cutoff,
        last_visit__isnull=False,
        is_active=True,
    ).select_related("tenant")

    triggered = 0
    for customer in inactive.iterator(chunk_size=100):
        count = fire_trigger(
            trigger="inactive_reminder",
            customer=customer,
            context={"days_since_visit": days_threshold},
        )
        triggered += count

    logger.info("evaluate_inactive_triggers: %d automation triggers fired", triggered)
    return {"triggered": triggered, "days_threshold": days_threshold}
