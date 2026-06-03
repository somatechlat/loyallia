#!/usr/bin/env bash
# =============================================================================
# LOYALLIA BACKUP — PRODUCTION OFFSITE SYNC
# =============================================================================
# Syncs all .age files to Avender MinIO.
# Uses deploy/backups/lib/minio-client.sh.
# Uploads to s3://backups/loyallia/production/YYYY/MM/DD/
# =============================================================================

set -euo pipefail

source "$(dirname "$0")/env.sh"
source "$PROJECT_ROOT/deploy/backups/lib/common.sh"
source "$PROJECT_ROOT/deploy/backups/lib/minio-client.sh"

step "OFFSITE SYNC"

# --- Connectivity check --------------------------------------------------------
if ! minio_check_connectivity; then
    die "Offsite MinIO unreachable. Aborting sync."
fi

# --- Find and upload .age files ------------------------------------------------
DATE_PREFIX=$(date +%Y/%m/%d)
UPLOADED=0
FAILED=0

while IFS= read -r -d '' file; do
    filename=$(basename "$file")
    remote_key="$OFFSITE_PREFIX/$DATE_PREFIX/$filename"

    log "Uploading: $filename → s3://backups/$remote_key"
    if minio_upload "$file" "$remote_key"; then
        if minio_exists "$remote_key"; then
            log "Verified: $remote_key"
            UPLOADED=$((UPLOADED + 1))
        else
            err "Upload verification failed: $remote_key"
            FAILED=$((FAILED + 1))
        fi
    else
        FAILED=$((FAILED + 1))
    fi
done < <(find "$BACKUP_DIR" -type f -name '*.age' -print0)

echo ""
log "Offsite sync complete: $UPLOADED uploaded, $FAILED failed"

if [ "$FAILED" -gt 0 ]; then
    exit 1
fi
