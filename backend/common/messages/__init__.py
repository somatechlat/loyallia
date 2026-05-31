"""
Loyallia Centralized i18n Message Registry (common/messages/)

All user-facing text is defined here with translations for ES, EN, FR, DE.
Messages are retrieved via get_message(code, lang=None, **kwargs).

Architecture:
    - Spanish (ES) is the canonical/primary language with full coverage.
    - English (EN) has full coverage. FR and DE have partial coverage.
    - Fallback chain: requested lang → ES canonical catalog → KeyError.
    - Module-level dicts are loaded once at import time (no per-request cost).

Language resolution order (get_message_for_request):
    1. User.preferred_language (explicit per-user preference)
    2. Tenant.default_language (business-wide setting)
    3. Accept-Language HTTP header
    4. Django LANGUAGE_CODE (settings)

Performance (Rule 12):
    - PERF: All catalogs are module-level dicts  O(1) lookup by code.
    - PERF: No database queries. No file I/O. No Django translation machinery.
    - PERF: str.format(**kwargs) used for interpolation (fastest Python option).

Called by: Every API endpoint, every error handler, every notification template.
Rule #11: All user-facing strings MUST go through get_message().
"""

from typing import Any

from django.conf import settings

from . import auth, billing, campaigns, common

# SUPPORTED LANGUAGES
SUPPORTED_LANGUAGES = ("es", "en", "fr", "de")
DEFAULT_LANGUAGE = "es"


# Merge per-module catalogs into unified language dicts
_MESSAGES_ES: dict[str, str] = {}
_MESSAGES_ES.update(auth._MESSAGES_ES)
_MESSAGES_ES.update(billing._MESSAGES_ES)
_MESSAGES_ES.update(campaigns._MESSAGES_ES)
_MESSAGES_ES.update(common._MESSAGES_ES)

_MESSAGES_EN: dict[str, str] = {}
_MESSAGES_EN.update(auth._MESSAGES_EN)
_MESSAGES_EN.update(billing._MESSAGES_EN)
_MESSAGES_EN.update(campaigns._MESSAGES_EN)
_MESSAGES_EN.update(common._MESSAGES_EN)

_MESSAGES_FR: dict[str, str] = {}
_MESSAGES_FR.update(auth._MESSAGES_FR)
_MESSAGES_FR.update(billing._MESSAGES_FR)
_MESSAGES_FR.update(campaigns._MESSAGES_FR)
_MESSAGES_FR.update(common._MESSAGES_FR)

_MESSAGES_DE: dict[str, str] = {}
_MESSAGES_DE.update(auth._MESSAGES_DE)
_MESSAGES_DE.update(billing._MESSAGES_DE)
_MESSAGES_DE.update(campaigns._MESSAGES_DE)
_MESSAGES_DE.update(common._MESSAGES_DE)


# CATALOG REGISTRY
_CATALOGS: dict[str, dict[str, str]] = {
    "es": _MESSAGES_ES,
    "en": _MESSAGES_EN,
    "fr": _MESSAGES_FR,
    "de": _MESSAGES_DE,
}


# PUBLIC API


def get_message(code: str, lang: str | None = None, **kwargs: Any) -> str:
    """
    Retrieve a user-facing message by code with i18n support.

    Args:
        code: Message code key (e.g. "AUTH_LOGIN_SUCCESS")
        lang: ISO 639-1 language code (es, en, fr, de). None = default.
        **kwargs: Values to interpolate into the message template

    Returns:
        Formatted message string in the requested language.
        Falls back to Spanish if translation is missing.
    """
    if lang is None:
        configured_lang = getattr(settings, "LANGUAGE_CODE", DEFAULT_LANGUAGE)
        lang = str(configured_lang) if configured_lang is not None else DEFAULT_LANGUAGE

    # Normalize: "es-ec" → "es"
    lang = lang[:2].lower()

    # Try requested language, then fall back to Spanish
    catalog = _CATALOGS.get(lang, _MESSAGES_ES)
    template = catalog.get(code)
    if template is None:
        # Fallback to Spanish canonical catalog
        template = _MESSAGES_ES.get(code)
    if template is None:
        raise KeyError(f"Unknown message code: '{code}'")

    if kwargs:
        return template.format(**kwargs)
    return template


def get_message_for_request(code: str, request=None, **kwargs: Any) -> str:
    """
    Retrieve a message using the language from the request context.
    Resolution: User.preferred_language → Tenant.default_language → settings.

    Args:
        code: Message code key
        request: Django HttpRequest (optional)
        **kwargs: Interpolation values
    """
    lang = None

    if request is not None:
        # 1. User preference
        user = getattr(request, "user", None)
        if user and hasattr(user, "preferred_language") and user.preferred_language:
            lang = user.preferred_language

        # 2. Tenant default
        if not lang:
            tenant = getattr(request, "tenant", None)
            if (
                tenant
                and hasattr(tenant, "default_language")
                and tenant.default_language
            ):
                lang = tenant.default_language

        # 3. Accept-Language header
        if not lang:
            accept_lang = request.META.get("HTTP_ACCEPT_LANGUAGE", "")
            if accept_lang:
                lang = accept_lang[:2].lower()

    return get_message(code, lang=lang, **kwargs)


def register_message(code: str, template: str, lang: str = "es") -> None:
    """
    Register a new message code (for use by individual apps).
    Raises ValueError if code conflicts with existing registration in that language.
    """
    catalog = _CATALOGS.get(lang, _MESSAGES_ES)
    if code in catalog:
        raise ValueError(f"Message code '{code}' is already registered for '{lang}'.")
    catalog[code] = template


# Backward compatibility: re-export the merged message dicts so that code doing
#   from common.messages import _MESSAGES_ES, _MESSAGES_EN, ...
# continues to work.
__all__ = [
    "SUPPORTED_LANGUAGES",
    "DEFAULT_LANGUAGE",
    "get_message",
    "get_message_for_request",
    "register_message",
    "_MESSAGES_ES",
    "_MESSAGES_EN",
    "_MESSAGES_FR",
    "_MESSAGES_DE",
    "_CATALOGS",
]
