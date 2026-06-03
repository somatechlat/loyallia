#!/usr/bin/env bash
# =============================================================================
# LOYALLIA RESTORE — PRODUCTION POSTGRESQL
# =============================================================================
# Finds latest encrypted backup in $BACKUP_DIR/postgres/,
# decrypts with age, and restores with pg_restore.
# =============================================================================

set -euo pipefail

source "$(dirname "$0")/env.sh"
source "$PROJECT_ROOT/deploy/backups/lib/common.sh"
source "$PROJECT_ROOT/deploy/backups/lib/encrypt.sh"

FORCE=0
if [ "${1:-}" = "--force" ]; then
    FORCE=1
fi

BACKUP_DIR_POSTGRES="$BACKUP_DIR/postgres"
LATEST_AGE=$(find_latest_backup "$BACKUP_DIR_POSTGRES" "*.age")

if [ -z "$LATEST_AGE" ]; then
    die "No encrypted PostgreSQL backup found in $BACKUP_DIR_POSTGRES"
fi

step "POSTGRESQL RESTORE"
info "Latest backup: $(basename "$LATEST_AGE")"

# --- Confirmation --------------------------------------------------------------
confirm_restore "WARNING: This will DESTROY and REPLACE the current PostgreSQL database."

# --- Decrypt -------------------------------------------------------------------
TMPFILE="$TEMP_DIR/postgres_restore_$$.dump"
ensure_dir "$(dirname "$TMPFILE")"

decrypt_file "$LATEST_AGE" "$TMPFILE"

if [ ! -s "$TMPFILE" ]; then
    rm -f "$TMPFILE"
    die "Decrypted backup is empty"
fi

log "Decrypted: $(basename "$LATEST_AGE") → $TMPFILE"

# --- Restore -------------------------------------------------------------------
if [ ! -r "/run/loyallia-vault/postgres_password" ]; then
    rm -f "$TMPFILE"
    die "Postgres password not found"
fi

PGPASSWORD=$(cat /run/loyallia-vault/postgres_password)
export PGPASSWORD

log "Restoring database with pg_restore ..."
pg_restore -h 127.0.0.1 -p 33900 -U loyallia -d loyallia --clean --if-exists --no-owner --no-privileges "$TMPFILE" || {
    warn "pg_restore completed with warnings (common for privilege differences)"
}

rm -f "$TMPFILE"
log "PostgreSQL restore complete"
