---
title: "Loyallia vs Boomerangme — Feature Parity SRS"
document_id: "LOYALLIA-SRS-BOOMERANG-001"
version: "1.0"
status: "draft"
last_updated: "2026-09-12"
author: "Engineering Team"
owner: "Product Owner"
approver: "Product Owner"
classification: "Internal Use"
confidentiality: "Loyallia engineering team only"
review_cycle: "On completion of each phase"
standard: "ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011"
parent_document: "LOYALLIA-SRS-MASTER-001"
---

## DOCUMENT CONTROL

| Field | Value |
|---|---|
| **Document ID** | LOYALLIA-SRS-BOOMERANG-001 |
| **Title** | Loyallia vs Boomerangme — Feature Parity SRS |
| **Version** | 1.0 |
| **Date** | 2026-09-12 |
| **Author** | Engineering Team |
| **Approver** | Product Owner |
| **Owner** | Engineering Team |
| **Classification** | Internal Use |
| **Status** | draft |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011|
| **Parent Document** | LOYALLIA-SRS-MASTER-001 |
| **Supersedes** | N/A |
| **Language** | English |
| **Format** | .md |
| **Location** | docs/06-planning/LOYALLIA-SRS-BOOMERANG-001.md |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|-------------|
| 1.0 | 2026-09-12 | Engineering Team | Initial draft — Boomerangme feature comparison |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Product Owner | Approver | Review feature gaps |
| Engineering Team | Implementer | Implement missing features |

### Related Documents

| Document ID | Title | Relationship |
|---|---|---|
| LOYALLIA-SRS-MASTER-001 | Master SRS | Parent |
| LOYALLIA-PLAN-HARDENING-001 | System Hardening Plan | Related |
| LOYALLIA-PLAN-DESIGNER-FIX-002 | Wallet Designer Fix Plan | Related |

### Change Control Process

1. All changes to this document MUST be recorded in the Revision History table above.
2. Status transitions: `draft` → `review` → `approved` → `active` → `deprecated` → `archived`.
3. Changes after `approved` status require a new version number and re-approval.
4. Minor corrections increment the minor version (e.g., 1.0 → 1.1).
5. Major changes increment the major version (e.g., 1.0 → 2.0).
6. Deprecated documents MUST be moved to `docs/09-archive/` with a deprecation notice.
7. All dates in this document use ISO 8601 format (`YYYY-MM-DD`).

## DOCUMENT APPROVAL

| Role | Name | Signature | Date | Decision |
|------|------|-----------|------|----------|
| Engineering Lead | — | — | 2026-09-23 | Approved |
| Product Owner | — | — | 2026-09-23 | Approved |
| Security Officer | — | — | — | Pending Review |

### Document Lifecycle

| State | Date | Actor | Notes |
|-------|------|-------|-------|
| Draft | 2026-09-12 | Engineering Team | initial authoring |
| Reviewed | 2026-09-23 | Engineering Lead | ISO document-control completeness applied |

### Next Review Date

| Trigger | Date | Notes |
|---------|------|-------|
| Annual review | 2027-09-23 | Annual ISO document-control review |
| Plan completion | — | Triggered upon plan completion |

---

## 1. EXECUTIVE SUMMARY

Boomerangme (boomerangme.com) is a direct competitor offering a digital loyalty platform for local businesses with 30,000+ customers. This document compares every feature of Boomerangme against Loyallia's current implementation to identify gaps and prioritize work.

**Current parity: ~75%** — Loyallia has most core features but lacks some engagement tools, RFM analysis, and agency/franchise capabilities.

---

## 2. FEATURE COMPARISON MATRIX

### 2.1 Digital Loyalty Cards

| Feature | Boomerangme | Loyallia | Status |
|---|---|---|---|
| Punch cards (stamps) | YES | YES — StampCard | PARITY |
| Cashback cards | YES | YES — CashbackCard | PARITY |
| Membership cards | YES | YES — VipMembershipCard | PARITY |
| Reward cards (tiers) | YES | YES — DiscountCard | PARITY |
| Discount cards | YES | YES — DiscountCard | PARITY |
| Prepaid punch cards | YES | NO | **GAP** |
| Coupon cards | YES | YES — CouponCard | PARITY |
| Gift cards | YES | YES — GiftCertificateCard | PARITY |
| Custom card design (WYSIWYG) | YES — 111 templates | YES — WalletPassStudio | PARITY |
| Apple Wallet | YES | YES | PARITY |
| Google Wallet | YES | YES | PARITY |
| Custom fields | YES | YES — FormBuilder | PARITY |
| Unique barcode per card | YES | YES — QR/barcode | PARITY |
| Expiration date | YES | YES — stampExpiry | PARITY |
| Logo upload | YES | YES | PARITY |
| Stamp shape customization | YES (limited) | YES — 6 shapes | PARITY+ |
| Stamp color customization | YES | YES | PARITY |
| Icon library (200+ icons) | YES | YES — icon-library.ts | PARITY |
| Grid layout options | YES | YES — 5 layouts | PARITY |

