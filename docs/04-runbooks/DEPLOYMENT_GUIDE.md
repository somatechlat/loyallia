# Loyallia Production Deployment Guide

## Overview

This guide covers the complete deployment of Loyallia to a production server.

**Server:** Ubuntu 24.04 LTS  
**Domain:** `rewards.loyallia.com`  
**IP:** `<production-server-ip>`
**Path:** `/opt/loyallia`

---

## Architecture

```
Internet → Host Nginx (SSL/443) → Docker Containers
                                    ├── web (Next.js) :33906
                                    ├── api (Django)  :33905
                                    ├── postgres      :33900
                                    ├── redis         :33902
                                    ├── minio         :33903/33904
                                    ├── vault         :33908
                                    └── etc.
```

**Host nginx** handles SSL termination, rate limiting, and proxies to containers.  
**Container nginx** runs internally only (no host port binding in production).

---

## Prerequisites

1. Ubuntu 24.04 LTS server
2. Docker 24.x + Docker Compose 2.x
3. Git
4. SSH access
5. Domain with DNS A record pointing to server IP
6. Ports 80, 443 open in firewall

---

## Step 1: Server Setup

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
apt install -y docker.io docker-compose-v2 nginx certbot python3-certbot-nginx jq

# Enable Docker
systemctl enable --now docker

# Create app directory
mkdir -p /opt/loyallia
cd /opt/loyallia

# Clone repo
git clone https://github.com/somatechlat/loyallia.git .
```

---

## Step 2: Configure Host Nginx

```bash
# Copy production nginx config
cp deploy/rewards.loyallia.com.conf /etc/nginx/sites-available/rewards.loyallia.com
ln -sf /etc/nginx/sites-available/rewards.loyallia.com /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload
nginx -t && nginx -s reload
```

### SSL Certificate (Let's Encrypt)

```bash
certbot --nginx -d rewards.loyallia.com --agree-tos --no-eff-email -m admin@loyallia.com
```

---

## Step 3: Start Infrastructure

```bash
cd /opt/loyallia

# Start Vault, Postgres, Redis first
docker compose up -d vault postgres redis minio

# Wait for Vault init
docker compose logs vault-init -f
# Look for: "Vault initialized successfully"
```

---

## Step 4: Initialize Vault

The bootstrap process (`deploy/bootstrap/bootstrap-production.sh` / `deploy/vault/init.sh`) already initializes Vault, seeds KV v2, and creates the `loyallia-app` policy and its token at `/vault/runtime/app-token` inside the shared `vault_runtime` volume. Manual creation is only needed if you are recovering or rotating the app token.

```bash
# Get root token
ROOT_TOKEN=$(docker compose exec vault cat /vault/file/init.json | jq -r '.root_token')
# Do not echo or log root tokens.

# Create or rotate the app token (policy name is loyallia-app, not app)
docker compose exec -e VAULT_TOKEN="$ROOT_TOKEN" vault \
  vault token create -policy=loyallia-app -ttl=8760h -format=json | \
  jq -r '.auth.client_token' > /tmp/app-token

# Copy to runtime volume
docker cp /tmp/app-token loyallia-vault:/tmp/app-token
docker compose exec vault cp /tmp/app-token /vault/runtime/app-token
```

---

## Step 5: Configure ALL Secrets in Vault

### Required Secrets

Run this command block to set all secrets:

```bash
cd /opt/loyallia
ROOT_TOKEN=$(docker compose exec vault cat /vault/file/init.json | jq -r '.root_token')

docker compose exec -e VAULT_TOKEN="$ROOT_TOKEN" vault vault kv put secret/loyallia/production \
  secret_key="$(openssl rand -hex 50)" \
  jwt_secret_key="$(openssl rand -hex 50)" \
  postgres_password="$(openssl rand -hex 32)" \
  redis_url="redis://:$(openssl rand -hex 32)@redis:6379/0" \
  celery_broker_url="redis://:$(openssl rand -hex 32)@redis:6379/1" \
  celery_result_backend="redis://:$(openssl rand -hex 32)@redis:6379/2" \
  google_oauth_client_id="<vault:google_oauth_client_id>" \
  google_oauth_client_secret="<vault:google_oauth_client_secret>" \
  google_wallet_issuer_id="<vault:google_wallet_issuer_id>" \
  google_service_account_json='{"type":"service_account","project_id":"..."}' \
  mailjet_api_key="<vault:mailjet_api_key>" \
  mailjet_secret_key="<vault:mailjet_secret_key>" \
  mailjet_sender_email="<vault:mailjet_sender_email>" \
  twilio_account_sid="<vault:twilio_account_sid>" \
  twilio_auth_token="<vault:twilio_auth_token>" \
  twilio_from_number="<vault:twilio_from_number>" \
  payment_gateway_login="<vault:payment_gateway_login>" \
  payment_gateway_tran_key="<vault:payment_gateway_tran_key>" \
  payment_gateway_webhook_secret="$(openssl rand -hex 32)" \
  whatsapp_bridge_api_key="$(openssl rand -hex 32)" \
  whatsapp_bridge_url="http://whatsapp-bridge:3001" \
  minio_access_key="$(openssl rand -hex 16)" \
  minio_secret_key="$(openssl rand -hex 32)" \
  pass_hmac_secret="$(openssl rand -hex 32)" \
  flower_basic_auth="admin:$(openssl rand -hex 16)"
