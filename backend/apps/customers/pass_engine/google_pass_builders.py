"""
Loyallia — Google Wallet Pass Builders
Internal builder functions for Google Wallet class/object payloads.
Not imported directly from outside pass_engine — used by google_pass.py.
"""

import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def _get_issuer_id() -> str:
    """Return the Google Wallet Issuer ID from settings."""
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
    GIFT_TYPES = {"gift_certificate", "cashback", "multipass"}
    if card_type in OFFER_TYPES:
        return "offer"
    elif card_type in GIFT_TYPES:
        return "giftCard"
    return "loyalty"


def _build_class_images(card, payload: dict) -> None:
    """Add heroImage, wideLogo, and imageModulesData to a class payload if available."""
    if card.strip_image_url:
        payload["heroImage"] = {
            "sourceUri": {"uri": card.strip_image_url},
            "contentDescription": {
                "defaultValue": {"language": "es", "value": f"Banner de {card.name}"},
            },
        }
    if card.logo_url:
        payload["wideLogo"] = {
            "sourceUri": {"uri": card.logo_url},
            "contentDescription": {
                "defaultValue": {"language": "es", "value": card.name},
            },
        }
    if card.icon_url:
        payload["imageModulesData"] = [
            {
                "mainImage": {
                    "sourceUri": {"uri": card.icon_url},
                    "contentDescription": {
                        "defaultValue": {
                            "language": "es",
                            "value": "Imagen de recompensa",
                        }
                    },
                },
                "id": "reward_image",
            }
        ]


def _build_loyalty_class(card, tenant) -> dict:
    """Build the Google Wallet LoyaltyClass object (the template)."""
    issuer_id = _get_issuer_id()
    class_id = f"{issuer_id}.loyallia-{card.id}"
    logo_uri = (
        card.logo_url
        or f"https://ui-avatars.com/api/?name={card.name[:1]}&background=5660ff&color=fff&size=256"
    )
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
    _build_class_images(card, payload)

    if card.locations:
        locations = []
        for loc in card.locations:
            try:
                lat = float(loc.get("lat", 0))
                lng = float(loc.get("lng", 0))
                if lat and lng:
                    locations.append({"latitude": lat, "longitude": lng})
            except (ValueError, TypeError):
                continue
        if locations:
            payload["locations"] = locations

    payload["textModulesData"] = [
        {
            "header": "",
            "body": "Powered by Loyallia -- Claro Partner",
            "id": "loyallia_branding",
        }
    ]
    payload["linksModuleData"] = {
        "uris": [
            {
                "uri": "https://loyallia.com",
                "description": "Powered by Loyallia",
                "id": "loyallia_link",
            },
            {
                "uri": f"https://loyallia.com/enroll/{card.id}",
                "description": "Inscribete aqui",
                "id": "enroll_link",
            },
        ]
    }
    return payload


