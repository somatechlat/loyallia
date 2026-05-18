#!/usr/bin/env bash
# =============================================================================
# LOYALLIA — DISASTER RECOVERY FROM RESCUE FILES
# =============================================================================
# Triggered when vault_init_rescue.json exists in the rescue directory.
#
# This script recovers the full Loyallia stack from rescue files:
#   1. Read and validate rescue files
#   2. Unseal Vault
#   3. Restore secrets from vault_secrets_rescue.json
#   4. Verify all services
#   5. Write recovery log
#
# Usage:
#   ./deploy/bootstrap/disaster_recovery/recover_from_rescue.sh [OPTIONS]
#
# Options:
#   --env=production|development   Target environment (default: production)
#   --dry-run                      Show what would happen
#   --help                         Show this help
#
# Prerequisites:
#   - vault_init_rescue.json   (Vault root token + unseal key)
#   - vault_secrets_rescue.json  (All KV secrets export)
#   Docker must be running.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RESCUE_DIR="$PROJECT_ROOT/.agents"
RECOVERY_LOG="$RESCUE_DIR/recovery.log"

# --- Colours ------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

log()   { echo -e "${GREEN}[recover]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $*"; }
err()   { echo -e "${RED}[error]${NC} $*" >&2; }
info()  { echo -e "${CYAN}[info]${NC} $*"; }
step_banner() {
    echo ""
    echo -e "${MAGENTA}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║  $1${NC}"
    echo -e "${MAGENTA}╚══════════════════════════════════════════════════════════════════════╝${NC}"
}

# --- CLI ----------------------------------------------------------------------
DEPLOY_ENV="production"
DRY_RUN=0

parse_args() {
    for arg in "$@"; do
        case "$arg" in
            --env=*)
                DEPLOY_ENV="${arg#*=}"
                ;;
            --dry-run)
                DRY_RUN=1
                ;;
            --help|-h)
                sed -n '/^# ===/,/^# ===/p' "$0" | sed 's/^# //;s/^#//'
                exit 0
                ;;
        esac
    done
}

# --- Step 1: Read and validate rescue files -----------------------------------
step_01_read_rescue() {
    step_banner "Step 1/6 — Read and validate rescue files"

    if [ "$DRY_RUN" -eq 1 ]; then
        info "[DRY-RUN] Would validate rescue files in $RESCUE_DIR"
        return 0
    fi

    log "Rescue directory: $RESCUE_DIR"

    if [ ! -d "$RESCUE_DIR" ]; then
        err "Rescue directory not found: $RESCUE_DIR"
        err ""
        err "Rescue files should have been created during the initial bootstrap."
        err "If they are stored elsewhere, copy them to $RESCUE_DIR and retry."
        exit 1
    fi

    # vault_init_rescue.json
    if [ ! -f "$RESCUE_DIR/vault_init_rescue.json" ]; then
        err "CRITICAL: vault_init_rescue.json not found in $RESCUE_DIR"
        err ""
        err "Without this file, the Vault root token and unseal keys are lost."
        err "Recovery is impossible without a manual Vault re-initialization."
        exit 1
    fi

    # vault_secrets_rescue.json
    if [ ! -f "$RESCUE_DIR/vault_secrets_rescue.json" ]; then
        err "CRITICAL: vault_secrets_rescue.json not found in $RESCUE_DIR"
        err ""
        err "Without this file, all secrets stored in Vault are lost."
        exit 1
    fi

    # Validate JSON structure
    local init_valid secrets_valid
    init_valid="$(python3 -c "
import json
with open('$RESCUE_DIR/vault_init_rescue.json') as f:
    d = json.load(f)
assert 'root_token' in d, 'Missing root_token'
assert 'unseal_keys_b64' in d, 'Missing unseal_keys_b64'
print('OK')
" 2>&1)"

    if [ "$init_valid" != "OK" ]; then
        err "vault_init_rescue.json is invalid: $init_valid"
        exit 1
    fi

    secrets_valid="$(python3 -c "
import json
with open('$RESCUE_DIR/vault_secrets_rescue.json') as f:
    d = json.load(f)
assert 'secrets' in d or 'data' in d, 'Missing secrets or data key'
print('OK')
" 2>&1)"

    if [ "$secrets_valid" != "OK" ]; then
        err "vault_secrets_rescue.json is invalid: $secrets_valid"
        exit 1
    fi

    local root_token_short
    root_token_short="$(python3 -c "
import json
with open('$RESCUE_DIR/vault_init_rescue.json') as f:
    d = json.load(f)
t = d.get('root_token', '')
print(t[:8] + '...' if len(t) > 8 else t)
" 2>/dev/null)"

    log "vault_init_rescue.json:    valid ✓ (root_token: $root_token_short)"
    log "vault_secrets_rescue.json: valid ✓"
}

