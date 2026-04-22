# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
## Loyallia — Intelligent Digital Loyalty Platform
**Document ID:** LOYALLIA-SRS-001  
**Version:** 1.0.0  
**Status:** APPROVED FOR DEVELOPMENT  
**Date:** 2026-04-05  
**Standard:** ISO/IEC 29148:2018 — Requirements Engineering  
**Engine:** Devotio Rewards  

---

## DOCUMENT CONTROL

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-04-05 | Engineering Team | Initial SRS from product brief + Devotio Rewards website |

---

## TABLE OF CONTENTS

1. Introduction  
2. Overall Description  
3. Stakeholders & User Classes  
4. System Architecture Overview  
5. Module 1 — Authentication & Multi-Tenant Management  
6. Module 2 — Digital Card Engine (10 Card Types)  
7. Module 3 — Scanner App (Mobile iOS + Android)  
8. Module 4 — Business Dashboard (Web)  
9. Module 5 — Push Notification & Geo-Fencing System  
10. Module 6 — Intelligent Automation Engine  
11. Module 7 — Customer Segment & Retargeting  
12. Module 8 — Analytics & KPI Reporting  
13. Module 9 — Referral Program Engine  
14. Module 10 — Subscription & Billing Management  
15. Module 11 — Customer Wallet Experience  
16. Module 12 — REST API & Integration Layer  
17. Module 13 — Super-Admin Panel  
18. Non-Functional Requirements  
19. Security Requirements  
20. Data Requirements  
21. Constraints & Assumptions  
22. Verification & Acceptance Criteria  

---

## 1. INTRODUCTION

### 1.1 Purpose
This SRS defines the complete functional, non-functional, security, and integration requirements for **Loyallia** — an intelligent digital loyalty SaaS platform. This document is the authoritative reference for all design, development, QA, and DevOps activities.

### 1.2 Scope

**System Name:** Loyallia  
**Tagline:** Plataforma inteligente de fidelización digital.  
**Underlying Engine:** Devotio Rewards  
**Market Claim:** Aumenta un 30% las ventas y duplica la tasa de retorno de clientes.

Loyallia enables businesses to create, deploy, and manage digital loyalty programs delivered natively through Apple Wallet and Google Wallet — requiring **zero customer app installation**. The platform is composed of:

1. **Backend Platform API** — Django 5 + Django Ninja (multi-tenant REST API)  
2. **Business Dashboard** — Next.js web application for owners and managers  
3. **Scanner App** — React Native mobile app (iOS 15+ / Android 10+) for in-store staff  
4. **Customer Wallet Layer** — PKPass (Apple) + JWT Pass (Google) delivery  

### 1.3 Definitions, Acronyms & Abbreviations

| Term | Definition |
|------|-----------|
| Tenant | A registered business account on Loyallia |
| Pass | A digital loyalty card stored natively in Apple/Google Wallet |
| PKPass | Apple Wallet pass file format (.pkpass) |
| APN | Apple Push Notification service |
| FCM | Firebase Cloud Messaging |
| POS | Point of Sale |
| QR | Quick Response code |
| Geo-push | Push notification triggered by customer proximity (≤100m) |
| LOPDP | Ley Orgánica de Protección de Datos Personales (Ecuador) |
| IVA | Impuesto al Valor Agregado |
| OTP | One-Time Password |
| CRON | Scheduled background job (Celery Beat) |
| MFA | Multi-Factor Authentication |
| KPI | Key Performance Indicator |
| ROI | Return on Investment |
| SaaS | Software as a Service |

### 1.4 References

| Reference | URL / Standard |
|-----------|----------------|
| ISO/IEC 29148:2018 | Requirements Engineering standard |
| Apple PassKit Developer Docs | https://developer.apple.com/wallet/ |
| Google Wallet API | https://developers.google.com/wallet |
| Devotio Rewards Platform | https://devotiorewards.com |
| LOPDP Ecuador 2021 | National personal data protection law |
| PCI-DSS v4.0 | Payment industry security standard |
| RFC 7519 | JSON Web Token |
| RFC 6749 | OAuth 2.0 |

### 1.5 Overview
Sections 5–17 describe each module with requirements numbered `LYL-FR-<MOD>-<NNN>`. Section 18 covers non-functional requirements (`LYL-NFR-<NNN>`). Sections 19–22 cover data, constraints, and verification.

---

## 2. OVERALL DESCRIPTION

