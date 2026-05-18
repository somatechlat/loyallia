#!/usr/bin/env bash
# =============================================================================
# LOYALLIA — FULL BACKUP ORCHESTRATOR
# =============================================================================
# Coordinates backup of all stateful services:
#   1. Read backup settings from Vault
#   2. Create backup job record
#   3. pg_dump (PostgreSQL logical backup)
#   4. Redis BGSAVE
#   5. Vault KV export
#   6. Media files (MinIO buckets)
#   7. Encrypt (AES-256 / age)
#   8. Compress (tar.gz)
#   9. Upload to S3 (MinIO)
#   10. Verify
#   11. Cleanup old backups
#
# Usage:
#   ./deploy/backups/backup.sh [OPTIONS]
#
# Options:
#   --type=full|db|redis|vault|media   Backup type (default: full)
#   --env=production|development       Environment (default: production)
#   --dry-run                          Show what would happen
#   --help                             Show this help
#
# Schedule: cron daily at 02:00
# Retention: 30 days (configurable in Vault: backup_retention)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# --- Colours ------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

log()   { echo -e "${GREEN}[backup]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $*"; }
err()   { echo -e "${RED}[error]${NC} $*" >&2; }
info()  { echo -e "${CYAN}[info]${NC} $*"; }
step_banner() {
    echo ""
    echo -e "${MAGENTA}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║  $1${NC}"
    echo -e "${MAGENTA}╚══════════════════════════════════════════════════════════════════════╝${NC}"
}

# --- CLI ----------------------------------------------------------------------
BACKUP_TYPE="full"
DEPLOY_ENV="production"
DRY_RUN=0

parse_args() {
    for arg in "$@"; do
        case "$arg" in
            --type=full|--type=db|--type=redis|--type=vault|--type=media)
                BACKUP_TYPE="${arg#*=}"
                ;;
            --env=*)
                DEPLOY_ENV="${arg#*=}"
                ;;
            --dry-run)
                DRY_RUN=1
                ;;
            --help|-h)
                sed -n '/^# ===/,/^# ===/p' "$0" | sed 's/^# //;s/^#//'
                exit 0
                ;;
            *)
                err "Unknown argument: $arg"
                exit 1
                ;;
        esac
    done
}

# --- Configuration ------------------------------------------------------------
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DATE_PATH="$(date +%Y/%m/%d)"
BACKUP_BASE="/var/backups/loyallia"
TMP_DIR="$BACKUP_BASE/tmp/$TIMESTAMP"
JOB_RECORD="$BACKUP_BASE/jobs/$TIMESTAMP.json"
RETENTION_DAYS=30

# Read from Vault via environment or use defaults
RETENTION_DAYS="${BACKUP_RETENTION:-30}"
BACKUP_FREQUENCY="${BACKUP_FREQUENCY:-daily}"
CRON_HOUR="${CRON_HOUR:-2}"
AGE_PUBLIC_KEY="${AGE_PUBLIC_KEY:-}"

S3_ENDPOINT="${MINIO_ENDPOINT:-http://localhost:33903}"
S3_BUCKET="${BACKUP_S3_BUCKET:-loyallia-backups}"

# Database config
DB_HOST="${DB_HOST:-postgres}"
DB_NAME="${POSTGRES_DB:-loyallia}"
DB_USER="${POSTGRES_USER:-loyallia}"

# --- Helpers ------------------------------------------------------------------
dry_run_echo() {
    if [ "$DRY_RUN" -eq 1 ]; then
        info "[DRY-RUN] Would: $*"
        return 0
    fi
    return 1
}

require_container() {
    local name="$1"
    if ! docker inspect "$name" --format '{{.State.Status}}' 2>/dev/null | grep -q running; then
        err "Required container not running: $name"
        return 1
    fi
}

mkdir_safe() {
    local dir="$1"
    if [ "$DRY_RUN" -eq 0 ]; then
        mkdir -p "$dir"
        chmod 0700 "$dir"
    fi
}

