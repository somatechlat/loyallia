#!/bin/sh
set -eu

# =============================================================================
# LOYALLIA VAULT INITIALIZATION & SECRET SEEDING
# =============================================================================
# Pure POSIX sh - runs in Alpine Linux (busybox) container.
# NO Python, NO jq, NO curl. Uses only: sh, vault CLI, sed, grep,
# cat, cut, tr, head, tail, awk, base64, wc, wget.
#
# Reads secrets from a flat key=value .env file mounted as read-only.
# Multiline values (PEM certs, JSON blobs) use _b64 suffix with base64 encoding.
#
# Design: Secrets are read from a read-only volume mount.
#         NO secrets are ever passed via environment variables.
# =============================================================================

# --- Environment defaults ----------------------------------------------------
: "${VAULT_ADDR:=https://127.0.0.1:8200}"
: "${VAULT_SKIP_VERIFY:=true}"
: "${VAULT_APP_SECRET_PATH:=loyallia/production}"
: "${BOOTSTRAP_SECRETS_FILE:=/vault/bootstrap/secrets.env}"

export VAULT_ADDR
export VAULT_SKIP_VERIFY

# --- Logging helpers ---------------------------------------------------------
LOG_PREFIX="[vault-init]"
log_info()  { echo "$LOG_PREFIX [INFO]  $*"; }
log_warn()  { echo "$LOG_PREFIX [WARN]  $*" >&2; }
log_error() { echo "$LOG_PREFIX [ERROR] $*" >&2; }

