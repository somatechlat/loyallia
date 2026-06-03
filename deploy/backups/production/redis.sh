#!/usr/bin/env bash
# =============================================================================
# LOYALLIA BACKUP — PRODUCTION REDIS
# =============================================================================
# Uses HOST redis-cli BGSAVE.
# Copies /var/lib/redis/dump.rdb
# Polls LASTSAVE until complete (30s timeout).
# Output: $BACKUP_DIR/redis/dump_<timestamp>.rdb
# =============================================================================

set -euo pipefail

source "$(dirname "$0")/env.sh"
source "$PROJECT_ROOT/deploy/backups/lib/common.sh"
source "$PROJECT_ROOT/deploy/backups/lib/encrypt.sh"

require_cmd redis-cli

TIMESTAMP=$(timestamp)
OUTDIR="$BACKUP_DIR/redis"
ensure_dir "$OUTDIR"
OUTFILE="$OUTDIR/dump_${TIMESTAMP}.rdb"

REDIS_PASSWORD=""
if [ -r "/run/loyallia-vault/redis_password" ]; then
    REDIS_PASSWORD=$(cat /run/loyallia-vault/redis_password)
fi

step "REDIS BACKUP"
log "Triggering BGSAVE ..."

if [ -n "$REDIS_PASSWORD" ]; then
    LASTSAVE_BEFORE=$(redis-cli -a "$REDIS_PASSWORD" -h 127.0.0.1 -p 33902 LASTSAVE)
    redis-cli -a "$REDIS_PASSWORD" -h 127.0.0.1 -p 33902 BGSAVE >/dev/null
else
    LASTSAVE_BEFORE=$(redis-cli -h 127.0.0.1 -p 33902 LASTSAVE)
    redis-cli -h 127.0.0.1 -p 33902 BGSAVE >/dev/null
fi

# Poll for completion
MAX_WAIT=30
WAITED=0
while [ "$WAITED" -lt "$MAX_WAIT" ]; do
    sleep 1
    if [ -n "$REDIS_PASSWORD" ]; then
        LASTSAVE_AFTER=$(redis-cli -a "$REDIS_PASSWORD" -h 127.0.0.1 -p 33902 LASTSAVE)
    else
        LASTSAVE_AFTER=$(redis-cli -h 127.0.0.1 -p 33902 LASTSAVE)
    fi
    if [ "$LASTSAVE_AFTER" != "$LASTSAVE_BEFORE" ]; then
        log "BGSAVE completed in ${WAITED}s"
        break
    fi
    WAITED=$((WAITED + 1))
done

if [ "$WAITED" -ge "$MAX_WAIT" ]; then
    die "Redis BGSAVE timed out after ${MAX_WAIT}s"
fi

if [ ! -f "/var/lib/redis/dump.rdb" ]; then
    die "Redis dump.rdb not found at /var/lib/redis/dump.rdb"
fi

cp /var/lib/redis/dump.rdb "$OUTFILE" || die "Failed to copy dump.rdb"

if [ ! -s "$OUTFILE" ]; then
    rm -f "$OUTFILE"
    die "Backup file is empty: $OUTFILE"
fi

SIZE="$(du -h "$OUTFILE" | cut -f1)"
log "Redis backup: $(basename "$OUTFILE") ($SIZE)"

# Encrypt and remove plaintext
encrypt_file "$OUTFILE"
rm -f "$OUTFILE"

log "Redis backup complete: $(basename "$OUTFILE").age"
