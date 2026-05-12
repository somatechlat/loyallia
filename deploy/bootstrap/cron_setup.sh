#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_SCRIPT="$PROJECT_ROOT/deploy/disaster_recovery/backup.sh"
VERIFY_SCRIPT="$PROJECT_ROOT/deploy/disaster_recovery/verify_backups.sh"
CRON_LOG_DIR="/var/log/loyallia/backups"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[cron]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err() { echo -e "${RED}[error]${NC} $*" >&2; }

usage() {
    echo "Usage: $0 [production|testing]"
    echo ""
    echo "Modes:"
    echo "  production    Daily backups (default)"
    echo "  testing       Backups every 15 days"
    exit 0
}

install_cron() {
    local mode="$1"
    local cron_file="/etc/cron.d/loyallia-backups"
    local job_prefix=""

    local answer
    read -r -p "Install cron as root? Requires sudo. Continue? [y/N]: " answer
    if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
        log "Cron installation cancelled."
        log "To install manually, add to your crontab:"
        log "  crontab -e"
        generate_cron_entries "$mode"
        exit 0
    fi

    if [ ! -f "$BACKUP_SCRIPT" ]; then
        err "Backup script not found: $BACKUP_SCRIPT"
        err "Run bootstrap.sh first."
        exit 1
    fi

    mkdir -p "$CRON_LOG_DIR"

    local cron_content
    cron_content="$(generate_cron_entries "$mode")"

    echo "$cron_content" | sudo tee "$cron_file" >/dev/null

    sudo chmod 0644 "$cron_file"

    if command -v systemctl &>/dev/null; then
        sudo systemctl restart cron 2>/dev/null || sudo service cron restart 2>/dev/null || true
    fi

    log "Cron installed: $cron_file"
    echo ""
    echo "$cron_content"
}

generate_cron_entries() {
    local mode="$1"

    cat << EOF
# Loyallia Backups — Installed by cron_setup.sh
# Mode: ${mode}
# SHELL and PATH are set for cron environments
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

EOF

    if [ "$mode" = "production" ]; then
        cat << PROD
# Production: daily backups at 02:00
0 2 * * * root ${BACKUP_SCRIPT} >> ${CRON_LOG_DIR}/backup.log 2>&1

# Production: daily verification at 06:00
0 6 * * * root ${VERIFY_SCRIPT} >> ${CRON_LOG_DIR}/verify.log 2>&1

# Production: log rotation for backup logs (weekly)
0 0 * * 0 root logrotate -f /etc/logrotate.d/loyallia-backups 2>/dev/null || true
PROD
    else
        cat << TEST
# Testing: backups every 15 days at 03:00
0 3 */15 * * root ${BACKUP_SCRIPT} >> ${CRON_LOG_DIR}/backup.log 2>&1

# Testing: verification every 15 days at 06:00 (same days as backup)
0 6 */15 * * root ${VERIFY_SCRIPT} >> ${CRON_LOG_DIR}/verify.log 2>&1
TEST
    fi

    cat << FTR

# Additional: backup log cleanup (keep 90 days)
0 0 * * 0 root find ${CRON_LOG_DIR} -name "*.log" -mtime +90 -delete
FTR
}

install_logrotate() {
    local logrotate_file="/etc/logrotate.d/loyallia-backups"

    if [ ! -f "$logrotate_file" ] && command -v logrotate &>/dev/null; then
        sudo tee "$logrotate_file" >/dev/null << 'EOF'
/var/log/loyallia/backups/*.log {
    weekly
    rotate 12
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
}
EOF
        log "Logrotate config installed: $logrotate_file"
    fi
}

main() {
    local mode="${1:-production}"

    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║        LOYALLIA — BACKUP CRON INSTALLATION                    ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    if [ "$mode" != "production" ] && [ "$mode" != "testing" ]; then
        usage
    fi

    log "Mode: ${mode}"
    log "Backup script: ${BACKUP_SCRIPT}"
    log "Verify script: ${VERIFY_SCRIPT}"
    echo ""

    if [ ! -f "$BACKUP_SCRIPT" ]; then
        err "Backup script not found at: $BACKUP_SCRIPT"
        err "Run the full bootstrap first, or create deploy/disaster_recovery/backup.sh"
        exit 1
    fi

    install_cron "$mode"
    install_logrotate

    echo ""
    log "Cron setup complete."
    log "Backups will be written to: /var/backups/loyallia/"
    log "Logs will be written to: ${CRON_LOG_DIR}/"
    echo ""
    log "To verify: crontab -l | grep loyallia"

    if command -v systemctl &>/dev/null; then
        log "Cron service status: $(systemctl is-active cron 2>/dev/null || echo 'unknown')"
    fi
}

main "$@"
