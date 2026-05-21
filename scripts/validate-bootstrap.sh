#!/bin/bash
set -euo pipefail

# =============================================================================
# LOYALLIA BOOTSTRAP PRE-FLIGHT VALIDATION
# =============================================================================
# Run this BEFORE first `docker compose up` to catch missing credentials
# and common misconfigurations that cause silent failures.
#
# Usage:
#   ./scripts/validate-bootstrap.sh
#
# Exit codes:
#   0 = all checks passed
#   1 = critical missing secrets or misconfiguration detected
# =============================================================================

BOOTSTRAP_FILE="${BOOTSTRAP_FILE:-.bootstrap_secrets.env}"
EXIT_CODE=0

log_ok()  { echo "  ✅  $*"; }
log_warn() { echo "  ⚠️   $*"; }
log_err() { echo "  ❌  $*"; EXIT_CODE=1; }

echo "============================================================"
echo "Loyallia Bootstrap Pre-Flight Validation"
echo "============================================================"

# --- 1. Bootstrap file exists and is readable -------------------------------
if [ ! -f "$BOOTSTRAP_FILE" ]; then
    log_err "Bootstrap secrets file not found: $BOOTSTRAP_FILE"
    log_err "  Copy .bootstrap_secrets.env.example or create from template."
    exit 1
fi
log_ok "Bootstrap file found: $BOOTSTRAP_FILE"

# --- 2. Check for _b64 suffixed keys that lack plain key counterparts -------
echo ""
echo "Checking _b64 encoded keys..."
while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ""|\#*) continue ;; esac
    key=$(printf "%s" "$line" | cut -d= -f1)
    case "$key" in *_b64) ;; *) continue ;; esac
    base_key="${key%_b64}"
    if ! grep -q "^${base_key}=" "$BOOTSTRAP_FILE" 2>/dev/null; then
        # Verify the _b64 value is actually valid base64
        val=$(printf "%s" "$line" | cut -d= -f2-)
        if ! printf "%s" "$val" | base64 -d >/dev/null 2>&1; then
            log_err "Invalid base64 value for ${key}"
        else
            log_ok "${base_key} will be decoded from ${key}"
        fi
    fi
done < "$BOOTSTRAP_FILE"

# --- 3. Critical secrets present --------------------------------------------
echo ""
echo "Checking critical secrets..."

REQUIRED_KEYS=(
    secret_key
    postgres_password
    redis_url
    celery_broker_url
    celery_result_backend
    minio_access_key
    minio_secret_key
    jwt_secret_key
    pass_hmac_secret
)

for key in "${REQUIRED_KEYS[@]}"; do
    val=$(grep "^${key}=" "$BOOTSTRAP_FILE" 2>/dev/null | cut -d= -f2- || true)
    if [ -z "$val" ]; then
        log_err "Missing required secret: ${key}"
    else
        log_ok "${key} is present"
    fi
done

# --- 4. Wallet credentials (warn if missing, not error) ---------------------
echo ""
echo "Checking wallet credentials..."

WALLET_KEYS=(
    apple_cert_pem
    apple_cert_key_pem
    apple_wwdr_cert_pem
    google_service_account_json
)

for key in "${WALLET_KEYS[@]}"; do
    # Check plain key or _b64 variant
    if grep -q "^${key}=" "$BOOTSTRAP_FILE" 2>/dev/null || \
       grep -q "^${key}_b64=" "$BOOTSTRAP_FILE" 2>/dev/null; then
        log_ok "${key} is present"
    else
        log_warn "${key} is missing (Apple/Google Wallet will show missing_credentials)"
    fi
done

# --- 5. Mailjet credentials -------------------------------------------------
echo ""
echo "Checking Mailjet credentials..."
if grep -q "^mailjet_api_key=" "$BOOTSTRAP_FILE" 2>/dev/null && \
   grep -q "^mailjet_secret_key=" "$BOOTSTRAP_FILE" 2>/dev/null; then
    log_ok "Mailjet API credentials are present"
else
    log_warn "Mailjet API credentials missing (mass email will be disabled)"
fi

# --- 6. TLS certificates for Vault ------------------------------------------
echo ""
echo "Checking Vault TLS certificates..."
if [ -f "certs/vault.crt" ] && [ -f "certs/vault.key" ]; then
    log_ok "Vault TLS certificates found in certs/"
else
    log_warn "Vault TLS certs not found in certs/ (will generate self-signed on first start)"
fi

# --- 7. File permissions ----------------------------------------------------
echo ""
echo "Checking file permissions..."
for file in "$BOOTSTRAP_FILE" "certs/vault.key" 2>/dev/null; do
    if [ -f "$file" ]; then
        perms=$(stat -c "%a" "$file" 2>/dev/null || stat -f "%Lp" "$file" 2>/dev/null)
        if [ "$perms" = "600" ] && [ "$file" = "certs/vault.key" ]; then
            log_warn "${file} has 600 permissions — Vault container may not be able to read it"
            log_warn "  Fix: chmod 644 ${file}  (readable by container non-root user)"
        fi
    fi
done

# --- Summary ----------------------------------------------------------------
echo ""
echo "============================================================"
if [ "$EXIT_CODE" -eq 0 ]; then
    echo "✅  All critical checks passed. Ready to bootstrap."
else
    echo "❌  Critical issues found. Fix them before running docker compose up."
fi
echo "============================================================"
exit "$EXIT_CODE"
