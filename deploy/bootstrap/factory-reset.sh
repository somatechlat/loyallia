#!/usr/bin/env bash
# =============================================================================
# LOYALLIA FACTORY RESET
# =============================================================================
# Destroys ALL Docker resources: containers, volumes, networks.
# Leaves the project in a pristine state (as if after `git clone`).
#
# WARNING: This is IRREVERSIBLE. All data will be lost.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[factory-reset]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err() { echo -e "${RED}[error]${NC} $*" >&2; }

echo ""
echo -e "${RED}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║  LOYALLIA FACTORY RESET                                              ║${NC}"
echo -e "${RED}║                                                                      ║${NC}"
echo -e "${RED}║  This will DESTROY all data:                                         ║${NC}"
echo -e "${RED}║    • All running and stopped containers                              ║${NC}"
echo -e "${RED}║    • All Docker volumes (PostgreSQL, Redis, MinIO, Vault, etc.)      ║${NC}"
echo -e "${RED}║    • All Docker networks                                             ║${NC}"
echo -e "${RED}║    • All Docker images built by this project (optional)              ║${NC}"
echo -e "${RED}║                                                                      ║${NC}"
echo -e "${RED}║  This action is IRREVERSIBLE.                                        ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# --- Production safety check ---
PRODUCTION_FLAG=0
for arg in "$@"; do
    if [ "$arg" = "--i-am-sure-production" ]; then
        PRODUCTION_FLAG=1
    fi
done

is_production=0
if [ -n "${COMPOSE_FILE:-}" ] && [[ "$COMPOSE_FILE" == *prod* ]]; then
    is_production=1
elif [ -f "$PROJECT_ROOT/.env" ] && grep -qE '^\s*DOMAIN\s*=\s*rewards\.loyallia\.com' "$PROJECT_ROOT/.env" 2>/dev/null; then
    is_production=1
fi

if [ "$is_production" -eq 1 ]; then
    if [ "$PRODUCTION_FLAG" -eq 0 ]; then
        err "PRODUCTION ENVIRONMENT DETECTED."
        err "Factory reset in production requires the --i-am-sure-production flag."
        err "Aborting."
        exit 1
    fi

    expected_domain="rewards.loyallia.com"
    read -r -p "Production environment detected. Type the domain name to confirm destruction: " domain_input
    if [ "$domain_input" != "$expected_domain" ]; then
        err "Domain confirmation failed. Expected '$expected_domain'. Aborting."
        exit 1
    fi
fi

# --- Confirmation ---
read -r -p "Type 'DESTROY' to confirm complete factory reset: " confirm
echo ""
if [ "$confirm" != "DESTROY" ]; then
    log "Aborted. No changes were made."
    exit 0
fi

# --- Stop all containers ---
log "Step 1/5 — Stopping all containers..."
cd "$PROJECT_ROOT"
docker compose down --remove-orphans --volumes 2>/dev/null || true

# Also stop any dangling containers that might not be in compose
if [ "$(docker ps -aq --filter "name=loyallia-" 2>/dev/null | wc -l | tr -d ' ')" -gt 0 ]; then
    docker rm -f $(docker ps -aq --filter "name=loyallia-") 2>/dev/null || true
fi

# --- Remove all volumes ---
log "Step 2/5 — Removing all Docker volumes..."
VOLUMES=(
    loyallia_postgres_data
    loyallia_postgres_replica_data
    loyallia_redis_data
    loyallia_minio_data
    loyallia_vault_data
    loyallia_vault_runtime
    loyallia_static_files
    loyallia_media_files
    loyallia_next_cache
    loyallia_node_modules
    loyallia_prometheus_data
    loyallia_grafana_data
    loyallia_loki_data
    loyallia_alertmanager-data
    loyallia_sentinel-data
    loyallia_bootstrap_tmp
)

for vol in "${VOLUMES[@]}"; do
    if docker volume inspect "$vol" &>/dev/null; then
        docker volume rm "$vol" 2>/dev/null && log "  Removed volume: $vol" || warn "  Could not remove volume: $vol"
    fi
done

# --- Remove all networks ---
log "Step 3/5 — Removing all Docker networks..."
NETWORKS=(
    loyallia_frontend-net
    loyallia_backend-net
    loyallia_monitoring-net
)

for net in "${NETWORKS[@]}"; do
    if docker network inspect "$net" &>/dev/null; then
        docker network rm "$net" 2>/dev/null && log "  Removed network: $net" || warn "  Could not remove network: $net"
    fi
done

# --- Optional: remove built images ---
log "Step 4/5 — Checking for built images..."
IMAGES=$(docker images --filter "reference=*loyallia*" --format "{{.ID}}" 2>/dev/null || true)
if [ -n "$IMAGES" ]; then
    read -r -p "Also remove built Docker images? [y/N]: " delete_images
    if [ "$delete_images" = "y" ] || [ "$delete_images" = "Y" ]; then
        echo "$IMAGES" | xargs -r docker rmi -f 2>/dev/null || true
        log "Removed built images."
    else
        log "Skipped image removal."
    fi
else
    log "No project images found."
fi

# --- Optional: remove rescue files ---
log "Step 5/5 — Checking for rescue files..."
if [ -d "$PROJECT_ROOT/.agents" ]; then
    echo ""
    warn "Rescue files found in .agents/:"
    ls -1 "$PROJECT_ROOT/.agents/" | sed 's/^/  - /'
    echo ""
    read -r -p "Also delete rescue files in .agents/? [y/N]: " delete_rescue
    if [ "$delete_rescue" = "y" ] || [ "$delete_rescue" = "Y" ]; then
        rm -rf "$PROJECT_ROOT/.agents/"
        log "Rescue files deleted."
    else
        log "Rescue files preserved."
    fi
else
    log "No rescue files found."
fi

# --- Final verification ---
echo ""
log "═══════════════════════════════════════════════════════════════════════"
log "Factory reset complete."
log "═══════════════════════════════════════════════════════════════════════"
echo ""

CONTAINERS=$(docker ps -aq --filter "name=loyallia-" 2>/dev/null | wc -l | tr -d ' ')
VOLUMES_LEFT=$(docker volume ls -q --filter "name=loyallia" 2>/dev/null | wc -l | tr -d ' ')
NETWORKS_LEFT=$(docker network ls -q --filter "name=loyallia" 2>/dev/null | wc -l | tr -d ' ')

log "Remaining project containers: $CONTAINERS"
log "Remaining project volumes:    $VOLUMES_LEFT"
log "Remaining project networks:   $NETWORKS_LEFT"

if [ "$CONTAINERS" -eq 0 ] && [ "$VOLUMES_LEFT" -eq 0 ] && [ "$NETWORKS_LEFT" -eq 0 ]; then
    echo ""
    log "✅ System is pristine. Ready for bootstrap."
    log "   Run: ./deploy/bootstrap/bootstrap.sh"
else
    echo ""
    warn "⚠️  Some resources could not be removed. You may need to run:"
    warn "   docker system prune -a --volumes"
fi

echo ""
