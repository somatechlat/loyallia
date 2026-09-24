"""
Loyallia Miscellaneous Notification Celery Tasks (apps/notifications/tasks/misc.py)

Scheduled tasks for birthday notifications and inactive customer reminders.
"""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    queue="push_delivery", name="apps.notifications.tasks.send_birthday_notifications"
)
def send_birthday_notifications() -> dict:
    """Daily scheduled task: send birthday greetings to customers.

    PERF: Single query with date_of_birth__month/day filter (indexed).
    select_related("tenant") prevents N+1 when accessing tenant for notification.
    """
    from datetime import date

    from apps.customers.models import Customer
    from apps.notifications.service import NotificationService

    today = date.today()
    customers = Customer.objects.filter(
        date_of_birth__month=today.month,
        date_of_birth__day=today.day,
        is_active=True,
    ).select_related("tenant")

    sent = 0
    for customer in customers:
        try:
            notification = NotificationService.send_birthday_notification(
                customer=customer, tenant=customer.tenant
            )
            if notification:
                sent += 1
        except Exception as exc:
            logger.error("Birthday notification failed for %s: %s", customer.id, exc)

    return {"sent": sent, "date": str(today)}


@shared_task(
    queue="push_delivery", name="apps.notifications.tasks.send_inactive_reminders"
)
def send_inactive_reminders(days_inactive: int = 30) -> dict:
    """Daily scheduled task: re-engage customers who haven't visited recently.

    PERF: Single query with last_visit__lt filter.
    select_related("tenant") prevents N+1 when creating notifications.
    """
    from datetime import timedelta

    from django.utils import timezone

    from apps.customers.models import Customer
    from apps.notifications.service import NotificationService

    cutoff = timezone.now() - timedelta(days=days_inactive)
    customers = Customer.objects.filter(
        last_visit__lt=cutoff,
        last_visit__isnull=False,
        is_active=True,
    ).select_related("tenant")

    sent = 0
    for customer in customers:
        try:
            notification = NotificationService.send_reminder_notification(
                customer=customer, tenant=customer.tenant
            )
            if notification:
                sent += 1
        except Exception as exc:
            logger.error("Reminder failed for %s: %s", customer.id, exc)

    return {"sent": sent, "days_inactive": days_inactive}
