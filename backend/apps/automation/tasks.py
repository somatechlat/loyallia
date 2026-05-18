"""
Loyallia  Automation Celery Tasks
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
    tenant_id: str = "",
    context: dict | None = None,
) -> dict:
    """
    Evaluate all automations for a trigger + customer combination.
    Called asynchronously via engine.fire_trigger_async().
    """
    import uuid

    from apps.automation.engine import fire_trigger
    from apps.customers.models import Customer

    try:
        customer = Customer.objects.select_related("tenant").get(id=uuid.UUID(customer_id))
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
    from apps.automation.models import (
        Automation,
        AutomationExecution,
        AutomationTrigger,
    )
    from apps.customers.models import Customer

    scheduled = (
        Automation.objects.filter(
            trigger=AutomationTrigger.SCHEDULED_TIME,
            is_active=True,
        )
        .select_related("tenant")
        .prefetch_related("target_programs")
    )

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

    from apps.automation.engine import fire_trigger
    from apps.customers.models import Customer

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


@shared_task(
    queue="default",
    name="apps.automation.tasks.evaluate_birthday_triggers",
)
def evaluate_birthday_triggers() -> dict:
    """Daily task: fire BIRTHDAY_COMING trigger for customers with birthdays
    in the next 0-3 days.

    LYL-SRS-009: Bridges the existing birthday notification system with the
    automation engine so tenant owners can configure custom birthday actions
    (email, SMS, WhatsApp, wallet push) beyond the default push notification.
    """
    from datetime import date, timedelta

    from apps.automation.engine import fire_trigger
    from apps.customers.models import Customer

    today = date.today()
    triggered = 0

 # Check today + next 3 days for upcoming birthdays
    for offset in range(4):
        check_date = today + timedelta(days=offset)
        customers = Customer.objects.filter(
            date_of_birth__month=check_date.month,
            date_of_birth__day=check_date.day,
            is_active=True,
        ).select_related("tenant")

        for customer in customers.iterator(chunk_size=100):
            count = fire_trigger(
                trigger="birthday_coming",
                customer=customer,
                context={
                    "days_until_birthday": offset,
                    "birthday_date": str(check_date),
                },
            )
            triggered += count

    logger.info("evaluate_birthday_triggers: %d automation triggers fired", triggered)
    return {"triggered": triggered}


@shared_task(
    queue="default",
    name="apps.automation.tasks.evaluate_points_threshold_triggers",
)
def evaluate_points_threshold_triggers() -> dict:
    """Daily task: fire POINTS_THRESHOLD trigger for customers who meet the
    points threshold configured in their tenant's automations.

    Each automation defines its own threshold via trigger_config.points_threshold.
    """
    from apps.automation.engine import fire_trigger
    from apps.automation.models import Automation, AutomationTrigger
    from apps.customers.models import Customer
    from apps.transactions.models import Transaction

    # Find all active points_threshold automations
    threshold_automations = (
        Automation.objects.filter(
            trigger=AutomationTrigger.POINTS_THRESHOLD,
            is_active=True,
        )
        .select_related("tenant")
        .prefetch_related("target_programs")
    )

    total_triggered = 0

    for automation in threshold_automations:
        threshold = automation.trigger_config.get("points_threshold", 0)
        if threshold <= 0:
            continue

        # Find customers whose total points >= threshold
        from django.db.models import Sum

        qualifying = (
            Customer.objects.filter(
                tenant=automation.tenant,
                is_active=True,
            )
            .annotate(total_points=Sum("transactions__points"))
            .filter(total_points__gte=threshold)
        )

        # Apply target program filter if configured
        if automation.target_programs.exists():
            qualifying = qualifying.filter(
                passes__card__in=automation.target_programs,
                passes__is_active=True,
            ).distinct()

        triggered = 0
        for customer in qualifying.iterator(chunk_size=100):
            count = fire_trigger(
                trigger="points_threshold",
                customer=customer,
                context={
                    "points_threshold": threshold,
                    "source": "scheduled_evaluation",
                },
            )
            triggered += count

        total_triggered += triggered
        logger.info(
            "evaluate_points_threshold: automation=%s threshold=%d triggered=%d",
            automation.id,
            threshold,
            triggered,
        )

    logger.info(
        "evaluate_points_threshold_triggers: %d total automation triggers fired",
        total_triggered,
    )
    return {"triggered": total_triggered}
