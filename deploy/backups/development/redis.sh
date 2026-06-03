#!/usr/bin/env bash
# =============================================================================
# LOYALLIA BACKUP — Redis (Development)
# =============================================================================
# Triggers BGSAVE inside the Redis container, waits for completion,
# copies the resulting RDB file out, encrypts with age, and removes plaintext.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"
source "$SCRIPT_DIR/../lib/common.sh"
source "$SCRIPT_DIR/../lib/encrypt.sh"

TS=$(timestamp)
OUTDIR="$BACKUP_DIR/redis"
ensure_dir "$OUTDIR"

OUTFILE="$OUTDIR/dump_${TS}.rdb"

step "Redis Backup"
log "Triggering BGSAVE ..."

LASTSAVE_BEFORE="$($COMPOSE_CMD exec -T redis redis-cli LASTSAVE 2>/dev/null || echo "0")"
$COMPOSE_CMD exec -T redis redis-cli BGSAVE >/dev/null

MAX_WAIT=60
WAITED=0
while [ "$WAITED" -lt "$MAX_WAIT" ]; do
    LASTSAVE_AFTER="$($COMPOSE_CMD exec -T redis redis-cli LASTSAVE 2>/dev/null || echo "0")"
    if [ "$LASTSAVE_AFTER" != "0" ] && [ "$LASTSAVE_AFTER" != "$LASTSAVE_BEFORE" ]; then
        break
    fi
    sleep 1
    WAITED=$((WAITED + 1))
done

if [ "$WAITED" -ge "$MAX_WAIT" ]; then
    die "Redis BGSAVE timed out after ${MAX_WAIT}s"
fi

log "Copying dump.rdb from container ..."
$COMPOSE_CMD exec -T redis sh -c 'cat /data/dump.rdb' > "$OUTFILE"

if [ ! -s "$OUTFILE" ]; then
    rm -f "$OUTFILE"
    die "Redis backup file is empty"
fi

SIZE="$(du -h "$OUTFILE" | cut -f1)"
log "Redis backup: $OUTFILE ($SIZE)"

encrypt_file "$OUTFILE" "$OUTFILE.age"
rm -f "$OUTFILE"
log "Redis backup complete: ${OUTFILE}.age"
