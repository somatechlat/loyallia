"""
Loyallia -- Vault Import Utility.

Imports operator-provided secrets into HashiCorp Vault KV v2. This script never
contains default tokens, placeholder secret payloads, or plaintext templates.

Usage:
    VAULT_ADDR=http://vault:8200 VAULT_TOKEN=<operator-token> \
        python scripts/vault_migration.py --input /secure/path/secrets.json

The input JSON must be:
    {"data": {"secret_key": "...", "postgres_password": "..."}}
or:
    {"secret_key": "...", "postgres_password": "..."}
"""

import argparse
import json
import os
from pathlib import Path
from typing import Any

import requests

DEFAULT_VAULT_PATH = "secret/data/loyallia/production"

def _load_secret_payload(path: Path) -> dict[str, str]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise SystemExit(f"Input file not found: {path}") from None
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON input: {exc}") from None

    data: Any = raw.get("data", raw) if isinstance(raw, dict) else None
    if not isinstance(data, dict) or not data:
        raise SystemExit("Input JSON must contain a non-empty object of Vault keys.")

    payload: dict[str, str] = {}
    for key, value in data.items():
        if not isinstance(key, str) or not key.strip():
            raise SystemExit("All Vault keys must be non-empty strings.")
        if not isinstance(value, str) or not value:
            raise SystemExit(f"Vault key '{key}' has an empty or non-string value.")
        payload[key] = value
    return payload

def _require_env(name: str) -> str:
    value = os.environ.get(name, "")
    if not value:
        raise SystemExit(f"{name} is required and must be provided by the operator.")
    return value

def migrate() -> None:
    parser = argparse.ArgumentParser(description="Import operator-provided secrets into Vault KV v2.")
    parser.add_argument(
        "--input",
        required=True,
        help="Path to a local JSON file outside version control.",
    )
    parser.add_argument("--path", default=DEFAULT_VAULT_PATH, help="Vault KV v2 API path.")
    args = parser.parse_args()

    vault_addr = _require_env("VAULT_ADDR").rstrip("/")
    vault_token = _require_env("VAULT_TOKEN")
    payload = {"data": _load_secret_payload(Path(args.input))}

    try:
        health = requests.get(f"{vault_addr}/v1/sys/health", timeout=5)
        if health.status_code not in (200, 429, 472, 473, 501, 503):
            raise SystemExit(f"Vault health check returned HTTP {health.status_code}.")
    except requests.RequestException as exc:
        raise SystemExit(f"Could not connect to Vault at configured address: {exc}") from exc

    try:
        response = requests.post(
            f"{vault_addr}/v1/{args.path}",
            headers={"X-Vault-Token": vault_token},
            json=payload,
            timeout=10,
        )
    except requests.RequestException as exc:
        raise SystemExit(f"Vault import failed: {exc}") from exc

    if response.status_code not in (200, 204):
        raise SystemExit(f"Vault import failed with HTTP {response.status_code}.")

    print(f"Imported {len(payload['data'])} Vault keys into {args.path}. Values were not printed.")

if __name__ == "__main__":
    migrate()
