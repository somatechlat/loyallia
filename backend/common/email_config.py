"""
Loyallia Runtime Email Configuration Helper

Provides get_default_from_email() so the sender address is read from
PlatformSetting at runtime (editable via SysAdmin UI) rather than locked
at startup from Vault or environment variables.

SEC: mailjet_api_key / mailjet_secret_key remain in Vault.
NON-SECRET: mailjet_sender_email and mailjet_sender_name are PlatformSettings.
"""

import logging

logger = logging.getLogger(__name__)


def get_default_from_email(fallback: str = "noreply@loyallia.com") -> str:
    """Return the platform default sender email address.

    Reads from PlatformSetting so SysAdmin can change it without restart.
    Falls back to the provided default if the DB is unavailable.
    """
    try:
        from apps.tenants.models import PlatformSetting

        value = PlatformSetting.get("mailjet_sender_email", "")
        if value and "@" in value:
            return value
    except Exception as e:
        logger.debug("PlatformSetting mailjet_sender_email unavailable (%s), using fallback.", e)
    return fallback


def get_default_sender_name(fallback: str = "Loyallia") -> str:
    """Return the platform default sender display name.

    Reads from PlatformSetting so SysAdmin can change it without restart.
    """
    try:
        from apps.tenants.models import PlatformSetting

        value = PlatformSetting.get("mailjet_sender_name", "")
        if value:
            return value
    except Exception as e:
        logger.debug("PlatformSetting mailjet_sender_name unavailable (%s), using fallback.", e)
    return fallback


def get_default_from(fallback_email: str = "noreply@loyallia.com", fallback_name: str = "Loyallia") -> str:
    """Return a fully formatted From header value.

    Example: 'Loyallia <noreply@loyallia.com>'
    """
    email = get_default_from_email(fallback_email)
    name = get_default_sender_name(fallback_name)
    if name:
        return f"{name} <{email}>"
    return email
