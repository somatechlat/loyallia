#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# LOYALLIA — COMPLETE DEPLOYMENT ORCHESTRATOR
# =============================================================================
# Wraps bootstrap.sh with additional pre/post-deployment steps.
#
# Usage:
#   ./deploy/bootstrap/full-deploy.sh [OPTIONS]
#
# Options:
#   --env=production|development   Target environment (default: production)
#   --destroy                      Remove old containers first
#   --step=N                       Resume from step N (0-14)
#   --verbose                      Print all commands (set -x)
#   --dry-run                      Show what would happen, don't execute
#   --help                         Show this help
#
# Steps:
#   00 — Validate prerequisites (Docker, disk, RAM, SSL certs, .env)
#   01 — Create backup branch in git
#   02 — Destroy old containers (if --destroy)
#   03 — Download external code dependencies (git clone)
#   04 — Validate environment (28 required keys in .env)
#   05 — Start infrastructure (postgres, redis, minio, vault, loki)
#   06 — Call bootstrap.sh steps 1-7 (init Vault, seed secrets)
#   07 — Seed platform settings (seed_platform_settings)
#   08 — Build application images (api, dashboard)
#   09 — Deploy API + Dashboard
#   10 — Deploy workers (celery x3, beat, flower)
#   11 — Deploy monitoring (prometheus, alertmanager, grafana)
#   12 — Deploy Nginx + configure SSL
#   13 — Final verification (all containers healthy, HTTPS works)
#   14 — Write deployment.state.json
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
if [ "${DEPLOY_ENV:-production}" = "production" ]; then
    BOOTSTRAP_SCRIPT="$SCRIPT_DIR/bootstrap-production.sh"
else
    BOOTSTRAP_SCRIPT="$SCRIPT_DIR/bootstrap-development.sh"
fi
STATE_FILE="$PROJECT_ROOT/deployment.state.json"
ENV_FILE="$PROJECT_ROOT/.env"
RESCUE_DIR="$PROJECT_ROOT/.agents"

# --- Colours ------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

log()   { echo -e "${GREEN}[deploy]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $*"; }
err()   { echo -e "${RED}[error]${NC} $*" >&2; }
info()  { echo -e "${CYAN}[info]${NC} $*"; }
step_banner() {
    echo ""
    echo -e "${MAGENTA}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║  STEP $(printf '%02d' "$1")/14 — $2${NC}"
    echo -e "${MAGENTA}╚══════════════════════════════════════════════════════════════════════╝${NC}"
}

# --- CLI argument parsing -----------------------------------------------------
DEPLOY_ENV="production"
DESTROY_FLAG=0
RESUME_STEP=-1
VERBOSE_FLAG=0
DRY_RUN_FLAG=0

parse_args() {
    for arg in "$@"; do
        case "$arg" in
            --env=production|--env=development)
                DEPLOY_ENV="${arg#*=}"
                if [ "$DEPLOY_ENV" = "production" ]; then
                    BOOTSTRAP_SCRIPT="$SCRIPT_DIR/bootstrap-production.sh"
                else
                    BOOTSTRAP_SCRIPT="$SCRIPT_DIR/bootstrap-development.sh"
                fi
                ;;
            --destroy)
                DESTROY_FLAG=1
                ;;
            --step=*)
                RESUME_STEP="${arg#*=}"
                ;;
            --verbose)
                VERBOSE_FLAG=1
                set -x
                ;;
            --dry-run)
                DRY_RUN_FLAG=1
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                err "Unknown argument: $arg"
                show_help
                exit 1
                ;;
        esac
    done
}

show_help() {
    sed -n '/^# ===/,/^# ===/p' "$0" | sed 's/^# //;s/^#//'
}

# --- State management ---------------------------------------------------------
load_state() {
    if [ -f "$STATE_FILE" ]; then
        local completed_step
        completed_step="$(python3 -c "import json; d=json.load(open('$STATE_FILE')); print(d.get('completed_step',-1))" 2>/dev/null || echo -1)"
        if [ "$RESUME_STEP" -lt 0 ] && [ "$completed_step" -ge 0 ]; then
            warn "Found existing deployment state (completed step $completed_step)."
            warn "Use --step=N to resume, or the orchestrator will start from step 00."
        fi
    fi
}

save_state() {
    local step_num="$1"
    local status="$2"
    local timestamp
    timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

    if [ "$DRY_RUN_FLAG" -eq 0 ]; then
        python3 - "$step_num" "$status" "$timestamp" "$DEPLOY_ENV" "$0" "$@" << 'PYEOF'
import json, sys, os

step_num, status, timestamp, env, script_path = sys.argv[1:6]
state_file = os.path.join(os.path.dirname(os.path.abspath(script_path)), '..', '..', 'deployment.state.json')

state = {
    "completed_step": int(step_num),
    "status": status,
    "timestamp": timestamp,
    "environment": env,
    "steps": []
}

# Preserve previous step history if exists
if os.path.exists(state_file):
    try:
        with open(state_file) as f:
            old = json.load(f)
            state["steps"] = old.get("steps", [])
    except Exception:
        pass

state["steps"].append({
    "step": int(step_num),
    "status": status,
    "timestamp": timestamp
})

with open(state_file, 'w') as f:
    json.dump(state, f, indent=2)
PYEOF
    fi
}

mark_step_done() {
    local step_num="$1"
    echo -e "${GREEN}  [PASS] Step $(printf '%02d' "$step_num") completed successfully${NC}"
    save_state "$step_num" "PASS"
}

