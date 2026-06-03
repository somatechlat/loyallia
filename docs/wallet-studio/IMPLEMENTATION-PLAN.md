# Wallet Pass Studio — Master Implementation Plan

> **Status:** Awaiting User Approval  
> **Rule:** NO CODE will be written until user explicitly approves this plan  
> **Branch:** PASS-DESIGNER  
> **Date:** 2026-06-03

---

## 1. Gap Analysis: Current vs Desired

### 1.1 Current State Inventory

| File | Lines | Purpose | Verdict |
|------|-------|---------|---------|
| `WalletDesigner.tsx` | 275 | Accordion editor, Apple/Google split | **Replace entirely** |
| `WalletCardPreview.tsx` | 331 | Platform toggle + preview wrapper | **Refactor heavily** |
| `AppleWalletPreview.tsx` | 339 | iPhone frame, field rendering | **Reuse with additions** |
| `GoogleWalletPreview.tsx` | 204 | Pixel frame, row rendering | **Reuse with additions** |
| `types.ts` | 222 | WalletDesignState (split model) | **Replace entirely** |
| `AppleFieldEditor.tsx` | 192 | Raw PassKit field groups | **Replace** |
| `GoogleRowBuilder.tsx` | 133 | Raw cardTemplateOverride | **Replace** |
| `DeviceFrame.tsx` | 119 | iPhone + Pixel frames | **Keep as-is** |
| `BarcodeRenderer.tsx` | ? | Barcode SVG rendering | **Keep as-is** |
| `constants.ts` | ? | Pass style mappings | **Extend** |

### 1.2 What's Good (Keep)

| Component | Why It Stays |
|-----------|-------------|
| `DeviceFrame.tsx` | iPhone 15 Pro + Pixel 7 frames are excellent, already show status bar, dynamic island, home indicator |
| `BarcodeRenderer.tsx` | Already supports QR, Aztec, PDF417, Code 128 — all 4 formats we need |
| `AppleWalletPreview.tsx` | Already renders headerFields, primaryFields, secondaryFields, auxiliaryFields, backFields correctly. Has strip image, thumbnail, logo. Perforated edge for coupon. |
| `GoogleWalletPreview.tsx` | Already renders hero image, logo circle, row layout (oneItem/twoItems/threeItems), default rows per card type |

### 1.3 What's Broken (Replace)

| Problem | Current | Desired |
|---------|---------|---------|
| **State model** | Split Apple vs Google (`appleLogoUrl`, `googleLogoUrl`) | Unified (`logo`, `heroImage`) with platform-specific rendering |
| **UI pattern** | Accordion sections (Images, Fields, NFC, Advanced) | Canvas + sidebar tabs (Images, Card-Type, Content, Barcode, Colors, Advanced) |
| **Image upload** | 8 separate fields with technical specs shown | Smart upload zones with auto-crop preview, auto @2x/@3x generation |
| **Field editing** | Raw PassKit groups (`headerFields`, `primaryFields`) | Human labels ("Campos de cabecera", "Campo principal") with drag reorder |
| **Platform toggle** | Segmented button switches entire UI | Both previews visible simultaneously, toggle for focus |
| **Missing entirely** | No canvas, no templates, no AI, no undo, no design score, no auto-save, no stamp icons, no mobile bottom sheet |

### 1.4 What Can Be Reused vs What Must Be Built New

