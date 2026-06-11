> **Estado del documento (2026-06-11):** Revisión basada en el código y documentación vigente.
> Algunos hallazgos pueden haber cambiado; verificar siempre contra el código fuente.

# API Design & Security Audit Report

**Audited (snapshot):** 2026-06-04  
**Updated:** 2026-06-11  
**Auditor:** API Design & Security Audit Agent  
**Scope:** All Django Ninja API routers, auth layer, permissions, rate limiting, middleware, and portal APIs.  
**Current verified counts (as of 2026-06-11):**
- Backend Python files: ~456
- Frontend TS/TSX files (`frontend/src`): ~249
- E2E test files: 43
- Backend test files: 41
- Frontend unit test files: 28

> ⚠️ **Line numbers and file paths below reflect the 2026-06-11 re-audit.** Some issues have been resolved or partially mitigated since the original snapshot; status notes indicate current state. Verify critical paths against current code.

---

## Executive Summary

- **Files audited:** 29 API files + 6 common/auth infrastructure files
- **Issues found:** 46 (P0: 2, P1: 26, P2: 18)

The Loyallia backend demonstrates strong tenant isolation, solid JWT authentication, and good use of plan enforcement. However, two **critical (P0)** vulnerabilities were found: a broken impersonation revocation mechanism and missing role validation in user invitation that could allow an OWNER to create SUPER_ADMIN users. Additionally, numerous high-privilege mutations lack audit logging, and several public endpoints lack dedicated rate limiting.

---

## Critical Security Issues (P0)

| # | File | Line | Issue | CWE/Rule | Suggested Fix |
|---|------|------|-------|----------|---------------|
| 1 | `backend/apps/authentication/users_api.py` | 122 (role at 146) | `invite_user` creates a user with `role=payload.role` (line 146) without validating the role. An OWNER can invite a SUPER_ADMIN (or create another OWNER), violating role hierarchy restrictions. **Still open.** | CWE-269 / "OWNER must not be able to create or promote SUPER_ADMIN users" | Validate `payload.role` is only `MANAGER` or `STAFF`, identical to `tenants/api.py:add_team_member`. |
| 2 | `backend/apps/tenants/super_admin_api/impersonation.py` | 156–163 | `revoke_impersonation` sets cache key `impersonation:{request.user.id}` (line 162, the SUPER_ADMIN's ID), but `tokens.py:decode_access_token` checks `impersonation:{payload["user_id"]}` (the impersonated OWNER's ID). Revocation never actually invalidates the token. **Still open.** | CWE-287 / Impersonation guarding | In `revoke_impersonation`, set the cache key using the **impersonated owner's user ID** (passed in the request body or from the active impersonation session), not `request.user.id`. |

---

## Important Issues (P1)

