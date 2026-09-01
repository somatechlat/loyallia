"""
Base utilities for Google Wallet pass builders.
"""

import logging
import re
from typing import Any

from django.conf import settings

from apps.tenants.models import PlatformSetting
from common.messages import get_message
from common.platform_config import get_platform_config

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
        "stamp": {"programName": get_message("WALLET_PROGRAM_STAMP")},
        "cashback": {"programName": get_message("WALLET_PROGRAM_CASHBACK")},
        "coupon": {"programName": get_message("WALLET_PROGRAM_COUPON")},
        "vip_membership": {"programName": get_message("WALLET_PROGRAM_VIP")},
        "gift_certificate": {"programName": get_message("WALLET_PROGRAM_GIFT")},
        "referral_pass": {"programName": get_message("WALLET_PROGRAM_REFERRAL")},
        "discount": {"programName": get_message("WALLET_PROGRAM_DISCOUNT")},
        "corporate_discount": {"programName": get_message("WALLET_PROGRAM_CORPORATE")},
        "multipass": {"programName": get_message("WALLET_PROGRAM_MULTIPASS")},
        "affiliate": {"programName": get_message("WALLET_PROGRAM_AFFILIATE")},
    }
    return styles.get(card_type, {"programName": get_message("WALLET_PROGRAM_LOYALTY")})


def _resolve_gw_type(card_type: str) -> str:
    """
    Map Loyallia card_type to the correct Google Wallet API class family.
    Reference: https://developers.google.com/wallet/generic/rest/v1
    """
    OFFER_TYPES = {"coupon", "discount", "corporate_discount", "referral_pass"}
    GIFT_TYPES = {"gift_certificate"}
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
        if not base_url:
            base_url = get_platform_config(
                "public_base_url", getattr(settings, "PUBLIC_BASE_URL", "")
            )
        if not base_url:
            logger.warning("Cannot resolve relative URL %s: no base_url available", url)
            return url
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
    tenant_locations = card.tenant.locations.filter(is_active=True)[
        : settings.PASS_GOOGLE_MAX_LOCATIONS
    ]

    for loc in tenant_locations:
        try:
            if loc.latitude and loc.longitude:
                locations.append(
                    {"latitude": float(loc.latitude), "longitude": float(loc.longitude)}
                )
        except (ValueError, TypeError):
            continue
    return locations


# ---------------------------------------------------------------------------
# WalletStudio V2 helpers
# ---------------------------------------------------------------------------


def _get_wallet_studio(card) -> dict:
    """Return the wallet_studio dict from card metadata, if any."""
    metadata = card.metadata or {}
    if isinstance(metadata, dict):
        return metadata.get("wallet_studio", {}) or {}
    return {}


def _get_v2_google_config(card) -> dict:
    """Return the google-specific config from WalletStudio V2 state."""
    return _get_wallet_studio(card).get("google", {}) or {}


def _get_v2_image_url(v2_images: dict, key: str) -> str:
    """Extract an absolute image URL from a WalletStudio V2 image asset."""
    asset = v2_images.get(key) if isinstance(v2_images, dict) else None
    if isinstance(asset, dict):
        return asset.get("url") or ""
    if isinstance(asset, str):
        return asset
    return ""


