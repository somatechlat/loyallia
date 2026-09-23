---
title: "Loyallia On-Call Escalation Matrix"
document_id: "LOYALLIA-DOC-ESCALATION.MD"
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
| **Document ID** | LOYALLIA-DOC-ESCALATION.MD |
| **Title** | Loyallia On-Call Escalation Matrix |
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
| **Location** | `docs/04-runbooks/ESCALATION.md` |

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
