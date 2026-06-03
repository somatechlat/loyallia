#!/usr/bin/env bash
# =============================================================================
# LOYALLIA BACKUP — PostgreSQL (Development)
# =============================================================================
# Dumps the loyallia database using docker compose exec pg_dump.
# Encrypts the result with age and removes the plaintext.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"
source "$SCRIPT_DIR/../lib/common.sh"
source "$SCRIPT_DIR/../lib/encrypt.sh"

TS=$(timestamp)
OUTDIR="$BACKUP_DIR/postgres"
ensure_dir "$OUTDIR"

OUTFILE="$OUTDIR/loyallia_${TS}.sql"

step "PostgreSQL Backup"
log "Running pg_dump → $OUTFILE ..."

$COMPOSE_CMD exec -T postgres pg_dump \
    -U loyallia -d loyallia --no-owner --no-privileges \
    > "$OUTFILE"

if [ ! -s "$OUTFILE" ]; then
    rm -f "$OUTFILE"
    die "Backup file is empty"
fi

SIZE="$(du -h "$OUTFILE" | cut -f1)"
log "PostgreSQL backup: $OUTFILE ($SIZE)"

encrypt_file "$OUTFILE" "$OUTFILE.age"
rm -f "$OUTFILE"
log "PostgreSQL backup complete: ${OUTFILE}.age"
