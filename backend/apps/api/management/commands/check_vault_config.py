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
    "payment_gateway_login",
    "payment_gateway_tran_key",
    "payment_gateway_webhook_secret",
    "email_host_user",
    "email_host_password",
]

APPLE_REQUIRED_KEYS = [
    "apple_pass_type_identifier",
    "apple_team_identifier",
    "apple_cert_pem",
    "apple_cert_key_pem",
    "apple_wwdr_cert_pem",
]


class Command(BaseCommand):
    help = "Validate required Vault keys without printing secret values."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--include-apple",
            action="store_true",
            help="Also require Apple Wallet web PKPass keys.",
        )

    def handle(self, *args, **options) -> None:
        secrets = fetch_vault_secrets()
        if not secrets:
            raise CommandError("Vault returned no secrets or is unreachable.")

        required = list(CORE_REQUIRED_KEYS)
        if options["include_apple"]:
            required.extend(APPLE_REQUIRED_KEYS)

        missing = [key for key in required if not str(secrets.get(key, "")).strip()]
        if missing:
            raise CommandError(
                "Missing required Vault keys: " + ", ".join(sorted(missing))
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Vault readiness passed for {len(required)} keys. Values were not printed."
            )
        )
