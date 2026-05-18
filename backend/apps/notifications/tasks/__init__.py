"""
Loyallia  Notifications Celery Tasks (apps/notifications/tasks/__init__.py)

Backward-compatible re-exports of all notification tasks.
This module preserves the original import paths after splitting tasks.py
into logical submodules per Rule 245 (600-line limit).
"""

from apps.notifications.sms.tasks import send_sms_campaign  # noqa: F401
from apps.notifications.tasks.campaigns import (  # noqa: F401
    send_wallet_notification_campaign,
    send_whatsapp_campaign,
)
from apps.notifications.tasks.email import send_email_campaign  # noqa: F401
from apps.notifications.tasks.misc import (  # noqa: F401
    send_birthday_notifications,
    send_inactive_reminders,
)
from apps.notifications.tasks.push import send_single_notification  # noqa: F401

__all__ = [
    "send_birthday_notifications",
    "send_email_campaign",
    "send_inactive_reminders",
    "send_single_notification",
    "send_sms_campaign",
    "send_wallet_notification_campaign",
    "send_whatsapp_campaign",
]
