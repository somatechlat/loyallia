"""
Loyallia AI Proxy Service (apps.tenants.services.ai_proxy)

Business logic for proxying chat requests to the external AI Agent.
Handles Vault secret retrieval, HTTP client orchestration, and error handling.
Called by: apps.tenants.api (ai_chat_proxy endpoint)
"""

import logging

import httpx
from django.conf import settings

from common.messages import get_message
from common.vault import get_secret

logger = logging.getLogger(__name__)


class AIProxyConfigError(Exception):
    """Raised when the AI proxy is missing required configuration."""

    pass


class AIProxyRequestError(Exception):
    """Raised when the AI proxy HTTP request fails."""

    def __init__(self, message: str, status_code: int | None = None):
        self.status_code = status_code
        super().__init__(message)


def chat_with_ai(
    message: str,
    history: list | None = None,
    model: str | None = None,
    *,
    context_id: str | None = None,
) -> dict:
    """Proxy a chat message to the external AI Agent.

    Injects the Vault-backed AI_AGENT_API_KEY to ensure zero frontend exposure.

    Args:
        message: The user's message to send to the AI agent.
        history: Optional conversation history.
        model: Optional model identifier.
        context_id: Optional conversation context ID.

    Returns:
        The parsed JSON response from the AI agent.

    Raises:
        AIProxyConfigError: If the API key or base URL is not configured.
        AIProxyRequestError: If the HTTP request to the AI agent fails.
    """
    api_key = get_secret("ai_agent_api_key")
    if not api_key:
        logger.error("AI_AGENT_API_KEY not found in Vault.")
        raise AIProxyConfigError(get_message("AI_ASSISTANT_NOT_CONFIGURED"))

    agent_base_url = get_secret("ai_agent_base_url")
    if not agent_base_url:
        agent_base_url = getattr(settings, "AI_AGENT_BASE_URL", "")
    if not agent_base_url:
        logger.error("AI_AGENT_BASE_URL not configured.")
        raise AIProxyConfigError(get_message("AI_ASSISTANT_NOT_CONFIGURED"))

    request_data = {
        "message": message,
        "lifetime_hours": 24,
    }
    if context_id:
        request_data["context_id"] = context_id
    if history:
        request_data["history"] = history
    if model:
        request_data["model"] = model

    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(
                f"{agent_base_url}/api_message",
                json=request_data,
                headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
            )
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPStatusError as e:
        logger.error(
            "AI Agent returned status %s: %s",
            e.response.status_code,
            e.response.text,
        )
        raise AIProxyRequestError(
            get_message(
                "AI_CHAT_ERROR",
                detail=f"status {e.response.status_code}",
            ),
            status_code=e.response.status_code,
        ) from e
    except Exception as e:
        logger.error("Error calling AI agent: %s", e)
        raise AIProxyRequestError(
            get_message("AI_ASSISTANT_UNAVAILABLE"),
        ) from e
