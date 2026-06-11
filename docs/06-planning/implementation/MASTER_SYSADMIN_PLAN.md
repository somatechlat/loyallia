# LOYALLIA — MASTER SYS ADMIN IMPLEMENTATION PLAN
## Document ID: LYL-MASTER-ADMIN-2026-05-07
## Status: COMPREHENSIVE AUDIT & ROADMAP
## Classification: INTERNAL — AGENT & HUMAN READABLE

---

# SECTION 1: EXECUTIVE SUMMARY

## Current System State (2026-05-07)

After reading **every line** of code, documentation, configuration, and prior agent handoff files, here is the authoritative assessment:

| Domain | Status | Coverage | Notes |
|--------|--------|----------|-------|
| Backend API | 🟡 GOOD | 85% | Solid Django Ninja architecture, plan enforcement exists but not fully wired |
| Frontend Dashboard | 🟡 GOOD | 80% | Next.js 14 App Router, all major pages exist |
| Super Admin Panel | 🟡 FUNCTIONAL | 75% | Works but has gaps — no audit viewer, no real-time, synthetic data |
| Tenant Creation | 🟢 WORKS | 90% | 4-step wizard functional; creates TRIAL subscription only when plan_slug == "trial", otherwise ACTIVE paid subscription |
| Plan Management | 🟢 WORKS | 95% | Full CRUD with validation, feature flags, rate limits |
| Integration Settings | 🟢 WORKS | 90% | Vault editor functional for 12 integration groups (wallet, payments, mailjet, WhatsApp, Twilio, Apple NFC, AI, backup) |
| Billing/Subscriptions | 🟡 PARTIAL | 75% | `/billing/subscribe/` creates subscription + invoice with `PAST_DUE` status; payment is manual/offline verification (no self-service card checkout) |
| Analytics Backend | 🟡 PARTIAL | 65% | Overview works; revenue, visits, demographics exist in advanced analytics but require `advanced_analytics` feature |
| Audit/Compliance | 🟢 WORKS | 85% | Immutable AuditLog, SuperAdmin API exists, NO frontend viewer |
| Tests | 🟡 PARTIAL | 40% | 460 backend tests pass, Playwright E2E written but NEVER RUN |
| Documentation | 🟢 EXCELLENT | 95% | SRS, Architecture, BDR, Compliance all documented |

## Critical Finding: The Billing Gap

The `/billing/subscribe/` endpoint creates a paid `Subscription` (status `PAST_DUE`) and an `Invoice`, then returns `manual_verification_required: true`. It does **not** trigger an online card checkout or payment-gateway charge. The `BillingService.subscribe()` method exists but is **not called** by the API; `process_subscription()` is used instead. This means:
- Tenants can select a plan and generate an invoice, but payment must be verified manually
- There is no self-service card checkout or automated webhook confirmation
- SuperAdmin cannot yet upgrade a tenant's plan directly from the admin panel

## Critical Finding: Synthetic Data in Admin Metrics

The `/superadmin/metrics` page generates **synthetic monthly growth data** by spreading current totals across six months (`monthlyGrowth` in `frontend/src/app/(dashboard)/superadmin/metrics/page.tsx`). It does NOT query the `DailyAnalytics` materialized table. A platform-level `/admin/platform/growth/` endpoint does not exist.

---

# SECTION 2: COMPLETE FLOWCHARTS

