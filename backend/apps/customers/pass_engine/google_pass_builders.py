"""
Loyallia  Google Wallet Pass Builders
Internal builder functions for Google Wallet class/object payloads.
Not imported directly from outside pass_engine  used by google_pass.py.
"""

import logging
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


def _is_local_or_private_url(url: str) -> bool:
    """Check if a URL uses a local/private IP that Google servers cannot reach."""
    import re
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
    for pattern in local_patterns:
        if re.search(pattern, url, re.IGNORECASE):
            return True
    return False


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
                locations.append({"latitude": float(loc.latitude), "longitude": float(loc.longitude)})
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


def _build_class_images(card, payload: dict, base_url: str = "") -> None:
    """Add heroImage, wideLogo, and imageModulesData to a class payload if available."""
    google_images = _get_google_images(card)

    hero_url = _resolve_url(google_images.get("hero_image") or card.strip_image_url, base_url)
    if hero_url:
        payload["heroImage"] = {
            "sourceUri": {"uri": hero_url},
            "contentDescription": {
                "defaultValue": {"language": "es", "value": f"Banner de {card.name}"},
            },
        }

    wide_logo_url = _resolve_url(google_images.get("wide_logo") or card.logo_url, base_url)
    if wide_logo_url:
        payload["wideLogo"] = {
            "sourceUri": {"uri": wide_logo_url},
            "contentDescription": {
                "defaultValue": {"language": "es", "value": card.name},
            },
        }

    image_module_url = _resolve_url(google_images.get("image_module") or card.icon_url, base_url)
    if image_module_url:
        payload["imageModulesData"] = [
            {
                "mainImage": {
                    "sourceUri": {"uri": image_module_url},
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
                                    "firstValue": {
                                        "fields": [{"fieldPath": start_fp}]
                                    }
                                },
                                "endItem": {
                                    "firstValue": {
                                        "fields": [{"fieldPath": end_fp}]
                                    }
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
                                    "firstValue": {
                                        "fields": [{"fieldPath": start_fp}]
                                    }
                                },
                                "middleItem": {
                                    "firstValue": {
                                        "fields": [{"fieldPath": middle_fp}]
                                    }
                                },
                                "endItem": {
                                    "firstValue": {
                                        "fields": [{"fieldPath": end_fp}]
                                    }
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
        payload["cardTemplateOverride"] = {"cardRowTemplateInfos": _transform_google_rows(google_rows)}


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
                    "id": link.get("id", f"custom_link_{len(existing) + len(new_uris)}"),
                }
            )
    if new_uris:
        payload.setdefault("linksModuleData", {"uris": []})
        payload["linksModuleData"]["uris"] = existing + new_uris


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
            "body": "Powered by Loyallia  Intelligent Rewards",
            "id": "loyallia_branding",
        }
    ]
    payload["linksModuleData"] = {
        "uris": [
            {
                "uri": PlatformSetting.get("BRAND_HOME_URL", default=getattr(settings, "PUBLIC_BASE_URL", "") or ""),
                "description": "Powered by Loyallia",
                "id": "loyallia_link",
            },
            {
                "uri": f"{PlatformSetting.get('ENROLL_BASE_URL', default=getattr(settings, 'PUBLIC_BASE_URL', '') or '')}/enroll/{card.id}",
                "description": "Inscribete aqui",
                "id": "enroll_link",
            },
        ]
    }
    return payload


def _build_loyalty_object(customer_pass, card, customer, tenant, base_url: str = "") -> dict:
    """Build the Google Wallet LoyaltyObject (the instance per customer)."""
    issuer_id = _get_issuer_id()
    class_id = f"{issuer_id}.loyallia-{card.id}"
    object_id = f"{issuer_id}.loyallia-pass-{customer_pass.id}"
    loyalty_points = _build_points_for_type(card, customer_pass)
    google_images = _get_google_images(card)

    hero_uri = _resolve_url(google_images.get("hero_image") or card.strip_image_url, base_url)
    if not hero_uri and card.card_type == "stamp":
        hero_uri = PlatformSetting.get("WALLET_PLACEHOLDER_IMAGE", default="")
    elif not hero_uri:
        hero_uri = _resolve_url(google_images.get("program_logo") or card.logo_url, base_url)

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
            {"header": "Establecimiento", "body": tenant.name, "id": "tenant_name"},
            {"header": "Programa", "body": card.name, "id": "program_name"},
            {
                "header": "",
                "body": "Powered by Loyallia  Intelligent Rewards",
                "id": "loyallia_branding",
            },
        ],
        "linksModuleData": {
            "uris": [
                {
                    "uri": PlatformSetting.get("BRAND_HOME_URL", default=getattr(settings, "PUBLIC_BASE_URL", "") or ""),
                    "description": "Powered by Loyallia",
                    "id": "loyallia_link",
                },
                {
                    "uri": f"{PlatformSetting.get('ENROLL_BASE_URL', default=getattr(settings, 'PUBLIC_BASE_URL', '') or '')}/enroll/{card.id}",
                    "description": "Tu Tarjeta Digital",
                    "id": "enroll_link",
                },
            ]
        },
    }

    if hero_uri:
        obj["heroImage"] = {
            "sourceUri": {"uri": hero_uri},
            "contentDescription": {"defaultValue": {"language": "es", "value": "Banner de " + card.name}},
        }

    image_module_url = _resolve_url(
        google_images.get("image_module") or google_images.get("program_logo") or card.icon_url or card.logo_url,
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
            "contentDescription": {"defaultValue": {"language": "es", "value": card.name}},
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


def _build_offer_object(customer_pass, card, customer, tenant, base_url: str = "") -> dict:
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

    hero_uri = _resolve_url(google_images.get("hero_image") or card.strip_image_url, base_url)
    if hero_uri:
        obj["heroImage"] = {
            "sourceUri": {"uri": hero_uri},
            "contentDescription": {"defaultValue": {"language": "es", "value": "Banner de " + card.name}},
        }

    image_module_url = _resolve_url(
        google_images.get("image_module") or google_images.get("program_logo") or card.icon_url or card.logo_url,
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
            "contentDescription": {"defaultValue": {"language": "es", "value": card.name}},
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


def _build_gift_card_object(customer_pass, card, customer, tenant, base_url: str = "") -> dict:
    """Build a Google Wallet GiftCardObject instance."""
    issuer_id = _get_issuer_id()
    class_id = f"{issuer_id}.giftcard-{card.id}"
    object_id = f"{issuer_id}.giftcard-pass-{customer_pass.id}"
    pass_data = customer_pass.pass_data or {}
    balance = pass_data.get("cashback_balance", "0")
    google_images = _get_google_images(card)
    obj = {
        "id": object_id,
        "classId": class_id,
        "state": "ACTIVE",
        "cardNumber": str(customer.id)[:8],
        "balance": {"micros": int(float(balance) * 1_000_000), "currencyCode": "USD"},
        "barcode": {
            "type": _get_barcode_type(card),
            "value": customer_pass.qr_code,
            "alternateText": customer_pass.qr_code[:10],
        },
        "textModulesData": [
            {"header": "Negocio", "body": tenant.name},
            {"header": "Tarjeta", "body": card.name},
        ],
    }

    hero_uri = _resolve_url(google_images.get("hero_image") or card.strip_image_url, base_url)
    if hero_uri:
        obj["heroImage"] = {
            "sourceUri": {"uri": hero_uri},
            "contentDescription": {"defaultValue": {"language": "es", "value": "Banner de " + card.name}},
        }

    image_module_url = _resolve_url(
        google_images.get("image_module") or google_images.get("program_logo") or card.icon_url or card.logo_url,
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
