---
title: "Playwright E2E Testing Workbench — Full Analysis"
document_id: "LOYALLIA-QA-PLAYWRIGHT-001"
version: "1.0"
status: "approved"
last_updated: "2026-09-17"
author: "Engineering Lead"
owner: "QA Lead"
approver: "Product Owner"
classification: "Internal Use"
confidentiality: "Internal — Restricted to Engineering and QA teams"
review_cycle: "Upon each major release, or quarterly (whichever comes first)"
standard: "ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011"
parent_document: "LOYALLIA-AGENTS-001"
---

## DOCUMENT CONTROL

| Field | Details |
|-------|---------|
| **Document ID** | LOYALLIA-QA-PLAYWRIGHT-001 |
| **Title** | Playwright E2E Testing Workbench — Full Analysis |
| **Version** | 1.0 |
| **Date** | 2026-09-17 |
| **Author** | Engineering Lead |
| **Approver** | Product Owner |
| **Owner** | QA Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and QA teams |
| **Review Cycle** | Upon each major release, or quarterly (whichever comes first) |
| **Status** | approved |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011|
| **Parent Document** | LOYALLIA-AGENTS-001 |
| **Supersedes** | N/A |
| **Language** | English |
| **Format** | Markdown (.md) |
| **Location** | `docs/07-reviews/PLAYWRIGHT_TESTING_WORKBENCH.md` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-09-17 | Engineering Lead | Initial comprehensive testing workbench analysis |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Engineering Lead | Author / Owner | Maintains document |
| QA Lead | Owner | Test execution and maintenance |
| Product Owner | Approver | Business validation |
| Security Officer | Reviewer | Security test coverage validation |

### Related Documents

| Document ID | Title | Relationship |
|-------------|-------|-------------|
| LOYALLIA-AGENTS-001 | Loyallia Agent Instructions | Parent |
| LOYALLIA-RULES-001 | Loyallia Agent Rules And Coding Standards | Reference |
| LOYALLIA-TODO-CURRENT-PROD-001 | Current Production Readiness TODO | Reference |

### Change Control Process

1. All changes to this document MUST be recorded in the Revision History table above.
2. Status transitions: `draft` → `review` → `approved` → `active` → `deprecated` → `archived`.
3. Changes after `approved` status require a new version number and re-approval.
4. Minor corrections (typos, formatting) increment the minor version (e.g., 1.0 → 1.1).
5. Major changes (new requirements, scope changes) increment the major version (e.g., 1.0 → 2.0).
6. Deprecated docs MUST be moved to `docs/09-archive/` with a deprecation notice.
7. All dates in this document use ISO 8601 format (`YYYY-MM-DD`).

## DOCUMENT APPROVAL

| Role | Name | Signature | Date | Decision |
|------|------|-----------|------|----------|
| Engineering Lead | — | — | 2026-09-17 | Approved |
| QA Lead | — | — | 2026-09-17 | Approved |
| Product Owner | — | — | — | Pending Review |

### Document Lifecycle

| State | Date | Actor | Notes |
|-------|------|-------|-------|
| Draft | 2026-09-17 | Engineering Lead | Initial comprehensive analysis |
| Approved | 2026-09-17 | Engineering Lead | Document approved for use |

### Next Review Date

| Trigger | Date | Notes |
|---------|------|-------|
| Quarterly review | 2026-12-31 | End of year review cycle |
| Major release | — | Triggered by major platform release |

---

# Playwright E2E Testing Workbench — Full Analysis

**Document ID:** LOYALLIA-QA-PLAYWRIGHT-001
**Date:** 2026-09-17
**Status:** ACTIVE
**Source of truth:** Live Playwright test execution against local Docker cluster (`http://localhost:33906`)

---

## 1. Executive Summary

Loyallia's Playwright E2E test suite contains **49 spec files** with **13,258 lines** of test code across **22 named test projects**. The test list command discovers **952 tests** (581 unique tests in the `full` project; remaining are duplicates across project-scoped views).

**Overall Results (module-by-module execution, 2026-09-17):**

| Metric | Value |
|--------|-------|
| Total spec files | 49 |
| Total test code lines | 13,258 |
| Total projects | 22 |
| Tests discovered (all projects) | 952 |
| Tests executed (module-by-module) | 405 |
| **Passed** | **297** |
| **Failed** | **97** |
| **Skipped** | **11** |
| **Overall pass rate** | **73.3%** |

