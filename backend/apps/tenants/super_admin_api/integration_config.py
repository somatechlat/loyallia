"""SuperAdmin integration metadata.

SEC: This module lists editable Vault keys and builds non-secret integration
status objects. It never returns raw secret values.
"""

import json
import re

from cryptography import x509
from cryptography.hazmat.primitives import serialization
from django.conf import settings
from ninja.errors import HttpError

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
    "twilio_verify": [
        "twilio_verify_enabled",
        "twilio_verify_service_sid",
        "twilio_verify_default_channel",
    ],
    "twilio_api_key": [
        "twilio_api_key_sid",
        "twilio_api_key_secret",
    ],
    "twilio_test": [
        "twilio_test_account_sid",
        "twilio_test_auth_token",
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


def _normalize_pem(value: str) -> str:
    """Normalize PEM pasted with escaped newlines or as a single wrapped line."""
    normalized = value.strip().replace("\r\n", "\n").replace("\r", "\n")
    if "\\n" in normalized and "\n" not in normalized:
        normalized = normalized.replace("\\n", "\n")
    if "\n" in normalized:
        return normalized

    match = re.fullmatch(
        r"-----BEGIN ([A-Z0-9 ]+)-----\s+(.+?)\s+-----END \1-----",
        normalized,
    )
    if not match:
        return normalized

    label, body = match.groups()
    compact_body = re.sub(r"\s+", "", body)
    wrapped = "\n".join(compact_body[i : i + 64] for i in range(0, len(compact_body), 64))
    return f"-----BEGIN {label}-----\n{wrapped}\n-----END {label}-----"


def normalize_and_validate_vault_secret(key: str, value: str) -> str:
    """Validate high-risk wallet credentials before they are persisted."""
    normalized = value.strip()

    if key == "google_service_account_json":
        try:
            payload = json.loads(normalized)
        except json.JSONDecodeError as exc:
            raise HttpError(400, f"Invalid Google service account JSON: {exc}") from exc
        missing = [field for field in ("client_email", "private_key", "token_uri") if not payload.get(field)]
        if missing:
            raise HttpError(
                400,
                f"Google service account JSON missing field(s): {', '.join(missing)}",
            )
        return json.dumps(payload, separators=(",", ":"))

    if key in {"apple_cert_pem", "apple_cert_key_pem", "apple_wwdr_cert_pem"}:
        normalized = _normalize_pem(normalized)
        try:
            if key == "apple_cert_key_pem":
                serialization.load_pem_private_key(normalized.encode("utf-8"), password=None)
            else:
                x509.load_pem_x509_certificate(normalized.encode("utf-8"))
        except Exception as exc:
            raise HttpError(400, f"Invalid PEM value for {key}: {exc}") from exc
        return normalized

    if key in {
        "google_wallet_enabled",
        "apple_wallet_enabled",
        "payment_gateway_enabled",
        "apple_nfc_enabled",
        "twilio_verify_enabled",
    }:
        lowered = normalized.lower()
        if lowered not in {"true", "false"}:
            raise HttpError(400, f"{key} must be 'true' or 'false'")
        return lowered

    if key == "twilio_verify_service_sid":
        if not re.fullmatch(r"VA[a-fA-F0-9]{32}", normalized):
            raise HttpError(400, "Invalid Twilio Verify Service SID. Expected format: VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (34 chars)")
        return normalized

    if key == "twilio_verify_default_channel":
        valid_channels = {"sms", "whatsapp", "voice", "email", "push", "totp", "sna"}
        if normalized.lower() not in valid_channels:
            raise HttpError(400, f"Invalid Verify channel. Must be one of: {', '.join(sorted(valid_channels))}")
        return normalized.lower()

    if key == "twilio_api_key_sid":
        if normalized and not re.fullmatch(r"SK[a-fA-F0-9]{32}", normalized):
            raise HttpError(400, "Invalid Twilio API Key SID. Expected format: SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (34 chars)")
        return normalized

    if key == "twilio_test_account_sid":
        if normalized and not re.fullmatch(r"AC[a-fA-F0-9]{32}", normalized):
            raise HttpError(400, "Invalid Twilio Test Account SID. Expected format: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (34 chars)")
        return normalized

    return normalized


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
    verify_enabled = _truthy(get_secret("twilio_verify_enabled", default="false"))
    verify_sid_present = _present("twilio_verify_service_sid")
    api_key_sid_present = _present("twilio_api_key_sid")
    api_key_secret_present = _present("twilio_api_key_secret")
    test_sid_present = _present("twilio_test_account_sid")
    test_token_present = _present("twilio_test_auth_token")
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
            configured=twilio_sid_present and twilio_token_present and twilio_from_present,
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
            key="twilio_verify",
            name="Twilio Verify",
            enabled=verify_enabled,
            configured=verify_sid_present,
            status="configured" if verify_sid_present else "missing_credentials",
            detail="Multi-channel OTP verification via Twilio Verify v2",
            diagnostics={
                "verify_enabled": verify_enabled,
                "service_sid_present": verify_sid_present,
                "default_channel": get_secret("twilio_verify_default_channel", default="sms"),
            },
            preview_values={
                "twilio_verify_default_channel": get_secret("twilio_verify_default_channel", default="sms"),
            },
        ),
        PlatformIntegrationOut(
            key="twilio_api_key",
            name="Twilio API Key",
            enabled=api_key_sid_present,
            configured=api_key_sid_present and api_key_secret_present,
            status="configured" if (api_key_sid_present and api_key_secret_present) else "missing_credentials",
            detail="Alternative authentication for Twilio (API Key vs Auth Token)",
            diagnostics={
                "api_key_sid_present": api_key_sid_present,
                "api_key_secret_present": api_key_secret_present,
            },
            preview_values={},
        ),
        PlatformIntegrationOut(
            key="twilio_test",
            name="Twilio Test Credentials",
            enabled=test_sid_present,
            configured=test_sid_present and test_token_present,
            status="configured" if (test_sid_present and test_token_present) else "missing_credentials",
            detail="Test Account SID + Auth Token for safe sandbox testing",
            diagnostics={
                "test_account_sid_present": test_sid_present,
                "test_auth_token_present": test_token_present,
            },
            preview_values={},
        ),
        PlatformIntegrationOut(
            key="listmonk",
            name="Listmonk",
            enabled=bool(listmonk_url),
            configured=listmonk_user_present and listmonk_token_present,
            status=("configured" if listmonk_user_present and listmonk_token_present else "missing_credentials"),
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
            status=("configured" if (not apple_nfc_enabled) or apple_nfc_key_present else "missing_credentials"),
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