# --- Step 2: Start Vault (if not running) -------------------------------------
step_02_start_vault() {
    step_banner "Step 2/6 — Start Vault container"

    if [ "$DRY_RUN" -eq 1 ]; then
        info "[DRY-RUN] Would start Vault container"
        return 0
    fi

    if docker inspect loyallia-vault --format '{{.State.Status}}' 2>/dev/null | grep -q running; then
        log "Vault is already running ✓"
        return 0
    fi

    cd "$PROJECT_ROOT"
    docker compose up -d vault

    local timeout=60
    local elapsed=0
    while [ "$elapsed" -lt "$timeout" ]; do
        if docker exec loyallia-vault wget --spider --quiet "http://127.0.0.1:8200/v1/sys/health?standbyok=true" 2>/dev/null; then
            log "Vault API is ready ✓"
            break
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done

    if [ "$elapsed" -ge "$timeout" ]; then
        err "Vault API not ready after ${timeout}s"
        docker logs loyallia-vault --tail=20
        exit 1
    fi
}

# --- Step 3: Unseal Vault -----------------------------------------------------
step_03_unseal_vault() {
    step_banner "Step 3/6 — Unseal Vault"

    if [ "$DRY_RUN" -eq 1 ]; then
        info "[DRY-RUN] Would unseal Vault with rescue key"
        return 0
    fi

    # Check seal status
    local seal_status
    seal_status="$(docker exec loyallia-vault wget -qO- "http://127.0.0.1:8200/v1/sys/seal-status" 2>/dev/null || echo '{}')"

    local is_sealed
    is_sealed="$(echo "$seal_status" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('sealed',True))" 2>/dev/null || echo "True")"

    if [ "$is_sealed" != "True" ]; then
        log "Vault is already unsealed ✓"
        return 0
    fi

    log "Vault is sealed — unsealing..."

    # Extract unseal key
    local unseal_key
    unseal_key="$(python3 -c "
import json
with open('$RESCUE_DIR/vault_init_rescue.json') as f:
    d = json.load(f)
print(d['unseal_keys_b64'][0])
" 2>/dev/null)"

    if [ -z "$unseal_key" ]; then
        err "Failed to extract unseal key from rescue file"
        exit 1
    fi

    # Unseal
    local unseal_result
    unseal_result="$(docker exec loyallia-vault vault operator unseal "$unseal_key" 2>/dev/null || true)"

    # Verify unsealed
    seal_status="$(docker exec loyallia-vault wget -qO- "http://127.0.0.1:8200/v1/sys/seal-status" 2>/dev/null || echo '{}')"
    is_sealed="$(echo "$seal_status" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('sealed',True))" 2>/dev/null || echo "True")"

    if [ "$is_sealed" != "True" ]; then
        log "Vault unsealed successfully ✓"
    else
        err "Failed to unseal Vault"
        exit 1
    fi
}