def _resolve_v2_dynamic_value(
    template: str, card, customer_pass, customer, tenant
) -> str:
    """Resolve WalletStudio V2 dynamic templates like {customer_name} to real values.

    Supported tokens:
        {customer_name}, {first_name}, {last_name}, {email}
        {program_name}, {business_name}, {tenant_name}
        {stamp_count}, {cashback_balance}, {gift_balance}
        {referral_count}, {coupon_redemption_count}, {corporate_discount}
        {discount_tier}, {current_tier}, {membership_tier}
        {qr_code}, {account_id}, {balance}, {points}
        {bundle_remaining}, {bundle_size}
    """
    if not template or not isinstance(template, str):
        return template or ""

    pass_data = getattr(customer_pass, "pass_data", None) or {}

    def _replacer(match: re.Match) -> str:
        key = match.group(1).strip().lower()

        if key == "customer_name":
            return f"{customer.first_name or ''} {customer.last_name or ''}".strip()
        if key == "first_name":
            return customer.first_name or ""
        if key == "last_name":
            return customer.last_name or ""
        if key == "email":
            return customer.email or ""
        if key in ("program_name", "card_name"):
            return card.name or ""
        if key in ("business_name", "tenant_name", "merchant_name"):
            return tenant.name or ""
        if key == "stamp_count":
            return str(getattr(customer_pass, "stamp_count_val", 0))
        if key == "cashback_balance":
            return str(getattr(customer_pass, "cashback_balance_val", 0))
        if key == "gift_balance":
            return str(getattr(customer_pass, "gift_balance_val", 0))
        if key == "referral_count":
            return str(getattr(customer_pass, "referral_count_val", 0))
        if key == "coupon_redemption_count":
            return str(getattr(customer_pass, "coupon_redemption_count", 0))
        if key == "corporate_discount":
            return str(getattr(customer_pass, "corporate_discount", 0))
        if key == "discount_tier":
            return getattr(customer_pass, "discount_tier", "") or pass_data.get(
                "discount_tier", ""
            )
        if key == "current_tier":
            return getattr(customer_pass, "discount_tier", "") or pass_data.get(
                "discount_tier", ""
            )
        if key == "membership_tier":
            return pass_data.get("membership_tier", "")
        if key == "qr_code":
            return getattr(customer_pass, "qr_code", "") or ""
        if key == "account_id":
            return str(customer.id)[:8]
        if key == "balance":
            return str(getattr(customer_pass, "gift_balance_val", 0))
        if key == "points":
            return str(getattr(customer_pass, "stamp_count_val", 0))
        if key == "bundle_remaining":
            return str(getattr(customer_pass, "multipass_remaining_val", 0))
        if key == "bundle_size":
            metadata = card.metadata or {}
            return str(
                metadata.get("bundle_size", settings.PASS_GOOGLE_BUNDLE_SIZE_DEFAULT)
            )
        if key == "coupon_end_date":
            metadata = card.metadata or {}
            return str(
                metadata.get("coupon_end_date", pass_data.get("expiry_date", ""))
            )
        if key == "usage_limit":
            metadata = card.metadata or {}
            return str(
                metadata.get("usage_limit", metadata.get("usage_limit_per_customer", 1))
            )
        if key == "company_name":
            metadata = card.metadata or {}
            return str(
                pass_data.get("company_name", metadata.get("company_name", card.name))
            )

        # Unknown token: leave as-is so the pass still shows the literal token
        return match.group(0)

    return re.sub(r"\{([^}]+)\}", _replacer, template)


def _build_v2_text_modules_data(card, customer_pass, customer, tenant) -> list:
    """Build Google Wallet textModulesData from WalletStudio V2 fields and back content."""
    wallet_studio = _get_wallet_studio(card)
    fields = wallet_studio.get("fields") or []
    back_content = wallet_studio.get("backContent") or {}
    back_fields = back_content.get("fields") if isinstance(back_content, dict) else []
    if not isinstance(back_fields, list):
        back_fields = []

    modules = []

    for field in fields:
        if not isinstance(field, dict):
            continue
        if not field.get("showOnGoogle", True):
            continue
        value = field.get("value", "")
        if field.get("isDynamic") and field.get("dynamicTemplate"):
            value = _resolve_v2_dynamic_value(
                field["dynamicTemplate"], card, customer_pass, customer, tenant
            )
        header = field.get("label", "")
        body = _resolve_v2_dynamic_value(
            str(value), card, customer_pass, customer, tenant
        )
        field_id = field.get("id")
        if not field_id:
            field_id = f"field_{len(modules)}"
        if header or body:
            modules.append({"header": header, "body": body, "id": field_id})

    # Append back content fields as plain text modules (links handled separately)
    for idx, back_field in enumerate(back_fields):
        if not isinstance(back_field, dict):
            continue
        if back_field.get("isLink"):
            continue
        header = back_field.get("label", "")
        body = back_field.get("value", "")
        field_id = back_field.get("id") or f"back_field_{idx}"
        if header or body:
            modules.append({"header": header, "body": body, "id": field_id})

    return modules


def _build_v2_links_module_data(card) -> list:
    """Build Google Wallet linksModuleData.uris from WalletStudio V2 back content."""
    wallet_studio = _get_wallet_studio(card)
    back_content = wallet_studio.get("backContent") or {}
    back_fields = back_content.get("fields") if isinstance(back_content, dict) else []
    if not isinstance(back_fields, list):
        return []

    uris = []
    for back_field in back_fields:
        if not isinstance(back_field, dict):
            continue
        if not back_field.get("isLink"):
            continue
        uri = back_field.get("value") or back_field.get("url") or ""
        description = back_field.get("label") or back_field.get("description") or "Link"
        field_id = back_field.get("id") or f"link_{len(uris)}"
        if uri:
            uris.append({"uri": uri, "description": description, "id": field_id})

    # Also include any explicit links from google config
    google_cfg = _get_v2_google_config(card)
    extra_links = google_cfg.get("linksModuleUris") or []
    if isinstance(extra_links, list):
        for link in extra_links:
            if isinstance(link, dict) and link.get("uri"):
                uris.append(
                    {
                        "uri": link["uri"],
                        "description": link.get("description", "Link"),
                        "id": link.get("id") or f"google_link_{len(uris)}",
                    }
                )

    return uris


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


