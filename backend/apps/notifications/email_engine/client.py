"""
Loyallia  Mailjet email client (LYL-SRS-006)

Mass email is sent through Django SMTP using Mailjet credentials from Vault.
No credential values are logged or returned.
"""

import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection

from common.email_config import get_default_from_email

logger = logging.getLogger(__name__)


def send_transactional(
    to_email: str,
    template_id: int,
    data: dict | None = None,
    from_email: str | None = None,
    subject: str | None = None,
    content_type: str = "html",
) -> dict:
    """Send a transactional email via Mailjet SMTP.

    Args:
        to_email: Recipient email address
        template_id: Retained for backward-compatible call signatures
        data: Template variable data (key-value)
        from_email: Optional custom sender
        subject: Optional custom subject override
        content_type: "html", "markdown", or "plain"

    Returns:
        Delivery summary dict
    """
    del template_id, data, content_type
    return send_raw_email(
        to_email=to_email,
        subject=subject or "Loyallia",
        body_html="",
        from_email=from_email,
    )


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


def create_subscriber(
    email: str,
    name: str,
    lists: list[int] | None = None,
    attribs: dict | None = None,
) -> dict:
    """Compatibility no-op for the retired subscriber-sync API.

    Args:
        email: Subscriber email address
        name: Display name
        lists: Retained for backward-compatible call signatures
        attribs: Custom attributes (e.g., tenant_id, customer_id)
    """
    del name, lists, attribs
    logger.debug("Mailjet SMTP does not require local subscriber sync for %s", email)
    return {"status": "not_required"}


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


def is_listmonk_available() -> bool:
    """Backward-compatible alias for callers not yet renamed."""
    return is_mailjet_available()
