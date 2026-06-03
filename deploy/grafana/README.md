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

- Grafana UI: `http://<host>:3000`
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
- [`deploy/alerting/`](../alerting/) — On-call escalation procedures
- [`deploy/bootstrap/full-deploy.sh`](../bootstrap/full-deploy.sh) — Deployment orchestrator
