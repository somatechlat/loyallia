"""
AI Query Log Model for Loyallia.

Persistent storage for AI API usage tracking, cost accounting,
and request/response auditing.
"""

from __future__ import annotations

import uuid

from django.db import models

from common.models import TimestampedModel


class AIQueryLog(TimestampedModel):
    """Log of AI API requests for cost tracking and auditing.

    Each row represents one AI API call (generate-template, suggest-colors,
    critique-design, suggest-stamp-icons) with token usage and cost data.
    """

    class Status(models.TextChoices):
        SUCCESS = "success", "Success"
        ERROR = "error", "Error"

    class Endpoint(models.TextChoices):
        GENERATE_TEMPLATE = "generate-template", "Generate Template"
        SUGGEST_COLORS = "suggest-colors", "Suggest Colors"
        CRITIQUE_DESIGN = "critique-design", "Critique Design"
        SUGGEST_STAMP_ICONS = "suggest-stamp-icons", "Suggest Stamp Icons"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="ai_query_logs",
        help_text="Tenant that initiated the AI request.",
    )
    endpoint = models.CharField(
        max_length=32,
        choices=Endpoint.choices,
        help_text="AI endpoint that was called.",
    )
    prompt_tokens = models.PositiveIntegerField(default=0)
    completion_tokens = models.PositiveIntegerField(default=0)
    total_tokens = models.PositiveIntegerField(default=0)
    cost_usd = models.DecimalField(
        max_digits=12,
        decimal_places=6,
        default=0,
        help_text="Estimated cost in USD for this query.",
    )
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.SUCCESS,
    )
    error_message = models.TextField(blank=True, default="")
    request_data = models.JSONField(
        default=dict,
        help_text="Snapshot of request parameters (description, card_type, etc.).",
    )
    response_data = models.JSONField(
        default=dict,
        help_text="Snapshot of AI response data.",
    )

    class Meta:
        db_table = "ai_query_log"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "endpoint", "created_at"]),
            models.Index(fields=["tenant", "created_at"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"AIQueryLog({self.tenant_id} {self.endpoint} {self.total_tokens}tk)"
