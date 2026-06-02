#!/usr/bin/env bash
# =============================================================================
# LOYALLIA — BACKUP ADMINISTRATION CLI
# =============================================================================
# Production-grade tool for sysadmins to install, monitor, and manage
# automated backups via cron or systemd timers.
#
# Usage:
#   ./backup-admin.sh [command] [options]
#
# Commands:
#   install       Install backup scheduling (cron or systemd)
#   uninstall     Remove backup scheduling
#   status        Show backup status, last run, disk usage
#   run-now       Trigger immediate backup
#   verify-now    Trigger immediate verification
#   logs          Show recent backup/verify logs
#   health        Check if all backup prerequisites are met
#   test          Run the full development test suite
#
# Install options:
#   --method=cron|systemd   (default: cron)
#   --mode=production|dev   (default: production)
#   --yes                   Non-interactive (for automation)
#
# Examples:
#   ./backup-admin.sh install --method=systemd --mode=production --yes
#   ./backup-admin.sh status
#   ./backup-admin.sh run-now
# =============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BACKUP_SCRIPT="$PROJECT_ROOT/deploy/backups/backup.sh"
VERIFY_SCRIPT="$PROJECT_ROOT/deploy/backups/verify_backups.sh"
CRON_FILE="/etc/cron.d/loyallia-backups"

# Use local paths when running as non-root (development), system paths as root (production)
if [ "$EUID" -eq 0 ] || [ -w "/var/backups" ]; then
    LOG_DIR="/var/log/loyallia/backups"
    BACKUP_DIR="/var/backups/loyallia"
else
    LOG_DIR="$PROJECT_ROOT/.agents/backups/logs"
    BACKUP_DIR="$PROJECT_ROOT/.agents/backups/production"
fi

SYSTEMD_SERVICE="loyallia-backup.service"
SYSTEMD_TIMER="loyallia-backup.timer"
SYSTEMD_VERIFY_SERVICE="loyallia-verify.service"
SYSTEMD_VERIFY_TIMER="loyallia-verify.timer"
SYSTEMD_DIR="/etc/systemd/system"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()   { echo -e "${GREEN}[admin]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $*"; }
err()   { echo -e "${RED}[error]${NC} $*" >&2; }
info()  { echo -e "${CYAN}[info]${NC} $*"; }

usage() {
    cat << 'EOF'
Loyallia Backup Administration

Usage: backup-admin.sh <command> [options]

Commands:
  install       Install scheduled backups (cron or systemd)
  uninstall     Remove all scheduled backups
  status        Show backup status, disk usage, last runs
  run-now       Execute backup immediately
  verify-now    Execute verification immediately
  logs          Show recent log output
  health        Check prerequisites (Docker, containers, paths)
  test          Run development test suite

Install options:
  --method=cron|systemd    Scheduling method (default: cron)
  --mode=production|dev    Environment mode (default: production)
  --yes                    Skip confirmation prompts

Examples:
  backup-admin.sh install --method=systemd --mode=production --yes
  backup-admin.sh status
  backup-admin.sh run-now
  backup-admin.sh logs --tail=50
EOF
    exit 0
}

# ─── Argument parsing ───────────────────────────────────────────────────────
parse_args() {
    COMMAND=""
    METHOD="cron"
    MODE="production"
    YES=0
    TAIL_LINES=30

    for arg in "$@"; do
        case "$arg" in
            install|uninstall|status|run-now|verify-now|logs|health|test)
                COMMAND="$arg"
                ;;
            --method=cron|--method=systemd)
                METHOD="${arg#*=}"
                ;;
            --mode=production|--mode=dev|--mode=development)
                MODE="${arg#*=}"
                ;;
            --yes)
                YES=1
                ;;
            --tail=*)
                TAIL_LINES="${arg#*=}"
                ;;
            -h|--help)
                usage
                ;;
        esac
    done

    if [ -z "$COMMAND" ]; then
        usage
    fi
}

