#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RESCUE_DIR="$PROJECT_ROOT/.agents"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[recover]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err() { echo -e "${RED}[error]${NC} $*" >&2; }
step() { echo ""; echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"; echo -e "${CYAN}  STEP $1${NC}"; echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"; }

VAULT_CONTAINER="loyallia-vault"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-loyallia}"

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
    require_rescue_file "vault_secrets_rescue.json" "All 48 production secrets"
    require_rescue_file "pg_dump_rescue_20260512.dump" "PostgreSQL database dump"
    require_rescue_file "certs_rescue_20260512.txt" "Apple certs + Google SA JSON"
    require_rescue_file "vault_runtime_rescue_20260512.txt" "Runtime secret files"

    local has_redis=0
    if [ -f "$RESCUE_DIR/redis_rescue_20260512.rdb" ]; then
        has_redis=1
        log "Found: redis_rescue_20260512.rdb (Redis RDB — optional but recommended)"
    else
        warn "Redis RDB not found. Cache will be empty but service will work."
    fi

    echo ""
    if ! docker volume inspect "${PROJECT_NAME}_vault_data" &>/dev/null 2>&1; then
        log "Creating Docker volumes..."
    fi

    log "Prerequisites OK."
}

clean_volumes() {
    step "2/9 — Cleaning existing volumes (if any)"

    local answer
    read -r -p "Remove all existing Loyallia volumes and start fresh? [y/N]: " answer
    if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
        log "Stopping any running Loyallia containers..."
        docker compose down --remove-orphans 2>/dev/null || true

        log "Removing Loyallia volumes..."
        for vol in vault_data vault_runtime postgres_data postgres_replica_data redis_data minio_data static_files media_files prometheus_data grafana_data loki_data; do
            if docker volume inspect "${PROJECT_NAME}_${vol}" &>/dev/null 2>&1; then
                docker volume rm "${PROJECT_NAME}_${vol}" >/dev/null
                log "Removed volume: ${PROJECT_NAME}_${vol}"
            fi
        done

        log "All volumes cleaned."
    else
        log "Keeping existing volumes."
    fi

    docker compose up -d --no-start 2>/dev/null || true
}

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

