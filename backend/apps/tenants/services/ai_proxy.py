"""
Loyallia AI Proxy Service (apps.tenants.services.ai_proxy)

Business logic for proxying chat requests to the external AI Agent (Agent Zero).
Handles Vault secret retrieval, HTTP orchestration, tenant identity propagation,
server-side PII masking, context-aware retries and error normalisation.

Called by: apps.tenants.api (ai_chat_proxy endpoint)

Agent Zero contract (verified against Agent Zero source `api/api_message.py`
and `helpers/api.py`):
    POST   {ai_agent_base_url}/api/api_message
    header X-API-KEY: <Vault ai_agent_api_key>  (compared to the agent's
           settings.mcp_server_token; missing/wrong => HTTP 401)
    body   {message, lifetime_hours (> 0), context_id?, agent_profile?}
    reply  {context_id, response}
    errors 400 invalid payload / profile mismatch on existing context,
           404 unknown context_id, 401 invalid API key

    POST   {ai_agent_base_url}/api/api_terminate_chat
    header X-API-KEY: <Vault ai_agent_api_key>
    body   {user, context_id}
    reply  2xx terminated / 404 context already gone (both = done)
"""

import logging

import httpx
from django.conf import settings

from common.logging_utils import mask_pii
from common.messages import get_message
from common.vault import get_secret

logger = logging.getLogger(__name__)

# Agent Zero mounts every api/<name>.py handler under /api/ (helpers/api.py).
AGENTS_API_PATH = "/api/api_message"
AGENTS_TERMINATE_PATH = "/api/api_terminate_chat"

# Upstream error bodies are logged for diagnostics but truncated so agent
# internals (and prompt fragments) never land whole in the log pipeline.
_MAX_UPSTREAM_LOG_CHARS = 200


class AIProxyConfigError(Exception):
    """Raised when the AI proxy is missing required configuration."""

    pass


class AIProxyRequestError(Exception):
    """Raised when the AI proxy HTTP request fails."""

    def __init__(self, message: str, status_code: int | None = None):
        self.status_code = status_code
        super().__init__(message)


def _agent_credentials() -> tuple[str, str]:
    """Resolve (api_key, base_url) from Vault with Django settings fallback.

    Raises:
        AIProxyConfigError: When either value is missing.
    """
    api_key = get_secret("ai_agent_api_key")
    if not api_key:
        logger.error("ai_agent_api_key not found in Vault.")
        raise AIProxyConfigError(get_message("AI_ASSISTANT_NOT_CONFIGURED"))

    agent_base_url = get_secret("ai_agent_base_url")
    if not agent_base_url:
        agent_base_url = getattr(settings, "AI_AGENT_BASE_URL", "")
    if not agent_base_url:
        logger.error("ai_agent_base_url not configured.")
        raise AIProxyConfigError(get_message("AI_ASSISTANT_NOT_CONFIGURED"))

    return api_key, agent_base_url.rstrip("/")


def _post(url: str, payload: dict, headers: dict) -> httpx.Response:
    """POST to the agent, normalising transport failures to AIProxyRequestError."""
    try:
        with httpx.Client(timeout=settings.HTTP_TIMEOUT_AI_PROXY) as client:
            return client.post(url, json=payload, headers=headers)
    except httpx.TimeoutException as e:
        # SEC: log the URL only — never the payload (it carries user content).
        logger.error("AI agent timeout calling %s", url)
        raise AIProxyRequestError(get_message("AI_ASSISTANT_UNAVAILABLE")) from e
    except httpx.HTTPError as e:
        logger.error(
            "AI agent transport error calling %s: %s", url, e.__class__.__name__
        )
        raise AIProxyRequestError(get_message("AI_ASSISTANT_UNAVAILABLE")) from e


