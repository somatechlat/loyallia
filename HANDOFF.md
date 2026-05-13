# Loyallia — Production Remediation Handoff

| Property | Value |
|---|---|
| **Document ID** | LYL-HANDOFF-004 |
| **Date** | 2026-05-12 |
| **Classification** | Internal — Pending Remediation |
| **Status** | PENDING EXECUTION |
| **Standard** | ISO/IEC 29148:2018 (SRS) |

---

## 1. Executive Summary

This handoff documents **all remaining remediation items** identified during the comprehensive production audit (LYL-SRS-AUDIT-001 v4.0). Previously completed items are in §2. Pending work is in §3 with full ISO/SRS requirements. Bootstrap idempotency is verified in §4. Total: **12 REQ items** (2 resolved, 10 pending) across 5 execution phases.

---

## 2. Verified Systems — No Code Changes Required

| ID | System | Status | Evidence |
|---|---|---|---|
| VER-001 | **Factory Reset OTP** | ✅ CORRECT | Twilio Verify → Email fallback via `get_otp_strategy()`. Rate-limited 3/hr. HMAC timing-safe. 5-min TTL. Dual `window.confirm()`. Audit log BEFORE wipe. |
| VER-002 | **OTP Service** | ✅ CORRECT | `VerifyOTPStrategy` / `LocalOTPStrategy`. Auto-selects via Vault `twilio_verify_enabled`. |
| VER-003 | **WhatsApp Activation** | ✅ CORRECT | QR wizard → toggle → cancel → refresh. 6 E2E tests. RBAC (OWNER only). |
| VER-004 | **Wallet Passbook** | ✅ CORRECT | Apple PKPass + Google `save_url`. 14 E2E tests. |
| VER-005 | **Suspension / Reactivation** | ✅ CORRECT | `Tenant.is_active` + `Subscription.status` atomic. Plan deactivation blocked (409). |
| VER-006 | **SMS Campaign Task** | ✅ CORRECT | `CampaignRun` + `CampaignDeliveryLog`. Twilio test mode safety. |
| VER-007 | **Wallet Campaign Task** | ✅ CORRECT | `CampaignRun` + delivery logs. `wallet` channel. |
| VER-008 | **Email Campaign Task** | ✅ CORRECT | `send_email_campaign` Celery task. Per-customer SMTP. `CampaignRun` + `CampaignDeliveryLog`. |
| VER-009 | **Segment Targeting** | ✅ CORRECT | 5 segments: `all`, `active`, `at_risk`, `lost`, `vip`. UI card-per-segment with counts. |
| VER-010 | **Campaign Analytics API** | ✅ CORRECT (partial) | List runs, results, recipients (paginated), CSV export. Gaps in delivered/read — see REQ-011. |
| VER-011 | **Campaign Data Model** | ✅ CORRECT (schema) | `CampaignRun` + `CampaignDeliveryLog` + `DeliveryStatus` enum with 6 states. |
| VER-012 | **Mailjet SMTP** | ✅ RESOLVED | Credentials injected into live Vault 2026-05-12T22:01Z. Health: `ok`. SMTP Reachable: `True`. See §2.1. |
| VER-013 | **Bootstrap Idempotency** | ✅ VERIFIED | Platform settings: `get_or_create` (skip existing). Migrations: all applied. Vault: `set_secret_from_env` is no-op when env empty. See §4. |

### 2.1 Mailjet Integration — Technical Assessment

Loyallia uses Mailjet as a **SMTP relay only**. It does NOT use the Mailjet REST API.

| Capability | Status | Implementation |
|---|---|---|
| **Send emails** | ✅ SMTP relay | `EmailMultiAlternatives` → `in-v3.mailjet.com:587/TLS`. Credentials from Vault. |
| **Email campaigns** | ✅ Loyallia-managed | `send_email_campaign` Celery task. Audience by segment. HTML inline. `CampaignRun` + `CampaignDeliveryLog`. |
| **OTP verification email** | ✅ SMTP relay | `LocalOTPStrategy._send_otp_email()` via `send_mail()`. |
| **Broadcast to owners** | ✅ SMTP relay | `broadcast_announcement()` via `send_mass_mail()`. |
| **Contact management** | ❌ NOT used | `create_subscriber()` is a no-op. Customers managed in Loyallia DB. |
| **Mailjet templates** | ❌ NOT used | HTML built inline in `email.py:L128-160`. |
| **Mailjet REST API** | ❌ NOT used | No `mailjet_rest` package. Only SMTP. |
| **Mailjet analytics** | ❌ NOT used | Delivery tracked via Loyallia `CampaignDeliveryLog`. See REQ-011. |

