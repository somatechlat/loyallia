#!/usr/bin/env bash
# =============================================================================
# LOYALLIA — RESTORE FROM BACKUP
# =============================================================================
# Restores the full Loyallia stack from a backup archive.
#
# Steps:
#   1. List available backups (interactive) or use --from=PATH
#   2. Download from S3 (if needed)
#   3. Decrypt (age / AES-256)
#   4. Decompress (tar.gz)
#   5. Restore PostgreSQL
#   6. Restore Redis
#   7. Restore Vault
#   8. Verify
#
# Usage:
#   ./deploy/backups/restore.sh [OPTIONS]
#
# Options:
#   --from=PATH                    Restore from specific archive path
#   --from-s3=KEY                  Restore from S3 key (s3://bucket/key)
#   --list                         List available backups
#   --env=production|development   Environment (default: production)
#   --dry-run                      Show what would happen
#   --help                         Show this help
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

log()   { echo -e "${GREEN}[restore]${NC} $*"; }
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
RESTORE_FROM=""
RESTORE_FROM_S3=""
LIST_MODE=0
DEPLOY_ENV="production"
DRY_RUN=0

parse_args() {
    for arg in "$@"; do
        case "$arg" in
            --from=*)
                RESTORE_FROM="${arg#*=}"
                ;;
            --from-s3=*)
                RESTORE_FROM_S3="${arg#*=}"
                ;;
            --list)
                LIST_MODE=1
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

BACKUP_BASE="/var/backups/loyallia"
TMP_RESTORE="$BACKUP_BASE/tmp/restore_$$"

# =============================================================================
# STEP 1: List or select backup
# =============================================================================
step_01_select() {
    step_banner "Step 1/8 — Select backup"

    if [ "$LIST_MODE" -eq 1 ]; then
        log "Available local backups:"
        if [ -d "$BACKUP_BASE" ]; then
            find "$BACKUP_BASE" -name "backup_*.tar.gz" -printf "  %f (%s bytes)\n" 2>/dev/null | sort -r | head -20
        else
            warn "No backup directory found at $BACKUP_BASE"
        fi
        exit 0
    fi

    if [ -n "$RESTORE_FROM" ]; then
        if [ ! -f "$RESTORE_FROM" ]; then
            err "Backup archive not found: $RESTORE_FROM"
            exit 1
        fi
        log "Using backup: $RESTORE_FROM"
        return 0
    fi

    if [ -n "$RESTORE_FROM_S3" ]; then
        log "Will download from S3: $RESTORE_FROM_S3"
        return 0
    fi

    # Auto-select most recent backup
    local latest
    latest="$(find "$BACKUP_BASE" -name "backup_*.tar.gz" -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)"

    if [ -z "$latest" ]; then
        err "No backups found in $BACKUP_BASE"
        err "Use --from=PATH or --from-s3=KEY to specify a backup"
        exit 1
    fi

    RESTORE_FROM="$latest"
    log "Auto-selected most recent backup: $(basename "$RESTORE_FROM")"
}

# =============================================================================
# STEP 2: Download from S3
# =============================================================================
step_02_download() {
    step_banner "Step 2/8 — Download from S3"

    if dry_run_echo "Download $RESTORE_FROM_S3 from S3"; then
        return 0
    fi

    if [ -z "$RESTORE_FROM_S3" ]; then
        info "No S3 source specified — skipping download"
        return 0
    fi

    mkdir_safe "$BACKUP_BASE/tmp"

    local s3_key
    s3_key="${RESTORE_FROM_S3#s3://*/}"
    local bucket
    bucket="${RESTORE_FROM_S3#s3://}"
    bucket="${bucket%%/*}"

    # Get MinIO credentials
    local minio_user minio_pass
    minio_user="$(docker exec loyallia-vault cat /vault/runtime/minio_root_user 2>/dev/null || echo minioadmin)"
    minio_pass="$(docker exec loyallia-vault cat /vault/runtime/minio_root_password 2>/dev/null || echo minioadmin)"

    local local_path="$BACKUP_BASE/tmp/$(basename "$s3_key")"

    log "Downloading s3://$bucket/$s3_key..."
    docker run --rm --network container:loyallia-minio \
        -e MC_HOST_local="http://${minio_user}:${minio_pass}@localhost:9000" \
        -v "$BACKUP_BASE/tmp:/downloads" \
        minio/mc:RELEASE.2025-07-21T05-28-08Z \
        cp "local/$bucket/$s3_key" "/downloads/$(basename "$s3_key")" 2>/dev/null || {
        err "Failed to download from S3"
        exit 1
    }

    RESTORE_FROM="$local_path"
    log "Downloaded to: $RESTORE_FROM"
}

