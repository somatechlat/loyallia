# AUDIT 5 — Infrastructure & DevOps

**Project:** Loyallia  
**Date:** 2026-04-29  
**Scope:** Docker, CI/CD, Deployment, Database, Redis, MinIO, Vault, Networking, Monitoring, Container Security  
**Methodology:** Line-by-line review of all infrastructure configuration files

---

## Severity Legend

| Rating | Meaning |
|--------|---------|
| 🔴 **CRITICAL** | Immediate security risk or data loss potential |
| 🟠 **HIGH** | Significant operational or security concern |
| 🟡 **MEDIUM** | Best-practice violation, potential future issue |
| 🟢 **LOW** | Enhancement opportunity, minor improvement |

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | 4 |
| 🟠 HIGH | 12 |
| 🟡 MEDIUM | 14 |
| 🟢 LOW | 6 |
| **Total** | **36** |

---

## 1. DOCKER CONFIGURATION

### INFRA-001 🔴 CRITICAL — Redis Exposed Without Authentication

**File:** `docker-compose.yml:117-135`

```yaml
redis:
    image: redis:7-alpine
    command: >
      redis-server
      --appendonly yes
      ...
    ports:
      - "127.0.0.1:33902:6379"
```

**Issue:** Redis runs with zero authentication. While bound to `127.0.0.1`, any local process or compromised container on the same network can connect. The `REDIS_URL` in the common environment block has no password:

```yaml
REDIS_URL: redis://redis:6379/0
CELERY_BROKER_URL: redis://redis:6379/1
CELERY_RESULT_BACKEND: redis://redis:6379/2
```

**Impact:** Any container on `loyallia-net` can read/write cached sessions, Celery task queues, and result backends. A compromised MinIO init container or any sidecar could inject malicious tasks.

**Remediation:**
```yaml
command: >
  redis-server
  --requirepass ${REDIS_PASSWORD}
  --appendonly yes
  ...
REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/0
```

---

### INFRA-002 🔴 CRITICAL — Vault Running in Dev Mode (Unsealed, In-Memory)

**File:** `docker-compose.yml:280-300`

```yaml
vault:
    image: hashicorp/vault:1.15
    environment:
      VAULT_DEV_ROOT_TOKEN_ID: ${VAULT_TOKEN:-loyallia-vault-root-token}
      VAULT_DEV_LISTEN_ADDRESS: 0.0.0.0:8200
```

**Issue:** Vault runs in `-dev` mode with:
- A hardcoded root token (`loyallia-vault-root-token`)
- No seal/unseal lifecycle
- Data stored in-memory (lost on restart)
- Listens on all interfaces inside the container

**Impact:** All secrets (database passwords, payment gateway keys, JWT secrets, OAuth secrets) are accessible to anyone who can reach port 8200 on the Docker network. The dev mode root token never expires and has full capabilities.

**Remediation:**
```hcl
# vault-config.hcl (production)
storage "file" {
  path = "/vault/data"
}
listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_cert_file = "/vault/tls/tls.crt"
  tls_key_file  = "/vault/tls/tls.key"
}
ui = true
disable_mlock = false
```
- Use production Vault server mode with file/consul storage
- Implement auto-unseal with cloud KMS (AWS KMS, GCP CKMS)
- Use AppRole or Kubernetes auth instead of static tokens
- Enable audit logging

---

### INFRA-003 🟠 HIGH — MinIO Default Credentials

**File:** `docker-compose.yml:144-158` and `.env.example:19-20`

```yaml
minio:
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
```

```env
# .env.example
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=CHANGE_ME_MINIO_PASSWORD
```

**Issue:** Default fallback is `minioadmin:minioadmin`. If `.env` is missing or `MINIO_ROOT_PASSWORD` is unset, MinIO starts with world-known credentials.

**Impact:** Full read/write access to all stored objects (loyalty passes, customer assets, invoices).

**Remediation:**
```yaml
minio:
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    # Remove defaults — fail hard if not set
```
Add a startup validation script that checks env vars before launching.

---

### INFRA-004 🟠 HIGH — Hardcoded Default SECRET_KEY Fallback