## FLOWCHART 1: Tenant Creation Flow (SuperAdmin)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SUPERADMIN CREATES NEW TENANT                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: ENTITY TYPE SELECTION                                               │
│  ┌──────────────┐    ┌──────────────┐                                       │
│  │ PERSONA      │    │ PERSONA      │                                       │
│  │ JURÍDICA     │ or │ NATURAL      │                                       │
│  │ (RUC)        │    │ (Cédula)     │                                       │
│  └──────────────┘    └──────────────┘                                       │
│                                                                             │
│  → Sets: entity_type, conditional validation on RUC (13 digits)             │
│          or Cédula (10 digits)                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: BUSINESS DATA                                                       │
│  • name (commercial name)                                                   │
│  • legal_name / full_name                                                   │
│  • ruc OR cedula                                                            │
│  • industry (enum: food_beverage, retail, fashion, etc.)                    │
│  • province (24 Ecuador provinces)                                          │
│  • city, address, phone, email, website                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: OWNER DATA                                                          │
│  • owner_first_name, owner_last_name                                        │
│  • owner_email (must be unique)                                             │
│  • owner_cedula                                                             │
│                                                                             │
│  → System generates random temp password (secrets.token_urlsafe(8))         │
│  → Password is emailed to owner (if email SMTP configured)                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: LOCATIONS                                                           │
│  • Array of LocationIn: name, address, city, lat, lng, is_primary           │
│  • First location auto-marked is_primary=True if none specified             │
│  • Optional: LocationPicker map for GPS coordinates                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 5: PLAN SELECTION                                                      │
│  • plan_slug (from active SubscriptionPlans)                                │
│  • billing_cycle: monthly | annual                                          │
│                                                                             │
│  NOTE: If plan_slug == "trial", the subscription is TRIALING. Otherwise it  │
│        is ACTIVE with current_period_start/end set immediately.             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ ATOMIC TRANSACTION (backend/apps/tenants/super_admin_api/tenants.py)        │
│                                                                             │
│  1. Create Tenant:                                                          │
│     • slug = slugify(name)                                                  │
│     • country = "EC"                                                        │
│     • plan = "trial" (denormalized, deprecated)                             │
│     • is_active = True                                                      │
│                                                                             │
│  2. Create User (OWNER):                                                    │
│     • role = "OWNER"                                                        │
│     • tenant = new_tenant                                                   │
│     • password = temp_password (hashed with Argon2)                         │
│                                                                             │
│  3. Create Location(s):                                                     │
│     • All locations linked to tenant                                        │
│                                                                             │
│  4. Create Subscription:                                                    │
│     • subscription_plan = plan from slug                                    │
│     • status = TRIALING if plan_slug == "trial", else ACTIVE                │
│     • trial_start / trial_end only set for trial plans                      │
│     • current_period_start / current_period_end set for active paid plans   │
│     • billing_cycle = from payload                                          │
│     • plan capacity validated against PlatformSetting PLAN_CAPACITY_<slug>  │
│                                                                             │
│  5. Sync Tenant:                                                            │
│     • tenant.trial_end = subscription.trial_end                             │
│                                                                             │
│  6. Audit Log:                                                              │
│     • action = "CREATE", resource_type = "Tenant"                           │
│     • actor = SuperAdmin user                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ RESPONSE TO FRONTEND (CreateTenantOut)                                      │
│  {                                                                          │
│    "success": true,                                                         │
│    "message": "Negocio registrado",                                         │
│    "tenant_id": "<uuid>",                                                   │
│    "owner_id": "<uuid>",                                                    │
│    "owner_email": "owner@example.com",                                      │
│    "temp_password": "abc123xyz"  ← ONLY SHOWN ONCE                          │
│  }                                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## FLOWCHART 2: Plan Creation/Edit Flow (SuperAdmin)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PLAN MANAGEMENT LIFECYCLE                               │
└─────────────────────────────────────────────────────────────────────────────┘

CREATE NEW PLAN                           EDIT EXISTING PLAN
      │                                         │
      ▼                                         ▼
┌─────────────┐                        ┌──────────────────┐
│ Click "Nuevo│                        │ Click plan card  │
│ Plan"       │                        │ on /superadmin/  │
└─────────────┘                        │ plans            │
      │                                └──────────────────┘
      │                                         │
      ▼                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PLAN MODAL (3-Column Form)                                                  │
