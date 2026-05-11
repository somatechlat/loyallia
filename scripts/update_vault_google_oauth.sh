#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Loyallia — Update Vault with Google OAuth Credentials (PRODUCTION)
# ═══════════════════════════════════════════════════════════════════════════════
# Run this script ON THE PRODUCTION SERVER as root.
# It reads the Vault root token from the init file and writes the Google OAuth
# client_id and client_secret into Vault. NO secrets are ever stored in files.
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

VAULT_INIT_FILE="/var/lib/docker/volumes/loyallia_vault_data/_data/init.json"
VAULT_ADDR="http://vault:8200"

# ── Validate root token exists ────────────────────────────────────────────────
if [[ ! -f "$VAULT_INIT_FILE" ]]; then
    echo "ERROR: Vault init file not found at $VAULT_INIT_FILE"
    exit 1
fi

ROOT_TOKEN=$(jq -r '.root_token' "$VAULT_INIT_FILE")
if [[ -z "$ROOT_TOKEN" || "$ROOT_TOKEN" == "null" ]]; then
    echo "ERROR: Could not extract root_token from $VAULT_INIT_FILE"
    exit 1
fi

echo "✓ Vault root token loaded"

# ── Update Google OAuth secrets in Vault ──────────────────────────────────────
# These values are provided by the user at runtime and NEVER hardcoded here.
# The script will prompt for them interactively.

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "  GOOGLE OAUTH — PRODUCTION CREDENTIALS"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "Enter your PRODUCTION Google OAuth Client ID:"
echo "  (e.g. 367101333748-XXXXXXXX.apps.googleusercontent.com)"
read -rp "> " GOOGLE_CLIENT_ID

echo ""
echo "Enter your PRODUCTION Google OAuth Client Secret:"
read -rsp "> " GOOGLE_CLIENT_SECRET
echo ""

if [[ -z "$GOOGLE_CLIENT_ID" || -z "$GOOGLE_CLIENT_SECRET" ]]; then
    echo "ERROR: Both client_id and client_secret are required."
    exit 1
fi

# Write to Vault
docker compose exec -e VAULT_TOKEN="$ROOT_TOKEN" -e VAULT_ADDR="$VAULT_ADDR" \
    vault vault kv put secret/loyallia \
    google_oauth_client_id="$GOOGLE_CLIENT_ID" \
    google_oauth_client_secret="$GOOGLE_CLIENT_SECRET"

echo ""
echo "✓ Google OAuth credentials saved to Vault"

# ── Verify ────────────────────────────────────────────────────────────────────
echo ""
echo "Verifying stored values..."
docker compose exec -e VAULT_TOKEN="$ROOT_TOKEN" -e VAULT_ADDR="$VAULT_ADDR" \
    vault vault kv get -format=json secret/loyallia | \
    jq '.data.data | {google_oauth_client_id, google_oauth_client_secret}'

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "  NEXT STEPS"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "1. Restart the API container to pick up the new secrets:"
echo "   docker compose restart api"
echo ""
echo "2. Verify the frontend loads Google Sign-In correctly:"
echo "   https://rewards.loyallia.com/login/"
echo ""