### 2.1 Product Perspective
Loyallia is a standalone, cloud-native, multi-tenant SaaS platform. It integrates with Apple Wallet and Google Wallet via their respective native APIs, and communicates with customers through device-level push notifications without requiring a custom app install.

### 2.2 Product Functions (High-Level)

| ID | Function |
|----|----------|
| F-01 | Multi-tenant business onboarding with 14-day free trial |
| F-02 | 10-type digital loyalty card creation with full branding customization |
| F-03 | Customer self-enrollment via QR code (scan → form → Wallet in <60 seconds) |
| F-04 | Real-time digital pass issuance to Apple Wallet / Google Wallet |
| F-05 | In-store transaction validation via Scanner App (scan pass QR / NFC) |
| F-06 | Remote stamp/reward issuance via Dashboard or Scanner App web view |
| F-07 | Geo-fencing push notifications (triggered at ≤100m from business location) |
| F-08 | Manual targeted push notification campaigns |
| F-09 | Behavior-based automation rules engine |
| F-10 | Customer segmentation and retargeting tools |
| F-11 | Real-time analytics dashboard (retention, ROI, demographics, transaction history) |
| F-12 | Referral program tracking and automated reward distribution |
| F-13 | Subscription billing management (per tenant, SaaS model) |
| F-14 | Multi-user per tenant (Owner + Manager accounts) |
| F-15 | REST API for third-party POS and e-commerce integrations |
| F-16 | Super-Admin panel for platform-wide management |

### 2.3 System Constraints Summary

- No customer app install required — passes live in native Wallet apps only
- All tenant data is strictly isolated at the database/ORM level
- Push notification delivery uses only Apple APN and Google FCM
- Geo-fencing uses pass-native location fields (Apple Wallet `locations` array < 10 locations) and supplementary server-side mobile SDK for Android
- Customer PII must comply with LOPDP (Ecuador)
- Subscription billing must handle IVA correctly for Ecuador market

### 2.4 Operating Environment

| Component | Technology |
|-----------|-----------|
| Backend API | Django 5.x + Django Ninja |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Task Queue | Celery 5 + Celery Beat |
| Dashboard Frontend | Next.js 14 (React 18) |
| Mobile Scanner App | React Native 0.73 |
| Pass Signing | Python `passlib` / `wallet` library |
| Push (iOS) | Apple APN via `aioapns` or `httpx` HTTP/2 |
| Push (Android) | Firebase Admin SDK |
| File Storage | MinIO (self-hosted S3-compatible) |
| Reverse Proxy | Nginx |
| Container Orchestration | Docker Compose (dev/staging) |
| Email | SMTP via configured provider |
| Maps / Geo | OpenStreetMap + Leaflet (dashboard) |

---

## 3. STAKEHOLDERS & USER CLASSES

### 3.1 Stakeholder Registry

| ID | Stakeholder | Role | Primary Interest |
|----|-------------|------|-----------------|
| STK-01 | Loyallia Platform Owner | Product Owner | MRR growth, platform health |
| STK-02 | Business Owner (Tenant) | Primary Paying Customer | Customer retention, revenue increase |
| STK-03 | Business Manager | Operational User | Campaign results, customer data |
| STK-04 | In-Store Staff / Cashier | Scanner App User | Fast, reliable pass scanning |
| STK-05 | End Customer | Beneficiary | Seamless rewards, no app install |
| STK-06 | System Integrators | API Consumer | Stable API, documentation |
| STK-07 | Regulatory Bodies | Compliance | LOPDP, SRI/IVA compliance |

### 3.2 User Personas

**Persona A — Business Owner "Carlos" (Café chain, 3 locations)**
- Goal: Automate customer retention, understand spending patterns
- Pain: Paper cards lost; zero data about customers
- Success: Sees 30% ARPU increase after 90 days on platform

**Persona B — Cashier "Daniela" (In-store staff)**
- Goal: Scan customer wallets in <2 seconds without training
- Pain: Complex apps slow the queue
- Success: Open Scanner App, scan QR, green checkmark. Done.

**Persona C — Customer "Andrés" (28 years old, mobile-native)**
- Goal: Earn rewards without friction
- Pain: "Another app to download"
- Success: Scans QR from poster → fills name/email → card appears in Wallet. No download.

---

## 4. SYSTEM ARCHITECTURE OVERVIEW

### 4.1 Architectural Pattern
Multi-tenant SaaS with strict per-tenant data isolation (`tenant_id` FK on all business data models). Three deployment tiers: API (Django), Dashboard (Next.js), Scanner App (React Native).

