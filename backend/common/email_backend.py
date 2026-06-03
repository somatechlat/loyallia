"""
PlatformSetting-aware SMTP Email Backend — LOYALLIA

Django's default EmailBackend reads EMAIL_HOST / EMAIL_PORT / EMAIL_USE_TLS
from settings at init time. This backend reads them from PlatformSetting
(DB + Redis cache) at connection time, allowing SuperAdmin to change
SMTP routing without restarting containers.

Secrets (EMAIL_HOST_USER / EMAIL_HOST_PASSWORD) stay in Vault.
Routing values (host, port, tls) are runtime-configurable.

Usage in settings:
    EMAIL_BACKEND = "common.email_backend.PlatformSettingEmailBackend"
"""

from django.conf import settings
from django.core.mail.backends.smtp import EmailBackend as DjangoSmtpBackend

from common.platform_config import (
    get_platform_config,
    get_platform_config_bool,
    get_platform_config_int,
)


class PlatformSettingEmailBackend(DjangoSmtpBackend):
    """SMTP backend that reads host/port/tls from PlatformSetting at runtime."""

    def __init__(self, fail_silently=False, **kwargs):
        # Start with Django settings values as defaults
        _host = kwargs.pop("host", None) or getattr(settings, "EMAIL_HOST", "localhost")
        _port = kwargs.pop("port", None) or getattr(settings, "EMAIL_PORT", 25)
        _use_tls = kwargs.pop("use_tls", None)
        if _use_tls is None:
            _use_tls = getattr(settings, "EMAIL_USE_TLS", False)

        # PlatformSetting overrides (DB-driven, no restart needed)
        _host = get_platform_config("email_host", _host)
        _port = get_platform_config_int("email_port", _port)
        _tls_raw = get_platform_config("email_use_tls", "")
        if _tls_raw:
            _use_tls = get_platform_config_bool("email_use_tls", _use_tls)

        super().__init__(
            host=_host,
            port=_port,
            use_tls=_use_tls,
            fail_silently=fail_silently,
            **kwargs,
        )
