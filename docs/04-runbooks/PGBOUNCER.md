# PgBouncer

## Purpose

[PgBouncer](https://www.pgbouncer.org/) is a lightweight **PostgreSQL connection pooler** that sits between Loyallia application services and the PostgreSQL primary. It reduces connection overhead, prevents connection exhaustion during traffic spikes, and improves overall database throughput.

PgBouncer is especially important for Loyallia because Django + Celery workers can open a large number of short-lived connections. PgBouncer reuses backend connections in **transaction pooling mode**, dramatically lowering the active connection count on PostgreSQL.

## Files

| File | Description |
|------|-------------|
| `pgbouncer.ini` | Main configuration: database routing, pooling parameters, auth, and logging. |

## Configuration

### `pgbouncer.ini`

#### `[databases]` — Backend Routing

```ini
* = host=postgres port=5432 auth_user=loyallia
```

The wildcard `*` proxies **all** database connections to the PostgreSQL primary. This includes `loyallia`, `test_loyallia`, and any other databases requested by the application.

To restrict to specific databases, replace `*` with explicit entries:
```ini
loyallia = host=postgres port=5432 auth_user=loyallia
test_loyallia = host=postgres port=5432 auth_user=loyallia
```

#### `[pgbouncer]` — Pool Settings

| Setting | Default | Purpose |
|---------|---------|---------|
| `listen_addr` | `0.0.0.0` | Bind to all interfaces inside the container |
| `listen_port` | `6432` | PgBouncer port (apps connect here instead of 5432) |
| `pool_mode` | `transaction` | Pool per transaction (best for Django) |
| `max_client_conn` | `1000` | Maximum incoming client connections |
| `default_pool_size` | `80` | Default number of backend connections per pool |
| `min_pool_size` | `20` | Minimum connections kept warm |
| `reserve_pool_size` | `20` | Extra connections for burst traffic |
| `reserve_pool_timeout` | `3` | Seconds to wait before using reserve pool |
| `server_lifetime` | `1800` | Max lifetime of a backend connection (seconds) |
| `server_idle_timeout` | `300` | Close idle backend connections after 5 minutes |
| `auth_type` | `scram-sha-256` | Password authentication method |
| `auth_file` | `/etc/pgbouncer/userlist.txt` | User/password mapping file |

#### Adjusting Pool Size

If PostgreSQL `max_connections` is increased, scale PgBouncer accordingly:

```ini
default_pool_size = 120
reserve_pool_size = 30
max_client_conn = 1500
```

Then restart:
```bash
docker compose restart pgbouncer
```

## Usage

### Connection String

Applications should connect to PgBouncer instead of PostgreSQL directly:

```
postgresql://user:pass@pgbouncer:6432/loyallia
```

In `docker-compose.yml`, ensure the app services use the PgBouncer hostname and port `6432`.

### Deploy / Restart

```bash
docker compose up -d pgbouncer
docker compose restart pgbouncer
```

### Admin Console

Connect to the PgBouncer admin console (from inside the container network):

```bash
docker compose exec pgbouncer psql -p 6432 -U postgres pgbouncer
```

Useful commands:
```sql
SHOW POOLS;      -- Active pools and connection counts
SHOW STATS;      -- Query throughput statistics
SHOW CLIENTS;    -- Connected clients
SHOW SERVERS;    -- Backend server connections
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `FATAL: no more connections allowed` | Increase `max_client_conn` or reduce application connection pool size. |
| `pooler error: query_wait_timeout` | Increase `reserve_pool_size` or lower application query latency. |
| Auth failures (`scram-sha-256`) | Verify `userlist.txt` contains the correct SCRAM password hash. Regenerate if passwords were rotated. |
| High backend connection count | Check `SHOW POOLS;` — if `cl_active` is low but `sv_active` is high, reduce `server_lifetime`. |
| PgBouncer not starting | Check `pgbouncer.ini` syntax. Ensure `auth_file` exists and is readable. |
| Slow queries after adding PgBouncer | Transaction mode breaks prepared statements and some session features. Use `session` pool mode only if required (not recommended for Django). |

## Related Docs

- [`deploy/postgres/`](../postgres/) — PostgreSQL primary and replica configuration
- [`deploy/bootstrap/full-deploy.sh`](../bootstrap/full-deploy.sh) — Deployment orchestrator
- [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) — Data layer architecture