### 4.2 Technology Stack Decisions

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| API Framework | Django 5 + Django Ninja | Project mandate; mature ORM; fastest Django REST layer |
| ORM | Django ORM | Project mandate; no SQLAlchemy |
| Mobile | React Native | Single codebase for iOS + Android |
| Dashboard | Next.js 14 | SSR for fast load; React ecosystem |
| Database | PostgreSQL 16 | ACID; JSONB for pass metadata |
| Cache/Queue | Redis 7 + Celery 5 | Async pass generation, push delivery, geo-push jobs |
| Pass Files | Python wallet library | PKPass signing; Google JWT signing |
| File Storage | MinIO (S3-compatible) | Self-hosted; open source |
| Reverse Proxy | Nginx | SSL termination, routing |
| Container | Docker + Docker Compose | Full local + staging orchestration |

### 4.3 Port Authority

| Service | Internal Port | External Port |
|---------|--------------|---------------|
| Django API | 8000 | 8000 |
| Next.js Dashboard | 3000 | 3000 |
| PostgreSQL | 5432 | 5432 (internal only) |
| Redis | 6379 | 6379 (internal only) |
| MinIO | 9000 / 9001 | 9000 / 9001 |
| Nginx | 80 / 443 | 80 / 443 |
| Flower (Celery monitor) | 5555 | 5555 |

---

## 5. MODULE 1 — AUTHENTICATION & MULTI-TENANT MANAGEMENT

### 5.1 Module Purpose
Manage tenant onboarding, user authentication, role-based access control, and tenant configuration. This is the security and identity foundation of the entire platform.

### 5.2 Sub-Modules

#### 5.2.1 Tenant Registration & Onboarding

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-AUTH-001 | System SHALL allow a new business to register with: business name, email, phone, password, country | MUST |
| LYL-FR-AUTH-002 | Upon registration, system SHALL automatically start a 14-day free trial with FULL feature access | MUST |
| LYL-FR-AUTH-003 | No credit card SHALL be required at registration | MUST |
| LYL-FR-AUTH-004 | System SHALL send a verification email to confirm the business email address via OTP link | MUST |
| LYL-FR-AUTH-005 | System SHALL automatically create a default tenant workspace, isolating all data | MUST |
| LYL-FR-AUTH-006 | System SHALL display a setup wizard on first login: (1) Choose card type, (2) Business location, (3) Branding upload | SHOULD |
| LYL-FR-AUTH-007 | System SHALL complete initial configuration in under 1 minute as claimed ("configuración en un minuto") | MUST |

#### 5.2.2 Authentication

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-AUTH-010 | System SHALL authenticate users via email + password | MUST |
| LYL-FR-AUTH-011 | System SHALL issue JWT access token (15-min expiry) and refresh token (30-day expiry) | MUST |
| LYL-FR-AUTH-012 | System SHALL support optional MFA via TOTP (Google Authenticator compatible) | SHOULD |
| LYL-FR-AUTH-013 | System SHALL implement rate limiting: 5 failed login attempts → 15-minute lockout | MUST |
| LYL-FR-AUTH-014 | System SHALL provide password reset via email OTP link (valid 30 minutes) | MUST |
| LYL-FR-AUTH-015 | Scanner App SHALL authenticate staff via email/password and receive a long-lived device token (90-day) | MUST |

#### 5.2.3 Role-Based Access Control (RBAC)

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-AUTH-020 | System SHALL support the following roles per tenant: OWNER, MANAGER, STAFF | MUST |
| LYL-FR-AUTH-021 | OWNER: full access to all modules including billing and settings | MUST |
| LYL-FR-AUTH-022 | MANAGER: access to campaigns, analytics, customers — NO billing access | MUST |
| LYL-FR-AUTH-023 | STAFF: Scanner App access only — cannot access dashboard | MUST |
| LYL-FR-AUTH-024 | OWNER SHALL be able to invite MANAGER and STAFF users via email | MUST |
| LYL-FR-AUTH-025 | OWNER SHALL be able to revoke access for any user at any time | MUST |
| LYL-FR-AUTH-026 | System SHALL support multiple POS locations per tenant, each with assigned STAFF | MUST |

#### 5.2.4 Tenant Configuration

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-AUTH-030 | System SHALL store per-tenant: business name, logo, brand color, contact info, timezone | MUST |
| LYL-FR-AUTH-031 | System SHALL support multiple physical locations per tenant with separate addresses and geo-coordinates | MUST |
| LYL-FR-AUTH-032 | Each location SHALL have its own QR code for customer enrollment | MUST |
| LYL-FR-AUTH-033 | System SHALL allow tenants to configure up to 10 active loyalty programs simultaneously | MUST |

