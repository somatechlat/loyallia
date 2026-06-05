"""
Gift card pass builders for Google Wallet.
"""

from apps.tenants.models import PlatformSetting
from common.messages import get_message

from .base import (
    _apply_card_template_override,
    _apply_google_advanced_to_class,
    _apply_google_advanced_to_object,
    _build_v2_links_module_data,
    _build_v2_text_modules_data,
    _get_barcode_type,
    _get_google_locations,
    _get_issuer_id,
    _get_v2_google_config,
    _get_v2_image_url,
    _get_wallet_studio,
    _resolve_url,
)
from .images import _build_class_images


def _build_gift_card_class(card, tenant, base_url: str = "") -> dict:
    """Build a Google Wallet GiftCardClass for cashback/gift certificate types."""
    issuer_id = _get_issuer_id()
    class_id = f"{issuer_id}.giftcard-{card.id}"
    v2_images = _get_wallet_studio(card).get("images") or {}
    google_cfg = _get_v2_google_config(card)

    logo_uri = _resolve_url(
        _get_v2_image_url(v2_images, "logo")
        or _get_v2_image_url(v2_images, "logo2x")
        or card.logo_url,
        base_url,
    ) or PlatformSetting.get("WALLET_FALLBACK_AVATAR_URL", default="")

    merchant_name = google_cfg.get("merchantName") or tenant.name
    hex_color = google_cfg.get("hexBackgroundColor") or (_get_wallet_studio(card).get("colors") or {}).get("background") or card.background_color or "#1A1A2E"

    payload = {
        "id": class_id,
        "issuerName": tenant.name,
        "merchantName": merchant_name,
        "programLogo": {
            "sourceUri": {"uri": logo_uri},
            "contentDescription": {
                "defaultValue": {"language": "es", "value": card.name}
            },
        },
        "hexBackgroundColor": hex_color,
        "reviewStatus": "UNDER_REVIEW",
        "multipleDevicesAndHoldersAllowedStatus": "ONE_USER_ALL_DEVICES",
    }
    _build_class_images(card, payload, base_url)
    _apply_card_template_override(card, payload)
    _apply_google_advanced_to_class(card, payload)

    locations = _get_google_locations(card)
    if locations:
        payload["locations"] = locations

    return payload


def _build_gift_card_object(
    customer_pass, card, customer, tenant, base_url: str = ""
) -> dict:
    """Build a Google Wallet GiftCardObject instance."""
    issuer_id = _get_issuer_id()
    class_id = f"{issuer_id}.giftcard-{card.id}"
    object_id = f"{issuer_id}.giftcard-pass-{customer_pass.id}"
    metadata = card.metadata or {}
    balance = str(customer_pass.gift_balance_val)
    v2_images = _get_wallet_studio(card).get("images") or {}
    google_cfg = _get_v2_google_config(card)
    program_name = google_cfg.get("programName") or card.name

    text_modules = [
        {"header": get_message("WALLET_LABEL_BUSINESS"), "body": tenant.name, "id": "tenant_name"},
        {"header": get_message("WALLET_LABEL_CARD"), "body": program_name, "id": "program_name"},
    ] + _build_v2_text_modules_data(card, customer_pass, customer, tenant)

    obj = {
        "id": object_id,
        "classId": class_id,
        "state": "ACTIVE",
        "cardNumber": str(customer.id)[:8],
        "balance": {
            "micros": int(float(balance) * 1_000_000),
            "currencyCode": metadata.get("currency", "USD"),
        },
        "barcode": {
            "type": _get_barcode_type(card),
            "value": customer_pass.qr_code,
            "alternateText": customer_pass.qr_code[:10],
        },
        "textModulesData": text_modules,
    }

    # Hero image: V2 Google heroImage asset takes precedence, then strip image
    hero_uri = ""
    google_hero = google_cfg.get("heroImage")
    if isinstance(google_hero, dict) and google_hero.get("url"):
        hero_uri = _resolve_url(google_hero["url"], base_url)
    if not hero_uri:
        hero_uri = _resolve_url(
            _get_v2_image_url(v2_images, "strip")
            or _get_v2_image_url(v2_images, "strip2x")
            or card.strip_image_url,
            base_url,
        )
    if hero_uri:
        obj["heroImage"] = {
            "sourceUri": {"uri": hero_uri},
            "contentDescription": {
                "defaultValue": {"language": "es", "value": get_message("WALLET_BANNER_OF", name=program_name)}
            },
        }

    image_module_url = _resolve_url(
        _get_v2_image_url(v2_images, "thumbnail")
        or _get_v2_image_url(v2_images, "thumbnail2x")
        or _get_v2_image_url(v2_images, "icon")
        or _get_v2_image_url(v2_images, "logo")
        or _get_v2_image_url(v2_images, "logo2x")
        or card.icon_url
        or card.logo_url,
        base_url,
    )
    if image_module_url:
        obj["imageModulesData"] = [
            {
                "mainImage": {
                    "sourceUri": {"uri": image_module_url},
                    "contentDescription": {
                        "defaultValue": {
                            "language": "es",
                            "value": get_message("WALLET_PROGRAM_REWARD"),
                        }
                    },
                },
                "id": "reward_highlight",
            }
        ]

    # Links: V2 back-content links
    v2_links = _build_v2_links_module_data(card)
    if v2_links:
        obj.setdefault("linksModuleData", {"uris": []})
        obj["linksModuleData"]["uris"] = obj["linksModuleData"].get("uris", []) + v2_links

    _apply_google_advanced_to_object(card, obj)
    return obj
