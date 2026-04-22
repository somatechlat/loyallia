"""
Loyallia — Google Wallet Pass Generator
Generates JWT-based loyalty passes for Google Wallet.

According to Google Wallet API docs:
- Creates a LoyaltyObject with pass data
- Signs a JWT with the Service Account private key
- Returns a save URL: https://pay.google.com/gp/v/save/{jwt}

Reference: https://developers.google.com/wallet/loyalty
"""

import json
import logging
import time
import uuid as uuid_module
from pathlib import Path
from typing import Optional

import jwt  # PyJWT

from django.conf import settings

logger = logging.getLogger(__name__)


def _load_service_account() -> Optional[dict]:
    """
    Load Google Service Account JSON from the configured path.
    Returns None if file is not found or is empty.
    """
    sa_path_str = getattr(settings, "GOOGLE_SERVICE_ACCOUNT_FILE", "")
    if not sa_path_str:
        logger.error("GOOGLE_SERVICE_ACCOUNT_FILE setting is empty")
        return None

    sa_path = Path(sa_path_str)
    if not sa_path.exists():
        logger.error(
            "Google Wallet Service Account file NOT FOUND at: %s. "
            "Check GOOGLE_SERVICE_ACCOUNT_FILE in .env and ensure it is mounted in Docker.",
            sa_path.absolute(),
        )
        return None

    try:
        with open(sa_path, "r") as f:
            data = json.load(f)

        if not isinstance(data, dict):
            logger.error("Service Account JSON must be a dictionary")
            return None

        if not data.get("private_key") or not data.get("client_email"):
            logger.error(
                "Service Account JSON at %s is missing 'private_key' or 'client_email'. "
                "Ensure you are using a correct Google Cloud Service Account key file.",
                sa_path,
            )
            return None

        return data
    except (json.JSONDecodeError, IOError) as exc:
        logger.error("Failed to load or parse Service Account JSON at %s: %s", sa_path, exc)
        return None


def _get_issuer_id() -> str:
    """Return the Google Wallet Issuer ID from settings."""
    return getattr(settings, "GOOGLE_WALLET_ISSUER_ID", "")


def _map_card_type_to_style(card_type: str) -> dict:
    """Map Loyallia card type to Google Wallet loyalty program fields."""
    styles = {
        "stamp": {"programName": "Tarjeta de Sellos"},
        "cashback": {"programName": "Programa de Cashback"},
        "coupon": {"programName": "Cupón de Descuento"},
        "vip_membership": {"programName": "Membresía VIP"},
        "gift_certificate": {"programName": "Certificado de Regalo"},
        "referral_pass": {"programName": "Programa de Referidos"},
        "discount": {"programName": "Tarjeta de Descuento"},
        "corporate_discount": {"programName": "Descuento Corporativo"},
        "multipass": {"programName": "Multipase"},
        "affiliate": {"programName": "Tarjeta de Afiliación"},
    }
    return styles.get(card_type, {"programName": "Programa de Lealtad"})


