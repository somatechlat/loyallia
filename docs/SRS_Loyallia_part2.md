
---

## 9. MODULE 5 — PUSH NOTIFICATION & GEO-FENCING SYSTEM

### 9.1 Module Purpose
Deliver targeted push notifications directly to customer lock screens via Apple APN and Google FCM. Includes geo-fencing triggers (≤100m from business location) and manual campaign tools.

### 9.2 Sub-Modules

#### 9.2.1 Manual Push Notification Campaigns

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-PUSH-001 | Dashboard SHALL allow composing a push notification with: title (max 60 chars), message (max 160 chars), optional image URL | MUST |
| LYL-FR-PUSH-002 | OWNER/MANAGER SHALL be able to target push to: ALL customers, specific card type holders, specific customer segments | MUST |
| LYL-FR-PUSH-003 | Dashboard SHALL display estimated reach count before sending | MUST |
| LYL-FR-PUSH-004 | System SHALL support scheduling push for a future date/time with timezone awareness | MUST |
| LYL-FR-PUSH-005 | System SHALL deliver push via Apple APN for iOS devices | MUST |
| LYL-FR-PUSH-006 | System SHALL deliver push via Google FCM for Android devices | MUST |
| LYL-FR-PUSH-007 | System SHALL track per-notification: sent_count, delivered_count, open_rate | MUST |
| LYL-FR-PUSH-008 | All push campaigns SHALL be unlimited for subscribed tenants | MUST |
| LYL-FR-PUSH-009 | System SHALL queue notifications via Celery; delivery SHALL complete within 5 minutes for <10,000 recipients | MUST |

#### 9.2.2 Geo-Fencing Push Notifications

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-GEO-001 | System SHALL support geo-fencing triggers: push notification appears automatically when customer is ≤100m from business location | MUST |
| LYL-FR-GEO-002 | For Apple Wallet: system SHALL embed up to 10 `locations` entries (lat/long/message) in the PKPass file | MUST |
| LYL-FR-GEO-003 | For Android: system SHALL use Firebase Geofencing API client-side to trigger push when entering 100m radius | MUST |
| LYL-FR-GEO-004 | Dashboard SHALL allow configuring the geo-push message per location | MUST |
| LYL-FR-GEO-005 | Dashboard SHALL display a map (Leaflet/OpenStreetMap) with 100m radius circle preview per location | MUST |
| LYL-FR-GEO-006 | System SHALL respect customer opt-out for location-based notifications | MUST |
| LYL-FR-GEO-007 | Geo-push SHALL NOT fire more than once per 4-hour window per customer per location to prevent spam | MUST |

#### 9.2.3 Automated Trigger Notifications

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-PUSH-020 | System SHALL automatically send push when: stamp earned, reward ready, credit balance updated | MUST |
| LYL-FR-PUSH-021 | System SHALL automatically send push when: membership expiring in 7 days, credit expiring in 7 days | MUST |
| LYL-FR-PUSH-022 | System SHALL automatically send push for win-back: customer inactive for N days (configurable, default 30 days) | SHOULD |
| LYL-FR-PUSH-023 | All automated push messages SHALL be configurable per message template | SHOULD |

---

## 10. MODULE 6 — INTELLIGENT AUTOMATION ENGINE

### 10.1 Module Purpose
Allow businesses to define behavior-based rules that trigger automated actions (reward issuance, push notifications, tier promotions) without manual intervention.

### 10.2 Automation Rule Structure

Every automation rule has:
- **Trigger**: The event that fires the rule
- **Condition**: Optional filter on the trigger data
- **Action**: The result executed when trigger + condition are met
- **Status**: Active / Paused / Archived

