#!/usr/bin/env bash
# Vault Backup — DEVELOPMENT ONLY
# Uses docker compose exec (no host binaries required)
# Output: ./.agents/backups/vault_secrets_YYYYMMDD_HHMMSS.json
#         ./.agents/backups/vault_init_YYYYMMDD_HHMMSS.json

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/.agents/backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
VAULT_ENV="${VAULT_ENV:-development}"

mkdir -p "$BACKUP_DIR"

echo "[dev-backup] Vault backup starting..."

# Obtain token
VAULT_TOKEN=""
if docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T vault sh -c 'test -f /run/loyallia-vault/app-token' 2>/dev/null; then
    VAULT_TOKEN="$(docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T vault sh -c 'cat /run/loyallia-vault/app-token' 2>/dev/null || true)"
fi

if [ -z "$VAULT_TOKEN" ]; then
    VAULT_TOKEN="$(docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T vault sh -c 'grep "root_token" /vault/file/init.json | sed '\''s/.*"root_token": *"\([^"]*\)".*/\1/'\''' 2>/dev/null || true)"
fi

if [ -z "$VAULT_TOKEN" ]; then
    echo "[dev-backup] ERROR: Cannot obtain Vault token. Is Vault running?"
    exit 1
fi

# Dump secrets
SECRETS_FILE="$BACKUP_DIR/vault_secrets_${TIMESTAMP}.json"
docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T -e VAULT_TOKEN="$VAULT_TOKEN" -e VAULT_ADDR=https://127.0.0.1:8200 -e VAULT_SKIP_VERIFY=true vault \
    vault kv get -mount=secret -format=json "loyallia/${VAULT_ENV}" \
    > "$SECRETS_FILE" 2>/dev/null || true

if [ ! -s "$SECRETS_FILE" ]; then
    echo "[dev-backup] ERROR: Vault secrets dump failed."
    rm -f "$SECRETS_FILE"
    exit 1
fi

KEY_COUNT="$(python3 -c "
import json
with open('$SECRETS_FILE') as f:
    data = json.load(f)
secrets = data.get('data', {}).get('data', {})
print(len(secrets))
" 2>/dev/null || echo "0")"

# Copy init.json
INIT_FILE="$BACKUP_DIR/vault_init_${TIMESTAMP}.json"
docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T vault sh -c 'cat /vault/file/init.json 2>/dev/null' > "$INIT_FILE" 2>/dev/null || true

if [ ! -s "$INIT_FILE" ]; then
    echo "[dev-backup] WARNING: init.json copy failed."
    rm -f "$INIT_FILE"
fi

echo "[dev-backup] Vault backup: ${KEY_COUNT} secrets, init.json copied"