---

## 6. MODULE 2 — DIGITAL CARD ENGINE (10 CARD TYPES)

### 6.1 Module Purpose
The Card Engine creates, manages, and delivers all loyalty card types as native digital wallet passes. All 10 card types are fully customizable per tenant.

### 6.2 Common Card Properties

Every card type shares these base properties:

| Property | Type | Description |
|----------|------|-------------|
| `card_id` | UUID | Unique identifier |
| `tenant_id` | FK | Owning tenant |
| `card_type` | Enum | One of 10 card types |
| `name` | String | Program name |
| `description` | String | Short description |
| `logo_url` | String | S3/MinIO URL of logo |
| `background_color` | String | HEX color |
| `text_color` | String | HEX color |
| `strip_image_url` | String | Header strip image (optional) |
| `icon_url` | String | App icon |
| `is_active` | Boolean | Program on/off |
| `metadata` | JSONB | Card-type-specific config |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

### 6.3 Card Type Specifications

#### 6.3.1 Card Type 1 — Stamp Card (Tarjeta de Sellos)

**Business Rule:** Customer earns stamps per purchase. On reaching target, earns a free reward.  
**Example:** "Compra 9 cafés y obtén 1 gratis"

| Req ID | Requirement |
|--------|-------------|
| LYL-FR-CARD-001 | System SHALL allow configuration of: stamps_required (int, 1-99), reward_description (string) |
| LYL-FR-CARD-002 | Customer pass SHALL display current stamp count and total required |
| LYL-FR-CARD-003 | Scanner App SHALL add 1 stamp per scan event (or configurable stamps_per_visit) |
| LYL-FR-CARD-004 | When stamps_earned == stamps_required, system SHALL automatically mark pass as REDEEMABLE |
| LYL-FR-CARD-005 | Scanner App SHALL show a REWARD READY indicator and allow redemption with confirmation |
| LYL-FR-CARD-006 | After redemption, stamp counter SHALL reset to 0 automatically |
| LYL-FR-CARD-007 | System SHALL track all stamp events with timestamp, staff_id, location_id |

#### 6.3.2 Card Type 2 — Cashback Card (Tarjeta de Cashback)

**Business Rule:** Customer earns a percentage of purchase amount as credit for next purchase.

| Req ID | Requirement |
|--------|-------------|
| LYL-FR-CARD-010 | System SHALL allow configuration of: cashback_percentage (decimal 0.01–99.99%), minimum_purchase (decimal), credit_expiry_days (int) |
| LYL-FR-CARD-011 | Staff SHALL enter purchase amount in Scanner App; system calculates credit earned |
| LYL-FR-CARD-012 | Customer pass SHALL display current accumulated credit balance |
| LYL-FR-CARD-013 | System SHALL allow partial credit redemption |
| LYL-FR-CARD-014 | Credit balance SHALL expire after `credit_expiry_days` if not used; customer notified 7 days before expiry |
| LYL-FR-CARD-015 | All credit transactions (earn + redeem) SHALL be logged with amounts and timestamps |

#### 6.3.3 Card Type 3 — Coupon Card (Tarjeta de Cupón)

**Business Rule:** Customer receives a single-use high-value discount coupon upon enrollment.

| Req ID | Requirement |
|--------|-------------|
| LYL-FR-CARD-020 | System SHALL allow configuration of: discount_type (percentage | fixed_amount), discount_value, expiry_date, usage_limit_per_customer |
| LYL-FR-CARD-021 | Coupon SHALL be marked as SINGLE USE by default (configurable to multi-use) |
| LYL-FR-CARD-022 | Scanner App SHALL validate and mark coupon as USED upon redemption |
| LYL-FR-CARD-023 | System SHALL prevent double-redemption of single-use coupons |
| LYL-FR-CARD-024 | Pass display SHALL show coupon value, validity date, and redemption status |

#### 6.3.4 Card Type 4 — Affiliate Card (Tarjeta de Afiliación)

**Business Rule:** Customer registers to receive promotions and belong to the brand community; no transaction required.

| Req ID | Requirement |
|--------|-------------|
| LYL-FR-CARD-030 | System SHALL create an affiliate pass upon customer enrollment with no purchase required |
| LYL-FR-CARD-031 | Pass SHALL display customer name, member since date, and current status (Active/Inactive) |
| LYL-FR-CARD-032 | Affiliate card SHALL be a prerequisite for receiving future promotional pushes if configured |
| LYL-FR-CARD-033 | System SHALL allow businesses to push exclusive promotions to affiliate card holders as a segment |

