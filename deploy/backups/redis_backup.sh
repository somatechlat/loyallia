#!/bin/bash
# Redis BGSAVE Backup
# Retention: 7 days
# Schedule: cron 0 */6 * * *

set -euo pipefail

BACKUP_DIR="/var/backups/redis"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
VAULT_RUNTIME="${VAULT_RUNTIME_DIR:-/run/loyallia-vault}"
REDIS_PASSWORD=""
if [ -f "$VAULT_RUNTIME/redis_password" ]; then
  REDIS_PASSWORD="$(cat "$VAULT_RUNTIME/redis_password")"
fi

mkdir -p "$BACKUP_DIR"

if [ -n "$REDIS_PASSWORD" ]; then
  redis-cli -a "$REDIS_PASSWORD" bgsave
else
  redis-cli bgsave
fi

sleep 5

cp /var/lib/redis/dump.rdb "$BACKUP_DIR/dump_${TIMESTAMP}.rdb"
gzip "$BACKUP_DIR/dump_${TIMESTAMP}.rdb"

find "$BACKUP_DIR" -name "dump_*.rdb.gz" -mtime +$RETENTION_DAYS -delete

echo "Redis backup completed: dump_${TIMESTAMP}.rdb.gz"
