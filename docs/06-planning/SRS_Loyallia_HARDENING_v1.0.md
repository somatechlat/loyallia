# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
## Loyallia — Production Hardening & Correction Requirements
**Document ID:** LOYALLIA-SRS-HARDENING-001  
**Version:** 1.0.0  
**Status:** PENDING APPROVAL  
**Date:** 2026-04-29  
**Standard:** ISO/IEC 29148:2018 — Requirements Engineering  
**Parent Document:** LOYALLIA-SRS-001 v1.0.0  
**Classification:** Production Readiness — Corrective & Preventive Requirements  

---

## DOCUMENT CONTROL

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-04-29 | Engineering Audit | Initial hardening SRS from full codebase review |

---

## TABLE OF CONTENTS

1. Introduction  
2. Purpose & Scope  
3. Definitions, Acronyms & Abbreviations  
4. References  
5. Requirement Classification & Priority Scheme  
6. Module A — Critical Security Corrections  
7. Module B — Runtime Defect Corrections  
8. Module C — Security Hardening  
9. Module D — Performance & Scalability Corrections  
10. Module E — Code Quality & Architecture Improvements  
11. Module F — Frontend Corrections  
12. Module G — Testing Requirements  
13. Module H — DevOps & Infrastructure Requirements  
14. Module I — Compliance & Data Governance  
15. Non-Functional Requirements  
16. Verification & Acceptance Criteria  
17. Traceability Matrix  
18. Appendices  

---

## 1. INTRODUCTION

This SRS defines all corrective, preventive, and hardening requirements necessary to bring the Loyallia platform from its current MVP-stage codebase to production-grade readiness. Each requirement is derived from a line-by-line audit of approximately 150 source files conducted on 2026-04-29.

Requirements in this document supplement (do not replace) the parent SRS (LOYALLIA-SRS-001). Where a requirement in this document conflicts with the parent SRS, this document takes precedence for production readiness.

---

## 2. PURPOSE & SCOPE

### 2.1 Purpose
This document serves as the authoritative specification for all defects, security gaps, and architectural improvements identified during the production readiness audit. It provides verifiable, testable requirements that engineering, QA, and DevOps teams SHALL implement before any production deployment with real customer data.

### 2.2 Scope
This SRS covers:
- Critical security vulnerabilities requiring immediate remediation
- Runtime defects (bugs) that will cause system failures in production
- Security hardening measures for production deployment
- Performance and scalability corrections
- Code quality and architectural improvements
- Frontend corrections and hardening
- Testing infrastructure requirements
- DevOps and deployment pipeline requirements
- Compliance and data governance requirements

### 2.3 Out of Scope
- New feature development (covered in parent SRS)
- UI/UX redesign
- Mobile scanner app (React Native) — separate review

---

## 3. DEFINITIONS, ACRONYMS & ABBREVIATIONS

| Term | Definition |
|------|-----------|
| SHALL | Mandatory requirement (MUST) — non-negotiable for production |
| SHOULD | Strongly recommended — deviation requires documented justification |
| MAY | Optional — implement if resources permit |
| SSRF | Server-Side Request Forgery |
| N+1 | Query anti-pattern causing excessive database round-trips |
| OTP | One-Time Password |
| PII | Personally Identifiable Information |
| LOPDP | Ley Orgánica de Protección de Datos Personales (Ecuador) |
| HMAC | Hash-based Message Authentication Code |
| JWT | JSON Web Token |
| RBAC | Role-Based Access Control |
| WAF | Web Application Firewall |

---

## 4. REFERENCES

| Reference | Standard / URL |
|-----------|----------------|
| ISO/IEC 29148:2018 | Requirements Engineering |
| ISO/IEC 25010:2011 | Software Quality Model |
| OWASP Top 10 2021 | https://owasp.org/Top10/ |
| CWE/SANS Top 25 | https://cwe.mitre.org/top25/ |
| RFC 7519 | JSON Web Token |
| LOPDP Ecuador 2021 | National personal data protection law |
| PCI-DSS v4.0 | Payment Card Industry Data Security Standard |
| NIST SP 800-63B | Digital Identity Guidelines (Authentication) |
| Parent SRS | LOYALLIA-SRS-001 v1.0.0 |

---

## 5. REQUIREMENT CLASSIFICATION & PRIORITY SCHEME

### 5.1 Priority Levels

| Priority | Label | Definition | SLA |
|----------|-------|------------|-----|
| P0 | CRITICAL | System is insecure or will crash. Blocks production deployment. | Fix within 48 hours |
| P1 | HIGH | Significant risk or defect. Must fix before any production traffic. | Fix within 1 week |
| P2 | MEDIUM | Important for stability, performance, or compliance. | Fix within 2 weeks |
| P3 | LOW | Improves quality, maintainability, or developer experience. | Fix within 1 month |