# =============================================================================
# FUNCTION: wait_for_vault
# Loop until Vault API responds at VAULT_ADDR/v1/sys/seal-status.
# Uses wget --spider (busybox). Timeout after 60 seconds.
# =============================================================================
wait_for_vault() {
    log_info "Waiting for Vault API at $VAULT_ADDR ..."
    i=0
    while ! wget --spider --quiet --no-check-certificate \
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

# =============================================================================
# FUNCTION: get_flat_val
# Read a value from the flat .env file.
# Checks for base64-encoded version (_b64 suffix) first, falls back to plain.
# =============================================================================
get_flat_val() {
    key="$1"
    file="$2"
    # Check for base64-encoded version first
    b64_val=$(grep "^${key}_b64=" "$file" 2>/dev/null | head -1 | cut -d= -f2-)
    if [ -n "$b64_val" ]; then
        printf "%s" "$b64_val" | base64 -d 2>/dev/null || printf "%s" "$b64_val"
        return
    fi
    # Regular value
    grep "^${key}=" "$file" 2>/dev/null | head -1 | cut -d= -f2-
}

# =============================================================================
# FUNCTION: json_extract_bool
# Extract a boolean field from JSON text on stdin using only sed/grep.
# Outputs: "true", "false", or empty string.
# =============================================================================
json_extract_bool() {
    field="$1"
    sed -n 's/.*"'"$field"'"[[:space:]]*:[[:space:]]*\([^,}[:space:]]*\).*/\1/p' | head -1
}

# =============================================================================
# FUNCTION: json_extract_string
# Extract a string field from JSON text on stdin using only sed.
# =============================================================================
json_extract_string() {
    field="$1"
    sed -n 's/.*"'"$field"'"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1
}

# =============================================================================
# FUNCTION: vault_status_json
# Fetch seal-status JSON from Vault HTTP API via wget.
# =============================================================================
vault_status_json() {
    wget --no-check-certificate --quiet -O - \
        "$VAULT_ADDR/v1/sys/seal-status" 2>/dev/null || true
}

# =============================================================================
# FUNCTION: generate_basic_auth
# Generate a random basic auth string.
# =============================================================================
generate_basic_auth() {
    printf "loyallia:%s" "$(tr -dc A-Za-z0-9 </dev/urandom | head -c 32)"
}

# =============================================================================
# FUNCTION: generate_secret
# Generate a random 40-char alphanumeric secret.
# =============================================================================
generate_secret() {
    tr -dc A-Za-z0-9 </dev/urandom | head -c 40
}

# =============================================================================
# FUNCTION: init_vault
# If Vault is not initialized, run operator init and save output to init.json.
# =============================================================================
init_vault() {
    log_info "Vault not initialized. Performing first-time initialization..."

    vault operator init -key-shares=5 -key-threshold=3 -format=json > /vault/file/init.json

    [ -s /vault/file/init.json ] || {
        log_error "vault operator init produced empty output"
        exit 1
    }

    log_info "Vault initialized (5 shares, 3 threshold)."
}

# =============================================================================
# FUNCTION: extract_root_token
# Parse root_token from /vault/file/init.json using grep + sed (NO Python).
# =============================================================================
extract_root_token() {
    grep '"root_token"' /vault/file/init.json | sed 's/.*"root_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/'
}

# =============================================================================
# FUNCTION: extract_unseal_key
# Parse the Nth unseal key (1-indexed) from init.json using grep + sed.
# Assumes pretty-printed JSON from vault operator init -format=json.
# =============================================================================
extract_unseal_key() {
    n="$1"
    line_num=$((n + 1))
    grep -A 7 '"unseal_keys_b64"' /vault/file/init.json | \
        sed -n "${line_num}p" | \
        sed 's/.*"\([^"]*\)".*/\1/'
}

# =============================================================================
# FUNCTION: unseal_vault
# Extract 3 different unseal keys from init.json and unseal Vault with each.
# =============================================================================
unseal_vault() {
    UNSEAL_KEY1=$(extract_unseal_key 1)
    UNSEAL_KEY2=$(extract_unseal_key 2)
    UNSEAL_KEY3=$(extract_unseal_key 3)

    [ -n "$UNSEAL_KEY1" ] || { log_error "Missing unseal key 1 after init"; exit 1; }
    [ -n "$UNSEAL_KEY2" ] || { log_error "Missing unseal key 2 after init"; exit 1; }
    [ -n "$UNSEAL_KEY3" ] || { log_error "Missing unseal key 3 after init"; exit 1; }

    log_info "Unsealing Vault with 3 different keys..."
    vault operator unseal "$UNSEAL_KEY1" >/dev/null 2>&1 || true
    vault operator unseal "$UNSEAL_KEY2" >/dev/null 2>&1 || true
    vault operator unseal "$UNSEAL_KEY3" >/dev/null 2>&1 || true
}

# =============================================================================
# FUNCTION: seed_secrets
# Read ALL keys from the flat .env file and write to Vault via a SINGLE
# vault kv put command. Builds positional parameters iteratively.
# Skips empty values and comments. Prefers _b64 decoded values.
# Sets global SECRETS_WRITTEN to the count of secrets written.
# =============================================================================
SECRETS_WRITTEN=0

seed_secrets() {
    log_info "Seeding all secrets from $BOOTSTRAP_SECRETS_FILE ..."

    if [ ! -f "$BOOTSTRAP_SECRETS_FILE" ]; then
        log_error "Bootstrap secrets file not found: $BOOTSTRAP_SECRETS_FILE"
        exit 1
    fi

    # Build positional parameters for a single vault kv put call
    set --

    secrets_count=0

    while IFS= read -r line || [ -n "$line" ]; do
        # Skip comments and empty lines
        case "$line" in
            ""|\#*) continue ;;
        esac

        # Extract key (everything before first =)
        key=$(printf "%s" "$line" | cut -d= -f1)

        # Skip lines without a key
        [ -n "$key" ] || continue

        # Skip base64 variant lines (handled alongside their base key)
        case "$key" in
            *_b64) continue ;;
        esac

        # Get value (base64-decoded if _b64 variant exists)
        val=$(get_flat_val "$key" "$BOOTSTRAP_SECRETS_FILE")

        # Skip empty values
        [ -n "$val" ] || continue

        # Append to positional parameters
        set -- "$@" "$key=$val"
        secrets_count=$((secrets_count + 1))
    done < "$BOOTSTRAP_SECRETS_FILE"

    # Add generated fallback values only if not already present in .env
    if [ -n "${flower_basic_auth:-}" ]; then
        if ! grep -q "^flower_basic_auth=" "$BOOTSTRAP_SECRETS_FILE" 2>/dev/null; then
            set -- "$@" "flower_basic_auth=$flower_basic_auth"
            secrets_count=$((secrets_count + 1))
        fi
    fi
    if [ -n "${whatsapp_bridge_api_key:-}" ]; then
        if ! grep -q "^whatsapp_bridge_api_key=" "$BOOTSTRAP_SECRETS_FILE" 2>/dev/null; then
            set -- "$@" "whatsapp_bridge_api_key=$whatsapp_bridge_api_key"
            secrets_count=$((secrets_count + 1))
        fi
    fi
    if [ -n "${grafana_admin_password:-}" ]; then
        if ! grep -q "^grafana_admin_password=" "$BOOTSTRAP_SECRETS_FILE" 2>/dev/null; then
            set -- "$@" "grafana_admin_password=$grafana_admin_password"
            secrets_count=$((secrets_count + 1))
        fi
    fi

    # Ensure the mount path exists (create placeholder first, then overwrite)
    vault kv put -mount=secret "$VAULT_APP_SECRET_PATH" __bootstrap_init=true 2>/dev/null || {
        log_warn "Could not create initial KV path - may already exist"
    }

    # Atomic bulk write of ALL secrets
    vault kv put -mount=secret "$VAULT_APP_SECRET_PATH" "$@"

    SECRETS_WRITTEN=$secrets_count
    log_info "Successfully wrote $secrets_count secrets to Vault."
}

