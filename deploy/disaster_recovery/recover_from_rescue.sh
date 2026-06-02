#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════════
# LOYALLIA — DISASTER RECOVERY FROM RESCUE FILES
# Recovers from total Docker cluster loss in either development or production.
# ═══════════════════════════════════════════════════════════════════════════════
#
# Usage:
#   ./recover_from_rescue.sh              # Auto-detect environment
#   ./recover_from_rescue.sh --dev        # Force development mode
#   ./recover_from_rescue.sh --prod       # Force production mode
#
# Required files in .agents/:
#   vault_init_rescue.json              — Vault unseal key + root token
#   vault_secrets_rescue.json           — All production secrets
#   pg_dump_rescue_YYYYMMDD.dump        — PostgreSQL database dump (latest)
#   certs_rescue_YYYYMMDD.txt           — Apple certs + Google SA JSON (latest)
#   vault_runtime_rescue_YYYYMMDD.txt   — Runtime secret files + Vault TLS (latest)
#
# Optional:
#   redis_rescue_YYYYMMDD.rdb           — Redis cache snapshot
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

log()   { echo -e "${GREEN}[recover]${NC} $*"; }
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

    # Detect by checking if production compose override exists and .env hints
    if [ -f "$PROJECT_ROOT/docker-compose.prod.yml" ]; then
        # Check if COMPOSE_FILE env var or active containers suggest prod
        if [ -n "${COMPOSE_FILE:-}" ] && echo "$COMPOSE_FILE" | grep -q "prod"; then
            ENVIRONMENT="production"
        elif docker ps --format '{{.Names}}' 2>/dev/null | grep -qE "${COMPOSE_PROJECT_NAME:-loyallia}.*-prod"; then
            ENVIRONMENT="production"
        else
            # Default to dev if no production indicators found
            ENVIRONMENT="development"
        fi
    else
        ENVIRONMENT="development"
    fi

    log "Detected environment: $ENVIRONMENT"
}

# ─────────────────────────────────────────────────────────────────────────────
# Configuration (environment-aware)
# ─────────────────────────────────────────────────────────────────────────────

configure() {
    PROJECT_NAME="${COMPOSE_PROJECT_NAME:-loyallia}"

    # Docker compose command
    if [ "$ENVIRONMENT" = "production" ]; then
        COMPOSE_CMD="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
        PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://rewards.loyallia.com}"
        API_HEALTH_URL="http://localhost:8000/api/v1/health/"
        PUBLIC_API_PORT="443"
        PUBLIC_WEB_PORT="443"
    else
        COMPOSE_CMD="docker compose"
        PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-http://localhost}"
        API_HEALTH_URL="http://localhost:8000/api/v1/health/"
        PUBLIC_API_PORT="${PUBLIC_API_PORT:-33905}"
        PUBLIC_WEB_PORT="${PUBLIC_WEB_PORT:-33906}"
    fi

    # Container names (derived from project name)
    VAULT_CONTAINER="${PROJECT_NAME}-vault"

    # Database settings (read from .env or use defaults)
    if [ -f "$PROJECT_ROOT/.env" ]; then
        POSTGRES_USER="$(grep '^POSTGRES_USER=' "$PROJECT_ROOT/.env" 2>/dev/null | cut -d= -f2 || echo "loyallia")"
        POSTGRES_DB="$(grep '^POSTGRES_DB=' "$PROJECT_ROOT/.env" 2>/dev/null | cut -d= -f2 || echo "")"
        VAULT_SECRET_PATH="$(grep '^VAULT_SECRET_PATH=' "$PROJECT_ROOT/.env" 2>/dev/null | cut -d= -f2 || echo "")"
    else
        POSTGRES_USER=""
        POSTGRES_DB=""
        VAULT_SECRET_PATH=""
    fi

    # Clean defaults if empty, respecting detected environment
    POSTGRES_USER="${POSTGRES_USER:-loyallia}"
    if [ "$ENVIRONMENT" = "production" ]; then
        POSTGRES_DB="${POSTGRES_DB:-loyallia}"
    else
        POSTGRES_DB="${POSTGRES_DB:-loyallia_dev}"
    fi
    VAULT_SECRET_PATH="${VAULT_SECRET_PATH:-secret/data/loyallia/${ENVIRONMENT}}"

    # Extract KV mount and path for vault CLI
    # VAULT_SECRET_PATH like "secret/data/loyallia/production" → mount="secret", path="loyallia/production"
    VAULT_KV_MOUNT="$(echo "$VAULT_SECRET_PATH" | cut -d/ -f1)"
    VAULT_KV_PATH="$(echo "$VAULT_SECRET_PATH" | sed 's|^[^/]*/data/||')"

    # Find latest rescue files by date
    local latest_date
    latest_date="$(ls -1 "$RESCUE_DIR"/pg_dump_rescue_*.dump 2>/dev/null | sed 's/.*rescue_\([0-9]*\).*/\1/' | sort -r | head -1)"
    if [ -z "$latest_date" ]; then
        latest_date="20260512"
        warn "No dated rescue dumps found. Falling back to $latest_date."
    fi
    RESCUE_DATE="$latest_date"

    log "Configuration:"
    log "  Project name:   $PROJECT_NAME"
    log "  Environment:    $ENVIRONMENT"
    log "  Compose cmd:    $COMPOSE_CMD"
    log "  Vault container: $VAULT_CONTAINER"
    log "  Database:       $POSTGRES_USER@$POSTGRES_DB"
    log "  Vault KV path:  $VAULT_KV_MOUNT/$VAULT_KV_PATH"
    log "  Rescue date:    $RESCUE_DATE"
}

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

