#!/bin/bash
# =============================================================================
# Loyallia — Start for LAN / Mobile Development Testing
# =============================================================================
# Detects your LAN IP automatically and starts Loyallia with port bindings
# on all network interfaces so phones/tablets on the same WiFi can connect.
#
# Usage:
#   ./scripts/start-lan.sh              # Start all services
#   ./scripts/start-lan.sh --rebuild    # Rebuild web container first
#   ./scripts/start-lan.sh --logs       # Start and follow logs
#
# After starting, open on your phone:
#   http://YOUR_IP:33906
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Detect LAN IP
LAN_IP=""
if command -v ipconfig >/dev/null 2>&1; then
    LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
fi
if [ -z "$LAN_IP" ] && command -v hostname >/dev/null 2>&1; then
    LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
fi
if [ -z "$LAN_IP" ]; then
    echo "❌ Could not detect LAN IP automatically."
    echo "   Please set LAN_IP in your .env file and try again."
    exit 1
fi

export LAN_IP
export LAN_API_URL="http://${LAN_IP}:33905"
export LAN_APP_URL="http://${LAN_IP}:33906"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  Loyallia — LAN Development Mode                                 ║"
echo "╠══════════════════════════════════════════════════════════════════╣"
echo "║  Your LAN IP:  $LAN_IP                                          ║"
echo "║  Web (Next.js): $LAN_APP_URL                                     ║"
echo "║  API (Django):  $LAN_API_URL                                     ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Update .env with detected IP
if grep -q "^LAN_IP=" .env 2>/dev/null; then
    sed -i.bak "s|^LAN_IP=.*|LAN_IP=$LAN_IP|" .env && rm -f .env.bak
else
    echo "LAN_IP=$LAN_IP" >> .env
fi

if grep -q "^LAN_API_URL=" .env 2>/dev/null; then
    sed -i.bak "s|^LAN_API_URL=.*|LAN_API_URL=$LAN_API_URL|" .env && rm -f .env.bak
else
    echo "LAN_API_URL=$LAN_API_URL" >> .env
fi

if grep -q "^LAN_APP_URL=" .env 2>/dev/null; then
    sed -i.bak "s|^LAN_APP_URL=.*|LAN_APP_URL=$LAN_APP_URL|" .env && rm -f .env.bak
else
    echo "LAN_APP_URL=$LAN_APP_URL" >> .env
fi

COMPOSE_FLAGS="-f docker-compose.yml -f docker-compose.lan.yml"

# Handle arguments
if [[ "$1" == "--rebuild" ]]; then
    echo "🔨 Rebuilding web container..."
    docker compose $COMPOSE_FLAGS up -d --build web
elif [[ "$1" == "--logs" ]]; then
    echo "🚀 Starting Loyallia (with logs)..."
    docker compose $COMPOSE_FLAGS up -d
    echo ""
    echo "📱 Open on your phone: $LAN_APP_URL"
    echo ""
    docker compose $COMPOSE_FLAGS logs -f web api nginx
else
    echo "🚀 Starting Loyallia..."
    docker compose $COMPOSE_FLAGS up -d
fi

echo ""
echo "✅ Services started!"
echo ""
echo "📱 Phone/Tablet:  $LAN_APP_URL"
echo "💻 Local:         http://localhost:33906"
echo "🔧 API Local:     http://localhost:33905"
echo "🗄️  Admin:         http://localhost:33906/superadmin"
echo ""
echo "To stop:           docker compose -f docker-compose.yml -f docker-compose.lan.yml down"
echo "To see logs:       docker compose -f docker-compose.yml -f docker-compose.lan.yml logs -f"
echo ""
