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

set_secret() {
    key="$1"
    value="$2"
    [ -n "$value" ] || return 0
    vault kv patch -mount=secret "$VAULT_APP_SECRET_PATH" "$key=$value" >/dev/null 2>&1 || \
        vault kv put -mount=secret "$VAULT_APP_SECRET_PATH" "$key=$value" >/dev/null
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

wait_for_vault

# Support rescue injection: copy VAULT_RESCUE_INIT_JSON into place if provided
if [ -n "${VAULT_RESCUE_INIT_JSON:-}" ] && [ -f "$VAULT_RESCUE_INIT_JSON" ]; then
    cp "$VAULT_RESCUE_INIT_JSON" /vault/file/init.json
    echo "Injected rescue init.json from $VAULT_RESCUE_INIT_JSON"
fi

# Determine if Vault is already initialized (API check — authoritative)
VAULT_INIT_STATUS="$(vault status -format=json 2>/dev/null || true)"
VAULT_ALREADY_INIT="$(printf "%s" "$VAULT_INIT_STATUS" | grep -c '"initialized":[ ]*true' || true)"

if [ "$VAULT_ALREADY_INIT" -gt 0 ]; then
    echo "Vault already initialized."
    UNSEAL_KEY=""
    ROOT_TOKEN=""

    # Extract keys from init.json if it exists and has content
    if [ -s /vault/file/init.json ]; then
        UNSEAL_KEY="$(awk -F '"' '/unseal_keys_b64/ {getline; print $2}' /vault/file/init.json)"
        ROOT_TOKEN="$(awk -F '"' '/root_token/ {print $4}' /vault/file/init.json)"
    fi

    # Fallback: use runtime app-token if init.json is missing or empty
    if [ -z "$ROOT_TOKEN" ] && [ -f /vault/runtime/app-token ]; then
        ROOT_TOKEN="$(cat /vault/runtime/app-token 2>/dev/null || true)"
        echo "Using runtime app-token as VAULT_TOKEN (init.json was empty)."
    fi

    # Last resort: generate a new token with the existing loyallia-app policy
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

    # Vault may be sealed after container restart — unseal if needed
    VAULT_SEALED="$(printf "%s" "$VAULT_INIT_STATUS" | grep -c '"sealed":[ ]*true' || true)"
    if [ "$VAULT_SEALED" -gt 0 ]; then
        if [ -n "$UNSEAL_KEY" ]; then
            vault operator unseal "$UNSEAL_KEY" >/dev/null 2>&1 || true
        else
            echo "WARNING: Vault sealed but no unseal key available. Cannot auto-unseal."
        fi
    fi
else
    # Fresh initialization — generate new keys
    echo "Vault not initialized. Performing first-time initialization..."
    vault operator init -key-shares=1 -key-threshold=1 -format=json >/vault/file/init.json
    UNSEAL_KEY="$(awk -F '"' '/unseal_keys_b64/ {getline; print $2}' /vault/file/init.json)"
    ROOT_TOKEN="$(awk -F '"' '/root_token/ {print $4}' /vault/file/init.json)"

    [ -n "$UNSEAL_KEY" ] || { echo "missing unseal key"; exit 1; }
    [ -n "$ROOT_TOKEN" ] || { echo "missing root token"; exit 1; }

    vault operator unseal "$UNSEAL_KEY" >/dev/null 2>&1 || true
    export VAULT_TOKEN="$ROOT_TOKEN"

    vault secrets enable -path=secret kv-v2 >/dev/null 2>&1 || true
fi

secret_key="$(env_or_existing secret_key "${_SECRET_KEY:-}")"
postgres_password="$(env_or_existing postgres_password "${_POSTGRES_PASSWORD:-}")"
redis_url="$(env_or_existing redis_url "${_REDIS_URL:-}")"
celery_broker_url="$(env_or_existing celery_broker_url "${_CELERY_BROKER_URL:-}")"
celery_result_backend="$(env_or_existing celery_result_backend "${_CELERY_RESULT_BACKEND:-}")"
minio_access_key="$(env_or_existing minio_access_key "${_MINIO_ROOT_USER:-}")"
minio_secret_key="$(env_or_existing minio_secret_key "${_MINIO_ROOT_PASSWORD:-}")"
jwt_secret_key="$(env_or_existing jwt_secret_key "${_JWT_SECRET_KEY:-}")"
pass_hmac_secret="$(env_or_existing pass_hmac_secret "${_PASS_HMAC_SECRET:-}")"
flower_basic_auth="$(env_or_existing flower_basic_auth "")"

[ -n "$flower_basic_auth" ] || flower_basic_auth="$(generate_basic_auth)"

require_secret secret_key "$secret_key"
require_secret postgres_password "$postgres_password"
require_secret redis_url "$redis_url"
require_secret celery_broker_url "$celery_broker_url"
require_secret celery_result_backend "$celery_result_backend"
require_secret minio_access_key "$minio_access_key"
require_secret minio_secret_key "$minio_secret_key"
require_secret jwt_secret_key "$jwt_secret_key"
require_secret pass_hmac_secret "$pass_hmac_secret"

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

# Optional integration values are written only when provided through bootstrap
# env vars. Existing Vault values are left untouched, which prevents repeated
# vault-init runs from corrupting multiline JSON/PEM credentials.
set_secret_from_env google_oauth_client_id "${_GOOGLE_OAUTH_CLIENT_ID:-}"
set_secret_from_env google_oauth_client_secret "${_GOOGLE_OAUTH_CLIENT_SECRET:-}"
set_secret_from_env google_wallet_issuer_id "${_GOOGLE_WALLET_ISSUER_ID:-}"
set_secret_from_env google_service_account_json "${_GOOGLE_SERVICE_ACCOUNT_JSON:-}"
set_secret_from_env payment_gateway_login "${_PAYMENT_GATEWAY_LOGIN:-}"
set_secret_from_env payment_gateway_tran_key "${_PAYMENT_GATEWAY_TRAN_KEY:-}"
set_secret_from_env payment_gateway_webhook_secret "${_PAYMENT_GATEWAY_WEBHOOK_SECRET:-}"
set_secret_from_env mailjet_api_key "${_MAILJET_API_KEY:-}"
set_secret_from_env mailjet_secret_key "${_MAILJET_SECRET_KEY:-}"
set_secret_from_env mailjet_sender_email "${_MAILJET_SENDER_EMAIL:-}"
set_secret_from_env mailjet_sender_name "${_MAILJET_SENDER_NAME:-}"
set_secret_from_env apple_pass_type_identifier "${_APPLE_PASS_TYPE_IDENTIFIER:-}"
set_secret_from_env apple_team_identifier "${_APPLE_TEAM_IDENTIFIER:-}"
set_secret_from_env apple_cert_pem "${_APPLE_CERT_PEM:-}"
set_secret_from_env apple_cert_key_pem "${_APPLE_CERT_KEY_PEM:-}"
set_secret_from_env apple_wwdr_cert_pem "${_APPLE_WWDR_CERT_PEM:-}"
set_secret_from_env google_wallet_enabled "${_GOOGLE_WALLET_ENABLED:-}"
set_secret_from_env apple_wallet_enabled "${_APPLE_WALLET_ENABLED:-}"
set_secret_from_env payment_gateway_enabled "${_PAYMENT_GATEWAY_ENABLED:-}"
set_secret_from_env payment_gateway_provider "${_PAYMENT_GATEWAY_PROVIDER:-}"
set_secret_from_env whatsapp_bridge_url "${_WHATSAPP_BRIDGE_URL:-}"
set_secret_from_env whatsapp_bridge_api_key "${_WHATSAPP_BRIDGE_API_KEY:-}"
set_secret_from_env twilio_account_sid "${_TWILIO_ACCOUNT_SID:-}"
set_secret_from_env twilio_auth_token "${_TWILIO_AUTH_TOKEN:-}"
set_secret_from_env twilio_from_number "${_TWILIO_FROM_NUMBER:-}"
set_secret_from_env apple_nfc_enabled "${_APPLE_NFC_ENABLED:-}"
set_secret_from_env apple_nfc_encryption_public_key "${_APPLE_NFC_ENCRYPTION_PUBLIC_KEY:-}"
set_secret_from_env ai_agent_base_url "${_AI_AGENT_BASE_URL:-}"
set_secret_from_env ai_agent_api_key "${_AI_AGENT_API_KEY:-}"

set_secret_default_if_missing google_wallet_enabled "true"
set_secret_default_if_missing apple_wallet_enabled "false"
set_secret_default_if_missing payment_gateway_enabled "false"
set_secret_default_if_missing payment_gateway_provider "manual"
set_secret_default_if_missing apple_nfc_enabled "false"

# ---------------------------------------------------------------------------
# Export infrastructure secrets to files so containers read from Vault volume
# instead of plaintext environment variables. Zero-Secret compliance.
# ---------------------------------------------------------------------------
mkdir -p /vault/runtime
printf "%s" "$postgres_password" >/vault/runtime/postgres_password
# Extract Redis password from the redis_url (format: redis://:PASSWORD@host:port/db)
printf "%s" "$redis_url" | sed -n 's|redis://:\([^@]*\)@.*|\1|p' >/vault/runtime/redis_password
printf "%s" "$minio_access_key" >/vault/runtime/minio_root_user
printf "%s" "$minio_secret_key" >/vault/runtime/minio_root_password
chmod 0444 /vault/runtime/postgres_password /vault/runtime/redis_password \
    /vault/runtime/minio_root_user /vault/runtime/minio_root_password

# Create/refresh loyallia-app policy and token (may fail on re-run with non-root token)
printf '%b' "path \"secret/data/loyallia/*\" {\n  capabilities = [\"read\", \"create\", \"update\", \"patch\"]\n}\n" >/vault/runtime/loyallia-app.hcl
vault policy write loyallia-app /vault/runtime/loyallia-app.hcl >/dev/null 2>&1 || echo "Policy write skipped (non-root token — policy already exists)"
if ! [ -f /vault/runtime/app-token ] || ! [ -s /vault/runtime/app-token ]; then
    vault token create -policy=loyallia-app -field=token >/vault/runtime/app-token 2>/dev/null || true
    chmod 0444 /vault/runtime/app-token 2>/dev/null || true
fi

echo "Vault initialized, unsealed, and secrets seeded successfully"
exit 0