### 10.3 Functional Requirements

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-AUTO-001 | Dashboard SHALL provide a visual rule builder (no-code) | MUST |
| LYL-FR-AUTO-002 | Supported Triggers: new_enrollment, transaction_complete, stamp_earned, reward_redeemed, visit_count_reached, spend_threshold_reached, birthday, inactivity_period, membership_expiry | MUST |
| LYL-FR-AUTO-003 | Supported Conditions: card_type == X, visit_count >= N, total_spend >= N, days_since_last_visit >= N, customer_tier == X | MUST |
| LYL-FR-AUTO-004 | Supported Actions: issue_stamp(n), issue_credit(amount), send_push(message), issue_coupon(type), send_email(template), change_tier(tier_name) | MUST |
| LYL-FR-AUTO-005 | System SHALL evaluate rules via Celery Beat (every 15 minutes for time-based rules) | MUST |
| LYL-FR-AUTO-006 | System SHALL evaluate event-based rules in real-time upon trigger event | MUST |
| LYL-FR-AUTO-007 | System SHALL log every automation execution: rule_id, customer_id, trigger, action, timestamp, result (success/fail) | MUST |
| LYL-FR-AUTO-008 | Dashboard SHALL display automation execution history and failure rate per rule | MUST |
| LYL-FR-AUTO-009 | System SHALL prevent duplicate rule execution for same customer within cooldown period (configurable) | MUST |
| LYL-FR-AUTO-010 | OWNER/MANAGER SHALL be able to enable, disable, or pause any rule at any time | MUST |

#### 10.4 Pre-built Automation Templates

| Template | Trigger | Action |
|----------|---------|--------|
| Win-Back | inactivity_period >= 30 days | send_push("We miss you! Here is a bonus stamp") |
| Birthday Reward | birthday == today | issue_stamp(2) + send_push |
| Loyal Customer Milestone | visit_count == 50 | change_tier("Gold") + send_push |
| Big Spender | total_spend >= $500 | issue_coupon("VIP20") |
| Stamp Rush | stamp_earned, visits_in_week >= 3 | issue_stamp(1) bonus |

---

## 11. MODULE 7 — CUSTOMER SEGMENTATION & RETARGETING

### 11.1 Module Purpose
Allow businesses to group customers by behavioral and demographic criteria for targeted campaigns and personalized communications.

### 11.2 Functional Requirements

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-SEG-001 | Dashboard SHALL allow creation of named customer segments | MUST |
| LYL-FR-SEG-002 | Segment criteria SHALL support: card_type, visit_count range, total_spend range, last_visit date range, tier, enrollment_date range, location | MUST |
| LYL-FR-SEG-003 | Segments SHALL be dynamic (auto-updated as customers meet/exit criteria) | MUST |
| LYL-FR-SEG-004 | Dashboard SHALL display segment size in real time upon criteria selection | MUST |
| LYL-FR-SEG-005 | Segments SHALL be selectable as targets for push notification campaigns | MUST |
| LYL-FR-SEG-006 | Segments SHALL be selectable as targets for manual reward issuance | MUST |
| LYL-FR-SEG-007 | Segments SHALL be selectable as targets for automation rules | MUST |
| LYL-FR-SEG-008 | Dashboard SHALL allow export of any segment as CSV | MUST |
| LYL-FR-SEG-009 | System SHALL provide pre-built segments: All Customers, Active (visited in 30 days), At-Risk (31-60 days inactive), Lost (>60 days inactive), VIP (top 10% by spend) | SHOULD |

---

## 12. MODULE 8 — ANALYTICS & KPI REPORTING

### 12.1 Module Purpose
Provide real-time and historical insights into program performance, customer behavior, and ROI metrics.

### 12.2 Functional Requirements

#### 12.2.1 Overview Dashboard

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-ANA-001 | Dashboard SHALL display: total enrolled customers, active customers (last 30 days), new enrollments (this period), total transactions | MUST |
| LYL-FR-ANA-002 | Dashboard SHALL display: retention rate %, churn rate %, average visit frequency | MUST |
| LYL-FR-ANA-003 | All metrics SHALL support time-range filter: today, 7d, 30d, 90d, custom range | MUST |
| LYL-FR-ANA-004 | Dashboard SHALL display metrics per loyalty program (breakdowns) | MUST |

#### 12.2.2 Transaction Analytics

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-ANA-010 | System SHALL provide full transaction history: date, customer, card type, action, staff, location, amount | MUST |
| LYL-FR-ANA-011 | Transaction log SHALL be filterable by: date range, card type, location, staff, action type | MUST |
| LYL-FR-ANA-012 | Dashboard SHALL display daily/weekly/monthly transaction volume chart | MUST |
| LYL-FR-ANA-013 | Dashboard SHALL identify peak transaction hours per location | SHOULD |

