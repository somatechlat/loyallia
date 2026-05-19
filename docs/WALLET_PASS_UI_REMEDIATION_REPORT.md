# Wallet Pass Creation UI — Remediation Report & Plan

**Date:** 2026-05-18
**Status:** CSP + Google Barcode fixes applied. Phased UI improvements planned.

---

## 1. Issues Reported & Root Causes

| # | Issue | Root Cause | Status |
|---|-------|-----------|--------|
| 1 | **CSP blocks Google Fonts** | `style-src` missing `https://fonts.googleapis.com` in all CSP configs (Django middleware, Nginx, deploy scripts) | ✅ **FIXED** |
| 2 | **Google Wallet ignores barcode type** | Hardcoded `"QR_CODE"` in all 3 Google object builders; no mapping from `card.barcode_type` | ✅ **FIXED** |
| 3 | **Apple Wallet UI params are minimal** | Only shows: Pass Style (read-only), Image guidance (read-only), NFC toggles. Missing: field layout customization, label color, strip dims, stamp icons, header fields. | 🔧 **PLANNED** |
| 4 | **Google Wallet UI params are minimal** | Only shows: Wallet Type (read-only), Hero Image info (read-only), `cardTemplateOverride` info (read-only). Missing: ALL user-editable design params (hexBackgroundColor, heroImage, wideLogo, imageModulesData, textModulesData, linksModuleData, enableSmartTap, etc.) | 🔧 **PLANNED** |
| 5 | **Image uploads are platform-generic** | Logo / Strip / Icon uploads show generic dimensions (256×256, 600×200, 64×64) regardless of Apple vs Google selection. Apple needs: icon@2x=58×58, logo@2x=174×174, strip@2x=750×246. Google needs: heroImage=1032×336, wideLogo=1032×150, programLogo=660×660. | 🔧 **PLANNED** |
| 6 | **No custom stamp icon for Apple** | Stamp progress rendered as Unicode blocks (■/□). No `stamp_icon_url` metadata or image-based stamp icons. | 🔧 **PLANNED** |
| 7 | **Apple & Google params not fully separated** | While `WalletProviderSelector` uses conditional rendering, the **Design Step** (Step 2) still shows the same 3 generic image uploads for both platforms. The user sees Apple-specific guidance only in a small info panel, not as enforced upload requirements. | 🔧 **PLANNED** |

---

## 2. Fixes Already Applied

### 2.1 CSP — Google Fonts Stylesheet Allowed

**Files modified:**
- `backend/common/middleware.py` — `style-src` now includes `https://fonts.googleapis.com`
- `deploy/rewards.loyallia.com.conf` — Nginx CSP header updated
- `deploy/nginx.conf` — Base Nginx CSP header updated
- `deploy/bootstrap/setup_ssl.sh` — Bootstrap script CSP header updated

### 2.2 Google Wallet Barcode Type Mapping

**File modified:** `backend/apps/customers/pass_engine/google_pass_builders.py`

Added `GOOGLE_BARCODE_FORMATS` mapping:

```python
GOOGLE_BARCODE_FORMATS = {
    "qr_code": "QR_CODE",
    "aztec": "AZTEC",
    "code_128": "CODE_128",
    "pdf417": "PDF_417",
    "data_matrix": "DATA_MATRIX",
}
```

Replaced hardcoded `"QR_CODE"` in `_build_loyalty_object`, `_build_offer_object`, and `_build_gift_card_object` with `_get_barcode_type(card)`.

---

## 3. Full Parameter Audit

### 3.1 Apple Wallet — What the Backend Supports vs. What the UI Exposes

