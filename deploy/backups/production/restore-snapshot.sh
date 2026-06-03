#!/usr/bin/env bash
# =============================================================================
# LOYALLIA BACKUP — PRODUCTION SNAPSHOT RESTORE
# =============================================================================
# Thin wrapper around _restore_snapshot_core from lib/common.sh.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"
source "$SCRIPT_DIR/../lib/common.sh"
source "$SCRIPT_DIR/../lib/encrypt.sh"

DOMAIN="rewards.loyallia.com"

# --- Extra confirmation ------------------------------------------------------
echo ""
echo -e "${RED}WARNING: This will DESTROY the current production state${NC}"
echo "Domain: $DOMAIN"
echo ""
read -rp "Type the domain name to confirm restore: " confirm
if [ "$confirm" != "$DOMAIN" ]; then
    die "Confirmation failed — restore aborted"
fi

_restore_snapshot_core "Production" "${1:-}" "$PROJECT_ROOT/deploy/rewards.loyallia.com.conf"

# --- Verify health -----------------------------------------------------------
step "Verifying health..."
sleep 5
HEALTHY=0
TOTAL=0
while IFS= read -r svc; do
    [ -z "$svc" ] && continue
    TOTAL=$((TOTAL + 1))
    cid="$(docker ps -q --filter "name=${svc}" 2>/dev/null | head -1)"
    if [ -n "$cid" ]; then
        status="$(docker inspect -f '{{.State.Status}}' "$cid" 2>/dev/null || true)"
        if [ "$status" = "running" ]; then
            HEALTHY=$((HEALTHY + 1))
        fi
    fi
done < <($COMPOSE_CMD ps --services 2>/dev/null)

log "Health check: $HEALTHY/$TOTAL services running"
if [ "$HEALTHY" -eq "$TOTAL" ] && [ "$TOTAL" -gt 0 ]; then
    log "Restore completed successfully."
else
    warn "Some services may not be fully healthy yet — check manually with docker compose ps"
fi
