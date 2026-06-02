#!/usr/bin/env bash
# Development Backup Orchestrator
# Runs pg_dump + redis + vault backups into ./.agents/backups/
# Usage: ./orchestrator.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

run() {
    local script="$1"
    echo ""
    echo "════════════════════════════════════════════════════════════"
    echo "  Running: $(basename "$script")"
    echo "════════════════════════════════════════════════════════════"
    bash "$script" || echo "[dev-backup] WARNING: $script failed (continuing...)"
}

echo "════════════════════════════════════════════════════════════"
echo "  Loyallia — Development Backup Orchestrator"
echo "════════════════════════════════════════════════════════════"
echo "  Target: ./.agents/backups/"
echo ""

run "$SCRIPT_DIR/pg_dump.sh"
run "$SCRIPT_DIR/redis.sh"
run "$SCRIPT_DIR/vault.sh"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Development backup complete"
echo "════════════════════════════════════════════════════════════"