### 5.2 Requirement ID Convention

```
LYL-{TYPE}-{MODULE}-{NNN}

TYPE:  FIX = Corrective (defect/bug)
       SEC = Security
       PERF = Performance
       ARCH = Architecture
       FE = Frontend
       TEST = Testing
       DEVOPS = DevOps
       COMP = Compliance

MODULE: AUTH, BILL, CUST, NOTIF, ANAL, CARD, TXN, AUTO, TENANT, SUPER, WALLET, API, INFRA

NNN: Sequential number (001-999)
```

---

## 6. MODULE A — CRITICAL SECURITY CORRECTIONS

### 6.1 Exposed Credentials & Secrets

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-SEC-AUTH-001 | The file `backend/auth.json` SHALL be removed from the Git repository and its entire history SHALL be purged using `git filter-branch` or `git filter-repo`. The `.gitignore` SHALL be updated to include `backend/auth.json`. | P0 | C1 |
| LYL-SEC-AUTH-002 | All JWT tokens contained in the removed `backend/auth.json` file SHALL be immediately revoked by deleting the corresponding `RefreshToken` database records. The `SECRET_KEY` used to sign these tokens SHALL be rotated. | P0 | C1 |
| LYL-SEC-API-003 | The hardcoded API key `C5ZfFYI-QOxHsMuJ` in `frontend/src/app/api/chat/route.ts` SHALL be replaced with an environment variable (`AI_AGENT_API_KEY`). The exposed key SHALL be rotated immediately. | P0 | C2 |
| LYL-SEC-INFRA-004 | HashiCorp Vault SHALL be configured in production mode with auto-unseal (AWS KMS, GCP KMS, or equivalent). Dev mode with static root token (`loyallia-vault-root-token`) SHALL NOT be used in any environment accessible from the internet. | P0 | C3 |
| LYL-SEC-INFRA-005 | The `.env.example` file SHALL NOT contain functional default values for secrets. All secret placeholders SHALL use clearly non-functional values such as `CHANGE_ME_BEFORE_DEPLOYMENT` or empty strings. | P0 | C3 |
| LYL-SEC-AUTH-006 | The files `frontend/test-api.js`, `frontend/test-campaign.js`, and `backend/seed_sweet_coffee.py` SHALL NOT contain hardcoded credentials. Test credentials SHALL be loaded from environment variables or test fixture files that are excluded from version control. | P0 | C4 |

