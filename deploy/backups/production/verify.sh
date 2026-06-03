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

step "BACKUP VERIFICATION"

verify_component "PostgreSQL" "$BACKUP_DIR/postgres" "*.age" || ERRORS=$((ERRORS + 1))
verify_component "Redis"      "$BACKUP_DIR/redis"    "*.age" || ERRORS=$((ERRORS + 1))
verify_component "Vault"      "$BACKUP_DIR/vault"    "*.tar.age" || ERRORS=$((ERRORS + 1))
verify_component "MinIO"      "$BACKUP_DIR/minio"    "*.tar.age" || ERRORS=$((ERRORS + 1))

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
