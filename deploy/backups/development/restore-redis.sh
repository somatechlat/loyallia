#!/usr/bin/env bash
# =============================================================================
# LOYALLIA RESTORE — Redis (Development)
# =============================================================================
# Finds the latest encrypted Redis backup, decrypts it,
# stops Redis, copies the RDB into place, and starts Redis again.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"
source "$SCRIPT_DIR/../lib/common.sh"
source "$SCRIPT_DIR/../lib/encrypt.sh"

step "Redis Restore"

# --- Find latest encrypted backup -------------------------------------------
LATEST=""
for f in "$BACKUP_DIR/redis"/*.age; do
    [ -e "$f" ] || continue
    if [ -z "$LATEST" ] || [ "$f" -nt "$LATEST" ]; then
        LATEST="$f"
    fi
done

if [ -z "$LATEST" ]; then
    die "No encrypted Redis backup found in $BACKUP_DIR/redis/"
fi

log "Latest backup: $(basename "$LATEST")"

# --- Decrypt ----------------------------------------------------------------
TMPDIR=$(mktemp -d)
setup_cleanup "$TMPDIR"
TMPFILE="$TMPDIR/dump.rdb"

log "Decrypting backup ..."
decrypt_file "$LATEST" "$TMPFILE"

# --- Stop, copy, start ------------------------------------------------------
log "Stopping Redis ..."
$COMPOSE_CMD stop redis

log "Copying RDB into container ..."
$COMPOSE_CMD cp "$TMPFILE" redis:/data/dump.rdb

log "Starting Redis ..."
$COMPOSE_CMD start redis

log "Redis restore complete."
