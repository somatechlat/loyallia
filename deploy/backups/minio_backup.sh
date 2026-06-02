#!/bin/bash
# MinIO Bucket Mirror Backup
# Retention: 30 days
# Schedule: cron 0 4 * * *

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
    echo "ERROR: This script is for PRODUCTION ONLY. Use deploy/backups/development/orchestrator.sh for development."
    exit 1
fi

BACKUP_DIR="/var/backups/minio"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MINIO_ALIAS="local"
MINIO_URL="${MINIO_ENDPOINT:-http://minio:9000}"
VAULT_RUNTIME="${VAULT_RUNTIME_DIR:-/run/loyallia-vault}"
MINIO_USER="$(cat "$VAULT_RUNTIME/minio_root_user")"
MINIO_PASS="$(cat "$VAULT_RUNTIME/minio_root_password")"

mkdir -p "$BACKUP_DIR"

mc alias set "$MINIO_ALIAS" "$MINIO_URL" "$MINIO_USER" "$MINIO_PASS"

for bucket in passes assets; do
  mc mirror --overwrite "$MINIO_ALIAS/$bucket" "$BACKUP_DIR/$bucket/$TIMESTAMP/"
done

find "$BACKUP_DIR" -maxdepth 2 -type d -mtime +$RETENTION_DAYS -exec rm -rf {} +

echo "MinIO backup completed: $TIMESTAMP"
