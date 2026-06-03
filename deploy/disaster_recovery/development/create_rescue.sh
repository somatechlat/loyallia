#!/usr/bin/env bash
# =============================================================================
# LOYALLIA DISASTER RECOVERY — Create Rescue Package (Development)
# =============================================================================
# Generates an encrypted rescue package containing:
#   - Vault init.json, secrets export, Raft snapshot
#   - PostgreSQL custom-format dump
#   - Redis RDB
#   - TLS certificates archive
#   - Runtime files archive
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../backups/development/env.sh"
source "$PROJECT_ROOT/deploy/backups/lib/common.sh"
source "$PROJECT_ROOT/deploy/backups/lib/encrypt.sh"

TS=$(timestamp)
RESCUE_DIR="$PROJECT_ROOT/.agents/rescue"
ensure_dir "$RESCUE_DIR"

TMPDIR=$(mktemp -d)
setup_cleanup "$TMPDIR"

step "Creating Development Rescue Package"

# --- Obtain Vault token ------------------------------------------------------
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

# a. vault_init_rescue.json
log "Copying Vault init.json ..."
$COMPOSE_CMD exec -T vault sh -c 'cat /vault/file/init.json' > "$TMPDIR/vault_init_rescue.json"
[ -s "$TMPDIR/vault_init_rescue.json" ] || die "init.json is empty"

# b. vault_secrets_rescue.json — recursive export
log "Exporting Vault secrets ..."
TMP_SECRETS=$(mktemp -d)
export_path() {
    local path="$1"
    local outdir="$2"
    local keys_json keys

    keys_json="$($COMPOSE_CMD exec -T -e VAULT_TOKEN="$VAULT_TOKEN" -e VAULT_ADDR=https://127.0.0.1:8200 -e VAULT_SKIP_VERIFY=true vault \
        vault kv list -format=json "$path" 2>/dev/null || echo '[]')"
    keys="$(echo "$keys_json" | python3 -c "import sys,json; [print(k) for k in json.load(sys.stdin)]" 2>/dev/null || true)"

    for key in $keys; do
        if [[ "$key" == */ ]]; then
            export_path "${path%/}/${key%/}" "$outdir"
        else
            local full_path="${path%/}/$key"
            local safe_name="${full_path//\//__}"
            $COMPOSE_CMD exec -T -e VAULT_TOKEN="$VAULT_TOKEN" -e VAULT_ADDR=https://127.0.0.1:8200 -e VAULT_SKIP_VERIFY=true vault \
                vault kv get -format=json "$full_path" > "$outdir/${safe_name}.json" 2>/dev/null || warn "Failed to export: $full_path"
        fi
    done
}
export_path "secret/" "$TMP_SECRETS"

python3 -c "
import json, os, sys

secrets = {}
for root, dirs, files in os.walk(sys.argv[1]):
    for f in files:
        if not f.endswith('.json'):
            continue
        path = os.path.join(root, f)
        rel = os.path.relpath(path, sys.argv[1])
        name = rel[:-5]
        vault_path = name.replace('__', '/')
        with open(path) as fh:
            secrets[vault_path] = json.load(fh)

with open(sys.argv[2], 'w') as f:
    json.dump(secrets, f, indent=2)
" "$TMP_SECRETS" "$TMPDIR/vault_secrets_rescue.json"

[ -s "$TMPDIR/vault_secrets_rescue.json" ] || die "vault_secrets_rescue.json is empty"
rm -rf "$TMP_SECRETS"

# c. vault_raft_snapshot.snap
log "Creating Vault Raft snapshot ..."
$COMPOSE_CMD exec -T -e VAULT_TOKEN="$VAULT_TOKEN" -e VAULT_ADDR=https://127.0.0.1:8200 -e VAULT_SKIP_VERIFY=true vault \
    vault operator raft snapshot save /tmp/vault_raft_snapshot.snap >/dev/null
$COMPOSE_CMD cp vault:/tmp/vault_raft_snapshot.snap "$TMPDIR/vault_raft_snapshot.snap"
$COMPOSE_CMD exec -T vault rm -f /tmp/vault_raft_snapshot.snap
[ -s "$TMPDIR/vault_raft_snapshot.snap" ] || die "Raft snapshot is empty"

# d. postgres_rescue_$(timestamp).dump
log "Dumping PostgreSQL ..."
$COMPOSE_CMD exec -T postgres pg_dump -U loyallia -d loyallia \
    --format=custom --compress=9 > "$TMPDIR/postgres_rescue_${TS}.dump"
[ -s "$TMPDIR/postgres_rescue_${TS}.dump" ] || die "PostgreSQL dump is empty"

# e. redis_rescue_$(timestamp).rdb
log "Copying Redis dump.rdb ..."
$COMPOSE_CMD exec -T redis sh -c 'cat /data/dump.rdb' > "$TMPDIR/redis_rescue_${TS}.rdb"
[ -s "$TMPDIR/redis_rescue_${TS}.rdb" ] || die "Redis RDB is empty"

# f. certs_rescue_$(timestamp).tar.gz
log "Archiving certs ..."
if [ -d "$PROJECT_ROOT/certs" ]; then
    tar czf "$TMPDIR/certs_rescue_${TS}.tar.gz" -C "$PROJECT_ROOT" certs/
else
    tar czf "$TMPDIR/certs_rescue_${TS}.tar.gz" --files-from /dev/null
fi
[ -f "$TMPDIR/certs_rescue_${TS}.tar.gz" ] || die "Certs archive failed"

# g. runtime_rescue_$(timestamp).tar.gz
log "Archiving runtime files ..."
$COMPOSE_CMD exec -T vault sh -c 'tar czf /tmp/runtime_rescue.tar.gz -C /run/loyallia-vault .' >/dev/null
$COMPOSE_CMD cp vault:/tmp/runtime_rescue.tar.gz "$TMPDIR/runtime_rescue_${TS}.tar.gz"
$COMPOSE_CMD exec -T vault rm -f /tmp/runtime_rescue.tar.gz
[ -s "$TMPDIR/runtime_rescue_${TS}.tar.gz" ] || die "Runtime archive is empty"

# --- Encrypt all files -------------------------------------------------------
log "Encrypting rescue files ..."
for f in "$TMPDIR"/*; do
    [ -f "$f" ] || continue
    name=$(basename "$f")
    encrypt_file "$f" "$RESCUE_DIR/${name}.age"
    rm -f "$f"
    chmod 0600 "$RESCUE_DIR/${name}.age"
done

# --- Create manifest ---------------------------------------------------------
log "Creating rescue manifest ..."
python3 -c "
import json, hashlib, os, sys
from datetime import datetime, timezone

rescue_dir = sys.argv[1]
files = []
for f in sorted(os.listdir(rescue_dir)):
    if f == 'rescue_manifest.json':
        continue
    path = os.path.join(rescue_dir, f)
    if not os.path.isfile(path):
        continue
    with open(path, 'rb') as fh:
        checksum = hashlib.sha256(fh.read()).hexdigest()
    files.append({
        'name': f,
        'path': f,
        'checksum_sha256': checksum,
        'size_bytes': os.path.getsize(path)
    })

manifest = {
    'created_at': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
    'environment': 'development',
    'files': files
}

with open(os.path.join(rescue_dir, 'rescue_manifest.json'), 'w') as f:
    json.dump(manifest, f, indent=2)
" "$RESCUE_DIR"

chmod 0600 "$RESCUE_DIR/rescue_manifest.json"
log "Rescue package complete: $RESCUE_DIR"
