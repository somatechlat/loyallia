# LOYALLIA — COMPREHENSIVE TESTING & DOCUMENTATION AUDIT PLAN
## Enterprise-Grade Validation of Every Screen, Button, and Configuration

**Date:** 2026-06-01  
**Objective:** Validate that every SuperAdmin screen works correctly, all settings persist to the correct backend (Vault vs PlatformSetting), all field validations fire before DB submission, and every tooltip/UI element renders properly. Then document everything.

---

## PART A: CODE AUDIT (Files >650 Lines)

**Finding:** ✅ NO files exceed 650 lines. Largest file is `backend/apps/automation/models.py` at 643 lines.

**Files close to limit (500-643 lines) flagged for monitoring:**
- `backend/apps/automation/models.py` (643)
- `backend/apps/tenants/super_admin_api/tenants.py` (636)
- `backend/apps/customers/models.py` (611)
- `backend/apps/tenants/super_admin_api/platform.py` (610)
- `frontend/src/app/(dashboard)/automation/page.tsx` (597)
- `frontend/src/components/superadmin/plans/PlanModal.tsx` (587)

**Action:** None required now — all under 650. Monitor during future development.

---

## PART B: BACKEND TEST EXECUTION

### B1. Run Full Backend Test Suite
```bash
docker compose exec api pytest --reuse-db -q
```
**Expected:** All tests pass. Any failures documented with root cause.

### B2. Run Specific Test Categories
| Category | Command | Purpose |
|----------|---------|---------|
| API | `pytest tests/test_api.py -v` | Auth, customers, cards, transactions, billing, tenants |
| Security | `pytest tests/security/ -v` | RBAC, XSS, SSRF, rate limiting, cross-tenant isolation |
| SuperAdmin | `pytest tests/test_superadmin_flows.py -v` | Tenant creation, plan validation, impersonation, factory reset |
| Billing | `pytest tests/test_billing.py -v` | Subscriptions, invoices, plan limits, trial behavior |
| Concurrency | `pytest tests/test_concurrency.py -v` | Race conditions, double-redemption, stamp counters |
| Plan Enforcement | `pytest tests/test_plan_enforcement.py -v` | Limit checks, feature access, decorators |

### B3. Validate Settings Persistence
**Test Matrix:** For each setting type, verify WHERE it persists

| Setting Category | Frontend Screen | API Endpoint | Backend Storage | Validation |
|-----------------|-----------------|--------------|-----------------|------------|
| Public URL | Platform Settings | `PUT /admin/platform/settings/public_base_url/` | PlatformSetting (DB+Redis) | URL format |
| Email Host | Platform Settings | `PUT /admin/platform/settings/email_host/` | PlatformSetting (DB+Redis) | Hostname |
| Google OAuth ID | Integrations | `PUT /admin/platform/integrations/google_wallet/secret/` | Vault KV v2 | Whitelist check |
| Apple Cert PEM | Integrations | `PUT /admin/platform/integrations/apple_wallet/secret/` | Vault KV v2 | File upload |
| Twilio SID | Integrations | `PUT /admin/platform/integrations/twilio_sms/secret/` | Vault KV v2 | Regex `AC[a-f0-9]{32}` |
| Twilio Test Mode | Integrations | `PUT /admin/platform/integrations/twilio_sms/secret/` | Vault KV v2 | Boolean toggle |
| Mailjet API Key | Integrations | `PUT /admin/platform/integrations/mailjet/secret/` | Vault KV v2 | Whitelist check |
| Payment Gateway | Integrations | `PUT /admin/platform/integrations/payments/secret/` | Vault KV v2 | Provider enum |
| Backup Config | Integrations | `PUT /admin/platform/integrations/backup_dr/secret/` | Vault KV v2 | Frequency enum |

**Critical Validation:**
- Settings with `SECRET`, `PASSWORD`, `TOKEN`, `PRIVATE_KEY` in key name MUST be rejected by PlatformSetting API (400) and forced to Vault route
- Vault secrets MUST NOT be returned in full in API responses (only diagnostic booleans)
- Twilio test mode toggle MUST show correct banner (amber for test, red for production)

