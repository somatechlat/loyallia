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
    wget -qO- --header "X-Vault-Token: $VAULT_TOKEN" "$VAULT_ADDR/v1/secret/data/$VAULT_APP_SECRET_PATH" 2>/dev/null | sed -n 's/.*"'"$1"'":"\([^"]*\)".*/\1/p' || true
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

vault kv put -mount=secret "$VAULT_APP_SECRET_PATH" \
    secret_key="$secret_key" \
    postgres_password="$postgres_password" \
    redis_url="$redis_url" \
    celery_broker_url="$celery_broker_url" \
    celery_result_backend="$celery_result_backend" \
    minio_access_key="$minio_access_key" \
    minio_secret_key="$minio_secret_key" \
    jwt_secret_key="$jwt_secret_key" \
    pass_hmac_secret="$pass_hmac_secret" \
    flower_basic_auth="$flower_basic_auth" \
    google_oauth_client_id="$(env_or_existing google_oauth_client_id "${_GOOGLE_OAUTH_CLIENT_ID:-}")" \
    google_oauth_client_secret="$(env_or_existing google_oauth_client_secret "${_GOOGLE_OAUTH_CLIENT_SECRET:-}")" \
    google_wallet_issuer_id="$(env_or_existing google_wallet_issuer_id "${_GOOGLE_WALLET_ISSUER_ID:-}")" \
    google_service_account_json="$(env_or_existing google_service_account_json "${_GOOGLE_SERVICE_ACCOUNT_JSON:-}")" \
    payment_gateway_login="$(env_or_existing payment_gateway_login "${_PAYMENT_GATEWAY_LOGIN:-}")" \
    payment_gateway_tran_key="$(env_or_existing payment_gateway_tran_key "${_PAYMENT_GATEWAY_TRAN_KEY:-}")" \
    payment_gateway_webhook_secret="$(env_or_existing payment_gateway_webhook_secret "${_PAYMENT_GATEWAY_WEBHOOK_SECRET:-}")" \
    email_host_user="$(env_or_existing email_host_user "${_EMAIL_HOST_USER:-}")" \
    email_host_password="$(env_or_existing email_host_password "${_EMAIL_HOST_PASSWORD:-}")" \
    apple_pass_type_identifier="$(env_or_existing apple_pass_type_identifier "${_APPLE_PASS_TYPE_IDENTIFIER:-}")" \
    apple_team_identifier="$(env_or_existing apple_team_identifier "${_APPLE_TEAM_IDENTIFIER:-}")" \
    apple_cert_pem="$(env_or_existing apple_cert_pem "${_APPLE_CERT_PEM:-}")" \
    apple_cert_key_pem="$(env_or_existing apple_cert_key_pem "${_APPLE_CERT_KEY_PEM:-}")" \
    apple_wwdr_cert_pem="$(env_or_existing apple_wwdr_cert_pem "${_APPLE_WWDR_CERT_PEM:-}")" \
    google_wallet_enabled="$(env_or_existing google_wallet_enabled "${_GOOGLE_WALLET_ENABLED:-true}")" \
    apple_wallet_enabled="$(env_or_existing apple_wallet_enabled "${_APPLE_WALLET_ENABLED:-false}")" \
    payment_gateway_enabled="$(env_or_existing payment_gateway_enabled "${_PAYMENT_GATEWAY_ENABLED:-false}")" \
    payment_gateway_provider="$(env_or_existing payment_gateway_provider "${_PAYMENT_GATEWAY_PROVIDER:-manual}")" \
    whatsapp_bridge_url="$(env_or_existing whatsapp_bridge_url "${_WHATSAPP_BRIDGE_URL:-}")" \
    whatsapp_bridge_api_key="$(env_or_existing whatsapp_bridge_api_key "${_WHATSAPP_BRIDGE_API_KEY:-}")" \
    twilio_account_sid="$(env_or_existing twilio_account_sid "${_TWILIO_ACCOUNT_SID:-}")" \
    twilio_auth_token="$(env_or_existing twilio_auth_token "${_TWILIO_AUTH_TOKEN:-}")" \
    twilio_from_number="$(env_or_existing twilio_from_number "${_TWILIO_FROM_NUMBER:-}")" \
    listmonk_url="$(env_or_existing listmonk_url "${_LISTMONK_URL:-}")" \
    listmonk_api_user="$(env_or_existing listmonk_api_user "${_LISTMONK_API_USER:-}")" \
    listmonk_api_token="$(env_or_existing listmonk_api_token "${_LISTMONK_API_TOKEN:-}")" \
    apple_nfc_enabled="$(env_or_existing apple_nfc_enabled "${_APPLE_NFC_ENABLED:-false}")" \
    apple_nfc_encryption_public_key="$(env_or_existing apple_nfc_encryption_public_key "${_APPLE_NFC_ENCRYPTION_PUBLIC_KEY:-}")" \
    ai_agent_base_url="$(env_or_existing ai_agent_base_url "${_AI_AGENT_BASE_URL:-}")" \
    ai_agent_api_key="$(env_or_existing ai_agent_api_key "${_AI_AGENT_API_KEY:-}")" >/dev/null

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

printf '%b' "path \"secret/data/loyallia/*\" {\n  capabilities = [\"read\", \"create\", \"update\"]\n}\n" >/vault/runtime/loyallia-app.hcl
vault policy write loyallia-app /vault/runtime/loyallia-app.hcl >/dev/null
vault token create -policy=loyallia-app -field=token >/vault/runtime/app-token
chmod 0444 /vault/runtime/app-token

echo "Vault initialized, unsealed, and secrets seeded successfully"
exit 0
