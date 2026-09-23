---
title: "Alertmanager"
document_id: "LOYALLIA-DOC-ALERTMANAGER.MD"
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
| **Document ID** | LOYALLIA-DOC-ALERTMANAGER.MD |
| **Title** | Alertmanager |
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
| **Location** | `docs/04-runbooks/ALERTMANAGER.md` |

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

# Alertmanager

## Purpose

[Prometheus Alertmanager](https://prometheus.io/docs/alerting/latest/alertmanager/) handles alert deduplication, grouping, routing, and silencing for the Loyallia platform. It receives alerts from Prometheus (and optionally Grafana), applies routing logic, and dispatches notifications via email (with hooks for Slack/PagerDuty expansion).

Alertmanager is deployed as a container via Docker Compose and is referenced by both Prometheus and Grafana alerting configurations.

## Files

| File | Description |
|------|-------------|
| `alertmanager.yml` | Main Alertmanager configuration: global settings, routing tree, receivers, and inhibition rules. |
| `alerts.yml` | **Legacy** Prometheus alerting rules (kept for reference; prefer `deploy/alerts/loyallia.yml`). |

## Configuration

### `alertmanager.yml`

Key blocks to modify:

- **`global`** — SMTP gateway for email alerts:
  ```yaml
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@loyallia.com'
  ```
  Update credentials when switching to a real SMTP relay (e.g., Mailjet, SendGrid).

- **`route`** — Top-level routing:
  ```yaml
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  ```
  - `group_by`: Alerts with the same labels are batched into one notification.
  - `repeat_interval`: Resend interval for unresolved alerts.

- **`routes`** — Sub-routes by severity:
  - `critical` → immediate page/email
  - `warning` → Slack + email

- **`receivers`** — Notification channels:
  - `default`: Email to `admin@loyallia.com`
  - `critical`: Email with `[CRITICAL]` subject prefix
  - `warning`: Standard email

- **`inhibit_rules`** — Suppresses `warning` alerts when a `critical` alert with the same `alertname` is already firing.

### Adding a New Receiver (e.g., Slack)

1. Add a new receiver block under `receivers:`
2. Create a matching sub-route under `route.routes:`
3. Reload Alertmanager or restart the container.

## Usage

### Deploy / Restart

Alertmanager is started automatically by the full deployment orchestrator (`deploy/bootstrap/full-deploy.sh` at step 11). To restart manually:

```bash
cd /path/to/loyallia
docker compose restart alertmanager
```

### Verify Configuration

```bash
docker compose exec alertmanager amtool check-config /etc/alertmanager/alertmanager.yml
```

### View Alerts

- Alertmanager UI: `http://<host>:9093`
- Prometheus rules: `http://<host>:9090/rules`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Alerts firing in Prometheus but not received | Check Alertmanager is running: `docker compose ps alertmanager`. Verify `alertmanager.yml` syntax. |
| SMTP authentication failures | Update `smtp_auth_username` and `smtp_auth_password` in `alertmanager.yml`. |
| Too many duplicate emails | Increase `group_interval` or tighten `group_by` labels. |
| Critical alerts not paging | Ensure `severity: critical` label matches the route matcher exactly. |
| Alerts not inhibiting warnings | Verify `inhibit_rules` `equal:` list includes all shared labels (e.g., `alertname`). |

## Related Docs

- [`deploy/alerts/`](../alerts/) — Prometheus alert rule definitions
- [`deploy/grafana/`](../grafana/) — Grafana alerting rules and dashboards
- [`deploy/bootstrap/full-deploy.sh`](../bootstrap/full-deploy.sh) — Deployment orchestrator that starts Alertmanager
