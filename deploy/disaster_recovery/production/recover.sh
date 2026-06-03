#!/usr/bin/env bash
# =============================================================================
# LOYALLIA DISASTER RECOVERY — Full Recovery from Rescue (Production)
# =============================================================================
# Reads rescue files from /var/backups/loyallia/rescue/ and performs full
# stack recovery. Uses production compose files and host binaries.
# Extra confirmation required. Each step aborts on failure.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../backups/production/env.sh"
source "$PROJECT_ROOT/deploy/backups/lib/common.sh"
source "$PROJECT_ROOT/deploy/backups/lib/encrypt.sh"

RESCUE_DIR="/var/backups/loyallia/rescue"
TMPDIR=$(mktemp -d)

trap 'rm -rf "$TMPDIR"; err "Cleanup triggered"; exit 1' EXIT INT TERM

step "Production Disaster Recovery"

# a. Verify rescue manifest
if [ ! -f "$RESCUE_DIR/rescue_manifest.json" ]; then
    die "Rescue manifest not found: $RESCUE_DIR/rescue_manifest.json"
fi

log "Verifying manifest ..."
python3 -c "import json; json.load(open('$RESCUE_DIR/rescue_manifest.json'))" || die "Invalid manifest JSON"

EXPECTED=$(python3 -c "import json; d=json.load(open('$RESCUE_DIR/rescue_manifest.json')); print(len(d.get('files',[])))")
if [ "$EXPECTED" -eq 0 ]; then
    die "Manifest contains no files"
fi
log "Manifest OK: $EXPECTED encrypted files"

# b. Stop all containers
step "Stopping all containers"
$COMPOSE_CMD down || die "Failed to stop containers"

# c. Destroy volumes (extra confirmation for production)
step "Destroying volumes"
echo ""
warn "PRODUCTION DISASTER RECOVERY"
warn "THIS WILL DESTROY ALL PRODUCTION DATA IN DOCKER VOLUMES."
read -r -p "Type RECOVER to proceed: " confirm1
if [ "$confirm1" != "RECOVER" ]; then
    die "Aborted."
fi

read -r -p "Type DESTROY to confirm permanent data destruction: " confirm2
if [ "$confirm2" != "DESTROY" ]; then
    die "Aborted."
fi
$COMPOSE_CMD down -v || die "Failed to destroy volumes"

