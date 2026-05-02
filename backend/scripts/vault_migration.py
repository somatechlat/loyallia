"""
Loyallia — Vault Migration Utility
Captures secrets from purged .env files and migrates them to Vault.
"""

import os
import sys

import requests

# Vault Configuration
VAULT_ADDR = os.environ.get("VAULT_ADDR", "http://localhost:8200")
VAULT_TOKEN = os.environ.get("VAULT_TOKEN", "loyallia-vault-root-token")
VAULT_PATH = "secret/data/loyallia/production"

# Data captured from purged files (last known good state)
SECRETS = {
    "secret_key": "YOUR_DJANGO_SECRET_KEY",
    "postgres_password": "YOUR_POSTGRES_PASSWORD",
    "minio_secret_key": "YOUR_MINIO_SECRET_KEY",
    "jwt_secret_key": "YOUR_JWT_SECRET_KEY",
    "google_oauth_client_id": "YOUR_GOOGLE_CLIENT_ID",
    "google_oauth_client_secret": "YOUR_GOOGLE_CLIENT_SECRET",
    "pass_hmac_secret": "YOUR_PASS_HMAC_SECRET",
    "flower_basic_auth": "admin:YOUR_FLOWER_PASSWORD",
}


def migrate():
    print(f"🚀 Starting migration to {VAULT_ADDR}...")

    # Check health
    try:
        requests.get(f"{VAULT_ADDR}/v1/sys/health", timeout=2)
    except Exception:
        print(f"❌ Error: Could not connect to Vault at {VAULT_ADDR}.")
        print("Please ensure your Vault container is running.")
        sys.exit(1)

    payload = {"data": SECRETS}

    url = f"{VAULT_ADDR}/v1/{VAULT_PATH}"
    headers = {"X-Vault-Token": VAULT_TOKEN}

    try:
        resp = requests.post(url, headers=headers, json=payload)
        if resp.status_code in (200, 204):
            print("✅ SUCCESS: All secrets migrated to Vault.")
            print(f"Path: {VAULT_PATH}")
        else:
            print(f"❌ ERROR: Vault returned {resp.status_code}")
            print(resp.text)
    except Exception as exc:
        print(f"❌ ERROR: {exc}")


if __name__ == "__main__":
    migrate()