```
REUSE (with modifications):
├── DeviceFrame.tsx              → Keep 100%
├── BarcodeRenderer.tsx          → Keep 100%
├── AppleWalletPreview.tsx       → Add canvas interaction overlay, stamp icons, tier badges
├── GoogleWalletPreview.tsx      → Add canvas interaction overlay, card-type decorations
├── constants.ts                 → Add card-type visual mappings, icon library
└── helpers.ts                   → Extend with unified field mapping functions

REPLACE (new files):
├── WalletDesigner.tsx           → New WalletStudio component (canvas-based)
├── WalletCardPreview.tsx        → New StudioCanvas wrapper (dual preview)
├── types.ts                     → New unified state model
├── AppleFieldEditor.tsx         → New ContentTab component
├── GoogleRowBuilder.tsx         → Absorbed into ContentTab
├── ImageUploadField.tsx         → New SmartImageUpload component
└── NEW files:
    ├── TemplateGallery.tsx      → Template selection modal/page
    ├── WalletStudio.tsx         → Main canvas studio container
    ├── StudioToolbar.tsx        → Undo/redo, AI button, platform toggle, score
    ├── StudioSidebar.tsx        → Tab container
    ├── ImagesTab.tsx            → Logo + hero upload with crop preview
    ├── CardTypeTab.tsx          → Dynamic tab per card type (stamps, VIP, etc.)
    ├── ContentTab.tsx           → Unified field editor
    ├── BarcodeTab.tsx           → Barcode config with platform warnings
    ├── ColorsTab.tsx            → Color picker with contrast check
    ├── AdvancedTab.tsx          → Apple/Google specific settings
    ├── DesignScore.tsx          → Quality score panel
    ├── IconPicker.tsx           → Emoji/flat icon selector modal
    ├── StampGrid.tsx            → Visual stamp grid preview
    ├── AIButton.tsx             → ✨ Diseñar con IA button
    ├── AIChatModal.tsx          → AI assistant chat interface
    ├── AISuggestion.tsx         → Inline AI suggestion component
    ├── useWalletStudio.ts       → Main state management hook
    ├── useUndoRedo.ts           → Undo/redo hook
    ├── useAutoSave.ts           → Auto-save hook
    └── useDesignScore.ts        → Design quality scoring hook

BACKEND (Django):
├── apps/ai/                   → NEW Django app
│   ├── urls.py                → 5 AI endpoints
│   ├── views.py               → API views with rate limiting
│   ├── services/
│   │   ├── kimi_service.py    → Kimi K2.6 integration
│   │   ├── fallback_designer.py → Rule-based fallback
│   │   └── cost_tracker.py    → AI cost tracking
│   └── middleware.py          → Rate limiting middleware
├── common/vault.py            → Already has get_secret, put_secret
└── apps/wallet/               → Extend existing
    └── views.py               → Add template CRUD, pass generation endpoints
```

---

## 2. Implementation Phases

### Phase 0: Foundation (Week 1)
**Goal:** Unified state model, new types, constants extension. No UI yet.

| # | Task | Files | Dependencies | Risk |
|---|------|-------|-------------|------|
| 0.1 | Create new unified types (`WalletStudioState`) | `types.ts` (new v2) | None | Low |
| 0.2 | Create v1→v2 migration function | `migrations/v1-to-v2.ts` | 0.1 | Low |
| 0.3 | Extend constants with card-type visual mappings | `constants.ts` | None | Low |
| 0.4 | Create icon library registry (50+ icons) | `icon-library.ts` | None | Low |
| 0.5 | Build color conversion utilities (hex↔rgb) | `utils/colors.ts` | None | Low |
| 0.6 | Build field mapping utilities (unified→Apple→Google) | `utils/field-mappers.ts` | 0.1 | Medium |
| 0.7 | Build contrast calculation utility (WCAG) | `utils/contrast.ts` | None | Low |
| 0.8 | Write unit tests for utilities | `__tests__/*.test.ts` | 0.1-0.7 | Low |

**Deliverable:** All utility functions tested and working. State model defined.

---

### Phase 1: Canvas Shell (Week 2)
**Goal:** Studio container layout — toolbar, canvas area, sidebar. Still using existing previews.

| # | Task | Files | Dependencies | Risk |
|---|------|-------|-------------|------|
| 1.1 | Create `WalletStudio` container component | `WalletStudio.tsx` | 0.1 | Low |
| 1.2 | Create `StudioToolbar` with undo/redo placeholders | `StudioToolbar.tsx` | 1.1 | Low |
| 1.3 | Create `StudioSidebar` with tab container | `StudioSidebar.tsx` | 1.1 | Low |
| 1.4 | Create `StudioCanvas` — dual preview wrapper | `StudioCanvas.tsx` | Existing previews | Low |
| 1.5 | Create `PlatformToggle` (visual, not segmented) | `PlatformToggle.tsx` | 1.4 | Low |
| 1.6 | Create `useWalletStudio` hook (basic state) | `hooks/useWalletStudio.ts` | 0.1 | Medium |
| 1.7 | Create `useUndoRedo` hook | `hooks/useUndoRedo.ts` | None | Medium |
| 1.8 | Wire undo/redo to toolbar | `StudioToolbar.tsx` | 1.6, 1.7 | Low |
| 1.9 | Create `useAutoSave` hook | `hooks/useAutoSave.ts` | 1.6 | Low |
| 1.10 | Integrate auto-save into studio | `WalletStudio.tsx` | 1.9 | Low |

