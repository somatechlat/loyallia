# Backup System Testing Plan — Local Development Environment

> **Purpose:** Validate that all backup, verification, and disaster-recovery scripts work correctly on a developer's machine before they are trusted in production.  
> **Scope:** `deploy/backups/development/`, `deploy/disaster_recovery/`, and safety checks on production scripts.  
> **Environment:** macOS / Linux with Docker Compose stack running (`docker compose up -d`).  
> **Estimated time:** 20–30 minutes (full suite).
>
> ⚠️ **Status:** This testing plan reflects an earlier backup implementation. The current scripts produce `age`-encrypted archives, use different filenames, and have different command-line interfaces. Always verify against the actual scripts in `deploy/backups/` and `deploy/disaster_recovery/` before running tests.

---

## 0. Pre-flight Checklist

Run these commands once before starting any test phase.

```bash
# 0.1 Docker daemon is responsive
docker info >/dev/null 2>&1 && echo "✅ Docker OK" || echo "❌ Docker not running"

# 0.2 Core containers are healthy (postgres, redis, vault, minio)
docker compose ps --format "table {{.Name}}\t{{.Status}}" | grep -E "postgres|redis|vault|minio"

# 0.3 Backup output directory exists or will be created
mkdir -p .agents/backups .agents/backups_test

# 0.4 Rescue output directory is clean (or archive old rescue files)
mkdir -p .agents/old_rescue_$(date +%Y%m%d_%H%M%S)
mv .agents/*rescue* .agents/old_rescue_*/ 2>/dev/null || true

# 0.5 Vault is initialized and unsealed
curl -sk https://127.0.0.1:8200/v1/sys/health | grep -q '"sealed":false' \
    && echo "✅ Vault unsealed" || echo "❌ Vault sealed or unreachable"

# 0.6 Django API is responding (used by DR health checks)
curl -sf http://127.0.0.1:33905/api/v1/health/ \
    && echo "✅ API healthy" || echo "⚠️  API not responding (DR health check will fail)"
```

**Known local issue:** `postgres-replica` often shows `unhealthy` in local dev. This is **expected** and does not affect backup tests because only the primary `postgres` container is used for `pg_dump`.

---

## 1. Development Backup Scripts — Unit Tests

These scripts live in `deploy/backups/development/` and write to `./.agents/backups/`.

### 1.1 PostgreSQL Dump (`pg_dump.sh`)

```bash
cd deploy/backups/development
bash pg_dump.sh
```

**Expected result:**
- File created: `.agents/backups/pg_dump_YYYYMMDD_HHMMSS.dump`
- Non-empty (> 1 KB for a seeded dev DB).
- Custom format (can be verified with `pg_restore --list`).

**Validation commands:**

```bash
LATEST=$(ls -t .agents/backups/pg_dump_*.dump | head -1)
pg_restore --list "$LATEST" | head -5   # Should list schema objects
du -h "$LATEST"                           # Should show size
```

**Failure modes to check:**
- Stop the `postgres` container → script should exit non-zero with `ERROR: Backup file is empty!`

---

### 1.2 Redis Backup (`redis.sh`)

```bash
cd deploy/backups/development
bash redis.sh
```

**Expected result:**
- File created: `.agents/backups/redis_YYYYMMDD_HHMMSS.rdb`
- Non-empty (> 1 KB).
- BGSAVE waited correctly (LASTSAVE changed).

**Validation commands:**

```bash
LATEST=$(ls -t .agents/backups/redis_*.rdb | head -1)
xxd -l 9 "$LATEST" | grep "REDIS"       # Should start with REDIS magic bytes
du -h "$LATEST"
```

**Failure modes to check:**
- Stop the `redis` container → script should exit non-zero with empty-file error.

---

### 1.3 Vault Backup (`vault.sh`)

```bash
cd deploy/backups/development
bash vault.sh
```

**Expected result:**
- Two files created:
  - `.agents/backups/vault_secrets_YYYYMMDD_HHMMSS.json` (valid JSON, > 5 KB)
  - `.agents/backups/vault_init_YYYYMMDD_HHMMSS.json` (valid JSON, contains `root_token` and `keys`)
