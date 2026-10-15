#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# LOYALLIA — Publish the Agent Zero API key into Vault (agent -> Vault)
# =============================================================================
#
# Agent Zero does NOT store an arbitrary API key: its expected X-API-KEY is
# DERIVED at runtime —
#     mcp_server_token = urlsafe_b64(sha256(runtime_id:login:password))[:16]
# (helpers/settings.py create_auth_token; stable across restarts, never
# persisted, regenerated on every normalize_settings call).
#
# The platform's system of record for the Agent API credential is Vault
# secret `ai_agent_api_key`, managed through the Sys Admin integrations
# endpoint. This script keeps that mirror accurate by reading the agent's
# actual derived token and writing it to Vault — the ONLY direction that can
# work (a 43-char arbitrary value can never be forced onto the agent).
#
# Security properties (no secret ever touches argv, disk, env files, or logs):
#   - The token travels agent container -> shell var -> stdin of the api
#     container; stdout carries only status/length/sha-prefix words.
#   - Vault write uses common.vault.put_secret inside loyallia-api (the same
#     primitive the audited Sys Admin endpoint uses; runtime token comes from
#     the mounted /run/loyallia-vault/token, never from host env).
#   - Only the allowlisted key `ai_agent_api_key` is ever written.
#   - Idempotent: writes only when Vault differs; cache cleared + api/celery
#     restarted only when the value changed (mirrors rotate_secrets.sh).
#
# Usage:
#   ./deploy/scripts/sync_agent_config.sh [--dry-run]
#
# Exit codes: 0 in sync/updated, 1 configuration/input error,
#             2 agent token read failure, 3 Vault write/verify failure.
# =============================================================================

API_CONTAINER="${API_CONTAINER:-loyallia-api}"
AGENT_CONTAINER="${AGENT_CONTAINER:-loyallia-agent}"
VAULT_KEY="ai_agent_api_key"          # allowlist: the only key this script may touch
DRY_RUN=false

for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=true ;;
        *) printf '[sync-agent-config] unknown option: %s\n' "$arg" >&2; exit 1 ;;
    esac
done

log()  { printf '[sync-agent-config] %s\n' "$*" >&2; }
die()  { local code="$1"; shift; log "ERROR: $*"; exit "$code"; }

for c in "$API_CONTAINER" "$AGENT_CONTAINER"; do
    docker inspect "$c" >/dev/null 2>&1 || die 1 "container not found: $c"
done
[ "$(docker inspect -f '{{.State.Running}}' "$API_CONTAINER")" = "true" ]  || die 1 "$API_CONTAINER is not running"
[ "$(docker inspect -f '{{.State.Running}}' "$AGENT_CONTAINER")" = "true" ] || die 1 "$AGENT_CONTAINER is not running"
docker exec "$AGENT_CONTAINER" test -x /opt/venv-a0/bin/python \
    || die 1 "agent app interpreter /opt/venv-a0/bin/python not found"

# --- 1. Read the agent's derived token (never printed) ----------------------
agent_token="$(
    docker exec "$AGENT_CONTAINER" /opt/venv-a0/bin/python -c '
import sys
sys.path.insert(0, "/a0")
from helpers import settings
sys.stdout.write(settings.get_settings().get("mcp_server_token") or "")
' 2>/dev/null
)" || die 2 "failed to read agent token"

# The derived token is urlsafe base64 minus padding => exactly 16 chars.
if ! printf '%s' "$agent_token" | LC_ALL=C grep -Eq '^[A-Za-z0-9_-]{16}$'; then
    die 2 "agent token malformed (length=$(printf '%s' "$agent_token" | wc -c | tr -d ' '))"
fi
log "agent token read (length=$(printf '%s' "$agent_token" | wc -c | tr -d ' '))"

# --- 2. Compare with Vault (plaintext never logged) -------------------------
vault_read() {
    docker exec "$API_CONTAINER" python3 -c '
import logging, sys
logging.disable(logging.CRITICAL)
from common.vault import get_secret
sys.stdout.write(get_secret("'"$VAULT_KEY"'") or "")
' 2>/dev/null
}

vault_token="$(vault_read)" || die 2 "Vault read failed"
if [ "$vault_token" = "$agent_token" ]; then
    log "Vault $VAULT_KEY already matches the agent — nothing to do"
    exit 0
fi
log "Vault differs (length=$(printf '%s' "$vault_token" | wc -c | tr -d ' '), sha256-prefix=$(printf '%s' "$vault_token" | openssl dgst -sha256 2>/dev/null | awk '{print substr($2,1,12)}'))"

if [ "$DRY_RUN" = true ]; then
    log "[DRY RUN] Would publish agent token to Vault $VAULT_KEY and refresh api/celery"
    exit 0
fi

# --- 3. Publish via common.vault.put_secret (value over stdin) --------------
ok="$(
    printf '%s' "$agent_token" | docker exec -i "$API_CONTAINER" python3 -c '
import logging, re, sys
logging.disable(logging.CRITICAL)
value = sys.stdin.read().strip()
if not re.fullmatch(r"[A-Za-z0-9_-]{16}", value):
    print("INVALID-INPUT"); sys.exit(1)
from common.vault import put_secret, clear_cache
if not put_secret("ai_agent_api_key", value):
    print("WRITE-FAILED"); sys.exit(1)
try:
    clear_cache()
except Exception:
    pass
print("WROTE")
' 2>/dev/null
)" || die 3 "Vault write failed"

case "$ok" in
    *WROTE*) log "Vault $VAULT_KEY written" ;;
    *) die 3 "unexpected write response: $ok" ;;
esac

# --- 4. Verify the write landed --------------------------------------------
verify="$(vault_read)" || die 3 "Vault re-read failed"
if [ "$verify" != "$agent_token" ]; then
    die 3 "verification failed: Vault value does not match agent token after write"
fi
log "verified: Vault now matches the agent"

# --- 5. Refresh readers (same pattern as rotate_secrets.sh) -----------------
log "Restarting api + celery so the new key is picked up immediately..."
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
    restart api celery-pass celery-push celery-default celery-beat >/dev/null
for _ in $(seq 1 30); do
    st="$(docker inspect -f '{{.State.Health.Status}}' loyallia-api 2>/dev/null || echo unknown)"
    [ "$st" = "healthy" ] && break
    sleep 3
done
[ "$st" = "healthy" ] || die 3 "api did not become healthy after restart (status=$st)"
log "api healthy — agent key sync complete"
