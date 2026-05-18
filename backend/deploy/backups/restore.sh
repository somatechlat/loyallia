#!/bin/bash
# =============================================================================
# Loyallia  Restore Script (deploy/backups/restore.sh)
# =============================================================================
# Restores the Loyallia platform from a backup archive.
#
# Architecture:
#   1. Download archive from S3/MinIO (or use local file).
#   2. Decrypt (GPG) if encrypted.
#   3. Decompress (tar.gz).
#   4. Restore PostgreSQL via psql.
#   5. Restore Redis via copy of dump.rdb.
#   6. Restore Vault KV secrets.
#   7. Restore media files to MinIO/S3.
#   8. Verify the restore.
#
# WARNING: This is a DESTRUCTIVE operation. It overwrites existing data.
#          Only run this in a controlled maintenance window.
#
# SEC: All secrets are read from Vault via environment variables.
# SEC: No secrets are logged or stored in this file.
#
# Usage:
#   chmod +x deploy/backups/restore.sh
#   ./deploy/backups/restore.sh <s3_key_or_local_path>
#
# Example:
#   ./deploy/backups/restore.sh backups/2024/06/15/loyallia_backup_20240615_030000.tar.gz
# =============================================================================

set -euo pipefail

# -- Configuration -----------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
RESTORE_SOURCE="${1:-}"
TMP_DIR="$(mktemp -d /tmp/loyallia_restore_XXXXXX)"
chmod 700 "${TMP_DIR}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m' # No Color

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }
log_fatal() { echo -e "${RED}[FATAL]${NC} $*"; }

if [ -z "${RESTORE_SOURCE}" ]; then
    echo "Usage: $0 <s3_key_or_local_path>"
    echo ""
    echo "Examples:"
    echo "  $0 backups/2024/06/15/loyallia_backup_20240615_030000.tar.gz"
    echo "  $0 /mnt/backups/loyallia_backup_20240615_030000.tar.gz"
    exit 1
fi

# -- Read secrets from Vault (via env vars set by Docker/compose) -----------

PG_HOST="${PGBOUNCER_HOST:-localhost}"
PG_PORT="${PGBOUNCER_PORT:-6432}"
PG_DB="${POSTGRES_DB:-loyallia}"
PG_USER="${POSTGRES_USER:-loyallia}"
PG_PASSWORD="${POSTGRES_PASSWORD:-}"

REDIS_URL="${CELERY_BROKER_URL:-redis://localhost:6379/1}"

VAULT_ADDR="${VAULT_ADDR:-}"
VAULT_TOKEN_FILE="${VAULT_TOKEN_FILE:-}"
VAULT_SECRET_PATH="${VAULT_SECRET_PATH:-secret/data/loyallia/development}"

S3_ENDPOINT="${MINIO_ENDPOINT:-}"
S3_ACCESS_KEY="${MINIO_ACCESS_KEY:-}"
S3_SECRET_KEY="${MINIO_SECRET_KEY:-}"
S3_BUCKET="${BACKUP_S3_BUCKET:-loyallia-backups}"

GPG_KEY_ID="${BACKUP_GPG_KEY_ID:-}"

ARCHIVE_FILE="${TMP_DIR}/backup_archive.tar.gz"

# -- Confirmation ------------------------------------------------------------

echo ""
echo -e "${BOLD}================================================================${NC}"
echo -e "${BOLD}  LOYALLIA RESTORE  DESTRUCTIVE OPERATION${NC}"
echo -e "${BOLD}================================================================${NC}"
echo ""
echo "This will OVERWRITE all existing data:"
echo "  - PostgreSQL database: ${PG_DB}"
echo "  - Redis data"
echo "  - Vault secrets"
echo "  - Media files (passes, assets)"
echo ""
echo "Restore source: ${RESTORE_SOURCE}"
echo ""
read -p "Type 'RESTORE' to proceed: " confirm

if [ "${confirm}" != "RESTORE" ]; then
    log_fatal "Restore cancelled."
    exit 1
fi

log_info "Starting Loyallia restore from: ${RESTORE_SOURCE}"

# -- 1. Download archive -----------------------------------------------------

log_info "Step 1/7  Downloading archive..."

if [ -f "${RESTORE_SOURCE}" ]; then
    cp "${RESTORE_SOURCE}" "${ARCHIVE_FILE}"
    log_info "Using local file: ${RESTORE_SOURCE}"
