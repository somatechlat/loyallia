> **Estado del documento (2026-06-11):** Revisión basada en el código y documentación vigente.
> Algunos hallazgos pueden haber cambiado; verificar siempre contra el código fuente.
>
> **Snapshot disclaimer:** Los conteos y la tabla de brechas de cobertura reflejan el estado del repositorio en la fecha del audit. Los valores históricos se conservan con su contexto; los conteos actualizados se verificaron contra el árbol de trabajo actual.

# QA & Testing Audit Report

**Audited:** 2026-06-04  
**Auditor:** QA & Testing Audit Agent  
**Scope:** Backend tests, Frontend tests, E2E tests, Docker Compose test configs, CI/CD, API endpoint coverage

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Files audited | 62 |
| Backend test files | 42 |
| Frontend unit test files | 7 |
| Frontend E2E test files | 32 |
| Docker Compose configs | 3 |
| CI/CD workflow files | 0 |
| **Issues found** | **37** |
| P0 (Critical) | 12 |
| P1 (Important) | 14 |
| P2 (Minor) | 11 |

The Loyallia project has a solid foundation of backend tests covering authentication, billing models, plan enforcement, automation logic, concurrency, and security guardrails. However, there are **critical coverage gaps** in production-facing API endpoints (billing mutations, backup, agent API, Apple Wallet Web Service, upload, portal), **no CI/CD automation**, and **mocked APIs are used as proof of production readiness** in scanner and wallet tests. Several E2E tests create persistent data without cleanup.

---

## Critical Issues (P0)

| # | File | Line | Issue | Rule Violated | Suggested Fix |
|---|------|------|-------|---------------|---------------|
| 1 | `backend/tests/test_scanner.py` | 232–245 | `RedemptionGateway` is **mocked** with `MagicMock`/`patch` in the `transact` test. The scanner's transaction endpoint is not exercised through real code paths. | No mocked APIs as production-readiness proof | Replace with real `RedemptionGateway` invocation or move to a true integration test that hits the actual endpoint via Django test client with JWT auth. |
| 2 | `backend/tests/test_scanner.py` | 44–57, 150–213 | `validate_qr` and `transact` are called with `MagicMock` requests and `patch("apps.transactions.api.is_staff_or_above", return_value=True)`. Auth is completely bypassed. | No mocked APIs as production-readiness proof; No stubs/shims | Use Django test client with real JWT tokens (see `_get_auth_header` in `test_api.py`) and real `@require_role` enforcement. |
| 3 | `backend/tests/test_wallet.py` | 286–313 | `get_wallet_status` is tested with `patch.object(CustomerPass.objects, "select_related")` returning a `MagicMock` pass. The wallet API is never called with real DB objects. | No mocked APIs as production-readiness proof | Rewrite as a Django test-client integration test that creates a real `CustomerPass`, hits the endpoint, and asserts on the real response. |
| 4 | `.github/workflows/` | — | **No CI/CD workflows exist.** There is no `.github/workflows/` directory. Quality gates (`ruff check`, `pytest -q`, `npm run typecheck`, `npm run test:unit`, `npm run build`) are not automated. | CI gates must match Quality Gates section | Create `.github/workflows/ci.yml` that runs all five quality gates on every PR and push to main. |
| 5 | `backend/tests/test_api.py` / `backend/tests/test_api_plan_limits.py` | 24–42 / 30–42 | `_get_auth_header` is **duplicated verbatim** in two test files. | Maintainability / DRY | Extract into `tests/helpers.py` and import in both modules. |
| 6 | `backend/tests/test_billing.py` | — | No integration tests for billing **mutation** endpoints: `POST /billing/subscribe/`, `PUT /billing/subscription/`, `POST /billing/subscription/cancel/`, `POST /billing/subscription/reactivate/`. | Every mutation endpoint has at least one test | Add Django test-client integration tests for subscribe, cancel, reactivate, and update subscription. |
| 7 | `backend/apps/backup/api.py` | — | **Zero tests** for 9 backup/restore endpoints (`/admin/backups/`). | Every mutation endpoint has at least one test | Add tests for backup list, create, restore, download, delete, schedule, and settings. |
| 8 | `backend/apps/agent_api/api.py` | — | **Zero tests** for 5 agent API endpoints (`/agent/recent-transactions/`, `/agent/customer-insights/`, etc.). | Every mutation endpoint has at least one test | Add tests for each agent endpoint, including auth/role boundaries. |
| 9 | `backend/apps/api/upload_api.py` | — | **Zero tests** for upload endpoints (`/upload/`). | Every mutation endpoint has at least one test | Add tests for file upload validation, size limits, and MIME type checks. |
| 10 | `backend/apps/customers/portal_api.py` | — | **Zero tests** for customer portal endpoints (`/portal/`). | Coverage gaps for critical paths | Add tests for portal customer lookup, pass display, and enrollment. |
| 11 | `backend/apps/customers/export_api.py` | — | **Zero tests** for customer export endpoint (`/customers/export/`). | Every mutation endpoint has at least one test | Add test for CSV/Excel export endpoint with real data. |
| 12 | `backend/apps/tenants/security_privacy_api.py` | — | **Zero tests** for tenant security/privacy endpoints (`/tenants/privacy/`). | Coverage gaps for critical paths | Add tests for consent banner config, privacy policy, and data retention settings. |