#### 12.2.3 ROI Metrics

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-ANA-020 | Dashboard SHALL display estimated ROI: total cashback/discounts issued vs. revenue generated | SHOULD |
| LYL-FR-ANA-021 | Dashboard SHALL display redemption rate per card type (issued rewards vs. redeemed) | MUST |
| LYL-FR-ANA-022 | Dashboard SHALL display push notification open rate and CTR per campaign | MUST |
| LYL-FR-ANA-023 | Dashboard SHALL display automation rule effectiveness (executions vs. desired actions taken) | SHOULD |

#### 12.2.4 Customer Demographics

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-ANA-030 | Dashboard SHALL display customer demographics: age distribution (if collected), gender, top enrollment locations | SHOULD |
| LYL-FR-ANA-031 | Dashboard SHALL identify top 10 most loyal customers by visit count and total spend | MUST |
| LYL-FR-ANA-032 | Dashboard SHALL display new vs. returning customer ratio per period | MUST |

#### 12.2.5 Export

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-ANA-040 | All analytics data SHALL be exportable as CSV | MUST |
| LYL-FR-ANA-041 | Transaction history SHALL be exportable as CSV or PDF | MUST |

---

## 13. MODULE 9 — REFERRAL PROGRAM ENGINE

### 13.1 Module Purpose
Enable viral customer acquisition by allowing enrolled customers to refer new customers. Both referrer and referee receive configurable rewards upon successful enrollment.

### 13.2 Functional Requirements

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-REF-001 | System SHALL generate a unique, shareable referral link/code per enrolled customer per program | MUST |
| LYL-FR-REF-002 | Referral link SHALL redirect to enrollment page with pre-filled referrer attribution | MUST |
| LYL-FR-REF-003 | Pass SHALL display current referral link and referral count | MUST |
| LYL-FR-REF-004 | Dashboard SHALL allow configuring: referrer_reward_type, referrer_reward_value, referee_reward_type, referee_reward_value, max_referrals_per_customer | MUST |
| LYL-FR-REF-005 | System SHALL validate referral: new customer email must not already exist in system | MUST |
| LYL-FR-REF-006 | Referrer reward SHALL be issued automatically after referee completes enrollment | MUST |
| LYL-FR-REF-007 | Referee reward SHALL be included in their new pass upon enrollment | MUST |
| LYL-FR-REF-008 | System SHALL detect self-referral (same email/device) and reject with error | MUST |
| LYL-FR-REF-009 | Dashboard SHALL display referral analytics: total referrals, conversion rate, top referrers | MUST |

---

## 14. MODULE 10 — SUBSCRIPTION & BILLING MANAGEMENT

### 14.1 Module Purpose
Manage tenant subscription lifecycle: free trial, plan selection, payment, invoicing, and cancellation.

### 14.2 Subscription Plans

| Plan | Price | Features |
|------|-------|----------|
| TRIAL | Free (5 days) | All FULL features — no credit card |
| FULL | $75/month + IVA | 10 card types, geo-location, manager accounts, unlimited customers/messages/stamps/rewards/transactions |
| ADDITIONAL_POS | $10/month per location | Extra scanner location |

*Note: Loyallia-branded pricing may differ; the engine (Devotio) uses $75/month.*

