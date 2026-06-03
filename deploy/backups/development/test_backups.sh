#!/usr/bin/env bash
# =============================================================================
# LOYALLIA — BACKUP TEST SUITE (Local Development)
# =============================================================================
# A sysadmin-run script that validates all backup, verify, and disaster-
# recovery scripts in a local Docker Compose environment.
#
# Usage:
#   bash deploy/backups/development/test_backups.sh
#
# What it tests:
#   ✓ PostgreSQL logical backup via docker compose exec
#   ✓ Redis RDB backup with BGSAVE polling
#   ✓ Vault KV secrets + init.json backup
#   ✓ Orchestrator sequential run
#   ✓ Verify script freshness checks
#   ✓ Production script --env=development rejection
#   ✓ Disaster-recovery rescue file creation
#   ✓ Content integrity (pg_restore --list, JSON validity, RDB header)
#
# Exit codes:
#   0  = all critical tests passed
#   1  = one or more critical tests failed
#
# Requirements:
#   - Docker Compose stack running (docker compose up -d)
#   - Vault initialized and unsealed
#   - python3 available on host
# =============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/.agents/backups"
RESCUE_DIR="$PROJECT_ROOT/.agents"

ERRORS=0
WARNINGS=0
PASSED=0

# ─── Logging helpers ────────────────────────────────────────────────────────
log_info()   { echo -e "\033[0;36m[TEST]\033[0m $1"; }
log_pass()   { echo -e "  \033[0;32m✅ PASS:\033[0m $1"; PASSED=$((PASSED+1)); }
log_fail()   { echo -e "  \033[0;31m❌ FAIL:\033[0m $1"; ERRORS=$((ERRORS+1)); }
log_warn()   { echo -e "  \033[1;33m⚠️  WARN:\033[0m $1"; WARNINGS=$((WARNINGS+1)); }
log_section() {
    echo ""
    echo "════════════════════════════════════════════════════════════"
    echo "  $1"
    echo "════════════════════════════════════════════════════════════"
}

# ─── Phase 0: Pre-flight ────────────────────────────────────────────────────
log_section "Phase 0: Pre-flight Checks"

if ! docker info >/dev/null 2>&1; then
    log_fail "Docker daemon is not running"
    exit 1
fi
log_pass "Docker daemon responsive"

for svc in postgres redis vault; do
    if docker compose -f "$PROJECT_ROOT/docker-compose.yml" ps "$svc" 2>/dev/null | grep -q "Up"; then
        log_pass "$svc container is running"
    else
        log_fail "$svc container is NOT running — start stack with: docker compose up -d"
        exit 1
    fi
done

# Check Vault is unsealed
if ! curl -sk https://127.0.0.1:33908/v1/sys/health 2>/dev/null | grep -q '"sealed":false'; then
    log_fail "Vault is sealed or unreachable on :33908"
    exit 1
fi
log_pass "Vault unsealed and reachable"

# Clean test directories
rm -rf "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# ─── Phase 1: Development Backup Scripts ─────────────────────────────────────
log_section "Phase 1: Development Backup Scripts"

bash "$SCRIPT_DIR/pg_dump.sh" >/dev/null 2>&1 && log_pass "pg_dump.sh" || log_fail "pg_dump.sh"
bash "$SCRIPT_DIR/redis.sh"   >/dev/null 2>&1 && log_pass "redis.sh"   || log_fail "redis.sh"
bash "$SCRIPT_DIR/vault.sh"   >/dev/null 2>&1 && log_pass "vault.sh"   || log_fail "vault.sh"

# ─── Phase 2: File Existence & Size ──────────────────────────────────────────
log_section "Phase 2: Backup File Existence"

for pattern in "pg_dump_*.dump" "redis_*.rdb" "vault_secrets_*.json" "vault_init_*.json"; do
    found=$(ls "$BACKUP_DIR"/$pattern 2>/dev/null | head -1)
    if [ -n "$found" ] && [ -s "$found" ]; then
        size=$(du -h "$found" | cut -f1)
        log_pass "$pattern exists ($size)"
    else
        log_fail "$pattern missing or empty"
    fi
done

# ─── Phase 3: Content Integrity ──────────────────────────────────────────────
log_section "Phase 3: Content Integrity"