**Deliverable:** Studio shell renders. Can switch tabs. Undo/redo works. Auto-save persists to localStorage.

---

### Phase 2: Images Tab (Week 2-3)
**Goal:** Smart image upload with crop preview and platform variants.

| # | Task | Files | Dependencies | Risk |
|---|------|-------|-------------|------|
| 2.1 | Create `SmartImageUpload` component | `SmartImageUpload.tsx` | None | Low |
| 2.2 | Add drag-and-drop support | `SmartImageUpload.tsx` | 2.1 | Low |
| 2.3 | Add image validation (size, format, dimensions) | `SmartImageUpload.tsx` | 2.1 | Low |
| 2.4 | Add crop preview (Apple rect + Google circle) | `SmartImageUpload.tsx` | 2.1 | Low |
| 2.5 | Create `ImagesTab` sidebar component | `ImagesTab.tsx` | 2.1, 1.6 | Low |
| 2.6 | Integrate ImagesTab into sidebar | `StudioSidebar.tsx` | 2.5 | Low |
| 2.7 | Connect upload to state + preview update | `useWalletStudio.ts` | 2.5, 1.6 | Medium |
| 2.8 | Add backend endpoint for image upload + processing | Django views | None | Low |
| 2.9 | Add Sharp.js image processing (@2x/@3x generation) | Django service | 2.8 | Medium |

**Deliverable:** User can upload logo + hero image. Crop preview shows Apple vs Google. Auto-variants generated.

---

### Phase 3: Content Tab (Week 3)
**Goal:** Unified field editor replacing AppleFieldEditor + GoogleRowBuilder.

| # | Task | Files | Dependencies | Risk |
|---|------|-------|-------------|------|
| 3.1 | Design unified field model (abstracted from platform) | `types.ts` | 0.1 | Medium |
| 3.2 | Create `ContentTab` with field cards | `ContentTab.tsx` | 3.1, 1.6 | Medium |
| 3.3 | Add drag-to-reorder fields | `ContentTab.tsx` | 3.2 | Medium |
| 3.4 | Add field type selector (Header/Primary/Secondary/Auxiliary/Back) | `ContentTab.tsx` | 3.2 | Low |
| 3.5 | Add platform visibility toggles per field | `ContentTab.tsx` | 3.2 | Low |
| 3.6 | Add dynamic value templates ({customer_name}, {stamp_count}) | `ContentTab.tsx` | 3.2 | Low |
| 3.7 | Add field count limits with visual indicators | `ContentTab.tsx` | 3.2 | Low |
| 3.8 | Map unified fields to Apple preview | `utils/field-mappers.ts` | 3.1, 0.6 | Medium |
| 3.9 | Map unified fields to Google preview | `utils/field-mappers.ts` | 3.1, 0.6 | Medium |
| 3.10 | Add platform limit warnings (e.g., "Max 4 combined") | `ContentTab.tsx` | 3.7 | Low |

**Deliverable:** User can add/edit/reorder fields. Both Apple and Google previews update. Platform limits enforced.

---

### Phase 4: Barcode & Colors Tabs (Week 3-4)
**Goal:** Barcode configuration and color management.

| # | Task | Files | Dependencies | Risk |
|---|------|-------|-------------|------|
| 4.1 | Create `BarcodeTab` with format selector | `BarcodeTab.tsx` | Existing BarcodeRenderer | Low |
| 4.2 | Add barcode data builder (customer_id + program_id + timestamp) | `BarcodeTab.tsx` | 4.1 | Low |
| 4.3 | Add barcode preview | `BarcodeTab.tsx` | 4.1 | Low |
| 4.4 | Add platform-specific barcode warnings | `BarcodeTab.tsx` | 4.1 | Low |
| 4.5 | Create `ColorsTab` with color picker | `ColorsTab.tsx` | 0.5 | Low |
| 4.6 | Add real-time contrast check | `ColorsTab.tsx` | 0.7 | Low |
| 4.7 | Add quick color preset swatches | `ColorsTab.tsx` | 4.5 | Low |
| 4.8 | Add color conversion display (hex ↔ rgb) | `ColorsTab.tsx` | 0.5 | Low |
| 4.9 | Connect colors to both previews | `useWalletStudio.ts` | 4.5, 1.6 | Low |