### 14.3 Functional Requirements

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-BILL-001 | System SHALL automatically activate 5-day free trial upon tenant registration | MUST |
| LYL-FR-BILL-002 | Trial SHALL include ALL FULL plan features with no credit card required | MUST |
| LYL-FR-BILL-003 | System SHALL notify tenant at: 7 days, 3 days, 1 day before trial expiry | MUST |
| LYL-FR-BILL-004 | Upon trial expiry without subscription: tenant account SHALL be suspended (read-only mode) | MUST |
| LYL-FR-BILL-005 | System SHALL integrate with Bendo/PlacetoPay API for credit card payment processing | MUST |
| LYL-FR-BILL-006 | System SHALL apply correct IVA rate per country (15% for Ecuador) | MUST |
| LYL-FR-BILL-007 | System SHALL issue invoice PDF per billing cycle | MUST |
| LYL-FR-BILL-008 | System SHALL allow tenant to cancel subscription at any time; access continues until period end | MUST |
| LYL-FR-BILL-009 | System SHALL retry failed payment up to 3 times over 7 days before suspending account | MUST |
| LYL-FR-BILL-010 | Dashboard SHALL display: current plan, next billing date, payment history, invoices | MUST |
| LYL-FR-BILL-011 | Tenant SHALL be able to add additional POS locations at $10/month each | MUST |
| LYL-FR-BILL-012 | System SHALL support annual billing with discount (to be configured by Super Admin) | SHOULD |

---

## 15. MODULE 11 — CUSTOMER WALLET EXPERIENCE

### 15.1 Module Purpose
Define the end-to-end customer-facing flow: from QR discovery to wallet pass. This module has zero UI of its own — it operates through Apple/Google Wallet native interfaces.

### 15.2 Enrollment Flow

| Step | Description |
|------|-------------|
| 1 | Customer scans in-store QR code with phone camera |
| 2 | QR deep-links to enrollment web page (mobile-optimized) |
| 3 | Customer fills form: First Name, Last Name, Email, Phone (optional) |
| 4 | Customer accepts Terms & Conditions and Privacy Policy |
| 5 | System generates pass (PKPass or Google JWT) within 5 seconds |
| 6 | Customer is redirected to pass download page |
| 7 | Customer taps "Add to Wallet" — pass saved to native wallet |
| 8 | Customer immediately receives a welcome push notification |

### 15.3 Functional Requirements

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-WALL-001 | Enrollment page SHALL be mobile-responsive and load within 2 seconds | MUST |
| LYL-FR-WALL-002 | System SHALL auto-detect device type (iOS / Android) and serve appropriate pass | MUST |
| LYL-FR-WALL-003 | Enrollment SHALL complete within 60 seconds total (form + pass generation + download) | MUST |
| LYL-FR-WALL-004 | Pass SHALL update in customer Wallet in real time via APNs / FCM Push (not requiring action) | MUST |
| LYL-FR-WALL-005 | Enrollment page SHALL display business logo, colors, and program description | MUST |
| LYL-FR-WALL-006 | System SHALL prevent duplicate enrollment (same email + same program) | MUST |
| LYL-FR-WALL-007 | If customer re-scans QR and is already enrolled, system SHALL offer "Re-send Pass to Wallet" option | MUST |
| LYL-FR-WALL-008 | Customer SHALL be able to opt-out of push notifications from pass settings (Wallet native) | MUST |
| LYL-FR-WALL-009 | System SHALL collect device_push_token during enrollment for future push delivery | MUST |
| LYL-FR-WALL-010 | Pass backside (Apple) and details (Google) SHALL display: business contact, website, terms link | SHOULD |

---

## 16. MODULE 12 — REST API & INTEGRATION LAYER

### 16.1 Module Purpose
Provide a documented, versioned REST API for third-party integrations (POS systems, e-commerce platforms, CRMs).

### 16.2 Functional Requirements

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-API-001 | All API endpoints SHALL be implemented with Django Ninja | MUST |
| LYL-FR-API-002 | API SHALL use versioning: `/api/v1/` prefix | MUST |
| LYL-FR-API-003 | API SHALL use JWT Bearer token authentication | MUST |
| LYL-FR-API-004 | API SHALL provide API keys per tenant for machine-to-machine integration | MUST |
| LYL-FR-API-005 | API response format SHALL be JSON with consistent envelope: `{success, data, error, meta}` | MUST |
| LYL-FR-API-006 | API SHALL support webhook delivery for events: enrollment, transaction, reward_issued | SHOULD |
| LYL-FR-API-007 | API documentation SHALL be auto-generated via Django Ninja OpenAPI (Swagger UI) | MUST |
| LYL-FR-API-008 | API SHALL enforce rate limiting: 1000 req/min per tenant API key | MUST |