| # | File | Line | Issue | Rule Violated | Suggested Fix |
|---|------|------|-------|---------------|---------------|
| 1 | `backend/apps/analytics/advanced_api.py` | 215-217 | `notify_top_buyers` docstring claims "OWNER only" (line 216), but the endpoint uses `is_manager_or_owner(request)` (line 217), allowing MANAGER to send bulk push notifications. **Still open.** | Role restrictions | Change check to `is_owner(request)` or update the docstring if MANAGER is intended. |
| 2 | `backend/apps/customers/api.py` | 77-101 | `search_customers` delegates to `services.search_customers()`, which now slices `[:50]` (`backend/apps/customers/services/__init__.py:101`). API layer still does not expose `limit`/`offset` parameters. **Partially mitigated.** | Input validation / DoS | Add `limit`/`offset` parameters to the API or document the hard 50-row ceiling explicitly. |
| 3 | `backend/common/rate_limit.py` | 165 / 316 | `/api/v1/wallet/` is in `RATE_LIMIT_RULES` (line 165), but Apple Wallet Web Service is mounted at root `/wallet/apple/` (`backend/loyallia/urls.py:39`) and still bypasses `RateLimitMiddleware` because it only checks `path.startswith("/api/")` (line 316). **Still open.** | Rate limiting | Add a rate-limit rule for `/wallet/` prefix, or ensure all wallet routes are mounted under `/api/v1/wallet/`. |
| 4 | `backend/apps/authentication/api.py` | 285 | `google_login` issues tokens on success but never writes an audit log entry for the login event. **Still open.** | Audit logging | Add `log_action(..., action=AuditAction.LOGIN, ...)` before returning tokens. |
| 5 | `backend/apps/authentication/api.py` | 239 | `reset_password` successfully changes a user's password but does not emit an audit log. Security-critical mutations must be auditable. | Audit logging | Add `log_action(..., action=AuditAction.UPDATE, resource_type="user_password", ...)` on success. |
| 6 | `backend/apps/tenants/super_admin_api/impersonation.py` | 126 | Impersonation access token TTL is 60 minutes (`timedelta(minutes=60)`). For high-privilege impersonation, this is excessive. **Still open.** | JWT token handling / Impersonation guarding | Reduce TTL to 15 minutes (or less) for impersonation tokens. |
| 7 | `backend/apps/tenants/api.py` | 125 | `update_tenant` (PATCH `/me/`) mutates tenant branding data but has no audit logging. | Audit logging | Add `log_action(...)` capturing changed fields. |
| 8 | `backend/apps/tenants/api.py` | 201 | `create_location` mutates location data but has no audit logging. | Audit logging | Add `log_action(...)` after creation. |
| 9 | `backend/apps/tenants/api.py` | 233 | `update_location` mutates location data but has no audit logging. | Audit logging | Add `log_action(...)` after update. |
| 10 | `backend/apps/tenants/api.py` | 294 | `delete_location` mutates location data but has no audit logging. | Audit logging | Add `log_action(...)` after deletion. |
| 11 | `backend/apps/customers/api.py` | 417 | `enroll_customer` (auth enrollment) creates a `CustomerPass` but has no audit logging. **Still open.** | Audit logging | Add `log_action(..., action=AuditAction.CREATE, resource_type="enrollment", ...)` on success. |
| 12 | `backend/apps/analytics/advanced_api.py` | 215-251 | `notify_top_buyers` creates `Notification` records in bulk but has no audit logging. **Still open.** | Audit logging | Add `log_action(...)` recording count and channel. |
| 13 | `backend/apps/customers/api.py` | 44 | `list_customers` accepts `limit` with no upper bound. A malicious client can request `limit=999999`, causing a heavy query. **Still open.** | Input validation / DoS | Cap `limit = max(1, min(limit, 500))` (pattern already used in `audit/api.py`). |
| 14 | `backend/apps/transactions/api.py` | 241 | `list_transactions` accepts `limit` with no upper bound. | Input validation / DoS | Cap `limit` to a reasonable maximum (e.g., 500). |
| 15 | `backend/apps/analytics/api.py` | 92 | `get_overview_analytics` accepts `days` with no upper bound. A very large value causes an expensive date-range query. | Input validation / DoS | Cap `days` to a reasonable maximum (e.g., 365 or 730). |
| 16 | `backend/apps/analytics/advanced_api.py` | 39 | `get_revenue_breakdown` accepts `days` with no upper bound. | Input validation / DoS | Cap `days` to a reasonable maximum. |
| 17 | `backend/apps/tenants/super_admin_api/tenants.py` | 514 | `extend_trial` is a billing mutation with no audit logging. **Still open.** | Audit logging | Add `log_action(...)` after extending the trial. |
| 18 | `backend/apps/tenants/super_admin_api/tenants.py` | 400 | `suspend_tenant` is a destructive state mutation with no audit logging (only `logger.warning`). **Still open.** | Audit logging | Add `log_action(..., action=AuditAction.UPDATE, resource_type="tenant", ...)` on success. |
| 19 | `backend/apps/tenants/super_admin_api/tenants.py` | 491 | `reactivate_tenant` is a state mutation with no audit logging (only `logger.info`). **Still open.** | Audit logging | Add `log_action(...)` on success. |
| 20 | `backend/apps/tenants/super_admin_api/tenants.py` | 575 | `set_whatsapp_override` modifies a tenant limit with no audit logging (only `logger.info`). | Audit logging | Add `log_action(...)` on success. |
| 21 | `backend/apps/tenants/super_admin_api/tenants.py` | 348 | `add_tenant_location` creates a location but has no audit logging. | Audit logging | Add `log_action(...)` after creation. |
| 22 | `backend/apps/tenants/super_admin_api/platform_plans.py` | 46 | `create_plan` mutates global subscription plans with no audit logging (only `logger.info`). **Still open.** | Audit logging | Add `log_action(...)` on success. |
| 23 | `backend/apps/tenants/super_admin_api/platform_plans.py` | 82 | `delete_plan` (soft-delete) mutates global plans with no audit logging. **Still open.** | Audit logging | Add `log_action(...)` on success. |
| 24 | `backend/apps/tenants/super_admin_api/platform_plans.py` | 111 | `update_plan` mutates global plan configuration with no audit logging (only `logger.info`). **Still open.** | Audit logging | Add `log_action(...)` on success. |
| 25 | `backend/apps/tenants/super_admin_api/platform.py` | 438 | `update_platform_setting` mutates runtime settings with no audit logging. **Still open.** | Audit logging | Add `log_action(...)` on success. |
| 26 | `backend/apps/billing/payment_api.py` | 285 | `get_invoice` returns raw `invoice_data` JSON field (line 285), which may contain gateway response secrets (raw API responses, card tokens, etc.). **Still open.** | No secrets in API responses | Redact or exclude the `invoice_data` field from the response schema, or sanitize it before returning. |

