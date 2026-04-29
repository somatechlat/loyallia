#!/bin/bash
# Backup Verification Script
# Schedule: cron 0 6 * * *

set -euo pipefail

REPORT="/var/backups/verification_report.txt"
ERRORS=0

echo "=== Backup Verification Report ===" > "$REPORT"
echo "Date: $(date)" >> "$REPORT"
echo "" >> "$REPORT"

# Check PostgreSQL daily backup
PG_DIR="/var/backups/postgresql/daily"
LATEST_PG=$(ls -t "$PG_DIR"/pg_dump_*.dump 2>/dev/null | head -1)
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
REDIS_DIR="/var/backups/redis"
LATEST_REDIS=$(ls -t "$REDIS_DIR"/dump_*.rdb.gz 2>/dev/null | head -1)
if [ -z "$LATEST_REDIS" ]; then
  echo "❌ Redis: No backup found!" >> "$REPORT"
  ERRORS=$((ERRORS + 1))
else
  SIZE=$(du -h "$LATEST_REDIS" | cut -f1)
  echo "✅ Redis: $LATEST_REDIS ($SIZE)" >> "$REPORT"
fi

# Check MinIO backup
MINIO_DIR="/var/backups/minio"
if [ -d "$MINIO_DIR" ] && [ "$(ls -A $MINIO_DIR 2>/dev/null)" ]; then
  echo "✅ MinIO: Backups exist" >> "$REPORT"
else
  echo "❌ MinIO: No backups found!" >> "$REPORT"
  ERRORS=$((ERRORS + 1))
fi

# Check Vault backup
VAULT_DIR="/var/backups/vault"
LATEST_VAULT=$(ls -t "$VAULT_DIR"/vault_*.snap.gz 2>/dev/null | head -1)
if [ -z "$LATEST_VAULT" ]; then
  echo "❌ Vault: No backup found!" >> "$REPORT"
  ERRORS=$((ERRORS + 1))
else
  SIZE=$(du -h "$LATEST_VAULT" | cut -f1)
  echo "✅ Vault: $LATEST_VAULT ($SIZE)" >> "$REPORT"
fi

echo "" >> "$REPORT"
if [ "$ERRORS" -gt 0 ]; then
  echo "⚠️  $ERRORS issue(s) found!" >> "$REPORT"
  exit 1
else
  echo "✅ All backups verified successfully" >> "$REPORT"
  exit 0
fi
