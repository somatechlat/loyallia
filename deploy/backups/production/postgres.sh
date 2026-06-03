#!/usr/bin/env bash
# =============================================================================
# LOYALLIA BACKUP — PRODUCTION POSTGRESQL
# =============================================================================
# Uses HOST pg_dump (NOT docker exec) for performance.
# Custom format, compress=9.
# Output: $BACKUP_DIR/postgres/loyallia_<timestamp>.dump
# =============================================================================

set -euo pipefail

source "$(dirname "$0")/env.sh"
source "$PROJECT_ROOT/deploy/backups/lib/common.sh"
source "$PROJECT_ROOT/deploy/backups/lib/encrypt.sh"

require_cmd pg_dump

TIMESTAMP=$(timestamp)
OUTDIR="$BACKUP_DIR/postgres"
ensure_dir "$OUTDIR"
OUTFILE="$OUTDIR/loyallia_${TIMESTAMP}.dump"

if [ ! -r "/run/loyallia-vault/postgres_password" ]; then
    die "Postgres password not found at /run/loyallia-vault/postgres_password"
fi

PGPASSWORD=$(cat /run/loyallia-vault/postgres_password)
export PGPASSWORD

step "POSTGRESQL BACKUP"
log "Dumping database to $OUTFILE ..."

pg_dump -h 127.0.0.1 -p 33900 -U loyallia -d loyallia \
    --format=custom --compress=9 \
    --file="$OUTFILE" || die "pg_dump failed"

if [ ! -s "$OUTFILE" ]; then
    rm -f "$OUTFILE"
    die "Backup file is empty: $OUTFILE"
fi

SIZE="$(du -h "$OUTFILE" | cut -f1)"
log "PostgreSQL backup: $(basename "$OUTFILE") ($SIZE)"

# Encrypt and remove plaintext
encrypt_file "$OUTFILE"
rm -f "$OUTFILE"

log "PostgreSQL backup complete: $(basename "$OUTFILE").age"
