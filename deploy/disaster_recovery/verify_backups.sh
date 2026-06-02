#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_BASE="${BACKUP_DIR:-/var/backups/loyallia}"
REPORT="$BACKUP_BASE/verification_report.txt"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[verify]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err() { echo -e "${RED}[error]${NC} $*" >&2; }

ERRORS=0
WARNINGS=0

check_backup() {
    local label="$1"
    local dir="$2"
    local pattern="$3"
    local max_age_hours="${4:-48}"

    local latest
    latest="$(find "$dir" -name "$pattern" -type f 2>/dev/null | sort | tail -1 || true)"

    if [ -z "$latest" ]; then
        echo "❌ $label: No backup found!" >> "$REPORT"
        ERRORS=$((ERRORS + 1))
        return 1
    fi

    if [ ! -s "$latest" ]; then
        echo "❌ $label: Backup file is empty!" >> "$REPORT"
        ERRORS=$((ERRORS + 1))
        return 1
    fi

    local size
    size="$(du -h "$latest" 2>/dev/null | cut -f1 || echo "unknown")"

    local file_mtime file_age
    if [[ "$OSTYPE" == "darwin"* ]]; then
        file_mtime="$(stat -f "%m" "$latest" 2>/dev/null || echo 0)"
    else
        file_mtime="$(stat -c "%Y" "$latest" 2>/dev/null || echo 0)"
    fi

    if [ "$file_mtime" -gt 0 ]; then
        local now
        now="$(date +%s)"
        file_age=$(( (now - file_mtime) / 3600 ))
    else
        file_age=0
    fi

    if [ "$file_age" -gt "$max_age_hours" ]; then
        echo "⚠️  $label: Backup is ${file_age}h old (max ${max_age_hours}h) — $latest ($size)" >> "$REPORT"
        WARNINGS=$((WARNINGS + 1))
    else
        echo "✅ $label: $latest ($size, ${file_age}h ago)" >> "$REPORT"
    fi
}

check_backup_dir_exists() {
    local label="$1"
    local dir="$2"

    if [ ! -d "$dir" ]; then
        echo "❌ $label: Directory does not exist: $dir" >> "$REPORT"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

main() {
    echo ""
    log "=== Backup Verification ==="
    log "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    log "Backup directory: $BACKUP_BASE"
    echo ""

    mkdir -p "$BACKUP_BASE/verify"

    cat > "$REPORT" << EOF
=== Loyallia Backup Verification Report ===
Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Host: $(hostname 2>/dev/null || echo "unknown")
Backup root: $BACKUP_BASE

EOF

    check_backup_dir_exists "Backup root" "$BACKUP_BASE"

    check_backup "PostgreSQL" "$BACKUP_BASE/pg" "loyallia_pg_*.dump.age" 30
    check_backup "Redis" "$BACKUP_BASE/redis" "loyallia_redis_*.rdb.gz.age" 30
    check_backup "MinIO" "$BACKUP_BASE/minio" "loyallia_minio_*.tar.gz.age" 30
    check_backup "Vault Secrets" "$BACKUP_BASE/vault" "loyallia_vault_secrets_*.json.age" 30
    check_backup "Vault Init" "$BACKUP_BASE/vault" "loyallia_vault_init_*.json.age" 72
    check_backup "Certificates" "$BACKUP_BASE/certs" "loyallia_certs_*.tar.gz.age" 72
    check_backup "Config" "$BACKUP_BASE/env" "loyallia_env_*.tar.gz.age" 72

    echo "" >> "$REPORT"

    if [ "$ERRORS" -gt 0 ]; then
        echo "❌ $ERRORS error(s) found!" >> "$REPORT"
    elif [ "$WARNINGS" -gt 0 ]; then
        echo "⚠️  OK with $WARNINGS warning(s)" >> "$REPORT"
    else
        echo "✅ All backups verified successfully" >> "$REPORT"
    fi

    echo "" >> "$REPORT"
    du -sh "$BACKUP_BASE" >> "$REPORT" 2>/dev/null || true

    cat "$REPORT"

    echo ""
    if [ "$ERRORS" -gt 0 ]; then
        err "Verification FAILED: $ERRORS error(s), $WARNINGS warning(s)"
        exit 1
    elif [ "$WARNINGS" -gt 0 ]; then
        warn "Verification PASSED with $WARNINGS warning(s)"
        exit 0
    else
        log "Verification PASSED"
        exit 0
    fi
}

main
