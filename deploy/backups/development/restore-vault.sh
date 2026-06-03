#!/usr/bin/env bash
# =============================================================================
# LOYALLIA RESTORE — Vault (Development)
# =============================================================================
# Finds the latest encrypted Vault backup, decrypts the tar.gz,
# and imports each secret JSON back into Vault KV.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"
source "$SCRIPT_DIR/../lib/common.sh"
source "$SCRIPT_DIR/../lib/encrypt.sh"

step "Vault Restore"

# --- Find latest encrypted backup -------------------------------------------
LATEST=""
for f in "$BACKUP_DIR/vault"/*.age; do
    [ -e "$f" ] || continue
    if [ -z "$LATEST" ] || [ "$f" -nt "$LATEST" ]; then
        LATEST="$f"
    fi
done

if [ -z "$LATEST" ]; then
    die "No encrypted Vault backup found in $BACKUP_DIR/vault/"
fi

log "Latest backup: $(basename "$LATEST")"

# --- Decrypt and extract ----------------------------------------------------
TMPDIR=$(mktemp -d)
setup_cleanup "$TMPDIR"

log "Decrypting backup ..."
decrypt_file "$LATEST" "$TMPDIR/vault.tar.gz"

log "Extracting archive ..."
mkdir -p "$TMPDIR/vault"
tar xzf "$TMPDIR/vault.tar.gz" -C "$TMPDIR/vault"

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

# --- Import secrets ---------------------------------------------------------
for file in "$TMPDIR/vault"/*.json; do
    [ -e "$file" ] || continue

    name=$(basename "$file" .json)

    # Skip init.json — never restore init to a running Vault
    if [ "$name" = "init" ]; then
        log "Skipping init.json (not restored to running Vault)"
        continue
    fi

    # Convert filename back to Vault path
    vault_path="${name//_//}"

    log "Importing secret: $vault_path"

    # Extract key=value pairs safely using Python/shlex
    python3 -c "
import json, shlex, sys
with open('$file') as f:
    d = json.load(f)
data = d.get('data', {}).get('data', {})
for k, v in data.items():
    print(f'{shlex.quote(str(k))}={shlex.quote(str(v))}')
" > "$TMPDIR/pairs.txt" 2>/dev/null || true

    if [ -s "$TMPDIR/pairs.txt" ]; then
        args=$(cat "$TMPDIR/pairs.txt")
        # shellcheck disable=SC2086
        $COMPOSE_CMD exec -T -e VAULT_TOKEN="$VAULT_TOKEN" -e VAULT_ADDR=https://127.0.0.1:8200 -e VAULT_SKIP_VERIFY=true vault \
            sh -c "vault kv put '$vault_path' $args" >/dev/null 2>&1 || warn "Failed to import $vault_path"
    else
        warn "No data found for $vault_path"
    fi
done

log "Vault restore complete."