### 16.3 Core API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/customers/` | GET | List tenant customers |
| `/api/v1/customers/{id}/` | GET | Customer detail |
| `/api/v1/customers/enroll/` | POST | Enroll customer to a program |
| `/api/v1/cards/` | GET | List loyalty programs |
| `/api/v1/transactions/` | POST | Record a transaction (stamp, cashback, etc.) |
| `/api/v1/transactions/` | GET | List transactions (filterable) |
| `/api/v1/passes/{id}/update/` | POST | Trigger pass update delivery to wallet |
| `/api/v1/passes/{id}/validate/` | POST | Validate a QR code (Scanner App) |
| `/api/v1/notifications/send/` | POST | Send push notification |
| `/api/v1/webhooks/` | GET/POST | Manage webhook subscriptions |

---

## 17. MODULE 13 — SUPER-ADMIN PANEL

### 17.1 Module Purpose
Platform-wide management interface accessible only to Loyallia operations team (SUPER_ADMIN role).

### 17.2 Functional Requirements

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-SADM-001 | Super Admin SHALL authenticate via separate login URL with MFA enforced | MUST |
| LYL-FR-SADM-002 | Super Admin panel SHALL list all tenants with: name, plan, status, trial end date, monthly revenue | MUST |
| LYL-FR-SADM-003 | Super Admin SHALL be able to suspend, reactivate, or delete any tenant | MUST |
| LYL-FR-SADM-004 | Super Admin SHALL be able to extend trial period for any tenant | MUST |
| LYL-FR-SADM-005 | Super Admin SHALL view platform-wide metrics: total tenants, MRR, total passes issued, total push sent | MUST |
| LYL-FR-SADM-006 | Super Admin SHALL be able to impersonate any tenant for support (with audit log) | SHOULD |
| LYL-FR-SADM-007 | Super Admin panel SHALL display system health: API response times, queue depth, error rate | MUST |
| LYL-FR-SADM-008 | Super Admin SHALL be able to broadcast a system notification to all tenants | SHOULD |
| LYL-FR-SADM-009 | All Super Admin actions SHALL be logged in an immutable audit log | MUST |

---

## 18. NON-FUNCTIONAL REQUIREMENTS

### 18.1 Performance

| Req ID | Requirement | Target |
|--------|-------------|--------|
| LYL-NFR-001 | API response time (P95) | ≤300ms for GET endpoints |
| LYL-NFR-002 | API response time (P95) | ≤500ms for POST endpoints |
| LYL-NFR-003 | Pass generation time | ≤5 seconds from enrollment submit |
| LYL-NFR-004 | QR scan-to-validation time (online) | ≤2 seconds |
| LYL-NFR-005 | Push notification delivery | ≤5 minutes for batches <10,000 |
| LYL-NFR-006 | Dashboard initial page load | ≤2 seconds (LCP) |
| LYL-NFR-007 | Pass wallet update propagation | ≤30 seconds |
| LYL-NFR-008 | System throughput | 500 concurrent active users per tenant cluster |

### 18.2 Reliability & Availability

| Req ID | Requirement | Target |
|--------|-------------|--------|
| LYL-NFR-010 | Platform availability | 99.9% uptime (≤8.76 hours downtime/year) |
| LYL-NFR-011 | Planned maintenance window | Off-peak hours only; 24h notice to tenants |
| LYL-NFR-012 | Database recovery point objective | RPO ≤ 1 hour (daily backups + WAL streaming) |
| LYL-NFR-013 | Recovery time objective | RTO ≤ 4 hours |
| LYL-NFR-014 | Celery task failure retry | 3 automatic retries with exponential backoff |

### 18.3 Scalability

| Req ID | Requirement |
|--------|-------------|
| LYL-NFR-020 | System SHALL scale horizontally: add Django API workers without code changes |
| LYL-NFR-021 | System SHALL support ≥10,000 registered tenants |
| LYL-NFR-022 | System SHALL support ≥5,000,000 total customer pass records |
| LYL-NFR-023 | PostgreSQL SHALL use connection pooling (PgBouncer) at 100+ concurrent connections |

