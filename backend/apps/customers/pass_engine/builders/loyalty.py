"""
Loyalty pass builders for Google Wallet.
"""

from django.conf import settings

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


def _build_loyalty_class(card, tenant, base_url: str = "") -> dict:
    """Build the Google Wallet LoyaltyClass object (the template)."""
    issuer_id = _get_issuer_id()
    class_id = f"{issuer_id}.loyallia-{card.id}"
    google_images = _get_google_images(card)
    logo_uri = _resolve_url(
        google_images.get("program_logo") or card.logo_url,
        base_url,
    ) or PlatformSetting.get("WALLET_FALLBACK_AVATAR_URL", default="")
    payload = {
        "id": class_id,
        "issuerName": tenant.name,
        "programName": card.name,
        "programLogo": {
            "sourceUri": {"uri": logo_uri},
            "contentDescription": {
                "defaultValue": {"language": "es", "value": card.name},
            },
        },
        "hexBackgroundColor": card.background_color or "#1A1A2E",
        "reviewStatus": "UNDER_REVIEW",
        "multipleDevicesAndHoldersAllowedStatus": "ONE_USER_ALL_DEVICES",
        "enableSmartTap": True,
    }
    _build_class_images(card, payload, base_url)
    _apply_card_template_override(card, payload)
    _apply_google_advanced_to_class(card, payload)

    locations = _get_google_locations(card)
    if locations:
        payload["locations"] = locations

    payload["textModulesData"] = [
        {
            "header": "",
            "body": get_message("WALLET_POWERED_BY"),
            "id": "loyallia_branding",
        }
    ]
    payload["linksModuleData"] = {
        "uris": [
            {
                "uri": PlatformSetting.get(
                    "BRAND_HOME_URL",
                    default=getattr(settings, "PUBLIC_BASE_URL", "") or "",
                ),
                "description": get_message("WALLET_LINK_DESCRIPTION"),
                "id": "loyallia_link",
            },
            {
                "uri": f"{PlatformSetting.get('ENROLL_BASE_URL', default=getattr(settings, 'PUBLIC_BASE_URL', '') or '')}/enroll/{card.id}",  # noqa: E501
                "description": get_message("WALLET_ENROLL_HERE"),
                "id": "enroll_link",
            },
        ]
    }
    return payload


def _build_loyalty_object(
    customer_pass, card, customer, tenant, base_url: str = ""
) -> dict:
    """Build the Google Wallet LoyaltyObject (the instance per customer)."""
    issuer_id = _get_issuer_id()
    class_id = f"{issuer_id}.loyallia-{card.id}"
    object_id = f"{issuer_id}.loyallia-pass-{customer_pass.id}"
    loyalty_points = _build_points_for_type(card, customer_pass)
    google_images = _get_google_images(card)
    metadata = card.metadata or {}

    hero_uri = _resolve_url(
        google_images.get("hero_image") or card.strip_image_url, base_url
    )
    if not hero_uri and card.card_type == "stamp":
        hero_uri = PlatformSetting.get("WALLET_PLACEHOLDER_IMAGE", default="")
    elif not hero_uri:
        hero_uri = _resolve_url(
            google_images.get("program_logo") or card.logo_url, base_url
        )

    obj = {
        "id": object_id,
        "classId": class_id,
        "state": "ACTIVE",
        "accountId": str(customer.id)[:8],
        "accountName": f"{customer.first_name} {customer.last_name}",
        "loyaltyPoints": loyalty_points,
        "barcode": {
            "type": _get_barcode_type(card),
            "value": customer_pass.qr_code,
            "alternateText": customer_pass.qr_code,
        },
        "smartTapRedemptionValue": customer_pass.qr_code,
        "textModulesData": [
            {"header": get_message("WALLET_LABEL_ESTABLISHMENT"), "body": tenant.name, "id": "tenant_name"},
            {"header": get_message("WALLET_LABEL_PROGRAM"), "body": card.name, "id": "program_name"},
            {
                "header": "",
                "body": get_message("WALLET_POWERED_BY"),
                "id": "loyallia_branding",
            },
        ],
        "linksModuleData": {
            "uris": [
                {
                    "uri": PlatformSetting.get(
                        "BRAND_HOME_URL",
                        default=getattr(settings, "PUBLIC_BASE_URL", "") or "",
                    ),
                    "description": get_message("WALLET_LINK_DESCRIPTION"),
                    "id": "loyallia_link",
                },
                {
                    "uri": f"{PlatformSetting.get('ENROLL_BASE_URL', default=getattr(settings, 'PUBLIC_BASE_URL', '') or '')}/enroll/{card.id}",  # noqa: E501
                    "description": get_message("WALLET_YOUR_DIGITAL_CARD"),
                    "id": "enroll_link",
                },
            ]
        },
    }

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

    if card.card_type == "cashback":
        pct = metadata.get("cashback_percentage", 10)
        obj["secondaryLoyaltyPoints"] = {
            "label": get_message("WALLET_CASHBACK_RATE_LABEL"),
            "balance": {"string": f"{pct}%"},
        }

    _apply_google_advanced_to_object(card, obj)
    return obj


def _build_points_for_type(card, customer_pass) -> dict:
    """Build the loyaltyPoints section based on card type and pass data."""
    pass_data = customer_pass.pass_data or {}
    metadata = card.metadata or {}

    if card.card_type == "stamp":
        current = customer_pass.stamp_count_val
        return {"label": get_message("WALLET_LABEL_STAMPS"), "balance": {"int": current}}
    elif card.card_type == "multipass":
        remaining = customer_pass.multipass_remaining_val or 0
        bundle_size = metadata.get("bundle_size", 10)
        return {
            "label": get_message("WALLET_LABEL_USES"),
            "balance": {"string": f"{remaining} / {bundle_size}"},
        }
    elif card.card_type == "cashback":
        balance = str(customer_pass.cashback_balance_val)
        return {
            "label": get_message("WALLET_LABEL_CREDIT"),
            "balance": {"string": f"${balance}"},
        }
    elif card.card_type == "vip_membership":
        return {
            "label": get_message("WALLET_LABEL_MEMBERSHIP"),
            "balance": {"string": pass_data.get("membership_tier", "VIP")},
        }
    elif card.card_type == "referral_pass":
        # WARNING: Unreachable — referral_pass maps to offer, not loyalty
        return {
            "label": get_message("WALLET_LABEL_REFERRALS"),
            "balance": {"int": customer_pass.referral_count_val},
        }
    else:
        return {"label": get_message("WALLET_LABEL_POINTS"), "balance": {"int": 0}}
