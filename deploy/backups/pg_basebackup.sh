#!/bin/bash
# PostgreSQL Weekly Physical Backup (pg_basebackup)
# Retention: 4 weeks
# Schedule: cron 0 3 * * 0

set -euo pipefail

BACKUP_DIR="/var/backups/postgresql/weekly"
RETENTION_WEEKS=4
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_USER="${POSTGRES_USER:-loyallia}"
DB_HOST="${DB_HOST:-postgres}"

mkdir -p "$BACKUP_DIR"

pg_basebackup -h "$DB_HOST" -U "$DB_USER" \
  -D "$BACKUP_DIR/base_${TIMESTAMP}" \
  --format=tar \
  --gzip \
  --wal-method=stream \
  --checkpoint=fast \
  --label="loyallia_weekly_${TIMESTAMP}"

if [ ! -f "$BACKUP_DIR/base_${TIMESTAMP}/base.tar.gz" ]; then
  echo "ERROR: Base backup failed!"
  exit 1
fi

find "$BACKUP_DIR" -maxdepth 1 -name "base_*" -type d -mtime +$((RETENTION_WEEKS * 7)) -exec rm -rf {} +

echo "Base backup completed: base_${TIMESTAMP}"