### 2.2 Customer Engagement

| Feature | Boomerangme | Loyallia | Status |
|---|---|---|---|
| Push notifications | YES — unlimited free | YES — wallet pushes | PARITY |
| SMS mailings | YES | YES — Twilio | PARITY |
| Email mailings | YES | YES — Mailjet | PARITY |
| 2-way communication | YES | YES — WhatsApp bridge | PARITY |
| Referral program | YES | YES — ReferralPassCard | PARITY |
| Feedback collection (Google Reviews) | YES | NO | **GAP** |
| Geo-fenced push notifications | YES — 100m radius | YES — Location model | PARITY |
| Push automation (trigger-based) | YES | YES — Automation engine | PARITY |
| Customer data platform (CDP) | YES | YES — Customer model | PARITY |
| RFM analysis | YES — automated segmentation | NO | **GAP** |
| Richie AI Marketer | YES — autonomous AI agent | YES — AI assistant | PARITY (different approach) |
| Duplicate control | YES | YES — unique constraint | PARITY |
| Custom fields per card | YES | YES — FormBuilder | PARITY |

### 2.3 Scanner & POS

| Feature | Boomerangme | Loyallia | Status |
|---|---|---|---|
| PWA Scanner App | YES | YES — scanner/scan | PARITY |
| POS integration | YES — Clover, Square, Toast | NO | **GAP** |
| Manual code entry | YES | YES | PARITY |
| QR code scanning | YES | YES | PARITY |
| Transaction history | YES | YES — Transaction model | PARITY |

### 2.4 Analytics & Reporting

| Feature | Boomerangme | Loyallia | Status |
|---|---|---|---|
| Real-time analytics | YES | YES — analytics API | PARITY |
| Automated reports | YES | YES — Celery tasks | PARITY |
| Leaderboards | YES | NO | **GAP** |
| ROI calculator | YES — public tool | NO | **GAP** |
| Engagement rate | YES | YES | PARITY |
| Per-location analytics | YES | YES — Location model | PARITY |

### 2.5 Agency & Franchise

| Feature | Boomerangme | Loyallia | Status |
|---|---|---|---|
| White-label platform | YES — Agency plan | YES — tenant branding | PARITY |
| Sub-accounts (multi-tenant) | YES — 3 included | YES — unlimited tenants | PARITY+ |
| Reseller dashboard | YES | NO | **GAP** |
| Franchise dashboard | YES | NO | **GAP** |
| Multi-location management | YES | YES — Location model | PARITY |
| Role-based access | YES | YES — RBAC (4 roles) | PARITY |
| Payment gateway (Stripe/PayPal) | YES | YES — payment_api.py | PARITY |
| Prospecting tool | YES | NO | **GAP** |

### 2.6 Integrations

| Feature | Boomerangme | Loyallia | Status |
|---|---|---|---|
| API & Webhooks | YES | YES — Django Ninja API | PARITY |
| POS integrations | YES — Clover, Square, Toast | NO | **GAP** |
| WhatsApp | YES | YES — Baileys bridge | PARITY |
| Email (Mailjet) | YES | YES | PARITY |
| SMS (Twilio) | YES | YES | PARITY |
| Google OAuth | YES | YES | PARITY |

### 2.7 Platform & Admin

| Feature | Boomerangme | Loyallia | Status |
|---|---|---|---|
| SuperAdmin dashboard | YES | YES | PARITY |
| Plan management | YES | YES — SubscriptionPlan | PARITY |
| Tenant management | YES | YES | PARITY |
| Settings management | YES | YES — PlatformSetting | PARITY |
| Factory reset | YES | YES — 3 mechanisms | PARITY |
| Demo data seeding | YES | YES — seed_demo_data | PARITY |
| Audit logging | YES | YES — AuditAction | PARITY |
| Backup system | YES | YES — backup service | PARITY |
| Monitoring (Prometheus/Grafana) | NO | YES | LOYALLIA ADVANTAGE |

### 2.8 Pricing Model

| Plan | Boomerangme | Loyallia |
|---|---|---|
| Starter | Business $199/mo | Trial (free) |
| Mid-tier | Agency $259/mo | Starter/Professional |
| Enterprise | Franchise $299/mo | Enterprise |
| Annual discount | ~20% off | Configurable |

---

## 3. GAP ANALYSIS — What Loyallia Needs

### 3.1 HIGH PRIORITY (Customer-requested features)

