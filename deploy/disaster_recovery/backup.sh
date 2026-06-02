#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_BASE="${BACKUP_DIR:-/var/backups/loyallia}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
AGE_PUBLIC_KEY="${AGE_PUBLIC_KEY:-}"
AGE_KEY_FILE="${AGE_KEY_FILE:-$PROJECT_ROOT/.age_keys/loyallia_age_public_key.txt}"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
COMPOSE_PROD_FILE="$PROJECT_ROOT/docker-compose.prod.yml"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[backup]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err() { echo -e "${RED}[error]${NC} $*" >&2; }

mkdir -p "$BACKUP_BASE"/{pg,redis,minio,vault,certs,env,verify}

cleanup_old() {
    local dir="$1"
    local pattern="$2"
    local days="$3"
    find "$dir" -name "$pattern" -mtime "+${days}" -delete 2>/dev/null || true
}

encrypt_file() {
    local input="$1"
    local output="$2"

    if [ ! -f "$input" ]; then
        return 1
    fi

    if [ -n "$AGE_PUBLIC_KEY" ]; then
        age -r "$AGE_PUBLIC_KEY" -o "$output" "$input" 2>/dev/null && return 0
    fi

    if [ -f "$AGE_KEY_FILE" ]; then
        age -R "$AGE_KEY_FILE" -o "$output" "$input" 2>/dev/null && return 0
    fi

    warn "No age key found. Backup will NOT be encrypted."
    warn "Set AGE_PUBLIC_KEY env var or create $AGE_KEY_FILE"
    cp "$input" "$output"
    return 1
}

backup_postgres() {
    log "Backing up PostgreSQL..."
    local backup_file="$BACKUP_BASE/pg/loyallia_pg_${TIMESTAMP}.dump"

    if ! docker compose exec -T postgres pg_isready -U loyallia &>/dev/null; then
        warn "PostgreSQL not available. Skipping backup."
        return 1
    fi

    docker compose exec -T postgres \
        pg_dump -U loyallia -d loyallia \
        --format=custom --compress=9 \
        > "$backup_file" 2>/dev/null

    if [ ! -s "$backup_file" ]; then
        err "PostgreSQL backup produced empty file!"
        rm -f "$backup_file"
        return 1
    fi

    local size
    size="$(du -h "$backup_file" | cut -f1)"
    log "PostgreSQL dump: ${size}"

    local encrypted="${backup_file}.age"
    encrypt_file "$backup_file" "$encrypted"
    rm -f "$backup_file"

    if [ -f "$encrypted" ]; then
        log "PostgreSQL backup encrypted: ${encrypted}"
    fi

    cleanup_old "$BACKUP_BASE/pg" "loyallia_pg_*.dump.age" 31
}

backup_redis() {
    log "Backing up Redis..."
    local backup_file="$BACKUP_BASE/redis/loyallia_redis_${TIMESTAMP}.rdb"

    if ! docker compose exec -T redis redis-cli ping &>/dev/null; then
        warn "Redis not available. Skipping backup."
        return 1
    fi

    local redis_lastsave_before
    redis_lastsave_before="$(docker compose exec -T redis redis-cli LASTSAVE 2>/dev/null || echo "0")"

    docker compose exec -T redis redis-cli BGSAVE >/dev/null

    sleep 3

    local max_wait=30
    local waited=0
    while [ "$waited" -lt "$max_wait" ]; do
        local bgsave_result
        bgsave_result="$(docker compose exec -T redis redis-cli LASTSAVE 2>/dev/null || echo "0")"
        if [ "$bgsave_result" != "0" ] && [ "$bgsave_result" != "$redis_lastsave_before" ]; then
            break
        fi
        sleep 1
        waited=$((waited + 1))
    done

    local rdb_path
    rdb_path="$(docker compose exec -T redis sh -c 'ls -la /data/dump.rdb 2>/dev/null && echo /data/dump.rdb || echo /data/appendonlydir' 2>/dev/null || echo "/data")"

    docker compose exec -T redis sh -c 'cat /data/dump.rdb 2>/dev/null' > "$backup_file" 2>/dev/null

    if [ ! -s "$backup_file" ]; then
        docker compose cp redis:/data/dump.rdb "$backup_file" 2>/dev/null || true
    fi

    if [ ! -s "$backup_file" ]; then
        err "Redis backup produced empty file!"
        rm -f "$backup_file"
        return 1
    fi

    gzip -f "$backup_file" 2>/dev/null
    local gz_file="${backup_file}.gz"

    local size
    size="$(du -h "$gz_file" | cut -f1)"
    log "Redis RDB: ${size}"

    local encrypted="${gz_file}.age"
    encrypt_file "$gz_file" "$encrypted"
    rm -f "$gz_file"

    if [ -f "$encrypted" ]; then
        log "Redis backup encrypted: ${encrypted}"
    fi

    cleanup_old "$BACKUP_BASE/redis" "loyallia_redis_*.rdb.gz.age" 8
}