---

## Important Issues (P1)

| # | File | Line | Issue | Rule Violated | Suggested Fix |
|---|------|------|-------|---------------|---------------|
| 1 | `frontend/tests/e2e/suite/02-programs.spec.ts` | 46–63 | Creates a program named `"E2E Test Stamps"` via the wizard but **never cleans it up**. | E2E tests clean up their own data | Add an `afterAll` or final test step that deletes the created program via API using the OWNER token. |
| 2 | `frontend/tests/e2e/suite/27-tenant-creation-wizard.spec.ts` | 12–55 | Creates a tenant `"E2E Tenant ${suffix}"` and owner via the 4-step wizard but **never deletes the tenant**. | E2E tests clean up their own data | Add cleanup in `afterAll` that calls `DELETE /api/v1/admin/tenants/{id}/` to remove the test tenant. |
| 3 | `frontend/tests/e2e/suite/08-campaigns.spec.ts` | 93–115 | Submits a live wallet campaign via UI but does not clean up the created `CampaignRun`. | E2E tests clean up their own data | Add cleanup to delete the campaign run or use a mock/test-only channel if possible. |
| 4 | `backend/tests/test_wallet.py` | 25–99 | `TEST_CERT_PEM`, `TEST_KEY_PEM`, and `TEST_WWDR_PEM` are hardcoded fake certificate strings. While not production secrets, hardcoded crypto material in tests sets a bad precedent. | No hardcoded credentials in tests | Load test certificate content from a `.gitignore`d file in `backend/tests/fixtures/` or generate it dynamically in `setUp`. |
| 5 | `backend/tests/test_scanner.py` | 317–363 | `search_customer` tests use `MagicMock` requests instead of real authenticated requests. | Test fixtures must be realistic | Use Django test client with real JWT auth and real `TenantRequest` objects. |
| 6 | `backend/tests/test_api.py` | 423–464 | Cards API tests only cover `list` and `create`. `GET /cards/{id}/`, `PUT /cards/{id}/`, and `DELETE /cards/{id}/` are untested at integration level. | Every mutation endpoint has at least one test | Add tests for update and delete card endpoints. |
| 7 | `backend/tests/test_api.py` | 155–183 | Auth refresh test only covers success. No negative test for expired refresh tokens or revoked tokens. | Auth boundary has positive + negative tests | Add test for revoked refresh token returning 401. |
| 8 | `backend/tests/test_api.py` | 281–354 | User management tests cover OWNER and STAFF. No tests for **MANAGER** trying to list users or **cross-tenant** user access. | Role tests must include cross-tenant checks | Add `test_list_users_manager_forbidden` and `test_deactivate_user_cross_tenant_blocked`. |
| 9 | `backend/apps/notifications/api/inbox.py` | — | No tests for notification inbox endpoints (`GET /inbox/`, `POST /inbox/mark-read/`, `DELETE /inbox/{id}/`). | Coverage gaps for critical paths | Add tests for inbox list, mark-read, and delete notification. |
| 10 | `backend/apps/notifications/api/push.py` | — | No tests for push device registration endpoints (`POST /devices/`, `GET /devices/`, `DELETE /devices/{id}/`). | Coverage gaps for critical paths | Add tests for device registration, listing, and unregistration. |
| 11 | `backend/apps/notifications/whatsapp/api.py` | 226–335 | WhatsApp webhook endpoints (`/webhook/delivery/`, `/webhook/session/`) have **zero tests**. | Every mutation endpoint has at least one test | Add tests for webhook payload validation, signature verification, and idempotency. |
| 12 | `backend/apps/billing/payment_api.py` | — | Payment webhook endpoint (`/billing/payments/webhook/`) has **zero tests**. | Every mutation endpoint has at least one test | Add test for Stripe/Bendo webhook signature verification and idempotency. |
| 13 | `backend/apps/tenants/super_admin_api/platform_reset.py` | — | `factory_reset_confirm` and `seed_demo_data` are only tested as guardrails (blocked). There is **no positive-path test** for development mode. | Every mutation endpoint has at least one test | Add a test that sets `PLATFORM_MODE=development` and verifies the reset actually executes, or document that this is intentionally excluded. |
| 14 | `backend/tests/test_services.py` | 259–263 | `AutomationService.fire_trigger` test only asserts `count >= 0`. A trigger with a matching automation could return 0 if the method silently fails. | Tests must fail fast | Assert exact count (e.g., `self.assertEqual(count, 1)`) and verify `AutomationExecution` record was created. |

