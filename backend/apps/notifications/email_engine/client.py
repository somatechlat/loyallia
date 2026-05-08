"""
Loyallia — Listmonk REST API Client (LYL-SRS-006)

Communicates with the Listmonk email engine for:
- Transactional email sending (POST /api/tx)
- Subscriber management (sync from Customer model)
- Campaign analytics retrieval

SEC: BasicAuth credentials from Django settings (Vault in production).
PERF: Connection pooled via httpx.Client.
"""
from __future__ import annotations

import logging

import httpx
from django.conf import settings

from common.vault import get_secret

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(connect=10.0, read=30.0, write=10.0, pool=10.0)


def _get_client() -> httpx.Client:
    """Build an httpx client for Listmonk API."""
    base_url = get_secret(
        "listmonk_url",
        env_fallback="LISTMONK_URL",
        default=getattr(settings, "LISTMONK_URL", "http://listmonk:9000"),
    )
    api_user = get_secret(
        "listmonk_api_user",
        env_fallback="LISTMONK_API_USER",
        default=getattr(settings, "LISTMONK_API_USER", ""),
    )
    api_token = get_secret(
        "listmonk_api_token",
        env_fallback="LISTMONK_API_TOKEN",
        default=getattr(settings, "LISTMONK_API_TOKEN", ""),
    )

    auth = (api_user, api_token) if api_user and api_token else None

    return httpx.Client(
        base_url=base_url,
        auth=auth,
        headers={"Content-Type": "application/json"},
        timeout=_TIMEOUT,
    )


def send_transactional(
    to_email: str,
    template_id: int,
    data: dict | None = None,
    from_email: str | None = None,
    subject: str | None = None,
    content_type: str = "html",
) -> dict:
    """Send a transactional email via Listmonk.

    Uses Listmonk's POST /api/tx endpoint for single-recipient emails.

    Args:
        to_email: Recipient email address
        template_id: ID of the Listmonk template to use
        data: Template variable data (key-value)
        from_email: Optional custom sender (uses Listmonk default if None)
        subject: Optional custom subject override
        content_type: "html", "markdown", or "plain"

    Returns:
        Listmonk API response dict
    """
    payload = {
        "subscriber_email": to_email,
        "template_id": template_id,
        "data": data or {},
        "content_type": content_type,
    }
    if from_email:
        payload["from_email"] = from_email
    if subject:
        payload["headers"] = [{"Subject": subject}]

    with _get_client() as client:
        resp = client.post("/api/tx", json=payload)
        resp.raise_for_status()
        return resp.json()


def send_raw_email(
    to_email: str,
    subject: str,
    body_html: str,
    from_email: str | None = None,
) -> dict:
    """Send a raw HTML email via Listmonk transactional API.

    For campaigns that don't use Listmonk templates (e.g., the owner
    composed HTML directly in the campaign wizard).

    Args:
        to_email: Recipient email address
        subject: Email subject line
        body_html: Full HTML body content
        from_email: Optional custom sender

    Returns:
        Listmonk API response dict
    """
    payload = {
        "subscriber_email": to_email,
        "template_id": 1,  # Default template — body injected below
        "data": {
            "subject": subject,
            "body": body_html,
        },
        "content_type": "html",
    }
    if from_email:
        payload["from_email"] = from_email

    with _get_client() as client:
        resp = client.post("/api/tx", json=payload)
        resp.raise_for_status()
        return resp.json()


def create_subscriber(
    email: str,
    name: str,
    lists: list[int] | None = None,
    attribs: dict | None = None,
) -> dict:
    """Create or update a subscriber in Listmonk.

    Uses Listmonk's POST /api/subscribers endpoint.
    If the subscriber already exists (by email), updates their data.

    Args:
        email: Subscriber email address
        name: Display name
        lists: List of Listmonk list IDs to subscribe to
        attribs: Custom attributes (e.g., tenant_id, customer_id)
    """
    payload = {
        "email": email,
        "name": name,
        "status": "enabled",
        "lists": lists or [],
        "attribs": attribs or {},
    }

    with _get_client() as client:
        resp = client.post("/api/subscribers", json=payload)
        if resp.status_code == 409:
            # Subscriber exists — update instead
            logger.debug("Subscriber %s already exists, skipping", email)
            return {"status": "exists"}
        resp.raise_for_status()
        return resp.json()


def get_health() -> dict:
    """Check Listmonk health status."""
    with _get_client() as client:
        resp = client.get("/health")
        resp.raise_for_status()
        return resp.json()


def is_listmonk_available() -> bool:
    """Check if Listmonk service is reachable."""
    try:
        health = get_health()
        return health.get("status") == "ok"
    except Exception as exc:
        logger.warning("Listmonk not available: %s", exc)
        return False