backup_minio() {
    log "Backing up MinIO..."
    local backup_dir="$BACKUP_BASE/minio/loyallia_minio_${TIMESTAMP}"

    if ! docker compose exec -T minio curl -sf http://localhost:9000/minio/health/live &>/dev/null; then
        warn "MinIO not available. Skipping backup."
        return 1
    fi

    mkdir -p "$backup_dir"

    local vault_runtime="/run/loyallia-vault"
    local minio_user minio_pass

    if docker compose exec -T minio sh -c "cat ${vault_runtime}/minio_root_user" &>/dev/null; then
        minio_user="$(docker compose exec -T minio sh -c "cat ${vault_runtime}/minio_root_user" 2>/dev/null)"
        minio_pass="$(docker compose exec -T minio sh -c "cat ${vault_runtime}/minio_root_password" 2>/dev/null)"
    else
        minio_user="${MINIO_ROOT_USER:-minioadmin}"
        minio_pass="${MINIO_ROOT_PASSWORD:-}"
    fi

    if [ -z "$minio_pass" ]; then
        warn "MinIO credentials not found. Skipping MinIO backup."
        rm -rf "$backup_dir"
        return 1
    fi

    docker run --rm --network "loyallia_backend-net" \
        -e MINIO_ROOT_USER="$minio_user" \
        -e MINIO_ROOT_PASSWORD="$minio_pass" \
        -v "$backup_dir:/backup" \
        minio/mc:RELEASE.2025-07-21T05-28-08Z \
        sh -c "
            mc alias set local http://minio:9000 \$MINIO_ROOT_USER \$MINIO_ROOT_PASSWORD >/dev/null 2>&1
            mc mirror --overwrite local/passes /backup/passes >/dev/null 2>&1 || true
            mc mirror --overwrite local/assets /backup/assets >/dev/null 2>&1 || true
        " 2>/dev/null || true

    local file_count
    file_count="$(find "$backup_dir" -type f 2>/dev/null | wc -l || echo 0)"
    if [ "$file_count" -eq 0 ]; then
        warn "MinIO backup produced no files."
        rm -rf "$backup_dir"
        return 1
    fi

    local tar_file="$BACKUP_BASE/minio/loyallia_minio_${TIMESTAMP}.tar.gz"
    tar -czf "$tar_file" -C "$BACKUP_BASE/minio" "loyallia_minio_${TIMESTAMP}" 2>/dev/null
    rm -rf "$backup_dir"

    local size
    size="$(du -h "$tar_file" | cut -f1)"
    log "MinIO backup: ${size} (${file_count} files)"

    local encrypted="${tar_file}.age"
    encrypt_file "$tar_file" "$encrypted"
    rm -f "$tar_file"

    if [ -f "$encrypted" ]; then
        log "MinIO backup encrypted: ${encrypted}"
    fi

    cleanup_old "$BACKUP_BASE/minio" "loyallia_minio_*.tar.gz.age" 31
}