```

### Google Cloud Console Setup

For **rewards.loyallia.com** (Production):

| Setting | Value |
|---------|-------|
| **Authorized JS Origins** | `https://rewards.loyallia.com` |
| **Authorized Redirect URIs** | `https://rewards.loyallia.com/api/v1/auth/google/callback/` |

For **localhost** (Development):

| Setting | Value |
|---------|-------|
| **Authorized JS Origins** | `http://localhost:33906` |
| **Authorized Redirect URIs** | `http://localhost:33905/api/v1/auth/google/callback/` |

---

## Step 6: Build and Start All Services

```bash
cd /opt/loyallia

# Build all containers
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache

# Start everything
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Verify all healthy
docker compose ps
```

> **Note:** The production API container (`docker-compose.prod.yml`) does NOT auto-run seed commands on startup. Seeds must be executed manually during initial deployment. The container only runs `migrate`, `collectstatic`, and starts Gunicorn.

---

## Step 7: Database Setup

```bash
# Run migrations
docker compose exec api python manage.py migrate --noinput

# Collect static files
docker compose exec api python manage.py collectstatic --noinput

# Seed canonical subscription plans from JSON fixture
docker compose exec api python manage.py seed_subscription_plans

# Seed platform settings
docker compose exec api python manage.py seed_platform_settings

# Create/recover superadmin (REQUIRES ADMIN_PASSWORD in production; production also needs --force)
docker compose exec -T api python manage.py recover_admin_access \
    --email "admin@loyallia.com" \
    --password "$ADMIN_PASSWORD" \
    --create \
    --force
```

**CRITICAL:** The `recover_admin_access` command is the only supported way to create/recover the admin account. Do not use inline shell scripts or hardcoded passwords.

---

## Step 8: Mailjet Setup

Configure `mailjet_api_key`, `mailjet_secret_key`, and `mailjet_sender_email` in Vault.
The sender email must be verified in Mailjet.

---

## Step 9: Health Verification

```bash
# API health
curl -s https://rewards.loyallia.com/api/v1/health/

# Google OAuth config
curl -s https://rewards.loyallia.com/api/v1/auth/google/config/

# Frontend
curl -s -o /dev/null -w "%{http_code}" https://rewards.loyallia.com/
```

---

## Troubleshooting

### CSS Not Loading

**Symptom:** Raw `@tailwind` directives in CSS file.  
**Cause:** `postcss.config.js` was excluded from Docker build context.  
**Fix:** Remove `postcss.config.js` from `.dockerignore` and rebuild web container.

### 500 Error on Login

**Symptom:** `column loyallia_users.X does not exist`.  
**Cause:** Migrations marked as applied but columns don't exist in DB.  
**Fix:** Manually add missing columns:
```bash
docker compose exec -T postgres psql -U loyallia -d loyallia -c "
ALTER TABLE loyallia_users ADD COLUMN security_pin_hash VARCHAR(128) NOT NULL DEFAULT '';
ALTER TABLE loyallia_tenants ADD COLUMN scheduled_deletion_at TIMESTAMP WITH TIME ZONE;
"
```

### Nginx Port Conflict

**Symptom:** `failed to bind host port 127.0.0.1:80`.  
**Cause:** Container nginx conflicts with host nginx.  
**Fix:** Override in `docker-compose.prod.yml`:
```yaml
nginx:
  ports: !reset []
```

### Google OAuth "Client ID Not Found"

**Symptom:** GSI error in browser console.  
**Cause:** Vault has placeholder `google_oauth_client_id`.  
**Fix:** Update Vault with real Google OAuth client ID and restart API.

---

## Monitoring

| Service | URL | Auth |
|---------|-----|------|
| Grafana | `http://localhost:33910` | Basic Auth |
| Prometheus | `http://localhost:33909` | None |
| Flower (Celery) | `http://localhost:33907` | Basic Auth |
| Vault UI | `http://localhost:33908` | Token |

---

## Backup

```bash
# Database
docker compose exec -T postgres pg_dump -U loyallia loyallia > backup_$(date +%Y%m%d).sql

# Vault secrets
docker cp loyallia-vault:/vault/file/init.json vault-backup-$(date +%Y%m%d).json
```

---

## Credential Status Matrix

> **Note:** The statuses below reflect the state of the codebase at the time of writing. Verify actual credential statuses in your local environment before deployment.

| Integration | Status | Action Required |
|-------------|--------|-----------------|
| Google OAuth | ✅ Working | None |
| Google Wallet | ⚠️ Empty JSON | Add service account JSON |
| Apple Wallet | ⚠️ Disabled | Add certificates + enable |
| Mailjet Email | ⚠️ Placeholder | Add Mailjet credentials |
| Payments | ⚠️ Disabled | Add payment gateway credentials |
| Twilio SMS | ⚠️ Missing | Add Twilio credentials |
| WhatsApp Bridge | ⚠️ Missing | Add bridge API key |
| AI Agent | ⚠️ Missing | Add AI API key |
