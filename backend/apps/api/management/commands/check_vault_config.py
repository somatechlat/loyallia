"""
Validate required Vault keys without printing secret values.
"""

from django.core.management.base import BaseCommand, CommandError

from common.vault import fetch_vault_secrets

CORE_REQUIRED_KEYS = [
    "secret_key",
    "postgres_password",
    "redis_url",
    "celery_broker_url",
    "celery_result_backend",
    "minio_access_key",
    "minio_secret_key",
    "jwt_secret_key",
    "pass_hmac_secret",
    "google_oauth_client_id",
    "google_oauth_client_secret",
    "google_wallet_issuer_id",
    "google_service_account_json",
    "google_wallet_enabled",
    "apple_wallet_enabled",
    "payment_gateway_enabled",
    "payment_gateway_provider",
    "email_host_user",
    "email_host_password",
]

PAYMENT_REQUIRED_KEYS = [
    "payment_gateway_login",
    "payment_gateway_tran_key",
    "payment_gateway_webhook_secret",
]

APPLE_REQUIRED_KEYS = [
    "apple_pass_type_identifier",
    "apple_team_identifier",
    "apple_cert_pem",
    "apple_cert_key_pem",
    "apple_wwdr_cert_pem",
]

APPLE_NFC_REQUIRED_KEYS = [
    "apple_nfc_encryption_public_key",
]

INTEGRATION_REQUIRED_KEY_GROUPS = {
    "whatsapp_bridge": ["whatsapp_bridge_api_key"],
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
        "listmonk_api_user",
        "listmonk_api_token",
    ],
    "ai_agent": ["ai_agent_api_key"],
}


def _truthy(value: object) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on", "enabled"}


class Command(BaseCommand):
    help = "Validate required Vault keys without printing secret values."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--include-apple",
            action="store_true",
            help="Validate Apple Wallet keys when Apple Wallet is enabled.",
        )

    def handle(self, *args, **options) -> None:
        secrets = fetch_vault_secrets()
        if not secrets:
            raise CommandError("Vault returned no secrets or is unreachable.")

        required = list(CORE_REQUIRED_KEYS)
        if _truthy(secrets.get("apple_wallet_enabled")):
            required.extend(APPLE_REQUIRED_KEYS)
        if _truthy(secrets.get("apple_nfc_enabled")):
            required.extend(APPLE_NFC_REQUIRED_KEYS)
        if _truthy(secrets.get("payment_gateway_enabled")):
            required.extend(PAYMENT_REQUIRED_KEYS)
        for keys in INTEGRATION_REQUIRED_KEY_GROUPS.values():
            if any(str(secrets.get(key, "")).strip() for key in keys):
                required.extend(keys)

        missing = [
            key
            for key in sorted(set(required))
            if not str(secrets.get(key, "")).strip()
        ]
        if missing:
            raise CommandError(
                "Missing required Vault keys: " + ", ".join(sorted(missing))
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Vault readiness passed for {len(required)} keys. Values were not printed."
            )
        )