def _build_loyalty_class(card, tenant) -> dict:
    """
    Build the Google Wallet LoyaltyClass object (the template).
    One per Card (program). All visual fields set here propagate to every
    customer pass instantly when the class is PATCHed.

    Reference: https://developers.google.com/wallet/generic/rest/v1/loyaltyclass
    """
    issuer_id = _get_issuer_id()
    class_id = f"{issuer_id}.loyallia-{card.id}"

    logo_uri = (
        card.logo_url
        or f"https://ui-avatars.com/api/?name={card.name[:1]}&background=5660ff&color=fff&size=256"
    )

    class_payload = {
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

    # Hero image (strip / banner) — set at class level so it propagates to ALL passes
    if card.strip_image_url:
        class_payload["heroImage"] = {
            "sourceUri": {"uri": card.strip_image_url},
            "contentDescription": {
                "defaultValue": {"language": "es", "value": f"Banner de {card.name}"},
            },
        }

    # Wide logo (larger than programLogo, shown prominently at top of pass)
    if card.logo_url:
        class_payload["wideLogo"] = {
            "sourceUri": {"uri": card.logo_url},
            "contentDescription": {
                "defaultValue": {"language": "es", "value": card.name},
            },
        }

    # Icon / reward image — shown as an image module inside the pass detail
    if card.icon_url:
        class_payload["imageModulesData"] = [
            {
                "mainImage": {
                    "sourceUri": {"uri": card.icon_url},
                    "contentDescription": {
                        "defaultValue": {"language": "es", "value": "Imagen de recompensa"}
                    },
                },
                "id": "reward_image",
            }
        ]

    # Locations
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
            class_payload["locations"] = locations

    # "Powered by" branding — appears at class level
    class_payload["textModulesData"] = [
        {
            "header": "",
            "body": "Powered by Loyallia — Claro Partner",
            "id": "loyallia_branding",
        }
    ]

    # Links module — appears below pass details
    class_payload["linksModuleData"] = {
        "uris": [
            {
                "uri": "https://loyallia.com",
                "description": "Powered by Loyallia",
                "id": "loyallia_link",
            },
            {
                "uri": f"https://loyallia.com/enroll/{card.id}",
                "description": "Inscríbete aquí",
                "id": "enroll_link",
            },
        ]
    }

    return class_payload


def _build_loyalty_object(customer_pass, card, customer, tenant) -> dict:
    """
    Build the Google Wallet LoyaltyObject (the instance per customer).
    Enhanced with premium visual modules.
    """
    issuer_id = _get_issuer_id()
    class_id = f"{issuer_id}.loyallia-{card.id}"
    object_id = f"{issuer_id}.loyallia-pass-{customer_pass.id}"

    # Build pass-specific fields based on card type
    loyalty_points = _build_points_for_type(card, customer_pass)

    # Hero Image: Wide banner at the top of the pass
    # Default to a premium coffee banner if the card is a 'stamp' card and has no image
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
        # Display large branding and info modules
        "textModulesData": [
            {
                "header": "Establecimiento",
                "body": tenant.name,
                "id": "tenant_name"
            },
            {
                "header": "Programa",
                "body": card.name,
                "id": "program_name"
            },
            {
                "header": "",
                "body": "Powered by Loyallia — Claro Partner",
                "id": "loyallia_branding"
            },
        ],
        "linksModuleData": {
            "uris": [
                {
                    "uri": "https://loyallia.com",
                    "description": "Powered by Loyallia",
                    "id": "loyallia_link"
                },
                {
                    "uri": f"https://loyallia.com/enroll/{card.id}",
                    "description": "Tu Tarjeta Digital",
                    "id": "enroll_link"
                }
            ]
        }
    }

    # Add Hero Image
    if hero_uri:
        obj["heroImage"] = {
            "sourceUri": {"uri": hero_uri},
            "contentDescription": {
                "defaultValue": {"language": "es", "value": "Banner de " + card.name},
            },
        }

    # Add Image Module (Promotion/Visual inside the pass)
    if card.icon_url or card.logo_url:
        obj["imageModulesData"] = [
            {
                "mainImage": {
                    "sourceUri": {
                        "uri": card.icon_url or card.logo_url
                    },
                    "contentDescription": {
                        "defaultValue": {"language": "es", "value": "Recompensa del programa"}
                    }
                },
                "id": "reward_highlight"
            }
        ]

    return obj


def _build_points_for_type(card, customer_pass) -> dict:
    """Build the loyaltyPoints section based on card type and pass data."""
    pass_data = customer_pass.pass_data or {}

    if card.card_type == "stamp":
        total = card.metadata.get("total_stamps", 6) if card.metadata else 6
        current = pass_data.get("stamp_count", 0)
        return {
            "label": "Sellos",
            "balance": {
                "int": current,
            },
        }
    elif card.card_type == "cashback":
        balance = pass_data.get("cashback_balance", "0")
        return {
            "label": "Crédito",
            "balance": {
                "money": {
                    "micros": int(float(balance) * 1_000_000),
                    "currencyCode": "USD",
                },
            },
        }
    elif card.card_type == "vip_membership":
        return {
            "label": "Membresía",
            "balance": {
                "string": pass_data.get("membership_tier", "VIP"),
            },
        }
    elif card.card_type == "referral_pass":
        referrals = pass_data.get("referrals_made", 0)
        return {
            "label": "Referidos",
            "balance": {
                "int": referrals,
            },
        }
    else:
        return {
            "label": "Puntos",
            "balance": {
                "int": 0,
            },
        }


