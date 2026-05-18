# Loyallia Deployment Continuation Plan

## Current State (from previous session)
- Local repo at `/mnt/agents/loyallia/` on KIMIk2 branch
- Vault TLS configured with Let's Encrypt certs (server) / self-signed (local)
- `deploy/vault/init.sh` is the secret seeding script run by vault-init container
- `vault kv put -mount=secret` commands were failing with "Error making API request"
- 0/21 secrets seeded — BLOCKING all downstream steps

## Root Cause Analysis
The `vault-init` container (in docker-compose.yml):
- Connects to Vault at `VAULT_ADDR: https://vault:8200`
- Has `VAULT_SKIP_VERIFY: "true"` set
- But Vault's TLS cert is for `rewards.loyallia.com`, NOT for `vault` hostname
- The `vault` CLI inside vault-init uses the Vault API client which respects `VAULT_SKIP_VERIFY`
- The issue is likely: KV v2 path format mismatch, or Vault not actually initialized/unsealed when init.sh runs

## Fix Strategy

### Stage 1: Fix vault/init.sh for robust secret seeding
- [ ] Fix `wait_for_vault()` to properly handle TLS with skip-verify
- [ ] Ensure KV v2 engine is enabled before writing
- [ ] Fix `set_secret()` function for KV v2 path format
- [ ] Add detailed error logging to diagnose failures
- [ ] Add retry logic for transient failures

### Stage 2: Local deployment test
- [ ] Generate secrets with generate_secrets.sh
- [ ] Start infrastructure (postgres, redis, minio, vault)
- [ ] Run vault-init and verify all secrets seeded
- [ ] Run Django migrations
- [ ] Seed platform settings
- [ ] Build and start API + Dashboard
- [ ] Start workers (celery, beat, flower)
- [ ] Verify all containers healthy

### Stage 3: Commit, push, server deploy
- [ ] Commit all fixes to KIMIk2
- [ ] Push to GitHub
- [ ] Deploy on server (when connection available)
