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
- [`deploy/alerting/`](../alerting/) — Human escalation matrix and on-call procedures
- [`deploy/grafana/`](../grafana/) — Grafana alerting rules and dashboards
- [`deploy/bootstrap/full-deploy.sh`](../bootstrap/full-deploy.sh) — Deployment orchestrator that starts Alertmanager
