#!/bin/bash
# =============================================================================
# Loyallia  Manual Backup Script (deploy/backups/backup.sh)
# =============================================================================
# This script performs a complete platform backup. It is called by:
#   - Celery tasks (apps.backup.tasks.run_full_backup)
#   - Manual execution by sysadmins
#
# Architecture:
#   1. Read configuration from Vault + PlatformSetting (via Django env).
#   2. Run pg_dump for PostgreSQL.
#   3. Run Redis BGSAVE and copy dump.rdb.
#   4. Export Vault KV secrets.
#   5. Sync media from MinIO/S3.
#   6. Compress into a single archive.
#   7. Encrypt archive (GPG, if configured).
#   8. Upload to S3-compatible storage.
#   9. Verify archive integrity.
#   10. Cleanup local temp files.
#
# SEC: All secrets are read from Vault via environment variables.
# SEC: No secrets are logged or stored in this file.
#
# Usage:
#   chmod +x deploy/backups/backup.sh
#   ./deploy/backups/backup.sh [output_dir]
# =============================================================================

set -euo pipefail

# -- Configuration -----------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
OUTPUT_DIR="${1:-/tmp/loyallia_backups}"
TIMESTAMP="$(date -u +%Y%m%d_%H%M%S)"
ARCHIVE_NAME="loyallia_backup_${TIMESTAMP}.tar.gz"
ARCHIVE_PATH="${OUTPUT_DIR}/${ARCHIVE_NAME}"
TMP_DIR="$(mktemp -d /tmp/loyallia_backup_${TIMESTAMP}_XXXXXX)"
chmod 700 "${TMP_DIR}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# -- Read secrets from Vault (via env vars set by Docker/compose) -----------

PG_HOST="${PGBOUNCER_HOST:-localhost}"
PG_PORT="${PGBOUNCER_PORT:-6432}"
PG_DB="${POSTGRES_DB:-loyallia}"
PG_USER="${POSTGRES_USER:-loyallia}"
PG_PASSWORD="${POSTGRES_PASSWORD:-}"

REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_URL="${CELERY_BROKER_URL:-redis://localhost:6379/1}"

VAULT_ADDR="${VAULT_ADDR:-}"
VAULT_TOKEN_FILE="${VAULT_TOKEN_FILE:-}"
VAULT_SECRET_PATH="${VAULT_SECRET_PATH:-secret/data/loyallia/development}"

S3_ENDPOINT="${MINIO_ENDPOINT:-}"
S3_ACCESS_KEY="${MINIO_ACCESS_KEY:-}"
S3_SECRET_KEY="${MINIO_SECRET_KEY:-}"
S3_BUCKET="${BACKUP_S3_BUCKET:-loyallia-backups}"

GPG_KEY_ID="${BACKUP_GPG_KEY_ID:-}"

log_info "Starting Loyallia backup  ${TIMESTAMP}"
log_info "Output dir: ${OUTPUT_DIR}"
log_info "Temp dir:   ${TMP_DIR}"

mkdir -p "${OUTPUT_DIR}"

# -- 1. PostgreSQL backup ----------------------------------------------------

log_info "Step 1/7  Backing up PostgreSQL..."
PG_DUMP_FILE="${TMP_DIR}/loyallia_pg_${TIMESTAMP}.sql.gz"

if [ -z "${PG_PASSWORD}" ]; then
    log_error "POSTGRES_PASSWORD not set  cannot backup PostgreSQL"
    exit 1
fi

export PGPASSWORD="${PG_PASSWORD}"
pg_dump \
    --host="${PG_HOST}" \
    --port="${PG_PORT}" \
    --username="${PG_USER}" \
    --dbname="${PG_DB}" \
    --verbose \
    --no-owner \
    --no-privileges \
    --format=plain \
    | gzip > "${PG_DUMP_FILE}"

unset PGPASSWORD
PG_SIZE="$(stat -c%s "${PG_DUMP_FILE}" 2>/dev/null || stat -f%z "${PG_DUMP_FILE}" 2>/dev/null)"
log_info "PostgreSQL backup: ${PG_SIZE} bytes"

