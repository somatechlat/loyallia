#!/bin/bash
# Backup Verification Script
# Schedule: cron 0 6 * * *

set -euo pipefail

REPORT="/var/backups/loyallia/verification_report.txt"
ERRORS=0

echo "=== Backup Verification Report ===" > "$REPORT"
echo "Date: $(date)" >> "$REPORT"
echo "" >> "$REPORT"

# Check PostgreSQL daily backup
PG_DIR="/var/backups/loyallia/pg"
LATEST_PG=$(ls -t "$PG_DIR"/*.dump 2>/dev/null | head -1)
if [ -z "$LATEST_PG" ]; then
  echo "❌ PostgreSQL: No backup found!" >> "$REPORT"
  ERRORS=$((ERRORS + 1))
else
  SIZE=$(du -h "$LATEST_PG" | cut -f1)
  AGE=$(( ($(date +%s) - $(stat -c %Y "$LATEST_PG")) / 3600 ))
  if [ "$AGE" -gt 25 ]; then
    echo "⚠️  PostgreSQL: Backup is ${AGE}h old (may be stale)" >> "$REPORT"
    ERRORS=$((ERRORS + 1))
  else
    echo "✅ PostgreSQL: $LATEST_PG ($SIZE, ${AGE}h ago)" >> "$REPORT"
  fi
fi

# Check Redis backup
REDIS_DIR="/var/backups/loyallia/redis"
LATEST_REDIS=$(ls -t "$REDIS_DIR"/*.rdb 2>/dev/null | head -1)
if [ -z "$LATEST_REDIS" ]; then
  echo "❌ Redis: No backup found!" >> "$REPORT"
  ERRORS=$((ERRORS + 1))
else
  SIZE=$(du -h "$LATEST_REDIS" | cut -f1)
  echo "✅ Redis: $LATEST_REDIS ($SIZE)" >> "$REPORT"
fi

# Check MinIO backup
MINIO_DIR="/var/backups/loyallia/minio"
if [ -d "$MINIO_DIR" ] && [ "$(ls -A $MINIO_DIR 2>/dev/null)" ]; then
  echo "✅ MinIO: Backups exist" >> "$REPORT"
else
  echo "❌ MinIO: No backups found!" >> "$REPORT"
  ERRORS=$((ERRORS + 1))
fi

# Check Vault backup
VAULT_DIR="/var/backups/loyallia/vault"
LATEST_VAULT_SECRETS=$(ls -t "$VAULT_DIR"/loyallia_vault_secrets_*.json.age 2>/dev/null | head -1)
LATEST_VAULT_INIT=$(ls -t "$VAULT_DIR"/loyallia_vault_init_*.json.age 2>/dev/null | head -1)
if [ -z "$LATEST_VAULT_SECRETS" ]; then
  echo "❌ Vault: No secrets backup found!" >> "$REPORT"
  ERRORS=$((ERRORS + 1))
else
  SIZE=$(du -h "$LATEST_VAULT_SECRETS" | cut -f1)
  echo "✅ Vault secrets: $(basename "$LATEST_VAULT_SECRETS") ($SIZE)" >> "$REPORT"
fi
if [ -z "$LATEST_VAULT_INIT" ]; then
  echo "⚠️  Vault: No init backup found!" >> "$REPORT"
  ERRORS=$((ERRORS + 1))
else
  SIZE=$(du -h "$LATEST_VAULT_INIT" | cut -f1)
  echo "✅ Vault init: $(basename "$LATEST_VAULT_INIT") ($SIZE)" >> "$REPORT"
fi

echo "" >> "$REPORT"
if [ "$ERRORS" -gt 0 ]; then
  echo "⚠️  $ERRORS issue(s) found!" >> "$REPORT"
  exit 1
else
  echo "✅ All backups verified successfully" >> "$REPORT"
  exit 0
fi