# =============================================================================
# STEP 1: Read backup settings from Vault
# =============================================================================
step_01_vault_settings() {
    step_banner "Step 1/11 — Read backup settings from Vault"

    if dry_run_echo "Read backup_frequency, backup_retention, age_public_key from Vault"; then
        return 0
    fi

    # Try to read from Vault if available
    if docker inspect loyallia-vault --format '{{.State.Status}}' 2>/dev/null | grep -q running; then
        local app_token
        app_token="$(docker exec loyallia-vault cat /vault/runtime/app-token 2>/dev/null || true)"
        if [ -n "$app_token" ]; then
            local vault_retention
            vault_retention="$(docker exec -e VAULT_TOKEN="$app_token" loyallia-vault \
                vault kv get -mount=secret -field=backup_retention "loyallia/$DEPLOY_ENV" 2>/dev/null || true)"
            [ -n "$vault_retention" ] && RETENTION_DAYS="$vault_retention"

            local vault_age_key
            vault_age_key="$(docker exec -e VAULT_TOKEN="$app_token" loyallia-vault \
                vault kv get -mount=secret -field=age_public_key "loyallia/$DEPLOY_ENV" 2>/dev/null || true)"
            [ -n "$vault_age_key" ] && AGE_PUBLIC_KEY="$vault_age_key"
        fi
    fi

    log "Backup retention: $RETENTION_DAYS days"
    log "Age encryption: $([ -n "$AGE_PUBLIC_KEY" ] && echo 'enabled' || echo 'disabled')"
}

# =============================================================================
# STEP 2: Create backup job record
# =============================================================================
step_02_job_record() {
    step_banner "Step 2/11 — Create backup job record"

    if dry_run_echo "Create job record at $JOB_RECORD"; then
        return 0
    fi

    mkdir_safe "$(dirname "$JOB_RECORD")"

    python3 - "$TIMESTAMP" "$DEPLOY_ENV" "$BACKUP_TYPE" "$JOB_RECORD" << 'PYEOF'
import json, sys, datetime

timestamp, env, backup_type, job_file = sys.argv[1:5]

job = {
    "timestamp": timestamp,
    "started_at": datetime.datetime.utcnow().isoformat() + "Z",
    "environment": env,
    "type": backup_type,
    "status": "RUNNING",
    "steps": [],
    "files": []
}

with open(job_file, 'w') as f:
    json.dump(job, f, indent=2)

print(f"Job record: {job_file}")
PYEOF

    log "Job record created: $JOB_RECORD"
}

update_job() {
    local step="$1"
    local status="$2"
    local file="$3"

    [ "$DRY_RUN" -eq 1 ] && return 0
    [ ! -f "$JOB_RECORD" ] && return 0

    python3 - "$step" "$status" "$file" "$JOB_RECORD" << 'PYEOF'
import json, sys, datetime

step, status, file_path, job_file = sys.argv[1:5]

with open(job_file) as f:
    job = json.load(f)

job["steps"].append({
    "step": step,
    "status": status,
    "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
    "file": file_path
})

if file_path and file_path != "-":
    job["files"].append(file_path)

with open(job_file, 'w') as f:
    json.dump(job, f, indent=2)
PYEOF
}

# =============================================================================
# STEP 3: pg_dump (PostgreSQL)
# =============================================================================
step_03_pg_dump() {
    step_banner "Step 3/11 — PostgreSQL pg_dump"

    if dry_run_echo "pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME"; then
        return 0
    fi

    if [ "$BACKUP_TYPE" != "full" ] && [ "$BACKUP_TYPE" != "db" ]; then
        info "Skipping DB backup (--type=$BACKUP_TYPE)"
        return 0
    fi

    require_container loyallia-postgres

    mkdir_safe "$TMP_DIR"

    local dump_file="$TMP_DIR/${DB_NAME}_${TIMESTAMP}.dump"

    log "Running pg_dump (format=custom, compress=9)..."
    docker compose exec -T postgres pg_dump -U "$DB_USER" -d "$DB_NAME" \
        --format=custom --compress=9 > "$dump_file"

    if [ ! -s "$dump_file" ]; then
        err "pg_dump produced empty file!"
        update_job "pg_dump" "FAIL" "-"
        return 1
    fi

    local size
    size="$(du -h "$dump_file" | cut -f1)"
    log "pg_dump complete: $dump_file ($size)"
    update_job "pg_dump" "PASS" "$dump_file"
}

