#!/usr/bin/env bash
# =============================================================================
# LOYALLIA BACKUP — PostgreSQL Logical Dump (Development)
# =============================================================================
# Uses docker compose exec (no host binaries required).
# Output: $PROJECT_ROOT/.agents/backups/pg_dump_YYYYMMDD_HHMMSS.dump
#
# Usage:
#   ./deploy/backups/development/pg_dump.sh
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/.agents/backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DB_NAME="${POSTGRES_DB:-loyallia_dev}"
DB_USER="${POSTGRES_USER:-loyallia}"

mkdir -p "$BACKUP_DIR"

echo "[dev-backup] PostgreSQL dump starting..."
docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres \
    pg_dump -U "$DB_USER" -d "$DB_NAME" --format=custom --compress=9 \
    > "$BACKUP_DIR/pg_dump_${TIMESTAMP}.dump"

if [ ! -s "$BACKUP_DIR/pg_dump_${TIMESTAMP}.dump" ]; then
    echo "[dev-backup] ERROR: Backup file is empty!"
    rm -f "$BACKUP_DIR/pg_dump_${TIMESTAMP}.dump"
    exit 1
fi

SIZE="$(du -h "$BACKUP_DIR/pg_dump_${TIMESTAMP}.dump" | cut -f1)"
echo "[dev-backup] PostgreSQL backup: pg_dump_${TIMESTAMP}.dump ($SIZE)"
