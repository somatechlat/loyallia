"""
Loyallia Push Notification Celery Tasks (apps/notifications/tasks/push.py)

Single notification dispatch task.
"""

import logging

from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_LOW,
    default_retry_delay=settings.CELERY_DEFAULT_RETRY_DELAY_MEDIUM,
    queue="push_delivery",
    name="apps.notifications.tasks.send_single_notification",
)
def send_single_notification(self, notification_id: str) -> dict:
    """Dispatch a single notification via its configured channel.

    PERF: select_related loads customer+tenant in one JOIN.
    Idempotent: checks is_sent flag before dispatching.
    """
    import uuid

    from apps.notifications.models import Notification
    from apps.notifications.service import NotificationService

    try:
        notification = Notification.objects.select_related("customer", "tenant").get(
            id=uuid.UUID(notification_id)
        )
    except Notification.DoesNotExist:
        return {"success": False, "error": "Notification not found"}

    if notification.is_sent:
        return {"success": True, "already_sent": True}

    try:
        result = NotificationService.send_notification(notification)
        return {"success": result, "notification_id": notification_id}
    except Exception as exc:
        logger.error("send_single_notification failed: %s", exc)
        raise self.retry(exc=exc)
