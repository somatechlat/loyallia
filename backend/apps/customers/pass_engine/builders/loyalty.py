"""
Loyalty pass builders for Google Wallet.
"""

from django.conf import settings

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


def _build_loyalty_class(card, tenant, base_url: str = "") -> dict:
    """Build the Google Wallet LoyaltyClass object (the template)."""
    issuer_id = _get_issuer_id()
    class_id = f"{issuer_id}.loyallia-{card.id}"
    v2_images = _get_wallet_studio(card).get("images") or {}
    google_cfg = _get_v2_google_config(card)

    logo_uri = _resolve_url(
        _get_v2_image_url(v2_images, "logo")
        or _get_v2_image_url(v2_images, "logo2x")
        or card.logo_url,
        base_url,
    ) or PlatformSetting.get("WALLET_FALLBACK_AVATAR_URL", default="")

    program_name = google_cfg.get("programName") or card.name
    hex_color = (
        google_cfg.get("hexBackgroundColor")
        or (_get_wallet_studio(card).get("colors") or {}).get("background")
        or card.background_color
        or "#1A1A2E"
    )

    payload = {
        "id": class_id,
        "issuerName": tenant.name,
        "programName": program_name,
        "programLogo": {
            "sourceUri": {"uri": logo_uri},
            "contentDescription": {
                "defaultValue": {"language": "es", "value": program_name},
            },
        },
        "hexBackgroundColor": hex_color,
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

    # V2 text modules on class — static back-content fields only (no customer context)
    wallet_studio = _get_wallet_studio(card)
    back_content = wallet_studio.get("backContent") or {}
    back_fields = back_content.get("fields") if isinstance(back_content, dict) else []
    if not isinstance(back_fields, list):
        back_fields = []
    v2_class_modules = []
    for idx, back_field in enumerate(back_fields):
        if not isinstance(back_field, dict):
            continue
        if back_field.get("isLink"):
            continue
        header = back_field.get("label", "")
        body = back_field.get("value", "")
        field_id = back_field.get("id") or f"back_field_{idx}"
        if header or body:
            v2_class_modules.append({"header": header, "body": body, "id": field_id})
    payload["textModulesData"] = [
        {
            "header": "",
            "body": get_message("WALLET_POWERED_BY"),
            "id": "loyallia_branding",
        },
        *v2_class_modules,
    ]
    # V2 links on class
    v2_class_links = _build_v2_links_module_data(card)
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
            *v2_class_links,
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
    v2_images = _get_wallet_studio(card).get("images") or {}
    google_cfg = _get_v2_google_config(card)
    metadata = card.metadata or {}

    program_name = google_cfg.get("programName") or card.name

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
    if not hero_uri and card.card_type == "stamp":
        hero_uri = PlatformSetting.get("WALLET_PLACEHOLDER_IMAGE", default="")
    if not hero_uri:
        hero_uri = _resolve_url(
            _get_v2_image_url(v2_images, "logo")
            or _get_v2_image_url(v2_images, "logo2x")
            or card.logo_url,
            base_url,
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
        "smartTapRedemptionValue": google_cfg.get("smartTapRedemptionValue")
        or customer_pass.qr_code,
    }

    # Merge V2 text modules with default branding
    v2_modules = _build_v2_text_modules_data(card, customer_pass, customer, tenant)
    text_modules = (
        [
            {
                "header": get_message("WALLET_LABEL_ESTABLISHMENT"),
                "body": tenant.name,
                "id": "tenant_name",
            },
            {
                "header": get_message("WALLET_LABEL_PROGRAM"),
                "body": program_name,
                "id": "program_name",
            },
        ]
        + v2_modules
        + [
            {
                "header": "",
                "body": get_message("WALLET_POWERED_BY"),
                "id": "loyallia_branding",
            },
        ]
    )
    obj["textModulesData"] = text_modules

    # Links: default + V2 back-content links
    default_links = [
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
    v2_links = _build_v2_links_module_data(card)
    obj["linksModuleData"] = {"uris": default_links + v2_links}

    if hero_uri:
        obj["heroImage"] = {
            "sourceUri": {"uri": hero_uri},
            "contentDescription": {
                "defaultValue": {
                    "language": "es",
                    "value": get_message("WALLET_BANNER_OF", name=program_name),
                }
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

    if card.card_type == "cashback":
        pct = metadata.get(
            "cashback_percentage", settings.PASS_GOOGLE_CASHBACK_DEFAULT_PCT
        )
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
        return {
            "label": get_message("WALLET_LABEL_STAMPS"),
            "balance": {"int": current},
        }
    elif card.card_type == "multipass":
        remaining = customer_pass.multipass_remaining_val or 0
        bundle_size = metadata.get(
            "bundle_size", settings.PASS_GOOGLE_BUNDLE_SIZE_DEFAULT
        )
        return {
            "label": get_message("WALLET_LABEL_USES"),
            "balance": {"string": f"{remaining} / {bundle_size}"},
        }
    elif card.card_type == "cashback":
        raw_balance = customer_pass.cashback_balance_val
        balance = str(raw_balance if raw_balance is not None else 0)
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
