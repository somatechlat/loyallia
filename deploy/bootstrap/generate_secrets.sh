#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_FILE="${BOOTSTRAP_SECRETS_FILE:-$PROJECT_ROOT/.bootstrap_secrets}"
AGE_KEY_DIR="$PROJECT_ROOT/.age_keys"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[bootstrap]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err() { echo -e "${RED}[error]${NC} $*" >&2; }

generate_secret() {
    python3 -c "import secrets; print(secrets.token_urlsafe(${1:-32}), end='')"
}

generate_django_secret_key() {
    python3 -c "
import secrets
chars = 'abcdefghijklmnopqrstuvwxyz0123456789!@#%^&*(-_=+)'
print(''.join(secrets.choice(chars) for _ in range(64)), end='')
"
}

generate_postgres_password() {
    python3 -c "
import secrets
import string
chars = string.ascii_letters + string.digits
print(''.join(secrets.choice(chars) for _ in range(40)), end='')
"
}

generate_redis_password() {
    python3 -c "
import secrets
import string
chars = string.ascii_lowercase + string.digits
print(''.join(secrets.choice(chars) for _ in range(24)), end='')
"
}

generate_age_keypair() {
    mkdir -p "$AGE_KEY_DIR"

    local private_key_path="$AGE_KEY_DIR/loyallia_age_private_key.txt"
    local public_key_path="$AGE_KEY_DIR/loyallia_age_public_key.txt"

    age-keygen -o "$private_key_path" 2>/dev/null

    if [ ! -f "$private_key_path" ]; then
        err "age-keygen failed. Is age installed?"
        err "Install: brew install age (macOS) or apt install age (Linux)"
        exit 1
    fi

    chmod 0400 "$private_key_path"

    grep "^# public key:" "$private_key_path" | sed 's/# public key: //' > "$public_key_path" || true

    if [ ! -s "$public_key_path" ]; then
        head -1 "$private_key_path" | sed 's/.*\(age1[a-z0-9]\{58\}\)/\1/' > "$public_key_path" 2>/dev/null || true
    fi

    if [ ! -s "$public_key_path" ]; then
        warn "Could not extract public key automatically."
        warn "Extract manually from: cat $private_key_path | grep 'public key'"
    fi

    chmod 0444 "$public_key_path"

    echo "$private_key_path"
}

