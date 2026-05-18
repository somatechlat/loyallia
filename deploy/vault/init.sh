#!/bin/sh
set -eu

wait_for_vault() {
    i=0
    until wget --spider --quiet "$VAULT_ADDR/v1/sys/seal-status"; do
        i=$((i + 1))
        [ "$i" -lt 60 ] || {
            echo "vault-init timeout waiting for vault api"
            exit 1
        }
        sleep 1
    done
}

existing_field() {
    vault kv get -mount=secret -field="$1" "$VAULT_APP_SECRET_PATH" 2>/dev/null || true
}

env_or_existing() {
    key="$1"
    value="$2"
    if [ -n "$value" ]; then
        printf "%s" "$value"
        return
    fi
    existing_field "$key"
}

require_secret() {
    key="$1"
    value="$2"
    if [ -z "$value" ]; then
        echo "missing required Vault bootstrap value for $key"
        exit 1
    fi
}

generate_basic_auth() {
    printf "loyallia:%s" "$(tr -dc A-Za-z0-9 </dev/urandom | head -c 32)"
}

generate_secret() {
    tr -dc A-Za-z0-9 </dev/urandom | head -c 40
}

set_secret() {
    key="$1"
    value="$2"
    [ -n "$value" ] || return 0
    # Use stdin (=-) to avoid Vault CLI interpreting @ as file prefix
    printf '%s' "$value" | vault kv patch -mount=secret "$VAULT_APP_SECRET_PATH" "$key=-" >/dev/null 2>&1 || \
        printf '%s' "$value" | vault kv put -mount=secret "$VAULT_APP_SECRET_PATH" "$key=-" >/dev/null
}

set_secret_from_env() {
    key="$1"
    value="$2"
    [ -n "$value" ] || return 0
    set_secret "$key" "$value"
}

set_secret_default_if_missing() {
    key="$1"
    default_value="$2"
    [ -n "$(existing_field "$key")" ] && return 0
    set_secret "$key" "$default_value"
}

# JSON bootstrap file reader
BOOTSTRAP_FILE="${BOOTSTRAP_SECRETS_FILE:-/vault/bootstrap/secrets.json}"

# Install python3 if missing (Alpine-based vault image)
if ! command -v python3 &>/dev/null; then
    echo "Installing python3 for JSON parsing..."
    apk add --no-cache python3 >/dev/null 2>&1 || {
        echo "ERROR: Cannot install python3. Bootstrap secrets JSON requires Python."
        exit 1
    }
fi

json_get() {
    key="$1"
    if [ -f "$BOOTSTRAP_FILE" ]; then
        python3 -c "
import json, sys
try:
    with open('$BOOTSTRAP_FILE') as f:
        data = json.load(f)
    value = data.get('secrets', {}).get('$key', '')
    print(value, end='')
except Exception:
    pass
" 2>/dev/null
    fi
}

wait_for_vault

# Generate self-signed TLS certificate if none exists
if [ ! -f /vault/certs/vault.crt ]; then
    mkdir -p /vault/certs
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /vault/certs/vault.key \
        -out /vault/certs/vault.crt \
        -subj "/CN=vault" 2>/dev/null || true
fi

# Support rescue injection: copy VAULT_RESCUE_INIT_JSON into place if provided
if [ -n "${VAULT_RESCUE_INIT_JSON:-}" ] && [ -f "$VAULT_RESCUE_INIT_JSON" ]; then
    cp "$VAULT_RESCUE_INIT_JSON" /vault/file/init.json
    echo "Injected rescue init.json from $VAULT_RESCUE_INIT_JSON"
fi

# Determine if Vault is already initialized
VAULT_INIT_STATUS="$(vault status -format=json 2>/dev/null || true)"
VAULT_ALREADY_INIT="$(printf "%s" "$VAULT_INIT_STATUS" | grep -c '"initialized":[ ]*true' || true)"

