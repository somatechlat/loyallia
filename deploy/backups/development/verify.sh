#!/usr/bin/env bash
# Development Backup Verification
# Checks ./.agents/backups/ for recent, non-empty backup files

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/.agents/backups"
ERRORS=0

echo "=== Development Backup Verification ==="
echo "Backup dir: $BACKUP_DIR"
echo ""

if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ Backup directory does not exist!"
    exit 1
fi

# PostgreSQL
LATEST_PG="$(ls -t "$BACKUP_DIR"/pg_dump_*.dump 2>/dev/null | head -1 || true)"
if [ -z "$LATEST_PG" ]; then
    echo "❌ PostgreSQL: No backup found"
    ERRORS=$((ERRORS + 1))
else
    if stat -c %Y /dev/null >/dev/null 2>&1; then
        AGE_HOURS="$(( ($(date +%s) - $(stat -c %Y "$LATEST_PG")) / 3600 ))"
    else
        AGE_HOURS="$(( ($(date +%s) - $(stat -f %m "$LATEST_PG")) / 3600 ))"
    fi
    SIZE="$(du -h "$LATEST_PG" | cut -f1)"
    if [ "$AGE_HOURS" -gt 25 ]; then
        echo "⚠️  PostgreSQL: $(basename "$LATEST_PG") ($SIZE, ${AGE_HOURS}h old)"
        ERRORS=$((ERRORS + 1))
    else
        echo "✅ PostgreSQL: $(basename "$LATEST_PG") ($SIZE, ${AGE_HOURS}h old)"
    fi
fi

# Redis
LATEST_REDIS="$(ls -t "$BACKUP_DIR"/redis_*.rdb 2>/dev/null | head -1 || true)"
if [ -z "$LATEST_REDIS" ]; then
    echo "❌ Redis: No backup found"
    ERRORS=$((ERRORS + 1))
else
    SIZE="$(du -h "$LATEST_REDIS" | cut -f1)"
    echo "✅ Redis: $(basename "$LATEST_REDIS") ($SIZE)"
fi

# Vault secrets
LATEST_VAULT="$(ls -t "$BACKUP_DIR"/vault_secrets_*.json 2>/dev/null | head -1 || true)"
if [ -z "$LATEST_VAULT" ]; then
    echo "❌ Vault: No secrets backup found"
    ERRORS=$((ERRORS + 1))
else
    SIZE="$(du -h "$LATEST_VAULT" | cut -f1)"
    echo "✅ Vault secrets: $(basename "$LATEST_VAULT") ($SIZE)"
fi

# Vault init
LATEST_INIT="$(ls -t "$BACKUP_DIR"/vault_init_*.json 2>/dev/null | head -1 || true)"
if [ -z "$LATEST_INIT" ]; then
    echo "⚠️  Vault init: No init backup found"
    ERRORS=$((ERRORS + 1))
else
    SIZE="$(du -h "$LATEST_INIT" | cut -f1)"
    echo "✅ Vault init: $(basename "$LATEST_INIT") ($SIZE)"
fi

echo ""
if [ "$ERRORS" -gt 0 ]; then
    echo "⚠️  $ERRORS issue(s) found!"
    exit 1
else
    echo "✅ All development backups verified"
    exit 0
fi
