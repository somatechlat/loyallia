"""
Base utilities for Google Wallet pass builders.
"""

import logging
import re
from typing import Any

from django.conf import settings

from apps.tenants.models import PlatformSetting

logger = logging.getLogger(__name__)

# Google Wallet API barcode type mapping (ref: developers.google.com/wallet/generic/rest/v1/Barcode)
GOOGLE_BARCODE_FORMATS = {
    "qr_code": "QR_CODE",
    "aztec": "AZTEC",
    "code_128": "CODE_128",
    "pdf417": "PDF_417",
    "data_matrix": "DATA_MATRIX",
}


def _get_barcode_type(card) -> str:
    """Map Loyallia card barcode_type to Google Wallet Barcode.type."""
    return GOOGLE_BARCODE_FORMATS.get(card.barcode_type, "QR_CODE")


def _get_issuer_id() -> str:
    """Return the Google Wallet Issuer ID from Vault (not cached settings).

    This ensures the real issuer ID is always used, even if Django settings
    were loaded before the Vault secret was set.
    """
    from common.vault import get_secret

    issuer_id = get_secret("google_wallet_issuer_id", default="")
    if issuer_id and issuer_id not in ("", "n/a", "PLACEHOLDER_ISSUER_ID"):
        return issuer_id
    # Fallback to settings for backward compatibility
    return getattr(settings, "GOOGLE_WALLET_ISSUER_ID", "")


def _map_card_type_to_style(card_type: str) -> dict:
    """Map Loyallia card type to Google Wallet loyalty program fields."""
    styles = {
        "stamp": {"programName": "Tarjeta de Sellos"},
        "cashback": {"programName": "Programa de Cashback"},
        "coupon": {"programName": "Cupon de Descuento"},
        "vip_membership": {"programName": "Membresia VIP"},
        "gift_certificate": {"programName": "Certificado de Regalo"},
        "referral_pass": {"programName": "Programa de Referidos"},
        "discount": {"programName": "Tarjeta de Descuento"},
        "corporate_discount": {"programName": "Descuento Corporativo"},
        "multipass": {"programName": "Multipase"},
        "affiliate": {"programName": "Tarjeta de Afiliacion"},
    }
    return styles.get(card_type, {"programName": "Programa de Lealtad"})


def _resolve_gw_type(card_type: str) -> str:
    """
    Map Loyallia card_type to the correct Google Wallet API class family.
    Reference: https://developers.google.com/wallet/generic/rest/v1
    """
    OFFER_TYPES = {"coupon", "discount", "corporate_discount", "referral_pass"}
    GIFT_TYPES = {"gift_certificate", "cashback"}
    if card_type in OFFER_TYPES:
        return "offer"
    elif card_type in GIFT_TYPES:
        return "giftCard"
    return "loyalty"


def _is_local_or_private_url(url: str) -> bool:
    """Check if a URL uses a local/private IP that Google servers cannot reach."""
    if not url:
        return False
    local_patterns = [
        r"http://localhost[:/]",
        r"http://127\.\d+\.\d+\.\d+[:/]",
        r"http://192\.168\.\d+\.\d+[:/]",
        r"http://10\.\d+\.\d+\.\d+[:/]",
        r"http://172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+[:/]",
        r"https?://\[?::1\]?[:/]",
    ]
    return any(re.search(pattern, url, re.IGNORECASE) for pattern in local_patterns)


def _resolve_url(url: str, base_url: str) -> str:
    """Convert relative image URLs to absolute for Google Wallet API.

    Google Wallet servers fetch images directly, so they need full URLs.
    If the base URL is a local/private IP, returns a public placeholder
    so Google Wallet works during development.
    """
    if not url:
        return url
    if url.startswith("http://") or url.startswith("https://"):
        if _is_local_or_private_url(url):
            return _public_placeholder_for_url(url)
        return url
    if url.startswith("/"):
        resolved = base_url.rstrip("/") + url
        if _is_local_or_private_url(resolved):
            return _public_placeholder_for_url(url)
        return resolved
    return url