def _resolve_gw_type(card_type: str) -> str:
    """
    Map Loyallia card_type to the correct Google Wallet API class family.
    Reference: https://developers.google.com/wallet/generic/rest/v1
    - LoyaltyClass: stamp, vip_membership, affiliate
    - OfferClass: coupon, discount, corporate_discount, referral_pass
    - GiftCardClass: gift_certificate, cashback, multipass
    """
    OFFER_TYPES = {"coupon", "discount", "corporate_discount", "referral_pass"}
    GIFT_TYPES = {"gift_certificate", "cashback", "multipass"}
    if card_type in OFFER_TYPES:
        return "offer"
    elif card_type in GIFT_TYPES:
        return "giftCard"
    return "loyalty"


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
    # Hero image at class level — propagates to all offer passes
    if card.strip_image_url:
        payload["heroImage"] = {
            "sourceUri": {"uri": card.strip_image_url},
            "contentDescription": {
                "defaultValue": {"language": "es", "value": f"Banner de {card.name}"},
            },
        }
    if card.icon_url:
        payload["imageModulesData"] = [
            {
                "mainImage": {
                    "sourceUri": {"uri": card.icon_url},
                    "contentDescription": {
                        "defaultValue": {"language": "es", "value": "Imagen de oferta"}
                    },
                },
                "id": "offer_image",
            }
        ]
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
    # Hero image at class level — propagates to all gift card passes
    if card.strip_image_url:
        payload["heroImage"] = {
            "sourceUri": {"uri": card.strip_image_url},
            "contentDescription": {
                "defaultValue": {"language": "es", "value": f"Banner de {card.name}"},
            },
        }
    if card.icon_url:
        payload["imageModulesData"] = [
            {
                "mainImage": {
                    "sourceUri": {"uri": card.icon_url},
                    "contentDescription": {
                        "defaultValue": {"language": "es", "value": "Imagen de tarjeta"}
                    },
                },
                "id": "giftcard_image",
            }
        ]
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
        "balance": {
            "micros": int(float(balance) * 1_000_000),
            "currencyCode": "USD",
        },
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


def generate_google_wallet_url(customer_pass) -> Optional[str]:
    """
    Generate a Google Wallet "Save to Google Pay" URL for a CustomerPass.

    Dynamically selects the correct Google Wallet class type based on card_type:
    - LoyaltyClass for stamp, vip_membership, affiliate
    - OfferClass for coupon, discount, corporate_discount, referral_pass
    - GiftCardClass for gift_certificate, cashback, multipass

    Reference: https://developers.google.com/wallet

    Args:
        customer_pass: CustomerPass model instance (with card, customer, card.tenant loaded)

    Returns:
        Save URL string, or None if credentials are not configured
    """
    sa_data = _load_service_account()
    issuer_id = _get_issuer_id()

    if not sa_data or not issuer_id:
        logger.warning(
            "Google Wallet credentials not configured. "
            "Set GOOGLE_SERVICE_ACCOUNT_FILE and GOOGLE_WALLET_ISSUER_ID in settings."
        )
        return None

    card = customer_pass.card
    customer = customer_pass.customer
    tenant = card.tenant

    gw_type = _resolve_gw_type(card.card_type)

    # Build class + object based on resolved Google Wallet type
    if gw_type == "offer":
        gw_class = _build_offer_class(card, tenant)
        gw_object = _build_offer_object(customer_pass, card, customer, tenant)
        payload_key_class = "offerClasses"
        payload_key_object = "offerObjects"
    elif gw_type == "giftCard":
        gw_class = _build_gift_card_class(card, tenant)
        gw_object = _build_gift_card_object(customer_pass, card, customer, tenant)
        payload_key_class = "giftCardClasses"
        payload_key_object = "giftCardObjects"
    else:
        gw_class = _build_loyalty_class(card, tenant)
        gw_object = _build_loyalty_object(customer_pass, card, customer, tenant)
        payload_key_class = "loyaltyClasses"
        payload_key_object = "loyaltyObjects"

    # Build the JWT claims per Google Wallet API specification
    claims = {
        "iss": sa_data["client_email"],
        "aud": "google",
        "typ": "savetowallet",
        "iat": int(time.time()),
        "origins": [],
        "payload": {
            payload_key_class: [gw_class],
            payload_key_object: [gw_object],
        },
    }

    try:
        signed_jwt = jwt.encode(
            claims,
            sa_data["private_key"],
            algorithm="RS256",
        )
        save_url = f"https://pay.google.com/gp/v/save/{signed_jwt}"
        logger.info(
            "Google Wallet URL generated for pass %s (type: %s, customer: %s)",
            customer_pass.id,
            gw_type,
            customer.email,
        )
        return save_url

    except Exception as exc:
        logger.error("Failed to generate Google Wallet JWT: %s", exc)
        return None