# ─── Health check ───────────────────────────────────────────────────────────
cmd_health() {
    echo ""
    echo "════════════════════════════════════════════════════════════"
    echo "  Backup Health Check"
    echo "════════════════════════════════════════════════════════════"
    echo ""

    local errors=0

    # Docker
    if docker info >/dev/null 2>&1; then
        log "Docker daemon: running"
    else
        err "Docker daemon: NOT RUNNING"
        errors=$((errors + 1))
    fi

    # Critical containers
    for svc in postgres redis vault minio; do
        if docker compose -f "$PROJECT_ROOT/docker-compose.yml" ps "$svc" 2>/dev/null | grep -q "Up"; then
            log "$svc: running"
        else
            err "$svc: NOT RUNNING"
            errors=$((errors + 1))
        fi
    done

    # Vault unsealed
    if curl -sk https://127.0.0.1:33908/v1/sys/health 2>/dev/null | grep -q '"sealed":false'; then
        log "Vault: unsealed"
    else
        warn "Vault: sealed or unreachable (port 33908)"
    fi

    # Backup paths
    if [ -d "$BACKUP_DIR" ]; then
        local size
        size="$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)"
        log "Backup directory: $BACKUP_DIR ($size)"
    else
        info "Backup directory: $BACKUP_DIR (will be created on first run)"
    fi

    # Scripts exist
    if [ -x "$BACKUP_SCRIPT" ]; then
        log "Backup script: $BACKUP_SCRIPT"
    else
        err "Backup script missing or not executable: $BACKUP_SCRIPT"
        errors=$((errors + 1))
    fi

    if [ -x "$VERIFY_SCRIPT" ]; then
        log "Verify script: $VERIFY_SCRIPT"
    else
        err "Verify script missing or not executable: $VERIFY_SCRIPT"
        errors=$((errors + 1))
    fi

    # age encryption
    if command -v age >/dev/null 2>&1; then
        log "age encryption: installed"
    else
        warn "age encryption: NOT installed — backups will be unencrypted"
    fi

    # Log directory
    if [ -d "$LOG_DIR" ]; then
        log "Log directory: $LOG_DIR"
    else
        info "Log directory: $LOG_DIR (will be created on install)"
    fi

    # Scheduling
    if [ -f "$CRON_FILE" ]; then
        log "Cron: installed ($CRON_FILE)"
    elif systemctl list-timers --all 2>/dev/null | grep -q "loyallia-backup"; then
        log "Systemd timer: installed"
    else
        warn "Scheduling: NOT installed — run 'install' command"
    fi

    echo ""
    if [ "$errors" -eq 0 ]; then
        log "Health check PASSED"
        return 0
    else
        err "Health check FAILED ($errors error(s))"
        return 1
    fi
}

# ─── Status ─────────────────────────────────────────────────────────────────
cmd_status() {
    echo ""
    echo "════════════════════════════════════════════════════════════"
    echo "  Backup Status"
    echo "════════════════════════════════════════════════════════════"
    echo ""

    # Scheduling
    echo "--- Scheduling ---"
    if [ -f "$CRON_FILE" ]; then
        info "Cron: $CRON_FILE"
        grep -E "^[0-9]" "$CRON_FILE" 2>/dev/null | while read -r line; do
            echo "  $line"
        done
    elif systemctl is-enabled loyallia-backup.timer >/dev/null 2>&1; then
        info "Systemd timer: enabled"
        systemctl list-timers --all 2>/dev/null | grep -E "loyallia-(backup|verify)" || true
    else
        warn "No scheduling installed"
    fi

    # Last backup
    echo ""
    echo "--- Last Backup ---"
    if [ -d "$BACKUP_DIR" ]; then
        local latest_manifest
        latest_manifest="$(find "$BACKUP_DIR/verify" -name "loyallia_manifest_*.json" -type f 2>/dev/null | sort | tail -1 || true)"
        if [ -n "$latest_manifest" ]; then
            local ts
            ts="$(basename "$latest_manifest" | sed 's/loyallia_manifest_//;s/\.json//')"
            info "Last backup: $ts"
            if command -v python3 >/dev/null 2>&1; then
                python3 -c "
import json
with open('$latest_manifest') as f:
    d = json.load(f)
print(f'  Files: {len(d.get(\"files\", []))}')
for f in d.get('files', [])[:5]:
    print(f'  - {f[\"name\"]} ({f[\"size\"]} bytes)')
" 2>/dev/null || true
            fi
        else
            warn "No backup manifest found"
        fi

        # Disk usage
        echo ""
        echo "--- Disk Usage ---"
        du -sh "$BACKUP_DIR" 2>/dev/null || echo "  (empty)"
        for subdir in pg redis minio vault certs env verify; do
            if [ -d "$BACKUP_DIR/$subdir" ]; then
                local sz
                sz="$(du -sh "$BACKUP_DIR/$subdir" 2>/dev/null | cut -f1)"
                echo "  $subdir: $sz"
            fi
        done
    else
        warn "Backup directory does not exist: $BACKUP_DIR"
    fi

    # Last verify report
    echo ""
    echo "--- Last Verification ---"
    if [ -f "$BACKUP_DIR/verification_report.txt" ]; then
        local mtime age_hours
        mtime="$(stat -c %Y "$BACKUP_DIR/verification_report.txt" 2>/dev/null || stat -f %m "$BACKUP_DIR/verification_report.txt" 2>/dev/null || echo 0)"
        age_hours=$(( ($(date +%s) - mtime) / 3600 ))
        info "Report: $BACKUP_DIR/verification_report.txt (${age_hours}h ago)"
        grep -E "^(✅|❌|⚠️)" "$BACKUP_DIR/verification_report.txt" 2>/dev/null | head -10 || true
    else
        warn "No verification report found"
    fi

    # Log snippets
    echo ""
    echo "--- Recent Log Activity ---"
    if [ -f "$LOG_DIR/backup.log" ]; then
        local log_mtime log_age
        log_mtime="$(stat -c %Y "$LOG_DIR/backup.log" 2>/dev/null || stat -f %m "$LOG_DIR/backup.log" 2>/dev/null || echo 0)"
        log_age=$(( ($(date +%s) - log_mtime) / 3600 ))
        info "backup.log: ${log_age}h ago"
        tail -3 "$LOG_DIR/backup.log" 2>/dev/null | sed 's/^/  /' || true
    else
        warn "No backup.log"
    fi

    echo ""
}

