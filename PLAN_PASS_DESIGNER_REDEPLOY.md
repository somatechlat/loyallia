# PLAN: Pass Designer Complete Redeployment — Apple & Google Wallet

## Executive Summary

The current WalletDesigner module is **broken at build time** (`AppleFieldEditor` duplicated), has **dark mode failures**, **non-real-time preview**, **technical field syntax exposed to users**, and **phone mockups that lack realism**. This plan is a ground-up production roadmap to rebuild the designer into a world-class, WYSIWYG, multi-platform card designer that works with **all 10 card types** (stamp, cashback, coupon, affiliate, discount, gift_certificate, vip_membership, corporate_discount, referral_pass, multipass) with **full localization (Spanish UI)**, **drag-and-drop uploads**, and **pixel-perfect phone previews**.

---

## Phase 0: Critical Fix (Immediate)

**Goal**: Unbreak the build BEFORE any redesign begins.

- **File**: `frontend/src/components/programs/WalletDesigner.tsx`
- **Problem**: `AppleFieldEditor` is defined twice (lines 408 and 1038) and `GoogleRowBuilder` is defined twice (lines 287 and 905).
- **Fix**: Remove the duplicate definitions at lines 894-1219. Keep only the dark-mode-aware versions (lines 1038+ for AppleFieldEditor, lines 905+ for GoogleRowBuilder).
- **Verification**: `cd frontend && npx next build` must pass with 0 errors.
- **ETA**: 15 minutes.

---

## Phase 1: Frontend UI/UX — WalletDesigner.tsx (Complete Rewrite)

### 1.1 Visual WYSIWYG Editor (Apple Wallet Tab)

**Concept**: Instead of accordion forms, show a **visual mockup of the Apple Pass** with clickable hotspots:

| Area | Click Action | Max Fields |
|------|-------------|------------|
| Header (top-right) | Edit header fields | 3 |
| Primary (big center) | Edit main field | 1 |
| Secondary (below primary) | Edit secondary fields | 4 |
| Auxiliary (bottom) | Edit auxiliary fields | 4 |
| Back of card | Edit back fields | ∞ |

**Human-Friendly Field Picker**:
- Dropdown: "¿Qué información quieres mostrar aquí?"
- Options (NO raw `{variable}` syntax visible):
  - "Nombre del cliente" → internally maps to `{customer_name}`
  - "Sellos actuales" → internally maps to `{stamp_count}/{stamps_required}`
  - "Recompensa" → `{reward_description}`
  - "Saldo de cashback" → `${cashback_balance}`
  - "Nombre del programa" → `{program_name}`
  - "Descripción" → `{description}`
  - "Nivel de descuento" → `{discount_tier}`
  - "Porcentaje de descuento" → `{discount_percentage}%`
  - "Membresía VIP" → `{membership_tier}`
  - "Referidos" → `{referrals_made}`
  - "Código de referido" → `{referral_code}`
  - "Usos restantes" → `{multipass_remaining}/{bundle_size}`
  - "Saldo de regalo" → `${gift_balance}`
  - "Descuento corporativo" → `{corporate_discount}%`
  - "Empresa" → `{company_name}`
  - "Código de afiliado" → `{affiliate_code}`
  - "Fecha de inscripción" → `{enrolled_date}`
  - "Texto personalizado..." → free text input

**Per-Card-Type Contextual Options**:
- Only show relevant options based on `cardType`. Example: stamp card shows stamp-related fields; gift certificate shows gift-related fields.
- Use a `FIELD_OPTION_REGISTRY: Record<string, string[]>` mapping card type → visible option keys.

**Advanced Options Collapsed**:
- "Opciones avanzadas" toggle per field for:
  - `textAlignment` (Natural | Left | Center | Right)
  - `changeMessage` (push notification text when field updates)
  - `attributedValue` (rich text / links)

**Live Mini-Preview in Editor**:
- Each field editor shows a mini card snippet (3cm wide) reflecting the selected field's label + sample value.

### 1.2 Visual WYSIWYG Editor (Google Wallet Tab)

**Concept**: Same visual approach — mockup of Google Wallet card with clickable rows.

- Show rows as they appear on the card.
- Click a row to edit:
  - Row type: 1 campo | 2 campos | 3 campos
  - Per item: dropdown with same human-friendly options as Apple.
- Drag to reorder rows.
- Add/remove rows inline.

