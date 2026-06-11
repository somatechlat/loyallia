# Loyallia — Statement of Applicability (SoA)

**Document ID:** LOYALLIA-ISO-SOA-001  
**Version:** 1.0.0  
**Date:** 2026-06-03  
**Owner:** Chief Information Security Officer (CISO) / Compliance Lead  
**Classification:** Internal — Confidential  
**Standard:** ISO/IEC 27001:2022  
**Clause Reference:** 6.1.3 — Statement of Applicability  

---

## 1. Document Purpose

This Statement of Applicability (SoA) defines which controls from ISO/IEC 27001:2022 Annex A are applicable to the Loyallia information security management system (ISMS), the justification for inclusion or exclusion, the implementation status of each control, and references to evidence.

### Scope
- **Organization:** Loyallia (SaaS loyalty platform provider)
- **Systems:** Django Ninja REST API, Next.js web dashboard, PostgreSQL, Redis, MinIO, HashiCorp Vault, Docker Compose stacks
- **Data:** Customer PII, tenant business data, payment information, authentication credentials, audit logs
- **Locations:** Cloud-hosted Docker infrastructure (primary Ecuador, offsite US); development environments on local workstations
- **Personnel:** Engineering team, platform administrators, customer support, third-party vendors

### Excluded from Scope
- Physical security of customer premises (tenant-owned retail locations)
- End-user mobile devices (customer phones, staff scanner devices)
- Third-party payment processor internal security (shared responsibility model)

---

## 2. Risk Assessment Summary

The risk assessment identified the following high-priority risks driving control selection:

| Risk ID | Risk Description | Likelihood | Impact | Risk Level |
|---------|-----------------|------------|--------|------------|
| R-001 | Unauthorized access to tenant data via API | Medium | High | **High** |
| R-002 | Data breach of customer PII | Low | Critical | **High** |
| R-003 | Loss of audit trail integrity | Low | High | **Medium** |
| R-004 | Service unavailability (DR scenario) | Low | High | **Medium** |
| R-005 | Insider threat (privileged abuse) | Low | High | **Medium** |
| R-006 | Supply chain / dependency vulnerability | Medium | Medium | **Medium** |
| R-007 | Inadequate data retention / deletion | Medium | Medium | **Medium** |

---

## 3. Statement of Applicability — Control Register

### A.5 Organizational Controls