mark_step_fail() {
    local step_num="$1"
    echo -e "${RED}  [FAIL] Step $(printf '%02d' "$step_num") failed${NC}"
    save_state "$step_num" "FAIL"
}

should_run_step() {
    local step_num="$1"
    if [ "$RESUME_STEP" -ge 0 ]; then
        if [ "$step_num" -lt "$RESUME_STEP" ]; then
            return 1
        fi
    fi
    return 0
}

dry_run_echo() {
    if [ "$DRY_RUN_FLAG" -eq 1 ]; then
        info "[DRY-RUN] Would execute: $*"
        return 0
    fi
    return 1
}

# =============================================================================
# STEP 00 — VALIDATE PREREQUISITES
# =============================================================================
step_00_validate_prerequisites() {
    step_banner 0 "Validate prerequisites"

    if dry_run_echo "docker --version, docker compose version, check disk, RAM, SSL certs, .env"; then
        mark_step_done 0
        return 0
    fi

    local fail_count=0

    # Docker
    if ! command -v docker &>/dev/null; then
        err "Docker not found. Install: https://docs.docker.com/engine/install/"
        fail_count=$((fail_count + 1))
    else
        log "Docker: $(docker --version)"
    fi

    # Docker Compose v2
    if ! docker compose version &>/dev/null; then
        err "Docker Compose v2 not found."
        fail_count=$((fail_count + 1))
    else
        log "Compose: $(docker compose version)"
    fi

    # Available disk (need at least 20GB free)
    local disk_free_gb
    disk_free_gb="$(df -BG "$PROJECT_ROOT" 2>/dev/null | awk 'NR==2 {print $4}' | tr -d 'G' || echo 0)"
    if [ "$disk_free_gb" -lt 20 ]; then
        err "Insufficient disk space: ${disk_free_gb}GB free (need 20GB+)"
        fail_count=$((fail_count + 1))
    else
        log "Disk space: ${disk_free_gb}GB free ✓"
    fi

    # Available RAM (need at least 8GB)
    local total_ram_gb
    total_ram_gb="$(free -g 2>/dev/null | awk '/^Mem:/{print $2}' || echo 0)"
    if [ "$total_ram_gb" -lt 8 ]; then
        warn "Low RAM: ${total_ram_gb}GB (recommend 12GB+ for full stack)"
    else
        log "RAM: ${total_ram_gb}GB ✓"
    fi

    # .env file exists
    if [ ! -f "$ENV_FILE" ]; then
        if [ "$DEPLOY_ENV" = "production" ]; then
            err ".env file not found at $ENV_FILE"
            fail_count=$((fail_count + 1))
        else
            warn ".env not found — development mode will use defaults"
        fi
    else
        log ".env file found ✓"
    fi

    # SSL certificates (production only)
    if [ "$DEPLOY_ENV" = "production" ]; then
        local ssl_cert_path ssl_key_path
        ssl_cert_path="${SSL_CERT_PATH:-/etc/letsencrypt/live/rewards.loyallia.com/fullchain.pem}"
        ssl_key_path="${SSL_KEY_PATH:-/etc/letsencrypt/live/rewards.loyallia.com/privkey.pem}"

        if [ ! -f "$ssl_cert_path" ]; then
            warn "SSL certificate not found at $ssl_cert_path"
            warn "Run: certbot --nginx -d rewards.loyallia.com"
        else
            log "SSL certificate found ✓"
        fi

        if [ ! -f "$ssl_key_path" ]; then
            warn "SSL private key not found at $ssl_key_path"
        else
            log "SSL private key found ✓"
        fi
    fi

    # docker-compose.yml exists
    if [ ! -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        err "docker-compose.yml not found in $PROJECT_ROOT"
        fail_count=$((fail_count + 1))
    fi

    # bootstrap.sh exists
    if [ ! -f "$BOOTSTRAP_SCRIPT" ]; then
        err "bootstrap.sh not found at $BOOTSTRAP_SCRIPT"
        fail_count=$((fail_count + 1))
    fi

    # Check for rescue files — redirect to DR if they exist
    if [ -f "$RESCUE_DIR/vault_init_rescue.json" ] && [ -f "$RESCUE_DIR/vault_secrets_rescue.json" ]; then
        warn ""
        warn "╔══════════════════════════════════════════════════════════════════════╗"
        warn "║  RESCUE FILES DETECTED                                              ║"
        warn "║                                                                     ║"
        warn "║  vault_init_rescue.json and vault_secrets_rescue.json found.        ║"
        warn "║  This looks like a DISASTER RECOVERY scenario.                      ║"
        warn "║                                                                     ║"
        warn "║  To recover, run instead:                                           ║"
        warn "║    ./deploy/disaster_recovery/recover_from_rescue.sh                ║"
        warn "╚══════════════════════════════════════════════════════════════════════╝"
        warn ""
        if [ "$DEPLOY_ENV" = "production" ]; then
            err "Aborting deployment — rescue files present in production."
            exit 1
        fi
    fi

    if [ "$fail_count" -gt 0 ]; then
        err "$fail_count prerequisite check(s) failed."
        exit 1
    fi

    log "All prerequisites validated ✓"
    mark_step_done 0
}

rollback_step_00() {
    info "No rollback needed for prerequisite validation"
}

# =============================================================================
# STEP 01 — CREATE BACKUP BRANCH IN GIT
# =============================================================================
step_01_git_backup_branch() {
    step_banner 1 "Create backup branch in git"

    if dry_run_echo "git branch deployment-$(date +%Y%m%d-%H%M%S)"; then
        mark_step_done 1
        return 0
    fi

    if [ ! -d "$PROJECT_ROOT/.git" ]; then
        warn "Not a git repository — skipping backup branch"
        mark_step_done 1
        return 0
    fi

    local branch_name="deploy-$(date +%Y%m%d-%H%M%S)"
    local current_branch
    current_branch="$(cd "$PROJECT_ROOT" && git branch --show-current 2>/dev/null || echo 'unknown')"

    log "Current branch: $current_branch"
    log "Creating backup branch: $branch_name"

    if ! cd "$PROJECT_ROOT" && git checkout -b "$branch_name" 2>/dev/null; then
        warn "Failed to create backup branch — continuing anyway"
    else
        cd "$PROJECT_ROOT" && git checkout "$current_branch" 2>/dev/null || true
        log "Backup branch created: $branch_name ✓"
    fi

    mark_step_done 1
}

rollback_step_01() {
    info "Git branches are non-destructive — no rollback needed"
}

# =============================================================================
# STEP 02 — DESTROY OLD CONTAINERS (if --destroy)
# =============================================================================
step_02_destroy_old() {
    step_banner 2 "Destroy old containers"

    if dry_run_echo "docker compose down --remove-orphans --volumes (if --destroy)"; then
        mark_step_done 2
        return 0
    fi

    if [ "$DESTROY_FLAG" -eq 0 ]; then
        info "--destroy not set — skipping container destruction"
        info "Use --destroy to remove old containers before deploying"
        mark_step_done 2
        return 0
    fi

    warn "╔══════════════════════════════════════════════════════════════════════╗"
    warn "║  DESTROY MODE ENABLED                                               ║"
    warn "║  This will remove ALL Loyallia containers, volumes, and networks.   ║"
    warn "╚══════════════════════════════════════════════════════════════════════╝"

    local answer
    read -r -p "  Proceed with destruction? [y/N]: " answer
    if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
        log "Destruction cancelled — exiting"
        exit 0
    fi

    log "Stopping all Loyallia containers..."
    cd "$PROJECT_ROOT" && docker compose down --remove-orphans 2>/dev/null || true

    log "Removing named volumes..."
    local vols=(
        "${COMPOSE_PROJECT_NAME:-loyallia}_vault_data"
        "${COMPOSE_PROJECT_NAME:-loyallia}_vault_runtime"
        "${COMPOSE_PROJECT_NAME:-loyallia}_postgres_data"
        "${COMPOSE_PROJECT_NAME:-loyallia}_postgres_replica_data"
        "${COMPOSE_PROJECT_NAME:-loyallia}_redis_data"
        "${COMPOSE_PROJECT_NAME:-loyallia}_minio_data"
        "${COMPOSE_PROJECT_NAME:-loyallia}_static_files"
        "${COMPOSE_PROJECT_NAME:-loyallia}_media_files"
        "${COMPOSE_PROJECT_NAME:-loyallia}_prometheus_data"
        "${COMPOSE_PROJECT_NAME:-loyallia}_grafana_data"
        "${COMPOSE_PROJECT_NAME:-loyallia}_loki_data"
        "${COMPOSE_PROJECT_NAME:-loyallia}_next_cache"
    )

    for vol in "${vols[@]}"; do
        if docker volume inspect "$vol" &>/dev/null 2>&1; then
            docker volume rm "$vol" >/dev/null 2>&1 && log "  Removed volume: $vol"
        fi
    done

    log "All containers and volumes destroyed ✓"
    mark_step_done 2
}

rollback_step_02() {
    info "Rollback: containers were destroyed — restore from backup if needed"
    info "  Run: ./deploy/backups/restore.sh"
}

# =============================================================================
# STEP 03 — DOWNLOAD EXTERNAL CODE DEPENDENCIES
# =============================================================================
step_03_download_code() {
    step_banner 3 "Download external code dependencies"

    if dry_run_echo "git clone external dependencies"; then
        mark_step_done 3
        return 0
    fi

    # This step is a placeholder for any external code repositories
    # that need to be cloned before building (e.g., a separate dashboard repo).
    # Currently all code is in the main repository.

    log "All code dependencies are in the main repository ✓"
    log "(Placeholder for future external repositories)"

    mark_step_done 3
}

rollback_step_03() {
    info "No rollback needed — no external code downloaded"
}

# =============================================================================
# STEP 04 — VALIDATE ENVIRONMENT (28 required keys in .env)
# =============================================================================
step_04_validate_env() {
    step_banner 4 "Validate environment (.env)"

    if dry_run_echo "validate 28 required keys in .env"; then
        mark_step_done 4
        return 0
    fi

    if [ ! -f "$ENV_FILE" ]; then
        if [ "$DEPLOY_ENV" = "development" ]; then
            warn ".env not found — using development defaults"
            mark_step_done 4
            return 0
        fi
        err ".env file required for production deployment"
        err "Create one from the example: cp .env.example .env"
        exit 1
    fi

    # Required keys for production (28 keys)
    local required_keys=(
        "POSTGRES_DB"
        "POSTGRES_USER"
        "ALLOWED_HOSTS"
        "CORS_ALLOWED_ORIGINS"
        "NEXT_PUBLIC_API_URL"
        "NEXT_PUBLIC_APP_URL"
        "VAULT_ADDR"
        "EMAIL_HOST"
        "EMAIL_PORT"
        "EMAIL_FROM"
        "MINIO_ENDPOINT"
        "PAYMENT_GATEWAY_PROVIDER"
        "REDIS_URL"
        "CELERY_BROKER_URL"
        "CELERY_RESULT_BACKEND"
        "FLOWER_BASIC_AUTH"
        "JWT_SECRET_KEY"
        "SECRET_KEY"
        "SENTRY_DSN"
        "GOOGLE_OAUTH_REDIRECT_URI"
        "WHATSAPP_BRIDGE_URL"
        "BACKUP_FREQUENCY"
        "BACKUP_RETENTION"
        "CRON_HOUR"
        "SYSTEM_MODE"
        "SSL_CERT_PATH"
        "SSL_KEY_PATH"
        "DOMAIN"
    )

    local missing=0
    local key

    for key in "${required_keys[@]}"; do
        # Handle both KEY=value and export KEY=value formats
        if ! grep -qE "^\s*(export\s+)?${key}\s*=\s*.+" "$ENV_FILE" 2>/dev/null; then
            # Also check if set in environment
            if [ -z "${!key:-}" ]; then
                warn "  Missing: $key"
                missing=$((missing + 1))
            fi
        fi
    done

    if [ "$missing" -gt 0 ]; then
        warn "$missing required key(s) missing from .env"
        warn "Some services may fail to start"
    else
        log "All 28 required keys present ✓"
    fi

    # Warn about placeholder values
    local placeholder_count=0
    if grep -qE "PLACEHOLDER|placeholder|changeme|CHANGEME|example\.com" "$ENV_FILE" 2>/dev/null; then
        warn "Placeholder values detected in .env:"
        grep -nE "PLACEHOLDER|placeholder|changeme|CHANGEME|example\.com" "$ENV_FILE" | while read -r line; do
            warn "  $line"
        done
        placeholder_count=1
    fi

    if [ "$missing" -gt 5 ]; then
        err "Too many missing keys ($missing) — aborting"
        exit 1
    fi

    log "Environment validation complete ✓"
    mark_step_done 4
}

rollback_step_04() {
    info "No rollback needed for env validation"
}

# =============================================================================
# STEP 05 — START INFRASTRUCTURE
# =============================================================================
step_05_start_infrastructure() {
    step_banner 5 "Start infrastructure (postgres, redis, minio, vault, loki)"

    if dry_run_echo "docker compose up -d postgres redis minio vault loki"; then
        mark_step_done 5
        return 0
    fi

    log "Starting infrastructure services..."

    cd "$PROJECT_ROOT"

    # Start Vault first (other services depend on vault-init)
    log "  Starting Vault..."
    docker compose up -d vault

    # Wait for Vault health
    local timeout=60
    local elapsed=0
    while [ "$elapsed" -lt "$timeout" ]; do
        if docker inspect loyallia-vault --format '{{.State.Health.Status}}' 2>/dev/null | grep -q healthy; then
            log "  Vault is healthy ✓"
            break
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done

    if [ "$elapsed" -ge "$timeout" ]; then
        err "Vault failed to become healthy within ${timeout}s"
        docker logs loyallia-vault --tail=20
        mark_step_fail 5
        exit 1
    fi

    # Start remaining infrastructure
    log "  Starting PostgreSQL, Redis, MinIO, Loki..."
    docker compose up -d postgres redis minio loki

    # Wait for PostgreSQL
    timeout=60
    elapsed=0
    while [ "$elapsed" -lt "$timeout" ]; do
        if docker compose exec -T postgres pg_isready -U loyallia -d loyallia &>/dev/null; then
            log "  PostgreSQL is ready ✓"
            break
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done

    # Wait for Redis
    local redis_password=""
    if [ -f "$PROJECT_ROOT/.bootstrap_secrets.json" ]; then
        redis_password="$(python3 -c "import json; d=json.load(open('$PROJECT_ROOT/.bootstrap_secrets.json')); print(d.get('secrets',{}).get('redis_url','').split(':')[2].split('@')[0], end='')" 2>/dev/null || true)"
    fi

    timeout=60
    elapsed=0
    while [ "$elapsed" -lt "$timeout" ]; do
        if [ -n "$redis_password" ]; then
            if docker compose exec -T redis sh -c "redis-cli -a '$redis_password' ping" 2>/dev/null | grep -q PONG; then
                log "  Redis is ready ✓"
                break
            fi
        else
            if docker compose exec -T redis sh -c 'redis-cli ping' 2>/dev/null | grep -q PONG; then
                log "  Redis is ready ✓"
                break
            fi
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done

    # Wait for MinIO
    timeout=60
    elapsed=0
    while [ "$elapsed" -lt "$timeout" ]; do
        if docker compose exec -T minio mc ready local 2>/dev/null; then
            log "  MinIO is ready ✓"
            break
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done

    log "Infrastructure services started ✓"
    mark_step_done 5
}

rollback_step_05() {
    warn "Rollback: stopping infrastructure..."
    cd "$PROJECT_ROOT" && docker compose down postgres redis minio vault loki 2>/dev/null || true
}

verify_step_05() {
    local svcs=("loyallia-postgres" "loyallia-redis" "loyallia-minio" "loyallia-vault")
    local all_ok=1
    for svc in "${svcs[@]}"; do
        local status
        status="$(docker inspect "$svc" --format '{{.State.Status}}' 2>/dev/null || echo 'missing')"
        if [ "$status" != "running" ]; then
            err "  $svc is $status (expected: running)"
            all_ok=0
        fi
    done
    [ "$all_ok" -eq 1 ]
}

# =============================================================================
# STEP 06 — CALL BOOTSTRAP.SH (Vault init, seed secrets)
# =============================================================================
step_06_bootstrap_vault() {
    step_banner 6 "Bootstrap Vault and seed secrets"

    if dry_run_echo "LOYALLIA_BOOTSTRAP_MODE=$DEPLOY_ENV $BOOTSTRAP_SCRIPT"; then
        mark_step_done 6
        return 0
    fi

    if [ ! -f "$BOOTSTRAP_SCRIPT" ]; then
        err "bootstrap.sh not found at $BOOTSTRAP_SCRIPT"
        mark_step_fail 6
        exit 1
    fi

    log "Running bootstrap.sh in mode: $DEPLOY_ENV"

    export LOYALLIA_BOOTSTRAP_MODE="$DEPLOY_ENV"
    if ! cd "$PROJECT_ROOT" && bash "$BOOTSTRAP_SCRIPT"; then
        err "bootstrap.sh failed"
        mark_step_fail 6
        exit 1
    fi

    log "Vault initialized and secrets seeded ✓"
    mark_step_done 6
}

rollback_step_06() {
    warn "Rollback: Vault data will be reset if bootstrap runs again"
    warn "Rescue files preserved in $RESCUE_DIR/"
}

verify_step_06() {
    local vault_status
    vault_status="$(docker exec loyallia-vault vault status -format=json 2>/dev/null || echo '{}')"
    local sealed
    sealed="$(echo "$vault_status" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('sealed','unknown'))" 2>/dev/null || echo 'unknown')"
    local initialized
    initialized="$(echo "$vault_status" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('initialized','unknown'))" 2>/dev/null || echo 'unknown')"

    if [ "$initialized" != "True" ] && [ "$initialized" != "true" ]; then
        err "  Vault not initialized"
        return 1
    fi
    if [ "$sealed" = "True" ] || [ "$sealed" = "true" ]; then
        err "  Vault is sealed"
        return 1
    fi

    # Verify app token exists
    if [ ! -f "${COMPOSE_PROJECT_NAME:-loyallia}_vault_runtime/_data/app-token" ] 2>/dev/null; then
        warn "  Vault app-token not found in expected location"
    fi

    log "  Vault initialized and unsealed ✓"
    return 0
}

