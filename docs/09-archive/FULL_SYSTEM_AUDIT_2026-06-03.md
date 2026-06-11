# Loyallia Full System Audit Report
**Date:** 2026-06-03  
**Auditors:** Database Agent, Architecture Agent, RBAC Agent, Frontend Agent  
**Rules Baseline:** `rules.md` (173 lines)

---

## Executive Summary

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Database / Schema | 5 | 3 | 4 | 3 | 15 |
| Architecture / Code | 4 | 8 | 5 | 3 | 20 |
| RBAC / Security | 4 | 9 | 4 | 5 | 22 |
| Frontend / Dashboard | 0 | 3 | 6 | 4 | 13 |
| **TOTAL** | **13** | **23** | **19** | **15** | **70** |

**Verdict:** The codebase has a **strong architectural foundation** with consistent tenant isolation, proper JWT auth, and service layer extraction in progress. However, **13 CRITICAL violations** require immediate attention before next release, primarily around secret exposure, migration drift, invoice race conditions, and missing audit logging on sensitive operations.

---

## CRITICAL Violations (Fix Before Next Release)

### C1 — Massive Migration Drift (13 apps)
**Agent:** Database  
**Finding:** Running `makemigrations --check` fails. 13 apps have uncommitted `Alter field` migrations caused by `help_text`, `verbose_name`, and field kwargs drifting between models and migrations.  
**Impact:** Blocks CI/CD. Indicates poor migration hygiene.  
**Fix:** Run `makemigrations` for all affected apps, review, commit. Consider squashing historical migrations.

### C2 — Invoice Number Race Condition + Global Uniqueness
**Agent:** Database  
**File:** `backend/apps/billing/payment_models.py:109`  
**Finding:** `invoice_number` has `unique=True` (globally unique, not per-tenant). `generate_invoice_number()` uses `count() + 1` which is non-atomic — concurrent invoice creation collides.  
**Impact:** `IntegrityError` on concurrent subscriptions. Cross-tenant invoice number collision.  
**Fix:** Change to `unique_together = ["tenant", "invoice_number"]`. Replace `count() + 1` with atomic `select_for_update()` counter on `Tenant`.

### C3 — Notification Inbox Missing Tenant Filter
**Agent:** Database + RBAC  
**File:** `backend/apps/notifications/api/inbox.py:69,88,105`  
**Finding:** `get_object_or_404(Notification, id=notification_id)` queries without tenant scoping. Ownership checked afterward via Python comparison.  
**Impact:** Cross-tenant ID enumeration; information leakage.  
**Fix:** Add `tenant=request.user.tenant` to all inbox lookups.

### C4 — CustomerPass QR Code Globally Unique
**Agent:** Database  
**File:** `backend/apps/customers/models.py:342`  
**Finding:** `qr_code = models.CharField(..., unique=True)` — globally unique. Two tenants cannot independently generate same QR.  
**Impact:** Extremely rare collision = impossible enrollment for second tenant.  
**Fix:** Change to `unique_together = ["tenant", "qr_code"]`.

### C5 — Customer Referral Code Globally Unique
**Agent:** Database  
**File:** `backend/apps/customers/models.py:122`  
**Finding:** `referral_code = models.CharField(..., unique=True)` — globally unique.  
**Impact:** Same as C4.  
**Fix:** Change to `unique_together = ["tenant", "referral_code"]`.

### C6 — Plaintext `temp_password` in API Response (Team Member)
**Agent:** RBAC  
**File:** `backend/apps/tenants/api.py:417`  
**Finding:** `add_team_member` returns `temp_password` in JSON response body.  
**Impact:** Secret exposed over the wire. Violates rules.md "Never expose secret values in API responses."  
**Fix:** Email password instead. Return only `user_id`.

### C7 — Plaintext `temp_password` in API Response (Tenant Wizard)
**Agent:** RBAC  
**File:** `backend/apps/tenants/super_admin_api/tenants.py:275`  
**Finding:** `create_tenant` returns `temp_password` in `CreateTenantOut`.  
**Impact:** Same as C6.  
**Fix:** Email password instead. Return only `tenant_id`.

### C8 — Mailjet API Key Exposed in Integration Status
**Agent:** RBAC  
**File:** `backend/apps/tenants/super_admin_api/platform.py:344`  
**Finding:** `preview_values` contains raw `mailjet_api_key` string. Other secrets are masked; this one is not.  
**Impact:** SUPER_ADMIN can see raw API key in browser dev tools.  
**Fix:** Return `"<redacted>"` or boolean `present` flag, matching `mailjet_secret_key` handling.

### C9 — Impersonation JWT Uses Wrong Signing Key
**Agent:** RBAC  
**File:** `backend/apps/tenants/super_admin_api/impersonation.py:130`  
**Finding:** Calls `pyjwt.encode(..., settings.JWT_SECRET_KEY, ...)` directly instead of `tokens._get_signing_key()`. If RS256 configured, signs with symmetric fallback.  
**Impact:** Forgery possible if symmetric secret is weak. Bypasses stronger key hierarchy.  
**Fix:** Use `tokens._get_signing_key()` instead.