**File:** `docker-compose.yml:39`

```yaml
SECRET_KEY: ${SECRET_KEY:-change-me-in-production}
```

**Issue:** If `.env` is missing or `SECRET_KEY` is unset, Django starts with a publicly known secret key.

**Impact:** Session forgery, CSRF bypass, cryptographic signature compromise.

**Remediation:**
```yaml
SECRET_KEY: ${SECRET_KEY}
# Remove default — container should fail to start without it
```

---

### INFRA-005 🟠 HIGH — Flower Monitoring Exposed with Default Credentials

**File:** `docker-compose.yml:326-342`

```yaml
flower:
    command: celery -A loyallia flower --port=5555 --basic_auth=${FLOWER_BASIC_AUTH:-admin:changeme}
    ports:
      - "127.0.0.1:33907:5555"
```

**Issue:** Flower (Celery monitoring dashboard) has default credentials `admin:changeme` and exposes task details, worker status, and the ability to terminate/retry tasks.

**Impact:** An attacker with local network access can monitor all async operations, retry failed tasks maliciously, or terminate workers.

**Remediation:**
```yaml
command: celery -A loyallia flower --port=5555 --basic_auth=${FLOWER_BASIC_AUTH}
# Remove default — require explicit credentials
```

---

### INFRA-006 🟠 HIGH — PgBouncer Image Uses `:latest` Tag

**File:** `docker-compose.yml:87`

```yaml
pgbouncer:
    image: edoburu/pgbouncer:latest
```

**Issue:** The `edoburu/pgbouncer:latest` image is unpinned. Any upstream update could introduce breaking changes, bugs, or security vulnerabilities without warning.

**Impact:** Non-reproducible deployments; potential production breakage from upstream image changes.

**Remediation:**
```yaml
pgbouncer:
    image: edoburu/pgbouncer:1.23.1-p2  # Pin to specific version
```

---

### INFRA-007 🟠 HIGH — MinIO Image Uses `:latest` Tag

**File:** `docker-compose.yml:145`

```yaml
minio:
    image: minio/minio:latest
```

**Issue:** Same as INFRA-006. MinIO has had breaking changes between major releases (e.g., browser API changes, deprecation of gateway mode).

**Remediation:**
```yaml
minio:
    image: minio/minio:RELEASE.2024-06-13T22-53-53Z  # Pin to specific release
```

---

### INFRA-008 🟡 MEDIUM — PgBouncer Missing Healthcheck

**File:** `docker-compose.yml:86-107`

**Issue:** PgBouncer has no `healthcheck` defined. The `api` service depends on `pgbouncer: condition: service_started`, which only means the container started, not that PgBouncer is accepting connections.

**Impact:** API container may start before PgBouncer is ready to accept connections, causing transient startup failures.

**Remediation:**
```yaml
pgbouncer:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -h localhost -p 6432"]
      interval: 10s
      timeout: 5s
      retries: 5
```

---

### INFRA-009 🟡 MEDIUM — Celery Workers Have Healthchecks Disabled

**File:** `docker-compose.yml` (celery-pass, celery-push, celery-default, celery-beat)

```yaml
celery-pass:
    healthcheck:
      disable: true
```

**Issue:** All 4 Celery workers and beat have `healthcheck: disable: true`. If a worker hangs (deadlock, OOM), Docker/compose will not restart it.

**Impact:** Silent task processing failures. No automatic recovery from worker hangs.

**Remediation:**
```yaml
celery-pass:
    healthcheck:
      test: ["CMD-SHELL", "celery -A loyallia inspect ping --timeout 10 || exit 1"]
      interval: 60s
      timeout: 15s
      retries: 3
      start_period: 30s
```

---

### INFRA-010 🟡 MEDIUM — No Docker Compose Network Segmentation

**File:** `docker-compose.yml:382-384`

```yaml
networks:
  loyallia-net:
    driver: bridge
```

**Issue:** All 12+ services share a single flat network. Any compromised container can reach every other service (PostgreSQL, Redis, MinIO, Vault, Flower).

