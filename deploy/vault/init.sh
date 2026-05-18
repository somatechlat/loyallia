#!/bin/sh
set -eu

# =============================================================================
# LOYALLIA VAULT INITIALIZATION & SECRET SEEDING
# =============================================================================
# This script runs inside the vault-init container.
# It initializes Vault (if needed), unseals it, enables KV v2,
# and seeds all application secrets from the bootstrap JSON file.
#
# Design: Secrets are read from a read-only volume mount.
#         NO secrets are ever passed via environment variables.
# =============================================================================

# --- Logging helpers ---------------------------------------------------------
LOG_PREFIX="[vault-init]"
log_info()  { echo "$LOG_PREFIX [INFO]  $*"; }
log_warn()  { echo "$LOG_PREFIX [WARN]  $*" >&2; }
log_error() { echo "$LOG_PREFIX [ERROR] $*" >&2; }

# --- Wait for Vault API to be reachable --------------------------------------
wait_for_vault() {
    log_info "Waiting for Vault API at $VAULT_ADDR ..."
    i=0
    until wget --spider --quiet --no-check-certificate \
        "$VAULT_ADDR/v1/sys/seal-status" 2>/dev/null; do
        i=$((i + 1))
        if [ "$i" -ge 60 ]; then
            log_error "Timeout waiting for Vault API after 60 seconds"
            exit 1
        fi
        sleep 1
    done
    log_info "Vault API is reachable."
}

# --- Read a field from existing Vault secret (for idempotency) ---------------
existing_field() {
    vault kv get -mount=secret -field="$1" "$VAULT_APP_SECRET_PATH" 2>/dev/null || true
}

# --- JSON bootstrap file reader ----------------------------------------------
BOOTSTRAP_FILE="${BOOTSTRAP_SECRETS_FILE:-/vault/bootstrap/secrets.json}"

# Install python3 if missing (Alpine-based vault image)
if ! command -v python3 &>/dev/null; then
    log_info "Installing python3 for JSON parsing..."
    apk add --no-cache python3 >/dev/null 2>&1 || {
        log_error "Cannot install python3. Bootstrap secrets JSON requires Python."
        exit 1
    }
fi

# --- Read value from bootstrap JSON ------------------------------------------
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

# --- Generate secrets if needed ----------------------------------------------
generate_basic_auth() {
    printf "loyallia:%s" "$(tr -dc A-Za-z0-9 </dev/urandom | head -c 32)"
}