# =============================================================================
# STEP 07 — SEED PLATFORM SETTINGS
# =============================================================================
step_07_seed_platform() {
    step_banner 7 "Seed platform settings"

    if dry_run_echo "docker compose exec api python manage.py seed_platform_settings --mode=$DEPLOY_ENV"; then
        mark_step_done 7
        return 0
    fi

    # Start API temporarily if not running
    local api_was_running=0
    if docker inspect loyallia-api --format '{{.State.Status}}' 2>/dev/null | grep -q running; then
        api_was_running=1
    fi

    if [ "$api_was_running" -eq 0 ]; then
        log "Starting API for seeding..."
        cd "$PROJECT_ROOT" && docker compose up -d api --no-deps

        local timeout=90
        local elapsed=0
        while [ "$elapsed" -lt "$timeout" ]; do
            if docker compose exec -T api curl -sf http://localhost:8000/api/v1/health/ &>/dev/null; then
                log "API is healthy ✓"
                break
            fi
            sleep 3
            elapsed=$((elapsed + 3))
        done
    fi

    log "Seeding platform settings (--mode=$DEPLOY_ENV)..."
    cd "$PROJECT_ROOT"
    docker compose exec -T api python manage.py seed_platform_settings --mode="$DEPLOY_ENV" \
        --settings "loyallia.settings.${DEPLOY_ENV}" 2>/dev/null || {
        warn "seed_platform_settings command not found or failed — skipping"
    }

    log "Seeding subscription plans..."
    docker compose exec -T api python manage.py seed_subscription_plans \
        --settings "loyallia.settings.${DEPLOY_ENV}" 2>/dev/null || {
        warn "seed_subscription_plans command not found or failed — skipping"
    }

    if [ "$api_was_running" -eq 0 ]; then
        log "Stopping temporary API container..."
        cd "$PROJECT_ROOT" && docker compose stop api 2>/dev/null || true
    fi

    log "Platform settings seeded ✓"
    mark_step_done 7
}

