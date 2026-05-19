# Wallet Pass Creation — Full Audit & Remediation Plan

**Date:** 2026-05-18  
**Auditor:** Kimi Code CLI  
**Sources:**
- Google Wallet Retail Loyalty Cards: https://developers.google.com/wallet/retail/loyalty-cards/use-cases/pass-customization
- Apple PassKit Documentation (referenced in codebase)
- Loyallia codebase: `backend/apps/customers/pass_engine/`, `frontend/src/components/programs/`

---

## Executive Summary

After deep review of the official Google Wallet and Apple PassKit documentation against the Loyallia implementation, **many critical customization features are missing or only partially implemented**. The backend generates functional passes, but the UI exposes almost none of the design parameters that both platforms support. Apple and Google parameters are visually separated in the UI, but both panels are essentially **read-only info cards** — users cannot actually customize the pass layout, fields, or most image dimensions per platform.

**Two critical bugs were fixed during this audit:**
1. ✅ **CSP blocking Google Fonts** — `style-src` now allows `https://fonts.googleapis.com`
2. ✅ **Google Wallet ignoring barcode type** — Now dynamically maps all 5 barcode types instead of hardcoding `QR_CODE`

---

## 1. Google Wallet — Full Feature Audit

### 1.1 What Google Wallet Docs Say You Can Customize

Per the official Google Wallet Retail Loyalty Cards customization guide:

#### A. `cardTemplateOverride` (PRIMARY LAYOUT TOOL)
The foundation of Google Wallet pass design. Defined in the **Class** resource.

```json
{
  "classTemplateInfo": {
    "cardTemplateOverride": {
      "cardRowTemplateInfos": [
        {
          "oneItem": { "item": { "firstValue": { "fields": [{"fieldPath": "object.accountName"}] } } }
        },
        {
          "threeItems": {
            "startItem": { "firstValue": { "fields": [{"fieldPath": "object.loyaltyPoints.label"}, {"fieldPath": "object.loyaltyPoints.balance"}] } } },
            "middleItem": { "firstValue": { "fields": [{"fieldPath": "class.rewardsTierLabel"}, {"fieldPath": "class.rewardsTier"}] } } },
            "endItem": { "firstValue": { "fields": [{"fieldPath": "object.secondaryLoyaltyPoints.label"}, {"fieldPath": "object.secondaryLoyaltyPoints.balance"}] } } }
          }
        }
      ]
    }
  }
}
```

**Row types supported:** `oneItem`, `twoItems`, `threeItems`  
**Field references:** `class.*` (shared), `object.*` (per-user), `object.textModulesData['id']` (custom)

#### B. Predefined Wallet Fields
Standard properties rendered consistently by Wallet:
- `object.accountName` — Customer name
- `object.loyaltyPoints.label` + `object.loyaltyPoints.balance` — Primary points
- `object.secondaryLoyaltyPoints.label` + `object.secondaryLoyaltyPoints.balance` — Secondary points
- `class.rewardsTierLabel` + `class.rewardsTier` — Tier name (e.g., "Gold")
- `object.validTimeInterval.start.date` — With `dateFormat`: `DATE_ONLY`, `DATE_TIME`, `TIME_ONLY`

#### C. Developer-Defined Fields (`textModulesData`)
Custom data fields for unique information:
```json
{
  "textModulesData": [
    {"header": "Visits", "body": "17", "id": "row1left"},
    {"header": "Member since", "body": "Mar 01, 2017", "id": "mem_since"}
  ]
}
```
Referenced in template as: `object.textModulesData['row1left']`

#### D. Other Template Overrides
- `listTemplateOverride` — Row layout in Google Wallet app list view
- `detailsTemplateOverride` — Layout of "Pass details" (back of pass)
- `cardBarcodeSectionDetails` — Customizes the barcode section

#### E. Images
- `heroImage` — Full-width banner (all class types)
- `wideLogo` — Wide logo at top
- `programLogo` / `titleImage` — Square logo
- `imageModulesData` — Additional images (shown in details view)

