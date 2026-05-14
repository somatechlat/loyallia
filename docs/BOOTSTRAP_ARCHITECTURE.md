# Loyallia — Zero Trust Bootstrap Architecture

**Document ID:** LYL-ARCH-BOOTSTRAP-001  
**Classification:** Internal — Security Critical  
**Version:** 2.0  
**Last Updated:** 2026-05-14  

---

## 1. Core Principles

| Principle | Enforcement |
|-----------|-------------|
| **No env secrets** | Secrets are NEVER exported to shell environment variables |
| **Vault as source of truth** | All runtime secrets live in HashiCorp Vault KV v2 only |
| **File-based injection** | Bootstrap secrets flow through a JSON file mounted as a read-only Docker volume |
| **Auto-rescue** | `init.json` and Vault secrets are automatically exported to `.agents/` before cleanup |
| **Secure cleanup** | Bootstrap JSON is cryptographically shredded, not just deleted |
| **Idempotency** | Re-running bootstrap detects existing Vault and aborts safely |
| **Zero Trust** | No container trusts another; each reads its own credentials from Vault runtime files |
| **Certificate auto-discovery** | Certificates from `certs/` are automatically read and injected into Vault |

---

## 2. Architecture Overview

```
Phase 1: Generation          Phase 2: Injection              Phase 3: Runtime
───────────────────          ───────────────────             ─────────────────
generate_secrets.sh          vault-init container            All other containers
        │                            │                               │
        ▼                            ▼                               ▼
┌──────────────┐            ┌──────────────┐              ┌──────────────┐
│ .bootstrap_  │  mount as  │  • Initialize│              │ Read secrets │
│ secrets.json │  ro volume │    Vault     │              │ from runtime │
│ (ephemeral)  │───────────▶│  • Seed KV   │─────────────▶│ files only   │
└──────────────┘            │  • Create    │              │              │
                            │    runtime   │              │ /run/loyallia│
                            │    files     │              │ -vault/      │
                            │  • Auto-     │              │              │
                            │    rescue    │              │ postgres_    │
                            └──────────────┘              │ password     │
                                   │                      │ redis_       │
                                   ▼                      │ password     │
                            ┌──────────────┐              │ minio_root_* │
                            │ .agents/     │              │ app-token    │
                            │ rescue files │              └──────────────┘
                            └──────────────┘
```

---

## 3. Secret Lifecycle

### 3.1 Generation

`deploy/bootstrap/generate_secrets.sh` creates a JSON file with:
- Cryptographically random values for core secrets (`secret_key`, `postgres_password`, etc.)
- Certificate contents auto-discovered from `certs/` directory:
  - `passNew.pem` → `apple_cert_pem`
  - `apple_pass_new.key` → `apple_cert_key_pem`
  - `AppleWWDRCAG4.pem` → `apple_wwdr_cert_pem`
  - `loyalliarewardswallet-*.json` → `google_service_account_json`
  - `client_secret_*.apps.googleusercontent.com.json` → `google_oauth_client_id` + `google_oauth_client_secret`

```json
{
  "_meta": {
    "generated": "2026-05-14T13:39:07Z",
    "version": "1.0"
  },
  "secrets": {
    "secret_key": "...",
    "postgres_password": "...",
    "apple_cert_pem": "-----BEGIN CERTIFICATE-----\n...",
    "google_service_account_json": "{\"type\":\"service_account\",...}"
  }
}
```

- File: `.bootstrap_secrets.json`
- Permissions: `0600`
- Format: JSON (never shell syntax)
- Lifetime: Ephemeral — destroyed after successful bootstrap

### 3.2 Injection

`deploy/vault/init.sh` reads the JSON via a read-only Docker volume mount:

```bash
BOOTSTRAP_FILE="${BOOTSTRAP_SECRETS_FILE:-/vault/bootstrap/secrets.json}"

json_get() {
    python3 -c "
import json
with open('$BOOTSTRAP_FILE') as f:
    data = json.load(f)
print(data.get('secrets', {}).get('$1', ''), end='')
"
}
```

- Only `vault-init` container mounts this file
- Mount is `:ro` (read-only)
- If JSON is missing, falls back to existing Vault values (idempotency)

### 3.3 Runtime

After Vault is seeded, `vault-init` creates runtime files:

```bash
/vault/runtime/postgres_password
/vault/runtime/redis_password
/vault/runtime/minio_root_user
/vault/runtime/minio_root_password
/vault/runtime/app-token
/vault/runtime/loyallia-app.hcl
```

All other containers mount `vault_runtime:/run/loyallia-vault:ro` and read secrets from these files. No container ever sees the bootstrap JSON.

---

## 4. Bootstrap Sequence (7 Steps)

| Step | Script | What Happens | Secrets in Env? |
|------|--------|--------------|-----------------|
| 1/7 | `bootstrap.sh` | Check docker, compose, files | No |
| 2/7 | `generate_secrets.sh` | Create `.bootstrap_secrets.json` (certs + random secrets) | No |
| 3/7 | `bootstrap.sh` | Create temp Docker volume, copy JSON, start Vault + vault-init | No |
| 4/7 | `init.sh` | Initialize Vault, seed KV v2, create runtime files, auto-enable wallets | No |
| 5/7 | `bootstrap.sh` | Auto-export rescue files to `.agents/` | No |
| 6/7 | `bootstrap.sh` | Start PostgreSQL, Redis, MinIO, API, workers, monitoring | No |
| 7/7 | `bootstrap.sh` | Verify health, shred JSON, cleanup temp volume | No |

---

## 5. Certificate Auto-Discovery