start_vault_and_import() {
    step "4/9 — Starting Vault and importing secrets"

    log "Starting Vault (without vault-init — we control the init)..."
    docker compose up -d vault

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
        docker compose logs vault --tail=20
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

        docker exec "$VAULT_CONTAINER" vault operator unseal "$unseal_key" >/dev/null
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

    docker exec -e VAULT_TOKEN="$root_token" "$VAULT_CONTAINER" vault secrets enable -path=secret kv-v2 >/dev/null 2>&1 || true

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

version = data.get(\"_meta\", {}).get(\"kv_version\", 1)

output = {\"data\": secrets}
print(json.dumps(output))
" > /tmp/vault_import_clean.json
    ' >/dev/null

    docker exec -e VAULT_TOKEN="$root_token" "$VAULT_CONTAINER" \
        vault kv put -mount=secret "loyallia/production" @/tmp/vault_import_clean.json >/dev/null

    log "All secrets imported into Vault."

    docker exec "$VAULT_CONTAINER" rm -f /tmp/vault_secrets_import.json /tmp/vault_import_clean.json 2>/dev/null || true
}

regenerate_runtime_files() {
    step "5/9 — Regenerating Vault runtime files"

    local root_token
    root_token="$(python3 -c "
import json
with open('$RESCUE_DIR/vault_init_rescue.json') as f:
    data = json.load(f)
print(data['root_token'])
")"

    local vault_runtime_volume="${PROJECT_NAME}_vault_runtime"

    if ! docker volume inspect "$vault_runtime_volume" &>/dev/null 2>&1; then
        docker volume create "$vault_runtime_volume" >/dev/null
    fi

    local temp_container="loyallia-runtime-gen-$$"
    docker run --rm -d --name "$temp_container" \
        -v "$vault_runtime_volume:/runtime" \
        alpine:3.19 sleep 60 >/dev/null 2>&1

    docker exec -e VAULT_TOKEN="$root_token" "$VAULT_CONTAINER" sh -c '
        vault kv get -mount=secret -format=json "loyallia/production" 2>/dev/null | \
        python3 -c "
import json, sys
data = json.load(sys.stdin).get(\"data\", {}).get(\"data\", {})
seeds = {}
seeds[\"postgres_password\"] = data.get(\"postgres_password\", \"\")
redis_url = data.get(\"redis_url\", \"\")
import re
m = re.match(r\"redis://:(.*)@\", redis_url)
seeds[\"redis_password\"] = m.group(1) if m else \"\"
seeds[\"minio_root_user\"] = data.get(\"minio_access_key\", \"\")
seeds[\"minio_root_password\"] = data.get(\"minio_secret_key\", \"\")
print(json.dumps(seeds))
" > /tmp/runtime_seeds.json 2>/dev/null
    ' >/dev/null

    docker exec "$VAULT_CONTAINER" cat /tmp/runtime_seeds.json 2>/dev/null | \
    python3 -c "
import json, sys
seeds = json.load(sys.stdin)
for key, value in seeds.items():
    if value:
        print(f'{key}={value}')
" >/dev/null

    docker exec -e VAULT_TOKEN="$root_token" "$VAULT_CONTAINER" sh -c '
        python3 -c "
import json
with open(\"/tmp/runtime_seeds.json\") as f:
    seeds = json.load(f)
" 2>/dev/null
        mkdir -p /vault/runtime

        PG_PASS=$(python3 -c "import json; f=open('/tmp/runtime_seeds.json'); d=json.load(f); print(d.get('postgres_password',''))" 2>/dev/null)
        REDIS_PASS=$(python3 -c "import json; f=open('/tmp/runtime_seeds.json'); d=json.load(f); print(d.get('redis_password',''))" 2>/dev/null)
        MINIO_USER=$(python3 -c "import json; f=open('/tmp/runtime_seeds.json'); d=json.load(f); print(d.get('minio_root_user',''))" 2>/dev/null)
        MINIO_PASS=$(python3 -c "import json; f=open('/tmp/runtime_seeds.json'); d=json.load(f); print(d.get('minio_root_password',''))" 2>/dev/null)

        if [ -n \"$PG_PASS\" ]; then printf \"%s\" \"$PG_PASS\" > /vault/runtime/postgres_password; fi
        if [ -n \"$REDIS_PASS\" ]; then printf \"%s\" \"$REDIS_PASS\" > /vault/runtime/redis_password; fi
        if [ -n \"$MINIO_USER\" ]; then printf \"%s\" \"$MINIO_USER\" > /vault/runtime/minio_root_user; fi
        if [ -n \"$MINIO_PASS\" ]; then printf \"%s\" \"$MINIO_PASS\" > /vault/runtime/minio_root_password; fi

        printf \"path \\\"secret/data/loyallia/*\\\" {\\n  capabilities = [\\\"read\\\", \\\"create\\\", \\\"update\\\", \\\"patch\\\"]\\n}\\n\" > /vault/runtime/loyallia-app.hcl
        vault policy write loyallia-app /vault/runtime/loyallia-app.hcl >/dev/null
        vault token create -policy=loyallia-app -field=token >/vault/runtime/app-token 2>/dev/null

        chmod 0444 /vault/runtime/* 2>/dev/null || true
    ' >/dev/null

    docker cp "$VAULT_CONTAINER:/vault/runtime/." /tmp/loyallia-runtime-check/ 2>/dev/null || true

    for f in postgres_password redis_password minio_root_user minio_root_password app-token; do
        local val
        val="$(docker exec "$VAULT_CONTAINER" cat "/vault/runtime/$f" 2>/dev/null || true)"
        if [ -z "$val" ]; then
            warn "Runtime file $f is empty. Will use rescue file values."
        fi
    done

    docker stop "$temp_container" >/dev/null 2>&1 || true

    log "Runtime files regenerated from Vault secrets."
}

restore_postgresql() {
    step "6/9 — Restoring PostgreSQL"

    local dump_file="$RESCUE_DIR/pg_dump_rescue_20260512.dump"

    log "Starting PostgreSQL..."
    docker compose up -d postgres

    log "Waiting for PostgreSQL to accept connections..."
    local timeout=90
    local elapsed=0
    while [ "$elapsed" -lt "$timeout" ]; do
        if docker compose exec -T postgres pg_isready -U loyallia -d loyallia &>/dev/null; then
            log "PostgreSQL is ready."
            break
        fi
        sleep 3
        elapsed=$((elapsed + 3))
    done

    if [ "$elapsed" -ge "$timeout" ]; then
        err "PostgreSQL not ready after ${timeout}s"
        docker compose logs postgres --tail=20
        exit 1
    fi

    log "Checking if database already has data..."
    local table_count
    table_count="$(docker compose exec -T postgres psql -U loyallia -d loyallia -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null || echo "0")"
    table_count="$(echo "$table_count" | tr -d ' ' || echo "0")"

    if [ "$table_count" -gt 10 ]; then
        log "Database already has $table_count tables. Skipping restore (data already exists)."
        return
    fi

    log "Restoring from rescue dump..."
    docker compose exec -T postgres pg_restore -U loyallia -d loyallia --clean --if-exists < "$dump_file" 2>&1 || true

    local new_table_count
    new_table_count="$(docker compose exec -T postgres psql -U loyallia -d loyallia -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null || echo "0")"
    new_table_count="$(echo "$new_table_count" | tr -d ' ' || echo "0")"

    log "PostgreSQL restored. Tables: $new_table_count"
}

restore_redis() {
    step "7/9 — Restoring Redis"

    local rdb_file="$RESCUE_DIR/redis_rescue_20260512.rdb"
    if [ ! -f "$rdb_file" ]; then
        warn "Redis RDB rescue file not found. Starting Redis with empty data."
        docker compose up -d redis
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
    docker compose up -d redis

    log "Redis restored from rescue RDB."
}

restore_certs() {
    step "8/9 — Restoring certificates"

    local certs_rescue="$RESCUE_DIR/certs_rescue_20260512.txt"

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

cert_map = {
    'apple_pass_new.key': 'apple_pass.key',
    'passNew.pem': 'apple_pass.pem',
    'AppleWWDRCAG4.pem': 'apple_wwdr.pem',
    'scenic-parity-494022-h5-628cf7e3795c.json': 'google_wallet_service_account.json',
}

written = []
for filename, data in sections:
    target = cert_map.get(filename, filename)
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

start_all_services() {
    step "9/9 — Starting all services and verifying"

    log "Starting remaining services..."

    for svc in postgres-replica pgbouncer minio minio-init; do
        log "Starting $svc..."
        docker compose up -d "$svc" 2>/dev/null || true
    done

    log "Starting API..."
    docker compose up -d api --no-deps 2>/dev/null || true

    log "Waiting for API health..."
    local timeout=120
    local elapsed=0
    while [ "$elapsed" -lt "$timeout" ]; do
        if docker compose exec -T api curl -sf http://localhost:8000/api/v1/health/ &>/dev/null; then
            log "API is healthy."
            break
        fi
        sleep 3
        elapsed=$((elapsed + 3))
    done

    log "Starting celery workers..."
    docker compose up -d celery-pass celery-push celery-default celery-beat 2>/dev/null || true

    log "Starting flower..."
    docker compose up -d flower 2>/dev/null || true

    log "Starting whatsapp-bridge..."
    docker compose up -d whatsapp-bridge 2>/dev/null || true

    log "Starting nginx..."
    docker compose up -d nginx 2>/dev/null || true

    log "Starting monitoring stack..."
    docker compose up -d prometheus grafana loki 2>/dev/null || true

    echo ""
    log "Final health check — all services:"
    docker compose ps 2>/dev/null || true

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
    done < <(docker compose ps 2>/dev/null || true)

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
    log "║  Post-recovery checklist:                                           ║"
    log "║  □ Verify API:       curl http://localhost:33905/api/v1/health/     ║"
    log "║  □ Verify login:     http://localhost:33906/login                   ║"
    log "║  □ Check MinIO:      passes and assets buckets have data            ║"
    log "║  □ Regen Google passes:  (may need re-publish after MinIO restore)  ║"
    log "║  □ Setup cron:       deploy/bootstrap/cron_setup.sh production      ║"
    log "║  □ Setup SSL:        certbot --nginx -d rewards.loyallia.com        ║"
    log "╚══════════════════════════════════════════════════════════════════════╝"
}

main() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║   LOYALLIA — DISASTER RECOVERY FROM RESCUE FILES              ║${NC}"
    echo -e "${CYAN}║   Recovers from total Docker cluster loss                      ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    check_prerequisites
    clean_volumes
    inject_vault_init
    start_vault_and_import
    regenerate_runtime_files
    restore_postgresql
    restore_redis
    restore_certs
    start_all_services

    log "Disaster recovery sequence complete."
}

main