# =============================================================================
# STEP 4: Redis BGSAVE
# =============================================================================
step_04_redis() {
    step_banner "Step 4/11 — Redis BGSAVE"

    if dry_run_echo "Trigger BGSAVE and copy RDB"; then
        return 0
    fi

    if [ "$BACKUP_TYPE" != "full" ] && [ "$BACKUP_TYPE" != "redis" ]; then
        info "Skipping Redis backup (--type=$BACKUP_TYPE)"
        return 0
    fi

    require_container loyallia-redis

    mkdir_safe "$TMP_DIR"

    local rdb_file="$TMP_DIR/redis_${TIMESTAMP}.rdb"

    log "Triggering BGSAVE..."
    docker compose exec -T redis redis-cli BGSAVE >/dev/null 2>&1 || true

    # Wait for BGSAVE to complete (check LASTSAVE)
    local last_save_before last_save_after
    last_save_before="$(docker compose exec -T redis redis-cli LASTSAVE 2>/dev/null || echo 0)"

    local timeout=60
    local elapsed=0
    while [ "$elapsed" -lt "$timeout" ]; do
        last_save_after="$(docker compose exec -T redis redis-cli LASTSAVE 2>/dev/null || echo 0)"
        if [ "$last_save_after" != "$last_save_before" ] && [ "$last_save_after" -gt 0 ]; then
            log "BGSAVE completed ✓"
            break
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done

    # Copy RDB from container
    docker compose exec -T redis cat /data/dump.rdb > "$rdb_file" 2>/dev/null || {
        # Fallback: copy from volume
        local redis_vol="${COMPOSE_PROJECT_NAME:-loyallia}_redis_data"
        docker run --rm -v "$redis_vol:/data:ro" alpine cat /data/dump.rdb > "$rdb_file" 2>/dev/null
    }

    if [ ! -s "$rdb_file" ]; then
        err "Redis RDB backup is empty!"
        update_job "redis_bgsave" "FAIL" "-"
        return 1
    fi

    local size
    size="$(du -h "$rdb_file" | cut -f1)"
    log "Redis backup complete: $rdb_file ($size)"
    update_job "redis_bgsave" "PASS" "$rdb_file"
}

# =============================================================================
# STEP 5: Vault KV export
# =============================================================================
step_05_vault() {
    step_banner "Step 5/11 — Vault KV export"

    if dry_run_echo "Export Vault KV secrets"; then
        return 0
    fi

    if [ "$BACKUP_TYPE" != "full" ] && [ "$BACKUP_TYPE" != "vault" ]; then
        info "Skipping Vault backup (--type=$BACKUP_TYPE)"
        return 0
    fi

    require_container loyallia-vault

    mkdir_safe "$TMP_DIR"

    local vault_file="$TMP_DIR/vault_${TIMESTAMP}.json"
    local root_token
    root_token="$(docker exec loyallia-vault sh -c 'cat /vault/file/init.json' 2>/dev/null | \
        python3 -c 'import json,sys; print(json.load(sys.stdin)["root_token"])' 2>/dev/null || true)"

    if [ -z "$root_token" ]; then
        err "Cannot extract root token from Vault init.json"
        update_job "vault_export" "FAIL" "-"
        return 1
    fi

    log "Exporting Vault KV secrets..."
    docker exec -e VAULT_TOKEN="$root_token" loyallia-vault \
        vault kv get -mount=secret -format=json "loyallia/$DEPLOY_ENV" > "$vault_file" 2>/dev/null || {
        err "Failed to export Vault secrets"
        update_job "vault_export" "FAIL" "-"
        return 1
    }

    if [ ! -s "$vault_file" ]; then
        err "Vault export is empty!"
        update_job "vault_export" "FAIL" "-"
        return 1
    fi

    local size
    size="$(du -h "$vault_file" | cut -f1)"
    log "Vault export complete: $vault_file ($size)"
    update_job "vault_export" "PASS" "$vault_file"
}