### 1.3 Image Uploads (Both Platforms)

**Dimension Requirements Displayed Inline**:

| Platform | Image | Dimensions | Required |
|----------|-------|------------|----------|
| Apple | logo.png | 160×50pt (320×100px @2x) | ✅ Yes |
| Apple | icon.png | 29×29pt (58×58px @2x) | ✅ Yes |
| Apple | strip.png | 375×123pt (750×246px @2x) | storeCard/coupon only |
| Apple | thumbnail.png | 90×90pt (180×180px @2x) | generic only |
| Google | programLogo | 660×660px | ✅ Yes |
| Google | heroImage | 1032×336px | Optional |
| Google | wideLogo | 1032×150px | Optional |

**Features**:
- Drag & drop with visual feedback (border color change + drop zone highlight).
- Show uploaded image instantly in upload box.
- **Images MUST appear in live preview instantly** (this is a critical requirement).
- Remove button with confirmation.
- Auto-generate @2x from @1x if only one uploaded (frontend copy, backend can also resize).

### 1.4 Dark Mode Fix

Apply consistent dark mode classes to **every interactive element**:
```
bg-white dark:bg-slate-800
text-slate-900 dark:text-slate-100
border-slate-200 dark:border-slate-600
placeholder:text-slate-400 dark:placeholder:text-slate-500
focus:ring-brand-500
```

**Test checklist**:
- [ ] All inputs readable in dark mode
- [ ] All selects readable in dark mode
- [ ] All textareas readable in dark mode
- [ ] Upload boxes have dark borders
- [ ] Accordion headers visible
- [ ] Buttons maintain contrast

---

## Phase 2: Preview Agent — WalletCardPreview.tsx (Complete Rewrite)

### 2.1 Real-Time Live Preview

The preview MUST update **instantly** (no refresh) when:
1. User types program name/description.
2. User selects a different card type.
3. User uploads an image (logo, strip, icon, hero, thumbnail).
4. User changes colors (background, text).
5. User adds/edits fields in the designer.
6. User switches Apple/Google platform.

**State Flow**:
```
page.tsx (form + walletDesign state)
  ├──→ WalletDesigner (onChange updates walletDesign)
  └──→ WalletCardPreview (reads form + walletDesign, renders instantly)
```

**Critical**: WalletCardPreview must accept `walletDesign` as a prop and reflect:
- Custom Apple fields (header, primary, secondary, auxiliary, back)
- Custom Google rows (cardTemplateOverride layout)
- Uploaded images from walletDesign state (not just legacy form.logo_url)
- Selected colors
- Barcode type

### 2.2 iPhone 15 Pro Mockup (Apple Preview)

**Specifications**:
- Titanium-colored bezel (`#8a8a8a` gradient)
- Dynamic Island with camera lens (pill shape, `#000` with `#111` border, lens dot at right)
- Side buttons: volume up, volume down, action button, power button (all with proper positioning %)
- Rounded corners: outer 44px, screen 40px
- Status bar: time 9:41, signal bars, WiFi, battery
- Home indicator: 90px wide, 3px tall, rounded
- Screen background: dark gradient (`from-gray-900 to-gray-950`)
- Card inside: MUST look like a real PassKit pass
  - Header with logo + org name + header field
  - Primary field: large bold text
  - Secondary/auxiliary fields in grid
  - Barcode in white rounded container
  - Strip image (if storeCard/coupon) with gradient fade to background
  - Thumbnail (if generic) at top-right

### 2.3 Pixel 7 Pro Mockup (Google Preview)

**Specifications**:
- Rounded frame with Android styling (`rounded-[40px]`)
- Status bar: time, signal, battery
- Navigation bar: pill shape at bottom
- Screen background: dark (`#0a0a0a`)
- Card inside: Material You Google Wallet card
  - Hero image (16:7 aspect ratio) with gradient fade
  - Centered logo overlapping hero
  - Title + subtitle centered
  - Info rows with dividers (Material style)
  - Barcode in white rounded container

### 2.4 Platform Toggle

- Pill-shaped toggle between Apple/Google above the phone mockup.
- Must sync with WalletDesigner's platform selection (two-way binding via page.tsx state).

---

## Phase 3: Integration Agent

### 3.1 Update page.tsx

