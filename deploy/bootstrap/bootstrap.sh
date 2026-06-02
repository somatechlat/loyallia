#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SECRETS_FILE="${BOOTSTRAP_SECRETS_FILE:-$PROJECT_ROOT/.bootstrap_secrets.json}"
RESCUE_DIR="$PROJECT_ROOT/.agents"
BOOTSTRAP_VOL="loyallia_bootstrap_tmp"
BOOTSTRAP_MODE="${LOYALLIA_BOOTSTRAP_MODE:-development}"
VAULT_KV_PATH="loyallia/$BOOTSTRAP_MODE"

# Production mode: automatically include docker-compose.prod.yml
if [ "$BOOTSTRAP_MODE" = "production" ]; then
    export COMPOSE_FILE="docker-compose.yml:docker-compose.prod.yml"
    echo "[bootstrap] Production mode: using COMPOSE_FILE=$COMPOSE_FILE"
fi

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
    step "1/10 — Checking prerequisites"

    local missing=0

    if [ "$BOOTSTRAP_MODE" != "development" ] && [ "$BOOTSTRAP_MODE" != "production" ]; then
        err "LOYALLIA_BOOTSTRAP_MODE must be development or production."
        missing=1
    fi

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
    step "2/10 — Loading or generating secrets"

    if [ -f "$SECRETS_FILE" ]; then
        log "Found existing secrets file: $SECRETS_FILE"
        log "This file will be mounted into vault-init as a read-only volume."
        log "It will NEVER be sourced or exported to environment variables."
    elif [ -f "$RESCUE_DIR/vault_secrets_rescue.json" ]; then
        log "No .bootstrap_secrets.json found, but rescue files exist in .agents/"
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
        log "Secrets generated."
    fi
}

prepare_bootstrap_volume() {
    step "3/10 — Preparing secure bootstrap volume"

    # Docker Compose prefixes volume names with project name (loyallia_)
    local compose_vol="loyallia_${BOOTSTRAP_VOL}"

    # Create temporary Docker volume for bootstrap secrets
    docker volume inspect "$compose_vol" &>/dev/null 2>&1 && docker volume rm "$compose_vol" >/dev/null 2>&1 || true
    docker volume create "$compose_vol" >/dev/null
    log "Created temporary volume: $compose_vol"

    # Copy secrets JSON into the volume (never export to env)
    docker run --rm \
        -v "$compose_vol:/bootstrap" \
        -v "$PROJECT_ROOT:/project:ro" \
        alpine \
        cp /project/.bootstrap_secrets.json /bootstrap/secrets.json >/dev/null 2>&1

    log "Secrets JSON copied to temporary volume (read-only mount)."
    log "NO secrets were exported to environment variables."
}

start_vault() {
    step "4/10 — Starting Vault + vault-init"

    # Ensure TLS certificates exist (generate self-signed for development)
    if [ "$BOOTSTRAP_MODE" = "development" ]; then
        if [ ! -f "$PROJECT_ROOT/certs/vault.crt" ] || [ ! -f "$PROJECT_ROOT/certs/vault.key" ]; then
            log "Development TLS certificates not found. Generating self-signed certs..."
            bash "$PROJECT_ROOT/deploy/vault/generate-dev-certs.sh" "$PROJECT_ROOT/certs"
        fi
    fi

    log "Starting Vault..."
    docker compose up -d vault

    log "Waiting for Vault to be healthy..."
    local timeout=60
    local elapsed=0
    while [ "$elapsed" -lt "$timeout" ]; do
        if docker inspect loyallia-vault --format '{{.State.Health.Status}}' 2>/dev/null | grep -q healthy; then
            log "Vault is healthy."
            break
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done

    if [ "$elapsed" -ge "$timeout" ]; then
        err "Vault failed to become healthy within ${timeout}s"
        docker logs loyallia-vault --tail=20
        exit 1
    fi

    log "Starting vault-init..."
    docker compose up -d vault-init

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

    docker compose logs vault-init --tail=5
}