else
    if [ -z "${S3_ENDPOINT}" ] || [ -z "${S3_ACCESS_KEY}" ]; then
        log_fatal "S3/MinIO not configured and file not found locally: ${RESTORE_SOURCE}"
        exit 1
    fi

    export AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY}"
    export AWS_SECRET_ACCESS_KEY="${S3_SECRET_KEY}"

    if [[ "${RESTORE_SOURCE}" == *.gpg ]]; then
        ARCHIVE_FILE="${ARCHIVE_FILE}.gpg"
    fi

    aws --endpoint-url="${S3_ENDPOINT}" \
        --no-verify-ssl \
        s3 cp "s3://${S3_BUCKET}/${RESTORE_SOURCE}" "${ARCHIVE_FILE}" \
        || {
        log_fatal "Failed to download s3://${S3_BUCKET}/${RESTORE_SOURCE}"
        exit 1
    }

    unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
    log_info "Downloaded from S3: s3://${S3_BUCKET}/${RESTORE_SOURCE}"
fi

# -- 2. Decrypt (if encrypted) -----------------------------------------------

if [[ "${ARCHIVE_FILE}" == *.gpg ]]; then
    if [ -z "${GPG_KEY_ID}" ]; then
        log_fatal "Archive is GPG-encrypted but GPG_KEY_ID is not set"
        exit 1
    fi
    log_info "Step 2/7  Decrypting archive..."
    gpg --batch --yes --recipient "${GPG_KEY_ID}" \
        --output "${TMP_DIR}/backup_archive.tar.gz" \
        --decrypt "${ARCHIVE_FILE}"
    ARCHIVE_FILE="${TMP_DIR}/backup_archive.tar.gz"
    log_info "Decryption complete"
else
    log_info "Step 2/7  No encryption detected  skipping decryption"
fi

# -- 3. Decompress -----------------------------------------------------------

log_info "Step 3/7  Decompressing archive..."
EXTRACT_DIR="${TMP_DIR}/extracted"
mkdir -p "${EXTRACT_DIR}"

tar -xzf "${ARCHIVE_FILE}" -C "${EXTRACT_DIR}"
log_info "Archive extracted to: ${EXTRACT_DIR}"

# -- Find component backup files ---------------------------------------------

find_file() {
    local dir="$1"
    local prefix="$2"
    find "${dir}" -type f -name "${prefix}*" | head -n1
}

PG_DUMP_FILE="$(find_file "${EXTRACT_DIR}" "loyallia_pg_")"
REDIS_FILE="$(find_file "${EXTRACT_DIR}" "loyallia_redis_")"
VAULT_FILE="$(find_file "${EXTRACT_DIR}" "loyallia_vault_")"
MEDIA_TAR="$(find_file "${EXTRACT_DIR}" "loyallia_media_")"

log_info "Components found:"
log_info "  PostgreSQL: ${PG_DUMP_FILE:-NOT FOUND}"
log_info "  Redis:      ${REDIS_FILE:-NOT FOUND}"
log_info "  Vault:      ${VAULT_FILE:-NOT FOUND}"
log_info "  Media:      ${MEDIA_TAR:-NOT FOUND}"

# -- 4. Restore PostgreSQL ---------------------------------------------------

if [ -n "${PG_DUMP_FILE}" ]; then
    log_info "Step 4/7  Restoring PostgreSQL..."

    if [ -z "${PG_PASSWORD}" ]; then
        log_fatal "POSTGRES_PASSWORD not set"
        exit 1
    fi

    export PGPASSWORD="${PG_PASSWORD}"

    if [[ "${PG_DUMP_FILE}" == *.gz ]] || [[ "${PG_DUMP_FILE}" == *.gzip ]]; then
        zcat "${PG_DUMP_FILE}" | psql \
            --host="${PG_HOST}" \
            --port="${PG_PORT}" \
            --username="${PG_USER}" \
            --dbname="${PG_DB}" \
            --set=ON_ERROR_STOP=1 \
            || {
            log_error "PostgreSQL restore failed"
            unset PGPASSWORD
            exit 1
        }
    else
        psql \
            --host="${PG_HOST}" \
            --port="${PG_PORT}" \
            --username="${PG_USER}" \
            --dbname="${PG_DB}" \
            --set=ON_ERROR_STOP=1 \
            --file="${PG_DUMP_FILE}" \
            || {
            log_error "PostgreSQL restore failed"
            unset PGPASSWORD
            exit 1
        }
    fi

    unset PGPASSWORD
    log_info "PostgreSQL restore complete"
else
    log_warn "Step 4/7  PostgreSQL backup not found  skipping"
fi

# -- 5. Restore Redis --------------------------------------------------------