# =============================================================================
# FUNCTION: write_runtime_files
# Write individual secret files to /vault/runtime/ for other containers.
# =============================================================================
write_runtime_files() {
    log_info "Exporting infrastructure secrets to runtime files..."
    mkdir -p /vault/runtime

    _write_file() {
        _name="$1"
        _content="$2"
        printf "%s" "$_content" > "/vault/runtime/$_name"
        chmod 0600 "/vault/runtime/$_name"
    }

    _write_file "postgres_password"          "$postgres_password"
    _write_file "redis_password"             "$(printf "%s" "$redis_url" | sed -n 's|redis://:\([^@]*\)@.*|\1|p')"
    _write_file "minio_root_user"            "$minio_access_key"
    _write_file "minio_root_password"        "$minio_secret_key"
    _write_file "secret_key"                 "$secret_key"
    _write_file "jwt_secret_key"             "$jwt_secret_key"
    _write_file "pass_hmac_secret"           "$pass_hmac_secret"
    _write_file "whatsapp_bridge_api_key"    "$whatsapp_bridge_api_key"
    _write_file "grafana_admin_password"     "$grafana_admin_password"
    _write_file "flower_basic_auth"          "$flower_basic_auth"

    # Also write full Redis/queue URLs
    _write_file "redis_url"                  "$redis_url"
    _write_file "celery_broker_url"          "$celery_broker_url"
    _write_file "celery_result_backend"      "$celery_result_backend"

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
}

# =============================================================================
# FUNCTION: create_policy_and_token
# Create the loyallia-app read-only policy, create an app token,
# write it to /vault/runtime/app-token, and revoke the root token.
# =============================================================================
create_policy_and_token() {
    log_info "Creating loyallia-app policy..."
    mkdir -p /vault/policies /vault/runtime

    # Write the policy inline (pure POSIX sh, no file-copy dependencies)
    cat > /vault/runtime/loyallia-app.hcl << 'POLICYEOF'
path "secret/data/loyallia/*" {
  capabilities = ["read"]
}

path "secret/data/loyallia" {
  capabilities = ["read"]
}

path "secret/metadata/loyallia/*" {
  capabilities = ["read", "list"]
}

path "auth/token/lookup-self" {
  capabilities = ["read"]
}

path "auth/token/renew-self" {
  capabilities = ["update"]
}

path "sys/health" {
  capabilities = ["read"]
}

path "sys/seal-status" {
  capabilities = ["read"]
}

path "secret/metadata/*" {
  capabilities = ["list"]
}
POLICYEOF

    vault policy write loyallia-app /vault/runtime/loyallia-app.hcl 2>/dev/null || {
        log_warn "Policy write skipped (may already exist or non-root token)"
    }

    # Create app token (retain root token for revocation)
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
            log_warn "App token creation failed - root token retained for recovery"
        fi
    else
        log_info "App token already exists."
    fi
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

wait_for_vault

# --- Generate self-signed TLS certificate if none exists (local dev) ---------
if [ ! -f /vault/certs/vault.crt ]; then
    log_info "No TLS certificates found - generating self-signed cert for local dev..."
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

VAULT_ALREADY_INIT=0
VAULT_SEALED=0
VAULT_INIT_STATUS=""

status_json=$(vault_status_json)
if [ -n "$status_json" ]; then
    VAULT_INIT_STATUS="$status_json"
    init_val=$(printf "%s" "$status_json" | json_extract_bool "initialized")
    case "$init_val" in
        true|True|TRUE|1) VAULT_ALREADY_INIT=1 ;;
        *) VAULT_ALREADY_INIT=0 ;;
    esac
