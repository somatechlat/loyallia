#!/bin/sh
set -eu

# Import Vault KV from a read-only source host into the local Docker Vault.
# This script does not print secret values. It writes a temporary JSON file with
# mode 0600 and removes it on exit.
#
# Usage:
#   scripts/dr_import_vault_from_ssh.sh root@host
#
# Assumptions:
#   - Source host has container `loyallia-vault`.
#   - Source Vault init file is mounted at:
#     /var/lib/docker/volumes/loyallia_vault_data/_data/init.json
#   - Local Docker has container `loyallia-vault` running.

SOURCE_HOST="${1:-}"
SECRET_PATH="${VAULT_APP_SECRET_PATH:-loyallia/production}"
TMP_JSON="$(mktemp /tmp/loyallia-vault-import.XXXXXX.json)"

cleanup() {
    rm -f "$TMP_JSON"
    docker exec loyallia-vault rm -f /tmp/loyallia-vault-import.json >/dev/null 2>&1 || true
}
trap cleanup EXIT

if [ -z "$SOURCE_HOST" ]; then
    echo "usage: $0 user@host" >&2
    exit 2
fi

chmod 0600 "$TMP_JSON"

ssh "$SOURCE_HOST" "set -eu
ROOT_TOKEN=\$(awk -F '\"' '/root_token/ {print \$4}' /var/lib/docker/volumes/loyallia_vault_data/_data/init.json)
docker exec -e VAULT_ADDR=http://127.0.0.1:8200 -e VAULT_TOKEN=\"\$ROOT_TOKEN\" \
  loyallia-vault vault kv get -mount=secret -format=json '$SECRET_PATH'
" | python3 -c 'import json, sys
payload = json.load(sys.stdin)
data = payload.get("data", {}).get("data", {})
if not data:
    raise SystemExit("source Vault path returned no data")
json.dump(data, sys.stdout)
sys.stdout.write("\n")
' >"$TMP_JSON"

docker cp "$TMP_JSON" loyallia-vault:/tmp/loyallia-vault-import.json >/dev/null
docker exec loyallia-vault sh -lc "set -eu
ROOT_TOKEN=\$(awk -F '\"' '/root_token/ {print \$4}' /vault/file/init.json)
export VAULT_ADDR=http://127.0.0.1:8200 VAULT_TOKEN=\"\$ROOT_TOKEN\"
vault kv put -mount=secret '$SECRET_PATH' @/tmp/loyallia-vault-import.json >/dev/null
"

echo "Vault KV import completed without printing secret values"