| PassKit Parameter | Backend Support | UI Exposed | Gap |
|-------------------|-----------------|------------|-----|
| `passTypeIdentifier` | ✅ From Vault config | ❌ Read-only label only | — |
| `teamIdentifier` | ✅ From Vault config | ❌ Read-only label only | — |
| `organizationName` | ✅ `tenant.name` | ❌ Not shown | Show tenant name |
| `description` | ✅ `card.name` | ❌ Not shown | Show program name |
| `foregroundColor` | ✅ `card.text_color` | ✅ Via color picker (shared) | — |
| `backgroundColor` | ✅ `card.background_color` | ✅ Via color picker (shared) | — |
| `labelColor` | ✅ Derived from text_color | ❌ Not editable | Add label color picker |
| `logo` / `logo@2x` | ✅ From `card.logo_url` | ✅ Generic upload | Needs Apple dims: 160×50 / 320×100 |
| `icon` / `icon@2x` | ✅ From `card.icon_url` | ✅ Generic upload | Needs Apple dims: 29×29 / 58×58 |
| `strip` / `strip@2x` | ✅ From `card.strip_image_url` (storeCard/coupon only) | ✅ Generic "Hero" upload | Needs Apple dims: 375×123 / 750×246 |
| `thumbnail` / `thumbnail@2x` | ✅ From `card.strip_image_url` (generic only) | ❌ No separate upload | Add thumbnail upload for generic passes |
| `headerFields` | ✅ All card types | ❌ Not editable | Add header field editor |
| `primaryFields` | ✅ All card types | ❌ Not editable | Add primary field editor |
| `secondaryFields` | ✅ All card types | ❌ Not editable | Add secondary field editor |
| `backFields` | ✅ All card types | ❌ Not editable | Add back field editor |
| `barcode` / `barcodes` | ✅ 5 types mapped | ✅ Barcode selector (shared) | — |
| `nfc` | ✅ `nfc_enabled`, `nfc_requires_authentication` | ✅ Two checkboxes | — |
| `locations` | ✅ From tenant locations | ❌ Not shown | Show geofence locations |
| `webServiceURL` + `authenticationToken` | ✅ Push update service | ❌ Not shown | — |
| **Stamp icon customization** | ❌ Unicode blocks only | ❌ Not available | **New feature** |

### 3.2 Google Wallet — What the Backend Supports vs. What the UI Exposes

| Google Wallet Parameter | Backend Support | UI Exposed | Gap |
|-------------------------|-----------------|------------|-----|
| `issuerName` | ✅ `tenant.name` | ❌ Not shown | Show tenant name |
| `programName` / `title` / `merchantName` | ✅ From card type mapping | ✅ Read-only type label | — |
| `hexBackgroundColor` | ✅ `card.background_color` | ✅ Via color picker (shared) | — |
| `programLogo` / `titleImage` | ✅ `card.logo_url` | ✅ Generic upload | Needs Google dims: 660×660 |
| `heroImage` | ✅ `card.strip_image_url` | ✅ Generic "Hero" upload | Needs Google dims: 1032×336 |
| `wideLogo` | ✅ `card.logo_url` | ❌ No separate wide logo upload | Add wideLogo upload (1032×150) |
| `imageModulesData` | ✅ From `card.icon_url` | ✅ Generic icon upload | Needs Google dims: 660×660 |
| `cardTemplateOverride` | ❌ Not implemented | ❌ Info text only | **New feature** |
| `textModulesData` | ✅ Static branding text | ❌ Not editable | Add custom text module editor |
| `linksModuleData` | ✅ Static links | ❌ Not editable | Add custom link editor |
| `locations` | ✅ From tenant locations | ❌ Not shown | Show geofence locations |
| `barcode` | ✅ Now dynamically mapped | ✅ Barcode selector (shared) | — |
| `enableSmartTap` | ✅ Hardcoded `True` | ❌ Not shown | Add toggle |
| `multipleDevicesAndHoldersAllowedStatus` | ✅ Hardcoded `ONE_USER_ALL_DEVICES` | ❌ Not shown | Add selector |
| `reviewStatus` | ✅ Hardcoded `UNDER_REVIEW` | ❌ Not shown | — |
| `state` | ✅ Hardcoded `ACTIVE` | ❌ Not shown | — |
| `loyaltyPoints` / `balance` | ✅ From pass_data | ❌ Not shown | Show current balance/points |

---

## 4. Phased Implementation Plan

### Phase 1: Platform-Specific Image Uploads (Immediate — High Impact)
**Goal:** When user selects Apple or Google, show ONLY the image fields required by that platform with exact dimensions.

**Changes:**
1. **Refactor Step 2 (Design) image uploads** into a new `PlatformImageUploads` component:
   - **Apple selected:**
     - `logo` → "Logo Apple Wallet" — Required: 160×50pt (320×100px @2x)
     - `icon` → "Ícono Apple Wallet" — Required: 29×29pt (58×58px @2x)
     - `strip` → "Imagen panorámica (Strip)" — Required: 375×123pt (750×246px @2x) — **Only for storeCard/coupon**
     - `thumbnail` → "Miniatura" — Required: 90×90pt (180×180px @2x) — **Only for generic**
     - Show pass style badge: `storeCard` / `coupon` / `generic`
   - **Google selected:**
     - `programLogo` → "Logo del programa" — Required: 660×660px
     - `heroImage` → "Imagen Hero" — Required: 1032×336px
     - `wideLogo` → "Logo ancho" — Required: 1032×150px
     - `imageModulesData` → "Imagen adicional" — Required: 660×660px