fi

UNSEAL_KEY1=""
UNSEAL_KEY2=""
UNSEAL_KEY3=""
ROOT_TOKEN=""

if [ "$VAULT_ALREADY_INIT" -gt 0 ]; then
    # =================================================================
    # VAULT ALREADY INITIALIZED PATH
    # =================================================================
    log_info "Vault already initialized."

    # Decrypt init.json.gpg if present
    if [ -f /vault/file/init.json.gpg ]; then
        if command -v gpg >/dev/null 2>&1 && [ -n "${VAULT_INIT_PASSPHRASE:-}" ]; then
            gpg --batch --yes --passphrase "$VAULT_INIT_PASSPHRASE" \
                --decrypt --output /vault/file/init.json /vault/file/init.json.gpg 2>/dev/null || true
        fi
    fi

    # Extract credentials from init.json using grep + sed (NO Python, NO jq)
    if [ -s /vault/file/init.json ]; then
        ROOT_TOKEN=$(extract_root_token)
        UNSEAL_KEY1=$(extract_unseal_key 1)
        UNSEAL_KEY2=$(extract_unseal_key 2)
        UNSEAL_KEY3=$(extract_unseal_key 3)
    fi

    # Fallback: try runtime app-token
    if [ -z "$ROOT_TOKEN" ] && [ -f /vault/runtime/app-token ]; then
        ROOT_TOKEN=$(cat /vault/runtime/app-token 2>/dev/null || true)
        log_info "Using runtime app-token as VAULT_TOKEN."
    fi

    if [ -z "$ROOT_TOKEN" ]; then
        log_error "Cannot obtain any Vault token. Vault is initialized but unreachable."
        exit 1
    fi

    export VAULT_TOKEN="$ROOT_TOKEN"

    # Check seal status and unseal if needed
    sealed_val=$(printf "%s" "$VAULT_INIT_STATUS" | json_extract_bool "sealed")
    case "$sealed_val" in
        true|True|TRUE|1) VAULT_SEALED=1 ;;
        *) VAULT_SEALED=0 ;;
    esac

    if [ "$VAULT_SEALED" -gt 0 ]; then
        if [ -n "$UNSEAL_KEY1" ]; then
            log_info "Vault is sealed - unsealing..."
            vault operator unseal "$UNSEAL_KEY1" >/dev/null 2>&1 || {
                log_warn "Unseal with key 1 failed, trying remaining keys..."
                vault operator unseal "$UNSEAL_KEY2" >/dev/null 2>&1 || true
                vault operator unseal "$UNSEAL_KEY3" >/dev/null 2>&1 || true
            }
        else
            log_warn "Vault sealed but no unseal key available. Cannot auto-unseal."
        fi
    fi

else
    # =================================================================
    # FIRST-TIME INITIALIZATION PATH
    # =================================================================

    init_vault

    ROOT_TOKEN=$(extract_root_token)
    [ -n "$ROOT_TOKEN" ] || { log_error "Missing root token after init"; exit 1; }

    export VAULT_TOKEN="$ROOT_TOKEN"

    # Unseal with 3 different keys
    unseal_vault

    # Enable KV v2 secrets engine at 'secret/'
    log_info "Enabling KV v2 secrets engine at 'secret/' ..."
    vault secrets enable -path=secret kv-v2 2>/dev/null || {
        log_info "KV v2 engine may already be enabled - continuing..."
    }
fi

# --- Verify Vault is unsealed and we have a valid token ----------------------
log_info "Verifying Vault status..."
if ! vault status >/dev/null 2>&1; then
    log_error "Cannot connect to Vault with current token."
    exit 1
fi

SEALED_CHECK=$(vault status -format=json 2>/dev/null | json_extract_bool "sealed" || true)
case "$SEALED_CHECK" in
    true|True|TRUE|1)
        log_error "Vault is still sealed after unseal attempts."
        exit 1
        ;;
esac

log_info "Vault is unsealed and token is valid."

