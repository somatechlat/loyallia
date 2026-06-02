#!/usr/bin/env bash
# Redis Backup — DEVELOPMENT ONLY
# Uses docker compose exec (no host binaries required)
# Output: ./.agents/backups/redis_YYYYMMDD_HHMMSS.rdb

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/.agents/backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

mkdir -p "$BACKUP_DIR"

echo "[dev-backup] Redis backup starting..."

# Capture LASTSAVE before triggering BGSAVE
LASTSAVE_BEFORE="$(docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T redis redis-cli LASTSAVE 2>/dev/null || echo "0")"

docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T redis redis-cli BGSAVE >/dev/null

# Wait for BGSAVE to complete (LASTSAVE timestamp must change)
MAX_WAIT=30
WAITED=0
while [ "$WAITED" -lt "$MAX_WAIT" ]; do
    LASTSAVE_AFTER="$(docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T redis redis-cli LASTSAVE 2>/dev/null || echo "0")"
    if [ "$LASTSAVE_AFTER" != "0" ] && [ "$LASTSAVE_AFTER" != "$LASTSAVE_BEFORE" ]; then
        break
    fi
    sleep 1
    WAITED=$((WAITED + 1))
done

docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T redis sh -c 'cat /data/dump.rdb' \
    > "$BACKUP_DIR/redis_${TIMESTAMP}.rdb"

if [ ! -s "$BACKUP_DIR/redis_${TIMESTAMP}.rdb" ]; then
    echo "[dev-backup] ERROR: Redis backup file is empty!"
    rm -f "$BACKUP_DIR/redis_${TIMESTAMP}.rdb"
    exit 1
fi

SIZE="$(du -h "$BACKUP_DIR/redis_${TIMESTAMP}.rdb" | cut -f1)"
echo "[dev-backup] Redis backup: redis_${TIMESTAMP}.rdb ($SIZE)"