require_rescue_file() {
    local file="$1"
    local desc="$2"
    if [ ! -f "$RESCUE_DIR/$file" ]; then
        err "Missing rescue file: $file ($desc)"
        err "Expected at: $RESCUE_DIR/$file"
        err "Without this file, recovery cannot proceed."
        exit 1
    fi
    log "Found: $file ($desc)"
}

# ─────────────────────────────────────────────────────────────────────────────
# Step 1 — Prerequisites
# ─────────────────────────────────────────────────────────────────────────────

check_prerequisites() {
    step "1/9 — Checking prerequisites"

    if ! command -v docker &>/dev/null; then
        err "docker not found. Install Docker first."
        exit 1
    fi
    if ! docker compose version &>/dev/null; then
        err "docker compose v2 not found."
        exit 1
    fi

    log "Docker: $(docker --version)"
    log "Project root: $PROJECT_ROOT"
    log "Rescue directory: $RESCUE_DIR"

    echo ""
    log "Checking rescue files:"
    require_rescue_file "vault_init_rescue.json" "Vault unseal key + root token (CRITICAL)"
    require_rescue_file "vault_secrets_rescue.json" "All production secrets"
    require_rescue_file "pg_dump_rescue_${RESCUE_DATE}.dump" "PostgreSQL database dump"
    require_rescue_file "certs_rescue_${RESCUE_DATE}.txt" "Apple certs + Google SA JSON"
    require_rescue_file "vault_runtime_rescue_${RESCUE_DATE}.txt" "Runtime secret files"

    local has_redis=0
    if [ -f "$RESCUE_DIR/redis_rescue_${RESCUE_DATE}.rdb" ]; then
        has_redis=1
        log "Found: redis_rescue_${RESCUE_DATE}.rdb (Redis RDB — optional but recommended)"
    else
        warn "Redis RDB not found. Cache will be empty but service will work."
    fi

    echo ""
    if ! docker volume inspect "${PROJECT_NAME}_vault_data" &>/dev/null 2>&1; then
        log "Creating Docker volumes..."
    fi

    log "Prerequisites OK."
}

# ─────────────────────────────────────────────────────────────────────────────
# Step 2 — Clean volumes
# ─────────────────────────────────────────────────────────────────────────────

