# Business Continuity and Disaster Recovery Policy

| | |
|---|---|
| **Document ID** | POL-BCDR-001 |
| **Version** | 1.0 |
| **Effective Date** | 2026-06-03 |
| **Owner** | Chief Information Security Officer (CISO) |
| **Review Cycle** | Annual (or after every DR activation or major infrastructure change) |
| **ISO 27001 Controls** | A.5.29 — Information Security During Disruption, A.5.30 — ICT Readiness for Business Continuity |

---

## Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-06-03 | CISO / SRE Lead | Initial release |

---

## Table of Contents

1. [Policy Statement and Objectives](#1-policy-statement-and-objectives)
2. [Roles and Responsibilities](#2-roles-and-responsibilities)
3. [Business Impact Analysis (BIA)](#3-business-impact-analysis-bia)
4. [Recovery Strategies](#4-recovery-strategies)
5. [Disaster Recovery Procedures](#5-disaster-recovery-procedures)
6. [Testing and Exercise Schedule](#6-testing-and-exercise-schedule)
7. [Communication Plan During Disruption](#7-communication-plan-during-disruption)
8. [Return to Normal Operations](#8-return-to-normal-operations)
9. [Review and Maintenance](#9-review-and-maintenance)
10. [References and Related Documents](#10-references-and-related-documents)

---

## 1. Policy Statement and Objectives

### 1.1 Policy Statement

Loyallia is committed to ensuring the continuous availability of its SaaS loyalty and rewards platform, the integrity of customer and tenant data, and the resilience of its information and communications technology (ICT) infrastructure against disruptive incidents. This policy establishes the governance framework, roles, strategies, and procedures for business continuity management (BCM) and disaster recovery (DR) in alignment with ISO/IEC 27001:2022 Annex A controls A.5.29 and A.5.30.

All employees, contractors, and third-party service providers who participate in the design, operation, or support of Loyallia’s production environment are bound by this policy. Compliance is mandatory and non-negotiable.

### 1.2 Objectives

1. **Availability:** Maintain platform availability at **≥ 99.9%** annual uptime, measured against the production SaaS environment.
2. **Data Protection:** Achieve a Recovery Point Objective (RPO) of **≤ 24 hours** for both transactional data and object storage from the latest verified backup, assuming the previous daily backup and offsite sync completed successfully. A ≤ 5-minute RPO for transactional data would require continuous WAL archiving/shipping to a secondary site, which is not currently implemented.
3. **Recovery Speed:** Achieve a Recovery Time Objective (RTO) of **≤ 4 hours** for both single-component failures and total cluster loss or datacenter-level incidents. The current infrastructure requires manual failover (streaming replica promotion, Redis/MinIO/Vault restore); a ≤ 30-minute single-component RTO would require automated failover tooling that is not currently deployed.
4. **Verification:** Ensure all backup sets are automatically verified for integrity and restorability on a **daily** basis (verification timer runs at 06:00 UTC), with weekly offsite-integrity spot checks by the SRE Lead.
5. **Resilience:** Maintain documented, tested, and automated recovery paths for all critical infrastructure components (PostgreSQL, Redis, Vault, MinIO, application tier).
6. **Compliance:** Satisfy contractual SLA obligations, Ecuadorian data-protection regulations (LOPDP), and PCI DSS availability requirements.

### 1.3 Scope

This policy applies to:

- All production, staging, and development environments hosted on Loyallia infrastructure.
- All information assets, applications, databases, secrets, file stores, and network components that support the Loyallia platform.
- All personnel with operational, administrative, or engineering responsibilities related to BCM/DR.
- Third-party cloud and colocation providers whose services are within the critical dependency chain.

---

## 2. Roles and Responsibilities

### 2.1 Business Continuity Management (BCM) Team

| Role | Responsibility | Primary Owner |
|------|----------------|---------------|
| **Executive Sponsor** | Authorizes the BCM programme, approves budget and policy exceptions, and makes go/no-go decisions on major failover events. | CEO |
| **CISO / BCM Lead** | Owns this policy, ensures ISO 27001 control compliance, chairs post-incident reviews, and approves DR test results. | CISO |
| **Infrastructure & SRE Lead** | Maintains DR playbooks, automates backup/restore pipelines, performs root-cause analysis, and leads technical recovery efforts. | SRE Lead |
| **Primary On-Call SRE** | First responder for P1/P2 incidents; executes recovery procedures, coordinates with Secondary On-Call, and communicates status. | Rotating SRE |
| **Secondary On-Call SRE** | Provides backup to Primary On-Call; assumes command if Primary is unavailable; validates rescue-file integrity. | Rotating SRE |
| **Database Administrator (DBA)** | Oversees PostgreSQL backup validation, PITR execution, replication health, and data-integrity checks during recovery. | SRE Lead (interim) |
| **Security Lead** | Investigates security-related disruptions (ransomware, breach), coordinates forensic preservation, and approves forensic-safe recovery steps. | Security Lead |
| **Platform Engineering** | Maintains bootstrap and factory-reset automation; ensures idempotency of rebuild scripts and rescue-file generation. | Platform Engineer |
| **Communications Lead** | Manages internal and external stakeholder communications during disruptions, including tenant and regulator notifications. | Operations Manager |

### 2.2 General Responsibilities

- **All Engineers:** Must be familiar with the location of DR playbooks, rescue files, and bootstrap procedures. Must not execute recovery steps outside of an authorized incident response unless in a designated DR drill.
- **All Managers:** Must ensure team members understand their BCM roles and attend scheduled DR exercises.
- **Third-Party Providers:** Must maintain their own BCM/DR documentation and provide Loyallia with contact details for escalation during cross-provider incidents.

---

## 3. Business Impact Analysis (BIA)

### 3.1 Critical Business Functions

The following functions are classified as **Critical** (business cannot operate without them for more than 30 minutes) and **High** (tolerable outage up to 4 hours).

| ID | Business Function | Criticality | Justification |
|----|-------------------|-------------|---------------|
| BF-01 | Transaction processing (QR scans, reward issuance, redemptions) | **Critical** | Direct revenue impact for tenants; regulatory reporting obligation. |
| BF-02 | Tenant and end-user authentication / authorization | **Critical** | All platform access depends on authn/authz; cascading failure if unavailable. |
| BF-03 | Wallet pass generation and delivery (Apple Wallet, Google Wallet) | **Critical** | Core product feature; contractual SLA with tenants. |
| BF-04 | Notification services (email, SMS, push, WhatsApp) | **High** | Customer engagement channel; tolerable brief delay. |
| BF-05 | Payment processing and reconciliation | **Critical** | PCI DSS scope; financial and legal implications. |
| BF-06 | Campaign and loyalty rule engine | **High** | Operational feature; does not immediately block transactions if cached. |
| BF-07 | Analytics and reporting dashboards | **Medium** | Business intelligence; no immediate operational impact. |
| BF-08 | Secrets management (HashiCorp Vault) | **Critical** | All service-to-service credentials, DB passwords, and API keys depend on Vault. |

### 3.2 RTO and RPO per Function

| Function | RTO | RPO | Recovery Mechanism |
|----------|-----|-----|--------------------|
| Transaction processing | ≤ 4 hours | ≤ 24 hours | Manual promotion of the streaming replica or restore from latest verified `pg_dump` + WAL archive. |
| Authn / Authz | ≤ 4 hours | ≤ 24 hours | PostgreSQL restore or replica promotion; Redis reconstructs from application caches; Vault restore from rescue file. |
| Wallet pass delivery | ≤ 4 hours | ≤ 24 hours | MinIO restore from offsite mirror or recreate passes from source data. |
| Notifications | ≤ 4 hours | ≤ 24 hours | Redis restore from RDB snapshot or reconstruct Celery queues; notification history may be rebuilt from DB logs. |
| Payment processing | ≤ 4 hours | ≤ 24 hours | Same as transaction processing; PCI DSS compensating controls require fast recovery. |
| Campaign engine | ≤ 4 hours | ≤ 24 hours | Database restoration; application restart via Docker Compose. |
| Analytics / reporting | ≤ 4 hours | ≤ 24 hours | Rebuild from transactional DB or re-ingest from persisted data. |
| Secrets management | ≤ 4 hours | 0 | Vault rescue-file re-import; manual unseal with age-encrypted rescue package. |

### 3.3 Dependencies

| Function | Upstream Dependencies | Downstream Consumers |
|----------|----------------------|----------------------|
| Transaction processing | PostgreSQL, Redis, Vault, MinIO (assets), PgBouncer | Wallet pass engine, notification services, payment gateway |
| Authn / Authz | PostgreSQL, Redis, Vault | All API endpoints, admin dashboard, tenant portal |
| Wallet pass delivery | MinIO, PostgreSQL, Apple/Google signing certs | End-user mobile devices |
| Notifications | Redis (Celery broker), PostgreSQL, WhatsApp bridge, SMTP/SMS gateways | End customers, tenant staff |
| Payment processing | PostgreSQL, Vault (gateway credentials), external PSP | Tenant financial reconciliation, PCI DSS audit logs |
| Campaign engine | PostgreSQL, Redis, Celery workers | Notification services, analytics |
| Analytics | PostgreSQL, Prometheus, Grafana | Tenant dashboards, management reports |
| Secrets management | Single Vault container, age-encrypted rescue files, TLS certificates | Every other service |

---

## 4. Recovery Strategies

### 4.1 Infrastructure Failure (Single Component)

**Strategy:** Documented manual recovery with partial automated restart. Production currently runs a single primary PostgreSQL with one asynchronous streaming replica, a single Redis instance, a single Vault container, and a single MinIO node.

- **PostgreSQL:** One asynchronous streaming replica (`postgres-replica`) is maintained via `pg_basebackup`. Failover is manual: promote the replica or restore from latest verified `pg_dump` + WAL archives. Automatic promotion is not implemented.
- **Redis:** Single Redis instance with AOF persistence. If it fails, restore from RDB/AOF backup or reconstruct from application caches.
- **MinIO:** Single MinIO node. If it fails, restore from offsite mirror or recreate objects from source.
- **Vault:** Single Vault container. Recovery is from the encrypted rescue snapshot (`vault_init_rescue.json` + age-decrypted secrets), followed by manual unseal.
- **Application Containers:** Docker Compose restart policy (`unless-stopped`). If host fails, redeploy on replacement host using bootstrap scripts.

**Reference:** See `docs/09-archive/BACKUP_DISASTER_RECOVERY.md` §7.1–7.4 and `docs/04-runbooks/DISASTER_RECOVERY_PLAYBOOK.md` §3.

### 4.2 Data Center Loss (Complete Site Failure)

**Strategy:** Full DR rescue-package recovery on alternate infrastructure.

1. **Pre-requisites maintained:**
   - Daily encrypted full backups (PostgreSQL dump, Redis RDB, Vault secrets, MinIO objects) stored offsite on a secondary MinIO instance.
   - Weekly encrypted rescue files (`vault_init_rescue.json`, runtime configs, certificates, nginx configs, and a PostgreSQL `pg_dump --format=custom`) stored offsite.
   - Offsite sync uploads encrypted `.age` files to the secondary MinIO instance via boto3 when configured; it does not use MinIO bucket replication.

2. **Recovery sequence:**
   - Provision replacement server(s) in alternate region/cloud zone.
   - Download rescue files from offsite MinIO using `age`-encrypted transport.
   - Execute `deploy/disaster_recovery/production/recover.sh` (or development equivalent).
   - Priority order: **Vault → PostgreSQL → Redis → Application tier → Nginx → Monitoring**. MinIO is restored from daily backups, not the rescue package.

**RTO:** ≤ 4 hours  
**RPO:** ≤ 24 hours (object storage and transactional DB from latest verified backup), assuming the previous daily backup and offsite sync completed successfully. Near-zero RPO requires automated WAL shipping to the secondary region, which is not currently implemented.

**Reference:** See `docs/04-runbooks/DISASTER_RECOVERY_PLAYBOOK.md` §3.2 and `docs/09-archive/BACKUP_DISASTER_RECOVERY.md` §7.5.

### 4.3 Cyber Attack / Ransomware

**Strategy:** Isolate, preserve forensic evidence, and restore from clean, offline backups.

1. **Detection & Containment:**
   - Automated alerts from Prometheus/Alertmanager flag anomalous encryption rates, file-system changes, or unauthorized network traffic.
   - Primary On-Call immediately isolates affected containers/VMs (stop network traffic, snapshot disks for forensics).
   - Security Lead initiates incident response per the Information Security Incident Response Plan.

2. **Eradication & Recovery:**
   - Do not pay ransoms. Recovery is performed exclusively from verified, offline (air-gapped or immutable) backups.
   - Rescue files and offsite backups are encrypted with `age`; WORM/object-lock lifecycle policies are not currently configured.
   - Before restoring, verify backup integrity checksums and GPG/age signatures to ensure the backup predates the infection.
   - Rebuild hosts from clean base images; re-run bootstrap scripts; restore data layers.

3. **Post-Recovery:**
   - Full malware scan and vulnerability assessment before reconnecting to the internet.
   - Rotate all secrets, API keys, and certificates regardless of apparent compromise.
   - LOPDP breach notification within 72 hours if personal data is affected.

**Reference:** See `docs/04-runbooks/DISASTER_RECOVERY_PLAYBOOK.md` §5 and the Incident Management Procedure.

### 4.4 Natural Disaster (Earthquake, Flood, Power Grid Failure)

**Strategy:** Geographic redundancy and cold-start capability.

- Loyallia production infrastructure is hosted on cloud infrastructure with availability-zone isolation. In the event of a zone or regional disaster, the DR plan assumes a cold-start into a secondary region.
- DNS failover (manual or automated via provider) points traffic to the recovery region once health checks pass.
- Offsite backups are stored in a geographically separate location with no shared power, cooling, or network fabric.
- If both primary and secondary regions are impacted, recovery proceeds from the deepest offline archive (weekly rescue package containing a `pg_dump` logical dump), accepting an RPO of up to 7 days for the final fallback tier.

---

## 5. Disaster Recovery Procedures

### 5.1 Backup Verification

All backups must be verified automatically on a scheduled basis; manual verification is performed before and after any major infrastructure change.

| Backup Type | Frequency | Verification Method | Owner |
|-------------|-----------|---------------------|-------|
| PostgreSQL `pg_dump` (daily) | Daily at 02:00 UTC (`loyallia-backup.timer`) | File existence, age, and decryption test only (`deploy/backups/production/verify.sh`). No `pg_restore --list` or table-count validation is performed. | Automated |
| PostgreSQL streaming replica | Continuous | Streaming lag check + `pg_isready` healthcheck | Automated |
| Redis RDB + AOF | With AOF `appendfsync everysec` | `redis-check-rdb` + `redis-check-aof` when restoring | Manual during restore |
| Vault rescue snapshot | Weekly at 03:00 UTC Sunday (`loyallia-rescue.timer`) | Snapshot decrypt + JSON schema validation (`deploy/disaster_recovery/production/verify_rescue.sh`) | Automated |
| MinIO mirror | Daily as part of full backup | `mc diff` between primary and secondary when configured | Automated when offsite sync is enabled |
| Rescue files | After every creation | `verify_rescue.sh` checksums + JSON schema validation | Automated |
| Offsite integrity | Weekly | Download and decrypt a random sample; restore to test environment | SRE Lead |

**Failure Handling:** If any automated verification fails, Alertmanager pages the Primary On-Call SRE within 5 minutes. The SRE must investigate and resolve the failure within 4 hours, or escalate to the Infrastructure Lead.

**Reference:** See `deploy/backups/README.md` and `docs/09-archive/BACKUP_DISASTER_RECOVERY.md` §3.5, §6.1.

### 5.2 Recovery Procedures

Recovery procedures are maintained in three layers:

1. **Automated Scripts:**
   - `deploy/disaster_recovery/production/create_rescue.sh` / `.../development/create_rescue.sh` — generates a complete rescue package.
   - `deploy/disaster_recovery/production/recover.sh` / `.../development/recover.sh` — performs full-environment recovery.
   - `deploy/backups/restore` — component-level restore (`--postgres`, `--redis`, `--vault`, `--minio`, `--snapshot`).

2. **Runbooks:**
   - `docs/04-runbooks/DISASTER_RECOVERY_PLAYBOOK.md` — step-by-step commands for every scenario matrix entry.
   - `docs/09-archive/BACKUP_DISASTER_RECOVERY.md` — architecture, RTO/RPO justification, and deep-dive recovery for each data layer.

3. **Bootstrap Rebuild:**
   - `deploy/bootstrap/bootstrap-production.sh` — idempotent zero-trust rebuild from scratch (used when no rescue files are viable, or for green-field DR site).
   - `deploy/bootstrap/bootstrap-development.sh` — development equivalent.

All recovery procedures require two-person control for production:
- One engineer executes the steps.
- A second engineer (peer or Secondary On-Call) validates each critical command before execution.

### 5.3 Failover Procedures

| Scenario | Failover Type | Trigger | Procedure |
|----------|---------------|---------|-----------|
| PostgreSQL primary failure | Manual | Primary health check fails | Promote streaming replica or restore from latest verified `pg_dump`; reconfigure PgBouncer. |
| Redis failure | Manual | Redis health check fails | Restore from RDB/AOF backup or reconstruct from application caches. |
| MinIO failure | Manual | MinIO health check fails | Restore from offsite mirror or recreate objects from source. |
| Full datacenter / region | Manual | CISO or SRE Lead declares disaster | DNS cutover to secondary region after rescue-package recovery and health-check validation. |
| Vault seal event | Manual | Vault health endpoint returns `sealed:true` | Manual unseal with rescue keys from offline safe. |

**Failback:** After a failover to a secondary region or standby system, traffic must not be returned to the primary until:
1. Root cause is remediated.
2. Full data consistency is verified (checksum comparison, replication lag = 0).
3. A successful synthetic transaction end-to-end test passes.
4. CISO or SRE Lead approves the failback.

---

## 6. Testing and Exercise Schedule

### 6.1 DR Drill Calendar

| Exercise | Frequency | Scope | Owner | Success Criteria |
|----------|-----------|-------|-------|------------------|
| **Table-top walkthrough** | Quarterly | Review scenario matrix, decision tree, and escalation paths with BCM team. | CISO | All participants can locate playbooks and state their roles without reference. |
| **Component restore drill** | Quarterly (rotating component) | Restore PostgreSQL, Redis, Vault, or MinIO from latest backup into an isolated test environment. | SRE Lead | RTO target met; data integrity checks pass; no errors in logs. |
| **Full environment recovery drill** | Semi-annually | Execute `deploy/disaster_recovery/production/recover.sh` on a clean VM; bring application to full health. | Infrastructure Lead | End-to-end RTO ≤ 4 hours; API health checks pass; synthetic transaction succeeds. |
| **Offsite backup restore** | Annually | Download rescue files from offsite MinIO, decrypt, and restore on cold hardware. | SRE Lead + Security Lead | Recovery succeeds without primary-site dependencies; signatures verify. |
| **Failover / failback drill** | Annually | Perform DNS cutover to DR site, run synthetic load, cut back. | Infrastructure Lead | Zero data loss during failback; no customer-visible errors. |

### 6.2 Drill Documentation

Every drill must produce:
1. **Drill Plan** — objectives, scope, assumed risks, and rollback plan.
2. **Execution Log** — timestamps, commands, outcomes, anomalies.
3. **Drill Report** — pass/fail per success criteria, variances from RTO/RPO targets, and observations.
4. **Remediation Tracker** — action items with owners and due dates for any gaps found.

Drill reports are retained for a minimum of three years and are subject to internal audit and external certification-body review.

---

## 7. Communication Plan During Disruption

### 7.1 Internal Communication

| Audience | Channel | Message Owner | Frequency |
|----------|---------|---------------|-----------|
| SRE / Engineering | `#incidents` (Slack) + PagerDuty | Primary On-Call | Real-time |
| Executive Leadership | Direct call / email | CISO / CEO | Within 30 min of P1 declaration |
| All Staff | Slack `#general` or email | Communications Lead | After executive briefing |
| BCM Team | Bridge call (Zoom/Meet) | CISO | Within 15 min of P1 |

### 7.2 External Communication

| Audience | Channel | Trigger | Owner |
|----------|---------|---------|-------|
| Tenants (business clients) | Status page + email | RTO > 30 min or confirmed data loss | Communications Lead |
| End consumers | In-app banner / support portal | Tenant-facing outage > 1 hour | Tenant (via template) |
| Regulators (LOPDP, banking supervisor) | Formal written notice | Confirmed personal data breach or > 4-hour outage | Legal / DPO |
| Payment processors / PCI acquirer | Secure email / portal | Any outage affecting payment data | Security Lead |
| Cloud / colocation provider | Ticket + phone | Provider-side failure | Infrastructure Lead |

### 7.3 Communication Templates

Pre-approved communication templates are stored in `deploy/alerting/` and cover:
- Initial disruption notice (internal)
- Tenant status-page update (external)
- Regulatory breach notification (LOPDP)
- Post-recovery all-clear

All external communications must be approved by the CISO or CEO before release.

---

## 8. Return to Normal Operations

### 8.1 Criteria for Returning to Primary Site

Before declaring an incident resolved and returning to normal operations, the following must be confirmed:

1. **Service Health:** All health-check endpoints (`/api/v1/health/`, `/api/v1/health/ready/`) return HTTP 200 for a continuous period of ≥ 30 minutes.
2. **Data Integrity:** Database row counts, audit-log timestamps, and MinIO object checksums match pre-incident baselines or secondary-replica baselines.
3. **Security Posture:** If the incident involved a security breach, a forensic scan confirms eradication; all credentials are rotated.
4. **Monitoring Restoration:** Prometheus, Grafana, Loki, and Alertmanager are fully operational and receiving telemetry.
5. **Backup Resumption:** The next scheduled backup cycle has executed successfully post-recovery.
6. **Rescue File Regeneration:** New rescue files are created and verified after any infrastructure topology change.

### 8.2 Post-Incident Activities

| Timeframe | Activity | Owner |
|-----------|----------|-------|
| Within 1 hour | Incident contained; services healthy; root cause documented. | Primary On-Call |
| Within 24 hours | Backup integrity re-verified; offsite sync confirmed; customer impact assessed. | SRE Lead |
| Within 1 week | Post-mortem written; action items assigned; DR gaps remediated. | CISO |
| Within 1 month | DR drill scheduled to validate fixes; documentation updated; on-call training refreshed. | Infrastructure Lead |

**Reference:** See `docs/04-runbooks/DISASTER_RECOVERY_PLAYBOOK.md` §5 (Post-Incident Checklist).

---

## 9. Review and Maintenance

### 9.1 Scheduled Review

- **Annual Policy Review:** The CISO reviews this policy at least once per year, or within 30 days of any of the following:
  - A DR activation (real or drill) that revealed gaps.
  - A major infrastructure architecture change (e.g., new cloud region, database engine migration).
  - A change in regulatory requirements or contractual SLA.
  - A significant organizational change (new roles, M&A, outsourcing).

- **Quarterly Procedure Review:** The Infrastructure Lead reviews DR playbooks and runbooks for accuracy against the live environment. Outdated commands, IP addresses, or container names are corrected immediately.

### 9.2 Change Control

Any change to this policy or its subordinate procedures must follow the standard change-management process:
1. Draft change in a feature branch.
2. Technical review by SRE Lead and Security Lead.
3. Approval by CISO (policy changes) or Infrastructure Lead (procedure changes).
4. Merge to `main`; auto-archive previous version in `docs/05-compliance/iso27001/archive/`.
5. Notify BCM team within 24 hours.

### 9.3 Training and Awareness

- New engineering hires complete BCM/DR orientation within their first 30 days, including a walkthrough of `docs/04-runbooks/DISASTER_RECOVERY_PLAYBOOK.md` and hands-on rescue-file verification.
- All SRE staff must successfully complete at least one component-restore drill per quarter.
- BCM team roles and contact details are maintained in the runbook referenced by `deploy/alerting/` and updated whenever personnel change.

---

## 10. References and Related Documents

| Document | Location | Purpose |
|----------|----------|---------|
| Backup & Disaster Recovery Plan | `docs/09-archive/BACKUP_DISASTER_RECOVERY.md` | Detailed backup architecture, RTO/RPO rationale, and per-component recovery steps. |
| Disaster Recovery Playbook | `docs/04-runbooks/DISASTER_RECOVERY_PLAYBOOK.md` | Scenario matrix, escalation contacts, step-by-step recovery commands, post-incident checklist. |
| Factory Reset Procedure | `docs/04-runbooks/FACTORY_RESET_PROCEDURE.md` | Idempotent environment rebuild and surgical data cleanup. |
| Backup Scripts | `deploy/backups/` | Daily encrypted backups, offsite sync, verification automation. |
| DR Scripts | `deploy/disaster_recovery/` | Rescue-file creation and automated full-environment recovery. |
| Factory Reset Scripts | `deploy/factory_reset/` | Production and development factory-reset automation. |
| Bootstrap Scripts | `deploy/bootstrap/` | Zero-trust full environment rebuild from scratch. |
| Access Control Policy | `docs/05-compliance/iso27001/04-Access-Control-Policy.md` | Roles and permissions for DR execution. |
| Risk Assessment | `docs/05-compliance/iso27001/02-Risk-Assessment.md` | Identified risks informing BIA priorities. |

---

*End of Document*