# --- Step 4: Restore secrets --------------------------------------------------
step_04_restore_secrets() {
    step_banner "Step 4/6 — Restore secrets from rescue file"

    if [ "$DRY_RUN" -eq 1 ]; then
        info "[DRY-RUN] Would import secrets into Vault KV"
        return 0
    fi

    # Extract root token
    local root_token
    root_token="$(python3 -c "
import json
with open('$RESCUE_DIR/vault_init_rescue.json') as f:
    d = json.load(f)
print(d['root_token'])
" 2>/dev/null)"

    if [ -z "$root_token" ]; then
        err "Failed to extract root token from rescue file"
        exit 1
    fi

    # Enable KV v2 if needed
    docker exec -e VAULT_TOKEN="$root_token" loyallia-vault \
        vault secrets enable -path=secret kv-v2 2>/dev/null || true

    # Copy rescue secrets into Vault container
    docker cp "$RESCUE_DIR/vault_secrets_rescue.json" loyallia-vault:/tmp/rescue_secrets.json 2>/dev/null

    # Import secrets
    log "Importing secrets into Vault KV..."
    docker exec -e VAULT_TOKEN="$root_token" loyallia-vault sh -c '
        python3 -c "
import json
with open(\"/tmp/rescue_secrets.json\") as f:
    data = json.load(f)
secrets = data.get(\"secrets\", data)
if \"_meta\" in secrets:
    secrets.pop(\"_meta\", None)
output = {\"data\": secrets}
with open(\"/tmp/import_clean.json\", \"w\") as f:
    json.dump(output, f)
" 2>/dev/null
    ' >/dev/null

    local kv_path="loyallia/$DEPLOY_ENV"
    docker exec -e VAULT_TOKEN="$root_token" loyallia-vault \
        vault kv put -mount=secret "$kv_path" @/tmp/import_clean.json 2>/dev/null

    # Clean up temp files
    docker exec loyallia-vault rm -f /tmp/rescue_secrets.json /tmp/import_clean.json 2>/dev/null || true

    # Verify import
    local secret_count
    secret_count="$(docker exec -e VAULT_TOKEN="$root_token" loyallia-vault \
        vault kv get -mount=secret -format=json "$kv_path" 2>/dev/null | \
        python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('data',{}).get('data',{})))" 2>/dev/null || echo 0)"

    log "Restored $secret_count secrets to secret/$kv_path ✓"

    # Regenerate runtime files
    log "Regenerating Vault runtime files..."
    docker exec -e VAULT_TOKEN="$root_token" loyallia-vault sh -c '
        mkdir -p /vault/runtime
        chmod 0755 /vault/runtime
    '

    # Re-apply app policy and token
    docker exec -e VAULT_TOKEN="$root_token" loyallia-vault sh -c '
        if [ -f /vault/runtime/loyallia-app.hcl ]; then
            vault policy write loyallia-app /vault/runtime/loyallia-app.hcl 2>/dev/null || true
        fi
        if [ ! -s /vault/runtime/app-token ]; then
            vault token create -policy=loyallia-app -field=token >/vault/runtime/app-token 2>/dev/null || true
            chmod 0600 /vault/runtime/app-token 2>/dev/null || true
        fi
    ' 2>/dev/null || true

    log "Runtime files regenerated ✓"
}

# --- Step 5: Verify services --------------------------------------------------
step_05_verify_services() {
    step_banner "Step 5/6 — Verify all services"

    if [ "$DRY_RUN" -eq 1 ]; then
        info "[DRY-RUN] Would check service health"
        return 0
    fi

    cd "$PROJECT_ROOT"

    # Start infrastructure
    log "Starting infrastructure services..."
    docker compose up -d postgres redis minio minio-init 2>/dev/null || true

    # Wait for PostgreSQL
    local timeout=60
    local elapsed=0
    while [ "$elapsed" -lt "$timeout" ]; do
        if docker compose exec -T postgres pg_isready -U loyallia -d loyallia &>/dev/null; then
            log "  PostgreSQL: ready ✓"
            break
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done

    # Wait for Redis
    elapsed=0
    while [ "$elapsed" -lt "$timeout" ]; do
        if docker compose exec -T redis sh -c 'redis-cli ping' 2>/dev/null | grep -q PONG; then
            log "  Redis: ready ✓"
            break
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done

    # Start and verify API
    log "Starting API..."
    docker compose up -d api --no-deps 2>/dev/null || true

    timeout=90
    elapsed=0
    while [ "$elapsed" -lt "$timeout" ]; do
        if docker compose exec -T api curl -sf http://localhost:8000/api/v1/health/ &>/dev/null; then
            log "  API: healthy ✓"
            break
        fi
        sleep 3
        elapsed=$((elapsed + 3))
    done

    log "Service verification complete ✓"
}

# --- Step 6: Write recovery log -----------------------------------------------
step_06_write_log() {
    step_banner "Step 6/6 — Write recovery log"

    if [ "$DRY_RUN" -eq 1 ]; then
        info "[DRY-RUN] Would write recovery log to $RECOVERY_LOG"
        return 0
    fi

    local timestamp
    timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

    {
        echo "# Loyallia Disaster Recovery Log"
        echo "timestamp: $timestamp"
        echo "environment: $DEPLOY_ENV"
        echo "rescue_dir: $RESCUE_DIR"
        echo ""
        echo "## Files Used"
        ls -la "$RESCUE_DIR"/vault_*_rescue.json 2>/dev/null || true
        echo ""
        echo "## Vault Status"
        docker exec loyallia-vault wget -qO- "http://127.0.0.1:8200/v1/sys/health?standbyok=true" 2>/dev/null || true
        echo ""
        echo "## Running Containers"
        docker ps --filter name=loyallia --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || true
        echo ""
        echo "## Recovery Steps"
        echo "1. ✓ Read rescue files"
        echo "2. ✓ Start Vault"
        echo "3. ✓ Unseal Vault"
        echo "4. ✓ Restore secrets"
        echo "5. ✓ Verify services"
        echo "6. ✓ Write recovery log"
    } > "$RECOVERY_LOG"

    chmod 0600 "$RECOVERY_LOG"

    log "Recovery log written to: $RECOVERY_LOG"
    echo ""
    log "═══════════════════════════════════════════════════════════════════════"
    log "  DISASTER RECOVERY COMPLETE"
    log ""
    log "  Next steps:"
    log "  1. Verify API:  curl http://localhost:33905/api/v1/health/"
    log "  2. Check Vault: docker exec loyallia-vault vault status"
    log "  3. Review log:  cat $RECOVERY_LOG"
    log "═══════════════════════════════════════════════════════════════════════"
}

# =============================================================================
# MAIN
# =============================================================================
main() {
    parse_args "$@"

    echo ""
    echo -e "${MAGENTA}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║  LOYALLIA — DISASTER RECOVERY FROM RESCUE FILES                    ║${NC}"
    echo -e "${MAGENTA}║  Recovers Vault secrets and infrastructure after total loss        ║${NC}"
    echo -e "${MAGENTA}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    if [ "$DRY_RUN" -eq 1 ]; then
        warn "═══════════════════════════════════════════════════════════════════════"
        warn "  DRY RUN MODE — No changes will be made"
        warn "═══════════════════════════════════════════════════════════════════════"
        echo ""
    fi

    step_01_read_rescue
    step_02_start_vault
    step_03_unseal_vault
    step_04_restore_secrets
    step_05_verify_services
    step_06_write_log

    log "Recovery sequence complete."
}

main "$@"
