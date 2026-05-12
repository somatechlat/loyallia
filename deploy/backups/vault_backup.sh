#!/bin/bash
# Vault Backup
# Dumps all secrets via kv get + copies init.json
# Retention: 31 days
#
# Diff from bootstrap/disaster_recovery/backup.sh:
# This standalone script can be called independently from cron.
# The unified backup.sh orchestrates all sub-backups together.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/loyallia/vault}"
RETENTION_DAYS=31
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
COMPOSE_PROJECT="${COMPOSE_PROJECT:-loyallia}"
COMPOSE_FILE="${COMPOSE_FILE:-${SCRIPT_DIR}/docker-compose.yml}"
COMPOSE_PROD_FILE="${COMPOSE_PROD_FILE:-${SCRIPT_DIR}/docker-compose.prod.yml}"
AGE_PUBLIC_KEY="${AGE_PUBLIC_KEY:-}"
AGE_KEY_FILE="${AGE_KEY_FILE:-/etc/loyallia/age_public_key.txt}"

export COMPOSE_FILE COMPOSE_PROD_FILE

mkdir -p "$BACKUP_DIR"

encrypt_file() {
    local input="$1"
    local output="$2"

    if [ ! -f "$input" ]; then
        return 1
    fi

    if [ -n "$AGE_PUBLIC_KEY" ]; then
        age -r "$AGE_PUBLIC_KEY" -o "$output" "$input" 2>/dev/null && return 0
    fi

    if [ -f "$AGE_KEY_FILE" ]; then
        age -R "$AGE_KEY_FILE" -o "$output" "$input" 2>/dev/null && return 0
    fi

    echo "ERROR: No age key found. Backup will NOT be encrypted."
    echo "Set AGE_PUBLIC_KEY or create $AGE_KEY_FILE"
    cp "$input" "$output"
    return 1
}

VAULT_TOKEN=""
if docker compose exec -T vault sh -c 'test -f /run/loyallia-vault/app-token' 2>/dev/null; then
    VAULT_TOKEN=$(docker compose exec -T vault sh -c 'cat /run/loyallia-vault/app-token' 2>/dev/null || true)
fi

if [ -z "$VAULT_TOKEN" ]; then
    VAULT_TOKEN=$(docker compose exec -T vault sh -c 'python3 -c "import json; f=open(\"/vault/file/init.json\"); print(json.load(f)[\"root_token\"])"' 2>/dev/null || true)
fi

if [ -z "$VAULT_TOKEN" ]; then
    echo "ERROR: Cannot obtain Vault token. Is Vault running and initialized?"
    exit 1
fi

# Dump all secrets
SECRETS_FILE="$BACKUP_DIR/loyallia_vault_secrets_${TIMESTAMP}.json"
docker compose exec -T -e VAULT_TOKEN="$VAULT_TOKEN" vault \
    vault kv get -mount=secret -format=json "loyallia/production" \
    > "$SECRETS_FILE" 2>/dev/null || true

if [ ! -s "$SECRETS_FILE" ]; then
    echo "ERROR: Vault secrets dump failed."
    rm -f "$SECRETS_FILE"
    exit 1
fi

KEY_COUNT=$(python3 -c "
import json
with open('$SECRETS_FILE') as f:
    data = json.load(f)
secrets = data.get('data', {}).get('data', {})
print(len(secrets))
" 2>/dev/null || echo "0")

echo "Vault secrets exported: ${KEY_COUNT} keys"

# Copy init.json (contains unseal key + root token)
INIT_FILE="$BACKUP_DIR/loyallia_vault_init_${TIMESTAMP}.json"
docker compose exec -T vault sh -c 'cat /vault/file/init.json 2>/dev/null' > "$INIT_FILE" 2>/dev/null || true

if [ ! -s "$INIT_FILE" ]; then
    echo "WARNING: init.json copy failed (non-fatal — may be permission issue)."
    rm -f "$INIT_FILE"
fi

# Encrypt each file
for f in "$SECRETS_FILE" "$INIT_FILE"; do
    if [ -f "$f" ] && [ -s "$f" ]; then
        ENCRYPTED="${f}.age"
        encrypt_file "$f" "$ENCRYPTED"
        rm -f "$f"
        echo "Encrypted: $(basename "$ENCRYPTED")"
    fi
done

# Cleanup old backups
find "$BACKUP_DIR" -name "loyallia_vault_secrets_*.json.age" -mtime "+$RETENTION_DAYS" -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "loyallia_vault_init_*.json.age" -mtime "+$RETENTION_DAYS" -delete 2>/dev/null || true

echo "Vault backup completed: ${KEY_COUNT} keys, $(date)"
