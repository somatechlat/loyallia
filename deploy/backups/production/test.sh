#!/usr/bin/env bash
# =============================================================================
# LOYALLIA BACKUP — PRODUCTION TEST SUITE
# =============================================================================
# Verifies all production backup scripts exist and are executable.
# Does NOT actually run backups — only checks scripts, keys, and connectivity.
#
# Exit codes:
#   0 = all tests passed
#   1 = one or more tests failed
# =============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"
# env.sh enables 'set -e'; re-disable it so the test suite can track its own failures
set +e
set -uo pipefail
source "$SCRIPT_DIR/../lib/common.sh"
source "$SCRIPT_DIR/../lib/encrypt.sh"
source "$SCRIPT_DIR/../lib/minio-client.sh"

ERRORS=0
PASSED=0

log_pass() { log "  ✅ PASS: $1"; PASSED=$((PASSED + 1)); }
log_fail() { err "  ❌ FAIL: $1"; ERRORS=$((ERRORS + 1)); }

# --- Phase 0: Script existence & executability -------------------------------
step "Phase 0: Script Existence & Executability"

SCRIPTS=(
    "$SCRIPT_DIR/snapshot.sh"
    "$SCRIPT_DIR/restore-snapshot.sh"
    "$SCRIPT_DIR/../lib/common.sh"
    "$SCRIPT_DIR/../lib/encrypt.sh"
    "$SCRIPT_DIR/../lib/minio-client.sh"
)

for s in "${SCRIPTS[@]}"; do
    if [ -f "$s" ]; then
        if [ -x "$s" ]; then
            log_pass "$(basename "$s") exists and is executable"
        else
            log_fail "$(basename "$s") exists but is NOT executable"
        fi
    else
        log_fail "$(basename "$s") MISSING"
    fi
done

# --- Phase 1: Syntax check ---------------------------------------------------
step "Phase 1: Syntax Checks (bash -n)"

for s in "${SCRIPTS[@]}"; do
    if [ -f "$s" ]; then
        if bash -n "$s" >/dev/null 2>&1; then
            log_pass "$(basename "$s") syntax OK"
        else
            log_fail "$(basename "$s") syntax ERROR"
        fi
    fi
done

# --- Phase 2: Encryption key verification ------------------------------------
step "Phase 2: Age Key Verification"

if verify_key 2>/dev/null; then
    log_pass "Age keypair verified"
else
    log_fail "Age keypair verification failed"
fi

# --- Phase 3: Offsite connectivity -------------------------------------------
step "Phase 3: Offsite Connectivity"

if minio_check_connectivity 2>/dev/null; then
    log_pass "MinIO offsite connectivity OK"
else
    log_fail "MinIO offsite connectivity FAILED"
fi

# --- Phase 4: Backup directory permissions -----------------------------------
step "Phase 4: Backup Directory"

if [ -d "$BACKUP_DIR" ]; then
    log_pass "Backup directory exists: $BACKUP_DIR"
else
    log_fail "Backup directory missing: $BACKUP_DIR"
fi

if [ -d "$BACKUP_DIR/snapshot" ]; then
    log_pass "Snapshot directory exists"
else
    log_pass "Snapshot directory will be created on first run"
fi

# --- Summary -----------------------------------------------------------------
step "Test Summary"

echo ""
echo "  Passed: $PASSED"
echo "  Failed: $ERRORS"
echo ""

if [ "$ERRORS" -gt 0 ]; then
    echo -e "${RED}  RESULT: FAILED — $ERRORS test(s) failed.${NC}"
    exit 1
else
    echo -e "${GREEN}  RESULT: ALL TESTS PASSED${NC}"
    exit 0
fi
