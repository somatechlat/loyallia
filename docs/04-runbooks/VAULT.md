# HashiCorp Vault

## Purpose

[HashiCorp Vault](https://www.vaultproject.io/) is the **central secrets management system** for Loyallia. It stores, encrypts, and controls access to all sensitive configuration: database passwords, API keys, JWT secrets, TLS certificates, and integration credentials.

Vault is deployed as a container and initialized by a dedicated `vault-init` container that:
1. Initializes Vault (first boot only)
2. Unseals Vault with Shamir key shares
3. Seeds secrets from a flat `.env` file
4. Creates a least-privilege application policy and token
5. Exports runtime secret files for other containers

## Files

| File | Description |
|------|-------------|
| `.env.example` | Example bootstrap secrets file showing all 50+ keys that can be seeded into Vault. |
| `generate-dev-certs.sh` | Generates self-signed TLS certificates for Vault in **development only**. |
| `init.sh` | **Core initialization script** — pure POSIX `sh` for Alpine Linux. Handles init, unseal, secret seeding, policy creation, and token provisioning. |
| `policies/app-policy.hcl` | **Read/write** policy for services that need to create or update secrets programmatically. |
| `policies/app.hcl` | **Read-only** policy for the Loyallia application. Grants access to secrets and minimal system health endpoints. |

## Configuration

### `.env.example`

This file documents every secret key the platform accepts. Key categories:

| Category | Keys |
|----------|------|
| Core infrastructure | `SECRET_KEY`, `POSTGRES_PASSWORD`, `REDIS_URL`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `JWT_SECRET_KEY`, `PASS_HMAC_SECRET` |
| Google | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON` |
| Payment | `PAYMENT_GATEWAY_ENABLED`, `PAYMENT_GATEWAY_PROVIDER`, `PAYMENT_GATEWAY_LOGIN`, `PAYMENT_GATEWAY_TRAN_KEY` |
| Email | `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, `MAILJET_SENDER_EMAIL`, `MAILJET_SENDER_NAME` |
| Apple Wallet | `APPLE_PASS_TYPE_IDENTIFIER`, `APPLE_TEAM_IDENTIFIER`, `APPLE_CERT_PEM`, `APPLE_CERT_KEY_PEM`, `APPLE_WWDR_CERT_PEM` |
| Twilio | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `TWILIO_VERIFY_ENABLED` |
| WhatsApp | `WHATSAPP_BRIDGE_URL`, `WHATSAPP_BRIDGE_API_KEY` |
| AI | `AI_AGENT_BASE_URL`, `AI_AGENT_API_KEY` |
| Feature toggles | `GOOGLE_WALLET_ENABLED`, `APPLE_WALLET_ENABLED`, `APPLE_NFC_ENABLED`, `PAYMENT_GATEWAY_ENABLED` |
| System | `SYSTEM_MODE`, `BACKUP_FREQUENCY`, `BACKUP_RETENTION`, `CRON_HOUR` |

#### Base64-Encoding Long Values

Multiline values (PEM certificates, JSON blobs) should use a `_b64` suffix with base64 encoding:

```bash
echo "$JSON_BLOB" | base64 > google_service_account_json_b64.txt
```

The `init.sh` script automatically detects and decodes `_b64` keys.

### `init.sh` — Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VAULT_ADDR` | `https://127.0.0.1:8200` | Vault API endpoint |
| `VAULT_SKIP_VERIFY` | `true` | Skip TLS verification (dev only) |
| `VAULT_APP_SECRET_PATH` | `loyallia/production` | KV v2 path for application secrets |
| `BOOTSTRAP_SECRETS_FILE` | `/vault/bootstrap/secrets.env` | Flat env file mounted read-only |
| `VAULT_RESCUE_INIT_JSON` | — | Path to rescue `init.json` for disaster recovery injection |

### Policies

- **`policies/app.hcl`** — Standard application policy (read-only secrets, token self-renewal, system health).
- **`policies/app-policy.hcl`** — Elevated policy (read + create + update + patch) for admin tooling and the init container.

## Usage

### Development: Generate Self-Signed Certs

```bash
./deploy/vault/generate-dev-certs.sh ./certs
```

### Initialize Vault (First Boot)

Vault init is handled automatically by Docker Compose. The `vault-init` container runs `init.sh` and exits when complete.

```bash
docker compose up -d vault vault-init
```

### Check Vault Status

```bash
docker compose exec vault vault status
```

### Read a Secret

```bash
export VAULT_TOKEN=$(cat .agents/vault_secrets_rescue.json | jq -r '.root_token')
vault kv get -mount=secret loyallia/production/postgres_password
```

### Rotate the Root Token

After initial bootstrap, revoke the root token and use the app token:

```bash
vault token revoke <root_token>
```

The app token is written to `/vault/runtime/app-token` inside the Vault container and can be consumed by other services.

### Disaster Recovery Injection

Set `VAULT_RESCUE_INIT_JSON` to inject a previously saved `init.json` during recovery:

```bash
export VAULT_RESCUE_INIT_JSON=/path/to/vault_init_rescue.json
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Vault init container loops forever | Check Vault logs: `docker compose logs vault`. Verify TLS certs exist. Ensure `BOOTSTRAP_SECRETS_FILE` is mounted. |
| `Missing required secret: secret_key` | Verify the flat `.env` file contains all required keys. Check `deploy/vault/.env.example` for the full list. |
| Vault is sealed after restart | Provide unseal keys manually: `vault operator unseal <key>`. For auto-unseal, consider migrating to Vault Enterprise with auto-unseal or a cloud KMS integration. |
| App token missing | Check `init.sh` logs. Ensure the `loyallia-app` policy was written successfully. |
| Certificate expiry in dev | Re-run `generate-dev-certs.sh` and restart the Vault container. |
| `init.sh` fails with `wget: not found` | This script targets Alpine (busybox). If running on a different base image, install `wget` or adapt the health-check loop. |
| Policy denied errors | Verify the token being used has the correct policy attached. Compare against `policies/app.hcl`. |

## Related Docs

- [`deploy/bootstrap/`](../bootstrap/) — `generate_secrets.sh` and deployment orchestrator
- [`deploy/scripts/`](../scripts/) — `rotate_secrets.sh` for secret rotation
- [`deploy/disaster_recovery/`](../disaster_recovery/) — Recovery from encrypted rescue files
- [`deploy/backups/`](../backups/) — Backup procedures
- [`../../docs/02-architecture/ARCHITECTURE.md`](../02-architecture/ARCHITECTURE.md) — Security and secrets architecture
