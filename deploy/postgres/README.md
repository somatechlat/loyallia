# PostgreSQL

## Purpose

This directory contains the **PostgreSQL configuration** for the Loyallia platform, including host-based authentication (`pg_hba.conf`) and the **streaming replica entrypoint script**. PostgreSQL is the primary relational database for the platform, storing all business data, user accounts, wallet passes, and campaign records.

Loyallia uses a **primary + streaming replica** setup for high availability and read scaling:
- **Primary** — Accepts all writes and reads.
- **Replica** — Hot standby fed via streaming replication from the primary.

## Files

| File | Description |
|------|-------------|
| `pg_hba.conf` | Host-Based Authentication rules controlling who can connect, from where, and using which auth method. |
| `replica-entrypoint.sh` | Entrypoint for the `postgres-replica` container. Performs `pg_basebackup` from the primary and starts PostgreSQL in hot-standby mode. |

## Configuration

### `pg_hba.conf`

Each line has the format: `TYPE  DATABASE  USER  ADDRESS  METHOD`

| Rule | Type | Database | User | Address | Method | Purpose |
|------|------|----------|------|---------|--------|---------|
| Local socket | `local` | `all` | `all` | — | `trust` | Unix socket inside the container (restricted namespace) |
| Replication | `host` | `replication` | `loyallia` | `samenet` | `scram-sha-256` | Streaming replica on same Docker network |
| IPv4 app | `host` | `all` | `all` | `0.0.0.0/0` | `scram-sha-256` | Application and PgBouncer connections |
| IPv6 app | `host` | `all` | `all` | `::/0` | `scram-sha-256` | IPv6 application connections |

#### Modifying Access Rules

To restrict application access to a specific subnet:

```
host  all  all  10.0.0.0/8  scram-sha-256
```

Replace the `0.0.0.0/0` lines with your trusted CIDRs. Then reload PostgreSQL:

```bash
docker compose exec postgres pg_ctl reload
```

### `replica-entrypoint.sh`

This script runs inside the `postgres-replica` container and:

1. Reads the replication password from `/run/loyallia-vault/postgres_password` (injected by Vault init).
2. If `PG_VERSION` does not exist in the data directory, runs `pg_basebackup` from the primary (`postgres:5432`).
3. Writes `primary_conninfo` and `hot_standby = on` to `postgresql.auto.conf`.
4. Creates `standby.signal` to indicate this is a replica.
5. Starts `postgres` with replica-appropriate settings.

#### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `loyallia` | Replication username |

#### Replica Settings (hardcoded in script)

| Setting | Value | Purpose |
|---------|-------|---------|
| `hot_standby` | `on` | Allow read-only queries on replica |
| `max_connections` | `200` | Connection limit |
| `shared_buffers` | `256MB` | Buffer cache size |
| `work_mem` | `8MB` | Per-operation memory |

## Usage

### Starting the Primary

```bash
docker compose up -d postgres
```

### Starting the Replica

```bash
docker compose up -d postgres-replica
```

The replica will automatically perform an initial base backup if its data directory is empty.

### Checking Replication Status

On the **primary**:
```sql
SELECT * FROM pg_stat_replication;
```

On the **replica**:
```sql
SELECT * FROM pg_stat_wal_receiver;
```

### Promoting Replica to Primary (Failover)

If the primary fails, promote the replica:

```bash
docker compose exec postgres-replica gosu postgres pg_ctl promote
```

Then update application connection strings to point to the new primary.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Replica stuck in `pg_basebackup` loop | Verify primary is running and accepts replication connections. Check `pg_hba.conf` allows `samenet` for replication user. |
| `FATAL: password authentication failed` | Ensure `postgres_password` in Vault matches the `pg_hba.conf` auth method (`scram-sha-256`). |
| Replication lag growing | Check network between primary and replica. Increase `wal_keep_size` on primary if needed. |
| `could not connect to primary` | Verify Docker DNS resolution (`postgres` hostname). Check firewall rules between containers. |
| `hot_standby` not working | Ensure `standby.signal` exists in replica data dir. Check replica logs for config errors. |
| Local `trust` auth concern | This is safe because the `local` rule applies only inside the container's Unix socket namespace, which is isolated by Docker. |

## Related Docs

- [`deploy/pgbouncer/`](../pgbouncer/) — Connection pooling in front of PostgreSQL
- [`deploy/vault/`](../vault/) — Vault injects `postgres_password` into containers
- [`deploy/bootstrap/full-deploy.sh`](../bootstrap/full-deploy.sh) — Deployment orchestrator
- [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) — Data layer architecture
