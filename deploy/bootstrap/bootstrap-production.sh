#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# LOYALLIA — PRODUCTION BOOTSTRAP (ISOLATED, IDEMPOTENT)
# =============================================================================
# Production bootstrap script. Uses .bootstrap_secrets.production.env and production settings.
# NO shared logic with production bootstrap.
#
# IDEMPOTENT DESIGN:
#   - Each step checks if already completed before executing
#   - Safe to re-run after interruption at any point
#   - Steps 1-10 can resume from where they left off
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BOOTSTRAP_MODE="production"
SECRETS_FILE="${BOOTSTRAP_SECRETS_FILE:-$PROJECT_ROOT/.bootstrap_secrets.production.env}"
RESCUE_DIR="$PROJECT_ROOT/.agents"
BOOTSTRAP_VOL="loyallia_bootstrap_tmp"
VAULT_KV_PATH="loyallia/production"

export COMPOSE_FILE="docker-compose.yml:docker-compose.prod.yml"
echo "[bootstrap] PRODUCTION BOOTSTRAP — using COMPOSE_FILE=$COMPOSE_FILE"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[bootstrap]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err() { echo -e "${RED}[error]${NC} $*" >&2; }
step() { echo ""; echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"; echo -e "${CYAN}  STEP $1${NC}"; echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"; }
skip() { echo -e "${YELLOW}[skip]${NC} $*"; }

# ─── Idempotency helpers ───────────────────────────────────────────────────

container_is_running() {
    docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${1}$"
}

container_is_healthy() {
    local status
    status="$(docker inspect "$1" --format '{{.State.Health.Status}}' 2>/dev/null || echo 'unknown')"
    [ "$status" = "healthy" ]
}

container_exists() {
    docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^${1}$"
}

vault_is_initialized() {
    docker volume inspect loyallia_vault_data &>/dev/null 2>&1 || return 1
    local init_json
    init_json="$(docker run --rm -v loyallia_vault_data:/data alpine cat /data/init.json 2>/dev/null || true)"
    [ -n "$init_json" ]
}

vault_is_healthy() {
    container_is_healthy loyallia-vault 2>/dev/null
}

vault_init_completed() {
    container_exists loyallia-vault-init && ! container_is_running loyallia-vault-init
}

api_is_healthy() {
    docker compose exec -T api curl -sf http://localhost:8000/api/v1/health/ &>/dev/null
}

service_is_running() {
    local name="$1"
    local state
    state="$(docker compose ps --format json "$name" 2>/dev/null | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if isinstance(data, list): data = data[0]
    print(data.get('State', 'unknown'))
except: print('unknown')
" 2>/dev/null || echo "unknown")"
    [ "$state" = "running" ] || [ "$state" = "healthy" ]
}

# ─── Step functions (idempotent) ───────────────────────────────────────────

check_prerequisites() {
    step "1/10 — Checking prerequisites"

    local missing=0

    if [ ! -f "$SECRETS_FILE" ]; then
        log "No secrets file found. Running generate_secrets.sh..."
        bash "$SCRIPT_DIR/generate_secrets.sh"
        if [ ! -f "$SECRETS_FILE" ]; then
            err "generate_secrets.sh failed to produce $SECRETS_FILE"
            exit 1
        fi
        log "Secrets generated."
    else
        skip "Secrets file already exists: $SECRETS_FILE"
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
        skip "Secrets file already exists: $SECRETS_FILE"
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

    local compose_vol="loyallia_${BOOTSTRAP_VOL}"

    # Recreate temp volume every time (it's ephemeral)
    docker volume inspect "$compose_vol" &>/dev/null 2>&1 && docker volume rm "$compose_vol" >/dev/null 2>&1 || true
    docker volume create "$compose_vol" >/dev/null
    log "Created temporary volume: $compose_vol"

    docker run --rm \
        -v "$compose_vol:/bootstrap" \
        -v "$PROJECT_ROOT:/project:ro" \
        alpine \
        cp "/project/.bootstrap_secrets.${BOOTSTRAP_MODE}.env" "/bootstrap/secrets.env" >/dev/null 2>&1

    log "Secrets copied to temporary volume."
}