Certificates in `certs/` are automatically detected and injected:

| File | Vault Key | Wallet Feature |
|------|-----------|----------------|
| `certs/passNew.pem` | `apple_cert_pem` | Apple Wallet |
| `certs/apple_pass_new.key` | `apple_cert_key_pem` | Apple Wallet |
| `certs/AppleWWDRCAG4.pem` | `apple_wwdr_cert_pem` | Apple Wallet |
| `certs/loyalliarewardswallet-*.json` | `google_service_account_json` | Google Wallet |
| `certs/client_secret_*.json` | `google_oauth_client_id` + `google_oauth_client_secret` | Google OAuth |

**Auto-enable:** If Apple certificates are present, `apple_wallet_enabled` is set to `true`. If Google service account is present, `google_wallet_enabled` is set to `true`.

**Note:** `certs/` is still mounted into backend containers (`./certs:/app/certs:ro`) for **push notification clients** (FCM + APNs) which read credential files from disk. Wallet pass engines read from Vault exclusively.

---

## 6. Rescue File Auto-Creation

After vault-init succeeds, `bootstrap.sh` automatically creates:

| File | Source | Purpose |
|------|--------|---------|
| `.agents/vault_init_rescue.json` | `loyallia-vault:/vault/file/init.json` | Vault unseal key + root token |
| `.agents/vault_secrets_rescue.json` | `vault kv get secret/loyallia/production` | All production secrets |

**Permissions:** `0600` on all rescue files  
**Failure behavior:** If `.agents/` is not writable, bootstrap warns but does NOT abort.

---

## 7. Secure Cleanup

After successful bootstrap, `.bootstrap_secrets.json` is destroyed:

```bash
secure_delete() {
    if command -v shred &>/dev/null; then
        shred -n 3 -z -u "$file"
    else
        dd if=/dev/urandom of="$file" bs=1k count=10 conv=notrunc 2>/dev/null || true
        rm -f "$file"
    fi
}
```

The temporary Docker volume `loyallia_bootstrap_tmp` is also removed.

---

## 8. Idempotency & Safety

| Scenario | Behavior |
|----------|----------|
| Vault already initialized | Detect via `vault status`. Abort with clear message. |
| `.bootstrap_secrets.json` missing | If Vault has secrets → skip generation. If not → error. |
| Re-run after success | Prompts for confirmation. Existing Vault values preserved. |
| vault-init fails | Keeps `.bootstrap_secrets.json` for debugging. Does NOT delete. |
| Partial failure | Temp volume and JSON remain for forensic analysis. |

---

## 9. Security Controls

| ID | Control | Implementation |
|----|---------|---------------|
| S-01 | No env secrets | `.bootstrap_secrets.json` is NEVER sourced, exported, or eval'd |
| S-02 | Minimal exposure | Only `vault-init` mounts the JSON file |
| S-03 | Read-only mount | JSON mounted `:ro` inside vault-init |
| S-04 | Secure deletion | Cryptographic shredding before deletion |
| S-05 | Auto-rescue | Rescue files created before any cleanup |
| S-06 | No plaintext logs | Log key names only, never values |
| S-07 | File permissions | `.bootstrap_secrets.json` created with `0600` |
| S-08 | Temp volume cleanup | `loyallia_bootstrap_tmp` removed after bootstrap |
| S-09 | Rescue permissions | `.agents/*rescue*.json` set to `0600` |
| S-10 | No shell eval | JSON parsed with Python `json.load()` |
| S-11 | Certificate auto-detect | Reads from `certs/` automatically |
| S-12 | Feature auto-enable | Apple/Google Wallet auto-enabled if certificates present |

---

## 10. File Reference

| File | Purpose | Status |
|------|---------|--------|
| `docs/BOOTSTRAP_ARCHITECTURE.md` | This document | **Created** |
| `deploy/bootstrap/generate_secrets.sh` | Generate `.bootstrap_secrets.json` + read certs | **Modified** |
| `deploy/vault/init.sh` | Read JSON, initialize Vault, seed certs | **Modified** |
| `deploy/bootstrap/bootstrap.sh` | Orchestrate bootstrap, auto-rescue, secure cleanup | **Modified** |
| `docker-compose.yml` | Add `loyallia_bootstrap_tmp` volume | **Modified** |
| `docs/FACTORY_RESET_PROCEDURE.md` | Reference new architecture | **Updated** |

---

## 11. Troubleshooting

### Bootstrap fails with "missing required Vault bootstrap value"
**Cause:** `.bootstrap_secrets.json` is missing or vault-init cannot read it.  
**Fix:** Check temp volume:
```bash
docker run --rm -v loyallia_bootstrap_tmp:/bootstrap alpine cat /bootstrap/secrets.json | head
```

### Vault init fails with "Vault is already initialized"
**Cause:** Previous bootstrap left Vault data in the volume.  
**Fix:** Run factory reset to clear volumes, or use `docker compose up -d` if Vault is healthy.

### Rescue files not created
**Cause:** `.agents/` directory is not writable.  
**Fix:** Create `.agents/` manually and re-run, or copy manually:
```bash
docker cp loyallia-vault:/vault/file/init.json .agents/vault_init_rescue.json
```

### Certificates not detected
**Cause:** Files missing from `certs/` or wrong naming.  
**Fix:** Verify these exist:
```bash
ls certs/passNew.pem certs/apple_pass_new.key certs/AppleWWDRCAG4.pem
ls certs/loyalliarewardswallet-*.json
```

---

*Document maintained by Infrastructure & SRE Team*  
*Aligned with rules.md — no env secrets, no plaintext persistence, Vault as source of truth*
