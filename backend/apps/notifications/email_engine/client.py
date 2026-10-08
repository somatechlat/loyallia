"""
Loyallia Mailjet email client

Mass email is sent through Django SMTP using Mailjet credentials from Vault.
No credential values are logged or returned.
"""

import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection

from common.email_config import get_default_from_email

logger = logging.getLogger(__name__)


def send_raw_email(
    to_email: str,
    subject: str,
    body_html: str,
    from_email: str | None = None,
) -> dict:
    """Send a raw HTML email via Mailjet SMTP.

    Args:
        to_email: Recipient email address
        subject: Email subject line
        body_html: Full HTML body content
        from_email: Optional custom sender

    Returns:
        Delivery summary dict
    """
    msg = EmailMultiAlternatives(
        subject=subject,
        body="",
        from_email=from_email or get_default_from_email(),
        to=[to_email],
    )
    msg.attach_alternative(body_html, "text/html")
    sent_count = msg.send(fail_silently=False)
    return {"status": "sent" if sent_count else "not_sent", "sent_count": sent_count}


def get_health() -> dict:
    """Check Mailjet SMTP configuration without printing credentials."""
    configured = bool(
        getattr(settings, "EMAIL_HOST_USER", "")
        and getattr(settings, "EMAIL_HOST_PASSWORD", "")
        and get_default_from_email()
    )
    if not configured:
        return {"status": "missing_credentials", "provider": "mailjet"}
    return {"status": "ok", "provider": "mailjet"}


def is_mailjet_available() -> bool:
    """Check if Mailjet SMTP is configured and reachable."""
    try:
        if get_health().get("status") != "ok":
            return False
        connection = get_connection(fail_silently=False)
        connection.open()
        connection.close()
        return True
    except Exception as exc:
        logger.warning("Mailjet SMTP not available: %s", exc)
        return False
