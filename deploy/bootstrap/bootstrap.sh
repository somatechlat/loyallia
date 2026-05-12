#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SECRETS_FILE="${BOOTSTRAP_SECRETS_FILE:-$PROJECT_ROOT/.bootstrap_secrets}"
RESCUE_DIR="$PROJECT_ROOT/.agents"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[bootstrap]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err() { echo -e "${RED}[error]${NC} $*" >&2; }
step() { echo ""; echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"; echo -e "${CYAN}  STEP $1${NC}"; echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"; }

check_prerequisites() {
    step "1/7 — Checking prerequisites"

    local missing=0

    if ! command -v docker &>/dev/null; then
        err "docker not found. Install Docker first."
        missing=1
    fi

    if ! docker compose version &>/dev/null; then
        err "docker compose v2 not found."
        missing=1
    fi

    if [ ! -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        err "docker-compose.yml not found in $PROJECT_ROOT"
        err "Run this script from the project root or check the path."
        missing=1
    fi

    if [ "$missing" -eq 1 ]; then
        exit 1
    fi

    log "Docker: $(docker --version)"
    log "Compose: $(docker compose version)"
    log "Project root: $PROJECT_ROOT"
    log "All prerequisites met."
}

check_existing_data() {
    local has_existing=0
    if docker volume inspect loyallia_vault_data &>/dev/null 2>&1; then
        local vault_data
        vault_data="$(docker run --rm -v loyallia_vault_data:/data alpine ls /data/init.json 2>/dev/null || true)"
        if [ -n "$vault_data" ]; then
            has_existing=1
        fi
    fi
    echo "$has_existing"
}

generate_or_load_secrets() {
    step "2/7 — Loading or generating secrets"

    if [ -f "$SECRETS_FILE" ]; then
        log "Found existing secrets file: $SECRETS_FILE"
        log "Exporting variables for docker compose..."
        set -a
        source "$SECRETS_FILE"
        set +a
        log "Secrets loaded from $SECRETS_FILE"
    elif [ -f "$RESCUE_DIR/vault_secrets_rescue.json" ]; then
        log "No .bootstrap_secrets file found, but rescue files exist in .agents/"
        warn "This appears to be a DISASTER RECOVERY, not a fresh bootstrap."
        warn "Use deploy/disaster_recovery/recover_from_rescue.sh instead."
        exit 1
    else
        log "No existing secrets found. Running generate_secrets.sh..."
        bash "$SCRIPT_DIR/generate_secrets.sh"
        if [ ! -f "$SECRETS_FILE" ]; then
            err "generate_secrets.sh failed to produce $SECRETS_FILE"
            exit 1
        fi
        set -a
        source "$SECRETS_FILE"
        set +a
        log "Secrets generated and loaded."
    fi

    require_set() {
        local name="$1"
        local value="${!name:-}"
        if [ -z "$value" ]; then
            err "Required secret '$name' is empty. Check $SECRETS_FILE"
            exit 1
        fi
    }

    require_set "_SECRET_KEY"
    require_set "_POSTGRES_PASSWORD"
    require_set "_REDIS_URL"
    require_set "_CELERY_BROKER_URL"
    require_set "_CELERY_RESULT_BACKEND"
    require_set "_MINIO_ROOT_USER"
    require_set "_MINIO_ROOT_PASSWORD"
    require_set "_JWT_SECRET_KEY"
    require_set "_PASS_HMAC_SECRET"

    log "All required secrets validated."
}

start_vault() {
    step "3/7 — Starting Vault + vault-init"

    log "Starting Vault services..."

    docker compose up -d vault vault-init

    log "Waiting for vault-init to complete..."
    local timeout=120
    local elapsed=0
    while [ "$elapsed" -lt "$timeout" ]; do
        local status
        status="$(docker inspect loyallia-vault-init --format '{{.State.Status}}' 2>/dev/null || echo 'not found')"
        if [ "$status" = "exited" ]; then
            local exit_code
            exit_code="$(docker inspect loyallia-vault-init --format '{{.State.ExitCode}}' 2>/dev/null || echo 1)"
            if [ "$exit_code" -eq 0 ]; then
                log "vault-init completed successfully."
                break
            else
                err "vault-init failed with exit code $exit_code"
                docker logs loyallia-vault-init
                exit 1
            fi
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done

    if [ "$elapsed" -ge "$timeout" ]; then
        err "vault-init timed out after ${timeout}s"
        docker logs loyallia-vault-init
        exit 1
    fi

    docker compose logs loyallia-vault-init --tail=5

    echo ""
    log "SAVE THIS init.json FILE IMMEDIATELY:"
    log "  mkdir -p $RESCUE_DIR"
    log "  docker cp loyallia-vault:/vault/file/init.json $RESCUE_DIR/vault_init_rescue.json"
    echo ""

    local answer
    read -r -p "Did you save init.json to .agents/? [y/N]: " answer
    if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
        warn "Saving init.json automatically..."
        mkdir -p "$RESCUE_DIR"
        docker cp loyallia-vault:/vault/file/init.json "$RESCUE_DIR/vault_init_rescue.json" 2>/dev/null || true
        if [ -f "$RESCUE_DIR/vault_init_rescue.json" ]; then
            log "init.json saved to $RESCUE_DIR/vault_init_rescue.json"
            log "WARNING: This file contains the Vault unseal key and root token."
            log "Store it OFFLINE (USB drive, password manager)."
        fi
    fi
}

start_stateful_services() {
    step "4/7 — Starting stateful services"

    log "Starting PostgreSQL, Redis, MinIO..."
    docker compose up -d postgres redis minio minio-init

    log "Waiting for PostgreSQL health..."
    docker compose exec -T postgres pg_isready -U loyallia -d loyallia --quiet 2>/dev/null || \
        docker compose wait postgres 2>/dev/null || true

    local timeout=60
    local elapsed=0
    while [ "$elapsed" -lt "$timeout" ]; do
        if docker compose exec -T postgres pg_isready -U loyallia -d loyallia &>/dev/null; then
            log "PostgreSQL is ready."
            break
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done

    log "Waiting for Redis health..."
    docker compose wait redis 2>/dev/null || true
    elapsed=0
    while [ "$elapsed" -lt "$timeout" ]; do
        if docker compose exec -T redis redis-cli -a "$(cat /dev/null 2>/dev/null; echo '')" ping &>/dev/null || \
           docker compose exec -T redis sh -c 'redis-cli ping' &>/dev/null; then
            log "Redis is ready."
            break
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done

    log "Waiting for MinIO health..."
    docker compose wait minio 2>/dev/null || true

    log "Starting PgBouncer..."
    docker compose up -d pgbouncer

    log "Starting PostgreSQL replica..."
    docker compose up -d postgres-replica
}

migrate_and_seed() {
    step "5/7 — Running migrations + seeds"

    log "Starting API container for migrations..."
    docker compose up -d api --no-deps

    log "Waiting for API readiness..."
    local timeout=90
    local elapsed=0
    while [ "$elapsed" -lt "$timeout" ]; do
        if docker compose exec -T api curl -sf http://localhost:8000/api/v1/health/ &>/dev/null; then
            log "API is healthy."
            break
        fi
        sleep 3
        elapsed=$((elapsed + 3))
    done

    if [ "$elapsed" -ge "$timeout" ]; then
        warn "API health check timed out. Checking logs..."
        docker compose logs api --tail=20
    fi
}

start_workers_and_proxy() {
    step "6/7 — Starting workers, monitoring, proxy"

    log "Starting Celery workers..."
    docker compose up -d celery-pass celery-push celery-default celery-beat

    log "Starting Flower..."
    docker compose up -d flower

    log "Starting WhatsApp bridge..."
    docker compose up -d whatsapp-bridge

    log "Starting Nginx..."
    docker compose up -d nginx

    log "Starting monitoring stack..."
    docker compose up -d prometheus grafana loki
}

verify_bootstrap() {
    step "7/7 — Verifying bootstrap"

    local errors=0
    local services=(
        "postgres:PostgreSQL"
        "redis:Redis"
        "minio:MinIO"
        "pgbouncer:PgBouncer"
        "api:API"
        "celery-pass:Celery Pass"
        "celery-push:Celery Push"
        "celery-default:Celery Default"
        "celery-beat:Celery Beat"
        "flower:Flower"
        "whatsapp-bridge:WhatsApp Bridge"
        "nginx:Nginx"
        "prometheus:Prometheus"
        "loki:Loki"
    )

    echo ""
    log "Container health check:"
    for svc in "${services[@]}"; do
        local name="${svc%%:*}"
        local label="${svc##*:}"
        local status
        status="$(docker compose ps --format json "$name" 2>/dev/null | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if isinstance(data, list):
        data = data[0]
    print(data.get('Health', data.get('State', 'unknown')))
except:
    print('unknown')
" 2>/dev/null || echo "unknown")"

        if [ "$status" = "healthy" ] || [ "$status" = "running" ]; then
            echo -e "  ${GREEN}✅${NC} ${label} (${status})"
        elif [ "$status" = "exited" ]; then
            echo -e "  ${RED}❌${NC} ${label} (${status})"
            errors=$((errors + 1))
        else
            echo -e "  ${YELLOW}⚠️${NC} ${label} (${status})"
        fi
    done

    echo ""
    if [ "$errors" -gt 0 ]; then
        warn "Bootstrap completed with ${errors} issue(s). Check: docker compose logs"
    else
        log "Bootstrap completed successfully!"
    fi

    echo ""
    log "╔══════════════════════════════════════════════════════════════════════╗"
    log "║  ACCESS POINTS                                                      ║"
    log "║                                                                     ║"
    log "║  Dashboard:   http://localhost:33906                                 ║"
    log "║  API:         http://localhost:33905/api/v1/                         ║"
    log "║  API Docs:    http://localhost:33905/api/v1/docs/                    ║"
    log "║  Flower:      http://localhost:33907                                 ║"
    log "║  MinIO:       http://localhost:33904                                 ║"
    log "║  Vault UI:    http://localhost:33908                                 ║"
    log "║  Grafana:     http://localhost:33910                                 ║"
    log "║  Prometheus:  http://localhost:33909                                 ║"
    log "╚══════════════════════════════════════════════════════════════════════╝"
}

cleanup_secrets() {
    if [ -f "$SECRETS_FILE" ] && [ "${SKIP_SECRETS_CLEANUP:-}" != "true" ]; then
        log "Cleaning up bootstrap secrets file..."
        rm -f "$SECRETS_FILE"
        log "Deleted: $SECRETS_FILE"
    fi
}

main() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║        LOYALLIA — FULL BOOTSTRAP SEQUENCE                     ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    check_prerequisites

    local existing
    existing="$(check_existing_data)"
    if [ "$existing" -eq 1 ]; then
        warn "Vault data volume already exists with init.json!"
        warn "If this is a REBOOT (not first bootstrap), use: docker compose up -d"
        warn "If you want to RECOVER from disaster, use: deploy/disaster_recovery/recover_from_rescue.sh"
        echo ""
        local answer
        read -r -p "Continue with fresh bootstrap anyway? [y/N]: " answer
        if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
            log "Aborted."
            exit 0
        fi
    fi

    generate_or_load_secrets
    start_vault
    start_stateful_services
    migrate_and_seed
    start_workers_and_proxy
    verify_bootstrap
    cleanup_secrets

    log "Bootstrap sequence complete."
}

main