# PostgreSQL — can we list schema objects?
LATEST_PG=$(ls -t "$BACKUP_DIR"/pg_dump_*.dump 2>/dev/null | head -1)
if [ -n "$LATEST_PG" ]; then
    # pg_restore not available on host → use docker
    docker compose cp "$LATEST_PG" postgres:/tmp/pg_dump_test.dump >/dev/null 2>&1
    if docker compose exec -T postgres pg_restore --list /tmp/pg_dump_test.dump >/dev/null 2>&1; then
        obj_count=$(docker compose exec -T postgres pg_restore --list /tmp/pg_dump_test.dump 2>/dev/null | tail -n +4 | wc -l | tr -d ' ')
        log_pass "pg_restore --list succeeds ($obj_count objects)"
    else
        log_fail "pg_restore --list failed on latest dump"
    fi
    docker compose exec -T postgres rm -f /tmp/pg_dump_test.dump >/dev/null 2>&1 || true
else
    log_fail "No pg_dump file to verify"
fi

# Redis — RDB header
LATEST_RDB=$(ls -t "$BACKUP_DIR"/redis_*.rdb 2>/dev/null | head -1)
if [ -n "$LATEST_RDB" ] && xxd -l 5 "$LATEST_RDB" 2>/dev/null | grep -q "REDIS"; then
    log_pass "Redis RDB has valid REDIS header"
else
    log_fail "Redis RDB header invalid or missing"
fi