# =============================================================================
# READ ALL SECRETS FROM BOOTSTRAP .ENV FILE
# =============================================================================

log_info "Reading secrets from bootstrap file: $BOOTSTRAP_SECRETS_FILE"

if [ ! -f "$BOOTSTRAP_SECRETS_FILE" ]; then
    log_error "Bootstrap secrets file not found: $BOOTSTRAP_SECRETS_FILE"
    exit 1
fi

# --- Core infrastructure secrets ---------------------------------------------
secret_key=$(get_flat_val secret_key "$BOOTSTRAP_SECRETS_FILE")
postgres_password=$(get_flat_val postgres_password "$BOOTSTRAP_SECRETS_FILE")
redis_url=$(get_flat_val redis_url "$BOOTSTRAP_SECRETS_FILE")
celery_broker_url=$(get_flat_val celery_broker_url "$BOOTSTRAP_SECRETS_FILE")
celery_result_backend=$(get_flat_val celery_result_backend "$BOOTSTRAP_SECRETS_FILE")
minio_access_key=$(get_flat_val minio_access_key "$BOOTSTRAP_SECRETS_FILE")
minio_secret_key=$(get_flat_val minio_secret_key "$BOOTSTRAP_SECRETS_FILE")
jwt_secret_key=$(get_flat_val jwt_secret_key "$BOOTSTRAP_SECRETS_FILE")
pass_hmac_secret=$(get_flat_val pass_hmac_secret "$BOOTSTRAP_SECRETS_FILE")
flower_basic_auth=$(get_flat_val flower_basic_auth "$BOOTSTRAP_SECRETS_FILE")
whatsapp_bridge_api_key=$(get_flat_val whatsapp_bridge_api_key "$BOOTSTRAP_SECRETS_FILE")
grafana_admin_password=$(get_flat_val grafana_admin_password "$BOOTSTRAP_SECRETS_FILE")

# --- Fallbacks for generated values ------------------------------------------
[ -n "$flower_basic_auth" ]          || flower_basic_auth=$(generate_basic_auth)
[ -n "$whatsapp_bridge_api_key" ]    || whatsapp_bridge_api_key=$(generate_secret)
[ -n "$grafana_admin_password" ]     || grafana_admin_password=$(generate_secret)

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
# SEED ALL SECRETS INTO VAULT (single atomic vault kv put)
# =============================================================================

seed_secrets

# --- Verify by spot-checking critical secrets --------------------------------
for check_key in secret_key postgres_password redis_url jwt_secret_key; do
    if ! vault kv get -mount=secret -field="$check_key" "$VAULT_APP_SECRET_PATH" >/dev/null 2>&1; then
        log_error "Verification failed: $check_key not found in Vault"
        exit 1
    fi
done
log_info "Verification passed: critical secrets confirmed in Vault"

if [ "$SECRETS_WRITTEN" -lt 10 ]; then
    log_error "Only $SECRETS_WRITTEN secrets written to Vault - expected 10+. Something went wrong."
    exit 1
fi

log_info "Verified: $SECRETS_WRITTEN secrets stored in Vault at secret/$VAULT_APP_SECRET_PATH"

# =============================================================================
# WRITE DEFAULT/FEATURE TOGGLE VALUES (idempotent - only if missing)
# =============================================================================

log_info "Setting default feature toggle values..."

set_default_if_missing() {
    key="$1"
    default_value="$2"
    current=$(vault kv get -mount=secret -field="$key" "$VAULT_APP_SECRET_PATH" 2>/dev/null || true)
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

write_runtime_files

# =============================================================================
# CREATE APP POLICY AND TOKEN
# =============================================================================

create_policy_and_token

# --- Cleanup sensitive temp files --------------------------------------------
rm -f /tmp/vault_secrets_payload.json \
    /tmp/seal_status.json \
    /tmp/vault_status_final.json \
    /tmp/vault_put_error.log \
    /tmp/vault_secrets_flat.env

log_info "============================================================"
log_info "VAULT INITIALIZATION COMPLETE"
log_info "============================================================"
log_info "Secrets stored: $SECRETS_WRITTEN at secret/$VAULT_APP_SECRET_PATH"
log_info "App policy: loyallia-app (read-only)"
log_info "App token: /vault/runtime/app-token"
log_info "Runtime files: /vault/runtime/"
log_info "============================================================"

exit 0