def _build_loyalty_object(customer_pass, card, customer, tenant) -> dict:
    """Build the Google Wallet LoyaltyObject (the instance per customer)."""
    issuer_id = _get_issuer_id()
    class_id = f"{issuer_id}.loyallia-{card.id}"
    object_id = f"{issuer_id}.loyallia-pass-{customer_pass.id}"
    loyalty_points = _build_points_for_type(card, customer_pass)

    hero_uri = card.strip_image_url
    if not hero_uri and card.card_type == "stamp":
        hero_uri = "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&h=280&q=80"
    elif not hero_uri:
        hero_uri = card.logo_url

    obj = {
        "id": object_id,
        "classId": class_id,
        "state": "ACTIVE",
        "accountId": str(customer.id)[:8],
        "accountName": f"{customer.first_name} {customer.last_name}",
        "loyaltyPoints": loyalty_points,
        "barcode": {
            "type": "QR_CODE",
            "value": customer_pass.qr_code,
            "alternateText": customer_pass.qr_code,
        },
        "smartTapRedemptionValue": customer_pass.qr_code,
        "textModulesData": [
            {"header": "Establecimiento", "body": tenant.name, "id": "tenant_name"},
            {"header": "Programa", "body": card.name, "id": "program_name"},
            {
                "header": "",
                "body": "Powered by Loyallia -- Claro Partner",
                "id": "loyallia_branding",
            },
        ],
        "linksModuleData": {
            "uris": [
                {
                    "uri": "https://loyallia.com",
                    "description": "Powered by Loyallia",
                    "id": "loyallia_link",
                },
                {
                    "uri": f"https://loyallia.com/enroll/{card.id}",
                    "description": "Tu Tarjeta Digital",
                    "id": "enroll_link",
                },
            ]
        },
    }

    if hero_uri:
        obj["heroImage"] = {
            "sourceUri": {"uri": hero_uri},
            "contentDescription": {
                "defaultValue": {"language": "es", "value": "Banner de " + card.name}
            },
        }
    if card.icon_url or card.logo_url:
        obj["imageModulesData"] = [
            {
                "mainImage": {
                    "sourceUri": {"uri": card.icon_url or card.logo_url},
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
    return obj


def _build_points_for_type(card, customer_pass) -> dict:
    """Build the loyaltyPoints section based on card type and pass data."""
    pass_data = customer_pass.pass_data or {}

    if card.card_type == "stamp":
        current = pass_data.get("stamp_count", 0)
        return {"label": "Sellos", "balance": {"int": current}}
    elif card.card_type == "cashback":
        balance = pass_data.get("cashback_balance", "0")
        return {
            "label": "Credito",
            "balance": {
                "money": {
                    "micros": int(float(balance) * 1_000_000),
                    "currencyCode": "USD",
                }
            },
        }
    elif card.card_type == "vip_membership":
        return {
            "label": "Membresia",
            "balance": {"string": pass_data.get("membership_tier", "VIP")},
        }
    elif card.card_type == "referral_pass":
        return {
            "label": "Referidos",
            "balance": {"int": pass_data.get("referrals_made", 0)},
        }
    else:
        return {"label": "Puntos", "balance": {"int": 0}}


def _build_offer_class(card, tenant) -> dict:
    """Build a Google Wallet OfferClass for coupon/discount card types."""
    issuer_id = _get_issuer_id()
    class_id = f"{issuer_id}.offer-{card.id}"
    logo_uri = (
        card.logo_url
        or f"https://ui-avatars.com/api/?name={card.name[:1]}&background=5660ff&color=fff&size=256"
    )
    payload = {
        "id": class_id,
        "issuerName": tenant.name,
        "title": card.name,
        "provider": tenant.name,
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
    _build_class_images(card, payload)
    return payload


def _build_offer_object(customer_pass, card, customer, tenant) -> dict:
    """Build a Google Wallet OfferObject instance."""
    issuer_id = _get_issuer_id()
    class_id = f"{issuer_id}.offer-{card.id}"
    object_id = f"{issuer_id}.offer-pass-{customer_pass.id}"
    return {
        "id": object_id,
        "classId": class_id,
        "state": "ACTIVE",
        "barcode": {
            "type": "QR_CODE",
            "value": customer_pass.qr_code,
            "alternateText": customer_pass.qr_code[:10],
        },
        "textModulesData": [
            {"header": "Negocio", "body": tenant.name},
            {"header": "Oferta", "body": card.name},
        ],
    }


def _build_gift_card_class(card, tenant) -> dict:
    """Build a Google Wallet GiftCardClass for cashback/gift certificate types."""
    issuer_id = _get_issuer_id()
    class_id = f"{issuer_id}.giftcard-{card.id}"
    logo_uri = (
        card.logo_url
        or f"https://ui-avatars.com/api/?name={card.name[:1]}&background=5660ff&color=fff&size=256"
    )
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
    _build_class_images(card, payload)
    return payload


def _build_gift_card_object(customer_pass, card, customer, tenant) -> dict:
    """Build a Google Wallet GiftCardObject instance."""
    issuer_id = _get_issuer_id()
    class_id = f"{issuer_id}.giftcard-{card.id}"
    object_id = f"{issuer_id}.giftcard-pass-{customer_pass.id}"
    pass_data = customer_pass.pass_data or {}
    balance = pass_data.get("cashback_balance", "0")
    return {
        "id": object_id,
        "classId": class_id,
        "state": "ACTIVE",
        "cardNumber": str(customer.id)[:8],
        "balance": {"micros": int(float(balance) * 1_000_000), "currencyCode": "USD"},
        "barcode": {
            "type": "QR_CODE",
            "value": customer_pass.qr_code,
            "alternateText": customer_pass.qr_code[:10],
        },
        "textModulesData": [
            {"header": "Negocio", "body": tenant.name},
            {"header": "Tarjeta", "body": card.name},
        ],
    }