def is_google_wallet_configured() -> bool:
    """Check if Google Wallet credentials are properly configured."""
    sa_data = _load_service_account()
    issuer_id = _get_issuer_id()
    return sa_data is not None and bool(issuer_id)


def _get_access_token() -> Optional[str]:
    """
    Get an access token from the Google Service Account using OAuth2.
    Uses the google-auth library to create credentials and get a token.
    """
    from google.auth.transport import requests as google_requests
    from google.oauth2 import service_account

    sa_data = _load_service_account()
    if not sa_data:
        return None

    try:
        credentials = service_account.Credentials.from_service_account_info(
            sa_data, scopes=["https://www.googleapis.com/auth/wallet_object.issuer"]
        )
        credentials.refresh(google_requests.Request())
        return credentials.token
    except Exception as exc:
        logger.error("Failed to get access token: %s", exc)
        return None


def send_push_notification(
    customer_pass, header: str, body: str, action_url: str = ""
) -> dict:
    """
    Send a push notification to a Google Wallet pass using the Add Message API.

    Uses message_type: TEXT_AND_NOTIFY to trigger a push notification to the user's phone.

    Reference: https://developers.google.com/wallet/generic/use-cases/trigger-push-notifications

    Args:
        customer_pass: CustomerPass model instance
        header: Message header/title
        body: Message body content
        action_url: Optional URL to include in the message

    Returns:
        dict with success status and details
    """
    import requests

    sa_data = _load_service_account()
    issuer_id = _get_issuer_id()

    if not sa_data or not issuer_id:
        logger.warning("Google Wallet credentials not configured")
        return {"success": False, "error": "Google Wallet credentials not configured"}

    access_token = _get_access_token()
    if not access_token:
        logger.error("Failed to get access token for Google Wallet API")
        return {
            "success": False,
            "error": "Failed to authenticate with Google Wallet API",
        }

    card = customer_pass.card

    gw_type = _resolve_gw_type(card.card_type)

    if gw_type == "offer":
        object_id = f"{issuer_id}.offer-pass-{customer_pass.id}"
        class_id = f"{issuer_id}.offer-{card.id}"
        api_endpoint = "offerObjects"
    elif gw_type == "giftCard":
        object_id = f"{issuer_id}.giftcard-pass-{customer_pass.id}"
        class_id = f"{issuer_id}.giftcard-{card.id}"
        api_endpoint = "giftCardObjects"
    else:
        object_id = f"{issuer_id}.loyallia-pass-{customer_pass.id}"
        class_id = f"{issuer_id}.loyallia-{card.id}"
        api_endpoint = "loyaltyObjects"

    message_body = body
    if action_url:
        message_body = f'{body} <a href="{action_url}">Ver más</a>'

    message_id = f"msg_{int(time.time())}"

    message_payload = {
        "message": {
            "header": header,
            "body": message_body,
            "id": message_id,
            "messageType": "TEXT_AND_NOTIFY",
        }
    }

    url = f"https://walletobjects.googleapis.com/walletobjects/v1/{api_endpoint}/{object_id}/addMessage"

    try:
        response = requests.post(
            url,
            json=message_payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}",
            },
        )

        if response.status_code in (200, 201):
            logger.info(
                "Push notification sent to pass %s: %s", customer_pass.id, header
            )
            return {"success": True, "message_id": message_id}
        else:
            logger.error(
                "Failed to send push notification: %s - %s",
                response.status_code,
                response.text,
            )
            return {"success": False, "error": response.text}

    except Exception as exc:
        logger.error("Error sending push notification: %s", exc)
        return {"success": False, "error": str(exc)}


