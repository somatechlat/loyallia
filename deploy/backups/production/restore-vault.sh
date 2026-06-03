#!/usr/bin/env bash
# =============================================================================
# LOYALLIA RESTORE — PRODUCTION VAULT
# =============================================================================
# Finds latest encrypted backup, decrypts, restores Raft snapshot if present,
# and imports secrets.
# =============================================================================

set -euo pipefail

source "$(dirname "$0")/env.sh"
source "$PROJECT_ROOT/deploy/backups/lib/common.sh"
source "$PROJECT_ROOT/deploy/backups/lib/encrypt.sh"

FORCE=0
if [ "${1:-}" = "--force" ]; then
    FORCE=1
fi

BACKUP_DIR_VAULT="$BACKUP_DIR/vault"
LATEST_AGE=$(find_latest_backup "$BACKUP_DIR_VAULT" "*.tar.age")

if [ -z "$LATEST_AGE" ]; then
    die "No encrypted Vault backup found in $BACKUP_DIR_VAULT"
fi

step "VAULT RESTORE"
info "Latest backup: $(basename "$LATEST_AGE")"

# --- Confirmation --------------------------------------------------------------
confirm_restore "WARNING: This will REPLACE Vault data."

# --- Decrypt -------------------------------------------------------------------
TMPDIR="$TEMP_DIR/vault_restore_$$"
ensure_dir "$TMPDIR"
setup_cleanup "$TMPDIR"

TARFILE="$TMPDIR/vault.tar"
decrypt_file "$LATEST_AGE" "$TARFILE"

if [ ! -s "$TARFILE" ]; then
    die "Decrypted backup is empty"
fi

log "Decrypted: $(basename "$LATEST_AGE") → $TARFILE"

# --- Extract -------------------------------------------------------------------
tar xzf "$TARFILE" -C "$TMPDIR" || die "Extraction failed"

EXTRACTED=$(find "$TMPDIR" -maxdepth 1 -type d | tail -n +2 | head -1 || true)
if [ -z "$EXTRACTED" ]; then
    die "No extracted directory found"
fi

if [ ! -r "/run/loyallia-vault/app-token" ]; then
    die "Vault app-token not found"
fi

VAULT_TOKEN=$(cat /run/loyallia-vault/app-token)
export VAULT_TOKEN
export VAULT_ADDR="https://127.0.0.1:33908"
export VAULT_SKIP_VERIFY="true"

# --- Restore init.json ---------------------------------------------------------
if [ -f "$EXTRACTED/init.json" ]; then
    log "Restoring init.json ..."
    docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" -f "$PROJECT_ROOT/$COMPOSE_PROD_FILE" \
        cp "$EXTRACTED/init.json" vault:/vault/file/init.json 2>/dev/null || warn "init.json restore failed"
fi

# --- Restore Raft snapshot -----------------------------------------------------
if [ -f "$EXTRACTED/raft.snapshot" ]; then
    log "Restoring Raft snapshot ..."
    vault operator raft snapshot restore "$EXTRACTED/raft.snapshot" || die "Raft snapshot restore failed"
    log "Raft snapshot restored. Vault may need unsealing."
else
    warn "No Raft snapshot found in backup"
fi

# --- Import secrets ------------------------------------------------------------
if [ -d "$EXTRACTED/secrets" ]; then
    log "Importing secrets ..."
    for f in "$EXTRACTED/secrets"/*.json; do
        [ -e "$f" ] || continue
        bname=$(basename "$f" .json)
        vault_path="${bname//__/\/}"

        python3 -c "
import json, sys, subprocess
with open('$f') as fh:
    data = json.load(fh)
secrets = data.get('data', {}).get('data', {})
if not secrets:
    sys.exit(0)
args = []
for k, v in secrets.items():
    args.append(f'{k}={v}')
try:
    subprocess.run(['vault', 'kv', 'put', '-mount=secret', '$vault_path'] + args, check=True)
except Exception as e:
    print(f'Warning: failed to import {vault_path}: {e}', file=sys.stderr)
    sys.exit(0)
" 2>/dev/null || warn "Failed to import secret: $vault_path"
    done
else
    warn "No secrets directory found in backup"
fi

log "Vault restore complete"
