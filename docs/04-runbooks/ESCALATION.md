# Loyallia On-Call Escalation Matrix

## Severity Levels & Response Times

| Severity | Name | Response Time | Resolution Target | Escalation |
|----------|------|--------------|-------------------|------------|
| **P1** | Critical | 15 minutes | 2 hours | Auto-escalate to engineering lead after 30 min |
| **P2** | High | 30 minutes | 4 hours | Escalate to engineering lead after 1 hour |
| **P3** | Medium | 4 hours | 24 hours | Escalate to engineering lead after 8 hours |
| **P4** | Low | 24 hours | 72 hours | Escalate at next business day |

## Escalation Chain

```
L1 On-Call Engineer (primary)
    |
    |-- 30 min (P1) / 1 hour (P2) / 8 hours (P3)
    v
L2 Engineering Lead
    |
    |-- 1 hour (P1) / 2 hours (P2)
    v
L3 Engineering Manager
    |
    |-- 2 hours (P1)
    v
L4 CTO / VP Engineering
```

## Contact Procedures

### Primary Contact
- PagerDuty alert channel (primary)
- Slack: `#infrastructure-alerts`

### Secondary Contact
- Direct phone call for P1/P2 after primary channel timeout
- WhatsApp group: "Loyallia On-Call Escalation"

### Tertiary Contact
- Email to `oncall-escalation@loyallia.com` (always CC'd)

## Alert Routing

| Alert Type | Severity | Receiver | Action |
|------------|----------|----------|--------|
| Service Down (API, DB, Redis) | P1 | critical | Immediate page |
| High Error Rate | P1 | critical | Immediate page |
| Disk Space Critical | P1 | critical | Immediate page |
| Disk Space Low | P2 | warning | Slack + email |
| Backup Failed | P2 | warning | Slack + email |
| High CPU/Memory | P3 | warning | Email only |
| Celery Queue Backlog | P2 | warning | Slack + email |

## Runbooks

- [Disaster Recovery Playbook](./DISASTER_RECOVERY_PLAYBOOK.md)
- [Backup Operations Runbook](./BACKUP_OPERATIONS_RUNBOOK.md)
- [Factory Reset Procedure](./FACTORY_RESET_PROCEDURE.md)