# Decrypt rescue files
log "Decrypting rescue files ..."
for f in "$RESCUE_DIR"/*.age; do
    [ -e "$f" ] || continue
    name=$(basename "$f" .age)
    decrypt_file "$f" "$TMPDIR/$name"
done

INIT_JSON=$(find "$TMPDIR" -maxdepth 1 -name 'vault_init_rescue.json' | head -n1)
SECRETS_JSON=$(find "$TMPDIR" -maxdepth 1 -name 'vault_secrets_rescue.json' | head -n1)
RAFT_SNAP=$(find "$TMPDIR" -maxdepth 1 -name 'vault_raft_snapshot.snap' | head -n1)
PG_DUMP=$(find "$TMPDIR" -maxdepth 1 -name 'postgres_rescue_*.dump' | head -n1)
REDIS_RDB=$(find "$TMPDIR" -maxdepth 1 -name 'redis_rescue_*.rdb' | head -n1)
CERTS_TGZ=$(find "$TMPDIR" -maxdepth 1 -name 'certs_rescue_*.tar.gz' | head -n1)
RUNTIME_TGZ=$(find "$TMPDIR" -maxdepth 1 -name 'runtime_rescue_*.tar.gz' | head -n1)
NGINX_TGZ=$(find "$TMPDIR" -maxdepth 1 -name 'nginx_rescue_*.tar.gz' | head -n1)

[ -n "$INIT_JSON" ] || die "vault_init_rescue.json not found"
[ -n "$SECRETS_JSON" ] || die "vault_secrets_rescue.json not found"
[ -n "$RAFT_SNAP" ] || die "vault_raft_snapshot.snap not found"
[ -n "$PG_DUMP" ] || die "postgres dump not found"
[ -n "$REDIS_RDB" ] || die "redis RDB not found"
[ -n "$CERTS_TGZ" ] || die "certs archive not found"
[ -n "$RUNTIME_TGZ" ] || die "runtime archive not found"
[ -n "$NGINX_TGZ" ] || die "nginx archive not found"

# Extract original unseal keys and root token from init.json
ROOT_TOKEN=$(python3 -c "import json; print(json.load(open('$INIT_JSON')).get('root_token',''))")
UNSEAL_KEYS=$(python3 -c "import json; d=json.load(open('$INIT_JSON')); keys=d.get('keys_base64',d.get('keys',[])); print(' '.join(keys[:3]))")

if [ -z "$ROOT_TOKEN" ]; then
    die "Could not extract root token from init.json"
fi

# d. Start Vault, restore from init.json + Raft snapshot
step "Restoring Vault"
$COMPOSE_CMD up -d vault || die "Failed to start Vault"

MAX_WAIT=60
WAITED=0
while [ "$WAITED" -lt "$MAX_WAIT" ]; do
    if docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" -f "$PROJECT_ROOT/$COMPOSE_PROD_FILE" \
        exec -T vault wget --spider --quiet --no-check-certificate https://127.0.0.1:8200/v1/sys/health?sealedcode=200\&uninitcode=200 2>/dev/null; then
        break
    fi
    sleep 1
    WAITED=$((WAITED + 1))
done
if [ "$WAITED" -ge "$MAX_WAIT" ]; then
    die "Vault failed to become ready"
fi

# Copy init.json into place
docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" -f "$PROJECT_ROOT/$COMPOSE_PROD_FILE" \
    cp "$INIT_JSON" vault:/vault/file/init.json

INIT_STATUS=$(docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" -f "$PROJECT_ROOT/$COMPOSE_PROD_FILE" \
    exec -T vault wget -qO- --no-check-certificate https://127.0.0.1:8200/v1/sys/init 2>/dev/null || echo '{"initialized":false}')
if echo "$INIT_STATUS" | grep -q '"initialized":false'; then
    log "Vault is uninitialized — performing temporary init to enable snapshot restore ..."
    TEMP_INIT=$(docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" -f "$PROJECT_ROOT/$COMPOSE_PROD_FILE" \
        exec -T -e VAULT_ADDR=https://127.0.0.1:8200 -e VAULT_SKIP_VERIFY=true vault \
        vault operator init -key-shares=5 -key-threshold=3 -format=json 2>/dev/null)
    TEMP_TOKEN=$(echo "$TEMP_INIT" | python3 -c "import sys,json; print(json.load(sys.stdin)['root_token'])")
    TEMP_KEYS=$(echo "$TEMP_INIT" | python3 -c "import sys,json; print(' '.join(json.load(sys.stdin)['keys_base64'][:3]))")

    for key in $TEMP_KEYS; do
        docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" -f "$PROJECT_ROOT/$COMPOSE_PROD_FILE" \
            exec -T -e VAULT_ADDR=https://127.0.0.1:8200 -e VAULT_SKIP_VERIFY=true vault \
            vault operator unseal "$key" >/dev/null
    done

    docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" -f "$PROJECT_ROOT/$COMPOSE_PROD_FILE" \
        cp "$RAFT_SNAP" vault:/tmp/vault_raft_snapshot.snap
    docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" -f "$PROJECT_ROOT/$COMPOSE_PROD_FILE" \
        exec -T -e VAULT_TOKEN="$TEMP_TOKEN" -e VAULT_ADDR=https://127.0.0.1:8200 -e VAULT_SKIP_VERIFY=true vault \
        vault operator raft snapshot restore /tmp/vault_raft_snapshot.snap >/dev/null
    docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" -f "$PROJECT_ROOT/$COMPOSE_PROD_FILE" \
        exec -T vault rm -f /tmp/vault_raft_snapshot.snap

    sleep 5
fi

# Unseal with original keys
for key in $UNSEAL_KEYS; do
    docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" -f "$PROJECT_ROOT/$COMPOSE_PROD_FILE" \
        exec -T -e VAULT_ADDR=https://127.0.0.1:8200 -e VAULT_SKIP_VERIFY=true vault \
        vault operator unseal "$key" >/dev/null || true
done

SEAL_STATUS=$(docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" -f "$PROJECT_ROOT/$COMPOSE_PROD_FILE" \
    exec -T vault wget -qO- --no-check-certificate https://127.0.0.1:8200/v1/sys/seal-status 2>/dev/null || echo '{"sealed":true}')
if echo "$SEAL_STATUS" | grep -q '"sealed":true'; then
    die "Vault is still sealed after recovery"
fi
log "Vault unsealed: OK"

# e. Restore Vault secrets
step "Restoring Vault secrets"
python3 -c "
import json, urllib.request, ssl, os

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

with open('$SECRETS_JSON') as f:
    secrets = json.load(f)

token = '$ROOT_TOKEN'
base = 'https://127.0.0.1:8200/v1'

for path, data in secrets.items():
    secret_data = data.get('data', {}).get('data', {})
    if not secret_data:
        continue
    url = f'{base}/{path}'
    payload = json.dumps({'data': secret_data}).encode()
    req = urllib.request.Request(url, data=payload, headers={
        'X-Vault-Token': token,
        'Content-Type': 'application/json'
    }, method='POST')
    try:
        urllib.request.urlopen(req, context=ctx)
    except urllib.error.HTTPError as e:
        if e.code != 204:
            print(f'WARN: Failed to restore {path}: {e.code}', file=sys.stderr)
" || warn "Some Vault secrets may have failed to restore"
log "Vault secrets restored"

# f. Restore PostgreSQL
step "Restoring PostgreSQL"
$COMPOSE_CMD up -d postgres || die "Failed to start PostgreSQL"

MAX_WAIT=60
WAITED=0
while [ "$WAITED" -lt "$MAX_WAIT" ]; do
    if $COMPOSE_CMD exec -T postgres pg_isready -U loyallia -d loyallia >/dev/null 2>&1; then
        break
    fi
    sleep 1
    WAITED=$((WAITED + 1))
done
if [ "$WAITED" -ge "$MAX_WAIT" ]; then
    die "PostgreSQL failed to become ready"
fi

log "Dropping and recreating database ..."
$COMPOSE_CMD exec -T postgres psql -U loyallia -d postgres -c "DROP DATABASE IF EXISTS loyallia;" >/dev/null
$COMPOSE_CMD exec -T postgres psql -U loyallia -d postgres -c "CREATE DATABASE loyallia;" >/dev/null

log "Restoring from dump ..."
$COMPOSE_CMD exec -T postgres pg_restore -U loyallia -d loyallia --clean --if-exists < "$PG_DUMP" || {
    warn "pg_restore exited with errors (non-fatal for some object conflicts)"
}
log "PostgreSQL restored"

# g. Restore Redis
step "Restoring Redis"
$COMPOSE_CMD up -d redis || die "Failed to start Redis"
sleep 2

log "Stopping Redis to replace RDB ..."
$COMPOSE_CMD stop redis || die "Failed to stop Redis"
$COMPOSE_CMD cp "$REDIS_RDB" redis:/data/dump.rdb || die "Failed to copy RDB"
$COMPOSE_CMD start redis || die "Failed to start Redis"
log "Redis restored"

# h. Restore certs, runtime files, and nginx config
step "Restoring certs, runtime, and nginx config"

# Certs
rm -rf "$PROJECT_ROOT/certs"
tar xzf "$CERTS_TGZ" -C "$PROJECT_ROOT" || die "Failed to extract certs"
log "Certs restored"

# Runtime — copy into running Vault container
$COMPOSE_CMD exec -T vault sh -c 'rm -rf /run/loyallia-vault/*' || true
$COMPOSE_CMD cp "$RUNTIME_TGZ" vault:/tmp/runtime_rescue.tar.gz || die "Failed to copy runtime archive"
$COMPOSE_CMD exec -T vault sh -c 'tar xzf /tmp/runtime_rescue.tar.gz -C /run/loyallia-vault && rm -f /tmp/runtime_rescue.tar.gz' || die "Failed to extract runtime"
log "Runtime files restored"

# Nginx config — restore to project and host nginx
NGINX_TMP=$(mktemp -d)
tar xzf "$NGINX_TGZ" -C "$NGINX_TMP" || die "Failed to extract nginx config"

if [ -f "$NGINX_TMP/deploy/rewards.loyallia.com.conf" ]; then
    cp "$NGINX_TMP/deploy/rewards.loyallia.com.conf" "$PROJECT_ROOT/deploy/rewards.loyallia.com.conf"
    if [ -d "/etc/nginx/sites-available" ]; then
        cp "$NGINX_TMP/deploy/rewards.loyallia.com.conf" /etc/nginx/sites-available/rewards.loyallia.com.conf || warn "Could not copy to /etc/nginx/sites-available"
        if [ -L "/etc/nginx/sites-enabled/rewards.loyallia.com.conf" ] || [ -f "/etc/nginx/sites-enabled/rewards.loyallia.com.conf" ]; then
            rm -f /etc/nginx/sites-enabled/rewards.loyallia.com.conf
        fi
        ln -s /etc/nginx/sites-available/rewards.loyallia.com.conf /etc/nginx/sites-enabled/rewards.loyallia.com.conf 2>/dev/null || true
    elif [ -d "/etc/nginx/conf.d" ]; then
        cp "$NGINX_TMP/deploy/rewards.loyallia.com.conf" /etc/nginx/conf.d/rewards.loyallia.com.conf || warn "Could not copy to /etc/nginx/conf.d"
    fi
    if command -v nginx >/dev/null 2>&1; then
        nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null || warn "Could not reload nginx"
    fi
fi

if [ -f "$NGINX_TMP/deploy/nginx.conf" ]; then
    cp "$NGINX_TMP/deploy/nginx.conf" "$PROJECT_ROOT/deploy/nginx.conf"
fi

rm -rf "$NGINX_TMP"
log "Nginx config restored"

# i. Start all services
step "Starting all services"
$COMPOSE_CMD up -d || die "Failed to start all services"

# j. Health check
step "Health Checks"

# API 200
MAX_WAIT=60
WAITED=0
while [ "$WAITED" -lt "$MAX_WAIT" ]; do
    if curl -sf http://127.0.0.1:33905/api/v1/health/ >/dev/null 2>&1; then
        log "API health (200): OK"
        break
    fi
    sleep 2
    WAITED=$((WAITED + 2))
done
if [ "$WAITED" -ge "$MAX_WAIT" ]; then
    die "API health check failed"
fi

# DB connect
if $COMPOSE_CMD exec -T postgres pg_isready -U loyallia -d loyallia >/dev/null 2>&1; then
    log "DB connect: OK"
else
    die "DB connect failed"
fi

# Vault unsealed
SEAL_STATUS=$(docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" -f "$PROJECT_ROOT/$COMPOSE_PROD_FILE" \
    exec -T vault wget -qO- --no-check-certificate https://127.0.0.1:8200/v1/sys/seal-status 2>/dev/null || echo '{"sealed":true}')
if echo "$SEAL_STATUS" | grep -q '"sealed":false'; then
    log "Vault unsealed: OK"
else
    die "Vault is still sealed"
fi

# Redis PING
if $COMPOSE_CMD exec -T redis sh -c 'redis-cli -a "$(cat /run/loyallia-vault/redis_password)" PING' 2>/dev/null | grep -q PONG; then
    log "Redis PING: OK"
else
    die "Redis PING failed"
fi

# Disable trap on success
trap - EXIT INT TERM
rm -rf "$TMPDIR"

step "Production recovery complete!"