# ─── Run now ────────────────────────────────────────────────────────────────
cmd_run_now() {
    log "Starting immediate backup..."
    if [ ! -x "$BACKUP_SCRIPT" ]; then
        err "Backup script not found: $BACKUP_SCRIPT"
        exit 1
    fi
    mkdir -p "$LOG_DIR"
    export BACKUP_DIR LOG_DIR
    # Auto-detect dev mode for local testing
    if [ "$EUID" -ne 0 ] && [ ! -w "/var/backups" ]; then
        export POSTGRES_DB=loyallia_dev
        export VAULT_SECRET_PATH=loyallia/development
    fi
    bash "$BACKUP_SCRIPT" 2>&1 | tee -a "$LOG_DIR/backup.log"
    local exit_code=${PIPESTATUS[0]}
    if [ "$exit_code" -eq 0 ]; then
        log "Backup completed successfully"
    else
        err "Backup exited with code $exit_code"
    fi
    return "$exit_code"
}

# ─── Verify now ─────────────────────────────────────────────────────────────
cmd_verify_now() {
    log "Starting immediate verification..."
    if [ ! -x "$VERIFY_SCRIPT" ]; then
        err "Verify script not found: $VERIFY_SCRIPT"
        exit 1
    fi
    mkdir -p "$LOG_DIR"
    export BACKUP_DIR LOG_DIR
    if [ "$EUID" -ne 0 ] && [ ! -w "/var/backups" ]; then
        export POSTGRES_DB=loyallia_dev
        export VAULT_SECRET_PATH=loyallia/development
    fi
    bash "$VERIFY_SCRIPT" 2>&1 | tee -a "$LOG_DIR/verify.log"
    local exit_code=${PIPESTATUS[0]}
    return "$exit_code"
}

# ─── Logs ───────────────────────────────────────────────────────────────────
cmd_logs() {
    echo ""
    if [ -f "$LOG_DIR/backup.log" ]; then
        info "=== Backup Log (last $TAIL_LINES lines) ==="
        tail -n "$TAIL_LINES" "$LOG_DIR/backup.log" 2>/dev/null || true
    else
        warn "No backup.log found"
    fi

    echo ""
    if [ -f "$LOG_DIR/verify.log" ]; then
        info "=== Verify Log (last $TAIL_LINES lines) ==="
        tail -n "$TAIL_LINES" "$LOG_DIR/verify.log" 2>/dev/null || true
    else
        warn "No verify.log found"
    fi
    echo ""
}