**Impact:** Lateral movement from a compromised service to all others.

**Remediation:**
```yaml
networks:
  frontend-net:    # web, nginx
  backend-net:     # api, celery workers, postgres, pgbouncer
  storage-net:     # minio, minio-init
  secrets-net:     # vault (restricted)
  monitoring-net:  # flower
```

---

### INFRA-011 🟡 MEDIUM — Source Code Volume-Mounted in Development

**File:** `docker-compose.yml:182-187`

```yaml
api:
    volumes:
      - ./backend:/app
```

**Issue:** In the base `docker-compose.yml`, the API container mounts the entire backend source directory. While `docker-compose.prod.yml` removes this, the base config is a security risk if accidentally used in production.

**Impact:** Source code exposure; potential code injection if the host filesystem is compromised.

**Remediation:** Consider making the base compose file more production-like, with a `docker-compose.dev.yml` override that adds volume mounts for development.

---

### INFRA-012 🟢 LOW — Celery Beat Runs as Single Instance (No Leader Election)

**File:** `docker-compose.yml:310-330`

```yaml
celery-beat:
    command: celery -A loyallia beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

**Issue:** If multiple instances of celery-beat are started (e.g., during scaling), duplicate scheduled tasks will fire.

**Impact:** Duplicate task execution during scaling events.

**Remediation:** The `DatabaseScheduler` helps mitigate this, but for true safety, use a distributed lock or ensure only one instance runs. Consider adding a note or using `--pidfile` to prevent duplicate processes.

---

## 2. CONTAINER SECURITY

### INFRA-013 🟠 HIGH — API Container Exposes Port on All Interfaces

**File:** `docker-compose.yml:188`

```yaml
api:
    ports:
      - "33905:8000"
```

**Issue:** Unlike PostgreSQL (`127.0.0.1:33900:5432`) and Redis (`127.0.0.1:33902:6379`), the API port is bound to `0.0.0.0:33905`, making it accessible from any network interface.

**Impact:** The Django API is directly accessible from the public internet without passing through Nginx (which adds rate limiting, TLS, security headers).

**Remediation:**
```yaml
api:
    ports:
      - "127.0.0.1:33905:8000"
```
Nginx should be the only public-facing entry point.

---

### INFRA-014 🟠 HIGH — Web Container Exposes Port on All Interfaces

**File:** `docker-compose.yml:220`

```yaml
web:
    ports:
      - "33906:3000"
```

**Issue:** Same as INFRA-013. The Next.js frontend is directly accessible from any network interface.

**Remediation:**
```yaml
web:
    ports:
      - "127.0.0.1:33906:3000"
```

---

### INFRA-015 🟡 MEDIUM — Containers Run Without `read_only: true`

**File:** `docker-compose.yml` (all services)

**Issue:** No container has `read_only: true`. A compromised process could write to any filesystem location within the container.

**Remediation:**
```yaml
api:
    read_only: true
    tmpfs:
      - /tmp
      - /app/staticfiles
```

---

### INFRA-016 🟡 MEDIUM — No `security_opt` or `cap_drop` on Any Container

**File:** `docker-compose.yml` (all services)

**Issue:** No containers drop Linux capabilities or set security options (e.g., `no-new-privileges`). Only Vault has `cap_add: [IPC_LOCK]`, but no other container drops unnecessary capabilities.

**Remediation:**
```yaml
api:
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE  # Only if needed
```

---

### INFRA-017 🟡 MEDIUM — Frontend Dockerfile Missing HEALTHCHECK

**File:** `frontend/Dockerfile`

**Issue:** The frontend Dockerfile has no `HEALTHCHECK` instruction. The `web` service in docker-compose also has no healthcheck.

**Remediation:**
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1
```

---

### INFRA-018 🟢 LOW — Frontend Dockerfile Uses `npm install` Instead of `npm ci`

**File:** `frontend/Dockerfile:6`

```dockerfile
COPY package.json ./
RUN npm install --legacy-peer-deps
```

**Issue:** `npm install` may generate a different `package-lock.json` or resolve dependencies differently than the development environment.

**Remediation:**
```dockerfile
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
```