---

## PART C: PLAYWRIGHT E2E TEST EXECUTION

### C1. SuperAdmin Test Suite (Priority 1)
Run all `@superadmin` tagged tests:
```bash
npx playwright test --project=superadmin
```

**Test Files to Validate:**
| File | Coverage |
|------|----------|
| `11-superadmin.spec.ts` | Platform overview, tenant list, metrics, plan CRUD, integrations (Google/Apple/Mailjet/Twilio), Vault editor, broadcast, factory reset, platform settings, secret exposure validation |
| `26-superadmin-full-menu.spec.ts` | Full menu navigation, every sidebar item |
| `27-tenant-creation-wizard.spec.ts` | 4-step wizard: plan → entity → owner → locations |
| `28-tenant-lifecycle.spec.ts` | Suspend, reactivate, detail view, technical info |
| `29-plan-management.spec.ts` | Plan CRUD with rate limits, features, pricing |
| `30-impersonation.spec.ts` | PIN setup, justification, impersonation flow, return to SuperAdmin |

### C2. Role Isolation (Priority 2)
```bash
npx playwright test --project=role-isolation
```
**Validates:** OWNER blocked from `/superadmin`, MANAGER/STAFF blocked from admin functions, redirect behaviors.

### C3. Authentication (Priority 3)
```bash
npx playwright test --project=auth
```
**Validates:** Login flows for all 4 roles, invalid credentials, registration validation, Google OAuth config.

### C4. Rate Limiting & Plan Enforcement (Priority 4)
```bash
npx playwright test --project=security
```
**Validates:** Plan rate limits, API response fields, RBAC on admin plan APIs (403 for non-superadmin).

---

## PART D: MANUAL UI/UX VALIDATION CHECKLIST

### SuperAdmin Dashboard (`/superadmin`)
- [ ] KPI cards render with real data (tenants, users, locations, customers, MRR)
- [ ] Ecuador map shows location pins
- [ ] Recent tenant activity feed loads
- [ ] All loading states show skeletons

### Metrics (`/superadmin/metrics`)
- [ ] Growth area chart renders (6 months)
- [ ] Plan distribution pie chart renders
- [ ] Industry bar chart renders
- [ ] Locations-per-tenant bar chart renders
- [ ] Detailed tenant data table loads

### Plans (`/superadmin/plans`)
- [ ] All 4 plans display (Trial, Starter, Professional, Enterprise)
- [ ] PlanCard shows correct pricing & features
- [ ] PlanModal opens for CRUD
- [ ] Feature tags validate against known features
- [ ] `max_whatsapp_day` capped at 200 in UI
- [ ] Save disabled if name empty

### Tenant List (`/superadmin/tenants`)
- [ ] Table lists all tenants with plan badges
- [ ] Active/suspended dots correct
- [ ] User/location counts accurate
- [ ] Search/filter works

### Tenant Creation Wizard (`/superadmin/tenants` → Create)
- [ ] Step 1: Plan selection (only 4 valid plans shown)
- [ ] Step 2: Entity type toggle (natural/juridica)
- [ ] Step 2: RUC validation (13 digits for juridica)
- [ ] Step 2: Cédula validation (10 digits for natural)
- [ ] Step 3: Owner email validation (regex)
- [ ] Step 3: Owner first/last name required
- [ ] Step 4: Location name required
- [ ] Step 4: Latitude between -90 and 90
- [ ] Step 4: Longitude between -180 and 180
- [ ] Summary shows all data before submit
- [ ] Success toast appears
- [ ] Created tenant visible in list

### Tenant Detail (`/superadmin/tenants` → Click)
- [ ] Info tab shows tenant data
- [ ] Locations tab shows map with pins
- [ ] Actions tab shows suspend/reactivate/impersonate/delete
- [ ] Suspend requires confirmation
- [ ] Impersonate requires 6-digit PIN + 10-char justification
- [ ] Delete requires 10-char justification + "ELIMINAR" phrase