def _public_placeholder_for_url(original_url: str) -> str:
    """Return a public placeholder image URL for development/testing.

    Google Wallet servers cannot reach local network IPs, so we use
    public placeholder images during development.
    """
    return PlatformSetting.get("WALLET_PLACEHOLDER_IMAGE", default="")


def _get_google_locations(card) -> list:
    """Build location array from tenant locations for Google Wallet geo-push."""
    locations = []
    # Locations belong to the Tenant
    tenant_locations = card.tenant.locations.filter(is_active=True)[:10]

    for loc in tenant_locations:
        try:
            if loc.latitude and loc.longitude:
                locations.append(
                    {"latitude": float(loc.latitude), "longitude": float(loc.longitude)}
                )
        except (ValueError, TypeError):
            continue
    return locations


def _get_wallet_design(card) -> dict:
    metadata = card.metadata or {}
    if isinstance(metadata, dict):
        return metadata.get("wallet_design", {}) or {}
    return {}


def _get_google_images(card) -> dict:
    return _get_wallet_design(card).get("google_images", {}) or {}


def _get_google_advanced(card) -> dict:
    return _get_wallet_design(card).get("google_advanced", {}) or {}


def _transform_google_rows(rows: list) -> list:
    """Convert frontend google_rows format to Google Wallet API cardRowTemplateInfos format.

    Frontend format:
        [
            {"id": "...", "type": "oneItem", "items": [
                {"id": "...", "fieldPath": "object.accountName", "label": "..."}
            ]}
        ]

    Google format:
        [
            {"oneItem": {"item": {"firstValue": {"fields": [{"fieldPath": "..."}]}}}}
        ]
    """
    result = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        row_type = row.get("type")
        items = row.get("items", [])
        if not isinstance(items, list):
            continue

        try:
            if row_type == "oneItem" and len(items) >= 1:
                field_path = items[0].get("fieldPath", "")
                if field_path:
                    result.append(
                        {
                            "oneItem": {
                                "item": {
                                    "firstValue": {
                                        "fields": [{"fieldPath": field_path}]
                                    }
                                }
                            }
                        }
                    )
            elif row_type == "twoItems" and len(items) >= 2:
                start_fp = items[0].get("fieldPath", "")
                end_fp = items[1].get("fieldPath", "")
                if start_fp and end_fp:
                    result.append(
                        {
                            "twoItems": {
                                "startItem": {
                                    "firstValue": {"fields": [{"fieldPath": start_fp}]}
                                },
                                "endItem": {
                                    "firstValue": {"fields": [{"fieldPath": end_fp}]}
                                },
                            }
                        }
                    )
            elif row_type == "threeItems" and len(items) >= 3:
                start_fp = items[0].get("fieldPath", "")
                middle_fp = items[1].get("fieldPath", "")
                end_fp = items[2].get("fieldPath", "")
                if start_fp and middle_fp and end_fp:
                    result.append(
                        {
                            "threeItems": {
                                "startItem": {
                                    "firstValue": {"fields": [{"fieldPath": start_fp}]}
                                },
                                "middleItem": {
                                    "firstValue": {"fields": [{"fieldPath": middle_fp}]}
                                },
                                "endItem": {
                                    "firstValue": {"fields": [{"fieldPath": end_fp}]}
                                },
                            }
                        }
                    )
        except (AttributeError, IndexError, TypeError):
            # Skip malformed items
            continue
    return result


def _apply_card_template_override(card, payload: dict) -> None:
    """Add cardTemplateOverride from wallet_design.google_rows if available."""
    wallet_design = _get_wallet_design(card)
    google_rows = wallet_design.get("google_rows")
    if google_rows and isinstance(google_rows, list):
        payload["cardTemplateOverride"] = {
            "cardRowTemplateInfos": _transform_google_rows(google_rows)
        }