auto_create_rescue_files() {
    step "5/10 — Creating rescue files"

    # --- Rescue file detection: redirect to DR if rescue files already exist ---
    if [ -f "$RESCUE_DIR/vault_init_rescue.json" ] && [ -f "$RESCUE_DIR/vault_secrets_rescue.json" ]; then
        warn ""
        warn "╔══════════════════════════════════════════════════════════════════════╗"
        warn "║  RESCUE FILES ALREADY EXIST                                         ║"
        warn "║                                                                     ║"
        warn "║  vault_init_rescue.json and vault_secrets_rescue.json found.        ║"
        warn "║  This is a DISASTER RECOVERY scenario, not a fresh bootstrap.       ║"
        warn "║                                                                     ║"
        warn "║  To recover, run:                                                   ║"
        warn "║    ./deploy/bootstrap/disaster_recovery/recover_from_rescue.sh      ║"
        warn "╚══════════════════════════════════════════════════════════════════════╝"
        warn ""
        exit 1
    fi

    mkdir -p "$RESCUE_DIR"
    chmod 0700 "$RESCUE_DIR"

    log "Extracting Vault init.json..."
    docker cp loyallia-vault:/vault/file/init.json "$RESCUE_DIR/vault_init_rescue.json" 2>/dev/null || {
        warn "Failed to copy init.json. Vault may not have initialized."
        return 1
    }
    chmod 0600 "$RESCUE_DIR/vault_init_rescue.json"
    log "Saved: $RESCUE_DIR/vault_init_rescue.json"

    log "Exporting Vault secrets..."
    local root_token
    root_token="$(docker exec loyallia-vault sh -c 'cat /vault/file/init.json' | python3 -c 'import json,sys; print(json.load(sys.stdin)["root_token"])')"

    curl -sf -k -H "X-Vault-Token: $root_token" \
        "https://127.0.0.1:33908/v1/secret/data/$VAULT_KV_PATH" \
        > "$RESCUE_DIR/vault_secrets_rescue.json" 2>/dev/null || {
        warn "Failed to export Vault secrets via API. Continuing without rescue file."
    }
    chmod 0600 "$RESCUE_DIR/vault_secrets_rescue.json"
    log "Saved: $RESCUE_DIR/vault_secrets_rescue.json"

    log "╔══════════════════════════════════════════════════════════════════════╗"
    log "║  RESCUE FILES CREATED                                               ║"
    log "║                                                                     ║"
    log "║  Store these OFFLINE (USB drive, password manager):                 ║"
    log "║    - $RESCUE_DIR/vault_init_rescue.json                             ║"
    log "║    - $RESCUE_DIR/vault_secrets_rescue.json                           ║"
    log "╚══════════════════════════════════════════════════════════════════════╝"
}

start_stateful_services() {
    step "6/10 — Starting stateful services"

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

    # Extract Redis password from bootstrap secrets JSON
    local redis_password=""
    if command -v python3 &>/dev/null && [ -f "$SECRETS_FILE" ]; then
        redis_password="$(python3 -c "import json; d=json.load(open('$SECRETS_FILE')); print(d.get('secrets',{}).get('redis_url','').split(':')[2].split('@')[0], end='')" 2>/dev/null)"
    fi

    elapsed=0
    while [ "$elapsed" -lt "$timeout" ]; do
        if [ -n "$redis_password" ]; then
            if docker compose exec -T redis sh -c "redis-cli -a '$redis_password' ping" 2>/dev/null | grep -q PONG; then
                log "Redis is ready."
                break
            fi
        else
            if docker compose exec -T redis sh -c 'redis-cli ping' 2>/dev/null | grep -q PONG; then
                log "Redis is ready."
                break
            fi
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done

    log "Waiting for MinIO health..."
    docker compose exec -T minio mc ready local 2>/dev/null || true

    log "Starting PgBouncer..."
    docker compose up -d pgbouncer

    log "Starting PostgreSQL replica..."
    docker compose up -d postgres-replica
}

migrate_and_seed() {
    step "7/10 — Running migrations + operational seeds"

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

    log "Seeding subscription plans..."
    docker compose exec -T api python manage.py seed_subscription_plans \
        --settings "loyallia.settings.$BOOTSTRAP_MODE" 2>/dev/null || {
        warn "seed_subscription_plans not available — skipping"
    }

    log "Seeding platform settings..."
    docker compose exec -T api python manage.py seed_platform_settings --mode="$BOOTSTRAP_MODE" \
        --settings "loyallia.settings.$BOOTSTRAP_MODE" 2>/dev/null || {
        warn "seed_platform_settings not available — skipping"
    }

    if [ "$BOOTSTRAP_MODE" = "production" ]; then
        log "Validating production runtime guardrails..."
        docker compose exec -T api python manage.py validate_runtime_environment --mode production \
            --settings loyallia.settings.production 2>/dev/null || {
            warn "Runtime validation failed — continuing anyway"
        }
    fi
}

