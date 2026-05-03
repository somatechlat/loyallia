"""Validate Apple Wallet web PKPass and optional NFC Vault configuration."""

from __future__ import annotations

import base64

from cryptography import x509
from cryptography.hazmat.primitives import serialization
from django.core.management.base import BaseCommand, CommandError

from common.vault import fetch_vault_secrets

IDENTIFIER_KEYS = [
    "apple_pass_type_identifier",
    "apple_team_identifier",
]

CERTIFICATE_KEYS = [
    "apple_cert_pem",
    "apple_wwdr_cert_pem",
]

PRIVATE_KEY_KEYS = [
    ("apple_cert_key_pem", "apple_cert_key_passphrase"),
]

NFC_ENABLED_KEY = "apple_nfc_enabled"
NFC_PUBLIC_KEY = "apple_nfc_encryption_public_key"


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


def _is_truthy(value: object) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


def _load_nfc_public_key(name: str, value: str) -> None:
    """Validate Apple NFC public key without printing the key material."""
    raw_value = value.strip()
    if raw_value.startswith("-----BEGIN"):
        try:
            serialization.load_pem_public_key(raw_value.encode("utf-8"))
            return
        except ValueError as exc:
            raise CommandError(
                f"Vault key '{name}' is not a valid PEM public key."
            ) from exc

    try:
        der_bytes = base64.b64decode(raw_value, validate=True)
        serialization.load_der_public_key(der_bytes)
    except (ValueError, TypeError) as exc:
        raise CommandError(
            f"Vault key '{name}' is not a valid Base64 DER public key."
        ) from exc


class Command(BaseCommand):
    help = "Validate Apple Wallet web PKPass/NFC Vault configuration without printing secrets."

    def handle(self, *args, **options) -> None:
        secrets = fetch_vault_secrets()
        if not secrets:
            raise CommandError("Vault returned no secrets or is unreachable.")

        required_keys = (
            IDENTIFIER_KEYS
            + CERTIFICATE_KEYS
            + [key for key, _passphrase_key in PRIVATE_KEY_KEYS]
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

        nfc_enabled = _is_truthy(secrets.get(NFC_ENABLED_KEY, ""))
        nfc_public_key = str(secrets.get(NFC_PUBLIC_KEY, "")).strip()
        if nfc_enabled and not nfc_public_key:
            raise CommandError(
                f"Vault key '{NFC_PUBLIC_KEY}' is required when '{NFC_ENABLED_KEY}' is enabled."
            )
        if nfc_public_key:
            _load_nfc_public_key(NFC_PUBLIC_KEY, nfc_public_key)

        self.stdout.write(
            self.style.SUCCESS(
                "Apple Wallet web PKPass readiness passed. Identifiers, signing "
                "certificate, private key, WWDR certificate, and optional NFC public "
                "key are parseable. Values were not printed."
            )
        )