### 2.2 Mailjet Vault Credentials (LIVE — Verified 2026-05-12T22:01Z)

| Vault Key | Status | Value |
|---|---|---|
| `mailjet_api_key` | ✅ SET | 32 chars |
| `mailjet_secret_key` | ✅ SET | 32 chars |
| `mailjet_sender_email` | ✅ SET | `info@loyallia.com` (17 chars) |
| `mailjet_sender_name` | ✅ SET | `Loyallia` (8 chars) |
| **SMTP Reachable** | ✅ TRUE | `in-v3.mailjet.com:587/TLS` connected |

**⚠️ Note:** In development mode, `EMAIL_BACKEND = console` (emails print to stdout). In production, `EMAIL_BACKEND = smtp` (real delivery). Ensure production containers run with `DJANGO_SETTINGS_MODULE=loyallia.settings.production`.

---

## 3. Remaining Remediation Items

### 3.1 REQ-001 — Trial Plan Enforcement Bypass

| Property | Value |
|---|---|
| **ID** | LYL-BUG-001 |
| **Severity** | 🔴 CRITICAL |
| **Priority** | P0 — Immediate |
| **Category** | Security / Business Logic |
| **SRS Ref** | LYL-SRS-BILLING-001 |

**3.1.1 Current Defect**

`Subscription.get_limit()` in `billing/models.py:L381` returns `999999` for ALL plans when `status == TRIALING`. `Subscription.has_feature()` in `billing/models.py:L409` returns `True` for ALL plans when `status == TRIALING`.

**3.1.2 Impact**

A Starter tenant in trial gets unlimited WhatsApp, SMS, email, and Enterprise-only features. Bypasses all plan rate-limiting.

**3.1.3 Required Behavior**

Only the `trial` (FREE) plan slug gets unlimited during `TRIALING`. All paid plans enforce their limits even during trial.

**3.1.4 Files to Modify**

| File | Change |
|---|---|
| `backend/apps/billing/models.py` | `get_limit()`: add `and self.plan.slug == "trial"` check. Same for `has_feature()`. |

---

### 3.2 REQ-002 — Tenant Creation Wizard: Plan Must Be Step 1

| Property | Value |
|---|---|
| **ID** | LYL-BUG-002 |
| **Severity** | 🔴 HIGH |
| **Priority** | P1 |
| **Category** | UX / Business Flow |
| **SRS Ref** | LYL-SRS-TENANT-001 |

**3.2.1 Required Flow**

1. Click "New Tenant" → **Select Plan** (Step 1)
2. Entity / Company Data (Step 2)
3. Owner Details (Step 3)
4. Locations (Step 4)

**3.2.2 Files to Modify**

| File | Change |
|---|---|
| `frontend/src/app/(dashboard)/superadmin/tenants/page.tsx` | Reorder `WIZARD_STEPS` array. Move plan selection to index 0. |

---

### 3.3 REQ-003 — Paid Plans Must Be ACTIVE on Creation

| Property | Value |
|---|---|
| **ID** | LYL-BUG-003 |
| **Severity** | 🔴 HIGH |
| **Priority** | P1 |
| **Category** | Business Logic |
| **SRS Ref** | LYL-SRS-BILLING-002 |

**3.3.1 Fix**

`tenants.py:L170`: `status = TRIALING if plan_slug == "trial" else ACTIVE`

---

### 3.4 REQ-004 — Development / Production Mode Toggle

| Property | Value |
|---|---|
| **ID** | LYL-SRS-MODE-001 |
| **Severity** | 🟡 MEDIUM |
| **Priority** | P2 |
| **Category** | New Feature — Platform Operations |
| **SRS Ref** | LYL-SRS-PLATFORM-001 |

**3.4.1 Mode Configuration Matrix**