# ─── Install cron ───────────────────────────────────────────────────────────
install_cron() {
    local mode="$1"

    if [ "$YES" -eq 0 ]; then
        local answer
        read -r -p "Install cron jobs as root? [y/N]: " answer
        if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
            log "Installation cancelled."
            exit 0
        fi
    fi

    if [ "$EUID" -ne 0 ] && ! sudo -n true 2>/dev/null; then
        err "Root or passwordless sudo required to install cron jobs."
        exit 1
    fi

    mkdir -p "$LOG_DIR"

    local cron_content
    cron_content="$(generate_cron_entries "$mode")"

    if [ "$EUID" -eq 0 ]; then
        echo "$cron_content" > "$CRON_FILE"
        chmod 0644 "$CRON_FILE"
    else
        echo "$cron_content" | sudo tee "$CRON_FILE" >/dev/null
        sudo chmod 0644 "$CRON_FILE"
    fi

    # Restart cron service
    if command -v systemctl &>/dev/null; then
        if [ "$EUID" -eq 0 ]; then
            systemctl restart cron 2>/dev/null || service cron restart 2>/dev/null || true
        else
            sudo systemctl restart cron 2>/dev/null || sudo service cron restart 2>/dev/null || true
        fi
    fi

    log "Cron installed: $CRON_FILE"
    echo ""
    echo "$cron_content"
    echo ""

    # Install logrotate
    install_logrotate
}

generate_cron_entries() {
    local mode="$1"
    cat << EOF
# Loyallia Backup Schedule — $(date -u +%Y-%m-%dT%H:%M:%SZ)
# Mode: $mode
# Managed by: deploy/backups/admin/backup-admin.sh
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

EOF

    if [ "$mode" = "production" ]; then
        cat << PROD
# Daily backup at 02:00
0 2 * * * root $BACKUP_SCRIPT >> $LOG_DIR/backup.log 2>&1

# Daily verification at 06:00
0 6 * * * root $VERIFY_SCRIPT >> $LOG_DIR/verify.log 2>&1

# Weekly log rotation
0 0 * * 0 root logrotate -f /etc/logrotate.d/loyallia-backups 2>/dev/null || true
PROD
    else
        cat << DEV
# Dev: backup every 6 hours
0 */6 * * * root $BACKUP_SCRIPT >> $LOG_DIR/backup.log 2>&1

# Dev: verification every 6 hours
0 */6 * * * root $VERIFY_SCRIPT >> $LOG_DIR/verify.log 2>&1
DEV
    fi

    cat << FTR

# Cleanup old logs (90 days)
0 0 * * 0 root find $LOG_DIR -name "*.log" -mtime +90 -delete
FTR
}

install_logrotate() {
    local lr_file="/etc/logrotate.d/loyallia-backups"
    if command -v logrotate &>/dev/null; then
        local lr_content
        lr_content="$LOG_DIR/*.log {
    weekly
    rotate 12
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
}"
        if [ "$EUID" -eq 0 ]; then
            echo "$lr_content" > "$lr_file"
        else
            echo "$lr_content" | sudo tee "$lr_file" >/dev/null
        fi
        log "Logrotate installed: $lr_file"
    fi
}

# ─── Install systemd ────────────────────────────────────────────────────────
install_systemd() {
    local mode="$1"

    if [ "$YES" -eq 0 ]; then
        local answer
        read -r -p "Install systemd timers as root? [y/N]: " answer
        if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
            log "Installation cancelled."
            exit 0
        fi
    fi

    if [ "$EUID" -ne 0 ] && ! sudo -n true 2>/dev/null; then
        err "Root or passwordless sudo required to install systemd units."
        exit 1
    fi

    mkdir -p "$LOG_DIR"

    local backup_on_calendar verify_on_calendar
    if [ "$mode" = "production" ]; then
        backup_on_calendar="*-*-* 02:00:00"
        verify_on_calendar="*-*-* 06:00:00"
    else
        backup_on_calendar="*-*-* *:00:00"
        verify_on_calendar="*-*-* */6:00:00"
    fi

    # Write service files
    write_systemd_file "$SYSTEMD_SERVICE" "$(generate_systemd_service "$BACKUP_SCRIPT" "backup.log")"
    write_systemd_file "$SYSTEMD_TIMER" "$(generate_systemd_timer "$backup_on_calendar" "$SYSTEMD_SERVICE")"
    write_systemd_file "$SYSTEMD_VERIFY_SERVICE" "$(generate_systemd_service "$VERIFY_SCRIPT" "verify.log")"
    write_systemd_file "$SYSTEMD_VERIFY_TIMER" "$(generate_systemd_timer "$verify_on_calendar" "$SYSTEMD_VERIFY_SERVICE")"

    # Enable and start
    local systemctl_cmd
    if [ "$EUID" -eq 0 ]; then
        systemctl_cmd="systemctl"
    else
        systemctl_cmd="sudo systemctl"
    fi

    $systemctl_cmd daemon-reload
    $systemctl_cmd enable --now "$SYSTEMD_TIMER"
    $systemctl_cmd enable --now "$SYSTEMD_VERIFY_TIMER"

    log "Systemd timers installed:"
    $systemctl_cmd list-timers --all | grep -E "loyallia-(backup|verify)" || true

    install_logrotate
}

