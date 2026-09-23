---
title: "PgBouncer"
document_id: "LOYALLIA-DOC-PGBOUNCER.MD"
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
| **Document ID** | LOYALLIA-DOC-PGBOUNCER.MD |
| **Title** | PgBouncer |
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
| **Location** | `docs/04-runbooks/PGBOUNCER.md` |

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

Connect to the PgBouncer admin console (the `edoburu/pgbouncer` image does not include `psql`; use a PostgreSQL client container):

```bash
docker run --rm --network loyallia_backend-net postgres:17.4-alpine \
  psql -h pgbouncer -p 6432 -U postgres pgbouncer
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
- [`../../docs/02-architecture/ARCHITECTURE.md`](../02-architecture/ARCHITECTURE.md) — Data layer architecture
