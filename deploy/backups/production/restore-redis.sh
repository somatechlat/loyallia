#!/usr/bin/env bash
# =============================================================================
# LOYALLIA RESTORE — PRODUCTION REDIS
# =============================================================================
# Finds latest encrypted backup, decrypts, stops Redis via docker compose,
# copies RDB, and starts Redis.
# =============================================================================

set -euo pipefail

source "$(dirname "$0")/env.sh"
source "$PROJECT_ROOT/deploy/backups/lib/common.sh"
source "$PROJECT_ROOT/deploy/backups/lib/encrypt.sh"

FORCE=0
if [ "${1:-}" = "--force" ]; then
    FORCE=1
fi

BACKUP_DIR_REDIS="$BACKUP_DIR/redis"
LATEST_AGE=$(ls -t "$BACKUP_DIR_REDIS"/*.age 2>/dev/null | head -1 || true)

if [ -z "$LATEST_AGE" ]; then
    die "No encrypted Redis backup found in $BACKUP_DIR_REDIS"
fi

step "REDIS RESTORE"
info "Latest backup: $(basename "$LATEST_AGE")"

# --- Confirmation --------------------------------------------------------------
if [ "$FORCE" -eq 0 ]; then
    echo ""
    echo -e "${RED}WARNING: This will REPLACE the current Redis dataset.${NC}"
    echo -e "${RED}Backup: $(basename "$LATEST_AGE")${NC}"
    echo ""
    read -r -p "Type 'RESTORE' to confirm: " confirm
    if [ "$confirm" != "RESTORE" ]; then
        die "Restore aborted."
    fi
fi

# --- Decrypt -------------------------------------------------------------------
TMPFILE="$TEMP_DIR/redis_restore_$$.rdb"
ensure_dir "$(dirname "$TMPFILE")"

decrypt_file "$LATEST_AGE" "$TMPFILE"

if [ ! -s "$TMPFILE" ]; then
    rm -f "$TMPFILE"
    die "Decrypted backup is empty"
fi

log "Decrypted: $(basename "$LATEST_AGE") → $TMPFILE"

# --- Stop Redis, copy RDB, start Redis -----------------------------------------
log "Stopping Redis ..."
docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" -f "$PROJECT_ROOT/$COMPOSE_PROD_FILE" \
    stop redis || die "Failed to stop Redis"

cp "$TMPFILE" /var/lib/redis/dump.rdb || {
    docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" -f "$PROJECT_ROOT/$COMPOSE_PROD_FILE" \
        start redis >/dev/null 2>&1 || true
    rm -f "$TMPFILE"
    die "Failed to copy RDB to /var/lib/redis/dump.rdb"
}

chown 999:999 /var/lib/redis/dump.rdb 2>/dev/null || true

rm -f "$TMPFILE"

log "Starting Redis ..."
docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" -f "$PROJECT_ROOT/$COMPOSE_PROD_FILE" \
    start redis || die "Failed to start Redis"

log "Redis restore complete"