---

## 3. CI/CD PIPELINE

### INFRA-019 🟠 HIGH — No SAST (Static Application Security Testing)

**File:** `.github/workflows/ci.yml`

**Issue:** The CI pipeline has Trivy for container image scanning and `pip-audit` for dependency vulnerabilities, but no SAST tool for code-level security analysis (e.g., Bandit for Python, Semgrep, CodeQL).

**Impact:** Vulnerabilities like SQL injection, insecure deserialization, or path traversal in application code are not caught during CI.

**Remediation:**
```yaml
  sast:
    name: SAST Analysis
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Bandit (Python SAST)
        run: |
          pip install bandit
          bandit -r backend/ -f json -o bandit-report.json --severity-level medium || true
      - name: Run Semgrep
        uses: semgrep/semgrep-action@v1
        with:
          config: p/python p/javascript
```

---

### INFRA-020 🟡 MEDIUM — No Frontend Dependency Audit Failure Gate

**File:** `.github/workflows/ci.yml:107-108`

```yaml
      - name: Audit Node.js dependencies
        working-directory: frontend
        run: npm audit --production --audit-level=high || true
```

**Issue:** The `|| true` means npm audit failures are silently ignored. Critical vulnerabilities in frontend dependencies will not block the build.

**Remediation:**
```yaml
      - name: Audit Node.js dependencies
        working-directory: frontend
        run: npm audit --production --audit-level=critical
        # Remove || true to fail on critical vulnerabilities
```

---

### INFRA-021 🟡 MEDIUM — No Docker Image Push / Registry Step

**File:** `.github/workflows/ci.yml`

**Issue:** The CI builds Docker images but never pushes them to a registry (Docker Hub, ECR, GCR, etc.). There is no automated deployment pipeline.

**Impact:** Manual deployment process; no automated rollback capability; no immutable image artifacts.

**Remediation:**
```yaml
  publish:
    name: Publish Images
    needs: [backend, frontend, security]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ secrets.REGISTRY_URL }}
          username: ${{ secrets.REGISTRY_USER }}
          password: ${{ secrets.REGISTRY_PASSWORD }}
      - name: Build and Push
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ${{ secrets.REGISTRY_URL }}/loyallia-api:${{ github.sha }}
```

---

### INFRA-022 🟡 MEDIUM — No TruffleHog / Secret Scanning in CI

**File:** `.github/workflows/ci.yml`

**Issue:** No secret scanning step to detect accidentally committed API keys, passwords, or tokens.

**Remediation:**
```yaml
      - name: Scan for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --only-verified
```

---

### INFRA-023 🟡 MEDIUM — No SBOM (Software Bill of Materials) Generation

**File:** `.github/workflows/ci.yml`

**Issue:** No SBOM is generated for supply chain transparency and compliance.

**Remediation:** Add SBOM generation using Syft or Trivy's SBOM mode:
```yaml
      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with:
          image: loyallia-api:scan
          format: spdx-json
```

---

### INFRA-024 🟢 LOW — CI Test Coverage Not Uploaded

**File:** `.github/workflows/ci.yml:40-48`

```yaml
      - name: Run tests
        run: python manage.py test --verbosity=2
```

**Issue:** Tests run with `pytest-cov` installed but coverage is never collected or reported.

**Remediation:**
```yaml
      - name: Run tests
        run: pytest --cov=. --cov-report=xml --cov-report=html
      - name: Upload coverage
        uses: codecov/codecov-action@v4
```

---

## 4. DATABASE (PostgreSQL)

### INFRA-025 🟠 HIGH — No Database Backup Automation

**File:** `docker-compose.yml:56-83`, `postgres/init.sql`

**Issue:** PostgreSQL runs with persistent volumes but has zero backup automation. No `pg_dump` cron job, no WAL archiving configuration, no replication.

**Impact:** Data loss on volume corruption, accidental deletion, or hardware failure.

