"""
Loyallia WhatsApp Bridge Celery Tasks

Periodic tasks for WhatsApp session maintenance and rate-limit resets.
"""

import logging

from celery import shared_task
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(
    name="apps.notifications.whatsapp.tasks.reset_whatsapp_daily_counters",
    queue="default",
    soft_time_limit=settings.CELERY_SOFT_TIME_LIMIT_NOTIFICATIONS_WHATSAPP,
    time_limit=settings.CELERY_TIME_LIMIT_NOTIFICATIONS_WHATSAPP,
)
def reset_whatsapp_daily_counters() -> dict:
    """Reset messages_sent_today and advance warmup_day for all WhatsApp sessions.

    Runs daily at midnight UTC via Celery Beat.
    - Resets messages_sent_today to 0
    - Increments warmup_day up to 7 (full warm-up)
    """
    from apps.notifications.models import WhatsAppSession

    sessions = WhatsAppSession.objects.all()
    reset_count = 0
    warmup_advanced = 0

    for session in sessions:
        session.messages_sent_today = 0
        if session.warmup_day < 7:
            session.warmup_day += 1
            warmup_advanced += 1
        session.save(update_fields=["messages_sent_today", "warmup_day", "updated_at"])
        reset_count += 1

    logger.info(
        "Reset %d WhatsApp daily counters, advanced %d warmup days at %s",
        reset_count,
        warmup_advanced,
        timezone.now().isoformat(),
    )
    return {
        "success": True,
        "reset_count": reset_count,
        "warmup_advanced": warmup_advanced,
    }