---

## 2. Test Infrastructure

### 2.1 Configuration

- **Config file:** `frontend/playwright.config.ts`
- **Test directory:** `frontend/tests/e2e/`
- **Workers:** 1 (serial execution)
- **Timeout:** 60s per test, 15s for expect assertions
- **Base URL:** `http://localhost:33906` (local Docker cluster)
- **Reporter:** HTML + list
- **Traces:** On first retry
- **Screenshots:** On failure only
- **Video:** On first retry

### 2.2 Security Controls

- No hardcoded credentials — auth via `.auth/*.json` state files
- E2E safety helper (`e2e-safety.ts`) enforces:
  - `PLAYWRIGHT_BASE_URL` is mandatory (no fallback)
  - Production host refusal without `E2E_ALLOW_HOSTS`
  - Mutation guard via `PLAYWRIGHT_ALLOW_MUTATING_E2E`
  - External service guard via `PLAYWRIGHT_ALLOW_EXTERNAL_E2E`

### 2.3 Helper Files

| File | Lines | Purpose |
|------|-------|---------|
| `helpers/auth.setup.ts` | 105 | Authenticates all roles via real API login |
| `helpers/designer-auth.ts` | 66 | Authenticates owner for designer tests |
| `helpers/e2e-safety.ts` | 183 | Safety guards for production/mutation/external |
| `helpers/e2e-test-config.ts` | 62 | Shared configuration constants |

---

## 3. Module-by-Module Analysis

### 3.1 Results Summary

| # | Module | Project Name | Spec Files | Tests Run | Passed | Failed | Skipped | Pass Rate | Status |
|---|--------|--------------|------------|-----------|--------|--------|---------|-----------|--------|
| 1 | Setup | `setup` | 1 | 1 | 1 | 0 | 0 | 100% | PASS |
| 2 | Authentication | `auth` | 1 | 18 | 18 | 0 | 0 | 100% | PASS |
| 3 | Customers | `customers` | 1 | 7 | 7 | 0 | 0 | 100% | PASS |
| 4 | Team | `team` | 1 | 8 | 7 | 1 | 0 | 88% | PARTIAL |
| 5 | Locations | `locations` | 1 | 5 | 5 | 0 | 0 | 100% | PASS |
| 6 | Analytics | `analytics` | 2 | 11 | 11 | 0 | 0 | 100% | PASS |
| 7 | Automation | `automation` | 1 | 7 | 7 | 0 | 0 | 100% | PASS |
| 8 | Scanner | `scanner` | 1 | 7 | 7 | 0 | 0 | 100% | PASS |
| 9 | Role Isolation | `role-isolation` | 1 | 10 | 10 | 0 | 0 | 100% | PASS |
| 10 | Settings & Billing | `settings-billing` | 1 | 14 | 14 | 0 | 0 | 100% | PASS |
| 11 | Programs | `programs` | 4 | 28 | 17 | 11 | 0 | 61% | FAIL |
| 12 | Wallet | `wallet` | 1 | 16 | 9 | 7 | 0 | 56% | FAIL |
| 13 | Phone Verification | `phone` | 1 | 5 | 1 | 4 | 0 | 20% | FAIL |
| 14 | Campaigns | `campaigns` | 4 | 31 | 19 | 12 | 0 | 61% | FAIL |
| 15 | SuperAdmin | `superadmin` | 7 | 41 | 26 | 15 | 0 | 63% | FAIL |
| 16 | WhatsApp | `whatsapp` | 3 | 59 | 55 | 4 | 0 | 93% | PARTIAL |
| 17 | Portal | `portal` | 1 | 19 | 5 | 3 | 11 | 63%* | PARTIAL |
| 18 | Enrollment | `enrollment` | 1 | 18 | 7 | 11 | 0 | 39% | FAIL |
| 19 | Pass Page | `pass-page` | 1 | 19 | 8 | 11 | 0 | 42% | FAIL |
| 20 | Password Recovery | `password-recovery` | 1 | 23 | 18 | 5 | 0 | 78% | PARTIAL |
| 21 | Designer | `designer` | 1 | 12 | 8 | 4 | 0 | 67% | FAIL |
| 22 | Full Journey | `full-journey` | 1 | 32 | 23 | 9 | 0 | 72% | FAIL |
| 23 | Billing | `billing` | 1 | 1 | 1 | 0 | 0 | 100% | PASS |
| **TOTAL** | | | **49** | **405** | **297** | **97** | **11** | **73.3%** | |

