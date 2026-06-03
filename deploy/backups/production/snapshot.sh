#!/usr/bin/env bash
# =============================================================================
# LOYALLIA BACKUP — PRODUCTION FULL CLUSTER SNAPSHOT
# =============================================================================
# Captures the ENTIRE running production system into a single encrypted tarball.
#
# What is captured:
#   • Docker Compose configuration (including production overrides)
#   • Docker inspect metadata for every running container
#   • All Docker volume contents
#   • All Docker network configurations
#   • Host configs: nginx, production nginx vhost, .env, SSL certificates
#   • Runtime files from /run/loyallia-vault/
#
# Output:
#   /var/backups/loyallia/snapshot/loyallia_snapshot_$(timestamp).tar.gz.age
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"
source "$SCRIPT_DIR/../lib/common.sh"
source "$SCRIPT_DIR/../lib/encrypt.sh"

# --- Pre-flight checks -------------------------------------------------------
require_cmd docker
require_cmd tar

if ! docker info >/dev/null 2>&1; then
    die "Docker daemon is not running"
fi

# --- Setup -------------------------------------------------------------------
TS="$(timestamp)"
SNAPSHOT_DIR="$BACKUP_DIR/snapshot"
WORK_DIR="$TEMP_DIR/snapshot_$TS"
OUT_FILE="$SNAPSHOT_DIR/loyallia_snapshot_$TS.tar.gz"
ENCRYPTED_FILE="$OUT_FILE.age"

ensure_dir "$SNAPSHOT_DIR"
ensure_dir "$WORK_DIR"
setup_cleanup "$WORK_DIR"

step "Production Snapshot — $TS"

# --- a. Docker Compose config ------------------------------------------------
info "Saving Docker Compose config..."
$COMPOSE_CMD config > "$WORK_DIR/docker-compose-config.yml" 2>/dev/null || warn "Could not dump compose config"

# --- b. Docker inspect on every running container ----------------------------
info "Saving container metadata..."
mkdir -p "$WORK_DIR/containers"
while IFS= read -r cid; do
    [ -z "$cid" ] && continue
    cname="$(docker inspect -f '{{.Name}}' "$cid" | sed 's|^/||')"
    docker inspect "$cid" > "$WORK_DIR/containers/${cname}.json" 2>/dev/null || warn "inspect failed for $cname"
done < <(docker ps -q)

# --- c. All Docker volumes ---------------------------------------------------
info "Copying Docker volume contents..."
mkdir -p "$WORK_DIR/volumes"
while IFS= read -r vol; do
    [ -z "$vol" ] && continue
    case "$vol" in
        *"buildx"*|*"_tmp"*) continue ;;
    esac
    safe_name="$(echo "$vol" | tr '/:' '_')"
    mkdir -p "$WORK_DIR/volumes/$safe_name"
    docker run --rm -v "$vol:/src:ro" -v "$WORK_DIR/volumes/$safe_name:/dst" alpine \
        sh -c 'cp -a /src/. /dst/ 2>/dev/null || true' 2>/dev/null || warn "Volume copy failed: $vol"
done < <(docker volume ls -q)

# --- d. All Docker network configs -------------------------------------------
info "Saving Docker network configs..."
mkdir -p "$WORK_DIR/networks"
while IFS= read -r netid; do
    [ -z "$netid" ] && continue
    netname="$(docker network inspect -f '{{.Name}}' "$netid")"
    docker network inspect "$netid" > "$WORK_DIR/networks/${netname}.json" 2>/dev/null || warn "network inspect failed: $netname"
done < <(docker network ls -q)

# --- e. Host configs: nginx, .env, certs -------------------------------------
info "Saving host configurations..."
mkdir -p "$WORK_DIR/host_configs"
for cfg in "$PROJECT_ROOT/.env" "$PROJECT_ROOT/deploy/nginx.conf" "$PROJECT_ROOT/deploy/rewards.loyallia.com.conf"; do
    if [ -f "$cfg" ]; then
        cp "$cfg" "$WORK_DIR/host_configs/" 2>/dev/null || warn "Could not copy $cfg"
    fi
done
# SSL certificates
if [ -d "$PROJECT_ROOT/certs" ]; then
    cp -r "$PROJECT_ROOT/certs" "$WORK_DIR/host_configs/" 2>/dev/null || warn "Could not copy certs dir"
fi

# --- f. Runtime files from /run/loyallia-vault/ ------------------------------
info "Saving runtime files..."
mkdir -p "$WORK_DIR/runtime"
if [ -d "/run/loyallia-vault" ]; then
    cp -a /run/loyallia-vault/. "$WORK_DIR/runtime/" 2>/dev/null || warn "Could not copy /run/loyallia-vault"
else
    vault_cid="$(docker ps -q --filter 'name=vault' 2>/dev/null | head -1)"
    if [ -n "$vault_cid" ]; then
        docker cp "$vault_cid:/run/loyallia-vault/." "$WORK_DIR/runtime/" 2>/dev/null || warn "Could not copy from vault container"
    fi
fi

# --- Create tarball ----------------------------------------------------------
info "Creating tarball..."
tar -czf "$OUT_FILE" -C "$WORK_DIR" . || die "Tarball creation failed"

# --- Encrypt -----------------------------------------------------------------
info "Encrypting snapshot..."
encrypt_file "$OUT_FILE" "$ENCRYPTED_FILE"
rm -f "$OUT_FILE"

# --- Done --------------------------------------------------------------------
log "Snapshot created: $ENCRYPTED_FILE"
ls -lh "$ENCRYPTED_FILE"
