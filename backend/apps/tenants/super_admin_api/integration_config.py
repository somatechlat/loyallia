"""SuperAdmin integration metadata.

SEC: This module lists editable Vault keys and builds non-secret integration
status objects. It never returns raw secret values.
"""

from django.conf import settings

from apps.tenants.super_admin_api.schemas import PlatformIntegrationOut
from common.vault import get_secret

ALLOWED_INTEGRATION_KEYS = {
    "google_wallet": [
        "google_wallet_enabled",
        "google_wallet_issuer_id",
        "google_service_account_json",
        "google_oauth_client_id",
        "google_oauth_client_secret",
    ],
    "apple_wallet": [
        "apple_wallet_enabled",
        "apple_pass_type_identifier",
        "apple_team_identifier",
        "apple_cert_pem",
        "apple_cert_key_pem",
        "apple_wwdr_cert_pem",
    ],
    "payment_gateway": [
        "payment_gateway_enabled",
        "payment_gateway_provider",
        "payment_gateway_login",
        "payment_gateway_tran_key",
        "payment_gateway_webhook_secret",
    ],
    "email": [
        "email_host_user",
        "email_host_password",
    ],
    "google_oauth": [
        "google_oauth_client_id",
        "google_oauth_client_secret",
    ],
    "whatsapp_bridge": [
        "whatsapp_bridge_url",
        "whatsapp_bridge_api_key",
    ],
    "twilio_sms": [
        "twilio_account_sid",
        "twilio_auth_token",
        "twilio_from_number",
    ],
    "listmonk": [
        "listmonk_url",
        "listmonk_api_user",
        "listmonk_api_token",
    ],
    "apple_nfc": [
        "apple_nfc_enabled",
        "apple_nfc_encryption_public_key",
    ],
    "ai_agent": [
        "ai_agent_base_url",
        "ai_agent_api_key",
    ],
}


def _truthy(value: str) -> bool:
    """Return True for common on/true values."""
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _present(key: str) -> bool:
    """Check Vault/env-backed presence without exposing the value."""
    return bool(get_secret(key, default="").strip())


def additional_integrations() -> list[PlatformIntegrationOut]:
    """Return non-secret status for integrations beyond wallet/payment/email."""
    whatsapp_url = get_secret(
        "whatsapp_bridge_url",
        env_fallback="WHATSAPP_BRIDGE_URL",
        default=getattr(settings, "WHATSAPP_BRIDGE_URL", ""),
    )
    listmonk_url = get_secret(
        "listmonk_url",
        env_fallback="LISTMONK_URL",
        default=getattr(settings, "LISTMONK_URL", ""),
    )
    ai_agent_base_url = get_secret(
        "ai_agent_base_url",
        env_fallback="AI_AGENT_BASE_URL",
        default=getattr(settings, "AI_AGENT_BASE_URL", ""),
    )
    whatsapp_key_present = _present("whatsapp_bridge_api_key")
    twilio_sid_present = _present("twilio_account_sid")
    twilio_token_present = _present("twilio_auth_token")
    twilio_from_present = _present("twilio_from_number")
    listmonk_user_present = _present("listmonk_api_user")
    listmonk_token_present = _present("listmonk_api_token")
    apple_nfc_enabled = _truthy(get_secret("apple_nfc_enabled", default="false"))
    apple_nfc_key_present = _present("apple_nfc_encryption_public_key")
    ai_agent_key_present = _present("ai_agent_api_key")

    return [
        PlatformIntegrationOut(
            key="whatsapp_bridge",
            name="WhatsApp Bridge",
            enabled=bool(whatsapp_url),
            configured=whatsapp_key_present,
            status="configured" if whatsapp_key_present else "missing_credentials",
            detail=f"Bridge URL: {whatsapp_url}",
            diagnostics={"api_key_present": whatsapp_key_present},
            preview_values={"whatsapp_bridge_url": whatsapp_url},
        ),
        PlatformIntegrationOut(
            key="twilio_sms",
            name="Twilio SMS",
            enabled=twilio_sid_present or twilio_token_present or twilio_from_present,
            configured=twilio_sid_present
            and twilio_token_present
            and twilio_from_present,
            status=(
                "configured"
                if twilio_sid_present and twilio_token_present and twilio_from_present
                else "missing_credentials"
            ),
            detail="SMS campaign delivery via Twilio",
            diagnostics={
                "account_sid_present": twilio_sid_present,
                "auth_token_present": twilio_token_present,
                "from_number_present": twilio_from_present,
            },
            preview_values={
                "twilio_from_number": get_secret("twilio_from_number", default=""),
            },
        ),
        PlatformIntegrationOut(
            key="listmonk",
            name="Listmonk",
            enabled=bool(listmonk_url),
            configured=listmonk_user_present and listmonk_token_present,
            status=(
                "configured"
                if listmonk_user_present and listmonk_token_present
                else "missing_credentials"
            ),
            detail=f"Listmonk URL: {listmonk_url}",
            diagnostics={
                "api_user_present": listmonk_user_present,
                "api_token_present": listmonk_token_present,
            },
            preview_values={
                "listmonk_api_user": get_secret("listmonk_api_user", default=""),
            },
        ),
        PlatformIntegrationOut(
            key="apple_nfc",
            name="Apple NFC",
            enabled=apple_nfc_enabled,
            configured=(not apple_nfc_enabled) or apple_nfc_key_present,
            status=(
                "configured"
                if (not apple_nfc_enabled) or apple_nfc_key_present
                else "missing_credentials"
            ),
            detail="Optional Apple Wallet NFC payload encryption",
            diagnostics={
                "enabled": apple_nfc_enabled,
                "public_key_present": apple_nfc_key_present,
            },
            preview_values={
                "apple_nfc_enabled": "true" if apple_nfc_enabled else "false",
            },
        ),
        PlatformIntegrationOut(
            key="ai_agent",
            name="AI Agent",
            enabled=bool(ai_agent_base_url),
            configured=ai_agent_key_present,
            status="configured" if ai_agent_key_present else "missing_credentials",
            detail=f"Agent URL: {ai_agent_base_url}",
            diagnostics={"api_key_present": ai_agent_key_present},
            preview_values={"ai_agent_base_url": ai_agent_base_url},
        ),
    ]