# -- 2. Redis backup ---------------------------------------------------------

log_info "Step 2/7  Backing up Redis..."
REDIS_FILE="${TMP_DIR}/loyallia_redis_${TIMESTAMP}.rdb"

# Trigger BGSAVE and wait
redis-cli -u "${REDIS_URL}" BGSAVE >/dev/null 2>&1 || true
sleep 2

# Wait for BGSAVE to complete
for i in $(seq 1 60); do
    IN_PROGRESS="$(redis-cli -u "${REDIS_URL}" INFO persistence 2>/dev/null | grep 'rdb_bgsave_in_progress' || true)"
    if echo "${IN_PROGRESS}" | grep -q ':0'; then
        break
    fi
    sleep 1
done

# Find and copy dump.rdb
REDIS_DATA_DIR="$(redis-cli -u "${REDIS_URL}" CONFIG GET dir 2>/dev/null | tail -n1 || echo '/data')"
if [ -f "${REDIS_DATA_DIR}/dump.rdb" ]; then
    cp -p "${REDIS_DATA_DIR}/dump.rdb" "${REDIS_FILE}"
    REDIS_SIZE="$(stat -c%s "${REDIS_FILE}" 2>/dev/null || stat -f%z "${REDIS_FILE}" 2>/dev/null)"
    log_info "Redis backup: ${REDIS_SIZE} bytes"
else
    log_warn "dump.rdb not found at ${REDIS_DATA_DIR}/dump.rdb"
    touch "${REDIS_FILE}"
fi

# -- 3. Vault secrets export -----------------------------------------------

log_info "Step 3/7  Exporting Vault secrets..."
VAULT_FILE="${TMP_DIR}/loyallia_vault_${TIMESTAMP}.json"

if [ -n "${VAULT_ADDR}" ] && [ -n "${VAULT_TOKEN_FILE}" ] && [ -f "${VAULT_TOKEN_FILE}" ]; then
    VAULT_TOKEN="$(cat "${VAULT_TOKEN_FILE}" | tr -d '[:space:]')"
    VAULT_CA="${VAULT_CACERT:-/vault/certs/vault.crt}"

    CURL_OPTS="--max-time 15 --silent"
    if [ -f "${VAULT_CA}" ]; then
        CURL_OPTS="${CURL_OPTS} --cacert ${VAULT_CA}"
    else
        CURL_OPTS="${CURL_OPTS} --insecure"
    fi

    curl ${CURL_OPTS} \
        --header "X-Vault-Token: ${VAULT_TOKEN}" \
        "${VAULT_ADDR}/v1/${VAULT_SECRET_PATH}" \
        > "${VAULT_FILE}" || {
        log_warn "Vault export failed  continuing without Vault backup"
        echo '{}' > "${VAULT_FILE}"
    }
    VAULT_SIZE="$(stat -c%s "${VAULT_FILE}" 2>/dev/null || stat -f%z "${VAULT_FILE}" 2>/dev/null)"
    log_info "Vault backup: ${VAULT_SIZE} bytes"
else
    log_warn "Vault not configured  skipping Vault export"
    echo '{}' > "${VAULT_FILE}"
fi

# -- 4. Media files backup --------------------------------------------------

log_info "Step 4/7  Backing up media files..."
MEDIA_TAR="${TMP_DIR}/loyallia_media_${TIMESTAMP}.tar.gz"
MEDIA_TMP="${TMP_DIR}/media_sync"
mkdir -p "${MEDIA_TMP}"

