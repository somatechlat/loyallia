"""
Loyallia AI Chat Session Cleanup Tasks (apps.ai.tasks)

Agent-side hygiene for the dashboard AI chatbot: Agent Zero contexts whose
Loyallia binding expired must not linger on the agent. Scheduled daily via
Celery beat (see loyallia/celery.py).

SEC: cleanup is driven exclusively by the AIChatSession table — a context
that was never tenant-bound is never addressed, keeping the task scoped to
the contexts this platform created.
"""

import logging

from celery import shared_task
from django.utils import timezone

from apps.ai.models import AIChatSession
from apps.tenants.services.ai_proxy import terminate_context

logger = logging.getLogger(__name__)


@shared_task(queue="default")
def cleanup_expired_ai_chat_sessions() -> dict:
    """Terminate expired agent chat contexts and deactivate their bindings.

    For every session with ``is_active=True`` and ``expires_at < now``:
    best-effort ``api_terminate_chat`` on the agent, then the binding is
    flipped inactive.

    Deterministic and idempotent: an expired session is already unusable by
    contract (``resolve_for_tenant`` rejects it) and the agent expires its
    contexts through ``lifetime_hours`` regardless, so the binding is
    deactivated even when the agent is unreachable — a re-run finds nothing
    left to process. A failed terminate is logged for operators.
    """
    now = timezone.now()
    expired = AIChatSession.objects.filter(
        is_active=True, expires_at__lt=now
    ).order_by("expires_at")

    processed = 0
    terminated = 0
    terminate_failed = 0
    for session in expired.iterator():
        processed += 1
        try:
            terminate_context(
                context_id=session.context_id, tenant_id=session.tenant_id
            )
            terminated += 1
        except Exception as e:
            terminate_failed += 1
            logger.warning(
                "AI chat cleanup: could not terminate context '%s' on the agent "
                "(%s); deactivating the binding anyway.",
                session.context_id[:12],
                e.__class__.__name__,
            )
        AIChatSession.objects.filter(pk=session.pk, is_active=True).update(
            is_active=False, updated_at=timezone.now()
        )

    if processed:
        logger.info(
            "AI chat cleanup: %s expired session(s), %s terminated on the agent, "
            "%s terminate failure(s).",
            processed,
            terminated,
            terminate_failed,
        )
    return {
        "processed": processed,
        "terminated": terminated,
        "terminate_failed": terminate_failed,
    }