# Vault secrets — valid JSON with expected keys
LATEST_VAULT=$(ls -t "$BACKUP_DIR"/vault_secrets_*.json 2>/dev/null | head -1)
if [ -n "$LATEST_VAULT" ]; then
    if python3 -m json.tool "$LATEST_VAULT" >/dev/null 2>&1; then
        key_count=$(python3 -c "
import json
with open('$LATEST_VAULT') as f:
    d = json.load(f)
secrets = d.get('data', {}).get('data', {})
print(len(secrets))
" 2>/dev/null)
        log_pass "Vault secrets JSON valid ($key_count secrets)"
    else
        log_fail "Vault secrets JSON is malformed"
    fi
else
    log_fail "No vault secrets file to verify"
fi

# Vault init — contains root_token
LATEST_INIT=$(ls -t "$BACKUP_DIR"/vault_init_*.json 2>/dev/null | head -1)
if [ -n "$LATEST_INIT" ] && grep -q '"root_token"' "$LATEST_INIT" 2>/dev/null; then
    log_pass "Vault init.json contains root_token"
else
    log_fail "Vault init.json missing root_token"
fi

# ─── Phase 4: Orchestrator & Verify ─────────────────────────────────────────
log_section "Phase 4: Orchestrator & Verify"

rm -rf "$BACKUP_DIR"/*
mkdir -p "$BACKUP_DIR"

if bash "$SCRIPT_DIR/orchestrator.sh" >/dev/null 2>&1; then
    new_count=$(ls "$BACKUP_DIR"/*_$(date +%Y%m%d)*.* 2>/dev/null | wc -l | tr -d ' ')
    log_pass "orchestrator.sh completes ($new_count new files)"
else
    log_warn "orchestrator.sh had partial failures (continues by design)"
fi

if bash "$SCRIPT_DIR/verify.sh" >/dev/null 2>&1; then
    log_pass "verify.sh passes"
else
    log_fail "verify.sh reports issues"
fi

# ─── Phase 5: Production Script Safety ──────────────────────────────────────
log_section "Phase 5: Production Script Safety (Negative Tests)"

for script in "$PROJECT_ROOT/deploy/backups/production/postgres.sh" \
              "$PROJECT_ROOT/deploy/backups/production/redis.sh" \
              "$PROJECT_ROOT/deploy/backups/production/minio.sh"; do
    name=$(basename "$script")
    output=$(bash "$script" --env=development 2>&1 || true)
    if echo "$output" | grep -qiE "development.*not.*supported|dev.*script|PRODUCTION ONLY"; then
        log_pass "$name rejects --env=development"
    else
        log_warn "$name does NOT reject --env=development"
    fi
done

# ─── Phase 6: Disaster Recovery — Create Rescue Files ───────────────────────
log_section "Phase 6: Disaster Recovery — Create Rescue Files"

# Archive old rescue files to avoid collisions
archive_dir="$RESCUE_DIR/old_rescue_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$archive_dir"
find "$RESCUE_DIR" -maxdepth 1 -type f -name "*rescue*" -exec mv {} "$archive_dir"/ \; 2>/dev/null || true
mv "$RESCUE_DIR"/vault_init_rescue.json "$archive_dir"/ 2>/dev/null || true
mv "$RESCUE_DIR"/vault_secrets_rescue.json "$archive_dir"/ 2>/dev/null || true

if bash "$PROJECT_ROOT/deploy/disaster_recovery/development/create_rescue.sh" >/dev/null 2>&1; then
    log_pass "create_rescue_files.sh --dev completes"
else
    log_fail "create_rescue_files.sh --dev failed"
fi

# Validate all 6 expected files
rescue_checks=0
for file_pattern in "vault_init_rescue.json" "vault_secrets_rescue.json" \
                    "pg_dump_rescue_*.dump" "vault_runtime_rescue_*.txt" \
                    "certs_rescue_*.txt" "redis_rescue_*.rdb"; do
    found=$(ls "$RESCUE_DIR"/$file_pattern 2>/dev/null | head -1)
    if [ -n "$found" ] && [ -s "$found" ]; then
        rescue_checks=$((rescue_checks + 1))
    else
        log_fail "Missing rescue file: $file_pattern"
    fi
done

if [ "$rescue_checks" -eq 6 ]; then
    log_pass "All 6 rescue files created and non-empty"
fi

# Permission check
perm_bad=$(ls -l "$RESCUE_DIR"/*rescue*.* "$RESCUE_DIR"/vault_init_rescue.json "$RESCUE_DIR"/vault_secrets_rescue.json 2>/dev/null | awk '{print $1}' | grep -v "^-rw-------" | wc -l | tr -d ' ')
if [ "$perm_bad" -eq 0 ]; then
    log_pass "All rescue files have correct permissions (0600)"
else
    log_warn "$perm_bad rescue file(s) have overly permissive permissions"
fi

# JSON validity
if python3 -m json.tool "$RESCUE_DIR/vault_init_rescue.json" >/dev/null 2>&1; then
    log_pass "vault_init_rescue.json is valid JSON"
else
    log_fail "vault_init_rescue.json is invalid JSON"
fi

if python3 -m json.tool "$RESCUE_DIR/vault_secrets_rescue.json" >/dev/null 2>&1; then
    sec_count=$(python3 -c "
import json
with open('$RESCUE_DIR/vault_secrets_rescue.json') as f:
    d = json.load(f)
print(len(d.get('data', {}).get('data', {})))
" 2>/dev/null)
    log_pass "vault_secrets_rescue.json is valid JSON ($sec_count secrets)"
else
    log_fail "vault_secrets_rescue.json is invalid JSON"
fi

# pg_dump integrity via docker
docker compose cp "$RESCUE_DIR"/pg_dump_rescue_*.dump postgres:/tmp/pg_dump_rescue_test.dump >/dev/null 2>&1
if docker compose exec -T postgres pg_restore --list /tmp/pg_dump_rescue_test.dump >/dev/null 2>&1; then
    log_pass "Rescue pg_dump valid (pg_restore --list)"
else
    log_fail "Rescue pg_dump invalid"
fi
docker compose exec -T postgres rm -f /tmp/pg_dump_rescue_test.dump >/dev/null 2>&1 || true

# Redis RDB header
redis_rescue=$(ls "$RESCUE_DIR"/redis_rescue_*.rdb 2>/dev/null | head -1)
if [ -n "$redis_rescue" ] && xxd -l 5 "$redis_rescue" 2>/dev/null | grep -q "REDIS"; then
    log_pass "Rescue Redis RDB has valid header"
else
    log_fail "Rescue Redis RDB header invalid"
fi

# ─── Phase 7: Cleanup ───────────────────────────────────────────────────────
log_section "Phase 7: Cleanup"

rm -f /tmp/vault_import_clean.json 2>/dev/null || true
log_pass "Temp files cleaned"

# ─── Summary ────────────────────────────────────────────────────────────────
log_section "Test Summary"

echo ""
echo "  Passed:   $PASSED"
echo "  Warnings: $WARNINGS"
echo "  Failed:   $ERRORS"
echo ""

if [ "$ERRORS" -gt 0 ]; then
    echo -e "\033[0;31m  RESULT: FAILED — $ERRORS critical test(s) failed.\033[0m"
    echo "  Do NOT rely on these backups for production until all failures are resolved."
    exit 1
elif [ "$WARNINGS" -gt 0 ]; then
    echo -e "\033[1;33m  RESULT: PASSED WITH WARNINGS — review warnings above.\033[0m"
    echo "  Backups are functional but have non-critical issues."
    exit 0
else
    echo -e "\033[0;32m  RESULT: ALL TESTS PASSED\033[0m"
    echo "  Backup system is verified and ready."
    exit 0
fi
