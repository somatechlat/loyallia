#!/bin/bash
# Vault Snapshot Backup
# Retention: 30 days
# Schedule: cron 0 5 * * *

set -euo pipefail

BACKUP_DIR="/var/backups/vault"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
VAULT_ADDR="${VAULT_ADDR:-http://vault:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-}"

mkdir -p "$BACKUP_DIR"

curl -s -H "X-Vault-Token: $VAULT_TOKEN" \
  "$VAULT_ADDR/v1/sys/storage/raft/snapshot" \
  -o "$BACKUP_DIR/vault_${TIMESTAMP}.snap"

if [ ! -s "$BACKUP_DIR/vault_${TIMESTAMP}.snap" ]; then
  echo "ERROR: Vault snapshot failed!"
  exit 1
fi

gzip "$BACKUP_DIR/vault_${TIMESTAMP}.snap"

find "$BACKUP_DIR" -name "vault_*.snap.gz" -mtime +$RETENTION_DAYS -delete

echo "Vault backup completed: vault_${TIMESTAMP}.snap.gz"