| Setting | 🟡 Development | 🟢 Production |
|---|---|---|
| `PLATFORM_MODE` | `development` | `production` |
| `twilio_use_test_mode` | `true` (sandbox) | `false` (real SMS) |
| `system_mode` (Vault) | `development` | `production` |
| `backup_frequency` | `15days` | `daily` |

**3.4.2 What's Missing**

1. `PlatformSetting` DB key: `PLATFORM_MODE`
2. Visual toggle at top of settings page
3. Backend `POST /platform/mode/toggle/` + `GET /platform/mode/`
4. Audit log on mode change

**3.4.3 Files to Modify**

| File | Change |
|---|---|
| `backend/apps/tenants/management/commands/seed_platform_settings.py` | Add `PLATFORM_MODE` |
| `backend/apps/tenants/super_admin_api/platform.py` | New toggle/get endpoints |
| `frontend/src/app/(dashboard)/superadmin/settings/page.tsx` | Visual toggle banner |

---

### 3.5 REQ-005 — Seed Data: Paid Plans Have trial_days=5

| Property | Value |
|---|---|
| **ID** | LYL-BUG-005 |
| **Severity** | 🟡 MEDIUM |
| **Priority** | P2 |
| **Category** | Data Integrity |
| **SRS Ref** | LYL-SRS-BILLING-003 |

**3.5.1 Fix**

Set `trial_days=0` on starter/professional/enterprise in both:
- `backend/apps/billing/management/commands/seed_subscription_plans.py`
- `backend/apps/billing/migrations/0008_seed_vital_plans.py`

---

### 3.6 REQ-006 — Hardcoded Trial Limits in plan_enforcement.py

| Property | Value |
|---|---|
| **ID** | LYL-BUG-004 |
| **Severity** | 🟡 MEDIUM |
| **Priority** | P2 |
| **Category** | Data Integrity |
| **SRS Ref** | LYL-SRS-BILLING-004 |

**3.6.1 Fix**

`plan_enforcement.py:L68-87`: Replace hardcoded `TRIAL_LIMITS` dict with DB query from `trial` SubscriptionPlan.

---

### 3.7 REQ-007 — Factory Reset Missing 3 Models in Wipe

| Property | Value |
|---|---|
| **ID** | LYL-BUG-006 |
| **Severity** | 🟡 MEDIUM |
| **Priority** | P2 |
| **Category** | Data Integrity / Security |
| **SRS Ref** | LYL-SRS-PLATFORM-002 |

**3.7.1 Fix**

`platform.py:L760-784`: Add `CampaignRun`, `CampaignDeliveryLog`, `Enrollment` to wipe BEFORE `Customer.objects.all().delete()`.

---

### 3.8 REQ-008 — extend_trial() Reads from Wrong Source

| Property | Value |
|---|---|
| **ID** | LYL-BUG-007 |
| **Severity** | 🟡 MEDIUM |
| **Priority** | P3 |
| **SRS Ref** | LYL-SRS-TENANT-002 |

**3.8.1 Fix**

`tenants.py:L435`: Read from `Subscription.trial_end` (authoritative), not `Tenant.trial_end` (deprecated).

---

### 3.9 REQ-009 — SMS delivered_count Always 0

| Property | Value |
|---|---|
| **ID** | LYL-BUG-008 |
| **Severity** | 🟡 MEDIUM |
| **Priority** | P3 |
| **SRS Ref** | LYL-SRS-SMS-001 |

**3.9.1 Fix**

`backend/apps/notifications/sms/tasks.py`: Increment `delivered_count` after successful sends.

---

### 3.10 REQ-010 — Mailjet Credentials in Vault

| Property | Value |
|---|---|
| **ID** | LYL-OPS-001 |
| **Severity** | — |
| **Priority** | — |
| **Status** | ✅ **RESOLVED — 2026-05-12T22:01Z** |

Credentials injected via `put_secret()`. Verified: Health `ok`, SMTP Reachable `True`. See §2.2 for details.

---

### 3.11 REQ-011 — Email Analytics: Delivered/Opened/Bounced Never Populated

| Property | Value |
|---|---|
| **ID** | LYL-BUG-009 |
| **Severity** | 🟡 MEDIUM |
| **Priority** | P2 |
| **Category** | Analytics / Feature Gap |
| **SRS Ref** | LYL-SRS-EMAIL-002 |