---

## Minor Issues (P2)

| # | File | Line | Issue | Rule Violated | Suggested Fix |
|---|------|------|-------|---------------|---------------|
| 1 | `backend/apps/customers/portal_api.py` | 139-149, 189, 216, 251, 468 | Hardcoded Spanish strings remain for balance displays (`"sellos"`, `"crédito"`, `"VIP"`, `"referidos"`), confirmation phrase (`"ACEPTO ELIMINAR MI CUENTA"`), and success messages. Most user-facing messages now use `get_message_for_request()`, but these still bypass i18n. | Error messages use `get_message()` | Replace all hardcoded strings with `get_message("PORTAL_...")` codes. |
| 2 | `backend/apps/tenants/super_admin_api/integration_config.py` | 367 | `preview_values` returns `twilio_account_sid` directly from Vault without redaction. While Account SIDs are public-ish identifiers, they should still be treated as sensitive configuration metadata. | No secrets in API responses | Redact Account SID with `<redacted>` or move it to diagnostics only. |
| 3 | `backend/apps/authentication/api.py` | 70 | `register` creates a new tenant + owner atomically but does not emit an audit log. **Still open.** | Audit logging | Add `log_action(..., action=AuditAction.CREATE, resource_type="tenant", ...)` on success. |
| 4 | `backend/apps/authentication/api.py` | 200 | `verify_email` marks email as verified but has no audit logging. **Still open.** | Audit logging | Add `log_action(...)` on success. |
| 5 | `backend/apps/authentication/api.py` | 225 | `forgot_password` triggers an email but has no audit logging. **Still open.** | Audit logging | Add `log_action(...)` on request. |
| 6 | `backend/apps/authentication/users_api.py` | 252 | `phone_verify_request` has no audit logging. **Still open.** | Audit logging | Add `log_action(...)` on success. |
| 7 | `backend/apps/authentication/users_api.py` | 304 | `phone_verify_confirm` has no audit logging. **Still open.** | Audit logging | Add `log_action(...)` on success. |
| 8 | `backend/apps/customers/portal_api.py` | 172 | `generate_portal_password` public endpoint has no audit logging. **Still open.** | Audit logging | Add `log_action(...)` (do not log the password). |
| 9 | `backend/apps/customers/portal_api.py` | 233 | `portal_login` has no audit logging. **Still open.** | Audit logging | Add `log_action(...)` on success. |
| 10 | `backend/apps/customers/api.py` | 254 | `resend_pass_email` public endpoint has no audit logging. **Still open.** | Audit logging | Add `log_action(...)` on success. |
| 11 | `backend/apps/api/upload_api.py` | 66 | Docstring says "up to 5MB", but `MAX_FILE_SIZE = 10 * 1024 * 1024` (10MB). Error message also incorrectly states "5MB". **Still open.** | Consistency / Validation | Align docstring, constant, and error message to 10MB (or reduce to 5MB if that is the intended limit). |
| 12 | `backend/common/middleware.py` | 43 | `RequestIDMiddleware` reuses upstream `X-Request-ID` header without validation or sanitization. A malicious upstream could inject arbitrarily long or malformed IDs. | Input validation | Validate/sanitize the header value (e.g., UUID format or max 64 chars). |
| 13 | `backend/apps/customers/api.py` | 139 | `import_customers` validates file size but does not validate MIME type or file magic bytes before passing to the import service. **Still open.** | Input validation | Add content-type / magic byte validation in addition to the extension check. |
| 14 | `backend/apps/tenants/api.py` | 233 | `update_location` manually parses `request.body` with `json.loads()` instead of using Ninja's automatic schema binding. | Validation / Maintainability | Use `payload: LocationUpdateIn` as a Ninja parameter so schema validation runs automatically. |
| 15 | `backend/apps/tenants/super_admin_api/tenants.py` | 281 | `update_tenant_admin` manually parses `request.body` with `json.loads()` instead of using Ninja's automatic schema binding. | Validation / Maintainability | Use automatic Ninja schema parameters instead of `json.loads(request.body)`. |
| 16 | `backend/apps/agent_api/api.py` | 202 | `get_recent_transactions` calls `txns.count()` on a sliced queryset (`[:50]`). In Django this may execute an unbounded COUNT query or raise an error depending on the ORM version. **Still open.** | Performance / Correctness | Count the full queryset before slicing, or log `len(items)` after slicing. |
| 17 | `backend/apps/cards/api.py` | 473 | `program_members` accepts `limit` with no upper bound. **Still open.** | Input validation / DoS | Cap `limit` to a maximum (e.g., 500). |
| 18 | `backend/apps/cards/api.py` | 493 | `program_transactions` accepts `limit` with no upper bound. **Still open.** | Input validation / DoS | Cap `limit` to a maximum (e.g., 500). |
| 19 | `backend/apps/backup/api/jobs.py` | 323 | ~~`run_cleanup` triggers a destructive Celery task but has no audit logging.~~ **RESOLVED** — `_audit()` helper now logs cleanup actions. | Audit logging | N/A |