| Control | Title | Applicable | Justification | Status | Evidence / Reference |
|---------|-------|:----------:|---------------|:------:|----------------------|
| **5.1** | **Policies for information security** | Yes | Loyallia processes PII and operates a multi-tenant SaaS. Formal information security policies are required to establish management direction and support. | Implemented | `docs/05-compliance/COMPLIANCE_CHECKLIST.md`; privacy policy §4 references technical and organizational measures |
| **5.2** | **Information security roles and responsibilities** | Yes | Roles (OWNER, MANAGER, STAFF, SUPER_ADMIN) are defined and enforced. Responsibilities must be formally assigned. | Implemented | `backend/common/permissions.py`; RBAC decorators (`@require_role`); `backend/apps/authentication/models.py` |
| **5.3** | **Segregation of duties** | Yes | SuperAdmin functions are separated from tenant admin functions. API and database access are separated from deployment access. | Partial | `apps/tenants/super_admin_api/` (separate API namespace); Vault policies restrict secret access; **Planned:** Formal SoD matrix document |
| **5.4** | **Management responsibilities** | Yes | Management must ensure personnel understand their security responsibilities. Required for ISO 27001 compliance. | Planned | **Planned:** Management responsibility statement document; security awareness program |
| **5.5** | **Contact with special interest groups** | No | Loyallia is a small SaaS provider; no formal special interest group membership is required for operational security at this stage. | N/A | Exclusion justified: organization size and risk profile do not warrant mandatory group participation |
| **5.6** | **Information security in project management** | Yes | Security must be integrated into development lifecycle (DevSecOps). | Partial | Security review in `docs/05-compliance/COMPLIANCE_CHECKLIST.md`; OWASP coverage validated; **Planned:** Formal secure SDLC policy |
| **5.7** | **Threat intelligence** | Yes | Proactive threat monitoring is required for a SaaS handling PII and payment data. | Partial | Sentry integration for error tracking; Grafana alerting; **Planned:** Dedicated threat intelligence feed subscription |
| **5.8** | **Information security in supplier relationships** | Yes | Loyallia depends on third-party services (SMTP, payment gateway, Apple/Google push, Avender MinIO offsite). | Partial | Vendor list maintained informally; **Planned:** Formal vendor risk assessment program and contractual security clauses |
| **5.9** | **Information security in supplier agreements** | Yes | Contracts with critical suppliers must include security requirements. | Partial | Payment gateway and cloud provider contracts exist; **Planned:** Standardized security addendum for all suppliers |
| **5.10** | **Addressing information security in supplier agreements** | Yes | Specific security requirements (confidentiality, data handling, breach notification) must be contractually defined. | Planned | **Planned:** Template security clauses for SaaS vendors and data processors |
| **5.11** | **Monitoring and review of supplier services** | Yes | Critical suppliers (hosting, payment, offsite backup) require ongoing security monitoring. | Partial | Offsite backup verification in `deploy/backups/lib/minio-client.sh`; **Planned:** Quarterly vendor security review cycle |
| **5.12** | **Management of information security incidents** | Yes | Incident response process required for LOPDP/GDPR breach notification (72h SLA). | Partial | Sentry alerts configured; Grafana alerting rules; `deploy/alerting/ESCALATION.md`; **Planned:** Formal incident response playbook and 72h notification automation |
| **5.13** | **Learning from information security incidents** | Yes | Post-incident analysis required for continuous improvement. | Partial | Post-mortem process informal; **Planned:** Formal incident post-mortem template and knowledge base |
| **5.14** | **Availability of information processing facilities** | Yes | SaaS platform must maintain high availability; DR and backups are in place. | Implemented | `docs/02-architecture/BACKUP_ARCHITECTURE.md`; `docs/04-runbooks/DISASTER_RECOVERY_PLAYBOOK.md`; daily backups + weekly rescue; offsite MinIO replication |
| **5.15** | **Information security in business continuity** | Yes | Business continuity must explicitly address information security. | Partial | DR playbook exists; factory reset procedure documented; **Planned:** Formal BCP with RTO/RPO targets |
| **5.16** | **Information security aspects of business continuity management** | Yes | BC plans must be tested and maintained, including information security validation. | Partial | Backup verification scripts (`deploy/backups/*/verify.sh`); **Planned:** Quarterly BC/DR tabletop exercise |
| **5.17** | **Redundancy of information processing facilities** | Yes | Critical components (PostgreSQL, Redis, Vault) require redundancy consideration. | Partial | PgBouncer for connection pooling; single-instance Docker Compose in production; **Planned:** Database replication and failover |
| **5.18** | **Compliance with legal and contractual requirements** | Yes | Loyallia must comply with LOPDP (Ecuador), GDPR (EU), and PCI-DSS obligations for payment data. | Partial | `docs/05-compliance/COMPLIANCE_CHECKLIST.md` covers LOPDP/GDPR; privacy policy and terms documented; **Planned:** Formal legal compliance register |
| **5.19** | **Intellectual property rights** | Yes | Software code, branding, and PKPass certificates are intellectual property requiring protection. | Implemented | Proprietary codebase (private repo); Apple/Google Wallet certificates stored in Vault; copyright notices in source |
| **5.20** | **Protection of records** | Yes | Audit logs, financial records, and customer data require protection per LOPDP 7-year retention. | Implemented | `backend/apps/audit/models.py` — immutable audit trail; `save()`/`delete()` overridden to prevent modification; 7-year retention stated |
| **5.21** | **Privacy and protection of PII** | Yes | Core business requirement — Loyallia processes customer PII under LOPDP and GDPR. | Partial | Privacy policy documented; consent mechanisms in UI; data subject rights endpoints exist; **Planned:** DPIA template and ROPA document |
| **5.22** | **Independent review of information security** | Yes | Periodic independent review required for ISO 27001 and to validate control effectiveness. | Planned | **Planned:** Annual external penetration test; quarterly internal security audit schedule |
| **5.23** | **Compliance with security policies and standards** | Yes | Regular compliance reviews required to ensure policies remain effective. | Partial | `docs/05-compliance/COMPLIANCE_CHECKLIST.md` provides review framework; **Planned:** Quarterly compliance review cycle |
| **5.24** | **Management of information security-related audits** | Yes | Audit activities must be planned and managed to minimize disruption and ensure independence. | Planned | **Planned:** Annual internal audit program; audit plan and evidence retention procedures |
| **5.25** | **Non-disclosure agreements** | Yes | Employees and contractors with access to sensitive data must sign NDAs. | Partial | Informal employment agreements; **Planned:** Formal NDA template for all personnel and contractors |
| **5.26** | **Establishment of information security policies** | Yes | Formal ISMS policies must be established, approved, and communicated. | Partial | Privacy policy and terms exist; **Planned:** Master Information Security Policy document |
| **5.27** | **Review of information security policies** | Yes | Policies require scheduled review to remain relevant and effective. | Planned | **Planned:** Annual policy review cycle with management sign-off |
| **5.28** | **Classification of information** | Yes | Data classification required for PII, payment data, secrets, and tenant business data. | Planned | **Planned:** Data classification scheme (Public, Internal, Confidential, Restricted) with labeling requirements |
| **5.29** | **Labelling of information** | Yes | Classification requires visible labeling to ensure proper handling. | Planned | **Planned:** Asset inventory with classification labels; repository labeling standards |
| **5.30** | **Handling of assets** | Yes | Assets (data, software, hardware, services) must be handled according to classification. | Partial | Vault for secret handling; MinIO for file storage; **Planned:** Formal asset handling procedures per classification level |
| **5.31** | **Return of assets** | Yes | Upon termination or role change, personnel must return organizational assets. | Planned | **Planned:** Offboarding checklist with asset return verification |
| **5.32** | **Disposal of media** | Yes | Secure disposal required for media containing sensitive data (backups, decommissioned disks). | Partial | `age`-encrypted backups with `0600` permissions; **Planned:** Media sanitization procedure for decommissioned storage |
| **5.33** | **Information transfer** | Yes | Secure transfer policies required for data sharing between tenants, customers, and third parties. | Implemented | TLS 1.2/1.3 enforced; HTTPS-only in production; `CsvExport` endpoints with OWNER-only access; HMAC-signed webhooks |
| **5.34** | **Access control policy** | Yes | Formal access control policy required to govern user and system access. | Implemented | `backend/common/permissions.py`; RBAC with OWNER/MANAGER/STAFF/SUPER_ADMIN; tenant isolation middleware; JWT authentication |
| **5.35** | **Identity management** | Yes | Identity lifecycle management required for all user types (staff, customers, admins). | Implemented | `apps/authentication/models.py` (User); JWT token lifecycle; refresh token rotation; account lockout; OTP verification |
| **5.36** | **Authentication information** | Yes | Password and credential management required for all account types. | Implemented | Argon2 password hashing; password strength validation (min 8 chars, common password check); JWT secrets from Vault |
| **5.37** | **Revocation of access rights** | Yes | Timely revocation required upon termination, role change, or compromise. | Implemented | `is_active=False` prevents authentication; refresh tokens revoked on password reset/logout/deactivation; RBAC enforced on every request |

