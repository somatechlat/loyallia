#!/usr/bin/env bash
# =============================================================================
# Secret Rotation Procedures — LYL-H-INFRA-016
# Rotates secrets in Vault KV v2 and updates running services.
#
# Usage:
#   ./deploy/scripts/rotate_secrets.sh [--dry-run] [--secret NAME]
#
# Secrets managed:
#   - SECRET_KEY (Django)
#   - POSTGRES_PASSWORD
#   - REDIS_PASSWORD
#   - MINIO_ROOT_PASSWORD
#   - JWT_SECRET_KEY
#   - PASS_HMAC_SECRET
#   - FLOWER_BASIC_AUTH
#
# Prerequisites:
#   - VAULT_ADDR and VAULT_TOKEN set in environment
#   - vault CLI installed
#   - docker compose available
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VAULT_PATH="secret/data/loyallia"
DRY_RUN=false
SPECIFIC_SECRET=""
BACKUP_DIR="$PROJECT_ROOT/deploy/backups/secret-snapshots"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[rotate]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err() { echo -e "${RED}[error]${NC} $*" >&2; }

usage() {
    echo "Usage: $0 [--dry-run] [--secret NAME]"
    echo ""
    echo "Options:"
    echo "  --dry-run     Show what would be rotated without making changes"
    echo "  --secret NAME Rotate only the specified secret"
    echo ""
    echo "Available secrets:"
    echo "  secret_key, postgres_password, redis_password,"
    echo "  minio_root_password, jwt_secret_key, pass_hmac_secret,"
    echo "  flower_basic_auth"
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run) DRY_RUN=true; shift ;;
        --secret) SPECIFIC_SECRET="$2"; shift 2 ;;
        --help|-h) usage ;;
        *) err "Unknown option: $1"; usage ;;
    esac
done

# Validate prerequisites
command -v vault >/dev/null 2>&1 || { err "vault CLI not found"; exit 1; }
command -v docker >/dev/null 2>&1 || { err "docker not found"; exit 1; }
[[ -z "${VAULT_ADDR:-}" ]] && { err "VAULT_ADDR not set"; exit 1; }
[[ -z "${VAULT_TOKEN:-}" ]] && { err "VAULT_TOKEN not set"; exit 1; }

# Generate a cryptographically secure random string
generate_secret() {
    local length="${1:-32}"
    python3 -c "import secrets; print(secrets.token_urlsafe($length))"
}

# Generate a Django-compatible secret key
generate_django_secret_key() {
    python3 -c "
from django.core.management.utils import get_random_secret_key
print(get_random_secret_key())
" 2>/dev/null || python3 -c "import secrets; print(secrets.token_urlsafe(50))"
}

# Backup current secrets snapshot
backup_secrets() {
    mkdir -p "$BACKUP_DIR"
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/secrets_${timestamp}.json"
    
    log "Backing up current secrets to $backup_file"
    if [[ "$DRY_RUN" == false ]]; then
        vault kv get -format=json "$VAULT_PATH" > "$backup_file" 2>/dev/null || true
        chmod 600 "$backup_file"
        log "Backup saved (permissions: 600)"
    else
        log "[DRY RUN] Would backup to $backup_file"
    fi
}

# Rotate a single secret in Vault
rotate_secret() {
    local name="$1"
    local value="$2"
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would rotate: $name"
        return
    fi
    
    log "Rotating: $name"
    vault kv patch "$VAULT_PATH" "$name=$value"
}

# Restart dependent services
restart_services() {
    local secret_name="$1"
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would restart services for: $secret_name"
        return
    fi
    
    case "$secret_name" in
        secret_key|jwt_secret_key)
            log "Restarting API + Celery workers..."
            cd "$PROJECT_ROOT"
            docker compose restart api celery-pass celery-push celery-default celery-beat
            ;;
        postgres_password)
            warn "PostgreSQL password rotation requires coordinated restart of ALL services."
            warn "Run: docker compose down && docker compose up -d"
            warn "This causes downtime. Schedule during maintenance window."
            ;;
        redis_password)
            warn "Redis password rotation requires coordinated restart of ALL services."
            cd "$PROJECT_ROOT"
            docker compose restart redis api celery-pass celery-push celery-default celery-beat flower
            ;;
        minio_root_password)
            log "Restarting API + MinIO..."
            cd "$PROJECT_ROOT"
            docker compose restart minio api
            ;;
        flower_basic_auth)
            log "Restarting Flower..."
            cd "$PROJECT_ROOT"
            docker compose restart flower
            ;;
        pass_hmac_secret)
            log "Restarting API + Celery pass worker..."
            cd "$PROJECT_ROOT"
            docker compose restart api celery-pass
            ;;
    esac
}

# Main rotation logic
main() {
    log "Starting secret rotation..."
    log "Vault: $VAULT_ADDR"
    log "Dry run: $DRY_RUN"
    echo ""
    
    backup_secrets
    echo ""
    
    # Define secrets and their generators
    declare -A SECRETS
    SECRETS[secret_key]="generate_django_secret_key"
    SECRETS[postgres_password]="generate_secret 24"
    SECRETS[redis_password]="generate_secret 24"
    SECRETS[minio_root_password]="generate_secret 24"
    SECRETS[jwt_secret_key]="generate_secret 32"
    SECRETS[pass_hmac_secret]="generate_secret 32"
    SECRETS[flower_basic_auth]="echo loyallia:$(generate_secret 16)"
    
    if [[ -n "$SPECIFIC_SECRET" ]]; then
        if [[ -z "${SECRETS[$SPECIFIC_SECRET]:-}" ]]; then
            err "Unknown secret: $SPECIFIC_SECRET"
            err "Available: ${!SECRETS[*]}"
            exit 1
        fi
        local generator="${SECRETS[$SPECIFIC_SECRET]}"
        local new_value
        new_value=$(eval "$generator")
        rotate_secret "$SPECIFIC_SECRET" "$new_value"
        restart_services "$SPECIFIC_SECRET"
    else
        log "Rotating ALL secrets..."
        for name in "${!SECRETS[@]}"; do
            local generator="${SECRETS[$name]}"
            local new_value
            new_value=$(eval "$generator")
            rotate_secret "$name" "$new_value"
        done
        echo ""
        warn "All secrets rotated. Full service restart required:"
        warn "  cd $PROJECT_ROOT && docker compose down && docker compose up -d"
    fi
    
    echo ""
    log "Rotation complete."
    echo ""
    log "Post-rotation checklist:"
    log "  1. Verify services are healthy: docker compose ps"
    log "  2. Test API: curl http://localhost:33905/api/v1/health/"
    log "  3. Update .env file with new values (for local dev)"
    log "  4. Clean up old backups: find $BACKUP_DIR -mtime +30 -delete"
}

main
