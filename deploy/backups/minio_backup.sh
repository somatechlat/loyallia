#!/bin/bash
# MinIO Bucket Mirror Backup
# Retention: 30 days
# Schedule: cron 0 4 * * *

set -euo pipefail

BACKUP_DIR="/var/backups/minio"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MINIO_ALIAS="local"
MINIO_URL="${MINIO_ENDPOINT:-http://minio:9000}"
MINIO_USER="${MINIO_ROOT_USER:-minioadmin}"
MINIO_PASS="${MINIO_ROOT_PASSWORD:-minioadmin}"

mkdir -p "$BACKUP_DIR"

mc alias set "$MINIO_ALIAS" "$MINIO_URL" "$MINIO_USER" "$MINIO_PASS"

for bucket in passes assets; do
  mc mirror --overwrite "$MINIO_ALIAS/$bucket" "$BACKUP_DIR/$bucket/$TIMESTAMP/"
done

find "$BACKUP_DIR" -maxdepth 2 -type d -mtime +$RETENTION_DAYS -exec rm -rf {} +

echo "MinIO backup completed: $TIMESTAMP"