### A.6 People Controls

| Control | Title | Applicable | Justification | Status | Evidence / Reference |
|---------|-------|:----------:|---------------|:------:|----------------------|
| **6.1** | **Screening** | Yes | Background checks required for personnel with access to production systems and customer data. | Partial | Hiring process includes reference checks; **Planned:** Formal background check policy for privileged roles |
| **6.2** | **Terms and conditions of employment** | Yes | Security responsibilities must be defined in employment contracts. | Partial | Standard employment contracts; **Planned:** Explicit information security clauses in all contracts |
| **6.3** | **Information security awareness, education and training** | Yes | All personnel require security awareness training, especially regarding phishing and data handling. | Planned | **Planned:** Annual security awareness training program; phishing simulation exercises |
| **6.4** | **Disciplinary process** | Yes | Formal process required for personnel who violate security policies. | Planned | **Planned:** Disciplinary policy with defined sanctions for security violations |
| **6.5** | **Responsibilities after termination or change of employment** | Yes | Security responsibilities must persist after employment ends (confidentiality, return of assets). | Planned | **Planned:** Exit interview checklist; post-employment NDA enforcement; access revocation SOP |
| **6.6** | **Confidentiality or non-disclosure agreements** | Yes | NDAs required for personnel, contractors, and third parties with access to sensitive information. | Partial | Informal agreements; **Planned:** Standardized NDA for all roles with data access |
| **6.7** | **Remote working** | Yes | Engineering team works remotely; secure remote access policies required. | Partial | VPN/SSH access to production; Vault token file-based auth; **Planned:** Remote work security policy with endpoint requirements |
| **6.8** | **Information security event reporting** | Yes | Personnel must be able to report security events and weaknesses promptly. | Partial | Sentry for technical events; informal Slack/email reporting; **Planned:** Formal security incident reporting channel and whistleblower protection |