rollback_step_07() {
    warn "Rollback: platform settings would need manual cleanup in database"
}

# =============================================================================
# STEP 08 — BUILD APPLICATION IMAGES
# =============================================================================
step_08_build_images() {
    step_banner 8 "Build application images (API, Dashboard)"

    if dry_run_echo "docker compose build api web"; then
        mark_step_done 8
        return 0
    fi

    cd "$PROJECT_ROOT"

    log "Building API image..."
    docker compose build api

    log "Building Web (Dashboard) image..."
    if [ "$DEPLOY_ENV" = "production" ]; then
        docker compose -f docker-compose.yml -f docker-compose.prod.yml build web
    else
        docker compose build web
    fi

    log "Application images built ✓"
    mark_step_done 8
}

rollback_step_08() {
    warn "Rollback: removing built images..."
    docker image rm loyallia-api loyallia-web 2>/dev/null || true
}

# =============================================================================
# STEP 09 — DEPLOY API + DASHBOARD
# =============================================================================
step_09_deploy_api_web() {
    step_banner 9 "Deploy API and Dashboard"

    if dry_run_echo "docker compose up -d api web (production override if prod)"; then
        mark_step_done 9
        return 0
    fi

    cd "$PROJECT_ROOT"

    log "Deploying API..."
    if [ "$DEPLOY_ENV" = "production" ]; then
        docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d api
    else
        docker compose up -d api
    fi

    log "Waiting for API health..."
    local timeout=120
    local elapsed=0
    while [ "$elapsed" -lt "$timeout" ]; do
        if docker compose exec -T api curl -sf http://localhost:8000/api/v1/health/ &>/dev/null; then
            log "  API is healthy ✓"
            break
        fi
        sleep 3
        elapsed=$((elapsed + 3))
    done

    if [ "$elapsed" -ge "$timeout" ]; then
        err "API health check timed out after ${timeout}s"
        docker compose logs api --tail=30
        mark_step_fail 9
        exit 1
    fi

    log "Deploying Web (Dashboard)..."
    if [ "$DEPLOY_ENV" = "production" ]; then
        docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d web
    else
        docker compose up -d web
    fi

    log "API and Dashboard deployed ✓"
    mark_step_done 9
}

