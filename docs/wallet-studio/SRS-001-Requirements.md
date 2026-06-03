# SRS-001: Requirements — Introduction, Research & Current State

> **ISO/IEC/IEEE 29148:2018 — Software Requirements Specification**
> Document ID: SRS-LOY-WPS-001 | Version: 1.0.0-Draft

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Research Findings](#2-research-findings)
3. [Current State Analysis](#3-current-state-analysis)
4. [Critical Issues](#4-critical-issues)

---

## 1. Introduction

### 1.1 Purpose

This document specifies the complete requirements for the **Wallet Pass Studio**, a state-of-the-art visual design environment for creating Apple Wallet (PKPass) and Google Wallet passes within the Loyallia platform.

### 1.2 Scope

The Wallet Pass Studio shall:
- Support **10 card types**: Stamp Card, Cashback, Coupon, Affiliate, Tiered Discount, Gift Certificate, VIP Membership, Corporate Discount, Referral Pass, Multi-pass
- Generate passes for **both Apple Wallet AND Google Wallet simultaneously**
- Provide a **visual canvas** with real-time dual-platform preview
- Include a **Template & Preset Library** with industry-specific designs
- Offer **smart defaults** based on card type and industry
- Ensure **WCAG 2.1 AA accessibility** compliance
- Support **Spanish (primary) and English** localization
- Include **AI-assisted design** features for non-technical users

### 1.3 Target Audience

**Primary users:** Small business owners (cafés, retail, gyms, salons) with no design or technical expertise.

**Design principle:** As simple as Canva, as powerful as a professional tool.

### 1.4 Definitions & Acronyms

| Term | Definition |
|------|------------|
| **PKPass** | Apple Wallet pass bundle format (.pkpass file) |
| **PassKit** | Apple's framework for creating and managing wallet passes |
| **GWAO** | Google Wallet API Object (JSON-based pass class/object) |
| **Canvas** | The main visual design area where users interact with pass elements |
| **Layer** | A visual element on the canvas (image, text field, barcode) |
| **Template** | A pre-designed pass configuration (colors, images, fields, layout) |
| **Preset** | A saved user design that can be reused across programs |
| **@2x / @3x** | High-resolution image variants for Retina/HiDPI displays |
| **SRS** | Software Requirements Specification (ISO/IEC/IEEE 29148:2018) |

---

## 2. Research Findings

### 2.1 Apple PassKit Specifications

#### Pass Bundle Structure

A `.pkpass` file is a ZIP archive containing:

```
pass.json          — Pass data, fields, colors, metadata
manifest.json      — SHA-1 hashes of all files
signature          — Cryptographic signature (PKCS#7)
icon.png           — Required. 29×29pt (58×58px @2x)
icon@2x.png        — Retina variant
icon@3x.png        — Super Retina variant
logo.png           — Required. 160×50pt (320×100px @2x)
logo@2x.png
strip.png          — Optional. Pass-style dependent
strip@2x.png
thumbnail.png      — Optional. 90×90pt (180×180px @2x)
thumbnail@2x.png
background.png     — Optional. 180×220pt (blurred)
footer.png         — Optional. 286×15pt
```

#### Pass Styles & Layout Rules

| Pass Style | Key | Images Supported | Field Layout |
|-----------|-----|-----------------|--------------|
| Boarding Pass | `boardingPass` | logo, icon, footer | 2 primary, 5 auxiliary |
| Coupon | `coupon` | logo, icon, strip | 1 primary, 4 sec/aux combined |
| Event Ticket | `eventTicket` | logo, icon, strip, background, thumbnail | 1 primary, 4 sec/aux |
| Generic | `generic` | logo, icon, thumbnail | 1 primary, 4 sec/aux combined |
| Store Card | `storeCard` | logo, icon, strip | 1 primary, 4 sec/aux combined |

**Field Limits (front of pass):**
- Header fields: max 3 (visible when pass is stacked)
- Primary fields: max 1 (most prominent, large text)
- Secondary fields: max 4
- Auxiliary fields: max 4
- Back fields: unlimited

**Important:** For coupons/store cards/generic with square barcode: max 4 secondary + auxiliary combined.

#### Image Dimensions (Official Apple Specs)

| Image | Points | @2x Pixels | @3x Pixels | Required | Notes |
|-------|--------|-----------|-----------|----------|-------|
| icon | 29×29 | 58×58 | 87×87 | **YES** | Lock screen, Mail app |
| logo | 160×50 | 320×100 | 480×150 | **YES** | Top-left corner |
| strip (storeCard) | 375×123 | 750×246 | 1125×369 | No | Behind primary fields |
| strip (coupon) | 375×144 | 750×288 | 1125×432 | No | Taller for coupons |
| strip (event) | 375×98 | 750×196 | 1125×294 | No | Shorter for tickets |
| thumbnail | 90×90 | 180×180 | 270×270 | No | Next to fields (generic only) |
| background | 180×220 | 360×440 | 540×660 | No | Blurred behind pass |
| footer | 286×15 | 572×30 | 858×45 | No | Near barcode |

#### Barcode Support

| Format | Apple | Google | Shape | Best For |
|--------|-------|--------|-------|----------|
| QR Code | ✓ | ✓ | Square | Large data, URL-based |
| PDF417 | ✓ | ✓ | Rectangular | Dense data |
| Aztec | ✓ | ✓ | Square | Medium data |
| Code 128 | ✓ | ✓ | Rectangular | Numeric/short codes |
| Data Matrix | ✗ | ✓ | Square | GS1 compliance |

#### iOS 18 Updates (WWDC 2024)

- New semantic tags for richer event tickets
- `preferredStyle` key for poster-style event tickets
- Live Activities integration for event passes
- Enhanced NFC event tickets with system integration (weather, calendar)
- `labelColor` property added alongside `foregroundColor` and `backgroundColor`
- Support for hex color values directly in `pass.json`

### 2.2 Google Wallet API Specifications

#### Pass Types

| Type | Use Case | Loyallia Mapping |
|------|----------|-----------------|
| `LoyaltyClass` / `LoyaltyObject` | Loyalty programs, stamp cards, cashback | stamp, cashback, affiliate, vip_membership, multipass |
| `OfferClass` / `OfferObject` | Coupons, discounts, referral programs | coupon, discount, referral_pass, corporate_discount |
| `GiftCardClass` / `GiftCardObject` | Gift certificates, prepaid cards | gift_certificate |
| `GenericClass` / `GenericObject` | Custom passes not fitting other types | Fallback for any type |

#### Layout System

Google Wallet uses a **module-based layout** with `cardTemplateOverride`:

**Row types:**
- `oneItem` — Single field, full width
- `twoItems` — Two fields, 50/50 split
- `threeItems` — Three fields, 33/33/33 split

**Field paths:** `object.accountName`, `object.loyaltyPoints.balance`, `class.programName`, `class.issuerName`, `class.rewardsTier`, etc.

#### Image Dimensions

| Image | Minimum | Recommended | Required | Notes |
|-------|---------|------------|----------|-------|
| Program Logo | 660×660 | 660×660 | **YES** | Square, masked to circle, 15% safe margin |
| Hero Image | 1032×336 | 1032×336 | No | Full-width banner |
| Wide Logo | 1032×150 | 1032×150 | No | Extended logo |
| Image Module | 660×660 | 660×660 | No | Additional image in details |

### 2.3 Competitive Analysis

#### PassKit (passkit.com) — Market Leader

**Strengths:** Mature platform, comprehensive API, visual editor, template library, push notifications, location triggers.
**Weaknesses:** Complex pricing, steep learning curve, limited drag-and-drop, expensive ($39.50/mo minimum), form-heavy UI.
**UI Pattern:** Accordion-based editor with preview on right.

#### Passcreator (passcreator.com) — European Alternative

**Strengths:** Cleaner UI, transparent pricing (€0.08/pass), mobile validation app, ISO 27001 certified.
**Weaknesses:** Limited pass types, less customizable, no dual-platform design, no AI.
**UI Pattern:** Step-by-step wizard: Colors → Images → Content → Barcode.

#### PassSource (passsource.com) — Simple but Limited

**Strengths:** Free tier, API-first, trigger system.
**Weaknesses:** Very basic UI, no visual preview, no Google Wallet support.

#### Key Insights

1. **No competitor offers true canvas-based design** — all use forms/accordions
2. **Dual-platform design is rare** — most require designing separately
3. **Template libraries are standard** — users expect pre-designed starting points
4. **AI assistance is emerging** — Canva Magic Design, Figma AI leading the way
5. **Small business owners are primary users** — must be extremely simple

---

## 3. Current State Analysis

### 3.1 Existing Architecture

```
NewProgramWizard (Step 2 of 4)
├── Name + Description card
├── Locations/Geofences card
├── WalletDesigner card ← CURRENT (275 lines)
│   ├── Provider toggle (apple | google)
│   ├── Accordion: Images (6-8 upload fields with technical specs)
│   ├── Accordion: Field Editor (Apple 5 groups / Google rows)
│   ├── Accordion: NFC & Features (Apple only)
│   └── Accordion: Advanced Settings
├── BarcodeTypeSelector card
└── Design Templates card (color picker only)

Right Column (sticky):
└── WalletCardPreview (331 lines)
    ├── PlatformToggle (apple | google)
    ├── AppleWalletCard or GoogleWalletCard
    └── Back card toggle (Apple only)
```

### 3.2 Current Card Type Registry

| # | Type | Apple Style | Google Type | Description |
|---|------|------------|-------------|-------------|
| 1 | stamp | storeCard | LoyaltyClass | Buy X, get 1 free |
| 2 | cashback | storeCard | LoyaltyClass | Percentage back per purchase |
| 3 | coupon | coupon | OfferClass | Sign-up discount |
| 4 | affiliate | generic | LoyaltyClass | Promotional signup |
| 5 | discount | storeCard | OfferClass | Tiered spending discounts |
| 6 | gift_certificate | storeCard | GiftCardClass | Digital gift cards |
| 7 | vip_membership | generic | LoyaltyClass | Recurring membership club |
| 8 | corporate_discount | generic | OfferClass | Business employee discounts |
| 9 | referral_pass | generic | OfferClass | Refer-a-friend rewards |
| 10 | multipass | storeCard | LoyaltyClass | Prepaid stamp packages |

### 3.3 Current Data Model Issues

```typescript
// PROBLEMS WITH CURRENT WalletDesignState:
interface WalletDesignState {
  provider: 'apple' | 'google';              // ← Single provider
  appleLogoUrl: string;
  appleLogo2xUrl: string;                    // ← @2x variants exposed to user
  appleStripUrl: string;
  appleStrip2xUrl: string;                   // ← Technical detail leaked
  // ... 8 more image URLs
  appleFields: Record<string, AppleFieldDef[]>; // ← Raw PassKit groups
  googleRows: GoogleFieldRow[];                  // ← cardTemplateOverride raw
  // ...
}
```

---

## 4. Critical Issues

### Issue #1: Cognitive Overload — CRITICAL

**Current:** 8 image upload fields for Apple with specs like "160×50pt (320×100px @2x)"
**Problem:** Café owners don't know what @2x means.
**Impact:** Users abandon at this step. Support tickets for image sizing.

### Issue #2: No Design-First Experience — CRITICAL

**Current:** Wallet design buried in Step 2 alongside 4 other configuration cards.
**Problem:** The most visually impactful customer-facing element is treated as secondary.
**Impact:** Rushed designs, poor brand representation, low customer engagement.

### Issue #3: Apple/Google Platform Split — CRITICAL

**Current:** Three separate states (designer, preview, selector) — all can get out of sync.
**Problem:** Users must design for ONE platform at a time. Most want BOTH.
**Impact:** Incomplete passes, inconsistent customer experience.

### Issue #4: No Immediate Visual Feedback — HIGH

**Current:** Upload image → see tiny thumbnail → scroll to preview → check → scroll back.
**Problem:** High iteration cost.
**Impact:** Frustration, many upload attempts, slow completion.

### Issue #5: Field Editor Overwhelming — HIGH

**Current:** Raw PassKit field groups: headerFields, primaryFields, secondaryFields, auxiliaryFields, backFields.
**Problem:** Users need "Sellos: 3/10" prominently, not PassKit taxonomy.
**Impact:** Misconfigured passes.

### Issue #6: No Smart Defaults — MEDIUM

**Current:** Stamp card starts with empty fields.
**Problem:** Every design starts from scratch.
**Impact:** Slower creation, inconsistent designs.

### Issue #7: Templates Disconnected — MEDIUM

**Current:** Color template picker only changes `background_color` and `text_color`.
**Problem:** Doesn't suggest images, update fields, or change layout.
**Impact:** Templates are essentially just color swatches.

### Issue #8: Advanced Settings Too Prominent — MEDIUM

**Current:** NFC, sharing prohibition, expiration at same level as core design.
**Problem:** Power-user features confuse beginners.
**Impact:** Accidental misconfiguration.

### Issue #9: Missing Mobile Responsiveness — MEDIUM

**Current:** Two-column layout breaks on mobile. Device frames are fixed-width.
**Impact:** Unusable on tablets/phones.

### Issue #10: No Design Validation — MEDIUM

**Current:** No checks for image dimensions, text contrast, required fields.
**Impact:** Passes may fail on real devices.

---

*End of Document SRS-001*