dry_run_echo() {
    if [ "$DRY_RUN" -eq 1 ]; then
        info "[DRY-RUN] Would: $*"
        return 0
    fi
    return 1
}

mkdir_safe() {
    local dir="$1"
    if [ "$DRY_RUN" -eq 0 ]; then
        mkdir -p "$dir"
        chmod 0700 "$dir"
    fi
}

require_container() {
    local name="$1"
    if ! docker inspect "$name" --format '{{.State.Status}}' 2>/dev/null | grep -q running; then
        err "Required container not running: $name"
        return 1
    fi
}

# =============================================================================
# STEP 3: Decrypt
# =============================================================================
step_03_decrypt() {
    step_banner "Step 3/8 — Decrypt backup"

    if dry_run_echo "Decrypt $RESTORE_FROM with age"; then
        return 0
    fi

    if [ ! -f "$RESTORE_FROM" ]; then
        err "Backup archive not found: $RESTORE_FROM"
        exit 1
    fi

    # Check if file is age-encrypted
    if [[ "$RESTORE_FROM" == *.age ]]; then
        if ! command -v age &>/dev/null; then
            err "Backup is age-encrypted but 'age' is not installed"
            err "Install: apt install age"
            exit 1
        fi

        log "Decrypting with age..."
        local decrypted="${RESTORE_FROM%.age}"
        age --decrypt -o "$decrypted" "$RESTORE_FROM" 2>/dev/null || {
            err "Decryption failed — check private key"
            exit 1
        }
        RESTORE_FROM="$decrypted"
        log "Decrypted: $RESTORE_FROM"
    elif file "$RESTORE_FROM" 2>/dev/null | grep -q 'age encrypted file'; then
        if ! command -v age &>/dev/null; then
            err "Backup is age-encrypted but 'age' is not installed"
            exit 1
        fi

        log "Decrypting with age..."
        local decrypted="${RESTORE_FROM%.tar.gz}.tar.gz"
        age --decrypt -o "$decrypted" "$RESTORE_FROM" 2>/dev/null || {
            err "Decryption failed — check private key"
            exit 1
        }
        RESTORE_FROM="$decrypted"
    else
        info "Backup is not encrypted — skipping decryption"
    fi
}