backup_vault() {
    log "Backing up Vault..."

    if ! docker compose exec -T vault vault status &>/dev/null; then
        warn "Vault not available. Skipping backup."
        return 1
    fi

    local vault_token
    vault_token="$(docker compose exec -T vault sh -c 'cat /run/loyallia-vault/app-token 2>/dev/null || cat /vault/file/init.json 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin)[\"root_token\"])" 2>/dev/null' 2>/dev/null || true)"

    if [ -z "$vault_token" ]; then
        warn "Vault token not found. Skipping Vault backup."
        return 1
    fi

    local secrets_backup="$BACKUP_BASE/vault/loyallia_vault_secrets_${TIMESTAMP}.json"
    docker compose exec -T -e VAULT_TOKEN="$vault_token" vault \
        vault kv get -mount=secret -format=json "loyallia/production" \
        > "$secrets_backup" 2>/dev/null || true

    if [ ! -s "$secrets_backup" ]; then
        warn "Vault secrets backup failed."
        rm -f "$secrets_backup"
        return 1
    fi

    python3 -c "
import json
with open('$secrets_backup') as f:
    data = json.load(f)
secrets = data.get('data', {}).get('data', {})
print(f'Vault secrets: {len(secrets)} keys exported')
" 2>/dev/null

    local init_backup="$BACKUP_BASE/vault/loyallia_vault_init_${TIMESTAMP}.json"
    docker compose exec -T vault sh -c 'cat /vault/file/init.json 2>/dev/null' > "$init_backup" 2>/dev/null || true

    if [ ! -s "$init_backup" ]; then
        warn "Vault init.json backup failed (non-fatal — may be permission issue)."
        rm -f "$init_backup"
    fi

    for f in "$secrets_backup" "$init_backup"; do
        if [ -f "$f" ] && [ -s "$f" ]; then
            local encrypted="${f}.age"
            encrypt_file "$f" "$encrypted"
            rm -f "$f"
            log "Vault backup encrypted: $(basename "$encrypted")"
        fi
    done

    local secrets_size init_size
    secrets_size="$(du -h "${secrets_backup}.age" 2>/dev/null | cut -f1 || echo "0")"
    init_size="$(du -h "${init_backup}.age" 2>/dev/null | cut -f1 || echo "0")"
    log "Vault secrets: ${secrets_size}, init.json: ${init_size}"

    cleanup_old "$BACKUP_BASE/vault" "loyallia_vault_secrets_*.json.age" 31
    cleanup_old "$BACKUP_BASE/vault" "loyallia_vault_init_*.json.age" 31
}

backup_certs() {
    log "Backing up certificates..."
    local certs_dir="$PROJECT_ROOT/certs"

    if [ ! -d "$certs_dir" ] || [ -z "$(ls -A "$certs_dir" 2>/dev/null)" ]; then
        warn "No certificates directory found. Skipping cert backup."
        return 1
    fi

    local tar_file="$BACKUP_BASE/certs/loyallia_certs_${TIMESTAMP}.tar.gz"
    tar -czf "$tar_file" -C "$PROJECT_ROOT" certs/ 2>/dev/null

    local size
    size="$(du -h "$tar_file" | cut -f1)"
    log "Certs: ${size}"

    local encrypted="${tar_file}.age"
    encrypt_file "$tar_file" "$encrypted"
    rm -f "$tar_file"

    if [ -f "$encrypted" ]; then
        log "Certs backup encrypted: ${encrypted}"
    fi

    cleanup_old "$BACKUP_BASE/certs" "loyallia_certs_*.tar.gz.age" 31
}

