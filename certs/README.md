# Loyallia — Certificates Directory

> **DO NOT store certificates or private keys as files in this directory for production.**

All cryptographic material is managed via **HashiCorp Vault** KV v2:

| Secret | Vault Key | Usage |
|--------|-----------|-------|
| Google Service Account JSON | `google_service_account_json` | Google Wallet pass signing |
| Apple Pass Certificate (PEM) | `apple_cert_pem` | Apple PKPass signing |
| Apple Pass Private Key (PEM) | `apple_cert_key_pem` | Apple PKPass signing |
| Apple WWDR Certificate (PEM) | `apple_wwdr_cert_pem` | Apple PKPass chain validation |
| Apple NFC Encryption Key | `apple_nfc_encryption_public_key` | Apple Wallet NFC passes |

## Development Setup

For local development, seed these values into Vault via the `vault-init` container:

1. Set the `_GOOGLE_SERVICE_ACCOUNT_JSON` env var with the JSON content
2. Run `docker compose up vault vault-init`
3. The init script will store the value in Vault at `secret/data/loyallia/production`

The backend reads all certificates from Vault at runtime using `common.vault.get_secret()`.

## Files in `.gitignore`

The following patterns are gitignored to prevent accidental commits:
- `certs/*.pem`
- `certs/*.key`
- `certs/*.p12`
- `certs/*.json`
