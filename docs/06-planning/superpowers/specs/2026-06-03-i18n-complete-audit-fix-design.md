---
title: "i18n Complete Audit & Fix — Design Document"
document_id: "LOYALLIA-DOC-2026-06-03-I18N-COMPLETE-AUDIT-FIX-DESIGN.MD"
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
| **Document ID** | LOYALLIA-DOC-2026-06-03-I18N-COMPLETE-AUDIT-FIX-DESIGN.MD |
| **Title** | i18n Complete Audit & Fix — Design Document |
| **Version** | 1.0 |
| **Date** | 2026-09-16 |
| **Author** | Engineering Lead |
| **Approver** | Product Owner |
| **Owner** | Engineering Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and Product teams |
| **Review Cycle** | Upon each major release, or annually (whichever comes first) |
| **Status** | approved |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011 |
| **Parent Document** | N/A |
| **Supersedes** | N/A |
| **Language** | English |
| **Format** | Markdown (.md) |
| **Location** | `docs/06-planning/superpowers/specs/2026-06-03-i18n-complete-audit-fix-design.md` |

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
| LOYALLIA-ARCH-001 | Architecture Diagrams | Reference |

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

# i18n Complete Audit & Fix — Design Document

**Date:** 2026-06-03  
**Scope:** Entire Loyallia codebase (frontend + backend)  
**Approach:** B — Parallel Domain Agents  

## Problem Statement

Multiple frontend pages and backend API responses contain hardcoded Spanish strings instead of routing through the i18n system (`t()` on frontend, `get_message()` on backend). FR and DE locale files are ~95% empty, causing everything to fall back to Spanish — unacceptable for enterprise users in France and Germany.

## Current i18n Architecture

### Frontend (Next.js 14, React 18)
- **Provider:** `frontend/src/lib/i18n/index.tsx`
- **Catalogs:** `frontend/src/lib/i18n/locales/{es,en,fr,de}.json`
- **API:** `const { t } = useI18n()` — nested key lookup with `{var}` interpolation
- **Fallback:** Missing key → Spanish
- **Coverage:** ES/EN ~1163 keys, FR/DE ~60 keys

### Backend (Django 5, Ninja)
- **Provider:** `backend/common/messages/__init__.py`
- **Catalogs:** `backend/common/messages/{auth,billing,campaigns,common}.py`
- **API:** `get_message(code, lang=None, **kwargs)` / `get_message_for_request(code, request, **kwargs)`
- **Fallback:** Missing code → Spanish → KeyError
- **Coverage:** ES canonical, EN full, FR/DE minimal

## Strategy: Parallel Domain Agents

Split the codebase into independent domains. Deploy one agent per domain. Each agent:

1. Reads all files in its domain
2. Identifies every hardcoded user-facing string
3. Adds new message keys to locale files (frontend JSON / backend Python dicts)
4. Replaces hardcoded strings with `t()` or `get_message()` calls
5. Ensures FR/DE get English fallback for new keys
6. Runs domain-relevant tests

### Domain Split

| Agent | Scope | Files |
|-------|-------|-------|
| **Frontend Auth** | Login, Register, Forgot Password, Reset Password, Verify Email | `src/app/(auth)/**`, `src/components/auth/**` |
| **Frontend Dashboard** | Dashboard home, stats, charts, sidebar, nav | `src/app/dashboard/**`, `src/components/dashboard/**` |
| **Frontend Programs & Campaigns** | Programs list, detail, create, edit, campaigns | `src/app/programs/**`, `src/app/campaigns/**`, `src/components/programs/**` |
| **Frontend Customers & Locations** | Customers list, detail, locations, teams | `src/app/customers/**`, `src/app/locations/**`, `src/app/team/**` |
| **Frontend Billing & Settings** | Billing, plans, invoices, settings, profile | `src/app/billing/**`, `src/app/settings/**`, `src/components/settings/**` |
| **Frontend Portal & Scanner** | Public portal, scanner PWA, enrollment | `src/app/portal/**`, `src/app/scanner/**`, `src/app/enrollment/**` |
| **Frontend Shared Components** | CookieConsent, ErrorBoundary, Toasts, Modals, Forms | `src/components/**` (cross-cutting) |
| **Backend Auth & Users** | Auth APIs, user management, invites, impersonation | `backend/apps/auth/**`, `backend/apps/users/**` |
| **Backend Core APIs** | Customers, programs, campaigns, locations, teams APIs | `backend/apps/customers/**`, `backend/apps/programs/**`, `backend/apps/campaigns/**`, `backend/apps/locations/**` |
| **Backend Billing & Payments** | Billing APIs, payment models, invoices, plans | `backend/apps/billing/**` |
| **Backend Portal & Webhooks** | Portal API, WhatsApp bridge, webhooks, scanner API | `backend/apps/portal/**`, `backend/apps/whatsapp/**`, `services/whatsapp-bridge/**` |
| **Backend Common Messages** | Fill FR/DE gaps in all `common/messages/*.py` files | `backend/common/messages/**` |

## Translation Strategy for New Keys

For every new key added:
- **ES:** Real Spanish translation (canonical)
- **EN:** Real English translation
- **FR:** English fallback (user preference: more universally understood than Spanish for FR market)
- **DE:** English fallback (same reasoning)

## Quality Gates

After ALL agents complete and changes are merged:
1. `cd backend && ruff check .`
2. `cd backend && pytest -q`
3. `cd frontend && npm run typecheck`
4. `cd frontend && npm run test:unit`
5. `cd frontend && npm run build`

All gates must pass before claiming completion.

## Risk Mitigation

- **No functional changes:** Only string replacements, no logic changes
- **Domain isolation:** Each agent works on disjoint file sets — no merge conflicts
- **Fallback safety:** If a new key is missing, frontend falls back to ES; backend falls back to ES then KeyError. We validate all keys exist.
- **Test after each domain:** Run relevant tests before moving to next domain

## Success Criteria

- [ ] Zero hardcoded Spanish strings in any frontend component/page
- [ ] Zero hardcoded Spanish strings in any backend API response
- [ ] All 4 locale files (ES, EN, FR, DE) contain every key used in the codebase
- [ ] FR/DE files have no missing keys (English fallback acceptable)
- [ ] All tests pass (backend ruff + pytest, frontend typecheck + build + unit tests)
