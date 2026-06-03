#!/usr/bin/env bash
# =============================================================================
# LOYALLIA DISASTER RECOVERY — Verify Rescue Package (Development)
# =============================================================================
# Returns 0 if rescue package passes all integrity checks, 1 otherwise.
# =============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../backups/development/env.sh"
# env.sh enables 'set -e'; re-disable it so the verification script can track its own failures
set +e
set -uo pipefail
source "$PROJECT_ROOT/deploy/backups/lib/common.sh"
source "$PROJECT_ROOT/deploy/backups/lib/encrypt.sh"

RESCUE_DIR="$PROJECT_ROOT/.agents/rescue"
ERRORS=0

fail() {
    err "$1"
    ERRORS=$((ERRORS + 1))
}

# --- Manifest exists and valid JSON ------------------------------------------
if [ ! -f "$RESCUE_DIR/rescue_manifest.json" ]; then
    err "Manifest not found: $RESCUE_DIR/rescue_manifest.json"
    exit 1
fi

if ! python3 -c "import json; json.load(open('$RESCUE_DIR/rescue_manifest.json'))" 2>/dev/null; then
    err "Manifest is not valid JSON"
    exit 1
fi
log "Manifest JSON: OK"

# --- All files exist, non-empty, encrypted -----------------------------------
while IFS= read -r file; do
    [ -n "$file" ] || continue
    path="$RESCUE_DIR/$file"
    if [ ! -f "$path" ]; then
        fail "Missing file: $file"
        continue
    fi
    if [ ! -s "$path" ]; then
        fail "Empty file: $file"
        continue
    fi
    # Verify age header
    if ! head -c 20 "$path" | grep -q 'age-encryption.org/v1'; then
        fail "Not an age-encrypted file: $file"
    fi
done < <(python3 -c "import json; [print(f['name']) for f in json.load(open('$RESCUE_DIR/rescue_manifest.json'))['files']]")

# --- Decrypt for content validation ------------------------------------------
TMPDIR=$(mktemp -d)
setup_cleanup "$TMPDIR"

log "Decrypting files for content validation ..."
for f in "$RESCUE_DIR"/*.age; do
    [ -e "$f" ] || continue
    name=$(basename "$f" .age)
    decrypt_file "$f" "$TMPDIR/$name"
done

# pg_dump readable
PG_DUMP=$(find "$TMPDIR" -maxdepth 1 -name 'postgres_rescue_*.dump' | head -n1)
if [ -n "$PG_DUMP" ]; then
    if command -v pg_restore >/dev/null 2>&1; then
        if pg_restore --list "$PG_DUMP" >/dev/null 2>&1; then
            log "pg_dump readable: OK"
        else
            fail "pg_dump is not readable (pg_restore --list failed)"
        fi
    else
        warn "pg_restore not available; skipping dump validation"
    fi
else
    fail "postgres dump not found in rescue"
fi

# RDB header valid
REDIS_RDB=$(find "$TMPDIR" -maxdepth 1 -name 'redis_rescue_*.rdb' | head -n1)
if [ -n "$REDIS_RDB" ]; then
    header=$(head -c 5 "$REDIS_RDB")
    if [ "$header" = "REDIS" ]; then
        log "RDB header valid: OK"
    else
        fail "RDB header is invalid (expected REDIS, got '$header')"
    fi
else
    fail "redis RDB not found in rescue"
fi

# tar.gz files not corrupt
for tgz in "$TMPDIR"/*.tar.gz; do
    [ -e "$tgz" ] || continue
    if tar tzf "$tgz" >/dev/null 2>&1; then
        log "$(basename "$tgz") not corrupt: OK"
    else
        fail "$(basename "$tgz") is corrupt"
    fi
done

# --- Final result ------------------------------------------------------------
if [ "$ERRORS" -gt 0 ]; then
    err "Verification failed with $ERRORS error(s)"
    exit 1
fi

log "Verification passed"
exit 0
