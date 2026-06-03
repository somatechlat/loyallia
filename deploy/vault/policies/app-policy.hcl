# =============================================================================
# Loyallia Application Policy — Read/Write Vault Access
# =============================================================================
# This policy grants the Loyallia application full read/write access to its
# KV v2 secrets path. Used by services that need to create or update secrets
# programmatically (e.g., vault-init, admin tooling).
#
# Applied by: deploy/vault/init.sh
# Mount:      secret/ (KV v2)
# Path:       secret/data/loyallia/*
# =============================================================================

# --- Application secrets (read, create, update, patch) ------------------------
# read   : Retrieve existing secret values at this path.
# create : Write new secrets (fails if a secret already exists at the path).
# update : Overwrite existing secrets with new values.
# patch  : Partially update a secret without overwriting untouched keys.
path "secret/data/loyallia/*" {
  capabilities = ["read", "create", "update", "patch"]
}
