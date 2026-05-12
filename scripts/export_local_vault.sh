#!/bin/bash
# Run this on YOUR LOCAL MACHINE where Loyallia works.
# It prints a redacted Vault inventory only. It does not export secret values.

set -euo pipefail

cd "$(dirname "$0")/.."

# Get local Vault token
LOCAL_TOKEN=$(cat /var/lib/docker/volumes/loyallia_vault_runtime/_data/app-token 2>/dev/null || \
  docker compose exec vault cat /vault/file/init.json 2>/dev/null | jq -r '.root_token')

if [[ -z "$LOCAL_TOKEN" || "$LOCAL_TOKEN" == "null" ]]; then
    echo "ERROR: Could not find local Vault token"
    echo "Check: /var/lib/docker/volumes/loyallia_vault_runtime/_data/app-token"
    exit 1
fi

echo "Reading local Vault secret inventory..."

# Read secret metadata and print key presence only.
docker compose exec -e VAULT_TOKEN="$LOCAL_TOKEN" vault \
  vault kv get -format=json secret/loyallia/production | \
  jq '.data.data | with_entries(.value = ((.value | type == "string") and (.value | length > 0)))'

echo "✓ Redacted inventory complete. Secret values were not written to disk."
