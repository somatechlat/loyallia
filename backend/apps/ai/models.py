"""
AI Query Log Model for Loyallia.

Persistent storage for AI API usage tracking, cost accounting,
and request/response auditing.
"""

from __future__ import annotations

import datetime
import logging
import uuid

from django.db import IntegrityError, models
from django.utils import timezone

from common.models import TimestampedModel

logger = logging.getLogger(__name__)


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
        SUGGEST_LAYOUT = "suggest-layout", "Suggest Layout"
        CHAT = "chat", "Chat Assistant"

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


class AIChatSession(TimestampedModel):
    """Tenant-bound registry of AI agent chat contexts (sessions).

    SEC: The agent issues a `context_id` on first contact. This model is the
    single source of truth binding every context to the tenant that owns it.
    Any client-supplied `context_id` MUST resolve through
    `resolve_for_tenant()` before it may be forwarded to the agent — a context
    owned by another tenant (or expired) is never honored, which prevents
    cross-tenant conversation access.
    """

    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="ai_chat_sessions",
        help_text="Tenant that owns this chat context.",
    )
    context_id = models.CharField(
        max_length=128,
        unique=True,
        db_index=True,
        help_text="Agent-side conversation context identifier.",
    )
    agent_profile = models.CharField(
        max_length=64,
        help_text=(
            "Agent profile the session was created with. The stored value is "
            "re-sent for every message because the agent rejects profile "
            "changes on an existing context."
        ),
    )
    created_by_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="ID of the user who started the session (audit only).",
    )
    message_count = models.PositiveIntegerField(
        default=1, help_text="Messages exchanged in this session."
    )
    is_active = models.BooleanField(
        default=True, help_text="Inactive sessions are never resumed."
    )
    last_message_at = models.DateTimeField(
        null=True, blank=True, help_text="Timestamp of the most recent message."
    )
    expires_at = models.DateTimeField(
        db_index=True,
        help_text="Session expiry; mirrors the agent-side lifetime_hours value.",
    )

    class Meta:
        db_table = "loyallia_ai_chat_sessions"
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["tenant", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"AIChatSession({self.tenant_id} {self.context_id[:8]})"

    @classmethod
    def resolve_for_tenant(
        cls, tenant, context_id: str | None
    ) -> AIChatSession | None:
        """Return the session only when it is active, unexpired and owned by ``tenant``.

        Returns ``None`` for missing, foreign, inactive or expired contexts so
        the caller starts a fresh session — a context_id that fails this check
        is never forwarded to the agent.
        """
        if not context_id:
            return None
        return cls.objects.filter(
            tenant=tenant,
            context_id=context_id,
            is_active=True,
            expires_at__gt=timezone.now(),
        ).first()

    @classmethod
    def bind(
        cls,
        *,
        tenant,
        context_id: str,
        agent_profile: str,
        created_by_id=None,
        lifetime_hours: int = 24,
    ) -> AIChatSession | None:
        """Bind an agent-issued ``context_id`` to ``tenant`` (or refresh the binding).

        Returns ``None`` only in the defensive case where the agent re-issued a
        context already bound to a different tenant — such a context is never
        adopted, and the event is logged as a security anomaly.
        """
        now = timezone.now()
        expires_at = now + datetime.timedelta(hours=int(lifetime_hours))
        try:
            session, created = cls.objects.get_or_create(
                context_id=context_id,
                defaults={
                    "tenant": tenant,
                    "agent_profile": agent_profile,
                    "created_by_id": created_by_id,
                    "expires_at": expires_at,
                    "last_message_at": now,
                    "message_count": 1,
                },
            )
        except IntegrityError:
            # True concurrent bind of the same context_id: adopt the winner's
            # row and fall through to the tenant-ownership check below.
            session, created = cls.objects.get(context_id=context_id), False
        if created:
            return session
        if session.tenant_id != tenant.id:
            logger.error(
                "SEC: agent context '%s' already bound to tenant %s, refused "
                "adoption by tenant %s",
                context_id,
                session.tenant_id,
                tenant.id,
            )
            return None
        cls.objects.filter(pk=session.pk).update(
            last_message_at=now,
            expires_at=expires_at,
            message_count=models.F("message_count") + 1,
            updated_at=now,
        )
        session.refresh_from_db()
        return session
