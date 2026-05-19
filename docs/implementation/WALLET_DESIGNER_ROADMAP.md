# Wallet Designer Roadmap — Gap Analysis vs. PassKit & Industry Standards

> **Date:** 2026-05-18  
> **Context:** Deep analysis of PassKit (passkit.com/guide, help.passkit.com) and Apple/Google Wallet official docs vs. our current Loyallia WalletDesigner implementation.

---

## Executive Summary

Our WalletDesigner covers **~60%** of what professional tools like PassKit offer. The core visual editing (images, fields, preview) is functional. The critical gaps are in:

1. **Apple PassKit color system** (missing labelColor, foregroundColor separation)
2. **Field formatting** (dates, numbers, currencies, attributed links)
3. **Location & beacon relevance** (lock screen notifications based on GPS/iBeacon)
4. **Google Wallet missing modules** (textModules, linksModules, imageModules)
5. **Enrollment form designer** (data collection form customization)
6. **Template/project architecture** (separation of template from live program)
7. **Pass lifecycle & redemption** (voided, expired, redeemed states)
8. **Apple Watch preview & optimization**

---

## 1. WHAT WE HAVE ✅ (Preserve & Polish)

| Feature | Status | Notes |
|---------|--------|-------|
| Dual-platform designer (Apple + Google) | ✅ | Working, recently de-duplicated toggle |
| Real-time phone preview (iPhone + Pixel) | ✅ | Fixed proportions in latest rewrite |
| Image uploads (drag & drop, base64 preview) | ✅ | Logo, icon, strip, thumbnail, hero, wide logo |
| Apple field groups editor | ✅ | header, primary, secondary, auxiliary, back |
| Google row builder (cardTemplateOverride) | ✅ | oneItem, twoItems, threeItems |
| Barcode type selector | ✅ | QR, Aztec, PDF417, Code128, DataMatrix |
| Color templates (12 presets) | ✅ | midnight, ocean, sunset, etc. |
| NFC settings (Apple) | ✅ | enable/disable + auth required |
| Advanced settings panel | ✅ | sharing, voided, expiration, strip shine |
| Card type → Pass style mapping | ✅ | 10 card types → Apple/Google types |
| Default field templates per card type | ✅ | Pre-populated Spanish labels |
| Dark mode support | ✅ | Recently fixed |
| Publish/approve workflow | ✅ | is_published field + publish endpoint |

---

## 2. CRITICAL GAPS 🔴 (Must Add)

### 2.1 Apple PassKit Color System

**Problem:** We only have `background_color` and `text_color`. Apple PassKit has THREE colors:

- `backgroundColor` — pass background
- `foregroundColor` — value text color (what we call text_color)
- `labelColor` — label text color (smaller, often white/gray even when values are colored)

**PassKit behavior:** Background color is shared between Apple and Google. Apple can have different foreground vs label colors.

**Action:**
- [ ] Add `labelColor` to WalletDesignState (separate from text_color)
- [ ] Add color picker for label color in Apple advanced settings
- [ ] Ensure `foregroundColor` = `text_color` (values), `labelColor` = new field (labels)
- [ ] Update preview to render labels with labelColor, values with text_color
- [ ] Add validation: warn if background color differs between Apple/Google designs

### 2.2 Apple `logoText` Field

**Problem:** Apple PassKit supports `logoText` — text displayed next to the logo in the header (e.g., "Starbucks" next to the siren logo). We don't have this.

**Action:**
- [ ] Add `logoText` string field to WalletDesignState.appleAdvanced
- [ ] Add input in Apple advanced settings or header section
- [ ] Show `logoText` in iPhone preview next to logo

### 2.3 Field Formatting (Apple) — Dates, Numbers, Currency

**Problem:** Apple fields support rich formatting. We only have plain text. This means dates show as raw strings, numbers have no formatting, no currency symbols.

**Apple formats available:**
- `dateStyle`: `PKDateStyleShort`, `Medium`, `Long`, `Full`, `None`
- `timeStyle`: same options
- `numberStyle`: `PKNumberStyleDecimal`, `Percent`, `Scientific`, `SpellOut`
- `currencyCode`: "USD", "EUR", "MXN"
- `isRelative`: true/false (shows "2 days ago", "in 3 hours")
- `ignoreTimeZone`: true/false

**Action:**
- [ ] Add format selector to each Apple field editor card
- [ ] Add dateStyle/timeStyle for date fields
- [ ] Add numberStyle + currencyCode for numeric fields
- [ ] Add `isRelative` toggle for date fields
- [ ] Update preview to show formatted values (e.g., "31/12/2026" → "Dec 31, 2026")
- [ ] Update backend pass.json generation to include format fields

### 2.4 Location & Beacon Relevance (Apple)

**Problem:** Apple Wallet can show passes on the lock screen when user is near a location (GPS) or iBeacon. This is CRITICAL for retail/cafes. We have zero support.

