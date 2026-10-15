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
        The agent's JSON response: ``{context_id, response}``.

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

    while True:
        resp = _post(url, payload, headers)

        if active_context and not retried_fresh:
            if resp.status_code == 404:
                logger.info(
                    "AI agent no longer has context '%s'; starting a fresh session.",
                    active_context[:12],
                )
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

    return data