**Remediation:**
```yaml
  pg-backup:
    image: postgres:16-alpine
    command: >
      sh -c "
      while true; do
        pg_dump -h postgres -U loyallia loyallia | gzip > /backups/loyallia_$$(date +%Y%m%d_%H%M%S).sql.gz
        find /backups -mtime +7 -delete
        sleep 86400
      done"
    volumes:
      - pg_backups:/backups
    environment:
      PGPASSWORD: ${POSTGRES_PASSWORD}
```

Or use a dedicated tool like `pgbackrest` or `wal-g`.

---

### INFRA-026 🟡 MEDIUM — PostgreSQL Not Configured for WAL Archiving

**File:** `docker-compose.yml:66-82`

**Issue:** The PostgreSQL command-line options don't include WAL archiving settings. Without WAL archiving, point-in-time recovery is impossible.

**Remediation:**
```yaml
command:
  - "postgres"
  - "-c"
  - "wal_level=replica"
  - "-c"
  - "archive_mode=on"
  - "-c"
  - "archive_command=cp %p /var/lib/postgresql/wal_archive/%f"
  - "-c"
  - "max_wal_senders=3"
```

---

### INFRA-027 🟡 MEDIUM — init.sql Missing `pg_stat_statements` Extension

**File:** `postgres/init.sql`

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
```

**Issue:** `pg_stat_statements` is not enabled. This extension is critical for identifying slow queries and performance bottlenecks.

**Remediation:**
```sql
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
```
And add `-c shared_preload_libraries=pg_stat_statements` to the PostgreSQL command.

---

### INFRA-028 🟢 LOW — PgBouncer `DEFAULT_POOL_SIZE` May Be Too High

**File:** `docker-compose.yml:98`

```yaml
DEFAULT_POOL_SIZE: "80"
```

**Issue:** With `max_connections=200` on PostgreSQL and 80 pool size per database, if multiple services use PgBouncer, the total server connections could exceed the PostgreSQL limit.

**Remediation:** Calculate: `pool_size × number_of_databases ≤ max_connections`. Consider reducing to `40` or using `max_db_connections` to enforce the limit.

---

## 5. REDIS

### INFRA-029 🟡 MEDIUM — Redis Memory Policy is `allkeys-lru`

**File:** `docker-compose.yml:123`

```yaml
--maxmemory-policy allkeys-lru
```

**Issue:** `allkeys-lru` evicts any key when memory is full, including Celery task results and critical cache entries. `volatile-lru` would only evict keys with an expiration set.

**Impact:** Critical non-expiring keys (e.g., rate limit counters) could be evicted under memory pressure.

**Remediation:**
```yaml
--maxmemory-policy volatile-lru
```
Ensure all cache keys have TTLs set. Use `volatile-lru` to protect keys without expiration.

---

### INFRA-030 🟢 LOW — Redis `--timeout 0` (No Idle Client Disconnect)

**File:** `docker-compose.yml:125`

```yaml
--timeout 0
```

**Issue:** Idle client connections are never closed. Under connection leaks, Redis could hit the `maxclients` limit.

**Remediation:**
```yaml
--timeout 300  # Close idle connections after 5 minutes
```

---

## 6. MINIO

### INFRA-031 🟠 HIGH — MinIO `assets` Bucket Set to Public Download

**File:** `docker-compose.yml:163`

```yaml
mc anonymous set download local/assets
```

**Issue:** The `assets` bucket is set to anonymous public download. Any object stored in this bucket is publicly accessible without authentication.

**Impact:** If sensitive assets (customer data, invoices, internal documents) are stored in the `assets` bucket, they are publicly accessible.

**Remediation:**
```yaml
# Only make specific prefixes public, not the entire bucket
mc anonymous set download local/assets/public/
# Keep the rest private
mc anonymous set none local/assets/
```
Or use presigned URLs for private assets.

---

### INFRA-032 🟡 MEDIUM — MinIO `passes` Bucket Has No Explicit Policy

**File:** `docker-compose.yml:162`

```yaml
mc mb --ignore-existing local/passes
```

**Issue:** The `passes` bucket is created with default (private) policy, but there's no explicit policy configuration documented. If someone accidentally runs `mc anonymous set download local/passes`, all loyalty passes become public.

**Remediation:** Explicitly set and document bucket policies:
```yaml
mc anonymous set none local/passes
```

---

### INFRA-033 🟡 MEDIUM — MinIO Default SSL Verification Disabled

**File:** `backend/loyallia/settings/base.py:195`

```python
AWS_S3_VERIFY = False  # Set True in production with valid TLS
```

**Issue:** SSL verification is disabled for S3 connections to MinIO. In production with TLS, this should be `True`.

**Remediation:** Set `AWS_S3_VERIFY = True` in production settings.

---

## 7. VAULT

### INFRA-034 🟠 HIGH — Vault Init Container Seeds Secrets from Environment

**File:** `docker-compose.yml:302-320`

```yaml
vault-init:
    environment:
      _SECRET_KEY: ${SECRET_KEY:-dev-only-change-me}
      _POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-loyallia_dev_password}
      ...
    entrypoint: >
      /bin/sh -c "vault kv put -mount=secret loyallia secret_key=\"$${_SECRET_KEY}\" ..."