def terminate_context(
    context_id: str,
    *,
    tenant_id=None,
    user_id=None,
    user: str = "user",
) -> bool:
    """Terminate an agent-side chat context (api_terminate_chat).

    Teardown of contexts this service created (conversation end, superseded
    fresh-session retries, expired-session cleanup). Contexts created through
    ``chat_with_ai`` omit the contract's ``user`` field, so they live in the
    agent's default user scope — ``user`` must target that same scope or the
    agent will not find the context.

    A context the agent no longer knows (404) counts as terminated: teardown
    is idempotent.

    Returns:
        True when the context is gone (terminated now or already gone).

    Raises:
        AIProxyConfigError: Missing API key/base URL or rejected key (401).
        AIProxyRequestError: Upstream failure. Callers perform teardown on a
            best-effort basis and must treat these as non-fatal.
    """
    api_key, agent_base_url = _agent_credentials()
    headers = {
        "X-API-KEY": api_key,
        "Content-Type": "application/json",
    }
    # SEC: opaque identifiers only — never names, e-mails or other PII.
    if tenant_id is not None:
        headers["X-Tenant-ID"] = str(tenant_id)
    if user_id is not None:
        headers["X-User-ID"] = str(user_id)

    url = f"{agent_base_url}{AGENTS_TERMINATE_PATH}"
    resp = _post(url, {"user": user, "context_id": context_id}, headers)

    if resp.status_code in (200, 204, 404):
        # 404: the agent already dropped the context — teardown is complete.
        logger.info(
            "AI agent context '%s' terminated (status %s).",
            context_id[:12],
            resp.status_code,
        )
        return True

    if resp.status_code == 401:
        logger.error(
            "AI agent rejected the API key on terminate (401). Verify "
            "ai_agent_api_key in Vault against the agent's mcp_server_token."
        )
        raise AIProxyConfigError(get_message("AI_ASSISTANT_NOT_CONFIGURED"))

    logger.error(
        "AI agent terminate returned status %s: %s",
        resp.status_code,
        resp.text[:_MAX_UPSTREAM_LOG_CHARS],
    )
    upstream_status = resp.status_code
    if upstream_status >= 500:
        upstream_status = 502
    raise AIProxyRequestError(
        get_message("AI_CHAT_ERROR", detail=f"status {upstream_status}"),
        status_code=upstream_status,
    )


def _terminate_abandoned_context(
    context_id: str, *, tenant_id=None, user_id=None
) -> None:
    """Synchronous best-effort teardown of a context abandoned by a fresh-session
    retry (bounded by the proxy HTTP timeout; see terminate_context).

    Best-effort by design: when the agent is unreachable the context expires
    through its own lifetime_hours anyway — a teardown failure is logged and
    swallowed so the user's fresh conversation still starts.

    NOTE: if the fresh retry itself then fails, the stale local binding is not
    retired here (the caller retries bind on the next request). It self-heals:
    the next message sends the dead context_id, the agent answers 404 and the
    standard fresh-session retry replaces the binding.
    """
    try:
        terminate_context(context_id=context_id, tenant_id=tenant_id, user_id=user_id)
    except Exception as e:  # teardown is strictly best-effort
        logger.warning(
            "Could not terminate abandoned AI context '%s': %s",
            context_id[:12],
            e.__class__.__name__,
        )


