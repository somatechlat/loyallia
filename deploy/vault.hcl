# Production Vault Configuration
# LYL-SEC-001: TLS enabled, mlock enabled, hardened listener

storage "file" {
  path = "/vault/file"
}

listener "tcp" {
  address         = "0.0.0.0:8200"
  tls_disable     = 0
  tls_cert_file   = "/vault/certs/vault.crt"
  tls_key_file    = "/vault/certs/vault.key"
  tls_min_version = "tls12"
  # Cluster address for HA mode
  cluster_address = "0.0.0.0:8201"
}

telemetry {
  prometheus_retention_time = "30s"
  disable_hostname          = false
}

ui = true

# NOTE: disable_mlock is NOT set (defaults to false).
# The container must have IPC_LOCK capability (already configured in docker-compose.yml).
# This prevents Vault memory from being swapped to disk.