# =============================================================================
# STEP 4: Decompress
# =============================================================================
step_04_decompress() {
    step_banner "Step 4/8 — Decompress backup"

    if dry_run_echo "tar xzf $RESTORE_FROM -C $TMP_RESTORE"; then
        return 0
    fi

    mkdir_safe "$TMP_RESTORE"

    log "Extracting: $(basename "$RESTORE_FROM")"
    tar xzf "$RESTORE_FROM" -C "$TMP_RESTORE" 2>/dev/null || {
        err "Failed to extract archive"
        exit 1
    }

    # The archive contains a timestamped directory
    local extracted_dir
    extracted_dir="$(find "$TMP_RESTORE" -maxdepth 1 -type d ! -path "$TMP_RESTORE" | head -1)"

    if [ -z "$extracted_dir" ]; then
        # Files may be flat in the archive
        log "Archive extracted to: $TMP_RESTORE"
    else
        log "Archive extracted: $(basename "$extracted_dir")"
        # Move contents up one level
        mv "$extracted_dir"/* "$TMP_RESTORE/" 2>/dev/null || true
        rmdir "$extracted_dir" 2>/dev/null || true
    fi
}

# =============================================================================
# STEP 5: Restore PostgreSQL
# =============================================================================
step_05_postgresql() {
    step_banner "Step 5/8 — Restore PostgreSQL"

    if dry_run_echo "pg_restore -d $DB_NAME"; then
        return 0
    fi

    require_container loyallia-postgres

    # Find the pg_dump file
    local dump_file
    dump_file="$(find "$TMP_RESTORE" -name "*.dump" -o -name "*.dump.age" | head -1)"

    if [ -z "$dump_file" ]; then
        warn "No pg_dump file found in backup — skipping PostgreSQL restore"
        return 0
    fi

    # Handle encrypted dump
    if [[ "$dump_file" == *.age ]]; then
        if command -v age &>/dev/null; then
            local decrypted="${dump_file%.age}"
            age --decrypt -o "$decrypted" "$dump_file" 2>/dev/null
            dump_file="$decrypted"
        else
            warn "Cannot decrypt dump file — skipping PostgreSQL restore"
            return 0
        fi
    fi

    log "Found dump: $(basename "$dump_file")"

    # Confirm destructive operation
    local db_table_count
    db_table_count="$(docker compose exec -T postgres psql -U loyallia -d loyallia -t -c \
        "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null | tr -d ' ' || echo 0)"

    if [ "${db_table_count:-0}" -gt 0 ] 2>/dev/null; then
        warn ""
        warn "╔══════════════════════════════════════════════════════════════════════╗"
        warn "║  WARNING: Database already contains $db_table_count tables          ║"
        warn "║  This restore will OVERWRITE existing data.                         ║"
        warn "╚══════════════════════════════════════════════════════════════════════╝"
        warn ""
        local answer
        read -r -p "Continue with PostgreSQL restore? [y/N]: " answer
        if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
            log "PostgreSQL restore skipped."
            return 0
        fi
    fi

    log "Restoring PostgreSQL (this may take several minutes)..."
    docker compose exec -T postgres pg_restore -U loyallia -d loyallia \
        --clean --if-exists --no-owner --no-privileges < "$dump_file" 2>/dev/null || {
        warn "pg_restore reported errors (some may be harmless — e.g., extensions)"
    }

    # Verify
    local new_table_count
    new_table_count="$(docker compose exec -T postgres psql -U loyallia -d loyallia -t -c \
        "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null | tr -d ' ' || echo 0)"

    log "PostgreSQL restored. Tables: $new_table_count ✓"
}

# =============================================================================
# STEP 6: Restore Redis
# =============================================================================
step_06_redis() {
    step_banner "Step 6/8 — Restore Redis"

    if dry_run_echo "Copy RDB to Redis data directory"; then
        return 0
    fi

    require_container loyallia-redis

    local rdb_file
    rdb_file="$(find "$TMP_RESTORE" -name "*.rdb" -o -name "*.rdb.age" | head -1)"

    if [ -z "$rdb_file" ]; then
        warn "No Redis RDB file found in backup — skipping Redis restore"
        return 0
    fi

    log "Found RDB: $(basename "$rdb_file")"

    # Handle encrypted RDB
    if [[ "$rdb_file" == *.age ]]; then
        if command -v age &>/dev/null; then
            local decrypted="${rdb_file%.age}"
            age --decrypt -o "$decrypted" "$rdb_file" 2>/dev/null
            rdb_file="$decrypted"
        else
            warn "Cannot decrypt RDB file — skipping Redis restore"
            return 0
        fi
    fi

    # Stop Redis before replacing RDB
    log "Stopping Redis..."
    docker compose stop redis 2>/dev/null || true

    # Copy RDB into Redis data volume
    local redis_vol
    redis_vol="${COMPOSE_PROJECT_NAME:-loyallia}_redis_data"
    docker run --rm -v "$redis_vol:/data" -v "$rdb_file:/tmp/dump.rdb:ro" \
        alpine cp /tmp/dump.rdb /data/dump.rdb

    log "Starting Redis..."
    docker compose up -d redis

    # Wait for Redis to be ready
    local timeout=30
    local elapsed=0
    while [ "$elapsed" -lt "$timeout" ]; do
        if docker compose exec -T redis sh -c 'redis-cli ping' 2>/dev/null | grep -q PONG; then
            log "Redis restored and running ✓"
            break
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done
}

# =============================================================================
# STEP 7: Restore Vault
# =============================================================================
step_07_vault() {
    step_banner "Step 7/8 — Restore Vault secrets"

    if dry_run_echo "Import Vault KV from backup"; then
        return 0
    fi

    require_container loyallia-vault

    local vault_file
    vault_file="$(find "$TMP_RESTORE" -name "vault_*.json" -o -name "vault_*.json.age" | head -1)"

    if [ -z "$vault_file" ]; then
        warn "No Vault export found in backup — skipping Vault restore"
        return 0
    fi

    # Handle encrypted vault file
    if [[ "$vault_file" == *.age ]]; then
        if command -v age &>/dev/null; then
            local decrypted="${vault_file%.age}"
            age --decrypt -o "$decrypted" "$vault_file" 2>/dev/null
            vault_file="$decrypted"
        else
            warn "Cannot decrypt Vault file — skipping Vault restore"
            return 0
        fi
    fi

    log "Found Vault export: $(basename "$vault_file")"

    # Extract root token
    local root_token
    root_token="$(docker exec loyallia-vault sh -c 'cat /vault/file/init.json' 2>/dev/null | \
        python3 -c 'import json,sys; print(json.load(sys.stdin)["root_token"])' 2>/dev/null || true)"

    if [ -z "$root_token" ]; then
        err "Cannot obtain Vault root token — skipping Vault restore"
        return 1
    fi

    # Copy and import
    docker cp "$vault_file" loyallia-vault:/tmp/vault_restore.json 2>/dev/null

    docker exec -e VAULT_TOKEN="$root_token" loyallia-vault sh -c '
        python3 -c "
import json
with open(\"/tmp/vault_restore.json\") as f:
    data = json.load(f)
secrets = data.get(\"data\", {}).get(\"data\", data.get(\"secrets\", {}))
output = {\"data\": secrets}
with open(\"/tmp/vault_restore_clean.json\", \"w\") as f:
    json.dump(output, f)
" 2>/dev/null
    ' >/dev/null

    log "Importing secrets into Vault KV..."
    docker exec -e VAULT_TOKEN="$root_token" loyallia-vault \
        vault kv put -mount=secret "loyallia/$DEPLOY_ENV" @/tmp/vault_restore_clean.json 2>/dev/null || {
        err "Failed to import Vault secrets"
        docker exec loyallia-vault rm -f /tmp/vault_restore.json /tmp/vault_restore_clean.json 2>/dev/null || true
        return 1
    }

    docker exec loyallia-vault rm -f /tmp/vault_restore.json /tmp/vault_restore_clean.json 2>/dev/null || true

    log "Vault secrets restored ✓"
}

# =============================================================================
# STEP 8: Verify
# =============================================================================
step_08_verify() {
    step_banner "Step 8/8 — Verify restoration"

    if dry_run_echo "Verify all services post-restore"; then
        return 0
    fi

    local errors=0

    # Check PostgreSQL
    local db_tables
    db_tables="$(docker compose exec -T postgres psql -U loyallia -d loyallia -t -c \
        "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null | tr -d ' ' || echo 0)"
    if [ "${db_tables:-0}" -gt 0 ]; then
        log "  PostgreSQL: $db_tables tables ✓"
    else
        err "  PostgreSQL: no tables found"
        errors=$((errors + 1))
    fi

    # Check Redis
    if docker compose exec -T redis sh -c 'redis-cli ping' 2>/dev/null | grep -q PONG; then
        log "  Redis: responding ✓"
    else
        err "  Redis: not responding"
        errors=$((errors + 1))
    fi

    # Check Vault
    local vault_sealed
    vault_sealed="$(docker exec loyallia-vault wget -qO- "http://127.0.0.1:8200/v1/sys/seal-status" 2>/dev/null | \
        python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('sealed',True))" 2>/dev/null || echo "True")"
    if [ "$vault_sealed" != "True" ]; then
        log "  Vault: unsealed ✓"
    else
        err "  Vault: sealed"
        errors=$((errors + 1))
    fi

    # Cleanup temp
    rm -rf "$TMP_RESTORE"

    echo ""
    if [ "$errors" -eq 0 ]; then
        log "═══════════════════════════════════════════════════════════════════════"
        log "  RESTORE COMPLETE — All services verified"
        log "═══════════════════════════════════════════════════════════════════════"
    else
        warn "═══════════════════════════════════════════════════════════════════════"
        warn "  RESTORE COMPLETED WITH $errors ISSUE(S)"
        warn "  Check service logs: docker compose logs <service>"
        warn "═══════════════════════════════════════════════════════════════════════"
        return 1
    fi
}

# =============================================================================
# MAIN
# =============================================================================
main() {
    parse_args "$@"

    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║        LOYALLIA — RESTORE FROM BACKUP                               ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    if [ "$DRY_RUN" -eq 1 ]; then
        warn "═══════════════════════════════════════════════════════════════════════"
        warn "  DRY RUN MODE — No data will be modified"
        warn "═══════════════════════════════════════════════════════════════════════"
        echo ""
    fi

    step_01_select
    step_02_download
    step_03_decrypt
    step_04_decompress
    step_05_postgresql
    step_06_redis
    step_07_vault
    step_08_verify

    log "Restore sequence complete."
}

main "$@"