### A.7 Physical Controls

| Control | Title | Applicable | Justification | Status | Evidence / Reference |
|---------|-------|:----------:|---------------|:------:|----------------------|
| **7.1** | **Physical security perimeters** | No | Loyallia operates as a cloud-hosted SaaS with no owned physical data centers. Physical security is the responsibility of the hosting/cloud provider. | N/A | Exclusion justified: no physical premises under Loyallia control; infrastructure is Docker Compose on third-party servers |
| **7.2** | **Physical entry controls** | No | No physical premises under Loyallia control. Entry controls managed by data center provider. | N/A | Exclusion justified: shared responsibility model; physical access managed by infrastructure provider |
| **7.3** | **Securing offices, rooms and facilities** | No | No company-owned offices or server rooms. | N/A | Exclusion justified: fully remote/cloud operation |
| **7.4** | **Physical security monitoring** | No | No physical premises to monitor. | N/A | Exclusion justified: cloud-hosted; provider handles physical monitoring |
| **7.5** | **Protection against physical and environmental threats** | No | Environmental controls (fire, flood, power) are the cloud provider's responsibility. | N/A | Exclusion justified: shared responsibility; offsite backup provides additional resilience |
| **7.6** | **Working in secure areas** | No | No secure areas under Loyallia control. | N/A | Exclusion justified: remote work model |
| **7.7** | **Clear desk and clear screen** | Yes | Remote workers and co-working users must protect information visible on screens and desks. | Planned | **Planned:** Remote work policy including clear screen requirements; screen lock timeout (15 min) on all company devices |
| **7.8** | **Equipment siting and protection** | No | No on-premise equipment under direct physical control. | N/A | Exclusion justified: all equipment cloud-hosted or personal devices |
| **7.9** | **Security of assets off-premises** | Yes | Laptops and mobile devices used by remote team contain access credentials and code. | Partial | Development environments use Vault; 2FA on critical services; **Planned:** MDM policy for company devices; disk encryption requirement |
| **7.10** | **Storage media** | Yes | Backup media, rescue packages, and encrypted files must be physically protected. | Implemented | `age`-encrypted backups; `0600` permissions; offsite MinIO replication; rescue packages encrypted and stored securely |
| **7.11** | **Supporting utilities** | No | Power, HVAC, and utilities managed by cloud/hosting provider. | N/A | Exclusion justified: no on-premise infrastructure |
| **7.12** | **Cabling security** | No | Network cabling managed by hosting provider. | N/A | Exclusion justified: cloud infrastructure |
| **7.13** | **Equipment maintenance** | No | Server hardware maintenance is provider responsibility. | N/A | Exclusion justified: no owned server hardware |
| **7.14** | **Secure disposal or re-use of equipment** | Yes | Laptops, phones, and storage media containing company data require secure disposal. | Planned | **Planned:** Asset disposal procedure with data wiping verification (NIST 800-88) |

### A.8 Technological Controls