if [ "$VAULT_ALREADY_INIT" -gt 0 ]; then
    echo "Vault already initialized."
    UNSEAL_KEY=""
    ROOT_TOKEN=""

    # Decrypt init.json.gpg if present (GPG-encrypted unseal keys)
    if [ -f /vault/file/init.json.gpg ]; then
        if command -v gpg &>/dev/null && [ -n "${VAULT_INIT_PASSPHRASE:-}" ]; then
            gpg --batch --yes --passphrase "$VAULT_INIT_PASSPHRASE" \
                --decrypt --output /vault/file/init.json /vault/file/init.json.gpg 2>/dev/null || true
        fi
    fi

    if [ -s /vault/file/init.json ]; then
        if command -v jq &>/dev/null; then
            UNSEAL_KEY="$(jq -r '.unseal_keys_b64[0]' /vault/file/init.json)"
        else
            UNSEAL_KEY="$(python3 -c "import json; print(json.load(open('/vault/file/init.json'))['unseal_keys_b64'][0])" 2>/dev/null || true)"
        fi
        ROOT_TOKEN="$(awk -F '"' '/root_token/ {print $4}' /vault/file/init.json)"
    fi

    if [ -z "$ROOT_TOKEN" ] && [ -f /vault/runtime/app-token ]; then
        ROOT_TOKEN="$(cat /vault/runtime/app-token 2>/dev/null || true)"
        echo "Using runtime app-token as VAULT_TOKEN (init.json was empty)."
    fi

    if [ -z "$ROOT_TOKEN" ] && [ -f /vault/runtime/app-token ]; then
        APP_TOKEN="$(cat /vault/runtime/app-token 2>/dev/null || true)"
        if [ -n "$APP_TOKEN" ]; then
            ROOT_TOKEN="$(VAULT_TOKEN="$APP_TOKEN" vault token create -policy=loyallia-app -field=token 2>/dev/null || true)"
            [ -n "$ROOT_TOKEN" ] && echo "Generated new app token as fallback."
        fi
    fi

    [ -n "$ROOT_TOKEN" ] || {
        echo "CRITICAL: Cannot obtain any Vault token. Vault is initialized but unreachable."
        exit 1
    }

    export VAULT_TOKEN="$ROOT_TOKEN"

    VAULT_SEALED="$(printf "%s" "$VAULT_INIT_STATUS" | grep -c '"sealed":[ ]*true' || true)"
    if [ "$VAULT_SEALED" -gt 0 ]; then
        if [ -n "$UNSEAL_KEY" ]; then
            vault operator unseal "$UNSEAL_KEY" >/dev/null 2>&1 || true
        else
            echo "WARNING: Vault sealed but no unseal key available. Cannot auto-unseal."
        fi
    fi
else
    echo "Vault not initialized. Performing first-time initialization..."
    vault operator init -key-shares=5 -key-threshold=3 -format=json >/vault/file/init.json
    # Extract unseal keys using jq or python3 (handles JSON array properly)
    if command -v jq &>/dev/null; then
        UNSEAL_KEY="$(jq -r '.unseal_keys_b64[0]' /vault/file/init.json)"
    else
        UNSEAL_KEY="$(python3 -c "import json; print(json.load(open('/vault/file/init.json'))['unseal_keys_b64'][0])")"
    fi
    ROOT_TOKEN="$(awk -F '"' '/root_token/ {print $4}' /vault/file/init.json)"

    # Encrypt init.json to protect unseal keys at rest
    if command -v gpg &>/dev/null; then
        gpg --batch --yes --passphrase "${VAULT_INIT_PASSPHRASE:-$(openssl rand -base64 32)}" \
            --symmetric --cipher-algo AES256 --output /vault/file/init.json.gpg /vault/file/init.json
        rm -f /vault/file/init.json
        echo "Unseal keys encrypted with AES256-GPG. Passphrase stored in Vault env only."
    fi

    [ -n "$UNSEAL_KEY" ] || { echo "missing unseal key"; exit 1; }
    [ -n "$ROOT_TOKEN" ] || { echo "missing root token"; exit 1; }

    vault operator unseal "$UNSEAL_KEY" >/dev/null 2>&1 || true
    export VAULT_TOKEN="$ROOT_TOKEN"

    vault secrets enable -path=secret kv-v2 >/dev/null 2>&1 || true
fi

# Read secrets from JSON bootstrap file
# Priority: JSON file values first, then existing Vault values (idempotency)

secret_key="$(env_or_existing secret_key "$(json_get secret_key)")"
postgres_password="$(env_or_existing postgres_password "$(json_get postgres_password)")"
redis_url="$(env_or_existing redis_url "$(json_get redis_url)")"
celery_broker_url="$(env_or_existing celery_broker_url "$(json_get celery_broker_url)")"
celery_result_backend="$(env_or_existing celery_result_backend "$(json_get celery_result_backend)")"
minio_access_key="$(env_or_existing minio_access_key "$(json_get minio_access_key)")"
minio_secret_key="$(env_or_existing minio_secret_key "$(json_get minio_secret_key)")"
jwt_secret_key="$(env_or_existing jwt_secret_key "$(json_get jwt_secret_key)")"
pass_hmac_secret="$(env_or_existing pass_hmac_secret "$(json_get pass_hmac_secret)")"
flower_basic_auth="$(env_or_existing flower_basic_auth "$(json_get flower_basic_auth)")"
whatsapp_bridge_api_key="$(env_or_existing whatsapp_bridge_api_key "$(json_get whatsapp_bridge_api_key)")"
grafana_admin_password="$(env_or_existing grafana_admin_password "$(json_get grafana_admin_password)")"