backup_env() {
    log "Backing up environment files..."
    local env_tar_dir="$(mktemp -d)"
    local any=0

    for f in "$PROJECT_ROOT/.env" "$PROJECT_ROOT/frontend/.env" "$PROJECT_ROOT/frontend/.env.production"; do
        if [ -f "$f" ]; then
            local rel_path
            rel_path="$(echo "$f" | sed "s|$PROJECT_ROOT/||")"
            cp "$f" "$env_tar_dir/$rel_path" 2>/dev/null || true
            any=1
        fi
    done

    if [ "$any" -eq 0 ]; then
        warn "No .env files found. Skipping env backup."
        rm -rf "$env_tar_dir"
        return 1
    fi

    local tar_file="$BACKUP_BASE/env/loyallia_env_${TIMESTAMP}.tar.gz"
    tar -czf "$tar_file" -C "$env_tar_dir" . 2>/dev/null
    rm -rf "$env_tar_dir"

    local size
    size="$(du -h "$tar_file" | cut -f1)"
    log "Env files: ${size}"

    local encrypted="${tar_file}.age"
    encrypt_file "$tar_file" "$encrypted"
    rm -f "$tar_file"

    if [ -f "$encrypted" ]; then
        log "Env backup encrypted: ${encrypted}"
    fi

    cleanup_old "$BACKUP_BASE/env" "loyallia_env_*.tar.gz.age" 31
}

record_backup_metadata() {
    local manifest="$BACKUP_BASE/verify/loyallia_manifest_${TIMESTAMP}.json"

    python3 -c "
import json, os, time

backup_base = '$BACKUP_BASE'
timestamp = '$TIMESTAMP'

manifest = {
    'timestamp': timestamp,
    'date': '$(date -u +%Y-%m-%dT%H:%M:%SZ)',
    'project': 'loyallia',
    'hostname': '$(hostname 2>/dev/null || echo "unknown")',
    'files': [],
    'backup_script_version': '1.0',
}

for root, dirs, files in os.walk(backup_base):
    if 'verify' in root:
        continue
    for f in files:
        if timestamp in f:
            full_path = os.path.join(root, f)
            manifest['files'].append({
                'name': f,
                'size': os.path.getsize(full_path),
                'path': full_path.replace(backup_base, ''),
            })

with open(manifest['files'] and '$manifest' or '/dev/null', 'w') as f:
    json.dump(manifest, f, indent=2)

print(f'Backup manifest: {len(manifest[\"files\"])} files')
"

    log "$(python3 -c "import json; f=open('${BACKUP_BASE}/verify/loyallia_manifest_${TIMESTAMP}.json'); d=json.load(f); print(f'Backup manifest: {len(d[\"files\"])} files')" 2>/dev/null || echo "Manifest recorded")"
}

main() {
    export COMPOSE_FILE COMPOSE_PROD_FILE

    echo ""
    log "╔══════════════════════════════════════════════════════════════════╗"
    log "║  LOYALLIA BACKUP — ${TIMESTAMP}          ║"
    log "║  Target: ${BACKUP_BASE}"
    log "╚══════════════════════════════════════════════════════════════════╝"
    echo ""

    local errors=0

    backup_postgres || errors=$((errors + 1))
    echo ""

    backup_redis || errors=$((errors + 1))
    echo ""

    backup_minio || errors=$((errors + 1))
    echo ""

    backup_vault || errors=$((errors + 1))
    echo ""

    backup_certs || errors=$((errors + 1))
    echo ""

    backup_env || errors=$((errors + 1))
    echo ""

    record_backup_metadata

    local total_size
    total_size="$(du -sh "$BACKUP_BASE" 2>/dev/null | cut -f1 || echo "0")"
    log "Total backup storage: ${total_size}"

    echo ""
    if [ "$errors" -gt 0 ]; then
        warn "Backup completed with ${errors} warning(s). Check logs above."
    else
        log "Backup completed successfully."
    fi

    log "Backup directory: ${BACKUP_BASE}"
}

main
