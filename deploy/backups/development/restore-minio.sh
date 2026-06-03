#!/usr/bin/env bash
# =============================================================================
# LOYALLIA RESTORE — MinIO (Development)
# =============================================================================
# Finds the latest encrypted MinIO backup, decrypts the tar.gz,
# copies the data into the MinIO container, and mirrors it back.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"
source "$SCRIPT_DIR/../lib/common.sh"
source "$SCRIPT_DIR/../lib/encrypt.sh"

step "MinIO Restore"

# --- Find latest encrypted backup -------------------------------------------
LATEST=$(find_latest_backup "$BACKUP_DIR/minio" "*.age")

if [ -z "$LATEST" ]; then
    die "No encrypted MinIO backup found in $BACKUP_DIR/minio/"
fi

log "Latest backup: $(basename "$LATEST")"

# --- Decrypt and extract ----------------------------------------------------
TMPDIR=$(mktemp -d)
setup_cleanup "$TMPDIR"

log "Decrypting backup ..."
decrypt_file "$LATEST" "$TMPDIR/minio.tar.gz"

log "Extracting archive ..."
mkdir -p "$TMPDIR/minio"
tar xzf "$TMPDIR/minio.tar.gz" -C "$TMPDIR/minio"

# --- Read credentials from container ----------------------------------------
MINIO_ROOT_USER="$($COMPOSE_CMD exec -T minio sh -c 'echo "\$MINIO_ROOT_USER"')"
MINIO_ROOT_PASSWORD="$($COMPOSE_CMD exec -T minio sh -c 'echo "\$MINIO_ROOT_PASSWORD"')"

if [ -z "$MINIO_ROOT_USER" ] || [ -z "$MINIO_ROOT_PASSWORD" ]; then
    die "Cannot read MinIO credentials from container"
fi

# --- Copy data into container and mirror back -------------------------------
log "Copying backup data into MinIO container ..."
$COMPOSE_CMD exec -T minio sh -c 'rm -rf /tmp/minio_restore && mkdir -p /tmp/minio_restore'
$COMPOSE_CMD cp "$TMPDIR/minio/." minio:/tmp/minio_restore/

log "Mirroring data back to MinIO ..."
$COMPOSE_CMD exec -T minio sh -c "
    export MC_HOST_local=http://${MINIO_ROOT_USER}:${MINIO_ROOT_PASSWORD}@localhost:9000
    if [ -d /tmp/minio_restore/passes ]; then
        mc mirror /tmp/minio_restore/passes local/passes >/dev/null
    fi
    if [ -d /tmp/minio_restore/assets ]; then
        mc mirror /tmp/minio_restore/assets local/assets >/dev/null
    fi
"

log "MinIO restore complete."