def chat_with_ai(
    message: str,
    *,
    tenant_id=None,
    user_id=None,
    context_id: str | None = None,
    agent_profile: str | None = None,
    lifetime_hours: int = 24,
) -> dict:
    """Proxy a chat message to the AI Agent.

    Injects the Vault-backed ``ai_agent_api_key`` so the key never reaches the
    frontend, masks PII server-side before egress, and forwards tenant/session
    identity headers. When the agent no longer knows the supplied context
    (expired or purged), one retry without the context starts a fresh session
    instead of failing the user.

    Args:
        message: The user's message (masked before it leaves Loyallia).
        tenant_id: Owning tenant, forwarded as ``X-Tenant-ID``.
        user_id: Requesting user, forwarded as ``X-User-ID``.
        context_id: Existing agent context (must already be tenant-bound).
        agent_profile: Agent profile selected from platform settings/session.
        lifetime_hours: Context lifetime passed to the agent (> 0).

    Returns:
        The agent's JSON response: ``{context_id, response}``. When a
        fresh-session retry superseded the supplied context, the response is
        augmented with ``superseded_context_id`` so the caller can retire the
        stale binding instead of ever resurrecting it.

    Raises:
        AIProxyConfigError: Missing API key or base URL (maps to HTTP 503).
        AIProxyRequestError: Upstream failure (timeout/unreachable => 503,
            agent 4xx/5xx => normalised status with a safe message).
    """
    api_key, agent_base_url = _agent_credentials()

    # SEC: server-side PII re-masking — client-side masking is advisory only.
    safe_message = mask_pii(message)

    payload: dict = {
        "message": safe_message,
        "lifetime_hours": float(lifetime_hours),
    }
    if agent_profile:
        payload["agent_profile"] = agent_profile

    headers = {
        "X-API-KEY": api_key,
        "Content-Type": "application/json",
    }
    # SEC: opaque identifiers only — never names, e-mails or other PII.
    if tenant_id is not None:
        headers["X-Tenant-ID"] = str(tenant_id)
    if user_id is not None:
        headers["X-User-ID"] = str(user_id)

    active_context = context_id or None
    if active_context:
        payload["context_id"] = active_context

    url = f"{agent_base_url}{AGENTS_API_PATH}"
    # Guarantees at most one fresh-session retry per call.
    retried_fresh = False
    # Context abandoned by a fresh-session retry (if any), surfaced to the
    # caller so its stale binding is never resurrected.
    superseded_context: str | None = None

    while True:
        resp = _post(url, payload, headers)

        if active_context and not retried_fresh:
            if resp.status_code == 404:
                logger.info(
                    "AI agent no longer has context '%s'; starting a fresh session.",
                    active_context[:12],
                )
                # No terminate needed: the agent already dropped the context.
                superseded_context = active_context
                payload.pop("context_id", None)
                active_context = None
                retried_fresh = True
                continue
            if resp.status_code == 400 and "profile" in resp.text.lower():
                logger.info(
                    "AI agent rejected the stored profile for context '%s'; "
                    "starting a fresh session.",
                    active_context[:12],
                )
                # The agent still HOLDS this context (mutable-profile error),
                # so it must be terminated or it leaks agent-side. Only the
                # binding is abandoned, never the agent's copy.
                _terminate_abandoned_context(
                    active_context, tenant_id=tenant_id, user_id=user_id
                )
                superseded_context = active_context
                payload.pop("context_id", None)
                active_context = None
                retried_fresh = True
                continue
        break

    if resp.status_code == 401:
        # The agent's mcp_server_token does not match Vault ai_agent_api_key.
        logger.error(
            "AI agent rejected the API key (401). Verify ai_agent_api_key in "
            "Vault against the agent's mcp_server_token setting."
        )
        raise AIProxyConfigError(get_message("AI_ASSISTANT_NOT_CONFIGURED"))

    if resp.status_code >= 400:
        logger.error(
            "AI agent returned status %s: %s",
            resp.status_code,
            resp.text[:_MAX_UPSTREAM_LOG_CHARS],
        )
        # SEC: clients receive a normalised status + generic message only —
        # upstream error bodies never propagate to the browser.
        upstream_status = resp.status_code
        if upstream_status >= 500:
            upstream_status = 502
        raise AIProxyRequestError(
            get_message("AI_CHAT_ERROR", detail=f"status {upstream_status}"),
            status_code=upstream_status,
        )

    try:
        data = resp.json()
    except ValueError as e:
        logger.error("AI agent returned a non-JSON response (%s chars)", len(resp.text))
        raise AIProxyRequestError(get_message("AI_ASSISTANT_UNAVAILABLE")) from e

    if not isinstance(data, dict) or "response" not in data:
        logger.error("AI agent response is missing the 'response' field.")
        raise AIProxyRequestError(get_message("AI_ASSISTANT_UNAVAILABLE"))

    if superseded_context:
        data["superseded_context_id"] = superseded_context
    return data