**3.11.1 Current State**

| Field | Model | Status | Problem |
|---|---|---|---|
| `sent_count` | `CampaignRun` | ✅ Populated | Set after loop |
| `failed_count` | `CampaignRun` | ✅ Populated | Set after loop |
| `delivered_count` | `CampaignRun` | ❌ ALWAYS 0 | SMTP `send()` = "accepted by server" ≠ "delivered to inbox" |
| `read_count` | `CampaignRun` | ❌ ALWAYS 0 | No tracking pixel. No open event. |
| `delivery_rate` | `CampaignRun` | ❌ ALWAYS 0% | Depends on `delivered_count` |
| `read_rate` | `CampaignRun` | ❌ ALWAYS 0% | Depends on `read_count` |
| `delivered_at` | `CampaignDeliveryLog` | ❌ ALWAYS NULL | Never set |
| `read_at` | `CampaignDeliveryLog` | ❌ ALWAYS NULL | Never set |
| `BOUNCED` status | `DeliveryStatus` enum | ❌ NEVER USED | Exists but never assigned |

**3.11.2 Impact**

Owner sees "Sent: 150, Delivered: 0, Read: 0" — misleading. Zero inbox/open visibility.

**3.11.3 Recommended Fix: Mailjet Event Webhooks**

| Step | Action |
|---|---|
| 1 | Mailjet Dashboard → Webhooks → URL: `https://rewards.loyallia.com/api/v1/webhooks/mailjet/` |
| 2 | **NEW** endpoint: `POST /api/v1/webhooks/mailjet/` |
| 3 | Parse events: `sent`, `open`, `click`, `bounce`, `spam`, `blocked`, `unsub` |
| 4 | Match via `external_message_id` (field exists in model) |
| 5 | Update `CampaignDeliveryLog.status` + timestamps |
| 6 | Update `CampaignRun` aggregate counters |

**3.11.4 Files to Modify**

| File | Change |
|---|---|
| `backend/apps/notifications/tasks/email.py` | Capture `Message-ID` header → `delivery_log.external_message_id` |
| `backend/apps/notifications/api/webhooks.py` | **NEW** — Mailjet webhook receiver |
| `backend/apps/notifications/api/__init__.py` | Register webhook router |
| `backend/loyallia/urls.py` | Mount webhook URL (unauthenticated, IP-whitelisted) |

---

### 3.12 REQ-012 — seed_subscription_plans Overwrites Manual Adjustments

| Property | Value |
|---|---|
| **ID** | LYL-BUG-010 |
| **Severity** | — |
| **Priority** | — |
| **Status** | ✅ **RESOLVED — 2026-05-12T22:08Z** |

**Fix Applied:** Changed `update_or_create` → `get_or_create` in `seed_subscription_plans.py:L122`. SuperAdmin customizations now survive factory resets and re-bootstraps.

**Verification:** `seed_subscription_plans` re-run output: `0 created, 4 skipped` — all existing plans preserved.

---

## 4. Bootstrap & Disaster Recovery — Idempotency Verification

### 4.1 Bootstrap Sequence (Verified 2026-05-12)

The full bootstrap runs 7 steps via `deploy/bootstrap/bootstrap.sh`:

| Step | What | Idempotent? | Overwrites Data? |
|---|---|---|---|
| 1/7 | Check prerequisites (docker, compose) | ✅ Safe | No |
| 2/7 | Load/generate secrets (`.bootstrap_secrets`) | ✅ Safe | No (detects existing Vault → aborts or prompts) |
| 3/7 | Start Vault + vault-init | ✅ Safe | No — `env_or_existing()` checks Vault first, env second. `set_secret_from_env` is **no-op when env empty**. Existing Vault values preserved. |
| 4/7 | Start PostgreSQL, Redis, MinIO, PgBouncer | ✅ Safe | No |
| 5/7 | `migrate --noinput` (automatic on API start) | ✅ Safe | No — `get_or_create` in migration seeds |
| 6/7 | Start Celery workers, Flower, WhatsApp, Nginx | ✅ Safe | No |
| 7/7 | Verify container health | ✅ Safe | No |

