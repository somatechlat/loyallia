# Loyallia — Port Authority

Primary Loyallia services use the **33900** port range to avoid collisions with other projects. Supporting services (monitoring, alerting, Redis Sentinel) use their standard ports.

## Port Map

| Port  | Service           | Internal Port | Memory Limit | Description                        |
|-------|-------------------|---------------|--------------|------------------------------------|
| 33900 | PostgreSQL 17     | 5432          | 1.5 GB       | Primary database (tuned)           |
| 33901 | PgBouncer         | 6432          | 128 MB       | Connection pooling proxy           |
| 33902 | Redis 7           | 6379          | 512 MB       | Cache + Celery broker (AOF)        |
| 33903 | MinIO (API)       | 9000          | 512 MB       | S3-compatible object storage       |
| 33904 | MinIO (Console)   | 9001          | —            | MinIO web admin UI (same container)|
| 33905 | Django API        | 8000          | 2 GB         | Backend REST API (Django Ninja)    |
| 33906 | Next.js Dashboard | 3000          | 2 GB         | Frontend web dashboard             |
| 33907 | Flower            | 5555          | 192 MB       | Celery worker monitor              |
| 33908 | HashiCorp Vault   | 8200          | 256 MB       | Secret management (KV v2)          |
| 33909 | Prometheus        | 9090          | 512 MB       | Metrics collection                 |
| 33910 | Grafana           | 3000          | 512 MB       | Metrics dashboards                 |
| 33911 | PostgreSQL Replica| 5432          | 512 MB       | Hot standby read replica           |
| 33912 | Loki              | 3100          | 256 MB       | Log aggregation                    |
| 33914 | WhatsApp Bridge   | 3001          | 256 MB       | Multi-tenant WhatsApp messaging    |
| 9093  | Alertmanager      | 9093          | 128 MB       | Alert routing                      |
| 26379 | Redis Sentinel    | 26379         | 128 MB       | Redis HA failover                  |
| 80    | Nginx             | 80            | 256 MB       | Reverse proxy (development HTTP)   |

### Internal-Only Services (no external ports)

| Service          | Memory Limit | Description                          |
|------------------|-------------|--------------------------------------|
| celery-pass      | 384 MB      | Pass generation worker               |
| celery-push      | 384 MB      | Push notification worker             |
| celery-default   | 384 MB      | Email, billing, automation worker    |
| celery-beat      | 192 MB      | Scheduled jobs (DatabaseScheduler)   |

> **Total Cluster Budget**: 12 GB RAM total; individual container limits sum to ≈10.9 GB (see `docker-compose.yml` resource limits).

## Access URLs

- **Dashboard**: http://localhost:33906
- **API Docs**: http://localhost:33905/api/v1/docs/
- **API Health**: http://localhost:33905/api/v1/health/
- **OpenAPI**: http://localhost:33905/api/v1/openapi.json
- **MinIO Console**: http://localhost:33904 (credentials in HashiCorp Vault)
- **Flower**: http://localhost:33907 (basic auth in HashiCorp Vault)
- **Vault UI**: https://localhost:33908 (token in the Vault init file, not `.env`)
- **Grafana**: http://localhost:33910 (admin password in HashiCorp Vault)

> **Security Note**: All service credentials are stored in HashiCorp Vault.
> Port bindings use `DOCKER_BIND_HOST` (default `127.0.0.1`). Set to `0.0.0.0` for LAN access.

## Test Credentials (Development Only)

After running `seed_test_data`, test accounts are created for each role. See the
seed command source for email/password values:
`backend/apps/tenants/management/commands/seed_test_data.py`

> **Never commit credentials to version control.** All passwords are set via
> environment variables or the seed command.

## Docker Commands

```bash
# Start the entire stack (builds + migrates + seeds automatically)
docker compose up -d --build

# View logs (API + Frontend)
docker compose logs -f api web

# View all service statuses
docker compose ps

# Check memory usage
docker stats --no-stream

# Seed subscription plans (manual re-run)
docker compose exec api python manage.py seed_subscription_plans

# Seed synthetic demo data (manual re-run)
docker compose exec api python manage.py seed_test_data

# Re-seed (wipe + fresh data)
docker compose exec api python manage.py seed_test_data --wipe

# Run Django migrations
docker compose exec api python manage.py migrate

# Run Django system check
docker compose exec api python manage.py check --deploy

# Run code quality check (requires ruff in your host Python environment)
cd backend && python -m ruff check .

# Stop everything
docker compose down

# Nuclear reset (wipe all volumes - DESTRUCTIVE)
docker compose down -v
```

## Persistent Volumes

| Volume            | Service    | Purpose                         |
|-------------------|------------|----------------------------------|
| postgres_data     | PostgreSQL | Database files                   |
| postgres_replica_data | PostgreSQL | Replica database files         |
| redis_data        | Redis      | AOF + RDB persistence            |
| sentinel-data     | Redis Sentinel | Sentinel state               |
| minio_data        | MinIO      | PKPass files, logos, assets      |
| static_files      | Django     | Collected static files           |
| media_files       | Django     | User-uploaded media              |
| next_cache        | Next.js    | Build cache (.next/cache)        |
| vault_data        | Vault      | Secret storage                   |
| vault_runtime     | Vault      | Runtime secrets for containers   |
| prometheus_data   | Prometheus | Time-series metrics              |
| grafana_data      | Grafana    | Dashboards and users             |
| loki_data         | Loki       | Log streams                      |
| alertmanager-data | Alertmanager | Alert state                    |
