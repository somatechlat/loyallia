"""
Loyallia Abstract Base Model
Provides common fields (id, created_at, updated_at) for all models.
"""

import threading
import uuid

from django.db import models

_thread_locals = threading.local()


def get_current_user_id():
    """Return the UUID of the current request user from thread-local storage."""
    return getattr(_thread_locals, "user_id", None)


def set_current_user_id(user_id):
    """Set the current request user UUID in thread-local storage."""
    _thread_locals.user_id = user_id


class TimestampedModel(models.Model):
    """Abstract base model with UUID PK and timestamp fields."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
