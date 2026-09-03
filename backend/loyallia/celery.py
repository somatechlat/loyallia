"""
Loyallia Celery Application
Configured via Django settings (CELERY_* keys in base.py).
Workers use this module: celery -A loyallia worker ...
"""

import logging
import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "loyallia.settings.production")

# Ensure Django's app registry (INSTALLED_APPS) is populated BEFORE any
# third-party model import. Without this, spinning up the beat process with
# `--scheduler django_celery_beat.schedulers:DatabaseScheduler` imports
# django_celery_beat.models before the registry is ready, crashing with the
# Python 3.13 error: "Model class ... doesn't declare an explicit app_label
# and isn't in an application in INSTALLED_APPS."
django.setup()

from celery import Celery
from celery.schedules import crontab

app = Celery("loyallia")  # type: ignore[operator]

# Load all CELERY_* settings from Django settings
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks in all INSTALLED_APPS
app.autodiscover_tasks()


# Dynamic backup beat schedule  reads frequency from PlatformSetting
def get_backup_schedule():
    """Return crontab for backup based on PlatformSetting 'backup_frequency'."""
    from celery.schedules import crontab

    try:
        from apps.tenants.models import PlatformSetting

        frequency = PlatformSetting.get("backup_frequency", "daily")
        hour = PlatformSetting.get_int("backup_hour", 3)
        minute = PlatformSetting.get_int("backup_minute", 0)
    except Exception as e:
        logging.getLogger(__name__).warning("Backup schedule fallback: %s", e)
        frequency = "daily"
        hour = 3
        minute = 0

    if frequency == "hourly":
        return crontab(minute="0")
    elif frequency == "weekly":
        return crontab(hour=str(hour), minute=str(minute), day_of_week="0")
    elif frequency == "disabled":
        return None  # No schedule when disabled
    else:
        # Default: daily
        return crontab(hour=str(hour), minute=str(minute))


# Programmatically add the backup schedule when Celery starts
_backup_schedule = get_backup_schedule()
if _backup_schedule is not None:
    app.conf.beat_schedule = getattr(app.conf, "beat_schedule", {})
    app.conf.beat_schedule["run-backup-scheduled"] = {
        "task": "apps.backup.tasks.run_full_backup",
        "schedule": _backup_schedule,
        "options": {"queue": "default"},
    }

    # Cleanup runs daily at 4 AM (after backup window)
    app.conf.beat_schedule["cleanup-old-backups"] = {
        "task": "apps.backup.tasks.cleanup_old_backups",
        "schedule": crontab(hour="4", minute="0"),
        "options": {"queue": "default"},
    }


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Development utility task for verifying Celery connectivity."""
    import logging

    logging.getLogger("loyallia.celery").debug("Request: %r", self.request)
