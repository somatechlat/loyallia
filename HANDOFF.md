# HANDOFF: Wallet Designer Full Redesign — Next Agent Instructions

## Status: HALTED — Requires Complete Redesign

The wallet designer module needs a **complete ground-up redesign** for usability. The current implementation is broken and unusable by non-technical users.

---

## What Went Wrong (Acknowledged Issues)

1. **File corruption**: `WalletDesigner.tsx` was accidentally truncated/corrupted during agent edits. It has been restored from git but the full redesign was never completed cleanly.
2. **Dark mode broken**: Input fields in the designer show white text on white/light backgrounds in dark mode — completely unreadable.
3. **Preview not real-time**: When users add fields or customize the wallet pass, changes do NOT reflect in the live preview card.
4. **Image uploads not showing in preview**: Uploaded images (logo, strip, icon) don't appear in the card preview.
5. **Field editors are too technical**: Users see `{stamp_count}/{stamps_required}` and `object.loyaltyPoints.balance` — impossible for normal humans to use.
6. **Phone mockups look wrong**: iPhone and Android phone frames in previews don't look realistic or professional.
7. **Image sizes incorrect**: Logo, strip, icon dimensions may not match Apple PassKit and Google Wallet official specs.
8. **Build repeatedly broken**: Multiple attempts to patch led to webpack/TypeScript errors.

---

## What Must Be Built (Requirements)

### 1. Human-Friendly Wallet Designer (`WalletDesigner.tsx`)

Replace the current accordion-based technical editor with a **visual, WYSIWYG editor**:

#### Apple Wallet Tab
- Show a **visual mockup of the Apple Pass** with clickable areas:
  - Header area (top) — click to edit header fields
  - Primary area (big text) — click to edit the main field
  - Secondary area — click to edit secondary fields
  - Back area — click to edit back-of-card fields
- When user clicks an area, show a **simple dropdown**: "¿Qué información quieres mostrar aquí?"
  - Options: "Nombre del cliente", "Sellos actuales", "Recompensa", "Saldo", "Nombre del programa", "Texto personalizado"
  - NO raw `{variable}` syntax visible to users
- Show a **live mini-preview** inside each field editor showing how it will look
- Keep advanced options (alignment, changeMessage) collapsed behind a "Opciones avanzadas" toggle

#### Google Wallet Tab
- Same visual approach — show a mockup of the Google Wallet card
- Clickable rows that users can add/remove/reorder
- Each row: dropdown "¿Qué campo quieres mostrar?" with human names
- Live preview of the row layout

#### Image Uploads (Both Platforms)
- Show **dimension requirements clearly** next to each upload:
  - Apple Logo: "160×50pt (320×100px @2x)"
  - Apple Strip: "375×123pt (750×246px @2x) — solo storeCard/coupon"
  - Apple Thumbnail: "90×90pt (180×180px @2x) — solo generic"
  - Apple Icon: "29×29pt (58×58px @2x)"
  - Google Program Logo: "660×660px"
  - Google Hero Image: "1032×336px"
  - Google Wide Logo: "1032×150px"
- **Drag & drop support** with visual feedback
- **Show uploaded image** immediately in the upload box
- **Uploaded images MUST appear in the live preview instantly**

### 2. Real-Time Live Preview (`WalletCardPreview.tsx`)

The preview on the right side of the wizard MUST update **instantly** when:
- User types program name/description
- User selects a different card type
- User uploads an image (logo, strip, icon)
- User changes colors
- User adds/edits fields in the designer
- User switches Apple/Google platform

**Critical**: The preview must read from `walletDesign` state and reflect:
- Custom Apple fields (header, primary, secondary, auxiliary, back)
- Custom Google rows
- Uploaded images
- Selected colors
- Barcode type

### 3. Phone Mockups Must Look Real

#### iPhone 15 Pro Mockup (for Apple preview)
- Titanium-colored bezel
- Dynamic Island with camera lens
- Side buttons (volume up/down, action, power)
- Proper rounded corners (44px outer, 40px screen)
- Status bar with time, signal, battery
- Home indicator
- Screen background: dark gradient
- Card inside must look like a real PassKit pass

#### Pixel 7 Pro Mockup (for Google preview)
- Rounded frame with proper Android styling
- Status bar
- Navigation bar (pill)
- Screen background: dark
- Card inside must look like Material You Google Wallet card

### 4. Hover Preview (`WalletPreviewContent.tsx`)

When hovering over card types in Step 0, show the SAME high-quality phone mockup + card preview.

### 5. Image Specifications (Official Docs)

