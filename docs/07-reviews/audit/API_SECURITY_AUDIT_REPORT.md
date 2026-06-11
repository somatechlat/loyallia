# API Design & Security Audit Report

**Audited:** 2026-06-04
**Auditor:** API Design & Security Audit Agent
**Scope:** All Django Ninja API routers, auth layer, permissions, rate limiting, middleware, and portal APIs.

---

## Executive Summary

- **Files audited:** 29 API files + 6 common/auth infrastructure files
- **Issues found:** 46 (P0: 2, P1: 25, P2: 19)

The Loyallia backend demonstrates strong tenant isolation, solid JWT authentication, and good use of plan enforcement. However, two **critical (P0)** vulnerabilities were found: a broken impersonation revocation mechanism and missing role validation in user invitation that could allow an OWNER to create SUPER_ADMIN users. Additionally, numerous high-privilege mutations lack audit logging, and several public endpoints lack dedicated rate limiting.

---

## Critical Security Issues (P0)

| # | File | Line | Issue | CWE/Rule | Suggested Fix |
|---|------|------|-------|----------|---------------|
| 1 | `backend/apps/authentication/users_api.py` | 145 | `invite_user` creates a user with `role=payload.role` without validating the role. An OWNER can invite a SUPER_ADMIN (or create another OWNER), violating role hierarchy restrictions. | CWE-269 / "OWNER must not be able to create or promote SUPER_ADMIN users" | Validate `payload.role` is only `MANAGER` or `STAFF`, identical to `tenants/api.py:add_team_member`. |
| 2 | `backend/apps/tenants/super_admin_api/impersonation.py` | 163 | `revoke_impersonation` sets cache key `impersonation:{request.user.id}` (the SUPER_ADMIN's ID), but `tokens.py:decode_access_token` checks `impersonation:{payload["user_id"]}` (the impersonated OWNER's ID). Revocation never actually invalidates the token. | CWE-287 / Impersonation guarding | In `revoke_impersonation`, set the cache key using the **impersonated owner's user ID** (passed in the request body or from the active impersonation session), not `request.user.id`. |

---

## Important Issues (P1)

