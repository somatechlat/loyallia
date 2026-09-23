---
title: "Production E2E Testing Guide"
document_id: "LOYALLIA-DOC-PRODUCTION_E2E_TESTING.MD"
version: "1.0"
status: "approved"
last_updated: "2026-09-16"
author: "Engineering Lead"
owner: "Engineering Lead"
approver: "Product Owner"
classification: "Internal Use"
confidentiality: "Internal — Restricted to Engineering and Product teams"
review_cycle: "Upon each major release, or annually (whichever comes first)"
standard: "ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011"
parent_document: "N/A"
---

## DOCUMENT CONTROL

| Field | Details |
|-------|---------|
| **Document ID** | LOYALLIA-DOC-PRODUCTION_E2E_TESTING.MD |
| **Title** | Production E2E Testing Guide |
| **Version** | 1.0 |
| **Date** | 2026-09-16 |
| **Author** | Engineering Lead |
| **Approver** | Product Owner |
| **Owner** | Engineering Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and Product teams |
| **Review Cycle** | Upon each major release, or annually (whichever comes first) |
| **Status** | approved |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011|
| **Parent Document** | N/A |
| **Supersedes** | N/A |
| **Language** | English |
| **Format** | Markdown (.md) |
| **Location** | `docs/03-guides/PRODUCTION_E2E_TESTING.md` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-09-16 | Engineering Lead | Added ISO-compliant document controls |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Engineering Lead | Author / Owner | Maintains document |
| Product Owner | Approver | Business validation |
| Security Officer | Reviewer | Security requirements validation |
| QA Lead | Reviewer | Quality assurance validation |

### Related Documents

| Document ID | Title | Relationship |
|-------------|-------|-------------|
| LOYALLIA-RULES-001 | Loyallia Agent Rules And Coding Standards | Reference |
| LOYALLIA-AGENTS-001 | Loyallia Agent Instructions | Reference |
| LOYALLIA-DOC-ARCHITECTURE.MD | Loyallia Architecture, Sequence & Flowchart Diagrams | Reference |

### Change Control Process

1. All changes to this document MUST be recorded in the Revision History table above.
2. Status transitions: `draft` → `review` → `approved` → `active` → `deprecated` → `archived`.
3. Changes after `approved` status require a new version number and re-approval.
4. Minor corrections (typos, formatting) increment the minor version (e.g., 1.0 → 1.1).
5. Major changes (new requirements, scope changes) increment the major version (e.g., 1.0 → 2.0).
6. Deprecated documents MUST be moved to `docs/09-archive/` with a deprecation notice.
7. All dates in this document use ISO 8601 format (`YYYY-MM-DD`).

## DOCUMENT APPROVAL

| Role | Name | Signature | Date | Decision |
|------|------|-----------|------|----------|
| Engineering Lead | — | — | 2026-09-16 | Approved |
| Product Owner | — | — | 2026-09-16 | Approved |
| Security Officer | — | — | — | Pending Review |

### Document Lifecycle

| State | Date | Actor | Notes |
|-------|------|-------|-------|
| Draft | 2026-09-16 | Engineering Lead | Initial ISO controls added |
| Approved | 2026-09-16 | Engineering Lead | Document approved for use |

### Next Review Date

| Trigger | Date | Notes |
|---------|------|-------|
| Annual review | 2026-12-31 | End of year review cycle |
| Major release | — | Triggered by major platform release |

# Production E2E Testing Guide

> **Last updated:** 2026-08-28
> **Status:** Production-ready — all infrastructure in place

## Overview