main() {
    log "Generating all Loyallia secrets..."
    echo ""

    echo "# Loyallia Bootstrap Secrets" > "$OUTPUT_FILE"
    echo "# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$OUTPUT_FILE"
    echo "# WARNING: This file contains secrets. Delete after successful bootstrap." >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"

    local SECRET_KEY
    SECRET_KEY="$(generate_django_secret_key)"
    echo "_SECRET_KEY=${SECRET_KEY}" >> "$OUTPUT_FILE"
    log "Django SECRET_KEY generated"

    local POSTGRES_PASSWORD
    POSTGRES_PASSWORD="$(generate_postgres_password)"
    echo "_POSTGRES_PASSWORD=${POSTGRES_PASSWORD}" >> "$OUTPUT_FILE"
    log "PostgreSQL password generated"

    local REDIS_PASSWORD
    REDIS_PASSWORD="$(generate_redis_password)"
    echo "_REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0" >> "$OUTPUT_FILE"
    echo "_CELERY_BROKER_URL=redis://:${REDIS_PASSWORD}@redis:6379/1" >> "$OUTPUT_FILE"
    echo "_CELERY_RESULT_BACKEND=redis://:${REDIS_PASSWORD}@redis:6379/2" >> "$OUTPUT_FILE"
    log "Redis passwords generated"

    local MINIO_ROOT_USER
    MINIO_ROOT_USER="loyallia-$(python3 -c "import secrets; print(secrets.token_hex(4), end='')")"
    local MINIO_ROOT_PASSWORD
    MINIO_ROOT_PASSWORD="$(generate_secret 32)"
    echo "_MINIO_ROOT_USER=${MINIO_ROOT_USER}" >> "$OUTPUT_FILE"
    echo "_MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}" >> "$OUTPUT_FILE"
    log "MinIO credentials generated"

    local JWT_SECRET_KEY
    JWT_SECRET_KEY="$(generate_secret 48)"
    echo "_JWT_SECRET_KEY=${JWT_SECRET_KEY}" >> "$OUTPUT_FILE"
    log "JWT secret key generated"

    local PASS_HMAC_SECRET
    PASS_HMAC_SECRET="$(generate_secret 32)"
    echo "_PASS_HMAC_SECRET=${PASS_HMAC_SECRET}" >> "$OUTPUT_FILE"
    log "Pass HMAC secret generated"

    local FLOWER_USER FLOWER_PASS
    FLOWER_USER="loyallia"
    FLOWER_PASS="$(generate_secret 16)"
    echo "_FLOWER_BASIC_AUTH=${FLOWER_USER}:${FLOWER_PASS}" >> "$OUTPUT_FILE"
    log "Flower basic auth generated"

    echo "" >> "$OUTPUT_FILE"
    echo "# Feature toggles — set manually after bootstrap:" >> "$OUTPUT_FILE"
    echo "# _GOOGLE_WALLET_ENABLED=true" >> "$OUTPUT_FILE"
    echo "# _APPLE_WALLET_ENABLED=false" >> "$OUTPUT_FILE"
    echo "# _GOOGLE_OAUTH_CLIENT_ID=<from-google-cloud-console>" >> "$OUTPUT_FILE"
    echo "# _GOOGLE_OAUTH_CLIENT_SECRET=<from-google-cloud-console>" >> "$OUTPUT_FILE"
    echo "# _MAILJET_API_KEY=<from-mailjet>" >> "$OUTPUT_FILE"
    echo "# _TWILIO_ACCOUNT_SID=<from-twilio>" >> "$OUTPUT_FILE"
    echo "# etc." >> "$OUTPUT_FILE"

    chmod 0600 "$OUTPUT_FILE"
    log "Secrets written to: $OUTPUT_FILE (permissions: 600)"

    echo ""
    log "Generating age key pair for backup encryption..."
    echo ""

    if command -v age-keygen &>/dev/null; then
        local private_key_path
        private_key_path="$(generate_age_keypair)"

        local public_key_path="$AGE_KEY_DIR/loyallia_age_public_key.txt"
        local age_pubkey
        age_pubkey="$(cat "$public_key_path" 2>/dev/null || echo "unknown")"

        echo "_AGE_PUBLIC_KEY=${age_pubkey}" >> "$OUTPUT_FILE"

        log "Age key pair generated:"
        log "  Private key: ${private_key_path}"
        log "  Public key:  ${public_key_path}"
        echo ""
        warn "╔══════════════════════════════════════════════════════════════════╗"
        warn "║  CRITICAL: Store the PRIVATE key OFFLINE now!                  ║"
        warn "║  Without it, encrypted backups CANNOT be decrypted.            ║"
        warn "║                                                               ║"
        warn "║  Private key: ${private_key_path}  ║"
        warn "║                                                               ║"
        warn "║  Save to: USB drive, password manager, or secure vault         ║"
        warn "║  Then DELETE from server after confirming backup works!        ║"
        warn "╚══════════════════════════════════════════════════════════════════╝"
    else
        warn "age not installed. Install it for backup encryption:"
        warn "  Linux:  apt install age"
        warn "  macOS:  brew install age"
        warn "  Manual: https://age-encryption.org/"
    fi

    echo ""
    log "╔══════════════════════════════════════════════════════════════════════╗"
    log "║  BOOTSTRAP SECRETS GENERATED                                       ║"
    log "║                                                                     ║"
    log "║  Next step: Run bootstrap.sh to start the full bootstrap sequence   ║"
    log "║  OR manually: source .bootstrap_secrets && docker compose up -d     ║"
    log "║                                                                     ║"
    log "║  CRITICAL: After Vault initializes, BACK UP init.json:              ║"
    log "║    docker cp loyallia-vault:/vault/file/init.json .agents/          ║"
    log "║                                                                     ║"
    log "║  CRITICAL: Delete .bootstrap_secrets after Vault is seeded:          ║"
    log "║    rm -f .bootstrap_secrets                                         ║"
    log "╚══════════════════════════════════════════════════════════════════════╝"
}

main
