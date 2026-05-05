"""
Loyallia — Twilio SMS Client (LYL-SRS-009)

Production SMS delivery via the Twilio REST API.
Credentials are fetched from HashiCorp Vault (twilio_account_sid, twilio_auth_token,
twilio_from_number) — NEVER hardcoded.

API Reference:
    https://www.twilio.com/docs/sms/quickstart/python
    https://www.twilio.com/docs/sms/api/message-resource

Called by:
    - apps.automation.models.Automation._execute_send_sms()
    - apps.notifications.tasks.send_sms_campaign()

Performance (Rule 12):
    - PERF: Twilio client is created per-call. For bulk campaigns, the caller
      should use send_sms_bulk() which creates a single client and reuses it.
    - PERF: Messages are truncated to 1600 chars (Twilio long-SMS max).

Security (SEC):
    - SEC: Credentials read via django.conf.settings (Vault-backed).
    - SEC: Phone numbers must be E.164 format.
"""

import logging

from django.conf import settings

logger = logging.getLogger(__name__)

# Twilio SMS body limit (long SMS / concatenated SMS support)
_MAX_SMS_LENGTH = 1600


def _get_twilio_client():
    """Build a Twilio REST client using Vault-managed credentials.

    Raises:
        RuntimeError: If Twilio credentials are not configured.
    """
    from twilio.rest import Client

    account_sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
    auth_token = getattr(settings, "TWILIO_AUTH_TOKEN", "")

    if not account_sid or not auth_token:
        raise RuntimeError(
            "Twilio credentials not configured. Set twilio_account_sid and "
            "twilio_auth_token in Vault or environment variables."
        )

    return Client(account_sid, auth_token)


def send_sms(phone: str, message: str) -> dict:
    """Send a single SMS message via Twilio.

    Args:
        phone: Recipient phone in E.164 format (e.g., "+593991234567")
        message: SMS body text (truncated to 1600 chars)

    Returns:
        {"sid": str, "status": str, "success": True} on success
        {"success": False, "error": str} on failure

    Raises:
        RuntimeError: If Twilio is not configured.
    """
    if not phone:
        return {"success": False, "error": "No recipient phone number provided"}

    from_number = getattr(settings, "TWILIO_FROM_NUMBER", "")
    if not from_number:
        raise RuntimeError(
            "Twilio sender number not configured. Set twilio_from_number in Vault."
        )

    client = _get_twilio_client()

    try:
        msg = client.messages.create(
            body=message[:_MAX_SMS_LENGTH],
            from_=from_number,
            to=phone,
        )
        logger.info(
            "SMS sent: sid=%s status=%s to=%s",
            msg.sid,
            msg.status,
            phone[-4:],  # Log only last 4 digits for privacy
        )
        return {
            "sid": msg.sid,
            "status": msg.status,
            "success": True,
        }
    except Exception as exc:
        error_msg = str(exc)[:500]
        logger.error("SMS send failed to %s: %s", phone[-4:], error_msg)
        return {"success": False, "error": error_msg}


def send_sms_bulk(recipients: list[dict]) -> dict:
    """Send SMS messages to multiple recipients using a single Twilio client.

    Args:
        recipients: List of {"phone": str, "message": str} dicts

    Returns:
        {"succeeded": int, "failed": int, "results": list[dict]}
    """
    from_number = getattr(settings, "TWILIO_FROM_NUMBER", "")
    if not from_number:
        raise RuntimeError(
            "Twilio sender number not configured. Set twilio_from_number in Vault."
        )

    client = _get_twilio_client()
    succeeded = 0
    failed = 0
    results = []

    for recipient in recipients:
        phone = recipient.get("phone", "")
        message = recipient.get("message", "")

        if not phone or not message:
            results.append({"phone": phone, "success": False, "error": "Missing data"})
            failed += 1
            continue

        try:
            msg = client.messages.create(
                body=message[:_MAX_SMS_LENGTH],
                from_=from_number,
                to=phone,
            )
            results.append({"phone": phone[-4:], "success": True, "sid": msg.sid})
            succeeded += 1
        except Exception as exc:
            results.append({"phone": phone[-4:], "success": False, "error": str(exc)[:200]})
            failed += 1

    logger.info("SMS bulk send: %d/%d succeeded", succeeded, len(recipients))
    return {"succeeded": succeeded, "failed": failed, "results": results}


def is_sms_available() -> bool:
    """Check if Twilio SMS is properly configured and available."""
    account_sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
    auth_token = getattr(settings, "TWILIO_AUTH_TOKEN", "")
    from_number = getattr(settings, "TWILIO_FROM_NUMBER", "")
    return bool(account_sid and auth_token and from_number)