[ -n "$flower_basic_auth" ] || flower_basic_auth="$(generate_basic_auth)"
[ -n "$whatsapp_bridge_api_key" ] || whatsapp_bridge_api_key="$(generate_secret)"
[ -n "$grafana_admin_password" ] || grafana_admin_password="$(generate_secret)"

require_secret secret_key "$secret_key"
require_secret postgres_password "$postgres_password"
require_secret redis_url "$redis_url"
require_secret celery_broker_url "$celery_broker_url"
require_secret celery_result_backend "$celery_result_backend"
require_secret minio_access_key "$minio_access_key"
require_secret minio_secret_key "$minio_secret_key"
require_secret jwt_secret_key "$jwt_secret_key"
require_secret pass_hmac_secret "$pass_hmac_secret"

# Write core secrets to Vault
set_secret secret_key "$secret_key"
set_secret postgres_password "$postgres_password"
set_secret redis_url "$redis_url"
set_secret celery_broker_url "$celery_broker_url"
set_secret celery_result_backend "$celery_result_backend"
set_secret minio_access_key "$minio_access_key"
set_secret minio_secret_key "$minio_secret_key"
set_secret jwt_secret_key "$jwt_secret_key"
set_secret pass_hmac_secret "$pass_hmac_secret"
set_secret flower_basic_auth "$flower_basic_auth"
set_secret whatsapp_bridge_api_key "$whatsapp_bridge_api_key"
set_secret grafana_admin_password "$grafana_admin_password"

# Write certificates from JSON to Vault
set_secret_from_env apple_cert_pem "$(json_get apple_cert_pem)"
set_secret_from_env apple_cert_key_pem "$(json_get apple_cert_key_pem)"
set_secret_from_env apple_wwdr_cert_pem "$(json_get apple_wwdr_cert_pem)"
set_secret_from_env google_service_account_json "$(json_get google_service_account_json)"
set_secret_from_env google_oauth_client_id "$(json_get google_oauth_client_id)"
set_secret_from_env google_oauth_client_secret "$(json_get google_oauth_client_secret)"

# Auto-enable wallet features if certificates present
# Priority: explicit JSON value first, then auto-detect from certs
apple_wallet_enabled_json="$(json_get apple_wallet_enabled)"
if [ -n "$apple_wallet_enabled_json" ]; then
    set_secret apple_wallet_enabled "$apple_wallet_enabled_json"
elif [ -n "$(json_get apple_cert_pem)" ] && [ -n "$(json_get apple_cert_key_pem)" ]; then
    set_secret_default_if_missing apple_wallet_enabled "true"
    echo "Apple Wallet: certificates detected — auto-enabled"
else
    set_secret_default_if_missing apple_wallet_enabled "false"
fi

google_wallet_enabled_json="$(json_get google_wallet_enabled)"
if [ -n "$google_wallet_enabled_json" ]; then
    set_secret google_wallet_enabled "$google_wallet_enabled_json"
elif [ -n "$(json_get google_service_account_json)" ]; then
    set_secret_default_if_missing google_wallet_enabled "true"
    echo "Google Wallet: service account detected — auto-enabled"
else
    set_secret_default_if_missing google_wallet_enabled "false"
fi

# Wallet identifiers (placeholders if not configured)
set_secret_from_env google_wallet_issuer_id "$(json_get google_wallet_issuer_id)"
set_secret_from_env apple_pass_type_identifier "$(json_get apple_pass_type_identifier)"
set_secret_from_env apple_team_identifier "$(json_get apple_team_identifier)"

# Payment Gateway
set_secret_from_env payment_gateway_login "$(json_get payment_gateway_login)"
set_secret_from_env payment_gateway_tran_key "$(json_get payment_gateway_tran_key)"
set_secret_from_env payment_gateway_webhook_secret "$(json_get payment_gateway_webhook_secret)"

# Email / Mailjet
set_secret_from_env mailjet_api_key "$(json_get mailjet_api_key)"
set_secret_from_env mailjet_secret_key "$(json_get mailjet_secret_key)"
set_secret_from_env mailjet_sender_email "$(json_get mailjet_sender_email)"
set_secret_from_env mailjet_sender_name "$(json_get mailjet_sender_name)"

# WhatsApp Bridge
set_secret_from_env whatsapp_bridge_url "$(json_get whatsapp_bridge_url)"
set_secret whatsapp_bridge_api_key "$whatsapp_bridge_api_key"