### 18.4 Usability

| Req ID | Requirement |
|--------|-------------|
| LYL-NFR-030 | Scanner App SHALL require ≤5 minutes to learn for new staff |
| LYL-NFR-031 | Customer enrollment SHALL complete in ≤60 seconds |
| LYL-NFR-032 | Dashboard setup for first loyalty program SHALL complete in ≤15 minutes |
| LYL-NFR-033 | All user-facing errors SHALL display actionable messages (no raw error codes exposed) |

### 18.5 Maintainability

| Req ID | Requirement |
|--------|-------------|
| LYL-NFR-040 | All backend code SHALL follow PEP-8, Django conventions, and project Vibe Coding Rules |
| LYL-NFR-041 | Test coverage SHALL be ≥80% for all critical paths (authentication, card engine, transactions) |
| LYL-NFR-042 | All deployments SHALL use Docker Compose (development/staging) |
| LYL-NFR-043 | API documentation SHALL be automatically generated and always current |

---

## 19. SECURITY REQUIREMENTS

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-SEC-001 | All data in transit SHALL use TLS 1.2 minimum (HTTPS enforced by Nginx) | MUST |
| LYL-SEC-002 | All passwords SHALL be hashed using Argon2 (Django default) | MUST |
| LYL-SEC-003 | JWT tokens SHALL be signed with RS256 (asymmetric keys) | MUST |
| LYL-SEC-004 | All QR code tokens in passes SHALL be HMAC-signed to prevent forgery | MUST |
| LYL-SEC-005 | All tenant data access SHALL be filtered through `tenant_id` at ORM level | MUST |
| LYL-SEC-006 | SQL injection: Django ORM parameterized queries enforced; raw SQL prohibited without review | MUST |
| LYL-SEC-007 | XSS: all user inputs sanitized; CSP headers enforced in Nginx | MUST |
| LYL-SEC-008 | CSRF: Django CSRF middleware enabled for all web forms | MUST |
| LYL-SEC-009 | Rate limiting: Django Ninja throttling on all endpoints | MUST |
| LYL-SEC-010 | PII (customer name, email, phone) SHALL be encrypted at rest using PostgreSQL column encryption | SHOULD |
| LYL-SEC-011 | Super Admin impersonation SHALL be logged in immutable audit log with justification | MUST |
| LYL-SEC-012 | API keys SHALL be hashed in database; shown to user only once at generation | MUST |
| LYL-SEC-013 | Apple PKPass SHALL be signed with valid Apple certificate; invalid signatures rejected | MUST |
| LYL-SEC-014 | LOPDP compliance: customer consent captured at enrollment; right-to-delete implemented | MUST |
| LYL-SEC-015 | Backup files SHALL be encrypted at rest in MinIO | MUST |

---

## 20. DATA REQUIREMENTS

### 20.1 Core Entity Model

| Entity | Key Fields |
|--------|-----------|
| Tenant | id, name, slug, owner_id, plan, trial_end, is_active, gateway_customer_id, timezone, country |
| User | id, tenant_id, email, password_hash, role (OWNER/MANAGER/STAFF), is_active, last_login |
| Location | id, tenant_id, name, address, lat, long, is_active |
| LoyaltyProgram | id, tenant_id, card_type, name, config (JSONB), is_active, logo_url, colors |
| Customer | id, tenant_id, first_name, last_name, email, phone, device_token_ios, device_token_android, join_date, is_active |
| Pass | id, customer_id, program_id, serial_number, balance_data (JSONB), status, issued_at, updated_at |
| Transaction | id, tenant_id, pass_id, customer_id, staff_id, location_id, type, amount, metadata (JSONB), created_at |
| PushCampaign | id, tenant_id, title, message, target_segment, status, scheduled_at, sent_count, open_count |
| AutomationRule | id, tenant_id, name, trigger, conditions (JSONB), actions (JSONB), is_active, execution_count |
| Subscription | id, tenant_id, plan, gateway_subscription_id, status, billing_cycle_start, billing_cycle_end |
| AuditLog | id, actor_id, tenant_id, action, target_type, target_id, metadata (JSONB), created_at |