---

## Minor Issues (P2)

| # | File | Line | Issue | Rule Violated | Suggested Fix |
|---|------|------|-------|---------------|---------------|
| 1 | `frontend/tests/unit/setup.ts` | 1–2 | Setup file is essentially empty (only a comment). No global error handlers, cleanup, or custom matchers. | Tests use proper setup/teardown | Add `cleanup` from `@testing-library/react` or remove the file if unused. |
| 2 | `backend/tests/security/test_api_security.py` | 8–10 | Docstring says "Covers:" with three empty bullet points. | Documentation | Complete the docstring or remove the placeholder bullets. |
| 3 | `backend/tests/test_security.py` | 6–7 | Docstring references `test_security_fixes.py` which does not exist in the codebase. | Documentation | Update the docstring to reference the correct files (`test_auth_security.py`, `test_api_security.py`, `test_data_security.py`). |
| 4 | `backend/tests/test_api.py` | 388, 418 | Uses `self.assertIn(resp.status_code, [200, 201])` and `[200, 204]` instead of exact assertions. | Precision | Use exact expected status codes (e.g., `201` for create, `204` for delete). |
| 5 | `backend/tests/test_api.py` | 560–562 | `NotificationsAPITest` only asserts 200 on list. No test for creating a notification. | Coverage gaps | Add a test for `POST /notifications/send/` or mark as intentional with a comment. |
| 6 | `backend/tests/test_concurrency.py` | 141–144 | `StampRaceConditionTest` spawns 10 threads adding 10 stamps each. If `select_for_update` is not used in `process_transaction`, this test would still pass intermittently. | Tests must fail fast | Add an explicit assertion that verifies no `IntegrityError` or `OperationalError` occurred during concurrent writes. |
| 7 | `frontend/tests/e2e/suite/12-role-isolation.spec.ts` | 10–43 | MANAGER isolation tests only assert "no crash" (`errorCount === 0`). They do not assert that the page shows a 403 or redirects. | Auth boundary has positive + negative tests | Assert on URL redirect or presence of access-denied messaging. |
| 8 | `backend/tests/test_wallet.py` | 197–224 | `test_generate_pkpass_returns_bytes` patches `_check_config_ready` and `_sign_manifest` to return fake data. The actual ZIP/pkpass generation logic is not fully exercised. | No mocked APIs as production-readiness proof | Add a comment explaining that full crypto validation requires real Apple certs, or add an integration test that verifies the endpoint returns `application/vnd.apple.pkpass`. |
| 9 | `backend/tests/test_plan_enforcement.py` | 54–67 | `test_trial_unlimited_limits` and `test_no_plan_returns_empty` directly manipulate `subscription_plan = None`. This is a valid edge case but could be clearer. | Test fixtures are realistic | Use factory helper methods rather than raw ORM manipulation in tests. |
| 10 | `backend/tests/sms/test_campaign_sms.py` | 68–75 | `setUp` loads Twilio credentials from Vault. If Vault is empty, **all** real-client tests are skipped silently. This masks configuration issues in CI. | Tests fail fast when env vars missing | Add a dedicated test `test_twilio_credentials_must_be_present` that fails if credentials are missing, so CI surfaces the problem. |
| 11 | `frontend/tests/e2e/helpers/e2e-test-config.ts` | 24–32 | If `e2e-credentials.json` is missing, the error message is helpful. However, there is no equivalent check for `PLAYWRIGHT_BASE_URL` before tests start. | Tests fail fast when env vars missing | Add an early validation in `playwright.config.ts` that throws if `PLAYWRIGHT_BASE_URL` is undefined. |

