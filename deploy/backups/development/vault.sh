#!/usr/bin/env bash
# =============================================================================
# LOYALLIA BACKUP — Vault (Development)
# =============================================================================
# Exports all KV secrets recursively and copies init.json.
# Archives everything into a tar.gz, encrypts with age, and removes plaintext.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"
source "$SCRIPT_DIR/../lib/common.sh"
source "$SCRIPT_DIR/../lib/encrypt.sh"

TS=$(timestamp)
OUTDIR="$BACKUP_DIR/vault"
ensure_dir "$OUTDIR"

TMPDIR=$(mktemp -d)
setup_cleanup "$TMPDIR"

step "Vault Backup"

# --- Obtain token -----------------------------------------------------------
VAULT_TOKEN=""
if $COMPOSE_CMD exec -T vault sh -c 'test -f /run/loyallia-vault/app-token' 2>/dev/null; then
    VAULT_TOKEN="$($COMPOSE_CMD exec -T vault sh -c 'cat /run/loyallia-vault/app-token' 2>/dev/null || true)"
fi

if [ -z "$VAULT_TOKEN" ]; then
    VAULT_TOKEN="$($COMPOSE_CMD exec -T vault sh -c 'grep "root_token" /vault/file/init.json | sed '"'"'s/.*"root_token": *"\([^"]*\)".*/\1/'"'"' ' 2>/dev/null || true)"
fi

if [ -z "$VAULT_TOKEN" ]; then
    die "Cannot obtain Vault token. Is Vault running?"
fi

# --- Export init.json -------------------------------------------------------
$COMPOSE_CMD exec -T vault sh -c 'cat /vault/file/init.json 2>/dev/null' > "$TMPDIR/init.json" 2>/dev/null || true

if [ ! -s "$TMPDIR/init.json" ]; then
    warn "init.json copy failed"
fi

# --- Helper: list and get secrets -------------------------------------------
vault_list() {
    local path="$1"
    $COMPOSE_CMD exec -T -e VAULT_TOKEN="$VAULT_TOKEN" -e VAULT_ADDR=https://127.0.0.1:8200 -e VAULT_SKIP_VERIFY=true vault \
        vault kv list -format=json "$path" 2>/dev/null || echo "[]"
}

export_path() {
    local path="$1"
    local outdir="$2"
    local keys_json keys

    keys_json=$(vault_list "$path")
    keys=$(echo "$keys_json" | python3 -c "import sys,json; [print(k) for k in json.load(sys.stdin)]" 2>/dev/null || true)

    for key in $keys; do
        local full_path="${path%/}/$key"
        local safe_name="${full_path//\//_}"

        # Try to get as a secret
        if $COMPOSE_CMD exec -T -e VAULT_TOKEN="$VAULT_TOKEN" -e VAULT_ADDR=https://127.0.0.1:8200 -e VAULT_SKIP_VERIFY=true vault \
            vault kv get -format=json "$full_path" > "$outdir/${safe_name}.json" 2>/dev/null; then
            continue
        fi

        # If get failed, assume it's a folder and recurse
        export_path "$full_path" "$outdir"
    done
}

export_path "secret/" "$TMPDIR"

# --- Archive and encrypt ----------------------------------------------------
ARCHIVE="$OUTDIR/vault_${TS}.tar.gz"
tar czf "$ARCHIVE" -C "$TMPDIR" .

if [ ! -s "$ARCHIVE" ]; then
    die "Vault archive is empty"
fi

SIZE="$(du -h "$ARCHIVE" | cut -f1)"
log "Vault backup: $ARCHIVE ($SIZE)"

encrypt_file "$ARCHIVE" "$ARCHIVE.age"
rm -f "$ARCHIVE"
log "Vault backup complete: ${ARCHIVE}.age"