def _derive_google_rows_from_fields(fields: list) -> list:
    """Derive Google Wallet row structure from V2 UnifiedField list.

    Groups fields by fieldGroup and creates row entries compatible with
    _transform_google_rows().
    """
    from collections import defaultdict

    groups = defaultdict(list)
    for field in fields:
        if not isinstance(field, dict):
            continue
        if not field.get("showOnGoogle", True):
            continue
        group = field.get("fieldGroup", "primary")
        groups[group].append(field)

    rows = []
    group_order = ["header", "primary", "secondary", "auxiliary", "back"]
    for group_name in group_order:
        group_fields = sorted(groups.get(group_name, []), key=lambda f: f.get("order", 0))
        if not group_fields:
            continue
        items = []
        for field in group_fields:
            items.append({
                "id": field.get("id", ""),
                "fieldPath": f"class.{group_name}[{len(items)}]",
                "label": field.get("label", ""),
                "displayName": field.get("label", ""),
            })
        row_type = "oneItem" if len(items) == 1 else "twoItems" if len(items) == 2 else "threeItems"
        rows.append({"id": group_name, "type": row_type, "items": items[:3]})

    return rows


def _apply_card_template_override(card, payload: dict) -> None:
    """Add cardTemplateOverride from WalletStudio V2 google rows if available."""
    wallet_studio = _get_wallet_studio(card)
    google_cfg = wallet_studio.get("google", {}) or {}
    google_rows = google_cfg.get("rows")
    if not google_rows or not isinstance(google_rows, list):
        # Derive rows from V2 fields
        fields = wallet_studio.get("fields") or []
        if fields and isinstance(fields, list):
            google_rows = _derive_google_rows_from_fields(fields)
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

    Handles both boolean and string values.
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
    """Apply WalletStudio V2 google config to class payloads."""
    advanced = _get_v2_google_config(card)
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
    if advanced.get("merchantName"):
        payload["merchantName"] = advanced["merchantName"]
    if advanced.get("programName"):
        payload["programName"] = advanced["programName"]
    if advanced.get("messages") and isinstance(advanced["messages"], list):
        payload.setdefault("messages", []).extend(advanced["messages"])
    _apply_links_module_uris(advanced, payload)

    # V2 color override takes precedence
    v2_colors = _get_wallet_studio(card).get("colors") or {}
    if advanced.get("hexBackgroundColor"):
        payload["hexBackgroundColor"] = advanced["hexBackgroundColor"]
    elif v2_colors.get("background"):
        payload["hexBackgroundColor"] = v2_colors["background"]

    # V2 hero image for Google
    hero_url = _get_v2_image_url(_get_wallet_studio(card).get("images") or {}, "strip")
    if not hero_url:
        hero_url = _get_v2_image_url(
            _get_wallet_studio(card).get("images") or {}, "strip2x"
        )
    google_hero = advanced.get("heroImage")
    if isinstance(google_hero, dict) and google_hero.get("url"):
        hero_url = google_hero["url"]
    if hero_url and "heroImage" not in payload:
        payload["heroImage"] = {
            "sourceUri": {"uri": _resolve_url(hero_url, "")},
            "contentDescription": {
                "defaultValue": {
                    "language": "es",
                    "value": payload.get("programName", "")
                    or payload.get("title", "")
                    or "Hero",
                }
            },
        }


def _apply_google_advanced_to_object(card, payload: dict) -> None:
    """Apply WalletStudio V2 google config to object payloads."""
    advanced = _get_v2_google_config(card)
    if not advanced:
        return
    if advanced.get("messages") and isinstance(advanced["messages"], list):
        payload.setdefault("messages", []).extend(advanced["messages"])
    _apply_links_module_uris(advanced, payload)

    # Smart Tap redemption value from V2
    if advanced.get("smartTapRedemptionValue"):
        payload["smartTapRedemptionValue"] = advanced["smartTapRedemptionValue"]
    if advanced.get("groupingId"):
        payload["groupingId"] = advanced["groupingId"]

    # Hero image from V2 Google-specific heroImage asset
    hero_url = ""
    google_hero = advanced.get("heroImage")
    if isinstance(google_hero, dict) and google_hero.get("url"):
        hero_url = google_hero["url"]
    if not hero_url:
        hero_url = _get_v2_image_url(
            _get_wallet_studio(card).get("images") or {}, "strip"
        )
    if not hero_url:
        hero_url = _get_v2_image_url(
            _get_wallet_studio(card).get("images") or {}, "strip2x"
        )
    if hero_url and "heroImage" not in payload:
        payload["heroImage"] = {
            "sourceUri": {"uri": _resolve_url(hero_url, "")},
            "contentDescription": {
                "defaultValue": {
                    "language": "es",
                    "value": payload.get("programName", "")
                    or payload.get("title", "")
                    or "Hero",
                }
            },
        }


def _apply_links_module_uris(advanced: dict, payload: dict) -> None:
    """Merge custom linksModuleUris into linksModuleData."""
    links = advanced.get("linksModuleUris")
    if not links or not isinstance(links, list):
        return
    existing = payload.get("linksModuleData", {}).get("uris", [])
    new_uris = []
    for link in links:
        if isinstance(link, dict) and link.get("uri") and link.get("description"):
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
