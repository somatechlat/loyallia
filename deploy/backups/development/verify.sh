#!/usr/bin/env bash
# =============================================================================
# LOYALLIA BACKUP — Verification (Development)
# =============================================================================
# Checks that all backup directories contain a recent, non-empty .age file
# and that at least one file can be decrypted successfully.
# Returns 0 on pass, 1 on fail.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"
source "$SCRIPT_DIR/../lib/common.sh"
source "$SCRIPT_DIR/../lib/encrypt.sh"

ERRORS=0

step "Backup Verification"

# --- Check each component ---------------------------------------------------
for subdir in postgres redis vault minio; do
    dir="$BACKUP_DIR/$subdir"

    if [ ! -d "$dir" ]; then
        err "Directory missing: $dir"
        ERRORS=$((ERRORS + 1))
        continue
    fi

    # Find latest .age file
    latest=""
    for f in "$dir"/*.age; do
        [ -e "$f" ] || continue
        if [ -z "$latest" ] || [ "$f" -nt "$latest" ]; then
            latest="$f"
        fi
    done

    if [ -z "$latest" ]; then
        err "No .age backup found in $dir"
        ERRORS=$((ERRORS + 1))
        continue
    fi

    if [ ! -s "$latest" ]; then
        err "Backup is empty: $latest"
        ERRORS=$((ERRORS + 1))
        continue
    fi

    age_hours=$(file_age_hours "$latest")
    if [ "$age_hours" -gt 25 ]; then
        err "Backup too old: $(basename "$latest") (${age_hours}h > 25h)"
        ERRORS=$((ERRORS + 1))
        continue
    fi

    log "$subdir: $(basename "$latest") (${age_hours}h old, OK)"
done

# --- Test decrypt one file --------------------------------------------------
latest_any=""
while IFS= read -r f; do
    [ -e "$f" ] || continue
    if [ -z "$latest_any" ] || [ "$f" -nt "$latest_any" ]; then
        latest_any="$f"
    fi
done < <(find "$BACKUP_DIR" -name '*.age' -type f 2>/dev/null)

if [ -n "$latest_any" ]; then
    log "Testing age decryption on: $(basename "$latest_any")"
    TMPFILE=$(mktemp)
    if decrypt_file "$latest_any" "$TMPFILE" >/dev/null 2>&1; then
        log "Age decryption test: OK"
        rm -f "$TMPFILE"
    else
        err "Age decryption test FAILED"
        ERRORS=$((ERRORS + 1))
        rm -f "$TMPFILE"
    fi
else
    err "No .age files found to test decryption"
    ERRORS=$((ERRORS + 1))
fi

# --- Summary ----------------------------------------------------------------
echo ""
if [ "$ERRORS" -gt 0 ]; then
    err "$ERRORS verification issue(s) found"
    exit 1
else
    log "All backups verified OK"
    exit 0
fi