if [ -n "${REDIS_FILE}" ]; then
    log_info "Step 5/7  Restoring Redis..."

    # Get Redis data directory
    REDIS_DIR="$(redis-cli -u "${REDIS_URL}" CONFIG GET dir 2>/dev/null | tail -n1 || echo '/data')"
    REDIS_DUMP="${REDIS_DIR}/dump.rdb"

    # Shutdown Redis (NOSAVE to avoid overwriting)
    redis-cli -u "${REDIS_URL}" SHUTDOWN NOSAVE >/dev/null 2>&1 || true
    sleep 2

    # Copy the backup RDB
    cp -p "${REDIS_FILE}" "${REDIS_DUMP}"
    log_info "Redis RDB copied to: ${REDIS_DUMP}"

    # Redis should restart automatically via Docker/systemd
    log_info "Redis restore complete (service will restart)"
else
    log_warn "Step 5/7  Redis backup not found  skipping"
fi

# -- 6. Restore Vault secrets -----------------------------------------------

if [ -n "${VAULT_FILE}" ]; then
    if [ -n "${VAULT_ADDR}" ] && [ -n "${VAULT_TOKEN_FILE}" ] && [ -f "${VAULT_TOKEN_FILE}" ]; then
        log_info "Step 6/7  Restoring Vault secrets..."

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
            --header "Content-Type: application/json" \
            --request POST \
            --data-binary "@${VAULT_FILE}" \
            "${VAULT_ADDR}/v1/${VAULT_SECRET_PATH}" \
            || {
            log_error "Vault restore failed"
            exit 1
        }

        log_info "Vault secrets restored"
    else
        log_warn "Step 6/7  Vault not configured  skipping"
    fi
else
    log_warn "Step 6/7  Vault backup not found  skipping"
fi

# -- 7. Restore media files --------------------------------------------------

if [ -n "${MEDIA_TAR}" ]; then
    if [ -n "${S3_ENDPOINT}" ] && [ -n "${S3_ACCESS_KEY}" ]; then
        log_info "Step 7/7  Restoring media files..."

        MEDIA_TMP="${TMP_DIR}/media_restore"
        mkdir -p "${MEDIA_TMP}"
        tar -xzf "${MEDIA_TAR}" -C "${MEDIA_TMP}"

        export AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY}"
        export AWS_SECRET_ACCESS_KEY="${S3_SECRET_KEY}"

        # Sync each subdirectory to its bucket
        for subdir in "${MEDIA_TMP}"/*; do
            if [ -d "${subdir}" ]; then
                BUCKET_NAME="$(basename "${subdir}")"
                log_info "  Syncing to bucket: ${BUCKET_NAME}..."
                aws --endpoint-url="${S3_ENDPOINT}" \
                    --no-verify-ssl \
                    s3 sync "${subdir}/" "s3://${BUCKET_NAME}/" \
                    >/dev/null 2>&1 || {
                    log_warn "  Failed to sync bucket ${BUCKET_NAME}"
                }
            fi
        done

        unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
        log_info "Media files restored"
    else
        log_warn "Step 7/7  S3/MinIO not configured  skipping media restore"
    fi
else
    log_warn "Step 7/7  Media backup not found  skipping"
fi

# -- 8. Verify --------------------------------------------------------------

log_info "================================================================"
log_info "Restore verification"
log_info "================================================================"

# Check PostgreSQL
PG_COUNT="$(psql --host="${PG_HOST}" --port="${PG_PORT}" --username="${PG_USER}" --dbname="${PG_DB}" -t -c 'SELECT COUNT(*) FROM django_migrations;' 2>/dev/null | tr -d '[:space:]' || echo 'ERROR')"
if [ "${PG_COUNT}" != "ERROR" ] && [ -n "${PG_COUNT}" ]; then
    log_info "PostgreSQL: OK  ${PG_COUNT} migration rows"
else
    log_error "PostgreSQL: FAILED  could not query migrations"
fi

# Check Redis
REDIS_PING="$(redis-cli -u "${REDIS_URL}" PING 2>/dev/null || echo 'ERROR')"
if [ "${REDIS_PING}" = "PONG" ]; then
    log_info "Redis: OK  responded to PING"
else
    log_error "Redis: FAILED  no response to PING"
fi

# -- Cleanup ----------------------------------------------------------------

log_info "Cleaning up temp files..."
rm -rf "${TMP_DIR}"

# -- Summary ----------------------------------------------------------------

echo ""
echo -e "${GREEN}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}  RESTORE COMPLETED${NC}"
echo -e "${GREEN}${BOLD}================================================================${NC}"
echo ""
echo "Restore source: ${RESTORE_SOURCE}"
echo "Verify PostgreSQL and Redis are healthy before bringing services up."
echo ""

exit 0
