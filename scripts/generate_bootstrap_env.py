#!/usr/bin/env python3
"""
Generate .bootstrap_secrets.env from certs/integration_credentials.json
Run this after updating integration_credentials.json to regenerate the bootstrap file.
"""
import json
import base64
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
CREDS_FILE = PROJECT_ROOT / "certs" / "integration_credentials.json"
ENV_FILE = PROJECT_ROOT / ".bootstrap_secrets.env"


def load_json_file(path: Path) -> dict:
    with open(path) as f:
        return json.load(f)


def read_file_b64(path: Path) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("ascii")


def main():
    if not CREDS_FILE.exists():
        print(f"ERROR: {CREDS_FILE} not found")
        exit(1)

    creds = load_json_file(CREDS_FILE)
    secrets: dict[str, str] = {}

    # System mode (development by default)
    secrets["system_mode"] = creds.get("system_mode", "development")

    # Core infra (read from existing .env if present, else keep existing)
    if ENV_FILE.exists():
        with open(ENV_FILE) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                # Keep core secrets that aren't integration-related
                if k in {
                    "secret_key", "postgres_password", "redis_url",
                    "celery_broker_url", "celery_result_backend",
                    "minio_access_key", "minio_secret_key",
                    "jwt_secret_key", "pass_hmac_secret",
                    "flower_basic_auth", "whatsapp_bridge_api_key",
                    "grafana_admin_password",
                }:
                    secrets[k] = v

    # Google Wallet
    gw = creds.get("google_wallet", {})
    secrets["google_wallet_enabled"] = "true" if gw.get("enabled") else "false"
    secrets["google_wallet_issuer_id"] = gw.get("issuer_id", "")
    sa_file = PROJECT_ROOT / gw.get("service_account_json_file", "")
    if sa_file.exists():
        secrets["google_service_account_json_b64"] = read_file_b64(sa_file)

    # Google OAuth
    go = creds.get("google_oauth", {})
    secrets["google_oauth_client_id"] = go.get("client_id", "")
    secrets["google_oauth_client_secret"] = go.get("client_secret", "")

    # Twilio
    tw = creds.get("twilio", {})
    secrets["twilio_account_sid"] = tw.get("live_account_sid", "")
    secrets["twilio_auth_token"] = tw.get("live_auth_token", "")
    secrets["twilio_test_account_sid"] = tw.get("test_account_sid", "")
    secrets["twilio_test_auth_token"] = tw.get("test_auth_token", "")
    secrets["twilio_use_test_mode"] = "true" if tw.get("use_test_mode", True) else "false"

    # Mailjet
    mj = creds.get("mailjet", {})
    secrets["mailjet_api_key"] = mj.get("api_key", "")
    secrets["mailjet_secret_key"] = mj.get("secret_key", "")
    secrets["mailjet_sender_email"] = mj.get("sender_email", "")
    secrets["mailjet_sender_name"] = mj.get("sender_name", "")

    # Apple Wallet
    aw = creds.get("apple_wallet", {})
    secrets["apple_wallet_enabled"] = "true" if aw.get("enabled") else "false"
    secrets["apple_pass_type_identifier"] = aw.get("pass_type_identifier", "")
    secrets["apple_team_identifier"] = aw.get("team_identifier", "")

    for file_key, env_key in [
        ("cert_pem_file", "apple_cert_pem_b64"),
        ("key_pem_file", "apple_cert_key_pem_b64"),
        ("wwdr_pem_file", "apple_wwdr_cert_pem_b64"),
    ]:
        fpath = PROJECT_ROOT / aw.get(file_key, "")
        if fpath.exists():
            secrets[env_key] = read_file_b64(fpath)

    # Payment gateway defaults
    secrets["payment_gateway_enabled"] = "false"
    secrets["payment_gateway_provider"] = "manual"

    # Backup defaults
    secrets["backup_frequency"] = "15days"
    secrets["backup_retention"] = "31"
    secrets["cron_hour"] = "3"

    # Write output
    lines = [
        "# Loyallia Bootstrap Secrets",
        "# Generated from certs/integration_credentials.json via scripts/generate_bootstrap_env.py",
        "# NEVER commit this file to git",
        "",
    ]
    for key in sorted(secrets.keys()):
        val = secrets[key]
        if val:
            lines.append(f"{key}={val}")

    with open(ENV_FILE, "w") as f:
        f.write("\n".join(lines) + "\n")

    print(f"Written {ENV_FILE} with {len([k for k in secrets if secrets[k]])} secrets")


if __name__ == "__main__":
    main()