def _normalize_review_status(value: str | None) -> str | None:
    """Normalize reviewStatus to valid Google Wallet API enum values.

    The frontend historically saved 'underReview' (camelCase) instead of
    'UNDER_REVIEW' (the actual API enum). This fixes existing cards.
    """
    if not value:
        return None
    mapping = {
        "underreview": "UNDER_REVIEW",
        "under_review": "UNDER_REVIEW",
        "approved": "approved",
        "rejected": "rejected",
    }
    normalized = mapping.get(value.lower())
    return normalized if normalized else value


def _normalize_multiple_devices(value: Any) -> str | None:
    """Normalize allowMultipleUsers to valid Google Wallet API enum values.

    Handles both boolean (legacy) and string (current) values.
    Maps frontend 'MULTIPLE_USERS' → API 'MULTIPLE_HOLDERS'.
    """
    if value is None:
        return None
    if isinstance(value, bool):
        return "MULTIPLE_HOLDERS" if value else "ONE_USER_ALL_DEVICES"
    if isinstance(value, str):
        mapping = {
            "multiple_users": "MULTIPLE_HOLDERS",
            "multiple_holders": "MULTIPLE_HOLDERS",
            "one_user_all_devices": "ONE_USER_ALL_DEVICES",
            "one_user_one_device": "ONE_USER_ONE_DEVICE",
        }
        mapped = mapping.get(value.lower())
        if mapped:
            return mapped
        # Already a valid API value
        if value in {"MULTIPLE_HOLDERS", "ONE_USER_ALL_DEVICES", "ONE_USER_ONE_DEVICE"}:
            return value
    return None


def _apply_google_advanced_to_class(card, payload: dict) -> None:
    """Apply google_advanced settings relevant to class payloads."""
    advanced = _get_google_advanced(card)
    if not advanced:
        return
    review_status = _normalize_review_status(advanced.get("reviewStatus"))
    if review_status:
        payload["reviewStatus"] = review_status
    multi_device = _normalize_multiple_devices(advanced.get("allowMultipleUsers"))
    if multi_device:
        payload["multipleDevicesAndHoldersAllowedStatus"] = multi_device
    if advanced.get("homepageUri"):
        payload["homepageUri"] = advanced["homepageUri"]
    if advanced.get("helpUri"):
        payload["helpUri"] = advanced["helpUri"]
    if advanced.get("messages") and isinstance(advanced["messages"], list):
        payload.setdefault("messages", []).extend(advanced["messages"])
    _apply_links_module_uris(advanced, payload)


def _apply_google_advanced_to_object(card, payload: dict) -> None:
    """Apply google_advanced settings relevant to object payloads."""
    advanced = _get_google_advanced(card)
    if not advanced:
        return
    if advanced.get("messages") and isinstance(advanced["messages"], list):
        payload.setdefault("messages", []).extend(advanced["messages"])
    if advanced.get("notifyPreference"):
        payload["notifyPreference"] = advanced["notifyPreference"]
    _apply_links_module_uris(advanced, payload)


def _apply_links_module_uris(advanced: dict, payload: dict) -> None:
    """Merge custom linksModuleUris into linksModuleData."""
    links = advanced.get("linksModuleUris")
    if not links or not isinstance(links, list):
        return
    existing = payload.get("linksModuleData", {}).get("uris", [])
    new_uris = []
    for link in links:
        if isinstance(link, dict) and "uri" in link and "description" in link:
            new_uris.append(
                {
                    "uri": link["uri"],
                    "description": link["description"],
                    "id": link.get(
                        "id", f"custom_link_{len(existing) + len(new_uris)}"
                    ),
                }
            )
    if new_uris:
        payload.setdefault("linksModuleData", {"uris": []})
        payload["linksModuleData"]["uris"] = existing + new_uris
