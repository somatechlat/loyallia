# Loyallia — Port Authority

All Loyallia services use the **33900** port range to avoid collisions with other projects.

## Port Map

| Port  | Service           | Internal Port | Description                        |
|-------|-------------------|---------------|------------------------------------|
| 33900 | PostgreSQL 16     | 5432          | Primary database                   |
| 33901 | PgBouncer         | 6432          | Connection pooling proxy           |
| 33902 | Redis 7           | 6379          | Cache + Celery broker              |
| 33903 | MinIO (API)       | 9000          | S3-compatible object storage       |
| 33904 | MinIO (Console)   | 9001          | MinIO web admin UI                 |
| 33905 | Django API        | 8000          | Backend REST API (Django Ninja)    |
| 33906 | Next.js Dashboard | 3000          | Frontend web dashboard             |
| 33907 | Flower            | 5555          | Celery worker monitor              |

## Access URLs

- **Dashboard**: http://localhost:33906
- **API Docs**: http://localhost:33905/api/v1/docs/
- **API Health**: http://localhost:33905/api/v1/health/
- **MinIO Console**: http://localhost:33904 (user: `loyallia_minio` / pass: `loyallia_minio_secret`)
- **Flower**: http://localhost:33907 (user: `admin` / pass: `loyallia_flower_secret`)

## Test Credentials

| Email                      | Password | Role        |
|----------------------------|----------|-------------|
| admin@loyallia.com         | 123456   | SUPER_ADMIN |
| test_owner@loyallia.com    | 123456   | OWNER       |
| test_manager@loyallia.com  | 123456   | MANAGER     |
| test_staff@loyallia.com    | 123456   | STAFF       |

## Docker Commands

```bash
# Start the entire stack
docker compose up -d --build

# View logs
docker compose logs -f api web

# Seed synthetic demo data (runs automatically on first boot)
docker compose exec api python manage.py seed_test_data

# Re-seed (wipe + fresh data)
docker compose exec api python manage.py seed_test_data --wipe

# Run Django migrations
docker compose exec api python manage.py migrate

# Stop everything
docker compose down

# Nuclear reset (wipe all volumes)
docker compose down -v
```