### Settings — Integrations (`/superadmin/settings`)
- [ ] Google Wallet card shows status dot
- [ ] Apple Wallet card shows cert upload inputs
- [ ] Mailjet card shows API key fields
- [ ] Twilio SMS shows test mode toggle
- [ ] Twilio test mode ON: amber banner "MODO PRUEBA"
- [ ] Twilio test mode OFF: red banner "MODO PRODUCCIÓN"
- [ ] Payment Gateway shows provider dropdown (none/manual/disabled)
- [ ] WhatsApp Bridge shows URL + API key
- [ ] AI Agent shows base_url + api_key
- [ ] Backup & DR shows system_mode, frequency, retention
- [ ] All integration saves call Vault API (not PlatformSetting)
- [ ] Secret exposure validation: API responses don't contain full secrets

### Settings — Platform Settings (`/superadmin/settings`)
- [ ] 45 settings display in grid
- [ ] Each setting has individual Save button
- [ ] Save disabled if unchanged
- [ ] "Requires restart" badge shows for applicable settings
- [ ] PLATFORM_MODE is select (production/development)
- [ ] Auto-detects number inputs for DAYS/PRICE/RATE keys
- [ ] Last updated timestamp shows
- [ ] Secret-like keys rejected (400) forcing Vault route

### Settings — Broadcast (`/superadmin/settings`)
- [ ] Subject + message form
- [ ] "Enviar" button sends to all owners
- [ ] Loading state "Enviando..."

### Settings — System Operations (`/superadmin/settings`)
- [ ] Seed demo button shows warning
- [ ] Factory reset requires OTP
- [ ] OTP request button shows "Enviando código..."
- [ ] 6-digit OTP input
- [ ] Confirmation dialog

---

## PART E: DOCUMENTATION UPDATES

### E1. Update `docs/DEPLOYMENT_GUIDE.md`
**Status:** ⚠️ SIGNIFICANTLY OUTDATED  
**Issues:**
- Step 4 shows legacy manual Vault initialization
- Does not mention `.bootstrap_secrets.json`
- Does not mention `vault-init` container
- Does not mention auto-rescue files
- Does not mention `recover_admin_access` command

**Action:** Rewrite deployment section to reference `bootstrap.sh` as canonical path.

### E2. Update `docs/TODO_CURRENT_PRODUCTION_READINESS.md`
**Status:** ⚠️ LIKELY STALE (dated 2026-05-11)  
**Action:** Re-run Ruff and pytest, update blocker statuses.

### E3. Update `docs/AGENT_ONBOARDING.md`
**Action:** Add bootstrap v2.2 changes, factory-reset.sh, new file locations.

### E4. Update `docs/FACTORY_RESET_PROCEDURE.md`
**Action:** Reference new `deploy/bootstrap/factory-reset.sh` script.

### E5. Create `docs/SECRETS_INVENTORY.md`
**Action:** Document all 56 secret keys with categories, sources, and env var mappings.

---

## PART F: TWILIO AUDIT

**Requirement:** Twilio must be DISABLED but have correct credentials.

**Validation Checklist:**
- [ ] `twilio_verify_enabled` = `false` in Vault
- [ ] `twilio_use_test_mode` = `true` in development
- [ ] `twilio_account_sid` matches regex `AC[a-f0-9]{32}`
- [ ] `twilio_auth_token` is non-empty
- [ ] `twilio_from_number` is valid E.164 format
- [ ] Frontend shows DISABLED status for Twilio Verify
- [ ] Frontend shows TEST MODE banner for Twilio SMS
- [ ] Registration page does NOT hard-block on unverified phone
- [ ] Phone verification gracefully skips if Twilio unavailable

---

## EXECUTION ORDER

1. **Run backend tests** → Document failures
2. **Run Playwright E2E** → Document failures
3. **Manual UI validation** → Checklist above
4. **Twilio audit** → Verify disabled + credentials
5. **Documentation updates** → All 5 docs
6. **Final report** → Summary of all findings
