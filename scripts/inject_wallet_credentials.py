#!/usr/bin/env python3
"""
Inject Google Wallet and Apple Wallet credentials into HashiCorp Vault.

Usage:
    # Google Wallet only
    python3 inject_wallet_credentials.py \
        --google-issuer-id "<vault:google_wallet_issuer_id>" \
        --google-sa-json ./google-service-account.json

    # Apple Wallet only
    python3 inject_wallet_credentials.py \
        --apple-pass-id "<vault:apple_pass_type_identifier>" \
        --apple-team-id "<vault:apple_team_identifier>" \
        --apple-cert ./apple_cert.pem \
        --apple-key ./apple_cert_key.pem \
        --apple-wwdr ./apple_wwdr.pem

    # Both
    python3 inject_wallet_credentials.py \
        --google-issuer-id "<vault:google_wallet_issuer_id>" \
        --google-sa-json ./google-service-account.json \
        --apple-pass-id "<vault:apple_pass_type_identifier>" \
        --apple-team-id "<vault:apple_team_identifier>" \
        --apple-cert ./apple_cert.pem \
        --apple-key ./apple_cert_key.pem \
        --apple-wwdr ./apple_wwdr.pem
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error

VAULT_ADDR = os.environ.get("VAULT_ADDR", "http://localhost:33908")
VAULT_SECRET_PATH = os.environ.get("VAULT_SECRET_PATH", "secret/data/loyallia/production")


def get_vault_token() -> str:
    """Get Vault token from environment or init file."""
    token = os.environ.get("VAULT_TOKEN")
    if token:
        return token

    # Try to read from container init file
    import subprocess
    try:
        result = subprocess.run(
            ["docker", "exec", "loyallia-vault", "cat", "/vault/file/init.json"],
            capture_output=True, text=True, check=True
        )
        data = json.loads(result.stdout)
        return data["root_token"]
    except Exception as e:
        print(f"ERROR: Could not get Vault token: {e}", file=sys.stderr)
        print("Please set VAULT_TOKEN environment variable.", file=sys.stderr)
        sys.exit(1)


def read_current_data(token: str) -> dict:
    """Read current Vault data."""
    url = f"{VAULT_ADDR}/v1/{VAULT_SECRET_PATH}"
    req = urllib.request.Request(url, headers={"X-Vault-Token": token})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            return data.get("data", {}).get("data", {})
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return {}
        print(f"ERROR: Failed to read Vault: {e.read().decode()}", file=sys.stderr)
        sys.exit(1)


def write_data(token: str, data: dict) -> None:
    """Write merged data back to Vault."""
    url = f"{VAULT_ADDR}/v1/{VAULT_SECRET_PATH}"
    payload = json.dumps({"data": data}).encode()
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "X-Vault-Token": token,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read().decode())
            print(f"Vault updated successfully. Version: {result['data']['version']}")
    except urllib.error.HTTPError as e:
        print(f"ERROR: Failed to write Vault: {e.read().decode()}", file=sys.stderr)
        sys.exit(1)


def validate_google_sa_json(content: str) -> None:
    """Validate Google service account JSON."""
    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON in service account file: {e}", file=sys.stderr)
        sys.exit(1)

    required = ["client_email", "private_key", "token_uri"]
    missing = [f for f in required if f not in data]
    if missing:
        print(f"ERROR: Service account JSON missing fields: {missing}", file=sys.stderr)
        sys.exit(1)

    print("Google service account JSON validated.")


def validate_apple_cert(path: str, label: str) -> str:
    """Validate and read Apple certificate PEM file."""
    if not os.path.exists(path):
        print(f"ERROR: {label} file not found: {path}", file=sys.stderr)
        sys.exit(1)

    with open(path, "r") as f:
        content = f.read().strip()

    if not content.startswith("-----BEGIN"):
        print(f"ERROR: {label} does not appear to be a valid PEM file", file=sys.stderr)
        sys.exit(1)

    print(f"{label} validated.")
    return content


def main():
    parser = argparse.ArgumentParser(description="Inject wallet credentials into Vault")

    # Google Wallet
    parser.add_argument("--google-issuer-id", help="Google Wallet Issuer ID")
    parser.add_argument("--google-sa-json", help="Path to Google service account JSON file")

    # Apple Wallet
    parser.add_argument("--apple-pass-id", help="Apple Pass Type Identifier (e.g., pass.com.company.loyallia)")
    parser.add_argument("--apple-team-id", help="Apple Team ID (10 characters)")
    parser.add_argument("--apple-cert", help="Path to Apple certificate PEM file")
    parser.add_argument("--apple-key", help="Path to Apple private key PEM file")
    parser.add_argument("--apple-wwdr", help="Path to Apple WWDR certificate PEM file")

    args = parser.parse_args()

    if not any([
        args.google_issuer_id, args.google_sa_json,
        args.apple_pass_id, args.apple_team_id, args.apple_cert, args.apple_key, args.apple_wwdr
    ]):
        parser.print_help()
        sys.exit(1)

    token = get_vault_token()
    current = read_current_data(token)
    updates = {}

    # --- Google Wallet ---
    if args.google_issuer_id:
        updates["google_wallet_issuer_id"] = args.google_issuer_id
        print(f"Setting google_wallet_issuer_id = {args.google_issuer_id}")

    if args.google_sa_json:
        if not os.path.exists(args.google_sa_json):
            print(f"ERROR: File not found: {args.google_sa_json}", file=sys.stderr)
            sys.exit(1)
        with open(args.google_sa_json, "r") as f:
            sa_content = f.read().strip()
        validate_google_sa_json(sa_content)
        updates["google_service_account_json"] = sa_content
        updates["google_wallet_enabled"] = "true"
        print("Setting google_service_account_json (and enabling Google Wallet)")

    # --- Apple Wallet ---
    if args.apple_pass_id:
        updates["apple_pass_type_identifier"] = args.apple_pass_id
        print(f"Setting apple_pass_type_identifier = {args.apple_pass_id}")

    if args.apple_team_id:
        updates["apple_team_identifier"] = args.apple_team_id
        print(f"Setting apple_team_identifier = {args.apple_team_id}")

    if args.apple_cert:
        updates["apple_cert_pem"] = validate_apple_cert(args.apple_cert, "Apple certificate")

    if args.apple_key:
        updates["apple_cert_key_pem"] = validate_apple_cert(args.apple_key, "Apple private key")

    if args.apple_wwdr:
        updates["apple_wwdr_cert_pem"] = validate_apple_cert(args.apple_wwdr, "Apple WWDR certificate")

    # Enable Apple Wallet if all required fields are present
    apple_fields = ["apple_pass_type_identifier", "apple_team_identifier", "apple_cert_pem",
                    "apple_cert_key_pem", "apple_wwdr_cert_pem"]
    if all(f in updates for f in apple_fields):
        updates["apple_wallet_enabled"] = "true"
        print("All Apple Wallet fields present — enabling Apple Wallet")
    elif any(f in updates for f in apple_fields):
        print("WARNING: Not all Apple Wallet fields provided — Apple Wallet will remain disabled")

    # Merge with current data
    merged = {**current, **updates}

    # Confirm before writing
    print(f"\nReady to update {len(updates)} key(s) in Vault.")
    confirm = input("Proceed? [y/N]: ").strip().lower()
    if confirm not in ("y", "yes"):
        print("Aborted.")
        sys.exit(0)

    write_data(token, merged)

    print("\nDone! Verify in SuperAdmin UI: http://localhost/superadmin/settings")


if __name__ == "__main__":
    main()