│                                                                             │
│ COLUMN 1 — IDENTIDAD Y PRECIOS:                                             │
│   • name, slug, description                                                 │
│   • price_monthly, price_annual (USD)                                       │
│   • trial_days (default 14)                                                 │
│   • sort_order                                                              │
│                                                                             │
│ COLUMN 2 — LÍMITES Y MENSAJERÍA:                                            │
│   • max_locations, max_users, max_customers, max_programs                   │
│   • max_notifications_month, max_transactions_month                         │
│   • max_whatsapp_day (hard cap 200)                                         │
│   • max_emails_month, max_sms_day, max_wallet_pushes_month                  │
│   • max_automations, max_automation_executions_day                          │
│   • max_ai_queries_month, max_api_calls_day, max_exports_month              │
│                                                                             │
│ COLUMN 3 — CARACTERÍSTICAS Y VISIBILIDAD:                                   │
│   • Feature tag selector (whatsapp_campaigns, sms_campaigns, etc.)          │
│   • is_active toggle                                                        │
│   • is_featured toggle                                                      │
│                                                                             │
│ VALIDATION (plan_validation.py):                                            │
│   • Unknown features → REJECTED                                             │
│   • Feature enabled but limit=0 → REJECTED                                  │
│   • Feature disabled but limit>0 → REJECTED                                 │
│   • max_whatsapp_day > 200 → REJECTED                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ API CALL                                                                    │
│  POST /api/v1/admin/plans/         (create)                                 │
│  PATCH /api/v1/admin/plans/{id}/   (update)                                 │
│                                                                             │
│  Auth: SUPER_ADMIN + jwt_auth                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ SOFT DELETE (Deactivate)                                                    │
│  DELETE /api/v1/admin/plans/{id}/                                           │
│                                                                             │
│  → Sets is_active=False AND status=ARCHIVED                                 │
│  → REJECTED if any active subscriptions use this plan                       │
│  → Audit logged (ADMIN_PLAN_DEACTIVATED)                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## FLOWCHART 3: Subscription Lifecycle (Tenant Perspective)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SUBSCRIPTION STATE MACHINE                              │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │   START     │
                              │ (No Sub)    │
                              └──────┬──────┘
                                     │
                    SuperAdmin creates tenant
                    OR Owner registers
                                     │
                                     ▼
                              ┌─────────────┐
                              │  TRIALING   │◄─────────────────────────┐
                              │             │                          │
                              │ • Only if created/registered with       │
                              │   plan_slug == "trial"                  │
                              │ • Plan limits enforced                  │
                              │ • trial_end = now + N days             │
                              └──────┬──────┘                          │
                                     │                                  │
           ┌─────────────────────────┼─────────────────────────┐        │
           │                         │                         │        │
           ▼                         ▼                         ▼        │
    ┌─────────────┐          ┌─────────────┐          ┌─────────────┐   │
    │ TRIAL ENDS  │          │ OWNER SUBS  │          │ SUPERADMIN  │   │
    │ (no payment)│          │ CRIBES      │          │ EXTENDS     │   │
    └──────┬──────┘          └──────┬──────┘          └──────┬──────┘   │
           │                        │                        │          │
           ▼                        ▼                        │          │
    ┌─────────────┐          ┌─────────────┐                 │          │
    │  SUSPENDED  │          │   ACTIVE    │─────────────────┘          │
    │             │          │             │   (reactivate)             │
    │ • Read-only │          │ • Paid plan │                            │
    │ • No scans  │          │ • Limits enforced                      │
    │ • No pushes │          │ • Period start/end                     │
    └──────┬──────┘          └──────┬──────┘                            │
           │                        │                                   │
           │         ┌──────────────┼──────────────┐                    │
           │         │              │              │                    │
           │         ▼              ▼              ▼                    │
           │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │
           │  │  CANCELLED  │ │  PAST_DUE   │ │ OWNER DOWN- │         │
           │  │ (at period  │ │ (payment    │ │ GRADES plan │         │
           │  │  end)       │ │  failed)    │ │             │         │
           │  └─────────────┘ └──────┬──────┘ └──────┬──────┘         │
           │                         │               │                │
           │                         ▼               │                │
           │                  ┌─────────────┐        │                │
           │                  │  SUSPENDED  │        │                │
           │                  │ (after 3    │        │                │
           │                  │  failures)  │        │                │
           │                  └──────┬──────┘        │                │
           │                         │               │                │
           └─────────────────────────┴───────────────┘                │
                                     │                                │
                                     ▼                                │
                              ┌─────────────┐                        │
                              │ SUPERADMIN  │────────────────────────┘
                              │ REACTIVATES │   (extend trial)
                              └─────────────┘
