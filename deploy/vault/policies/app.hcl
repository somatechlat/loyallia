# =============================================================================
# Loyallia Application Policy — Least-Privilege Vault Access
# =============================================================================
# This policy grants the Loyallia application read-only access to its
# secrets and minimal system endpoints for health checks.
#
# Applied by: bootstrap.sh (via vault-init container)
# Token:      Created by vault/init.sh after policy write
# Mount:      secret/ (KV v2)
# =============================================================================

# --- Application secrets (read-only) ------------------------------------------
path "secret/data/loyallia/production/*" {
  capabilities = ["read"]
}

path "secret/data/loyallia/development/*" {
  capabilities = ["read"]
}

path "secret/data/loyallia/common/*" {
  capabilities = ["read"]
}

# The root KV path itself (for listing)
path "secret/metadata/loyallia/*" {
  capabilities = ["read", "list"]
}

# --- Token management ---------------------------------------------------------
# Allow the application to introspect its own token (for health checks)
path "auth/token/lookup-self" {
  capabilities = ["read"]
}

path "auth/token/renew-self" {
  capabilities = ["update"]
}

# --- System health (read-only) ------------------------------------------------
path "sys/health" {
  capabilities = ["read"]
}

path "sys/seal-status" {
  capabilities = ["read"]
}

# --- Key-Value metadata (listing) ---------------------------------------------
path "secret/metadata/*" {
  capabilities = ["list"]
}