# =============================================================================
# STEP 6: Media files (MinIO)
# =============================================================================
step_06_media() {
    step_banner "Step 6/11 — Media files (MinIO)"

    if dry_run_echo "Mirror MinIO buckets (passes, assets)"; then
        return 0
    fi

    if [ "$BACKUP_TYPE" != "full" ] && [ "$BACKUP_TYPE" != "media" ]; then
        info "Skipping media backup (--type=$BACKUP_TYPE)"
        return 0
    fi

    require_container loyallia-minio

    mkdir_safe "$TMP_DIR/media"

    log "Mirroring MinIO buckets..."

    # Get MinIO credentials from runtime
    local minio_user minio_pass
    minio_user="$(docker exec loyallia-vault cat /vault/runtime/minio_root_user 2>/dev/null || echo minioadmin)"
    minio_pass="$(docker exec loyallia-vault cat /vault/runtime/minio_root_password 2>/dev/null || echo minioadmin)"

    # Use mc to mirror buckets
    docker run --rm --network container:loyallia-minio \
        -e MC_HOST_local="http://${minio_user}:${minio_pass}@localhost:9000" \
        minio/mc:RELEASE.2025-07-21T05-28-08Z \
        mirror local/passes "/backup/passes" 2>/dev/null || {
        warn "Failed to mirror passes bucket — may be empty"
    }

    docker run --rm --network container:loyallia-minio \
        -e MC_HOST_local="http://${minio_user}:${minio_pass}@localhost:9000" \
        minio/mc:RELEASE.2025-07-21T05-28-08Z \
        mirror local/assets "/backup/assets" 2>/dev/null || {
        warn "Failed to mirror assets bucket — may be empty"
    }

    # Copy from temporary backup volume
    if [ -d "$TMP_DIR/media/passes" ] || [ -d "$TMP_DIR/media/assets" ]; then
        log "Media files mirrored ✓"
        update_job "media_backup" "PASS" "$TMP_DIR/media"
    else
        warn "No media files to backup (buckets may be empty)"
        update_job "media_backup" "SKIP" "-"
    fi
}