| # | File | Line | Issue | Rule Violated | Suggested Fix |
|---|------|------|-------|---------------|---------------|
| 1 | `backend/apps/analytics/advanced_api.py` | 215 | `notify_top_buyers` docstring claims "OWNER only", but the endpoint uses `is_manager_or_owner(request)`, allowing MANAGER to send bulk push notifications. | Role restrictions | Change check to `is_owner(request)` or update the docstring if MANAGER is intended. |
| 2 | `backend/apps/customers/api.py` | 77-100 | `search_customers` delegates to `services.search_customers()` with no pagination limit enforced in the API layer. A broad query could return an unbounded result set, causing memory exhaustion / DoS. | Input validation / DoS | Enforce a maximum limit (e.g., `max_results=50`) in the service call or API layer. |
| 3 | `backend/common/rate_limit.py` | 281 | `RateLimitMiddleware` only checks `path.startswith("/api/")`. `CSRFExemptAPIMiddleware` explicitly exempts `/wallet/apple/`, indicating wallet endpoints may be mounted outside `/api/`, bypassing rate limiting entirely. | Rate limiting | Add a rate-limit rule for `/wallet/` prefix, or ensure all wallet routes are mounted under `/api/v1/wallet/`. |
| 4 | `backend/apps/authentication/api.py` | 283 | `google_login` issues tokens on success but never writes an audit log entry for the login event. | Audit logging | Add `log_action(..., action=AuditAction.LOGIN, ...)` before returning tokens. |
| 5 | `backend/apps/authentication/api.py` | 239 | `reset_password` successfully changes a user's password but does not emit an audit log. Security-critical mutations must be auditable. | Audit logging | Add `log_action(..., action=AuditAction.UPDATE, resource_type="user_password", ...)` on success. |
| 6 | `backend/apps/tenants/super_admin_api/impersonation.py` | 127 | Impersonation access token TTL is 60 minutes (`timedelta(minutes=60)`). For high-privilege impersonation, this is excessive. | JWT token handling / Impersonation guarding | Reduce TTL to 15 minutes (or less) for impersonation tokens. |
| 7 | `backend/apps/tenants/api.py` | 125 | `update_tenant` (PATCH `/me/`) mutates tenant branding data but has no audit logging. | Audit logging | Add `log_action(...)` capturing changed fields. |
| 8 | `backend/apps/tenants/api.py` | 201 | `create_location` mutates location data but has no audit logging. | Audit logging | Add `log_action(...)` after creation. |
| 9 | `backend/apps/tenants/api.py` | 233 | `update_location` mutates location data but has no audit logging. | Audit logging | Add `log_action(...)` after update. |
| 10 | `backend/apps/tenants/api.py` | 294 | `delete_location` mutates location data but has no audit logging. | Audit logging | Add `log_action(...)` after deletion. |
| 11 | `backend/apps/customers/api.py` | 410 | `enroll_customer` (auth enrollment) creates a `CustomerPass` but has no audit logging. | Audit logging | Add `log_action(..., action=AuditAction.CREATE, resource_type="enrollment", ...)` on success. |
| 12 | `backend/apps/analytics/advanced_api.py` | 213 | `notify_top_buyers` creates `Notification` records in bulk but has no audit logging. | Audit logging | Add `log_action(...)` recording count and channel. |
| 13 | `backend/apps/customers/api.py` | 42 | `list_customers` accepts `limit` with no upper bound. A malicious client can request `limit=999999`, causing a heavy query. | Input validation / DoS | Cap `limit = max(1, min(limit, 500))` (pattern already used in `audit/api.py`). |
| 14 | `backend/apps/transactions/api.py` | 241 | `list_transactions` accepts `limit` with no upper bound. | Input validation / DoS | Cap `limit` to a reasonable maximum (e.g., 500). |
| 15 | `backend/apps/analytics/api.py` | 92 | `get_overview_analytics` accepts `days` with no upper bound. A very large value causes an expensive date-range query. | Input validation / DoS | Cap `days` to a reasonable maximum (e.g., 365 or 730). |
| 16 | `backend/apps/analytics/advanced_api.py` | 39 | `get_revenue_breakdown` accepts `days` with no upper bound. | Input validation / DoS | Cap `days` to a reasonable maximum. |
| 17 | `backend/apps/tenants/super_admin_api/tenants.py` | 513 | `extend_trial` is a billing mutation with no audit logging. | Audit logging | Add `log_action(...)` after extending the trial. |
| 18 | `backend/apps/tenants/super_admin_api/tenants.py` | 399 | `suspend_tenant` is a destructive state mutation with no audit logging (only `logger.warning`). | Audit logging | Add `log_action(..., action=AuditAction.UPDATE, resource_type="tenant", ...)` on success. |
| 19 | `backend/apps/tenants/super_admin_api/tenants.py` | 490 | `reactivate_tenant` is a state mutation with no audit logging (only `logger.info`). | Audit logging | Add `log_action(...)` on success. |
| 20 | `backend/apps/tenants/super_admin_api/tenants.py` | 575 | `set_whatsapp_override` modifies a tenant limit with no audit logging (only `logger.info`). | Audit logging | Add `log_action(...)` on success. |
| 21 | `backend/apps/tenants/super_admin_api/platform_plans.py` | 46 | `create_plan` mutates global subscription plans with no audit logging (only `logger.info`). | Audit logging | Add `log_action(...)` on success. |
| 22 | `backend/apps/tenants/super_admin_api/platform_plans.py` | 81 | `delete_plan` (soft-delete) mutates global plans with no audit logging. | Audit logging | Add `log_action(...)` on success. |
| 23 | `backend/apps/tenants/super_admin_api/platform_plans.py` | 110 | `update_plan` mututes global plan configuration with no audit logging (only `logger.info`). | Audit logging | Add `log_action(...)` on success. |
| 24 | `backend/apps/tenants/super_admin_api/platform.py` | 437 | `update_platform_setting` mutates runtime settings with no audit logging. | Audit logging | Add `log_action(...)` on success. |
| 25 | `backend/apps/billing/payment_api.py` | 261 | `get_invoice` returns raw `invoice_data` JSON field, which may contain gateway response secrets (raw API responses, card tokens, etc.). | No secrets in API responses | Redact or exclude the `invoice_data` field from the response schema, or sanitize it before returning. |

---

## Minor Issues (P2)

