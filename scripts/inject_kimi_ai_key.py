#!/usr/bin/env python3
"""
Inject Kimi AI API Key into HashiCorp Vault for Wallet Pass Studio.

Usage:
    # From environment variable
    export KIMI_API_KEY="sk-..."
    python3 inject_kimi_ai_key.py

    # From command line (not recommended — use env var instead)
    python3 inject_kimi_ai_key.py --kimi-api-key "sk-..."

    # Verify injection
    python3 inject_kimi_ai_key.py --verify

The key is stored at Vault path: loyallia/production/kimi_api_key
"""

import argparse
import json
import os
import ssl
import sys
import urllib.request
import urllib.error

# Create SSL context that doesn't verify self-signed certs (dev Vault)
SSL_CONTEXT = ssl.create_default_context()
SSL_CONTEXT.check_hostname = False
SSL_CONTEXT.verify_mode = ssl.CERT_NONE

VAULT_ADDR = os.environ.get("VAULT_ADDR", "http://localhost:33908")
VAULT_SECRET_PATH = os.environ.get("VAULT_SECRET_PATH", "secret/data/loyallia/production")


def get_vault_token() -> str:
    """Get Vault token from environment or init file."""
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
    """Read current Vault data."""
    url = f"{VAULT_ADDR}/v1/{VAULT_SECRET_PATH}"
    req = urllib.request.Request(url, headers={"X-Vault-Token": token})
    try:
        with urllib.request.urlopen(req, context=SSL_CONTEXT) as resp:
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
        with urllib.request.urlopen(req, context=SSL_CONTEXT) as resp:
            result = json.loads(resp.read().decode())
            print(f"Vault updated successfully. Version: {result['data']['version']}")
    except urllib.error.HTTPError as e:
        print(f"ERROR: Failed to write Vault: {e.read().decode()}", file=sys.stderr)
        sys.exit(1)


def verify_key(token: str) -> None:
    """Verify the Kimi API key is stored in Vault."""
    current = read_current_data(token)
    if "kimi_api_key" in current:
        key = current["kimi_api_key"]
        masked = key[:8] + "..." + key[-4:]
        print(f"✅ Kimi API key found in Vault: {masked}")
        print(f"   AI_AGENT_BASE_URL: {current.get('ai_agent_base_url', 'NOT SET')}")
        print(f"   AI_AGENT_API_KEY:  {'SET' if current.get('ai_agent_api_key') else 'NOT SET'}")
    else:
        print("❌ Kimi API key NOT found in Vault.")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Inject Kimi AI API Key into Vault")
    parser.add_argument("--kimi-api-key", help="Kimi API Key (use env var KIMI_API_KEY instead)")
    parser.add_argument("--kimi-base-url", default="https://api.moonshot.cn/v1", help="Kimi API base URL")
    parser.add_argument("--verify", action="store_true", help="Verify key is stored in Vault")
    parser.add_argument("--force", action="store_true", help="Skip confirmation prompt")
    args = parser.parse_args()

    token = get_vault_token()

    if args.verify:
        verify_key(token)
        return

    # Get API key from environment (preferred) or command line
    api_key = os.environ.get("KIMI_API_KEY") or args.kimi_api_key
    if not api_key:
        print("ERROR: No API key provided.", file=sys.stderr)
        print("Set KIMI_API_KEY environment variable or use --kimi-api-key", file=sys.stderr)
        sys.exit(1)

    if not api_key.startswith("sk-"):
        print("WARNING: API key does not start with 'sk-' — may be invalid.", file=sys.stderr)

    current = read_current_data(token)
    updates = {
        "kimi_api_key": api_key,
        "ai_agent_base_url": args.kimi_base_url,
        "ai_agent_api_key": api_key,  # Alias for generic AI agent integration
    }

    # Merge with current data
    merged = {**current, **updates}

    # Confirm before writing
    masked = api_key[:8] + "..." + api_key[-4:]
    print(f"\nReady to inject Kimi API key: {masked}")
    print(f"Base URL: {args.kimi_base_url}")
    print(f"Vault path: {VAULT_SECRET_PATH}")
    if not args.force:
        confirm = input("Proceed? [y/N]: ").strip().lower()
        if confirm not in ("y", "yes"):
            print("Aborted.")
            sys.exit(0)

    write_data(token, merged)
    print("\n✅ Done! Kimi API key stored securely in Vault.")
    print("   Backend can now access it via Vault KV at 'kimi_api_key'")
    print("   Frontend AI assistant can call backend /api/wallet/ai/* endpoints")


if __name__ == "__main__":
    main()