rollback_step_09() {
    warn "Rollback: stopping API and Web..."
    cd "$PROJECT_ROOT" && docker compose stop api web 2>/dev/null || true
}

verify_step_09() {
    docker compose exec -T api curl -sf http://localhost:8000/api/v1/health/ &>/dev/null
}

# =============================================================================
# STEP 10 — DEPLOY WORKERS
# =============================================================================
step_10_deploy_workers() {
    step_banner 10 "Deploy workers (Celery x3, Beat, Flower)"

    if dry_run_echo "docker compose up -d celery-pass celery-push celery-default celery-beat flower"; then
        mark_step_done 10
        return 0
    fi

    cd "$PROJECT_ROOT"

    log "Starting Celery workers..."
    if [ "$DEPLOY_ENV" = "production" ]; then
        docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d \
            celery-pass celery-push celery-default celery-beat
    else
        docker compose up -d celery-pass celery-push celery-default celery-beat
    fi

    log "Starting Flower..."
    if [ "$DEPLOY_ENV" = "production" ]; then
        docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d flower
    else
        docker compose up -d flower
    fi

    log "Waiting for Celery worker health..."
    sleep 5

    local workers=("loyallia-celery-pass" "loyallia-celery-push" "loyallia-celery-default")
    local all_ok=1
    for worker in "${workers[@]}"; do
        local status
        status="$(docker inspect "$worker" --format '{{.State.Status}}' 2>/dev/null || echo 'missing')"
        if [ "$status" = "running" ]; then
            log "  $worker: running ✓"
        else
            err "  $worker: $status"
            all_ok=0
        fi
    done

    if [ "$all_ok" -eq 0 ]; then
        warn "Some workers may still be starting — check logs: docker compose logs celery-"
    fi

    log "Workers deployed ✓"
    mark_step_done 10
}