**Deliverable:** User can configure barcode and colors. Contrast warnings shown. Both previews reflect changes.

---

### Phase 5: Card-Type Visual Tabs (Week 4)
**Goal:** Dynamic tabs for stamps, VIP, cashback, etc.

| # | Task | Files | Dependencies | Risk |
|---|------|-------|-------------|------|
| 5.1 | Create `IconPicker` modal component | `IconPicker.tsx` | 0.4 | Medium |
| 5.2 | Create `StampGrid` visual component | `StampGrid.tsx` | 5.1 | Medium |
| 5.3 | Create `CardTypeTab` router (renders correct sub-tab) | `CardTypeTab.tsx` | None | Low |
| 5.4 | Build Stamp card config (shape, icon, color, count, layout) | `tabs/StampTab.tsx` | 5.1, 5.2 | Medium |
| 5.5 | Build Cashback config (coin icon, tier badges, progress) | `tabs/CashbackTab.tsx` | 5.1 | Medium |
| 5.6 | Build VIP config (crown icon, member badge, benefits) | `tabs/VIPTab.tsx` | 5.1 | Medium |
| 5.7 | Build Coupon config (cut line, discount badge, tag) | `tabs/CouponTab.tsx` | 5.1 | Low |
| 5.8 | Build Gift config (box graphic, ribbon, denomination) | `tabs/GiftTab.tsx` | 5.1 | Medium |
| 5.9 | Build remaining card type tabs (affiliate, discount, corporate, referral, multipass) | `tabs/*.tsx` | 5.1 | Medium |
| 5.10 | Add stamp icons to Apple preview | `AppleWalletPreview.tsx` | 5.2 | Medium |
| 5.11 | Add card-type decorations to both previews | `AppleWalletPreview.tsx`, `GoogleWalletPreview.tsx` | 5.3-5.9 | Medium |

**Deliverable:** Each card type shows its specific configuration tab. Stamp icons render on preview. All 10 types supported.

---

### Phase 6: Advanced Tab & Design Score (Week 4-5)
**Goal:** Platform-specific settings and quality validation.

| # | Task | Files | Dependencies | Risk |
|---|------|-------|-------------|------|
| 6.1 | Create `AdvancedTab` with Apple-specific settings | `AdvancedTab.tsx` | 1.6 | Low |
| 6.2 | Add Apple: icon upload, description, NFC, locations, beacons | `AdvancedTab.tsx` | 6.1 | Low |
| 6.3 | Add Google: Smart Tap, app link, screenshot disable, grouping | `AdvancedTab.tsx` | 6.1 | Low |
| 6.4 | Create `DesignScore` component | `DesignScore.tsx` | 0.7 | Low |
| 6.5 | Implement 9-check scoring algorithm | `hooks/useDesignScore.ts` | 0.7 | Medium |
| 6.6 | Add score breakdown panel | `DesignScore.tsx` | 6.5 | Low |
| 6.7 | Add inline fix suggestions | `DesignScore.tsx` | 6.5 | Low |
| 6.8 | Add auto-fix button for simple issues | `DesignScore.tsx` | 6.7 | Low |
| 6.9 | Integrate score into toolbar | `StudioToolbar.tsx` | 6.4 | Low |

**Deliverable:** Advanced settings accessible. Design score calculates in real-time. Auto-fix works for contrast issues.

---

### Phase 7: Template Gallery (Week 5)
**Goal:** Entry point with 20+ templates and AI generation.

| # | Task | Files | Dependencies | Risk |
|---|------|-------|-------------|------|
| 7.1 | Create `TemplateGallery` page/modal | `TemplateGallery.tsx` | None | Medium |
| 7.2 | Add search, filter, category tabs | `TemplateGallery.tsx` | 7.1 | Low |
| 7.3 | Design 20+ template definitions (JSON) | `templates/registry.ts` | 0.1 | Medium |
| 7.4 | Add template preview modal (side-by-side iPhone+Pixel) | `TemplatePreviewModal.tsx` | 7.1 | Low |
| 7.5 | Add "Empezar desde cero" blank option | `TemplateGallery.tsx` | 7.1 | Low |
| 7.6 | Connect template selection to studio | `TemplateGallery.tsx` | 1.6 | Low |
| 7.7 | Add template application animation | `TemplateGallery.tsx` | 7.6 | Low |

