"""
Loyallia Celery Application
Configured via Django settings (CELERY_* keys in base.py).
Workers use this module: celery -A loyallia worker ...
"""

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "loyallia.settings.development")

app = Celery("loyallia")

# Load all CELERY_* settings from Django settings
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks in all INSTALLED_APPS
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Development utility task for verifying Celery connectivity."""
    print(f"Request: {self.request!r}")