#### 6.3.5 Card Type 5 — Discount Card (Tarjeta de Descuento)

**Business Rule:** Multi-tier discount system. Customer discount level increases based on cumulative spending / visit count.

| Req ID | Requirement |
|--------|-------------|
| LYL-FR-CARD-040 | System SHALL support configuration of up to 5 discount tiers with: tier_name, threshold (spending or visit count), discount_percentage |
| LYL-FR-CARD-041 | Pass SHALL display current tier name and discount percentage |
| LYL-FR-CARD-042 | System SHALL automatically promote customer to next tier when threshold is reached |
| LYL-FR-CARD-043 | Pass SHALL update in customer Wallet within 30 seconds of tier promotion |
| LYL-FR-CARD-044 | Scanner App SHALL display active discount percentage for cashier reference during transaction |

#### 6.3.6 Card Type 6 — Gift Certificate (Certificado de Regalo)

**Business Rule:** Prepaid gift of fixed monetary value. Purchaser buys for recipient.

| Req ID | Requirement |
|--------|-------------|
| LYL-FR-CARD-050 | System SHALL allow configuration of: denomination options (multiple fixed amounts), expiry_days |
| LYL-FR-CARD-051 | Business SHALL be able to issue gift certificates to specific customer email via Dashboard |
| LYL-FR-CARD-052 | Pass SHALL display current remaining balance in real time |
| LYL-FR-CARD-053 | Scanner App SHALL allow partial redemption: staff enters amount used, balance decrements |
| LYL-FR-CARD-054 | System SHALL email the gift certificate pass link to recipient automatically upon issuance |

#### 6.3.7 Card Type 7 — VIP Membership (Membresía)

**Business Rule:** Exclusive club with advance payment and recurring revenue for business. Customer pays membership fee and receives VIP benefits.

| Req ID | Requirement |
|--------|-------------|
| LYL-FR-CARD-060 | System SHALL support: membership_name, monthly_fee (decimal), annual_fee (decimal), benefits_description (rich text), access_level |
| LYL-FR-CARD-061 | Membership SHALL have configurable validity period (monthly / quarterly / annual / lifetime) |
| LYL-FR-CARD-062 | Pass SHALL display: member name, tier, validity date, and VIP badge |
| LYL-FR-CARD-063 | Scanner App SHALL validate membership active status upon scan |
| LYL-FR-CARD-064 | System SHALL notify member 7 days before membership expiry via push notification |
| LYL-FR-CARD-065 | System SHALL support renewal workflow: customer receives renewal link via push/email |

#### 6.3.8 Card Type 8 — Corporate Discount (Descuento Corporativo)

**Business Rule:** B2B wholesale pricing for corporate accounts. Variable discount levels applied at Wallet.

| Req ID | Requirement |
|--------|-------------|
| LYL-FR-CARD-070 | System SHALL allow creation of corporate accounts with: company_name, NIT/RUC, contact_person, assigned_discount |
| LYL-FR-CARD-071 | Corporate pass SHALL display company name and active discount percentage |
| LYL-FR-CARD-072 | System SHALL allow OWNER to modify corporate discount rate per account at any time |
| LYL-FR-CARD-073 | Pass SHALL update in Wallet within 30 seconds of discount rate change |
| LYL-FR-CARD-074 | Scanner App SHALL show corporate rate prominently during validation |

#### 6.3.9 Card Type 9 — Referral Pass (Programa de Referidos)

**Business Rule:** Existing customers share a referral code/link. When a new customer enrolls using the code, both parties receive a reward automatically.

| Req ID | Requirement |
|--------|-------------|
| LYL-FR-CARD-080 | System SHALL generate a unique referral code per existing customer per program |
| LYL-FR-CARD-081 | System SHALL allow configuration of: referrer_reward (stamps / cashback / coupon), referee_reward, max_referrals_per_customer |
| LYL-FR-CARD-082 | System SHALL automatically distribute rewards to referrer upon new enrollment confirmation |
| LYL-FR-CARD-083 | Pass SHALL display: total referrals made, total rewards earned from referrals |
| LYL-FR-CARD-084 | System SHALL detect and prevent self-referral fraud |

#### 6.3.10 Card Type 10 — Multipass (Multipase)

