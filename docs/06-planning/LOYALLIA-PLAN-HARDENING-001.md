---
title: "Loyallia — System Hardening Plan: Atomicity, Icon Preview, CRUD Audit"
document_id: "LOYALLIA-PLAN-HARDENING-001"
version: "1.0"
status: "draft"
last_updated: "2026-09-12"
author: "Engineering Team"
owner: "Engineering Team"
approver: "Product Owner"
classification: "Internal Use"
confidentiality: "Loyallia engineering team only"
review_cycle: "On completion of each phase"
---

## DOCUMENT CONTROL

| Field | Value |
|---|---|
| Document ID | LOYALLIA-PLAN-HARDENING-001 |
| Title | System Hardening Plan: Atomicity, Icon Preview, CRUD Audit |
| Version | 1.0 |
| Date | 2026-09-12 |
| Author | Engineering Team |
| Approver | Product Owner |
| Owner | Engineering Team |
| Classification | Internal Use |
| Confidentiality | Loyallia engineering team only |
| Review Cycle | On completion of each phase |
| Status | draft |
| Standard | ISO 27001:2022, ISO 9001:2015, ISO 42010:2011 |
| Parent Document | LOYALLIA-SRS-MASTER-001 |
| Supersedes | N/A |
| Language | English |
| Format | .md |
| Location | docs/06-planning/LOYALLIA-PLAN-HARDENING-001.md |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-09-12 | Engineering Team | Initial draft — 3 audit findings + implementation plan |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Product Owner | Approver | Review and approve implementation |
| Engineering Team | Implementer | Execute the plan |
| QA Team | Verifier | Verify all changes pass tests |

### Related Documents

| Document ID | Title | Relationship |
|---|---|---|
| LOYALLIA-SRS-MASTER-001 | Master SRS | Parent |
| LOYALLIA-SRS-002 | Architecture | System architecture reference |
| LOYALLIA-ARCH-BOOTSTRAP-001 | Bootstrap Architecture | Settings architecture reference |

---

## 1. EXECUTIVE SUMMARY

Three independent audits found issues across the Loyallia system:

1. **Icon Preview Gap (P0):** Icons selected in the wallet designer studio tabs are NOT rendered in the phone preview. Users configure icons but see no change.
2. **Transaction Atomicity (P1):** 14 of 75 mutation endpoints lack `transaction.atomic()` for multi-operation writes. Tenant creation blocks on SMTP causing phantom errors.
3. **CRUD Audit (P1):** 75 endpoints audited, 14 AT RISK, 0 BROKEN. All AT RISK items need atomic wrapping.

This plan fixes all three in 3 phases with full test coverage.

---

## 2. PROBLEM STATEMENT

### 2.1 Icon Preview Gap

**SRS Reference:** SRS-006 (Card Type Visual Customization), SRS-003 (UI Specifications)

**Evidence:** The `IconPicker` component stores icon IDs (e.g., `"coffee"`, `"star"`) in the `cardTypeConfig`. The `preview-decorations.tsx` components accept icon props and render `<img src={iconUrl}>`. But the icon ID (e.g., `"coffee"`) is NOT a URL — it's a symbolic ID that needs to be resolved to an actual image URL via `icon-library.ts`.

**Impact:** Users select icons in the studio, see them in the picker, but the preview shows nothing or a broken image.

**Root Cause:** The preview decorations receive icon IDs as strings and pass them directly to `<img src={...}>`. The `img` tag needs a URL, not an ID. The `getIconById()` function in `icon-library.ts` resolves IDs to URLs, but the preview decorations don't call it.

### 2.2 Transaction Atomicity

**SRS Reference:** SRS-001 (Functional Requirements — Data Integrity), ISO 27001 A.14.2.5 (Secure system engineering)

**Evidence:** 14 endpoints perform multiple DB writes without `transaction.atomic()`:

| Endpoint | Operations | Risk |
|---|---|---|
| `POST /tenants/{id}/suspend/` | tenant.save + subscription.save | Tenant suspended, subscription not |
| `POST /tenants/{id}/reactivate/` | tenant.save + subscription.save | Tenant active, subscription still suspended |
| `POST /tenants/{id}/extend-trial/` | tenant.save + subscription.save | Trial extended on tenant, not subscription |
| `POST /locations/` | Location.create + primary flag update | Two locations marked primary |
| `PATCH /locations/{id}/` | Location.save + primary flag update | Same |
| `POST /automations/` | create + M2M set + save | Automation without programs |
| `PUT /automations/{id}/` | M2M set + save | Partial update |
| `POST /automations/{id}/execute/` | execute + audit | Side effects without audit |
| `POST /tenants/` (creation) | atomic OK but `on_commit` blocks on SMTP | Phantom 500 error |
| `POST /scanner/transact/` | atomic OK but async tasks not on_commit | Tasks fire before commit |
| `POST /users/invite/` | atomic OK but email not on_commit | Email before commit |
| `POST /subscription/cancel/` | gateway call before DB | Gateway succeeds, DB fails |
| Wallet template CRUD (4 endpoints) | template + audit log | Template without audit |

### 2.3 Tenant Creation SMTP Blocking

**Root Cause:** `send_owner_welcome_email()` runs synchronously inside `transaction.on_commit()`. If SMTP is slow/unreachable (local dev, overloaded server), the HTTP response blocks for 30+ seconds. Frontend Axios timeout fires, shows error. But the transaction already committed. User refreshes — data is there.