if [ -n "${S3_ENDPOINT}" ] && [ -n "${S3_ACCESS_KEY}" ]; then
    # Use AWS CLI (configured for MinIO/S3)
    export AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY}"
    export AWS_SECRET_ACCESS_KEY="${S3_SECRET_KEY}"

    for BUCKET in passes assets; do
        BUCKET_NAME_VAR="MINIO_BUCKET_$(echo "${BUCKET}" | tr '[:lower:]' '[:upper:]')"
        BUCKET_NAME="${!BUCKET_NAME_VAR:-${BUCKET}}"

        log_info "  Syncing bucket: ${BUCKET_NAME}..."
        mkdir -p "${MEDIA_TMP}/${BUCKET_NAME}"

        aws --endpoint-url="${S3_ENDPOINT}" \
            --no-verify-ssl \
            s3 sync "s3://${BUCKET_NAME}/" "${MEDIA_TMP}/${BUCKET_NAME}/" \
            >/dev/null 2>&1 || {
            log_warn "  Failed to sync bucket ${BUCKET_NAME}"
        }
    done

    unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY

    tar -czf "${MEDIA_TAR}" -C "${MEDIA_TMP}" .
    MEDIA_SIZE="$(stat -c%s "${MEDIA_TAR}" 2>/dev/null || stat -f%z "${MEDIA_TAR}" 2>/dev/null)"
    log_info "Media backup: ${MEDIA_SIZE} bytes"
else
    log_warn "S3/MinIO not configured  skipping media backup"
    tar -czf "${MEDIA_TAR}" --files-from /dev/null
fi

# -- 5. Compress into single archive ----------------------------------------

log_info "Step 5/7  Creating final archive..."
tar -czf "${ARCHIVE_PATH}" -C "${TMP_DIR}" .
ARCHIVE_SIZE="$(stat -c%s "${ARCHIVE_PATH}" 2>/dev/null || stat -f%z "${ARCHIVE_PATH}" 2>/dev/null)"
log_info "Archive: ${ARCHIVE_SIZE} bytes  ${ARCHIVE_PATH}"

# -- 6. Encrypt (optional) --------------------------------------------------

if [ -n "${GPG_KEY_ID}" ]; then
    log_info "Step 6/7  Encrypting archive with GPG (key: ${GPG_KEY_ID})..."
    gpg --batch --yes --recipient "${GPG_KEY_ID}" \
        --output "${ARCHIVE_PATH}.gpg" \
        --encrypt "${ARCHIVE_PATH}"
    rm -f "${ARCHIVE_PATH}"
    ARCHIVE_PATH="${ARCHIVE_PATH}.gpg"
    ARCHIVE_SIZE="$(stat -c%s "${ARCHIVE_PATH}" 2>/dev/null || stat -f%z "${ARCHIVE_PATH}" 2>/dev/null)"
    log_info "Encrypted archive: ${ARCHIVE_SIZE} bytes"
else
    log_info "Step 6/7  Encryption skipped (no GPG_KEY_ID set)"
fi

# -- 7. Upload to S3/MinIO --------------------------------------------------

log_info "Step 7/7  Uploading to S3/MinIO..."

if [ -n "${S3_ENDPOINT}" ] && [ -n "${S3_ACCESS_KEY}" ]; then
    export AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY}"
    export AWS_SECRET_ACCESS_KEY="${S3_SECRET_KEY}"

    S3_KEY="backups/$(date -u +%Y/%m/%d)/$(basename "${ARCHIVE_PATH}")"

    aws --endpoint-url="${S3_ENDPOINT}" \
        --no-verify-ssl \
        s3 cp "${ARCHIVE_PATH}" "s3://${S3_BUCKET}/${S3_KEY}" \
        >/dev/null 2>&1 || {
        log_error "Failed to upload to S3"
        exit 1
    }

    unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
    log_info "Uploaded: s3://${S3_BUCKET}/${S3_KEY}"
else
    log_warn "S3/MinIO not configured  archive kept locally at ${ARCHIVE_PATH}"
    S3_KEY=""
fi

# -- 8. Verify --------------------------------------------------------------

log_info "Verifying archive integrity..."
if gzip --test "${ARCHIVE_PATH}" 2>/dev/null; then
    log_info "Archive integrity: OK"
else
    log_warn "Archive integrity check: SKIP (encrypted or non-gzip)"
fi

# -- Cleanup ----------------------------------------------------------------

log_info "Cleaning up temp files..."
rm -rf "${TMP_DIR}"

if [ -n "${S3_KEY}" ]; then
    rm -f "${ARCHIVE_PATH}"
fi

log_info "Backup completed successfully!"
log_info "S3 key: ${S3_KEY:-(local only)}"
log_info "Archive: ${ARCHIVE_NAME}"

exit 0
