"""
Loyallia WhatsApp Bridge HTTP Client

Communicates with the whatsapp-bridge Node.js sidecar via REST API.
All operations are synchronous (using httpx)  async handled by Celery.

SEC: API key sent via Authorization header on every request.
PERF: Connection pooled via httpx.Client session.
"""

import logging

import httpx
from django.conf import settings

from common.vault import get_secret

logger = logging.getLogger(__name__)

# Connection timeout: short on purpose — create must not hang the browser.
# QR generation is requested separately via GET /qr after the session row exists.
_TIMEOUT = httpx.Timeout(connect=5.0, read=12.0, write=5.0, pool=5.0)


def _get_client() -> httpx.Client:
    """Build an httpx client for the WhatsApp bridge.

    PERF: Creates a new client per call. For Celery tasks that send
    many messages, callers should create a single client and pass it.
    """
    from common.platform_config import get_platform_config

    base_url = get_platform_config(
        "whatsapp_bridge_url",
        getattr(settings, "WHATSAPP_BRIDGE_URL", "http://whatsapp-bridge:3001"),
    )
    api_key = get_secret(
        "whatsapp_bridge_api_key",
        default=getattr(settings, "WHATSAPP_BRIDGE_API_KEY", ""),
    )

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    return httpx.Client(base_url=base_url, headers=headers, timeout=_TIMEOUT)


def get_qr(session_id: str, tenant_id: str | None = None) -> dict:
    """Request QR code for WhatsApp pairing of one session.

    The bridge is keyed by session UUID (multi-account), never tenant id.
    `tenant_id` is required on first start so the bridge can namespace Redis auth.

    Returns:
        {"qr": "base64-png-or-null", "connected": bool, "phone": str}
    """
    params = {"tenant_id": tenant_id} if tenant_id else None
    with _get_client() as client:
        resp = client.get(f"/qr/{session_id}", params=params)
        resp.raise_for_status()
        return resp.json()


def get_status(session_id: str) -> dict:
    """Get current connection status for a session.

    Returns:
        {"connected": bool, "qr": str|None, "phone": str}
    """
    with _get_client() as client:
        resp = client.get(f"/status/{session_id}")
        resp.raise_for_status()
        return resp.json()


def send_message(
    session_id: str,
    phone: str,
    message: str,
    media_url: str | None = None,
    metadata: dict | None = None,
) -> dict:
    """Enqueue a message for delivery through the bridge.

    Args:
        session_id: UUID of the WhatsAppSession that sends the message
        phone: E.164 phone number (e.g., "+593991234567")
        message: Text content
        media_url: Optional URL of image to attach
        metadata: Optional dict with delivery_log_id and campaign_run_id
            for analytics correlation

    Returns:
        {"success": bool, "job_id": str, "queued": bool}

    Raises:
        httpx.HTTPStatusError: If bridge returns an error
    """
    payload: dict[str, str | dict | None] = {
        "session_id": str(session_id),
        "phone": phone,
        "message": message,
    }
    if media_url:
        payload["media_url"] = media_url
    if metadata:
        payload["metadata"] = metadata

    with _get_client() as client:
        resp = client.post("/send", json=payload)
        resp.raise_for_status()
        return resp.json()


def disconnect(session_id: str) -> dict:
    """Disconnect and clean up one WhatsApp session.

    Returns:
        {"success": bool}
    """
    with _get_client() as client:
        resp = client.post(f"/disconnect/{session_id}")
        resp.raise_for_status()
        return resp.json()


def get_health() -> dict:
    """Check bridge health status.

    Returns:
        {"status": "ok", "sessions": int, "queue": {...}, "uptime": float}
    """
    with _get_client() as client:
        resp = client.get("/health")
        resp.raise_for_status()
        return resp.json()


def is_bridge_available() -> bool:
    """Check if the WhatsApp bridge service is reachable."""
    try:
        health = get_health()
        return health.get("status") == "ok"
    except Exception as exc:
        logger.warning("WhatsApp bridge not available: %s", exc)
        return False


def check_whatsapp_cooldown(
    phone: str, cooldown_seconds: int = settings.WHATSAPP_COOLDOWN_SECONDS
) -> bool:
    """Check if a phone number is within the cooldown period.

    Uses Redis to track the last sent time per phone number.
    Returns True if the phone is on cooldown (should skip), False if allowed.

    """
    import time

    from django.core.cache import caches

    cache = caches["default"]
    key = f"whatsapp:cooldown:{phone}"
    now = int(time.time())

    last_sent = cache.get(key)
    if last_sent and (now - last_sent) < cooldown_seconds:
        return True  # On cooldown

    # Set/update the cooldown timestamp
    cache.set(key, now, timeout=cooldown_seconds)
    return False  # Not on cooldown, proceed


def clear_whatsapp_cooldown(phone: str) -> None:
    """Manually clear cooldown for a phone number (e.g., for testing)."""
    from django.core.cache import caches

    cache = caches["default"]
    cache.delete(f"whatsapp:cooldown:{phone}")