**Apple features:**
- `locations`: array of { latitude, longitude, relevantText }
- `beacons`: array of { proximityUUID, major, minor, relevantText }
- `relevantText`: text shown on lock screen (e.g., "Show this pass at Sweet & Coffee for 10% off")

**Action:**
- [ ] Add `locations` array to WalletDesignState.appleAdvanced
- [ ] Add `beacons` array to WalletDesignState.appleAdvanced
- [ ] Add `relevantText` string field
- [ ] Build UI: location picker (lat/lng input or map), beacon UUID/major/minor input
- [ ] Show relevance indicator in preview ("Would appear on lock screen near this location")
- [ ] Update backend to include in pass.json

### 2.5 Google Wallet Missing Modules

**Problem:** Google Wallet supports more than just cardTemplateOverride rows. Missing:

- `textModulesData`: Free-form text fields (like Apple back fields)
- `linksModuleData`: Clickable links on the pass
- `imageModulesData`: Additional images below the pass
- `messages`: Info messages (like notifications on the pass)
- `disableScreenshot`: Security option
- `state`: ACTIVE, COMPLETED, EXPIRED

**Action:**
- [ ] Add `textModulesData` editor (label + body text)
- [ ] Add `linksModuleData` editor (already partially in advanced settings, but should be more visible)
- [ ] Add `imageModulesData` upload field
- [ ] Add `disableScreenshot` toggle in Google advanced
- [ ] Add `state` selector (ACTIVE, COMPLETED, EXPIRED, INACTIVE)
- [ ] Update preview to show text modules and links

### 2.6 Enrollment Form Designer

**Problem:** PassKit has a dedicated "Enrollment Form Designer" where you customize the data collection form users fill out to get the pass. Our enrollment form is hardcoded per card type with no customization.

**What PassKit offers:**
- Drag-and-drop form field arrangement
- Custom labels and placeholders
- Required vs optional fields
- Field types: text, email, phone, date, number, select

**Action:**
- [ ] Add `enrollmentForm` section to WalletDesignState
- [ ] Build form field editor (add/remove/reorder fields)
- [ ] Support field types: text, email, phone, date, number, select
- [ ] Show enrollment form preview alongside pass preview
- [ ] Update backend enrollment endpoint to use custom form config

---

## 3. IMPORTANT GAPS 🟡 (Should Add Soon)

### 3.1 Missing Apple Pass Styles

**Problem:** Our card type mapping is incomplete:

| Card Type | Current Apple Style | Should Be |
|-----------|-------------------|-----------|
| gift_certificate | storeCard | **giftCard** |
| (none) | — | **boardingPass** (for transit) |
| (none) | — | **eventTicket** (for events) |

**Action:**
- [ ] Add `giftCard` Apple pass style support
- [ ] Consider adding `eventTicket` and `boardingPass` card types
- [ ] Update image support map (eventTicket supports strip OR background+thumbnail)
- [ ] Update field layout rules per style (boardingPass has 2 primary fields)

### 3.2 Field Manager (Centralized View)

**Problem:** PassKit has a "Field Manager" that shows ALL fields across all groups in one list. This makes it easy to see the full data model at a glance.

**Action:**
- [ ] Add "Field Manager" accordion section in WalletDesigner
- [ ] Flat list of all Apple fields with group badges
- [ ] Flat list of all Google items with row badges
- [ ] Quick edit capability (change label/value without expanding group)

### 3.3 Pass Lifecycle States

**Problem:** We have `is_published` and `is_active`, but passes need richer lifecycle:

- **Draft** → not yet published
- **Published/Active** → live, customers can enroll
- **Suspended** → temporarily disabled (we have this)
- **Expired** → past expiration date
- **Voided** → permanently invalidated (we have flag but no UI)
- **Redeemed** → for coupons (one-time use)

**Action:**
- [ ] Add `expiry_date` field to program/card model
- [ ] Add `voided_at` timestamp
- [ ] Add `redeemed_at` timestamp (for coupon passes)
- [ ] Show lifecycle state in program list with visual indicators
- [ ] Auto-expire passes via cron job

### 3.4 Redemption / Validation System

**Problem:** PassKit integrates with redemption/scanning. We have no validation flow.

**Action:**
- [ ] Build staff/employee redemption portal
- [ ] QR code scanning for validation
- [ ] Track redemption history per pass
- [ ] Support one-time vs multi-use redemption rules
- [ ] NFC tap validation (when NFC is enabled)

### 3.5 Apple Watch Preview

**Problem:** Apple Watch shows passes differently (no images, simplified layout). We have no watch preview.

**Action:**
- [ ] Add Apple Watch mockup to preview (small square, 180×220px approx)
- [ ] Show simplified layout (no images, only text fields)
- [ ] Warn if pass has too many fields for Watch display

### 3.6 Pass.json Code Preview

**Problem:** Developers/power users want to see the actual JSON that will be generated.

**Action:**
- [ ] Add "View pass.json" button in advanced settings
- [ ] Show formatted JSON preview (read-only)
- [ ] Include both Apple pass.json and Google JWT payload

