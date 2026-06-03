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

# --- Find latest backup file -------------------------------------------------
find_latest_backup() {
    local dir="$1"
    local pattern="${2:-*.age}"
    local latest=""

    for f in "$dir"/$pattern; do
        [ -e "$f" ] || continue
        if [ -z "$latest" ] || [ "$f" -nt "$latest" ]; then
            latest="$f"
        fi
    done
    echo "$latest"
}

# --- Interactive restore confirmation ----------------------------------------
confirm_restore() {
    local warning_message="$1"
    if [ "${FORCE:-0}" -eq 0 ]; then
        echo ""
        warn "$warning_message"
        read -r -p "Type 'RESTORE' to confirm: " confirm
        if [ "$confirm" != "RESTORE" ]; then
            die "Restore aborted."
        fi
    fi
}

# --- Verify a backup component -----------------------------------------------
verify_component() {
    local name="$1"
    local dir="$2"
    local pattern="$3"

    local latest
    latest=$(find_latest_backup "$dir" "$pattern")

    if [ -z "$latest" ]; then
        err "$name: No encrypted backup found"
        return 1
    fi

    if [ ! -s "$latest" ]; then
        err "$name: Backup file is empty: $(basename "$latest")"
        return 1
    fi

    local age_hours
    age_hours=$(file_age_hours "$latest")
    if [ "$age_hours" -gt 25 ]; then
        err "$name: Backup too old (${age_hours}h): $(basename "$latest")"
        return 1
    fi

    log "$name: OK ($(basename "$latest"), ${age_hours}h old)"
    return 0
}

# --- Snapshot core logic (shared between dev/prod) ---------------------------
_snapshot_core() {
    local label="$1"
    shift
    local extra_configs=("$@")

    require_cmd docker
    require_cmd tar

    if ! docker info >/dev/null 2>&1; then
        die "Docker daemon is not running"
    fi

    local ts
    ts=$(timestamp)
    local snapshot_dir="$BACKUP_DIR/snapshot"
    local work_dir="$TEMP_DIR/snapshot_$ts"
    local out_file="$snapshot_dir/loyallia_snapshot_$ts.tar.gz"
    local encrypted_file="$out_file.age"

    ensure_dir "$snapshot_dir"
    ensure_dir "$work_dir"
    setup_cleanup "$work_dir"

    step "$label Snapshot — $ts"

    # Docker Compose config
    info "Saving Docker Compose config..."
    $COMPOSE_CMD config > "$work_dir/docker-compose-config.yml" 2>/dev/null || warn "Could not dump compose config"

    # Container metadata
    info "Saving container metadata..."
    mkdir -p "$work_dir/containers"
    while IFS= read -r cid; do
        [ -z "$cid" ] && continue
        local cname
        cname="$(docker inspect -f '{{.Name}}' "$cid" | sed 's|^/||')"
        docker inspect "$cid" > "$work_dir/containers/${cname}.json" 2>/dev/null || warn "inspect failed for $cname"
    done < <(docker ps -q)

    # Volumes
    info "Copying Docker volume contents..."
    mkdir -p "$work_dir/volumes"
    while IFS= read -r vol; do
        [ -z "$vol" ] && continue
        case "$vol" in
            *"buildx"*|*"_tmp"*) continue ;;
        esac
        local safe_name
        safe_name="$(echo "$vol" | tr '/:' '_')"
        mkdir -p "$work_dir/volumes/$safe_name"
        docker run --rm -v "$vol:/src:ro" -v "$work_dir/volumes/$safe_name:/dst" alpine \
            sh -c 'cp -a /src/. /dst/ 2>/dev/null || true' 2>/dev/null || warn "Volume copy failed: $vol"
    done < <(docker volume ls -q)

    # Networks
    info "Saving Docker network configs..."
    mkdir -p "$work_dir/networks"
    while IFS= read -r netid; do
        [ -z "$netid" ] && continue
        local netname
        netname="$(docker network inspect -f '{{.Name}}' "$netid")"
        docker network inspect "$netid" > "$work_dir/networks/${netname}.json" 2>/dev/null || warn "network inspect failed: $netname"
    done < <(docker network ls -q)

    # Host configs
    info "Saving host configurations..."
    mkdir -p "$work_dir/host_configs"
    for cfg in "$PROJECT_ROOT/.env" "$PROJECT_ROOT/deploy/nginx.conf" "${extra_configs[@]}"; do
        if [ -f "$cfg" ]; then
            cp "$cfg" "$work_dir/host_configs/" 2>/dev/null || warn "Could not copy $cfg"
        fi
    done
    if [ -d "$PROJECT_ROOT/certs" ]; then
        cp -r "$PROJECT_ROOT/certs" "$work_dir/host_configs/" 2>/dev/null || warn "Could not copy certs dir"
    fi

    # Runtime files
    info "Saving runtime files..."
    mkdir -p "$work_dir/runtime"
    if [ -d "/run/loyallia-vault" ]; then
        cp -a /run/loyallia-vault/. "$work_dir/runtime/" 2>/dev/null || warn "Could not copy /run/loyallia-vault"
    else
        local vault_cid
        vault_cid="$(docker ps -q --filter 'name=vault' 2>/dev/null | head -1)"
        if [ -n "$vault_cid" ]; then
            docker cp "$vault_cid:/run/loyallia-vault/." "$work_dir/runtime/" 2>/dev/null || warn "Could not copy from vault container"
        fi
    fi

    # Create tarball
    info "Creating tarball..."
    tar -czf "$out_file" -C "$work_dir" . || die "Tarball creation failed"

    # Encrypt
    info "Encrypting snapshot..."
    encrypt_file "$out_file" "$encrypted_file"
    rm -f "$out_file"

    # Done
    log "Snapshot created: $encrypted_file"
    ls -lh "$encrypted_file"
}

