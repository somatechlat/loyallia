---
title: "Wallet Platform Design Specifications — Apple Wallet & Google Wallet"
document_id: "LOYALLIA-SRS-WPS-012"
version: "1.0"
status: "approved"
last_updated: "2026-09-17"
author: "Engineering Lead"
owner: "Engineering Lead"
approver: "Product Owner"
classification: "Internal Use"
confidentiality: "Internal — Restricted to Engineering and QA teams"
review_cycle: "Upon each major release, or quarterly (whichever comes first)"
standard: "ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011"
parent_document: "LOYALLIA-SRS-001"
---

## DOCUMENT CONTROL

| Field | Details |
|-------|---------|
| **Document ID** | LOYALLIA-SRS-WPS-012 |
| **Title** | Wallet Platform Design Specifications — Apple Wallet & Google Wallet |
| **Version** | 1.0 |
| **Date** | 2026-09-17 |
| **Author** | Engineering Lead |
| **Approver** | Product Owner |
| **Owner** | Engineering Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and QA teams |
| **Review Cycle** | Upon each major release, or quarterly (whichever comes first) |
| **Status** | approved |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011|
| **Parent Document** | LOYALLIA-SRS-001 |
| **Supersedes** | N/A |
| **Language** | English |
| **Format** | Markdown (.md) |
| **Location** | `docs/06-planning/wallet-studio/SRS-012-WALLET-PLATFORM-DESIGN-SPECIFICATIONS.md` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-09-17 | Engineering Lead | Initial comprehensive wallet platform design specifications |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Engineering Lead | Author / Owner | Maintains document |
| QA Lead | Reviewer | Test validation |
| Product Owner | Approver | Business validation |
| Design Team | Reviewer | Visual design reference |

### Related Documents

| Document ID | Title | Relationship |
|-------------|-------|-------------|
| LOYALLIA-SRS-001 | Main SRS | Parent |
| LOYALLIA-SRS-WPS-001 | Wallet Studio Requirements | Sibling |
| LOYALLIA-SRS-WPS-002 | Wallet Studio Architecture | Sibling |
| LOYALLIA-SRS-WPS-003 | Wallet Studio UI Specifications | Sibling |
| LOYALLIA-SRS-WPS-006 | Card Type Visual Customization | Sibling |
| LOYALLIA-DOC-APPLE_WALLET_WEB_PKPASS_NFC.MD | Apple Wallet Architecture | Reference |

### Change Control Process

1. All changes to this document MUST be recorded in the Revision History table above.
2. Status transitions: `draft` → `review` → `approved` → `active` → `deprecated` → `archived`.
3. Changes after `approved` status require a new version number and re-approval.
4. Minor corrections (typos, formatting) increment the minor version (e.g., 1.0 → 1.1).
5. Major changes (new requirements, scope changes) increment the major version (e.g., 1.0 → 2.0).
6. Deprecated docs MUST be moved to `docs/09-archive/` with a deprecation notice.
7. All dates in this document use ISO 8601 format (`YYYY-MM-DD`).

## DOCUMENT APPROVAL

| Role | Name | Signature | Date | Decision |
|------|------|-----------|------|----------|
| Engineering Lead | — | — | 2026-09-17 | Approved |
| Product Owner | — | — | — | Pending Review |
| QA Lead | — | — | — | Pending Review |

### Document Lifecycle

| State | Date | Actor | Notes |
|-------|------|-------|-------|
| Draft | 2026-09-17 | Engineering Lead | Initial comprehensive specifications |
| Approved | 2026-09-17 | Engineering Lead | Document approved for use |

### Next Review Date

| Trigger | Date | Notes |
|---------|------|-------|
| Quarterly review | 2026-12-31 | End of year review cycle |
| Major release | — | Triggered by major platform release |

---

# Wallet Platform Design Specifications

**Sources:** Apple Developer Documentation (WalletPasses framework), Google Wallet Developer Documentation (loyalty-cards API reference, brand guidelines, pass customization guide, template reference, Smart Tap documentation).

