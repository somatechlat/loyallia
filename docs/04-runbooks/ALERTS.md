---
title: "Prometheus Alert Rules"
document_id: "LOYALLIA-DOC-ALERTS.MD"
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
| **Document ID** | LOYALLIA-DOC-ALERTS.MD |
| **Title** | Prometheus Alert Rules |
| **Version** | 1.0 |
| **Date** | 2026-09-16 |
| **Author** | Engineering Lead |
| **Approver** | Product Owner |
| **Owner** | Engineering Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and Product teams |
| **Review Cycle** | Upon each major release, or annually (whichever comes first) |
| **Status** | approved |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011 |
| **Parent Document** | N/A |
| **Supersedes** | N/A |
| **Language** | English |
| **Format** | Markdown (.md) |
| **Location** | `docs/04-runbooks/ALERTS.md` |

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
| LOYALLIA-ARCH-001 | Architecture Diagrams | Reference |

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

# Prometheus Alert Rules

## Purpose

This directory contains the **Prometheus alerting rules** that define *when* the Loyallia platform should trigger alerts. These rules are evaluated continuously by Prometheus and dispatched to Alertmanager for routing and notification.

The rules cover infrastructure health (disk space, CPU, memory), application health (API error rates, response times), database health (PostgreSQL, Redis), and operational concerns (backup staleness, Celery queue depth).

## Files

| File | Description |
|------|-------------|
| `loyallia.yml` | **Primary** alert rules — comprehensive rule set covering infrastructure, application, PostgreSQL, Redis, Celery, and backups. |
| `loyallia-core.yml` | **Minimal / legacy** alert rules — basic service-down and disk-space checks. Kept for backward compatibility. |

## Configuration

### `loyallia.yml` Structure

Rules are grouped into two rule groups:

1. **`loyallia_infrastructure`** — Host-level metrics
   - `DiskSpaceLow` / `DiskSpaceCritical` — Root filesystem thresholds (15% / 5%)
   - `ContainerDown` — Any scraped target is unreachable
   - `HighCpuUsage` — CPU > 85% for 10 minutes
   - `HighMemoryUsage` — Memory usage > 90% for 5 minutes

2. **`loyallia_application`** — Application and service-level metrics
   - `HighApiErrorRate` — 5xx rate > 5% for 5 minutes
   - `SlowApiResponse` — p95 latency > 2s for 5 minutes
   - `PostgreSQLDown` / `PostgreSQLHighConnections` — DB health and connection count
   - `RedisDown` / `RedisHighMemory` — Cache health and memory pressure
   - `CeleryQueueBacklog` — Queue depth > 100 for 10 minutes
   - `BackupAgeStale` — No successful backup in 48 hours

### Modifying Thresholds

Edit the `expr` field of any rule. For example, to change the API error rate threshold from 5% to 10%:

```yaml
expr: |
  sum(rate(http_requests_total{status=~"5.."}[5m]))
  /
  sum(rate(http_requests_total[5m])) > 0.10
```

Then reload Prometheus:

```bash
curl -X POST http://localhost:9090/-/reload
```

### Adding a New Alert

1. Choose the appropriate rule group (`loyallia_infrastructure` or `loyallia_application`).
2. Add a new rule block with:
   - `alert`: Unique alert name
   - `expr`: PromQL expression
   - `for`: Duration the condition must hold before firing
   - `labels.severity`: `critical` or `warning`
   - `annotations.summary` / `annotations.description`: Human-readable text

## Usage

### Deployment

Prometheus loads these rules automatically via its configuration (usually mounted from `deploy/prometheus/` or configured in `docker-compose.yml`). Ensure the rule files are mounted into the Prometheus container:

```yaml
volumes:
  - ./deploy/alerts:/etc/prometheus/alerts:ro
```

### Validation

```bash
# Check PromQL syntax
promtool check rules deploy/alerts/loyallia.yml
```

### Testing Alerts

Use the Prometheus UI (`/graph`) to evaluate the `expr` of any rule manually before it fires.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Rules not loading | Check Prometheus logs for YAML parse errors. Verify file is mounted correctly. |
| Alert fires too often | Increase the `for` duration or raise the threshold in `expr`. |
| Alert never fires | Test the `expr` in the Prometheus UI. Ensure the metric exists and the threshold is reachable. |
| `BackupAgeStale` false positives | Verify the `loyallia_last_backup_timestamp_seconds` metric is being pushed by the backup job. |
| High cardinality causing slow evaluation | Add more specific label selectors to the PromQL expression. |

## Related Docs

- [`deploy/alertmanager/`](../alertmanager/) — Alert routing and receiver configuration
- [`deploy/grafana/`](../grafana/) — Grafana alerting rules and visual dashboards
- [`deploy/bootstrap/full-deploy.sh`](../bootstrap/full-deploy.sh) — Deployment orchestrator