| Platform | Image | Dimensions | Required |
|----------|-------|------------|----------|
| Apple | logo.png | 160×50pt (320×100px @2x) | Yes |
| Apple | logo@2x.png | 320×100px | Yes |
| Apple | icon.png | 29×29pt (58×58px @2x) | Yes |
| Apple | icon@2x.png | 58×58px | Yes |
| Apple | strip.png | 375×123pt (750×246px @2x) | No (storeCard/coupon only) |
| Apple | strip@2x.png | 750×246px | No |
| Apple | thumbnail.png | 90×90pt (180×180px @2x) | No (generic only) |
| Apple | thumbnail@2x.png | 180×180px | No |
| Google | programLogo | 660×660px | Yes |
| Google | heroImage | 1032×336px | No |
| Google | wideLogo | 1032×150px | No |
| Google | imageModuleData | 660×660px | No |

### 6. Dark Mode Must Work Everywhere

Every input, select, textarea, button, and card in the designer must be readable in both light and dark modes.
Use these patterns consistently:
```
bg-white dark:bg-slate-800
text-slate-900 dark:text-slate-100
border-slate-200 dark:border-slate-600
placeholder:text-slate-400 dark:placeholder:text-slate-500
```

---

## Files to Modify / Create

| File | Action |
|------|--------|
| `frontend/src/components/programs/WalletDesigner.tsx` | **Complete rewrite** — visual WYSIWYG editor |
| `frontend/src/components/programs/WalletCardPreview.tsx` | **Complete rewrite** — realistic phone mockups + real-time preview |
| `frontend/src/components/programs/WalletPreviewContent.tsx` | **Update** — use same phone mockup + card components |
| `frontend/src/components/programs/constants.tsx` | Add human-friendly field mappings |
| `frontend/src/app/(dashboard)/programs/new/page.tsx` | Ensure walletDesign state flows to preview |
| `frontend/src/components/programs/new/ProgramReviewStep.tsx` | Update to show wallet design summary |

---

## Backend Files (Already Done — Verify)

| File | Status |
|------|--------|
| `backend/apps/customers/pass_engine/apple_pass.py` | ✅ Uses wallet_design images & advanced settings |
| `backend/apps/customers/pass_engine/apple_pass_builders.py` | ✅ Uses custom apple_fields |
| `backend/apps/customers/pass_engine/google_pass_builders.py` | ✅ Uses google_images, cardTemplateOverride, advanced |
| `backend/apps/cards/api.py` | ✅ Accepts wallet_design in metadata |

---

## How to Test

1. **Build**: `cd frontend && npx next build` — must pass with 0 errors
2. **Docker rebuild**: `docker compose build web api && docker compose up -d --no-deps web api`
3. **E2E tests**: `cd frontend && PLAYWRIGHT_BASE_URL=http://localhost:33906 npx playwright test tests/e2e/suite/02-programs.spec.ts tests/e2e/suite/22-wallet-flows.spec.ts --project=wallet`
4. **Manual test**: Open `http://localhost:33906/programs/new` and verify:
   - Step 0: Hover over card types shows realistic phone preview
   - Step 2: Upload images appear instantly in preview
   - Step 2: Changing fields updates preview instantly
   - Step 2: Dark mode is readable
   - Step 3: Review shows correct wallet design summary

---

## Current Docker Status

Containers are running. Rebuild with:
```bash
docker compose build web api
docker compose up -d --no-deps web api
```

App URLs:
- Web: http://localhost:33906
- API: http://localhost:33905

---

## Agent Deployment Strategy

Deploy these agents IN PARALLEL:

1. **Frontend UI/UX Agent**: Rewrite WalletDesigner.tsx with visual WYSIWYG editor, human-friendly field pickers, proper dark mode
2. **Preview Agent**: Rewrite WalletCardPreview.tsx with realistic iPhone 15 Pro + Pixel 7 Pro mockups, real-time preview from walletDesign state
3. **Integration Agent**: Update page.tsx to wire walletDesign state to preview, update WalletPreviewContent.tsx, ensure images show in preview
4. **QA Agent**: Run build, run E2E tests, verify dark mode, verify all image uploads show in preview

---

## Critical Reminders for Next Agent

- **STOP if build breaks**. Fix build BEFORE continuing.
- **Test dark mode** after every UI change.
- **Preview must update instantly** — no page refreshes needed.
- **Use human language**, not technical jargon like `{variable_name}`.
- **Image sizes must match official Apple/Google specs exactly**.
- **Phone mockups must look professional** — this is a SaaS product.
- Do NOT patch line by line. Rewrite entire components cleanly.

---

Written: 2026-05-18
Status: AWAITING AGENT REDEPLOYMENT