start_vault() {
    step "4/10 — Starting Vault + vault-init"

    # TLS certificates
    if [ "$BOOTSTRAP_MODE" = "development" ]; then
        if [ ! -f "$PROJECT_ROOT/certs/vault.crt" ] || [ ! -f "$PROJECT_ROOT/certs/vault.key" ]; then
            log "Development TLS certificates not found. Generating self-signed certs..."
            bash "$PROJECT_ROOT/deploy/vault/generate-dev-certs.sh" "$PROJECT_ROOT/certs"
        fi
    fi

    # Ensure active secrets file matches mode
    if [ -f "$SECRETS_FILE" ] && [ "$SECRETS_FILE" != "$PROJECT_ROOT/.bootstrap_secrets.env" ]; then
        cp "$SECRETS_FILE" "$PROJECT_ROOT/.bootstrap_secrets.env"
        chmod 0600 "$PROJECT_ROOT/.bootstrap_secrets.env"
    fi

    # ── Vault container ──
    if vault_is_initialized && vault_is_healthy; then
        skip "Vault is already initialized and healthy."
    else
        log "Starting Vault..."
        docker compose up -d vault

        log "Waiting for Vault to be healthy..."
        local timeout=120
        local elapsed=0
        while [ "$elapsed" -lt "$timeout" ]; do
            if vault_is_healthy; then
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
    fi

    # ── vault-init container ──
    # Capture old token before vault-init runs to detect re-creation
    local _vault_init_old_token=""
    _vault_init_old_token="$(docker exec loyallia-vault cat /vault/runtime/app-token 2>/dev/null || true)"

    if vault_init_completed; then
        local exit_code
        exit_code="$(docker inspect loyallia-vault-init --format '{{.State.ExitCode}}' 2>/dev/null || echo 1)"
        if [ "$exit_code" -eq 0 ]; then
            # Even if vault-init exited 0, verify the app token is actually valid
            local _vtoken=""
            _vtoken="$(docker exec loyallia-vault cat /vault/runtime/app-token 2>/dev/null || true)"
            if [ -n "$_vtoken" ] && curl -sf -k -o /dev/null -H "X-Vault-Token: $_vtoken" \
                "https://127.0.0.1:33908/v1/auth/token/lookup-self" 2>/dev/null; then
                skip "vault-init already completed successfully. App token is valid."
                return 0
            else
                warn "vault-init exited 0 but app token is invalid. Removing and retrying..."
                docker rm -f loyallia-vault-init 2>/dev/null || true
            fi
        else
            warn "Previous vault-init failed (exit $exit_code). Removing and retrying..."
            docker rm -f loyallia-vault-init 2>/dev/null || true
        fi
    elif container_is_running loyallia-vault-init; then
        skip "vault-init is already running. Waiting for completion..."
    else
        log "Starting vault-init..."
        docker compose up -d vault-init
    fi

    log "Waiting for vault-init to complete..."
    local timeout=300
    local elapsed=0
    while [ "$elapsed" -lt "$timeout" ]; do
        if ! container_is_running loyallia-vault-init; then
            if container_exists loyallia-vault-init; then
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

    if [ -f "$RESCUE_DIR/vault_init_rescue.json" ] && [ -f "$RESCUE_DIR/vault_secrets_rescue.json" ]; then
        skip "Rescue files already exist."
        return 0
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

    # PostgreSQL
    if docker compose exec -T postgres pg_isready -U loyallia -d loyallia_dev &>/dev/null; then
        skip "PostgreSQL is already ready."
    else
        log "Waiting for PostgreSQL health..."
        local timeout=120
        local elapsed=0
        while [ "$elapsed" -lt "$timeout" ]; do
            if docker compose exec -T postgres pg_isready -U loyallia -d loyallia_dev &>/dev/null; then
                log "PostgreSQL is ready."
                break
            fi
            sleep 2
            elapsed=$((elapsed + 2))
        done
    fi

    # Redis
    local redis_password=""
    if [ -f "$SECRETS_FILE" ]; then
        redis_url="$(grep '^redis_url=' "$SECRETS_FILE" | head -1 | cut -d= -f2-)"
        redis_password="$(printf '%s' "$redis_url" | sed -n 's|redis://:\([^@]*\)@.*|\1|p')"
    fi

    local redis_ready=0
    if [ -n "$redis_password" ]; then
        docker compose exec -T redis sh -c "redis-cli -a '$redis_password' ping" 2>/dev/null | grep -q PONG && redis_ready=1
    else
        docker compose exec -T redis sh -c 'redis-cli ping' 2>/dev/null | grep -q PONG && redis_ready=1
    fi

    if [ "$redis_ready" -eq 1 ]; then
        skip "Redis is already ready."
    else
        log "Waiting for Redis health..."
        local timeout=120
        local elapsed=0
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
    fi

    # MinIO
    log "Waiting for MinIO health..."
    docker compose exec -T minio mc ready local 2>/dev/null || true

    # PgBouncer
    if service_is_running pgbouncer; then
        skip "PgBouncer is already running."
    else
        log "Starting PgBouncer..."
        docker compose up -d pgbouncer
    fi

    # Replica
    if service_is_running postgres-replica; then
        skip "PostgreSQL replica is already running."
    else
        log "Starting PostgreSQL replica..."
        docker compose up -d postgres-replica
    fi
}

