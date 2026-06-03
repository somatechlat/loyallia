#!/usr/bin/env bash
# =============================================================================
# LOYALLIA BACKUP — PRODUCTION MINIO
# =============================================================================
# Uses HOST mc mirror for passes and assets buckets.
# Output: $BACKUP_DIR/minio/
# =============================================================================

set -euo pipefail

source "$(dirname "$0")/env.sh"
source "$PROJECT_ROOT/deploy/backups/lib/common.sh"
source "$PROJECT_ROOT/deploy/backups/lib/encrypt.sh"

require_cmd mc

TIMESTAMP=$(timestamp)
OUTDIR="$BACKUP_DIR/minio"
ensure_dir "$OUTDIR"
TMPDIR="$TEMP_DIR/minio_${TIMESTAMP}_$$"
ensure_dir "$TMPDIR"
setup_cleanup "$TMPDIR"

if [ ! -r "/run/loyallia-vault/minio_root_user" ] || [ ! -r "/run/loyallia-vault/minio_root_password" ]; then
    die "MinIO credentials not found in /run/loyallia-vault/"
fi

MINIO_ROOT_USER=$(cat /run/loyallia-vault/minio_root_user)
MINIO_ROOT_PASSWORD=$(cat /run/loyallia-vault/minio_root_password)

step "MINIO BACKUP"
log "Mirroring MinIO buckets ..."

# Set up temporary alias
mc alias set loyallia-backup http://127.0.0.1:33903 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null || die "Failed to set mc alias"

# Mirror buckets
mc mirror loyallia-backup/passes "$TMPDIR/passes" || die "Mirror passes failed"
mc mirror loyallia-backup/assets "$TMPDIR/assets" || die "Mirror assets failed"

# Remove alias
mc alias remove loyallia-backup >/dev/null || true

# Tar and encrypt
TARFILE="$OUTDIR/minio_${TIMESTAMP}.tar"
tar czf "$TARFILE" -C "$TEMP_DIR" "$(basename "$TMPDIR")" || die "Tar creation failed"

SIZE="$(du -h "$TARFILE" | cut -f1)"
log "MinIO archive: $(basename "$TARFILE") ($SIZE)"

encrypt_file "$TARFILE"
rm -f "$TARFILE"

log "MinIO backup complete: $(basename "$TARFILE").age"