# --- Restore snapshot core logic (shared between dev/prod) -------------------
_restore_snapshot_core() {
    local label="$1"
    local snapshot_file="${2:-}"
    shift 2
    local extra_configs=("$@")

    require_cmd docker
    require_cmd tar

    local snapshot_dir="$BACKUP_DIR/snapshot"
    ensure_dir "$snapshot_dir"

    if [ -z "$snapshot_file" ]; then
        snapshot_file="$(ls -t "$snapshot_dir"/loyallia_snapshot_*.tar.gz.age 2>/dev/null | head -1)"
    fi

    if [ -z "$snapshot_file" ] || [ ! -f "$snapshot_file" ]; then
        die "No snapshot found in $snapshot_dir"
    fi

    log "Restoring from: $snapshot_file"

    local ts
    ts=$(timestamp)
    local work_dir="$TEMP_DIR/restore_$ts"
    local tarball="$work_dir/snapshot.tar.gz"

    ensure_dir "$work_dir"
    setup_cleanup "$work_dir"

    info "Decrypting snapshot..."
    decrypt_file "$snapshot_file" "$tarball"

    info "Extracting tarball..."
    local extract_dir="$work_dir/extracted"
    ensure_dir "$extract_dir"
    tar -xzf "$tarball" -C "$extract_dir"

    # Stop containers
    step "Stopping running containers..."
    $COMPOSE_CMD down || warn "Compose down had issues (continuing)"

    # Restore volumes
    step "Restoring Docker volumes..."
    if [ -d "$extract_dir/volumes" ]; then
        for vol_dir in "$extract_dir/volumes"/*; do
            [ -e "$vol_dir" ] || continue
            local vol_name
            vol_name="$(basename "$vol_dir")"
            docker volume inspect "$vol_name" >/dev/null 2>&1 || docker volume create "$vol_name" >/dev/null 2>&1
            docker run --rm -v "$vol_name:/dst" -v "$vol_dir:/src:ro" alpine \
                sh -c 'rm -rf /dst/* 2>/dev/null; cp -a /src/. /dst/ 2>/dev/null || true' 2>/dev/null || warn "Volume restore failed: $vol_name"
            log "Restored volume: $vol_name"
        done
    fi

    # Restore host configs
    step "Restoring host configurations..."
    if [ -d "$extract_dir/host_configs" ]; then
        for f in "$extract_dir/host_configs"/*; do
            [ -e "$f" ] || continue
            local fname
            fname="$(basename "$f")"
            case "$fname" in
                .env)
                    cp "$f" "$PROJECT_ROOT/.env" 2>/dev/null && log "Restored .env" || warn "Could not restore .env"
                    ;;
                nginx.conf)
                    cp "$f" "$PROJECT_ROOT/deploy/nginx.conf" 2>/dev/null && log "Restored nginx.conf" || warn "Could not restore nginx.conf"
                    ;;
                certs)
                    if [ -d "$f" ]; then
                        rm -rf "$PROJECT_ROOT/certs"
                        cp -r "$f" "$PROJECT_ROOT/certs" 2>/dev/null && log "Restored certs" || warn "Could not restore certs"
                    fi
                    ;;
                *)
                    local dest="$PROJECT_ROOT/deploy/$fname"
                    local copied=0
                    for cfg in "${extra_configs[@]}"; do
                        if [ "$(basename "$cfg")" = "$fname" ]; then
                            dest="$cfg"
                            break
                        fi
                    done
                    cp "$f" "$dest" 2>/dev/null && log "Restored $fname" || warn "Could not restore $fname"
                    ;;
            esac
        done
    fi

    # Restore runtime files
    step "Restoring runtime files..."
    if [ -d "$extract_dir/runtime" ]; then
        if [ -d "/run/loyallia-vault" ]; then
            cp -a "$extract_dir/runtime/." /run/loyallia-vault/ 2>/dev/null && log "Restored /run/loyallia-vault" || warn "Could not restore runtime files"
        else
            local vault_cid
            vault_cid="$(docker ps -q --filter 'name=vault' 2>/dev/null | head -1)"
            if [ -n "$vault_cid" ]; then
                docker cp "$extract_dir/runtime/." "$vault_cid:/run/loyallia-vault/" 2>/dev/null && log "Restored vault runtime" || warn "Could not restore vault runtime"
            fi
        fi
    fi

    # Start containers
    step "Starting containers..."
    $COMPOSE_CMD up -d || die "Failed to start containers"
}
