"""
Transactional email sender (OTP, portal, auth, team invites).

Separate from campaign mass-mail (Mailjet). Uses TRANSACTIONAL_EMAIL_* from
Vault / PlatformSetting. Falls back to main EMAIL_* only when transactional
SMTP is not configured yet.

SEC: credentials never logged or returned.
"""

from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection
from django.core.mail.backends.smtp import EmailBackend as SmtpBackend

logger = logging.getLogger(__name__)


def _txn_settings() -> dict:
    host = (
        getattr(settings, "TRANSACTIONAL_EMAIL_HOST", "")
        or getattr(settings, "EMAIL_HOST", "")
    )
    port = int(getattr(settings, "TRANSACTIONAL_EMAIL_PORT", 0) or getattr(settings, "EMAIL_PORT", 587))
    use_tls = getattr(settings, "TRANSACTIONAL_EMAIL_USE_TLS", None)
    if use_tls is None:
        use_tls = getattr(settings, "EMAIL_USE_TLS", True)
    user = getattr(settings, "TRANSACTIONAL_EMAIL_HOST_USER", "") or getattr(
        settings, "EMAIL_HOST_USER", ""
    )
    password = getattr(settings, "TRANSACTIONAL_EMAIL_HOST_PASSWORD", "") or getattr(
        settings, "EMAIL_HOST_PASSWORD", ""
    )
    return {
        "host": host,
        "port": port,
        "use_tls": bool(use_tls),
        "user": user,
        "password": password,
        "is_dedicated": bool(
            getattr(settings, "TRANSACTIONAL_EMAIL_HOST", "")
            and getattr(settings, "TRANSACTIONAL_EMAIL_HOST_USER", "")
        ),
    }


class TransactionalSmtpBackend(SmtpBackend):
    """SMTP backend for transactional mail only."""

    def __init__(self, fail_silently=False, **kwargs):
        cfg = _txn_settings()
        super().__init__(
            host=cfg["host"] or "localhost",
            port=cfg["port"],
            username=cfg["user"] or None,
            password=cfg["password"] or None,
            use_tls=cfg["use_tls"],
            fail_silently=fail_silently,
            **kwargs,
        )


def send_transactional_email(
    *,
    subject: str,
    to: list[str],
    body_text: str,
    body_html: str,
    from_email: str | None = None,
) -> bool:
    """Send one transactional email via dedicated SMTP.

    Returns True if at least one message was accepted by SMTP.
    """
    if not to:
        logger.warning("send_transactional_email called with empty recipients")
        return False

    cfg = _txn_settings()
    if not cfg["host"] or not cfg["user"]:
        logger.error(
            "Transactional email not configured (TRANSACTIONAL_EMAIL_HOST / USER). "
            "Set Vault keys or fall back is incomplete."
        )
        return False

    connection = TransactionalSmtpBackend(fail_silently=False)
    msg = EmailMultiAlternatives(
        subject=subject,
        body=body_text,
        from_email=from_email,
        to=to,
        connection=connection,
    )
    msg.attach_alternative(body_html, "text/html")
    sent = msg.send(fail_silently=False)
    logger.info(
        "Transactional email subject=%r to=%s sent=%s dedicated=%s",
        subject,
        to,
        sent,
        cfg["is_dedicated"],
    )
    return bool(sent)


def is_transactional_email_ready() -> bool:
    cfg = _txn_settings()
    return bool(cfg["host"] and cfg["user"] and cfg["password"])
