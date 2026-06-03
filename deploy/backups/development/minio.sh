#!/usr/bin/env bash
# =============================================================================
# LOYALLIA BACKUP — MinIO (Development)
# =============================================================================
# Mirrors the 'passes' and 'assets' buckets from the MinIO container,
# streams the backup out as a tar.gz, encrypts with age, and removes plaintext.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"
source "$SCRIPT_DIR/../lib/common.sh"
source "$SCRIPT_DIR/../lib/encrypt.sh"

TS=$(timestamp)
OUTDIR="$BACKUP_DIR/minio"
ensure_dir "$OUTDIR"

TMPDIR=$(mktemp -d)
setup_cleanup "$TMPDIR"

step "MinIO Backup"

# --- Verify mc is available in container ------------------------------------
if ! $COMPOSE_CMD exec -T minio sh -c 'command -v mc >/dev/null 2>&1'; then
    die "mc binary not found in minio container"
fi

# --- Read credentials from container environment ----------------------------
MINIO_ROOT_USER="$($COMPOSE_CMD exec -T minio sh -c 'echo "\$MINIO_ROOT_USER"')"
MINIO_ROOT_PASSWORD="$($COMPOSE_CMD exec -T minio sh -c 'echo "\$MINIO_ROOT_PASSWORD"')"

if [ -z "$MINIO_ROOT_USER" ] || [ -z "$MINIO_ROOT_PASSWORD" ]; then
    die "Cannot read MinIO credentials from container"
fi

# --- Mirror buckets inside container and stream tar out ---------------------
log "Mirroring passes and assets buckets ..."

$COMPOSE_CMD exec -T minio sh -c "
    mkdir -p /tmp/minio_backup
    export MC_HOST_local=http://${MINIO_ROOT_USER}:${MINIO_ROOT_PASSWORD}@localhost:9000
    mc mirror local/passes /tmp/minio_backup/passes >/dev/null
    mc mirror local/assets /tmp/minio_backup/assets >/dev/null
    cd /tmp/minio_backup && tar czf - .
" > "$TMPDIR/minio_backup.tar.gz"

if [ ! -s "$TMPDIR/minio_backup.tar.gz" ]; then
    die "MinIO backup archive is empty"
fi

ARCHIVE="$OUTDIR/minio_${TS}.tar.gz"
mv "$TMPDIR/minio_backup.tar.gz" "$ARCHIVE"

SIZE="$(du -h "$ARCHIVE" | cut -f1)"
log "MinIO backup: $ARCHIVE ($SIZE)"

encrypt_file "$ARCHIVE" "$ARCHIVE.age"
rm -f "$ARCHIVE"
log "MinIO backup complete: ${ARCHIVE}.age"
