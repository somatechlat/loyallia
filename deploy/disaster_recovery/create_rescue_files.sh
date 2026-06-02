#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════════
# LOYALLIA — CREATE DISASTER RECOVERY RESCUE FILES
# Generates all rescue files needed by recover_from_rescue.sh
# ═══════════════════════════════════════════════════════════════════════════════
#
# Usage:
#   ./create_rescue_files.sh              # Auto-detect environment
#   ./create_rescue_files.sh --dev        # Force development mode
#   ./create_rescue_files.sh --prod       # Force production mode
#
# Generated files in .agents/:
#   vault_init_rescue.json              — Vault unseal key + root token
#   vault_secrets_rescue.json           — All secrets from Vault KV
#   pg_dump_rescue_YYYYMMDD.dump        — PostgreSQL logical dump
#   certs_rescue_YYYYMMDD.txt           — Apple certs + Google SA JSON
#   vault_runtime_rescue_YYYYMMDD.txt   — All runtime files + Vault TLS
#   redis_rescue_YYYYMMDD.rdb           — Redis cache snapshot (optional)
#
# ═══════════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RESCUE_DIR="$PROJECT_ROOT/.agents"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()   { echo -e "${GREEN}[rescue]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $*"; }
err()   { echo -e "${RED}[error]${NC} $*" >&2; }
step()  { echo ""; echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"; echo -e "${CYAN}  STEP $1${NC}"; echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"; }

# ─────────────────────────────────────────────────────────────────────────────
# Environment detection
# ─────────────────────────────────────────────────────────────────────────────

ENVIRONMENT=""
FORCE_ENV=""

for arg in "$@"; do
    case "$arg" in
        --dev)   FORCE_ENV="development" ;;
        --prod)  FORCE_ENV="production"  ;;
    esac
done

detect_environment() {
    if [ -n "$FORCE_ENV" ]; then
        ENVIRONMENT="$FORCE_ENV"
        log "Environment forced: $ENVIRONMENT"
        return
    fi

    if [ -f "$PROJECT_ROOT/docker-compose.prod.yml" ]; then
        if [ -n "${COMPOSE_FILE:-}" ] && echo "$COMPOSE_FILE" | grep -q "prod"; then
            ENVIRONMENT="production"
        else
            ENVIRONMENT="development"
        fi
    else
        ENVIRONMENT="development"
    fi

    log "Detected environment: $ENVIRONMENT"
}

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

configure() {
    PROJECT_NAME="${COMPOSE_PROJECT_NAME:-loyallia}"
    DATESTAMP="$(date +%Y%m%d)"

    if [ "$ENVIRONMENT" = "production" ]; then
        COMPOSE_CMD="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
    else
        COMPOSE_CMD="docker compose"
    fi

    VAULT_CONTAINER="${PROJECT_NAME}-vault"
    API_CONTAINER="${PROJECT_NAME}-api"
    REDIS_CONTAINER="${PROJECT_NAME}-redis"
    POSTGRES_CONTAINER="${PROJECT_NAME}-postgres"

    if [ -f "$PROJECT_ROOT/.env" ]; then
        POSTGRES_USER="$(grep '^POSTGRES_USER=' "$PROJECT_ROOT/.env" 2>/dev/null | cut -d= -f2 || echo "loyallia")"
        POSTGRES_DB="$(grep '^POSTGRES_DB=' "$PROJECT_ROOT/.env" 2>/dev/null | cut -d= -f2 || echo "")"
        VAULT_SECRET_PATH="$(grep '^VAULT_SECRET_PATH=' "$PROJECT_ROOT/.env" 2>/dev/null | cut -d= -f2 || echo "")"
    else
        POSTGRES_USER="loyallia"
        POSTGRES_DB="loyallia"
        VAULT_SECRET_PATH=""
    fi

    POSTGRES_USER="${POSTGRES_USER:-loyallia}"
    if [ "$ENVIRONMENT" = "production" ]; then
        POSTGRES_DB="${POSTGRES_DB:-loyallia}"
    else
        POSTGRES_DB="${POSTGRES_DB:-loyallia_dev}"
    fi
    # Vault path format: secret/data/loyallia/<env> → mount=secret, path=loyallia/<env>
    VAULT_SECRET_PATH="${VAULT_SECRET_PATH:-secret/data/loyallia/${ENVIRONMENT}}"

    VAULT_KV_MOUNT="$(echo "$VAULT_SECRET_PATH" | cut -d/ -f1)"
    # Strip mount and /data/ prefix: secret/data/loyallia/production → loyallia/production
    VAULT_KV_PATH="$(echo "$VAULT_SECRET_PATH" | sed 's|^[^/]*/data/||')"

    log "Configuration:"
    log "  Project:     $PROJECT_NAME"
    log "  Environment: $ENVIRONMENT"
    log "  Compose:     $COMPOSE_CMD"
    log "  Datestamp:   $DATESTAMP"
    log "  Database:    $POSTGRES_USER@$POSTGRES_DB"
    log "  Vault path:  $VAULT_KV_MOUNT/$VAULT_KV_PATH"
}

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