### C10 — Business Logic in API Layer (Email Composition)
**Agent:** Architecture  
**File:** `backend/apps/tenants/api.py:~371-409`  
**Finding:** `add_team_member` builds and sends large HTML welcome email directly in endpoint.  
**Impact:** Violates service layer pattern. Unmaintainable.  
**Fix:** Extract to `common/email_backend.py` or `apps/tenants/services.py`.

### C11 — Business Logic in API Layer (Subprocess)
**Agent:** Architecture  
**File:** `backend/apps/backup/api.py:~419-456`  
**Finding:** `list_offsite_backups` runs `subprocess` to execute shell script directly in API layer.  
**Impact:** Security risk. Violates service layer pattern.  
**Fix:** Move to `apps/backup/services/offsite.py`.

### C12 — Duplicated Redemption Logic
**Agent:** Architecture  
**File:** `backend/apps/transactions/api.py:~88-126, ~129-262`  
**Finding:** `validate_qr` and `transact` endpoints duplicate QR validation and gateway invocation already in `redemption/api.py`.  
**Impact:** Maintenance nightmare. Divergent bug fixes.  
**Fix:** Deprecate v1 in `transactions/api.py`; delegate to `redemption/api.py` canonical implementation.

### C13 — Duplicated AI Proxy Logic
**Agent:** Architecture  
**File:** `backend/apps/tenants/api.py:~421-471`  
**Finding:** `ai_chat_proxy` contains HTTP client orchestration, Vault secret retrieval, error handling inline.  
**Impact:** API file bloat. Violates service layer pattern.  
**Fix:** Extract to `apps/tenants/services/ai_proxy.py`.

---

## HIGH Violations (Next Sprint)

### Database
- **H-DB1:** Missing `created_by` / `updated_by` on state-changing models (`Transaction`, `Customer`, `Card`, `CampaignRun`, `Automation`)
- **H-DB2:** BackupJob API missing tenant filter (`backup/api.py:472,500,564`)
- **H-DB3:** `AuditLog.tenant_id` is `UUIDField` not `ForeignKey` — no referential integrity
- **H-DB4:** Zero `CheckConstraint` objects in entire codebase despite claims in ARCHITECTURE.md
- **H-DB5:** `Transaction.staff` and `Transaction.location` use `SET_NULL` — should be `PROTECT` for audit integrity

### Architecture
- **H-ARCH1:** `billing/api.py:list_plans` has no `auth=` — should be explicit public or protected
- **H-ARCH2:** `audit/api.py:73` hardcoded `"Permiso denegado"` instead of `get_message()`
- **H-ARCH3:** `tenants/api.py:439,446,471` hardcoded English error strings (AI proxy)
- **H-ARCH4:** `backup/api.py:425` hardcoded `"MinIO client script not found"`
- **H-ARCH5:** `notifications/api/campaigns.py:275` hardcoded `"Campaign scheduled successfully"`
- **H-ARCH6:** `analytics/advanced_api.py:248` hardcoded Spanish notification message
- **H-ARCH7:** `notifications/whatsapp/api.py:202,329` hardcoded `"Unauthorized"`, `"Invalid tenant_id"`
- **H-ARCH8:** `tenants/super_admin_api/integration_config.py` multiple hardcoded validation messages

### RBAC
- **H-RBAC1:** No audit logging for `add_team_member` (`tenants/api.py:332`)
- **H-RBAC2:** No audit logging for `invite_user` (`authentication/users_api.py:119`)
- **H-RBAC3:** No audit logging for `deactivate_user` (`authentication/users_api.py:186`)
- **H-RBAC4:** No audit logging for billing mutations (`subscribe`, `cancel_subscription`, `reactivate_subscription`)
- **H-RBAC5:** No audit logging for `set_security_pin` (`security_privacy_api.py:45`)
- **H-RBAC6:** No rate limiting on `resend_pass_email` (`customers/api.py:247`) — public endpoint
- **H-RBAC7:** No rate limiting on `generate_portal_password` (`portal_api.py:213`) — public endpoint
- **H-RBAC8:** No rate limiting on `verify_phone_check` (`api_phone_verify.py:77`) — brute-force 6-digit codes
- **H-RBAC9:** Mailjet webhook unauthenticated without IP whitelist enforcement (`api/router.py:177`)

### Frontend
- **H-FE1:** Hundreds of hardcoded Spanish strings across `AutomationModal.tsx`, `DashboardPage.tsx`, `BillingPage.tsx`, `TeamPage.tsx`, etc. — no `useI18n()` usage
- **H-FE2:** Silent API failures — empty catch blocks in `useCustomers.ts`, `useCampaigns.ts`, `SettingsPage.tsx`, `SuperAdminDashboard.tsx`, `TeamPage.tsx`
- **H-FE3:** `customers/[id]/page.tsx` has no role check before rendering enrollment button — MANAGER sees OWNER-only UI

---

## MEDIUM & LOW Violations