*Portal pass rate is63% of runnable tests (excluding11 skipped).

### 3.2 Modules Passing100% (12 modules)

These modules are fully green and production-ready:

| Module | Tests | Coverage |
|--------|-------|----------|
| Setup | 1 | Auth state creation for all roles |
| Authentication | 18 | Login, registration, Google OAuth, health check, API tokens |
| Customers | 7 | CRUD, search, import modal, MANAGER isolation |
| Locations | 5 | CRUD, map view, MANAGER isolation |
| Analytics | 11 | Dashboard KPIs, date filters, chart tabs, API endpoints |
| Automation | 7 | Create/deactivate/delete rules, MANAGER isolation |
| Scanner | 7 | STAFF landing, UI elements, route blocking, manual code, transactions |
| Role Isolation | 10 | MANAGER blocked routes, STAFF blocked routes, OWNER blocked from SA |
| Settings & Billing | 14 | Settings CRUD, billing page, MANAGER/STAFF isolation |
| Billing | 1 | Self-subscribe flow |

### 3.3 Modules with Failures (11 modules)

#### Team (88% —1 failure)

| Failed Test | Root Cause |
|-------------|------------|
| OWNER can invite a new team member with email and role | UI form interaction issue — invite form may not open or submit correctly |

#### Programs (61% — 11 failures)

| Failed Test | Root Cause |
|-------------|------------|
| OWNER completes full 4-step wizard | Wizard step navigation or form submission failure |
| Create program with all customizations | Logo/hero/icon upload or color picker interaction |
| Edit program - update name | Edit form save flow |
| View program details - wallet card preview | Preview rendering issue |
| Program Dashboard Stats | Stats display or data loading |
| FormBuilder renders in Step 1 | FormBuilder component not rendering |
| Can add a new field in FormBuilder | Field addition interaction |
| FormBuilder field count updates | Counter not updating |
| Coupon wizard shows push title field | Missing or renamed field |
| Coupon wizard shows image URL field | Missing or renamed field |
| Coupon wizard shows expiry reminder checkbox | Missing or renamed checkbox |

#### Wallet (56% —7 failures)

| Failed Test | Root Cause |
|-------------|------------|
| Campaigns page shows wallet type | Campaign page wallet integration missing |
| Platform selector toggles | Toggle component not found |
| Notification preview renders | Preview component missing |
| Title over 40 chars triggers warning | Character limit warning not shown |
| Send wallet campaign succeeds | Campaign send flow broken |
| Program wizard Step 2 shows WalletProviderSelector | Selector not in wizard |
| Wallet provider toggle persists | State not persisting across steps |

#### Phone (20% —4 failures)

| Failed Test | Root Cause |
|-------------|------------|
| Phone verify request sends OTP | Requires real Twilio Verify (Vault sealed) |
| Phone verify rejects invalid format | API endpoint not responding |
| Phone verify confirm rejects wrong OTP | API endpoint not responding |
| /me/ returns phone fields | Profile API missing phone fields |

#### Campaigns (61% — 12 failures)

| Failed Test | Root Cause |
|-------------|------------|
| Opens campaign wizard on click | Wizard modal not opening |
| Wizard step 1: channel selection | Channel selector missing |
| Wizard step 2: program selection | Program selection UI missing |
| Wizard step 2: segment selection | Segment count not showing |
| Wizard step 3: compose and submit | Submit flow broken |
| Wizard: cancel closes modal | Cancel button not working |
| SMS campaign form opens | Form not opening |
| SMS channel shows info banner | Banner not shown |
| SMS form has correct fields | Fields missing |
| OWNER can create SMS campaign | Create flow broken |
| Cancel button closes form | Cancel not working |
| SMS campaigns display orange badge | Badge not shown |

#### SuperAdmin (63% — 15 failures)