- Console prints secret count (e.g., `42 secrets, init.json copied`).

**Validation commands:**

```bash
LATEST_SEC=$(ls -t .agents/backups/vault_secrets_*.json | head -1)
LATEST_INIT=$(ls -t .agents/backups/vault_init_*.json | head -1)
python3 -m json.tool "$LATEST_SEC" >/dev/null && echo "✅ Secrets JSON valid"
python3 -m json.tool "$LATEST_INIT" >/dev/null && echo "✅ Init JSON valid"
grep -q '"root_token"' "$LATEST_INIT" && echo "✅ root_token present"
```

**Failure modes to check:**
- Seal Vault (`docker compose exec vault vault operator seal`) → script should fail with `Cannot obtain Vault token`.

---

### 1.4 Orchestrator (`orchestrator.sh`)

```bash
cd deploy/backups/development
bash orchestrator.sh
```

**Expected result:**
- Runs pg_dump → redis → vault in sequence.
- Each section prints `════════════════════════════════════` banner.
- If one step fails, orchestrator prints `WARNING: ... failed (continuing...)` and continues.
- Exit code is **0 even on partial failure** (by design).

**Validation:**

```bash
ls -t .agents/backups/*_$(date +%Y%m%d)*.* | wc -l   # Should be ≥ 3 new files today
```

---

### 1.5 Verify Script (`verify.sh`)

```bash
cd deploy/backups/development
bash verify.sh
```

**Expected result (when backups exist):**
- Prints `✅ PostgreSQL`, `✅ Redis`, `✅ Vault secrets`, `✅ Vault init`.
- Exit code `0`.

**Expected result (when backups are missing or stale):**
- Prints `❌` or `⚠️` for missing/stale components.
- Exit code `1`.

**Cross-platform check:**

```bash
# Script should work on both macOS (BSD stat) and Linux (GNU stat)
stat -c %Y /dev/null >/dev/null 2>&1 && echo "GNU stat" || echo "BSD stat"
bash verify.sh   # Should not crash regardless of stat flavour
```

---

## 2. Production Script Safety — Negative Tests

Production scripts must **refuse** to run with `--env=development` to prevent accidental dev→prod confusion.

| Script | Test Command | Expected Result |
|--------|-------------|-----------------|
| `deploy/backups/pg_dump_backup.sh` | `bash pg_dump_backup.sh --env=development` | Fatal error + pointer to dev script |
| `deploy/backups/redis_backup.sh` | `bash redis_backup.sh --env=development` | Fatal error + pointer to dev script |
| `deploy/backups/minio_backup.sh` | `bash minio_backup.sh --env=development` | Fatal error + pointer to dev script |
| `deploy/backups/vault_backup.sh` | `bash vault_backup.sh --env=development` | Accepts (no hard block) — **known gap** |
| `deploy/backups/backup.sh` | `bash backup.sh --env=development` | Accepts (no hard block) — **known gap** |

> **Gap:** `vault_backup.sh` and `backup.sh` parse `--env` but do not hard-reject `development`. This should be fixed or documented.

---

## 3. Disaster Recovery — End-to-End Tests

### 3.1 Create Rescue Files (`create_rescue_files.sh --dev`)

```bash
cd deploy/disaster_recovery
bash create_rescue_files.sh --dev
```

**Expected result in `.agents/`:**

| File | Purpose | Validation |
|------|---------|------------|
| `vault_init_rescue.json` | Unseal keys + root token | `python3 -m json.tool` valid |
| `vault_secrets_rescue.json` | All KV secrets | `python3 -m json.tool` valid |
| `pg_dump_rescue_YYYYMMDD.dump` | PostgreSQL custom dump | `pg_restore --list` works |
| `vault_runtime_rescue_YYYYMMDD.txt` | Runtime secrets tarball (base64) | `base64 -d < file \| tar -tz` lists files |
| `certs_rescue_YYYYMMDD.txt` | Apple/Google certs tarball (base64) | `base64 -d < file \| tar -tz` lists files |
| `redis_rescue_YYYYMMDD.rdb` | Redis snapshot | `xxd -l 9` shows REDIS header |