#### F. Other Class Fields
- `hexBackgroundColor` — Card background
- `enableSmartTap` — NFC tap support
- `multipleDevicesAndHoldersAllowedStatus` — `ONE_USER_ALL_DEVICES` | `ONE_USER_ONE_DEVICE` | `MULTIPLE_USERS`
- `locations` — Geofencing for automatic display
- `linksModuleData` — Custom links (website, terms, etc.)

---

### 1.2 What Loyallia Actually Implements (Google)

| Feature | Google Docs | Loyallia Backend | Loyallia UI | Status |
|---------|-------------|------------------|-------------|--------|
| `cardTemplateOverride` | ✅ Full row builder | ❌ **NOT IMPLEMENTED** | ❌ Info text only | 🔴 **CRITICAL GAP** |
| `classTemplateInfo` | ✅ Full template info | ❌ **NOT IMPLEMENTED** | ❌ Not shown | 🔴 **CRITICAL GAP** |
| `listTemplateOverride` | ✅ List view layout | ❌ **NOT IMPLEMENTED** | ❌ Not shown | 🔴 **GAP** |
| `detailsTemplateOverride` | ✅ Details view layout | ❌ **NOT IMPLEMENTED** | ❌ Not shown | 🔴 **GAP** |
| `cardBarcodeSectionDetails` | ✅ Barcode section | ❌ **NOT IMPLEMENTED** | ❌ Not shown | 🔴 **GAP** |
| `textModulesData` | ✅ Custom fields | ⚠️ Static branding only | ❌ Not editable | 🔴 **GAP** |
| `linksModuleData` | ✅ Custom links | ⚠️ Static links only | ❌ Not editable | 🔴 **GAP** |
| `heroImage` | ✅ Full-width banner | ✅ From `strip_image_url` | ✅ Generic "Hero" upload | 🟡 Needs platform-specific dims |
| `wideLogo` | ✅ Wide logo | ✅ From `logo_url` | ❌ No separate upload | 🔴 **GAP** |
| `programLogo` / `titleImage` | ✅ Square logo | ✅ From `logo_url` | ✅ Generic logo upload | 🟡 Needs platform-specific dims |
| `imageModulesData` | ✅ Additional images | ✅ From `icon_url` | ✅ Generic icon upload | 🟡 Needs platform-specific dims |
| `rewardsTier` / `rewardsTierLabel` | ✅ Tier display | ❌ **NOT IMPLEMENTED** | ❌ Not shown | 🔴 **GAP** |
| `loyaltyPoints` | ✅ Points display | ✅ Implemented | ❌ Not customizable | 🟡 Backend only |
| `secondaryLoyaltyPoints` | ✅ Secondary points | ⚠️ Partial | ❌ Not shown | 🔴 **GAP** |
| `accountName` | ✅ Customer name | ✅ Implemented | ❌ Not shown | 🟡 Backend only |
| `locations` | ✅ Geofencing | ✅ From tenant | ❌ Not shown | 🟡 Backend only |
| `barcode` | ✅ 5+ types | ✅ Now dynamically mapped | ✅ Barcode selector | ✅ **FIXED** |
| `hexBackgroundColor` | ✅ Background color | ✅ From `background_color` | ✅ Color picker (shared) | ✅ Works |
| `enableSmartTap` | ✅ NFC toggle | ⚠️ Hardcoded `True` | ❌ No toggle | 🔴 **GAP** |
| `multipleDevicesAndHoldersAllowedStatus` | ✅ Device sharing | ⚠️ Hardcoded `ONE_USER_ALL_DEVICES` | ❌ No selector | 🔴 **GAP** |
| `reviewStatus` | ✅ Review status | ⚠️ Hardcoded `UNDER_REVIEW` | ❌ Not shown | 🟡 Acceptable |
| `dateFormat` | ✅ Date formatting | ❌ **NOT IMPLEMENTED** | ❌ Not shown | 🔴 **GAP** |

