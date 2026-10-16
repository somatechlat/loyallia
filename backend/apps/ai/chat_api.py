"""
Loyallia AI Chat Session API (Django Ninja Router)

Conversation-lifecycle endpoints for the dashboard AI chatbot:
current-session discovery (reload restore) and explicit conversation end.

Import contract: `from apps.ai.chat_api import router as ai_chat_router`
(registered by apps.tenants.api onto the /api/v1/tenants/ router).

The message proxy itself (POST /me/ai-chat/) stays in apps.tenants.api
(ai_chat_proxy) because it is plan-gated and quota-metered inside the tenant
billing pipeline. These endpoints only manage the AIChatSession lifecycle.

SEC: every lookup is scoped to request.tenant AND the requesting user
(created_by_id is set on every bind) — a session bound to another tenant or
user is never visible, resumable or terminable here.
"""

import logging

from django.http import HttpResponse
from django.utils import timezone
from ninja import Router, Schema
from ninja.errors import HttpError
from pydantic import Field

from apps.ai.models import AIChatSession
from apps.audit.models import AuditAction, AuditStatus
from apps.audit.service import log_action
from apps.tenants.services.ai_proxy import (
    AIProxyConfigError,
    AIProxyRequestError,
    terminate_context,
)
from common.messages import get_message
from common.permissions import is_manager_or_owner, jwt_auth
from common.plan_enforcement import check_feature_access

logger = logging.getLogger(__name__)

router = Router()


class AIChatSessionOut(Schema):
    """Current AI chat session metadata.

    Message content is never persisted server-side (AIQueryLog keeps counts
    only), so previous messages are deliberately not part of this payload.
    """

    context_id: str
    agent_profile: str
    created_at: str
    last_message_at: str | None
    message_count: int
    expires_at: str


class AIChatEndIn(Schema):
    """Optional body for the end endpoint.

    When ``context_id`` is omitted the caller's current session is ended;
    a specific context must still belong to the caller to be honored.
    """

    context_id: str | None = Field(default=None, max_length=128)


class AIChatEndOut(Schema):
    success: bool
    ended: bool


def _current_session(tenant, user) -> AIChatSession | None:
    """Return the caller's latest active, unexpired chat session, if any.

    Scoped to (tenant, created_by_id) so one user's conversation is never
    exposed to — or ended by — a colleague on the same tenant.
    """
    return (
        AIChatSession.objects.filter(
            tenant=tenant,
            created_by_id=user.id,
            is_active=True,
            expires_at__gt=timezone.now(),
        )
        .order_by("-updated_at")
        .first()
    )


@router.get(
    "/me/ai-chat/session/",
    auth=jwt_auth,
    response={200: AIChatSessionOut, 204: None},
    summary="Sesión de chat de IA activa",
)
def get_ai_chat_session(request):
    """Return the caller's current active AI chat session (204 when none).

    Lets the chatbot restore the conversation after a page reload instead of
    silently starting a new one. CONTRACT: 204, not 404 — "no conversation"
    is a normal state, not an error.
    """
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    # Same plan gate as the message proxy (apps.tenants.api.ai_chat_proxy):
    # tenants without the ai_assistant feature must not read session metadata.
    check_feature_access(request.tenant, "ai_assistant")

    session = _current_session(request.tenant, request.user)
    if session is None:
        return HttpResponse(status=204)

    return AIChatSessionOut(
        context_id=session.context_id,
        agent_profile=session.agent_profile,
        created_at=session.created_at.isoformat(),
        last_message_at=(
            session.last_message_at.isoformat() if session.last_message_at else None
        ),
        message_count=session.message_count,
        expires_at=session.expires_at.isoformat(),
    )


@router.post(
    "/me/ai-chat/end/",
    auth=jwt_auth,
    response=AIChatEndOut,
    summary="Finalizar la conversación de IA",
)
def end_ai_chat_session(request, payload: AIChatEndIn | None = None):
    """End the caller's current AI chat conversation (idempotent).

    Best-effort agent-side teardown (api_terminate_chat) followed by the
    local binding flip to is_active=False. Ending an already-ended (or
    nonexistent) conversation is a success no-op so clients may retry freely.
    """
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    # Same plan gate as the message proxy (apps.tenants.api.ai_chat_proxy):
    # tenants without the ai_assistant feature must not drive outbound agent
    # teardown traffic or manipulate session state.
    check_feature_access(request.tenant, "ai_assistant")

    requested_context = (
        payload.context_id.strip() if payload and payload.context_id else None
    )
    if requested_context:
        session = AIChatSession.objects.filter(
            tenant=request.tenant,
            created_by_id=request.user.id,
            context_id=requested_context,
            is_active=True,
        ).first()
    else:
        session = _current_session(request.tenant, request.user)

    if session is None:
        # Idempotent: nothing to end is a successful end.
        return AIChatEndOut(success=True, ended=False)

    # Best-effort: an unreachable agent must never block the local teardown.
    try:
        terminate_context(
            context_id=session.context_id,
            tenant_id=request.tenant.id,
            user_id=request.user.id,
        )
    except (AIProxyConfigError, AIProxyRequestError) as exc:
        logger.warning(
            "AI chat end: agent-side terminate failed for context '%s': %s",
            session.context_id[:12],
            exc,
        )
    except Exception:
        logger.exception(
            "AI chat end: unexpected error terminating context '%s'",
            session.context_id[:12],
        )

    AIChatSession.objects.filter(pk=session.pk).update(
        is_active=False, updated_at=timezone.now()
    )

    try:
        log_action(
            request=request,
            action=AuditAction.UPDATE,
            resource_type="ai_chat",
            resource_id=session.context_id,
            details={
                "action": "end_conversation",
                "message_count": session.message_count,
            },
            status=AuditStatus.SUCCESS,
        )
    except Exception:
        logger.exception("Failed to log ai_chat end audit action")

    return AIChatEndOut(success=True, ended=True)
