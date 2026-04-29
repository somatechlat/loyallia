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
from pathlib import Path

import jwt  # PyJWT
from django.conf import settings

from apps.customers.pass_engine.google_pass_builders import (
    _build_gift_card_class,
    _build_gift_card_object,
    _build_loyalty_class,
    _build_loyalty_object,
    _build_offer_class,
    _build_offer_object,
    _get_issuer_id,
    _resolve_gw_type,
)

logger = logging.getLogger(__name__)


def _load_service_account() -> dict | None:
    """
    Load Google Service Account JSON from Vault.
    Returns None if secret is not found or is invalid.
    """
    from common.vault import get_secret

    try:
        # Fetching directly from Vault as a JSON string
        sa_json_str = get_secret("GOOGLE_SERVICE_ACCOUNT_JSON", strict=True)
        if not sa_json_str:
            return None

        sa_data = json.loads(sa_json_str)
        if sa_data and "private_key" in sa_data and "client_email" in sa_data:
            return sa_data

        logger.warning("Google Service Account JSON in Vault is missing required fields")
        return None
    except Exception as exc:
        logger.error("Failed to load Google Service Account from Vault: %s", exc)
        return None


def generate_google_wallet_url(customer_pass) -> str | None:
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
            "Google Wallet credentials not configured in Vault or settings. "
            "Ensure GOOGLE_SERVICE_ACCOUNT_JSON is in Vault and GOOGLE_WALLET_ISSUER_ID is set."
        )
        return None

    card = customer_pass.card
    customer = customer_pass.customer
    tenant = card.tenant

    gw_type = _resolve_gw_type(card.card_type)

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
        signed_jwt = jwt.encode(claims, sa_data["private_key"], algorithm="RS256")
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


def _get_access_token() -> str | None:
    """Get an access token from the Google Service Account using OAuth2."""
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
    Reference: https://developers.google.com/wallet/generic/use-cases/trigger-push-notifications
    """
    import httpx

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
        api_endpoint = "offerObjects"
    elif gw_type == "giftCard":
        object_id = f"{issuer_id}.giftcard-pass-{customer_pass.id}"
        api_endpoint = "giftCardObjects"
    else:
        object_id = f"{issuer_id}.loyallia-pass-{customer_pass.id}"
        api_endpoint = "loyaltyObjects"

    message_body = body
    if action_url:
        message_body = f'{body} <a href="{action_url}">Ver mas</a>'

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
        response = httpx.post(
            url,
            json=message_payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}",
            },
            timeout=10.0,
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
    Reference: https://developers.google.com/wallet/generic/rest/v1/loyaltyclass/patch
    """
    import httpx

    sa_data = _load_service_account()
    issuer_id = _get_issuer_id()
    if not sa_data or not issuer_id:
        return {"success": False, "error": "Google Wallet not configured"}

    access_token = _get_access_token()
    if not access_token:
        return {"success": False, "error": "Auth failed"}

    gw_type = _resolve_gw_type(card.card_type)
    tenant = card.tenant

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
        patch_resp = httpx.patch(
            f"{base_url}/{class_id}", json=payload, headers=headers, timeout=10.0
        )
        if patch_resp.status_code in (200, 201):
            logger.info("Google Wallet Class patched successfully: %s", class_id)
            return {"success": True, "action": "patch"}
        if patch_resp.status_code == 404:
            logger.info("Class %s not found — creating via POST", class_id)
            post_resp = httpx.post(base_url, json=payload, headers=headers, timeout=10.0)
            if post_resp.status_code in (200, 201):
                logger.info("Google Wallet Class created: %s", class_id)
                return {"success": True, "action": "create"}
            logger.error(
                "Failed to create Google Wallet Class %s: %s", class_id, post_resp.text
            )
            return {"success": False, "error": post_resp.text}
        logger.error(
            "Unexpected response patching Google Wallet Class %s: %s",
            class_id,
            patch_resp.text,
        )
        return {"success": False, "error": patch_resp.text}
    except Exception as exc:
        logger.error("Error syncing Google Wallet Class %s: %s", class_id, exc)
        return {"success": False, "error": str(exc)}


def send_push_notification_to_class(
    card, header: str, body: str, action_url: str = ""
) -> dict:
    """Send a push notification to EVERYONE holding this card class."""
    import httpx

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
        message_body = f'{body} <a href="{action_url}">Ver mas</a>'

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
        response = httpx.post(
            url,
            json=message_payload,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10.0,
        )
        return {
            "success": response.status_code in (200, 201),
            "response": response.text,
        }
    except Exception as exc:
        return {"success": False, "error": str(exc)}
