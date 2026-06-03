#!/usr/bin/env bash
# =============================================================================
# LOYALLIA BACKUP — PRODUCTION VERIFICATION
# =============================================================================
# Checks all .age files exist and are non-empty.
# Checks backup age < 25 hours.
# Tests age can decrypt one file.
# Returns 0 = pass, 1 = fail.
# =============================================================================

set -euo pipefail

source "$(dirname "$0")/env.sh"
source "$PROJECT_ROOT/deploy/backups/lib/common.sh"
source "$PROJECT_ROOT/deploy/backups/lib/encrypt.sh"

ERRORS=0

check_component() {
    local name="$1"
    local dir="$2"
    local pattern="$3"

    local latest
    latest=$(ls -t "$dir"/$pattern 2>/dev/null | head -1 || true)

    if [ -z "$latest" ]; then
        err "$name: No encrypted backup found"
        ERRORS=$((ERRORS + 1))
        return
    fi

    if [ ! -s "$latest" ]; then
        err "$name: Backup file is empty: $(basename "$latest")"
        ERRORS=$((ERRORS + 1))
        return
    fi

    local age_hours
    age_hours=$(file_age_hours "$latest")
    if [ "$age_hours" -gt 25 ]; then
        err "$name: Backup too old (${age_hours}h): $(basename "$latest")"
        ERRORS=$((ERRORS + 1))
        return
    fi

    log "$name: OK ($(basename "$latest"), ${age_hours}h old)"
}

step "BACKUP VERIFICATION"

check_component "PostgreSQL" "$BACKUP_DIR/postgres" "*.age"
check_component "Redis"      "$BACKUP_DIR/redis"    "*.age"
check_component "Vault"      "$BACKUP_DIR/vault"    "*.tar.age"
check_component "MinIO"      "$BACKUP_DIR/minio"    "*.tar.age"

# --- Test decryption -----------------------------------------------------------
step "DECRYPTION TEST"

TEST_FILE=$(find "$BACKUP_DIR" -type f -name '*.age' 2>/dev/null | head -1 || true)
if [ -z "$TEST_FILE" ]; then
    err "No .age files found to test decryption"
    ERRORS=$((ERRORS + 1))
else
    log "Testing decryption: $(basename "$TEST_FILE")"
    TEST_TMP=$(mktemp)
    if decrypt_file "$TEST_FILE" "$TEST_TMP" 2>/dev/null; then
        rm -f "$TEST_TMP"
        log "Decryption test: PASS"
    else
        rm -f "$TEST_TMP"
        err "Decryption test: FAIL"
        ERRORS=$((ERRORS + 1))
    fi
fi

# --- Result --------------------------------------------------------------------
echo ""
if [ "$ERRORS" -gt 0 ]; then
    err "$ERRORS verification failure(s)"
    exit 1
else
    log "All backups verified OK"
    exit 0
fi
