#!/usr/bin/env bash
# =============================================================================
# LOYALLIA DISASTER RECOVERY — Create Rescue Package (Production)
# =============================================================================
# Same as development but uses production compose files, host binaries,
# stores in /var/backups/loyallia/rescue/, and includes nginx config.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../backups/production/env.sh"
source "$PROJECT_ROOT/deploy/backups/lib/common.sh"
source "$PROJECT_ROOT/deploy/backups/lib/encrypt.sh"

require_cmd pg_dump
require_cmd redis-cli
require_cmd vault

TS=$(timestamp)
RESCUE_DIR="/var/backups/loyallia/rescue"
ensure_dir "$RESCUE_DIR"

TMPDIR=$(mktemp -d)
setup_cleanup "$TMPDIR"

step "Creating Production Rescue Package"

# --- Vault token -------------------------------------------------------------
if [ ! -r "/run/loyallia-vault/app-token" ]; then
    die "Vault app-token not found at /run/loyallia-vault/app-token"
fi

VAULT_TOKEN=$(cat /run/loyallia-vault/app-token)
export VAULT_TOKEN
export VAULT_ADDR="https://127.0.0.1:33908"
export VAULT_SKIP_VERIFY="true"

# a. vault_init_rescue.json
log "Copying Vault init.json ..."
docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" -f "$PROJECT_ROOT/$COMPOSE_PROD_FILE" \
    cp vault:/vault/file/init.json "$TMPDIR/vault_init_rescue.json" 2>/dev/null || die "Failed to copy init.json"
[ -s "$TMPDIR/vault_init_rescue.json" ] || die "init.json is empty"

# b. vault_secrets_rescue.json — recursive export via host vault
log "Exporting Vault secrets ..."
TMP_SECRETS=$(mktemp -d)
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
            vault kv get -format=json "$full_path" > "$outdir/${safe_name}.json" 2>/dev/null || warn "Failed to export: $full_path"
        fi
    done
}
recurse_secrets "secret/" "$TMP_SECRETS"

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
vault operator raft snapshot save "$TMPDIR/vault_raft_snapshot.snap" || die "Raft snapshot failed"
[ -s "$TMPDIR/vault_raft_snapshot.snap" ] || die "Raft snapshot is empty"

# d. postgres_rescue_$(timestamp).dump — host pg_dump
log "Dumping PostgreSQL ..."
if [ ! -r "/run/loyallia-vault/postgres_password" ]; then
    die "Postgres password not found"
fi

PGPASSWORD=$(cat /run/loyallia-vault/postgres_password)
export PGPASSWORD

pg_dump -h 127.0.0.1 -p 33900 -U loyallia -d loyallia \
    --format=custom --compress=9 \
    --file="$TMPDIR/postgres_rescue_${TS}.dump" || die "pg_dump failed"

[ -s "$TMPDIR/postgres_rescue_${TS}.dump" ] || die "PostgreSQL dump is empty"

# e. redis_rescue_$(timestamp).rdb — host redis-cli + /var/lib/redis/dump.rdb
log "Triggering Redis BGSAVE ..."
REDIS_PASSWORD=""
if [ -r "/run/loyallia-vault/redis_password" ]; then
    REDIS_PASSWORD=$(cat /run/loyallia-vault/redis_password)
fi

if [ -n "$REDIS_PASSWORD" ]; then
    LASTSAVE_BEFORE=$(redis-cli -a "$REDIS_PASSWORD" -h 127.0.0.1 -p 33902 LASTSAVE)
    redis-cli -a "$REDIS_PASSWORD" -h 127.0.0.1 -p 33902 BGSAVE >/dev/null
else
    LASTSAVE_BEFORE=$(redis-cli -h 127.0.0.1 -p 33902 LASTSAVE)
    redis-cli -h 127.0.0.1 -p 33902 BGSAVE >/dev/null
fi