**Permission check:**

```bash
ls -l .agents/*rescue* | awk '{print $1}' | grep -v "^-rw-------" && echo "❌ Too permissive" || echo "✅ 0600 OK"
```

---

### 3.2 Full Recovery (`recover_from_rescue.sh --dev`)

> ⚠️ **Destructive test.** This wipes Docker volumes and restores from rescue files. Only run in local dev.

**Preparation:**

```bash
# Ensure rescue files exist
ls .agents/vault_init_rescue.json .agents/pg_dump_rescue_*.dump .agents/redis_rescue_*.rdb

# Optional: note down current DB state for comparison
docker compose exec -T postgres psql -U loyallia -d loyallia_dev -c "SELECT COUNT(*) FROM auth_user;"
```

**Execution:**

```bash
cd deploy/disaster_recovery
bash recover_from_rescue.sh --dev
```

**Expected behavior:**

1. **Prerequisites check** — confirms Docker, rescue files, and compose files exist.
2. **Volume cleanup** (optional prompt) — removes `vault_data`, `postgres_data`, `redis_data`, etc.
3. **Vault restore** — injects `init.json`, starts Vault, unseals, creates KV mount, imports secrets.
4. **Runtime restore** — extracts `vault_runtime_rescue_*.txt` into `vault_runtime` volume.
5. **PostgreSQL restore** — `pg_restore` into `postgres_data` volume. Skips if > 10 tables already exist.
6. **Redis restore** — copies RDB into `redis_data` volume.
7. **Certificates restore** — extracts `certs_rescue_*.txt` into `./certs/`.
8. **Service start** — brings up all containers.
9. **Health check** — polls `http://localhost:8000/api/v1/health/` until `200 OK`.

**Validation after recovery:**

```bash
# 3.2.1 Vault is unsealed and has secrets
curl -sk https://127.0.0.1:8200/v1/sys/health | python3 -m json.tool
docker compose exec vault vault kv list secret/loyallia/development

# 3.2.2 PostgreSQL has data
docker compose exec -T postgres psql -U loyallia -d loyallia_dev -c "\dt"

# 3.2.3 Redis has keys
docker compose exec -T redis redis-cli DBSIZE

# 3.2.4 API health check passes
curl -sf http://127.0.0.1:33905/api/v1/health/ && echo "✅ API up"

# 3.2.5 Certificates are present
ls certs/apple_pass.pem certs/passNew.pem certs/AppleWWDRCAG4.pem certs/*.json
```

**Known issue / workaround:**
- If recovery fails at "Vault unseal" because the container is still starting, re-run `recover_from_rescue.sh --dev`. It is idempotent for Vault steps.
- If API health check fails because `localhost:8000` is not mapped, check `docker-compose.yml` port bindings. The script expects `127.0.0.1:8000` or falls back to container internal health checks.

---

## 4. Backup Integrity — Deeper Validation

The `verify.sh` scripts only check **existence, age, and size**. These additional checks validate **content integrity**.

### 4.1 PostgreSQL Dump Integrity

```bash
LATEST=$(ls -t .agents/backups/pg_dump_*.dump | head -1)

# Can we list all objects?
pg_restore --list "$LATEST" | tail -n +4 | wc -l   # Should be > 50 lines in a seeded DB

# Can we extract a specific table's data count?
pg_restore --data-only --table=auth_user "$LATEST" | grep -c "^\d"
```

### 4.2 Redis RDB Integrity

```bash
LATEST=$(ls -t .agents/backups/redis_*.rdb | head -1)

# Validate RDB header and version
xxd -l 9 "$LATEST"
# Expected: first 5 bytes = "REDIS", next 4 = version (e.g., "0011")
```

### 4.3 Vault Secrets Integrity