```

## FLOWCHART 4: Integration/Vault Configuration Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                INTEGRATION DIAGNOSTICS & VAULT EDITOR                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: LOAD INTEGRATIONS                                                   │
│  GET /api/v1/admin/platform/integrations/                                   │
│                                                                             │
│  Returns array of 13 integrations (as implemented in integration_config.py):│
│  ┌─────────────────────┬───────────┬────────────┬─────────────────────────┐ │
│  │ Integration         │ Enabled   │ Configured │ Status                  │ │
│  ├─────────────────────┼───────────┼────────────┼─────────────────────────┤ │
│  │ Google Wallet       │ true/false│ true/false │ configured / missing_   │ │
│  │ Apple Wallet        │ true/false│ true/false │ configured / missing_   │ │
│  │ Payments            │ true/false│ true/false │ active / disabled       │ │
│  │ Google OAuth        │ true/false│ true/false │ configured / missing_   │ │
│  │ Mailjet Email       │ true      │ true/false │ configured / missing_   │ │
│  │ WhatsApp Bridge     │ true/false│ true/false │ configured / missing_   │ │
│  │ Twilio SMS          │ true/false│ true/false │ configured / missing_   │ │
│  │ Twilio Verify       │ true/false│ true/false │ configured / missing_   │ │
│  │ Twilio API Key      │ true/false│ true/false │ configured / missing_   │ │
│  │ Twilio Test         │ true/false│ true/false │ configured / missing_   │ │
│  │ Apple NFC           │ true/false│ true/false │ configured / missing_   │ │
│  │ AI Agent            │ true/false│ true/false │ configured / missing_   │ │
│  │ Backup & DR         │ true      │ true      │ active                  │ │
│  └─────────────────────┴───────────┴────────────┴─────────────────────────┘ │
│                                                                             │
│  Each includes:                                                             │
│    • diagnostics: { ...health_checks }                                      │
│    • preview_values: non-secret identifiers only (secrets are redacted)     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: EDIT VAULT SECRETS                                                  │
│  Click "Configurar credenciales en Vault →"                                 │
│                                                                             │
│  Expands inline editor with fields defined in:                              │
│    frontend: INTEGRATION_FIELDS constant                                    │
│    backend: ALLOWED_INTEGRATION_KEYS (integration_config.py)                │
│                                                                             │
│  Field types: text | textarea | select | password                           │
│                                                                             │
│  For each field:                                                            │
│    • Shows diagnostic status (✅ Configurado / ❌ No configurado)           │
│    • Input for new value                                                    │
│    • "Guardar en Vault" button                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: SAVE TO VAULT                                                       │
│  PUT /api/v1/admin/platform/integrations/{key}/secret/                      │
│  Body: { "key": "<field_key>", "value": "<new_value>" }                     │
│                                                                             │
│  Backend:                                                                   │
│    1. Validate integration_key exists in ALLOWED_INTEGRATION_KEYS           │
│    2. Validate field_key is in allowed list for that integration            │
│    3. Normalize/validate high-risk values (PEM, JSON, SIDs, etc.)           │
│    4. Call common.vault.put_secret(key, value)                              │
│    5. Log to AuditLog: action="UPDATE", resource_type="vault_secret"        │
│    6. Return success                                                        │
│                                                                             │
│  Security:                                                                  │
│    • Only SUPER_ADMIN can call this endpoint                                │
│    • Secrets are NEVER returned in API responses                            │
│    • Audit trail is immutable                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## FLOWCHART 5: Impersonation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     IMPERSONATION (SUPPORT / DEBUG)                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TRIGGER: SuperAdmin clicks "Impersonar Propietario" in tenant detail        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND ACTIONS                                                            │
│  1. Collect 6-digit OWNER security PIN and justification (min 10 chars)    │
│  2. confirm() dialog: "¿Impersonar a [tenant.name]?"                        │
│  3. Save current SuperAdmin token to sessionStorage:                        │
│       sessionStorage.setItem("superadmin_token", current_access_token)      │
│       sessionStorage.setItem("impersonation_started_at", Date.now())        │
│  4. Call API: POST /api/v1/admin/tenants/{id}/impersonate/                  │
│       Body: { owner_pin: "<6-digit PIN>", justification: "..." }            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ BACKEND: POST /api/v1/admin/tenants/{tenant_id}/impersonate/                │
│                                                                             │
│  1. Verify request.user is SUPER_ADMIN                                      │
│  2. Fetch tenant's OWNER user (role="OWNER", tenant=tenant)                 │
│  3. Validate justification (min 10 chars) and owner security PIN            │
│     • 3 failed PIN attempts trigger 15-minute lockout (Redis cache)         │
│     • Returns 400 if owner has not set a security PIN                       │
│  4. Generate NEW access_token JWT:                                          │
│       • user_id = owner_user.id                                             │
│       • role = "OWNER"                                                      │
│       • tenant_id = tenant.id                                               │
│       • impersonated = true                                                 │
│       • impersonated_by = superadmin_user.id                                │
│       • type = "access"                                                     │
│       • exp = now + 60 minutes                                              │
│                                                                             │
│  5. AuditLog: action="IMPERSONATE", resource_type="tenant"                  │
│       • justification = payload justification                               │
│       • actor = superadmin, target = owner                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND: RECEIVE TOKEN                                                     │
│  1. Cookies.set("access_token", new_token, { expires: 1/24 })               │
│  2. window.location.href = "/"  ← Redirect to OWNER dashboard               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ IMPERSONATION BANNER (shown on all pages)                                   │
│  • Purple banner at top: "Modo impersonación activo (MM:SS restante)"       │
│    with a "← Volver al Admin" button                                        │
│  • Timer counts down from 60 minutes                                        │
│  • "Volver al Admin" button:                                                │
│       1. Retrieves superadmin_token from sessionStorage                     │
│       2. Restores access_token cookie                                       │
│       3. Clears sessionStorage keys                                         │
│       4. Redirects to /superadmin/tenants                                   │
│                                                                             │
│  • Auto-expiry: If sessionStorage.impersonation_started_at > 1hr ago        │
│    → Auto-redirects back to /superadmin/tenants                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## FLOWCHART 6: Broadcast Email Flow

> ⚠️ **PARTIALLY IMPLEMENTED AS OF 2026-06-11.** The SuperAdmin broadcast UI
> exists (`frontend/src/components/superadmin/settings/BroadcastPanel.tsx`, wired
> in `SysAdminOperations.tsx`) and already calls `POST /api/v1/admin/broadcast/`.
> However, the backend endpoint is **not implemented**; the request will 404.
> Use tenant-level campaigns (Email channel) for mass email until the endpoint
> is added.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     GLOBAL BROADCAST EMAIL (PLANNED)                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ SUPERADMIN COMPOSES MESSAGE                                                 │
│  Form:                                                                      │
│    • subject (required)                                                     │
│    • message body (required)                                                │
│                                                                             │
│  Submit → POST /api/v1/admin/broadcast/   [ENDPOINT NOT IMPLEMENTED]        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ EXPECTED BACKEND PROCESSING (WHEN BUILT)                                    │
│  1. Validate SUPER_ADMIN role                                               │
│  2. Query owners across all tenants                                         │
│  3. For each owner:                                                         │
│       send_mail(subject, message, from=EMAIL_FROM, to=[owner_email])        │
│  4. Returns: { "message": "Enviado a N propietarios" }                      │
│                                                                             │
│  NOTE: A real implementation should use Mailjet templates, opt-out footers, │
│        and delivery-event tracking via the existing /webhooks/mailjet/      │
│        webhook handler.                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## FLOWCHART 7: Platform Settings Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PLATFORM SETTINGS (DB-Driven)                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ DATA MODEL: PlatformSetting                                                 │
│  • key (unique, indexed)                                                    │
│  • value (TextField)                                                        │
│  • description                                                              │
│  • category                                                                 │
│  • requires_restart (bool)                                                  │
│  • updated_at                                                               │
│                                                                             │
│  CACHE: Redis TTL configured by settings (_PLATFORM_SETTING_CACHE_TTL)      │
│  READ: PlatformSetting.get(key, default) → checks Redis first               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ CURRENT SEEDED SETTINGS (backend/apps/tenants/fixtures/platform_settings):  │
│  ┌────────────────────────────┬───────────────┬───────────────────────────┐ │
│  │ Key                        │ Default Value │ Category                  │ │
│  ├────────────────────────────┼───────────────┼───────────────────────────┤ │
│  │ TRIAL_DAYS                 │ 14            │ billing                   │ │
│  │ TAX_RATE_ECUADOR           │ 0.15          │ billing                   │ │
│  │ DEFAULT_TIMEZONE           │ America/      │ system                    │ │
│  │                            │ Guayaquil     │                           │ │
│  └────────────────────────────┴───────────────┴───────────────────────────┘ │
│                                                                             │
│  Other keys (e.g. mailjet_sender_email, backup_frequency, PLATFORM_MODE)    │
│  are created at runtime via Vault or admin endpoints. MAX_TRIAL_EXTENSION_  │
│  DAYS, PASS_GENERATION_TIMEOUT, PUSH_BATCH_SIZE, ENABLE_REGISTRATION and    │
│  MAINTENANCE_MODE are NOT present in the current fixture set.               │
│                                                                             │
│  NOTE: The settings UI auto-populates from GET /platform/settings/          │
│        and renders each as a labeled input with "Guardar" button            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION 3: GAP ANALYSIS — WHAT'S MISSING

## 🔴 CRITICAL GAPS (P0)

### GAP-001: Billing Payment Flow is Manual-Only
**Location:** `backend/apps/billing/api.py`, `frontend/src/app/(dashboard)/billing/page.tsx`
**Problem:** The `/billing/subscribe/` endpoint creates a paid `Subscription` (status `PAST_DUE`) and an `Invoice`, then returns `manual_verification_required: true`. It does **not** perform an online card charge or redirect to a payment-gateway checkout. `BillingService.subscribe()` exists but is unused; the API calls `process_subscription()` instead.
**Impact:** Tenants can generate an invoice, but payment must be verified offline. There is no self-service card checkout or automated webhook confirmation.
**Fix Required:**
1. Integrate a PCI-compliant payment gateway (Stripe/PlacetoPay/etc.) into `/billing/subscribe/`
2. Return a real checkout URL/session_token instead of `manual_verification_required`
3. Build a checkout redirect/confirmation page in the frontend
4. Implement and secure the corresponding payment webhooks

### GAP-002: No Audit Log Viewer in SuperAdmin
**Location:** Missing frontend page
**Problem:** `AuditLog` model is perfect (immutable, 7-year retention), API endpoint `/admin/audit/` exists, but there is NO frontend page to view logs.
**Impact:** SuperAdmin cannot investigate incidents, trace user actions, or comply with LOPDP audit requirements.
**Fix Required:**
1. Create `/superadmin/audit` page
2. Table view: timestamp, actor, action, resource, status, IP
3. Filters: by date, action type, actor, tenant
4. Export to CSV

### GAP-003: No Admin-Controlled Plan Assignment for Tenants
**Location:** Missing API + UI
**Problem:** SuperAdmin cannot directly change a tenant's subscription plan. The only plan-related action is trial extension.
**Impact:** Manual billing adjustments, support upgrades, comped accounts impossible.
**Fix Required:**
1. API: `POST /admin/tenants/{id}/change-plan/` with plan_slug + justification
2. UI: Plan selector in tenant detail "Acciones" tab
3. Audit log every change

## 🟡 HIGH GAPS (P1)

### GAP-004: Synthetic Data in Metrics
**Location:** `frontend/src/app/(dashboard)/superadmin/metrics/page.tsx`
**Problem:** Monthly growth chart uses fabricated accumulation algorithm, not real `DailyAnalytics` data.
**Impact:** SuperAdmin makes decisions on fake data.
**Fix Required:**
1. Backend: `GET /admin/platform/growth/?months=6` endpoint
2. Query `DailyAnalytics` for real tenant/user/location counts per day
3. Frontend: Replace synthetic data with real API data

### GAP-005: No Platform-Level User Management
**Location:** Missing
**Problem:** SuperAdmin cannot view, search, or manage platform users (non-tenant-specific).
**Impact:** Cannot help users with login issues, cannot suspend abusive users.
**Fix Required:**
1. API: `GET /admin/users/` with search/pagination
2. UI: `/superadmin/users` page
3. Actions: reset password, deactivate, view audit trail

### GAP-006: No System Health Dashboard for Admin
**Location:** Missing
**Problem:** Health checks exist (`/health/`, `/health/ready/`, `/health/celery/`) but are not visualized for SuperAdmin.
**Impact:** Admin must `curl` endpoints manually to check system status.
**Fix Required:**
1. API: `GET /admin/platform/health/` aggregating all checks
2. UI: Health cards: DB, Redis, Celery, MinIO, Vault, Queue depths
3. Real-time status indicators

### GAP-007: Tenant Detail Missing Subscription Info
**Location:** `frontend/src/app/(dashboard)/superadmin/tenants/page.tsx`
**Problem:** The detail modal shows "Plan" as a string badge but no subscription details (trial end, billing cycle, invoices).
**Impact:** Admin cannot see full billing context for a tenant.
**Fix Required:**
1. Add "Suscripción" tab to tenant detail modal
2. Show: plan name, status, trial dates, billing cycle, payment method, invoice history

### GAP-008: No Admin-Initiated Password Reset
**Location:** Missing
**Problem:** If a tenant owner forgets password, they must use self-service flow. Admin cannot help.
**Impact:** Support friction.
**Fix Required:**
1. API: `POST /admin/tenants/{id}/reset-owner-password/` → generates new temp password
2. UI: Button in tenant detail "Acciones" tab
3. Auto-email temp password to owner

### GAP-009: SuperAdmin Broadcast Email Endpoint Missing
**Location:** Missing backend endpoint (schema `BroadcastIn` exists in `backend/apps/tenants/super_admin_api/schemas.py`); UI already implemented in `frontend/src/components/superadmin/settings/BroadcastPanel.tsx`.
**Problem:** The frontend broadcast panel calls `POST /api/v1/admin/broadcast/`, but no backend route handles it. The `platform.py` module does not contain any broadcast logic.
**Impact:** SuperAdmin cannot send mass email to all tenant owners (the UI will 404).
**Fix Required:**
1. Add `POST /api/v1/admin/broadcast/` endpoint behind SUPER_ADMIN auth
2. Use Mailjet (or configured email backend) with HTML templates, unsubscribe footer, and delivery tracking via the existing `/webhooks/mailjet/` handler
3. The UI at `/superadmin/settings` (Operations tab) already exists and can be used once the endpoint is wired

### GAP-010: No Bulk Operations on Tenants
**Location:** Missing
**Problem:** Can only suspend/reactivate one tenant at a time.
**Impact:** Time-consuming for platform-wide maintenance.
**Fix Required:**
1. Multi-select in tenant table
2. Bulk actions: suspend, reactivate, extend trial, export

## 🟢 MEDIUM GAPS (P2)

### GAP-011: Metrics Page Missing Real-Time Updates
**Location:** `frontend/src/app/(dashboard)/superadmin/metrics/page.tsx`
**Problem:** Data loads once on mount. No refresh button, no auto-refresh.
**Fix:** Add refresh button + optional 60s auto-refresh

### GAP-012: Plan Cards on Frontend Billing Page are Hardcoded
**Location:** `frontend/src/app/(dashboard)/billing/page.tsx`
**Problem:** The plan comparison table shows static Starter/Pro/Enterprise values, not actual DB plan data.
**Fix:** Fetch plans from the existing `GET /api/v1/billing/plans/` endpoint (`backend/apps/billing/api.py:82`) and render dynamically

### GAP-013: No SuperAdmin-Initiated Tenant Data Export
**Location:** `backend/apps/tenants/security_privacy_api.py` (tenant-facing only)
**Problem:** A tenant owner can export their own data via `GET /api/v1/tenants/data-export/` (using `generate_tenant_export()`), but SuperAdmin has no equivalent endpoint or UI to export any tenant's data for GDPR/LOPDP portability requests.
**Fix:** Add `GET /api/v1/admin/tenants/{id}/export/` behind SUPER_ADMIN auth and a corresponding download button in the tenant detail modal.

### GAP-014: Missing Role for Support Staff
**Location:** `backend/apps/authentication/models.py`
**Problem:** Only SUPER_ADMIN can access admin panel. No intermediate role for support staff.
**Fix:** Add `SUPPORT` role with limited admin access (view only, no destructive actions)

### GAP-015: No Webhook Management UI
**Location:** Missing
**Problem:** Payment webhooks are handled but there's no UI to view webhook event history, retry failed webhooks, or debug.
**Fix:** Webhook event log page in admin

---

# SECTION 4: IMPLEMENTATION PHASES

## PHASE 1: FOUNDATION FIXES (Week 1) — P0 Critical

### 1.1 Create Audit Log Viewer
**Files to create:**
- `frontend/src/app/(dashboard)/superadmin/audit/page.tsx`
- `frontend/src/components/superadmin/audit/AuditLogTable.tsx`
- `frontend/src/components/superadmin/audit/AuditLogFilters.tsx`

**Backend changes:**
- Enhance `GET /admin/audit/` with query params: `?action=&actor_id=&tenant_id=&from=&to=&search=`
- Add `GET /admin/audit/actions/` → distinct action types for filter dropdown

**Flowchart:**
```
SuperAdmin → /superadmin/audit
    │
    ▼
