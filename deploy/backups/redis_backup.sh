#!/bin/bash
# Redis BGSAVE Backup
# Retention: 7 days
# Schedule: cron 0 */6 * * *

set -euo pipefail

DEPLOY_ENV="${DEPLOY_ENV:-production}"
for arg in "$@"; do
    case "$arg" in
        --env=production|--env=development)
            DEPLOY_ENV="${arg#*=}"
            ;;
    esac
done

if [ "$DEPLOY_ENV" = "development" ]; then
    echo "ERROR: This script is for PRODUCTION ONLY. Use deploy/backups/development/redis.sh for development."
    exit 1
fi

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