# =============================================================================
# STEP 7: Encrypt (age / AES-256)
# =============================================================================
step_07_encrypt() {
    step_banner "Step 7/11 — Encrypt backups"

    if dry_run_echo "Encrypt backup files with age"; then
        return 0
    fi

    if [ -z "$AGE_PUBLIC_KEY" ]; then
        warn "No AGE_PUBLIC_KEY configured — skipping encryption"
        warn "Set backup_retention and age_public_key in Vault or .env"
        update_job "encrypt" "SKIP" "-"
        return 0
    fi

    if ! command -v age &>/dev/null; then
        warn "age not installed — skipping encryption"
        warn "Install: apt install age"
        update_job "encrypt" "SKIP" "-"
        return 0
    fi

    log "Encrypting backup files with age..."

    local encrypted_count=0
    for f in "$TMP_DIR"/*.{dump,rdb,json}; do
        [ -e "$f" ] || continue
        local encrypted="${f}.age"
        age -r "$AGE_PUBLIC_KEY" -o "$encrypted" "$f" 2>/dev/null && {
            rm -f "$f"
            log "  Encrypted: $(basename "$encrypted")"
            encrypted_count=$((encrypted_count + 1))
        } || {
            warn "  Failed to encrypt: $(basename "$f")"
        }
    done

    log "$encrypted_count file(s) encrypted ✓"
    update_job "encrypt" "PASS" "-"
}

# =============================================================================
# STEP 8: Compress (tar.gz)
# =============================================================================
step_08_compress() {
    step_banner "Step 8/11 — Compress backups"

    if dry_run_echo "tar czf backup_$TIMESTAMP.tar.gz $TMP_DIR"; then
        return 0
    fi

    local archive="$BACKUP_BASE/backup_${DEPLOY_ENV}_${TIMESTAMP}.tar.gz"

    log "Creating archive: $archive"
    tar czf "$archive" -C "$BACKUP_BASE/tmp" "$TIMESTAMP" 2>/dev/null

    if [ ! -s "$archive" ]; then
        err "Archive is empty!"
        update_job "compress" "FAIL" "-"
        return 1
    fi

    local size
    size="$(du -h "$archive" | cut -f1)"
    log "Archive created: $archive ($size)"
    update_job "compress" "PASS" "$archive"
}

# =============================================================================
# STEP 9: Upload to S3 (MinIO)
# =============================================================================
step_09_upload() {
    step_banner "Step 9/11 — Upload to S3"

    if dry_run_echo "Upload $archive to MinIO $S3_BUCKET"; then
        return 0
    fi

    local archive="$BACKUP_BASE/backup_${DEPLOY_ENV}_${TIMESTAMP}.tar.gz"

    if [ ! -f "$archive" ]; then
        warn "Archive not found — skipping upload"
        update_job "upload" "SKIP" "-"
        return 0
    fi

    # Get MinIO credentials
    local minio_user minio_pass
    minio_user="$(docker exec loyallia-vault cat /vault/runtime/minio_root_user 2>/dev/null || echo minioadmin)"
    minio_pass="$(docker exec loyallia-vault cat /vault/runtime/minio_root_password 2>/dev/null || echo minioadmin)"

    # Ensure backup bucket exists
    docker run --rm --network container:loyallia-minio \
        -e MC_HOST_local="http://${minio_user}:${minio_pass}@localhost:9000" \
        minio/mc:RELEASE.2025-07-21T05-28-08Z \
        mb --ignore-existing "local/$S3_BUCKET" 2>/dev/null || true

    # Upload
    local s3_key="${DATE_PATH}/backup_${DEPLOY_ENV}_${TIMESTAMP}.tar.gz"
    docker run --rm --network container:loyallia-minio \
        -e MC_HOST_local="http://${minio_user}:${minio_pass}@localhost:9000" \
        -v "$archive:/backup.tar.gz:ro" \
        minio/mc:RELEASE.2025-07-21T05-28-08Z \
        cp "/backup.tar.gz" "local/$S3_BUCKET/$s3_key" 2>/dev/null || {
        warn "S3 upload failed — keeping local archive"
        update_job "upload" "FAIL" "-"
        return 0
    }

    log "Uploaded to s3://$S3_BUCKET/$s3_key ✓"
    update_job "upload" "PASS" "s3://$S3_BUCKET/$s3_key"
}

# =============================================================================
# STEP 10: Verify
# =============================================================================
step_10_verify() {
    step_banner "Step 10/11 — Verify backups"

    if dry_run_echo "Verify archive integrity and list contents"; then
        return 0
    fi

    local archive="$BACKUP_BASE/backup_${DEPLOY_ENV}_${TIMESTAMP}.tar.gz"

    if [ ! -f "$archive" ]; then
        err "Archive not found for verification"
        update_job "verify" "FAIL" "-"
        return 1
    fi

    # Test archive integrity
    if tar tzf "$archive" >/dev/null 2>&1; then
        log "Archive integrity: OK ✓"
    else
        err "Archive integrity check FAILED"
        update_job "verify" "FAIL" "-"
        return 1
    fi

    # List contents
    local file_count
    file_count="$(tar tzf "$archive" | wc -l)"
    log "Archive contains $file_count file(s)"

    update_job "verify" "PASS" "$archive"
}

# =============================================================================
# STEP 11: Cleanup old backups
# =============================================================================
step_11_cleanup() {
    step_banner "Step 11/11 — Cleanup old backups"

    if dry_run_echo "Remove backups older than $RETENTION_DAYS days"; then
        return 0
    fi

    log "Retention policy: $RETENTION_DAYS days"

    # Local cleanup
    local deleted=0
    while IFS= read -r f; do
        [ -n "$f" ] || continue
        rm -f "$f"
        deleted=$((deleted + 1))
    done < <(find "$BACKUP_BASE" -name "backup_*.tar.gz" -mtime +"$RETENTION_DAYS" -print 2>/dev/null)

    if [ "$deleted" -gt 0 ]; then
        log "Removed $deleted old local backup(s)"
    fi

    # Temp cleanup
    rm -rf "$TMP_DIR"

    # Update job record
    if [ -f "$JOB_RECORD" ]; then
        python3 - "$JOB_RECORD" << 'PYEOF'
import json, sys, datetime

job_file = sys.argv[1]
with open(job_file) as f:
    job = json.load(f)

job["status"] = "COMPLETE"
job["completed_at"] = datetime.datetime.utcnow().isoformat() + "Z"

with open(job_file, 'w') as f:
    json.dump(job, f, indent=2)
PYEOF
    fi

    log "Cleanup complete ✓"
}

# =============================================================================
# MAIN
# =============================================================================
main() {
    parse_args "$@"

    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║        LOYALLIA — FULL BACKUP ORCHESTRATOR                          ║${NC}"
    echo -e "${CYAN}║        Type: $(printf '%-55s' "$BACKUP_TYPE")║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    if [ "$DRY_RUN" -eq 1 ]; then
        warn "═══════════════════════════════════════════════════════════════════════"
        warn "  DRY RUN MODE — No backups will be created"
        warn "═══════════════════════════════════════════════════════════════════════"
        echo ""
    fi

    step_01_vault_settings
    step_02_job_record
    step_03_pg_dump
    step_04_redis
    step_05_vault
    step_06_media
    step_07_encrypt
    step_08_compress
    step_09_upload
    step_10_verify
    step_11_cleanup

    echo ""
    log "═══════════════════════════════════════════════════════════════════════"
    log "  BACKUP COMPLETE — $BACKUP_TYPE backup at $TIMESTAMP"
    log "  Job record: $JOB_RECORD"
    log "═══════════════════════════════════════════════════════════════════════"
}

main "$@"
