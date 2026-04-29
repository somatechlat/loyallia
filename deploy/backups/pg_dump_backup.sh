#!/bin/bash
# PostgreSQL Daily Logical Backup (pg_dump)
# Retention: 30 days
# Schedule: cron 0 2 * * *

set -euo pipefail

BACKUP_DIR="/var/backups/postgresql/daily"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="${POSTGRES_DB:-loyallia}"
DB_USER="${POSTGRES_USER:-loyallia}"
DB_HOST="${DB_HOST:-postgres}"

mkdir -p "$BACKUP_DIR"

pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
  --format=custom \
  --compress=9 \
  --file="$BACKUP_DIR/pg_dump_${TIMESTAMP}.dump"

if [ ! -s "$BACKUP_DIR/pg_dump_${TIMESTAMP}.dump" ]; then
  echo "ERROR: Backup file is empty or missing!"
  exit 1
fi

find "$BACKUP_DIR" -name "pg_dump_*.dump" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: pg_dump_${TIMESTAMP}.dump ($(du -h "$BACKUP_DIR/pg_dump_${TIMESTAMP}.dump" | cut -f1))"