**Verdict for Google Wallet:** The backend generates a **basic functional pass** but does NOT implement the primary customization tool (`cardTemplateOverride`). The UI shows only read-only info about Google Wallet — users cannot design the card layout, add custom fields, set tiers, or customize most parameters. **This is the #1 gap.**

---

## 2. Apple Wallet — Full Feature Audit

### 2.1 What Apple PassKit Supports

Per Apple PassKit documentation (referenced in `docs/APPLE_WALLET_WEB_PKPASS_NFC.md` and codebase comments):

#### A. Pass Structure & Visual Style
- `passTypeIdentifier` — Apple Developer Pass Type ID
- `teamIdentifier` — Apple Developer Team ID
- `organizationName` — Business name (shown on pass)
- `description` — Pass description
- `foregroundColor` — Text color (`rgb(r, g, b)`)
- `backgroundColor` — Background color
- `labelColor` — Label text color (separate from foreground!)
- `logoText` — Text shown next to logo
- `stripImage` — Panoramic image (storeCard/coupon: 375×123pt)
- `thumbnailImage` — Thumbnail (generic: 90×90pt)
- `icon` — Small icon (29×29pt / 58×58px @2x)
- `logo` — Business logo (160×50pt / 320×100px @2x)

#### B. Field Layouts (5 field groups)
- `headerFields` — Top strip (1–3 fields, small text)
- `primaryFields` — Large prominent field (1 field)
- `secondaryFields` — Medium fields (1–4 fields)
- `auxiliaryFields` — Smaller fields below secondary
- `backFields` — Back of pass (unlimited fields)

Each field has: `key`, `label`, `value`, `changeMessage`, `textAlignment`

#### C. Barcode
- `PKBarcodeFormatQR`, `PKBarcodeFormatAztec`, `PKBarcodeFormatCode128`, `PKBarcodeFormatPDF417`
- `barcode` (legacy) + `barcodes` array (modern)
- `altText` — Human-readable text below barcode

#### D. NFC
- `message` — NFC payload (max 64 bytes)
- `encryptionPublicKey` — Required for encrypted NFC
- `requiresAuthentication` — Face ID / Touch ID required

#### E. Locations & Relevance
- `locations` — Array of lat/lng with `relevantText`
- `maxDistance` — Meters from location to trigger
- `relevantDate` — Date when pass becomes relevant

#### F. Web Service (Push Updates)
- `webServiceURL` — HTTPS URL for Apple push service
- `authenticationToken` — Token for web service auth

#### G. Other Fields
- `sharingProhibited` — Prevent sharing
- `voided` — Mark as void
- `userInfo` — Custom JSON payload
- `appLaunchURL` — URL to launch when pass is tapped
- `associatedStoreIdentifiers` — App Store IDs for associated apps

---

### 2.2 What Loyallia Actually Implements (Apple)