| Control | Title | Applicable | Justification | Status | Evidence / Reference |
|---------|-------|:----------:|---------------|:------:|----------------------|
| **8.1** | **User endpoint devices** | Yes | Staff and admin devices accessing production require protection. | Partial | 2FA on critical accounts; SSH key auth; **Planned:** Endpoint security baseline (disk encryption, AV, screen lock) |
| **8.2** | **Privileged access rights** | Yes | SUPER_ADMIN and production access are highly privileged and require strict controls. | Implemented | `is_super_admin()` in `backend/common/permissions.py`; Vault policies restrict secret access; impersonation logged in audit trail |
| **8.3** | **Information access restriction** | Yes | Multi-tenant SaaS requires strict information access controls between tenants. | Implemented | `TenantMiddleware` + `.filter(tenant=request.tenant)` on every query; `require_role` decorators; JWT tenant binding prevents spoofing |
| **8.4** | **Access to source code** | Yes | Source code is a critical asset requiring access control. | Implemented | Private Git repository; SSH key auth; branch protection on main branch; code review required for merges |
| **8.5** | **Secure authentication** | Yes | All user and system authentication must be secure. | Implemented | Argon2 passwords; JWT with HS256 + rotation; Google OAuth with audience validation; OTP (email/SMS); account lockout after failures |
| **8.6** | **Capacity management** | Yes | Resource capacity must be monitored to ensure availability. | Partial | Plan rate limits enforce capacity bounds (`max_customers`, `max_locations`, etc.); Grafana monitoring; **Planned:** Automated capacity alerts |
| **8.7** | **Protection against malware** | Yes | Malware protection required for all systems processing customer data. | Partial | Docker image scanning informal; **Planned:** Container image vulnerability scanning (Trivy/Clair); endpoint AV policy |
| **8.8** | **Management of technical vulnerabilities** | Yes | Vulnerability management required for dependencies and infrastructure. | Partial | `pip-audit` and `npm audit` not yet in CI; dependency updates manual; **Planned:** Automated dependency scanning in CI/CD; vulnerability management SLA |
| **8.9** | **Configuration management** | Yes | Secure baseline configurations required for all infrastructure components. | Implemented | Docker Compose stacks version-controlled; Nginx security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options); `DEBUG=False` in production |
| **8.10** | **Deletion of data** | Yes | Secure deletion required for customer data, backups, and tenant data upon request. | Partial | `DELETE /customers/{id}/` performs permanent delete; factory reset destroys tenant data; **Planned:** Cryptographic erasure for backups; data retention automation |
| **8.11** | **Data masking** | Yes | PII must be masked in non-production environments and logs. | Partial | `JsonFormatter` excludes raw PII from logs; **Planned:** Email masking in logs (`u***@domain.com`); anonymized test data generation |
| **8.12** | **Data leakage prevention** | Yes | DLP measures required to prevent unauthorized exfiltration of customer data. | Partial | Tenant isolation prevents cross-tenant leakage; rate limiting prevents bulk extraction; **Planned:** DLP monitoring for export anomalies |
| **8.13** | **Information backup** | Yes | Regular backups required to protect against data loss. | Implemented | Daily automated backups (PostgreSQL, Redis, Vault, MinIO); weekly rescue packages; `age` encryption; offsite MinIO replication; `3-2-1` rule compliance (`docs/02-architecture/BACKUP_ARCHITECTURE.md`) |
| **8.14** | **Redundancy of information processing facilities** | Yes | Redundancy required for critical processing facilities. | Partial | PgBouncer connection pooling; Redis caching; single-node PostgreSQL; **Planned:** Database read replicas; Redis Sentinel |
| **8.15** | **Logging** | Yes | Comprehensive logging required for security monitoring and incident investigation. | Implemented | Structured JSON logging (`JsonFormatter`); Sentry integration; request ID tracing; immutable audit trail (`backend/apps/audit/models.py`) |
| **8.16** | **Monitoring activities** | Yes | Security-relevant events must be monitored in real-time. | Implemented | Grafana + Loki for log aggregation; Grafana alerting rules (`deploy/grafana/provisioning/alerting/rules.yml`); Sentry for exception tracking; rate limit violation logging |
| **8.17** | **Clock synchronization** | Yes | Accurate timestamps required for audit trails, logs, and forensics. | Implemented | NTP synchronization on host servers; Docker containers inherit host time; all `created_at` fields use `auto_now_add` |
| **8.18** | **Use of privileged utility programs** | Yes | Privileged utilities (database admin, Vault CLI, backup tools) require strict control. | Partial | Backup scripts require confirmation (`RESTORE` typed); Vault CLI requires token file; **Planned:** Privileged command logging and approval workflow |
| **8.19** | **Installation of software on operational systems** | Yes | Unauthorized software installation could compromise security. | Implemented | Docker-based deployment — no direct software installation on production hosts; images built from version-controlled Dockerfiles |
| **8.20** | **Networks security** | Yes | Network segmentation and security required for multi-service architecture. | Implemented | Docker internal network (`loyallia-net`); Nginx reverse proxy; TLS 1.2/1.3 termination; port mapping restricted to necessary services |
| **8.21** | **Security of network services** | Yes | Services exposed on the network must be securely configured. | Implemented | Nginx security headers; rate limiting per endpoint category; health check endpoint exempted; payment webhook HMAC verification |
| **8.22** | **Segregation in networks** | Yes | Network segmentation required between application tiers and tenants. | Implemented | Docker Compose internal network; Nginx as single entry point; database not exposed externally (port 33900 internal only); MinIO console on separate port |
| **8.23** | **Web filtering** | No | Loyallia is a B2B SaaS platform; employee web browsing filtering is not within the scope of the ISMS at this time. | N/A | Exclusion justified: scope focuses on platform security, not corporate IT endpoint browsing controls |
| **8.24** | **Use of cryptography** | Yes | Cryptographic controls required for data protection, authentication, and integrity. | Implemented | Argon2 for passwords; JWT HMAC-SHA256; HMAC-signed QR codes and webhooks; `age` for backup encryption; TLS 1.2/1.3; Vault for secret storage |
| **8.25** | **Secure development life cycle** | Yes | Secure SDLC required for SaaS product development. | Partial | Code review via PR; OWASP coverage validated; Pydantic input validation; **Planned:** Formal secure coding guidelines; SAST/DAST in CI |
| **8.26** | **Application security requirements** | Yes | Security requirements must be defined for all applications. | Partial | Security requirements in SRS (`docs/06-planning/SRS_Loyallia_HARDENING_v1.0.md`); input validation schemas; **Planned:** Security requirements checklist for new features |
| **8.27** | **Secure system architecture and engineering principles** | Yes | Security-by-design principles must be applied. | Implemented | Defense in depth: tenant isolation, RBAC, immutable audit, Vault secrets, TLS everywhere, rate limiting, input validation |
| **8.28** | **Secure coding** | Yes | Secure coding practices required to prevent common vulnerabilities. | Implemented | Django ORM (parameterized queries); Pydantic validation; CSV injection sanitization; no raw SQL; HSTS/CSP headers |
| **8.29** | **Security testing in development and acceptance** | Yes | Security testing required before production deployment. | Partial | OWASP checklist validation; manual security review; **Planned:** Automated security testing in CI (SAST, dependency scan, container scan) |
| **8.30** | **Outsourced development** | No | All development is performed in-house. No outsourced development at this time. | N/A | Exclusion justified: no third-party development contractors |
| **8.31** | **Separation of development, test and production environments** | Yes | Strict separation required to prevent production contamination. | Implemented | Separate Docker Compose stacks (dev vs. prod); separate `.env` files; separate backup paths; separate Vault paths; `DEBUG=False` enforced in production |
| **8.32** | **Change management** | Yes | Controlled change management required for production changes. | Partial | Git-based version control; PR review required; deployment guide exists; **Planned:** Formal change advisory board and RFC process |
| **8.33** | **Test information** | Yes | Test data must be protected and not use production PII. | Partial | Development seed data generates synthetic customers; **Planned:** Automated data anonymization pipeline for production clones |
| **8.34** | **Protection of information systems during audit testing** | Yes | Audit activities must not compromise operational systems. | Planned | **Planned:** Read-only audit accounts; audit activity logging; pre-approved audit windows |

