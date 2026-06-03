#!/usr/bin/env bash
# =============================================================================
# LOYALLIA RESTORE — PRODUCTION MINIO
# =============================================================================
# Finds latest encrypted backup, decrypts, and mirrors back to MinIO.
# =============================================================================

set -euo pipefail

source "$(dirname "$0")/env.sh"
source "$PROJECT_ROOT/deploy/backups/lib/common.sh"
source "$PROJECT_ROOT/deploy/backups/lib/encrypt.sh"

FORCE=0
if [ "${1:-}" = "--force" ]; then
    FORCE=1
fi

BACKUP_DIR_MINIO="$BACKUP_DIR/minio"
LATEST_AGE=$(find_latest_backup "$BACKUP_DIR_MINIO" "*.tar.age")

if [ -z "$LATEST_AGE" ]; then
    die "No encrypted MinIO backup found in $BACKUP_DIR_MINIO"
fi

step "MINIO RESTORE"
info "Latest backup: $(basename "$LATEST_AGE")"

# --- Confirmation --------------------------------------------------------------
confirm_restore "WARNING: This will REPLACE objects in MinIO buckets."

# --- Decrypt -------------------------------------------------------------------
TMPDIR="$TEMP_DIR/minio_restore_$$"
ensure_dir "$TMPDIR"
setup_cleanup "$TMPDIR"

TARFILE="$TMPDIR/minio.tar"
decrypt_file "$LATEST_AGE" "$TARFILE"

if [ ! -s "$TARFILE" ]; then
    die "Decrypted backup is empty"
fi

log "Decrypted: $(basename "$LATEST_AGE") → $TARFILE"

# --- Extract -------------------------------------------------------------------
tar xzf "$TARFILE" -C "$TMPDIR" || die "Extraction failed"

EXTRACTED=$(find "$TMPDIR" -maxdepth 1 -type d | tail -n +2 | head -1 || true)
if [ -z "$EXTRACTED" ]; then
    die "No extracted directory found"
fi

if [ ! -r "/run/loyallia-vault/minio_root_user" ] || [ ! -r "/run/loyallia-vault/minio_root_password" ]; then
    die "MinIO credentials not found"
fi

MINIO_ROOT_USER=$(cat /run/loyallia-vault/minio_root_user)
MINIO_ROOT_PASSWORD=$(cat /run/loyallia-vault/minio_root_password)

log "Mirroring data back to MinIO ..."
mc alias set loyallia-backup http://127.0.0.1:33903 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null || die "mc alias failed"

if [ -d "$EXTRACTED/passes" ]; then
    mc mirror --overwrite "$EXTRACTED/passes" loyallia-backup/passes || warn "Mirror passes failed"
fi

if [ -d "$EXTRACTED/assets" ]; then
    mc mirror --overwrite "$EXTRACTED/assets" loyallia-backup/assets || warn "Mirror assets failed"
fi

mc alias remove loyallia-backup >/dev/null || true

log "MinIO restore complete"