write_systemd_file() {
    local filename="$1"
    local content="$2"
    if [ "$EUID" -eq 0 ]; then
        echo "$content" > "$SYSTEMD_DIR/$filename"
    else
        echo "$content" | sudo tee "$SYSTEMD_DIR/$filename" >/dev/null
    fi
}

generate_systemd_service() {
    local script="$1"
    local logfile="$2"
    cat << EOF
[Unit]
Description=Loyallia Backup Service
After=docker.service

[Service]
Type=oneshot
ExecStart=/bin/bash -c '${script} >> ${LOG_DIR}/${logfile} 2>&1'
User=root
StandardOutput=journal
StandardError=journal
EOF
}

generate_systemd_timer() {
    local on_calendar="$1"
    local service="$2"
    cat << EOF
[Unit]
Description=Loyallia Backup Timer

[Timer]
OnCalendar=$on_calendar
Persistent=true

[Install]
WantedBy=timers.target
EOF
}

# ─── Uninstall ──────────────────────────────────────────────────────────────
cmd_uninstall() {
    if [ "$YES" -eq 0 ]; then
        local answer
        read -r -p "Remove ALL backup scheduling? [y/N]: " answer
        if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
            log "Uninstall cancelled."
            exit 0
        fi
    fi

    local needs_reload=0

    # Remove cron
    if [ -f "$CRON_FILE" ]; then
        if [ "$EUID" -eq 0 ]; then
            rm -f "$CRON_FILE"
        else
            sudo rm -f "$CRON_FILE"
        fi
        log "Removed cron: $CRON_FILE"
    fi

    # Remove systemd
    for unit in "$SYSTEMD_TIMER" "$SYSTEMD_VERIFY_TIMER" "$SYSTEMD_SERVICE" "$SYSTEMD_VERIFY_SERVICE"; do
        if [ -f "$SYSTEMD_DIR/$unit" ]; then
            if [ "$EUID" -eq 0 ]; then
                systemctl disable --now "$unit" 2>/dev/null || true
                rm -f "$SYSTEMD_DIR/$unit"
            else
                sudo systemctl disable --now "$unit" 2>/dev/null || true
                sudo rm -f "$SYSTEMD_DIR/$unit"
            fi
            needs_reload=1
            log "Removed systemd unit: $unit"
        fi
    done

    if [ "$needs_reload" -eq 1 ]; then
        if [ "$EUID" -eq 0 ]; then
            systemctl daemon-reload
        else
            sudo systemctl daemon-reload
        fi
    fi

    log "Uninstall complete. Backup data in $BACKUP_DIR was NOT removed."
}

# ─── Test ───────────────────────────────────────────────────────────────────
cmd_test() {
    log "Running development test suite..."
    bash "$PROJECT_ROOT/deploy/backups/development/test_backups.sh"
}

# ─── Main dispatcher ────────────────────────────────────────────────────────
main() {
    parse_args "$@"

    case "$COMMAND" in
        health)
            cmd_health
            ;;
        status)
            cmd_status
            ;;
        run-now)
            cmd_run_now
            ;;
        verify-now)
            cmd_verify_now
            ;;
        logs)
            cmd_logs
            ;;
        install)
            if [ "$METHOD" = "systemd" ]; then
                install_systemd "$MODE"
            else
                install_cron "$MODE"
            fi
            ;;
        uninstall)
            cmd_uninstall
            ;;
        test)
            cmd_test
            ;;
        *)
            usage
            ;;
    esac
}

main "$@"
