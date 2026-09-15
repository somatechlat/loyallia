---
title: "SRS Addendum — Odoo CRM Integration: Functional Recommendations Based on Loyallia Platform Capabilities"
document_id: "LOYALLIA-SRS-ODOO-CRM-002"
version: "1.0"
status: "draft"
last_updated: "2026-06-15"
author: "Engineering Lead"
owner: "Engineering Lead"
approver: "Product Owner"
classification: "Internal Use"
confidentiality: "Internal — Restricted to Engineering and Product teams"
review_cycle: "Upon each major release, or annually (whichever comes first)"
standard: "ISO/IEC 29148:2018 — Requirements Engineering"
parent_document: "LOYALLIA-SRS-ODOO-CRM-001 v1.0"
engine: "Loyallia"
---

# SRS ADDENDUM — ODOO CRM INTEGRATION
## Functional Recommendations Based on Loyallia Platform Capabilities

**Document ID:** LOYALLIA-SRS-ODOO-CRM-002
**Version:** 1.0
**Status:** draft
**Date:** 2026-06-15
**Last Updated:** 2026-06-15
**Author:** Engineering Lead
**Owner:** Engineering Lead
**Approver:** Product Owner
**Classification:** Internal Use
**Confidentiality:** Internal — Restricted to Engineering and Product teams
**Review Cycle:** Upon each major release, or annually (whichever comes first)
**Standard:** ISO/IEC 29148:2018 — Requirements Engineering
**Parent Document:** LOYALLIA-SRS-ODOO-CRM-001 v1.0
**Engine:** Loyallia

---

## DOCUMENT CONTROL

| Field | Details |
|-------|---------|
| **Document ID** | LOYALLIA-SRS-ODOO-CRM-002 |
| **Title** | SRS Addendum — Odoo CRM Integration: Functional Recommendations Based on Loyallia Platform Capabilities |
| **Version** | 1.0 |
| **Date** | 2026-06-15 |
| **Author** | Engineering Lead |
| **Approver** | Product Owner |
| **Owner** | Engineering Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and Product teams |
| **Review Cycle** | Upon each major release, or annually (whichever comes first) |
| **Status** | draft |
| **Standard** | ISO/IEC 29148:2018 — Requirements Engineering |
| **Parent Document** | LOYALLIA-SRS-ODOO-CRM-001 v1.0 |
| **Reference SRS** | LOYALLIA-SRS-001 v1.0.0 (Platform SRS) |
| **Supersedes** | N/A (new document) |
| **Language** | English |
| **Format** | Markdown (.md) |
| **Location** | `docs/06-planning/SRS-Loyallia-Odoo-CRM-Recommendations.md` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 0.1 | 2026-06-15 | Engineering Lead | Initial draft — module-by-module analysis of all 13 Loyallia modules |
| 1.0 | 2026-06-15 | Engineering Lead | First release — complete recommendations with priority matrix |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Engineering Lead | Author / Owner | Maintains document, guides implementation |
| Product Owner | Approver | Business validation, priority decisions |
| Odoo Integration Developer | Implementer | Primary consumer of integration specifications |
| QA Lead | Reviewer | Acceptance criteria validation |
| Super Admin | Reviewer | Operational feasibility review |

### Related Documents

| Document ID | Title | Relationship |
|-------------|-------|-------------|
| LOYALLIA-SRS-001 | Platform SRS — Digital Loyalty Platform | Grandparent (this extends Module 12) |
| LOYALLIA-SRS-ODOO-CRM-001 | Odoo CRM Integration Module SRS | Parent (connection & sync spec) |
| LOY-ISMS-001 | ISMS Scope Statement | Reference (security scope) |

### Change Control Process

1. All changes to this document MUST be recorded in the Revision History table above.
2. Status transitions: `draft` → `review` → `approved` → `active` → `deprecated` → `archived`.
3. Changes after `approved` status require a new version number and re-approval.
4. Minor corrections (typos, formatting) increment the minor version (e.g., 1.0 → 1.1).
5. Major changes (new requirements, scope changes) increment the major version (e.g., 1.0 → 2.0).
6. Deprecated documents MUST be moved to `docs/09-archive/` with a deprecation notice.
7. All dates in this document use ISO 8601 format (`YYYY-MM-DD`).

---

## TABLE OF CONTENTS