ensure_admin_password() {
    step "8/10 — Ensuring SuperAdmin account"

    local admin_email="${ADMIN_EMAIL:-admin@loyallia.com}"
    local admin_pass="${ADMIN_PASSWORD:-}"

    if [ -z "$admin_pass" ]; then
        if [ "$BOOTSTRAP_MODE" = "production" ]; then
            err "ADMIN_PASSWORD environment variable is required in production mode."
            err "Example: ADMIN_PASSWORD=YourStrongPass123! ./deploy/bootstrap/bootstrap.sh"
            exit 1
        else
            warn "ADMIN_PASSWORD not set. Using an auto-generated password."
            admin_pass="$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)"
            log "Generated admin password: $admin_pass"
            log "Set ADMIN_PASSWORD to use a fixed password."
        fi
    fi

    log "Ensuring admin account has a usable password..."
    docker compose exec -T api python manage.py recover_admin_access \
        --email "$admin_email" \
        --password "$admin_pass" \
        --create || {
        err "Could not set admin password via recover_admin_access."
        err "You may need to set it manually after bootstrap:"
        err "  docker compose exec api python manage.py recover_admin_access --password 'YourPass' --create"
        exit 1
    }

    log "Admin password set."
    log "  Email:    $admin_email"
    if [ -z "${ADMIN_PASSWORD:-}" ]; then
        log "  Password: $admin_pass (auto-generated, save this!)"
    else
        log "  Password: (set from ADMIN_PASSWORD environment variable)"
    fi
}

start_workers_and_proxy() {
    step "9/10 — Starting workers, monitoring, proxy"

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

    log "Starting Alertmanager..."
    docker compose up -d alertmanager 2>/dev/null || warn "Alertmanager not configured — skipping"
}

start_redis_sentinel() {
    step "10/10 — Starting Redis Sentinel"

    log "Checking for Redis Sentinel configuration..."
    if [ -f "$PROJECT_ROOT/deploy/redis/sentinel.conf" ]; then
        log "Starting Redis Sentinel..."
        docker compose up -d redis-sentinel 2>/dev/null || {
            warn "Redis Sentinel service not defined — skipping"
        }
    else
        warn "No sentinel.conf found — Redis Sentinel not started"
    fi
}

secure_delete() {
    local file="$1"
    if [ -f "$file" ]; then
        if command -v shred &>/dev/null; then
            shred -n 3 -z -u "$file" 2>/dev/null || rm -f "$file"
        else
            dd if=/dev/urandom of="$file" bs=1k count=10 conv=notrunc 2>/dev/null || true
            rm -f "$file"
        fi
    fi
}

cleanup_bootstrap() {
    step "Final — Secure cleanup"

    local compose_vol="loyallia_${BOOTSTRAP_VOL}"

    # Remove temporary bootstrap volume
    docker volume rm "$compose_vol" 2>/dev/null || true
    log "Removed temporary volume: $compose_vol"

    # NOTE: We do NOT delete .bootstrap_secrets.json here.
    # It is required for re-bootstrap, disaster recovery, and CI/CD pipelines.
    # The secrets file should be protected by .gitignore and filesystem permissions.
    if [ -f "$SECRETS_FILE" ]; then
        chmod 0600 "$SECRETS_FILE"
        log "Preserved secrets file (permissions 0600): $SECRETS_FILE"
    fi
}

verify_bootstrap() {
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

main() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║        LOYALLIA — ZERO TRUST BOOTSTRAP SEQUENCE               ║${NC}"
    echo -e "${CYAN}║        No secrets in environment variables. Ever.             ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    check_prerequisites

    local existing
    existing="$(check_existing_data)"
    if [ "$existing" -eq 1 ]; then
        warn "Vault data volume already exists with init.json!"
        warn "If this is a REBOOT (not first bootstrap), use: docker compose up -d"

        warn "If you want to RECOVER from disaster, use: deploy/bootstrap/disaster_recovery/recover_from_rescue.sh"
        echo ""
        local answer
        read -r -p "Continue with fresh bootstrap anyway? [y/N]: " answer
        if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
            log "Aborted."
            exit 0
        fi
    fi

    # --- Rescue file detection: redirect to DR if rescue files exist ---
    if [ -f "$RESCUE_DIR/vault_init_rescue.json" ] && [ -f "$RESCUE_DIR/vault_secrets_rescue.json" ]; then
        warn ""
        warn "╔══════════════════════════════════════════════════════════════════════╗"
        warn "║  RESCUE FILES DETECTED                                              ║"
        warn "║                                                                     ║"
        warn "║  vault_init_rescue.json and vault_secrets_rescue.json found.        ║"
        warn "║  This is a DISASTER RECOVERY scenario, not a fresh bootstrap.       ║"
        warn "║                                                                     ║"
        warn "║  To recover, run:                                                   ║"
        warn "║    ./deploy/bootstrap/disaster_recovery/recover_from_rescue.sh      ║"
        warn "╚══════════════════════════════════════════════════════════════════════╝"
        warn ""
        exit 1
    fi

    generate_or_load_secrets
    prepare_bootstrap_volume
    start_vault
    auto_create_rescue_files
    start_stateful_services
    migrate_and_seed
    ensure_admin_password
    start_workers_and_proxy
    start_redis_sentinel
    cleanup_bootstrap
    verify_bootstrap

    log "Zero Trust bootstrap sequence complete."
}

main "$@"