| Feature | Apple Docs | Loyallia Backend | Loyallia UI | Status |
|---------|------------|------------------|-------------|--------|
| `passTypeIdentifier` | ✅ Required | ✅ From Vault | ❌ Read-only label | 🟡 Acceptable |
| `teamIdentifier` | ✅ Required | ✅ From Vault | ❌ Read-only label | 🟡 Acceptable |
| `organizationName` | ✅ Business name | ✅ `tenant.name` | ❌ Not shown | 🟡 Backend only |
| `description` | ✅ Description | ✅ `card.name` | ❌ Not shown | 🟡 Backend only |
| `foregroundColor` | ✅ Text color | ✅ `card.text_color` | ✅ Color picker (shared) | ✅ Works |
| `backgroundColor` | ✅ Background | ✅ `card.background_color` | ✅ Color picker (shared) | ✅ Works |
| `labelColor` | ✅ Label color | ⚠️ Derived from text_color | ❌ No separate picker | 🔴 **GAP** |
| `logoText` | ✅ Logo text | ❌ **NOT IMPLEMENTED** | ❌ Not shown | 🔴 **GAP** |
| `strip.png` | ✅ 375×123pt | ✅ From `strip_image_url` | ✅ Generic "Hero" upload | 🟡 Needs Apple-specific dims |
| `thumbnail.png` | ✅ 90×90pt (generic) | ✅ From `strip_image_url` | ❌ No separate upload | 🔴 **GAP** |
| `icon.png` / `icon@2x.png` | ✅ 29×29 / 58×58 | ✅ From `icon_url` | ✅ Generic icon upload | 🟡 Needs Apple-specific dims |
| `logo.png` / `logo@2x.png` | ✅ 160×50 / 320×100 | ✅ From `logo_url` | ✅ Generic logo upload | 🟡 Needs Apple-specific dims |
| `headerFields` | ✅ 1–3 fields | ✅ Hardcoded per type | ❌ Not editable | 🔴 **GAP** |
| `primaryFields` | ✅ 1 large field | ✅ Hardcoded per type | ❌ Not editable | 🔴 **GAP** |
| `secondaryFields` | ✅ 1–4 fields | ✅ Hardcoded per type | ❌ Not editable | 🔴 **GAP** |
| `auxiliaryFields` | ✅ Additional fields | ❌ **NOT USED** | ❌ Not shown | 🔴 **GAP** |
| `backFields` | ✅ Unlimited | ✅ Hardcoded per type | ❌ Not editable | 🔴 **GAP** |
| `barcode` / `barcodes` | ✅ 4 types | ✅ All 5 mapped | ✅ Barcode selector | ✅ Works |
| `nfc` | ✅ Encrypted NFC | ✅ From metadata | ✅ Two checkboxes | ✅ Works |
| `locations` | ✅ Geofencing | ✅ From tenant | ❌ Not shown | 🟡 Backend only |
| `maxDistance` | ✅ Meters | ✅ Hardcoded 100 | ❌ Not editable | 🟡 Acceptable |
| `webServiceURL` | ✅ Push updates | ✅ From settings | ❌ No toggle | 🟡 Backend only |
| `authenticationToken` | ✅ Auth token | ✅ Generated | ❌ Not shown | 🟡 Backend only |
| `relevantDate` | ✅ Relevance date | ❌ **NOT IMPLEMENTED** | ❌ Not shown | 🔴 **GAP** |
| `sharingProhibited` | ✅ Prevent sharing | ❌ **NOT IMPLEMENTED** | ❌ No toggle | 🔴 **GAP** |
| `voided` | ✅ Void status | ❌ **NOT IMPLEMENTED** | ❌ No toggle | 🔴 **GAP** |
| `userInfo` | ✅ Custom JSON | ❌ **NOT IMPLEMENTED** | ❌ Not shown | 🔴 **GAP** |
| `appLaunchURL` | ✅ Launch URL | ❌ **NOT IMPLEMENTED** | ❌ Not shown | 🔴 **GAP** |
| `associatedStoreIdentifiers` | ✅ App Store IDs | ❌ **NOT IMPLEMENTED** | ❌ Not shown | 🔴 **GAP** |
| **Custom stamp icons** | ❌ Not in Apple spec | ❌ Unicode blocks only | ❌ No upload | 🔴 **GAP** |

**Verdict for Apple Wallet:** The backend generates a **complete functional pass** with all standard field groups, but the fields are **hardcoded per card type** with Spanish labels. Users cannot customize which fields appear, what labels they have, or their order. The UI exposes almost no Apple-specific design controls.

---

## 3. Barcode Types — Complete Audit