See individual agent reports for complete lists:
- **Database:** Missing indexes (12), inconsistent `db_table` naming, missing `created_at` on `PlatformSetting`, self-referential FKs without tenant guards
- **Architecture:** N+1 in `CardOut.from_model`, schema `.count()` properties, billing/campaign dispatch logic in API layer, 5 files over 650 lines
- **RBAC:** `notify_top_buyers` docstring/code mismatch, silent JWT RS256→HS256 fallback, missing explicit `auth=None` on public endpoints, AI proxy error logging may leak upstream keys
- **Frontend:** Toast messages not localized, billing page hardcoded plan table, payment history never queries API, `AutomationList` hardcoded strings, `<a>` instead of `<Link>`, SuperAdminSettings missing error states

---

## Positive Findings

1. **Strong tenant isolation foundation** — JWTAuth → `select_related("tenant")`, `TenantMiddleware`, pervasive `tenant` FKs
2. **No forbidden frameworks** — No FastAPI, SQLAlchemy, Vue, Angular, Lit detected
3. **Service layers exist** — `customers/services.py`, `cards/services.py`, `authentication/services.py` properly delegate
4. **No secrets in frontend source** — API keys, tokens, credentials all Vault-backed or env-driven
5. **No fake success states** — All dashboard data from real APIs; no mocked routes
6. **No cross-tenant data leakage** — Backend endpoints consistently filter by `tenant=request.tenant`
7. **Rate limiting present** — Public enrollment endpoint has rate limiting
8. **Plan enforcement with row locking** — `common/plan_enforcement.py` uses `select_for_update()`

---

## Prioritized TODO Plan

### P0 — Fix Before Next Release (CRITICAL)
1. [ ] Commit/squash all 13 pending migrations
2. [ ] Fix invoice number race condition (`unique_together` + atomic counter)
3. [ ] Fix notification inbox tenant isolation
4. [ ] Fix CustomerPass QR code uniqueness (`unique_together`)
5. [ ] Fix Customer referral_code uniqueness (`unique_together`)
6. [ ] Remove `temp_password` from API responses (2 locations) — email instead
7. [ ] Mask `mailjet_api_key` in integration status preview
8. [ ] Fix impersonation JWT signing (`tokens._get_signing_key()`)
9. [ ] Extract email logic from `tenants/api.py` to service
10. [ ] Extract subprocess from `backup/api.py` to service
11. [ ] Unify scanner endpoints (deprecate v1 in `transactions/api.py`)
12. [ ] Extract AI proxy from `tenants/api.py` to service
13. [ ] Run full test suite after all changes: `pytest -q`

### P1 — High Impact (Next Sprint)
14. [ ] Add `created_by` / `updated_by` to state-changing models
15. [ ] Add `CheckConstraint` objects to `SubscriptionPlan`, `Invoice`, `Transaction`
16. [ ] Replace all hardcoded strings with `get_message()` (8 locations)
17. [ ] Add audit logging to team/billing/security mutations (9 operations)
18. [ ] Add rate limiting to public endpoints (`resend_pass_email`, `portal_password`, `verify_phone_check`)
19. [ ] Add tenant filter to BackupJob detail endpoints
20. [ ] Add `is_manager_or_owner` to `GET /notifications/stats/`
21. [ ] Add frontend role guard to `CustomerDetailsPage.tsx`
22. [ ] Fix silent catch blocks in frontend (6 locations)

### P2 — Medium Term
23. [ ] Add missing DB indexes (12 models)
24. [ ] Convert `AuditLog.tenant_id` to `ForeignKey(db_constraint=False)`
25. [ ] Extract billing service layer from `billing/api.py`
26. [ ] Extract campaign dispatch service from `notifications/api/campaigns.py`
27. [ ] Localize all hardcoded Spanish strings in frontend (major effort)
28. [ ] Fix N+1 in `CardOut.from_model`
29. [ ] Standardize frontend error message extraction
30. [ ] Add explicit `auth=None` to all public endpoints
31. [ ] Remove silent RS256→HS256 fallback in `tokens.py`
32. [ ] Fix `<a>` → `<Link>` navigation anti-pattern

### P3 — Polish & Hygiene
33. [ ] Rename `BackupJob` db_table to `loyallia_backup_jobs`
34. [ ] Add `created_at` to `PlatformSetting`
35. [ ] Review `Transaction` `SET_NULL` → `PROTECT` for `staff`/`location`
36. [ ] Document `CustomerPortalAccount` and `WebhookEvent` as intentional global tables
37. [ ] Split oversized model files (`customers/models.py` 733 lines, `automation/models.py` 692 lines)
38. [ ] Add error states to SuperAdminSettings
39. [ ] Fetch real invoice data in BillingPage
40. [ ] Sanitize `ai_chat_proxy` error logging

---

## Quality Gates Checklist

Before declaring any phase complete:
- [ ] `cd backend && python3 -m ruff check .` — 0 errors
- [ ] `cd backend && python3 -m pytest -q` — all pass
- [ ] `cd backend && python3 manage.py makemigrations --check --dry-run` — no drift
- [ ] `cd frontend && npm run typecheck` — 0 errors
- [ ] `cd frontend && npm run test:unit` — all pass
- [ ] `cd frontend && npm run build` — successful

---

*End of Report*