**Deliverable:** User sees template gallery, can preview, select, and apply. Studio loads with template data.

---

### Phase 8: AI Integration (Week 5-6)
**Goal:** Kimi K2.6 backend + frontend AI features.

| # | Task | Files | Dependencies | Risk |
|---|------|-------|-------------|------|
| 8.1 | Create Django `apps/ai/` app structure | Backend | None | Low |
| 8.2 | Create `KimiService` class | `services/kimi_service.py` | Vault key | Medium |
| 8.3 | Implement `generate-template` endpoint | `views.py` | 8.2 | Medium |
| 8.4 | Implement `suggest-colors` endpoint | `views.py` | 8.2 | Medium |
| 8.5 | Implement `critique-design` endpoint | `views.py` | 8.2 | Medium |
| 8.6 | Implement `suggest-stamp-icons` endpoint | `views.py` | 8.2 | Low |
| 8.7 | Implement rate limiting middleware | `middleware.py` | None | Low |
| 8.8 | Implement cost tracking | `services/cost_tracker.py` | None | Low |
| 8.9 | Create `AIButton` component | `AIButton.tsx` | None | Low |
| 8.10 | Create `AIChatModal` component | `AIChatModal.tsx` | 8.9 | Medium |
| 8.11 | Create `AISuggestion` inline component | `AISuggestion.tsx` | None | Low |
| 8.12 | Create `useAI` frontend hook | `hooks/useAI.ts` | 8.9-8.11 | Medium |
| 8.13 | Integrate AI button into toolbar | `StudioToolbar.tsx` | 8.9 | Low |
| 8.14 | Wire AI suggestions to design score | `DesignScore.tsx` | 8.6, 8.11 | Low |
| 8.15 | Add fallback designer (when Kimi unavailable) | `services/fallback_designer.py` | 8.3 | Low |

**Deliverable:** AI button works. Can generate templates, suggest colors, critique designs. Rate limits enforced.

---

### Phase 9: Mobile & Polish (Week 6)
**Goal:** Responsive design, bottom sheet, keyboard shortcuts.

| # | Task | Files | Dependencies | Risk |
|---|------|-------|-------------|------|
| 9.1 | Add responsive breakpoints to studio | `WalletStudio.tsx` | 1.1 | Low |
| 9.2 | Create mobile bottom sheet for sidebar | `MobileBottomSheet.tsx` | 1.3 | Medium |
| 9.3 | Add swipe-to-switch-platform on mobile | `StudioCanvas.tsx` | 1.4 | Medium |
| 9.4 | Implement all keyboard shortcuts | `hooks/useKeyboardShortcuts.ts` | 1.6 | Low |
| 9.5 | Add loading states and skeletons | Various | All | Low |
| 9.6 | Add error boundaries | `ErrorBoundary.tsx` | None | Low |
| 9.7 | Add session recovery (localStorage draft) | `hooks/useSessionRecovery.ts` | 1.9 | Low |
| 9.8 | Add browser crash recovery | `hooks/useSessionRecovery.ts` | 9.7 | Low |
| 9.9 | Performance audit (canvas render < 16ms) | Various | All | Medium |
| 9.10 | Accessibility audit (WCAG AA, keyboard nav, screen reader) | Various | All | Medium |

**Deliverable:** Works on mobile and desktop. All shortcuts work. Session recovery works. Performance acceptable.

---

### Phase 10: Integration & Testing (Week 7)
**Goal:** Connect to existing wizard, test end-to-end.

| # | Task | Files | Dependencies | Risk |
|---|------|-------|-------------|------|
| 10.1 | Replace WalletDesigner in wizard Step 2 | Wizard component | 1-9 | High |
| 10.2 | Replace WalletCardPreview in wizard | Wizard component | 1-9 | High |
| 10.3 | Ensure backward compatibility with existing saved designs | Migration | 0.2 | High |
| 10.4 | Update backend pass generation to use unified state | Django | 0.6 | High |
| 10.5 | E2E test: Create stamp card from template | Tests | All | Medium |
| 10.6 | E2E test: Create VIP card with AI | Tests | All | Medium |
| 10.7 | E2E test: Edit existing design | Tests | All | Medium |
| 10.8 | E2E test: Mobile flow | Tests | All | Medium |
| 10.9 | User acceptance testing with María persona | Manual | All | Low |
| 10.10 | Deploy to staging | DevOps | All | Medium |

