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
#   1. A0_SET_MCP_SERVER_TOKEN  -> consumed by the create_auth_token() patch
#      (helpers/settings.py, VENDOR.md patch P1) so the effective API token is
#      ALWAYS the Vault key, regardless of .env / runtime-id derivation drift.
#   2. mcp_server_token key in /a0/usr/settings.json -> belt-and-braces for UI
#      settings consumers; kept in sync with the Vault key on every boot.
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
import json, os, pathlib, sys

path = pathlib.Path(os.environ["A0_SETTINGS_FILE"])
data = None
if path.exists():
    try:
        parsed = json.loads(path.read_text() or "{}")
        if isinstance(parsed, dict):
            data = parsed
    except Exception:
        data = None
    if data is None:
        # NEVER clobber config we cannot read or parse. (2026-10-16: a boot
        # race on this file silently replaced the full agent config with just
        # the token.) Leave the file untouched; the token is still injected
        # via A0_SET_MCP_SERVER_TOKEN (settings.py patch P1).
        print(
            f"loyallia-entrypoint: WARNING {path} unreadable or invalid JSON - "
            "leaving it untouched",
            file=sys.stderr,
        )
if data is not None:
    data["mcp_server_token"] = os.environ["A0_SETTINGS_VALUE"]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=4, ensure_ascii=False))
EOF

# LYL guard: python-dotenv crashes the whole app on an unreadable /a0/usr/.env
# (observed: root-created 0600 file on the state volume -> PermissionError at
# boot). Content the app cannot read is unusable to it anyway, so drop the file
# and let the runtime recreate what it needs (volume dir is app-user owned).
A0_DOTENV="${A0_SETTINGS_FILE:-/a0/usr/settings.json}"
A0_DOTENV="$(dirname "$A0_DOTENV")/.env"
if [ -e "$A0_DOTENV" ] && [ ! -r "$A0_DOTENV" ]; then
    rm -f "$A0_DOTENV" 2>/dev/null || true
    if [ -e "$A0_DOTENV" ]; then
        echo "loyallia-entrypoint: FATAL unreadable $A0_DOTENV cannot be removed" >&2
        exit 1
    fi
    echo "loyallia-entrypoint: removed unreadable $A0_DOTENV (would crash python-dotenv at boot)" >&2
fi

# LYL warm-up: pre-import the ML stack single-threaded before serving. Two
# concurrent first requests race transformers' lazy imports and poison the
# process (2026-10-16: ModuleNotFoundError 'CodeCarbonCallback' on every
# subsequent embed until restart). preload.py exists for exactly this; a
# warm-up failure must never block boot.
( cd /a0 && python preload.py ) 2>/dev/null \
    || echo "loyallia-entrypoint: WARNING preload warm-up failed (continuing)" >&2

exec "$@"