- Pass `walletDesign` state down to `WalletCardPreview`.
- Ensure `logoPreview` and `stripPreview` are populated from `walletDesign` image URLs, not just legacy form fields.
- When user uploads an image in WalletDesigner, it sets a data URL in walletDesign state; page.tsx must pass this to WalletCardPreview.

### 3.2 Update WalletPreviewContent.tsx

- Use the **same** high-quality phone mockup components as WalletCardPreview.
- Currently it has a simplified frame — replace with the iPhone 15 Pro mockup component shared with WalletCardPreview.
- Accept `walletDesign` preview state so hover preview shows uploaded images.

### 3.3 Update ProgramReviewStep.tsx

- Show wallet design summary:
  - Platform selected (Apple/Google)
  - Images uploaded (count + names)
  - Fields configured (count per group)
  - Google rows configured (count)
  - Advanced settings summary (NFC on/off, etc.)

---

## Phase 4: Backend Alignment (Verify/Minor Updates)

### 4.1 Apple Pass Engine (`apple_pass.py`, `apple_pass_builders.py`)

**Current Status**: ✅ Already reads `wallet_design.apple_fields` and `wallet_design.apple_images`.

**Remediations needed**:
- Ensure `apple_images.logo` falls back to `card.logo_url` if not set.
- Ensure `apple_images.icon` falls back to `card.icon_url` if not set.
- Ensure strip vs thumbnail logic respects pass style (storeCard/coupon → strip, generic → thumbnail).
- Image resizing must match Apple specs exactly:
  - icon.png: 29×29, icon@2x.png: 58×58
  - logo.png: 160×50 (or 87×87 used currently — need to verify), logo@2x.png: 320×100
  - strip.png: 375×123, strip@2x.png: 750×246
  - thumbnail.png: 90×90, thumbnail@2x.png: 180×180

### 4.2 Google Pass Engine (`google_pass.py`, `google_pass_builders.py`)

**Current Status**: ✅ Already reads `wallet_design.google_images`, `google_rows`, `google_advanced`.

**Remediations needed**:
- Ensure `cardTemplateOverride` format matches exactly what Google Wallet API expects.
- Current frontend stores rows as `{ id, type, items[] }` — backend converts to `cardRowTemplateInfos`. Verify the transformation is correct.
- Ensure heroImage, wideLogo, programLogo, imageModulesData all use the URLs from `wallet_design.google_images`.

### 4.3 API (`backend/apps/cards/api.py`)

**Current Status**: ✅ Already accepts `wallet_design` in metadata.

**Remediations needed**:
- Validate image URLs on save (must be HTTPS or data URLs).
- Enforce max image count/size in metadata.

---

## Phase 5: QA & E2E Tests

### 5.1 Build Verification

```bash
cd frontend && npx next build
```
Must pass with 0 errors, 0 warnings.

### 5.2 E2E Tests

```bash
cd frontend
PLAYWRIGHT_BASE_URL=http://localhost:33906 npx playwright test \
  tests/e2e/suite/02-programs.spec.ts \
  tests/e2e/suite/22-wallet-flows.spec.ts \
  --project=wallet
```

### 5.3 Manual Test Checklist

| # | Test | Expected Result |
|---|------|-----------------|
| 1 | Open `/programs/new` | Page loads, Step 0 visible |
| 2 | Hover over card types | Realistic iPhone preview appears instantly |
| 3 | Select card type → Next → Next | Step 2 shows WalletDesigner |
| 4 | Upload logo | Image appears in upload box AND in preview instantly |
| 5 | Switch to Google tab | Phone mockup changes to Pixel style |
| 6 | Add Apple header field "Nombre del cliente" | Preview updates with label + sample value |
| 7 | Change background color | Preview card background changes instantly |
| 8 | Dark mode toggle | All inputs remain readable |
| 9 | Review step | Shows correct wallet summary |
| 10 | Submit program | API payload includes `wallet_design` metadata |

### 5.4 New E2E Test Scenarios to Add

- Upload image → verify preview updates.
- Add field → verify preview updates.
- Switch platform → verify mockup changes.
- Dark mode → verify no white-on-white text.
- Review step → verify wallet design summary visible.

---

## Production Roadmap