### 4.2 Vault Init Idempotency (deploy/vault/init.sh)

| Secret Type | Behavior on Re-Run | Safe? |
|---|---|---|
| **Required secrets** (postgres_password, redis_url, etc.) | `env_or_existing()` → reads existing Vault value if env empty | ✅ |
| **Optional integrations** (mailjet, twilio, google, apple) | `set_secret_from_env` → **no-op** when env var empty | ✅ |
| **Defaults** (wallet_enabled, nfc_enabled) | `set_secret_default_if_missing` → skips if key exists | ✅ |
| **Infrastructure files** (postgres_password file, redis_password file) | Always re-written from current Vault values | ✅ (same value) |

### 4.3 API Container Startup Command

```
sh -c "python manage.py migrate --database=direct --noinput &&
       python manage.py collectstatic --noinput &&
       python manage.py runserver 0.0.0.0:8000"
```

- `migrate --noinput`: Runs ALL pending migrations. Seed migration uses `get_or_create` → **safe on every restart**.
- `seed_subscription_plans` is **NOT** in the startup chain. Only called during factory reset.
- `seed_platform_settings` is in migration `0008` → `get_or_create` → **safe on every restart**.

### 4.4 Idempotency Test Results (2026-05-12T22:03Z)

```
=== seed_platform_settings (re-run) ===
  Skipped TRIAL_DAYS (already exists)
  Skipped TAX_RATE_ECUADOR (already exists)
  Skipped DEFAULT_TIMEZONE (already exists)
  Done. 0 setting(s) created, 3 skipped. ✅

=== seed_subscription_plans (re-run) ===
  🔄 Updated: Trial
  🔄 Updated: Starter
  🔄 Updated: Professional
  🔄 Updated: Enterprise
  Done: 0 created, 4 updated. ⚠️ (see REQ-012)

=== Vault Mailjet keys survived re-run ===
  mailjet_api_key: SET (32 chars) ✅
  mailjet_secret_key: SET (32 chars) ✅
  mailjet_sender_email: SET (17 chars) ✅

=== Migrations ===
  Unapplied: 0. All applied ✅

=== SuperAdmin User ===
  admin@loyallia.com role=SUPER_ADMIN active=True ✅
```

### 4.5 Disaster Recovery Safety

| Scenario | Result |
|---|---|
| `docker compose down && docker compose up -d` | ✅ All data preserved. Vault auto-unseals. Migrations skip. |
| `docker compose down -v` (DESTROYS VOLUMES) | ❌ Full data loss. Must use `recover_from_rescue.sh` or fresh bootstrap. |
| Factory reset via SuperAdmin UI | ⚠️ Data wiped per design. Plans re-seeded (overwrites — see REQ-012). Vault untouched. SuperAdmin user preserved. |
| Re-run `bootstrap.sh` with existing Vault | ✅ Prompted. Existing Vault values preserved. No secret corruption. |

---

## 5. Missing Playwright E2E Tests

| Property | Value |
|---|---|
| **ID** | LYL-TEST-001 |
| **Severity** | 🟡 MEDIUM |
| **Priority** | P2 |
| **SRS Ref** | LYL-SRS-TEST-001 |

| # | Test | Priority | Target Suite |
|---|---|---|---|
| T1 | Full 4-step tenant creation wizard | 🔴 HIGH | NEW: `27-tenant-creation-wizard.spec.ts` |
| T2 | Suspend / Reactivate tenant via UI | 🔴 HIGH | `27-tenant-creation-wizard.spec.ts` |
| T3 | Extend trial with 90-day cap | 🟡 MEDIUM | `27-tenant-creation-wizard.spec.ts` |
| T4 | Plan deactivation with active subs (409) | 🟡 MEDIUM | `20-plan-rate-limits.spec.ts` |
| T5 | Impersonation flow (token backup + restore) | 🔴 HIGH | `27-tenant-creation-wizard.spec.ts` |
| T6 | WhatsApp override per-tenant (SA API) | 🟡 MEDIUM | `17-whatsapp-campaigns.spec.ts` |
| T7 | Billing self-subscribe (Owner → plan → confirm) | 🟡 MEDIUM | `09-settings-billing.spec.ts` |