```bash
LATEST=$(ls -t .agents/backups/vault_secrets_*.json | head -1)

# Should contain expected keys for development
python3 -c "
import json
with open('$LATEST') as f:
    data = json.load(f)
secrets = data.get('data', {}).get('data', {})
required = {'postgres_password', 'redis_password', 'secret_key', 'minio_root_user'}
missing = required - set(secrets.keys())
print('✅ All required keys present' if not missing else f'❌ Missing: {missing}')
"
```

---

## 5. Edge Cases & Error Handling

### 5.1 Missing Containers

Stop the stack and verify each dev script fails gracefully:

```bash
docker compose stop postgres redis vault

bash deploy/backups/development/pg_dump.sh   # Should fail fast
docker compose start postgres
bash deploy/backups/development/redis.sh     # Should fail fast
docker compose start redis
bash deploy/backups/development/vault.sh     # Should fail fast

docker compose start vault   # Restore stack
```

### 5.2 Empty / Corrupted Backups

```bash
# Create an empty dump and verify detection
touch .agents/backups/pg_dump_$(date +%Y%m%d_%H%M%S).dump
bash deploy/backups/development/verify.sh    # Should report stale/empty issues
rm .agents/backups/pg_dump_*$(date +%Y%m%d)*.dump  # Cleanup
```

### 5.3 Redis BGSAVE Timeout

Simulate a slow BGSAVE (rare, but test the loop logic):

```bash
# While redis.sh is running, manually check LASTSAVE inside container
docker compose exec redis redis-cli LASTSAVE
# The script should poll for up to 30 seconds.
```

### 5.4 Vault Token Fallback

Test the two token sources independently:

```bash
# 5.4.1 With app-token present (normal path)
docker compose exec vault test -f /run/loyallia-vault/app-token && echo "app-token exists"
bash deploy/backups/development/vault.sh     # Should use app-token

# 5.4.2 Without app-token (fallback to init.json)
docker compose exec vault sh -c 'mv /run/loyallia-vault/app-token /run/loyallia-vault/app-token.bak'
bash deploy/backups/development/vault.sh     # Should fall back to grep root_token from init.json
docker compose exec vault sh -c 'mv /run/loyallia-vault/app-token.bak /run/loyallia-vault/app-token'
```

---

## 6. Automation: One-Command Test Runner

Create a single script that runs Phases 1, 2, and 4 automatically.

### 6.1 Proposed Script: `deploy/backups/development/test_backups.sh`

