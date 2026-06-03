#!/usr/bin/env bash
# =============================================================================
# LOYALLIA BACKUP — DEVELOPMENT SNAPSHOT RESTORE
# =============================================================================
# Finds the latest encrypted snapshot, decrypts it, stops containers,
# restores volumes, configs, runtime files, then restarts the stack.
#
# Usage: ./restore-snapshot.sh [specific_snapshot_file.age]
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"
source "$SCRIPT_DIR/../lib/common.sh"
source "$SCRIPT_DIR/../lib/encrypt.sh"

# --- Pre-flight checks -------------------------------------------------------
require_cmd docker
require_cmd tar

# --- Find snapshot -----------------------------------------------------------
SNAPSHOT_DIR="$BACKUP_DIR/snapshot"
ensure_dir "$SNAPSHOT_DIR"

if [ "${1:-}" != "" ]; then
    SNAPSHOT_FILE="$1"
else
    SNAPSHOT_FILE="$(ls -t "$SNAPSHOT_DIR"/loyallia_snapshot_*.tar.gz.age 2>/dev/null | head -1)"
fi

if [ -z "$SNAPSHOT_FILE" ] || [ ! -f "$SNAPSHOT_FILE" ]; then
    die "No snapshot found in $SNAPSHOT_DIR"
fi

log "Restoring from: $SNAPSHOT_FILE"

# --- Decrypt -----------------------------------------------------------------
TS="$(timestamp)"
WORK_DIR="$TEMP_DIR/restore_$TS"
TARBALL="$WORK_DIR/snapshot.tar.gz"

ensure_dir "$WORK_DIR"
setup_cleanup "$WORK_DIR"

info "Decrypting snapshot..."
decrypt_file "$SNAPSHOT_FILE" "$TARBALL"

# --- Extract -----------------------------------------------------------------
info "Extracting tarball..."
EXTRACT_DIR="$WORK_DIR/extracted"
ensure_dir "$EXTRACT_DIR"
tar -xzf "$TARBALL" -C "$EXTRACT_DIR"

# --- Stop containers ---------------------------------------------------------
step "Stopping running containers..."
$COMPOSE_CMD down || warn "Compose down had issues (continuing)"

# --- Restore volumes ---------------------------------------------------------
step "Restoring Docker volumes..."
if [ -d "$EXTRACT_DIR/volumes" ]; then
    for vol_dir in "$EXTRACT_DIR/volumes"/*; do
        [ -e "$vol_dir" ] || continue
        vol_name="$(basename "$vol_dir")"
        # Attempt to map safe_name back to original volume name if possible,
        # otherwise create/restore using the extracted name directly.
        docker volume inspect "$vol_name" >/dev/null 2>&1 || docker volume create "$vol_name" >/dev/null 2>&1
        docker run --rm -v "$vol_name:/dst" -v "$vol_dir:/src:ro" alpine \
            sh -c 'rm -rf /dst/* 2>/dev/null; cp -a /src/. /dst/ 2>/dev/null || true' 2>/dev/null || warn "Volume restore failed: $vol_name"
        log "Restored volume: $vol_name"
    done
fi

# --- Restore host configs ----------------------------------------------------
step "Restoring host configurations..."
if [ -d "$EXTRACT_DIR/host_configs" ]; then
    for f in "$EXTRACT_DIR/host_configs"/*; do
        [ -e "$f" ] || continue
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
                # Copy any other config file to deploy/
                cp "$f" "$PROJECT_ROOT/deploy/" 2>/dev/null && log "Restored $fname" || warn "Could not restore $fname"
                ;;
        esac
    done
fi

# --- Restore runtime files ---------------------------------------------------
step "Restoring runtime files..."
if [ -d "$EXTRACT_DIR/runtime" ]; then
    if [ -d "/run/loyallia-vault" ]; then
        cp -a "$EXTRACT_DIR/runtime/." /run/loyallia-vault/ 2>/dev/null && log "Restored /run/loyallia-vault" || warn "Could not restore runtime files"
    else
        vault_cid="$(docker ps -q --filter 'name=vault' 2>/dev/null | head -1)"
        if [ -n "$vault_cid" ]; then
            docker cp "$EXTRACT_DIR/runtime/." "$vault_cid:/run/loyallia-vault/" 2>/dev/null && log "Restored vault runtime" || warn "Could not restore vault runtime"
        fi
    fi
fi

# --- Start containers --------------------------------------------------------
step "Starting containers..."
$COMPOSE_CMD up -d || die "Failed to start containers"

# --- Verify health -----------------------------------------------------------
step "Verifying health..."
sleep 5
HEALTHY=0
TOTAL=0
for svc in $(${COMPOSE_CMD} ps --services 2>/dev/null); do
    TOTAL=$((TOTAL + 1))
    status="$(docker inspect -f '{{.State.Health.Status}}' "${COMPOSE_CMD##*-f }_${svc}_1" 2>/dev/null || true)"
    if [ "$status" = "healthy" ] || [ "$status" = "" ]; then
        # No healthcheck configured or healthy
        HEALTHY=$((HEALTHY + 1))
    fi
done

log "Health check: $HEALTHY/$TOTAL services appear healthy"
if [ "$HEALTHY" -eq "$TOTAL" ] && [ "$TOTAL" -gt 0 ]; then
    log "Restore completed successfully."
else
    warn "Some services may not be fully healthy yet — check manually with docker compose ps"
fi