---

## 1. Apple Wallet — Image Specifications

All dimensions are in **points**. Multiply by 2 for @2x, by 3 for @3x. Provide all three variants (`image.png`, `image@2x.png`, `image@3x.png`).

| Image | Filename | Dimensions (points) | Format | Required | Notes |
|-------|----------|---------------------|--------|----------|-------|
| Icon | `icon.png` | **29 × 29** | PNG | YES | Required. Used in notifications, lock screen, email attachments. |
| Logo | `logo.png` | **160 × 50** | PNG | No | Top-left of pass, next to `logoText`. |
| Strip | `strip.png` | **375 × 123** (storeCard) | PNG | No | Behind primary fields. Dimensions vary by pass style. |
| Thumbnail | `thumbnail.png` | **90 × 90** | PNG | No | NOT supported on storeCard or coupon. |
| Background | `background.png` | **180 × 220** | PNG | No | Blurred. NOT supported on storeCard or coupon. |
| Footer | `footer.png` | **286 × 15** | PNG | No | Near barcode. boardingPass only. |

### Strip Image Dimensions by Pass Style

| Pass Style | iPhone 6+ (375pt) | Prior HW (320pt) |
|-----------|-------------------|-----------------|
| storeCard | 375 × **123** | 320 × **123** |
| coupon | 375 × **144** | 320 × **110** (3.5" sq barcode) |
| eventTicket | 375 × **98** | 320 × **84** |
| generic | 375 × **123** | 320 × **123** |

### storeCard Supported Images

- icon.png (required)
- logo.png
- strip.png
- NOT: thumbnail.png, background.png, footer.png

### Image Behavior

- Images are scaled preserving aspect ratio to fill allotted space, then cropped if aspect ratio doesn't match.
- Provide @1x, @2x, and @3x versions for all screen densities.
- Background images are blurred — smaller images can be scaled up since blur hides detail.
- Apple Watch does NOT display strip image, thumbnail, or back of pass.

---

## 2. Apple Wallet — Color Specifications

Colors are specified at the top level of `pass.json` as CSS-style RGB strings:

```
"foregroundColor": "rgb(222, 173, 40)"
"backgroundColor": "rgb(24, 44, 82)"
"labelColor": "rgb(255, 255, 255)"
```

| Key | Purpose | Format | Default |
|-----|---------|--------|---------|
| `backgroundColor` | Background of front and back. Ignored if background image provided. | `rgb(R, G, B)` | System-chosen |
| `foregroundColor` | Field values on front | `rgb(R, G, B)` | System-chosen |
| `labelColor` | Field labels on front | `rgb(R, G, B)` | System-chosen |

### Color Rules

- Only these three colors are customizable.
- No alpha/transparency channel is supported.
- No hex format (`#RRGGBB`) — must use `rgb(R, G, B)` format.
- `backgroundColor` is overridden when a `background.png` is present.
- Colors affect front AND back of pass.

---

## 3. Apple Wallet — Field Layout Rules

### Field Groups

| Group | Key | Position | Purpose |
|-------|-----|----------|---------|
| Header | `headerFields` | Top-right corner | Highly salient info. Only fields visible when passes are stacked. |
| Primary | `primaryFields` | Large prominent area | Most important information. |
| Secondary | `secondaryFields` | Below primary | Supporting information. |
| Auxiliary | `auxiliaryFields` | Below/beside secondary | Additional information. |
| Back | `backFields` | Back of pass (flip to view) | Terms, conditions, contact info. Unlimited. |

### Maximum Fields Per Group (by Pass Style)

| Pass Style | Header | Primary | Secondary | Auxiliary | Sec+Aux Combined |
|-----------|--------|---------|-----------|-----------|-----------------|
| **storeCard** | Up to 3 | 1 | Up to 4 | Up to 4 | **Up to 4 total** |
| **coupon** | Up to 3 | 1 | Up to 4 | Up to 4 | **Up to 4 total** |
| eventTicket | Up to 3 | 1 | Up to 4 | Up to 4 | No combined limit |
| generic | Up to 3 | 1 | Up to 4 | Up to 4 | **Up to 8 total** (separate sections) |
| boardingPass | Up to 3 | **2** | Up to 4 | **5** | No combined limit |

**CRITICAL:** storeCard and coupon have a COMBINED limit of 4 for secondary + auxiliary fields. This is the most common source of field overflow bugs.

### storeCard Layout

```
+---------------------------------------------+
| [Logo]  [Logo Text]        [Header Field 1]  |
|                            [Header 2]        |
|                            [Header 3]        |
+---------------------------------------------+
|         [Primary Field - large]              |
|         [or Strip Image here]                |
+---------------------------------------------+
| [Secondary] [Secondary] [Auxiliary] [Aux]    |  <- Combined row, max 4 total
+---------------------------------------------+
|              [Barcode]                       |
+---------------------------------------------+
```

### Field Content Specifications

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `key` | String | YES | Unique identifier for the field |
| `value` | String/Number/Date | YES | The value displayed. Dates must be ISO 8601. |
| `label` | String | No | Text displayed above/before the value |
| `textAlignment` | String | No | `PKTextAlignmentLeft/Center/Right/Natural` |
| `dateStyle` | String | No | `PKDateStyleNone/Short/Medium/Long/Full` |
| `currencyCode` | String | No | ISO 4217 currency code |
| `changeMessage` | String | No | Format string for update notifications |

### Typography Rules

- Custom fonts are NOT supported — system San Francisco font only.
- Font sizes are system-controlled based on field group.
- Primary fields: largest. Header fields: smallest.
- Content length auto-decreases font size (especially back fields).
- `logoText` is displayed next to logo image; truncated if too long.

---

## 4. Apple Wallet — Barcode Specifications

### Supported Formats

| Format | Constant | iOS | watchOS |
|--------|----------|-----|---------|
| QR Code | `PKBarcodeFormatQR` | 9.0+ | 2.0+ |
| PDF417 | `PKBarcodeFormatPDF417` | 9.0+ | 2.0+ |
| Aztec | `PKBarcodeFormatAztec` | 9.0+ | 2.0+ |
| Code 128 | `PKBarcodeFormatCode128` | 9.0+ | NOT on watchOS |
| Code 39 | `PKBarcodeFormatCode39` | 9.0+ | 2.0+ |
| EAN-13 | `PKBarcodeFormatEAN13` | 9.0+ | 2.0+ |

### Barcode JSON Structure

```json
"barcodes": [
    {
        "message": "123456789012",
        "format": "PKBarcodeFormatQR",
        "messageEncoding": "iso-8859-1",
        "altText": "123456789012"
    }
]
```

### Barcode Rules

- `barcodes` is an array — allows fallback barcodes. Wallet displays the first supported.
- `messageEncoding`: Typically `iso-8859-1`. Unicode poorly supported by scanners.
- The deprecated single `barcode` key is for iOS 8 compatibility only.
- Always provide a QR fallback for Apple Watch compatibility.
- No explicit pixel size control — Wallet auto-sizes.

---

## 5. Apple Wallet — Required Top-Level Keys

| Key | Required | Description |
|-----|----------|-------------|
| `formatVersion` | YES | Always `1` |
| `passTypeIdentifier` | YES | Reverse DNS, starts with `pass.` |
| `serialNumber` | YES | Unique within pass type |
| `teamIdentifier` | YES | Apple Developer Team ID (10 chars) |
| `organizationName` | YES | Displayed on lock screen |
| `description` | YES | VoiceOver accessibility text |

---

## 6. Apple Wallet — Location and NFC

- Locations: Up to 10. Interpreted with small radius (~100m).
- Beacons: Up to 10 BLE beacon UUIDs.
- NFC: Requires special entitlement from Apple. NDEF message max 64 bytes.
- `relevantDate`: NOT supported on storeCard for time-based relevance.

---

## 7. Google Wallet — Image Specifications

| Image | Field | Minimum Size | Aspect Ratio | Notes |
|-------|-------|-------------|-------------|-------|
| Hero Image | `heroImage` | **1032 × 812 px** | 5:4 | Full-width under data fields. Include 20dp padding. |
| Program Logo | `programLogo` | **660 × 660 px** | 1:1 (square) | Masked to circle. 15% margin safe area. Required. |
| Wide Logo | `wideProgramLogo` | **1280 × 400 px** | 16:5 | Transparent PNG. Replaces standard header on Android. |
| Image Module | `imageModulesData` | **1860 px wide** | Variable | Below hero image. Max 1 per class + 1 per object. |
| Above Barcode | `firstTopDetail` | **80 px tall** | Variable | Max 20dp height. |
| Below Barcode | `firstBottomDetail` | **80 px tall** | Variable | Max 20dp height. |

### Image Rules

- Hero: Use square or near-square images. Include 20dp padding. Do NOT embed text.
- Logo: Do NOT pre-mask to circles (Google does this). Leave square with full-bleed background.
- Wide Logo: Must be transparent PNG. Use very light on dark, very dark on light.
- Object-level heroImage takes precedence over class-level.

---

## 8. Google Wallet — Color Specifications

| Spec | Value |
|------|-------|
| **Format** | `#rrggbb` (hex RGB triplet) |
| Shorthand | Also accepts `#rgb` |
| Fallback | If not set → dominant color of heroImage → dominant color of logo |

### Recommended Colors

| Color | Hex Code |
|-------|----------|
| Dark gray | `#1a1a1a` |
| Medium gray | `#677088` |
| Light gray | `#e8eaed` |
| White | `#ffffff` |
| Red | `#d6322d` |
| Orange | `#f78f48` |
| Yellow | `#f9bb2d` |
| Green | `#1e7e3b` |
| Blue | `#216acf` |
| Purple | `#9147df` |

### Colors to AVOID

- Neon green `#00FF00`, electric cyan `#00FFFF` — cause eye strain and text "bleeding".

---

## 9. Google Wallet — Field Layout Rules

### Row Configuration

| Spec | Value |
|------|-------|
| Max rows | **3 rows** in `cardRowTemplateInfos[]` |
| Recommended | **2 rows** max |
| Items per row | `oneItem`, `twoItems`, or `threeItems` |
| Best practice | Limit to 2 fields per row |

### Text Character Limits

| Field | Max Characters |
|-------|---------------|
| `programName` | **20 chars** (ellipsis after) |
| `issuerName` | **20 chars** recommended |
| Field label | **< 20 characters** |
| Field data | **< 15 characters** |
| `loyaltyPoints.balance` | **7 characters** |
| `rewardsTier` | **7 characters** |
| Notification title | **< 29 characters** |
| Notification body | **< 80 characters** |

### Data Module Limits

| Module | Max |
|--------|-----|
| `textModulesData` | 10 per class + 10 per object = 20 total |
| `imageModulesData` | 1 per class + 1 per object = 2 total |
| `linksModuleData` | Up to 4 URIs total |
| `messages` | Max 10 per class/object |
| `merchantLocations` | Max 10 per class/object |

---

## 10. Google Wallet — Barcode Specifications

### Supported Types

- `QR_CODE`, `PDF_417`, `AZTEC`, `CODE_128`, `CODE_39`, `EAN_8`, `EAN_13`, `ITF_14`, `UPC_A`, `CODABAR`

### Barcode Rules

- If barcode not defined, `accountId` is used as fallback.
- `alternateText` falls back to `accountId` then `barcode.value`.
- Rotating barcode supported for security-sensitive applications.

---

## 11. Google Wallet — Class vs Object Structure

### LoyaltyClass (Template — shared across all users)

**Required Fields:**
| Field | Description |
|-------|-------------|
| `id` | Unique. Format: `{issuerId}.{classSuffix}` |
| `issuerName` | Required. Max 20 chars. |
| `programName` | Required. Max 20 chars. |
| `programLogo` | Required. 660×660 px minimum. |
| `reviewStatus` | Required. `UNDER_REVIEW` when ready. |

### LoyaltyObject (Per-user instance)

**Required Fields:**
| Field | Description |
|-------|-------------|
| `id` | Unique. Format: `{issuerId}.{objectSuffix}` |
| `classId` | References parent LoyaltyClass. Must be approved. |
| `state` | `ACTIVE`, `INACTIVE`, `EXPIRED` |

### Review Status Lifecycle

| Status | Description | Can Create Objects? |
|--------|-------------|-------------------|
| `DRAFT` | Under development | NO |
| `UNDER_REVIEW` | Submitted | Auto-sets to APPROVED |
| `APPROVED` | Approved | YES |
| `REJECTED` | Rejected | NO |

Once changed from `DRAFT`, cannot go back to `DRAFT`.

---

## 12. Google Wallet — Smart Tap (NFC)

| Requirement | Value |
|-------------|-------|
| Class-level | `enableSmartTap: true` |
| Class-level | `redemptionIssuers[]` — authorized issuer IDs |
| Object-level | `smartTapRedemptionValue` — ASCII NFC value |
| Certification | Terminal must be certified by Google |

---

## 13. Loyallia Implementation Mapping

### Current Backend Settings

| Setting | Value | Apple Spec | Correct? |
|---------|-------|-----------|----------|
| `PASS_APPLE_ICON_SMALL` | 29 | 29×29 | YES |
| `PASS_APPLE_ICON_MEDIUM` | 58 | 58×58 (@2x) | YES |
| `PASS_APPLE_LOGO_WIDTH` | 160 | 160pt | YES |
| `PASS_APPLE_LOGO_HEIGHT` | 50 | 50pt | YES |
| `PASS_APPLE_STRIP_WIDTH` | 375 | 375pt (storeCard) | YES |
| `PASS_APPLE_STRIP_HEIGHT` | 123 | 123pt (storeCard) | YES |
| Color format | `rgb(R, G, B)` | `rgb(R, G, B)` | YES |

### Current Frontend Constants

| Constant | Value | Apple Spec | Correct? |
|----------|-------|-----------|----------|
| `maxHeaderFields` (stamp) | 3 | Up to 3 | YES |
| `maxPrimaryFields` (stamp) | 1 | 1 | YES |
| `maxSecondaryFields` (stamp) | 4 | Up to 4 | YES |
| `maxAuxiliaryFields` (stamp) | 5 | Up to 4 combined | **NO — should be 4 combined** |
| `maxBackFields` (stamp) | 8 | Unlimited | Conservative (OK) |

### Issues Found

1. **storeCard secondary+auxiliary combined limit**: Current code allows 4 secondary + 5 auxiliary = 9 fields. Apple allows max 4 COMBINED. Need to add combined limit validation.
2. **Google Wallet hero image dimensions**: Current preview uses 16:7 ratio. Google spec says 5:4 (1032×812). Need to update preview.
3. **Google Wallet logo should be circular**: Current preview uses rounded rectangle. Google masks to circle. Need to update preview.
4. **No barcode format for DATA_MATRIX**: Defined in types but not shown in BarcodeTab UI.
5. **Back field drag-and-drop**: Visual handles present but no functional implementation.

---

## DOCUMENT APPROVAL

| Role | Name | Signature | Date | Decision |
|------|------|-----------|------|----------|
| Engineering Lead | — | — | 2026-09-17 | Approved |
| Product Owner | — | — | — | Pending Review |
| QA Lead | — | — | — | Pending Review |

### Document Lifecycle

| State | Date | Actor | Notes |
|-------|------|-------|-------|
| Draft | 2026-09-17 | Engineering Lead | Initial comprehensive specifications |
| Approved | 2026-09-17 | Engineering Lead | Document approved for use |

### Next Review Date

| Trigger | Date | Notes |
|---------|------|-------|
| Quarterly review | 2026-12-31 | End of year review cycle |
| Major release | — | Triggered by major platform release |