| Loyallia Type | Apple PassKit Format | Google Wallet Format | Frontend UI | Status |
|---------------|----------------------|----------------------|-------------|--------|
| QR Code | `PKBarcodeFormatQR` | `QR_CODE` | ✅ Selector + SVG preview | ✅ |
| Aztec | `PKBarcodeFormatAztec` | `AZTEC` | ✅ Selector + SVG preview | ✅ |
| PDF417 | `PKBarcodeFormatPDF417` | `PDF_417` | ✅ Selector + SVG preview | ✅ |
| Code 128 | `PKBarcodeFormatCode128` | `CODE_128` | ✅ Selector + SVG preview | ✅ |
| Data Matrix | `PKBarcodeFormatQR` (fallback) | `DATA_MATRIX` | ✅ Selector + SVG preview | ✅ |

**Note:** Apple does not natively support Data Matrix, so we correctly fall back to QR. Google now supports all 5 types (fixed during this audit).

---

## 4. Platform Parameter Separation Audit

### 4.1 Current State

The UI **does** use conditional rendering (`{value === 'apple' && (...)}` / `{value === 'google' && (...)}`) in `WalletProviderSelector`. However:

**The problem:** The **Design Step (Step 2)** shows the SAME three image upload fields regardless of platform:
- "Logo del programa" — Generic 256×256px
- "Imagen de cabecera (Hero)" — Generic 600×200px
- "Ícono del programa" — Generic 64×64px

The user only sees platform-specific guidance in a **small read-only info panel** inside `WalletProviderSelector`. They cannot upload platform-specific images (e.g., Apple `strip.png` vs Google `heroImage`) with the correct dimensions enforced.

### 4.2 What "Don't Mix Parameters" Means

The user wants:
- **When Apple is selected:** ONLY Apple-specific upload fields, dimensions, and parameters are visible. No Google fields.
- **When Google is selected:** ONLY Google-specific upload fields, dimensions, and parameters are visible. No Apple fields.
- **The preview** must also update to show the correct platform layout with the correct image placements.

---

## 5. Remediation Plan — Phased Implementation

### Phase 1: Platform-Specific Image Uploads (Highest Priority)
**Goal:** Replace generic image uploads with platform-specific ones that enforce correct dimensions.

**Apple Wallet Images:**
| File | Required Size | Pass Style | Current UI |
|------|--------------|------------|------------|
| `logo.png` / `logo@2x.png` | 160×50pt / 320×100px | All | Generic 256×256 ❌ |
| `icon.png` / `icon@2x.png` | 29×29pt / 58×58px | All | Generic 64×64 ❌ |
| `strip.png` / `strip@2x.png` | 375×123pt / 750×246px | storeCard, coupon | Generic 600×200 ❌ |
| `thumbnail.png` / `thumbnail@2x.png` | 90×90pt / 180×180px | generic | No upload ❌ |

**Google Wallet Images:**
| Field | Required Size | Current UI |
|-------|--------------|------------|
| `programLogo` / `titleImage` | 660×660px | Generic 256×256 ❌ |
| `heroImage` | 1032×336px | Generic 600×200 ❌ |
| `wideLogo` | 1032×150px | No separate upload ❌ |
| `imageModulesData` | 660×660px | Generic 64×64 ❌ |

**Implementation:**
1. Create `PlatformImageUploads` component that conditionally renders Apple or Google image fields.
2. Add dimension validation on upload (warn if wrong aspect ratio).
3. Update preview to render correct image placement per platform.
4. Store platform-specific image URLs in metadata (e.g., `apple_strip_url`, `google_hero_url`) while keeping backward compatibility.

### Phase 2: Google Wallet `cardTemplateOverride` Builder (Critical)
**Goal:** Implement the PRIMARY Google Wallet customization tool.

**Implementation:**
1. Add `GoogleTemplateBuilder` UI component (inside Google panel):
   - Row builder: Add/remove rows
   - Per row: Choose `oneItem` / `twoItems` / `threeItems`
   - Per item: Choose field source (`class` / `object` / `textModulesData`)
   - Per item: Enter `fieldPath` or select from predefined fields
