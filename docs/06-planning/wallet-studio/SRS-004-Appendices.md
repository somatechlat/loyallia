# SRS-004: Appendices — Complete Platform Reference

> **Document ID:** SRS-004  
> **Title:** Appendices — Apple PassKit & Google Wallet Complete Technical Reference  
> **Part of:** Loyallia Wallet Pass Studio ISO SRS  
> **Status:** Draft — Awaiting User Approval  
> **Date:** 2026-06-03  
> **Author:** AI Design Agent  

---

## Table of Contents

- [Appendix A: Apple PassKit Complete Reference](#appendix-a-apple-passkit-complete-reference)
  - [A.1 Pass Styles (5 Types)](#a1-pass-styles-5-types)
  - [A.2 Visual Signatures by Style](#a2-visual-signatures-by-style)
  - [A.3 Image Assets — Complete Specification](#a3-image-assets--complete-specification)
  - [A.4 Field System — All Field Types](#a4-field-system--all-field-types)
  - [A.5 pass.json Top-Level Structure](#a5-passjson-top-level-structure)
  - [A.6 Color System](#a6-color-system)
  - [A.7 Barcode Formats](#a7-barcode-formats)
  - [A.8 Pass Bundle Structure & Signing](#a8-pass-bundle-structure--signing)
  - [A.9 iOS 18 / WWDC24 New Features](#a9-ios-18--wwdc24-new-features)
  - [A.10 Apple Watch Considerations](#a10-apple-watch-considerations)
  - [A.11 Localization](#a11-localization)
  - [A.12 Semantic Tags (Machine-Readable Metadata)](#a12-semantic-tags-machine-readable-metadata)
  - [A.13 Relevance & Lock Screen](#a13-relevance--lock-screen)
  - [A.14 NFC Requirements](#a14-nfc-requirements)
- [Appendix B: Google Wallet Complete Reference](#appendix-b-google-wallet-complete-reference)
  - [B.1 Pass Types (8+ Types)](#b1-pass-types-8-types)
  - [B.2 Class/Object Architecture](#b2-classobject-architecture)
  - [B.3 Generic Pass Deep Dive](#b3-generic-pass-deep-dive)
  - [B.4 Template Customization via cardTemplateOverride](#b4-template-customization-via-cardtemplateoverride)
  - [B.5 Row Structures: oneItem / twoItems / threeItems](#b5-row-structures-oneitem--twoitems--threeitems)
  - [B.6 Predefined Fields by Pass Type](#b6-predefined-fields-by-pass-type)
  - [B.7 Custom Fields: textModulesData](#b7-custom-fields-textmodulesdata)
  - [B.8 Images in Google Wallet](#b8-images-in-google-wallet)
  - [B.9 Colors](#b9-colors)
  - [B.10 Barcode Configuration](#b10-barcode-configuration)
  - [B.11 Details View (Back of Pass)](#b11-details-view-back-of-pass)
  - [B.12 List View Customization](#b12-list-view-customization)
  - [B.13 JWT Signing & "Add to Google Wallet" Flow](#b13-jwt-signing--add-to-google-wallet-flow)
  - [B.14 Smart Tap / NFC](#b14-smart-tap--nfc)
  - [B.15 State Management](#b15-state-management)
  - [B.16 Grouping Passes](#b16-grouping-passes)
  - [B.17 Links & App Integration](#b17-links--app-integration)
  - [B.18 Localization](#b18-localization)
- [Appendix C: Unified Platform Mapping](#appendix-c-unified-platform-mapping)
  - [C.1 Pass Type Crosswalk](#c1-pass-type-crosswalk)
  - [C.2 Feature Parity Matrix](#c2-feature-parity-matrix)
  - [C.3 Image Asset Mapping](#c3-image-asset-mapping)
  - [C.4 Field Mapping Strategy](#c4-field-mapping-strategy)
  - [C.5 Color System Alignment](#c5-color-system-alignment)
  - [C.6 Barcode Alignment](#c6-barcode-alignment)
- [Appendix D: Image Specifications Master Matrix](#appendix-d-image-specifications-master-matrix)
- [Appendix E: Implementation Checklist](#appendix-e-implementation-checklist)

---

# Appendix A: Apple PassKit Complete Reference

> **Source:** developer.apple.com/documentation/walletpasses  
> **Archive:** developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/  
> **Last Updated:** iOS 18 / WWDC24 (June 2024)

---

## A.1 Pass Styles (5 Types)

Apple PassKit defines **5 pass styles**. Each style has a fixed visual layout, distinct shape characteristics, and specific supported images. The style is set at the top level of `pass.json` as a dictionary key.

| Style | JSON Key | Best For | Supported Images |
|-------|----------|----------|-----------------|
| **Boarding Pass** | `boardingPass` | Flights, trains, buses, ferries, any transit | logo, icon, footer |
| **Coupon** | `coupon` | Discounts, special offers, promo codes | logo, icon, strip |
| **Event Ticket** | `eventTicket` | Concerts, movies, sports, conferences | logo, icon, strip OR (background + thumbnail) |
| **Generic** | `generic` | Membership cards, IDs, gym cards, any general purpose | logo, icon, thumbnail |
| **Store Card** | `storeCard` | Loyalty cards, gift cards, points cards | logo, icon, strip |

**CRITICAL RULE:** You CANNOT change the pass style after issuing a pass. It is tied to the `passTypeIdentifier`. Choose correctly upfront.

### Pass Style Selection for Loyallia Card Types

| Loyallia Card Type | Recommended Apple Style | Rationale |
|-------------------|------------------------|-----------|
| `stamp` | `storeCard` | Loyalty/stamp cards are classic store card use case |
| `cashback` | `storeCard` | Points/balance display fits store card paradigm |
| `coupon` | `coupon` | Direct match — discounts and offers |
| `affiliate` | `generic` | No specific Apple category fits |
| `discount` | `coupon` | Discount passes map directly |
| `gift_certificate` | `storeCard` | Gift cards are store cards in Apple taxonomy |
| `vip_membership` | `generic` or `storeCard` | VIP cards can use either; generic for flexibility |
| `corporate_discount` | `coupon` | Corporate discount = coupon variant |
| `referral_pass` | `generic` | Referral passes don't fit specific category |
| `multipass` | `generic` | Multi-purpose pass needs flexible layout |

---

## A.2 Visual Signatures by Style

Each Apple pass style has **distinctive visual elements baked into iOS** that cannot be changed:

| Style | Top Edge Feature | Corner Style | Layout Distinction |
|-------|-----------------|--------------|-------------------|
| **Boarding Pass** | Two notches near top, connected by line | Squared | Transit icon between origin/destination |
| **Coupon** | Perforated (serrated) top edge | Rounded | Strip image behind primary fields |
| **Event Ticket** | Small cutout/notch at top center | Rounded | Strip OR background+thumbnail |
| **Generic** | Plain rounded top | Rounded | Thumbnail next to fields |
| **Store Card** | Plain rounded top | Rounded | Strip image behind primary fields |

**Key Insight:** These visual signatures help users instantly recognize pass types in their wallet. Our designer should visually hint at these shapes in the canvas preview.

---

## A.3 Image Assets — Complete Specification

Apple passes support **6 image types**. Each style supports a subset. Images are scaled (preserving aspect ratio) to fill allotted space, then cropped if aspect ratio differs.

### Image Availability by Pass Style

| Image | Boarding Pass | Coupon | Event Ticket | Generic | Store Card |
|-------|:-----------:|:------:|:------------:|:-------:|:----------:|
| `icon.png` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `logo.png` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `strip.png` | ❌ | ✅ | ✅* | ❌ | ✅ |
| `background.png` | ❌ | ❌ | ✅* | ❌ | ❌ |
| `thumbnail.png` | ❌ | ❌ | ✅* | ✅ | ❌ |
| `footer.png` | ✅ | ❌ | ❌ | ❌ | ❌ |

\* Event Ticket: **strip OR (background + thumbnail)** — mutually exclusive. If strip is specified, do NOT specify background or thumbnail.

### Image Dimensions & Requirements

| Image | File Name | Dimensions (Points) | Purpose | Notes |
|-------|-----------|---------------------|---------|-------|
| **Icon** | `icon.png` ( + `@2x`, `@3x`) | 29 × 29 pt | Lock screen, Mail attachments, app lists | Required. Small app icon representation |
| **Logo** | `logo.png` ( + `@2x`, `@3x`) | 160 × 50 pt (allotted) | Top-left corner, next to logoText | Should be narrower than 160pt in practice |
| **Strip** | `strip.png` ( + `@2x`, `@3x`) | **iPhone 6+:** 375 × 98/144/123 pt<br>**Prior:** 320 × 84/110/123 pt | Behind primary fields | Event tickets: 375×98 (iPhone 6+), 320×84 (prior)<br>Gift cards/coupons: 375×144, 320×110<br>Other: 375×123, 320×123 |
| **Background** | `background.png` ( + `@2x`, `@3x`) | 180 × 220 pt (expected) | Full pass background | Cropped slightly, blurred. Can use smaller size since blur hides details |
| **Thumbnail** | `thumbnail.png` ( + `@2x`, `@3x`) | 90 × 90 pt (allotted) | Next to fields on front | Aspect ratio 2:3 to 3:2. Cropped if outside range |
| **Footer** | `footer.png` ( + `@2x`, `@3x`) | 286 × 15 pt (allotted) | Near barcode | Boarding pass only. White space cropped |

### iOS 18 New Image Assets (WWDC24)

For **poster event tickets** (new iOS 18 style):

| New Asset | Description |
|-----------|-------------|
| `artwork.png` | New artwork asset. Use this if you want previous OS versions to render with strip image |
| `secondaryLogo.png` | Secondary logo for poster event tickets |
| `venueMap.png` | Venue map displayed in event guide |
| `background.png` | Use if you want same background on ALL OS versions |

### Image Resolution Requirements

Apple requires **@2x and @3x Retina versions** for all images:

| Scale | Suffix | Multiplier |
|-------|--------|------------|
| 1× | `.png` | 1.0× |
| 2× | `@2x.png` | 2.0× |
| 3× | `@3x.png` | 3.0× |

**Example:** `logo.png`, `logo@2x.png`, `logo@3x.png`

### Image Format

- **Format:** PNG (recommended) or JPEG
- **Color space:** sRGB
- **Transparency:** Supported (PNG only)

---

## A.4 Field System — All Field Types

Apple passes organize content into **5 field categories** within each pass style dictionary:

### Field Categories

| Field Type | Max Count | Purpose | Visibility |
|------------|:---------:|---------|------------|
| `headerFields` | 3 | Small fields at top, next to logo | Visible even in pass stack |
| `primaryFields` | 1 (2 for boarding pass) | Most prominent display | Large, centered |
| `secondaryFields` | 4 | Supporting info below primary | Medium size |
| `auxiliaryFields` | 4 (5 for boarding pass) | Additional details | Small |
| `backFields` | Unlimited | Back of pass content | Accessible via info button |

### Field Limits by Pass Style

| Style | Header | Primary | Secondary | Auxiliary | Notes |
|-------|:------:|:-------:|:---------:|:---------:|-------|
| **Boarding Pass** | 3 | 2 | 4 | 5 | Transit icon between primary fields |
| **Coupon** | 3 | 1 | 4† | 4† | † Combined max 4 secondary + auxiliary |
| **Event Ticket** | 3 | 1 | 4 | 4 | Standard layout |
| **Generic** | 3 | 1 | 4 | 4 | Standard layout |
| **Store Card** | 3 | 1 | 4† | 4† | † Combined max 4 secondary + auxiliary |

**⚠️ CRITICAL:** Coupons, store cards, and generic passes with **square barcodes** can have a **total of up to 4 secondary and auxiliary fields combined**. With **rectangular barcodes**, they get full 4+4.

### Field Dictionary Structure

Each field is an object with these properties:

```json
{
  "key": "unique_field_key",
  "label": "DISPLAY LABEL",
  "value": "Field Value",
  "changeMessage": "Updated to %@",
  "textAlignment": "PKTextAlignmentLeft",
  "dateStyle": "PKDateStyleShort",
  "timeStyle": "PKDateStyleShort",
  "numberStyle": "PKNumberStyleDecimal",
  "currencyCode": "USD",
  "attributedValue": "<a href='...'>Link</a>"
}
```

### Field Properties Detail

| Property | Type | Description |
|----------|------|-------------|
| `key` | String (required) | Unique identifier within entire pass. Used by apps to access data |
| `label` | String | Label text displayed above value |
| `value` | String/Number/Date | The actual data. Can be string, number, or ISO 8601 date |
| `changeMessage` | String | Push notification message when field updates. `%@` = placeholder for value |
| `textAlignment` | Enum | `PKTextAlignmentLeft`, `Right`, `Center`, `Natural` |
| `dateStyle` | Enum | `PKDateStyleNone`, `Short`, `Medium`, `Long`, `Full` |
| `timeStyle` | Enum | `PKDateStyleNone`, `Short`, `Medium`, `Long`, `Full` |
| `numberStyle` | Enum | `PKNumberStyleDecimal`, `Percent`, `Scientific`, `SpellOut` |
| `currencyCode` | String | ISO 4217 currency code (e.g., "USD", "EUR") |
| `attributedValue` | String | HTML-like attributed string with `<a>`, `<b>`, `<i>` tags |

---

## A.5 pass.json Top-Level Structure

```json
{
  "formatVersion": 1,
  "passTypeIdentifier": "pass.com.yourdomain.loyalty",
  "serialNumber": "unique-pass-id-123",
  "teamIdentifier": "ABCDE12345",
  "organizationName": "Your Business Name",
  "description": "Loyalty Card for Your Business",
  "logoText": "Your Business",
  "foregroundColor": "rgb(255, 255, 255)",
  "backgroundColor": "rgb(66, 133, 244)",
  "labelColor": "rgb(255, 255, 255)",
  "groupingIdentifier": "group-id",
  "relevantDate": "2024-12-25T18:00:00Z",
  "relevantDates": [
    {
      "start": "2024-12-25T00:00:00Z",
      "end": "2024-12-25T23:59:59Z"
    }
  ],
  "expirationDate": "2025-12-25T00:00:00Z",
  "voided": false,
  "sharingProhibited": false,
  "suppressStripShine": true,
  "barcode": {
    "format": "PKBarcodeFormatQR",
    "message": "encoded-data-here",
    "messageEncoding": "iso-8859-1",
    "altText": "Human-readable text"
  },
  "barcodes": [
    {
      "format": "PKBarcodeFormatQR",
      "message": "encoded-data",
      "messageEncoding": "iso-8859-1"
    }
  ],
  "beacons": [
    {
      "major": 1,
      "minor": 1,
      "proximityUUID": "UUID-HERE",
      "relevantText": "Welcome to our store!"
    }
  ],
  "locations": [
    {
      "latitude": 37.422,
      "longitude": -122.084,
      "altitude": 0,
      "relevantText": "Near your favorite location"
    }
  ],
  "maxDistance": 500,
  "nfc": {
    "message": "NFC-MESSAGE",
    "encryptionPublicKey": "KEY"
  },
  "userInfo": {
    "customKey": "customValue"
  },
  "appLaunchURL": "https://yourapp.com/launch",
  "associatedStoreIdentifiers": [123456789],
  "semantics": {
    "totalPrice": {
      "amount": "50.00",
      "currency": "USD"
    },
    "venueName": "Stadium Name",
    "eventName": "Concert Name",
    "eventType": "PKEventTypeLivePerformance"
  },
  "preferredStyleSchemes": ["posterEventTicket", "eventTicket"],
  "useAutomaticColors": false,
  "suppressHeaderDarkening": false,

  "storeCard": {
    "headerFields": [...],
    "primaryFields": [...],
    "secondaryFields": [...],
    "auxiliaryFields": [...],
    "backFields": [...]
  }
}
```

### Top-Level Required Fields

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `formatVersion` | Integer | ✅ | Always `1` |
| `passTypeIdentifier` | String | ✅ | Reverse DNS style: `pass.com.domain.type` |
| `serialNumber` | String | ✅ | Unique per passTypeIdentifier |
| `teamIdentifier` | String | ✅ | 10-char Apple Developer Team ID |
| `organizationName` | String | ✅ | Displayed on lock screen notifications |
| `description` | String | ✅ | VoiceOver accessibility description |

### Top-Level Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `logoText` | String | Text next to logo (top-left) |
| `foregroundColor` | String | Text color: `rgb(r, g, b)` |
| `backgroundColor` | String | Background color: `rgb(r, g, b)` |
| `labelColor` | String | Label text color: `rgb(r, g, b)` |
| `groupingIdentifier` | String | Groups passes together in Wallet |
| `relevantDate` | String | ISO 8601 date for lock screen appearance |
| `relevantDates` | Array | iOS 18+ array of date intervals |
| `expirationDate` | String | ISO 8601 date — pass shown as expired after |
| `voided` | Boolean | Pass is void (redeemed coupon, etc.) |
| `sharingProhibited` | Boolean | Removes Share button (iOS 11+) |
| `suppressStripShine` | Boolean | Display strip without shine effect (default: true) |
| `suppressHeaderDarkening` | Boolean | For poster event tickets only (default: false) |
| `useAutomaticColors` | Boolean | iOS 18+ poster tickets — auto-compute colors from background |
| `preferredStyleSchemes` | Array | iOS 18+ style preference order: `["posterEventTicket", "eventTicket"]` |
| `webServiceURL` | String | HTTPS URL for pass updates |
| `authenticationToken` | String | Token for web service auth |
| `appLaunchURL` | String | URL opened when user taps app icon on back |
| `associatedStoreIdentifiers` | Array | App Store IDs of companion apps |
| `userInfo` | Object | Custom data for companion apps (not displayed) |
| `maxDistance` | Integer | Max distance in meters for location relevance |

---

## A.6 Color System

Apple passes use **RGB triplets** in a specific string format:

```
"foregroundColor": "rgb(255, 255, 255)"
"backgroundColor": "rgb(66, 133, 244)"
"labelColor": "rgb(200, 200, 200)"
```

### Color Behavior by Context

| Element | Controlled By | Default | Notes |
|---------|--------------|---------|-------|
| Main text / values | `foregroundColor` | Black | Primary data text |
| Labels | `labelColor` | Derived from background | Can be overridden |
| Logo text | `foregroundColor` | — | Usually. **Exception:** Store cards & event tickets with background image use `labelColor` instead |
| Background | `backgroundColor` | White | Pass background |
| Strip shine | `suppressStripShine` | true | Set to false for glossy effect |

### iOS 18 Poster Event Ticket Colors

When `useAutomaticColors` is `true` (poster event tickets only):
- System derives `backgroundColor` from background image
- System auto-computes `foregroundColor` and `labelColor`
- **Ignores** manual `foregroundColor` and `labelColor` values

---

## A.7 Barcode Formats

Apple supports **4 barcode formats**:

| Format | Constant | Use Case | Shape |
|--------|----------|----------|-------|
| **QR Code** | `PKBarcodeFormatQR` | Most common, high data capacity | Square |
| **PDF417** | `PKBarcodeFormatPDF417` | Large data, dense | Rectangular |
| **Aztec** | `PKBarcodeFormatAztec` | Compact, robust | Square |
| **Code 128** | `PKBarcodeFormatCode128` | Linear barcode | Rectangular |

### Barcode Configuration

```json
{
  "barcode": {
    "format": "PKBarcodeFormatQR",
    "message": "DATA_TO_ENCODE",
    "messageEncoding": "iso-8859-1",
    "altText": "Human Readable"
  }
}
```

**Note:** Use `barcodes` array (plural) to specify multiple barcode formats. Wallet uses the first supported one.

```json
{
  "barcodes": [
    {
      "format": "PKBarcodeFormatQR",
      "message": "data",
      "messageEncoding": "iso-8859-1"
    },
    {
      "format": "PKBarcodeFormatPDF417",
      "message": "data",
      "messageEncoding": "iso-8859-1"
    }
  ]
}
```

### Barcode Shape Impact on Layout

| Pass Style | Square Barcode | Rectangular Barcode |
|------------|---------------|---------------------|
| Coupon | 4 secondary+aux combined | 4 secondary+aux combined |
| Store Card | 4 secondary+aux combined | 4 secondary+aux combined |
| Generic | Always 4+4 regardless | Always 4+4 regardless |

---

## A.8 Pass Bundle Structure & Signing

### Directory Structure

```
PassName.pass/
├── pass.json              # Main pass definition (REQUIRED)
├── manifest.json          # SHA1 hashes of all files (REQUIRED)
├── signature              # PKCS#7 detached signature (REQUIRED)
├── icon.png               # Required at all scales
├── icon@2x.png
├── icon@3x.png
├── logo.png               # Optional
├── logo@2x.png
├── logo@3x.png
├── strip.png              # Optional (style-dependent)
├── strip@2x.png
├── strip@3x.png
├── background.png         # Optional (event ticket)
├── background@2x.png
├── thumbnail.png          # Optional (generic/event)
├── thumbnail@2x.png
├── footer.png             # Optional (boarding pass)
├── footer@2x.png
├── en.lproj/              # English localization
│   ├── logo.png
│   ├── logo@2x.png
│   └── pass.strings
├── es.lproj/              # Spanish localization
│   ├── logo.png
│   └── pass.strings
└── zh-Hans.lproj/         # Chinese Simplified
    └── ...
```

### Signing Process

1. **Create manifest.json:** SHA1 hash of every file except manifest and signature
2. **Create signature:** PKCS#7 detached signature of manifest using private key + WWDR intermediate certificate
3. **Create .pkpass:** ZIP archive of the pass directory CONTENTS (not the directory itself)
4. **Distribute:** Serve .pkpass file with MIME type `application/vnd.apple.pkpass`

### manifest.json Example

```json
{
  "icon.png": "2a1625e1e1b3b38573d086b5ec158f72f11283a0",
  "icon@2x.png": "7321a3b7f47d1971910db486330c172a720c3e4b",
  "pass.json": "ef3f648e787a16ac49fff2c0daa8615e1fa15df9",
  "strip.png": "25b737727194b5c7b26a86d57e859a054eada240",
  "en.lproj/logo.png": "cff02680b9041b7bf637960f9f2384738c935347",
  "en.lproj/pass.strings": "aaf7d9598f6a792755be71f492a3523d507bc212"
}
```

### Testing

- Drop .pkpass onto iOS Simulator to test
- Check Console app / Xcode Organizer for validation errors
- Common errors: malformed JSON, wrong passTypeIdentifier, expired certificate, missing WWDR cert

---

## A.9 iOS 18 / WWDC24 New Features

### Poster Event Tickets (Major Redesign)

iOS 18 introduced a **richer ticketing experience** for NFC event tickets:

**Requirements for new style:**
1. Pass must be signed with **NFC entitlement**
2. `pass.json` must provide **required semantic tags**
3. Must specify `preferredStyleSchemes`: `["posterEventTicket", "eventTicket"]`

**New Visual Features:**
- Full-background image with rich design
- Event logo / logo text at top
- Date/time of event on opposite side
- Action tiles linking to app experiences (food, merch, bag policy)
- Weather forecast for event day
- Venue map and queue information
- Music playlist integration (for concerts)

**New Assets:**
- `artwork.png` — for backward compatibility
- `secondaryLogo.png` — secondary branding
- `venueMap.png` — venue map for event guide

**Semantic Requirements for Poster Style:**
- `semantics.eventType` — must be set (e.g., `PKEventTypeLivePerformance`)
- `semantics.venueName` OR `semantics.venueRegionName` OR `semantics.venueRoom` — required
- For sports: `semantics.homeTeamAbbreviation` + `semantics.awayTeamAbbreviation`
- For live performance: `semantics.performerNames`
- `semantics.eventName` — used for music integration

**New Top-Level Properties (iOS 18):**
- `preferredStyleSchemes` — Array of style preferences in order
- `useAutomaticColors` — Auto-compute colors from background
- `suppressHeaderDarkening` — Control header gradient on poster tickets

### Live Activities Integration

- iOS 18.1+ shows Live Activities for event tickets
- Seat information with color highlighting
- Works even for general admission

---

## A.10 Apple Watch Considerations

Users can add ANY pass to Apple Watch. The watch presents a **subset** of iPhone content:

### What's NOT Available on Apple Watch

- ❌ Strip image (not displayed)
- ❌ Thumbnail image (not displayed)
- ❌ Back side of pass (inaccessible)

### Watch Layout (Coupon/Event/Store/Generic)

1. Logo + logoText at top
2. Header fields under logo (one per line)
3. Primary → Secondary → Auxiliary fields (top to bottom)
4. Two fields per line ONLY if same type (never mix primary + secondary)
5. Footer image below fields
6. Barcode at bottom (rectangular barcodes rotated to portrait)
7. Background image scaled, blurred, positioned behind content

### Watch Layout (Boarding Pass)

1. Primary field values on same line, separated by transit icon
2. Combined labels on next line (e.g., "SAN FRANCISCO TO NEW YORK")
3. Auxiliary fields positioned ABOVE secondary fields

---

## A.11 Localization

Apple passes support full localization:

### Localization Folder Structure

```
PassName.pass/
├── pass.json
├── icon.png
├── en.lproj/
│   ├── logo.png          # Localized logo
│   ├── logo@2x.png
│   └── pass.strings      # Localized strings
├── es.lproj/
│   ├── logo.png
│   └── pass.strings
└── zh-Hans.lproj/
    └── ...
```

### pass.strings Format

```
"field_key" = "Localized Value";
"coupon_title" = "Oferta Especial";
```

### Localized Image Rules

- Each `.lproj` folder contains ALL localized image variants
- If an image isn't localized, the root-level image is used
- All localization folders must have the same number of strings

### Language/Region Identifiers

Use standard BCP 47 codes: `en`, `es`, `fr`, `de`, `ja`, `zh-Hans`, `pt-BR`, etc.

---

## A.12 Semantic Tags (Machine-Readable Metadata)

Semantic tags are **machine-readable metadata** that help iOS understand pass content and suggest actions.

### Common Semantic Tags

| Tag | Type | Purpose |
|-----|------|---------|
| `totalPrice` | Money | Total price with amount and currency |
| `eventName` | String | Name of event |
| `eventType` | Enum | `PKEventTypeGeneric`, `LivePerformance`, `Sports`, `Movie` |
| `venueName` | String | Venue name |
| `venueRegionName` | String | Venue region |
| `venueRoom` | String | Room/section |
| `performerNames` | Array | List of performers |
| `homeTeamAbbreviation` | String | Sports home team |
| `awayTeamAbbreviation` | String | Sports away team |
| `seatSection` | String | Seat section |
| `seatRow` | String | Seat row |
| `seatNumber` | String | Seat number |
| `silenceRequested` | Boolean | Request Do Not Disturb |
| `duration` | Duration | Event duration |

### Example Semantics Block

```json
{
  "semantics": {
    "eventName": "Summer Music Festival",
    "eventType": "PKEventTypeLivePerformance",
    "venueName": "Central Park Stadium",
    "venueRegionName": "New York",
    "performerNames": ["Artist One", "Artist Two"],
    "totalPrice": {
      "amount": "150.00",
      "currency": "USD"
    },
    "seatSection": "A",
    "seatRow": "12",
    "seatNumber": "34",
    "silenceRequested": true
  }
}
```

---

## A.13 Relevance & Lock Screen

Passes appear on the lock screen when relevant:

### Relevance Triggers

| Trigger | Key | Format |
|---------|-----|--------|
| Date/Time | `relevantDate` | ISO 8601 |
| Date Range | `relevantDates` | Array of intervals (iOS 18+) |
| Location | `locations` | Array of lat/lng objects |
| Beacons | `beacons` | Array of iBeacon objects |

### Location Object

```json
{
  "locations": [
    {
      "latitude": 37.422,
      "longitude": -122.084,
      "altitude": 0,
      "relevantText": "You're near our store!"
    }
  ],
  "maxDistance": 500
}
```

### Beacon Object

```json
{
  "beacons": [
    {
      "major": 1,
      "minor": 1,
      "proximityUUID": "E2C56DB5-DFFB-48D2-B060-D0F5A71096E0",
      "relevantText": "Welcome!"
    }
  ]
}
```

---

## A.14 NFC Requirements

NFC-enabled passes require:

1. **Apple Developer Program** membership
2. **NFC entitlement** requested from Apple
3. Pass signed with NFC certificate
4. `nfc` dictionary in pass.json:

```json
{
  "nfc": {
    "message": "NFC_PAYLOAD_DATA",
    "encryptionPublicKey": "PUBLIC_KEY_FOR_ENCRYPTION"
  }
}
```

**Note:** NFC passes are required for:
- iOS 18 poster event tickets
- Contactless entry systems
- Smart Tap redemption

---

# Appendix B: Google Wallet Complete Reference

> **Source:** developers.google.com/wallet  
> **Codelab:** codelabs.developers.google.com/add-to-wallet-web  
> **Customization:** developers.google.com/wallet/retail/loyalty-cards/use-cases/pass-customization  
> **Last Updated:** 2025-05-13

---

## B.1 Pass Types (8+ Types)

Google Wallet supports **8+ pass types** plus a flexible **Generic** type:

| Pass Type | REST Resource | Use Case | Specialized Features |
|-----------|--------------|----------|---------------------|
| **Generic** | `genericClass` / `genericObject` | ANY pass type — parking, library, gym, membership | Fully customizable rows |
| **Loyalty** | `loyaltyClass` / `loyaltyObject` | Points cards, rewards programs | Points balance, tier display |
| **Offer** | `offerClass` / `offerObject` | Coupons, discounts, promotions | Redemption codes, expiration |
| **Gift Card** | `giftCardClass` / `giftCardObject` | Gift cards, store credit | Balance, merchant info |
| **Event Ticket** | `eventTicketClass` / `eventTicketObject` | Concerts, sports, movies | Seat info, venue, gate |
| **Boarding Pass** | `flightClass` / `flightObject` | Flights | Origin/destination, flight number |
| **Transit** | `transitClass` / `transitObject` | Public transit | Route, stops |
| **Generic (Legacy)** | — | Previously unsupported types | Now superseded by Generic |

### Google Pass Type Selection for Loyallia

| Loyallia Card Type | Recommended Google Type | Notes |
|-------------------|------------------------|-------|
| `stamp` | `loyalty` | Stamp cards = loyalty programs |
| `cashback` | `loyalty` | Cashback = points/rewards |
| `coupon` | `offer` | Direct match |
| `affiliate` | `generic` | Flexible custom layout |
| `discount` | `offer` | Discount = offer |
| `gift_certificate` | `giftCard` | Direct match |
| `vip_membership` | `loyalty` or `generic` | VIP = loyalty tier |
| `corporate_discount` | `offer` | Corporate = offer variant |
| `referral_pass` | `generic` | Custom referral layout |
| `multipass` | `generic` | Multi-purpose needs flexibility |

---

## B.2 Class/Object Architecture

Google Wallet uses a **two-level architecture**:

```
┌─────────────────────────────────────────┐
│           PASS CLASS (Template)         │
│  - Shared by ALL users                  │
│  - Design, colors, layout, logo         │
│  - Class-level textModulesData          │
│  - imageModulesData                     │
│  - linksModuleData                      │
│  - classTemplateInfo (layout)           │
└─────────────────────────────────────────┘
                   │
                   │ 1 : N
                   ▼
┌─────────────────────────────────────────┐
│         PASS OBJECT (Instance)          │
│  - ONE per user                         │
│  - User-specific data                   │
│  - Points, name, barcode value          │
│  - Object-level textModulesData         │
│  - state (ACTIVE, INACTIVE, etc.)       │
└─────────────────────────────────────────┘
```

### ID Format

```
classId  = "{issuerId}.{classSuffix}"
objectId = "{issuerId}.{objectSuffix}"

Example:
  issuerId     = "1234123412341234123"
  classSuffix  = "cafe_loyalty_gold"
  objectSuffix = "user_12345"
  
  classId  = "1234123412341234123.cafe_loyalty_gold"
  objectId = "1234123412341234123.user_12345"
```

### Class-Level vs Object-Level Data

| Data Type | Best On | Example |
|-----------|---------|---------|
| Design (colors, images, layout) | **Class** | Logo, hero image, background color |
| Universal message | **Class** | "Welcome to our program" |
| User-specific data | **Object** | Points balance, member name, barcode |
| Personalized greeting | **Object** | "Jane, your seat is A-12" |
| Tier/program info | **Class** | "Gold Tier", "VIP Program" |

---

## B.3 Generic Pass Deep Dive

The **Generic Pass** is Google Wallet's most flexible type. It can represent ANY card-like object.

### Generic Pass Capabilities

- Up to **3 rows** of information on the card front
- Optional **barcode/QR code**
- Optional **details section** (back of card)
- **Hero image** banner at top
- **Logo** image
- Custom **background color**
- **Card title**, **header**, **subheader**
- **App link button**
- Fully customizable via `cardTemplateOverride`

### Generic Class Structure

```json
{
  "id": "{issuerId}.{classSuffix}",
  "classTemplateInfo": {
    "cardTemplateOverride": { ... },
    "detailsTemplateOverride": { ... },
    "listTemplateOverride": { ... }
  },
  "imageModulesData": [ ... ],
  "textModulesData": [ ... ],
  "linksModuleData": { ... }
}
```

### Generic Object Structure

```json
{
  "id": "{issuerId}.{objectSuffix}",
  "classId": "{issuerId}.{classSuffix}",
  "genericType": "GENERIC_TYPE_UNSPECIFIED",
  "state": "ACTIVE",
  "cardTitle": { ... },
  "header": { ... },
  "subheader": { ... },
  "hexBackgroundColor": "#4285f4",
  "logo": { ... },
  "heroImage": { ... },
  "barcode": { ... },
  "textModulesData": [ ... ],
  "imageModulesData": [ ... ],
  "linksModuleData": { ... },
  "appLinkData": { ... },
  "groupingInfo": { ... }
}
```

---

## B.4 Template Customization via cardTemplateOverride

The `classTemplateInfo.cardTemplateOverride` object controls **ALL visual layout** on the card front.

### Structure

```json
{
  "classTemplateInfo": {
    "cardTemplateOverride": {
      "cardRowTemplateInfos": [
        { "oneItem": { ... } },
        { "twoItems": { ... } },
        { "threeItems": { ... } }
      ]
    }
  }
}
```

### Field Path References

Fields are referenced using `fieldPath` strings:

```json
{
  "fieldPath": "object.textModulesData['points']"
}
{
  "fieldPath": "class.rewardsTier"
}
{
  "fieldPath": "object.loyaltyPoints.balance"
}
{
  "fieldPath": "object.accountName"
}
```

**Path prefixes:**
- `object.*` — Object-level (user-specific) data
- `class.*` — Class-level (template) data

### Multiple Fields in One Item

Display label + value together:

```json
{
  "firstValue": {
    "fields": [
      { "fieldPath": "object.loyaltyPoints.label" },
      { "fieldPath": "object.loyaltyPoints.balance" }
    ]
  }
}
```

### Date Formatting

```json
{
  "fieldPath": "object.validTimeInterval.start.date",
  "dateFormat": "DATE_ONLY"
}
```

Available `dateFormat` values:
- `DATE_TIME`
- `DATE_ONLY`
- `TIME_ONLY`
- `DATE_MONTH_YEAR`
- `DATE_YEAR_MONTH`

---

## B.5 Row Structures: oneItem / twoItems / threeItems

### oneItem

```json
{
  "oneItem": {
    "item": {
      "firstValue": {
        "fields": [
          { "fieldPath": "object.accountName" }
        ]
      }
    }
  }
}
```

### twoItems

```json
{
  "twoItems": {
    "startItem": {
      "firstValue": {
        "fields": [
          { "fieldPath": "object.textModulesData['points']" }
        ]
      }
    },
    "endItem": {
      "firstValue": {
        "fields": [
          { "fieldPath": "object.textModulesData['contacts']" }
        ]
      }
    }
  }
}
```

### threeItems

```json
{
  "threeItems": {
    "startItem": {
      "firstValue": {
        "fields": [
          { "fieldPath": "object.textModulesData['row1left']" }
        ]
      }
    },
    "middleItem": {
      "firstValue": {
        "fields": [
          { "fieldPath": "object.textModulesData['row1mid']" }
        ]
      }
    },
    "endItem": {
      "firstValue": {
        "fields": [
          { "fieldPath": "object.textModulesData['row1right']" }
        ]
      }
    }
  }
}
```

### Row Limit Guidelines

- **No hard limit** on number of rows
- **Best practice:** Keep card front uncluttered
- Use **details view** for supplementary info
- Use **messages**, **linksModuleData**, **linkedOfferIds** for additional content

---

## B.6 Predefined Fields by Pass Type

Each Google pass type has **standard predefined fields**:

### Loyalty Pass Fields

| Field | Path | Description |
|-------|------|-------------|
| `accountName` | `object.accountName` | Member name |
| `accountId` | `object.accountId` | Member ID |
| `loyaltyPoints` | `object.loyaltyPoints` | Points with label and balance |
| `secondaryLoyaltyPoints` | `object.secondaryLoyaltyPoints` | Secondary points |
| `rewardsTier` | `class.rewardsTier` | Tier name (Class-level) |
| `rewardsTierLabel` | `class.rewardsTierLabel` | Tier label (Class-level) |

### Offer Pass Fields

| Field | Path | Description |
|-------|------|-------------|
| `title` | `class.title` | Offer title |
| `redemptionCode` | `object.redemptionCode` | Code to redeem |
| `details` | `class.details` | Offer details |

### Gift Card Fields

| Field | Path | Description |
|-------|------|-------------|
| `cardNumber` | `object.cardNumber` | Gift card number |
| `pin` | `object.pin` | PIN |
| `balance` | `object.balance` | Current balance |
| `eventNumber` | `object.eventNumber` | Event/transaction number |

### Event Ticket Fields

| Field | Path | Description |
|-------|------|-------------|
| `eventName` | `class.eventName` | Event name |
| `ticketHolderName` | `object.ticketHolderName` | Attendee name |
| `ticketNumber` | `object.ticketNumber` | Ticket number |
| `seatInfo` | `object.seatInfo` | Section, row, seat, gate |
| `venue` | `class.venue` | Venue name and address |

---

## B.7 Custom Fields: textModulesData

`textModulesData` is the **primary mechanism for custom content** in Google Wallet:

### Structure

```json
{
  "textModulesData": [
    {
      "id": "unique_id_1",
      "header": "POINTS",
      "body": "1,234"
    },
    {
      "id": "unique_id_2",
      "header": "MEMBER SINCE",
      "body": "March 2019"
    },
    {
      "id": "unique_id_3",
      "header": "STATUS",
      "body": "Gold Member"
    }
  ]
}
```

### Class-Level vs Object-Level textModulesData

| Level | Use For | Example |
|-------|---------|---------|
| **Class** | Shared info for all users | "Program benefits", "Welcome message" |
| **Object** | User-specific details | "Jane, you have 500 points" |

### Referencing in Template

```json
{
  "fieldPath": "object.textModulesData['unique_id_1']"
}
{
  "fieldPath": "class.textModulesData['welcome_msg']"
}
```

### Maximums

- **Class level:** No strict limit, but be reasonable
- **Object level:** No strict limit
- **Display limit:** Wallet app may truncate if too many rows

---

## B.8 Images in Google Wallet

Google Wallet uses **Image objects** with URI references:

### Image Object Structure

```json
{
  "logo": {
    "sourceUri": {
      "uri": "https://example.com/logo.png",
      "description": "Optional description"
    },
    "contentDescription": {
      "defaultValue": {
        "language": "en-US",
        "value": "Company Logo"
      }
    }
  }
}
```

### Image Types by Pass

| Image Property | Description | Display |
|----------------|-------------|---------|
| `heroImage` | Banner image at top of card | 100% width |
| `logo` | Company/program logo | Top area, thumbnail size |
| `programLogo` | (Loyalty/Gift) Program logo | Details view |
| `wideLogo` | Wide format logo | List view |
| `securityProgramLogo` | (Flight) Security program logo | Details view |

### imageModulesData

For embedding images in card rows or details:

```json
{
  "imageModulesData": [
    {
      "id": "event_banner",
      "mainImage": {
        "sourceUri": {
          "uri": "https://example.com/banner.jpg"
        },
        "contentDescription": {
          "defaultValue": {
            "language": "en-US",
            "value": "Event Banner"
          }
        }
      }
    }
  ]
}
```

### Image Best Practices

- Use **HTTPS URLs** for all images
- Images are loaded from URLs (not bundled like Apple)
- Ensure images are **publicly accessible**
- Recommended: Host images on your own CDN
- Google caches images; changes may take time to propagate

---

## B.9 Colors

Google Wallet uses **hex color strings**:

### Format

```json
{
  "hexBackgroundColor": "#4285f4",
  "hexBackgroundColor": "#ffcc00",
  "hexBackgroundColor": "#fc0"
}
```

### Formats Supported

| Format | Example | Description |
|--------|---------|-------------|
| Full hex | `#rrggbb` | `#4285f4` |
| Shorthand | `#rgb` | `#fc0` (= `#ffcc00`) |

### Color Inheritance

If `hexBackgroundColor` is **NOT set**:
1. Uses **dominant color of hero image**
2. If no hero image, uses **dominant color of logo**

### Color Application

| Property | Applies To |
|----------|-----------|
| `hexBackgroundColor` (Class) | Default background for all objects of this class |
| `hexBackgroundColor` (Object) | Overrides class color for this specific pass |

---

## B.10 Barcode Configuration

### Barcode Object

```json
{
  "barcode": {
    "type": "QR_CODE",
    "value": "ENCODED_DATA_HERE",
    "alternateText": "Human-readable text",
    "showCodeText": true
  }
}
```

### Barcode Types

| Type | Description |
|------|-------------|
| `QR_CODE` | Standard QR code |
| `AZTEC` | Aztec code |
| `CODE_128` | Linear barcode |
| `PDF_417` | PDF417 2D barcode |
| `DATAMATRIX` | Data Matrix |

### Rotating Barcode (Enhanced Security)

```json
{
  "rotatingBarcode": {
    "type": "ROTATING_BARCODE_TYPE_UNSPECIFIED",
    "totpDetails": {
      "periodMillis": "30000",
      "algorithm": "TOTP_ALGORITHM_UNSPECIFIED",
      "digits": "6"
    },
    "alternateText": "Rotating code"
  }
}
```

### Barcode Section Customization

```json
{
  "classTemplateInfo": {
    "cardBarcodeSectionDetails": {
      "firstBarcodeDetail": {
        "barcodeType": "QR_CODE"
      }
    }
  }
}
```

---

## B.11 Details View (Back of Pass)

The **details view** is Google Wallet's equivalent of Apple's back-of-pass:

### detailsTemplateOverride

```json
{
  "classTemplateInfo": {
    "detailsTemplateOverride": {
      "detailsItemInfos": [
        {
          "item": {
            "firstValue": {
              "fields": [
                { "fieldPath": "class.imageModulesData['event_banner']" }
              ]
            }
          }
        },
        {
          "item": {
            "firstValue": {
              "fields": [
                { "fieldPath": "class.textModulesData['terms']" }
              ]
            }
          }
        },
        {
          "item": {
            "firstValue": {
              "fields": [
                { "fieldPath": "class.linksModuleData.uris['website']" }
              ]
            }
          }
        }
      ]
    }
  }
}
```

### Auto-Details Content

Content referenced in `cardTemplateOverride` that is NOT in a row automatically appears in details:
- `linksModuleData` URIs
- `imageModulesData` images
- Extra `textModulesData` not used in rows

---

## B.12 List View Customization

Customize how pass appears in the Google Wallet app list:

```json
{
  "classTemplateInfo": {
    "listTemplateOverride": {
      "firstRowOption": {
        "fieldOption": {
          "fields": [
            { "fieldPath": "object.cardTitle" }
          ]
        }
      },
      "secondRowOption": {
        "fields": [
          { "fieldPath": "object.subheader" }
        ]
      }
    }
  }
}
```

---

## B.13 JWT Signing & "Add to Google Wallet" Flow

### Two Flows for Creating Passes

| Flow | When to Use | Process |
|------|-------------|---------|
| **Pre-create Object** | High adoption expected | Create object on backend → return JWT with object reference |
| **Lazy Create** | Variable/unknown adoption | Define object in JWT → create on user click |

### JWT Claims Structure

```json
{
  "iss": "service-account@project.iam.gserviceaccount.com",
  "aud": "google",
  "origins": ["https://your-domain.com"],
  "typ": "savetowallet",
  "iat": 1700000000,
  "payload": {
    "genericObjects": [
      { /* complete object */ }
    ],
    "genericClasses": [
      { /* complete class */ }
    ]
  }
}
```

### Signing (Node.js)

```javascript
const jwt = require('jsonwebtoken');

const claims = {
  iss: credentials.client_email,
  aud: 'google',
  origins: ['https://your-domain.com'],
  typ: 'savetowallet',
  payload: {
    genericObjects: [genericObject]
  }
};

const token = jwt.sign(claims, credentials.private_key, { algorithm: 'RS256' });
const saveUrl = `https://pay.google.com/gp/v/save/${token}`;
```

### Signing (Python)

```python
from google.auth import crypt
from google.oauth2 import service_account
import jwt

claims = {
    'iss': credentials.service_account_email,
    'aud': 'google',
    'origins': ['https://your-domain.com'],
    'typ': 'savetowallet',
    'payload': {
        'genericObjects': [generic_object]
    }
}

signer = crypt.RSASigner.from_service_account_file(key_file_path)
token = jwt.encode(signer, claims).decode('utf-8')
save_url = f"https://pay.google.com/gp/v/save/{token}"
```

### "Add to Google Wallet" Button

```html
<a href="https://pay.google.com/gp/v/save/{JWT_TOKEN}">
  <img src="wallet-button.png" alt="Add to Google Wallet">
</a>
```

Or use the official Google Wallet button SDK for Android.

### Required Setup

1. **Google Cloud Project** with Wallet API enabled
2. **Service account** with `wallet_object.issuer` scope
3. **Issuer account** in Google Pay & Wallet Console
4. **Authorize service account** as Developer/Admin in Wallet Console
5. Environment variable: `GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json`

---

## B.14 Smart Tap / NFC

Google Wallet supports **Smart Tap** for NFC redemption:

### Class-Level Configuration

```json
{
  "enableSmartTap": true,
  "redemptionIssuers": ["ISSUER_ID_1", "ISSUER_ID_2"]
}
```

### Object-Level Configuration

```json
{
  "smartTapRedemptionValue": "REDEMPTION_CODE_123",
  "state": "ACTIVE"
}
```

### Requirements

- Terminal must be **Smart Tap certified**
- `enableSmartTap` = true on class
- `redemptionIssuers` must include issuer with Smart Tap key
- `smartTapRedemptionValue` on object (ASCII only)

---

## B.15 State Management

Pass objects have a `state` field controlling visibility:

| State | Behavior |
|-------|----------|
| `ACTIVE` | Normal display in wallet |
| `INACTIVE` | Hidden but not deleted |
| `EXPIRED` | Moved to "Expired passes" section |
| `COMPLETED` | Marked as used/completed |

```json
{
  "state": "ACTIVE"
}
```

---

## B.16 Grouping Passes

Group related passes together:

```json
{
  "groupingInfo": {
    "groupingId": "summer_festival_2024",
    "sortIndex": 1
  }
}
```

| Property | Description |
|----------|-------------|
| `groupingId` | Identifier for the group |
| `sortIndex` | Order within group (lower = first) |

---

## B.17 Links & App Integration

### App Link Data

Display a button on the pass front:

```json
{
  "appLinkData": {
    "androidAppLinkInfo": {
      "appTarget": {
        "targetUri": {
          "uri": "https://yourapp.com/open",
          "description": "Open App"
        }
      }
    },
    "webAppLinkInfo": {
      "appTarget": {
        "targetUri": {
          "uri": "https://yourwebsite.com",
          "description": "Visit Website"
        }
      }
    }
  }
}
```

### Links Module

```json
{
  "linksModuleData": {
    "uris": [
      {
        "uri": "https://example.com/terms",
        "description": "Terms & Conditions",
        "id": "terms_link"
      },
      {
        "uri": "tel:+1234567890",
        "description": "Call Support",
        "id": "support_phone"
      }
    ]
  }
}
```

---

## B.18 Localization

Google Wallet supports localization via `localizedValue` / `translatedValues`:

### Localized String Structure

```json
{
  "cardTitle": {
    "defaultValue": {
      "language": "en-US",
      "value": "Loyalty Card"
    },
    "translatedValues": [
      {
        "language": "es-ES",
        "value": "Tarjeta de Fidelidad"
      },
      {
        "language": "fr-FR",
        "value": "Carte de Fidélité"
      }
    ]
  }
}
```

### Localizable Fields

Most text fields support localization:
- `cardTitle`
- `header`
- `subheader`
- `textModulesData[].header`
- `textModulesData[].body`
- `linksModuleData.uris[].description`
- `imageModulesData[].contentDescription`

---

# Appendix C: Unified Platform Mapping

## C.1 Pass Type Crosswalk

| Loyallia Type | Apple PassKit | Google Wallet | Notes |
|--------------|---------------|---------------|-------|
| `stamp` | `storeCard` | `loyalty` | Classic stamp/loyalty card |
| `cashback` | `storeCard` | `loyalty` | Points-based cashback |
| `coupon` | `coupon` | `offer` | Direct mapping both platforms |
| `affiliate` | `generic` | `generic` | Flexible fallback |
| `discount` | `coupon` | `offer` | Discount = coupon/offer |
| `gift_certificate` | `storeCard` | `giftCard` | Gift cards map well |
| `vip_membership` | `generic`/`storeCard` | `loyalty` | VIP = loyalty tier |
| `corporate_discount` | `coupon` | `offer` | Corporate = offer variant |
| `referral_pass` | `generic` | `generic` | Custom layout needed |
| `multipass` | `generic` | `generic` | Multi-purpose flexibility |

## C.2 Feature Parity Matrix

| Feature | Apple PassKit | Google Wallet | Our Approach |
|---------|:-----------:|:-------------:|--------------|
| **Images** | | | |
| Logo | ✅ `logo.png` | ✅ `logo` | Unified: single logo upload |
| Hero/Strip | ✅ `strip.png` / `background.png` | ✅ `heroImage` | Design as "hero" concept |
| Icon | ✅ `icon.png` | ✅ Inferred from app | Apple requires explicit; Google uses app icon |
| Thumbnail | ✅ `thumbnail.png` | ❌ Not available | Apple-only feature |
| Footer | ✅ `footer.png` (boarding only) | ❌ Not available | Apple-only feature |
| **Fields** | | | |
| Header fields | ✅ Up to 3 | ✅ Via template | Map to top row |
| Primary field | ✅ 1 (2 boarding) | ✅ Via template | Map to prominent display |
| Secondary fields | ✅ Up to 4 | ✅ Via template | Map to middle rows |
| Auxiliary fields | ✅ Up to 4 | ✅ Via template | Map to bottom rows |
| Back/Details | ✅ `backFields` | ✅ `detailsTemplateOverride` | Unified "details" concept |
| Custom fields | ✅ Extensible | ✅ `textModulesData` | Use textModulesData pattern |
| **Barcodes** | | | |
| QR Code | ✅ | ✅ | Universal support |
| PDF417 | ✅ | ✅ | Universal support |
| Aztec | ✅ | ✅ | Universal support |
| Code 128 | ✅ | ✅ | Universal support |
| Rotating/Dynamic | ❌ | ✅ | Google advantage |
| **Colors** | | | |
| Background | ✅ `rgb(r,g,b)` | ✅ `#hex` | Convert between formats |
| Foreground/Text | ✅ `foregroundColor` | ✅ Inferred / class-level | Apple explicit; Google inferred |
| Label color | ✅ `labelColor` | ✅ Inferred | Apple explicit; Google inferred |
| Auto colors | ✅ iOS 18 poster | ✅ From hero image | Both support auto now |
| **Layout** | | | |
| Custom layout | ❌ Fixed per style | ✅ Full template override | Google more flexible |
| Row control | ❌ Fixed | ✅ `cardRowTemplateInfos` | Abstract rows for both |
| **NFC** | | | |
| NFC support | ✅ (entitlement required) | ✅ Smart Tap | Both supported |
| **Distribution** | | | |
| .pkpass file | ✅ Bundle + signature | ❌ | Apple-specific |
| JWT link | ❌ | ✅ `pay.google.com/gp/v/save/` | Google-specific |
| REST API | ❌ | ✅ Direct API | Google advantage |
| Push updates | ✅ Web service + APNs | ✅ REST API patch | Different mechanisms |
| **Other** | | | |
| Location relevance | ✅ | ✅ | Both supported |
| Beacons | ✅ | ❌ | Apple-only |
| Grouping | ✅ `groupingIdentifier` | ✅ `groupingInfo` | Both supported |
| Expiration | ✅ `expirationDate` | ✅ `validTimeInterval` | Both supported |
| Void/Redeemed | ✅ `voided` | ✅ `state` | Different mechanisms |
| Localization | ✅ `.lproj` folders | ✅ `translatedValues` | Different mechanisms |
| Share control | ✅ `sharingProhibited` | ❌ | Apple-only |
| App linking | ✅ `appLaunchURL` | ✅ `appLinkData` | Both supported |

## C.3 Image Asset Mapping

| Unified Concept | Apple Asset | Google Asset | Upload Once |
|----------------|-------------|--------------|:-----------:|
| **Logo** | `logo.png` | `logo` | ✅ |
| **Hero/Strip** | `strip.png` or `background.png` | `heroImage` | ✅ |
| **Icon** | `icon.png` | (inferred) | ⚠️ Apple only |
| **Thumbnail** | `thumbnail.png` | N/A | ⚠️ Apple only |
| **Footer** | `footer.png` | N/A | ⚠️ Apple only |
| **Secondary Logo** | `secondaryLogo.png` (iOS 18) | N/A | ⚠️ Apple only |
| **Venue Map** | `venueMap.png` (iOS 18) | N/A | ⚠️ Apple only |

## C.4 Field Mapping Strategy

### Unified Field Model → Apple Mapping

| Unified Field | Apple Location | Notes |
|--------------|----------------|-------|
| `title` | `logoText` or primaryFields[0] | Use logoText for brand name |
| `subtitle` | `primaryFields[0].label` | |
| `primaryValue` | `primaryFields[0].value` | |
| `secondary1Label` | `secondaryFields[0].label` | |
| `secondary1Value` | `secondaryFields[0].value` | |
| `secondary2Label` | `secondaryFields[1].label` | |
| `secondary2Value` | `secondaryFields[1].value` | |
| `aux1Label` | `auxiliaryFields[0].label` | |
| `aux1Value` | `auxiliaryFields[0].value` | |
| `header1` | `headerFields[0]` | |
| `barcodeValue` | `barcode.message` | |
| `barcodeAltText` | `barcode.altText` | |
| `backContent` | `backFields[]` | Array of fields |

### Unified Field Model → Google Mapping

| Unified Field | Google Location | Notes |
|--------------|-----------------|-------|
| `title` | `cardTitle` or `header` | |
| `subtitle` | `subheader` | |
| `primaryValue` | `textModulesData['primary']` | Via template |
| `secondary1Label` | `textModulesData['sec1'].header` | |
| `secondary1Value` | `textModulesData['sec1'].body` | |
| `secondary2Label` | `textModulesData['sec2'].header` | |
| `secondary2Value` | `textModulesData['sec2'].body` | |
| `aux1Label` | `textModulesData['aux1'].header` | |
| `aux1Value` | `textModulesData['aux1'].body` | |
| `header1` | `textModulesData['header1']` | Via template top row |
| `barcodeValue` | `barcode.value` | |
| `barcodeAltText` | `barcode.alternateText` | |
| `backContent` | `textModulesData[]` in details | |

## C.5 Color System Alignment

| Our System | Apple Format | Google Format | Conversion |
|-----------|--------------|---------------|------------|
| `#RRGGBB` | `rgb(R, G, B)` | `#RRGGBB` | Apple: hex → rgb() |
| `#RGB` | `rgb(R, G, B)` | `#RGB` | Apple shorthand → full |
| With alpha | Not supported | Not supported | Ignore alpha |

**Conversion Formula:**
```
#4285f4 → rgb(66, 133, 244)
#fc0    → rgb(255, 204, 0)
```

## C.6 Barcode Alignment

| Format | Apple Constant | Google Type | Supported |
|--------|---------------|-------------|:---------:|
| QR Code | `PKBarcodeFormatQR` | `QR_CODE` | ✅ Both |
| PDF417 | `PKBarcodeFormatPDF417` | `PDF_417` | ✅ Both |
| Aztec | `PKBarcodeFormatAztec` | `AZTEC` | ✅ Both |
| Code 128 | `PKBarcodeFormatCode128` | `CODE_128` | ✅ Both |

---

# Appendix D: Image Specifications Master Matrix

| Image | Apple File | Google Property | Dimensions | Format | Required | Retina |
|-------|-----------|-----------------|------------|--------|:--------:|:------:|
| **Logo** | `logo.png` | `logo` | 160×50 pt (Apple) | PNG/JPEG | ✅ Apple<br>⚪ Google | @2x, @3x |
| **Hero/Strip** | `strip.png` | `heroImage` | 375×123 pt max (Apple)<br>Full width (Google) | PNG/JPEG | ⚪ Optional | @2x, @3x |
| **Background** | `background.png` | N/A | 180×220 pt (Apple) | PNG/JPEG | ⚪ Optional | @2x, @3x |
| **Icon** | `icon.png` | N/A | 29×29 pt | PNG | ✅ Apple only | @2x, @3x |
| **Thumbnail** | `thumbnail.png` | N/A | 90×90 pt | PNG/JPEG | ⚪ Apple only | @2x, @3x |
| **Footer** | `footer.png` | N/A | 286×15 pt | PNG/JPEG | ⚪ Apple only | @2x, @3x |
| **Secondary Logo** | `secondaryLogo.png` | N/A | TBD (iOS 18) | PNG/JPEG | ⚪ Apple only | @2x, @3x |
| **Venue Map** | `venueMap.png` | N/A | TBD (iOS 18) | PNG/JPEG | ⚪ Apple only | @2x, @3x |
| **Wide Logo** | N/A | `wideLogo` | TBD | PNG/JPEG | ⚪ Google only | N/A |

### Smart Image Pipeline Requirements

| Feature | Apple | Google | Our Implementation |
|---------|-------|--------|-------------------|
| Auto-generate @2x | Required | N/A | ✅ Sharp.js resize |
| Auto-generate @3x | Required | N/A | ✅ Sharp.js resize |
| WebP → PNG conversion | Recommended | Recommended | ✅ Sharp.js |
| Size validation | Enforced | Recommended | ✅ Check dimensions |
| Dominant color extraction | N/A | Auto background | ✅ node-vibrant |
| Blur preview | iOS does it | N/A | ✅ CSS filter |

---

# Appendix E: Implementation Checklist

## E.1 Backend (Django) Requirements

- [ ] Pass generation service for Apple (.pkpass bundle creation)
- [ ] Pass generation service for Google (Class + Object REST API)
- [ ] Image processing pipeline (Sharp.js or Python Pillow)
- [ ] JWT signing for Google Wallet (RS256)
- [ ] Apple certificate management (passTypeIdentifier, signing cert, WWDR)
- [ ] Google service account management
- [ ] Pass update/patch endpoints for both platforms
- [ ] Template storage and versioning
- [ ] Design quality scoring algorithm
- [ ] AI design assistant API integration (Kimi K2.6)

## E.2 Frontend (Next.js) Requirements

- [ ] Template gallery page
- [ ] Wallet Studio canvas component
- [ ] Layer system (Canvas, Image, Text, Barcode)
- [ ] Property sidebar (Images, Content, Barcode, Colors)
- [ ] Toolbar with AI button
- [ ] Real-time preview (Apple + Google modes)
- [ ] Device preview toggle (phone bezel)
- [ ] Undo/redo system (command pattern)
- [ ] Auto-save with debounce
- [ ] Smart image upload with validation
- [ ] Color picker with hex/rgb conversion
- [ ] Design quality score display
- [ ] AI assistant chat panel
- [ ] Template save/load
- [ ] Export functionality

## E.3 AI Integration Requirements

- [ ] Kimi K2.6 API connection
- [ ] Prompt engineering for pass design
- [ ] Design generation from natural language
- [ ] Design critique and scoring
- [ ] Color palette suggestions
- [ ] Image generation/coordination
- [ ] Field layout recommendations

## E.4 Testing Requirements

- [ ] iOS Simulator pass testing
- [ ] Android device pass testing
- [ ] Cross-browser canvas compatibility
- [ ] Image upload validation tests
- [ ] Color conversion accuracy tests
- [ ] Template migration tests (v1 → v2)
- [ ] AI generation quality tests
- [ ] Performance benchmarks (canvas render < 16ms)

---

> **END OF SRS-004**
>
> **Next Documents to Review:**
> - SRS-001: Requirements & Scope
> - SRS-002: Architecture & State Model
> - SRS-003: UI Specifications & Mockups
>
> **Status:** ⏳ Awaiting User Approval Before Coding
