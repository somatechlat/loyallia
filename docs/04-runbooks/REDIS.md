---
title: "Redis"
document_id: "LOYALLIA-DOC-REDIS.MD"
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
| **Document ID** | LOYALLIA-DOC-REDIS.MD |
| **Title** | Redis |
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
| **Location** | `docs/04-runbooks/REDIS.md` |

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
- [`../../docs/02-architecture/ARCHITECTURE.md`](../02-architecture/ARCHITECTURE.md) — Caching and task queue architecture
