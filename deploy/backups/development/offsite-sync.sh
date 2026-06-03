#!/usr/bin/env bash
# =============================================================================
# LOYALLIA BACKUP — Offsite Sync (Development)
# =============================================================================
# Uploads all local .age backup files to the Avender offsite MinIO server.
# Verifies connectivity first and HEAD-checks every upload.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"
source "$SCRIPT_DIR/../lib/common.sh"
source "$SCRIPT_DIR/../lib/minio-client.sh"

step "Offsite Sync"

# --- Connectivity check -----------------------------------------------------
if ! minio_check_connectivity; then
    die "Cannot connect to offsite MinIO"
fi

# --- Build remote prefix ----------------------------------------------------
TODAY=$(date +%Y/%m/%d)
REMOTE_PREFIX="$OFFSITE_PREFIX/$TODAY"

# --- Collect files ----------------------------------------------------------
FILES=()
while IFS= read -r -d '' file; do
    FILES+=("$file")
done < <(find "$BACKUP_DIR" -name '*.age' -type f -print0 2>/dev/null)

if [ ${#FILES[@]} -eq 0 ]; then
    die "No .age backup files found in $BACKUP_DIR"
fi

log "Found ${#FILES[@]} .age file(s) to upload"

# --- Upload with verification -----------------------------------------------
FAILED=0
for file in "${FILES[@]}"; do
    rel_path="${file#$BACKUP_DIR/}"
    remote_key="$REMOTE_PREFIX/$rel_path"

    log "Uploading: $rel_path"
    if minio_upload "$file" "$remote_key"; then
        if minio_exists "$remote_key"; then
            log "Verified: $remote_key"
        else
            err "Upload verification failed: $remote_key"
            FAILED=$((FAILED + 1))
        fi
    else
        err "Upload failed: $rel_path"
        FAILED=$((FAILED + 1))
    fi
done

# --- Summary ----------------------------------------------------------------
if [ "$FAILED" -gt 0 ]; then
    die "$FAILED upload(s) failed"
fi

log "Offsite sync complete. All files uploaded to s3://$MINIO_BUCKET/$REMOTE_PREFIX/"
