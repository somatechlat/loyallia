# Loyallia — Factory Reset Procedure

**Document ID:** LYL-OPS-FACTORY-RESET-001  
**Classification:** Internal — Destructive Operation  
**Environment:** Localhost disposable development ONLY  

---

## ⚠️ CRITICAL WARNINGS

1. **NEVER run this on production, staging, or any shared environment.**
2. **This DESTROYS ALL DATA** — tenants, customers, campaigns, wallets, Vault secrets, everything.
3. **Ensure `.agents/` rescue files exist BEFORE running this.** If rescue files are missing, disaster recovery will be impossible.
4. **SuperAdmin user will be preserved** during UI factory reset, but this Docker-level reset destroys EVERYTHING including the SuperAdmin.

---

## Pre-Reset Checklist

- [ ] Confirm environment is `localhost` disposable development
- [ ] Confirm `.agents/vault_init_rescue.json` exists and is valid JSON
- [ ] Confirm `.agents/vault_secrets_rescue.json` exists
- [ ] Confirm `.agents/pg_dump_rescue_YYYYMMDD.dump` exists (if data matters)
- [ ] Confirm `.agents/certs_rescue_YYYYMMDD.txt` exists
- [ ] Notify any other developers using this local instance
- [ ] Export any data you need to keep

---

## Step 1 — Stop All Services

```bash
cd /path/to/loyallia
docker compose down --remove-orphans
```

**What this does:** Gracefully stops and removes all containers. Networks are removed. Volumes are NOT removed yet.

---

## Step 2 — Destroy All Persistent Data

```bash
for vol in vault_data vault_runtime postgres_data postgres_replica_data redis_data minio_data static_files media_files prometheus_data grafana_data loki_data next_cache; do
    if docker volume inspect "loyallia_${vol}" &>/dev/null 2>&1; then
        docker volume rm "loyallia_${vol}"
        echo "Removed: loyallia_${vol}"
    fi
done
```

**What this destroys:**

| Volume | Data Lost |
|--------|-----------|
| `loyallia_vault_data` | All secrets, unseal keys, root token |
| `loyallia_vault_runtime` | Runtime password files (postgres, redis, minio) |
| `loyallia_postgres_data` | All database tables, tenants, customers, campaigns |
| `loyallia_postgres_replica_data` | Replica database |
| `loyallia_redis_data` | Cache, sessions, Celery broker state, WhatsApp auth |
| `loyallia_minio_data` | Wallet passes, assets, files |
| `loyallia_static_files` | Collected Django static files |
| `loyallia_media_files` | Uploaded media files |
| `loyallia_prometheus_data` | Metrics history |
| `loyallia_grafana_data` | Dashboards and alerts |
| `loyallia_loki_data` | Log aggregation |
| `loyallia_next_cache` | Next.js build cache |

---

## Step 3 — Verify Zero State

```bash
# Should show NOTHING
docker ps -a | grep loyallia
docker volume ls | grep loyallia
docker network ls | grep loyallia
```

**Expected result:** All three commands return empty.

---

## Step 4 — Re-Bootstrap From Zero

**Development:**
```bash
./deploy/bootstrap/bootstrap-development.sh
```

**Production (requires ADMIN_PASSWORD):**
```bash
ADMIN_PASSWORD=YourStrongPass123! ./deploy/bootstrap/bootstrap-production.sh
```

**This runs the Zero Trust Bootstrap sequence:**
1. Check prerequisites (docker, compose)
2. Generate secrets + auto-discover certificates from `certs/` → `.bootstrap_secrets.{mode}.env`
3. Start Vault + vault-init (secrets injected via read-only volume, **NEVER via env vars**)
4. Auto-save `init.json` to `.agents/vault_init_rescue.json`
5. Auto-export Vault secrets to `.agents/vault_secrets_rescue.json`
6. Start PostgreSQL, Redis, MinIO, PgBouncer, replica
7. Run migrations + seeds (API container startup)
8. Ensure SuperAdmin account exists
9. Start Celery workers, Flower, WhatsApp bridge, Nginx, monitoring
10. Securely cleanup temp volume
11. Verify all containers healthy

**Idempotent:** Both scripts are fully idempotent. If interrupted, simply re-run — completed steps are skipped automatically.

**Architecture:** See `docs/02-architecture/BOOTSTRAP_ARCHITECTURE.md` for full Zero Trust design.

---

## Step 5 — Post-Reset Verification

```bash
# API health
curl -sf http://localhost:33905/api/v1/health/

# All containers healthy
docker compose ps

# Vault unsealed and accessible
curl -sf "http://localhost:33908/v1/sys/health?standbyok=true"

# Idempotency check — seeds should skip existing
docker exec loyallia-api python manage.py seed_platform_settings
docker exec loyallia-api python manage.py seed_subscription_plans
```

---

## Alternative: UI Factory Reset (SuperAdmin)

For a **data-only** reset (preserves Vault secrets and SuperAdmin):

1. Log in as SuperAdmin at `http://localhost:33906/login`
2. Navigate to **Configuración Global** → **Restaurar Sistema**
3. Request OTP → Enter code → Confirm
4. This wipes all tenant data but preserves:
   - Vault secrets
   - SuperAdmin user
   - Subscription plans
   - Platform settings

**Note:** UI factory reset does NOT fix a sealed/corrupted Vault. Use the Docker-level procedure above for that.

---

## Rescue File Creation (Manual)

If rescue files are missing, create them AFTER a successful bootstrap:

```bash
# Vault init.json (CRITICAL — contains unseal key)
docker cp loyallia-vault:/vault/file/init.json .agents/vault_init_rescue.json

# Vault secrets
bash scripts/export_local_vault.sh .agents/vault_secrets_rescue.json

# PostgreSQL dump
docker compose exec -T postgres pg_dump -U loyallia -d loyallia --format=custom --compress=9 > .agents/pg_dump_rescue_$(date +%Y%m%d).dump

# Certificates (preserved in certs/ directory, also backed up as rescue)
cat certs/apple_pass_new.key certs/passNew.pem certs/AppleWWDRCAG4.pem certs/loyalliarewardswallet-*.json > .agents/certs_rescue_$(date +%Y%m%d).txt

# Redis RDB
docker cp loyallia-redis:/data/dump.rdb .agents/redis_rescue_$(date +%Y%m%d).rdb
```

---

*Last updated: 2026-06-02*  
*Procedure verified against idempotent bootstrap scripts v2026-06-02*