---

## Positive Findings

- **Comprehensive backend model tests:** Every major model (`Subscription`, `Invoice`, `PaymentMethod`, `Customer`, `Card`, `CustomerPass`, `Automation`, `CampaignRun`, `AuditLog`) has dedicated unit tests.
- **Plan enforcement is well-tested:** `test_plan_enforcement.py` and `test_api_plan_limits.py` thoroughly cover 402/403 responses for missing features and exceeded limits.
- **Security tests are present:** OTP entropy, password complexity, SSRF blocking, X-Forwarded-For spoofing resistance, rate limit rules, cross-tenant isolation, and role boundaries all have tests.
- **Concurrency tests exist:** `test_concurrency.py` covers stamp races, coupon double-redemption, gift certificate overdraft, and multipass concurrency with real threads.
- **Factory pattern is clean:** `tests/factories.py` generates realistic test data with UUIDs and avoids collisions.
- **E2E safety guardrails are strong:** `e2e-safety.ts` blocks production hosts, requires `PLAYWRIGHT_BASE_URL`, and uses real API login (no hardcoded passwords).
- **E2E auth setup is robust:** `auth.setup.ts` logs in all four roles via the real API and saves storage state for reuse.
- **No hardcoded passwords in tests:** All test passwords are generated via `secrets.token_urlsafe(16)` or loaded from the ignored `.auth/e2e-credentials.json` file.
- **SuperAdmin guardrails are tested:** Factory reset and seed-demo are verified to be blocked in production and for non-SuperAdmin users.
- **Frontend unit tests cover validation schemas:** Zod schemas for login, register, locations, programs, campaigns, and password changes are thoroughly tested.
- **Wallet E2E tests clean up:** `22-wallet-flows.spec.ts` deletes test programs in the final test step.

---

## Coverage Gap Analysis

> **Snapshot (2026-06-11):** Esta tabla es una fotografía del audit original (2026-06-04) actualizada únicamente donde se verificaron cambios explícitos en el árbol de trabajo. Los porcentajes son aproximados y deben contrastarse con `pytest --cov` si se requiere precisión.

| Module | Endpoints (approx.) | Tests | Coverage % | Missing Tests |
|--------|---------------------|-------|------------|---------------|
| **Authentication** | 10 | 7 | 70% | `POST /auth/logout/`, `POST /auth/reset-password/`, `POST /auth/google/login/` (backend), refresh negative path |
| **Users / RBAC** | 6 | 4 | 67% | `PATCH /auth/users/{id}/`, cross-tenant user deactivation, MANAGER user-list boundary |
| **Tenants** | 12 | 5 | 42% | `GET /tenants/team/`, `PATCH /tenants/team/{id}/`, `DELETE /tenants/team/{id}/`, `GET /tenants/locations/`, `POST /tenants/me/ai-chat/` (positive path) |
| **Cards / Programs** | 10 | 5 | 50% | `PUT /programs/{id}/`, `DELETE /programs/{id}/`, `GET /programs/{id}/members/`, publish endpoint (backend) |
| **Customers** | 10 | 6 | 60% | `GET /customers/{id}/`, `GET /customers/passes/`, `POST /customers/passes/resend/`, `POST /customers/export/` |
| **Transactions** | 4 | 2 | 50% | `GET /transactions/{id}/`, `POST /transactions/` (real integration, not mocked) |
| **Scanner** | 3 | 3 | 40% | Real JWT auth tests (all current tests mock auth), `POST /scanner/v2/` (redemption v2) |
| **Billing** | 7 | 2 | 29% | `POST /billing/subscribe/`, `PUT /billing/subscription/`, `POST /billing/subscription/cancel/`, `POST /billing/subscription/reactivate/`, payment webhooks |
| **Campaigns / Notifications** | 12 | 5 | 42% | `GET /inbox/`, `POST /inbox/mark-read/`, `DELETE /inbox/{id}/`, push device CRUD, campaign analytics |
| **Analytics** | 6 | 1 | 17% | `GET /analytics/customers/`, `GET /analytics/programs/`, `GET /analytics/trends/`, `GET /analytics/segments/` |
| **Automation** | 5 | 4 | 80% | `PUT /automation/{id}/`, `DELETE /automation/{id}/` |
| **Wallet** | 4 | 2 | 50% | `GET /wallet/apple/` (Web Service), `GET /wallet/google/`, real pkpass generation endpoint |
| **WhatsApp** | 5 | 3 | 60% | `POST /whatsapp/webhook/delivery/`, `POST /whatsapp/webhook/session/` |
| **SuperAdmin** | 15 | 6 | 40% | Tenant creation wizard API, impersonation (backend), plan CRUD (backend integration), broadcast, settings Vault write |
| **Backup & Restore** | 9 | 0 | 0% | **All endpoints untested** |
| **Agent API** | 5 | 0 | 0% | **All endpoints untested** |
| **Uploads** | 2 | 0 | 0% | **All endpoints untested** |
| **Portal** | 4 | 0 | 0% | **All endpoints untested** |
| **Tenant Privacy** | 4 | 0 | 0% | **All endpoints untested** |