1. [Introduction](#1-introduction)
2. [Methodology](#2-methodology)
3. [Module-by-Module Analysis](#3-module-by-module-analysis)
4. [Priority Matrix](#4-priority-matrix)
5. [Odoo CRM Model Mapping](#5-odoo-crm-model-mapping)
6. [Recommended Integration Features](#6-recommended-integration-features)
7. [Data Flow Scenarios](#7-data-flow-scenarios)
8. [Non-Integration Modules](#8-non-integration-modules)
9. [Open Questions](#9-open-questions)
10. [Document Approval](#10-document-approval)

---

## 1. INTRODUCTION

### 1.1 Purpose

This addendum to the Odoo CRM Integration SRS (LOYALLIA-SRS-ODOO-CRM-001) provides a **module-by-module analysis** of all 13 Loyallia platform modules, recommending specific Odoo CRM integration features based on actual platform capabilities documented in the parent SRS (LOYALLIA-SRS-001) and verified against the production codebase.

### 1.2 Scope

This document covers:

- Analysis of all 13 Loyallia modules for Odoo integration relevance
- Mapping of Loyallia data models to Odoo CRM models
- Specific integration feature recommendations with priority levels
- Data flow scenarios for each recommended feature
- Identification of modules where Odoo integration adds no value

### 1.3 Requirement ID Convention

Requirements in this addendum use the prefix `LYL-FR-ODOO-R-NNN` to distinguish them from the parent SRS requirements.

Priority levels: **MUST** (mandatory for v1), **SHOULD** (strongly recommended for v1), **MAY** (future phase).

---

## 2. METHODOLOGY

Each Loyallia module was evaluated against three criteria:

| Criterion | Question |
|-----------|----------|
| **Data Relevance** | Does this module produce or consume data that a CRM user would want to see? |
| **Bidirectional Value** | Does data flow both ways (Loyallia ↔ Odoo), or only one direction? |
| **Business Impact** | Would this integration save manual work or enable new business workflows? |

Each recommendation includes:
- The specific Loyallia data model(s) involved
- The Odoo target model(s)
- The data flow direction
- The priority (MUST / SHOULD / MAY)
- A user story in the format: "As a [role], I want [feature] so that [benefit]"

---

## 3. MODULE-BY-MODULE ANALYSIS

### 3.1 Module 1 — Authentication & Multi-Tenant Management

**SRS Reference:** LOYALLIA-SRS-001 §5

**Loyallia Data Models:**
- `Tenant` — business account (name, slug, legal_name, ruc, cedula, entity_type, industry, province, city, address, phone, email, website, plan, is_active)
- `User` — tenant users (email, first_name, last_name, role: OWNER/MANAGER/STAFF)
- `TenantLocation` — physical locations (name, address, lat, lng, city)

**Odoo Integration Relevance:** HIGH

| # | Recommendation | Priority | Req ID |
|---|---------------|----------|--------|
| R-01 | Sync `Tenant` profile to Odoo `res.company` (if Odoo multi-company) or as a tagged `res.partner` with `is_company=True` | SHOULD | LYL-FR-ODOO-R-001 |
| R-02 | Sync `TenantLocation` to Odoo `res.partner` with address fields + GPS coordinates | SHOULD | LYL-FR-ODOO-R-002 |
| R-03 | Sync `User` (OWNER only) to Odoo `res.users` or `res.partner` as the primary contact | SHOULD | LYL-FR-ODOO-R-003 |

**User Story:** "As a business owner using Odoo, I want my Loyallia business profile and locations automatically visible in Odoo so that I don't have to maintain two address books."

**Data Flow:**
```
Loyallia Tenant → Odoo res.partner (is_company=True)
  name = tenant.name
  vat = tenant.ruc
  email = tenant.email
  phone = tenant.phone
  street = tenant.address
  city = tenant.city
  x_loyallia_industry = tenant.industry
  x_loyallia_plan = tenant.plan
```

---

### 3.2 Module 2 — Digital Card Engine (10 Card Types)

**SRS Reference:** LOYALLIA-SRS-001 §6

**Loyallia Data Models:**
- `Card` — loyalty program definition (name, card_type, description, colors, images, stamp_rules, cashback_rules, rewards)
- `CardType` enum — stamp, cashback, coupon, affiliate, tiered_discount, gift_certificate, vip_membership, corporate_discount, referral_pass, multipass
- `Reward` — reward definitions (name, type, value, threshold)
- `StampRule` — stamp earning rules
- `CashbackRule` — cashback percentage rules

**Odoo Integration Relevance:** MEDIUM

| # | Recommendation | Priority | Req ID |
|---|---------------|----------|--------|
| R-04 | Push `Card` (loyalty program) definitions to Odoo as `crm.lead.tag` or custom model `loyallia.program` for reference | MAY | LYL-FR-ODOO-R-004 |
| R-05 | When a new `Card` is created in Loyallia, log it as an Odoo activity for the business owner to review | MAY | LYL-FR-ODOO-R-005 |

**User Story:** "As a business owner, I want my loyalty programs visible in Odoo so that my sales team knows which programs exist and can reference them in customer interactions."

**Rationale:** Card definitions change infrequently. The value is in having a reference list in Odoo, not real-time sync. Low priority because sales teams rarely need to know program details — they need to know customer loyalty status.

---

### 3.3 Module 3 — Scanner App (Mobile iOS + Android)

**SRS Reference:** LOYALLIA-SRS-001 §7

**Loyallia Data Models:**
- `Transaction` — created when QR is scanned (see Module 8 for details)
- No scanner-specific models — the Scanner App is a stateless PWA client

**Odoo Integration Relevance:** INDIRECT

The Scanner App does not produce unique data — it creates `Transaction` records which are covered in Module 8. No direct Odoo integration needed for the scanner itself.

| # | Recommendation | Priority | Req ID |
|---|---------------|----------|--------|
| R-06 | Transactions created via Scanner should be tagged in Odoo with source "scanner" vs "remote" vs "dashboard" | SHOULD | LYL-FR-ODOO-R-006 |

**User Story:** "As a CRM manager, I want to see whether a customer's loyalty activity came from in-store scanning or remote interaction so that I can understand their engagement channel preferences."

---

### 3.4 Module 4 — Business Dashboard (Web)

**SRS Reference:** LOYALLIA-SRS-001 §8

**Loyallia Data Models:** The dashboard reads data from all other modules — it has no unique data models.

**Odoo Integration Relevance:** DISPLAY ONLY

The dashboard is a consumer of data, not a producer. However, it should display Odoo sync status.

| # | Recommendation | Priority | Req ID |
|---|---------------|----------|--------|
| R-07 | Dashboard Settings → Integrations page should show Odoo CRM connection status (connected/disabled/error) | MUST | LYL-FR-ODOO-R-007 |
| R-07.1 | Status card should show: last sync time, records synced, pending errors, and a "Sync Now" button | MUST | LYL-FR-ODOO-R-007.1 |
| R-07.2 | Dashboard should display an Odoo badge on customer profiles that are linked to Odoo contacts | SHOULD | LYL-FR-ODOO-R-007.2 |

---

### 3.5 Module 5 — Push Notification & Geo-Fencing System

**SRS Reference:** LOYALLIA-SRS-001 §9

**Loyallia Data Models:**
- `Notification` — push notification records (title, message, type, platform, status, opened_at, customer)
- `GeoPushConfig` — geo-fencing rules (location, radius, message)
- `DeviceToken` — APNs/FCM tokens per customer

**Odoo Integration Relevance:** HIGH

| # | Recommendation | Priority | Req ID |
|---|---------------|----------|--------|
| R-08 | Push notification delivery events (sent, opened, clicked) should be logged as `crm.activity` or `mail.message` on the linked Odoo `res.partner` | SHOULD | LYL-FR-ODOO-R-008 |
| R-09 | Geo-push triggers (customer entered proximity) should be logged as Odoo activities to show physical store engagement | MAY | LYL-FR-ODOO-R-009 |
| R-10 | Notification campaign results (sent_count, open_count, click_count) should update Odoo customer engagement score | MAY | LYL-FR-ODOO-R-010 |

**User Story:** "As a sales manager in Odoo, I want to see that a customer received and opened a push notification so that I know they're engaged before I call them."

**Data Flow:**
```
Loyallia Notification (status=opened) → Odoo mail.message
  body: "Push notification opened: 'Tu café gratis te espera'"
  date: notification.opened_at
  author: Loyallia System
```

---

### 3.6 Module 6 — Automation Engine

**SRS Reference:** LOYALLIA-SRS-001 §10

**Loyallia Data Models:**
- `Automation` — rule definitions (name, trigger, trigger_config, action, action_config, is_active)
- `AutomationExecution` — execution log (automation, customer, trigger_event, success, execution_context)
- Triggers: `customer_enrolled`, `transaction_completed`, `reward_earned`, `reward_ready`, `birthday_coming`, `inactive_reminder`, `milestone_reached`, `points_threshold`, `scheduled_time`
- Actions: `send_notification`, `send_email`, `send_sms`, `send_whatsapp`, `issue_reward`, `update_segment`, `send_wallet`, `trigger_webhook`

**Odoo Integration Relevance:** VERY HIGH

| # | Recommendation | Priority | Req ID |
|---|---------------|----------|--------|
| R-11 | Automation executions should be logged as Odoo `crm.activity` records on the linked customer | MUST | LYL-FR-ODOO-R-011 |
| R-12 | When the `customer_enrolled` automation trigger fires, it should create/update the Odoo `crm.lead` for that customer | MUST | LYL-FR-ODOO-R-012 |
| R-13 | When the `transaction_completed` trigger fires, it should create an Odoo `mail.message` on the partner | MUST | LYL-FR-ODOO-R-013 |
| R-14 | When the `reward_earned` or `reward_ready` trigger fires, it should update the Odoo `crm.lead` stage | SHOULD | LYL-FR-ODOO-R-014 |
| R-15 | When the `inactive_reminder` trigger fires, it should create an Odoo `crm.activity` for follow-up | SHOULD | LYL-FR-ODOO-R-015 |
| R-16 | When the `birthday_coming` trigger fires, it should create an Odoo activity reminder for the sales team | MAY | LYL-FR-ODOO-R-016 |
| R-17 | The existing `trigger_webhook` action should support Odoo-specific webhook templates (pre-configured URL, auth, payload format) | SHOULD | LYL-FR-ODOO-R-017 |

**User Story:** "As a CRM manager, I want every automated loyalty event (enrollment, transaction, reward) to appear in Odoo so that I have a complete customer engagement timeline without switching platforms."

**This is the highest-value integration point.** The Automation Engine already fires events for every significant loyalty action. Hooking Odoo sync into these existing events means zero additional code in the loyalty logic — the integration layer subscribes to the same triggers.

---

### 3.7 Module 7 — Customer Segment & Retargeting

**SRS Reference:** LOYALLIA-SRS-001 §11

**Loyallia Data Models:**
- `CustomerSegment` — segment definitions (name, filter_criteria as JSONB)
- `SegmentMembership` — customer-to-segment mapping
- Segment types: by total_spent, total_visits, last_visit, card_type, enrollment_date, referral_count, demographics

**Odoo Integration Relevance:** HIGH

| # | Recommendation | Priority | Req ID |
|---|---------------|----------|--------|
| R-18 | Sync `CustomerSegment` definitions to Odoo as `crm.lead.tag` or `res.partner.category` | SHOULD | LYL-FR-ODOO-R-018 |
| R-19 | When a customer joins/leaves a segment, update their Odoo tags | SHOULD | LYL-FR-ODOO-R-019 |
| R-20 | Loyallia segments with spending thresholds (e.g., "Top Buyers > $500") should map to Odoo customer priority levels | MAY | LYL-FR-ODOO-R-020 |

**User Story:** "As a sales manager, I want Loyallia customer segments (VIP, At-Risk, New) visible as Odoo tags so that I can filter my CRM pipeline by loyalty status and prioritize outreach."

**Data Flow:**
```
Loyallia Segment "VIP Customers" (total_spent > 500)
  → Odoo res.partner.category: "Loyallia: VIP Customers"

Customer joins segment → Odoo: partner.category_id += "Loyallia: VIP Customers"
Customer leaves segment → Odoo: partner.category_id -= "Loyallia: VIP Customers"
```

---

### 3.8 Module 8 — Analytics & KPI Reporting

**SRS Reference:** LOYALLIA-SRS-001 §12

**Loyallia Data Models:**
- `ProgramAnalytics` — per-program metrics (total_enrollments, active_customers, retention_rate, avg_transaction_value, redemption_rate)
- `CustomerAnalytics` — per-customer metrics (total_spent, total_visits, avg_ticket, lifetime_value, churn_risk_score, engagement_score, last_purchase_date)

**Odoo Integration Relevance:** HIGH

| # | Recommendation | Priority | Req ID |
|---|---------------|----------|--------|
| R-21 | Push `CustomerAnalytics` metrics to Odoo `res.partner` as custom fields (lifetime_value, churn_risk_score, engagement_score) | MUST | LYL-FR-ODOO-R-021 |
| R-22 | Push `ProgramAnalytics` summary to Odoo as a scheduled report or dashboard widget | MAY | LYL-FR-ODOO-R-022 |
| R-23 | When `churn_risk_score` exceeds a threshold (e.g., > 0.7), create an Odoo `crm.activity` for the sales team to re-engage | SHOULD | LYL-FR-ODOO-R-023 |

**User Story:** "As a business owner, I want to see each customer's lifetime value and churn risk directly in Odoo so that my sales team can prioritize high-value at-risk customers."

**Data Flow:**
```
Loyallia CustomerAnalytics → Odoo res.partner
  x_loyallia_lifetime_value = customer_analytics.lifetime_value
  x_loyallia_engagement_score = customer_analytics.engagement_score
  x_loyallia_churn_risk = customer_analytics.churn_risk_score
  x_loyallia_total_visits = customer_analytics.total_visits
  x_loyallia_avg_ticket = customer_analytics.avg_ticket
  x_loyallia_last_purchase = customer_analytics.last_purchase_date
```

---

### 3.9 Module 9 — Referral Program Engine

**SRS Reference:** LOYALLIA-SRS-001 §13

**Loyallia Data Models:**
- `Customer.referral_code` — unique referral code per customer
- `Customer.referred_by` — FK to referring customer
- Referral tracking via `CustomerPass.referral_count`

**Odoo Integration Relevance:** MEDIUM

| # | Recommendation | Priority | Req ID |
|---|---------------|----------|--------|
| R-24 | When a referral is completed (new customer enrolls via referral code), create an Odoo `mail.message` on the referrer's partner record | SHOULD | LYL-FR-ODOO-R-024 |
| R-25 | Push referral count to Odoo as `x_loyallia_referral_count` on the partner | MAY | LYL-FR-ODOO-R-025 |
| R-26 | When a customer reaches a referral milestone (e.g., 5 referrals), create an Odoo `crm.activity` for the sales team to acknowledge | MAY | LYL-FR-ODOO-R-026 |

**User Story:** "As a sales manager, I want to see which customers are active referrers in Odoo so that I can reward them personally and leverage their network."

---

### 3.10 Module 10 — Subscription & Billing Management

**SRS Reference:** LOYALLIA-SRS-001 §14

**Loyallia Data Models:**
- `SubscriptionPlan` — plan definitions (name, slug, price_monthly, price_annual, features, limits)
- `Subscription` — tenant subscriptions (plan, status, billing_cycle_start, billing_cycle_end, failed_payment_count)
- `Invoice` — billing invoices (amount, status, paid_at)
- `PaymentMethod` — payment methods

**Odoo Integration Relevance:** HIGH

| # | Recommendation | Priority | Req ID |
|---|---------------|----------|--------|
| R-27 | Sync `Subscription` status to Odoo `res.partner` as a custom field (plan name, status, next billing date) | SHOULD | LYL-FR-ODOO-R-027 |
| R-28 | When a subscription is suspended (failed payment), create an Odoo `crm.activity` for collections follow-up | SHOULD | LYL-FR-ODOO-R-028 |
| R-29 | When a tenant upgrades/downgrades their plan, update the Odoo partner's plan field and log an activity | SHOULD | LYL-FR-ODOO-R-029 |
| R-30 | Push `Invoice` records to Odoo `account.invoice` (if Odoo Accounting is installed) | MAY | LYL-FR-ODOO-R-030 |

**User Story:** "As a business owner, I want my Loyallia subscription status visible in Odoo so that my finance team can track SaaS expenses alongside other business costs."

---

### 3.11 Module 11 — Customer Wallet Experience

**SRS Reference:** LOYALLIA-SRS-001 §15

**Loyallia Data Models:**
- `CustomerPass` — the enrollment link (customer ↔ card, with pass_data JSONB, stamp_count, cashback_balance, lifecycle_state)
- `ApplePassRegistration` — device registrations for push updates
- Wallet pass generation (PKPass for Apple, JWT for Google)

**Odoo Integration Relevance:** HIGH

| # | Recommendation | Priority | Req ID |
|---|---------------|----------|--------|
| R-31 | When `CustomerPass.lifecycle_state` changes (active → reward_ready → expired → depleted), update the Odoo `crm.lead` stage | MUST | LYL-FR-ODOO-R-031 |
| R-32 | Push `CustomerPass.stamp_count` and `cashback_balance` to Odoo as custom fields on the partner | SHOULD | LYL-FR-ODOO-R-032 |
| R-33 | When a wallet pass is installed (ApplePassRegistration created), log it as an Odoo activity ("Customer installed wallet pass for {program}") | MAY | LYL-FR-ODOO-R-033 |

**User Story:** "As a CRM manager, I want to see each customer's current loyalty status (active, reward ready, expired) in Odoo so that I can trigger appropriate sales actions."

**CRM Stage Mapping:**
| Loyallia `lifecycle_state` | Odoo `crm.lead` stage | Action |
|---------------------------|----------------------|--------|
| `active` | Qualified | Customer is actively earning |
| `reward_ready` | Proposition | Reward available — encourage redemption |
| `expired` | Lost | Customer inactive — re-engagement needed |
| `depleted` | Won | Program completed — cross-sell opportunity |
| `suspended` | Lost | Account suspended — collections |

---

### 3.12 Module 12 — REST API & Integration Layer

**SRS Reference:** LOYALLIA-SRS-001 §16

This is the module that **enables** the Odoo integration. No additional Odoo-specific recommendations beyond what LOYALLIA-SRS-ODOO-CRM-001 specifies.

---

### 3.13 Module 13 — Super-Admin Panel

**SRS Reference:** LOYALLIA-SRS-001 §17

**Odoo Integration Relevance:** ADMIN ONLY

| # | Recommendation | Priority | Req ID |
|---|---------------|----------|--------|
| R-34 | SuperAdmin Settings page should show Odoo CRM as an integration card with ON/OFF toggle, connection test, and Vault credential editor | MUST | LYL-FR-ODOO-R-034 |
| R-35 | SuperAdmin should see platform-wide Odoo sync statistics (tenants connected, total records synced, error rate) | SHOULD | LYL-FR-ODOO-R-035 |
| R-36 | SuperAdmin should be able to trigger a full resync for any tenant | SHOULD | LYL-FR-ODOO-R-036 |
| R-37 | SuperAdmin should see the Odoo sync error log with tenant/date/error filters | MUST | LYL-FR-ODOO-R-037 |

---

## 4. PRIORITY MATRIX

### 4.1 MUST (v1 — Launch with Odoo Integration)

| Req ID | Feature | Module | Rationale |
|--------|---------|--------|-----------|
| R-07 | Dashboard integration status | Dashboard | Users need to see if Odoo is connected |
| R-07.1 | Sync status card with "Sync Now" | Dashboard | Operational control |
| R-11 | Automation executions → Odoo activities | Automation | Highest-value data — every loyalty event visible in CRM |
| R-12 | customer_enrolled → Odoo crm.lead | Automation | Core CRM workflow — new leads from loyalty |
| R-13 | transaction_completed → Odoo mail.message | Automation | Transaction visibility in CRM |
| R-21 | CustomerAnalytics → Odoo partner fields | Analytics | Lifetime value, churn risk — key CRM data |
| R-31 | CustomerPass lifecycle_state → Odoo stages | Wallet | Customer status drives CRM pipeline |
| R-34 | SuperAdmin integration card | SuperAdmin | Admin must configure the integration |
| R-37 | SuperAdmin sync error log | SuperAdmin | Operational visibility |

### 4.2 SHOULD (v1 — High Value)

| Req ID | Feature | Module | Rationale |
|--------|---------|--------|-----------|
| R-01 | Tenant → Odoo res.partner | Auth | Business profile sync |
| R-02 | Locations → Odoo partner addresses | Auth | Address book consistency |
| R-03 | Owner user → Odoo contact | Auth | Primary contact linkage |
| R-06 | Transaction source tagging | Scanner | Channel attribution |
| R-08 | Notification events → Odoo activities | Push | Engagement visibility |
| R-14 | reward_earned → Odoo stage update | Automation | Reward pipeline visibility |
| R-15 | inactive_reminder → Odoo follow-up | Automation | Re-engagement workflow |
| R-17 | Odoo-specific webhook template | Automation | Simplified setup |
| R-18 | Segments → Odoo tags | Segments | CRM filtering by loyalty status |
| R-19 | Segment membership changes → Odoo tags | Segments | Dynamic tag updates |
| R-23 | High churn risk → Odoo activity | Analytics | Proactive retention |
| R-24 | Referral completed → Odoo message | Referrals | Referrer visibility |
| R-27 | Subscription status → Odoo partner | Billing | Finance visibility |
| R-28 | Suspended subscription → Odoo activity | Billing | Collections workflow |
| R-29 | Plan change → Odoo activity | Billing | Upgrade tracking |
| R-32 | Pass metrics → Odoo fields | Wallet | Balance/stamp visibility |
| R-35 | Platform-wide sync stats | SuperAdmin | Admin dashboard |
| R-36 | Manual resync trigger | SuperAdmin | Operational control |
| R-07.2 | Odoo badge on linked profiles | Dashboard | Visual indicator |

### 4.3 MAY (Future Phase)

| Req ID | Feature | Module | Rationale |
|--------|---------|--------|-----------|
| R-04 | Card definitions → Odoo | Cards | Reference only, low frequency |
| R-05 | New card → Odoo activity | Cards | Nice-to-have |
| R-09 | Geo-push → Odoo activity | Push | Physical engagement data |
| R-10 | Campaign results → Odoo score | Push | Composite metric |
| R-16 | Birthday → Odoo activity | Automation | Personal touch |
| R-20 | Segment thresholds → Odoo priority | Segments | Advanced mapping |
| R-22 | Program analytics → Odoo report | Analytics | Aggregate data |
| R-25 | Referral count → Odoo field | Referrals | Minor metric |
| R-26 | Referral milestone → Odoo activity | Referrals | Gamification |
| R-30 | Invoices → Odoo Accounting | Billing | Requires Odoo Accounting module |
| R-33 | Pass installed → Odoo activity | Wallet | Installation tracking |

---

## 5. ODOO CRM MODEL MAPPING

### 5.1 Complete Field Mapping

| Loyallia Model | Loyallia Field | Odoo Model | Odoo Field | Direction | Sync Frequency |
|----------------|---------------|------------|------------|-----------|---------------|
| `Customer` | `first_name` + `last_name` | `res.partner` | `name` | Bidirectional | Real-time |
| `Customer` | `email` | `res.partner` | `email` | Bidirectional | Real-time |
| `Customer` | `phone` | `res.partner` | `phone` | Bidirectional | Real-time |
| `Customer` | `is_active` | `res.partner` | `active` | Bidirectional | Real-time |
| `Customer` | `referral_code` | `res.partner` | `ref` | Loya→Odoo | On change |
| `Customer` | `total_visits` | `res.partner` | `x_loyallia_visits` | Loya→Odoo | Batch (15min) |
| `Customer` | `total_spent` | `res.partner` | `x_loyallia_spent` | Loya→Odoo | Batch (15min) |
| `Customer` | `date_of_birth` | `res.partner` | `x_loyallia_dob` | Loya→Odoo | On create |
| `CustomerAnalytics` | `lifetime_value` | `res.partner` | `x_loyallia_ltv` | Loya→Odoo | Batch (15min) |
| `CustomerAnalytics` | `engagement_score` | `res.partner` | `x_loyallia_engagement` | Loya→Odoo | Batch (15min) |
| `CustomerAnalytics` | `churn_risk_score` | `res.partner` | `x_loyallia_churn_risk` | Loya→Odoo | Batch (15min) |
| `CustomerAnalytics` | `avg_ticket` | `res.partner` | `x_loyallia_avg_ticket` | Loya→Odoo | Batch (15min) |
| `CustomerPass` | `lifecycle_state` | `crm.lead` | `stage_id` | Loya→Odoo | Real-time |
| `CustomerPass` | `stamp_count` | `res.partner` | `x_loyallia_stamps` | Loya→Odoo | On change |
| `CustomerPass` | `cashback_balance` | `res.partner` | `x_loyallia_cashback` | Loya→Odoo | On change |
| `Segment` | `name` | `res.partner.category` | `name` | Loya→Odoo | On change |
| `SegmentMembership` | customer+segment | `res.partner` | `category_id` | Loya→Odoo | On change |
| `Subscription` | `plan` + `status` | `res.partner` | `x_loyallia_plan` | Loya→Odoo | On change |
| `Transaction` | all fields | `mail.message` | `body` (formatted) | Loya→Odoo | Async (Celery) |
| `AutomationExecution` | all fields | `crm.activity` | summary + date | Loya→Odoo | Async (Celery) |
| `Notification` | delivery status | `mail.message` | `body` (formatted) | Loya→Odoo | Async (Celery) |

### 5.2 Required Odoo Custom Fields

These custom fields must be created on `res.partner` in the tenant's Odoo instance:

| Field Name | Type | Description |
|------------|------|-------------|
| `x_loyallia_id` | Char | Loyallia Customer UUID (for reverse lookup) |
| `x_loyallia_visits` | Integer | Total visits |
| `x_loyallia_spent` | Float | Total amount spent |
| `x_loyallia_ltv` | Float | Calculated lifetime value |
| `x_loyallia_engagement` | Float | Engagement score (0-1) |
| `x_loyallia_churn_risk` | Float | Churn risk score (0-1) |
| `x_loyallia_avg_ticket` | Float | Average transaction amount |
| `x_loyallia_stamps` | Integer | Current stamp count |
| `x_loyallia_cashback` | Float | Current cashback balance |
| `x_loyallia_plan` | Char | Loyallia subscription plan name |
| `x_loyallia_dob` | Date | Date of birth |
| `x_loyallia_referrals` | Integer | Referral count |

---

## 6. RECOMMENDED INTEGRATION FEATURES

### 6.1 Feature: Loyalty Event Timeline in Odoo

**Description:** Every significant loyalty event (enrollment, transaction, reward, campaign, automation) appears as a `mail.message` or `crm.activity` on the Odoo partner record, creating a unified customer timeline.

**Trigger Points (from codebase analysis):**
| Event | Source File | Line |
|-------|------------|------|
| Customer created | `customers/services/__init__.py` | 156, 178 |
| Customer enrolled in program | `customers/services/__init__.py` | 207, 375 |
| Transaction recorded | `redemption/strategies/base.py` | 160 |
| Automation fired | `automation/engine.py` | 145-234 |
| Campaign sent | `notifications/tasks/campaigns.py` | 87 |
| Reward earned | `automation/engine.py` (reward_earned trigger) | — |
| Referral completed | `customers/services/__init__.py` (referral logic) | — |

### 6.2 Feature: Customer Analytics Sync

**Description:** Periodically push computed analytics (lifetime value, engagement score, churn risk) to Odoo so sales teams can see loyalty health without leaving their CRM.

**Implementation:** Celery Beat task runs every 15 minutes, fetches `CustomerAnalytics` for linked customers, batch-updates Odoo `res.partner` custom fields.

### 6.3 Feature: Segment-to-Tag Sync

**Description:** Loyallia customer segments (VIP, At-Risk, New, High-Value) are mirrored as Odoo `res.partner.category` tags. When a customer joins or leaves a segment, their Odoo tags update automatically.

**Implementation:** Hook into `SegmentMembership` model save/delete to trigger async Odoo tag update.

### 6.4 Feature: CRM Pipeline Stage Mapping

**Description:** The `CustomerPass.lifecycle_state` machine (active → reward_ready → expired → depleted → suspended) maps to Odoo `crm.lead` pipeline stages, giving sales teams a loyalty-driven pipeline view.

**Mapping:**
```
active        → "Qualified" (green)
reward_ready  → "Proposition" (blue)
expired       → "Lost" (red)
depleted      → "Won" (green)
suspended     → "Lost" (red)
```

### 6.5 Feature: Churn Risk Alerts

**Description:** When a customer's `churn_risk_score` exceeds 0.7 (configurable), automatically create an Odoo `crm.activity` assigned to the business owner with a re-engagement suggestion.

**Trigger:** `CustomerAnalytics.update_metrics()` calculates churn risk → if threshold exceeded → Celery task creates Odoo activity.

---

## 7. DATA FLOW SCENARIOS

### 7.1 Scenario: Customer Scans QR, Enrolls, Makes 3 Purchases, Earns Reward

```
1. Customer scans QR → Loyallia creates Customer + CustomerPass
   → Odoo: res.partner created (name, email, phone)
   → Odoo: crm.lead created (stage: "New")

2. Purchase #1 → Loyallia creates Transaction (stamp)
   → Odoo: mail.message on partner ("Sello #1 — $12.50")
   → Odoo: crm.lead stage → "Qualified"

3. Purchase #2 → Transaction
   → Odoo: mail.message ("Sello #2 — $18.00")

4. Purchase #3 → Transaction
   → Odoo: mail.message ("Sello #3 — $15.00")
   → Odoo: x_loyallia_visits = 3, x_loyallia_spent = 45.50

5. 10th stamp → Reward earned
   → Odoo: mail.message ("Recompensa lista: Café gratis")
   → Odoo: crm.lead stage → "Proposition"

6. Customer redeems reward
   → Odoo: mail.message ("Recompensa canjeada: Café gratis")
   → Odoo: crm.lead stage → "Won"
```

### 7.2 Scenario: Odoo Sales Rep Creates Contact, Customer Later Enrolls

```
1. Sales rep creates contact in Odoo: "María García, maria@empresa.com"
   → Odoo Automated Action: POST to Loyallia webhook
   → Loyallia: Customer created (from Odoo)
   → Loyallia: OdooExternalIdMapping created

2. María scans QR at store → already exists, enrolled in program
   → Odoo: res.partner updated (phone added, tag "loyallia_enrolled" added)
   → Odoo: crm.lead created for this program

3. María makes purchases → all events synced to Odoo as before
```

---

## 8. NON-INTEGRATION MODULES

The following modules do NOT require direct Odoo integration:

| Module | Reason |
|--------|--------|
| **Module 12 — REST API** | This IS the integration layer itself |
| **Module 3 — Scanner App** | Stateless PWA client; all data flows through Transactions (Module 8) |
| **Module 4 — Dashboard** | Read-only consumer; displays sync status but doesn't produce Odoo-bound data |

---

## 9. OPEN QUESTIONS

| ID | Question | Owner | Status |
|----|----------|-------|--------|
| OQ-001 | Should Odoo custom fields be created automatically by the integration, or must the Odoo admin create them manually? | Product | OPEN |
| OQ-002 | Should the integration support Odoo Community Edition (requires `base_automation` module for webhooks)? | Product | OPEN |
| OQ-003 | Should Loyallia segments map to Odoo tags (`res.partner.category`) or Odoo leads (`crm.lead.tag`)? | Product | OPEN |
| OQ-004 | What is the maximum acceptable Odoo API call volume per tenant per hour? | Engineering | OPEN |
| OQ-005 | Should the integration support Odoo multi-company (one Odoo instance, multiple companies = multiple Loyallia tenants)? | Product | OPEN |
| OQ-006 | Should analytics sync (lifetime value, churn risk) run on a fixed schedule or event-driven? | Engineering | OPEN |
| OQ-007 | Should the integration create Odoo `crm.activity` types for each loyalty event, or use a single generic type? | Product | OPEN |

---

## 10. DOCUMENT APPROVAL

> This section records formal approval. A document is NOT considered approved until all required signatures are obtained.

| Role | Name | Signature | Date | Decision |
|------|------|-----------|------|----------|
| Engineering Lead | | | | Approved / Rejected |
| Product Owner | | | | Approved / Rejected |
| Security Officer | | | | Approved / Rejected |
| QA Lead | | | | Approved / Rejected |

### Document Lifecycle

| State | Date | Actor | Notes |
|-------|------|-------|-------|
| Created | 2026-06-15 | Engineering Lead | Initial draft |
| Under Review | | | Pending approval |
| Approved | | | All signatures obtained |
| Active | | | Implementation started |
| Deprecated | | | Superseded by newer version |
| Archived | | | Moved to `docs/09-archive/` |

### Next Review Date

| Trigger | Review By |
|---------|-----------|
| Odoo integration v2 scope change | Upon trigger |
| Annual review cycle | 2027-06-15 |
| Parent SRS major version update | Within 30 days of parent update |
| New Loyallia module added | Within 30 days of module launch |

---

*End of SRS Addendum — LOYALLIA-SRS-ODOO-CRM-002 v1.0*
*Parent Document: LOYALLIA-SRS-ODOO-CRM-001 v1.0*
*Reference SRS: LOYALLIA-SRS-001 v1.0.0*
*Standard: ISO/IEC 29148:2018*
*Classification: Internal Use*
*Next: Implementation plan based on MUST priority items*
