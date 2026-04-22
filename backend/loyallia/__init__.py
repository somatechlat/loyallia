"""Loyallia Django project package."""

# Load Celery app so @shared_task decorators register at startup.
from loyallia.celery import app as celery_app  # noqa: F401

__all__ = ("celery_app",)
