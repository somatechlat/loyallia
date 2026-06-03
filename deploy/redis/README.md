# Redis

## Purpose

Redis serves as the **caching layer**, **Celery message broker**, and **Celery result backend** for the Loyallia platform. It is a critical dependency for:

- **Django caching** — Session storage, view caching, and API response caching.
- **Celery task queue** — `celery-pass`, `celery-push`, `celery-default`, and `celery-beat` workers communicate via Redis.
- **Rate limiting & real-time features** — Fast in-memory counters and pub/sub.

This directory contains the **Redis Sentinel** configuration for high availability and automatic failover.

## Files

| File | Description |
|------|-------------|
| `sentinel.conf` | Redis Sentinel configuration: master monitoring, failover parameters, and authentication. |

## Configuration

### `sentinel.conf`

| Directive | Value | Purpose |
|-----------|-------|---------|
| `sentinel resolve-hostnames yes` | — | Allow Sentinel to resolve container hostnames |
| `sentinel monitor loyallia-master redis 6379 2` | — | Monitor `redis:6379` as master; quorum = 2 Sentinels |
| `sentinel down-after-milliseconds loyallia-master 5000` | — | Mark master as down after 5 seconds unreachability |
| `sentinel failover-timeout loyallia-master 60000` | — | Complete failover within 60 seconds |
| `sentinel parallel-syncs loyallia-master 1` | — | Replicate to 1 replica at a time during failover |
| `sentinel auth-pass loyallia-master ${REDIS_PASSWORD}` | — | Authenticate with the master using the password from environment |

#### Environment Variable

| Variable | Source | Description |
|----------|--------|-------------|
| `REDIS_PASSWORD` | Vault (`redis_url` parsed) | Password for Sentinel-to-master authentication |

#### Modifying Failover Behavior

To make Sentinel more tolerant of brief network blips, increase `down-after-milliseconds`:

```
sentinel down-after-milliseconds loyallia-master 10000
```

To speed up failover in critical environments, lower `failover-timeout`:

```
sentinel failover-timeout loyallia-master 30000
```

After changes, restart Sentinel:

```bash
docker compose restart redis-sentinel
```

## Usage

### Redis Master

```bash
docker compose up -d redis
```

### Redis Sentinel

```bash
docker compose up -d redis-sentinel
```

### Checking Sentinel Status

```bash
docker compose exec redis-sentinel redis-cli -p 26379 SENTINEL master loyallia-master
docker compose exec redis-sentinel redis-cli -p 26379 SENTINEL slaves loyallia-master
```

### Manual Failover

```bash
docker compose exec redis-sentinel redis-cli -p 26379 SENTINEL failover loyallia-master
```

### Connecting from Application

The application should use the Redis URL stored in Vault:

```
redis://:<password>@redis:6379/0
```

Celery uses separate databases on the same Redis instance:
- Broker: `redis://:<password>@redis:6379/1`
- Result backend: `redis://:<password>@redis:6379/2`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Sentinel reports `+sdown` (subjectively down) | Verify `redis` container is healthy. Check network connectivity. Ensure `REDIS_PASSWORD` is correct. |
| Failover not occurring | Ensure at least `quorum` (2) Sentinels agree the master is down. Check Sentinel logs. |
| Application cannot connect to Redis | Verify the password in the Redis URL matches the one configured in Sentinel and the Redis container. |
| `NOAUTH Authentication required` | Redis password is set but application is not providing it. Update `redis_url` in Vault. |
| High memory usage | Set `maxmemory` and `maxmemory-policy` in the Redis container config (e.g., `allkeys-lru`). |
| Replication broken after failover | Update application config to point to the new master if not using a Sentinel-aware Redis client. |

## Related Docs

- [`deploy/vault/`](../vault/) — Vault stores `redis_url` and derived `redis_password`
- [`deploy/bootstrap/full-deploy.sh`](../bootstrap/full-deploy.sh) — Deployment orchestrator
- [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) — Caching and task queue architecture
