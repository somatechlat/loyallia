# Alerting & On-Call Escalation

## Purpose

This subsystem defines the **on-call escalation matrix** and **incident response procedures** for the Loyallia platform. It complements the automated alerting pipeline (Prometheus → Alertmanager) by specifying who gets notified, how severe issues are classified, and what response times are expected.

While `deploy/alerts/` and `deploy/alertmanager/` configure *what* to alert on and *how* to route notifications, this directory documents the *human* side of incident response: severity levels, escalation chains, contact procedures, and runbook references.

## Files

| File | Description |
|------|-------------|
| `ESCALATION.md` | Full escalation matrix with severity definitions, response times, contact procedures, and alert routing table. |

## Configuration

`ESCALATION.md` is a **living document** maintained by the engineering team. Key sections to keep updated:

- **Severity Levels & Response Times** — Adjust SLAs as the team grows or contracts.
- **Escalation Chain** — Update names and contact methods when team roles change.
- **Contact Procedures** — Verify Slack channels, PagerDuty integrations, and WhatsApp groups periodically.
- **Alert Routing** — When new services are added, document their alert type, severity, and receiver here.

> **Note:** This file is Markdown-only; it is not parsed by any automation. Changes here are for human operators.

## Usage

1. **New on-call engineer onboarding** — Read `ESCALATION.md` at the start of each rotation.
2. **Incident response** — When paged, consult the severity table and escalation chain to determine next actions.
3. **Post-incident review** — Update contact details or response times based on lessons learned.

### Severity Quick Reference

| Severity | Response Time | Resolution Target | Auto-Escalation |
|----------|--------------|-------------------|-----------------|
| **P1** Critical | 15 min | 2 hours | Engineering lead after 30 min |
| **P2** High | 30 min | 4 hours | Engineering lead after 1 hour |
| **P3** Medium | 4 hours | 24 hours | Engineering lead after 8 hours |
| **P4** Low | 24 hours | 72 hours | Next business day |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| PagerDuty alerts not firing | Check Alertmanager configuration in `deploy/alertmanager/alertmanager.yml` |
| Slack channel not receiving warnings | Verify channel name and webhook integration in Alertmanager |
| On-call engineer unreachable | Follow escalation chain in `ESCALATION.md`; call secondary contact for P1/P2 |
| Duplicate alerts | Check `inhibit_rules` in `deploy/alertmanager/alertmanager.yml` |

## Related Docs

- [`deploy/alertmanager/`](../alertmanager/) — Alertmanager routing and receiver configuration
- [`deploy/alerts/`](../alerts/) — Prometheus alert rules
- [`deploy/grafana/`](../grafana/) — Dashboards and Grafana-managed alerting rules
- [`../../docs/BACKUP_DISASTER_RECOVERY.md`](../../docs/BACKUP_DISASTER_RECOVERY.md) — Backup recovery runbook