2. Update `WalletProviderSelector` to show the image requirements summary as the user switches platforms.
3. Update `WalletCardPreview` to render the correct preview based on platform-specific image dimensions.

### Phase 2: Apple Wallet Field Layout Editor (1–2 days)
**Goal:** Allow users to customize header, primary, secondary, and back fields for Apple Passes.

**Changes:**
1. Add new `AppleFieldEditor` component in `WalletProviderSelector` (Apple panel):
   - **Header Fields:** Editable key/label/value (e.g., `stamps` → "SELLOS" → "3/10")
   - **Primary Fields:** Editable key/label/value (e.g., `reward` → "RECOMPENSA" → "Café gratis")
   - **Secondary Fields:** Editable key/label/value (e.g., `progress` → "PROGRESO")
   - **Back Fields:** List of editable key/label/value rows
   - Store in `appleWalletConfig.fieldOverrides` metadata.
2. Update backend `apple_pass_builders.py` to read `fieldOverrides` from metadata and apply them instead of hardcoded fields.
3. Default fields remain as-is if no overrides provided.

### Phase 3: Google Wallet `cardTemplateOverride` Builder (2–3 days)
**Goal:** Allow users to build custom row layouts for Google Wallet cards.

**Changes:**
1. Add new `GoogleTemplateBuilder` component in `WalletProviderSelector` (Google panel):
   - Row builder: 1, 2, or 3 items per row
   - Each item: field selector (from card metadata) + label + value template
   - Preview updates in real-time
   - Store in `googleWalletConfig.cardTemplateOverride` metadata.
2. Update backend `google_pass_builders.py` to:
   - Read `cardTemplateOverride` from metadata
   - Build `cardTemplateOverride.cardRowTemplateInfos` dynamically
   - Support `oneItem`, `twoItems`, `threeItems` layouts
3. Add `textModulesData` editor: user can add/remove custom text modules (header + body).
4. Add `linksModuleData` editor: user can add/remove custom links (description + URI).

### Phase 4: Custom Stamp Icons for Apple Wallet (1 day)
**Goal:** Replace Unicode block stamps with custom icons/images.

**Changes:**
1. Add `stamp_icon_url` metadata field for stamp cards.
2. In UI: Show "Ícono de sello" upload when `card_type === 'stamp'` and platform is Apple.
   - Recommended: 60×60px per stamp icon
3. Update backend `apple_pass_builders.py` stamp builder:
   - If `stamp_icon_url` exists, render stamps as small images in `secondaryFields` or `auxiliaryFields`
   - Fallback to Unicode blocks if no custom icon
4. Update `AppleWalletCard` preview to show custom stamp icons.

### Phase 5: Advanced Parameters (1 day)
**Goal:** Expose remaining advanced parameters per platform.

**Apple:**
- `labelColor` picker (separate from text_color)
- `webServiceURL` toggle (enable push updates)
- `locations` preview (show geofenced locations from tenant)

**Google:**
- `enableSmartTap` toggle
- `multipleDevicesAndHoldersAllowedStatus` selector (`ONE_USER_ALL_DEVICES` | `ONE_USER_ONE_DEVICE` | `MULTIPLE_USERS`)
- `hexForegroundColor` (if supported by class type)

---

## 5. Barcode Types — Current State (Post-Fix)

| Loyallia Type | Apple PassKit | Google Wallet | UI Available |
|---------------|---------------|---------------|--------------|
| QR Code | `PKBarcodeFormatQR` | `QR_CODE` | ✅ |
| Aztec | `PKBarcodeFormatAztec` | `AZTEC` | ✅ |
| PDF417 | `PKBarcodeFormatPDF417` | `PDF_417` | ✅ |
| Code 128 | `PKBarcodeFormatCode128` | `CODE_128` | ✅ |
| Data Matrix | `PKBarcodeFormatQR` (fallback) | `DATA_MATRIX` | ✅ |

---

## 6. Recommended Next Step

**Start with Phase 1** (Platform-Specific Image Uploads). It has the highest user impact — the image dimension confusion is the most visible pain point in the current UI. It also unblocks the subsequent phases by establishing the platform-conditional UI pattern.

If you approve this plan, I will begin implementing **Phase 1** immediately.