| # | Feature | Boomerangme Reference | Loyallia Status | Effort |
|---|---|---|---|---|
| G1 | Prepaid punch cards | `/solutions/prepaid-digital-punch-cards` | Missing card type | Medium — new CardType |
| G2 | RFM analysis | `/customer-engagement/rfm-analysis` | Missing entirely | Large — new module |
| G3 | Feedback collection (Google Reviews) | `/customer-engagement/feedback-collection` | Missing entirely | Medium — new API + UI |
| G4 | POS integrations (Clover, Square, Toast) | `/integrations` | Missing entirely | Large — new integration layer |

### 3.2 MEDIUM PRIORITY (Nice to have)

| # | Feature | Reference | Status | Effort |
|---|---|---|---|---|
| G5 | Leaderboard/competitive analytics | Pricing page | Missing | Small — new analytics view |
| G6 | ROI calculator (public) | `/loyalty-roi-calculator` | Missing | Small — public page |
| G7 | Reseller dashboard | Agency plan | Missing | Medium — new admin view |
| G8 | Franchise dashboard | Franchise plan | Missing | Medium — new admin view |
| G9 | Prospecting tool | Agency plan | Missing | Large — new module |

### 3.3 LOW PRIORITY (Already covered or not needed)

| # | Feature | Notes |
|---|---|---|
| G10 | Richie AI equivalent | Loyallia has AI assistant — different approach but covers same ground |
| G11 | 111 design templates | Loyallia has template system — need more templates |
| G12 | Employee Sales tracking | Loyallia has Manager role + transaction tracking |

---

## 4. WHAT LOYALLIA HAS THAT BOOMERANGME DOESN'T

| Feature | Loyallia Advantage |
|---|---|
| 10 card types (vs 8 in Boomerangme) | Affiliate, Corporate, Multipass — unique to Loyallia |
| Wallet Pass Studio (WYSIWYG) | More advanced visual designer than Boomerangme |
| WhatsApp bridge (Baileys) | Native WhatsApp, not just SMS/email |
| Prometheus/Grafana monitoring | Enterprise-grade observability |
| Vault-based secrets management | Zero-trust security architecture |
| Factory reset (3 mechanisms) | More robust disaster recovery |
| Scanner PWA | Equivalent to Boomerangme scanner |
| Multi-language (ES/EN) | Boomerangme is English-only |
| Ecuador-specific features | Cedula field, province selection, IVA tax |

---

## 5. IMPLEMENTATION ROADMAP

### Phase 1: Quick Wins (1-2 weeks)

| Task | File(s) | Description |
|---|---|---|
| Fix wallet designer icon preview | `preview-decorations.tsx`, `IconRenderer.tsx` | Already in progress — 17 icon properties need SVG rendering |
| Fix hardcoded i18n strings | `preview-decorations.tsx`, `constants.ts` | Spanish strings in preview need i18n |
| Fix non-atomic transactions | `tenants.py`, `automation/api.py`, `wallet/api.py` | 14 endpoints need `transaction.atomic()` |
| Add ROI calculator page | New `frontend/src/app/roi-calculator/page.tsx` | Simple public page with slider inputs |

### Phase 2: RFM Analysis (2-3 weeks)

| Task | File(s) | Description |
|---|---|---|
| RFM scoring model | New `backend/apps/analytics/rfm.py` | Score customers on Recency, Frequency, Monetary |
| RFM segments | New `backend/apps/analytics/segments.py` | Champions, At Risk, Sleeping, etc. |
| RFM dashboard | New `frontend/src/app/(dashboard)/analytics/rfm/page.tsx` | Visual segment grid |
| RFM automation triggers | `backend/apps/automation/engine.py` | Trigger automations based on segment changes |

### Phase 3: Feedback Collection (1-2 weeks)

| Task | File(s) | Description |
|---|---|---|
| Google Reviews API integration | New `backend/apps/notifications/reviews/` | Request reviews after transactions |
| Review request automation | `backend/apps/automation/engine.py` | Auto-send review requests |
| Review dashboard | New frontend component | Track review metrics |

### Phase 4: Prepaid Punch Cards (1-2 weeks)

| Task | File(s) | Description |
|---|---|---|
| New card type | `backend/apps/cards/`, `frontend/src/components/wallet/studio/tabs/` | Add PrepaidPunchCard type |
| Balance tracking | `backend/apps/transactions/` | Track prepaid balance |
| Redemption logic | `backend/apps/redemption/strategies/` | Deduct from prepaid balance |

---

## 6. COMPLIANCE TRACEABILITY

| Requirement | Source | Implementation |
|---|---|---|
| Feature parity with market | ISO 25010:2011 Functional Suitability | This document |
| Security of customer data | ISO 27001:2022 A.8 | Vault, RBAC, encryption |
| Quality management | ISO 9001:2015 8.5.1 | Automated testing |
| Architecture description | ISO 42010:2011 | System architecture docs |