def update_loyalty_class(card) -> dict:
    """
    Upsert the Google Wallet Class for a card (PATCH existing, POST if not found).

    Passes created via JWT don't pre-register the class via REST API — Google
    creates it internally on the customer's first 'Add to Wallet' tap.
    So PATCH returns 404 until then. Fix: try PATCH, fall back to POST (create).

    After this runs, heroImage/logo/colors propagate to ALL passes of this class.

    Reference: https://developers.google.com/wallet/generic/rest/v1/loyaltyclass/patch
    """
    import requests

    sa_data = _load_service_account()
    issuer_id = _get_issuer_id()
    if not sa_data or not issuer_id:
        return {"success": False, "error": "Google Wallet not configured"}

    access_token = _get_access_token()
    if not access_token:
        return {"success": False, "error": "Auth failed"}

    gw_type = _resolve_gw_type(card.card_type)
    tenant = card.tenant

    # Build the updated class payload (now includes heroImage, wideLogo, imageModulesData)
    if gw_type == "offer":
        payload = _build_offer_class(card, tenant)
        api_endpoint = "offerClass"
    elif gw_type == "giftCard":
        payload = _build_gift_card_class(card, tenant)
        api_endpoint = "giftCardClass"
    else:
        payload = _build_loyalty_class(card, tenant)
        api_endpoint = "loyaltyClass"

    class_id = payload["id"]
    base_url = f"https://walletobjects.googleapis.com/walletobjects/v1/{api_endpoint}"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}",
    }

    try:
        # Step 1: Try PATCH (update existing class — propagates to all existing passes)
        patch_resp = requests.patch(
            f"{base_url}/{class_id}",
            json=payload,
            headers=headers,
        )
        if patch_resp.status_code in (200, 201):
            logger.info("Google Wallet Class patched successfully: %s", class_id)
            return {"success": True, "action": "patch"}

        if patch_resp.status_code == 404:
            # Step 2: Class not yet in Google's REST system — create it via POST
            logger.info(
                "Class %s not found in Google Wallet REST API — creating via POST", class_id
            )
            post_resp = requests.post(
                base_url,
                json=payload,
                headers=headers,
            )
            if post_resp.status_code in (200, 201):
                logger.info("Google Wallet Class created: %s", class_id)
                return {"success": True, "action": "create"}
            logger.error("Failed to create Google Wallet Class %s: %s", class_id, post_resp.text)
            return {"success": False, "error": post_resp.text}

        logger.error("Unexpected response patching Google Wallet Class %s: %s", class_id, patch_resp.text)
        return {"success": False, "error": patch_resp.text}

    except Exception as exc:
        logger.error("Error syncing Google Wallet Class %s: %s", class_id, exc)
        return {"success": False, "error": str(exc)}



def send_push_notification_to_class(card, header: str, body: str, action_url: str = "") -> dict:
    """
    Send a push notification to EVERYONE holding this card class.
    Extremely efficient for program-wide campaigns.
    """
    import requests

    sa_data = _load_service_account()
    issuer_id = _get_issuer_id()
    if not sa_data or not issuer_id:
        return {"success": False, "error": "Google Wallet not configured"}

    access_token = _get_access_token()
    if not access_token:
        return {"success": False, "error": "Auth failed"}

    gw_type = _resolve_gw_type(card.card_type)
    if gw_type == "offer":
        class_id = f"{issuer_id}.offer-{card.id}"
        api_endpoint = "offerClass"
    elif gw_type == "giftCard":
        class_id = f"{issuer_id}.giftcard-{card.id}"
        api_endpoint = "giftCardClass"
    else:
        class_id = f"{issuer_id}.loyallia-{card.id}"
        api_endpoint = "loyaltyClass"

    message_body = body
    if action_url:
        message_body = f'{body} <a href="{action_url}">Ver más</a>'

    message_payload = {
        "message": {
            "header": header,
            "body": message_body,
            "id": f"broadcast_{int(time.time())}",
            "messageType": "TEXT_AND_NOTIFY",
        }
    }

    url = f"https://walletobjects.googleapis.com/walletobjects/v1/{api_endpoint}/{class_id}/addMessage"

    try:
        response = requests.post(
            url,
            json=message_payload,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        return {"success": response.status_code in (200, 201), "response": response.text}
    except Exception as exc:
        return {"success": False, "error": str(exc)}