---

## 4. Summary Statistics

| Domain | Total Controls | Applicable | Not Applicable | Implemented | Partial | Planned |
|--------|:--------------:|:----------:|:--------------:|:-----------:|:-------:|:-------:|
| A.5 Organizational | 37 | 32 | 5 | 11 | 16 | 5 |
| A.6 People | 8 | 8 | 0 | 0 | 3 | 5 |
| A.7 Physical | 14 | 3 | 11 | 1 | 1 | 1 |
| A.8 Technological | 34 | 33 | 1 | 20 | 10 | 3 |
| **TOTAL** | **93** | **76** | **17** | **32** | **30** | **14** |

### Implementation Trend

```
Implemented:  ████████████████████████████████████████  32 / 93 (34%)
Partial:     ██████████████████████████████████████    30 / 93 (32%)
Planned:     ██████████████████                        14 / 93 (15%)
N/A:         ███████████████████████                   17 / 93 (18%)
```

---

## 5. Excluded Controls — Detailed Justification

| Control | Title | Justification for Exclusion |
|---------|-------|---------------------------|
| 5.5 | Contact with special interest groups | Loyallia is a small SaaS provider with a focused product scope. No formal special interest group participation is required for operational security. May be revisited as the organization scales. |
| 7.1 | Physical security perimeters | No physical premises or data centers under Loyallia control. All infrastructure is cloud-hosted via third-party providers. Physical security is covered under supplier agreements (5.8–5.11). |
| 7.2 | Physical entry controls | No company-owned facilities. Entry controls are the responsibility of the co-working/hosting provider. |
| 7.3 | Securing offices, rooms and facilities | Fully remote/cloud operation. No offices or server rooms owned by Loyallia. |
| 7.4 | Physical security monitoring | No physical premises to monitor. Cloud provider handles physical security monitoring. |
| 7.5 | Protection against physical and environmental threats | Environmental controls managed by cloud/hosting provider. Offsite backups provide additional resilience. |
| 7.6 | Working in secure areas | No secure areas under Loyallia control. All work is remote. |
| 7.8 | Equipment siting and protection | No on-premise equipment. All servers are cloud-hosted. |
| 7.11 | Supporting utilities | Power, HVAC, and utilities managed by hosting provider. |
| 7.12 | Cabling security | Network cabling managed by hosting provider. |
| 7.13 | Equipment maintenance | Server hardware maintenance is provider responsibility. |
| 8.23 | Web filtering | Scope of ISMS is platform security, not corporate IT endpoint management. Employee browsing controls are outside current scope. |
| 8.30 | Outsourced development | All development is performed in-house. No third-party development contractors are engaged. |