require_container() {
    local name="$1"
    if ! docker ps --format '{{.Names}}' | grep -q "^${name}$"; then
        err "Container '$name' is not running. Start the stack first:"
        err "  $COMPOSE_CMD up -d"
        exit 1
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Step 1 — Vault init + secrets
# ─────────────────────────────────────────────────────────────────────────────

export_vault_init() {
    step "1/6 — Exporting Vault init.json"

    require_container "$VAULT_CONTAINER"

    docker cp "${VAULT_CONTAINER}:/vault/file/init.json" "$RESCUE_DIR/vault_init_rescue.json" 2>/dev/null || {
        err "Failed to copy init.json from Vault container."
        exit 1
    }
    chmod 0600 "$RESCUE_DIR/vault_init_rescue.json"

    local size
    size="$(wc -c < "$RESCUE_DIR/vault_init_rescue.json" | tr -d ' ')"
    log "Saved: vault_init_rescue.json ($size bytes)"
}

export_vault_secrets() {
    step "2/6 — Exporting Vault secrets"

    require_container "$VAULT_CONTAINER"

    local root_token
    root_token="$(docker exec "$VAULT_CONTAINER" sh -c 'cat /vault/file/init.json' | python3 -c 'import json,sys; print(json.load(sys.stdin)["root_token"])')"

    docker exec -e VAULT_TOKEN="$root_token" -e VAULT_ADDR=https://127.0.0.1:8200 -e VAULT_SKIP_VERIFY=true "$VAULT_CONTAINER" \
        vault kv get -mount="$VAULT_KV_MOUNT" -format=json "$VAULT_KV_PATH" \
        > "$RESCUE_DIR/vault_secrets_rescue.json" 2>/dev/null || {
        err "Failed to export Vault secrets."
        exit 1
    }
    chmod 0600 "$RESCUE_DIR/vault_secrets_rescue.json"

    local key_count
    key_count="$(python3 -c "
import json
with open('$RESCUE_DIR/vault_secrets_rescue.json') as f:
    data = json.load(f)
secrets = data.get('data', {}).get('data', {})
print(len(secrets))
" 2>/dev/null || echo "0")"

    log "Saved: vault_secrets_rescue.json ($key_count secrets)"
}

# ─────────────────────────────────────────────────────────────────────────────
# Step 3 — PostgreSQL dump
# ─────────────────────────────────────────────────────────────────────────────

export_postgresql() {
    step "3/6 — Creating PostgreSQL dump"

    require_container "$POSTGRES_CONTAINER"

    local dump_file="$RESCUE_DIR/pg_dump_rescue_${DATESTAMP}.dump"

    log "Running pg_dump (custom format)..."
    $COMPOSE_CMD exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$dump_file" 2>/dev/null || {
        err "pg_dump failed. Is PostgreSQL healthy?"
        exit 1
    }

    chmod 0600 "$dump_file"
    local size
    size="$(wc -c < "$dump_file" | tr -d ' ')"
    log "Saved: pg_dump_rescue_${DATESTAMP}.dump ($size bytes)"
}

# ─────────────────────────────────────────────────────────────────────────────
# Step 4 — Certificates
# ─────────────────────────────────────────────────────────────────────────────

export_certs() {
    step "4/6 — Packaging certificates"

    local certs_dir="$PROJECT_ROOT/certs"
    local certs_rescue="$RESCUE_DIR/certs_rescue_${DATESTAMP}.txt"

    if [ ! -d "$certs_dir" ]; then
        warn "No certs/ directory found. Skipping certificate rescue."
        return
    fi

    > "$certs_rescue"

    local cert_files=(
        "apple_pass_new.key"
        "passNew.pem"
        "AppleWWDRCAG4.pem"
        "loyalliarewardswallet-583035a5d1f7.json"
    )

    local found=0
    for f in "${cert_files[@]}"; do
        if [ -f "$certs_dir/$f" ]; then
            echo "=== $f ===" >> "$certs_rescue"
            cat "$certs_dir/$f" >> "$certs_rescue"
            echo "" >> "$certs_rescue"
            found=$((found + 1))
        fi
    done

    if [ "$found" -eq 0 ]; then
        warn "No certificate files found in certs/."
        rm -f "$certs_rescue"
        return
    fi

    chmod 0600 "$certs_rescue"
    local size
    size="$(wc -c < "$certs_rescue" | tr -d ' ')"
    log "Saved: certs_rescue_${DATESTAMP}.txt ($found certs, $size bytes)"
}

# ─────────────────────────────────────────────────────────────────────────────
# Step 5 — Runtime secrets + Vault TLS
# ─────────────────────────────────────────────────────────────────────────────