2. Add `textModulesData` editor: Add/remove custom modules (header + body + id)
3. Add `linksModuleData` editor: Add/remove custom links (description + URI + id)
4. Backend: Update `_build_loyalty_class`, `_build_offer_class`, `_build_gift_card_class` to:
   - Read `cardTemplateOverride` from metadata
   - Build `classTemplateInfo.cardTemplateOverride.cardRowTemplateInfos`
   - Merge user `textModulesData` with branding text
   - Merge user `linksModuleData` with branding links
5. Add `rewardsTier` / `rewardsTierLabel` fields to class builders.

### Phase 3: Apple Wallet Field Editor (High Priority)
**Goal:** Allow users to customize header, primary, secondary, and back fields.

**Implementation:**
1. Add `AppleFieldEditor` UI component (inside Apple panel):
   - 4 tabs: Header / Primary / Secondary / Back
   - Each tab: List of editable fields (key, label, value template)
   - Value templates can reference metadata: `{reward_description}`, `{customer_name}`, `{stamp_count}/{stamps_required}`
2. Store field overrides in `appleWalletConfig.fieldLayout` metadata.
3. Backend: Update `_build_fields_for_type` to check for `fieldLayout` overrides first, fall back to defaults.
4. Add `labelColor` picker (separate from `text_color`).
5. Add `logoText` input.

### Phase 4: Advanced Parameters (Medium Priority)
**Apple:**
- `sharingProhibited` toggle
- `voided` toggle
- `relevantDate` picker
- `locations` preview map

**Google:**
- `enableSmartTap` toggle
- `multipleDevicesAndHoldersAllowedStatus` selector
- `listTemplateOverride` editor
- `detailsTemplateOverride` editor
- `cardBarcodeSectionDetails` editor

### Phase 5: Custom Stamp Icons (Nice to Have)
**Goal:** Replace Unicode block stamps with custom icons.

**Implementation:**
1. Add `stamp_icon_url` and `stamp_icon_inactive_url` metadata fields.
2. UI: Upload fields for active stamp icon and inactive stamp icon.
3. Backend: If icons exist, render as small images in `secondaryFields` or `auxiliaryFields` instead of Unicode blocks.
4. Preview: Show custom icons in the stamp card preview.

---

## 6. Immediate Recommendations

1. **Start with Phase 1** (Platform-Specific Image Uploads). This resolves the user's most visible pain point — wrong image dimensions and mixed parameters.
2. **Phase 2** (`cardTemplateOverride`) is the #1 functional gap for Google Wallet. Without it, users cannot customize the card layout at all.
3. **Phase 3** (Apple Field Editor) gives users control over the hardcoded Spanish field labels and layout.
4. The CSP and barcode fixes are already deployed and tested.

---

## 7. Files to Modify (Reference)

### Backend
- `backend/apps/customers/pass_engine/google_pass_builders.py` — Add `cardTemplateOverride`, `textModulesData`, `linksModuleData` builders
- `backend/apps/customers/pass_engine/apple_pass_builders.py` — Add field override support, custom stamp icons
- `backend/apps/customers/pass_engine/apple_pass.py` — Add `labelColor`, `logoText`, `sharingProhibited`, `voided`
- `backend/apps/cards/models.py` — Add metadata fields for platform-specific images

### Frontend
- `frontend/src/components/programs/WalletCardPreview.tsx` — Add `GoogleTemplateBuilder`, `AppleFieldEditor`
- `frontend/src/app/(dashboard)/programs/new/page.tsx` — Replace generic image uploads with `PlatformImageUploads`
- `frontend/src/components/programs/constants.tsx` — Add platform-specific dimension constants
- `frontend/src/components/programs/new/ProgramReviewStep.tsx` — Show platform-specific design summary

### CSP (Fixed)
- `backend/common/middleware.py` ✅
- `deploy/rewards.loyallia.com.conf` ✅
- `deploy/nginx.conf` ✅
- `deploy/bootstrap/setup_ssl.sh` ✅
