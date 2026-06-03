#!/usr/bin/env bash
# =============================================================================
# LOYALLIA BACKUP — COMMON UTILITIES
# =============================================================================
# Shared functions for ALL backup/restore scripts.
# NO environment logic. NO paths. Pure utilities only.
# =============================================================================

set -euo pipefail

# --- Colors ------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# --- Logging -----------------------------------------------------------------
log()   { echo -e "${GREEN}[backup]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $*"; }
err()   { echo -e "${RED}[error]${NC} $*" >&2; }
info()  { echo -e "${CYAN}[info]${NC} $*"; }
step()  {
    echo ""
    echo -e "${MAGENTA}════════════════════════════════════════════════════════════${NC}"
    echo -e "${MAGENTA}  $1${NC}"
    echo -e "${MAGENTA}════════════════════════════════════════════════════════════${NC}"
}

# --- Error handling ----------------------------------------------------------
die() {
    err "$1"
    exit 1
}

# --- Require command ---------------------------------------------------------
require_cmd() {
    if ! command -v "$1" &>/dev/null; then
        die "Required command not found: $1"
    fi
}

# --- Timestamp ---------------------------------------------------------------
timestamp() {
    date +"%Y%m%d_%H%M%S"
}

date_iso() {
    date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# --- Directory helpers -------------------------------------------------------
ensure_dir() {
    local dir="$1"
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir" || die "Cannot create directory: $dir"
    fi
}

# --- File age check (cross-platform) -----------------------------------------
file_age_hours() {
    local file="$1"
    if [ ! -f "$file" ]; then
        echo "9999"
        return
    fi
    local now file_ts
    now=$(date +%s)
    file_ts=$(stat -c %Y "$file" 2>/dev/null || stat -f %m "$file" 2>/dev/null)
    echo $(( (now - file_ts) / 3600 ))
}

# --- Spinner for long operations ---------------------------------------------
spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while ps -p "$pid" > /dev/null 2>&1; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# --- Trap cleanup ------------------------------------------------------------
setup_cleanup() {
    local cleanup_dir="${1:-}"
    cleanup() {
        if [ -n "${cleanup_dir:-}" ] && [ -d "$cleanup_dir" ]; then
            rm -rf "$cleanup_dir"
        fi
    }
    trap cleanup EXIT INT TERM
}