export_runtime_files() {
    step "5/6 — Exporting runtime secret files + Vault TLS"

    local runtime_rescue="$RESCUE_DIR/vault_runtime_rescue_${DATESTAMP}.txt"

    > "$runtime_rescue"
    {
        echo "# ====================================================================="
        echo "# LOYALLIA — VAULT RUNTIME SECRETS RESCUE FILE"
        echo "# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
        echo "# Environment: $ENVIRONMENT"
        echo "# System: $PROJECT_NAME"
        echo "# ====================================================================="
        echo ""
    } >> "$runtime_rescue"

    # Runtime files from API container
    local runtime_files=(
        app-token ca.crt celery_broker_url celery_result_backend
        flower_basic_auth grafana_admin_password jwt_secret_key
        loyallia-app.hcl minio_root_password minio_root_user
        pass_hmac_secret postgres_password redis_password redis_url
        secret_key whatsapp_bridge_api_key
    )

    local found=0
    for f in "${runtime_files[@]}"; do
        if docker exec "$API_CONTAINER" test -f "/run/loyallia-vault/$f" 2>/dev/null; then
            echo "=== $f ===" >> "$runtime_rescue"
            docker exec "$API_CONTAINER" cat "/run/loyallia-vault/$f" >> "$runtime_rescue" 2>/dev/null
            echo "" >> "$runtime_rescue"
            found=$((found + 1))
        fi
    done

    # Vault TLS certs
    if docker exec "$VAULT_CONTAINER" test -f "/vault/certs/vault.crt" 2>/dev/null; then
        echo "=== vault.crt ===" >> "$runtime_rescue"
        docker exec "$VAULT_CONTAINER" cat "/vault/certs/vault.crt" >> "$runtime_rescue"
        echo "" >> "$runtime_rescue"
        found=$((found + 1))
    fi

    if docker exec "$VAULT_CONTAINER" test -f "/vault/certs/vault.key" 2>/dev/null; then
        echo "=== vault.key ===" >> "$runtime_rescue"
        docker exec "$VAULT_CONTAINER" cat "/vault/certs/vault.key" >> "$runtime_rescue"
        echo "" >> "$runtime_rescue"
        found=$((found + 1))
    fi

    # Vault config
    if docker exec "$VAULT_CONTAINER" test -f "/vault/config/vault.hcl" 2>/dev/null; then
        echo "=== vault.hcl ===" >> "$runtime_rescue"
        docker exec "$VAULT_CONTAINER" cat "/vault/config/vault.hcl" >> "$runtime_rescue"
        echo "" >> "$runtime_rescue"
        found=$((found + 1))
    fi

    # Checksums
    {
        echo "=== CHECKSUMS ==="
        echo "SHA256: $(shasum -a 256 "$runtime_rescue" | awk '{print $1}')"
        echo "Sections: $(grep -c '^===' "$runtime_rescue")"
    } >> "$runtime_rescue"

    chmod 0600 "$runtime_rescue"
    local size
    size="$(wc -c < "$runtime_rescue" | tr -d ' ')"
    log "Saved: vault_runtime_rescue_${DATESTAMP}.txt ($found files, $size bytes)"
}

# ─────────────────────────────────────────────────────────────────────────────
# Step 6 — Redis RDB
# ─────────────────────────────────────────────────────────────────────────────

export_redis() {
    step "6/6 — Exporting Redis RDB"

    if ! docker ps --format '{{.Names}}' | grep -q "^${REDIS_CONTAINER}$"; then
        warn "Redis container not running. Skipping Redis rescue."
        return
    fi

    log "Triggering BGSAVE..."
    docker exec "$REDIS_CONTAINER" redis-cli BGSAVE >/dev/null 2>&1 || true
    sleep 3

    local rdb_file="$RESCUE_DIR/redis_rescue_${DATESTAMP}.rdb"
    docker exec "$REDIS_CONTAINER" sh -c 'cat /data/dump.rdb' > "$rdb_file" 2>/dev/null || {
        warn "Failed to export Redis RDB."
        rm -f "$rdb_file"
        return
    }

    chmod 0600 "$rdb_file"
    local size
    size="$(wc -c < "$rdb_file" | tr -d ' ')"
    log "Saved: redis_rescue_${DATESTAMP}.rdb ($size bytes)"
}

# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

main() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║   LOYALLIA — CREATE DISASTER RECOVERY RESCUE FILES            ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    detect_environment
    configure

    mkdir -p "$RESCUE_DIR"
    chmod 0700 "$RESCUE_DIR"

    export_vault_init
    export_vault_secrets
    export_postgresql
    export_certs
    export_runtime_files
    export_redis

    echo ""
    log "╔══════════════════════════════════════════════════════════════════════╗"
    log "║  RESCUE FILES CREATED                                               ║"
    log "║                                                                     ║"
    log "║  All files saved to: $RESCUE_DIR"
    log "║                                                                     ║"
    log "║  CRITICAL: Store vault_init_rescue.json OFFLINE (USB, password      ║"
    log "║  manager). Without it, Vault cannot be unsealed.                    ║"
    log "╚══════════════════════════════════════════════════════════════════════╝"
    echo ""
    ls -lh "$RESCUE_DIR"
}

main "$@"
