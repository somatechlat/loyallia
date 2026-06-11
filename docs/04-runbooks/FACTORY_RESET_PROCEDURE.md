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
- [ ] Confirm `.agents/vault_init_rescue.json.age` exists and is valid encrypted rescue file
- [ ] Confirm `.agents/vault_secrets_rescue.json.age` exists
- [ ] Confirm `.agents/rescue/postgres_rescue_YYYYMMDD_HHMMSS.dump.age` exists (if data matters)
- [ ] Confirm `.agents/rescue/certs_rescue_YYYYMMDD_HHMMSS.tar.gz.age` exists
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
for vol in vault_data vault_runtime postgres_data postgres_replica_data redis_data minio_data static_files media_files prometheus_data grafana_data loki_data next_cache alertmanager_data sentinel_data; do
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
| `loyallia_alertmanager_data` | Alertmanager notifications state |
| `loyallia_sentinel_data` | Redis Sentinel configuration/state |

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
1. Check prerequisites (docker, docker compose)
2. Load or generate secrets → `.bootstrap_secrets.{mode}.env`
3. Prepare secure bootstrap volume
4. Start Vault + vault-init (secrets injected via read-only volume, **NEVER via env vars**)
5. Create rescue files (`init.json` + Vault KV secrets)
6. Start PostgreSQL, Redis, MinIO, PgBouncer, replica
7. Run migrations + seeds (API container startup)
8. Ensure SuperAdmin account exists
9. Start Celery workers, Flower, WhatsApp bridge, Web/Nginx, Prometheus, Grafana, Loki, Alertmanager
10. Start Redis Sentinel

- **Final:** Securely cleanup temp volume
- **Final:** Verify all containers healthy

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
docker compose exec -T api python manage.py seed_platform_settings --mode=development
docker compose exec -T api python manage.py seed_subscription_plans
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

If encrypted rescue files are missing, create them AFTER a successful bootstrap using the DR `create_rescue.sh` scripts (they produce `.age` encrypted files):

**Development:**
```bash
bash deploy/disaster_recovery/development/create_rescue.sh
```

**Production:**
```bash
bash deploy/disaster_recovery/production/create_rescue.sh
```

This creates files such as:
- `vault_init_rescue.json.age`
- `vault_secrets_rescue.json.age`
- `postgres_rescue_YYYYMMDD_HHMMSS.dump.age`
- `certs_rescue_YYYYMMDD_HHMMSS.tar.gz.age`
- `redis_rescue_YYYYMMDD_HHMMSS.rdb.age`
- `runtime_rescue_YYYYMMDD_HHMMSS.tar.gz.age`
- `rescue_manifest.json`

> **Note:** `scripts/export_local_vault.sh` only prints a redacted inventory to stdout and does not accept an output argument. Do not use it to create rescue files.

---

*Last updated: 2026-06-02*  
*Procedure verified against idempotent bootstrap scripts v2026-06-02*