---

## 4. NICE-TO-HAVE 🟢 (Add When Time Permits)

### 4.1 Template/Project Architecture

**Problem:** We edit programs directly. PassKit separates "Templates" (design) from "Projects" (live campaigns).

**Action:**
- [ ] Create `PassTemplate` model (design only)
- [ ] Programs reference a template
- [ ] Updating template offers "update all programs using this template?"
- [ ] Template library with pre-made designs

### 4.2 A/B Testing for Designs

**Action:**
- [ ] Allow multiple template variants per program
- [ ] Track enrollment/conversion per variant

### 4.3 Analytics Dashboard

**Action:**
- [ ] Pass install count
- [ ] Open rate (wallet opens)
- [ ] Redemption rate
- [ ] Location-based engagement

### 4.4 Batch Operations

**Action:**
- [ ] Bulk update all passes when template changes
- [ ] Bulk expire/revoke passes
- [ ] Bulk push updates

### 4.5 Social Sharing Optimization

**Action:**
- [ ] OG tags for enrollment links
- [ ] Social preview image generation

---

## 5. IMPLEMENTATION PRIORITY ORDER

### Phase 1: Fixes & Polish (This Week)
1. ✅ Fix build errors (unused PlatformToggle, useEffect deps)
2. ✅ Fix iPhone proportions in preview
3. ✅ Fix logo display in preview (proper aspect ratio)
4. ✅ Fix text truncation in preview fields
5. ✅ Single Apple/Google toggle (de-duplicated)
6. Fix edit/save error when saving wallet design changes

### Phase 2: Critical Features (Next 2 Weeks)
7. Add `labelColor` to Apple color system
8. Add `logoText` for Apple
9. Add field formatting (dateStyle, numberStyle, currency)
10. Add location/beacon relevance editor
11. Add Google Wallet textModules, linksModules, imageModules
12. Add Google Wallet state and disableScreenshot

### Phase 3: Important Features (Next Month)
13. Add `giftCard` Apple pass style
14. Build Enrollment Form Designer
15. Add Field Manager centralized view
16. Add pass lifecycle states (expired, voided, redeemed)
17. Add Apple Watch preview
18. Add pass.json code preview

### Phase 4: Advanced Features (Future)
19. Template/Project architecture
20. Redemption/validation system
21. Analytics dashboard
22. A/B testing
23. Batch operations

---

## 6. BACKEND CHANGES REQUIRED

### 6.1 Card Model Additions
```python
# apps/cards/models.py
class Card(models.Model):
    # ... existing fields ...
    
    # Lifecycle
    expiry_date = models.DateTimeField(null=True, blank=True)
    voided_at = models.DateTimeField(null=True, blank=True)
    redeemed_at = models.DateTimeField(null=True, blank=True)
    
    # Enrollment form config
    enrollment_form_config = models.JSONField(default=dict, blank=True)
```

### 6.2 Metadata Schema Expansion
```json
{
  "wallet_design": {
    "apple_images": { ... },
    "google_images": { ... },
    "apple_fields": { ... },
    "google_rows": [ ... ],
    "apple_advanced": {
      "suppressStripShine": false,
      "nfcMessage": "",
      "sharingProhibited": false,
      "voided": false,
      "expirationDate": "",
      "labelColor": "#FFFFFF",
      "logoText": "",
      "locations": [
        { "latitude": 0.0, "longitude": 0.0, "relevantText": "" }
      ],
      "beacons": [
        { "proximityUUID": "", "major": 0, "minor": 0, "relevantText": "" }
      ],
      "relevantText": ""
    },
    "google_advanced": {
      "reviewStatus": "underReview",
      "allowMultipleUsers": "ONE_USER_ALL_DEVICES",
      "homepageUri": "",
      "helpUri": "",
      "linksModuleUris": [],
      "messages": [],
      "notifyPreference": true,
      "textModules": [],
      "imageModules": [],
      "disableScreenshot": false,
      "state": "ACTIVE"
    }
  }
}
```

### 6.3 Pass Generation Updates
- Update `apple_pass.py` to include `labelColor`, `logoText`, locations, beacons, field formats
- Update `google_wallet.py` to include textModules, imageModules, state, disableScreenshot
- Add enrollment form endpoint to accept custom form configs

---

## 7. QUICK WINS (Can Do Today)

1. **Fix `labelColor`**: Add one color picker. Backend already supports `text_color` — just need to distinguish label vs value colors.
2. **Fix `logoText`**: Add one text input. Show in preview.
3. **Add `relevantText`**: One text input for lock screen text. Huge value for retail.
4. **Add Google `state`**: Dropdown with 4 options. Already in API spec.
5. **Show pass.json preview**: Use existing `buildWalletDesignMetadata()` to show formatted JSON.

---

*End of roadmap. Priorities should be driven by customer needs — for a café/retail loyalty platform, location relevance and enrollment forms are likely the highest-impact features.*