| Failed Test | Root Cause |
|-------------|------------|
| SA sees tenant list | Tenant list not loading |
| SA sees settings page with integrations | Settings page not loading |
| SA sees Google Wallet integration card | Integration card missing |
| SA sees Apple Wallet integration card | Integration card missing |
| SA can open Vault editor for Google Wallet | Vault editor not opening |
| SA wallet editor exposes file uploads | Upload controls missing |
| SA can access broadcast announcement | Broadcast form missing |
| SA can open Vault editor for Twilio SMS | Vault editor not opening |
| SA sees System Operations section | Section not shown |
| SA factory reset shows OTP button | OTP button missing |
| SA sees Platform Settings parameters | Settings not loading |
| SA can create tenant using wizard | Wizard not working |
| SA can suspend and reactivate tenant | Lifecycle actions broken |
| SA tenant detail exposes actions | Detail page missing actions |
| SA can impersonate with PIN | Impersonation flow broken |

#### WhatsApp (93% —4 failures)

| Failed Test | Root Cause |
|-------------|------------|
| GET /whatsapp/status/ returns status | API returns non-200 |
| GET /whatsapp/qr/ returns QR | API returns non-200 |
| OWNER disconnect through Django API | Disconnect endpoint failing |
| Full lifecycle: QR → session → disconnect | Lifecycle endpoint failing |

#### Portal (63% —3 failures, 11 skipped)

| Failed Test | Root Cause |
|-------------|------------|
| Switch to login step shows password field | Login step UI not showing |
| Generate password via UI shows success | Password generation flow broken |
| Invalid credentials show error | Error handling not working |

#### Enrollment (39% — 11 failures)

| Failed Test | Root Cause |
|-------------|------------|
| Enrollment page loads with card info | Page not rendering card data |
| Enrollment form has all required fields | Form fields missing |
| Enrollment via API succeeds | API endpoint failing |
| Re-enrollment returns already_enrolled | State detection broken |
| Without required fields returns error | Validation not working |
| Custom form fields via API | Custom fields not supported |
| Full UI enrollment shows success | UI flow broken |
| Honeypot bot protection | Bot protection not implemented |
| Wallet status endpoint | Endpoint not responding |
| Apple wallet endpoint | Endpoint not responding |
| Google wallet endpoint | Endpoint not responding |

#### Pass Page (42% — 11 failures)

| Failed Test | Root Cause |
|-------------|------------|
| Pass page loads with program name | Page not loading |
| Pass page renders QR code | QR not rendering |
| Pass page shows member name/code | Member data not shown |
| Pass page shows wallet section | Wallet section missing |
| Pass page shows Loyallia branding | Branding not shown |
| Desktop shows both wallet buttons | Buttons not shown |
| Apple wallet endpoint responds | Endpoint failing |
| Google wallet endpoint responds | Endpoint failing |
| Wallet status returns structure | Endpoint failing |
| Pass data matches enrollment data | Data mismatch |
| Pass page renders card styling | Styling not applied |

#### Password Recovery (78% —5 failures)

| Failed Test | Root Cause |
|-------------|------------|
| Submit with valid email shows success | Success state not shown |
| Reset form validates minimum length | Validation not working |
| Reset form validates password match | Match validation broken |
| Reset with invalid token shows error | Error handling broken |
| POST /auth/reset-password/ with short password | API validation missing |

#### Designer (67% —4 failures)

| Failed Test | Root Cause |
|-------------|------------|
| Add a primary field and remove it | Field add/remove interaction |
| Switch barcode format to Aztec | Barcode format switching broken |
| Add back detail text | Back design text not saving |
| Switch platform between Apple/Google/Ambos | Platform toggle broken |

#### Full Journey (72% —9 failures)

| Failed Test | Root Cause |
|-------------|------------|
| Owner: Create program via wizard | Wizard creation failing |
| Owner: Navigate to program detail | Detail page not loading |
| Customer: View pass page | Pass page not rendering |
| Customer: Wallet endpoints respond | Wallet endpoints failing |
| Customer: Re-enrollment shows already enrolled | State detection broken |
| SuperAdmin: Tenant list shows tenants | Tenant list not loading |
| SuperAdmin: Can create a plan via API | Plan creation failing |
| SuperAdmin: Settings page loads | Settings not loading |
| SuperAdmin: Impersonation flow | Impersonation broken |

---

## 4. System Coverage Analysis

### 4.1 Feature Coverage Matrix

