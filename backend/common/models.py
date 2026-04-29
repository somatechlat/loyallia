"""
Loyallia — Abstract Base Model (LYL-L-ARCH-040)
Provides common fields (id, created_at, updated_at) for all models.
"""

import uuid

from django.db import models


class TimestampedModel(models.Model):
    """Abstract base model with UUID PK and timestamp fields."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