Load filters (action types, date range, tenant search)
    │
    ▼
GET /admin/audit/?page=1&limit=25&action=CREATE
    │
    ▼
Render table: Time | Actor | Role | Action | Resource | Status | IP
    │
    ▼
Click row → Expand details (JSON diff, justification)
    │
    ▼
Export → CSV download (triggers new audit log entry!)
```

### 1.2 Add Subscription Management to Tenant Detail
**Files to modify:**
- `backend/apps/tenants/super_admin_api/tenants.py` — add endpoints
- `frontend/src/app/(dashboard)/superadmin/tenants/page.tsx` — add "Suscripción" tab

**New API endpoints:**
- `GET /admin/tenants/{id}/subscription/` → full subscription details
- `POST /admin/tenants/{id}/change-plan/` → change plan with justification
- `POST /admin/tenants/{id}/extend-trial/` → already exists, add to UI
- `GET /admin/tenants/{id}/invoices/` → already exists, add to UI

### 1.3 Add Owner Password Reset
**New endpoint:**
- `POST /admin/tenants/{id}/reset-owner-password/`
- Generates new temp password
- Emails owner
- Audit logged

## PHASE 2: BILLING ENABLEMENT (Week 2) — P0 Critical

### 2.1 Wire Payment Processing
**Files to modify:**
- `backend/apps/billing/api.py` — replace manual invoice flow with real payment gateway
- `backend/apps/billing/services.py` — extend `process_subscription()` to charge/authorize
- `frontend/src/app/(dashboard)/billing/page.tsx` — add plan selection modal

### 2.2 Create Checkout Flow
**New files:**
- `frontend/src/components/billing/PlanSelectorModal.tsx`
- `frontend/src/components/billing/CheckoutRedirect.tsx`

**Current flow (manual):**
```
Owner clicks "Mejorar Plan"
    │
    ▼
