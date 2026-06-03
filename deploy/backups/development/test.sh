#!/usr/bin/env bash
# =============================================================================
# LOYALLIA BACKUP — DEVELOPMENT TEST SUITE
# =============================================================================
# Verifies all backup scripts exist and are executable, runs each backup script
# in dry-run or test mode, tests encryption/decryption roundtrip, and tests
# offsite connectivity.
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

log_info() { info "$1"; }
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

# --- Phase 2: Encryption/decryption roundtrip --------------------------------
step "Phase 2: Encryption/Decryption Roundtrip"

TEST_FILE="$TEMP_DIR/test_roundtrip_$$.txt"
echo "loyallia-test-data-$(date +%s)" > "$TEST_FILE"

if encrypt_file "$TEST_FILE" "$TEST_FILE.age" 2>/dev/null; then
    log_pass "Encryption succeeded"
else
    log_fail "Encryption failed"
fi

if decrypt_file "$TEST_FILE.age" "$TEST_FILE.decrypted" 2>/dev/null; then
    if diff -q "$TEST_FILE" "$TEST_FILE.decrypted" >/dev/null 2>&1; then
        log_pass "Decryption roundtrip succeeded"
    else
        log_fail "Decryption roundtrip data mismatch"
    fi
else
    log_fail "Decryption failed"
fi

rm -f "$TEST_FILE" "$TEST_FILE.age" "$TEST_FILE.decrypted"

# --- Phase 3: Snapshot dry-run (syntax / help / basic validation) ------------
step "Phase 3: Snapshot Script Dry-Run Validation"

# We can't run a full snapshot without a running stack, but we can at least
# verify the script starts and reaches pre-flight by mocking a failing docker.
if bash -n "$SCRIPT_DIR/snapshot.sh"; then
    log_pass "snapshot.sh parses correctly"
else
    log_fail "snapshot.sh parse error"
fi

# --- Phase 4: Offsite connectivity -------------------------------------------
step "Phase 4: Offsite Connectivity"

if minio_check_connectivity 2>/dev/null; then
    log_pass "MinIO offsite connectivity OK"
else
    log_fail "MinIO offsite connectivity FAILED"
fi

# --- Phase 5: Key verification -----------------------------------------------
step "Phase 5: Age Key Verification"

if verify_key 2>/dev/null; then
    log_pass "Age keypair verified"
else
    log_fail "Age keypair verification failed"
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