```

**Issue:** The vault-init container takes secrets from environment variables (which come from `.env`) and writes them into Vault. This creates a circular dependency: Vault is supposed to be the source of truth, but it's being seeded from the same `.env` file.

**Impact:** Secrets exist in plaintext in `.env` AND in Vault. The `.env` file becomes the weakest link.

**Remediation:**
- Use Vault's `vault operator init` to generate initial secrets
- Use `vault kv import` for bulk secret loading from a secure, encrypted source
- Implement a proper secret rotation workflow

---

### INFRA-035 🟢 LOW — Vault Token Never Rotated

**File:** `docker-compose.yml:283`

```yaml
VAULT_DEV_ROOT_TOKEN_ID: ${VAULT_TOKEN:-loyallia-vault-root-token}
```

**Issue:** The Vault root token is static and never rotated. Combined with dev mode, this is a persistent credential.

**Remediation:** In production, use short-lived tokens with AppRole auth or Kubernetes service account auth.

---

## 8. NETWORKING

### INFRA-036 🟠 HIGH — No TLS Between Internal Services

**File:** `docker-compose.yml` (all services)

**Issue:** All inter-service communication (API→PostgreSQL, API→Redis, API→MinIO, API→Vault) happens over plain HTTP/TCP within the Docker network. Nginx terminates TLS at the edge, but internal traffic is unencrypted.

**Impact:** Network sniffing within the Docker host could expose database queries, cached data, and Vault secrets.

**Remediation:**
- Enable TLS on PostgreSQL (`sslmode=require`)
- Enable TLS on Redis (`--tls-port 6379 --tls-cert-file ...`)
- Enable TLS on MinIO and Vault
- Use Docker overlay networks with encryption for multi-host deployments

---

### INFRA-037 🟡 MEDIUM — Nginx Config Missing Rate Limiting for Websocket/SSE

**File:** `deploy/rewards.loyallia.com.conf`

**Issue:** The Nginx config has rate limiting for auth, upload, and general API endpoints, but no specific handling for long-lived connections (WebSockets, Server-Sent Events) which could bypass rate limits.

**Remediation:** Add `proxy_read_timeout` and connection limiting for WebSocket endpoints.

---

### INFRA-038 🟢 LOW — Nginx Missing `server_tokens off`

**File:** `deploy/rewards.loyallia.com.conf`

**Issue:** Server version information is not hidden in Nginx responses.

**Remediation:**
```nginx
server_tokens off;
```

---

## 9. MONITORING & OBSERVABILITY

### INFRA-039 🟠 HIGH — No Monitoring Stack (Prometheus/Grafana)

**File:** `docker-compose.yml` (entire file)

**Issue:** There is no monitoring stack. No Prometheus for metrics collection, no Grafana for dashboards, no alerting system (Alertmanager, PagerDuty integration).

**Impact:** No visibility into system health, no proactive alerting for failures, no capacity planning data.

**Remediation:**
```yaml
  prometheus:
    image: prom/prometheus:v2.51.0
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "127.0.0.1:33909:9090"

  grafana:
    image: grafana/grafana:10.4.0
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - "127.0.0.1:33910:3000"

  alertmanager:
    image: prom/alertmanager:v0.27.0
