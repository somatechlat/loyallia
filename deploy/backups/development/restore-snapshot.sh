#!/usr/bin/env bash
# =============================================================================
# LOYALLIA BACKUP — DEVELOPMENT SNAPSHOT RESTORE
# =============================================================================
# Thin wrapper around _restore_snapshot_core from lib/common.sh.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"
source "$SCRIPT_DIR/../lib/common.sh"
source "$SCRIPT_DIR/../lib/encrypt.sh"

_restore_snapshot_core "Development" "${1:-}"

# --- Verify health -----------------------------------------------------------
step "Verifying health..."
sleep 5
HEALTHY=0
TOTAL=0
for svc in $(${COMPOSE_CMD} ps --services 2>/dev/null); do
    TOTAL=$((TOTAL + 1))
    cid="$(${COMPOSE_CMD} ps -q "$svc" 2>/dev/null | head -1)"
    if [ -n "$cid" ]; then
        status="$(docker inspect -f '{{.State.Health.Status}}' "$cid" 2>/dev/null || true)"
    else
        status=""
    fi
    if [ "$status" = "healthy" ] || [ "$status" = "" ]; then
        # No healthcheck configured or healthy
        HEALTHY=$((HEALTHY + 1))
    fi
done

log "Health check: $HEALTHY/$TOTAL services appear healthy"
if [ "$HEALTHY" -eq "$TOTAL" ] && [ "$TOTAL" -gt 0 ]; then
    log "Restore completed successfully."
else
    warn "Some services may not be fully healthy yet — check manually with docker compose ps"
fi
