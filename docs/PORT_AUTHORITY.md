# Loyallia — Port Authority

All Loyallia services use the **33900** port range to avoid collisions with other projects.

## Port Map

| Port  | Service           | Internal Port | Memory Limit | Description                        |
|-------|-------------------|---------------|--------------|------------------------------------|
| 33900 | PostgreSQL 16     | 5432          | 1.5 GB       | Primary database (tuned)           |
| 33901 | PgBouncer         | 6432          | 128 MB       | Connection pooling proxy           |
| 33902 | Redis 7           | 6379          | 512 MB       | Cache + Celery broker (AOF)        |
| 33903 | MinIO (API)       | 9000          | 512 MB       | S3-compatible object storage       |
| 33904 | MinIO (Console)   | 9001          | —            | MinIO web admin UI (same container)|
| 33905 | Django API        | 8000          | 2 GB         | Backend REST API (Django Ninja)    |
| 33906 | Next.js Dashboard | 3000          | 2 GB         | Frontend web dashboard             |
| 33907 | Flower            | 5555          | 192 MB       | Celery worker monitor              |
| 33908 | HashiCorp Vault   | 8200          | 256 MB       | Secret management (KV v2)          |

### Internal-Only Services (no external ports)

| Service          | Memory Limit | Description                          |
|------------------|-------------|--------------------------------------|
| celery-pass      | 384 MB      | Pass generation worker               |
| celery-push      | 384 MB      | Push notification worker             |
| celery-default   | 384 MB      | Email, billing, automation worker    |
| celery-beat      | 192 MB      | Scheduled jobs (DatabaseScheduler)   |

> **Total Cluster Budget**: 10 GB RAM (≈8.9 GB allocated, rest for OS/Docker daemon)

## Access URLs

- **Dashboard**: http://localhost:33906
- **API Docs**: http://localhost:33905/api/v1/docs/
- **API Health**: http://localhost:33905/api/v1/health/
- **OpenAPI**: http://localhost:33905/api/v1/openapi.json
- **MinIO Console**: http://localhost:33904 (credentials in `.env`)
- **Flower**: http://localhost:33907 (credentials in `.env`)
- **Vault UI**: http://localhost:33908 (token in `.env`)

> **Security Note**: All service credentials are stored in the gitignored `.env` file.
> See `.env.example` for the required variable names without real values.

## Test Credentials (Development Only)

After running `seed_test_data` (runs automatically on startup):

| Email                      | Password | Role        |
|----------------------------|----------|-------------|
| admin@loyallia.com         | 123456   | SUPER_ADMIN |
| carlos@cafeelritmo.ec      | 123456   | OWNER       |
| gabriela@cafeelritmo.ec    | 123456   | MANAGER     |
| sebastian@cafeelritmo.ec   | 123456   | STAFF       |

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

# Seed subscription plans (runs in API startup; manual re-run)
docker compose exec api python manage.py seed_subscription_plans

# Seed synthetic demo data (runs in API startup; manual re-run)
docker compose exec api python manage.py seed_test_data

# Re-seed (wipe + fresh data)
docker compose exec api python manage.py seed_test_data --wipe

# Run Django migrations
docker compose exec api python manage.py migrate

# Run Django system check
docker compose exec api python manage.py check --deploy

# Run code quality check
docker compose exec api ruff check .

# Stop everything
docker compose down

# Nuclear reset (wipe all volumes - DESTRUCTIVE)
docker compose down -v
```

## Persistent Volumes

| Volume            | Service    | Purpose                         |
|-------------------|------------|----------------------------------|
| postgres_data     | PostgreSQL | Database files                   |
| redis_data        | Redis      | AOF + RDB persistence            |
| minio_data        | MinIO      | PKPass files, logos, assets      |
| static_files      | Django     | Collected static files           |
| media_files       | Django     | User-uploaded media              |
| next_cache        | Next.js    | Build cache (.next/cache)        |
| vault_data        | Vault      | Secret storage                   |
