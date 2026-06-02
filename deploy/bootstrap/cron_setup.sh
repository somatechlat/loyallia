#!/usr/bin/env bash
# =============================================================================
# LOYALLIA — BACKUP CRON INSTALLER (Legacy wrapper)
# =============================================================================
# This script is kept for backward compatibility.
# The new recommended entry point is:
#   deploy/backups/admin/backup-admin.sh install
#
# Usage:
#   sudo ./cron_setup.sh production    # Production daily backups
#   sudo ./cron_setup.sh testing       # Testing every 15 days
#   sudo ./cron_setup.sh --yes         # Non-interactive install
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADMIN_SCRIPT="$SCRIPT_DIR/../backups/admin/backup-admin.sh"

if [ ! -x "$ADMIN_SCRIPT" ]; then
    echo "ERROR: backup-admin.sh not found at $ADMIN_SCRIPT"
    exit 1
fi

mode="${1:-production}"
yes_flag=""

if [ "$mode" = "--yes" ]; then
    yes_flag="--yes"
    mode="production"
fi

# Delegate to the new admin CLI
exec bash "$ADMIN_SCRIPT" install --method=cron --mode="$mode" $yes_flag
