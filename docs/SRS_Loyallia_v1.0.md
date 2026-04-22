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
| F-01 | Multi-tenant business onboarding with 5-day free trial |
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
| LYL-FR-AUTH-002 | Upon registration, system SHALL automatically start a 5-day free trial with FULL feature access | MUST |
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