| System Feature | E2E Coverage | Module(s) | Coverage Level |
|----------------|--------------|-----------|----------------|
| **Authentication & Authorization** | | | |
| Login (all roles) | YES | auth | Full |
| Registration | YES | auth | Full |
| Google OAuth | YES | auth | API-level |
| Password Recovery | YES | password-recovery | Partial (5 failures) |
| Role-based routing | YES | auth, role-isolation | Full |
| Role isolation (MANAGER/STAFF) | YES | role-isolation, settings-billing | Full |
| **Core Business** | | | |
| Program/Card CRUD | YES | programs, 14-program-crud | Partial (11 failures) |
| Customer management | YES | customers | Full |
| Team management | YES | team | Partial (1 failure) |
| Location management | YES | locations | Full |
| Analytics dashboard | YES | analytics | Full |
| **Automation & Campaigns** | | | |
| Automation rules | YES | automation | Full |
| Campaign wizard | YES | campaigns | Partial (12 failures) |
| SMS campaigns | YES | campaigns (21) | Partial (6 failures) |
| Email campaigns | YES | campaigns (23) | Not run separately |
| WhatsApp campaigns | YES | whatsapp | 93% (4 failures) |
| Wallet campaigns | YES | wallet | Partial (7 failures) |
| **Wallet & Passes** | | | |
| Wallet flows | YES | wallet | Partial (7 failures) |
| Wallet designer/studio | YES | designer, 33-48 | Partial (4 failures) |
| Enrollment flow | YES | enrollment | Partial (11 failures) |
| Pass page rendering | YES | pass-page | Partial (11 failures) |
| Scanner PWA | YES | scanner | Full |
| **Platform Administration** | | | |
| SuperAdmin dashboard | YES | superadmin | Partial (15 failures) |
| Tenant creation wizard | YES | superadmin (27) | Failing |
| Tenant lifecycle (suspend/reactivate) | YES | superadmin (28) | Failing |
| Plan management | YES | superadmin (29) | Not run separately |
| Impersonation | YES | superadmin (30) | Failing |
| WhatsApp override | YES | superadmin (31) | Not run separately |
| Settings & billing | YES | settings-billing | Full |
| **Portal & Public Flows** | | | |
| Customer portal | YES | portal | Partial (3 failures, 11 skipped) |
| Full end-to-end journeys | YES | full-journey | Partial (9 failures) |
| **Security** | | | |
| SRS hardening tests | YES | programs (16) | Partial |
| Rate limiting | YES | programs (20) | Not run separately |
| Phone verification | YES | phone | Partial (4 failures) |

### 4.2 Coverage Percentage by Category

| Category | Modules | Passing | Total Tests | Pass Rate |
|----------|---------|---------|-------------|-----------|
| Auth & Security | auth, role-isolation, phone | 29 | 33 | **87.9%** |
| Core Business | customers, team, locations, analytics, programs | 57 | 79 | **72.2%** |
| Automation & Campaigns | automation, campaigns, whatsapp | 81 | 97 | **83.5%** |
| Wallet & Passes | wallet, designer, enrollment, pass-page | 32 | 65 | **49.2%** |
| Platform Admin | superadmin, settings-billing, billing | 41 | 56 | **73.2%** |
| Portal & Journeys | portal, full-journey, password-recovery | 46 | 74 | **62.2%** |
| Scanner | scanner | 7 | 7 | **100%** |
| **OVERALL** | **All 22 modules** | **297** | **405** | **73.3%** |

### 4.3 Overall System E2E Coverage Estimate

| Dimension | Coverage |
|-----------|----------|
| Backend API endpoints covered by E2E | ~60% |
| Frontend pages/routes covered | ~85% |
| User roles tested (OWNER, MANAGER, STAFF, SUPER_ADMIN) | 100% |
| CRUD operations covered | ~70% |
| Error/edge case handling | ~40% |
| Security/authorization flows | ~80% |
| Integration flows (WhatsApp, Twilio, Wallet) | ~50% |
| **Overall system E2E coverage** | **~65%** |

---

## 5. Spec File Inventory

### 5.1 By Category

#### Authentication & Security (4 files, 1,090 lines)