---

## Positive Findings

The codebase has many strong security patterns that should be preserved and expanded:

- **Tenant isolation is consistently enforced.** Nearly every tenant-scoped detail endpoint uses `tenant=request.tenant` or `get_object_or_404(Model, id=..., tenant=...)`, effectively preventing cross-tenant ID manipulation.
- **JWT authentication is well-implemented.** `JWTAuth` uses `select_related("tenant")` for a single-query hot path, filters by `is_active=True`, and derives the tenant from the user object (not request headers).
- **Rate limiting fails closed for auth endpoints.** When Redis/cache is unavailable, auth paths return HTTP 503 rather than allowing unchecked traffic.
- **IP extraction is safe.** `_get_client_ip()` uses `REMOTE_ADDR` only and explicitly avoids trusting `X-Forwarded-For` from arbitrary clients.
- **Impersonation is PIN-gated with lockout.** After 3 failed PIN attempts, the SUPER_ADMIN is locked out for 15 minutes. Justification is required and audit-logged.
- **File uploads are hardened.** The upload API validates extension, content-type, file size, and verifies image integrity with PIL before saving to S3/MinIO.
- **CSV exports are injection-safe.** `_sanitize_csv_cell()` prefixes formula-triggering characters (`=`, `+`, `-`, `@`) to prevent CSV injection.
- **Platform settings redact secrets automatically.** `_is_sensitive_platform_setting_key()` prevents secret-like values from leaking in settings list responses.
- **Plan enforcement is wired into mutations.** `check_plan_limit()`, `require_active_subscription`, and `check_feature_access()` are used on creation endpoints.
- **Payment webhooks verify signatures and enforce idempotency.** The payment webhook validates HMAC, rejects stale timestamps (>5 min), and deduplicates events via `WebhookEvent`.
- **Error messages use `get_message()` consistently** across the majority of backend endpoints (only a few portal endpoints deviate).
- **Audit logging added to several previously unaudited flows** since the original snapshot: `login`, `logout`, `change_password`, `add_team_member`, `update_team_member`, `delete_team_member`, `create_customer`, `import_customers`, public `enroll_customer`, `update_customer`, `delete_customer`, and all backup/restore/cleanup endpoints.

---

## Security Vulnerability Register

