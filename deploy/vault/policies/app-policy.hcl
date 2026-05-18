# Loyallia application policy for Vault KV v2 secrets
# Provides read/write access to the loyallia secret path
path "secret/data/loyallia/*" {
  capabilities = ["read", "create", "update", "patch"]
}
