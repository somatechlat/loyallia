# Loyallia — Production Compliance Checklist

**Audit Date:** 2026-04-29
**Auditor:** Compliance & Data Protection Officer (Automated Review)
**Scope:** Full codebase review — backend API, frontend, infrastructure, legal pages
**Status:** 🔴 11 FAIL / 🟡 6 PARTIAL / 🟢 38 PASS

---

## Table of Contents

1. [LOPDP (Ecuador Data Protection)](#1-lopd-ecuador-data-protection)
2. [GDPR (EU Data Protection)](#2-gdpr-eu-data-protection)
3. [OWASP Top 10 Coverage](#3-owasp-top-10-coverage)
4. [Input Validation](#4-input-validation)
5. [Error Handling](#5-error-handling)
6. [Rate Limiting](#6-rate-limiting)
7. [Data Retention](#7-data-retention)

---

## 1. LOPDP (Ecuador Data Protection)

Ley Orgánica de Protección de Datos Personales (LOPDP) — effective since May 2021.

| # | Requirement | Status | Evidence | Remediation |
|---|------------|--------|----------|-------------|
| L-01 | **Consent mechanism for cookie collection** | 🟢 PASS | `CookieConsent.tsx` — displays banner, stores consent in `localStorage`, references LOPDP explicitly, links to privacy policy and terms. | — |
| L-02 | **Consent mechanism for data import (tenant → customer)** | 🟢 PASS | `privacy/page.tsx` §3 — tenant declares under oath they obtained express consent. `terms/page.tsx` §2 — same obligation restated. | — |
| L-03 | **Purpose limitation (finalidad)** | 🟢 PASS | `privacy/page.tsx` §2 — "strictamente para el diseño, despliegue y análisis de campañas de fidelización". No secondary use in code. | — |
| L-04 | **Data minimization** | 🟢 PASS | Customer schemas collect only: name, email, phone, DOB, gender. No SSN, no national ID, no unnecessary PII. Import validates columns, strips data. | — |
| L-05 | **Right to deletion (derecho de cancelación)** | 🟢 PASS | `customers/api.py` — `DELETE /{customer_id}/` performs permanent delete. Requires OWNER role. Audit logged before deletion. | — |
| L-06 | **Right to access (derecho de acceso)** | 🟢 PASS | `customers/api.py` — `GET /{customer_id}/` returns full customer profile. `GET /export/` enables data portability. | — |
| L-07 | **Right to rectification (derecho de rectificación)** | 🟢 PASS | `customers/api.py` — `PATCH /{customer_id}/` allows updating all customer fields. Audit logged. | — |
| L-08 | **Data portability** | 🟢 PASS | `GET /export/` exports all customer data as CSV. `GET /segments/{id}/export/` exports segment data. Both OWNER-only with audit logging. | — |
| L-09 | **Audit trail completeness** | 🟢 PASS | `AuditLog` model — immutable (`save()` rejects updates, `delete()` raises ValueError). Records WHO/WHAT/WHEN/WHERE/WHY. 7-year retention stated. Self-auditing on read operations. | — |
| L-10 | **Audit trail immutability** | 🟢 PASS | `audit/models.py` — `save()` checks `if self.pk and exists()` → raises `ValueError`. `delete()` always raises `ValueError`. | — |
| L-11 | **Audit trail retention (7 years)** | 🟡 PARTIAL | Retention period documented in model docstring and privacy policy, but **no automated purge/cleanup task** exists to enforce or verify the 7-year window. | **Remediation:** Create a Celery beat task that monitors audit log age and alerts when entries approach 7-year boundary. Consider archival strategy for entries beyond retention. |
| L-12 | **Encargado del Tratamiento declaration** | 🟢 PASS | Privacy policy §1 explicitly declares Loyallia as "Encargado del Tratamiento" and tenant as "Responsable del Tratamiento". | — |
| L-13 | **Security measures documentation** | 🟢 PASS | Privacy policy §4 references technical and organizational measures, forensic audit trail, 7-year retention. | — |
| L-14 | **Data breach notification process** | 🔴 FAIL | **No breach notification mechanism found.** No endpoint, no email template, no automated alert for data breach scenarios. LOPDP Art. 44 requires notification to the Superintendencia de Control del Poder de Mercado within 72 hours. | **Remediation:** Implement: (1) Incident detection via Sentry alerts, (2) Automated email template for affected users, (3) Escalation playbook with 72-hour SLA, (4) Registration with Superintendencia as data processor. |

---

## 2. GDPR (EU Data Protection)

If serving EU users (even one), GDPR applies.

| # | Requirement | Status | Evidence | Remediation |
|---|------------|--------|----------|-------------|
| G-01 | **Cookie consent (opt-in, not just notice)** | 🔴 FAIL | `CookieConsent.tsx` only offers "Aceptar Todo" — **no Reject button, no granular consent categories** (essential vs. analytics vs. marketing). GDPR requires freely given, specific consent with reject option. | **Remediation:** Add "Rechazar No Esenciales" button. Implement granular consent categories. Store consent preferences with timestamp. Add "Gestionar Cookies" link in footer. |
| G-02 | **Cookie consent withdrawal** | 🔴 FAIL | No mechanism to withdraw consent after accepting. No cookie settings panel accessible from the UI. | **Remediation:** Add cookie settings modal accessible from footer. Store granular preferences. Allow toggling categories. |
| G-03 | **Data Processing Records (Art. 30)** | 🟡 PARTIAL | Audit trail covers data access/modification, but no formal Record of Processing Activities (ROPA) document exists listing: categories of data, purposes, recipients, retention periods, transfers. | **Remediation:** Create ROPA document. Map each data category to legal basis, purpose, retention, and recipients. |
| G-04 | **Breach notification (Art. 33-34)** | 🔴 FAIL | Same as L-14. No automated breach detection, no 72-hour notification process, no DPA contact mechanism. | **Remediation:** Same as L-14. Additionally: appoint DPO or EU representative if serving EU users. |
| G-05 | **Right to erasure (Art. 17)** | 🟢 PASS | `DELETE /{customer_id}/` — permanent deletion. Audit logged. | — |
| G-06 | **Right to data portability (Art. 20)** | 🟢 PASS | CSV export endpoints with structured, machine-readable format. | — |
| G-07 | **Lawful basis for processing** | 🟡 PARTIAL | Consent is documented for customers, but no explicit lawful basis selection per processing activity. For B2B SaaS, legitimate interest may apply, but should be documented. | **Remediation:** Document lawful basis per processing activity in ROPA. |
| G-08 | **Data minimization (Art. 5(1)(c))** | 🟢 PASS | Only necessary fields collected. No excessive data gathering. | — |
| G-09 | **Storage limitation (Art. 5(1)(e))** | 🟡 PARTIAL | 7-year audit retention documented, but no automated data retention enforcement for customer data, sessions, or other PII. | **Remediation:** Implement automated data retention policies with configurable TTL per data category. |
| G-10 | **International data transfers** | 🟡 PARTIAL | Infrastructure appears to be Ecuador-based (`.ec` TLD, SRI references), but no explicit data transfer impact assessment or SCCs documented if EU data is processed. | **Remediation:** If serving EU users, document data location, implement SCCs or rely on adequacy decisions. |

---

## 3. OWASP Top 10 Coverage (2021)

| # | Category | Status | Evidence | Remediation |
|---|----------|--------|----------|-------------|
| OWASP-01 | **A01: Broken Access Control** | 🟢 PASS | Tenant isolation via `TenantMiddleware` + `request.tenant` scoping on every query. Role-based access via `@require_role()` decorator. `is_owner()` / `is_manager_or_owner()` checks. JWT auth on all protected endpoints. | — |
| OWASP-02 | **A02: Cryptographic Failures** | 🟢 PASS | Argon2 password hashing (strongest available). JWT with HS256 and separate secret key. HMAC-signed QR codes. TLS 1.2/1.3 enforced in Nginx. HTTPS-only in production. Vault for secrets management. | — |
| OWASP-03 | **A03: Injection** | 🟢 PASS | Django ORM (parameterized queries) throughout. Pydantic schema validation on all inputs. No raw SQL observed. CSV injection prevention (`_sanitize_csv_cell`). | — |
| OWASP-04 | **A04: Insecure Design** | 🟢 PASS | Multi-tenant architecture with strict isolation. Immutable audit trail. Refresh token rotation (B-002). Account lockout after failed attempts. Rate limiting middleware. | — |
| OWASP-05 | **A05: Security Misconfiguration** | 🟢 PASS | `DEBUG=False` in production. `SECRET_KEY` from Vault. Security headers in Nginx config (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy). HSTS preload. | — |
| OWASP-06 | **A06: Vulnerable and Outdated Components** | 🟡 PARTIAL | No `pip-audit` or `npm audit` in CI pipeline observed. Dependency versions not pinned in reviewed files. | **Remediation:** Add `pip-audit` and `npm audit --production` to CI. Pin dependency versions. Enable Dependabot/Renovate. |
| OWASP-07 | **A07: Identification and Authentication Failures** | 🟢 PASS | JWT with rotation. Refresh tokens are single-use (revoked after use). Account lockout. Password strength validation (min 8 chars, common password check). OTP-based email/phone verification. Google OAuth with audience validation. | — |
| OWASP-08 | **A08: Software and Data Integrity Failures** | 🟢 PASS | HMAC-signed QR codes. Webhook signature verification (`X-Payment-Signature`). Celery task serialization via JSON only. | — |
| OWASP-09 | **A09: Security Logging and Monitoring Failures** | 🟢 PASS | Structured JSON logging (`JsonFormatter`). Sentry integration (B-013). Immutable audit trail. Request ID tracing (B-011). Rate limit violation logging. | — |
| OWASP-10 | **A10: Server-Side Request Forgery (SSRF)** | 🟢 PASS | Google tokeninfo endpoint is hardcoded (`https://oauth2.googleapis.com/tokeninfo`). No user-controlled URLs used in server-side requests. MinIO endpoint from env config. | — |

---

## 4. Input Validation

### 4.1 API Endpoint Validation

| # | Endpoint | Status | Evidence | Remediation |
|---|----------|--------|----------|-------------|
| V-01 | `POST /auth/register/` | 🟢 PASS | `RegisterIn` — `EmailStr` validation, password min 8 chars, business_name required, field stripping. | — |
| V-02 | `POST /auth/login/` | 🟢 PASS | `LoginIn` — `EmailStr` + password string. No injection vector. | — |
| V-03 | `POST /auth/refresh/` | 🟢 PASS | `RefreshIn` — refresh_token string. Hashed before DB lookup. | — |
| V-04 | `POST /auth/password-reset/request/` | 🟢 PASS | `PasswordResetRequestIn` — `EmailStr`. Rate limited (3/hour). | — |
| V-05 | `POST /auth/password-reset/confirm/` | 🟢 PASS | `PasswordResetConfirmIn` — `EmailStr`, otp string, new_password min 8 chars. | — |
| V-06 | `POST /auth/verify-email/` | 🟢 PASS | `VerifyEmailIn` — `EmailStr` + otp string. | — |
| V-07 | `POST /auth/invite/` | 🟢 PASS | `InviteIn` — `EmailStr`, role validated against allowed set (MANAGER, STAFF only). | — |
| V-08 | `POST /auth/google/login/` | 🟢 PASS | `GoogleTokenIn` — credential string. Audience validation against client_id. Email verified check. | — |
| V-09 | `POST /auth/phone/verify/request/` | 🟢 PASS | `PhoneVerifyRequestIn` — E.164 regex validation (`^\+[1-9]\d{7,14}$`). | — |
| V-10 | `POST /customers/import/` | 🟢 PASS | File size limit (5MB). Format validation (.csv/.xlsx only). Column validation. Email regex. Duplicate detection. Row-level error handling. | — |
| V-11 | `POST /customers/enroll/` (public) | 🟢 PASS | `CustomerCreateIn` — Pydantic validation, `EmailStr`, name validators, gender enum. Card ID validated against DB. | — |
| V-12 | `PATCH /customers/{id}/` | 🟢 PASS | `CustomerUpdateIn` — all optional fields, name validators, gender enum. | — |
| V-13 | `POST /notifications/send/` | 🟢 PASS | `SendNotificationSchema` — Pydantic model with required fields. Tenant scoping. | — |
| V-14 | `POST /billing/payment-methods/` | 🟢 PASS | `AddPaymentMethodSchema` — tokenized card data only (no raw card numbers). | — |
| V-15 | `POST /billing/webhook/` | 🟢 PASS | HMAC signature verification before processing. JSON parse error handling. | — |
| V-16 | Audit API filters | 🟢 PASS | Query parameters typed (`int`, `str`). Django ORM filters (parameterized). | — |

### 4.2 File Upload Security

| # | Check | Status | Evidence | Remediation |
|---|-------|--------|----------|-------------|
| V-17 | File size limit | 🟢 PASS | `MAX_FILE_SIZE = 5 * 1024 * 1024` (5MB) enforced before pandas load. | — |
| V-18 | File type validation | 🟢 PASS | Extension check (`.csv`, `.xlsx`, `.xls`). pandas parsing with error handling. | — |
| V-19 | CSV injection prevention | 🟢 PASS | `_sanitize_csv_cell()` prefixes dangerous chars (`=`, `+`, `-`, `@`, `\t`, `\r`) with `'`. | — |
| V-20 | Content-type validation | 🟡 PARTIAL | Only extension-based check. No MIME type validation. | **Remediation:** Add `python-magic` or similar for MIME type verification alongside extension check. |

---

## 5. Error Handling

| # | Requirement | Status | Evidence | Remediation |
|---|------------|--------|----------|-------------|
| E-01 | **No stack traces in production** | 🟢 PASS | `DEBUG=False` in production. `HttpError` for user-facing errors with localized messages. Generic "SERVER_ERROR" message for unexpected exceptions. | — |
| E-02 | **Structured error responses** | 🟢 PASS | All errors return `{"success": false, "message": "..."}` format via `HttpError`. Rate limit returns structured JSON with `retry_after`. | — |
| E-03 | **Logging without PII** | 🟡 PARTIAL | `JsonFormatter` includes `request_id`, `tenant_id`, `user_id` but not raw PII. However, audit log stores `actor_email` in plaintext, and some `logger.info()` calls include email addresses (e.g., `"Password reset requested for %s"`). | **Remediation:** Mask email addresses in application logs (show `u***@domain.com`). Audit log is exempt (compliance requirement), but application logs should not contain PII. |
| E-04 | **Exception tracking** | 🟢 PASS | Sentry integration configured with `send_default_pii=False`. DSN from env. | — |
| E-05 | **Webhook error handling** | 🟢 PASS | Payment webhook: signature verification, JSON parse error handling, 401/400 responses. | — |

---

## 6. Rate Limiting

| # | Endpoint Category | Status | Evidence | Remediation |
|---|------------------|--------|----------|-------------|
| R-01 | Login (`/auth/login`) | 🟢 PASS | 5 req/min per IP. Redis-backed. | — |
| R-02 | Registration (`/auth/register`) | 🟢 PASS | 10 req/min per IP. | — |
| R-03 | Phone verification (`/auth/phone/`) | 🟢 PASS | 3 req/min per IP (SMS spam prevention). | — |
| R-04 | Password reset | 🟢 PASS | 3 req/hour per email (in-handler via cache). | — |
| R-05 | General auth endpoints | 🟢 PASS | 20 req/min per IP. | — |
| R-06 | Wallet/PKPass endpoints | 🟢 PASS | 30 req/min per IP (CPU protection). | — |
| R-07 | Scanner endpoints | 🟢 PASS | 120 req/min per user. | — |
| R-08 | Analytics endpoints | 🟢 PASS | 20 req/min per user. | — |
| R-09 | Notification endpoints | 🟢 PASS | 30 req/min per user. | — |
| R-10 | General API | 🟢 PASS | 200 req/min per IP (catch-all). | — |
| R-11 | Payment webhook | 🔴 FAIL | **No rate limit on `/billing/webhook/`**. While HMAC verification prevents spoofing, a flood of valid-looking requests could still cause DoS. | **Remediation:** Add specific rate limit rule: `/api/v1/billing/webhook/` — 60 req/min per IP. |
| R-12 | Health check endpoint | 🟢 PASS | Exempted from rate limiting (correct behavior). | — |
| R-13 | Rate limit fail-open | 🟢 PASS | Redis unavailable → requests pass through. Logged as warning. Prevents Redis failure from causing total outage. | — |

---

## 7. Data Retention

| # | Data Category | Status | Evidence | Remediation |
|---|--------------|--------|----------|-------------|
| DR-01 | **Audit log retention (7 years)** | 🟡 PARTIAL | Retention period documented but no automated enforcement. No archival or purge mechanism. | **Remediation:** Implement: (1) Celery beat task to flag entries older than 7 years, (2) Archive to cold storage before deletion, (3) Alert compliance team at 6.5 years. |
| DR-02 | **Refresh token cleanup** | 🟢 PASS | Celery beat task `cleanup-expired-refresh-tokens` runs daily at 3 AM. Tokens revoked on password reset, user deactivation, and logout. | — |
| DR-03 | **Customer data retention** | 🔴 FAIL | **No automated retention policy.** Customer data persists indefinitely even after account closure. No configurable TTL. | **Remediation:** Implement configurable retention policy (e.g., 2 years after last activity). Add anonymization task for inactive customers. |
| DR-04 | **Session data retention** | 🟢 PASS | Django sessions backed by Redis with 5-minute default cache TTL. JWT access tokens expire in 60 minutes. Refresh tokens expire in 30 days with rotation. | — |
| DR-05 | **OTP data retention** | 🟢 PASS | OTPs stored in Redis with 15-minute TTL. Verified OTPs are consumed (one-time use). | — |
| DR-06 | **Campaign/notification data** | 🔴 FAIL | **No retention policy for sent notifications.** Marketing notifications accumulate indefinitely. | **Remediation:** Implement archival task for notifications older than 1 year. Keep aggregate stats, purge message bodies. |

---

## Summary of Failures

| # | ID | Severity | Category | Issue | Priority |
|---|----|----------|----------|-------|----------|
| 1 | L-14 | 🔴 HIGH | LOPDP | No breach notification mechanism | P0 |
| 2 | G-01 | 🔴 HIGH | GDPR | Cookie consent missing reject option | P1 |
| 3 | G-02 | 🔴 HIGH | GDPR | No cookie consent withdrawal mechanism | P1 |
| 4 | G-04 | 🔴 HIGH | GDPR | No breach notification (same as L-14) | P0 |
| 5 | OWASP-06 | 🟡 MED | OWASP | No dependency vulnerability scanning in CI | P2 |
| 6 | R-11 | 🟡 MED | Rate Limiting | No rate limit on payment webhook | P1 |
| 7 | DR-01 | 🟡 MED | Retention | Audit log retention not enforced | P2 |
| 8 | DR-03 | 🔴 HIGH | Retention | No customer data retention policy | P1 |
| 9 | DR-06 | 🟡 MED | Retention | No notification data retention | P2 |
| 10 | V-20 | 🟡 LOW | Validation | No MIME type validation on uploads | P3 |
| 11 | E-03 | 🟡 LOW | Error Handling | PII in application logs | P2 |

## Priority Remediation Roadmap

### P0 — Immediate (Before Launch)
- [ ] Implement breach notification playbook and automated alerting
- [ ] Register as data processor with relevant authorities

### P1 — Pre-Production
- [ ] Add granular cookie consent with reject option
- [ ] Add cookie settings management panel
- [ ] Add rate limit rule for payment webhook
- [ ] Implement customer data retention policy with automated cleanup

### P2 — Post-Launch (30 days)
- [ ] Add `pip-audit` and `npm audit` to CI pipeline
- [ ] Create Record of Processing Activities (ROPA)
- [ ] Implement audit log archival strategy
- [ ] Mask PII in application logs
- [ ] Implement notification data retention

### P3 — Nice to Have
- [ ] Add MIME type validation for file uploads
- [ ] Create Data Protection Impact Assessment (DPIA) template