Redirect to /billing/upgrade (hardcoded comparison table)
    │
    ▼
Select plan + billing_cycle
    │
    ▼
POST /billing/subscribe/ → returns { invoice_id, amount_due, manual_verification_required: true }
    │
    ▼
Payment must be verified offline by the platform operator
```

**Target flow (when gateway integrated):**
```
Owner clicks "Mejorar Plan"
    │
    ▼
Show PlanSelectorModal (fetches from the existing GET /api/v1/billing/plans/ endpoint)
    │
    ▼
Select plan + billing_cycle
    │
    ▼
POST /billing/subscribe/ → returns { gateway_url, session_token }
    │
    ▼
Redirect to payment gateway
    │
    ▼
Gateway redirects back to /billing/confirm?token=xxx
    │
    ▼
Frontend calls POST /billing/confirm/ → activates paid subscription
```

### 2.3 SuperAdmin Plan Assignment
**New API:** `POST /admin/tenants/{id}/change-plan/`
- Allows SuperAdmin to override tenant plan
- Requires justification (audit logged)
- Optionally skip payment (comped accounts)

## PHASE 3: ANALYTICS & METRICS (Week 3) — P1 High

### 3.1 Real Growth Data API
**New endpoint:** `GET /admin/platform/growth/?months=6`
- Query `DailyAnalytics` model
- Return real cumulative data for tenants, users, locations

### 3.2 Real-Time Health Dashboard
**New page:** `/superadmin/health`
- Cards for each service: DB, Redis, Celery, MinIO, Vault
- Status: 🟢 Healthy / 🟡 Degraded / 🔴 Down
- Last checked timestamp
- Auto-refresh every 30 seconds

### 3.3 Enhanced Metrics Page
- Replace synthetic growth data with real `/platform/growth/` data
- Add refresh button
- Add date range selector
- Add CSV export

## PHASE 4: PLATFORM USER MANAGEMENT (Week 4) — P1 High

### 4.1 Platform Users Page
**New page:** `/superadmin/users`
- Table: all users across all tenants
- Search by name, email, role
- Filter by role, tenant, status
- Actions: view profile, reset password, deactivate, view audit trail

### 4.2 Enhanced Broadcast
- HTML email template
- Rich text editor (or markdown)
- Preview before send
- Delivery statistics
- Schedule for later

## PHASE 5: POLISH & ADVANCED FEATURES (Week 5-6) — P2 Medium

### 5.1 Bulk Operations
- Multi-select tenants with checkboxes
- Bulk suspend/reactivate/extend trial
- Bulk export

### 5.2 Tenant Data Export
- GDPR/LOPDP compliance export
- ZIP file with: customers.csv, transactions.csv, passes.csv, enrollments.csv

### 5.3 Webhook Event Log
- New page: `/superadmin/webhooks`
- Table: event_id, type, status, attempts, last error
- Retry button for failed events

### 5.4 Support Role
- New `SUPPORT` role in UserRole enum
- Can view tenants, users, audit logs
- Cannot modify plans, vault secrets, or broadcast

---

# SECTION 5: UPDATED FILE INVENTORY

## Backend Files (SuperAdmin-related)

| File | Lines | Status | Action Needed |
|------|-------|--------|---------------|
| `backend/apps/tenants/super_admin_api/tenants.py` | 625 | 🟡 Functional | Add subscription mgmt, password reset, plan change |
| `backend/apps/tenants/super_admin_api/impersonation.py` | 185 | 🟢 Good | PIN-gated; no changes needed |
| `backend/apps/tenants/super_admin_api/platform.py` | 612 | 🟡 Functional | Docstring mentions broadcast/plan CRUD, but broadcast is missing and plan CRUD lives in `platform_plans.py`; add growth API, health API, broadcast endpoint |
| `backend/apps/tenants/super_admin_api/schemas.py` | 543 | 🟢 Good | Add schemas for new endpoints |
| `backend/apps/tenants/super_admin_api/integration_config.py` | 493 | 🟢 Good | No changes needed |
| `backend/apps/tenants/super_admin_api/plan_validation.py` | 87 | 🟢 Good | No changes needed |
| `backend/apps/audit/api.py` | 198 | 🟢 Good | Enhance filtering |
| `backend/apps/billing/api.py` | 554 | 🟡 Manual | Integrate real payment gateway |
| `backend/apps/billing/service.py` | 238 | 🟡 Unused | Wire into API or deprecate |

## Frontend Files (SuperAdmin-related)

| File | Lines | Status | Action Needed |
|------|-------|--------|---------------|
| `frontend/src/app/(dashboard)/superadmin/page.tsx` | ~200 | 🟢 Good | Add auto-refresh |
| `frontend/src/app/(dashboard)/superadmin/tenants/page.tsx` | ~800 | 🟡 Functional | Add subscription tab, plan change, password reset |
| `frontend/src/app/(dashboard)/superadmin/metrics/page.tsx` | ~288 | 🟡 Synthetic | Replace fake data |
| `frontend/src/app/(dashboard)/superadmin/plans/page.tsx` | ~200 | 🟢 Good | Minor polish |
| `frontend/src/app/(dashboard)/superadmin/settings/page.tsx` | ~500 | 🟢 Good | Minor polish |
| `frontend/src/components/superadmin/plans/PlanModal.tsx` | 568 | 🟢 Good | No changes needed |

---

# SECTION 6: TESTING PLAN

### Backend Tests
- `test_superadmin_tenants.py` — CRUD, wizard, actions, impersonation
- `test_superadmin_platform.py` — metrics, integrations, settings
- `test_superadmin_plans.py` — plan CRUD, validation
- `test_audit_log.py` — immutability, filtering, export
- `test_billing.py` — subscription flow, payment gateway, webhooks

### Frontend E2E Tests (Playwright)
- `21-superadmin-audit.spec.ts` — audit log viewer
- `22-superadmin-subscription.spec.ts` — plan change, trial extend
- `23-superadmin-health.spec.ts` — health dashboard
- `24-superadmin-users.spec.ts` — platform user management
- `25-billing-checkout.spec.ts` — plan upgrade flow

---

# SECTION 7: SECURITY CHECKLIST

For every new SuperAdmin endpoint:
- [ ] `auth=jwt_auth` applied
- [ ] `is_super_admin()` check as first line
- [ ] All inputs validated with Pydantic schema
- [ ] No secrets exposed in responses
- [ ] Audit log entry created
- [ ] Rate limiting applied
- [ ] Sensitive actions require confirmation/justification

---

# SECTION 8: COMPLIANCE NOTES

### LOPDP (Ecuador) Requirements
1. **Audit Trail** — ✅ Immutable AuditLog exists
2. **Data Export** — 🟡 Tenant owner export exists; needs SuperAdmin-initiated UI
3. **Breach Notification** — 🔴 Missing (see docs/05-compliance/COMPLIANCE_CHECKLIST.md)
4. **Retention Policy** — 🟡 Documented but not automated

### GDPR Requirements
1. **Right to Access** — 🟡 Tenant owner can self-export; SuperAdmin-initiated export missing
2. **Right to Deletion** — 🟡 Admin can suspend but not fully purge (hard-delete exists for SuperAdmin with justification)
3. **Data Processing Records** — 🟢 AuditLog serves this purpose

---

END OF MASTER PLAN
