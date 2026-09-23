---
title: "PostgreSQL"
document_id: "LOYALLIA-DOC-POSTGRES.MD"
version: "1.0"
status: "approved"
last_updated: "2026-09-16"
author: "Engineering Lead"
owner: "Engineering Lead"
approver: "Product Owner"
classification: "Internal Use"
confidentiality: "Internal — Restricted to Engineering and Product teams"
review_cycle: "Upon each major release, or annually (whichever comes first)"
standard: "ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011"
parent_document: "N/A"
---

## DOCUMENT CONTROL

| Field | Details |
|-------|---------|
| **Document ID** | LOYALLIA-DOC-POSTGRES.MD |
| **Title** | PostgreSQL |
| **Version** | 1.0 |
| **Date** | 2026-09-16 |
| **Author** | Engineering Lead |
| **Approver** | Product Owner |
| **Owner** | Engineering Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and Product teams |
| **Review Cycle** | Upon each major release, or annually (whichever comes first) |
| **Status** | approved |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011|
| **Parent Document** | N/A |
| **Supersedes** | N/A |
| **Language** | English |
| **Format** | Markdown (.md) |
| **Location** | `docs/04-runbooks/POSTGRES.md` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-09-16 | Engineering Lead | Added ISO-compliant document controls |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Engineering Lead | Author / Owner | Maintains document |
| Product Owner | Approver | Business validation |
| Security Officer | Reviewer | Security requirements validation |
| QA Lead | Reviewer | Quality assurance validation |

### Related Documents

| Document ID | Title | Relationship |
|-------------|-------|-------------|
| LOYALLIA-RULES-001 | Loyallia Agent Rules And Coding Standards | Reference |
| LOYALLIA-AGENTS-001 | Loyallia Agent Instructions | Reference |
| LOYALLIA-DOC-ARCHITECTURE.MD | Loyallia Architecture, Sequence & Flowchart Diagrams | Reference |

### Change Control Process

1. All changes to this document MUST be recorded in the Revision History table above.
2. Status transitions: `draft` → `review` → `approved` → `active` → `deprecated` → `archived`.
3. Changes after `approved` status require a new version number and re-approval.
4. Minor corrections (typos, formatting) increment the minor version (e.g., 1.0 → 1.1).
5. Major changes (new requirements, scope changes) increment the major version (e.g., 1.0 → 2.0).
6. Deprecated documents MUST be moved to `docs/09-archive/` with a deprecation notice.
7. All dates in this document use ISO 8601 format (`YYYY-MM-DD`).

## DOCUMENT APPROVAL

| Role | Name | Signature | Date | Decision |
|------|------|-----------|------|----------|
| Engineering Lead | — | — | 2026-09-16 | Approved |
| Product Owner | — | — | 2026-09-16 | Approved |
| Security Officer | — | — | — | Pending Review |

### Document Lifecycle

| State | Date | Actor | Notes |
|-------|------|-------|-------|
| Draft | 2026-09-16 | Engineering Lead | Initial ISO controls added |
| Approved | 2026-09-16 | Engineering Lead | Document approved for use |

### Next Review Date

| Trigger | Date | Notes |
|---------|------|-------|
| Annual review | 2026-12-31 | End of year review cycle |
| Major release | — | Triggered by major platform release |

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
- [`../../docs/02-architecture/ARCHITECTURE.md`](../02-architecture/ARCHITECTURE.md) — Data layer architecture
