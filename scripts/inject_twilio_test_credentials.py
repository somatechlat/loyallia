#!/usr/bin/env python3
"""
Inject Twilio test credentials into HashiCorp Vault.

Usage:
    export VAULT_TOKEN=<your_vault_token>
    python3 inject_twilio_test_credentials.py \
        --account-sid ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
        --auth-token xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
        --from-number +15005550006

SECURITY: Pass credentials via command-line arguments or env vars.
NEVER hardcode credentials in this file.
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
    token = os.environ.get("VAULT_TOKEN")
    if token:
        return token
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


def main():
    parser = argparse.ArgumentParser(description="Inject Twilio test credentials into Vault")
    parser.add_argument("--account-sid", required=True, help="Twilio Test Account SID")
    parser.add_argument("--auth-token", required=True, help="Twilio Test Auth Token")
    parser.add_argument("--from-number", default="+15005550006", help="Twilio test sender number")
    args = parser.parse_args()

    token = get_vault_token()
    current = read_current_data(token)
    updates = {
        "twilio_test_account_sid": args.account_sid,
        "twilio_test_auth_token": args.auth_token,
        "twilio_from_number": args.from_number,
        "twilio_use_test_mode": "true",
    }

    print(f"Setting twilio_test_account_sid = {args.account_sid}")
    print(f"Setting twilio_from_number = {args.from_number}")
    print("Setting twilio_use_test_mode = true")

    merged = {**current, **updates}

    print(f"\nReady to update {len(updates)} key(s) in Vault.")
    confirm = input("Proceed? [y/N]: ").strip().lower()
    if confirm not in ("y", "yes"):
        print("Aborted.")
        sys.exit(0)

    write_data(token, merged)
    print("\nDone! SMS tests will now use real Twilio test credentials from Vault.")


if __name__ == "__main__":
    main()
