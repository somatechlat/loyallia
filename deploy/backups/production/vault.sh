#!/usr/bin/env bash
# =============================================================================
# LOYALLIA BACKUP — PRODUCTION VAULT
# =============================================================================
# Exports ALL Vault KV secrets via vault kv list + vault kv get.
# Exports Vault init.json.
# Creates Raft snapshot: vault operator raft snapshot save.
# Output: $BACKUP_DIR/vault/
# =============================================================================

set -euo pipefail

source "$(dirname "$0")/env.sh"
source "$PROJECT_ROOT/deploy/backups/lib/common.sh"
source "$PROJECT_ROOT/deploy/backups/lib/encrypt.sh"

require_cmd vault

TIMESTAMP=$(timestamp)
OUTDIR="$BACKUP_DIR/vault"
ensure_dir "$OUTDIR"
TMPDIR="$TEMP_DIR/vault_${TIMESTAMP}_$$"
ensure_dir "$TMPDIR"
setup_cleanup "$TMPDIR"

if [ ! -r "/run/loyallia-vault/app-token" ]; then
    die "Vault app-token not found at /run/loyallia-vault/app-token"
fi

VAULT_TOKEN=$(cat /run/loyallia-vault/app-token)
export VAULT_TOKEN
export VAULT_ADDR="https://127.0.0.1:33908"
export VAULT_SKIP_VERIFY="true"

step "VAULT BACKUP"
log "Exporting Vault data ..."

# --- Export all KV secrets recursively -----------------------------------------
recurse_secrets() {
    local path="$1"
    local outdir="$2"

    local keys
    keys=$(vault kv list "$path" 2>/dev/null | tail -n +2 || true)

    for key in $keys; do
        local clean_key="${key%/}"
        local full_path="${path}${clean_key}"
        local safe_name="${full_path//\//__}"

        if [[ "$key" == */ ]]; then
            ensure_dir "$outdir/$safe_name"
            recurse_secrets "${path}${clean_key}/" "$outdir"
        else
            vault kv get -format=json "$full_path" > "$outdir/${safe_name}.json" 2>/dev/null || {
                warn "Failed to get secret: $full_path"
            }
        fi
    done
}

recurse_secrets "secret/" "$TMPDIR/secrets"

# --- Copy init.json from vault container ---------------------------------------
docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" -f "$PROJECT_ROOT/$COMPOSE_PROD_FILE" \
    cp vault:/vault/file/init.json "$TMPDIR/init.json" 2>/dev/null || {
    warn "Could not copy init.json from vault container"
}

# --- Raft snapshot -------------------------------------------------------------
log "Creating Raft snapshot ..."
vault operator raft snapshot save "$TMPDIR/raft.snapshot" || die "Raft snapshot failed"

# --- Tar and encrypt -----------------------------------------------------------
TARFILE="$OUTDIR/vault_${TIMESTAMP}.tar"
tar czf "$TARFILE" -C "$TEMP_DIR" "$(basename "$TMPDIR")" || die "Tar creation failed"

SIZE="$(du -h "$TARFILE" | cut -f1)"
log "Vault archive: $(basename "$TARFILE") ($SIZE)"

encrypt_file "$TARFILE"
rm -f "$TARFILE"

log "Vault backup complete: $(basename "$TARFILE").age"
