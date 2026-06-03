#!/usr/bin/env bash
# =============================================================================
# LOYALLIA RESTORE — PostgreSQL (Development)
# =============================================================================
# Finds the latest encrypted PostgreSQL backup, decrypts it,
# drops and recreates the database, and restores from the SQL dump.
# Requires interactive confirmation unless --force is passed.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"
source "$SCRIPT_DIR/../lib/common.sh"
source "$SCRIPT_DIR/../lib/encrypt.sh"

# --- Parse args -------------------------------------------------------------
FORCE=0
for arg in "$@"; do
    case "$arg" in
        --force) FORCE=1 ;;
    esac
done

step "PostgreSQL Restore"

# --- Find latest encrypted backup -------------------------------------------
LATEST=$(find_latest_backup "$BACKUP_DIR/postgres" "*.age")

if [ -z "$LATEST" ]; then
    die "No encrypted PostgreSQL backup found in $BACKUP_DIR/postgres/"
fi

log "Latest backup: $(basename "$LATEST")"

# --- Confirmation -----------------------------------------------------------
confirm_restore "This will DROP the existing 'loyallia' database and recreate it."

# --- Decrypt ----------------------------------------------------------------
TMPDIR=$(mktemp -d)
setup_cleanup "$TMPDIR"
TMPFILE="$TMPDIR/restore.sql"

log "Decrypting backup ..."
decrypt_file "$LATEST" "$TMPFILE"

# --- Drop and recreate database ---------------------------------------------
log "Dropping and recreating database ..."
$COMPOSE_CMD exec -T postgres psql -U loyallia -d postgres -c "DROP DATABASE IF EXISTS loyallia;" >/dev/null
$COMPOSE_CMD exec -T postgres psql -U loyallia -d postgres -c "CREATE DATABASE loyallia;" >/dev/null

# --- Restore ----------------------------------------------------------------
log "Restoring database ..."
$COMPOSE_CMD exec -T postgres psql -U loyallia -d loyallia < "$TMPFILE"

log "PostgreSQL restore complete."
