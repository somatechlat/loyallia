#!/usr/bin/env bash
# =============================================================================
# LOYALLIA — Production Factory Reset
# =============================================================================
# Destroys ALL production Docker resources: containers, volumes, networks,
# and optionally built images. Requires domain confirmation and typing
# "DESTROY" to proceed.
#
# Usage:
#   ./deploy/factory_reset/production/factory_reset.sh --i-am-sure-production
# =============================================================================

set -euo pipefail

echo "=========================================="
echo "   LOYALLIA PRODUCTION FACTORY RESET"
echo "=========================================="
echo ""

# Detect production environment
IS_PROD=false
if [ -f .env ]; then
  if grep -qE '^DOMAIN=rewards\.loyallia\.com' .env 2>/dev/null; then
    IS_PROD=true
  fi
  if grep -qE '^COMPOSE_FILE=.*prod' .env 2>/dev/null; then
    IS_PROD=true
  fi
fi

# Production safety check
if [ "$IS_PROD" = true ]; then
  echo "WARNING: Production environment detected!"
  echo ""
  if [ "${1:-}" != "--i-am-sure-production" ]; then
    echo "This appears to be a PRODUCTION environment."
    echo "To proceed, you MUST pass the flag:"
    echo ""
    echo "  $0 --i-am-sure-production"
    echo ""
    exit 1
  fi
  echo "Flag --i-am-sure-production provided."
  echo ""

  # Require typing the domain name as confirmation
  echo "Type the production domain name to confirm:"
  read -rp "Domain: " domain_confirm
  if [ "$domain_confirm" != "rewards.loyallia.com" ]; then
    echo "Aborted. Domain name mismatch."
    exit 1
  fi
  echo ""
fi

# Require typing "DESTROY" as final confirmation
echo "=========================================="
echo "  Type DESTROY to proceed with factory"
echo "  reset of ALL production resources."
echo "=========================================="
read -rp "Confirmation: " confirm
if [ "$confirm" != "DESTROY" ]; then
  echo "Aborted. You did not type DESTROY."
  exit 1
fi

echo ""
echo "Destroying all production Docker resources..."
echo ""

# Destroy everything
docker compose -f docker-compose.yml -f docker-compose.prod.yml down --volumes --remove-orphans

# Remove all named volumes
echo ""
echo "Removing named volumes..."
volumes=(
  loyallia_postgres_data
  loyallia_postgres_replica_data
  loyallia_redis_data
  loyallia_minio_data
  loyallia_vault_data
  loyallia_vault_runtime
  loyallia_static_files
  loyallia_media_files
  loyallia_next_cache
  loyallia_prometheus_data
  loyallia_grafana_data
  loyallia_loki_data
  loyallia_alertmanager-data
  loyallia_sentinel-data
)
for vol in "${volumes[@]}"; do
  if docker volume inspect "$vol" >/dev/null 2>&1; then
    docker volume rm "$vol" || true
  fi
done

# Remove networks
echo ""
echo "Removing networks..."
networks=(
  loyallia_frontend-net
  loyallia_backend-net
  loyallia_monitoring-net
)
for net in "${networks[@]}"; do
  if docker network inspect "$net" >/dev/null 2>&1; then
    docker network rm "$net" || true
  fi
done

# Optional: remove built images with confirmation
echo ""
read -rp "Remove built Docker images too? (yes/no): " remove_images
if [ "$remove_images" = "yes" ]; then
  echo "Removing built images..."
  docker compose -f docker-compose.yml -f docker-compose.prod.yml images -q 2>/dev/null | while read -r img; do
    [ -n "$img" ] && docker rmi "$img" || true
  done || true
fi

echo ""
echo "=========================================="
echo "   PRODUCTION FACTORY RESET COMPLETE"
echo "=========================================="
echo ""
echo "Run ./deploy/bootstrap/bootstrap-production.sh to rebuild"
