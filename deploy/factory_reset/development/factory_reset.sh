#!/usr/bin/env bash
# =============================================================================
# LOYALLIA — Development Factory Reset
# =============================================================================
# Destroys ALL development Docker resources: containers, volumes, networks.
# Requires typing "DESTROY" to proceed.
#
# Usage:
#   ./deploy/factory_reset/development/factory_reset.sh
# =============================================================================

set -euo pipefail

echo "=========================================="
echo "   LOYALLIA DEVELOPMENT FACTORY RESET"
echo "=========================================="
echo ""

# List all containers that will be destroyed
echo "--- Containers that will be destroyed ---"
docker compose -f docker-compose.yml ps -aq 2>/dev/null | while read -r cid; do
  [ -n "$cid" ] && docker inspect --format '  {{.Name}} ({{.Id}})' "$cid"
done || true
if [ -z "$(docker compose -f docker-compose.yml ps -aq 2>/dev/null || true)" ]; then
  echo "  (none)"
fi
echo ""

# List all volumes that will be destroyed
echo "--- Volumes that will be destroyed ---"
docker compose -f docker-compose.yml config --volumes 2>/dev/null | while read -r vol; do
  [ -n "$vol" ] && echo "  $vol"
done || true
# Also list dangling volumes with loyallia in name
volumes_to_remove=$(docker volume ls -q -f dangling=true 2>/dev/null | grep loyallia || true)
if [ -n "$volumes_to_remove" ]; then
  echo "$volumes_to_remove" | while read -r vol; do
    echo "  $vol (dangling)"
  done
fi
if [ -z "$(docker compose -f docker-compose.yml config --volumes 2>/dev/null || true)" ] && [ -z "$volumes_to_remove" ]; then
  echo "  (none)"
fi
echo ""

# List all networks that will be destroyed
echo "--- Networks that will be destroyed ---"
docker compose -f docker-compose.yml config --format json 2>/dev/null | \
  python3 -c "import sys,json; d=json.load(sys.stdin); nets=d.get('networks',{}); [print(f'  {n}') for n in nets]" 2>/dev/null || \
  docker compose -f docker-compose.yml config 2>/dev/null | grep -E '^  [a-zA-Z0-9_-]+:' | sed 's/^/  /' || true
# Also list dangling networks with loyallia in name
networks_to_remove=$(docker network ls -q -f dangling=true 2>/dev/null | while read -r nid; do
  [ -n "$nid" ] && docker inspect --format '{{.Name}}' "$nid" 2>/dev/null | grep loyallia || true
done || true)
if [ -n "$networks_to_remove" ]; then
  echo "$networks_to_remove" | while read -r net; do
    echo "  $net (dangling)"
  done
fi
if [ -z "$(docker compose -f docker-compose.yml config --format json 2>/dev/null || true)" ] && [ -z "$networks_to_remove" ]; then
  echo "  (none)"
fi
echo ""

# Require typing "DESTROY" to proceed
echo "=========================================="
echo "  Type DESTROY to proceed with factory"
echo "  reset of ALL development resources."
echo "=========================================="
read -rp "Confirmation: " confirm
if [ "$confirm" != "DESTROY" ]; then
  echo "Aborted. You did not type DESTROY."
  exit 1
fi

echo ""
echo "Destroying all development Docker resources..."
echo ""

# Destroy everything
docker compose -f docker-compose.yml down --volumes --remove-orphans

# Remove any dangling volumes with loyallia in the name
echo ""
echo "Removing dangling volumes with 'loyallia' in name..."
docker volume ls -q -f dangling=true 2>/dev/null | grep loyallia | while read -r vol; do
  [ -n "$vol" ] && docker volume rm "$vol" || true
done || true

# Remove any dangling networks with loyallia in the name
echo ""
echo "Removing dangling networks with 'loyallia' in name..."
docker network ls -q -f dangling=true 2>/dev/null | while read -r nid; do
  if [ -n "$nid" ]; then
    name=$(docker inspect --format '{{.Name}}' "$nid" 2>/dev/null || true)
    if echo "$name" | grep -q loyallia; then
      docker network rm "$nid" || true
    fi
  fi
done || true

echo ""
echo "=========================================="
echo "   DEVELOPMENT FACTORY RESET COMPLETE"
echo "=========================================="
echo ""
echo "Run ./deploy/bootstrap/bootstrap-development.sh to rebuild"