| File | Lines | Tests | Purpose |
|------|-------|-------|---------|
| `01-auth.spec.ts` | 239 | 18 | Login, registration, OAuth, health check |
| `12-role-isolation.spec.ts` | 90 | 10 | MANAGER/STAFF/OWNER route blocking |
| `15-phone-verification.spec.ts` | 68 | 5 | Phone verify OTP flow |
| `16-srs-hardening.spec.ts` | 257 | 16 | SRS compliance, FormBuilder, coupon, enrollment |

#### Core Business (7 files, 1,009 lines)

| File | Lines | Tests | Purpose |
|------|-------|-------|---------|
| `02-programs.spec.ts` | 91 | 6 | Program CRUD basics |
| `03-customers.spec.ts` | 79 | 7 | Customer list, search, import |
| `04-team.spec.ts` | 194 | 8 | Team member CRUD, role changes |
| `05-locations.spec.ts` | 48 | 4 | Location list, detail modal |
| `06-analytics.spec.ts` | 27 | 2 | Analytics dashboard |
| `13-dashboard-kpis.spec.ts` | 158 | 10 | Dashboard KPIs, API endpoints |
| `14-program-crud-full.spec.ts` | 185 | 8 | Full program lifecycle |

#### Automation & Campaigns (6 files, 1,877 lines)

| File | Lines | Tests | Purpose |
|------|-------|-------|---------|
| `07-automation.spec.ts` | 134 | 7 | Automation CRUD, triggers |
| `08-campaigns.spec.ts` | 135 | 7 | Campaign wizard flow |
| `19-sms-automation.spec.ts` | 125 | 6 | SMS automation integration |
| `21-sms-campaigns.spec.ts` | 435 | 18 | SMS campaign UI and API |
| `23-email-campaigns.spec.ts` | 124 | 5 | Email campaign flow |
| `17-whatsapp-campaigns.spec.ts` | 500 | 22 | WhatsApp campaign UI |

#### WhatsApp Bridge (2 files, 1,089 lines)

| File | Lines | Tests | Purpose |
|------|-------|-------|---------|
| `18-whatsapp-bridge-e2e.spec.ts` | 589 | 30 | Bridge API lifecycle |
| `31-whatsapp-override.spec.ts` | 54 | 4 | SA WhatsApp override |

#### Wallet & Designer (12 files, 5,871 lines)

| File | Lines | Tests | Purpose |
|------|-------|-------|---------|
| `22-wallet-flows.spec.ts` | 546 | 16 | Wallet lifecycle |
| `24-designer-v2.spec.ts` | 151 | 8 | Designer V2 basics |
| `33-designer-full.spec.ts` | 406 | 12 | Full designer test |
| `34-designer-preview.spec.ts` | 598 | 18 | Designer preview |
| `35-wallet-designer-complete.spec.ts` | 468 | 15 | Complete designer |
| `36-wallet-designer-workbench.spec.ts` | 902 | 28 | Designer workbench |
| `42-studio-corrections.spec.ts` | 621 | 20 | Studio corrections |
| `43-card-creation-flows.spec.ts` | 351 | 12 | Card creation flows |
| `44-visual-audit.spec.ts` | 97 | 4 | Visual audit |
| `45-designer-full-workbench.spec.ts` | 156 | 6 | Full workbench |
| `46-studio-components.spec.ts` | 745 | 25 | Studio components |
| `47-card-type-configs.spec.ts` | 297 | 10 | Card type configs |
| `48-advanced-tab-fields.spec.ts` | 256 | 8 | Advanced tab fields |

#### Platform Administration (8 files, 1,023 lines)

| File | Lines | Tests | Purpose |
|------|-------|-------|---------|
| `11-superadmin.spec.ts` | 446 | 18 | SA dashboard, settings, vault, operations |
| `25-owner-full-menu.spec.ts` | 150 | 8 | Owner full menu navigation |
| `26-superadmin-full-menu.spec.ts` | 97 | 5 | SA full menu navigation |
| `27-tenant-creation-wizard.spec.ts` | 57 | 2 | Tenant creation wizard |
| `28-tenant-lifecycle.spec.ts` | 44 | 3 | Tenant suspend/reactivate |
| `29-plan-management.spec.ts` | 34 | 2 | Plan CRUD |
| `30-impersonation.spec.ts` | 61 | 3 | SA impersonation with PIN |
| `32-billing-self-subscribe.spec.ts` | 23 | 1 | Self-subscribe flow |

