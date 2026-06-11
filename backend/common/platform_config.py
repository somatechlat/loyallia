"""
Platform Configuration Helper — LOYALLIA

Reads runtime configuration from PlatformSetting (DB + Redis cache) first,
with fallback to Django settings (env vars / Vault). This allows SuperAdmin
to change URLs, endpoints, and business rules without restarting containers.

Secrets (passwords, keys, tokens) MUST stay in Vault — never in PlatformSetting.

Usage:
    from common.platform_config import get_platform_config, get_platform_config_int, get_platform_config_bool

    public_url = get_platform_config("public_base_url", settings.PUBLIC_BASE_URL)
    email_host = get_platform_config("email_host", settings.EMAIL_HOST)
"""

import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def get_platform_config(key: str, fallback: str = "") -> str:
    """Read a string platform setting from DB cache, falling back to Django settings."""
    try:
        from apps.tenants.models import PlatformSetting

        value = PlatformSetting.get(key, "")
        if value:
            return value
    except Exception as e:
        logger.debug(
            "PlatformSetting unavailable for key '%s' (%s), using fallback.", key, e
        )
    # Fallback to Django settings attribute if it exists
    if fallback:
        return fallback
    setting_attr = key.upper()
    return getattr(settings, setting_attr, "")


def get_platform_config_int(key: str, fallback: int = 0) -> int:
    """Read an integer platform setting."""
    raw = get_platform_config(key, str(fallback))
    try:
        return int(raw)
    except (ValueError, TypeError):
        return fallback


def get_platform_config_bool(key: str, fallback: bool = False) -> bool:
    """Read a boolean platform setting."""
    raw = get_platform_config(key, str(fallback)).lower().strip()
    return raw in ("true", "1", "yes", "on")