```bash
#!/usr/bin/env bash
# Automated backup test suite for local development
# Usage: bash deploy/backups/development/test_backups.sh
# Exit code: 0 = all passed, 1 = any critical test failed

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/.agents/backups"
ERRORS=0
PASSED=0

log_info()  { echo "[TEST] $1"; }
log_pass()  { echo "  ✅ PASS: $1"; PASSED=$((PASSED+1)); }
log_fail()  { echo "  ❌ FAIL: $1"; ERRORS=$((ERRORS+1)); }

# ─── Phase 0: Pre-flight ───
log_info "Phase 0: Pre-flight checks"

if ! docker info >/dev/null 2>&1; then
    log_fail "Docker is not running"
    exit 1
fi
log_pass "Docker running"

for svc in postgres redis vault; do
    if docker compose -f "$PROJECT_ROOT/docker-compose.yml" ps "$svc" | grep -q "Up"; then
        log_pass "$svc container is up"
    else
        log_fail "$svc container is NOT up"
    fi
done

# ─── Phase 1: Run backups ───
log_info "Phase 1: Running development backups"
rm -rf "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

bash "$SCRIPT_DIR/pg_dump.sh"   && log_pass "pg_dump.sh"   || log_fail "pg_dump.sh"
bash "$SCRIPT_DIR/redis.sh"     && log_pass "redis.sh"     || log_fail "redis.sh"
bash "$SCRIPT_DIR/vault.sh"     && log_pass "vault.sh"     || log_fail "vault.sh"

# ─── Phase 2: Verify existence ───
log_info "Phase 2: Verify backup files exist and are non-empty"

for pattern in "pg_dump_*.dump" "redis_*.rdb" "vault_secrets_*.json" "vault_init_*.json"; do
    found=$(ls "$BACKUP_DIR"/$pattern 2>/dev/null | head -1)
    if [ -n "$found" ] && [ -s "$found" ]; then
        log_pass "$pattern exists and is non-empty"
    else
        log_fail "$pattern missing or empty"
    fi
done

# ─── Phase 3: Integrity checks ───
log_info "Phase 3: Content integrity checks"

LATEST_PG=$(ls -t "$BACKUP_DIR"/pg_dump_*.dump 2>/dev/null | head -1)
if [ -n "$LATEST_PG" ] && pg_restore --list "$LATEST_PG" >/dev/null 2>&1; then
    log_pass "pg_restore --list succeeds on latest dump"
else
    log_fail "pg_restore --list failed"
fi

LATEST_RDB=$(ls -t "$BACKUP_DIR"/redis_*.rdb 2>/dev/null | head -1)
if [ -n "$LATEST_RDB" ] && xxd -l 5 "$LATEST_RDB" | grep -q "REDIS"; then
    log_pass "Redis RDB has valid header"
else
    log_fail "Redis RDB header invalid"
fi

LATEST_VAULT=$(ls -t "$BACKUP_DIR"/vault_secrets_*.json 2>/dev/null | head -1)
if [ -n "$LATEST_VAULT" ] && python3 -m json.tool "$LATEST_VAULT" >/dev/null 2>&1; then
    log_pass "Vault secrets JSON is valid"
else
    log_fail "Vault secrets JSON invalid"
fi

LATEST_INIT=$(ls -t "$BACKUP_DIR"/vault_init_*.json 2>/dev/null | head -1)
if [ -n "$LATEST_INIT" ] && grep -q '"root_token"' "$LATEST_INIT"; then
    log_pass "Vault init.json contains root_token"
else
    log_fail "Vault init.json missing root_token"
fi

# ─── Phase 4: Verify script ───
log_info "Phase 4: Running verify.sh"
if bash "$SCRIPT_DIR/verify.sh"; then
    log_pass "verify.sh passes"
else
    log_fail "verify.sh reports issues"
fi

# ─── Phase 5: Production safety ───
log_info "Phase 5: Production script safety (negative tests)"

for script in "$PROJECT_ROOT/deploy/backups/pg_dump_backup.sh" \
              "$PROJECT_ROOT/deploy/backups/redis_backup.sh" \
              "$PROJECT_ROOT/deploy/backups/minio_backup.sh"; do
    name=$(basename "$script")
    if bash "$script" --env=development 2>&1 | grep -qi "development.*not.*supported\|dev.*script"; then
        log_pass "$name rejects --env=development"
    else
        log_fail "$name does NOT reject --env=development"
    fi
done

# ─── Summary ───
echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Test Results: $PASSED passed, $ERRORS failed"
echo "════════════════════════════════════════════════════════════"

if [ "$ERRORS" -gt 0 ]; then
    exit 1
fi
```

---

## 7. Known Gaps & Future Tests

| Gap | Risk | Priority | Proposed Fix |
|-----|------|----------|--------------|
| No dev MinIO backup script | Media/assets not backed up in dev | Medium | Create `deploy/backups/development/minio.sh` using `mc mirror` or `docker compose exec minio mc cp` |
| No dev restore script | Can't test restore without `recover_from_rescue.sh` | Medium | Create `deploy/backups/development/restore.sh` that uses `pg_restore`, `cat rdb`, and `vault kv put` |
| `vault_backup.sh` accepts `--env=development` | Could accidentally overwrite prod backups | Medium | Add explicit `--env=development` rejection |
| `backup.sh` accepts `--env=development` | Same as above | Medium | Add explicit `--env=development` rejection |
| Rescue files are plaintext | No encryption in dev DR | Low | Document as acceptable for dev; prod uses `age` |
| `verify_backups.sh` (prod) uses GNU-only `stat -c %Y` | Fails on macOS | Low | Port BSD/GNU detection from dev `verify.sh` |
| No automated CI for backup tests | Regressions go unnoticed | High | Add GitHub Actions job that starts compose stack and runs `test_backups.sh` |

