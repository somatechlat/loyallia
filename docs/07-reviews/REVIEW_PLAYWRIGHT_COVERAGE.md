# Playwright E2E Test Coverage Review — Loyallia Frontend

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Test Files | 31 (numbered 01-32, skipping 24) |
| Total Estimated Tests | ~230+ individual test cases |
| Roles Covered | OWNER, MANAGER, STAFF, SUPERADMIN |
| Feature Areas | 16 |
| Test Quality Grade | B+ (good coverage, some flaky patterns) |

---

## 1. Coverage Matrix

| Feature | Test File(s) | Test Count | Status | Notes |
|---------|-------------|------------|--------|-------|
| **Auth (login/register)** | 01-auth.spec.ts | 17 | GOOD | All 4 roles, OAuth, form validation, API tokens, health |
| **Dashboard / KPIs** | 13-dashboard-kpis.spec.ts | 7 | GOOD | Date filters, tabs, chart switching, API structure |
| **Programs / Cards** | 02-programs.spec.ts, 14-program-crud-full.spec.ts, 16-srs-hardening.spec.ts | 26 | GOOD | CRUD wizard, borradores, FormBuilder, coupon enhancements |
| **Wallet enrollment** | 22-wallet-flows.spec.ts | 14 | GOOD | Full lifecycle: API create -> enroll -> PKPass -> Google -> campaign UI -> wizard |
| **Customers** | 03-customers.spec.ts | 5 | MEDIUM | List, search, import modal. No customer detail/edit, no CRUD |
| **Campaigns (general)** | 08-campaigns.spec.ts, 14-program-crud-full.spec.ts | 6 | BASIC | Page load, nav visibility. Shallow |
| **WhatsApp Campaigns** | 17-whatsapp-campaigns.spec.ts, 09-settings-billing.spec.ts | 25 | GOOD | UI, API dispatch, analytics, session, RBAC, cross-tenant, settings wizard |
| **SMS Campaigns** | 21-sms-campaigns.spec.ts, 19-sms-automation.spec.ts | 20 | GOOD | UI form, API create, Twilio safety guard, badges, RBAC |
| **Email Campaigns** | 23-email-campaigns.spec.ts | 6 | GOOD | UI, API create, history, segment filtering, invalid channel |
| **Wallet Campaigns** | 22-wallet-flows.spec.ts (Phase 3) | 5 | GOOD | Platform selector, character limits, send flow |
| **Automation** | 07-automation.spec.ts, 19-sms-automation.spec.ts | 5 | BASIC | Page load, nav isolation. No rule creation/editing |
| **Team / Users** | 04-team.spec.ts | 4 | BASIC | List, add button, invite form. No CRUD, no role assignment |
| **Billing** | 09-settings-billing.spec.ts, 32-billing-self-subscribe.spec.ts, 20-plan-rate-limits.spec.ts | 12 | GOOD | Plan display, rate limits API, subscription API, usage |
| **Settings** | 09-settings-billing.spec.ts | 5 | GOOD | Business info form, save button, MANAGER/STAFF isolation |
| **Locations** | 05-locations.spec.ts | 4 | BASIC | Page load, map, add button, detail modal. No CRUD |
| **Scanner (STAFF PWA)** | 10-scanner.spec.ts | 4 | GOOD | Landing page, UI elements, route blocking |
| **Analytics** | 06-analytics.spec.ts, 13-dashboard-kpis.spec.ts | 9 | GOOD | Dashboard KPIs, trends, visits, revenue breakdown APIs |
| **WhatsApp Bridge** | 18-whatsapp-bridge-e2e.spec.ts, 17-whatsapp-campaigns.spec.ts | 40+ | EXCELLENT | Health, auth, QR, session lifecycle, send validation, queue, RBAC, cross-tenant, Django->Bridge, settings UI |
| **Phone Verification** | 15-phone-verification.spec.ts | 5 | GOOD | Twilio Verify OTP, invalid format, wrong OTP, /me/ phone fields |
| **Role Isolation** | 12-role-isolation.spec.ts, 08-campaigns.spec.ts, 07-automation.spec.ts, 09-settings-billing.spec.ts | 25+ | GOOD | Cross-role nav blocking, route guards, MANAGER/STAFF isolation |
| **SuperAdmin** | 11-superadmin.spec.ts, 26-superadmin-full-menu.spec.ts, 27-tenant-creation-wizard.spec.ts, 28-tenant-lifecycle.spec.ts, 29-plan-management.spec.ts, 30-impersonation.spec.ts, 31-whatsapp-override.spec.ts | 45+ | EXCELLENT | Dashboard, tenant CRUD, plan CRUD, Vault editing, broadcast, integration API, impersonation, lifecycle, override |
| **Plan Management** | 20-plan-rate-limits.spec.ts, 29-plan-management.spec.ts, 11-superadmin.spec.ts | 12 | GOOD | Rate limits CRUD, SA create/update, conflict on deactivate with subs |
| **Owner Full Menu** | 25-owner-full-menu.spec.ts | 12 | GOOD | Smoke test every OWNER page |
| **SRS Hardening** | 16-srs-hardening.spec.ts | 12 | GOOD | Borradores, FormBuilder, coupon push, enrollment privacy, coupon API validation |