### Week 1: Foundation & Critical Fix
- **Day 1**: Fix duplicate component definitions (build pass).
- **Day 2-3**: Rewrite WalletDesigner.tsx — visual WYSIWYG editor, human-friendly field pickers, dark mode fixes, image uploads with drag & drop.
- **Day 4**: Rewrite WalletCardPreview.tsx — iPhone 15 Pro + Pixel 7 Pro mockups, real-time preview from walletDesign state.
- **Day 5**: Integration — wire page.tsx, WalletPreviewContent.tsx, ProgramReviewStep.tsx.

### Week 2: Polish & Backend Alignment
- **Day 1-2**: Backend image sizing verification (Apple icon/logo/strip/thumbnail exact dimensions).
- **Day 3-4**: Google Wallet cardTemplateOverride format verification + fixes.
- **Day 5**: E2E test updates + manual QA checklist execution.

### Week 3: Advanced Features & Optimization
- **Day 1-2**: Advanced settings UI (NFC, sharing, expiration, review status, links, messages).
- **Day 3**: Auto-translate field labels (i18n prep for English/Portuguese).
- **Day 4**: Performance optimization (memoization of preview renders, lazy image loading).
- **Day 5**: Final QA, build verification, Docker rebuild test.

### Week 4: Deployment
- **Day 1**: Staging deployment.
- **Day 2-3**: User acceptance testing with real card types.
- **Day 4**: Bug fixes from UAT.
- **Day 5**: Production deployment.

---

## Agent Deployment Strategy (Parallel Execution)

| Agent | Responsibility | Files |
|-------|---------------|-------|
| **Frontend UI/UX Agent** | Rewrite WalletDesigner.tsx with visual editor, dark mode, uploads | `WalletDesigner.tsx`, `constants.tsx` |
| **Preview Agent** | Rewrite WalletCardPreview.tsx with realistic mockups, real-time state | `WalletCardPreview.tsx` |
| **Integration Agent** | Wire page.tsx, WalletPreviewContent.tsx, ProgramReviewStep.tsx | `page.tsx`, `WalletPreviewContent.tsx`, `ProgramReviewStep.tsx` |
| **Backend QA Agent** | Verify backend reads wallet_design correctly, image specs exact | `apple_pass.py`, `apple_pass_builders.py`, `google_pass.py`, `google_pass_builders.py` |
| **E2E QA Agent** | Run builds, run E2E tests, verify dark mode, verify all uploads show in preview | `22-wallet-flows.spec.ts`, `02-programs.spec.ts` |

**Critical Rule**: STOP if build breaks. Fix build BEFORE continuing any work.

---

## Apple vs Google Characteristics Summary

### Apple Wallet (PassKit)
- **File format**: `.pkpass` (signed ZIP)
- **Pass styles**: `storeCard`, `coupon`, `generic`, `eventTicket`, `boardingPass`, `generic`
- **Field groups**: headerFields (3), primaryFields (1), secondaryFields (4), auxiliaryFields (4), backFields (∞)
- **Images**: icon, logo, strip (storeCard/coupon), thumbnail (generic)
- **Barcode formats**: QR, Aztec, Code128, PDF417
- **Special features**: NFC, webServiceURL, locations, suppressStripShine, sharingProhibited, voided
- **Signature**: PKCS#7 with Apple WWDR certificate
- **Preview device**: iPhone 15 Pro

### Google Wallet (Wallet API)
- **File format**: JWT URL (`https://pay.google.com/gp/v/save/{jwt}`)
- **Class types**: `LoyaltyClass`, `OfferClass`, `GiftCardClass`
- **Field layout**: `cardTemplateOverride` with `cardRowTemplateInfos` (1-3 items per row)
- **Images**: programLogo, heroImage, wideLogo, imageModulesData
- **Barcode formats**: QR_CODE, AZTEC, CODE_128, PDF_417, DATA_MATRIX
- **Special features**: Smart Tap, locations, messages, linksModuleData, reviewStatus
- **Signature**: RS256 JWT with Service Account
- **Preview device**: Pixel 7 Pro

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Build breaks during rewrite | High | Fix immediately, never leave broken |
| Image URLs too large for state | Medium | Use object URLs or upload to CDN immediately |
| Backend field format mismatch | High | Verify exact JSON structure with backend agent |
| Dark mode inconsistencies | Medium | Test every input after every change |
| E2E tests fail after redesign | Medium | Update selectors, keep test IDs stable |
| Apple image size mismatch | High | Follow Apple docs exactly, test with real device |

---

*Plan created: 2026-05-18*
*Status: AWAITING APPROVAL FOR AGENT DEPLOYMENT*