**Deliverable:** Fully integrated into Loyallia wizard. All existing programs still work. Staging deployment ready.

---

### Phase 11: Launch (Week 8)
**Goal:** Production release.

| # | Task | Files | Dependencies | Risk |
|---|------|-------|-------------|------|
| 11.1 | Production deployment | DevOps | 10.10 | Medium |
| 11.2 | Monitor error rates and performance | Monitoring | 11.1 | Low |
| 11.3 | Gather user feedback | Product | 11.1 | Low |
| 11.4 | Bug fixes and polish | Various | 11.3 | Low |
| 11.5 | Announcement / changelog | Marketing | 11.1 | Low |

**Deliverable:** Live in production. Users creating passes with new studio.

---

## 3. Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|:-----------:|:------:|------------|
| Kimi API rate limits / downtime | Medium | High | Fallback designer + caching + retries |
| Image processing (Sharp) memory issues | Medium | Medium | Process in background queue (Celery) |
| Canvas performance on low-end devices | Medium | Medium | Virtual scrolling, lazy rendering |
| Mobile bottom sheet UX feels clunky | Medium | Medium | Iterative user testing |
| Existing design migration breaks | Low | High | Thorough migration function + backup v1 |
| Undo/redo state grows too large | Low | Medium | Cap history at 50 actions |
| Team capacity during implementation | Medium | High | Phased approach, can stop after any phase |

---

## 4. Dependencies & Blockers

```
Phase 0 (Foundation)
    │
    ├──→ Phase 1 (Canvas Shell)
    │       │
    │       ├──→ Phase 2 (Images) ──┐
    │       │                       │
    │       ├──→ Phase 3 (Content) ─┤
    │       │                       ├──→ Phase 5 (Card-Type Visuals)
    │       ├──→ Phase 4 (Barcode/Colors)─┘       │
    │       │                                      │
    │       ├──→ Phase 6 (Advanced/Score) ←───────┘
    │       │
    │       └──→ Phase 7 (Templates)
    │               │
    │               └──→ Phase 8 (AI)
    │                       │
    │                       └──→ Phase 9 (Mobile/Polish)
    │                               │
    │                               └──→ Phase 10 (Integration)
    │                                       │
    │                                       └──→ Phase 11 (Launch)
    │
    └──→ Can run in parallel: Phase 8 backend (8.1-8.8) during Phases 2-7
```

---

## 5. Decision Points for User

Before coding begins, user must decide:

| # | Decision | Options | Default |
|---|----------|---------|---------|
| 1 | **Template count for launch** | 10 / 15 / 20 / 25+ | 20 |
| 2 | **AI free tier limits** | 5/10/20 templates per user/month | 10 |
| 3 | **Mobile first or desktop first?** | Desktop → mobile / Mobile → desktop / Both simultaneously | Both simultaneously |
| 4 | **Keep old designer as fallback?** | Yes (v1 tab) / No (full replace) | No |
| 5 | **Third-party icon library** | Lucide / Heroicons / Custom SVG set / All combined | Lucide + Custom |
| 6 | **Stamp icon animation** | CSS only / Lottie / GIF | CSS only |
| 7 | **Export formats** | .pkpass only / .pkpass + JWT link / + PNG preview | .pkpass + JWT |
| 8 | **Can users save custom templates?** | Yes / No | Yes |

---

## 6. File Count Estimate

| Category | New Files | Modified Files | Deleted Files |
|----------|:---------:|:--------------:|:-------------:|
| Components | ~25 | ~5 | ~2 |
| Hooks | ~8 | 0 | 0 |
| Utilities | ~5 | 0 | 0 |
| Types/Constants | ~3 | ~2 | ~1 |
| Tests | ~15 | 0 | 0 |
| Backend (Django) | ~8 | ~2 | 0 |
| **Total** | **~64** | **~9** | **~3** |

---

*End of Implementation Plan*
*Awaiting user approval before any code is written*
