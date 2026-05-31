"""
Offer pass builders for Google Wallet.
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
from .images import _build_class_images


def _build_offer_class(card, tenant, base_url: str = "") -> dict:
    """Build a Google Wallet OfferClass for coupon/discount card types."""
    issuer_id = _get_issuer_id()
    class_id = f"{issuer_id}.offer-{card.id}"
    google_images = _get_google_images(card)
    logo_uri = _resolve_url(
        google_images.get("program_logo") or card.logo_url,
        base_url,
    ) or PlatformSetting.get("WALLET_FALLBACK_AVATAR_URL", default="")
    payload = {
        "id": class_id,
        "issuerName": tenant.name,
        "title": card.name,
        "provider": tenant.name,
        "redemptionChannel": "BOTH",
        "titleImage": {
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


def _build_offer_object(
    customer_pass, card, customer, tenant, base_url: str = ""
) -> dict:
    """Build a Google Wallet OfferObject instance."""
    issuer_id = _get_issuer_id()
    class_id = f"{issuer_id}.offer-{card.id}"
    object_id = f"{issuer_id}.offer-pass-{customer_pass.id}"
    google_images = _get_google_images(card)
    obj = {
        "id": object_id,
        "classId": class_id,
        "state": "ACTIVE",
        "barcode": {
            "type": _get_barcode_type(card),
            "value": customer_pass.qr_code,
            "alternateText": customer_pass.qr_code[:10],
        },
        "textModulesData": [
            {"header": "Negocio", "body": tenant.name},
            {"header": "Oferta", "body": card.name},
        ],
    }

    hero_uri = _resolve_url(
        google_images.get("hero_image") or card.strip_image_url, base_url
    )
    if hero_uri:
        obj["heroImage"] = {
            "sourceUri": {"uri": hero_uri},
            "contentDescription": {
                "defaultValue": {"language": "es", "value": "Banner de " + card.name}
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
                            "value": "Recompensa del programa",
                        }
                    },
                },
                "id": "reward_highlight",
            }
        ]

    _apply_google_advanced_to_object(card, obj)
    return obj
