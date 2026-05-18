#!/usr/bin/env bash
# =============================================================================
# LOYALLIA — STRIPE INTEGRATION SETUP (FUTURE USE / DELAYED)
# =============================================================================
# Placeholder for Stripe payment integration.
#
# This script is intentionally minimal — Stripe integration is NOT active
# in the initial deployment. When the business is ready:
#
#   1. Obtain Stripe API keys (publishable key + secret key)
#   2. Run: ./deploy/bootstrap/add-stripe.sh
#
# Actions when ready:
#   1. Generate Stripe secrets (or read from prompt)
#   2. Write to Vault (secret/data/loyallia/production)
#   3. Set sandbox_payments=false
#   4. Restart API container
#
# Usage:
#   ./deploy/bootstrap/add-stripe.sh [OPTIONS]
#
# Options:
#   --live                         Configure for live payments (default: sandbox)
#   --from-env                     Read STRIPE_SECRET_KEY from environment
#   --help                         Show this help
#
# Prerequisites:
#   - Vault must be running and unsealed
#   - API container must be running
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# --- Colours ------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()   { echo -e "${GREEN}[stripe]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $*"; }
err()   { echo -e "${RED}[error]${NC} $*" >&2; }
info()  { echo -e "${CYAN}[info]${NC} $*"; }

# --- CLI ----------------------------------------------------------------------
LIVE_MODE=0
FROM_ENV=0

parse_args() {
    for arg in "$@"; do
        case "$arg" in
            --live)
                LIVE_MODE=1
                ;;
            --from-env)
                FROM_ENV=1
                ;;
            --help|-h)
                sed -n '/^# ===/,/^# ===/p' "$0" | sed 's/^# //;s/^#//'
                exit 0
                ;;
            *)
                err "Unknown argument: $arg"
                exit 1
                ;;
        esac
    done
}

# --- Placeholder message ------------------------------------------------------
show_placeholder() {
    echo ""
    echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  STRIPE INTEGRATION — PLACEHOLDER                                   ║${NC}"
    echo -e "${YELLOW}║                                                                     ║${NC}"
    echo -e "${YELLOW}║  Stripe integration is NOT yet active.                              ║${NC}"
    echo -e "${YELLOW}║                                                                     ║${NC}"
    echo -e "${YELLOW}║  When ready, obtain your Stripe API keys from:                      ║${NC}"
    echo -e "${YELLOW}║    https://dashboard.stripe.com/apikeys                             ║${NC}"
    echo -e "${YELLOW}║                                                                     ║${NC}"
    echo -e "${YELLOW}║  Then run this script with:                                         ║${NC}"
    echo -e "${YELLOW}║    ./deploy/bootstrap/add-stripe.sh --live                          ║${NC}"
    echo -e "${YELLOW}║                                                                     ║${NC}"
    echo -e "${YELLOW}║  Current payment gateway: manual (admin verification)               ║${NC}"
    echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    log "This script will:"
    log "  1. Prompt for Stripe API keys (or read from env)"
    log "  2. Write them securely to Vault"
    log "  3. Set payment_gateway_provider=stripe"
    log "  4. Set sandbox_payments=false (with --live)"
    log "  5. Restart the API container"
    echo ""
    log "To proceed, re-run with --from-env or edit this script."
}

# --- Main implementation (runs when --from-env or --live is set) -------------
configure_stripe() {
    log "Configuring Stripe integration..."

    # Verify Vault is accessible
    if ! docker inspect loyallia-vault --format '{{.State.Status}}' 2>/dev/null | grep -q running; then
        err "Vault container is not running"
        exit 1
    fi

    # Obtain root token
    local root_token
    root_token="$(docker exec loyallia-vault sh -c 'cat /vault/file/init.json' 2>/dev/null | \
        python3 -c 'import json,sys; print(json.load(sys.stdin)["root_token"])' 2>/dev/null || true)"

    if [ -z "$root_token" ]; then
        err "Cannot obtain Vault root token"
        exit 1
    fi

    # Get Stripe keys
    local stripe_secret_key stripe_publishable_key stripe_webhook_secret

    if [ "$FROM_ENV" -eq 1 ]; then
        stripe_secret_key="${STRIPE_SECRET_KEY:-}"
        stripe_publishable_key="${STRIPE_PUBLISHABLE_KEY:-}"
        stripe_webhook_secret="${STRIPE_WEBHOOK_SECRET:-}"

        if [ -z "$stripe_secret_key" ]; then
            err "STRIPE_SECRET_KEY not set in environment"
            exit 1
        fi
    else
        # Interactive mode
        echo ""
        read -rp "  Stripe Secret Key (sk_...): " stripe_secret_key
        read -rp "  Stripe Publishable Key (pk_...): " stripe_publishable_key
        read -rp "  Stripe Webhook Secret (whsec_...): " stripe_webhook_secret

        if [ -z "$stripe_secret_key" ]; then
            err "Stripe Secret Key is required"
            exit 1
        fi
    fi

    log "Writing Stripe secrets to Vault..."

    # Write to Vault
    docker exec -e VAULT_TOKEN="$root_token" loyallia-vault \
        vault kv patch -mount=secret "loyallia/production" \
        payment_gateway_provider="stripe" \
        stripe_secret_key="$stripe_secret_key" \
        stripe_publishable_key="$stripe_publishable_key" \
        stripe_webhook_secret="$stripe_webhook_secret" 2>/dev/null || {
        err "Failed to write Stripe secrets to Vault"
        exit 1
    }

    # Set sandbox mode
    if [ "$LIVE_MODE" -eq 1 ]; then
        log "Configuring LIVE mode..."
        docker exec -e VAULT_TOKEN="$root_token" loyallia-vault \
            vault kv patch -mount=secret "loyallia/production" \
            sandbox_payments="false" 2>/dev/null
    else
        log "Configuring SANDBOX mode (use --live for production)..."
        docker exec -e VAULT_TOKEN="$root_token" loyallia-vault \
            vault kv patch -mount=secret "loyallia/production" \
            sandbox_payments="true" 2>/dev/null
    fi

    # Restart API
    log "Restarting API container..."
    cd "$PROJECT_ROOT" && docker compose restart api 2>/dev/null || true

    log ""
    log "═══════════════════════════════════════════════════════════════════════"
    log "  STRIPE INTEGRATION CONFIGURED"
    log ""
    log "  Mode:       $([ "$LIVE_MODE" -eq 1 ] && echo 'LIVE' || echo 'SANDBOX')"
    log "  Provider:   stripe"
    log "  Vault path: secret/data/loyallia/production"
    log ""
    log "  Next steps:"
    log "  1. Verify API: docker compose logs api"
    log "  2. Test payment: create a test pass purchase"
    log "  3. Monitor:      http://localhost:33910 (Grafana)"
    log "═══════════════════════════════════════════════════════════════════════"
}

# =============================================================================
# MAIN
# =============================================================================
main() {
    parse_args "$@"

    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║        LOYALLIA — STRIPE INTEGRATION SETUP                          ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    if [ "$FROM_ENV" -eq 0 ] && [ "$LIVE_MODE" -eq 0 ]; then
        show_placeholder
        exit 0
    fi

    configure_stripe
}

main "$@"
