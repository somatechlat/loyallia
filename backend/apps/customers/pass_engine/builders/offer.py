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
from common.messages import get_message
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
    pass_data = customer_pass.pass_data or {}
    metadata = card.metadata or {}

    text_modules = [
        {"header": get_message("WALLET_LABEL_BUSINESS"), "body": tenant.name},
        {"header": get_message("WALLET_LABEL_OFFER"), "body": card.name},
    ]

    if card.card_type == "referral_pass":
        text_modules.append(
            {"header": get_message("WALLET_LABEL_REFERRALS"), "body": str(customer_pass.referral_count_val)}
        )
        ref_code = customer.referral_code or customer_pass.qr_code or "N/A"
        text_modules.append({"header": get_message("WALLET_LABEL_CODE"), "body": ref_code})
        text_modules.append(
            {
                "header": get_message("WALLET_LABEL_REWARD"),
                "body": metadata.get(
                    "referrer_reward", pass_data.get("referrer_reward", "")
                ),
            }
        )
    elif card.card_type == "corporate_discount":
        discount_pct = str(customer_pass.corporate_discount)
        company = pass_data.get("company_name", metadata.get("company_name", card.name))
        text_modules.append(
            {"header": get_message("WALLET_LABEL_CORPORATE_DISCOUNT"), "body": f"{discount_pct}%"}
        )
        text_modules.append({"header": get_message("WALLET_LABEL_COMPANY"), "body": company})
    elif card.card_type == "discount":
        tiers = metadata.get("tiers", [])
        current_tier = customer_pass.discount_tier or pass_data.get("discount_tier", "")
        current_discount = 0
        for tier in tiers:
            if tier.get("tier_name") == current_tier:
                current_discount = tier.get("discount_percentage", 0)
                break
        if not current_tier and tiers:
            current_tier = tiers[0].get("tier_name", "Básico")
            current_discount = tiers[0].get("discount_percentage", 0)
        text_modules.append(
            {"header": get_message("WALLET_LABEL_CURRENT_TIER"), "body": current_tier or get_message("WALLET_LABEL_BASIC")}
        )
        text_modules.append({"header": get_message("WALLET_LABEL_DISCOUNT"), "body": f"{current_discount}%"})
    elif card.card_type == "coupon":
        usage_limit = metadata.get(
            "usage_limit", metadata.get("usage_limit_per_customer", 1)
        )
        coupon_end = metadata.get("coupon_end_date", pass_data.get("expiry_date", ""))
        text_modules.append(
            {
                "header": get_message("WALLET_LABEL_USES"),
                "body": f"{customer_pass.coupon_redemption_count} / {usage_limit}",
            }
        )
        text_modules.append({"header": get_message("WALLET_LABEL_VALID_UNTIL"), "body": str(coupon_end)})
        text_modules.append(
            {
                "header": get_message("WALLET_LABEL_TERMS"),
                "body": card.description or metadata.get("coupon_description", ""),
            }
        )

    obj = {
        "id": object_id,
        "classId": class_id,
        "state": "ACTIVE",
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

    if card.card_type == "coupon":
        coupon_end = metadata.get("coupon_end_date", pass_data.get("expiry_date", ""))
        if coupon_end:
            obj["validTimeInterval"] = {
                "start": {
                    "date": (
                        customer_pass.enrolled_at.isoformat()
                        if customer_pass.enrolled_at
                        else ""
                    )
                },
                "end": {"date": coupon_end},
            }

    if card.card_type == "discount":
        tiers = metadata.get("tiers", [])
        current_tier = customer_pass.discount_tier or pass_data.get("discount_tier", "")
        current_discount = 0
        for tier in tiers:
            if tier.get("tier_name") == current_tier:
                current_discount = tier.get("discount_percentage", 0)
                break
        obj["details"] = get_message("WALLET_OFFER_DETAILS_DISCOUNT", discount=current_discount)

    if card.card_type == "corporate_discount":
        discount_pct = str(customer_pass.corporate_discount)
        obj["details"] = get_message("WALLET_OFFER_DETAILS_CORPORATE", discount=discount_pct)

    _apply_google_advanced_to_object(card, obj)
    return obj