```

---

### INFRA-040 🟠 HIGH — No Log Aggregation

**File:** `docker-compose.yml`, `backend/loyallia/settings/base.py`

**Issue:** Logs are only written to stdout/stderr (`console` handler). There is no log aggregation (ELK, Loki, CloudWatch), no log retention policy, and no centralized log search.

**Impact:** Debugging production issues requires SSH access; logs are lost on container restart; no audit trail.

**Remediation:**
```yaml
  loki:
    image: grafana/loki:2.9.6
    ports:
      - "127.0.0.1:33911:3100"

  promtail:
    image: grafana/promtail:2.9.6
    volumes:
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
```

---

### INFRA-041 🟡 MEDIUM — No Uptime Monitoring / External Health Checks

**File:** N/A

**Issue:** No external uptime monitoring (e.g., UptimeRobot, Pingdom, Healthchecks.io). If the server goes down, there's no alerting.

**Remediation:** Set up external health check monitoring for:
- `https://rewards.loyallia.com/api/v1/health/`
- SSL certificate expiration monitoring

---

## 10. DEPLOYMENT

### INFRA-042 🟠 HIGH — No Blue-Green or Canary Deployment Strategy

**File:** N/A (missing)

**Issue:** There is no deployment strategy. The `docker-compose.prod.yml` is a direct in-place update. During deployment, there is downtime while containers restart.

**Impact:** Zero-downtime deployments are impossible; failed deployments require manual rollback.

**Remediation:**
- Implement blue-green deployment with two compose stacks
- Or migrate to Kubernetes with rolling updates
- Or use Docker Swarm with `docker stack deploy`

---

### INFRA-043 🟠 HIGH — No Rollback Strategy

**File:** N/A (missing)

**Issue:** There is no documented or automated rollback procedure. If a bad deployment happens, recovery requires manual intervention.

**Remediation:**
- Tag Docker images with git SHA
- Keep previous image versions available
- Create a rollback script:
```bash
#!/bin/bash
PREVIOUS_TAG=$1
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

### INFRA-044 🟡 MEDIUM — No Infrastructure-as-Code

**File:** N/A (missing)

**Issue:** No Terraform, Pulumi, CloudFormation, or other IaC tooling. Server provisioning is manual.

**Impact:** Non-reproducible infrastructure; manual configuration drift; no disaster recovery.

**Remediation:** Create `infra/` directory with:
- `infra/main.tf` (Terraform) or `infra/Pulumi.yaml`
- Server provisioning, networking, DNS, SSL certificates
- State management with remote backend

---

### INFRA-045 🟡 MEDIUM — Migrations Run in API Container Startup

**File:** `docker-compose.yml:177-179`, `docker-compose.prod.yml:22-25`

```yaml
command: >
  sh -c "python manage.py migrate --noinput &&
  python manage.py collectstatic --noinput &&
  ...
  gunicorn ..."
```

**Issue:** Database migrations run as part of the API container startup. If migrations fail, the API won't start. During rolling deployments, multiple API instances could attempt the same migration simultaneously.

**Remediation:**
- Run migrations as a separate one-shot job before deploying the API
- Use `docker compose run --rm api python manage.py migrate --noinput`
- Or use a dedicated migration container in Kubernetes

---

### INFRA-046 🟢 LOW — No Container Image Scanning in Production

**File:** `.github/workflows/ci.yml` (security job)

**Issue:** Trivy scanning happens in CI but there's no scanning of images before production deployment (e.g., in a CD pipeline).

**Remediation:** Add image scanning as part of the deployment pipeline, not just CI.

---

## 11. ADDITIONAL FINDINGS

### INFRA-047 🟡 MEDIUM — Frontend Dockerfile Node.js Version Not Pinned to Patch

**File:** `frontend/Dockerfile:4,12,22`

```dockerfile
FROM node:20-alpine AS deps
FROM node:20-alpine AS builder
FROM node:20-alpine AS runner
```

**Issue:** `node:20-alpine` resolves to the latest 20.x patch. Different builds may get different Node.js versions.

**Remediation:**
```dockerfile
FROM node:20.11.1-alpine AS deps
```

---

### INFRA-048 🟢 LOW — Backend Dockerfile `COPY . .` After User Creation

**File:** `backend/Dockerfile:32-37`

```dockerfile
RUN groupadd -r loyallia && useradd -r -g loyallia loyallia && \
    mkdir -p /app/staticfiles /app/mediafiles && \
    chown -R loyallia:loyallia /app

