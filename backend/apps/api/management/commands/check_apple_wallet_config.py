"""
Validate Apple Wallet and Verify with Wallet Vault configuration.
"""

from __future__ import annotations

from cryptography import x509
from cryptography.hazmat.primitives import serialization
from django.core.management.base import BaseCommand, CommandError

from common.vault import fetch_vault_secrets

IDENTIFIER_KEYS = [
    "apple_pass_type_identifier",
    "apple_team_identifier",
    "apple_verify_bundle_id",
    "apple_verify_merchant_id",
    "apple_verify_document_types",
    "apple_verify_requested_elements",
]

CERTIFICATE_KEYS = [
    "apple_cert_pem",
    "apple_wwdr_cert_pem",
    "apple_verify_identity_cert_pem",
]

PRIVATE_KEY_KEYS = [
    ("apple_cert_key_pem", "apple_cert_key_passphrase"),
    (
        "apple_verify_identity_private_key_pem",
        "apple_verify_identity_private_key_passphrase",
    ),
]

BUNDLE_CERT_KEY = "apple_iaca_certificates_pem"


def _load_certificate(name: str, value: str) -> None:
    try:
        x509.load_pem_x509_certificate(value.encode("utf-8"))
    except ValueError as exc:
        raise CommandError(
            f"Vault key '{name}' is not a valid PEM certificate."
        ) from exc


def _load_private_key(name: str, value: str, passphrase: str = "") -> None:
    password = passphrase.encode("utf-8") if passphrase else None
    try:
        serialization.load_pem_private_key(value.encode("utf-8"), password=password)
    except (TypeError, ValueError) as exc:
        raise CommandError(
            f"Vault key '{name}' is not a valid PEM private key."
        ) from exc


def _split_pem_certificates(value: str) -> list[str]:
    marker = "-----END CERTIFICATE-----"
    certificates = []
    for chunk in value.split(marker):
        chunk = chunk.strip()
        if chunk:
            certificates.append(f"{chunk}\n{marker}\n")
    return certificates


class Command(BaseCommand):
    help = "Validate Apple Wallet / Verify with Wallet Vault configuration without printing secrets."

    def handle(self, *args, **options) -> None:
        secrets = fetch_vault_secrets()
        if not secrets:
            raise CommandError("Vault returned no secrets or is unreachable.")

        required_keys = (
            IDENTIFIER_KEYS
            + CERTIFICATE_KEYS
            + [key for key, _passphrase_key in PRIVATE_KEY_KEYS]
            + [BUNDLE_CERT_KEY]
        )
        missing = [
            key for key in required_keys if not str(secrets.get(key, "")).strip()
        ]
        if missing:
            raise CommandError(
                "Missing Apple Wallet Vault keys: " + ", ".join(sorted(missing))
            )

        for key in IDENTIFIER_KEYS:
            if not str(secrets[key]).strip():
                raise CommandError(f"Vault key '{key}' is empty.")

        for key in CERTIFICATE_KEYS:
            _load_certificate(key, str(secrets[key]))

        for key, passphrase_key in PRIVATE_KEY_KEYS:
            _load_private_key(
                key, str(secrets[key]), str(secrets.get(passphrase_key, ""))
            )

        iaca_certificates = _split_pem_certificates(str(secrets[BUNDLE_CERT_KEY]))
        if not iaca_certificates:
            raise CommandError(
                "Vault key 'apple_iaca_certificates_pem' has no PEM certificates."
            )
        for index, certificate in enumerate(iaca_certificates, start=1):
            _load_certificate(f"{BUNDLE_CERT_KEY}[{index}]", certificate)

        self.stdout.write(
            self.style.SUCCESS(
                "Apple Wallet readiness passed. Identifiers, certificates, private keys, "
                f"and {len(iaca_certificates)} IACA certificate(s) are parseable. Values were not printed."
            )
        )