clean_volumes() {
    step "2/9 — Cleaning existing volumes (if any)"

    local answer
    read -r -p "Remove all existing Loyallia volumes and start fresh? [y/N]: " answer
    if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
        log "Stopping any running Loyallia containers..."
        $COMPOSE_CMD down --remove-orphans 2>/dev/null || true

        log "Removing Loyallia volumes..."
        for vol in vault_data vault_runtime postgres_data postgres_replica_data redis_data minio_data static_files media_files prometheus_data grafana_data loki_data next_cache; do
            if docker volume inspect "${PROJECT_NAME}_${vol}" &>/dev/null 2>&1; then
                docker volume rm "${PROJECT_NAME}_${vol}" >/dev/null
                log "Removed volume: ${PROJECT_NAME}_${vol}"
            fi
        done

        log "All volumes cleaned."
    else
        log "Keeping existing volumes."
    fi

    $COMPOSE_CMD up -d --no-start 2>/dev/null || true
}

# ─────────────────────────────────────────────────────────────────────────────
# Step 3 — Inject Vault init.json
# ─────────────────────────────────────────────────────────────────────────────

inject_vault_init() {
    step "3/9 — Injecting rescued Vault init.json (CRITICAL)"

    local vault_data_volume="${PROJECT_NAME}_vault_data"

    if ! docker volume inspect "$vault_data_volume" &>/dev/null 2>&1; then
        docker volume create "$vault_data_volume" >/dev/null
        log "Created volume: $vault_data_volume"
    fi

    local temp_container="loyallia-vault-inject-$$"
    docker run --rm -d --name "$temp_container" \
        -v "$vault_data_volume:/data" \
        alpine:3.19 sleep 60 >/dev/null 2>&1

    local inject_ok=0
    if docker cp "$RESCUE_DIR/vault_init_rescue.json" "$temp_container:/data/init.json" 2>/dev/null; then
        docker exec "$temp_container" chmod 0644 /data/init.json 2>/dev/null || true
        docker exec "$temp_container" chown 100:1000 /data/init.json 2>/dev/null || true
        inject_ok=1
        log "Injected rescued init.json into vault_data volume."
    fi

    docker stop "$temp_container" >/dev/null 2>&1 || true

    if [ "$inject_ok" -eq 0 ]; then
        err "Failed to inject init.json into Vault data volume."
        err "Try manually:"
        err "  docker run --rm -v ${vault_data_volume}:/data alpine cp $RESCUE_DIR/vault_init_rescue.json /data/init.json"
        exit 1
    fi

    log "Vault init.json injected. Vault will use the ORIGINAL unseal key and root token."
    log "This prevents re-initialization which would invalidate all existing secrets."
}

# ─────────────────────────────────────────────────────────────────────────────
# Step 4 — Start Vault and import secrets
# ─────────────────────────────────────────────────────────────────────────────

