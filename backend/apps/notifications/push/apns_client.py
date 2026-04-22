"""
Loyallia — APNs Client (Apple Push Notification service)

Uses the APNs HTTP/2 token-based authentication (JWT Provider Token).
Reference: https://developer.apple.com/documentation/usernotifications/establishing_a_token-based_connection_to_apns

Authentication flow:
  1. Load the APNs Auth Key (.p8 file) — NOT the pass signing cert
  2. Sign a JWT with kid=KEY_ID, iss=TEAM_ID, iat=now, exp=now+3600
  3. Send to https://api.push.apple.com:443 (production) or api.sandbox.push.apple.com (dev)
  4. Reuse token for up to 1 hour, then refresh

Headers per Apple spec:
  apns-topic: {APPLE_PASS_TYPE_IDENTIFIER}
  apns-push-type: alert
  authorization: bearer {jwt}

NOTE: APNs HTTP/2 requires httpx with HTTP/2 support (httpx[http2]) or httpcore[asyncio].
      We use httpx with h2 support explicitly.
"""

import logging
import os
import time

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)

APNS_PRODUCTION_HOST = "https://api.push.apple.com"
APNS_SANDBOX_HOST = "https://api.sandbox.push.apple.com"

# Module-level token cache: {(key_id, team_id): (token_str, expires_at)}
_token_cache: dict[tuple, tuple[str, float]] = {}


def _get_apns_jwt_token() -> str | None:
    """
    Generate (or return cached) APNs Provider JWT token.

    Returns the bearer token string, or None if APNs is not configured.
    """
    apns_key_id = getattr(settings, "APPLE_APNS_KEY_ID", "")
    apple_team_id = getattr(settings, "APPLE_TEAM_IDENTIFIER", "")
    apns_auth_key_path = getattr(settings, "APPLE_APNS_AUTH_KEY_PATH", "")

    if not all([apns_key_id, apple_team_id, apns_auth_key_path]):
        logger.warning(
            "APNs not fully configured (APPLE_APNS_KEY_ID, APPLE_TEAM_IDENTIFIER, "
            "APPLE_APNS_AUTH_KEY_PATH must all be set). iOS push disabled."
        )
        return None

    if not os.path.exists(apns_auth_key_path):
        logger.warning("APNs auth key not found at '%s'. iOS push disabled.", apns_auth_key_path)
        return None

    # Check cache
    cache_key = (apns_key_id, apple_team_id)
    if cache_key in _token_cache:
        token_str, expires_at = _token_cache[cache_key]
        if time.time() < expires_at - 60:  # Refresh 60s before expiry
            return token_str

    # Generate new token
    try:
        import jwt as pyjwt  # PyJWT

        with open(apns_auth_key_path) as f:
            private_key = f.read()

        now = int(time.time())
        payload = {
            "iss": apple_team_id,
            "iat": now,
        }
        headers = {
            "alg": "ES256",
            "kid": apns_key_id,
        }

        token_str = pyjwt.encode(payload, private_key, algorithm="ES256", headers=headers)
        expires_at = float(now + 3600)  # APNs tokens valid for 1 hour

        _token_cache[cache_key] = (token_str, expires_at)
        return token_str

    except Exception as exc:
        logger.error("Failed to generate APNs JWT: %s", exc)
        return None


def send_apns_message(
    device_token: str,
    title: str,
    body: str,
    data: dict | None = None,
    badge: int | None = None,
    sound: str = "default",
    sandbox: bool | None = None,
) -> bool:
    """
    Send a push notification to a single iOS device via APNs HTTP/2.

    Args:
        device_token: APNs device token (hex string)
        title:        Notification title
        body:         Notification body
        data:         Optional custom data dictionary
        badge:        Optional badge count to display
        sound:        Sound name (default: "default")
        sandbox:      Force sandbox (None = auto-detect from DEBUG setting)

    Returns:
        True if APNs accepted the message (HTTP 200), False otherwise.
    """
    jwt_token = _get_apns_jwt_token()
    if not jwt_token:
        return False

    topic = getattr(settings, "APPLE_PASS_TYPE_IDENTIFIER", "pass.com.loyallia.cards")

    # Auto-detect sandbox from Django DEBUG setting
    use_sandbox = sandbox if sandbox is not None else getattr(settings, "DEBUG", False)
    host = APNS_SANDBOX_HOST if use_sandbox else APNS_PRODUCTION_HOST

    aps_payload: dict = {
        "alert": {
            "title": title,
            "body": body,
        },
        "sound": sound,
    }
    if badge is not None:
        aps_payload["badge"] = badge

    payload = {"aps": aps_payload}
    if data:
        payload.update(data)

    url = f"{host}/3/device/{device_token}"

    headers = {
        "authorization": f"bearer {jwt_token}",
        "apns-topic": topic,
        "apns-push-type": "alert",
        "apns-priority": "10",
    }

    try:
        # httpx HTTP/2 requires h2 package: pip install httpx[http2]
        with httpx.Client(http2=True, timeout=10.0) as client:
            response = client.post(url, json=payload, headers=headers)

        if response.status_code == 200:
            logger.debug("APNs message sent to …%s", device_token[-8:])
            return True

        # Parse APNs error reason
        try:
            reason = response.json().get("reason", "Unknown")
        except Exception:
            reason = response.text[:100]

        if reason == "BadDeviceToken" or reason == "Unregistered":
            logger.warning("APNs token invalid/unregistered (…%s): %s", device_token[-8:], reason)
        else:
            logger.error(
                "APNs HTTP %s for …%s: %s",
                response.status_code,
                device_token[-8:],
                reason,
            )
        return False

    except httpx.TimeoutException:
        logger.error("APNs request timed out for …%s", device_token[-8:])
        return False
    except Exception as exc:
        logger.error("APNs send error for …%s: %s", device_token[-8:], exc)
        return False
