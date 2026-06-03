#!/usr/bin/env bash
# =============================================================================
# LOYALLIA BACKUP — Development Orchestrator
# =============================================================================
# Runs pg_dump, Redis, and Vault backup scripts sequentially.
# Output goes to ./.agents/backups/ (hardcoded for development).
#
# Usage:
#   ./deploy/backups/development/orchestrator.sh
# =============================================================================

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
