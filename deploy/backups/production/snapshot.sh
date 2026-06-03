#!/usr/bin/env bash
# =============================================================================
# LOYALLIA BACKUP — PRODUCTION FULL CLUSTER SNAPSHOT
# =============================================================================
# Thin wrapper around _snapshot_core from lib/common.sh.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"
source "$SCRIPT_DIR/../lib/common.sh"
source "$SCRIPT_DIR/../lib/encrypt.sh"

_snapshot_core "Production" "$PROJECT_ROOT/deploy/rewards.loyallia.com.conf"