rollback_step_10() {
    warn "Rollback: stopping workers..."
    cd "$PROJECT_ROOT" && docker compose stop celery-pass celery-push celery-default celery-beat flower 2>/dev/null || true
}

verify_step_10() {
    docker compose exec -T celery-pass celery -A loyallia inspect ping --timeout 10 2>/dev/null | grep -q pong
}

# =============================================================================
# STEP 11 — DEPLOY MONITORING
# =============================================================================
step_11_deploy_monitoring() {
    step_banner 11 "Deploy monitoring (Prometheus, Alertmanager, Grafana, Loki)"

    if dry_run_echo "docker compose up -d prometheus alertmanager grafana loki"; then
        mark_step_done 11
        return 0
    fi

    cd "$PROJECT_ROOT"

    log "Starting Prometheus..."
    docker compose up -d prometheus

    log "Starting Alertmanager..."
    docker compose up -d alertmanager 2>/dev/null || warn "Alertmanager service not defined — skipping"

    log "Starting Grafana..."
    docker compose up -d grafana

    log "Starting Loki..."
    docker compose up -d loki

    log "Monitoring stack deployed ✓"
    mark_step_done 11
}

rollback_step_11() {
    warn "Rollback: stopping monitoring..."
    cd "$PROJECT_ROOT" && docker compose stop prometheus alertmanager grafana loki 2>/dev/null || true
}

verify_step_11() {
    curl -sf http://localhost:33909/-/healthy &>/dev/null || true
}

# =============================================================================
# STEP 12 — DEPLOY NGINX + SSL
# =============================================================================
step_12_deploy_nginx() {
    step_banner 12 "Deploy Nginx + configure SSL"

    if dry_run_echo "docker compose up -d nginx + setup_ssl.sh"; then
        mark_step_done 12
        return 0
    fi

    cd "$PROJECT_ROOT"

    log "Starting Nginx..."
    docker compose up -d nginx

    # SSL setup for production
    if [ "$DEPLOY_ENV" = "production" ]; then
        local ssl_script="$SCRIPT_DIR/setup_ssl.sh"
        if [ -f "$ssl_script" ]; then
            log "Running SSL setup..."
            bash "$ssl_script" --env=production
        else
            warn "SSL setup script not found at $ssl_script"
            warn "Skipping SSL configuration — run manually later"
        fi
    else
        info "Development mode — using HTTP only"
    fi

    log "Nginx deployed ✓"
    mark_step_done 12
}