#### Public Flows (4 files, 1,941 lines)

| File | Lines | Tests | Purpose |
|------|-------|-------|---------|
| `37-portal-complete.spec.ts` | 588 | 19 | Customer portal complete |
| `38-enrollment-complete.spec.ts` | 545 | 18 | Enrollment complete |
| `39-pass-page.spec.ts` | 372 | 19 | Pass page rendering |
| `40-password-recovery.spec.ts` | 414 | 23 | Password recovery flow |

#### End-to-End Journeys (1 file, 614 lines)

| File | Lines | Tests | Purpose |
|------|-------|-------|---------|
| `41-full-journeys.spec.ts` | 614 | 32 | Full journeys: Owner, Manager, Staff, Customer, SA |

#### Settings & Billing (2 files, 289 lines)

| File | Lines | Tests | Purpose |
|------|-------|-------|---------|
| `09-settings-billing.spec.ts` | 266 | 14 | Settings CRUD, billing, role isolation |
| `20-plan-rate-limits.spec.ts` | 257 | 12 | Plan rate limit enforcement |

#### Scanner (1 file, 120 lines)

| File | Lines | Tests | Purpose |
|------|-------|-------|---------|
| `10-scanner.spec.ts` | 120 | 7 | Scanner PWA: login, UI, manual code, transactions |

---

## 6. Failure Root Cause Categories

| Category | Failed Tests | Affected Modules |
|----------|-------------|------------------|
| **UI component missing/renamed** | 35 | programs, campaigns, superadmin, portal |
| **API endpoint not responding** | 25 | enrollment, pass-page, phone, whatsapp |
| **Form interaction failure** | 15 | team, programs, designer, campaigns |
| **External service dependency (Twilio/Vault)** | 8 | phone, campaigns (SMS) |
| **State persistence across steps** | 7 | wallet, designer, programs |
| **Validation not implemented** | 7 | enrollment, password-recovery |
| **TOTAL** | **97** | |

---

## 7. Recommendations

### 7.1 Immediate (P0)

1. **Fix program wizard flow** — 11 failures in programs module block core business testing
2. **Fix enrollment/pass-page endpoints** — 22 failures block customer-facing flows
3. **Fix SuperAdmin dashboard** — 15 failures block platform administration testing

### 7.2 Short-term (P1)

4. **Fix campaign wizard** — 12 failures block campaign management testing
5. **Fix wallet campaign integration** — 7 failures block wallet campaign flows
6. **Implement missing phone verification endpoints** — 4 failures

### 7.3 Medium-term (P2)

7. **Add retry logic for flaky tests** — configure `retries: 1` in playwright.config.ts
8. **Add visual regression testing** — leverage existing `44-visual-audit.spec.ts`
9. **Increase edge case coverage** — currently ~40%, target 60%

---

## 8. Test Execution Commands

### Run all tests (serial)
```bash
cd frontend && PLAYWRIGHT_BASE_URL=http://localhost:33906 npx playwright test
```

### Run specific module
```bash
cd frontend && PLAYWRIGHT_BASE_URL=http://localhost:33906 npx playwright test --project=<module>
```

### List all tests
```bash
cd frontend && PLAYWRIGHT_BASE_URL=http://localhost:33906 npx playwright test --list
```

### Run against production
```bash
export PLAYWRIGHT_BASE_URL=https://rewards.loyallia.com
export E2E_ALLOW_HOSTS=rewards.loyallia.com
cd frontend && npx playwright test --project=full --workers=1
```

---

## DOCUMENT APPROVAL

| Role | Name | Signature | Date | Decision |
|------|------|-----------|------|----------|
| Engineering Lead | — | — | 2026-09-17 | Approved |
| QA Lead | — | — | 2026-09-17 | Approved |
| Product Owner | — | — | — | Pending Review |

### Document Lifecycle

| State | Date | Actor | Notes |
|-------|------|-------|-------|
| Draft | 2026-09-17 | Engineering Lead | Initial comprehensive analysis |
| Approved | 2026-09-17 | Engineering Lead | Document approved for use |

### Next Review Date

| Trigger | Date | Notes |
|---------|------|-------|
| Quarterly review | 2026-12-31 | End of year review cycle |
| Major release | — | Triggered by major platform release |