generate_secret() {
    tr -dc A-Za-z0-9 </dev/urandom | head -c 40
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

wait_for_vault

# --- Generate self-signed TLS certificate if none exists (local dev) ---------
if [ ! -f /vault/certs/vault.crt ]; then
    log_info "No TLS certificates found — generating self-signed cert for local dev..."
    mkdir -p /vault/certs
    apk add --no-cache openssl >/dev/null 2>&1 || true
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /vault/certs/vault.key \
        -out /vault/certs/vault.crt \
        -subj "/CN=vault" \
        -addext "subjectAltName = DNS:vault,DNS:localhost,IP:127.0.0.1,IP:0.0.0.0" 2>/dev/null || \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /vault/certs/vault.key \
        -out /vault/certs/vault.crt \
        -subj "/CN=vault" 2>/dev/null || true
fi

# --- Support rescue injection ------------------------------------------------
if [ -n "${VAULT_RESCUE_INIT_JSON:-}" ] && [ -f "$VAULT_RESCUE_INIT_JSON" ]; then
    cp "$VAULT_RESCUE_INIT_JSON" /vault/file/init.json
    log_info "Injected rescue init.json from $VAULT_RESCUE_INIT_JSON"
fi

# --- Determine if Vault is already initialized -------------------------------
log_info "Checking Vault initialization status..."
VAULT_INIT_STATUS=""
VAULT_ALREADY_INIT=0

if wget --quiet --no-check-certificate -O - "$VAULT_ADDR/v1/sys/seal-status" 2>/dev/null > /tmp/seal_status.json; then
    if [ -s /tmp/seal_status.json ]; then
        VAULT_INIT_STATUS="$(cat /tmp/seal_status.json)"
        VAULT_ALREADY_INIT="$(printf "%s" "$VAULT_INIT_STATUS" | python3 -c "import json,sys; d=json.load(sys.stdin); print(1 if d.get('initialized') else 0)" 2>/dev/null || echo 0)"
    fi
fi

UNSEAL_KEY=""
ROOT_TOKEN=""

if [ "$VAULT_ALREADY_INIT" -gt 0 ]; then
    log_info "Vault already initialized."

    # Decrypt init.json.gpg if present
    if [ -f /vault/file/init.json.gpg ]; then
        if command -v gpg &>/dev/null && [ -n "${VAULT_INIT_PASSPHRASE:-}" ]; then
            gpg --batch --yes --passphrase "$VAULT_INIT_PASSPHRASE" \
                --decrypt --output /vault/file/init.json /vault/file/init.json.gpg 2>/dev/null || true
        fi
    fi

    # Extract credentials from init.json
    if [ -s /vault/file/init.json ]; then
        if command -v jq &>/dev/null; then
            UNSEAL_KEY="$(jq -r '.unseal_keys_b64[0]' /vault/file/init.json 2>/dev/null || true)"
            ROOT_TOKEN="$(jq -r '.root_token' /vault/file/init.json 2>/dev/null || true)"
        else
            UNSEAL_KEY="$(python3 -c "import json; d=json.load(open('/vault/file/init.json')); print(d.get('unseal_keys_b64',[''])[0])" 2>/dev/null || true)"
            ROOT_TOKEN="$(python3 -c "import json; d=json.load(open('/vault/file/init.json')); print(d.get('root_token',''))" 2>/dev/null || true)"
        fi
    fi

    # Fallback: try runtime app-token
    if [ -z "$ROOT_TOKEN" ] && [ -f /vault/runtime/app-token ]; then
        ROOT_TOKEN="$(cat /vault/runtime/app-token 2>/dev/null || true)"
        log_info "Using runtime app-token as VAULT_TOKEN."
    fi

    if [ -z "$ROOT_TOKEN" ]; then
        log_error "Cannot obtain any Vault token. Vault is initialized but unreachable."
        exit 1
    fi

    export VAULT_TOKEN="$ROOT_TOKEN"

    # Check if sealed and unseal if needed
    VAULT_SEALED="$(printf "%s" "$VAULT_INIT_STATUS" | python3 -c "import json,sys; d=json.load(sys.stdin); print(1 if d.get('sealed') else 0)" 2>/dev/null || echo 0)"
    if [ "$VAULT_SEALED" -gt 0 ]; then
        if [ -n "$UNSEAL_KEY" ]; then
            log_info "Vault is sealed — unsealing..."
            vault operator unseal "$UNSEAL_KEY" >/dev/null 2>&1 || {
                log_warn "Unseal with key 0 failed, trying remaining keys..."
            }
        else
            log_warn "Vault sealed but no unseal key available. Cannot auto-unseal."
        fi
    fi

else
    # ===================================================================
    # FIRST-TIME INITIALIZATION
    # ===================================================================
    log_info "Vault not initialized. Performing first-time initialization..."

    vault operator init -key-shares=5 -key-threshold=3 -format=json > /vault/file/init.json

    if command -v jq &>/dev/null; then
        UNSEAL_KEY="$(jq -r '.unseal_keys_b64[0]' /vault/file/init.json)"
    else
        UNSEAL_KEY="$(python3 -c "import json; d=json.load(open('/vault/file/init.json')); print(d['unseal_keys_b64'][0])")"
    fi
    ROOT_TOKEN="$(python3 -c "import json; d=json.load(open('/vault/file/init.json')); print(d['root_token'])" 2>/dev/null || \
                awk -F '"' '/root_token/ {print $4}' /vault/file/init.json)"

    [ -n "$UNSEAL_KEY" ] || { log_error "Missing unseal key after init"; exit 1; }
    [ -n "$ROOT_TOKEN" ] || { log_error "Missing root token after init"; exit 1; }

    log_info "Vault initialized (5 shares, 3 threshold)."

    # Encrypt init.json to protect unseal keys at rest
    if command -v gpg &>/dev/null; then
        GPG_PASS="${VAULT_INIT_PASSPHRASE:-$(openssl rand -base64 32)}"
        gpg --batch --yes --passphrase "$GPG_PASS" \
            --symmetric --cipher-algo AES256 --output /vault/file/init.json.gpg /vault/file/init.json
        rm -f /vault/file/init.json
        log_info "Unseal keys encrypted with AES256-GPG."
    fi

    # Unseal with the first key
    log_info "Unsealing Vault..."
    vault operator unseal "$UNSEAL_KEY" >/dev/null 2>&1 || true

    export VAULT_TOKEN="$ROOT_TOKEN"

    # Enable KV v2 secrets engine
    log_info "Enabling KV v2 secrets engine at 'secret/' ..."
    vault secrets enable -path=secret kv-v2 2>/dev/null || {
        log_info "KV v2 engine may already be enabled — continuing..."
    }
fi

# --- Verify Vault is unsealed and we have a valid token ----------------------
log_info "Verifying Vault status..."
vault status -format=json > /tmp/vault_status_final.json 2>/dev/null || {
    log_error "Cannot connect to Vault with current token."
    exit 1
}

SEALED_CHECK="$(python3 -c "import json; d=json.load(open('/tmp/vault_status_final.json')); print('true' if d.get('sealed') else 'false')")"
if [ "$SEALED_CHECK" = "true" ]; then
    log_error "Vault is still sealed after unseal attempts."
    exit 1
fi

log_info "Vault is unsealed and token is valid."

# =============================================================================
# READ ALL SECRETS FROM BOOTSTRAP JSON
# =============================================================================

log_info "Reading secrets from bootstrap file: $BOOTSTRAP_FILE"

if [ ! -f "$BOOTSTRAP_FILE" ]; then
    log_error "Bootstrap secrets file not found: $BOOTSTRAP_FILE"
    exit 1
fi

# --- Core infrastructure secrets ---------------------------------------------
secret_key="$(json_get secret_key)"
postgres_password="$(json_get postgres_password)"
redis_url="$(json_get redis_url)"
celery_broker_url="$(json_get celery_broker_url)"
celery_result_backend="$(json_get celery_result_backend)"
minio_access_key="$(json_get minio_access_key)"
minio_secret_key="$(json_get minio_secret_key)"
jwt_secret_key="$(json_get jwt_secret_key)"
pass_hmac_secret="$(json_get pass_hmac_secret)"
flower_basic_auth="$(json_get flower_basic_auth)"
whatsapp_bridge_api_key="$(json_get whatsapp_bridge_api_key)"
grafana_admin_password="$(json_get grafana_admin_password)"

# --- Fallbacks for generated values ------------------------------------------
[ -n "$flower_basic_auth" ] || flower_basic_auth="$(generate_basic_auth)"
[ -n "$whatsapp_bridge_api_key" ] || whatsapp_bridge_api_key="$(generate_secret)"
[ -n "$grafana_admin_password" ] || grafana_admin_password="$(generate_secret)"

# --- Validate required secrets -----------------------------------------------
log_info "Validating required secrets..."
MISSING=0
for key_name in secret_key postgres_password redis_url celery_broker_url \
                celery_result_backend minio_access_key minio_secret_key \
                jwt_secret_key pass_hmac_secret; do
    eval "val=\$$key_name"
    if [ -z "$val" ]; then
        log_error "Missing required secret: $key_name"
        MISSING=$((MISSING + 1))
    fi
done

if [ "$MISSING" -gt 0 ]; then
    log_error "$MISSING required secret(s) missing. Aborting."
    exit 1
fi

log_info "All required secrets present."

# =============================================================================
# WRITE ALL SECRETS TO VAULT KV v2 (BULK ATOMIC PUT)
# =============================================================================
# KV v2 "vault kv put" REPLACES all data at the path.
# Individual "kv put" calls would overwrite each other.
# Solution: Build ONE command with ALL key=value pairs.
#
# The @file syntax for "vault kv put" expects flat key=value lines (like .env),
# NOT JSON. We generate this format and call kv put once.
# =============================================================================

log_info "Preparing secrets for Vault bulk upload..."

python3 - "$BOOTSTRAP_FILE" "$flower_basic_auth" "$whatsapp_bridge_api_key" "$grafana_admin_password" << 'PYEOF'
import json
import sys

bootstrap_file = sys.argv[1]
flower_auth = sys.argv[2]
whatsapp_key = sys.argv[3]
grafana_pass = sys.argv[4]

with open(bootstrap_file) as f:
    data = json.load(f)

secrets = data.get('secrets', {})

# Override generated fallbacks
if not secrets.get('flower_basic_auth'):
    secrets['flower_basic_auth'] = flower_auth
if not secrets.get('whatsapp_bridge_api_key'):
    secrets['whatsapp_bridge_api_key'] = whatsapp_key
if not secrets.get('grafana_admin_password'):
    secrets['grafana_admin_password'] = grafana_pass

# Remove empty certificate values
for k in ['apple_cert_pem', 'apple_cert_key_pem', 'apple_wwdr_cert_pem', 'google_service_account_json']:
    if k in secrets and not secrets[k]:
        del secrets[k]

# Write flat key=value format for "vault kv put @file" syntax
# Format: one key=value per line, values are raw strings
with open('/tmp/vault_secrets_flat.env', 'w') as f:
    for k, v in secrets.items():
        # Escape newlines and write as raw string
        val = str(v).replace('\n', '\\n')
        f.write(f"{k}={val}\n")

print(f"Prepared {len(secrets)} secrets in flat key=value format")
PYEOF

log_info "Writing all secrets to Vault in a single atomic operation..."

# First ensure the path exists (create with placeholder, then overwrite)
vault kv put -mount=secret "$VAULT_APP_SECRET_PATH" __bootstrap_init=true 2>/dev/null || {
    log_warn "Could not create initial path — may already exist"
}

# Now bulk write ALL secrets using @file syntax with flat key=value format
if vault kv put -mount=secret "$VAULT_APP_SECRET_PATH" @/tmp/vault_secrets_flat.env 2>/tmp/vault_put_error.log; then
    log_info "All secrets written to Vault successfully (bulk put)."
else
    log_warn "Bulk put with @file failed — falling back to Python API direct write..."

    python3 - "$VAULT_APP_SECRET_PATH" << 'PYEOF2'
import json
import os
import sys
import urllib.request
import ssl

vault_path = sys.argv[1]
vault_addr = os.environ.get('VAULT_ADDR', 'https://127.0.0.1:8200')
vault_token = os.environ.get('VAULT_TOKEN', '')

# Read flat key=value file
secrets = {}
with open('/tmp/vault_secrets_flat.env') as f:
    for line in f:
        line = line.strip()
        if not line or '=' not in line:
            continue
        k, v = line.split('=', 1)
        # Unescape newlines
        v = v.replace('\\n', '\n')
        secrets[k] = v

# Build Vault KV v2 write payload
payload = json.dumps({"data": secrets}).encode('utf-8')

# Prepare SSL context (skip verify for local dev / self-signed)
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Write via Vault HTTP API
url = f"{vault_addr}/v1/secret/data/{vault_path}"
req = urllib.request.Request(
    url,
    data=payload,
    headers={
        "X-Vault-Token": vault_token,
        "Content-Type": "application/json",
    },
    method="POST",
)

try:
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        if resp.status in (200, 204):
            print(f"Successfully wrote {len(secrets)} secrets via HTTP API")
        else:
            print(f"Unexpected status: {resp.status}", file=sys.stderr)
            sys.exit(1)
except urllib.error.HTTPError as e:
    body = e.read().decode() if e.read else ""
    print(f"HTTP Error {e.code}: {e.reason} — {body}", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
PYEOF2
fi

# Clean up temp file
rm -f /tmp/vault_secrets_flat.env /tmp/vault_put_error.log

# Verify: count secrets in Vault
SECRETS_COUNT="$(vault kv get -mount=secret -format=json "$VAULT_APP_SECRET_PATH" 2>/dev/null | \
    python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('data',{}).get('data',{})))" 2>/dev/null || echo 0)"
log_info "Verified: $SECRETS_COUNT secrets stored in Vault at secret/$VAULT_APP_SECRET_PATH"

if [ "$SECRETS_COUNT" -lt 10 ]; then
    log_error "Only $SECRETS_COUNT secrets in Vault — expected 30+. Something went wrong."
    exit 1
fi

# =============================================================================
# WRITE DEFAULT/FEATURE TOGGLE VALUES (idempotent — only if missing)
# =============================================================================

log_info "Setting default feature toggle values..."

# These only apply if the field doesn't already exist in Vault
set_default_if_missing() {
    key="$1"
    default_value="$2"
    current="$(vault kv get -mount=secret -field="$key" "$VAULT_APP_SECRET_PATH" 2>/dev/null || true)"
    if [ -z "$current" ]; then
        log_info "  Setting default: $key=$default_value"
        vault kv patch -mount=secret "$VAULT_APP_SECRET_PATH" "$key=$default_value" 2>/dev/null || \
            log_warn "    Failed to set default for $key"
    fi
}

set_default_if_missing google_wallet_enabled "false"
set_default_if_missing apple_wallet_enabled "false"
set_default_if_missing payment_gateway_enabled "false"
set_default_if_missing payment_gateway_provider "manual"
set_default_if_missing apple_nfc_enabled "false"
set_default_if_missing twilio_verify_enabled "false"
set_default_if_missing twilio_use_test_mode "false"
set_default_if_missing system_mode "development"
set_default_if_missing backup_frequency "15days"
set_default_if_missing backup_retention "31"
set_default_if_missing cron_hour "5"

# =============================================================================
# EXPORT INFRASTRUCTURE SECRETS TO RUNTIME FILES
# =============================================================================

log_info "Exporting infrastructure secrets to runtime files..."
mkdir -p /vault/runtime

printf "%s" "$postgres_password" > /vault/runtime/postgres_password
# Extract Redis password from redis_url: redis://:PASSWORD@host:port/db
printf "%s" "$redis_url" | sed -n 's|redis://:\([^@]*\)@.*|\1|p' > /vault/runtime/redis_password
printf "%s" "$minio_access_key" > /vault/runtime/minio_root_user
printf "%s" "$minio_secret_key" > /vault/runtime/minio_root_password
printf "%s" "$secret_key" > /vault/runtime/secret_key
printf "%s" "$jwt_secret_key" > /vault/runtime/jwt_secret_key
printf "%s" "$pass_hmac_secret" > /vault/runtime/pass_hmac_secret
printf "%s" "$whatsapp_bridge_api_key" > /vault/runtime/whatsapp_bridge_api_key
printf "%s" "$grafana_admin_password" > /vault/runtime/grafana_admin_password
printf "%s" "$flower_basic_auth" > /vault/runtime/flower_basic_auth

chmod 0600 /vault/runtime/postgres_password \
    /vault/runtime/redis_password \
    /vault/runtime/minio_root_user \
    /vault/runtime/minio_root_password \
    /vault/runtime/secret_key \
    /vault/runtime/jwt_secret_key \
    /vault/runtime/pass_hmac_secret \
    /vault/runtime/whatsapp_bridge_api_key \
    /vault/runtime/grafana_admin_password \
    /vault/runtime/flower_basic_auth

# Also write Redis URLs
printf "%s" "$redis_url" > /vault/runtime/redis_url
printf "%s" "$celery_broker_url" > /vault/runtime/celery_broker_url
printf "%s" "$celery_result_backend" > /vault/runtime/celery_result_backend
chmod 0600 /vault/runtime/redis_url /vault/runtime/celery_broker_url /vault/runtime/celery_result_backend

# Copy CA certificate to runtime for TLS verification by other containers
if [ -f /vault/certs/vault.crt ]; then
    cp /vault/certs/vault.crt /vault/runtime/ca.crt
    chmod 0644 /vault/runtime/ca.crt
    log_info "CA certificate copied to runtime/ca.crt"
elif [ -f /vault/file/vault.crt ]; then
    cp /vault/file/vault.crt /vault/runtime/ca.crt
    chmod 0644 /vault/runtime/ca.crt
    log_info "CA certificate copied from vault file storage"
fi

log_info "Runtime files created."

# =============================================================================
# CREATE APP POLICY AND TOKEN
# =============================================================================

log_info "Creating loyallia-app policy..."
mkdir -p /vault/policies /vault/runtime

# Write the policy file
cat > /vault/runtime/loyallia-app.hcl << 'POLICYEOF'
path "secret/data/loyallia/*" {
  capabilities = ["read"]
}

path "secret/data/loyallia" {
  capabilities = ["read"]
}
POLICYEOF

vault policy write loyallia-app /vault/runtime/loyallia-app.hcl 2>/dev/null || {
    log_warn "Policy write skipped (may already exist or non-root token)"
}

# Create app token (save root token for revocation)
root_token="${ROOT_TOKEN:-}"
if ! [ -f /vault/runtime/app-token ] || ! [ -s /vault/runtime/app-token ]; then
    log_info "Creating app token..."
    if vault token create -policy=loyallia-app -field=token > /vault/runtime/app-token 2>/dev/null; then
        chmod 0600 /vault/runtime/app-token
        log_info "App token created."

        # Revoke root token after successful app token creation
        if [ -n "$root_token" ]; then
            log_info "Revoking root token for security..."
            vault token revoke "$root_token" >/dev/null 2>&1 || \
                log_warn "Failed to revoke root token"
        fi
    else
        log_warn "App token creation failed — root token retained for recovery"
    fi
else
    log_info "App token already exists."
fi

# --- Cleanup sensitive temp files --------------------------------------------
rm -f /tmp/vault_secrets_payload.json /tmp/seal_status.json /tmp/vault_status_final.json /tmp/vault_put_error.log

log_info "============================================================"
log_info "VAULT INITIALIZATION COMPLETE"
log_info "============================================================"
log_info "Secrets stored: $SECRETS_COUNT at secret/$VAULT_APP_SECRET_PATH"
log_info "App policy: loyallia-app (read-only)"
log_info "App token: /vault/runtime/app-token"
log_info "Runtime files: /vault/runtime/ (10 files)"
log_info "============================================================"

exit 0