# Twilio (SMS + Verify)
set_secret_from_env twilio_account_sid "$(json_get twilio_account_sid)"
set_secret_from_env twilio_auth_token "$(json_get twilio_auth_token)"
set_secret_from_env twilio_from_number "$(json_get twilio_from_number)"
set_secret_from_env twilio_verify_enabled "$(json_get twilio_verify_enabled)"
set_secret_from_env twilio_verify_service_sid "$(json_get twilio_verify_service_sid)"
set_secret_from_env twilio_verify_default_channel "$(json_get twilio_verify_default_channel)"
set_secret_from_env twilio_api_key_sid "$(json_get twilio_api_key_sid)"
set_secret_from_env twilio_api_key_secret "$(json_get twilio_api_key_secret)"
set_secret_from_env twilio_test_account_sid "$(json_get twilio_test_account_sid)"
set_secret_from_env twilio_test_auth_token "$(json_get twilio_test_auth_token)"
set_secret_from_env twilio_use_test_mode "$(json_get twilio_use_test_mode)"

# Apple NFC
set_secret_from_env apple_nfc_enabled "$(json_get apple_nfc_enabled)"
set_secret_from_env apple_nfc_encryption_public_key "$(json_get apple_nfc_encryption_public_key)"

# AI Agent
set_secret_from_env ai_agent_base_url "$(json_get ai_agent_base_url)"
set_secret_from_env ai_agent_api_key "$(json_get ai_agent_api_key)"

# System / Backup
set_secret_from_env system_mode "$(json_get system_mode)"
set_secret_from_env backup_frequency "$(json_get backup_frequency)"
set_secret_from_env backup_retention "$(json_get backup_retention)"
set_secret_from_env cron_hour "$(json_get cron_hour)"

# Age encryption
set_secret_from_env age_public_key "$(json_get age_public_key)"

# Defaults for feature toggles (only on first write)
set_secret_default_if_missing google_wallet_enabled "true"
set_secret_default_if_missing apple_wallet_enabled "false"
set_secret_default_if_missing payment_gateway_enabled "false"
set_secret_default_if_missing payment_gateway_provider "manual"
set_secret_default_if_missing apple_nfc_enabled "false"
set_secret_default_if_missing twilio_verify_enabled "false"
set_secret_default_if_missing twilio_use_test_mode "false"
set_secret_default_if_missing system_mode "development"
set_secret_default_if_missing backup_frequency "15days"
set_secret_default_if_missing backup_retention "31"
set_secret_default_if_missing cron_hour "5"

# Export infrastructure secrets to runtime files
mkdir -p /vault/runtime
printf "%s" "$postgres_password" >/vault/runtime/postgres_password
printf "%s" "$redis_url" | sed -n 's|redis://:\([^@]*\)@.*|\1|p' >/vault/runtime/redis_password
printf "%s" "$minio_access_key" >/vault/runtime/minio_root_user
printf "%s" "$minio_secret_key" >/vault/runtime/minio_root_password
printf "%s" "$whatsapp_bridge_api_key" >/vault/runtime/whatsapp_bridge_api_key
printf "%s" "$grafana_admin_password" >/vault/runtime/grafana_admin_password
chmod 0600 /vault/runtime/postgres_password /vault/runtime/redis_password \
    /vault/runtime/minio_root_user /vault/runtime/minio_root_password \
    /vault/runtime/whatsapp_bridge_api_key /vault/runtime/grafana_admin_password

# Create or refresh loyallia-app policy and token
mkdir -p /vault/policies
# Copy bundled policy file to runtime location (idempotent)
if [ -f /vault/policies/app-policy.hcl ]; then
    cp /vault/policies/app-policy.hcl /vault/runtime/loyallia-app.hcl
else
    printf '%b' "path \"secret/data/loyallia/*\" {\n  capabilities = [\"read\", \"create\", \"update\", \"patch\"]\n}\n" >/vault/runtime/loyallia-app.hcl
fi
vault policy write loyallia-app /vault/runtime/loyallia-app.hcl >/dev/null 2>&1 || echo "Policy write skipped (non-root token — policy already exists)"
# Save root token for revocation after app token creation
root_token="${ROOT_TOKEN:-}"
if ! [ -f /vault/runtime/app-token ] || ! [ -s /vault/runtime/app-token ]; then
    vault token create -policy=loyallia-app -field=token >/vault/runtime/app-token 2>/dev/null || true
    chmod 0600 /vault/runtime/app-token 2>/dev/null || true

    # Revoke root token after successful app token creation
    if [ -s /vault/runtime/app-token ] && [ -n "$root_token" ]; then
        echo "INFO: Revoking root token..."
        vault token revoke "$root_token" >/dev/null 2>&1 || echo "WARN: Failed to revoke root token"
    fi
fi

echo "Vault initialized, unsealed, and secrets seeded successfully"
exit 0
