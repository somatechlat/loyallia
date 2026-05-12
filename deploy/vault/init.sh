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

[ -f /vault/file/init.json ] || vault operator init -key-shares=1 -key-threshold=1 -format=json >/vault/file/init.json
UNSEAL_KEY="$(awk -F '"' '/unseal_keys_b64/ {getline; print $2}' /vault/file/init.json)"
ROOT_TOKEN="$(awk -F '"' '/root_token/ {print $4}' /vault/file/init.json)"

[ -n "$UNSEAL_KEY" ] || {
    echo "missing unseal key"
    exit 1
}
[ -n "$ROOT_TOKEN" ] || {
    echo "missing root token"
    exit 1
}

vault operator unseal "$UNSEAL_KEY" >/dev/null 2>&1 || true
export VAULT_TOKEN="$ROOT_TOKEN"

vault secrets enable -path=secret kv-v2 >/dev/null 2>&1 || true

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

printf '%b' "path \"secret/data/loyallia/*\" {\n  capabilities = [\"read\", \"create\", \"update\", \"patch\"]\n}\n" >/vault/runtime/loyallia-app.hcl
vault policy write loyallia-app /vault/runtime/loyallia-app.hcl >/dev/null
vault token create -policy=loyallia-app -field=token >/vault/runtime/app-token
chmod 0444 /vault/runtime/app-token

echo "Vault initialized, unsealed, and secrets seeded successfully"
exit 0