Loyallia has a comprehensive Playwright E2E test suite (~233 tests across 46 spec files) that verifies all user journeys across all roles (SuperAdmin, Owner, Manager, Staff). Tests run against the **live production server** at `https://rewards.loyallia.com`.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PRODUCTION SERVER                      │
│                  140.82.15.48 / loyallia                  │
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Nginx    │  │ API      │  │ Web      │  │ PostgreSQL│ │
│  │ :443     │→ │ :33905   │  │ :33906   │  │ :33900   │ │
│  │ (SSL)    │  │ (Gunicorn)│  │ (Next.js)│  │ (PgBouncer│ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↑
                          │ HTTPS
                          │
┌─────────────────────────────────────────────────────────┐
│                 PLAYWRIGHT TESTS                          │
│               (runs from local machine)                   │
│                                                           │
│  1. auth.setup.ts → POST /api/v1/auth/login/ (4 roles)   │
│  2. Injects JWT as cookies on production domain           │
│  3. Tests navigate UI + call APIs                         │
│  4. Results: HTML report + traces on failure              │
└─────────────────────────────────────────────────────────┘
```

## Test Users (Production E2E)

Created by `provision_production_e2e_test_users` management command:

| Role | Email | Purpose |
|------|-------|---------|
| Owner | `e2e-owner@loyallia.com` | Full business CRUD, campaigns, billing |
| Manager | `e2e-manager@loyallia.com` | Limited permissions, read-only access |
| Staff | `e2e-staff@loyallia.com` | Scanner PWA, transaction processing |
| SuperAdmin | `e2e-superadmin@loyallia.com` | Platform administration, impersonation |

**Tenant:** `e2e-production-tenant` (Enterprise plan, full features)
**Location:** `E2E Main Location` (Guayaquil, EC)

## How Auth Works

1. `auth.setup.ts` reads `.auth/e2e-credentials.json` (generated by provisioning command)
2. For each role, POSTs to `/api/v1/auth/login/` with email+password
3. Receives `access_token` + `refresh_token` (JWT)
4. Injects tokens as cookies on `rewards.loyallia.com` domain
5. Saves `.auth/{role}.json` storageState files
6. Each test project uses the appropriate role's storageState

**Key detail:** On production (HTTPS), API calls go to the same domain (nginx proxies `/api/` to Gunicorn). No port `:33905` needed.

## Running Tests

### Prerequisites
- Node.js 18+ installed locally
- Playwright browsers installed (`npx playwright install chromium`)
- `.auth/e2e-credentials.json` exists on server (created by provisioning command)

### Environment Variables

```bash
export PLAYWRIGHT_BASE_URL=https://rewards.loyallia.com
export E2E_ALLOW_HOSTS=rewards.loyallia.com  # bypasses production safety block
```

### Smoke Test (safe, read-only)

```bash
cd frontend
npx playwright test --project=auth,programs,customers,role-isolation
```

### Full Suite

```bash
cd frontend
npx playwright test --project=full
```

### Individual Projects

```bash
npx playwright test --project=auth          # Login + routing
npx playwright test --project=programs      # Program CRUD
npx playwright test --project=customers     # Customer management
npx playwright test --project=team          # Team management
npx playwright test --project=locations     # Location management
npx playwright test --project=analytics     # Dashboard + analytics
npx playwright test --project=automation    # Automation rules
npx playwright test--project=campaigns     # Wallet/SMS/Email campaigns
npx playwright test --project=scanner       # Scanner PWA (STAFF role)
npx playwright test --project=superadmin    # Platform admin
npx playwright test --project=role-isolation # RBAC boundaries
npx playwright test --project=wallet        # Apple/Google Wallet
npx playwright test --project=whatsapp      # WhatsApp bridge
npx playwright test --project=security      # Security hardening
npx playwright test --project=billing       # Billing page
npx playwright test --project=phone         # Phone verification
```

## Test Safety

### Production Guards

1. **`e2e-safety.ts`** blocks production hostnames unless `E2E_ALLOW_HOSTS` is set
2. **`provision_production_e2e_test_users`** requires production Vault path
3. Tests use unique email prefixes (`e2e-`) to avoid collision with real users
4. Destructive tests (factory reset, seed demo) are skipped on production

### Data Isolation

- E2E tenant is isolated from real business tenants
- Test data uses `e2e-` prefix for easy identification
- Programs/customers created by tests have unique names with timestamps
- Cleanup hooks remove test data after each suite

### Rate Limits

- Tests run serially (1 worker) to avoid rate limiting
- Delays between API calls respect plan limits
- Enterprise plan subscription ensures full feature access

## Troubleshooting

### "Refusing to run E2E tests against production host"
Set `E2E_ALLOW_HOSTS=rewards.loyallia.com` environment variable.

### "No local E2E credential file exists"
Run provisioning command inside Docker:
```bash
docker exec loyallia-api python manage.py provision_production_e2e_test_users --generate
```

### Login returns 503
Vault token may have expired. Unseal Vault:
```bash
ssh root@140.82.15.48
# Get unseal keys from secure storage
vault operator unseal <key1>
vault operator unseal <key2>
vault operator unseal <key3>
```

### Tests timeout
Production may be slower than local. Increase timeout:
```bash
npx playwright test --timeout=120000
```

### SSL certificate errors
Tests use `ignoreHTTPSErrors: true` in playwright.config.ts. If still failing, check certificate:
```bash
openssl s_client -connect rewards.loyallia.com:443 -servername rewards.loyallia.com
```

## File Locations

| File | Purpose |
|------|---------|
| `frontend/playwright.config.ts` | Main Playwright configuration |
| `frontend/tests/e2e/helpers/auth.setup.ts` | Global auth setup (login + cookie injection) |
| `frontend/tests/e2e/helpers/e2e-safety.ts` | Production safety guards |
| `frontend/tests/e2e/helpers/e2e-test-config.ts` | Credential reader |
| `frontend/tests/e2e/suite/*.spec.ts` | 32 test spec files |
| `frontend/.auth/e2e-credentials.json` | Generated credentials (git-ignored) |
| `frontend/.auth/{role}.json` | Per-role storageState (git-ignored) |
| `backend/apps/tenants/management/commands/provision_production_e2e_test_users.py` | Production provisioning |
| `backend/apps/tenants/management/commands/provision_development_rbac_test_users.py` | Development provisioning |