start_vault_and_import() {
    step "4/9 — Starting Vault and importing secrets"

    log "Starting Vault (without vault-init — we control the init)..."
    $COMPOSE_CMD up -d vault

    log "Waiting for Vault API..."
    local timeout=60
    local elapsed=0
    while [ "$elapsed" -lt "$timeout" ]; do
        if docker exec "$VAULT_CONTAINER" wget --spider --quiet http://127.0.0.1:8200/v1/sys/health?standbyok=true 2>/dev/null; then
            log "Vault API ready."
            break
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done

    if [ "$elapsed" -ge "$timeout" ]; then
        err "Vault API not ready after ${timeout}s"
        $COMPOSE_CMD logs vault --tail=20
        exit 1
    fi

    local status_code
    status_code="$(docker exec "$VAULT_CONTAINER" wget --server-response --spider --quiet "http://127.0.0.1:8200/v1/sys/seal-status" 2>&1 | head -1 | awk '{print $2}' || echo "000")"

    if [ "$status_code" != "200" ]; then
        log "Vault is sealed. Unsealing with rescued key..."

        local unseal_key
        unseal_key="$(python3 -c "
import json
with open('$RESCUE_DIR/vault_init_rescue.json') as f:
    data = json.load(f)
print(data['unseal_keys_b64'][0])
")"

        docker exec -e VAULT_ADDR=https://127.0.0.1:8200 -e VAULT_SKIP_VERIFY=true "$VAULT_CONTAINER" vault operator unseal "$unseal_key" >/dev/null
        log "Vault unsealed successfully."
    else
        log "Vault is already unsealed."
    fi

    local root_token
    root_token="$(python3 -c "
import json
with open('$RESCUE_DIR/vault_init_rescue.json') as f:
    data = json.load(f)
print(data['root_token'])
")"

    docker exec -e VAULT_TOKEN="$root_token" -e VAULT_ADDR=https://127.0.0.1:8200 -e VAULT_SKIP_VERIFY=true "$VAULT_CONTAINER" vault secrets enable -path="$VAULT_KV_MOUNT" kv-v2 >/dev/null 2>&1 || true

    log "Importing all rescued secrets into Vault..."
    docker cp "$RESCUE_DIR/vault_secrets_rescue.json" "$VAULT_CONTAINER:/tmp/vault_secrets_import.json" >/dev/null

    docker exec -e VAULT_TOKEN="$root_token" "$VAULT_CONTAINER" sh -c '
        python3 -c "
import json

with open(\"/tmp/vault_secrets_import.json\") as f:
    data = json.load(f)

secrets = data.get(\"secrets\", data)
if \"_meta\" in secrets:
    secrets.pop(\"_meta\", None)

output = {\"data\": secrets}
print(json.dumps(output))
" > /tmp/vault_import_clean.json
    ' >/dev/null

    docker exec -e VAULT_TOKEN="$root_token" -e VAULT_ADDR=https://127.0.0.1:8200 -e VAULT_SKIP_VERIFY=true "$VAULT_CONTAINER" \
        vault kv put -mount="$VAULT_KV_MOUNT" "$VAULT_KV_PATH" @/tmp/vault_import_clean.json >/dev/null

    log "All secrets imported into Vault at $VAULT_KV_MOUNT/$VAULT_KV_PATH."

    docker exec "$VAULT_CONTAINER" rm -f /tmp/vault_secrets_import.json /tmp/vault_import_clean.json 2>/dev/null || true
}

# ─────────────────────────────────────────────────────────────────────────────
# Step 5 — Restore runtime files from rescue
# ─────────────────────────────────────────────────────────────────────────────

restore_runtime_from_rescue() {
    step "5/9 — Restoring runtime secret files from rescue"

    local runtime_rescue="$RESCUE_DIR/vault_runtime_rescue_${RESCUE_DATE}.txt"
    local vault_runtime_volume="${PROJECT_NAME}_vault_runtime"

    if ! docker volume inspect "$vault_runtime_volume" &>/dev/null 2>&1; then
        docker volume create "$vault_runtime_volume" >/dev/null
        log "Created volume: $vault_runtime_volume"
    fi

    local temp_container="loyallia-runtime-gen-$$"
    docker run --rm -d --name "$temp_container" \
        -v "$vault_runtime_volume:/runtime" \
        alpine:3.19 sleep 60 >/dev/null 2>&1

    log "Parsing rescue file and restoring runtime secrets..."

    python3 -c "
import re, os

with open('$runtime_rescue') as f:
    content = f.read()

sections = re.findall(r'^=== (.+?) ===\n(.*?)(?=\n=== |\Z)', content, re.MULTILINE | re.DOTALL)

restored = 0
for filename, data in sections:
    if filename == 'CHECKSUMS':
        continue
    clean = data.rstrip()
    if not clean:
        print(f'EMPTY: {filename}')
        continue
    path = f'/tmp/runtime_restore/{filename}'
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(clean)
        if not clean.endswith('\n'):
            f.write('\n')
    restored += 1
    print(f'RESTORED: {filename} ({len(clean)} bytes)')

print(f'TOTAL_RESTORED: {restored}')
" 2>&1 | while read -r line; do
        case "$line" in
            RESTORED:*) log "$line" ;;
            EMPTY:*)    warn "$line" ;;
            TOTAL_RESTORED:*) log "$line" ;;
        esac
    done

    if [ -d /tmp/runtime_restore ]; then
        for f in /tmp/runtime_restore/*; do
            [ -f "$f" ] || continue
            local basename
            basename="$(basename "$f")"
            docker cp "$f" "$temp_container:/runtime/$basename" >/dev/null 2>&1
        done
        docker exec "$temp_container" chmod -R 0444 /runtime/ 2>/dev/null || true
        local count
        count="$(ls /tmp/runtime_restore | wc -l | tr -d ' ')"
        log "Copied $count runtime files into volume."
    fi

    # Restore Vault TLS certs and config into vault_data volume
    local vault_data_volume="${PROJECT_NAME}_vault_data"
    if [ -f /tmp/runtime_restore/vault.crt ] && [ -f /tmp/runtime_restore/vault.key ] && [ -f /tmp/runtime_restore/vault.hcl ]; then
        local vault_temp="loyallia-vault-certs-$$"
        docker run --rm -d --name "$vault_temp" \
            -v "$vault_data_volume:/vault/file" \
            alpine:3.19 sleep 60 >/dev/null 2>&1
        docker exec "$vault_temp" mkdir -p /vault/file/certs /vault/file/config 2>/dev/null || true
        docker cp /tmp/runtime_restore/vault.crt "$vault_temp:/vault/file/certs/vault.crt" >/dev/null 2>&1
        docker cp /tmp/runtime_restore/vault.key "$vault_temp:/vault/file/certs/vault.key" >/dev/null 2>&1
        docker cp /tmp/runtime_restore/vault.hcl "$vault_temp:/vault/file/config/vault.hcl" >/dev/null 2>&1
        docker exec "$vault_temp" chmod 0600 /vault/file/certs/vault.key 2>/dev/null || true
        docker exec "$vault_temp" chmod 0644 /vault/file/certs/vault.crt 2>/dev/null || true
        docker stop "$vault_temp" >/dev/null 2>&1 || true
        log "Restored Vault TLS certificates and config."
    fi

    docker stop "$temp_container" >/dev/null 2>&1 || true
    rm -rf /tmp/runtime_restore

    log "Runtime files restored from rescue."
}

# ─────────────────────────────────────────────────────────────────────────────
# Step 6 — Restore PostgreSQL
# ─────────────────────────────────────────────────────────────────────────────

restore_postgresql() {
    step "6/9 — Restoring PostgreSQL"

    local dump_file="$RESCUE_DIR/pg_dump_rescue_${RESCUE_DATE}.dump"

    log "Starting PostgreSQL..."
    $COMPOSE_CMD up -d postgres

    log "Waiting for PostgreSQL to accept connections..."
    local timeout=90
    local elapsed=0
    while [ "$elapsed" -lt "$timeout" ]; do
        if $COMPOSE_CMD exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" &>/dev/null; then
            log "PostgreSQL is ready."
            break
        fi
        sleep 3
        elapsed=$((elapsed + 3))
    done

    if [ "$elapsed" -ge "$timeout" ]; then
        err "PostgreSQL not ready after ${timeout}s"
        $COMPOSE_CMD logs postgres --tail=20
        exit 1
    fi

    log "Checking if database already has data..."
    local table_count
    table_count="$($COMPOSE_CMD exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null || echo "0")"
    table_count="$(echo "$table_count" | tr -d ' ' || echo "0")"

    if [ "$table_count" -gt 10 ]; then
        log "Database already has $table_count tables. Skipping restore (data already exists)."
        return
    fi

    log "Restoring from rescue dump..."
    $COMPOSE_CMD exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists < "$dump_file" 2>&1 || true

    local new_table_count
    new_table_count="$($COMPOSE_CMD exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null || echo "0")"
    new_table_count="$(echo "$new_table_count" | tr -d ' ' || echo "0")"

    log "PostgreSQL restored. Tables: $new_table_count"
}

# ─────────────────────────────────────────────────────────────────────────────
# Step 7 — Restore Redis
# ─────────────────────────────────────────────────────────────────────────────

restore_redis() {
    step "7/9 — Restoring Redis"

    local rdb_file="$RESCUE_DIR/redis_rescue_${RESCUE_DATE}.rdb"
    if [ ! -f "$rdb_file" ]; then
        warn "Redis RDB rescue file not found. Starting Redis with empty data."
        $COMPOSE_CMD up -d redis
        return
    fi

    local redis_data_volume="${PROJECT_NAME}_redis_data"

    if ! docker volume inspect "$redis_data_volume" &>/dev/null 2>&1; then
        docker volume create "$redis_data_volume" >/dev/null
    fi

    log "Injecting rescued RDB into Redis volume..."

    local temp_container="loyallia-redis-inject-$$"
    docker run --rm -d --name "$temp_container" \
        -v "$redis_data_volume:/data" \
        alpine:3.19 sleep 60 >/dev/null 2>&1

    docker cp "$rdb_file" "$temp_container:/data/dump.rdb" 2>/dev/null
    docker exec "$temp_container" chmod 0644 /data/dump.rdb 2>/dev/null || true

    docker stop "$temp_container" >/dev/null 2>&1 || true

    log "Starting Redis..."
    $COMPOSE_CMD up -d redis

    log "Redis restored from rescue RDB."
}

# ─────────────────────────────────────────────────────────────────────────────
# Step 8 — Restore certificates
# ─────────────────────────────────────────────────────────────────────────────

restore_certs() {
    step "8/9 — Restoring certificates"

    local certs_rescue="$RESCUE_DIR/certs_rescue_${RESCUE_DATE}.txt"

    if [ ! -f "$certs_rescue" ]; then
        warn "Certs rescue file not found. Skipping certificate restore."
        return
    fi

    log "Extracting certificates from rescue file..."

    local certs_dir="$PROJECT_ROOT/certs"
    mkdir -p "$certs_dir"

    python3 -c "
import re

with open('$certs_rescue') as f:
    content = f.read()

sections = re.findall(r'=== (.+?) ===\n(.+?)(?=\n=== |\Z)', content, re.DOTALL)

import fnmatch

cert_map = [
    ('apple_pass_new.key', 'apple_pass.key'),
    ('passNew.pem', 'apple_pass.pem'),
    ('AppleWWDRCAG4.pem', 'apple_wwdr.pem'),
    ('loyalliarewardswallet-*.json', 'google_wallet_service_account.json'),
]

written = []
for filename, data in sections:
    target = filename
    for pattern, mapped in cert_map:
        if fnmatch.fnmatch(filename, pattern):
            target = mapped
            break
    path = '$certs_dir/' + target
    with open(path, 'w') as f:
        f.write(data.strip() + '\n')
    written.append(target)
    print(f'  Extracted: {filename} → certs/{target}')
" 2>&1 | while read -r line; do log "$line"; done

    chmod 0644 "$certs_dir"/*.pem "$certs_dir"/*.key "$certs_dir"/*.json 2>/dev/null || true
    chmod 0400 "$certs_dir"/*.key 2>/dev/null || true

    log "Certificates restored to $certs_dir"
}

# ─────────────────────────────────────────────────────────────────────────────
# Step 9 — Start all services
# ─────────────────────────────────────────────────────────────────────────────

start_all_services() {
    step "9/9 — Starting all services and verifying"

    log "Starting remaining services..."

    for svc in postgres-replica pgbouncer minio minio-init; do
        log "Starting $svc..."
        $COMPOSE_CMD up -d "$svc" 2>/dev/null || true
    done

    log "Starting API..."
    $COMPOSE_CMD up -d api --no-deps 2>/dev/null || true

    log "Waiting for API health..."
    local timeout=120
    local elapsed=0
    while [ "$elapsed" -lt "$timeout" ]; do
        if $COMPOSE_CMD exec -T api curl -sf "$API_HEALTH_URL" &>/dev/null; then
            log "API is healthy."
            break
        fi
        sleep 3
        elapsed=$((elapsed + 3))
    done

    log "Starting celery workers..."
    $COMPOSE_CMD up -d celery-pass celery-push celery-default celery-beat 2>/dev/null || true

    log "Starting flower..."
    $COMPOSE_CMD up -d flower 2>/dev/null || true

    log "Starting whatsapp-bridge..."
    $COMPOSE_CMD up -d whatsapp-bridge 2>/dev/null || true

    log "Starting nginx..."
    $COMPOSE_CMD up -d nginx 2>/dev/null || true

    log "Starting monitoring stack..."
    $COMPOSE_CMD up -d prometheus grafana loki 2>/dev/null || true

    echo ""
    log "Final health check — all services:"
    $COMPOSE_CMD ps 2>/dev/null || true

    echo ""
    local errors=0
    local healthy=0
    local unhealthy=0

    while IFS= read -r line; do
        if echo "$line" | grep -q "healthy"; then
            healthy=$((healthy + 1))
        elif echo "$line" | grep -q "unhealthy"; then
            unhealthy=$((unhealthy + 1))
            errors=$((errors + 1))
        fi
    done < <($COMPOSE_CMD ps 2>/dev/null || true)

    echo ""
    log "Summary: $healthy healthy, $unhealthy unhealthy"

    if [ "$errors" -gt 0 ]; then
        warn "Some services are unhealthy. Check logs: docker compose logs <service>"
    else
        log "All services healthy!"
    fi

    echo ""
    log "╔══════════════════════════════════════════════════════════════════════╗"
    log "║  DISASTER RECOVERY COMPLETE                                         ║"
    log "║                                                                     ║"
    log "║  Environment: $ENVIRONMENT"
    log "║                                                                     ║"
    log "║  Post-recovery checklist:                                           ║"
    if [ "$ENVIRONMENT" = "production" ]; then
        log "║  □ Verify API:       curl $PUBLIC_BASE_URL/api/v1/health/           ║"
        log "║  □ Verify login:     $PUBLIC_BASE_URL/login                         ║"
        log "║  □ Check MinIO:      passes and assets buckets have data            ║"
        log "║  □ Regen Google passes:  (may need re-publish after MinIO restore)  ║"
        log "║  □ Setup cron:       deploy/bootstrap/cron_setup.sh production      ║"
        log "║  □ Setup SSL:        certbot --nginx -d rewards.loyallia.com        ║"
    else
        log "║  □ Verify API:       curl http://localhost:${PUBLIC_API_PORT}/api/v1/health/  ║"
        log "║  □ Verify login:     http://localhost:${PUBLIC_WEB_PORT}/login                ║"
        log "║  □ Check MinIO:      passes and assets buckets have data            ║"
        log "║  □ Regen Google passes:  (may need re-publish after MinIO restore)  ║"
    fi
    log "╚══════════════════════════════════════════════════════════════════════╝"
}

# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

main() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║   LOYALLIA — DISASTER RECOVERY FROM RESCUE FILES              ║${NC}"
    echo -e "${CYAN}║   Recovers from total Docker cluster loss                      ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    detect_environment
    configure
    check_prerequisites
    clean_volumes
    inject_vault_init
    start_vault_and_import
    restore_runtime_from_rescue
    restore_postgresql
    restore_redis
    restore_certs
    start_all_services

    log "Disaster recovery sequence complete."
}

main "$@"