**Business Rule:** Prepaid bundle of stamps purchased in advance. Customer pays for X stamps upfront.

| Req ID | Requirement |
|--------|-------------|
| LYL-FR-CARD-090 | System SHALL allow configuration of: bundle_size (int, e.g. 10 stamps), bundle_price, bonus_stamps (optional) |
| LYL-FR-CARD-091 | Pass SHALL display: total prepaid stamps purchased, stamps remaining, stamps used |
| LYL-FR-CARD-092 | Scanner App SHALL decrement prepaid stamps upon each validation event |
| LYL-FR-CARD-093 | System SHALL alert customer via push when prepaid balance is at 20% remaining |
| LYL-FR-CARD-094 | System SHALL allow customers to purchase additional Multipass bundles via a shareable link |

### 6.4 Common Card Engine Requirements

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-CARD-100 | System SHALL generate a unique PKPass file for each Apple Wallet enrollment | MUST |
| LYL-FR-CARD-101 | System SHALL generate a signed Google Wallet JWT for each Android enrollment | MUST |
| LYL-FR-CARD-102 | Pass generation SHALL complete in ≤5 seconds from enrollment submission | MUST |
| LYL-FR-CARD-103 | Pass SHALL update in customer Wallet within 30 seconds of any balance/status change | MUST |
| LYL-FR-CARD-104 | System SHALL send push notification to customer upon every pass update | SHOULD |
| LYL-FR-CARD-105 | Each pass SHALL contain a unique QR code for Scanner App validation | MUST |
| LYL-FR-CARD-106 | System SHALL support NFC tap validation (Apple Pay NFC passthrough) where available | COULD |
| LYL-FR-CARD-107 | System SHALL ensure each QR code is cryptographically signed to prevent forgery | MUST |

---

## 7. MODULE 3 — SCANNER APP (MOBILE — iOS & ANDROID)

### 7.1 Module Purpose
The Scanner App is the in-store operational tool for business staff. It validates customer passes, records stamps/rewards, and allows remote reward issuance. It must be reliable, fast, and require minimal training.

### 7.2 Sub-Modules

#### 7.2.1 App Authentication & Setup

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-SCAN-001 | App SHALL authenticate with STAFF or MANAGER credentials | MUST |
| LYL-FR-SCAN-002 | App SHALL store a device token for 90-day session (no re-login per shift) | MUST |
| LYL-FR-SCAN-003 | App SHALL require re-authentication if device token expires or is revoked | MUST |
| LYL-FR-SCAN-004 | App SHALL require staff to select active business location upon login | MUST |
| LYL-FR-SCAN-005 | App SHALL support biometric unlock (Face ID / Fingerprint) after initial login | SHOULD |

#### 7.2.2 QR Code Scanning

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-SCAN-010 | App SHALL provide a full-screen camera scanner for QR code reading | MUST |
| LYL-FR-SCAN-011 | QR scan-to-validation SHALL complete in ≤2 seconds on a standard Android/iOS device | MUST |
| LYL-FR-SCAN-012 | App SHALL display clear visual feedback: GREEN (valid), RED (invalid/expired), YELLOW (warning) | MUST |
| LYL-FR-SCAN-013 | App SHALL display an audible + haptic feedback upon successful scan | MUST |
| LYL-FR-SCAN-014 | App SHALL display customer name, card type, current balance/status upon valid scan | MUST |
| LYL-FR-SCAN-015 | App SHALL detect and reject expired, already-redeemed, or fraudulent passes | MUST |
| LYL-FR-SCAN-016 | App SHALL display a fraud alert with reason when an invalid pass is scanned | MUST |

#### 7.2.3 Transaction Recording

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-SCAN-020 | For Stamp cards: App SHALL add stamp(s) to customer pass with one tap confirmation | MUST |
| LYL-FR-SCAN-021 | For Cashback: App SHALL present an amount entry field; system calculates credit earned | MUST |
| LYL-FR-SCAN-022 | For Coupon: App SHALL confirm redemption before marking as used | MUST |
| LYL-FR-SCAN-023 | For Membership/Corporate: App SHALL display validity and current benefits; record visit | MUST |
| LYL-FR-SCAN-024 | For Gift/Multipass: App SHALL present amount entry; decrement balance and confirm | MUST |
| LYL-FR-SCAN-025 | All transactions SHALL record: staff_id, location_id, timestamp, card_type, action, amount | MUST |
| LYL-FR-SCAN-026 | All transactions SHALL be sent to API within 5 seconds of confirmation | MUST |