---

## 2. Detailed File-by-File Analysis

### 01-auth.spec.ts (17 tests) - AUTH
**Tags:** @auth
**Tests:**
- Login page renders (all elements visible)
- OWNER login -> dashboard /
- MANAGER login -> dashboard /
- STAFF login -> /scanner/scan
- SUPERADMIN login -> /superadmin
- Invalid credentials -> error, stays on login
- Forgot password link visible
- Register link -> /register
- Register form renders (business_name, first_name, last_name, email, phone, password)
- Register form validates required fields
- Register form validates password min 8 chars
- Login link from register page
- Google OAuth config endpoint (enabled, client_id)
- Google OAuth rejects invalid credential (401)
- Health check endpoint (200, platform=Loyallia)
- Login API returns tokens (access_token, refresh_token, role=OWNER)
- Unauthenticated /me/ returns 401

**Quality:** Good. Covers login flows for all roles, registration validation, OAuth basics, API auth.

### 02-programs.spec.ts (7 tests) - PROGRAMS
**Tags:** @owner @manager @programs
**Tests:**
- OWNER sees programs list
- OWNER sees "Crear nueva tarjeta" button (#new-program-btn)
- OWNER completes 4-step wizard (stamp card)
- Created program appears in list
- Program detail page loads with QR
- MANAGER sees programs list
- MANAGER does NOT see "Crear nueva tarjeta" button

**Quality:** Good wizard coverage. Uses text-based selectors (`getByText`, `getByRole`) well.

### 03-customers.spec.ts (5 tests) - CUSTOMERS
**Tags:** @owner @manager @customers
**Tests:**
- OWNER sees customer list with data (table rows)
- OWNER sees "Importar DB" button (#data-combo-btn -> #open-import-modal-btn)
- OWNER can search customers by name
- OWNER can open import modal
- MANAGER sees customer list, no import button

**Quality:** Basic. Missing customer detail view, customer edit, customer creation, customer deletion.

### 04-team.spec.ts (4 tests) - TEAM
**Tags:** @owner @manager @team
**Tests:**
- OWNER sees team members list (table rows)
- OWNER sees "Agregar Miembro" button
- OWNER can click add to open invite form
- MANAGER does NOT have "Equipo" in navigation

**Quality:** Basic. Missing: invite member submission, role assignment, remove member, edit member, resend invitation.

### 05-locations.spec.ts (4 tests) - LOCATIONS
**Tags:** @owner @manager @locations
**Tests:**
- OWNER sees locations page with map (h1="Sucursales")
- OWNER sees "Nueva"/"Agregar" location button
- OWNER can click location to see detail modal
- MANAGER sees locations page

**Quality:** Basic. Missing: create location, edit location, delete location, geolocation features.

### 06-analytics.spec.ts (2 tests) - ANALYTICS
**Tags:** @owner @manager @analytics
**Tests:**
- OWNER sees analytics dashboard (h1.page-title="Analíticas")
- MANAGER sees analytics dashboard

**Quality:** Minimal. Supplemented by 13-dashboard-kpis.spec.ts.

### 07-automation.spec.ts (3 tests) - AUTOMATION
**Tags:** @owner @manager @automation
**Tests:**
- OWNER sees automation page
- OWNER has "Automatización" in navigation
- MANAGER does NOT have "Automatización" in navigation

**Quality:** Minimal. Missing: create automation rule, edit rule, trigger conditions, action types, enable/disable.

### 08-campaigns.spec.ts (4 tests) - CAMPAIGNS
**Tags:** @owner @manager @campaigns
**Tests:**
- OWNER sees campaigns page
- OWNER has "Campañas" in navigation
- MANAGER does NOT have "Campañas" in navigation

**Quality:** Minimal. Channel-specific campaign tests are in 17, 21, 23, 22.

### 09-settings-billing.spec.ts (20 tests) - SETTINGS + BILLING + WHATSAPP
**Tags:** @owner @manager @staff @settings @whatsapp
**Tests:**
- OWNER: settings page loads
- OWNER: "Configuración" in nav
- OWNER: business info form visible
- OWNER: save button (#save-settings-btn) visible
- OWNER: billing page loads
- OWNER: "Facturación" in nav
- OWNER: billing page shows plan info
- WhatsApp Bridge: sees integration section with toggle (#wa-toggle)
- WhatsApp Bridge: toggle ON -> checking -> QR wizard appears
- WhatsApp Bridge: QR wizard shows instructions and controls
- WhatsApp Bridge: can refresh QR code
- WhatsApp Bridge: can cancel QR wizard -> returns to disabled
- MANAGER: no "Configuración" in nav
- MANAGER: no "Facturación" in nav
- MANAGER: /settings redirects
- MANAGER: /billing redirects
- STAFF: no "Configuración" in nav
- STAFF: /settings redirects to scanner

**Quality:** Good. WhatsApp bridge flow is well-tested. Missing: actual settings save operation.

### 10-scanner.spec.ts (4 tests) - SCANNER
**Tags:** @staff @scanner
**Tests:**
- STAFF lands on scanner page after login
- STAFF sees scanner UI elements
- STAFF cannot access dashboard routes (/programs)
- STAFF cannot access settings

**Quality:** Good for PWA scanner. Missing: scan QR code, process stamp, add points.

### 11-superadmin.spec.ts (26 tests) - SUPERADMIN
**Tags:** @superadmin
**Tests:**
- SA sees platform overview
- SA has navigation with platform items
- SA sees tenant list with rows
- SA can navigate to metrics page
- SA sees plans page with active/inactive counts
- SA can open create plan modal
- SA can create plan with rate limits
- SA plan shows rate limits in read mode
- SA can deactivate and reactivate plan via API
- SA sees settings page with integrations
- SA sees Google Wallet integration card
- SA sees Apple Wallet integration card
- SA can open Vault editor for Google Wallet
- SA wallet editor exposes file uploads and hot enable toggles
- SA sees Mailjet integration
- SA can access broadcast announcement form
- SA sees Twilio SMS integration card
- SA can open Vault editor for Twilio SMS
- SA sees System Operations section (seed demo, factory reset)
- SA factory reset shows request OTP button
- SA sees Platform Settings parameters
- SA: GET /admin/platform/integrations/ returns all integrations with structure
- SA: GET integrations does not expose Vault secrets
- SA: PUT secret with invalid key returns 400
- SA: PUT wallet secret rejects malformed Google JSON
- OWNER navigating to /superadmin is blocked

**Quality:** Excellent. Comprehensive SuperAdmin coverage.

### 12-role-isolation.spec.ts (8 tests) - ROLE ISOLATION
**Tags:** @manager @staff @owner @role-isolation
**Tests:**
- MANAGER: /team no crash
- MANAGER: /automation no crash
- MANAGER: /settings no crash
- MANAGER: /billing no crash
- STAFF: / redirects to scanner
- STAFF: /customers blocked
- STAFF: /analytics blocked
- OWNER: /superadmin no SA dashboard
- OWNER: /superadmin/tenants blocked

**Quality:** Good. Uses "no crash" assertions which are appropriate for soft blocks.

### 13-dashboard-kpis.spec.ts (7 tests) - DASHBOARD
**Tags:** @owner @analytics
**Tests:**
- Dashboard loads with all structural elements (4 stat cards, date range selectors, tabs, chart tabs, scanner button)
- Date range filters reload data (1d, 7d, custom)
- Ganancia/Visitas tab switching works
- Chart tabs switch without errors
- Analytics overview API structure (customers, transactions, programs, notifications)
- Analytics trends API returns daily_data
- Visit metrics API (unregistered_visits, retention_rate, total_visits)
- Revenue breakdown API (total_revenue, loyalty, referral, non_loyalty)

**Quality:** Excellent. Good helper function (gotoLoadedDashboard with skeleton detection, retry logic).

### 14-program-crud-full.spec.ts (7 tests) - PROGRAM CRUD
**Tags:** @owner @programs
**Tests:**
1. Create program with customizations (logo, hero, icon, colors)
2. Edit program - update name and verify saved
3. View program details - wallet card preview
4. Deactivate (soft delete) program via API
5. Create wallet notification campaign
6. Create email campaign
7. Program page shows correct statistics

**Quality:** Good full lifecycle. Uses hybrid API+UI pattern.

### 15-phone-verification.spec.ts (5 tests) - PHONE VERIFICATION
**Tags:** @phone
**Tests:**
- Phone verify request sends OTP via Twilio Verify
- Phone verify rejects invalid format (422)
- Phone verify confirm rejects wrong OTP
- /me/ endpoint returns phone_number and is_phone_verified

**Quality:** Good. Tests real Twilio integration.

### 16-srs-hardening.spec.ts (12 tests) - SRS HARDENING
**Tags:** @owner @programs
**Tests:**
- Programs page renders section structure (Activas/Borradores/Inactivas)
- Borradores section renders conditionally
- FormBuilder renders in Step 1 with default fields
- Can add new field in FormBuilder
- FormBuilder field count updates
- Coupon wizard shows push title field
- Coupon wizard shows image URL field
- Coupon wizard shows expiry reminder checkbox
- Enrollment page loads for valid card
- Enrollment form shows privacy consent checkbox
- Enroll button disabled until privacy accepted
- Card creation API accepts special_promo discount type
- Card creation API validates coupon dates

**Quality:** Excellent. Covers SRS-specific features thoroughly.

### 17-whatsapp-campaigns.spec.ts (25 tests) - WHATSAPP CAMPAIGNS
**Tags:** @owner @manager @staff @superadmin @campaigns @whatsapp @security
**Tests:**
- Campaign page loads with heading and form button
- New campaign form opens with channel selector (WhatsApp)
- Cancel button closes form
- POST /campaigns/ creates WhatsApp campaign
- GET /campaigns/ returns history
- GET /campaigns/runs/ returns list
- GET /campaigns/{bad-id}/results/ returns 404
- GET /campaigns/{bad-id}/recipients/ returns 404
- GET /campaigns/{bad-id}/export/ returns 404
- GET /whatsapp/status/{tenant_id}/ returns status
- GET /whatsapp/qr/{tenant_id}/ returns QR
- GET /whatsapp/status/ with wrong tenant_id returns 403
- MANAGER: 403 on campaign runs API
- MANAGER: 403 on campaign results API
- MANAGER: 403 on create campaigns
- MANAGER: 403 on WhatsApp QR
- MANAGER: 403 on disconnect WhatsApp
- MANAGER: no "Campañas" in nav
- STAFF: 403 on campaign runs API
- STAFF: 403 on create campaigns
- STAFF: 403 on WhatsApp QR
- STAFF: 403 on campaign export
- STAFF: navigating to /campaigns blocked
- SUPERADMIN: 403 on campaign runs (no tenant)
- SUPERADMIN: 403 on create campaigns
- SUPERADMIN: 403 on WhatsApp QR
- Webhook security (delivery + session)
- Cross-tenant isolation (3 tests)
- Settings: WhatsApp integration section, toggle triggers bridge, cancel returns to disabled, save button works
- MANAGER denied settings WhatsApp

**Quality:** Excellent. Comprehensive RBAC, API, UI, security testing.

### 18-whatsapp-bridge-e2e.spec.ts (30+ tests) - WHATSAPP BRIDGE
**Tags:** @owner @manager @staff @superadmin @whatsapp @security
**Tests:**
- Bridge /health returns status ok (sessions, uptime, queue)
- Bridge /health does NOT require auth
- Bridge rejects /status without API key (401)
- Bridge rejects /qr without API key (401)
- Bridge rejects /send without API key (401)
- Bridge rejects /disconnect without API key (401)
- Bridge rejects invalid API key (401)
- Bridge accepts correct API key
- Status returns default for unknown tenant
- QR endpoint starts session and returns base64 PNG
- Disconnect cleans up session
- Send rejects missing tenant_id (400)
- Send rejects missing phone (400)
- Send rejects missing message (400)
- Send rejects invalid phone (400)
- Send returns 409 when session not connected
- Queue stats endpoint returns metrics
- Django->Bridge: OWNER gets WhatsApp status through API
- Django->Bridge: OWNER generates QR through API
- Django->Bridge: OWNER disconnect through API
- Django->Bridge: status includes messages_remaining calculation
- MANAGER blocked from WhatsApp status (403)
- MANAGER blocked from QR (403)
- MANAGER blocked from disconnect (403)
- STAFF blocked from WhatsApp status (403)
- STAFF blocked from QR (403)
- STAFF blocked from disconnect (403)
- SUPERADMIN blocked from WhatsApp status (403)
- SUPERADMIN blocked from QR (403)
- Cross-tenant isolation (3 tests)
- Session lifecycle: QR -> status -> disconnect -> clean
- Settings: renders Integraciones section, toggle activates bridge, QR image renders, cancel dismisses wizard, save button functional
- MANAGER denied WhatsApp section in settings

**Quality:** Excellent. Most comprehensive file. Tests bridge container directly + Django proxy layer.

### 19-sms-automation.spec.ts (6 tests) - SMS + AUTOMATION
**Tags:** @owner @manager @superadmin @campaigns @automation @settings
**Tests:**
- OWNER sees campaigns page with channel selector
- OWNER campaign wizard shows SMS channel option
- OWNER sees automation page with action types
- OWNER automation wizard shows new action types
- MANAGER does NOT see automation creation controls
- SA sees plan management page

**Quality:** Basic. Automation tests are shallow (just page load).

### 20-plan-rate-limits.spec.ts (7 tests) - PLAN RATE LIMITS
**Tags:** @owner @superadmin @manager @security @settings
**Tests:**
- Public billing API returns all rate limit fields
- Plan rate limits are non-negative integers
- Owner subscription returns current plan with limits
- Owner usage API returns usage breakdown
- SA can create plan with all rate limits via API
- SA can update plan rate limits
- OWNER blocked from admin plans (403)
- MANAGER blocked from admin plans (403)
- OWNER blocked from creating admin plans (403)

**Quality:** Good. Validates all 12 rate-limit fields across plans, subscription, and usage.

### 21-sms-campaigns.spec.ts (14 tests) - SMS CAMPAIGNS
**Tags:** @owner @manager @superadmin @campaigns
**Tests:**
- Campaign page loads with SMS channel button
- New campaign form shows SMS channel selector
- SMS channel shows info banner with Twilio details
- SMS form has correct fields and maxLength=1600
- OWNER can create SMS campaign via UI
- Cancel button closes campaign form
- Plan features API includes sms_campaigns
- Plan features API includes sms_day limit and sms_today usage
- POST /campaigns/ creates SMS campaign via API
- MANAGER blocked from campaign list API (403)
- MANAGER blocked from create SMS campaign (403)
- MANAGER no "Campañas" in nav
- SA can update plan to enable SMS campaigns
- SA settings API returns twilio_use_test_mode diagnostic
- SMS campaigns display orange SMS badge

**Quality:** Excellent. Includes critical Twilio test mode safety guard in beforeAll.

### 22-wallet-flows.spec.ts (14 tests) - WALLET LIFECYCLE
**Tags:** @owner @wallet
**Tests:**
**Phase 1 (API):**
1. Create card/program with wallet_provider="both" via API
2. Enroll customer via public endpoint
3. Verify enrolled customer appears in customer list
**Phase 2 (API):**
4. Wallet status shows both providers available
5. Apple PKPass download returns valid file
6. Google Wallet returns valid save_url
**Phase 3 (UI):**
7. Campaigns page shows wallet type with platform selector
8. Platform selector toggles correctly (Apple/Google/Ambos)
9. Notification preview renders with character limits
10. Title over 40 chars triggers Apple limit warning
11. Send wallet campaign (Both platforms) succeeds
**Phase 4 (Wizard):**
12. Program wizard Step 2 shows WalletProviderSelector
13. Wallet provider toggle persists to review step
14. Created program has correct wallet_provider in metadata via API

**Quality:** Excellent. Uses describe.serial for shared state. Hybrid API+UI pattern is well-executed. Proper cleanup at end.

### 23-email-campaigns.spec.ts (6 tests) - EMAIL CAMPAIGNS
**Tags:** @owner @campaigns
**Tests:**
1. Campaign page loads with Email channel indicator
2. "+ Nueva campana" button visible and clickable
3. Email campaign submit succeeds via API
4. Campaign appears in campaign history
5. Segment filter scopes correctly
6. Invalid channel returns 400

**Quality:** Good. Tests both UI and API layers.

### 25-owner-full-menu.spec.ts (12 tests) - OWNER FULL MENU
**Tags:** @owner
**Tests:**
1. Dashboard loads with KPI cards
2. Programs loads with list
3. Program Detail loads for existing program
4. Customers loads with table
5. Customer Detail loads for existing customer
6. Team loads with member list
7. Locations loads
8. Analytics loads with charts
9. Automation loads with rules
10. Campaigns loads with type selector
11. Settings loads with sections
12. Billing loads with plan details

**Quality:** Good smoke test. Uses API to fetch real IDs for detail pages.

### 26-superadmin-full-menu.spec.ts (8 tests) - SUPERADMIN FULL MENU
**Tags:** @superadmin
**Tests:**
1. Platform Overview loads
2. Tenants List loads with data
3. Plans Management loads
4. Global Settings loads with integration cards
5. Settings shows Twilio card
6. Settings shows Mailjet card
7. Metrics loads with charts
8. Broadcast announcement form accessible

**Quality:** Good smoke test for SuperAdmin pages.

### 27-tenant-creation-wizard.spec.ts (1 test) - TENANT CREATION
**Tags:** @superadmin
**Tests:**
- SA can create tenant using 4-step wizard (plan selection -> entity data -> owner -> locations)

**Quality:** Good. End-to-end wizard flow with real data creation.

### 28-tenant-lifecycle.spec.ts (2 tests) - TENANT LIFECYCLE
**Tags:** @superadmin
**Tests:**
- SA can suspend and reactivate a tenant
- SA tenant detail exposes actions and technical information

**Quality:** Good. Tests tenant state transitions.

### 29-plan-management.spec.ts (1 test) - PLAN MANAGEMENT
**Tags:** @superadmin
**Tests:**
- SA gets 409 when deactivating plan with active subscriptions

**Quality:** Good. Tests business logic constraint.

### 30-impersonation.spec.ts (1 test) - IMPERSONATION
**Tags:** @superadmin
**Tests:**
- SA can impersonate owner with PIN and return to SA dashboard

**Quality:** Excellent. Full flow: PIN setup -> impersonate -> verify OWNER nav -> return.

### 31-whatsapp-override.spec.ts (1 test) - WHATSAPP OVERRIDE
**Tags:** @superadmin
**Tests:**
- SA can configure and reset WhatsApp daily-limit override per tenant

**Quality:** Good. Tests validation (rejects > hard cap) and reset.

### 32-billing-self-subscribe.spec.ts (1 test) - BILLING
**Tags:** @owner @settings
**Tests:**
- Owner billing page shows current plan, usage controls, plan comparison table

**Quality:** Good. Specific assertions on billing view elements.

---

## 3. Missing Coverage Analysis

### Critical Gaps (No Tests)

| Feature | What's Missing | Severity |
|---------|---------------|----------|
| **Customer CRUD** | No customer detail page test, no edit customer, no delete customer, no customer enrollment from UI | MEDIUM |
| **Automation CRUD** | No automation rule creation, no trigger conditions, no action execution, no enable/disable toggle | HIGH |
| **Location CRUD** | No create location form, no edit location, no delete location | MEDIUM |
| **Team CRUD** | No invite member form submission, no role assignment, no remove member, no resend invitation | MEDIUM |
| **Settings Save** | No actual save settings operation tested (only verifies save button exists) | MEDIUM |
| **Scanner Operations** | No QR scanning simulation, no stamp/point processing, no transaction recording | HIGH |
| **Billing Operations** | No plan upgrade/downgrade flow, no payment processing, no invoice viewing | MEDIUM |
| **Notifications** | No in-app notification center testing | LOW |
| **Referral Program** | No referral code generation, no referral tracking | LOW |
| **Data Export** | No CSV/PDF export functionality testing | LOW |
| **Forgot Password** | Link exists but no actual password reset flow | LOW |
| **Registration E2E** | Form validation exists but no actual successful registration | MEDIUM |

### RBAC Coverage

| Feature | OWNER | MANAGER | STAFF | SUPERADMIN | Notes |
|---------|-------|---------|-------|-----------|-------|
| Auth/Login | YES | YES | YES | YES | All 4 roles tested |
| Dashboard | YES | Partial | NO | N/A | MANAGER has basic access |
| Programs | YES (CRUD) | Read-only | NO | N/A | Good coverage |
| Customers | YES (partial) | Read-only | Blocked | N/A | Needs more OWNER CRUD |
| Team | YES (partial) | Blocked | N/A | N/A | Needs invite flow |
| Locations | YES (partial) | Read-only | N/A | N/A | Needs CRUD |
| Analytics | YES | YES | Blocked | N/A | Good coverage |
| Automation | YES (basic) | Blocked | N/A | N/A | Needs rule CRUD |
| Campaigns | YES (all channels) | Blocked | Blocked | Blocked (no tenant) | Excellent coverage |
| Settings | YES | Blocked | Redirect | N/A | Good isolation |
| Billing | YES | Blocked | N/A | N/A | Needs upgrade flow |
| Scanner | N/A | N/A | YES | N/A | Good PWA coverage |
| SuperAdmin | Blocked | N/A | N/A | YES (full) | Excellent coverage |

---

## 4. Quality Issues

### Flaky Patterns Found

| Issue | Count | Files | Severity |
|-------|-------|-------|----------|
| `waitForTimeout()` used for waiting | 50+ | Most files | MEDIUM |
| No `data-testid` selectors (uses IDs and text) | Widespread | All | LOW |
| Tests share state via `describe.serial` | 2 | 22-wallet-flows.spec.ts | MEDIUM |
| Soft assertions (expect non-specific visibility) | Widespread | All | LOW |
| No test for successful registration | 1 | 01-auth.spec.ts | LOW |

### Specific Quality Issues by File

#### 01-auth.spec.ts
- Uses `#email`, `#password`, `#login-btn` ID selectors instead of `data-testid`
- `waitForTimeout(2000)` in auth setup
- STAFF login assertion is weak (`url not contains /login`) - should assert URL contains `/scanner`

#### 02-programs.spec.ts
- Multiple `waitForTimeout(3000)` calls instead of waiting for specific elements
- Uses `.card-hover` CSS class selector which could change

#### 03-customers.spec.ts
- Search test assertion is weak (`main content is visible` - not specific to search results)
- No test for customer detail page

#### 07-automation.spec.ts
- Extremely shallow - only tests page load and nav visibility
- No automation rule creation, editing, or execution testing

#### 08-campaigns.spec.ts
- Very basic - only page load and nav visibility
- Channel-specific campaign tests scattered across other files

#### 09-settings-billing.spec.ts
- WhatsApp tests use `waitForTimeout(5000)` extensively
- Settings save is NOT actually tested (only verifies button exists)

#### 14-program-crud-full.spec.ts
- Edit program test has nested conditionals making it potentially unreliable
- Test 5 and 6 (wallet campaign, email campaign) are shallow - just verify page loads

#### 19-sms-automation.spec.ts
- SMS channel test uses conditional flow (`if await newBtn.isVisible()`)
- Automation action type test collects options but doesn't assert specific values

#### 22-wallet-flows.spec.ts
- Uses `describe.serial` with shared module-level variables
- Wallet campaign send test has weak assertion (toast OR form gone)

### Positive Quality Highlights

1. **Safety Framework** (`e2e-safety.ts`): Excellent - production host blocking, proper RBAC credential management, integration secret validation
2. **Auth Setup** (`auth.setup.ts`): Good - API-based login, cookie injection, all 4 roles
3. **Config** (`e2e-test-config.ts`): Good - reads from local file, clear error messages
4. **Test Organization**: Files are numbered and tagged with `@owner`, `@manager`, `@staff`, `@superadmin`
5. **playwright.config.ts**: Well-organized with project-based test matching
6. **WhatsApp Bridge E2E** (18): Uses `beforeAll` health gate - excellent pattern
7. **SMS Campaigns** (21): Twilio test mode safety guard in `beforeAll` - critical safety
8. **Wallet Flows** (22): Hybrid API+UI pattern is well-executed with proper cleanup
9. **Dashboard KPIs** (13): Good helper with skeleton detection and retry logic
10. **Cross-cutting RBAC**: Consistent 403 testing across MANAGER, STAFF, SUPERADMIN roles

---

## 5. E2E Safety Framework Assessment

### Framework Components

| Component | Status | Notes |
|-----------|--------|-------|
| **Production Host Blocking** | PASS | `PRODUCTION_HOSTS` Set blocks all production hosts |
| **RBAC Credential Loading** | PASS | Reads from `.auth/e2e-credentials.json` (not Vault) |
| **Auth Setup** | PASS | API login + cookie injection for all 4 roles |
| **Integration Secret Guard** | PASS | `expectIntegrationResponseDoesNotExposeSecrets` validates no secrets in API responses |
| **Twilio Test Mode Check** | PASS | `beforeAll` in 21-sms-campaigns.spec.ts validates test mode before sending |
| **Enterprise Campaign Access** | PASS | `ensureOwnerEnterpriseCampaignAccess` ensures enterprise plan is active |
| **API URL Targeting** | PASS | Uses `PLAYWRIGHT_BASE_URL` env var, validates URL format |

### Safety Issues

1. **auth.setup.ts line 78**: `waitForTimeout(2000)` - should use `waitForSelector` instead
2. **No Vault integration**: Credentials are loaded from local file (by design, documented)
3. **Cookie consent**: Pre-accepted via localStorage (good), but only covers the main origin

---

## 6. Recommendations

### Priority 1 (Critical Missing Tests)
1. **Automation CRUD**: Create automation rule, set trigger, set action, save, verify, edit, delete
2. **Scanner Operations**: Simulate QR scan, verify stamp/point addition, check transaction recorded
3. **Settings Save**: Actually fill and submit the settings form, verify persisted

### Priority 2 (Important Missing Tests)
4. **Customer Detail/Edit**: Click customer row, view detail, edit fields, save
5. **Team Invite Flow**: Fill invite form, submit, verify new member appears
6. **Location CRUD**: Create location with form, edit, delete
7. **Registration Success**: Complete successful registration flow (creates new tenant)
8. **Billing Upgrade**: Click upgrade plan, verify modal, simulate plan change

### Priority 3 (Quality Improvements)
9. Replace `waitForTimeout()` with proper `waitForSelector`/`waitForResponse` throughout
10. Add `data-testid` attributes to key UI elements instead of relying on IDs/text
11. Make 22-wallet-flows.spec.ts use `test.step` instead of serial describe blocks with shared state
12. Strengthen weak assertions (e.g., `main content is visible` -> check for specific data)
13. Add test for password reset flow

### Priority 4 (Nice to Have)
14. Notification center testing
15. Referral program testing
16. Data export testing
17. Geofencing features
18. AI assistant features

---

## 7. Test Count Summary

| Category | Count |
|----------|-------|
| Auth tests | 17 |
| Program/Card tests | 26 |
| Wallet tests | 14 |
| Customer tests | 5 |
| Campaign tests (all channels) | 60+ |
| Automation tests | 5 |
| Team tests | 4 |
| Location tests | 4 |
| Analytics/Dashboard tests | 16 |
| Scanner tests | 4 |
| Settings/Billing tests | 18 |
| Role Isolation tests | 25+ |
| SuperAdmin tests | 50+ |
| Security/Hardening tests | 20+ |
| **TOTAL** | **~230+** |

---

*Review generated by Senior QA Engineer — Playwright E2E Coverage Analysis*
*Date: 2025-01-15*
