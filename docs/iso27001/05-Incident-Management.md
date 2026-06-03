# Incident Management Procedure

## ISO/IEC 27001:2022 — Information Security Incident Management

---

## Document Control

| Field | Details |
|-------|---------|
| **Document ID** | LOY-SEC-005 |
| **Title** | Incident Management Procedure |
| **Version** | 1.0 |
| **Date** | 2026-06-03 |
| **Author** | Information Security Officer |
| **Approver** | Chief Executive Officer |
| **Classification** | Internal Use — Restricted |
| **Review Cycle** | Annually or after each major security incident |
| **Status** | Approved |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-06-03 | Information Security Officer | Initial release |

---

## Table of Contents

1. [Purpose and Scope](#1-purpose-and-scope)
2. [Normative References](#2-normative-references)
3. [Terms and Definitions](#3-terms-and-definitions)
4. [Incident Classification](#4-incident-classification)
5. [Incident Response Team](#5-incident-response-team)
6. [Detection and Reporting](#6-detection-and-reporting)
7. [Response Workflow](#7-response-workflow)
8. [Communication Plan](#8-communication-plan)
9. [Evidence Preservation](#9-evidence-preservation)
10. [Post-Incident Review](#10-post-incident-review)
11. [Escalation Matrix](#11-escalation-matrix)
12. [Metrics and KPIs](#12-metrics-and-kpis)
13. [Related Documents](#13-related-documents)
14. [Approval](#14-approval)

---

## 1. Purpose and Scope

### 1.1 Purpose

This document establishes the **Incident Management Procedure** for Loyallia, defining a structured approach to detect, report, assess, respond to, and recover from information security incidents. The procedure ensures timely and effective handling of security events, minimizes business impact, preserves evidence for forensic analysis, and drives continuous improvement through lessons learned.

### 1.2 Scope

This procedure applies to all information security incidents affecting:

- The Loyallia SaaS platform (production, staging, and development environments)
- Customer personal data and transactional information
- Payment card data and PCI DSS scope systems
- Infrastructure components (servers, databases, networks, containers)
- Third-party integrations and supplier services
- Physical and logical access control systems
- All personnel, contractors, and authorized third parties with access to in-scope assets

### 1.3 Objectives

| Objective | Description |
|-----------|-------------|
| **Detect** | Identify security events through automated monitoring, manual reporting, and threat intelligence |
| **Contain** | Limit the scope and impact of incidents to prevent further damage |
| **Eradicate** | Remove the root cause and eliminate threat actor presence |
| **Recover** | Restore affected systems and services to normal operations securely |
| **Learn** | Analyze incidents to identify systemic weaknesses and implement corrective actions |

---

## 2. Normative References

This procedure is aligned with the following standards and controls:

| Standard / Control | Title | Relevance |
|--------------------|-------|-----------|
| **ISO/IEC 27001:2022 A.5.24** | Information security incident management planning and preparation | Planning, resources, and procedures for incident response |
| **ISO/IEC 27001:2022 A.5.25** | Assessment and decision on information security events | Criteria for classifying and prioritizing security events |
| **ISO/IEC 27001:2022 A.5.26** | Response to information security incidents | Execution of response actions and coordination |
| **ISO/IEC 27001:2022 A.5.27** | Learning from information security incidents | Post-incident analysis and improvement |
| **ISO/IEC 27035** | Information security incident management | International best-practice framework |
| **LOPDP (Ecuador)** | Ley Orgánica de Protección de Datos Personales | Breach notification obligations |
| **PCI DSS v4.0** | Requirement 12.10 | Incident response plan for cardholder data environments |

---

## 3. Terms and Definitions

| Term | Definition |
|------|------------|
| **Information Security Event** | An identified occurrence of a system, service, or network state indicating a possible breach of information security policy or failure of safeguards |
| **Information Security Incident** | A single or series of unwanted or unexpected information security events that have a significant probability of compromising business operations and threatening information security |
| **Incident Response Team (IRT)** | The cross-functional team responsible for managing security incidents from detection to closure |
| **Mean Time to Detect (MTTD)** | The average time elapsed between the start of an incident and its detection |
| **Mean Time to Respond (MTTR)** | The average time elapsed between detection and successful containment of an incident |
| **Root Cause** | The underlying reason that, if removed, would prevent the incident from recurring |
| **Chain of Custody** | A documented trail showing the seizure, custody, control, transfer, analysis, and disposition of physical or electronic evidence |

---

## 4. Incident Classification

### 4.1 Severity Levels

All incidents are classified according to the following severity matrix based on **business impact** and **data sensitivity**:

| Severity | Criteria | Response Time | Notification |
|----------|----------|---------------|--------------|
| **Critical** | Active data breach; complete service outage; unauthorized access to production infrastructure; ransomware; confirmed exfiltration of customer/PCI data | Immediate (< 15 min) | CEO, Legal, DPO within 1 hour |
| **High** | Partial service degradation; backup failure with no immediate recovery path; suspected unauthorized access; exposure of sensitive configuration data | < 1 hour | C-Level, DPO within 4 hours |
| **Medium** | Isolated feature malfunction; non-critical system failure; policy violation without data exposure; failed login anomalies | < 4 hours | Department head, ISO within 1 business day |
| **Low** | Minor configuration drift; isolated phishing attempt (not clicked); false-positive alert; documentation error | < 24 hours | ISO, relevant team lead |

### 4.2 Incident Categories

| Category | Description | Examples |
|----------|-------------|----------|
| **Data Breach** | Unauthorized access, disclosure, alteration, or destruction of personal or confidential data | Exposed database, misconfigured S3 bucket, insider data exfiltration |
| **Service Outage** | Unavailability or severe degradation of production services | Container crash, database failure, DDoS attack, network partition |
| **Backup Failure** | Failure of scheduled backup jobs or corruption of backup data | `BackupAgeStale` alert, failed `pg_dump`, corrupted RDB snapshot |
| **Unauthorized Access** | Unapproved access to systems, accounts, or data | Privilege escalation, compromised credentials, brute-force success |
| **Malware / Ransomware** | Presence of malicious software or encryption of systems by threat actors | Ransomware deployment, trojan infection, cryptominer |
| **Insider Threat** | Malicious or negligent actions by authorized personnel | Unauthorized data export, policy violation, credential sharing |
| **Physical Security** | Unauthorized physical access to facilities or equipment | Theft of equipment, unauthorized data center entry |
| **Third-Party Incident** | Security incident at a critical vendor or supplier affecting Loyallia | Cloud provider breach, payment processor outage, API key compromise |

### 4.3 Classification Decision Tree

```
START: Security Event Detected
│
├─ Is there evidence of unauthorized data exfiltration?
│  ├─ YES → CRITICAL (Data Breach)
│  └─ NO
│     ├─ Is production platform fully unavailable?
│     ├─ YES → CRITICAL (Service Outage)
│     └─ NO
│        ├─ Is there confirmed unauthorized access to production?
│        ├─ YES → CRITICAL (Unauthorized Access)
│        └─ NO
│           ├─ Is backup integrity compromised or >48h stale?
│           ├─ YES → HIGH (Backup Failure)
│           └─ NO
│              ├─ Is service degraded or partial data exposed?
│              ├─ YES → HIGH
│              └─ NO
│                 ├─ Isolated system or non-production issue?
│                 ├─ YES → MEDIUM
│                 └─ NO → LOW
```

---

## 5. Incident Response Team

### 5.1 Roles and Responsibilities

| Role | Primary Responsibility | Secondary Responsibility |
|------|------------------------|--------------------------|
| **Incident Commander (IC)** | Overall incident ownership; strategic decisions; stakeholder communication | Post-incident review facilitation |
| **Information Security Officer (ISO)** | Technical direction; forensic analysis; evidence preservation; containment strategy | Incident classification; threat intelligence |
| **Lead Platform Engineer** | System recovery; infrastructure containment; service restoration | Root cause technical analysis |
| **Data Protection Officer (DPO)** | Regulatory assessment; breach notification decisions; data subject communication | Evidence privacy compliance |
| **Legal Counsel** | Regulatory reporting; contractual obligations; liability assessment; law enforcement liaison | Communication approval |
| **Communications Lead** | External messaging; customer notifications; media statements (if applicable) | Internal status updates |
| **On-Call Engineer** | First response; initial triage; alert acknowledgment; containment execution | War-room facilitation |

### 5.2 Contact Matrix

| Role | Primary Channel | Escalation Channel |
|------|-----------------|--------------------|
| Incident Commander | On-call rotation (PagerDuty / Alertmanager) | CEO direct line |
| Information Security Officer | Slack `#security-incidents` + direct message | WhatsApp bridge emergency channel |
| Lead Platform Engineer | On-call rotation | CTO direct line |
| Data Protection Officer | Email + Slack | Phone |
| Legal Counsel | Email (legal@loyallia.com) | Phone |
| Communications Lead | Slack `#incident-comms` | Phone |

### 5.3 Team Assembly

Upon declaration of a **Critical** or **High** severity incident, the Incident Commander convenes the IRT within 30 minutes via:

1. Slack `#war-room` channel (primary coordination)
2. Google Meet / Zoom bridge (for synchronous discussion)
3. WhatsApp bridge emergency group (for SMS/WhatsApp fallback notifications)

For **Medium** and **Low** incidents, the On-Call Engineer coordinates with the ISO via standard ticketing and Slack channels.

---

## 6. Detection and Reporting

### 6.1 Detection Channels

| Channel | Technology / Method | Coverage | Severity Detected |
|---------|---------------------|----------|-------------------|
| **Infrastructure Monitoring** | Prometheus + Grafana | CPU, memory, disk, container health | Warning → Critical |
| **Application Monitoring** | Prometheus rules (`deploy/alerts/loyallia.yml`, `deploy/alerts/loyallia-core.yml`) | API error rates, response times, queue backlog | Warning → Critical |
| **Database Monitoring** | PostgreSQL + Redis exporters | Connection counts, replication lag, memory usage | Warning → Critical |
| **Log Aggregation** | Loki + Grafana | Application logs, access logs, error traces | All levels |
| **Alert Routing** | Alertmanager | Alert deduplication, grouping, routing to on-call | All levels |
| **Audit Logging** | `backend/apps/audit/` — immutable audit trail | Authentication events, data access, administrative actions | Medium → Critical |
| **Backup Monitoring** | `loyallia_last_backup_timestamp_seconds` metric | Backup age, verification failures | High → Critical |
| **Manual Reporting** | Email security@loyallia.com, Slack `#security` | Employee reports, customer reports, third-party notifications | All levels |
| **Threat Intelligence** | External feeds, vendor advisories | CVEs, IOCs, sector-specific threats | Low → High |

### 6.2 Alert-to-Incident Mapping

| Alert Name (Prometheus) | Incident Category | Default Severity | Auto-Page? |
|-------------------------|-------------------|------------------|------------|
| `ContainerDown` | Service Outage | Critical | Yes |
| `DiskSpaceCritical` | Service Outage | Critical | Yes |
| `HighApiErrorRate` | Service Outage | Critical | Yes |
| `PostgreSQLDown` | Service Outage | Critical | Yes |
| `RedisDown` | Service Outage | Critical | Yes |
| `BackupAgeStale` | Backup Failure | Critical | Yes |
| `DiskSpaceLow` | Service Outage | High | No (business hours) |
| `HighCpuUsage` | Service Outage | Medium | No |
| `SlowApiResponse` | Service Outage | Medium | No |
| `CeleryQueueBacklog` | Service Outage | Medium | No |

### 6.3 Reporting Procedures

#### 6.3.1 Automated Detection

```
Prometheus Alert Fires
    ↓
Alertmanager Receives Alert
    ↓
Alertmanager Routes Based on Severity Label
    ├─ severity: critical → PagerDuty / WhatsApp bridge → On-Call Engineer
    ├─ severity: warning → Slack #alerts + email
    └─ severity: info → Loki dashboard only
    ↓
On-Call Engineer Acknowledges within SLA
    ↓
Triage Decision:
    ├─ False Positive → Silence alert; document reason
    ├─ Non-Security Event → Route to operations team
    └─ Security Incident → Declare incident; assign severity
```

#### 6.3.2 Manual Reporting

Any employee, contractor, customer, or third party may report a suspected security incident through:

1. **Email**: `security@loyallia.com` (monitored 24/7 with 30-minute response SLA)
2. **Slack**: `#security` channel (business hours) or `@security-oncall` (urgent)
3. **WhatsApp**: Business emergency line (for tenant administrators)
4. **In-App**: "Report Security Issue" feature in the tenant dashboard

Required information for manual reports:
- Date and time of observation
- Description of the event
- Systems, data, or users affected (if known)
- Steps already taken (if any)
- Contact details for follow-up

### 6.4 Initial Triage

Upon receipt of an alert or report, the On-Call Engineer performs triage within the response time SLA:

| Triage Step | Action | Tool / Source |
|-------------|--------|---------------|
| Verify | Confirm the event is genuine and not a false positive | Grafana dashboards, Loki logs |
| Scope | Identify affected systems, data, and users | Prometheus labels, audit logs |
| Classify | Assign severity level per Section 4.1 | Classification decision tree |
| Assign | Designate an Incident Commander and IRT members | On-call roster |
| Log | Create incident record in tracking system | Jira Security project |
| Notify | Alert stakeholders per escalation matrix | Slack, PagerDuty, WhatsApp |

---

## 7. Response Workflow

### 7.1 Overview

The response workflow follows the **NIST SP 800-61** phases adapted for Loyallia's operational context: **Prepare → Detect → Contain → Eradicate → Recover → Learn**.

### 7.2 Phase 1: Preparation

Pre-incident readiness activities include:

- Maintaining current on-call rotations and contact directories
- Quarterly tabletop exercises simulating data breach and ransomware scenarios
- Annual review of this procedure and associated runbooks
- Pre-staged forensic tooling (read-only access to production logs, snapshot capabilities)
- Encrypted communication channels (Signal group for IRT senior members)
- Pre-approved holding statements for customer and regulatory communication

### 7.3 Phase 2: Detection & Analysis

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Alert / Report │────→│  Triage &       │────→│  Evidence       │
│  Received       │     │  Verification   │     │  Collection     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
   Timestamp logged      Severity assigned        Snapshots, logs,
   Incident ID created   IRT notified             audit records preserved
```

**Analysis activities:**
- Review Prometheus metrics and Loki logs for the affected time window
- Query `backend/apps/audit/` audit trail for affected actor IDs, IPs, and actions
- Correlate events across systems (e.g., failed logins → successful login → data export)
- Capture disk snapshots of affected VMs/containers before any remediation
- Document timeline of observed events in incident ticket

### 7.4 Phase 3: Containment

Containment actions depend on incident category and must balance speed against evidence preservation.

| Category | Short-Term Containment | Long-Term Containment |
|----------|------------------------|------------------------|
| **Data Breach** | Revoke exposed credentials; isolate affected database; block egress IPs | Rotate all secrets; enforce MFA re-enrollment; restrict API scopes |
| **Service Outage** | Restart/replace failed containers; failover to DR site if needed | Capacity planning; infrastructure hardening; dependency review |
| **Backup Failure** | Halt dependent maintenance; trigger manual backup; verify backup integrity | Root cause analysis of backup pipeline; test restore procedure |
| **Unauthorized Access** | Disable compromised accounts; revoke sessions; block source IP | Review access controls; implement additional monitoring; credential rotation |

**Containment checklist:**
- [ ] Evidence captured (snapshots, memory dumps, logs)
- [ ] Affected systems isolated or segmented
- [ ] Attacker egress paths blocked (firewall, WAF, API gateway)
- [ ] Compromised credentials revoked and rotated
- [ ] Audit trail preserved (immutable `AuditLog` entries in PostgreSQL)
- [ ] Business stakeholders notified of containment status

### 7.5 Phase 4: Eradication

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Remove Root    │────→│  Eliminate      │────→│  Validate       │
│  Cause          │     │  Threat Actor   │     │  Clean State    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
   Patch vulnerability     Delete malware /         Re-scan systems;
   Fix misconfiguration    backdoors              verify no IOCs remain
```

**Eradication activities:**
- Apply security patches or configuration fixes
- Rebuild compromised containers from clean base images
- Remove unauthorized user accounts, SSH keys, or API tokens
- Scan affected systems with updated threat signatures
- Validate that attacker persistence mechanisms (cron jobs, web shells, shadow admins) are removed

### 7.6 Phase 5: Recovery

Recovery restores normal operations using validated, clean systems.

| System | Recovery Procedure | Responsible Role |
|--------|--------------------|------------------|
| **PostgreSQL** | Restore from latest verified backup (`deploy/backups/production/restore-postgres.sh`) or failover to replica | Lead Platform Engineer |
| **Redis** | Restore RDB from backup (`deploy/backups/production/restore-redis.sh`) or reconstruct from application caches | Lead Platform Engineer |
| **MinIO / Object Storage** | Restore from off-site mirror (`deploy/backups/production/restore-minio.sh`) | Lead Platform Engineer |
| **Vault** | Restore from encrypted rescue snapshot (`deploy/disaster_recovery/production/recover.sh`) | Lead Platform Engineer + ISO |
| **Application Containers** | Redeploy from verified CI/CD pipeline with rotated secrets | On-Call Engineer |
| **Full Stack DR** | Execute `deploy/disaster_recovery/production/recover.sh` with rescue manifest verification | Lead Platform Engineer |

**Recovery checklist:**
- [ ] All systems restored from known-good backups or clean builds
- [ ] Secrets rotated (database passwords, API keys, TLS certificates)
- [ ] Services pass health checks (`/api/v1/health/`)
- [ ] Monitoring and alerting re-enabled and verified
- [ ] Audit logging confirmed operational (`backend/apps/audit/`)
- [ ] Gradual traffic restoration (canary if applicable)
- [ ] IRT approval to resume normal operations

### 7.7 Response Workflow Diagram

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
|  DETECT  |──→|  Triage  |──→| CONTAIN  |──→| ERADICATE|──→| RECOVER  |──→|   LEARN  |
|          |   |  & Classify   |          |   |          |   |          |   |          |
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
     │               │               │               │               │               │
     ▼               ▼               ▼               ▼               ▼               ▼
  Alert fire    Severity &     Evidence       Remove root    Restore from    Post-incident
  Log review    IRT assign     preservation   cause; clean   backup /        review;
  Audit query   Notify         Isolate        systems        rebuild         CAPA; update
                stakeholders   systems                                       procedure
```

---

## 8. Communication Plan

### 8.1 Communication Principles

- **Timeliness**: Internal notifications within response SLA; external notifications within regulatory deadlines
- **Accuracy**: All external communications reviewed by Legal Counsel and DPO
- **Consistency**: Single spokesperson model for external communication
- **Confidentiality**: Incident details shared on a need-to-know basis

### 8.2 Internal Communication

| Audience | Timing | Channel | Content |
|----------|--------|---------|---------|
| **IRT Members** | Immediate | Slack `#war-room` | Technical details, timeline, actions taken |
| **C-Level / Board** | Within 1 hour (Critical) | Secure call + email summary | Business impact, regulatory exposure, containment status |
| **All Staff** | Within 4 hours (Critical/High) | Slack `#general` + email | High-level awareness, reporting instructions, no speculation |
| **Affected Teams** | As needed | Direct Slack / meeting | Operational impact, recovery ETA, workarounds |

### 8.3 External Communication

| Audience | Timing | Channel | Owner | Content |
|----------|--------|---------|-------|---------|
| **Affected Customers** | Within 24 hours (High+); immediate if outage | Email + in-app banner | Communications Lead | Impact description, affected data, recommended actions, contact info |
| **Regulators (Ecuador)** | Within 72 hours of breach confirmation (LOPDP) | Official filing via DPO | DPO + Legal | Breach nature, data subjects affected, measures taken |
| **Payment Processors** | Within 24 hours if PCI scope affected | Secure vendor portal | ISO + Legal | Incident scope, forensic status, containment evidence |
| **Law Enforcement** | When criminal activity confirmed | Formal report via Legal | Legal Counsel | Evidence package, timeline, legal basis |
| **Media** | Only if public interest demands | Approved statement only | CEO + Communications | Factual summary, remediation commitment, contact |
| **Third-Party Suppliers** | If incident originated from or affects them | Direct vendor contact | ISO + Procurement | Technical indicators, containment coordination |

### 8.4 Communication Templates

Pre-approved templates are maintained in `docs/iso27001/templates/`:
- `customer-breach-notification.md`
- `regulatory-breach-notification-ecuador.md`
- `internal-incident-update.md`
- `holding-statement-media.md`

All external communications must be reviewed and approved by the Incident Commander, DPO, and Legal Counsel before distribution.

---

## 9. Evidence Preservation

### 9.1 Evidence Types

| Type | Source | Retention Period | Storage Location |
|------|--------|------------------|------------------|
| **System Snapshots** | Affected VMs, containers, volumes | 7 years | Encrypted off-site MinIO bucket (`forensics/`) |
| **Audit Logs** | `backend/apps/audit/` (immutable PostgreSQL records) | 7 years | Production PostgreSQL + annual encrypted archive |
| **Application Logs** | Loki aggregated logs | 1 year active, 7 years archive | MinIO object storage |
| **Network Logs** | Nginx access logs, firewall logs | 1 year | Log aggregation system |
| **Alert History** | Prometheus / Alertmanager | 1 year | Prometheus TSDB |
| **Communications** | Slack exports, email, meeting recordings | 7 years | Encrypted archive |
| **Forensic Images** | Disk images, memory dumps | 7 years | Encrypted off-site storage |

### 9.2 Chain of Custody

All evidence must maintain a documented chain of custody:

1. **Collection**: Timestamped by the collecting engineer; cryptographic hash (SHA-256) computed
2. **Transfer**: Logged with sender, receiver, date, time, and hash verification
3. **Storage**: Encrypted at rest (AES-256); access restricted to ISO and Legal Counsel
4. **Analysis**: Documented in incident ticket; copies used for analysis; originals preserved
5. **Disposition**: Retained per retention schedule; secure deletion authorized by Legal after period

### 9.3 Audit Log Integrity

The `backend/apps/audit/` system enforces immutability at the application level:
- `AuditLog` entries cannot be modified or deleted (enforced in `models.py` `save()` and `delete()` methods)
- All entries include actor ID, email, role, action, resource, IP address, user agent, and timestamp
- 7-year retention satisfies LOPDP Art. 47 and GDPR Art. 30 requirements

---

## 10. Post-Incident Review

### 10.1 Review Trigger

A formal post-incident review is mandatory for:
- All **Critical** and **High** severity incidents
- All **Medium** incidents involving data exposure or policy violations
- Any incident requiring regulatory notification
- Any incident where the root cause remains unclear after response

### 10.2 Review Process

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Close Incident │────→│  Schedule Review│────→│  Conduct Review │
│  Ticket         │     │  (within 5 days)│     │  Meeting        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                               │
         ▼                                               ▼
   Recovery validated                          ┌─────────────────┐
   Services normalized                          │  Timeline       │
                                               │  Root Cause     │
                                               │  Impact Analysis│
                                               │  Response Eval  │
                                               │  CAPA           │
                                               └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │  Publish Report │
                                               │  Track CAPA     │
                                               │  Update Procedure│
                                               └─────────────────┘
```

### 10.3 Review Contents

| Section | Description |
|---------|-------------|
| **Executive Summary** | Incident classification, timeline, and business impact |
| **Timeline** | Chronological record of detection, containment, eradication, and recovery |
| **Root Cause Analysis** | Underlying technical, process, or human factors using 5 Whys or fault tree |
| **Impact Assessment** | Affected systems, data records, users, tenants, and regulatory implications |
| **Response Evaluation** | What worked well, what did not, deviations from procedure |
| **Corrective and Preventive Actions (CAPA)** | Specific, assigned, time-bound actions to prevent recurrence |
| **Lessons Learned** | Knowledge to share across teams; training or procedure updates needed |

### 10.4 Corrective and Preventive Actions (CAPA)

Each CAPA item must be:
- **Specific**: Clearly defined action and expected outcome
- **Measurable**: Defined criteria for completion
- **Assigned**: Named owner with accountability
- **Time-bound**: Due date based on risk (Critical: 7 days; High: 30 days; Medium: 60 days; Low: 90 days)
- **Verified**: ISO validates completion and effectiveness

CAPA tracking is maintained in the Jira Security project with monthly review by the ISO.

---

## 11. Escalation Matrix

### 11.1 Time-Based Escalation

| Elapsed Time | Critical | High | Medium | Low |
|--------------|----------|------|--------|-----|
| **0–15 min** | On-Call Engineer responds | On-Call Engineer responds | — | — |
| **15 min** | Auto-escalate to ISO + Lead Platform Engineer | — | — | — |
| **30 min** | IRT assembly; CEO notified | ISO engaged | On-Call Engineer triages | — |
| **1 hour** | Legal + DPO engaged; regulatory clock starts | Lead Platform Engineer assigned | ISO notified if unresolved | On-Call Engineer reviews |
| **4 hours** | Board briefing prepared | Customer notification if needed | Team lead assigned | ISO notified if unresolved |
| **24 hours** | — | CAPA tracking initiated | Escalate to High if unresolved | Assign owner and target date |
| **72 hours** | Regulatory filing if applicable | Post-incident review scheduled | — | — |

### 11.2 Authority-Based Escalation

| Decision | Authority | Escalation To |
|----------|-----------|---------------|
| Declare Critical incident | On-Call Engineer | ISO + Incident Commander |
| Invoke disaster recovery | ISO | CTO + CEO |
| Notify regulators | DPO + Legal | CEO |
| Notify customers | Incident Commander | CEO + Communications Lead |
| Engage external forensics | ISO | CEO + Legal |
| Authorize system rebuild | Lead Platform Engineer | CTO |
| Approve external communication | Incident Commander + Legal | CEO |

---

## 12. Metrics and KPIs

### 12.1 Key Performance Indicators

| KPI | Definition | Target | Measurement Source |
|-----|------------|--------|--------------------|
| **MTTD** | Mean Time to Detect: time from incident start to alert creation | < 15 minutes | Prometheus alert timestamps vs. first event in Loki |
| **MTTR** | Mean Time to Respond: time from alert to containment | Critical: < 1 hour; High: < 4 hours; Medium: < 8 hours | Incident ticket timestamps |
| **MTTC** | Mean Time to Contain: time from detection to successful containment | Critical: < 2 hours; High: < 8 hours | Incident ticket timestamps |
| **Incident Count by Severity** | Total incidents per severity level per quarter | Trending down | Jira Security project reports |
| **False Positive Rate** | Alerts closed as false positive / total alerts | < 15% | Alertmanager + Jira |
| **CAPA Closure Rate** | CAPA items closed on time / total CAPA items | > 95% | Jira CAPA board |
| **Backup Recovery RTO** | Time to restore from backup during incident | < 4 hours | DR exercise logs |
| **Backup Recovery RPO** | Maximum acceptable data loss during recovery | < 24 hours | Backup timestamps vs. incident time |
| **Regulatory Notification Compliance** | Incidents notified to regulators within LOPDP deadline / total breaches requiring notification | 100% | DPO tracking register |
| **Post-Incident Review Completion** | Reviews completed within 5 days / required reviews | 100% | Jira / Confluence |

### 12.2 Reporting Cadence

| Report | Frequency | Audience | Owner |
|--------|-----------|----------|-------|
| **Incident Dashboard** | Real-time | IRT, Operations | On-Call rotation |
| **Weekly Security Digest** | Weekly | ISO, C-Level | ISO |
| **Monthly Incident Report** | Monthly | Board, Management | ISO |
| **Quarterly Metrics Review** | Quarterly | Board, Audit Committee | ISO + DPO |
| **Annual Incident Trend Analysis** | Annually | Board, External Auditors | ISO |

---

## 13. Related Documents

| Document ID | Document Title | Relationship |
|-------------|----------------|--------------|
| LOY-ISMS-001 | ISMS Scope Statement | Defines scope of incident management |
| LOY-ISMS-002 | Information Security Policy | Governing policy for security operations |
| LOY-SEC-003 | Risk Assessment Procedure | Risk identification informing incident scenarios |
| LOY-SEC-004 | Access Control Procedure | Controls for unauthorized access incidents |
| LOY-OPS-006 | Backup and Recovery Procedure | `deploy/backups/` procedures for data restoration |
| LOY-OPS-007 | Disaster Recovery Plan | `deploy/disaster_recovery/` full-stack recovery |
| LOY-SEC-008 | Audit Logging Standard | `backend/apps/audit/` log retention and immutability |
| LOY-SEC-009 | Vulnerability Management Procedure | Patch and remediation coordination |
| LOY-COM-010 | Data Breach Notification Procedure | Regulatory and customer notification templates |
| LOY-OPS-011 | Monitoring and Alerting Runbook | Prometheus, Grafana, Loki, Alertmanager operations |

---

## 14. Approval

This Incident Management Procedure has been reviewed and approved by the following authorized personnel:

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Author** | Information Security Officer | _________________________ | 2026-06-03 |
| **Approver** | Chief Executive Officer | _________________________ | 2026-06-03 |

---

*End of Document*
