"""
Loyallia Celery Configuration
Extracted from base.py for Rule 245 compliance.
All Celery settings are imported via `from loyallia.settings.celery_config import *`
"""

import sys

from celery.schedules import crontab

from common.vault import get_secret

# Queue name constants (also used by task decorators via settings).
from loyallia.settings.constants import (  # noqa: E402
    CELERY_QUEUE_DEFAULT,
    CELERY_QUEUE_PASS_GENERATION,
    CELERY_QUEUE_PUSH_DELIVERY,
)

# CELERY BROKER & RESULT BACKEND

CELERY_BROKER_URL = get_secret(
    "celery_broker_url",
    default="redis://localhost:6379/1",
)
CELERY_RESULT_BACKEND = get_secret(
    "celery_result_backend",
    default="redis://localhost:6379/2",
)

# SERIALIZATION & TIMING

CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "UTC"
CELERY_ENABLE_UTC = True
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 300  # 5 minutes hard limit
CELERY_TASK_SOFT_TIME_LIMIT = (
    240  # 4 minutes soft time limit (triggers SoftTimeLimitExceeded)
)
CELERY_WORKER_PREFETCH_MULTIPLIER = 1  # Fair task distribution
CELERY_ACKS_LATE = True  # Acknowledge after completion (prevents task loss)

# During Django test runs, execute Celery tasks synchronously so tests do not require a live broker.
CELERY_TASK_ALWAYS_EAGER = "test" in sys.argv
CELERY_TASK_EAGER_PROPAGATES = "test" in sys.argv

# TASK ROUTING matches actual task names in apps.*.tasks

CELERY_TASK_ROUTES = {
    "apps.customers.tasks.generate_qr_for_pass": {"queue": CELERY_QUEUE_PASS_GENERATION},
    "apps.customers.tasks.trigger_pass_update": {"queue": CELERY_QUEUE_PASS_GENERATION},
    "apps.customers.tasks.update_customer_analytics": {
        "queue": CELERY_QUEUE_PASS_GENERATION
    },
    "apps.customers.tasks_notify.redistribute_card_design": {
        "queue": CELERY_QUEUE_PASS_GENERATION
    },
    "apps.customers.tasks_notify.notify_card_google_fanout": {
        "queue": CELERY_QUEUE_PASS_GENERATION
    },
    "apps.customers.tasks_notify.dispatch_scheduled_field_notifications": {
        "queue": CELERY_QUEUE_PASS_GENERATION
    },
    "apps.customers.tasks_notify.dispatch_expiry_warning_notifications": {
        "queue": CELERY_QUEUE_PASS_GENERATION
    },
    "apps.notifications.tasks.send_single_notification": {
        "queue": CELERY_QUEUE_PUSH_DELIVERY
    },
    "apps.notifications.tasks.send_campaign_blast": {
        "queue": CELERY_QUEUE_PUSH_DELIVERY
    },
    "apps.notifications.tasks.send_birthday_notifications": {
        "queue": CELERY_QUEUE_PUSH_DELIVERY
    },
    "apps.notifications.tasks.send_inactive_reminders": {
        "queue": CELERY_QUEUE_PUSH_DELIVERY
    },
    "apps.automation.tasks.evaluate_trigger_for_customer": {
        "queue": CELERY_QUEUE_DEFAULT
    },
    "apps.automation.tasks.evaluate_scheduled_automations": {
        "queue": CELERY_QUEUE_DEFAULT
    },
    "apps.automation.tasks.evaluate_inactive_triggers": {
        "queue": CELERY_QUEUE_DEFAULT
    },
    "apps.automation.tasks.evaluate_birthday_triggers": {
        "queue": CELERY_QUEUE_DEFAULT
    },
    "apps.notifications.tasks.send_sms_campaign": {"queue": "sms_delivery"},
    "*": {"queue": CELERY_QUEUE_DEFAULT},
}

# BEAT SCHEDULER

CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"

CELERY_BEAT_SCHEDULE = {
    "birthday-notifications-daily": {
        "task": "apps.notifications.tasks.send_birthday_notifications",
        "schedule": crontab(hour="10", minute="0"),
        "options": {"queue": CELERY_QUEUE_PUSH_DELIVERY},
    },
    "inactive-reminders-daily": {
        "task": "apps.notifications.tasks.send_inactive_reminders",
        "schedule": crontab(hour="9", minute="0"),
        "kwargs": {"days_inactive": 30},
        "options": {"queue": CELERY_QUEUE_PUSH_DELIVERY},
    },
    "scheduled-automations-daily": {
        "task": "apps.automation.tasks.evaluate_scheduled_automations",
        "schedule": crontab(hour="8", minute="0"),
    },
    "inactive-automation-triggers-daily": {
        "task": "apps.automation.tasks.evaluate_inactive_triggers",
        "schedule": crontab(hour="8", minute="30"),
        "kwargs": {"days_threshold": 30},
    },
    "cleanup-expired-refresh-tokens": {
        "task": "apps.authentication.tasks.cleanup_expired_tokens",
        "schedule": crontab(hour="3", minute="0"),  # Daily at 3 AM
        "options": {"queue": CELERY_QUEUE_DEFAULT},
    },
    "birthday-automation-triggers-daily": {
        "task": "apps.automation.tasks.evaluate_birthday_triggers",
        "schedule": crontab(hour="6", minute="0"),  # Daily at 6 AM
    },
    "reset-whatsapp-daily-counters": {
        "task": "apps.notifications.whatsapp.tasks.reset_whatsapp_daily_counters",
        "schedule": crontab(hour="0", minute="0"),  # Daily at midnight UTC
        "options": {"queue": CELERY_QUEUE_DEFAULT},
    },
    "wallet-scheduled-field-notifications": {
        "task": "apps.customers.tasks_notify.dispatch_scheduled_field_notifications",
        "schedule": crontab(minute="*/15"),
        "options": {"queue": CELERY_QUEUE_PASS_GENERATION},
    },
    "wallet-expiry-warning-notifications": {
        "task": "apps.customers.tasks_notify.dispatch_expiry_warning_notifications",
        "schedule": crontab(hour="9", minute="0"),
        "options": {"queue": CELERY_QUEUE_PASS_GENERATION},
    },
}
