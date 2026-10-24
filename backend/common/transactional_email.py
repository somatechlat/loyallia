"""
Transactional email sender (OTP, portal, auth, team invites).

Separate from campaign mass-mail (Mailjet). Uses TRANSACTIONAL_EMAIL_* from
Vault / PlatformSetting when fully configured (dedicated SMTP transport).
Otherwise falls back to Django's configured EMAIL_BACKEND so delivery always
honors the deployment's email configuration (locmem in tests, console in
development, PlatformSetting-aware SMTP in production) instead of silently
dropping the message.

SEC: credentials never logged or returned.
"""

from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection
from django.core.mail.backends.smtp import EmailBackend as SmtpBackend

logger = logging.getLogger(__name__)


class TransactionalEmailError(Exception):
    """Raised when a transactional email cannot be delivered.

    Surfaces transport failures and misconfiguration to callers instead of
    silently dropping the message. Never contains credentials.
    """


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
        "is_dedicated": _has_dedicated_smtp(),
    }


def _has_dedicated_smtp() -> bool:
    """True when the dedicated transactional SMTP transport is fully configured."""
    return bool(
        getattr(settings, "TRANSACTIONAL_EMAIL_HOST", "")
        and getattr(settings, "TRANSACTIONAL_EMAIL_HOST_USER", "")
    )


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
    """Send one transactional email.

    Transport selection:
    - Dedicated transactional SMTP (TRANSACTIONAL_EMAIL_HOST + _HOST_USER both
      set): sent through ``TransactionalSmtpBackend``.
    - Anything else: sent through Django's configured ``EMAIL_BACKEND``
      (``get_connection()``) so runtime/platform email configuration is
      honored and test/dev backends (locmem/console) capture the message.

    Returns True if at least one message was accepted by the transport.

    Raises:
        TransactionalEmailError: the transport failed to send. The original
            exception is chained as ``__cause__``; no credentials are logged.
    """
    if not to:
        logger.warning("send_transactional_email called with empty recipients")
        return False

    if _has_dedicated_smtp():
        connection = TransactionalSmtpBackend(fail_silently=False)
        transport = "dedicated-smtp"
    else:
        connection = get_connection(fail_silently=False)
        transport = f"email-backend:{getattr(settings, 'EMAIL_BACKEND', 'default')}"

    msg = EmailMultiAlternatives(
        subject=subject,
        body=body_text,
        from_email=from_email,
        to=to,
        connection=connection,
    )
    msg.attach_alternative(body_html, "text/html")
    try:
        sent = msg.send(fail_silently=False)
    except Exception as exc:
        # SEC: exception text may contain SMTP dialogue; never log credentials.
        logger.exception(
            "Transactional email FAILED subject=%r to=%s transport=%s",
            subject,
            to,
            transport,
        )
        raise TransactionalEmailError(
            f"transactional email send failed (transport={transport})"
        ) from exc
    logger.info(
        "Transactional email subject=%r to=%s sent=%s transport=%s",
        subject,
        to,
        sent,
        transport,
    )
    return bool(sent)


def is_transactional_email_ready() -> bool:
    cfg = _txn_settings()
    return bool(cfg["host"] and cfg["user"] and cfg["password"])
