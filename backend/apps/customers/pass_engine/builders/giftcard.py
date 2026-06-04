"""
Gift card pass builders for Google Wallet.
"""

from apps.tenants.models import PlatformSetting

from .base import (
    _apply_card_template_override,
    _apply_google_advanced_to_class,
    _apply_google_advanced_to_object,
    _get_barcode_type,
    _get_google_images,
    _get_google_locations,
    _get_issuer_id,
    _resolve_url,
)
from common.messages import get_message
from .images import _build_class_images


def _build_gift_card_class(card, tenant, base_url: str = "") -> dict:
    """Build a Google Wallet GiftCardClass for cashback/gift certificate types."""
    issuer_id = _get_issuer_id()
    class_id = f"{issuer_id}.giftcard-{card.id}"
    google_images = _get_google_images(card)
    logo_uri = _resolve_url(
        google_images.get("program_logo") or card.logo_url,
        base_url,
    ) or PlatformSetting.get("WALLET_FALLBACK_AVATAR_URL", default="")
    payload = {
        "id": class_id,
        "issuerName": tenant.name,
        "merchantName": tenant.name,
        "programLogo": {
            "sourceUri": {"uri": logo_uri},
            "contentDescription": {
                "defaultValue": {"language": "es", "value": card.name}
            },
        },
        "hexBackgroundColor": card.background_color or "#1A1A2E",
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
    google_images = _get_google_images(card)

    text_modules = [
        {"header": get_message("WALLET_LABEL_BUSINESS"), "body": tenant.name},
        {"header": get_message("WALLET_LABEL_CARD"), "body": card.name},
    ]

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

    hero_uri = _resolve_url(
        google_images.get("hero_image") or card.strip_image_url, base_url
    )
    if hero_uri:
        obj["heroImage"] = {
            "sourceUri": {"uri": hero_uri},
            "contentDescription": {
                "defaultValue": {"language": "es", "value": get_message("WALLET_BANNER_OF", name=card.name)}
            },
        }

    image_module_url = _resolve_url(
        google_images.get("image_module")
        or google_images.get("program_logo")
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

    _apply_google_advanced_to_object(card, obj)
    return obj