### Critical Untested Mutation Endpoints (High Risk)

1. `POST /api/v1/billing/subscribe/` — Billing mutation (revenue path)
2. `POST /api/v1/billing/subscription/cancel/` — Billing mutation
3. `POST /api/v1/billing/subscription/reactivate/` — Billing mutation
4. `POST /api/v1/billing/payments/webhook/` — Payment confirmation (revenue path)
5. `POST /api/v1/admin/backups/` — Backup creation (data safety)
6. `POST /api/v1/admin/backups/{id}/restore/` — Backup restore (data safety)
7. `POST /api/v1/admin/backups/{id}/delete/` — Backup deletion
8. `POST /api/v1/upload/` — File upload (security path)
9. `POST /api/v1/whatsapp/webhook/delivery/` — Webhook delivery tracking
10. `POST /api/v1/whatsapp/webhook/session/` — Webhook session events
11. `POST /api/v1/portal/enroll/` — Public enrollment (customer-facing)
12. `PUT /api/v1/programs/{id}/` — Program update
13. `DELETE /api/v1/programs/{id}/` — Program deletion
14. `PATCH /api/v1/tenants/team/{id}/` — Team member update
15. `DELETE /api/v1/tenants/team/{id}/` — Team member deletion

---

## Recommendations (Prioritized)

### Immediate (This Sprint)
1. **Create `.github/workflows/ci.yml`** with all five quality gates.
2. **Rewrite `test_scanner.py`** to use Django test client with real JWT auth instead of `MagicMock` and `patch`.
3. **Rewrite `test_wallet.py`** `TestWalletApiEndpoints` to use real `CustomerPass` DB objects instead of mocked ORM.
4. **Add backend integration tests** for `POST /billing/subscribe/`, `POST /billing/subscription/cancel/`, and `POST /billing/subscription/reactivate/`.
5. **Add cleanup logic** to E2E tests `02-programs.spec.ts` and `27-tenant-creation-wizard.spec.ts`.

### Short-term (Next 2 Sprints)
6. Add tests for backup/restore API (`backup/api.py`).
7. Add tests for agent API (`agent_api/api.py`).
8. Add tests for upload API (`upload_api.py`).
9. Add tests for customer export and portal APIs.
10. Add tests for Apple Wallet Web Service endpoints.
11. Add tests for payment webhook signature verification.
12. Add tests for WhatsApp webhooks.
13. Extract `_get_auth_header` into a shared helper.

### Medium-term (Next Month)
14. Add negative-path tests for auth refresh with revoked tokens.
15. Add cross-tenant and MANAGER role-boundary tests for all CRUD endpoints.
16. Add exact status-code assertions in `test_api.py` instead of `[200, 201]` ranges.
17. Add a dedicated test that fails when Twilio/Vault credentials are missing in CI (instead of skipping silently).
18. Add coverage reporting (`pytest-cov`) and enforce a minimum threshold (e.g., 75%).