| # | File | Line | Issue | Rule Violated | Suggested Fix |
|---|------|------|-------|---------------|---------------|
| 1 | `backend/apps/customers/portal_api.py` | 189, 196, 216, 250, 377, 445, 498 | Multiple hardcoded Spanish strings instead of `get_message()` (e.g., `"Si tu correo está registrado..."`, `"Bienvenido a tu portal de cliente."`). | Error messages use `get_message()` | Replace all hardcoded strings with `get_message("PORTAL_...")` codes. |
| 2 | `backend/apps/tenants/super_admin_api/integration_config.py` | 367 | `preview_values` returns `twilio_account_sid` directly from Vault without redaction. While Account SIDs are public-ish identifiers, they should still be treated as sensitive configuration metadata. | No secrets in API responses | Redact Account SID with `<redacted>` or move it to diagnostics only. |
| 3 | `backend/apps/authentication/api.py` | 67 | `register` creates a new tenant + owner atomically but does not emit an audit log. | Audit logging | Add `log_action(..., action=AuditAction.CREATE, resource_type="tenant", ...)` on success. |
| 4 | `backend/apps/authentication/api.py` | 200 | `verify_email` marks email as verified but has no audit logging. | Audit logging | Add `log_action(...)` on success. |
| 5 | `backend/apps/authentication/api.py` | 224 | `forgot_password` triggers an email but has no audit logging. | Audit logging | Add `log_action(...)` on request. |
| 6 | `backend/apps/authentication/users_api.py` | 246 | `phone_verify_request` has no audit logging. | Audit logging | Add `log_action(...)` on success. |
| 7 | `backend/apps/authentication/users_api.py` | 298 | `phone_verify_confirm` has no audit logging. | Audit logging | Add `log_action(...)` on success. |
| 8 | `backend/apps/customers/portal_api.py` | 166 | `generate_portal_password` public endpoint has no audit logging. | Audit logging | Add `log_action(...)` (do not log the password). |
| 9 | `backend/apps/customers/portal_api.py` | 225 | `portal_login` has no audit logging. | Audit logging | Add `log_action(...)` on success. |
| 10 | `backend/apps/customers/api.py` | 246 | `resend_pass_email` public endpoint has no audit logging. | Audit logging | Add `log_action(...)` on success. |
| 11 | `backend/apps/api/upload_api.py` | 62 | Docstring says "up to 5MB", but `MAX_FILE_SIZE = 10 * 1024 * 1024` (10MB). Error message also incorrectly states "5MB". | Consistency / Validation | Align docstring, constant, and error message to 10MB (or reduce to 5MB if that is the intended limit). |
| 12 | `backend/common/middleware.py` | 43 | `RequestIDMiddleware` reuses upstream `X-Request-ID` header without validation or sanitization. A malicious upstream could inject arbitrarily long or malformed IDs. | Input validation | Validate/sanitize the header value (e.g., UUID format or max 64 chars). |
| 13 | `backend/apps/customers/api.py` | 137 | `import_customers` validates file size but does not validate MIME type or file magic bytes before passing to the import service. | Input validation | Add content-type / magic byte validation in addition to the extension check. |
| 14 | `backend/apps/tenants/api.py` | 233 | `update_location` manually parses `request.body` with `json.loads()` instead of using Ninja's automatic schema binding. | Validation / Maintainability | Use `payload: LocationUpdateIn` as a Ninja parameter so schema validation runs automatically. |
| 15 | `backend/apps/tenants/super_admin_api/tenants.py` | 281 | `update_tenant_admin` manually parses `request.body` with `json.loads()` instead of using Ninja's automatic schema binding. | Validation / Maintainability | Use automatic Ninja schema binding. |
| 16 | `backend/apps/agent_api/api.py` | 204 | `get_recent_transactions` calls `txns.count()` on a sliced queryset (`[:50]`). In Django this may execute an unbounded COUNT query or raise an error depending on the ORM version. | Performance / Correctness | Count the full queryset before slicing, or log `len(items)` after slicing. |
| 17 | `backend/apps/cards/api.py` | 428 | `program_members` accepts `limit` with no upper bound. | Input validation / DoS | Cap `limit` to a maximum (e.g., 500). |
| 18 | `backend/apps/cards/api.py` | 443 | `program_transactions` accepts `limit` with no upper bound. | Input validation / DoS | Cap `limit` to a maximum (e.g., 500). |
| 19 | `backend/apps/backup/api.py` | 698 | `run_cleanup` triggers a destructive Celery task but has no audit logging. | Audit logging | Add `log_action(...)` before returning. |

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

---