USER loyallia
```

**Issue:** The `COPY . .` at line 30 copies files before the user is created. The files are then chowned. This is correct but adds an extra layer. Consider reordering to reduce layer size.

**Note:** This is actually correctly implemented — files are copied, then ownership is changed, then the user switches. No issue here, just a note for optimization.

---

### INFRA-049 🟢 LOW — No `.env.example` Validation

**File:** `.env.example`

**Issue:** No automated validation that all required environment variables are set before container startup.

**Remediation:**
```bash
# Add to docker-compose entrypoint
required_vars="SECRET_KEY POSTGRES_PASSWORD MINIO_ROOT_PASSWORD"
for var in $required_vars; do
  eval value=\$$var
  if [ -z "$value" ]; then
    echo "ERROR: Required environment variable $var is not set"
    exit 1
  fi
done
```

---

## Priority Remediation Roadmap

### Phase 1 — Immediate (Week 1)
1. **INFRA-001**: Add Redis authentication
2. **INFRA-002**: Replace Vault dev mode with production configuration
3. **INFRA-003**: Remove MinIO default credentials
4. **INFRA-004**: Remove SECRET_KEY fallback
5. **INFRA-013/014**: Bind all ports to `127.0.0.1`

### Phase 2 — Short-term (Weeks 2-3)
6. **INFRA-019**: Add SAST to CI pipeline
7. **INFRA-025**: Implement database backup automation
8. **INFRA-031**: Fix MinIO bucket policies
9. **INFRA-006/007**: Pin all image tags
10. **INFRA-005**: Secure Flower credentials

### Phase 3 — Medium-term (Month 1-2)
11. **INFRA-039/040**: Deploy monitoring and log aggregation
12. **INFRA-010**: Implement network segmentation
13. **INFRA-042/043**: Design deployment and rollback strategy
14. **INFRA-036**: Enable internal TLS

### Phase 4 — Long-term (Quarter)
15. **INFRA-044**: Infrastructure-as-Code
16. **INFRA-015/016**: Container hardening (read-only, capability drops)
17. **INFRA-021**: Automated image publishing and CD pipeline

---

## Positive Observations

The infrastructure has several well-designed aspects worth acknowledging:

1. ✅ **Multi-stage Dockerfiles** — Both frontend and backend use multi-stage builds to minimize image size
2. ✅ **Non-root container users** — Both Dockerfiles create and switch to non-root users
3. ✅ **Resource limits** — All containers have memory and CPU limits defined
4. ✅ **Healthchecks** — Core services (PostgreSQL, Redis, MinIO, API) have healthchecks
5. ✅ **Graceful shutdown** — `stop_grace_period: 30s` on API and web containers
6. ✅ **PgBouncer for connection pooling** — Proper transaction-mode pooling with `conn_max_age=0`
7. ✅ **Celery task routing** — Dedicated queues for different task types
8. ✅ **`max-tasks-per-child`** — Prevents memory leaks in Celery workers
9. ✅ **PostgreSQL tuning** — `shared_buffers`, `effective_cache_size`, `work_mem` properly configured
10. ✅ **Nginx security headers** — HSTS, CSP, X-Frame-Options, rate limiting
11. ✅ **Vault integration** — Secret management with env fallback pattern
12. ✅ **Trivy image scanning** in CI
13. ✅ **`.gitignore`** properly excludes secrets, credentials, and sensitive files
14. ✅ **`--data-checksums`** on PostgreSQL init
15. ✅ **Argon2 password hashing** configured

---

*End of Infrastructure & DevOps Audit*