---

## 6. Risk Treatment Plan for Partial / Planned Controls

### P0 — Immediate (Before Certification Audit)

| Control | Gap | Treatment | Owner | Target Date |
|---------|-----|-----------|-------|-------------|
| 5.12 | No formal incident response playbook | Create incident response playbook with 72h breach notification SLA | CISO | 2026-07-15 |
| 5.18 | No formal legal compliance register | Create compliance register mapping LOPDP/GDPR/PCI-DSS requirements | Compliance Lead | 2026-07-15 |
| 8.10 | No automated data retention enforcement | Implement Celery tasks for customer data retention and archival | Engineering | 2026-07-30 |
| 8.28 | No automated vulnerability scanning in CI | Add `pip-audit`, `npm audit`, Trivy container scan to CI/CD | DevOps | 2026-07-15 |

### P1 — Pre-Certification (30–60 days)

| Control | Gap | Treatment | Owner | Target Date |
|---------|-----|-----------|-------|-------------|
| 5.3 | No formal SoD matrix | Document segregation of duties matrix for all critical roles | CISO | 2026-08-15 |
| 5.8 | No formal vendor risk assessment | Create vendor risk assessment template; assess top 5 critical vendors | Compliance Lead | 2026-08-15 |
| 5.21 | No DPIA or ROPA | Create Data Protection Impact Assessment template and Record of Processing Activities | DPO | 2026-08-30 |
| 6.3 | No security awareness training | Deploy annual security awareness training for all personnel | HR / CISO | 2026-08-30 |
| 8.1 | No endpoint security baseline | Define and enforce endpoint security requirements (encryption, AV, screen lock) | CISO | 2026-08-15 |
| 8.25 | No formal secure SDLC policy | Document secure development lifecycle with SAST/DAST integration | Engineering Lead | 2026-08-30 |

### P2 — Post-Certification (90 days)

| Control | Gap | Treatment | Owner | Target Date |
|---------|-----|-----------|-------|-------------|
| 5.7 | No dedicated threat intelligence | Subscribe to threat intelligence feed; integrate IOC monitoring | Security Ops | 2026-09-30 |
| 5.22 | No independent security review | Schedule annual external penetration test and quarterly internal audits | CISO | 2026-09-30 |
| 7.9 | No MDM policy | Implement mobile device management for company devices | IT / CISO | 2026-09-30 |
| 8.11 | PII not fully masked in logs | Implement email masking in application logs; anonymize test data | Engineering | 2026-09-15 |
| 8.14 | No database redundancy | Implement PostgreSQL read replicas and Redis Sentinel | DevOps | 2026-10-15 |
| 8.33 | No automated test data anonymization | Build pipeline to anonymize production data for test environments | Engineering | 2026-09-30 |

---

## 7. Review and Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Chief Information Security Officer | [Name] | _________________ | _______ |
| Chief Executive Officer | [Name] | _________________ | _______ |
| Compliance Lead / DPO | [Name] | _________________ | _______ |

---

## 8. Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-06-03 | Compliance Team | Initial creation of Statement of Applicability |

**Next Review Date:** 2026-12-03  
**Review Frequency:** Every 6 months, or upon significant organizational/technical change

---

*End of Statement of Applicability*