## Security Vulnerability Register

| Vulnerability | File | Line | Severity | Remediation |
|---------------|------|------|----------|-------------|
| Missing role validation in user invitation allows OWNER to create SUPER_ADMIN | `backend/apps/authentication/users_api.py` | 145 | P0 | Add `if payload.role not in (UserRole.MANAGER, UserRole.STAFF): raise HttpError(400, ...)` before creating the user. |
| Impersonation revocation cache key mismatch (broken revocation) | `backend/apps/tenants/super_admin_api/impersonation.py` | 163 | P0 | Use the impersonated owner's `user_id` as the cache key, not the SUPER_ADMIN's `request.user.id`. |
| `notify_top_buyers` allows MANAGER despite OWNER-only docstring | `backend/apps/analytics/advanced_api.py` | 215 | P1 | Enforce `is_owner(request)` or update the docstring to reflect intended access. |
| Unbounded `search_customers` results (DoS) | `backend/apps/customers/api.py` | 77-100 | P1 | Enforce `max_results=50` (or similar) in the service/API layer. |
| Wallet endpoints may bypass rate limiting | `backend/common/rate_limit.py` | 281 | P1 | Add `/wallet/` to `RATE_LIMIT_RULES` or mount wallet routes under `/api/v1/wallet/`. |
| Missing audit log on Google login | `backend/apps/authentication/api.py` | 283 | P1 | Add `log_action(..., action=AuditAction.LOGIN, ...)` before returning tokens. |
| Missing audit log on password reset | `backend/apps/authentication/api.py` | 239 | P1 | Add `log_action(...)` on successful password reset. |
| Excessive impersonation token TTL (60 min) | `backend/apps/tenants/super_admin_api/impersonation.py` | 127 | P1 | Reduce TTL to `timedelta(minutes=15)` or less. |
| Unbounded `limit`/`days` parameters causing expensive queries | `backend/apps/customers/api.py`, `backend/apps/transactions/api.py`, `backend/apps/analytics/api.py`, `backend/apps/analytics/advanced_api.py`, `backend/apps/cards/api.py` | 42, 241, 92, 39, 428, 443 | P1 | Cap `limit` to 500 and `days` to 365 across all analytics/list endpoints. |
| Multiple SUPER_ADMIN and OWNER mutations lack audit logging | `backend/apps/tenants/api.py`, `backend/apps/tenants/super_admin_api/tenants.py`, `backend/apps/tenants/super_admin_api/platform_plans.py`, `backend/apps/tenants/super_admin_api/platform.py` | 125, 201, 233, 294, 399, 490, 513, 575, 46, 81, 110, 437 | P1 | Add `log_action(...)` wrappers to every mutation endpoint. |
| Missing audit log on authenticated enrollment | `backend/apps/customers/api.py` | 410 | P1 | Add `log_action(...)` after successful enrollment. |
| `invoice_data` may leak gateway secrets | `backend/apps/billing/payment_api.py` | 261 | P1 | Remove or sanitize the `invoice_data` field from API responses. |
| Hardcoded Spanish strings in portal API | `backend/apps/customers/portal_api.py` | 189, 196, 216, 250, 377, 445, 498 | P2 | Replace with `get_message(...)` calls. |
| `twilio_account_sid` exposed in integration preview | `backend/apps/tenants/super_admin_api/integration_config.py` | 367 | P2 | Redact Account SID in `preview_values`. |
| File upload size limit mismatch (5MB vs 10MB) | `backend/apps/api/upload_api.py` | 62 | P2 | Align docstring, constant, and error message. |
| Manual JSON parsing bypasses Ninja validation | `backend/apps/tenants/api.py`, `backend/apps/tenants/super_admin_api/tenants.py` | 233, 281 | P2 | Use Ninja's automatic schema parameters instead of `json.loads(request.body)`. |
| `.count()` on sliced queryset | `backend/apps/agent_api/api.py` | 204 | P2 | Count before slicing or use `len(items)` after slicing. |
| Missing audit logs on lower-risk public endpoints | `backend/apps/authentication/api.py`, `backend/apps/authentication/users_api.py`, `backend/apps/customers/portal_api.py`, `backend/apps/customers/api.py` | 67, 200, 224, 246, 298, 166, 225, 246 | P2 | Add `log_action(...)` to registration, email verification, password reset, phone verification, portal login, and pass resend endpoints. |