### 20.2 Data Retention Policy

| Data Type | Retention Period |
|-----------|-----------------|
| Active customer data | Duration of customer enrollment |
| Transaction logs | 5 years (fiscal compliance) |
| Deleted customer data | Purged within 30 days of right-to-delete request |
| Push campaign data | 2 years |
| Audit logs | 7 years |
| Database backups | 30 days rolling |

---

## 21. CONSTRAINTS & ASSUMPTIONS

### 21.1 Technical Constraints

1. Apple Wallet geo-fencing supports maximum **10 locations per pass**. Tenants with >10 locations must use Android geo-fencing supplementary approach.
2. Apple APN requires a valid Apple Developer Program membership and PassKit certificate.
3. Google Wallet API requires a Google Cloud project with Wallet API enabled.
4. PKPass files must be re-signed upon any pass field update.
5. Bendo/PlacetoPay is the payment gateway; pluggable architecture supports future alternatives.
6. All open-source components must have permissive licenses (MIT, Apache 2.0, BSD).

### 21.2 Business Constraints

1. The platform must support unlimited customers, stamps, rewards, and transactions for subscribed tenants at the quoted plan pricing.
2. The free trial must be fully functional with no feature restrictions.
3. The setup wizard must enable a new loyalty program to go live in ≤15 minutes.

### 21.3 Assumptions

1. Businesses have reliable internet for dashboard and scanner operations.
2. Customers have iOS 15+ or Android 10+ with Apple/Google Wallet installed.
3. All push notification device tokens are collected upon pass installation.
4. Bendo/PlacetoPay is available in the target market (Ecuador/LATAM); pluggable gateway architecture supports alternatives.
5. Email delivery depends on a configured SMTP provider (e.g., SendGrid, Mailjet).

---

## 22. VERIFICATION & ACCEPTANCE CRITERIA

### 22.1 Acceptance Tests per Module

| Module | Test ID | Acceptance Criterion |
|--------|---------|---------------------|
| AUTH | ACC-001 | Register tenant → verify email → login → receive JWT ≤ 5 seconds total |
| AUTH | ACC-002 | 5 failed logins → account locked for 15 minutes |
| CARD | ACC-003 | Create Stamp card → generate QR → customer enrolls → pass appears in Apple Wallet ≤ 60 seconds |
| CARD | ACC-004 | Staff scan → stamp added → pass updates in Wallet ≤ 30 seconds |
| CARD | ACC-005 | All 10 card types create, enroll, and validate without error |
| SCAN | ACC-006 | Scanner App validates QR in ≤2 seconds on mid-range Android device |
| SCAN | ACC-007 | Scanner App queues transaction offline and syncs on reconnect |
| PUSH | ACC-008 | Manual push campaign to 1000 customers delivered ≤ 5 minutes |
| GEO | ACC-009 | Apple Wallet geo-push appears when test device enters 100m radius of configured location |
| AUTO | ACC-010 | Win-back rule triggers push for customer inactive 30 days |
| ANA | ACC-011 | Transaction history displays correct data matching Scanner App entries |
| BILL | ACC-012 | 5-day trial activates on registration; account suspends on day 6 without subscription |
| API | ACC-013 | All documented endpoints return correct responses per OpenAPI spec |
| SEC | ACC-014 | Cross-tenant data access attempt returns 403 Forbidden |
| WALL | ACC-015 | Customer enrollment flow completes in ≤60 seconds end-to-end |

### 22.2 Performance Benchmarks (Load Tests)

| Scenario | Tool | Target |
|----------|------|--------|
| 500 concurrent API requests | k6 | P95 ≤ 300ms |
| 10,000 push notifications | Celery benchmark | All delivered ≤ 5 minutes |
| 100 simultaneous QR enrollments | k6 | All passes generated ≤ 5 seconds each |
| Dashboard cold load | Lighthouse | LCP ≤ 2 seconds |

---

*End of SRS Document — LOYALLIA-SRS-001 v1.0.0*  
*Next Document: LOYALLIA-ARCH-001 — Architecture, Sequence & Flowchart Diagrams*