#### 7.2.4 Offline Mode

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-SCAN-030 | App SHALL operate in offline mode for QR validation using last-synced cryptographic token | MUST |
| LYL-FR-SCAN-031 | Offline transactions SHALL be queued locally and synced automatically when connection restored | MUST |
| LYL-FR-SCAN-032 | App SHALL display an "OFFLINE MODE" indicator clearly when not connected | MUST |
| LYL-FR-SCAN-033 | Offline transaction queue SHALL be stored encrypted on device | MUST |
| LYL-FR-SCAN-034 | App SHALL sync offline queue immediately upon reconnection | MUST |

#### 7.2.5 Remote Reward Issuance

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-SCAN-040 | App SHALL provide a "Remote Reward" section for issuing stamps/rewards without physical scan | MUST |
| LYL-FR-SCAN-041 | Staff SHALL be able to search customer by phone number or email and issue reward | MUST |
| LYL-FR-SCAN-042 | Remote issuance SHALL require confirmation step with reason field | MUST |
| LYL-FR-SCAN-043 | All remote issuances SHALL be logged separately and flagged in analytics | MUST |

#### 7.2.6 Scanner App — Additional Features

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-SCAN-050 | App SHALL display daily transaction summary for logged-in location | SHOULD |
| LYL-FR-SCAN-051 | App SHALL show customer visit history upon scan (last 5 visits) | SHOULD |
| LYL-FR-SCAN-052 | App SHALL support multiple language: Spanish (default), English | SHOULD |
| LYL-FR-SCAN-053 | App SHALL update to new versions silently via OTA update (CodePush or EAS Update) | SHOULD |

---

## 8. MODULE 4 — BUSINESS DASHBOARD (WEB)

### 8.1 Module Purpose
The Business Dashboard is the primary management interface for Business Owners and Managers. It provides full program configuration, customer management, campaign tools, and analytics.

### 8.2 Sub-Modules

#### 8.2.1 Dashboard Home

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-DASH-001 | Dashboard SHALL display a KPI summary on home screen: total customers, active cards, transactions today, push opens, top card type | MUST |
| LYL-FR-DASH-002 | Dashboard SHALL show a real-time activity feed of last 10 transactions | MUST |
| LYL-FR-DASH-003 | Dashboard SHALL display trial status and days remaining during trial period | MUST |
| LYL-FR-DASH-004 | Dashboard SHALL provide a setup checklist for new tenants until all setup steps complete | SHOULD |

#### 8.2.2 Loyalty Program Management

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-DASH-010 | Dashboard SHALL allow creation of up to 10 simultaneous loyalty programs per tenant | MUST |
| LYL-FR-DASH-011 | For each program, dashboard SHALL provide a full card designer: logo, colors, name, fields | MUST |
| LYL-FR-DASH-012 | Dashboard SHALL offer a live card preview (Apple Wallet style + Google Wallet style) | MUST |
| LYL-FR-DASH-013 | Dashboard SHALL generate and display the enrollment QR code per program | MUST |
| LYL-FR-DASH-014 | Dashboard SHALL allow enable/disable of each program without deleting it | MUST |
| LYL-FR-DASH-015 | Dashboard SHALL allow editing program settings; changes SHALL propagate to all existing passes | MUST |
| LYL-FR-DASH-016 | Dashboard SHALL display per-program enrollment count, active users, redemption rate | MUST |

#### 8.2.3 Customer Management

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-DASH-020 | Dashboard SHALL display a searchable, filterable customer list | MUST |
| LYL-FR-DASH-021 | Customer record SHALL show: name, email, phone, enrolled cards, total visits, total spend, join date | MUST |
| LYL-FR-DASH-022 | Dashboard SHALL allow issuing rewards to any customer manually | MUST |
| LYL-FR-DASH-023 | Dashboard SHALL allow export of customer list as CSV | MUST |
| LYL-FR-DASH-024 | Dashboard SHALL allow deactivating a customer (blocks their pass) | MUST |
| LYL-FR-DASH-025 | Dashboard SHALL display full transaction history per customer | MUST |

#### 8.2.4 QR Code & Enrollment Link Management

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-DASH-030 | Dashboard SHALL generate a downloadable QR code (PNG, SVG, PDF-ready) for each program | MUST |
| LYL-FR-DASH-031 | Dashboard SHALL provide a shareable enrollment URL per program | MUST |
| LYL-FR-DASH-032 | Dashboard SHALL allow regenerating the QR code (invalidating old one) | COULD |
| LYL-FR-DASH-033 | Dashboard SHALL display QR scan count and conversion rate (scanned vs. enrolled) | SHOULD |

