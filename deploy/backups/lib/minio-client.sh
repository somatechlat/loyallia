#!/usr/bin/env bash
# =============================================================================
# LOYALLIA BACKUP — MINIO CLIENT WRAPPER (Avender Offsite)
# =============================================================================
# Uploads/downloads backups to/from Avender MinIO server.
# Uses boto3 via Python (more reliable than mc binary).
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# --- Configuration (hardcoded for Avender server) ----------------------------
MINIO_ENDPOINT="http://149.28.50.169:9100"
MINIO_BUCKET="backups"
MINIO_ACCESS_KEY="11URJWEWY9P0HVMJ0ZHQ"
MINIO_SECRET_KEY="WCNR4+jtHYeCFQgycYxZ4LNzMwgDjLEDA8w+93SC"
MINIO_REGION="us-east-1"

# --- Python boto3 helper -----------------------------------------------------
_boto3() {
    python3 -c "
import sys, boto3, os
from botocore.config import Config
from botocore.exceptions import ClientError

endpoint = '$MINIO_ENDPOINT'
access_key = '$MINIO_ACCESS_KEY'
secret_key = '$MINIO_SECRET_KEY'
region = '$MINIO_REGION'

config = Config(
    signature_version='s3v4',
    retries={'max_attempts': 3, 'mode': 'standard'}
)

s3 = boto3.client(
    's3',
    endpoint_url=endpoint,
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    region_name=region,
    config=config
)

${1}
" 2>&1
}

# --- Check connectivity ------------------------------------------------------
minio_check_connectivity() {
    local result
    result=$(_boto3 "
try:
    s3.list_buckets()
    print('OK')
except Exception as e:
    print(f'FAIL: {e}')
    sys.exit(1)
") || true

    if echo "$result" | grep -q "^OK"; then
        log "MinIO connectivity OK ($MINIO_ENDPOINT)"
        return 0
    else
        err "MinIO connectivity FAILED: $result"
        return 1
    fi
}

# --- Upload file -------------------------------------------------------------
# Usage: minio_upload <local_path> <remote_key>
minio_upload() {
    local local_path="$1"
    local remote_key="$2"

    if [ ! -f "$local_path" ]; then
        die "Cannot upload: file not found: $local_path"
    fi

    local result
    result=$(_boto3 "
try:
    s3.upload_file('$local_path', '$MINIO_BUCKET', '$remote_key')
    print('OK')
except Exception as e:
    print(f'FAIL: {e}')
    sys.exit(1)
") || true

    if echo "$result" | grep -q "^OK"; then
        log "Uploaded: $local_path → s3://$MINIO_BUCKET/$remote_key"
        return 0
    else
        die "Upload failed: $result"
    fi
}

# --- Download file -----------------------------------------------------------
# Usage: minio_download <remote_key> <local_path>
minio_download() {
    local remote_key="$1"
    local local_path="$2"

    ensure_dir "$(dirname "$local_path")"

    local result
    result=$(_boto3 "
try:
    s3.download_file('$MINIO_BUCKET', '$remote_key', '$local_path')
    print('OK')
except Exception as e:
    print(f'FAIL: {e}')
    sys.exit(1)
") || true

    if echo "$result" | grep -q "^OK"; then
        log "Downloaded: s3://$MINIO_BUCKET/$remote_key → $local_path"
        return 0
    else
        die "Download failed: $result"
    fi
}

# --- List objects ------------------------------------------------------------
# Usage: minio_list <prefix>
minio_list() {
    local prefix="$1"

    _boto3 "
try:
    paginator = s3.get_paginator('list_objects_v2')
    for page in paginator.paginate(Bucket='$MINIO_BUCKET', Prefix='$prefix'):
        for obj in page.get('Contents', []):
            print(f\"{obj['Key']}\t{obj['Size']}\t{obj['LastModified']}\")
except Exception as e:
    print(f'FAIL: {e}')
    sys.exit(1)
"
}

# --- Delete object -----------------------------------------------------------
# Usage: minio_delete <remote_key>
minio_delete() {
    local remote_key="$1"

    local result
    result=$(_boto3 "
try:
    s3.delete_object(Bucket='$MINIO_BUCKET', Key='$remote_key')
    print('OK')
except Exception as e:
    print(f'FAIL: {e}')
    sys.exit(1)
") || true

    if echo "$result" | grep -q "^OK"; then
        log "Deleted: s3://$MINIO_BUCKET/$remote_key"
        return 0
    else
        die "Delete failed: $result"
    fi
}

# --- Verify upload exists ----------------------------------------------------
# Usage: minio_exists <remote_key>
minio_exists() {
    local remote_key="$1"

    local result
    result=$(_boto3 "
try:
    s3.head_object(Bucket='$MINIO_BUCKET', Key='$remote_key')
    print('OK')
except ClientError as e:
    if e.response['Error']['Code'] == '404':
        print('NOT_FOUND')
    else:
        print(f'FAIL: {e}')
        sys.exit(1)
") || true

    if echo "$result" | grep -q "^OK"; then
        return 0
    else
        return 1
    fi
}

# --- Main (for direct execution) ---------------------------------------------
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    case "${1:-}" in
        check)
            minio_check_connectivity
            ;;
        upload)
            minio_upload "$2" "$3"
            ;;
        download)
            minio_download "$2" "$3"
            ;;
        list)
            minio_list "${2:-}"
            ;;
        delete)
            minio_delete "$2"
            ;;
        *)
            echo "Usage: $0 {check|upload|download|list|delete} [args...]"
            exit 1
            ;;
    esac
fi