MAX_WAIT=30
WAITED=0
while [ "$WAITED" -lt "$MAX_WAIT" ]; do
    sleep 1
    if [ -n "$REDIS_PASSWORD" ]; then
        LASTSAVE_AFTER=$(redis-cli -a "$REDIS_PASSWORD" -h 127.0.0.1 -p 33902 LASTSAVE)
    else
        LASTSAVE_AFTER=$(redis-cli -h 127.0.0.1 -p 33902 LASTSAVE)
    fi
    if [ "$LASTSAVE_AFTER" != "$LASTSAVE_BEFORE" ]; then
        log "BGSAVE completed in ${WAITED}s"
        break
    fi
    WAITED=$((WAITED + 1))
done
if [ "$WAITED" -ge "$MAX_WAIT" ]; then
    die "Redis BGSAVE timed out"
fi

if [ ! -f "/var/lib/redis/dump.rdb" ]; then
    die "Redis dump.rdb not found at /var/lib/redis/dump.rdb"
fi

cp /var/lib/redis/dump.rdb "$TMPDIR/redis_rescue_${TS}.rdb" || die "Failed to copy dump.rdb"
[ -s "$TMPDIR/redis_rescue_${TS}.rdb" ] || die "Redis RDB is empty"

# f. certs_rescue_$(timestamp).tar.gz
log "Archiving certs ..."
if [ -d "$PROJECT_ROOT/certs" ]; then
    tar czf "$TMPDIR/certs_rescue_${TS}.tar.gz" -C "$PROJECT_ROOT" certs/
else
    tar czf "$TMPDIR/certs_rescue_${TS}.tar.gz" --files-from /dev/null
fi
[ -f "$TMPDIR/certs_rescue_${TS}.tar.gz" ] || die "Certs archive failed"

# g. runtime_rescue_$(timestamp).tar.gz — from vault container volume
log "Archiving runtime files ..."
docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" -f "$PROJECT_ROOT/$COMPOSE_PROD_FILE" \
    exec -T vault sh -c 'tar czf /tmp/runtime_rescue.tar.gz -C /run/loyallia-vault .' >/dev/null
docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" -f "$PROJECT_ROOT/$COMPOSE_PROD_FILE" \
    cp vault:/tmp/runtime_rescue.tar.gz "$TMPDIR/runtime_rescue_${TS}.tar.gz"
docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" -f "$PROJECT_ROOT/$COMPOSE_PROD_FILE" \
    exec -T vault rm -f /tmp/runtime_rescue.tar.gz
[ -s "$TMPDIR/runtime_rescue_${TS}.tar.gz" ] || die "Runtime archive is empty"

# h. nginx_rescue_$(timestamp).tar.gz — production nginx configs
log "Archiving nginx configs ..."
NGINX_FILES=""
[ -f "$PROJECT_ROOT/deploy/rewards.loyallia.com.conf" ] && NGINX_FILES="$NGINX_FILES deploy/rewards.loyallia.com.conf"
[ -f "$PROJECT_ROOT/deploy/nginx.conf" ] && NGINX_FILES="$NGINX_FILES deploy/nginx.conf"
if [ -n "$NGINX_FILES" ]; then
    # shellcheck disable=SC2086
    tar czf "$TMPDIR/nginx_rescue_${TS}.tar.gz" -C "$PROJECT_ROOT" $NGINX_FILES
else
    tar czf "$TMPDIR/nginx_rescue_${TS}.tar.gz" --files-from /dev/null
fi
[ -f "$TMPDIR/nginx_rescue_${TS}.tar.gz" ] || die "Nginx archive failed"

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
    'environment': 'production',
    'files': files
}

with open(os.path.join(rescue_dir, 'rescue_manifest.json'), 'w') as f:
    json.dump(manifest, f, indent=2)
" "$RESCUE_DIR"

chmod 0600 "$RESCUE_DIR/rescue_manifest.json"
log "Rescue package complete: $RESCUE_DIR"