#### 8.2.5 Location Management

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-DASH-040 | Dashboard SHALL allow adding multiple physical locations per tenant | MUST |
| LYL-FR-DASH-041 | Each location SHALL have: name, address, geo-coordinates (lat/long), assigned staff | MUST |
| LYL-FR-DASH-042 | Dashboard SHALL display an interactive map (OpenStreetMap/Leaflet) for location management | MUST |
| LYL-FR-DASH-043 | Geo-coordinates SHALL be used for geo-fencing push notification triggers | MUST |
| LYL-FR-DASH-044 | Each location SHALL have its own QR code if multi-location enrollment is enabled | SHOULD |

#### 8.2.6 User & Staff Management

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-DASH-050 | Dashboard SHALL list all users (OWNER, MANAGER, STAFF) per tenant | MUST |
| LYL-FR-DASH-051 | OWNER SHALL be able to invite new users via email with role assignment | MUST |
| LYL-FR-DASH-052 | Dashboard SHALL show invitation status (pending / accepted / expired) | MUST |
| LYL-FR-DASH-053 | OWNER SHALL be able to revoke any user's access immediately | MUST |
| LYL-FR-DASH-054 | Dashboard SHALL show last-login per user | SHOULD |


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
| TRIAL | Free (14 days) | All FULL features — no credit card |
| FULL | $75/month + IVA | 10 card types, geo-location, manager accounts, unlimited customers/messages/stamps/rewards/transactions |
| ADDITIONAL_POS | $10/month per location | Extra scanner location |

*Note: Loyallia-branded pricing may differ; the engine (Devotio) uses $75/month.*

### 14.3 Functional Requirements

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LYL-FR-BILL-001 | System SHALL automatically activate 14-day free trial upon tenant registration | MUST |
| LYL-FR-BILL-002 | Trial SHALL include ALL FULL plan features with no credit card required | MUST |
| LYL-FR-BILL-003 | System SHALL notify tenant at: 7 days, 3 days, 1 day before trial expiry | MUST |
| LYL-FR-BILL-004 | Upon trial expiry without subscription: tenant account SHALL be suspended (read-only mode) | MUST |
| LYL-FR-BILL-005 | System SHALL integrate with Stripe API for credit card payment processing | MUST |
| LYL-FR-BILL-006 | System SHALL apply correct IVA rate per country (12% for Ecuador) | MUST |
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
| Tenant | id, name, slug, owner_id, plan, trial_end, is_active, stripe_customer_id, timezone, country |
| User | id, tenant_id, email, password_hash, role (OWNER/MANAGER/STAFF), is_active, last_login |
| Location | id, tenant_id, name, address, lat, long, is_active |
| LoyaltyProgram | id, tenant_id, card_type, name, config (JSONB), is_active, logo_url, colors |
| Customer | id, tenant_id, first_name, last_name, email, phone, device_token_ios, device_token_android, join_date, is_active |
| Pass | id, customer_id, program_id, serial_number, balance_data (JSONB), status, issued_at, updated_at |
| Transaction | id, tenant_id, pass_id, customer_id, staff_id, location_id, type, amount, metadata (JSONB), created_at |
| PushCampaign | id, tenant_id, title, message, target_segment, status, scheduled_at, sent_count, open_count |
| AutomationRule | id, tenant_id, name, trigger, conditions (JSONB), actions (JSONB), is_active, execution_count |
| Subscription | id, tenant_id, plan, stripe_subscription_id, status, billing_cycle_start, billing_cycle_end |
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
5. Stripe is the payment processor; no alternative is in scope for v1.0.
6. All open-source components must have permissive licenses (MIT, Apache 2.0, BSD).

### 21.2 Business Constraints

1. The platform must support unlimited customers, stamps, rewards, and transactions for subscribed tenants at the quoted plan pricing.
2. The free trial must be fully functional with no feature restrictions.
3. The setup wizard must enable a new loyalty program to go live in ≤15 minutes.

### 21.3 Assumptions

1. Businesses have reliable internet for dashboard and scanner operations.
2. Customers have iOS 15+ or Android 10+ with Apple/Google Wallet installed.
3. All push notification device tokens are collected upon pass installation.
4. Stripe is available in the target market; fallback payment processing is out of scope v1.0.
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
| BILL | ACC-012 | 14-day trial activates on registration; account suspends on day 15 without subscription |
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
