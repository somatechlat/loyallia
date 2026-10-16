#!/bin/sh
# Loyallia first-party entrypoint (see VENDOR.md "First-party additions").
#
# Injects the Agent Zero API key from HashiCorp Vault at boot using the same
# runtime file-injection pattern as the backend (common/vault.py):
#   VAULT_ADDR + VAULT_TOKEN_FILE + VAULT_CACERT + VAULT_SECRET_PATH
# The key becomes settings.mcp_server_token, which validates the X-API-KEY
# header that backend/apps/tenants/services/ai_proxy.py sends on every call.
#
# Both injection points are set on purpose:
#   1. A0_SET_MCP_SERVER_TOKEN  -> settings default (helpers/settings.py)
#   2. mcp_server_token key in /a0/usr/settings.json -> because settings.json
#      overrides env defaults, keeping both in sync survives UI settings saves
#      and Vault key rotation.
#
# Secrets never appear in the image, in git, or in compose config — only in
# Vault and in the runtime state volume.
set -eu

SETTINGS_FILE="${A0_SETTINGS_FILE:-/a0/usr/settings.json}"

fetch_vault_key() {
    [ -n "${VAULT_ADDR:-}" ] || return 1
    [ -n "${VAULT_TOKEN_FILE:-}" ] && [ -f "${VAULT_TOKEN_FILE}" ] || return 1
    curl -fsS --cacert "${VAULT_CACERT:-/run/loyallia-vault/ca.crt}" \
        -H "X-Vault-Token: $(cat "$VAULT_TOKEN_FILE")" \
        "${VAULT_ADDR}/v1/${VAULT_SECRET_PATH:-secret/data/loyallia/development}" \
        | python -c 'import json,sys
try:
    print(json.load(sys.stdin)["data"]["data"].get("ai_agent_api_key", ""))
except Exception:
    print("")'
}

if [ -z "${A0_SET_MCP_SERVER_TOKEN:-}" ]; then
    if KEY="$(fetch_vault_key)"; then
        A0_SET_MCP_SERVER_TOKEN="$KEY"
    fi
fi

if [ -z "${A0_SET_MCP_SERVER_TOKEN:-}" ]; then
    echo "loyallia-entrypoint: FATAL ai_agent_api_key unavailable (Vault fetch failed and no A0_SET_MCP_SERVER_TOKEN provided)" >&2
    exit 1
fi
export A0_SET_MCP_SERVER_TOKEN

A0_SETTINGS_VALUE="$A0_SET_MCP_SERVER_TOKEN" A0_SETTINGS_FILE="$SETTINGS_FILE" python - <<'EOF'
import json, os, pathlib

path = pathlib.Path(os.environ["A0_SETTINGS_FILE"])
data = {}
if path.exists():
    try:
        data = json.loads(path.read_text() or "{}")
    except Exception:
        data = {}
data["mcp_server_token"] = os.environ["A0_SETTINGS_VALUE"]
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(data, indent=4, ensure_ascii=False))
EOF

exec "$@"