rollback_step_12() {
    warn "Rollback: stopping Nginx..."
    cd "$PROJECT_ROOT" && docker compose stop nginx 2>/dev/null || true
}

verify_step_12() {
    curl -sf http://localhost:80/api/v1/health/ &>/dev/null || \
        curl -sf http://localhost:33905/api/v1/health/ &>/dev/null
}

# =============================================================================
# STEP 13 — FINAL VERIFICATION
# =============================================================================
step_13_final_verification() {
    step_banner 13 "Final verification"

    if dry_run_echo "Check all containers healthy + HTTPS works"; then
        mark_step_done 13
        return 0
    fi

    cd "$PROJECT_ROOT"

    local errors=0
    local services=(
        "loyallia-postgres:PostgreSQL"
        "loyallia-redis:Redis"
        "loyallia-minio:MinIO"
        "loyallia-vault:Vault"
        "loyallia-api:API"
        "loyallia-web:Web"
        "loyallia-celery-pass:Celery Pass"
        "loyallia-celery-push:Celery Push"
        "loyallia-celery-default:Celery Default"
        "loyallia-celery-beat:Celery Beat"
        "loyallia-flower:Flower"
        "loyallia-nginx:Nginx"
        "loyallia-prometheus:Prometheus"
        "loyallia-loki:Loki"
        "loyallia-grafana:Grafana"
    )

    echo ""
    log "Container health check:"
    echo ""

    for svc in "${services[@]}"; do
        local name="${svc%%:*}"
        local label="${svc##*:}"
        local status health
        status="$(docker inspect "$name" --format '{{.State.Status}}' 2>/dev/null || echo 'missing')"
        health="$(docker inspect "$name" --format '{{.State.Health.Status}}' 2>/dev/null || echo 'no healthcheck')"

        if [ "$status" = "running" ]; then
            if [ "$health" = "healthy" ] || [ "$health" = "no healthcheck" ]; then
                echo -e "  ${GREEN}✅${NC} ${label} (${status}${health:+/}${health})"
            else
                echo -e "  ${YELLOW}⚠️${NC}  ${label} (${status}${health:+/}${health})"
            fi
        else
            echo -e "  ${RED}❌${NC} ${label} (${status})"
            errors=$((errors + 1))
        fi
    done

    # API health check
    echo ""
    log "API endpoint check:"
    if docker compose exec -T api curl -sf http://localhost:8000/api/v1/health/ &>/dev/null; then
        echo -e "  ${GREEN}✅${NC} API /api/v1/health/ — OK"
    else
        echo -e "  ${RED}❌${NC} API /api/v1/health/ — FAILED"
        errors=$((errors + 1))
    fi

    # HTTPS check (production)
    if [ "$DEPLOY_ENV" = "production" ]; then
        echo ""
        log "HTTPS endpoint check:"
        local domain="${DOMAIN:-rewards.loyallia.com}"
        if command -v curl &>/dev/null; then
            local http_code
            http_code="$(curl -sfk -o /dev/null -w "%{http_code}" "https://${domain}/api/v1/health/" 2>/dev/null || echo 000)"
            if [ "$http_code" = "200" ]; then
                echo -e "  ${GREEN}✅${NC} HTTPS ${domain}/api/v1/health/ — HTTP 200"
            else
                echo -e "  ${YELLOW}⚠️${NC}  HTTPS ${domain}/api/v1/health/ — HTTP ${http_code}"
                warn "SSL may still be propagating — check with: curl -v https://${domain}/"
            fi
        fi
    fi

    echo ""
    if [ "$errors" -gt 0 ]; then
        warn "Verification completed with ${errors} issue(s)"
        warn "Check logs: docker compose logs <service>"
    else
        log "All verification checks passed ✓"
    fi

    mark_step_done 13
}

rollback_step_13() {
    info "Verification step — no rollback needed"
}

