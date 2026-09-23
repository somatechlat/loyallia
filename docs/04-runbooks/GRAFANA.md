---
title: "Grafana"
document_id: "LOYALLIA-DOC-GRAFANA.MD"
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
| **Document ID** | LOYALLIA-DOC-GRAFANA.MD |
| **Title** | Grafana |
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
| **Location** | `docs/04-runbooks/GRAFANA.md` |

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

# Grafana

## Purpose

[Grafana](https://grafana.com/) provides the **observability dashboards** and **managed alerting** for the Loyallia platform. It visualizes metrics from Prometheus and logs from Loki, giving operators real-time insight into system health, application performance, and infrastructure utilization.

This directory contains **provisioning configurations** that auto-configure Grafana on startup — datasources and alerting rules are applied automatically without manual UI interaction.

## Files

| File / Directory | Description |
|------------------|-------------|
| `provisioning/alerting/rules.yml` | Grafana-managed alerting rules (API down, PostgreSQL down, Redis down, disk space, backups, Celery queue). |
| `provisioning/datasources/loki.yml` | Auto-provisioned datasources: Prometheus and Loki. |

## Configuration

### `provisioning/datasources/loki.yml`

Defines two datasources:

| Datasource | Type | URL | Default |
|------------|------|-----|---------|
| Prometheus | `prometheus` | `http://prometheus:9090` | Yes |
| Loki | `loki` | `http://loki:3100` | No |

To add a new datasource (e.g., Tempo for tracing), append a new entry under `datasources:` and restart Grafana.

### `provisioning/alerting/rules.yml`

Contains Grafana alert rules organized by service:

- **service-health** — API, PostgreSQL, Redis down detection
- **infrastructure** — Disk space, CPU, memory
- **application** — API error rate, response time
- **database** — PostgreSQL connections, replication lag
- **celery** — Queue backlog
- **backup** — Backup age and failure detection

Each rule specifies:
- `expr` — PromQL or LogQL query
- `for` — Evaluation duration before firing
- `labels.severity` — `critical` or `warning`
- `annotations.summary` / `annotations.description`

### Modifying Alert Rules

1. Edit `provisioning/alerting/rules.yml`
2. Restart the Grafana container:
   ```bash
   docker compose restart grafana
   ```
3. Verify in **Alerting → Alert Rules** in the Grafana UI.

### Dashboard Provisioning (Future)

Dashboard JSON files can be added to `provisioning/dashboards/` (directory may need creation). Update `docker-compose.yml` to mount the dashboards volume:

```yaml
grafana:
  volumes:
    - ./deploy/grafana/provisioning:/etc/grafana/provisioning:ro
    - ./deploy/grafana/dashboards:/etc/grafana/dashboards:ro
```

## Usage

### Access

- Grafana UI: `http://<host>:33910`
- Default credentials are seeded by Vault (`grafana_admin_password`)

### Deploy / Restart

Grafana is started by `deploy/bootstrap/full-deploy.sh` at step 11. Manual restart:

```bash
docker compose restart grafana
```

### Testing Alerts

1. Open Grafana → Alerting → Alert Rules
2. Select a rule and click **Test** to evaluate the query
3. Use **Silences** to temporarily suppress noisy alerts during maintenance

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Datasources not appearing | Check `provisioning/datasources/loki.yml` syntax. Verify files are mounted to `/etc/grafana/provisioning`. |
| Alert rules not loading | Ensure `apiVersion: 1` is present. Check Grafana logs: `docker compose logs grafana`. |
| "DatasourceNoData" alerts | Verify Prometheus/Loki containers are running and reachable from the Grafana container. |
| Slow dashboard loading | Increase Loki `maxLines` or add time-range limits to queries. |
| Permission denied on provisioning | Mount provisioning directory as read-only (`:ro`) to prevent runtime modification issues. |

## Related Docs

- [`deploy/alertmanager/`](../alertmanager/) — Alert routing and notifications
- [`deploy/alerts/`](../alerts/) — Prometheus alert rules
- [`deploy/bootstrap/full-deploy.sh`](../bootstrap/full-deploy.sh) — Deployment orchestrator