---

## 8. Sign-off Checklist

Use this before declaring the backup system "local-dev verified":

- [ ] Phase 0 pre-flight passes (Docker + containers + Vault unsealed)
- [ ] Phase 1.1–1.5 all pass (pg_dump, redis, vault, orchestrator, verify)
- [ ] Phase 2 negative tests pass (production scripts reject `--env=development`)
- [ ] Phase 3.1 `create_rescue_files.sh --dev` produces 6 valid files
- [ ] Phase 3.2 `recover_from_rescue.sh --dev` completes and API health returns 200
- [ ] Phase 4 integrity checks pass (pg_restore --list, REDIS header, JSON valid)
- [ ] Phase 5 edge cases handled gracefully (missing containers, empty files)
- [ ] `test_backups.sh` (or manual equivalent) runs end-to-end with 0 failures
- [ ] No new files are left in `.agents/backups_test/` (clean environment)

---

## 9. Test Results — 2026-06-02

Run with:

```bash
bash deploy/backups/development/test_backups.sh
```

| Metric | Count |
|--------|-------|
| Passed | 28 |
| Warnings | 1 |
| Failed | 0 |

**Status:** ✅ PASSED WITH WARNINGS — backup system is functional for local development.

### What Passed

- All 3 dev backup scripts (pg_dump, redis, vault) create valid, non-empty files
- Content integrity verified: pg_restore --list (453 objects), REDIS header, JSON validity
- Orchestrator runs sequentially without crashing
- Verify script confirms all backups fresh and present
- All 3 production scripts correctly reject `--env=development`
- `create_rescue_files.sh --dev` produces all 6 rescue files
- Rescue pg_dump and Redis RDB are structurally valid

### Remaining Warning

- **2 rescue files lack 0600 permissions** — `pg_dump_rescue_*.dump` and `redis_rescue_*.rdb` are created by `create_rescue_files.sh` without an explicit `chmod 0600`. **Fixed in commit** (chmod added to script).

### Critical Bug Found (NOT fixed — architectural)

`recover_from_rescue.sh` **cannot recover Vault from total storage loss**.

| Sub-bug | Impact | Fix Status |
|---------|--------|------------|
| Uses `http://` for Vault health checks (TLS enabled) | Script hangs 60s then fails | ✅ Fixed |
| Runs `python3` inside vault container (Alpine, no Python) | Vault import fails with "not found" | ✅ Fixed |
| Overwrites `/vault/file/init.json` without checking if Vault already initialized | Invalidates new keys, causes 403 errors | ❌ Open |
| No Vault storage backend backup (only init.json + secrets.json) | Cannot restore Vault after volume wipe | ❌ Open — needs Raft snapshot or filesystem backup of `/vault/file` |

**Recommendation:** Do NOT run `recover_from_rescue.sh` for full disaster recovery until the Vault restoration path is redesigned. Use `create_rescue_files.sh` to generate rescue files (this works), but for recovery, rely on `vault-init` + bootstrap secrets + manual KV re-import.

---

## 10. Sysadmin Quick Reference

### Daily — Run dev backups

```bash
bash deploy/backups/development/orchestrator.sh
```

### Weekly — Verify backups

```bash
bash deploy/backups/development/verify.sh
```

### On demand — Full test suite

```bash
bash deploy/backups/development/test_backups.sh
```

### Before any production deploy — Create rescue files

```bash
bash deploy/disaster_recovery/create_rescue_files.sh --dev   # local
bash deploy/disaster_recovery/create_rescue_files.sh --prod  # production
```

### ⚠️  DO NOT USE (broken)

```bash
# recover_from_rescue.sh has unfixed Vault recovery bugs
# See §9 above for details
```

---

*Document version: 1.1*  
*Created: 2026-06-02*  
*Last run: 2026-06-02*  
*Next review: after any backup script change*