---

## 6. Execution Phases

| Phase | Items | Dependencies | Effort |
|---|---|---|---|
| **Phase 1 — Critical Security** | REQ-001, REQ-003, REQ-005 | None | ~2 hours |
| **Phase 2 — UX / Flow** | REQ-002 | Depends on REQ-003 | ~1 hour |
| **Phase 3 — Data Integrity** | REQ-006, REQ-007, REQ-008, REQ-009 | None | ~2 hours |
| **Phase 4 — New Features** | REQ-004 (Mode Toggle), REQ-011 (Email Webhooks) | None | ~4 hours |
| **Phase 5 — Test Coverage** | E2E Tests (§5) | Depends on Phase 1-3 | ~3 hours |
| ~~Phase — Bootstrap~~ | ~~REQ-012~~ | — | ✅ RESOLVED |
| ~~Phase — Infrastructure~~ | ~~REQ-010~~ | — | ✅ RESOLVED |

---

## 7. Quick Reference Commands

```bash
# Run backend tests
docker exec loyallia-api pytest tests/ -q

# Run E2E tests
cd frontend && PLAYWRIGHT_BASE_URL=http://localhost PLAYWRIGHT_ALLOW_MUTATING_E2E=true \
  npx playwright test --project=chromium

# Verify Mailjet
docker exec loyallia-api python manage.py shell -c "
from apps.notifications.email_engine.client import get_health, is_mailjet_available
print('Health:', get_health())
print('SMTP Reachable:', is_mailjet_available())
"

# Check all Vault secrets
docker exec loyallia-api python manage.py check_vault_config

# Verify bootstrap idempotency
docker exec loyallia-api python manage.py seed_platform_settings
docker exec loyallia-api python manage.py seed_subscription_plans

# Full bootstrap (first time only)
deploy/bootstrap/bootstrap.sh

# Disaster recovery (from rescue files)
deploy/disaster_recovery/recover_from_rescue.sh
```

---

## 8. Verification Update — 2026-05-12

The previous stale E2E assumptions were rechecked against the current code and corrected.

### Implemented / Repaired

- SuperAdmin impersonation UI now sends the required owner PIN and support justification to the PIN-gated impersonation API, stores the SuperAdmin token only after a successful owner token response, and exposes labeled inputs for accessibility/testability.
- Stale SuperAdmin E2E suites were aligned to the current UI/API:
  - `27-tenant-creation-wizard.spec.ts`: current Plan → Tipo & Datos → Propietario → Sucursales order.
  - `28-tenant-lifecycle.spec.ts`: current tenant detail tabs/actions.
  - `29-plan-management.spec.ts`: real `409` API assertion for active-subscription plan deactivation.
  - `30-impersonation.spec.ts`: owner PIN setup, impersonation banner, return-to-admin flow.
  - `31-whatsapp-override.spec.ts`: current per-tenant WhatsApp daily-limit override API.
  - `32-billing-self-subscribe.spec.ts`: current `/billing` page and usage controls.
  - `13-dashboard-kpis.spec.ts`: waits for actual dashboard stats reload instead of fixed sleeps.

### Final Local Verification

```bash
docker compose up -d --build web
docker exec loyallia-api python manage.py check
cd frontend && npx tsc --noEmit --pretty false
git diff --check
cd frontend && PLAYWRIGHT_BASE_URL=http://localhost PLAYWRIGHT_ALLOW_MUTATING_E2E=true \
  npx playwright test --grep-invert "Phone Verification API"
```

Results:

- `docker exec loyallia-api python manage.py check`: passed.
- `cd frontend && npx tsc --noEmit --pretty false`: passed.
- `git diff --check`: passed.
- Safe full Playwright suite: `307 passed, 2 skipped (16.0m)`.
- Excluded intentionally: `Phone Verification API`, because it requires `PLAYWRIGHT_ALLOW_EXTERNAL_E2E=true` and may call external Twilio Verify.

---

*End of handoff. 12 REQ items (2 resolved, 10 pending) + 7 E2E test scenarios. Bootstrap idempotency verified. Mailjet LIVE in Vault since 2026-05-12T22:01Z. Plan seed overwrite fixed 2026-05-12T22:08Z.*