### 6.2 Transport Security

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-SEC-INFRA-007 | Nginx SHALL terminate TLS 1.2+ with a valid certificate (Let's Encrypt or equivalent). HTTP port 80 SHALL redirect to HTTPS port 443 with a 301 permanent redirect. | P0 | H1 |
| LYL-SEC-INFRA-008 | The Nginx configuration SHALL include `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` header. | P0 | H1 |
| LYL-SEC-INFRA-009 | The `docker-compose.yml` SHALL default `DEBUG` to `False` and `ALLOWED_HOSTS` to the production domain (not `*`). A separate `docker-compose.dev.yml` SHALL override these for local development. | P1 | H3, H4 |

---

## 7. MODULE B — RUNTIME DEFECT CORRECTIONS

### 7.1 Crash-Level Defects

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-FIX-ANAL-001 | The function `get_segmentation_analytics()` in `backend/apps/analytics/api.py` SHALL define the variable `customers` (e.g., `customers = Customer.objects.filter(tenant=tenant)`) before referencing `customers.count()`. The current code references an undefined variable and will raise `NameError` on every invocation. | P0 | D1 |
| LYL-FIX-NOTIF-002 | The `register_device`, `list_devices`, `mark_notification_read`, `mark_notification_clicked`, and `delete_notification` endpoints in `backend/apps/notifications/api.py` SHALL verify that `request.user` has an associated `Customer` object before accessing `request.user.customer`. For business users (OWNER, MANAGER, STAFF) without a customer profile, the endpoint SHALL return HTTP 403 with an appropriate error message. | P0 | D2 |
| LYL-FIX-AUTO-003 | The `_execute_send_notification()` method in `backend/apps/automation/models.py` SHALL create a `Notification` model instance first, then pass it to `NotificationService.send_notification(notification)`. The current implementation passes keyword arguments to a method that expects a model instance, causing a `TypeError` at runtime. | P0 | D4 |
| LYL-FIX-SUPER-004 | The `impersonate_tenant()` function in `backend/apps/tenants/super_admin_api/tenants.py` SHALL NOT mutate the global `settings.JWT_ACCESS_TOKEN_LIFETIME_MINUTES`. Instead, the access token lifetime SHALL be passed as a parameter to `create_access_token()` or computed locally. The current implementation creates a race condition under concurrent requests. | P1 | D5 |

### 7.2 Data Integrity Defects

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-FIX-TXN-005 | The `_process_discount_transaction()` method in `backend/apps/customers/models.py` SHALL read and write `total_spent_at_business` inside the atomic `select_for_update` block provided by `update_pass_data()`. The current implementation performs a separate read-then-write outside the lock, creating a race condition where concurrent scans can lose transaction amounts. | P1 | D3 |
| LYL-FIX-TXN-006 | The `_process_stamp_transaction()` method SHALL similarly ensure that stamp count reads and writes occur within a single `select_for_update` transaction to prevent lost stamp increments under concurrent scanning. | P2 | D3 |

---

## 8. MODULE C — SECURITY HARDENING

### 8.1 Server-Side Request Forgery (SSRF) Prevention

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-SEC-WALLET-007 | The `fetch_image_bytes()` function in `backend/apps/customers/pass_engine/apple_pass.py` SHALL validate image URLs before fetching. Validation SHALL include: (a) scheme MUST be `https://`, (b) hostname MUST NOT resolve to a private IP range (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16, 127.0.0.0/8, ::1), (c) hostname MUST NOT be `localhost`, (d) response body MUST NOT exceed 5 MB. | P1 | D5 |
| LYL-SEC-WALLET-008 | The same URL validation rules from LYL-SEC-WALLET-007 SHALL apply to all user-provided URLs across the system, including `logo_url`, `icon_url`, `strip_image_url` on `Card` model, `image_url` on `Notification`, and any URL field accepted from tenant users. | P1 | D5 |

### 8.2 Authentication & Token Security

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-SEC-AUTH-009 | The `JWT_SECRET_KEY` SHALL be a separate environment variable from Django's `SECRET_KEY`. The two keys SHALL be stored as separate entries in Vault. | P2 | M1 |
| LYL-SEC-AUTH-010 | Refresh tokens SHALL implement rotation: upon successful use of a refresh token, the system SHALL issue a new refresh token and revoke the old one. A reuse detection mechanism SHALL revoke the entire token family if a previously-used refresh token is presented. | P2 | M2 |
| LYL-SEC-AUTH-011 | OTPs stored in Redis SHALL be hashed (SHA-256 minimum) before storage. The `store_otp()` function in `backend/apps/authentication/helpers.py` SHALL hash the OTP, and `verify_otp()` SHALL compare hashes. | P2 | M3 |
| LYL-SEC-AUTH-012 | OTP verification SHALL use constant-time comparison (`hmac.compare_digest()`) to prevent timing side-channel attacks. | P3 | D12 |

### 8.3 Rate Limiting

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-SEC-API-013 | The `/api/v1/auth/password-reset/request/` and `/api/v1/auth/forgot-password/` endpoints SHALL have a specific rate limit of 3 requests per hour per IP address, in addition to the general auth rate limit. | P2 | M8 |
| LYL-SEC-API-014 | The public enrollment endpoint (`/api/v1/customers/enroll/`) SHALL have a rate limit of 10 enrollments per hour per IP address to prevent spam enrollment and email enumeration. | P2 | D6 |
| LYL-SEC-API-015 | The CSV export endpoints (`/api/v1/customers/export/` and `/api/v1/customers/segments/{id}/export/`) SHALL have a rate limit of 1 export per 5 minutes per tenant. | P2 | D8 |

### 8.4 Input Validation

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-SEC-API-016 | The `metadata` JSONField on `Card` creation and update SHALL be validated for maximum size (10 KB), maximum nesting depth (5 levels), and allowed key names per card type. | P2 | D4 |
| LYL-SEC-API-017 | The `CustomerCreateIn` Pydantic schema with `extra: "allow"` SHALL validate that extra field names are alphanumeric (max 50 chars) and extra field values do not exceed 500 characters each. Total request body size SHALL NOT exceed 50 KB. | P2 | D9 |
| LYL-SEC-API-018 | CSV export data SHALL sanitize cell values to prevent CSV injection. Values starting with `=`, `+`, `-`, `@`, `\t`, or `\r` SHALL be prefixed with a single quote (`'`) or wrapped in quotes. | P2 | D8 |

### 8.5 Temporary Credential Exposure

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-SEC-TENANT-019 | The `add_team_member` endpoint SHALL NOT return the temporary password in the JSON API response. The temporary password SHALL only be delivered via the welcome email. The API response SHALL return `{"success": true, "user_id": "...", "message": "..."}` without the password field. | P1 | D7 |

---

## 9. MODULE D — PERFORMANCE & SCALABILITY CORRECTIONS

### 9.1 N+1 Query Elimination

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-PERF-AGENT-001 | The `get_programs()` endpoint in `backend/apps/agent_api/api.py` SHALL use `prefetch_related("enrollments", "passes")` and compute enrollment/pass counts from the prefetched data instead of executing separate COUNT queries per card in a loop. | P2 | D11 |
| LYL-PERF-ANAL-002 | The `get_segmentation_analytics()` endpoint in `backend/apps/analytics/api.py` SHALL include `select_related("customer")` in the `CustomerAnalytics` queryset to prevent N+1 queries when accessing `a.customer.full_name`. | P2 | D11 |
| LYL-PERF-CARD-003 | The `CardOut.from_model()` method in `backend/apps/cards/api.py` SHALL accept a pre-computed `enrollments_count` parameter instead of calling `card.passes.count()` for each card. The listing endpoint SHALL annotate the queryset with `enrollments_count=Count("passes")`. | P2 | D11 |
| LYL-PERF-NOTIF-004 | The `list_campaigns()` endpoint in `backend/apps/notifications/api.py` SHALL use SQL GROUP BY aggregation instead of Python-side grouping by title+date. | P3 | D11 |

### 9.2 Query Optimization

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-PERF-API-005 | All list endpoints (transactions, campaigns, automations, notifications) SHALL implement cursor-based pagination with a default page size of 25 and a maximum of 100. Endpoints SHALL NOT return unbounded result sets. | P2 | — |
| LYL-PERF-SEG-006 | The VIP segment filter in `backend/apps/customers/segment_api.py` SHALL NOT load all customer spend values into a Python list. Instead, it SHALL use a SQL subquery or window function (e.g., `PERCENT_RANK()`) to compute the 90th percentile threshold. | P2 | — |

### 9.3 Async Processing

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-PERF-NOTIF-007 | The `send_email_campaign` Celery task SHALL batch emails in groups of 50 and introduce a 1-second delay between batches to avoid overwhelming the SMTP server. The task SHALL track per-batch success/failure counts. | P2 | — |
| LYL-PERF-INFRA-008 | Expired `RefreshToken` records SHALL be cleaned up by a daily Celery Beat task. Tokens where `expires_at < now()` SHALL be deleted. | P3 | D13 |

---

## 10. MODULE E — CODE QUALITY & ARCHITECTURE IMPROVEMENTS

### 10.1 Service Layer Extraction

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-ARCH-API-001 | Business logic SHALL be extracted from API view functions into dedicated service classes. At minimum, the following services SHALL be created: `TransactionService` (scan validation, transaction processing, reward logic), `NotificationService` (already exists but needs method signature fixes), `BillingService` (subscription lifecycle), `AutomationService` (trigger evaluation, action execution). | P2 | — |
| LYL-ARCH-API-002 | Service classes SHALL be injectable (accept dependencies via constructor or function parameters) to enable unit testing without monkey-patching. | P3 | — |

### 10.2 Error Handling Consistency

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-ARCH-API-003 | All API endpoints SHALL use a consistent error response format: `{"success": false, "error": "ERROR_CODE", "message": "Human-readable message", "detail": {...}}`. Endpoints SHALL NOT mix `HttpError` raises with returned error dicts. | P2 | — |
| LYL-ARCH-API-004 | Django Ninja global exception handlers SHALL catch unhandled exceptions and return a sanitized 500 response. Stack traces SHALL NOT be exposed in production responses. | P2 | — |

### 10.3 Logging Standards

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-ARCH-INFRA-005 | All logging calls SHALL use `%s` format style (not f-strings) for structured logging compatibility. Example: `logger.error("Failed for %s: %s", user_id, exc)` not `logger.error(f"Failed for {user_id}: {exc}")`. | P3 | — |
| LYL-ARCH-INFRA-006 | User email addresses in log messages SHALL be masked (e.g., `u***@d***.com`) to comply with LOPDP data minimization requirements. | P3 | D18 |

### 10.4 Constants & Configuration

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-ARCH-INFRA-007 | Magic numbers SHALL be replaced with named constants: `BULK_CREATE_BATCH_SIZE = 500`, `CELERY_CHUNK_SIZE = 50`, `UNLIMITED_PLAN_LIMIT = 999999`, `MAX_FILE_SIZE_MB = 5`. Constants SHALL be defined in a central `constants.py` per app or in Django settings. | P3 | — |

---

## 11. MODULE F — FRONTEND CORRECTIONS

### 11.1 Error Handling

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-FE-REACT-001 | The React application SHALL implement React Error Boundaries at the route level. Each route segment SHALL be wrapped in an `ErrorBoundary` component that displays a fallback UI and logs the error. | P2 | — |
| LYL-FE-REACT-002 | The dashboard layout SHALL use Next.js `router.replace()` for client-side navigation instead of `window.location.replace()`. The current implementation causes full page reloads and loses client-side state. | P3 | — |

### 11.2 Internationalization

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-FE-I18N-003 | The frontend SHALL use a proper i18n library (e.g., `next-intl` or `react-i18next`) for all user-facing strings. Hardcoded Spanish strings such as `'Sesión cerrada'`, `'Completa todos los campos'`, and `'Error de conexión con el servidor'` SHALL be replaced with i18n keys. | P3 | — |

### 11.3 API Interaction

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-FE-API-004 | The scanner page SHALL send transaction data (QR code, amount, notes) in the POST request body as JSON, not as URL query parameters. The current implementation exposes QR codes and amounts in URL access logs. | P2 | — |
| LYL-FE-API-005 | All mutation operations (create, update, delete) SHALL implement loading states to prevent double-submissions and provide user feedback. | P3 | — |

---

## 12. MODULE G — TESTING REQUIREMENTS

### 12.1 Unit Testing

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-TEST-UNIT-001 | Every Django app SHALL have a `tests.py` or `tests/` directory containing at least one `TestCase` class with actual test methods. The current `cards/tests.py` is empty. | P2 | — |
| LYL-TEST-UNIT-002 | Critical business logic SHALL have unit tests covering: (a) happy path, (b) boundary conditions, (c) error handling, (d) concurrent access. At minimum: `CustomerPass.process_transaction()` for all 10 card types, `Automation.can_execute_for_customer()`, `NotificationService.send_notification()`, authentication flow (register, login, refresh, logout). | P2 | — |
| LYL-TEST-UNIT-003 | Unit test coverage SHALL be at least 70% for all apps under `backend/apps/`. Coverage SHALL be measured and reported in CI. | P2 | — |

### 12.2 Integration Testing

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-TEST-INT-004 | Integration tests SHALL cover the complete scan-to-transaction flow: QR scan → pass lookup → transaction processing → pass update → analytics update → automation trigger. | P2 | — |
| LYL-TEST-INT-005 | Integration tests SHALL cover the billing lifecycle: trial → subscribe → payment failure → suspension → reactivation → cancellation. | P2 | — |

### 12.3 Security Testing

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-TEST-SEC-006 | Security tests SHALL verify: (a) tenant isolation (Tenant A cannot access Tenant B data), (b) RBAC enforcement (STAFF cannot access OWNER endpoints), (c) rate limiting (429 returned after limit exceeded), (d) SSRF prevention (private IPs blocked), (e) JWT tampering detection. | P2 | — |

---

## 13. MODULE H — DEVOPS & INFRASTRUCTURE REQUIREMENTS

### 13.1 CI/CD Pipeline

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-DEVOPS-CI-001 | A CI/CD pipeline (GitHub Actions or equivalent) SHALL be configured to run on every pull request: (a) `python manage.py check --deploy`, (b) `python manage.py test`, (c) `pytest --cov`, (d) `npm run lint`, (e) `npm run build`, (f) Docker image build. | P2 | — |
| LYL-DEVOPS-CI-002 | The CI pipeline SHALL NOT allow merging to `main` if any test fails, lint errors exist, or coverage drops below 70%. | P2 | — |

### 13.2 Monitoring & Observability

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-DEVOPS-MON-003 | Sentry (or equivalent error tracking) SHALL be integrated for both backend (Django) and frontend (Next.js). All unhandled exceptions SHALL be reported with sufficient context (request, user, tenant). | P1 | — |
| LYL-DEVOPS-MON-004 | The `/api/v1/health/` endpoint SHALL differentiate between liveness (process is running) and readiness (all dependencies healthy). A `/api/v1/health/ready` endpoint SHALL verify PostgreSQL, Redis, and Vault connectivity and return HTTP 503 if any dependency is unreachable. | P2 | M10 |
| LYL-DEVOPS-MON-005 | Structured JSON logs SHALL be shipped to a centralized log aggregation system (ELK, Loki, CloudWatch, or equivalent). Log retention SHALL be at least 90 days for audit compliance. | P2 | — |

### 13.3 Backup & Recovery

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-DEVOPS-BACK-006 | PostgreSQL automated backups SHALL run daily with point-in-time recovery capability. Backups SHALL be stored in a geographically separate location from the primary database. Recovery SHALL be tested monthly. | P1 | H8 |
| LYL-DEVOPS-BACK-007 | MinIO object storage SHALL have automated backup or cross-region replication enabled for the `passes` and `assets` buckets. | P2 | H8 |

### 13.4 Container Security

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-DEVOPS-SEC-008 | The `certs/` directory mounting strategy SHALL be documented. Production deployment SHALL specify how Apple, Google, and Firebase certificates are provisioned and rotated. | P2 | — |
| LYL-DEVOPS-SEC-009 | Seed scripts (`seed_sweet_coffee.py`, `adrian_passes.py`, `seed_test_data.py`) SHALL be excluded from the production Docker image via `.dockerignore`. | P2 | M7 |

---

## 14. MODULE I — COMPLIANCE & DATA GOVERNANCE

### 14.1 Audit Trail Integrity

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-COMP-AUDIT-001 | The `AuditLog` model's immutability enforcement (Python-level `save()` and `delete()` overrides) SHALL be supplemented with PostgreSQL-level protections: (a) a separate read-only database user for audit log queries, (b) row-level security policies preventing UPDATE and DELETE, or (c) a trigger that raises an exception on modification attempts. | P2 | D19 |
| LYL-COMP-AUDIT-002 | Audit log entries SHALL have a minimum retention period of 7 years per LOPDP Art. 47. Automated deletion SHALL NOT occur. Archival strategy SHALL be documented. | P2 | — |

### 14.2 Data Export Security

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-COMP-EXPORT-003 | All data export operations (CSV, PDF) SHALL be logged in the audit trail with: actor ID, export type, record count, timestamp, IP address. | P2 | — |
| LYL-COMP-EXPORT-004 | CSV exports SHALL include a `Content-Disposition: attachment` header to prevent inline rendering by browsers (which can execute embedded JavaScript). | P3 | D17 |

### 14.3 PII Handling

| Req ID | Requirement | Priority | Parent Finding |
|--------|-------------|----------|----------------|
| LYL-COMP-PII-005 | Customer email addresses SHALL NOT appear in plaintext in application logs. Logs SHALL mask emails (e.g., `a***@b***.com`). | P3 | D18 |
| LYL-COMP-PII-006 | The `enroll_customer_public` endpoint SHALL implement email verification before creating a `CustomerPass` to prevent enrollment with unauthorized email addresses. | P2 | D16 |

---

## 15. NON-FUNCTIONAL REQUIREMENTS

### 15.1 Performance

| Req ID | Requirement | Target |
|--------|-------------|--------|
| LYL-NFR-PERF-001 | API response time for scan-to-transaction (P95) | ≤ 500ms |
| LYL-NFR-PERF-002 | API response time for dashboard overview (P95) | ≤ 2 seconds |
| LYL-NFR-PERF-003 | PKPass generation time (P95) | ≤ 3 seconds |
| LYL-NFR-PERF-004 | Email campaign throughput | ≥ 500 emails/minute |
| LYL-NFR-PERF-005 | Concurrent scanner sessions per tenant | ≥ 50 |

### 15.2 Availability

| Req ID | Requirement | Target |
|--------|-------------|--------|
| LYL-NFR-AVAIL-001 | Platform uptime (monthly) | ≥ 99.5% |
| LYL-NFR-AVAIL-002 | Planned maintenance window | ≤ 2 hours/month |
| LYL-NFR-AVAIL-003 | Mean time to recovery (MTTR) | ≤ 1 hour |

### 15.3 Security

| Req ID | Requirement | Target |
|--------|-------------|--------|
| LYL-NFR-SEC-001 | Time to patch critical security vulnerabilities | ≤ 48 hours |
| LYL-NFR-SEC-002 | Penetration testing frequency | Quarterly |
| LYL-NFR-SEC-003 | Dependency vulnerability scanning | Automated in CI |

---

## 16. VERIFICATION & ACCEPTANCE CRITERIA

### 16.1 P0 (Critical) Acceptance Criteria

| Req ID | Verification Method | Acceptance Criteria |
|--------|-------------------|---------------------|
| LYL-SEC-AUTH-001 | `git log --all --full-history -- backend/auth.json` | Returns empty (file purged from all branches) |
| LYL-SEC-AUTH-002 | Database query | `SELECT COUNT(*) FROM loyallia_refresh_tokens WHERE user_id = '55ac4da4-...'` returns 0 |
| LYL-SEC-API-003 | Source code grep | `grep -r "C5ZfFYI" frontend/` returns empty |
| LYL-SEC-INFRA-004 | Vault status check | `vault status` shows `Sealed: false` in production mode |
| LYL-SEC-INFRA-007 | HTTP request | `curl -I http://rewards.loyallia.com` returns 301 to HTTPS |
| LYL-SEC-INFRA-008 | Header inspection | HTTPS response includes `Strict-Transport-Security` header |
| LYL-FIX-ANAL-001 | API test | `GET /api/v1/analytics/segments/` returns 200 with valid JSON |
| LYL-FIX-NOTIF-002 | API test | `POST /api/v1/notifications/devices/register/` with OWNER token returns 403, not 500 |
| LYL-FIX-AUTO-003 | Integration test | Automation with `send_notification` action executes without TypeError |
| LYL-FIX-SUPER-004 | Concurrency test | Two concurrent impersonation requests do not affect each other's token lifetime |

### 16.2 P1 (High) Acceptance Criteria

| Req ID | Verification Method | Acceptance Criteria |
|--------|-------------------|---------------------|
| LYL-SEC-WALLET-007 | Security test | `fetch_image_bytes("http://169.254.169.254/")` returns None, not metadata |
| LYL-SEC-WALLET-007 | Security test | `fetch_image_bytes("http://localhost:8000/admin/")` returns None |
| LYL-SEC-TENANT-019 | API test | `POST /api/v1/tenants/team/` response does NOT contain `temp_password` field |
| LYL-FIX-TXN-005 | Concurrency test | Two concurrent scans on discount card produce correct cumulative total |
| LYL-DEVOPS-MON-003 | Error injection | Unhandled exception appears in Sentry within 60 seconds |
| LYL-DEVOPS-BACK-006 | Recovery drill | Database restored from backup to point-in-time within 1 hour |

---

## 17. TRACEABILITY MATRIX

| Requirement ID | Parent SRS Ref | Audit Finding | Priority | Status |
|----------------|---------------|---------------|----------|--------|
| LYL-SEC-AUTH-001 | — | C1 | P0 | OPEN |
| LYL-SEC-AUTH-002 | — | C1 | P0 | OPEN |
| LYL-SEC-API-003 | — | C2 | P0 | OPEN |
| LYL-SEC-INFRA-004 | — | C3 | P0 | OPEN |
| LYL-SEC-INFRA-005 | — | C3 | P0 | OPEN |
| LYL-SEC-AUTH-006 | — | C4 | P0 | OPEN |
| LYL-SEC-INFRA-007 | — | H1 | P0 | OPEN |
| LYL-SEC-INFRA-008 | — | H1 | P0 | OPEN |
| LYL-SEC-INFRA-009 | — | H3, H4 | P1 | OPEN |
| LYL-FIX-ANAL-001 | — | D1 | P0 | OPEN |
| LYL-FIX-NOTIF-002 | — | D2 | P0 | OPEN |
| LYL-FIX-AUTO-003 | — | D4 | P0 | OPEN |
| LYL-FIX-SUPER-004 | — | D5 | P1 | OPEN |
| LYL-FIX-TXN-005 | — | D3 | P1 | OPEN |
| LYL-FIX-TXN-006 | — | D3 | P2 | OPEN |
| LYL-SEC-WALLET-007 | — | D5 | P1 | OPEN |
| LYL-SEC-WALLET-008 | — | D5 | P1 | OPEN |
| LYL-SEC-AUTH-009 | — | M1 | P2 | OPEN |
| LYL-SEC-AUTH-010 | — | M2 | P2 | OPEN |
| LYL-SEC-AUTH-011 | — | M3 | P2 | OPEN |
| LYL-SEC-AUTH-012 | — | D12 | P3 | OPEN |
| LYL-SEC-API-013 | — | M8 | P2 | OPEN |
| LYL-SEC-API-014 | — | D6 | P2 | OPEN |
| LYL-SEC-API-015 | — | D8 | P2 | OPEN |
| LYL-SEC-API-016 | — | D4 | P2 | OPEN |
| LYL-SEC-API-017 | — | D9 | P2 | OPEN |
| LYL-SEC-API-018 | — | D8 | P2 | OPEN |
| LYL-SEC-TENANT-019 | — | D7 | P1 | OPEN |
| LYL-PERF-AGENT-001 | — | D11 | P2 | OPEN |
| LYL-PERF-ANAL-002 | — | D11 | P2 | OPEN |
| LYL-PERF-CARD-003 | — | D11 | P2 | OPEN |
| LYL-PERF-NOTIF-004 | — | D11 | P3 | OPEN |
| LYL-PERF-API-005 | — | — | P2 | OPEN |
| LYL-PERF-SEG-006 | — | — | P2 | OPEN |
| LYL-PERF-NOTIF-007 | — | — | P2 | OPEN |
| LYL-PERF-INFRA-008 | — | D13 | P3 | OPEN |
| LYL-ARCH-API-001 | — | — | P2 | OPEN |
| LYL-ARCH-API-002 | — | — | P3 | OPEN |
| LYL-ARCH-API-003 | — | — | P2 | OPEN |
| LYL-ARCH-API-004 | — | — | P2 | OPEN |
| LYL-ARCH-INFRA-005 | — | — | P3 | OPEN |
| LYL-ARCH-INFRA-006 | — | D18 | P3 | OPEN |
| LYL-ARCH-INFRA-007 | — | — | P3 | OPEN |
| LYL-FE-REACT-001 | — | — | P2 | OPEN |
| LYL-FE-REACT-002 | — | — | P3 | OPEN |
| LYL-FE-I18N-003 | — | — | P3 | OPEN |
| LYL-FE-API-004 | — | — | P2 | OPEN |
| LYL-FE-API-005 | — | — | P3 | OPEN |
| LYL-TEST-UNIT-001 | — | — | P2 | OPEN |
| LYL-TEST-UNIT-002 | — | — | P2 | OPEN |
| LYL-TEST-UNIT-003 | — | — | P2 | OPEN |
| LYL-TEST-INT-004 | — | — | P2 | OPEN |
| LYL-TEST-INT-005 | — | — | P2 | OPEN |
| LYL-TEST-SEC-006 | — | — | P2 | OPEN |
| LYL-DEVOPS-CI-001 | — | — | P2 | OPEN |
| LYL-DEVOPS-CI-002 | — | — | P2 | OPEN |
| LYL-DEVOPS-MON-003 | — | — | P1 | OPEN |
| LYL-DEVOPS-MON-004 | — | M10 | P2 | OPEN |
| LYL-DEVOPS-MON-005 | — | — | P2 | OPEN |
| LYL-DEVOPS-BACK-006 | — | H8 | P1 | OPEN |
| LYL-DEVOPS-BACK-007 | — | H8 | P2 | OPEN |
| LYL-DEVOPS-SEC-008 | — | — | P2 | OPEN |
| LYL-DEVOPS-SEC-009 | — | M7 | P2 | OPEN |
| LYL-COMP-AUDIT-001 | — | D19 | P2 | OPEN |
| LYL-COMP-AUDIT-002 | — | — | P2 | OPEN |
| LYL-COMP-EXPORT-003 | — | — | P2 | OPEN |
| LYL-COMP-EXPORT-004 | — | D17 | P3 | OPEN |
| LYL-COMP-PII-005 | — | D18 | P3 | OPEN |
| LYL-COMP-PII-006 | — | D16 | P2 | OPEN |
| LYL-NFR-PERF-001 | — | — | P2 | OPEN |
| LYL-NFR-PERF-002 | — | — | P2 | OPEN |
| LYL-NFR-PERF-003 | — | — | P2 | OPEN |
| LYL-NFR-PERF-004 | — | — | P2 | OPEN |
| LYL-NFR-PERF-005 | — | — | P2 | OPEN |
| LYL-NFR-AVAIL-001 | — | — | P1 | OPEN |
| LYL-NFR-AVAIL-002 | — | — | P2 | OPEN |
| LYL-NFR-AVAIL-003 | — | — | P1 | OPEN |
| LYL-NFR-SEC-001 | — | — | P0 | OPEN |
| LYL-NFR-SEC-002 | — | — | P2 | OPEN |
| LYL-NFR-SEC-003 | — | — | P2 | OPEN |

---

## 18. APPENDICES

### Appendix A — Summary Statistics

| Category | Count |
|----------|-------|
| Total Requirements | 69 |
| P0 (Critical) | 11 |
| P1 (High) | 10 |
| P2 (Medium) | 35 |
| P3 (Low) | 13 |
| Security Requirements | 19 |
| Functional Fixes | 6 |
| Performance Requirements | 8 |
| Architecture Requirements | 7 |
| Frontend Requirements | 5 |
| Testing Requirements | 6 |
| DevOps Requirements | 9 |
| Compliance Requirements | 6 |
| NFRs | 8 |

### Appendix B — Implementation Priority Order

**Phase 1 (48 hours — Blocking):**
LYL-SEC-AUTH-001, LYL-SEC-AUTH-002, LYL-SEC-API-003, LYL-SEC-INFRA-004, LYL-SEC-INFRA-005, LYL-SEC-AUTH-006, LYL-SEC-INFRA-007, LYL-SEC-INFRA-008, LYL-FIX-ANAL-001, LYL-FIX-NOTIF-002, LYL-FIX-AUTO-003

**Phase 2 (1 week):**
LYL-SEC-INFRA-009, LYL-FIX-SUPER-004, LYL-FIX-TXN-005, LYL-SEC-WALLET-007, LYL-SEC-WALLET-008, LYL-SEC-TENANT-019, LYL-DEVOPS-MON-003, LYL-DEVOPS-BACK-006

**Phase 3 (2 weeks):**
LYL-SEC-AUTH-009 through LYL-COMP-PII-006 (all P2 requirements)

**Phase 4 (1 month):**
All P3 requirements

---

*Document generated from full codebase audit of Loyallia (~150 files reviewed).*
*Conforms to ISO/IEC 29148:2018 requirement specification structure.*
