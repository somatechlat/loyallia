"""
Loyallia Customer Portal Email Service (apps.customers.services.portal_email)

Business logic for sending portal-related emails.
Called by: apps.customers.portal_api
"""

import logging

from django.conf import settings

from common.email_template import send_branded_email

logger = logging.getLogger(__name__)


def send_portal_password_email(email: str, password: str) -> None:
    """Send temporary password email to customer for portal access.

    The send is executed synchronously through the real transactional
    transport (common.email_template -> common.transactional_email).

    Args:
        email: The customer's email address.
        password: The temporary password to include in the email.

    Raises:
        Exception: Re-raises so the caller can handle failure appropriately.
            Also raised when the transport accepts 0 messages, so a silent
            no-op can never be mistaken for a successful send.
    """
    base = (
        getattr(settings, "PUBLIC_BASE_URL", "")
        or getattr(settings, "APP_URL", "")
        or "http://localhost"
    )
    login_url = f"{base.rstrip('/')}/portal/login"

    try:
        from common.messages import get_message

        sent = send_branded_email(
            subject=get_message("TEAM_INVITE_WELCOME"),
            to=[email],
            title=get_message("TEAM_INVITE_WELCOME"),
            subtitle=get_message("TEAM_INVITE_WELCOME"),
            greeting=f"{get_message('TEAM_INVITE_GREETING', first_name='')},",
            paragraphs=[get_message("TEAM_INVITE_IGNORE")],
            credentials_email=email,
            credentials_password=password,
            cta_label=get_message("TEAM_INVITE_CTA"),
            cta_url=login_url,
            warning=get_message("TEAM_INVITE_PASSWORD_WARNING").replace("<strong>", "").replace("</strong>", ""),
        )
    except Exception as exc:
        logger.error("Failed to send portal password email to %s: %s", email, exc)
        raise

    if not sent:
        logger.error(
            "Portal password email NOT sent to %s (transport accepted 0 messages)",
            email,
        )
        raise RuntimeError("portal password email was not sent")