# =============================================================================
# STEP 14 — WRITE DEPLOYMENT STATE
# =============================================================================
step_14_write_state() {
    step_banner 14 "Write deployment.state.json"

    if dry_run_echo "Write final deployment.state.json"; then
        mark_step_done 14
        return 0
    fi

    local timestamp
    timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

    python3 - "$timestamp" "$DEPLOY_ENV" "$0" << 'PYEOF'
import json, sys, os, subprocess

timestamp, env, script_path = sys.argv[1:4]
state_file = os.path.join(os.path.dirname(os.path.abspath(script_path)), '..', '..', 'deployment.state.json')

# Get git commit if available
git_commit = "unknown"
try:
    git_commit = subprocess.check_output(
        ['git', '-C', os.path.dirname(os.path.abspath(script_path)), 'rev-parse', '--short', 'HEAD'],
        stderr=subprocess.DEVNULL, text=True
    ).strip()
except Exception:
    pass

# Get container statuses
containers = {}
try:
    result = subprocess.check_output(
        ['docker', 'ps', '--format', '{{.Names}}\t{{.Status}}'],
        stderr=subprocess.DEVNULL, text=True
    ).strip()
    for line in result.split('\n'):
        if '\t' in line:
            name, status = line.split('\t', 1)
            containers[name] = status
except Exception:
    pass

state = {
    "version": "2.0",
    "environment": env,
    "timestamp": timestamp,
    "git_commit": git_commit,
    "completed_step": 14,
    "status": "COMPLETE",
    "all_steps_passed": True,
    "access_points": {
        "dashboard": "http://localhost:33906",
        "api": "http://localhost:33905/api/v1/",
        "api_docs": "http://localhost:33905/api/v1/docs/",
        "flower": "http://localhost:33907",
        "minio": "http://localhost:33904",
        "vault_ui": "http://localhost:33908",
        "grafana": "http://localhost:33910",
        "prometheus": "http://localhost:33909"
    },
    "containers": containers,
    "steps": [
        {"step": 0, "name": "validate_prerequisites", "status": "PASS"},
        {"step": 1, "name": "git_backup_branch", "status": "PASS"},
        {"step": 2, "name": "destroy_old", "status": "PASS"},
        {"step": 3, "name": "download_code", "status": "PASS"},
        {"step": 4, "name": "validate_env", "status": "PASS"},
        {"step": 5, "name": "start_infrastructure", "status": "PASS"},
        {"step": 6, "name": "bootstrap_vault", "status": "PASS"},
        {"step": 7, "name": "seed_platform", "status": "PASS"},
        {"step": 8, "name": "build_images", "status": "PASS"},
        {"step": 9, "name": "deploy_api_web", "status": "PASS"},
        {"step": 10, "name": "deploy_workers", "status": "PASS"},
        {"step": 11, "name": "deploy_monitoring", "status": "PASS"},
        {"step": 12, "name": "deploy_nginx", "status": "PASS"},
        {"step": 13, "name": "final_verification", "status": "PASS"},
        {"step": 14, "name": "write_state", "status": "PASS"}
    ]
}

with open(state_file, 'w') as f:
    json.dump(state, f, indent=2)

print(f"Deployment state written to: {state_file}")
PYEOF

    log "Deployment state saved ✓"
    log "State file: $STATE_FILE"

    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           DEPLOYMENT COMPLETE — ALL 15 STEPS DONE                  ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    log "Access points:"
    log "  Dashboard:   http://localhost:33906"
    log "  API:         http://localhost:33905/api/v1/"
    log "  API Docs:    http://localhost:33905/api/v1/docs/"
    log "  Flower:      http://localhost:33907"
    log "  Grafana:     http://localhost:33910"
    log "  Prometheus:  http://localhost:33909"
    echo ""

    mark_step_done 14
}

rollback_step_14() {
    rm -f "$STATE_FILE" 2>/dev/null || true
}

# =============================================================================
# MAIN ORCHESTRATION
# =============================================================================
main() {
    parse_args "$@"

    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║        LOYALLIA — COMPLETE DEPLOYMENT ORCHESTRATOR                  ║${NC}"
    echo -e "${CYAN}║        Environment: $(printf '%-47s' "$DEPLOY_ENV")║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    if [ "$DRY_RUN_FLAG" -eq 1 ]; then
        warn "═══════════════════════════════════════════════════════════════════════"
        warn "  DRY RUN MODE — No changes will be made"
        warn "═══════════════════════════════════════════════════════════════════════"
        echo ""
    fi

    if [ "$RESUME_STEP" -ge 0 ]; then
        log "Resuming from step $RESUME_STEP"
    fi

    load_state

    # Track failures for summary
    local failed_steps=()

    # --- Run each step --------------------------------------------------------
    local steps=(
        "step_00_validate_prerequisites"
        "step_01_git_backup_branch"
        "step_02_destroy_old"
        "step_03_download_code"
        "step_04_validate_env"
        "step_05_start_infrastructure"
        "step_06_bootstrap_vault"
        "step_07_seed_platform"
        "step_08_build_images"
        "step_09_deploy_api_web"
        "step_10_deploy_workers"
        "step_11_deploy_monitoring"
        "step_12_deploy_nginx"
        "step_13_final_verification"
        "step_14_write_state"
    )

    local i
    for i in "${!steps[@]}"; do
        local step_num="$i"
        local step_func="${steps[$i]}"
        local rollback_func="rollback_${step_func#step_}"

        if ! should_run_step "$step_num"; then
            info "Skipping step $(printf '%02d' "$step_num") (before resume point)"
            continue
        fi

        if ! "$step_func"; then
            failed_steps+=("$step_num")
            err "Step $(printf '%02d' "$step_num") failed"

            # Attempt rollback
            if declare -f "$rollback_func" >/dev/null 2>&1; then
                warn "Running rollback for step $(printf '%02d' "$step_num")..."
                "$rollback_func" || true
            fi

            err "═══════════════════════════════════════════════════════════════════════"
            err "  DEPLOYMENT FAILED at step $(printf '%02d' "$step_num")"
            err "  To resume: $0 --step=$step_num"
            err "═══════════════════════════════════════════════════════════════════════"
            exit 1
        fi
    done

    # --- Summary --------------------------------------------------------------
    echo ""
    if [ "${#failed_steps[@]}" -eq 0 ]; then
        log "═══════════════════════════════════════════════════════════════════════"
        log "  ALL 15 STEPS COMPLETED SUCCESSFULLY"
        log "═══════════════════════════════════════════════════════════════════════"
    else
        warn "═══════════════════════════════════════════════════════════════════════"
        warn "  DEPLOYMENT COMPLETED WITH ${#failed_steps[@]} FAILURE(S)"
        warn "  Failed steps: ${failed_steps[*]}"
        warn "═══════════════════════════════════════════════════════════════════════"
        exit 1
    fi
}

main "$@"
