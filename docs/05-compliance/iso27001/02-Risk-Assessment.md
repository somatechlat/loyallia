# Loyallia — Risk Assessment and Risk Treatment Plan

**Document ID:** LOYALLIA-ISMS-002  
**Version:** 1.0  
**Date:** 2026-06-03  
**Owner:** Chief Information Security Officer (CISO) / Compliance Lead  
**Classification:** Internal — Confidential  
**Review Cycle:** Annual, or upon significant change  
**Reference:** ISO/IEC 27001:2022, Clause 6.1  

---

## Document Control

| Version | Date | Author | Change Description |
|---------|------|--------|-------------------|
| 1.0 | 2026-06-03 | CISO | Initial release. Aligned with 2026-04-29 compliance audit findings (11 FAIL / 6 PARTIAL / 38 PASS). |

**Approvers**

| Role | Name | Date | Signature |
|------|------|------|-----------|
| CISO | [To be assigned] | | |
| CEO / Data Protection Officer | [To be assigned] | | |

---

## Table of Contents

1. [Purpose and Scope](#1-purpose-and-scope)
2. [Risk Assessment Methodology](#2-risk-assessment-methodology)
   1. [Risk Formula](#21-risk-formula)
   2. [Likelihood Scale](#22-likelihood-scale)
   3. [Impact Scale](#23-impact-scale)
   4. [Risk Matrix and Levels](#24-risk-matrix-and-levels)
3. [Risk Identification and Analysis](#3-risk-identification-and-analysis)
4. [Risk Treatment Plan](#4-risk-treatment-plan)
5. [Residual Risk Summary](#5-residual-risk-summary)
6. [Annexes](#6-annexes)

---

## 1. Purpose and Scope

This document defines the **information security risk assessment and risk treatment process** for Loyallia, a multi-tenant SaaS loyalty platform processing customer PII, payment data, and digital wallet credentials.

### Scope of Assessment

| Domain | In Scope |
|--------|----------|
| **Assets** | Customer PII, payment tokens, wallet credentials (PKPass / Google Wallet), application code, infrastructure configurations, audit logs, backup archives |
| **Systems** | Django REST API, Next.js frontend, PostgreSQL (primary + asynchronous streaming replica), Redis (single instance), MinIO S3, HashiCorp Vault (single instance), Celery workers, Nginx reverse proxy |
| **Processes** | Tenant onboarding, customer enrollment, campaign management, payment processing, pass issuance, data export, backup/DR, incident response |
| **Locations** | Primary production environment (Ecuador-based), offsite MinIO S3 (Avender), local development environments |
| **Personnel** | Engineering team, SRE/Ops, customer support, business tenants, end customers |
| **Legal Frameworks** | LOPDP (Ecuador), GDPR (EU), PCI-DSS principles (payment tokens), ISO 27001:2022 |

### Out of Scope

- Physical security of tenant premises (tenant responsibility under LOPDP §1)
- Third-party payment processor internal security (shared responsibility boundary)
- End-user device security beyond wallet pass best-effort guidance

---

## 2. Risk Assessment Methodology

### 2.1 Risk Formula

Risk is calculated as:

```
Risk Level = Likelihood × Impact
```

Both Likelihood and Impact are scored on a **1–5 ordinal scale**. The product yields a risk score between **1 and 25**, mapped to four risk levels.

### 2.2 Likelihood Scale

| Score | Level | Description | Reference Frequency |
|-------|-------|-------------|---------------------|
| 1 | Rare | The event is conceivable but has not occurred in the industry or is extremely unlikely under current controls. | < Once in 5 years |
| 2 | Unlikely | The event has occurred in similar organizations but is not expected given Loyallia's control environment. | Once in 2–5 years |
| 3 | Possible | The event could reasonably occur; control gaps exist or threat actors actively target this vector. | Once per year |
| 4 | Likely | The event has a high probability of occurring; known vulnerabilities or missing controls increase exposure. | Several times per year |
| 5 | Almost Certain | The event is expected to occur in the near term without immediate remediation. | Monthly or more |

### 2.3 Impact Scale

| Score | Level | Financial / Operational | Legal / Compliance | Reputational |
|-------|-------|------------------------|--------------------|--------------|
| 1 | Negligible | <$1,000; no service disruption | No regulatory interest | No external awareness |
| 2 | Minor | $1,000–$10,000; <1 hr downtime | Informal regulator inquiry | Limited social mention |
| 3 | Moderate | $10,000–$100,000; 1–4 hrs downtime | Formal investigation possible | Local media coverage |
| 4 | Major | $100,000–$500,000; 4–24 hrs downtime | Regulatory fine likely; contractual breach | National media; tenant churn |
| 5 | Catastrophic | >$500,000; >24 hrs downtime | Criminal liability; data protection authority action | Severe brand damage; existential threat |

### 2.4 Risk Matrix and Levels

| Likelihood \ Impact | 1 Negligible | 2 Minor | 3 Moderate | 4 Major | 5 Catastrophic |
|---------------------|-------------|---------|------------|---------|----------------|
| **5 Almost Certain** | 5 Medium | 10 Medium | 15 High | 20 Critical | 25 Critical |
| **4 Likely** | 4 Low | 8 Medium | 12 High | 16 Critical | 20 Critical |
| **3 Possible** | 3 Low | 6 Medium | 9 Medium | 12 High | 15 High |
| **2 Unlikely** | 2 Low | 4 Low | 6 Medium | 8 Medium | 10 Medium |
| **1 Rare** | 1 Low | 2 Low | 3 Low | 4 Low | 5 Medium |

**Risk Level Thresholds**

| Level | Score Range | Action Required |
|-------|-------------|-----------------|
| **Critical** | 16–25 | Immediate executive attention. Treatment plan required within 48 hours. |
| **High** | 10–15 | Treatment plan required within 2 weeks. Risk owner assigned. |
| **Medium** | 5–9 | Treatment plan required within 30 days. Monitor quarterly. |
| **Low** | 1–4 | Accept or monitor. Document rationale if accepted. |

---

## 3. Risk Identification and Analysis

The following risks were identified through:
- Review of the 2026-04-29 compliance audit (11 FAIL findings)
- Architecture review (Docker-based microservices, PostgreSQL streaming replication, single-instance Redis, MinIO S3, single-instance Vault)
- Threat modeling of the loyalty platform data flows
- Analysis of third-party dependencies and supply chain

### Risk Register

| ID | Risk Category | Risk Description | Likelihood | Impact | Score | Level | Primary Asset(s) | Current Control(s) |
|----|--------------|------------------|------------|--------|-------|-------|------------------|-------------------|
| **R-01** | Data Breach | Unauthorized access to customer PII due to missing breach detection and notification mechanisms (LOPDP Art. 44 / GDPR Art. 33-34). No automated incident alerting exists. | 4 | 5 | **20** | **Critical** | Customer database, audit logs | RBAC, tenant isolation, TLS, Vault secrets management |
| **R-02** | Compliance Violation | GDPR cookie consent fails to provide reject option or granular categories (G-01, G-02). Consent withdrawal mechanism absent. | 4 | 4 | **16** | **Critical** | Web application, consent records | CookieConsent.tsx banner, localStorage persistence |
| **R-03** | Data Loss | No automated customer data retention policy (DR-03). Customer PII persists indefinitely after account closure, increasing breach surface and violating storage limitation. | 4 | 4 | **16** | **Critical** | PostgreSQL customer tables | Manual deletion endpoint exists; no automation |
| **R-04** | Service Availability | DDoS or resource exhaustion attack against payment webhook endpoint. Rate limiting is implemented (`@rate_limit`, 100 req/min per IP) on `/api/v1/billing/payments/webhook/`; residual risk is a determined volumetric attack overwhelming upstream bandwidth or the application tier. | 2 | 4 | **8** | **Medium** | API availability, payment processing | HMAC signature verification; `@rate_limit` decorator (100 req/min per IP) on `/api/v1/billing/payments/webhook/` |
| **R-05** | Third-Party Vendor | Dependency vulnerabilities in Python/Node.js packages without CI scanning (OWASP-06). Unpinned versions increase supply-chain risk. | 4 | 3 | **12** | **High** | Application codebase, container images | Manual dependency updates; no automated scanning |
| **R-06** | Data Corruption | Audit log retention (7 years) is not enforced (DR-01, L-11). Lack of automated purge/archival risks unbounded storage growth and potential tampering window. | 3 | 4 | **12** | **High** | Audit logs, compliance evidence | Immutable audit model (save/delete blocked) |
| **R-07** | Insider Threat | Privileged user (SRE/Engineer) abuses Vault or PostgreSQL access to exfiltrate tenant data. No separation of duties for backup decryption keys. | 3 | 4 | **12** | **High** | Vault, PostgreSQL, backup archives | RBAC, age-encrypted backups, audit logging |
| **R-08** | Compliance Violation | No Record of Processing Activities (ROPA) or documented lawful basis per activity (G-03, G-07). Inability to demonstrate GDPR Article 30 compliance. | 3 | 4 | **12** | **High** | All PII processing activities | Privacy policy references; informal documentation |
| **R-09** | Data Breach | PII exposure in application logs (E-03). Email addresses and sensitive data leak into `logger.info()` calls, bypassing structured log design. | 4 | 3 | **12** | **High** | Log streams (Loki), SIEM data | JsonFormatter excludes raw PII by design |
| **R-10** | Third-Party Vendor | International data transfer to EU without Standard Contractual Clauses (SCCs) or adequacy assessment (G-10). Ecuador lacks EU adequacy decision. | 3 | 4 | **12** | **High** | Customer PII of EU subjects | Infrastructure assumed Ecuador-based; no transfer docs |
| **R-11** | Service Availability | Primary database failure without tested failover. PostgreSQL replication exists but automated promotion procedure is not exercised monthly. | 3 | 4 | **12** | **High** | PostgreSQL primary, tenant operations | Streaming replication, PgBouncer connection pooling |
| **R-12** | Natural Disaster | Earthquake or regional outage affecting primary data center. Single-region deployment with offsite backups but untested full-stack DR recovery time. | 2 | 5 | **10** | **High** | All production infrastructure | 3-2-1 backup rule, age-encrypted offsite MinIO, rescue packages |
| **R-13** | Data Loss | No retention policy for sent marketing notifications (DR-06). Unbounded accumulation of message bodies increases recovery complexity. | 3 | 3 | **9** | **Medium** | Notification history, MinIO objects | None for notification archival |
| **R-14** | Data Corruption | Single Redis instance failure or restart during high-load campaign. Cache inconsistency could lead to duplicate stamp issuance or incorrect balance calculations. | 3 | 3 | **9** | **Medium** | Redis cache, customer loyalty balances | Single Redis instance with AOF persistence; no Sentinel cluster |
| **R-15** | Third-Party Vendor | Wallet credential compromise (Apple/Google certificates). Loss or leakage of `.p12` or JWT signer keys would allow pass forgery. | 2 | 4 | **8** | **Medium** | PKPass credentials, Google Wallet issuer keys | Vault storage, HMAC-signed QR codes, `inject_wallet_credentials.py` |
| **R-16** | Data Breach | Tenant isolation failure due to middleware bypass. Direct database access or ORM filter omission could expose cross-tenant data. | 2 | 4 | **8** | **Medium** | Multi-tenant data boundary | `TenantMiddleware`, `@require_role()`, query scoping |
| **R-17** | Service Availability | MinIO S3 storage exhaustion due to unbounded QR code / logo generation. No object lifecycle policy on bucket. | 3 | 2 | **6** | **Medium** | MinIO object storage, service availability | Manual monitoring via Grafana |
| **R-18** | Insider Threat | Disgruntled staff member with dashboard access exports entire tenant customer base via `GET /export/` endpoint. | 2 | 3 | **6** | **Medium** | Customer PII export functionality | OWNER-only export, audit logging, rate limiting |
| **R-19** | Compliance Violation | LOPDP breach notification deadline missed (72 hours to Superintendencia) due to lack of incident response playbook automation. | 2 | 3 | **6** | **Medium** | Regulatory compliance posture | Manual escalation procedures (undocumented) |
| **R-20** | Data Corruption | Backup decryption key loss. Age private key not stored in hardware security module; key compromise or loss renders backups unrecoverable. | 2 | 3 | **6** | **Medium** | Backup archives, rescue packages | Age keys in `.age_keys/` directory; multiple copies |

---

## 4. Risk Treatment Plan

### Treatment Options Legend

| Option | Symbol | Description |
|--------|--------|-------------|
| Reduce | 🔽 | Implement or enhance controls to lower likelihood and/or impact |
| Transfer | 🔀 | Shift risk to third party (insurance, contract, outsourcing) |
| Accept | ✅ | Consciously retain risk with documented management approval |
| Avoid | ❌ | Discontinue activity or architecture that creates the risk |

### Risk Treatment Register

| ID | Risk Owner | Treatment Option | Treatment Description | ISO 27001 Annex A Reference | Target Likelihood | Target Impact | Target Score | Target Level | Target Date |
|----|-----------|------------------|----------------------|----------------------------|-------------------|---------------|--------------|--------------|-------------|
| **R-01** | CISO / DPO | 🔽 Reduce | Implement: (1) Sentry-based incident detection with PII-safe alerting; (2) automated email template for affected users; (3) escalation playbook with 72-hour SLA; (4) registration as data processor with Superintendencia. | A.5.24 (Information security incident management planning and preparation), A.5.25 (Assessment and decision on information security events), A.5.26 (Response to information security incidents), A.8.1 (User endpoint devices) | 2 | 4 | 8 | Medium | 2026-06-15 |
| **R-02** | Frontend Lead / DPO | 🔽 Reduce | Redesign `CookieConsent.tsx`: add "Rechazar No Esenciales" button, implement granular categories (Essential / Analytics / Marketing), store consent with timestamp, add cookie settings modal accessible from footer. | A.5.34 (Privacy and protection of PII), A.8.1 (User endpoint devices), A.5.37 (Documented operating procedures) | 1 | 3 | 3 | Low | 2026-06-20 |
| **R-03** | Backend Lead / DPO | 🔽 Reduce | Implement configurable retention policy: (1) default 2-year TTL after last customer activity; (2) Celery beat task for anonymization; (3) OWNER-triggered permanent delete workflow; (4) retention dashboard for compliance team. | A.5.33 (Protection of records), A.5.34 (Privacy and protection of PII), A.8.1 (User endpoint devices), A.5.37 (Documented operating procedures) | 2 | 3 | 6 | Medium | 2026-06-30 |
| **R-04** | SRE Lead | 🔽 Reduce | Rate limit is already implemented on `/api/v1/billing/payments/webhook/` (100 req/min per IP). Harden further by adding a Redis-backed webhook queue with circuit breaker to absorb bursts, and upstream volumetric DDoS protection. | A.5.29 (Information security during disruption), A.8.20 (Networks security), A.8.21 (Security of network services), A.5.36 (Compliance with policies, rules and standards for information processing) | 2 | 4 | 8 | Medium | 2026-06-10 |
| **R-05** | DevOps Lead | 🔽 Reduce | Add `pip-audit` and `npm audit --production` to CI pipeline. Pin all dependency versions. Enable Dependabot or Renovate for automated PRs on CVEs. Maintain SBOM. | A.5.20 (Information security in development and support processes), A.5.21 (Security of development and test environments), A.8.8 (Management of technical vulnerabilities), A.5.37 (Documented operating procedures) | 2 | 3 | 6 | Medium | 2026-06-30 |
| **R-06** | Compliance Officer | 🔽 Reduce | Create Celery beat task to flag audit entries approaching 7-year boundary at 6.5 years. Implement archive-to-cold-storage (MinIA Glacier class) before deletion. Alert compliance team. | A.5.33 (Protection of records), A.5.34 (Privacy and protection of PII), A.8.1 (User endpoint devices), A.5.37 (Documented operating procedures) | 2 | 3 | 6 | Medium | 2026-07-15 |
| **R-07** | CISO / SRE Lead | 🔽 Reduce | Enforce: (1) just-in-time Vault access with audit logging; (2) separate backup encryption keys held by Compliance Officer (2-of-3 Shamir optional); (3) quarterly access review; (4) privileged session recording for production shell access. | A.5.15 (Access control), A.5.18 (Access rights), A.5.24 (Information security incident management planning and preparation), A.8.2 (Privileged access rights), A.8.5 (Secure authentication), A.8.12 (Data leakage prevention) | 2 | 3 | 6 | Medium | 2026-07-31 |
| **R-08** | DPO / Compliance Officer | 🔽 Reduce | Create formal Record of Processing Activities (ROPA) document mapping: data category → legal basis → purpose → retention → recipients → transfers. Document lawful basis per activity. | A.5.34 (Privacy and protection of PII), A.5.37 (Documented operating procedures), A.5.36 (Compliance with policies, rules and standards for information processing) | 1 | 3 | 3 | Low | 2026-07-15 |
| **R-09** | Backend Lead | 🔽 Reduce | Mask email addresses in application logs (`u***@domain.com`). Audit log exempt (compliance requirement). Add linter rule to CI blocking `%s` interpolation with email in `logger.info()`. | A.8.12 (Data leakage prevention), A.8.15 (Logging), A.5.37 (Documented operating procedures) | 2 | 2 | 4 | Low | 2026-06-20 |
| **R-10** | DPO / Legal | 🔽 Reduce | If serving EU users: (1) document data location; (2) implement Standard Contractual Clauses (SCCs) with sub-processors; (3) publish transfer impact assessment (TIA); (4) appoint EU representative if required. | A.5.34 (Privacy and protection of PII), A.5.30 (ICT readiness for continuity), A.5.37 (Documented operating procedures) | 2 | 3 | 6 | Medium | 2026-07-31 |
| **R-11** | SRE Lead | 🔽 Reduce | Automate monthly failover drill: promote replica, verify application connectivity, measure RTO/RPO. Document runbook with automatic PgBouncer reconfiguration. Implement Patroni or repmgr for automated failover. | A.5.29 (Information security during disruption), A.5.30 (ICT readiness for continuity), A.8.13 (Information backup), A.5.37 (Documented operating procedures) | 2 | 3 | 6 | Medium | 2026-07-31 |
| **R-12** | SRE Lead / CISO | 🔽 Reduce | Conduct quarterly full-stack DR exercise from rescue package. Measure and document RTO (<4 hrs) and RPO (<24 hrs). Evaluate secondary region warm-standby for critical path. | A.5.29 (Information security during disruption), A.5.30 (ICT readiness for continuity), A.8.13 (Information backup), A.5.37 (Documented operating procedures) | 1 | 4 | 4 | Low | 2026-08-31 |
| **R-13** | Backend Lead | 🔽 Reduce | Implement archival task: notifications older than 1 year archive message body to cold storage, keep aggregate statistics in hot DB. Purge after 2-year retention. | A.5.33 (Protection of records), A.5.34 (Privacy and protection of PII), A.5.37 (Documented operating procedures) | 2 | 2 | 4 | Low | 2026-07-15 |
| **R-14** | SRE Lead | 🔽 Reduce | Add Redis Lua scripts for atomic balance updates. Implement idempotency keys on stamp/cashback endpoints. Add data consistency checker (Celery task) comparing Redis cache to PostgreSQL daily. | A.8.1 (User endpoint devices), A.8.9 (Configuration management), A.5.37 (Documented operating procedures) | 2 | 2 | 4 | Low | 2026-07-31 |
| **R-15** | Security Engineer / SRE | 🔽 Reduce | Store wallet credentials in Vault with dynamic lease. Rotate Apple/Google certificates annually. Implement certificate expiry monitoring alert (90/30/7 days). Restrict `inject_wallet_credentials.py` to CI pipeline only. | A.5.23 (Cloud services), A.8.5 (Secure authentication), A.8.1 (User endpoint devices), A.5.37 (Documented operating procedures) | 1 | 3 | 3 | Low | 2026-06-30 |
| **R-16** | Backend Lead | 🔽 Reduce | Add integration test suite specifically for tenant isolation: every endpoint tested with cross-tenant token. Add database-level RLS (Row Level Security) as defense-in-depth. | A.5.15 (Access control), A.5.18 (Access rights), A.8.1 (User endpoint devices), A.5.20 (Information security in development and support processes) | 1 | 3 | 3 | Low | 2026-07-15 |
| **R-17** | SRE Lead | 🔽 Reduce | Implement MinIO bucket lifecycle policy: delete QR codes after 90 days (regenerable), archive logos after 1 year. Add storage quota alerts at 80% capacity. | A.5.33 (Protection of records), A.8.1 (User endpoint devices), A.5.37 (Documented operating procedures) | 2 | 2 | 4 | Low | 2026-07-31 |
| **R-18** | Backend Lead / DPO | 🔽 Reduce | Add export approval workflow: OWNER requests → compliance officer approves → audit log records justification. Add anomaly detection: alert on exports >500 records or outside business hours. | A.5.15 (Access control), A.5.18 (Access rights), A.8.12 (Data leakage prevention), A.8.15 (Logging) | 2 | 2 | 4 | Low | 2026-07-31 |
| **R-19** | CISO / DPO | 🔽 Reduce | Formalize incident response playbook with: (1) 24-hour internal triage SLA; (2) 48-hour legal review SLA; (3) 72-hour regulator notification SLA; (4) automated timer dashboard. | A.5.24 (Information security incident management planning and preparation), A.5.25 (Assessment and decision on information security events), A.5.26 (Response to information security incidents), A.5.37 (Documented operating procedures) | 1 | 3 | 3 | Low | 2026-06-15 |
| **R-20** | CISO / SRE Lead | 🔽 Reduce | Store age private key in Vault with auto-unseal disabled. Maintain 2-of-3 Shamir split: one held by CISO, one by CEO, one in bank safe deposit. Test key recovery annually. | A.8.1 (User endpoint devices), A.5.34 (Privacy and protection of PII), A.8.13 (Information backup), A.5.37 (Documented operating procedures) | 1 | 3 | 3 | Low | 2026-08-31 |

---

## 5. Residual Risk Summary

After application of the risk treatment plan, the residual risk profile is as follows:

### Residual Risk Distribution

| Risk Level | Pre-Treatment Count | Post-Treatment Count | Change |
|------------|---------------------|----------------------|--------|
| **Critical** | 2 | 0 | −2 |
| **High** | 9 | 0 | −9 |
| **Medium** | 7 | 9 | +2 |
| **Low** | 2 | 11 | +9 |
| **Total** | **20** | **20** | — |

### Residual Risk Matrix (Post-Treatment)

| Likelihood \ Impact | 1 Negligible | 2 Minor | 3 Moderate | 4 Major | 5 Catastrophic |
|---------------------|-------------|---------|------------|---------|----------------|
| **5 Almost Certain** | — | — | — | — | — |
| **4 Likely** | — | — | — | — | — |
| **3 Possible** | — | — | — | — | — |
| **2 Unlikely** | — | R-09 | R-01, R-03, R-05, R-06, R-07, R-10, R-11 | R-04, R-12 | — |
| **1 Rare** | — | — | R-02, R-08, R-13, R-14, R-15, R-16, R-17, R-18, R-19, R-20 | — | — |

### Highest Residual Risks (Post-Treatment)

| ID | Residual Level | Justification for Acceptance |
|----|---------------|------------------------------|
| **R-01** | Medium (8) | Breach detection and notification controls reduce likelihood but cannot eliminate zero-day exploits. Annual penetration testing and bug bounty program further reduce residual risk. |
| **R-12** | Low (4) | Regional natural disaster risk is accepted at Low level given: 3-2-1 backup compliance, age-encrypted offsite replication, documented rescue packages, and quarterly DR testing. Full secondary-region warm-standby is cost-prohibitive at current scale; re-evaluated annually. |

### Management Approval of Residual Risk

The residual risk profile above has been reviewed and is deemed acceptable for Loyallia's current business context, regulatory environment, and risk appetite. All Critical and High risks have been reduced to Medium or Low through control implementation.

| Role | Name | Date | Approval |
|------|------|------|----------|
| Chief Executive Officer | [To be assigned] | | ☐ |
| Chief Information Security Officer | [To be assigned] | | ☐ |
| Data Protection Officer | [To be assigned] | | ☐ |

---

## 6. Annexes

### Annex A: Mapping to Compliance Audit Findings

| Risk ID | Audit Finding ID | Finding Description |
|---------|-----------------|---------------------|
| R-01 | L-14, G-04 | No breach notification mechanism |
| R-02 | G-01, G-02 | Cookie consent missing reject option / withdrawal |
| R-03 | DR-03 | No customer data retention policy |
| R-04 | R-11 (resolved) | Rate limit implemented on payment webhook |
| R-05 | OWASP-06 | No dependency vulnerability scanning in CI |
| R-06 | DR-01, L-11 | Audit log retention not enforced |
| R-08 | G-03, G-07 | No ROPA / no documented lawful basis |
| R-09 | E-03 | PII in application logs |
| R-10 | G-10 | No international data transfer assessment |
| R-13 | DR-06 | No notification data retention |

### Annex B: ISO 27001:2022 Annex A Controls Referenced

| Control ID | Control Title | Risks Applied |
|-----------|---------------|---------------|
| A.5.15 | Access control | R-07, R-16, R-18 |
| A.5.18 | Access rights | R-07, R-16, R-18 |
| A.5.20 | Information security in development and support processes | R-05, R-16 |
| A.5.21 | Security of development and test environments | R-05 |
| A.5.23 | Cloud services | R-15 |
| A.5.24 | Information security incident management planning and preparation | R-01, R-07, R-19 |
| A.5.25 | Assessment and decision on information security events | R-01, R-19 |
| A.5.26 | Response to information security incidents | R-01, R-19 |
| A.5.29 | Information security during disruption | R-04, R-11, R-12 |
| A.5.30 | ICT readiness for continuity | R-10, R-11, R-12 |
| A.5.33 | Protection of records | R-03, R-06, R-13, R-17 |
| A.5.34 | Privacy and protection of PII | R-01, R-02, R-03, R-06, R-08, R-10, R-20 |
| A.5.36 | Compliance with policies, rules and standards for information processing | R-02, R-04, R-05, R-08 |
| A.5.37 | Documented operating procedures | All risks |
| A.8.1 | User endpoint devices | R-01, R-02, R-03, R-06, R-14, R-15, R-16, R-17, R-20 |
| A.8.2 | Privileged access rights | R-07 |
| A.8.5 | Secure authentication | R-07, R-15 |
| A.8.8 | Management of technical vulnerabilities | R-05 |
| A.8.9 | Configuration management | R-14 |
| A.8.12 | Data leakage prevention | R-07, R-09, R-18 |
| A.8.13 | Information backup | R-11, R-12, R-20 |
| A.8.15 | Logging | R-09, R-18 |
| A.8.20 | Networks security | R-04 |
| A.8.21 | Security of network services | R-04 |

### Annex C: Review and Maintenance

| Trigger | Action | Owner |
|---------|--------|-------|
| Annual calendar review | Full reassessment of all risks, scores, and treatments | CISO |
| New significant threat intelligence | Ad-hoc review of affected risks | Security Engineer |
| Major infrastructure change | Review of architecture-dependent risks (R-11, R-12, R-14, R-17) | SRE Lead |
| New compliance requirement | Review of legal/regulatory risks (R-01, R-02, R-08, R-10, R-19) | DPO |
| Security incident | Post-incident review; update risk register if new risk identified | CISO |
| Completion of treatment | Re-score treated risks; update residual risk summary | Compliance Officer |

---

*End of Document*