| Vulnerability | File | Line | Severity | Remediation |
|---------------|------|------|----------|-------------|
| Missing role validation in user invitation allows OWNER to create SUPER_ADMIN | `backend/apps/authentication/users_api.py` | 122 (role at 146) | P0 | Add `if payload.role not in (UserRole.MANAGER, UserRole.STAFF): raise HttpError(400, ...)` before creating the user. |
| Impersonation revocation cache key mismatch (broken revocation) | `backend/apps/tenants/super_admin_api/impersonation.py` | 156–163 | P0 | Use the impersonated owner's `user_id` as the cache key, not the SUPER_ADMIN's `request.user.id`. |
| `notify_top_buyers` allows MANAGER despite OWNER-only docstring | `backend/apps/analytics/advanced_api.py` | 215-217 | P1 | Enforce `is_owner(request)` or update the docstring to reflect intended access. |
| `search_customers` capped server-side but lacks API pagination | `backend/apps/customers/api.py` / `services/__init__.py` | 77 / 101 | P1 | Service now slices `[:50]`; add `limit`/`offset` to API or document the ceiling. |
| Wallet endpoints may bypass rate limiting | `backend/common/rate_limit.py` / `backend/loyallia/urls.py` | 165 / 316 / 39 | P1 | `/api/v1/wallet/` is covered, but `/wallet/apple/` (root-mounted) still bypasses. Add `/wallet/` to `RATE_LIMIT_RULES` or mount all wallet routes under `/api/v1/wallet/`. |
| Missing audit log on Google login | `backend/apps/authentication/api.py` | 285 | P1 | Add `log_action(..., action=AuditAction.LOGIN, ...)` before returning tokens. |
| Missing audit log on password reset | `backend/apps/authentication/api.py` | 239 | P1 | Add `log_action(...)` on successful password reset. |
| Excessive impersonation token TTL (60 min) | `backend/apps/tenants/super_admin_api/impersonation.py` | 126 | P1 | Reduce TTL to `timedelta(minutes=15)` or less. |
| Unbounded `limit`/`days` parameters causing expensive queries | `backend/apps/customers/api.py`, `backend/apps/transactions/api.py`, `backend/apps/analytics/api.py`, `backend/apps/analytics/advanced_api.py`, `backend/apps/cards/api.py` | 44, 241, 92, 39, 473, 493 | P1 | Cap `limit` to 500 and `days` to 365 across all analytics/list endpoints. |
| Multiple SUPER_ADMIN and OWNER mutations lack audit logging | `backend/apps/tenants/api.py`, `backend/apps/tenants/super_admin_api/tenants.py`, `backend/apps/tenants/super_admin_api/platform_plans.py`, `backend/apps/tenants/super_admin_api/platform.py` | 125, 201, 233, 294, 348, 400, 491, 514, 575, 46, 82, 111, 438 | P1 | Add `log_action(...)` wrappers to every mutation endpoint. |
| Missing audit log on authenticated enrollment | `backend/apps/customers/api.py` | 417 | P1 | Add `log_action(...)` after successful enrollment. |
| `invoice_data` may leak gateway secrets | `backend/apps/billing/payment_api.py` | 285 | P1 | Remove or sanitize the `invoice_data` field from API responses. |
| Hardcoded Spanish strings in portal API | `backend/apps/customers/portal_api.py` | 139-149, 189, 216, 251, 468 | P2 | Replace with `get_message(...)` calls. |
| `twilio_account_sid` exposed in integration preview | `backend/apps/tenants/super_admin_api/integration_config.py` | 367 | P2 | Redact Account SID in `preview_values`. |
| File upload size limit mismatch (5MB vs 10MB) | `backend/apps/api/upload_api.py` | 66 | P2 | Align docstring, constant, and error message. |
| Manual JSON parsing bypasses Ninja validation | `backend/apps/tenants/api.py`, `backend/apps/tenants/super_admin_api/tenants.py` | 233, 281 | P2 | Use Ninja's automatic schema parameters instead of `json.loads(request.body)`. |
| `.count()` on sliced queryset | `backend/apps/agent_api/api.py` | 202 | P2 | Count before slicing or use `len(items)` after slicing. |
| Missing audit logs on lower-risk public endpoints | `backend/apps/authentication/api.py`, `backend/apps/authentication/users_api.py`, `backend/apps/customers/portal_api.py`, `backend/apps/customers/api.py` | 70, 200, 225, 252, 304, 172, 233, 254 | P2 | Add `log_action(...)` to registration, email verification, password reset, phone verification, portal login, and pass resend endpoints. |