**Fix:** Send via Celery task (async), not synchronous SMTP.

---

## 3. IMPLEMENTATION PLAN

### Phase 1: Icon Preview Fix (P0)

**Files to modify:**

| File | Change |
|---|---|
| `frontend/src/components/wallet/preview-decorations.tsx` | Import `getIconById` from `icon-library.ts`. Resolve icon IDs to URLs before passing to `<img>`. |
| `frontend/src/components/wallet/icon-library.ts` | Verify `getIconById()` returns URL for all icon IDs used by IconPicker. |

**Specific changes:**

In `StampGridDecoration`: resolve `stampIcon` and `stampFilledIcon` via `getIconById()` before rendering.

In `CashbackDecoration`: resolve `coinIcon` via `getIconById()`.

In `VIPMembershipDecoration`: resolve `crownIcon` and `benefitsListIcons` via `getIconById()`.

In `GiftCertificateDecoration`: resolve `boxGraphic` via `getIconById()`.

In `ReferralPassDecoration`: resolve `referralIcon`, `rewardBadgeIcon`, `friendAvatarPlaceholder` via `getIconById()`.

In `DiscountDecoration`: resolve `tierBadgeIcons` via `getIconById()`.

In `AffiliateDecoration`: resolve `referralChainIcon`, `ambassadorBadge` via `getIconById()`.

In `CorporateDiscountDecoration`: resolve `buildingIcon`, `departmentBadge` via `getIconById()`.

In `MultipassDecoration`: resolve `ticketGraphic`, `punchIcon` via `getIconById()`.

**Pattern:**
```typescript
import { getIconById } from '@/components/wallet/icon-library';

// Inside component:
const resolvedIcon = iconId ? getIconById(iconId) : null;
// Then: resolvedIcon ? <img src={resolvedIcon.url} ... /> : <default SVG />
```

**Tests:**
- Unit: verify `getIconById` returns URL for all known icon IDs
- E2E: select icon in studio, verify preview updates

### Phase 2: Transaction Atomicity (P1)

**Files to modify:**

| File | Endpoints | Change |
|---|---|---|
| `backend/apps/tenants/super_admin_api/tenants.py` | suspend, reactivate, extend-trial | Wrap tenant.save + subscription.save in `transaction.atomic()` |
| `backend/apps/tenants/api.py` | create_location, update_location | Wrap Location ops + primary flag in `transaction.atomic()` |
| `backend/apps/automation/api.py` | create_automation, update_automation, execute_automation | Wrap create + M2M + save in `transaction.atomic()` |
| `backend/apps/wallet/api.py` | create_template, update_template, delete_template, use_template | Wrap template + audit log in `transaction.atomic()` |
| `backend/apps/tenants/super_admin_api/tenants.py` | create_tenant | Change `on_commit` from sync SMTP to Celery task |
| `backend/apps/transactions/api.py` | transact | Move async side effects into `on_commit` |
| `backend/apps/authentication/users_api.py` | invite_user | Move `send_otp_email` into `on_commit` |

**Pattern for wrapping:**
```python
# BEFORE (broken):
tenant.save()
subscription.save()

# AFTER (atomic):
from django.db import transaction
with transaction.atomic():
    tenant.save()
    subscription.save()
```

**Pattern for async email:**
```python
# BEFORE (blocks on SMTP):
transaction.on_commit(lambda: send_owner_welcome_email(...))

# AFTER (async via Celery):
from apps.tenants.tasks import send_owner_welcome_email_task
transaction.on_commit(lambda: send_owner_welcome_email_task.delay(...))
```

**Tests:**
- Backend: each wrapped endpoint tested with `pytest` to verify atomicity
- E2E: tenant creation completes without timeout error

### Phase 3: Verification

| Check | Command | Expected |
|---|---|---|
| TypeScript | `npm run typecheck` | 0 errors |
| Unit tests | `npm run test:unit` | 503+ pass |
| Build | `npm run build` | exit 0 |
| Ruff | `ruff check backend/` | 0 errors |
| Pyright | `pyright backend/` | 0 errors |
| E2E Suite 02 | Playwright programs | 8/8 pass |
| E2E Suite 36 | Playwright designer | 22/22 pass |
| E2E Suite 42 | Playwright corrections | 29/29 pass |
| Manual | Upload icon, verify preview | Icon visible |
| Manual | Create business, no timeout | Clean success |

---

## 4. RISK ASSESSMENT

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Icon resolution breaks for unknown IDs | Low | Medium | Fallback to default SVG if `getIconById` returns null |
| Atomic wrapping causes deadlocks | Very Low | High | Each atomic block touches different tables; no cross-table locks |
| Celery task not running | Low | Medium | `on_commit` only queues; if Celery is down, email is lost (acceptable) |
| E2E tests fail after changes | Medium | Low | Changes are additive; existing tests should still pass |

---

## 5. COMPLIANCE TRACEABILITY

| Requirement | Source | Implementation |
|---|---|---|
| Data integrity on multi-table writes | ISO 27001 A.14.2.5 | `transaction.atomic()` on all multi-op endpoints |
| Secure system engineering | ISO 27001 A.14.2.5 | Async side effects via Celery, not blocking HTTP |
| Quality management | ISO 9001:2015 8.5.1 | All changes verified with automated tests |
| Architecture description | ISO 42010:2011 | This document describes the system change |
| Audit trail | ISO 27001 A.8.2.1 | All mutation endpoints maintain audit logs |
