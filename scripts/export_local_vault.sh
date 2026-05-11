#!/bin/bash
# Run this on YOUR LOCAL MACHINE where Loyallia works perfectly
# It exports all Vault secrets to a file you can send me

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

echo "Exporting local Vault secrets..."

# Export ALL secrets
docker compose exec -e VAULT_TOKEN="$LOCAL_TOKEN" vault \
  vault kv get -format=json secret/loyallia/production > /tmp/loyallia_vault_export.json

echo "✓ Exported to: /tmp/loyallia_vault_export.json"
echo ""
echo "=== Secrets found ==="
jq '.data.data | keys | .[]' /tmp/loyallia_vault_export.json
echo ""
echo "NEXT: Send me /tmp/loyallia_vault_export.json and I'll import to production"