migrate_and_seed() {
    step "7/10 — Running migrations + operational seeds"

    if api_is_healthy; then
        skip "API is already healthy."
    else
        log "Starting API container for migrations..."
        docker compose up -d api --no-deps

        log "Waiting for API readiness (fresh migrations may take 2-3 minutes)..."
        local timeout=300
        local elapsed=0
        while [ "$elapsed" -lt "$timeout" ]; do
            if api_is_healthy; then
                log "API is healthy."
                break
            fi
            sleep 3
            elapsed=$((elapsed + 3))
        done

        if [ "$elapsed" -ge "$timeout" ]; then
            warn "API health check timed out after ${timeout}s. Checking logs..."
            docker compose logs api --tail=20
        fi
    fi

    log "Seeding subscription plans..."
    docker compose exec -T api python manage.py seed_subscription_plans \
        --settings loyallia.settings.production 2>/dev/null || {
        warn "seed_subscription_plans not available — skipping"
    }

    log "Seeding platform settings..."
    docker compose exec -T api python manage.py seed_platform_settings --mode=production \
        --settings loyallia.settings.production 2>/dev/null || {
        warn "seed_platform_settings not available — skipping"
    }
}

ensure_admin_password() {
    step "8/10 — Ensuring SuperAdmin account"

    local admin_email="${ADMIN_EMAIL:-admin@loyallia.com}"
    local admin_pass="${ADMIN_PASSWORD:-}"

    if [ -z "$admin_pass" ]; then
        err "ADMIN_PASSWORD environment variable is REQUIRED in production mode."
        err "Example: ADMIN_PASSWORD=YourStrongPass123! ./deploy/bootstrap/bootstrap-production.sh"
        exit 1
    fi

    # Check if admin already exists and has usable password
    local admin_exists
    admin_exists="$(docker compose exec -T api python -c "
from django.contrib.auth import get_user_model
User = get_user_model()
try:
    u = User.objects.get(email='$admin_email')
    print('1' if u.has_usable_password() else '0')
except:
    print('0')
" --settings loyallia.settings.production 2>/dev/null || echo '0')"

    if [ "$admin_exists" = "1" ]; then
        skip "Admin account $admin_email already exists with usable password."
        return 0
    fi

    if [ -z "$admin_pass" ]; then
        warn "ADMIN_PASSWORD not set. Using an auto-generated password."
        admin_pass="$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)"
        log "Generated admin password: $admin_pass"
    fi

    log "Ensuring admin account has a usable password..."
    docker compose exec -T api python manage.py recover_admin_access \
        --email "$admin_email" \
        --password "$admin_pass" \
        --create || {
        err "Could not set admin password via recover_admin_access."
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

    local services=("celery-pass" "celery-push" "celery-default" "celery-beat" "flower" "whatsapp-bridge" "nginx" "prometheus" "grafana" "loki")
    local started=0

    for svc in "${services[@]}"; do
        if service_is_running "$svc"; then
            skip "$svc is already running."
        else
            log "Starting $svc..."
            docker compose up -d "$svc" 2>/dev/null || warn "$svc failed to start"
            started=$((started + 1))
        fi
    done

    if service_is_running alertmanager; then
        skip "Alertmanager is already running."
    else
        log "Starting Alertmanager..."
        docker compose up -d alertmanager 2>/dev/null || warn "Alertmanager not configured — skipping"
    fi

    if [ "$started" -gt 0 ]; then
        log "Started $started new services."
    fi
}

start_redis_sentinel() {
    step "10/10 — Starting Redis Sentinel"

    if service_is_running redis-sentinel; then
        skip "Redis Sentinel is already running."
        return 0
    fi

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
    docker volume rm "$compose_vol" 2>/dev/null || true
    log "Removed temporary volume: $compose_vol"

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
    echo -e "${CYAN}║        IDEMPOTENT — Safe to re-run after interruption         ║${NC}"
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
        answer="y"  # Auto-continue for idempotent resume
        if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
            log "Aborted."
            exit 0
        fi
    fi

    # Only block on rescue files if Vault is NOT already initialized
    # (if Vault IS initialized, we're resuming and rescue files are expected)
    if ! vault_is_initialized; then
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
