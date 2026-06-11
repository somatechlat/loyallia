# Wallet Pass Studio — Complete Implementation Guide

> **Branch:** `PASS-DESIGNER`  
> **Status:** ⏳ Awaiting explicit user "PROCEED" before any code  
> **Last Updated:** 2026-06-03  
> **Scope:** Complete redesign of Loyallia Wallet Pass Studio  
> **Documentation Source:** 12 SRS documents (~526KB) + Testing & QA Strategy (~75KB) consolidated into this actionable guide  
> **Companion Document:** `TESTING-QA-STRATEGY.md` — Complete testing strategy, test cases, CI/CD, QA checklists per phase

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [What We Are Building](#2-what-we-are-building)
3. [Current Codebase Inventory](#3-current-codebase-inventory)
4. [Architecture Overview](#4-architecture-overview)
5. [Complete File List (87 Files)](#5-complete-file-list-87-files)
6. [Phase-by-Phase Implementation TODO](#6-phase-by-phase-implementation-todo)
7. [Frontend Components Deep Dive](#7-frontend-components-deep-dive)
8. [Backend API Specification](#8-backend-api-specification)
9. [Database Schema](#9-database-schema)
10. [Plan & Rate Limiting Integration](#10-plan--rate-limiting-integration)
11. [AI Integration Specification](#11-ai-integration-specification)
12. [Testing Strategy](#12-testing-strategy)
13. [Decision Points Checklist](#13-decision-points-checklist)
14. [Risk Matrix & Mitigations](#14-risk-matrix--mitigations)
15. [Definition of Done per Phase](#15-definition-of-done-per-phase)

---

## 1. Executive Summary

This document is the **single source of truth** for implementing the Wallet Pass Studio redesign. It consolidates all 12 SRS documents into an actionable, file-by-file, task-by-task implementation guide.

**The Goal:** Transform the current accordion-based form editor into a **Canva-like visual design environment** where business owners create Apple Wallet + Google Wallet passes simultaneously.

**Key Numbers:**
- **87 new files** to create
- **10 files** to modify
- **3 files** to delete
- **11 implementation phases** over 8 weeks
- **10 card types** supported with unique visuals
- **25+ dynamic value templates**
- **20+ system templates** at launch
- **3 new PlanFeature constants**
- **2 new plan limit fields**

---

## 2. What We Are Building

### 2.1 Feature Matrix

| Category | Feature | Priority | Document |
|----------|---------|----------|----------|
| **Design Surface** | Canvas-based studio (not forms) | CRITICAL | SRS-003 |
| | Dual-platform preview (iPhone + Pixel simultaneously) | CRITICAL | SRS-003 |
| | Front ↔ Back flip toggle | CRITICAL | SRS-008 |
| | Undo/redo (50 actions) | HIGH | SRS-002 |
| | Auto-save every 30s | HIGH | SRS-002 |
| | Design quality score (14 checks) | HIGH | SRS-002 |
| **Images** | Smart image upload (drag & drop) | CRITICAL | SRS-003 |
| | Auto-generate @2x/@3x for Apple | CRITICAL | SRS-002 |
| | Crop preview (Apple rect vs Google circle) | HIGH | SRS-003 |
| | 50+ flat icon library | HIGH | SRS-006 |
| **Fields** | Field Studio (visual field editor) | CRITICAL | SRS-010 |
| | 5 field groups (Header/Primary/Secondary/Auxiliary/Back) | CRITICAL | SRS-010 |
| | 25+ dynamic value templates | CRITICAL | SRS-010 |
| | Apple changeMessage push notifications | CRITICAL | SRS-010 |
| | Google Wallet messages | CRITICAL | SRS-010 |
| **Back Design** | Front/back flip with animation | CRITICAL | SRS-008 |
| | Apple backFields preview | CRITICAL | SRS-008 |
| | Google detailsTemplateOverride preview | CRITICAL | SRS-008 |
| | Default back content per card type | HIGH | SRS-008 |
| **Templates** | 20+ system templates by industry | CRITICAL | SRS-009 |
| | User template library (save own designs) | CRITICAL | SRS-009 |
| | Template CRUD (rename, duplicate, delete) | CRITICAL | SRS-009 |
| | Template preview before apply | HIGH | SRS-009 |
| **AI** | ✨ "Diseñar con IA" button | CRITICAL | SRS-007 |
| | Groq backend proxy | CRITICAL | SRS-007 |
| | Generate template from description | HIGH | SRS-007 |
| | Suggest colors based on industry | HIGH | SRS-007 |
| | Design critique and scoring | MEDIUM | SRS-007 |
| **Barcode** | 5 barcode formats | HIGH | SRS-003 |
| | Barcode data builder | MEDIUM | SRS-003 |
| **Mobile** | Responsive design | HIGH | SRS-003 |
| | Bottom sheet sidebar | HIGH | SRS-003 |

### 2.2 10 Loyallia Card Types

| # | Card Type | Apple Style | Google Type | Custom Visual |
|---|-----------|------------|-------------|---------------|
| 1 | Stamp Card | `storeCard` | `loyalty` | Stamp grid (shape, icon, color, count) |
| 2 | Cashback | `storeCard` | `loyalty` | Coin icon, tier badges, progress bar |
| 3 | Coupon | `coupon` | `offer` | Cut line, discount badge, tag |
| 4 | Affiliate | `generic` | `generic` | Custom layout, referral code |
| 5 | Discount | `coupon` | `offer` | Percentage badge, tier display |
| 6 | Gift Certificate | `storeCard` | `giftCard` | Box graphic, ribbon, denomination |
| 7 | VIP Membership | `generic` | `loyalty` | Crown icon, member badge, benefits |
| 8 | Corporate Discount | `coupon` | `offer` | Corporate badge, employee ID |
| 9 | Referral Pass | `generic` | `generic` | Referral code, friend bonus |
| 10 | Multipass | `storeCard` | `generic` | Package counter, session tracker |

---

## 3. Current Codebase Inventory

### 3.1 Existing Files (to Keep / Modify / Delete)

| File | Lines | Current Purpose | Verdict | Action |
|------|-------|----------------|---------|--------|
| `frontend/src/components/programs/WalletDesigner.tsx` | 275 | Accordion editor, Apple/Google split | **Replace** | Delete, replace with `WalletStudio.tsx` |
| `frontend/src/components/programs/WalletCardPreview.tsx` | 331 | Platform toggle + preview wrapper | **Refactor** | Replace with `StudioCanvas.tsx` |
| `frontend/src/components/wallet/AppleWalletPreview.tsx` | 339 | iPhone frame, field rendering | **Reuse** | Add canvas overlay, stamp icons, tier badges |
| `frontend/src/components/wallet/GoogleWalletPreview.tsx` | 204 | Pixel frame, row rendering | **Reuse** | Add canvas overlay, card-type decorations |
| `frontend/src/components/wallet/types.ts` | 222 | WalletDesignState (split model) | **Replace** | Replace with unified state v2 |
| `frontend/src/components/wallet/design/AppleFieldEditor.tsx` | 192 | Raw PassKit field groups | **Replace** | Absorbed into `FieldStudio.tsx` |
| `frontend/src/components/wallet/design/GoogleRowBuilder.tsx` | 133 | Raw cardTemplateOverride | **Replace** | Absorbed into `FieldStudio.tsx` |
| `frontend/src/components/wallet/DeviceFrame.tsx` | 119 | iPhone 15 Pro + Pixel 7 frames | **Keep** | No changes needed |
| `frontend/src/components/wallet/BarcodeRenderer.tsx` | ? | Barcode SVG rendering | **Keep** | No changes needed |
| `frontend/src/components/wallet/constants.ts` | ? | Pass style mappings | **Extend** | Add card-type visual mappings |

### 3.2 Backend Files to Extend

| File | Purpose | Changes |
|------|---------|---------|
| `backend/apps/billing/models.py` | SubscriptionPlan, PlanFeature | +3 constants, +2 limit fields |
| `backend/common/plan_enforcement.py` | Limit enforcement decorators | +3 usage counters |
| `backend/common/rate_limit.py` | Rate limiting middleware | +3 rate rules |
| `backend/apps/tenants/super_admin_api/plan_validation.py` | Plan validation | +3 validation rules |
| `backend/apps/tenants/api.py` | Plan features endpoint | Update response JSON |

---

## 4. Architecture Overview

### 4.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER BROWSER                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Next.js Frontend (Wallet Pass Studio)                                │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │  │
│  │  │  Toolbar    │  │   Canvas    │  │   Sidebar   │                   │  │
│  │  │  (Undo/Redo │  │ (iPhone +   │  │ (Tabs: Img, │                   │  │
│  │  │   AI, Score)│  │  Pixel)     │  │  Fields,etc)│                   │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                   │  │
│  │         └────────────────┴────────────────┘                          │  │
│  │                          │                                           │  │
│  │                    POST /api/v1/wallet/studio/*                       │  │
│  └──────────────────────────┼───────────────────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DJANGO BACKEND                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  apps/wallet/                                                         │  │
│  │    ├── views.py → Template CRUD, pass generation, field validation   │  │
│  │    ├── models.py → WalletTemplate, WalletPassOperationLog            │  │
│  │    └── urls.py → /api/v1/wallet/studio/*                             │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │  apps/ai/                                                             │  │
│  │    ├── services/kimi_service.py → Groq integration              │  │
│  │    ├── services/fallback_designer.py → Rule-based fallback           │  │
│  │    ├── views.py → AI endpoints (generate, colors, critique)          │  │
│  │    └── middleware.py → AI rate limiting                              │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │  common/plan_enforcement.py → @require_feature, @enforce_limit       │  │
│  │  common/rate_limit.py → RateLimitMiddleware                          │  │
│  │  common/vault.py → get_secret('kimi_api_key')                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                                    │
│  Groq API (api.groq.com/openai/v1) → AI generation                               │
│  Apple Push Notification Service → Field change alerts                       │
│  Google Wallet REST API → Pass updates                                       │
│  S3/MinIO → Image storage + template previews                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 State Architecture (Unified v2)

```typescript
interface WalletPassStudioState {
  // Core Identity
  cardType: string;           // stamp | cashback | coupon | ...
  industry: string;           // cafe | retail | gym | ...
  
  // Visual Design
  colors: {
    background: string;       // #RRGGBB
    foreground: string;       // #RRGGBB
    label: string;            // #RRGGBB (Apple labelColor)
    accent?: string;          // Optional accent
  };
  
  // Images
  images: {
    logo?: ImageAsset;        // Unified logo (renders differently per platform)
    hero?: ImageAsset;        // strip (Apple) / heroImage (Google)
    icon?: ImageAsset;        // icon (Apple) / programLogo (Google)
    thumbnail?: ImageAsset;   // thumbnail (Apple generic)
  };
  
  // Fields (Unified Field Model)
  fields: UnifiedField[];     // All fields with platform mapping
  
  // Card-Type Specific Settings
  cardTypeConfig: {
    // Stamp card
    stampCount?: number;
    stampsRequired?: number;
    stampShape?: string;
    stampIcon?: string;
    stampFilledIcon?: string;
    stampColor?: string;
    stampGridLayout?: string;
    
    // Cashback
    cashbackPercentage?: number;
    tierName?: string;
    tierBadge?: string;
    
    // Coupon
    discountAmount?: number;
    discountPercentage?: number;
    redemptionCode?: string;
    expirationDate?: string;
    
    // VIP
    memberSince?: string;
    benefits?: string[];
    
    // Gift
    giftAmount?: number;
    giftOccasion?: string;
    
    // ... etc for all 10 types
  };
  
  // Barcode
  barcode: {
    format: 'QR_CODE' | 'AZTEC' | 'PDF417' | 'CODE128' | 'DATA_MATRIX';
    message: string;
    messageEncoding: string;
    altText?: string;
  };
  
  // Back Content
  backContent: {
    fields: BackField[];
    links: BackLink[];
    appLink?: AppLinkConfig;
    detailImages?: DetailImage[];  // Google only
  };
  
  // Apple-Specific
  apple: {
    passStyle: 'storeCard' | 'coupon' | 'generic';
    description?: string;
    organizationName?: string;
    appLaunchURL?: string;
    nfc?: NFCConfig;
    locations?: LocationConfig[];
    beacons?: BeaconConfig[];
  };
  
  // Google-Specific
  google: {
    passType: 'loyalty' | 'offer' | 'giftCard' | 'generic';
    programName?: string;
    programLogo?: ImageAsset;
    hexBackgroundColor?: string;
    heroImage?: ImageAsset;
    detailsTemplateOverride?: any;
    smartTapRedemptionValue?: string;
    groupingId?: string;
  };
  
  // UI State
  ui: {
    activeTab: string;        // images | cardType | fields | back | barcode | colors | advanced
    platformView: 'both' | 'apple' | 'google';
    showBack: boolean;        // Front/back toggle
    zoom: number;
    appliedTemplateId?: string;
    isModified: boolean;
  };
  
  // Metadata
  id?: string;
  name?: string;
  version: 2;
}
```

---

## 5. Complete File List (87 Files)

### 5.1 Frontend Components (~35 new, ~5 modified, ~2 deleted)

#### NEW Components

| # | File Path | Purpose | Phase |
|---|-----------|---------|-------|
| 1 | `frontend/src/components/wallet/WalletStudio.tsx` | Main canvas studio container | 1 |
| 2 | `frontend/src/components/wallet/studio/StudioToolbar.tsx` | Undo/redo, AI button, platform toggle, score | 1 |
| 3 | `frontend/src/components/wallet/studio/StudioSidebar.tsx` | Tab container for all sidebar tabs | 1 |
| 4 | `frontend/src/components/wallet/studio/StudioCanvas.tsx` | Dual preview wrapper (iPhone + Pixel) | 1 |
| 5 | `frontend/src/components/wallet/studio/PlatformToggle.tsx` | Visual platform toggle (not segmented) | 1 |
| 6 | `frontend/src/components/wallet/studio/ImagesTab.tsx` | Logo + hero upload with crop preview | 2 |
| 7 | `frontend/src/components/wallet/studio/SmartImageUpload.tsx` | Drag-drop upload with validation | 2 |
| 8 | `frontend/src/components/wallet/studio/CardTypeTab.tsx` | Router for card-type-specific tabs | 5 |
| 9 | `frontend/src/components/wallet/studio/tabs/StampTab.tsx` | Stamp card configuration | 5 |
| 10 | `frontend/src/components/wallet/studio/tabs/CashbackTab.tsx` | Cashback configuration | 5 |
| 11 | `frontend/src/components/wallet/studio/tabs/CouponTab.tsx` | Coupon configuration | 5 |
| 12 | `frontend/src/components/wallet/studio/tabs/VIPTab.tsx` | VIP membership configuration | 5 |
| 13 | `frontend/src/components/wallet/studio/tabs/GiftTab.tsx` | Gift certificate configuration | 5 |
| 14 | `frontend/src/components/wallet/studio/tabs/AffiliateTab.tsx` | Affiliate configuration | 5 |
| 15 | `frontend/src/components/wallet/studio/tabs/DiscountTab.tsx` | Discount configuration | 5 |
| 16 | `frontend/src/components/wallet/studio/tabs/CorporateTab.tsx` | Corporate discount configuration | 5 |
| 17 | `frontend/src/components/wallet/studio/tabs/ReferralTab.tsx` | Referral pass configuration | 5 |
| 18 | `frontend/src/components/wallet/studio/tabs/MultipassTab.tsx` | Multipass configuration | 5 |
| 19 | `frontend/src/components/wallet/studio/FieldStudio.tsx` | Field editor container | 3 |
| 20 | `frontend/src/components/wallet/studio/FieldCard.tsx` | Compact field card with notification bell | 3 |
| 21 | `frontend/src/components/wallet/studio/FieldEditorModal.tsx` | Expanded field editor modal | 3 |
| 22 | `frontend/src/components/wallet/studio/DynamicTemplatePicker.tsx` | Dynamic value template picker | 3 |
| 23 | `frontend/src/components/wallet/studio/FieldLimitIndicator.tsx` | Visual field limit progress bars | 3 |
| 24 | `frontend/src/components/wallet/studio/NotificationConfigPanel.tsx` | Apple changeMessage + Google Messages | 3 |
| 25 | `frontend/src/components/wallet/studio/BarcodeTab.tsx` | Barcode configuration | 4 |
| 26 | `frontend/src/components/wallet/studio/ColorsTab.tsx` | Color picker with contrast check | 4 |
| 27 | `frontend/src/components/wallet/studio/BackDesignTab.tsx` | Back/reverse content editor | 6 |
| 28 | `frontend/src/components/wallet/studio/AppleBackPreview.tsx` | Apple back-of-pass preview | 6 |
| 29 | `frontend/src/components/wallet/studio/GoogleBackPreview.tsx` | Google details view preview | 6 |
| 30 | `frontend/src/components/wallet/studio/AdvancedTab.tsx` | Apple/Google specific settings | 6 |
| 31 | `frontend/src/components/wallet/studio/DesignScore.tsx` | Quality score panel | 6 |
| 32 | `frontend/src/components/wallet/studio/TemplateGallery.tsx` | Template selection with tabs | 7 |
| 33 | `frontend/src/components/wallet/studio/MyTemplatesTab.tsx` | User template management | 7 |
| 34 | `frontend/src/components/wallet/studio/TemplateCard.tsx` | Template card with actions | 7 |
| 35 | `frontend/src/components/wallet/studio/SaveTemplateModal.tsx` | Save design as template | 7 |
| 36 | `frontend/src/components/wallet/studio/TemplatePreviewModal.tsx` | Template preview before apply | 7 |
| 37 | `frontend/src/components/wallet/studio/AIButton.tsx` | ✨ Diseñar con IA button | 8 |
| 38 | `frontend/src/components/wallet/studio/AIChatModal.tsx` | AI assistant chat interface | 8 |
| 39 | `frontend/src/components/wallet/studio/AISuggestion.tsx` | Inline AI suggestion component | 8 |
| 40 | `frontend/src/components/wallet/studio/IconPicker.tsx` | Emoji/flat icon selector modal | 5 |
| 41 | `frontend/src/components/wallet/studio/StampGrid.tsx` | Visual stamp grid preview | 5 |
| 42 | `frontend/src/components/wallet/studio/MobileBottomSheet.tsx` | Mobile sidebar bottom sheet | 9 |
| 43 | `frontend/src/components/wallet/studio/ErrorBoundary.tsx` | Studio error boundary | 9 |
| 44 | `frontend/src/components/shared/LockedFeature.tsx` | Reusable locked feature component | 11 |
| 45 | `frontend/src/components/shared/LimitReached.tsx` | Reusable limit reached component | 11 |

#### MODIFIED Components

| # | File Path | Changes |
|---|-----------|---------|
| 1 | `frontend/src/components/wallet/AppleWalletPreview.tsx` | Add canvas overlay, stamp icons, tier badges, back preview |
| 2 | `frontend/src/components/wallet/GoogleWalletPreview.tsx` | Add canvas overlay, card-type decorations, back preview |
| 3 | `frontend/src/components/wallet/constants.ts` | Add card-type visual mappings, icon library |
| 4 | `frontend/src/components/programs/WalletDesigner.tsx` | **DELETE** — replaced by WalletStudio |
| 5 | `frontend/src/components/programs/WalletCardPreview.tsx` | **DELETE** — replaced by StudioCanvas |

### 5.2 Frontend Hooks (~10 new)

| # | File Path | Purpose | Phase |
|---|-----------|---------|-------|
| 1 | `frontend/src/hooks/useWalletStudio.ts` | Main state management hook | 1 |
| 2 | `frontend/src/hooks/useUndoRedo.ts` | Undo/redo (50 actions) | 1 |
| 3 | `frontend/src/hooks/useAutoSave.ts` | Auto-save every 30s to localStorage | 1 |
| 4 | `frontend/src/hooks/useDesignScore.ts` | 14-check quality scoring | 6 |
| 5 | `frontend/src/hooks/useTemplateLibrary.ts` | Template CRUD operations | 7 |
| 6 | `frontend/src/hooks/useFieldStudio.ts` | Field editor state management | 3 |
| 7 | `frontend/src/hooks/useAI.ts` | AI API calls with loading states | 8 |
| 8 | `frontend/src/hooks/usePlanFeatures.ts` | Plan feature gating | 11 |
| 9 | `frontend/src/hooks/useKeyboardShortcuts.ts` | Keyboard shortcuts | 9 |
| 10 | `frontend/src/hooks/useSessionRecovery.ts` | Browser crash recovery | 9 |

### 5.3 Frontend Utilities (~6 new)

| # | File Path | Purpose | Phase |
|---|-----------|---------|-------|
| 1 | `frontend/src/components/wallet/utils/colors.ts` | Hex↔RGB conversion, contrast calculation | 0 |
| 2 | `frontend/src/components/wallet/utils/field-mappers.ts` | Unified→Apple→Google field mapping | 0 |
| 3 | `frontend/src/components/wallet/utils/field-validation.ts` | Field limit validation | 3 |
| 4 | `frontend/src/components/wallet/utils/contrast.ts` | WCAG contrast ratio calculation | 0 |
| 5 | `frontend/src/components/wallet/migrations/v1-to-v2.ts` | State migration from old format | 0 |
| 6 | `frontend/src/components/wallet/icon-library.ts` | 200+ SVG icon registry | 0 |

### 5.4 Frontend Types (~4 new, ~2 modified, ~1 deleted)

| # | File Path | Purpose | Phase |
|---|-----------|---------|-------|
| 1 | `frontend/src/components/wallet/types.ts` | **REPLACE** with unified state v2 | 0 |
| 2 | `frontend/src/components/wallet/types/unified-field.ts` | UnifiedField interface | 0 |
| 3 | `frontend/src/components/wallet/types/back-content.ts` | BackField, BackLink, DetailImage | 0 |
| 4 | `frontend/src/components/wallet/types/templates.ts` | WalletTemplate interface | 7 |
| 5 | `frontend/src/components/wallet/types/dynamic-templates.ts` | Dynamic template registry | 3 |
| 6 | `frontend/src/components/wallet/types/card-type-config.ts` | Card-type specific configs | 5 |

### 5.5 Frontend Tests (~35 new)

> **Full testing strategy documented in:** `TESTING-QA-STRATEGY.md`
> Includes: Unit tests, Component tests, Integration tests, E2E tests, Visual regression, Accessibility, Performance

| # | File Path | Purpose | Phase |
|---|-----------|---------|-------|
| 1 | `frontend/src/components/wallet/__tests__/colors.test.ts` | Color utility tests | 0 |
| 2 | `frontend/src/components/wallet/__tests__/contrast.test.ts` | Contrast calculation tests | 0 |
| 3 | `frontend/src/components/wallet/__tests__/field-mappers.test.ts` | Field mapping tests | 0 |
| 4 | `frontend/src/components/wallet/__tests__/field-validation.test.ts` | Field validation tests | 3 |
| 5 | `frontend/src/components/wallet/__tests__/useUndoRedo.test.ts` | Undo/redo hook tests | 1 |
| 6 | `frontend/src/components/wallet/__tests__/useAutoSave.test.ts` | Auto-save hook tests | 1 |
| 7 | `frontend/src/components/wallet/__tests__/useDesignScore.test.ts` | Design score tests | 6 |
| 8 | `frontend/src/components/wallet/__tests__/StudioCanvas.test.tsx` | Canvas rendering tests | 1 |
| 9 | `frontend/src/components/wallet/__tests__/FieldStudio.test.tsx` | Field editor tests | 3 |
| 10 | `frontend/src/components/wallet/__tests__/TemplateGallery.test.tsx` | Template gallery tests | 7 |
| 11 | `frontend/src/components/wallet/__tests__/useAI.test.ts` | AI hook tests | 8 |
| 12 | `frontend/src/components/wallet/__tests__/migrations.test.ts` | v1→v2 migration tests | 0 |
| 13 | `frontend/src/components/wallet/__tests__/IconPicker.test.tsx` | Icon picker tests | 5 |
| 14 | `frontend/src/components/wallet/__tests__/StampGrid.test.tsx` | Stamp grid tests | 5 |
| 15 | `frontend/src/components/wallet/__tests__/BackDesignTab.test.tsx` | Back design tests | 6 |
| 16 | `frontend/src/components/wallet/__tests__/BarcodeTab.test.tsx` | Barcode tab tests | 4 |
| 17 | `frontend/src/components/wallet/__tests__/ColorsTab.test.tsx` | Colors tab tests | 4 |
| 18 | `frontend/src/components/wallet/__tests__/useWalletStudio.test.ts` | Main state hook tests | 1 |
| 19 | `frontend/src/components/wallet/__tests__/e2e/create-stamp-card.test.ts` | E2E: Stamp card | 10 |
| 20 | `frontend/src/components/wallet/__tests__/e2e/create-vip-with-ai.test.ts` | E2E: VIP + AI | 10 |

### 5.6 Backend Django (~12 new, ~3 modified)

#### NEW Backend Files

| # | File Path | Purpose | Phase |
|---|-----------|---------|-------|
| 1 | `backend/apps/ai/__init__.py` | AI app initialization | 8 |
| 2 | `backend/apps/ai/urls.py` | AI endpoint URLs | 8 |
| 3 | `backend/apps/ai/views.py` | AI API views | 8 |
| 4 | `backend/apps/ai/services/kimi_service.py` | Groq integration | 8 |
| 5 | `backend/apps/ai/services/fallback_designer.py` | Rule-based fallback | 8 |
| 6 | `backend/apps/ai/services/cost_tracker.py` | AI cost tracking | 8 |
| 7 | `backend/apps/ai/middleware.py` | AI rate limiting middleware | 8 |
| 8 | `backend/apps/ai/tests/test_kimi_service.py` | Kimi service tests | 8 |
| 9 | `backend/apps/ai/tests/test_ai_endpoints.py` | AI endpoint tests | 8 |
| 10 | `backend/apps/wallet/models.py` (extend) | WalletTemplate + WalletPassOperationLog | 7 |
| 11 | `backend/apps/wallet/views.py` (extend) | Template CRUD, pass generation | 7 |
| 12 | `backend/apps/wallet/urls.py` (extend) | Template API endpoints | 7 |
| 13 | `backend/apps/wallet/tests/test_templates.py` | Template CRUD tests | 7 |
| 14 | `backend/apps/wallet/tests/test_plan_limits.py` | Plan limit enforcement tests | 11 |

#### MODIFIED Backend Files

| # | File Path | Changes |
|---|-----------|---------|
| 1 | `backend/apps/billing/models.py` | +3 PlanFeature constants, +2 limit fields, update TRIAL_LIMITS |
| 2 | `backend/common/plan_enforcement.py` | +3 usage counter functions |
| 3 | `backend/common/rate_limit.py` | +3 RATE_LIMIT_RULES entries |
| 4 | `backend/apps/tenants/super_admin_api/plan_validation.py` | +3 validation rules |
| 5 | `backend/apps/tenants/api.py` | Update /me/plan-features/ response |

#### Database Migrations

| # | Migration | Purpose |
|---|-----------|---------|
| 1 | `backend/apps/wallet/migrations/00xx_wallettemplate.py` | Create WalletTemplate table |
| 2 | `backend/apps/wallet/migrations/00xx_walletpassoperationlog.py` | Create operation log table |
| 3 | `backend/apps/billing/migrations/00xx_add_wallet_limits.py` | Add max_wallet_templates, max_wallet_pass_updates_month |

---

## 6. Phase-by-Phase Implementation TODO

### Phase 0: Foundation (Week 1) — NO UI YET

**Goal:** Unified state model, utilities, types, constants, icon library, tests.

| # | Task | File(s) | Test File | Done |
|---|------|---------|-----------|------|
| 0.1 | Create unified `WalletPassStudioState` interface | `types.ts` (new v2) | — | [ ] |
| 0.2 | Create `UnifiedField` interface with notifications | `types/unified-field.ts` | — | [ ] |
| 0.3 | Create `BackField`, `BackLink`, `DetailImage` interfaces | `types/back-content.ts` | — | [ ] |
| 0.4 | Create dynamic template registry (25+ templates) | `types/dynamic-templates.ts` | — | [ ] |
| 0.5 | Create card-type config interfaces | `types/card-type-config.ts` | — | [ ] |
| 0.6 | Create v1→v2 migration function | `migrations/v1-to-v2.ts` | `migrations.test.ts` | [ ] |
| 0.7 | Extend constants with card-type visual mappings | `constants.ts` | — | [ ] |
| 0.8 | Create icon library registry (200+ SVGs, categorized) | `icon-library.ts` | — | [ ] |
| 0.9 | Build color conversion utilities (hex↔rgb) | `utils/colors.ts` | `colors.test.ts` | [ ] |
| 0.10 | Build WCAG contrast calculation utility | `utils/contrast.ts` | `contrast.test.ts` | [ ] |
| 0.11 | Build field mapping utilities (unified→Apple→Google) | `utils/field-mappers.ts` | `field-mappers.test.ts` | [ ] |
| 0.12 | Build field validation utility | `utils/field-validation.ts` | `field-validation.test.ts` | [ ] |
| 0.13 | Write unit tests for all utilities | `__tests__/*.test.ts` | — | [ ] |

**Deliverable:** All utility functions tested and working. State model defined. ✅

---

### Phase 1: Canvas Shell (Week 2)

**Goal:** Studio container layout — toolbar, canvas area, sidebar.

| # | Task | File(s) | Test File | Done |
|---|------|---------|-----------|------|
| 1.1 | Create `WalletStudio` container component | `WalletStudio.tsx` | `WalletStudio.test.tsx` | [ ] |
| 1.2 | Create `StudioToolbar` with undo/redo, zoom, save | `StudioToolbar.tsx` | — | [ ] |
| 1.3 | Create `StudioSidebar` with tab container | `StudioSidebar.tsx` | — | [ ] |
| 1.4 | Create `StudioCanvas` — dual preview wrapper | `StudioCanvas.tsx` | `StudioCanvas.test.tsx` | [ ] |
| 1.5 | Create `PlatformToggle` (visual, not segmented) | `PlatformToggle.tsx` | — | [ ] |
| 1.6 | Create `useWalletStudio` hook (basic state) | `hooks/useWalletStudio.ts` | `useWalletStudio.test.ts` | [ ] |
| 1.7 | Create `useUndoRedo` hook | `hooks/useUndoRedo.ts` | `useUndoRedo.test.ts` | [ ] |
| 1.8 | Wire undo/redo to toolbar | `StudioToolbar.tsx` | — | [ ] |
| 1.9 | Create `useAutoSave` hook | `hooks/useAutoSave.ts` | `useAutoSave.test.ts` | [ ] |
| 1.10 | Integrate auto-save into studio | `WalletStudio.tsx` | — | [ ] |
| 1.11 | Add toolbar: score placeholder, AI button placeholder | `StudioToolbar.tsx` | — | [ ] |
| 1.12 | Add toolbar: save dropdown (save, save as template) | `StudioToolbar.tsx` | — | [ ] |
| 1.13 | Add toolbar: front/back toggle placeholder | `StudioToolbar.tsx` | — | [ ] |

**Deliverable:** Studio shell renders. Can switch tabs. Undo/redo works. Auto-save persists to localStorage.

---

### Phase 2: Images Tab (Week 2-3)

**Goal:** Smart image upload with crop preview and platform variants.

| # | Task | File(s) | Test File | Done |
|---|------|---------|-----------|------|
| 2.1 | Create `SmartImageUpload` component | `SmartImageUpload.tsx` | — | [ ] |
| 2.2 | Add drag-and-drop support | `SmartImageUpload.tsx` | — | [ ] |
| 2.3 | Add image validation (size, format, dimensions) | `SmartImageUpload.tsx` | — | [ ] |
| 2.4 | Add crop preview (Apple rect + Google circle) | `SmartImageUpload.tsx` | — | [ ] |
| 2.5 | Create `ImagesTab` sidebar component | `ImagesTab.tsx` | — | [ ] |
| 2.6 | Integrate ImagesTab into sidebar | `StudioSidebar.tsx` | — | [ ] |
| 2.7 | Connect upload to state + preview update | `useWalletStudio.ts` | — | [ ] |
| 2.8 | Add backend endpoint for image upload + processing | Django views | — | [ ] |
| 2.9 | Add Sharp.js image processing (@2x/@3x generation) | Django service | — | [ ] |
| 2.10 | Add image removal with confirmation | `ImagesTab.tsx` | — | [ ] |
| 2.11 | Add image replacement (click to change) | `SmartImageUpload.tsx` | — | [ ] |

**Deliverable:** User can upload logo + hero image. Crop preview shows Apple vs Google. Auto-variants generated.

---

### Phase 3: Field Studio (Week 3)

**Goal:** Complete field editor with dynamic values, notifications, and platform mapping.

| # | Task | File(s) | Test File | Done |
|---|------|---------|-----------|------|
| 3.1 | Finalize unified field model with notifications | `types/unified-field.ts` | — | [ ] |
| 3.2 | Create `FieldStudio` container component | `FieldStudio.tsx` | `FieldStudio.test.tsx` | [ ] |
| 3.3 | Create `FieldCard` component with notification bell | `FieldCard.tsx` | — | [ ] |
| 3.4 | Create `FieldEditorModal` (expanded editor) | `FieldEditorModal.tsx` | — | [ ] |
| 3.5 | Add drag-to-reorder fields within groups | `FieldStudio.tsx` | — | [ ] |
| 3.6 | Add field position selector (Header/Primary/Secondary/Auxiliary/Back) | `FieldEditorModal.tsx` | — | [ ] |
| 3.7 | Add dynamic value template picker | `DynamicTemplatePicker.tsx` | — | [ ] |
| 3.8 | Add field count limits with visual indicators | `FieldLimitIndicator.tsx` | — | [ ] |
| 3.9 | Create `NotificationConfigPanel` | `NotificationConfigPanel.tsx` | — | [ ] |
| 3.10 | Add Apple changeMessage push notification config | `NotificationConfigPanel.tsx` | — | [ ] |
| 3.11 | Add Google Wallet message config | `NotificationConfigPanel.tsx` | — | [ ] |
| 3.12 | Add field validation (limits, types, templates) | `utils/field-validation.ts` | `field-validation.test.ts` | [ ] |
| 3.13 | Map unified fields to Apple preview | `utils/field-mappers.ts` | `field-mappers.test.ts` | [ ] |
| 3.14 | Map unified fields to Google preview | `utils/field-mappers.ts` | `field-mappers.test.ts` | [ ] |
| 3.15 | Add platform limit conflict resolution | `FieldStudio.tsx` | — | [ ] |
| 3.16 | Add "Add Field" flow with position selector | `FieldStudio.tsx` | — | [ ] |
| 3.17 | Add field deletion with confirmation | `FieldCard.tsx` | — | [ ] |
| 3.18 | Add field duplication | `FieldCard.tsx` | — | [ ] |

**Deliverable:** User can add/edit/reorder fields with dynamic values and notifications. Platform limits enforced.

---

### Phase 4: Barcode & Colors Tabs (Week 3-4)

**Goal:** Barcode configuration and color management.

| # | Task | File(s) | Test File | Done |
|---|------|---------|-----------|------|
| 4.1 | Create `BarcodeTab` with format selector | `BarcodeTab.tsx` | `BarcodeTab.test.tsx` | [ ] |
| 4.2 | Add barcode data builder (customer_id + program_id + timestamp) | `BarcodeTab.tsx` | — | [ ] |
| 4.3 | Add barcode preview using existing BarcodeRenderer | `BarcodeTab.tsx` | — | [ ] |
| 4.4 | Add platform-specific barcode warnings | `BarcodeTab.tsx` | — | [ ] |
| 4.5 | Create `ColorsTab` with color picker | `ColorsTab.tsx` | `ColorsTab.test.tsx` | [ ] |
| 4.6 | Add real-time contrast check using contrast utility | `ColorsTab.tsx` | — | [ ] |
| 4.7 | Add quick color preset swatches | `ColorsTab.tsx` | — | [ ] |
| 4.8 | Add color conversion display (hex ↔ rgb) | `ColorsTab.tsx` | — | [ ] |
| 4.9 | Connect colors to both previews | `useWalletStudio.ts` | — | [ ] |
| 4.10 | Add WCAG AA/AAA badge indicators | `ColorsTab.tsx` | — | [ ] |
| 4.11 | Add color preset save/load | `ColorsTab.tsx` | — | [ ] |

**Deliverable:** User can configure barcode and colors. Contrast warnings shown. Both previews reflect changes.

---

### Phase 5: Card-Type Visual Tabs (Week 4)

**Goal:** Dynamic tabs for stamps, VIP, cashback, etc.

| # | Task | File(s) | Test File | Done |
|---|------|---------|-----------|------|
| 5.1 | Create `IconPicker` modal component | `IconPicker.tsx` | `IconPicker.test.tsx` | [ ] |
| 5.2 | Create `StampGrid` visual component | `StampGrid.tsx` | `StampGrid.test.tsx` | [ ] |
| 5.3 | Create `CardTypeTab` router component | `CardTypeTab.tsx` | — | [ ] |
| 5.4 | Build Stamp card config tab | `tabs/StampTab.tsx` | — | [ ] |
| 5.5 | Build Cashback config tab | `tabs/CashbackTab.tsx` | — | [ ] |
| 5.6 | Build VIP config tab | `tabs/VIPTab.tsx` | — | [ ] |
| 5.7 | Build Coupon config tab | `tabs/CouponTab.tsx` | — | [ ] |
| 5.8 | Build Gift config tab | `tabs/GiftTab.tsx` | — | [ ] |
| 5.9 | Build Affiliate config tab | `tabs/AffiliateTab.tsx` | — | [ ] |
| 5.10 | Build Discount config tab | `tabs/DiscountTab.tsx` | — | [ ] |
| 5.11 | Build Corporate config tab | `tabs/CorporateTab.tsx` | — | [ ] |
| 5.12 | Build Referral config tab | `tabs/ReferralTab.tsx` | — | [ ] |
| 5.13 | Build Multipass config tab | `tabs/MultipassTab.tsx` | — | [ ] |
| 5.14 | Add stamp icons to Apple preview | `AppleWalletPreview.tsx` | — | [ ] |
| 5.15 | Add card-type decorations to both previews | `AppleWalletPreview.tsx`, `GoogleWalletPreview.tsx` | — | [ ] |
| 5.16 | Add icon upload support (custom PNG/SVG) | `IconPicker.tsx` | — | [ ] |

**Deliverable:** Each card type shows its specific configuration tab. Stamp icons render on preview. All 10 types supported.

---

### Phase 6: Advanced Tab, Back Design & Design Score (Week 4-5)

**Goal:** Platform-specific settings, back content, quality validation.

| # | Task | File(s) | Test File | Done |
|---|------|---------|-----------|------|
| 6.1 | Create `AdvancedTab` with Apple-specific settings | `AdvancedTab.tsx` | — | [ ] |
| 6.2 | Add Apple: icon upload, description, NFC, locations, beacons | `AdvancedTab.tsx` | — | [ ] |
| 6.3 | Add Google: Smart Tap, app link, screenshot disable, grouping | `AdvancedTab.tsx` | — | [ ] |
| 6.4 | Create `DesignScore` component | `DesignScore.tsx` | — | [ ] |
| 6.5 | Implement 14-check scoring algorithm | `hooks/useDesignScore.ts` | `useDesignScore.test.ts` | [ ] |
| 6.6 | Add score breakdown panel with check list | `DesignScore.tsx` | — | [ ] |
| 6.7 | Add back content checks (terms, contact, rules, length) | `hooks/useDesignScore.ts` | — | [ ] |
| 6.8 | Add inline fix suggestions per check | `DesignScore.tsx` | — | [ ] |
| 6.9 | Add auto-fix button for simple issues (contrast) | `DesignScore.tsx` | — | [ ] |
| 6.10 | Integrate score into toolbar | `StudioToolbar.tsx` | — | [ ] |
| 6.11 | Create `BackDesignTab` sidebar component | `BackDesignTab.tsx` | `BackDesignTab.test.tsx` | [ ] |
| 6.12 | Create `AppleBackPreview` component | `AppleBackPreview.tsx` | — | [ ] |
| 6.13 | Create `GoogleBackPreview` component | `GoogleBackPreview.tsx` | — | [ ] |
| 6.14 | Add back field editor (label + value + link) | `BackDesignTab.tsx` | — | [ ] |
| 6.15 | Add quick links section (website, phone, email) | `BackDesignTab.tsx` | — | [ ] |
| 6.16 | Add app link configuration | `BackDesignTab.tsx` | — | [ ] |
| 6.17 | Add default back content per card type | `constants.ts` | — | [ ] |
| 6.18 | Add front/back flip animation to canvas | `StudioCanvas.tsx` | — | [ ] |
| 6.19 | Add keyboard shortcut 'B' for flip | `hooks/useKeyboardShortcuts.ts` | — | [ ] |

**Deliverable:** Advanced settings accessible. Design score calculates in real-time with back content validation. Back flip works.

---

### Phase 7: Template Gallery & User Template Library (Week 5)

**Goal:** Dual-template system: System templates + User-created template library.

| # | Task | File(s) | Test File | Done |
|---|------|---------|-----------|------|
| 7.1 | Create `TemplateGallery` page/modal with tabs | `TemplateGallery.tsx` | `TemplateGallery.test.tsx` | [ ] |
| 7.2 | Add search, filter, category tabs | `TemplateGallery.tsx` | — | [ ] |
| 7.3 | Design 20+ system template definitions (JSON) | `templates/registry.ts` | — | [ ] |
| 7.4 | Add template preview modal (side-by-side) | `TemplatePreviewModal.tsx` | — | [ ] |
| 7.5 | Add "Empezar desde cero" blank option | `TemplateGallery.tsx` | — | [ ] |
| 7.6 | Connect template selection to studio | `useWalletStudio.ts` | — | [ ] |
| 7.7 | Add template application animation | `TemplateGallery.tsx` | — | [ ] |
| 7.8 | Create `MyTemplatesTab` component | `MyTemplatesTab.tsx` | — | [ ] |
| 7.9 | Create `SaveTemplateModal` (from Studio) | `SaveTemplateModal.tsx` | — | [ ] |
| 7.10 | Add `TemplateCard` with actions (⋮ menu, ⭐, usage count) | `TemplateCard.tsx` | — | [ ] |
| 7.11 | Add template CRUD: rename, duplicate, delete | `useTemplateLibrary.ts` | — | [ ] |
| 7.12 | Add template favorite toggle | `TemplateCard.tsx` | — | [ ] |
| 7.13 | Add empty state for My Templates | `MyTemplatesTab.tsx` | — | [ ] |
| 7.14 | Create Django `WalletTemplate` model | `apps/wallet/models.py` | `test_templates.py` | [ ] |
| 7.15 | Add template CRUD API endpoints | `apps/wallet/views.py` | — | [ ] |
| 7.16 | Add template preview image generation | Django service | — | [ ] |
| 7.17 | Add "AI Variations" feature | AI service | — | [ ] |
| 7.18 | Add template usage analytics tracking | `apps/wallet/models.py` | — | [ ] |

**Deliverable:** User can browse system templates, save own templates, manage (CRUD) template library, and generate AI variations.

---

### Phase 8: AI Integration (Week 5-6)

**Goal:** Groq backend + frontend AI features.

| # | Task | File(s) | Test File | Done |
|---|------|---------|-----------|------|
| 8.1 | Create Django `apps/ai/` app structure | `apps/ai/*` | — | [ ] |
| 8.2 | Create `KimiService` class | `services/kimi_service.py` | `test_kimi_service.py` | [ ] |
| 8.3 | Implement `generate-template` endpoint | `apps/ai/views.py` | — | [ ] |
| 8.4 | Implement `suggest-colors` endpoint | `apps/ai/views.py` | — | [ ] |
| 8.5 | Implement `critique-design` endpoint | `apps/ai/views.py` | — | [ ] |
| 8.6 | Implement `suggest-stamp-icons` endpoint | `apps/ai/views.py` | — | [ ] |
| 8.7 | Implement AI rate limiting middleware | `apps/ai/middleware.py` | — | [ ] |
| 8.8 | Implement cost tracking | `services/cost_tracker.py` | — | [ ] |
| 8.9 | Create `AIButton` component (purple gradient) | `AIButton.tsx` | — | [ ] |
| 8.10 | Create `AIChatModal` component | `AIChatModal.tsx` | — | [ ] |
| 8.11 | Create `AISuggestion` inline component | `AISuggestion.tsx` | — | [ ] |
| 8.12 | Create `useAI` frontend hook | `hooks/useAI.ts` | `useAI.test.ts` | [ ] |
| 8.13 | Integrate AI button into toolbar | `StudioToolbar.tsx` | — | [ ] |
| 8.14 | Wire AI suggestions to design score | `DesignScore.tsx` | — | [ ] |
| 8.15 | Add fallback designer (when Kimi unavailable) | `services/fallback_designer.py` | — | [ ] |
| 8.16 | Add AI error handling with retry | `useAI.ts` | — | [ ] |
| 8.17 | Add AI quota display in UI | `AIButton.tsx` | — | [ ] |

**Deliverable:** AI button works. Can generate templates, suggest colors, critique designs. Rate limits enforced. Fallback works.

---

### Phase 9: Mobile & Polish (Week 6)

**Goal:** Responsive design, bottom sheet, keyboard shortcuts, performance.

| # | Task | File(s) | Test File | Done |
|---|------|---------|-----------|------|
| 9.1 | Add responsive breakpoints to studio | `WalletStudio.tsx` | — | [ ] |
| 9.2 | Create mobile bottom sheet for sidebar | `MobileBottomSheet.tsx` | — | [ ] |
| 9.3 | Add swipe-to-switch-platform on mobile | `StudioCanvas.tsx` | — | [ ] |
| 9.4 | Implement all keyboard shortcuts | `hooks/useKeyboardShortcuts.ts` | — | [ ] |
| 9.5 | Add loading states and skeletons | Various | — | [ ] |
| 9.6 | Add error boundaries | `ErrorBoundary.tsx` | — | [ ] |
| 9.7 | Add session recovery (localStorage draft) | `hooks/useSessionRecovery.ts` | — | [ ] |
| 9.8 | Add browser crash recovery | `hooks/useSessionRecovery.ts` | — | [ ] |
| 9.9 | Performance audit (canvas render < 16ms) | Various | — | [ ] |
| 9.10 | Accessibility audit (WCAG AA, keyboard nav, screen reader) | Various | — | [ ] |
| 9.11 | Add tooltip system for all actions | Various | — | [ ] |
| 9.12 | Add onboarding tooltips for first-time users | Various | — | [ ] |

**Deliverable:** Works on mobile and desktop. All shortcuts work. Session recovery works. Performance acceptable.

---

### Phase 10: Integration & Testing (Week 7)

**Goal:** Connect to existing wizard, test end-to-end.

| # | Task | File(s) | Test File | Done |
|---|------|---------|-----------|------|
| 10.1 | Replace WalletDesigner in wizard Step 2 | Wizard component | — | [ ] |
| 10.2 | Replace WalletCardPreview in wizard | Wizard component | — | [ ] |
| 10.3 | Ensure backward compatibility with existing saved designs | Migration | `migrations.test.ts` | [ ] |
| 10.4 | Update backend pass generation to use unified state | Django | — | [ ] |
| 10.5 | E2E test: Create stamp card from template | Tests | `create-stamp-card.test.ts` | [ ] |
| 10.6 | E2E test: Create VIP card with AI | Tests | `create-vip-with-ai.test.ts` | [ ] |
| 10.7 | E2E test: Edit existing design | Tests | — | [ ] |
| 10.8 | E2E test: Mobile flow | Tests | — | [ ] |
| 10.9 | User acceptance testing with María persona | Manual | — | [ ] |
| 10.10 | Deploy to staging | DevOps | — | [ ] |

**Deliverable:** Fully integrated into Loyallia wizard. All existing programs still work. Staging deployment ready.

---

### Phase 11: Plan & Rate Limiting Integration (Runs in Parallel with Phases 1-10)

**Goal:** Integrate with existing billing/plan system.

| # | Task | File(s) | Test File | Done |
|---|------|---------|-----------|------|
| 11.1 | Add 3 `PlanFeature` constants | `apps/billing/models.py` | — | [ ] |
| 11.2 | Add 2 `SubscriptionPlan` limit fields | `apps/billing/models.py` | — | [ ] |
| 11.3 | Update `TRIAL_LIMITS` for Wallet Pass Studio | `apps/billing/models.py` | — | [ ] |
| 11.4 | Update `ALL_FEATURES` list | `apps/billing/models.py` | — | [ ] |
| 11.5 | Update `limits` property | `apps/billing/models.py` | — | [ ] |
| 11.6 | Add 3 usage counter lambdas | `common/plan_enforcement.py` | — | [ ] |
| 11.7 | Add `_count_wallet_templates()` | `common/plan_enforcement.py` | — | [ ] |
| 11.8 | Add `_count_wallet_pass_updates_month()` | `common/plan_enforcement.py` | — | [ ] |
| 11.9 | Add `_count_wallet_ai_designs_month()` | `common/plan_enforcement.py` | — | [ ] |
| 11.10 | Add 3 `RATE_LIMIT_RULES` entries | `common/rate_limit.py` | — | [ ] |
| 11.11 | Create `WalletPassOperationLog` model | `apps/wallet/models.py` | — | [ ] |
| 11.12 | Add `WalletTemplate` model | `apps/wallet/models.py` | `test_templates.py` | [ ] |
| 11.13 | Define API endpoints with decorators | `apps/wallet/urls.py` | — | [ ] |
| 11.14 | Add plan validation rules | `apps/tenants/super_admin_api/plan_validation.py` | — | [ ] |
| 11.15 | Update `/me/plan-features/` response | `apps/tenants/api.py` | — | [ ] |
| 11.16 | Create `usePlanFeatures` hook | `hooks/usePlanFeatures.ts` | — | [ ] |
| 11.17 | Create `LockedFeature` component | `components/shared/LockedFeature.tsx` | — | [ ] |
| 11.18 | Create `LimitReached` component | `components/shared/LimitReached.tsx` | — | [ ] |
| 11.19 | Add feature gating to AI button | `AIButton.tsx` | — | [ ] |
| 11.20 | Add feature gating to Save Template | `SaveTemplateModal.tsx` | — | [ ] |
| 11.21 | Add feature gating to Field Notifications | `NotificationConfigPanel.tsx` | — | [ ] |
| 11.22 | Add plan limit enforcement to backend APIs | Various | `test_plan_limits.py` | [ ] |
| 11.23 | Run database migrations | Migrations | — | [ ] |

**Deliverable:** All Wallet Pass Studio features respect plan limits. Proper error messages when limits reached. Trial works correctly.

---

## 7. Frontend Components Deep Dive

### 7.1 Component Hierarchy

```
WalletStudio (container)
├── StudioToolbar
│   ├── Undo/Redo buttons
│   ├── PlatformToggle (🍎 Apple | 🤖 Google | 👁️ Both)
│   ├── Zoom controls (- / 100% / +)
│   ├── TemplateGallery button
│   ├── Save dropdown
│   ├── Front/Back toggle
│   ├── DesignScore badge
│   └── AIButton (✨ Diseñar con IA)
├── StudioCanvas
│   ├── PlatformToggle (when focused view)
│   ├── AppleWalletPreview (with canvas overlay)
│   │   ├── DeviceFrame (iPhone 15 Pro)
│   │   ├── Pass content (fields, images, stamps)
│   │   └── BarcodeRenderer
│   ├── GoogleWalletPreview (with canvas overlay)
│   │   ├── DeviceFrame (Pixel 8)
│   │   ├── Pass content (rows, images, badges)
│   │   └── BarcodeRenderer
│   ├── AppleBackPreview (when showBack=true)
│   └── GoogleBackPreview (when showBack=true)
└── StudioSidebar
    └── TabContent (active tab)
        ├── ImagesTab
        │   └── SmartImageUpload (logo + hero)
        ├── CardTypeTab
        │   └── CardTypeSpecificTab (StampTab, VIPTab, etc.)
        │       └── IconPicker (when needed)
        ├── FieldStudio
        │   ├── FieldLimitIndicator
        │   ├── FieldCard[] (draggable)
        │   │   └── Notification bell
        │   ├── FieldEditorModal (on click)
        │   │   ├── DynamicTemplatePicker
        │   │   └── NotificationConfigPanel
        │   └── "Add Field" button
        ├── BackDesignTab
        │   ├── BackField editors
        │   ├── Quick links section
        │   └── App link config
        ├── BarcodeTab
        │   ├── Format selector
        │   ├── Data builder
        │   └── Preview
        ├── ColorsTab
        │   ├── Color picker
        │   ├── Contrast check
        │   └── Preset swatches
        └── AdvancedTab
            ├── Apple settings
            └── Google settings
```

### 7.2 State Flow

```
User Action → useWalletStudio → State Update → Auto-save → localStorage
     ↓
useUndoRedo captures action
     ↓
useDesignScore recalculates
     ↓
StudioCanvas re-renders previews
     ↓
Both Apple + Google previews update simultaneously
```

### 7.3 Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State management | Custom hook (not Redux/Zustand) | Simpler, no new dependency, fits existing codebase |
| Undo/redo | Array of state snapshots (max 50) | Simple, reliable, 50 actions = ~500KB memory |
| Auto-save | localStorage every 30s + on navigation | Fast, works offline, recoverable |
| Image processing | Backend (Sharp.js) not frontend | Better performance, security |
| AI provider | Groq via backend proxy | Key stays server-side, no exposure |
| Icon library | Lucide + Custom SVG set | Familiar icons + branded stamps |
| Canvas approach | Absolute positioning overlays on previews | Not true canvas API — simpler, accessible |
| Mobile sidebar | Bottom sheet (not drawer) | Better UX on small screens |

---

## 8. Backend API Specification

### 8.1 Wallet Pass Studio Endpoints

| Endpoint | Method | Auth | Decorators | Description |
|----------|--------|------|------------|-------------|
| `/api/v1/wallet/studio/` | GET | ✅ | `@require_active_subscription`, `@require_feature("wallet_pass_studio")` | Access studio |
| `/api/v1/wallet/studio/templates/` | GET/POST | ✅ | `@require_feature("wallet_pass_studio")`, POST: `@enforce_limit("wallet_templates")` | Template CRUD |
| `/api/v1/wallet/studio/templates/<uuid>/` | GET/PATCH/DELETE | ✅ | `@require_feature("wallet_custom_templates")` | Template detail |
| `/api/v1/wallet/studio/templates/<uuid>/duplicate/` | POST | ✅ | `@require_feature("wallet_custom_templates")`, `@enforce_limit("wallet_templates")` | Clone template |
| `/api/v1/wallet/studio/templates/<uuid>/favorite/` | POST | ✅ | — | Toggle favorite |
| `/api/v1/wallet/studio/templates/<uuid>/apply/` | POST | ✅ | `@require_feature("wallet_pass_studio")` | Apply template |
| `/api/v1/wallet/studio/templates/<uuid>/preview/` | POST | ✅ | — | Regenerate preview |
| `/api/v1/wallet/studio/templates/system/` | GET | ✅ | `@require_feature("wallet_pass_studio")` | List system templates |
| `/api/v1/wallet/studio/generate/` | POST | ✅ | `@require_feature("wallet_pass_studio")`, `@enforce_limit("wallet_pass_updates_month")` | Generate pass |
| `/api/v1/wallet/studio/update/` | POST | ✅ | `@require_feature("wallet_campaigns")`, `@enforce_limit("wallet_pushes_month")` | Update pass |
| `/api/v1/wallet/studio/export/pkpass/` | POST | ✅ | `@require_feature("data_export")`, `@enforce_limit("exports_month")` | Export .pkpass |
| `/api/v1/wallet/studio/upload/` | POST | ✅ | `@require_feature("wallet_pass_studio")` | Image upload |

### 8.2 AI Endpoints

| Endpoint | Method | Auth | Decorators | Description |
|----------|--------|------|------------|-------------|
| `/api/v1/ai/generate-template/` | POST | ✅ | `@require_feature("ai_assistant")`, `@enforce_limit("ai_queries_month")` | Generate template |
| `/api/v1/ai/suggest-colors/` | POST | ✅ | `@require_feature("ai_assistant")`, `@enforce_limit("ai_queries_month")` | Color suggestions |
| `/api/v1/ai/critique-design/` | POST | ✅ | `@require_feature("ai_assistant")`, `@enforce_limit("ai_queries_month")` | Design critique |
| `/api/v1/ai/suggest-stamp-icons/` | POST | ✅ | `@require_feature("ai_assistant")`, `@enforce_limit("ai_queries_month")` | Icon suggestions |
| `/api/v1/ai/suggest-layout/` | POST | ✅ | `@require_feature("ai_assistant")`, `@enforce_limit("ai_queries_month")` | Layout suggestions |

### 8.3 Request/Response Examples

**Generate AI Template:**
```json
// POST /api/v1/ai/generate-template/
{
  "business_description": "A cozy coffee shop in downtown",
  "card_type": "stamp",
  "industry": "cafe",
  "language": "es"
}

// Response: 200 OK
{
  "success": true,
  "variations": [
    {
      "id": "var_1",
      "name": "Café Cálido",
      "description": "Diseño acogedor con tonos café",
      "confidence": 0.92,
      "design": { /* complete WalletPassStudioState */ }
    }
  ],
  "tokens_used": { "prompt_tokens": 800, "completion_tokens": 1200 }
}
```

**Create Template:**
```json
// POST /api/v1/wallet/studio/templates/
{
  "name": "Café Central — Tarjeta de Sellos",
  "description": "Diseño cálido con tonos café",
  "card_type": "stamp",
  "industry": "cafe",
  "design_data": { /* complete WalletPassStudioState */ },
  "include_back_content": true
}

// Response: 201 Created
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "user",
  "name": "Café Central — Tarjeta de Sellos",
  "preview_image_url": "https://cdn.loyallia.app/templates/550e8400/preview.png",
  "usage_count": 0,
  "is_favorite": false,
  "created_at": "2026-06-03T15:40:21Z"
}
```

---

## 9. Database Schema

### 9.1 WalletTemplate Model

```python
class WalletTemplate(models.Model):
    TEMPLATE_TYPE_CHOICES = [
        ('system', 'System Template'),
        ('user', 'User Template'),
        ('ai', 'AI Generated'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type = models.CharField(max_length=10, choices=TEMPLATE_TYPE_CHOICES)
    
    # Metadata
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    card_type = models.CharField(max_length=30)
    industry = models.CharField(max_length=30, blank=True)
    
    # Ownership
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='wallet_templates')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, null=True, blank=True, related_name='wallet_templates')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True, related_name='wallet_templates')
    
    # Visual previews
    preview_image = models.ImageField(upload_to='template_previews/', null=True, blank=True)
    preview_apple = models.ImageField(upload_to='template_previews/apple/', null=True, blank=True)
    preview_google = models.ImageField(upload_to='template_previews/google/', null=True, blank=True)
    
    # Design data (complete state)
    design_data = models.JSONField(default=dict, help_text="Complete WalletPassStudioState as JSON")
    
    # System template fields
    category = models.CharField(max_length=20, blank=True)  # featured, new, popular
    tags = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    
    # User template fields
    source_program = models.ForeignKey(Program, on_delete=models.SET_NULL, null=True, blank=True, related_name='derived_templates')
    usage_count = models.PositiveIntegerField(default=0)
    last_used_at = models.DateTimeField(null=True, blank=True)
    is_favorite = models.BooleanField(default=False)
    
    # AI template fields
    ai_prompt = models.TextField(blank=True)
    ai_session_id = models.CharField(max_length=100, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-usage_count', '-created_at']
        indexes = [
            models.Index(fields=['type', 'card_type', 'industry']),
            models.Index(fields=['user', 'is_favorite']),
            models.Index(fields=['organization', 'type']),
            models.Index(fields=['tenant', 'type']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(type='system', user__isnull=True) | models.Q(type__in=['user', 'ai'], user__isnull=False),
                name='system_templates_no_user'
            ),
        ]
```

### 9.2 WalletPassOperationLog Model

```python
class WalletPassOperationLog(models.Model):
    OPERATION_TYPES = [
        ("generate", "Generate Pass"),
        ("update", "Update Pass"),
        ("push", "Push Update"),
        ("template_save", "Save Template"),
        ("template_apply", "Apply Template"),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    operation_type = models.CharField(max_length=20, choices=OPERATION_TYPES)
    program = models.ForeignKey("cards.Card", on_delete=models.SET_NULL, null=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=["tenant", "operation_type", "created_at"]),
        ]
```

### 9.3 Plan Model Changes

```python
# backend/apps/billing/models.py

class PlanFeature:
    # ... existing constants ...
    WALLET_PASS_STUDIO = "wallet_pass_studio"
    WALLET_CUSTOM_TEMPLATES = "wallet_custom_templates"
    WALLET_ADVANCED_FIELDS = "wallet_advanced_fields"

class SubscriptionPlan(TimestampedModel):
    # ... existing fields ...
    max_wallet_templates = models.PositiveIntegerField(default=0)
    max_wallet_pass_updates_month = models.PositiveIntegerField(default=0)
    
    @property
    def limits(self) -> dict:
        return {
            # ... existing limits ...
            "wallet_templates": self.max_wallet_templates,
            "wallet_pass_updates_month": self.max_wallet_pass_updates_month,
        }

TRIAL_LIMITS = {
    # ... existing limits ...
    "wallet_templates": 5,
    "wallet_pass_updates_month": 50,
    "wallet_ai_designs_month": 20,
}
```

---

## 10. Plan & Rate Limiting Integration

### 10.1 Feature → Plan Matrix

| Wallet Pass Studio Feature | PlanFeature Required | Plan Limit Consumed |
|---------------------------|:--------------------:|--------------------:|
| Access Studio | `wallet_pass_studio` | — |
| Use System Templates | `wallet_pass_studio` | — |
| Save Custom Template | `wallet_custom_templates` | `wallet_templates` |
| AI Generate Template | `ai_assistant` | `ai_queries_month` |
| Custom Fields | `wallet_pass_studio` | — |
| Field Notifications (Apple) | `wallet_advanced_fields` | `wallet_pushes_month` |
| Field Notifications (Google) | `wallet_advanced_fields` | `wallet_pushes_month` |
| Pass Generation | `wallet_pass_studio` | `wallet_pass_updates_month` |
| Pass Update/Push | `wallet_campaigns` | `wallet_pushes_month` |
| Export .pkpass | `data_export` | `exports_month` |

### 10.2 Feature Availability by Plan Tier (Recommended)

| Feature | Free | Starter | Pro | Enterprise |
|---------|:----:|:-------:|:---:|:----------:|
| `wallet_pass_studio` | ❌ | ✅ | ✅ | ✅ |
| `wallet_custom_templates` | ❌ | ❌ | ✅ | ✅ |
| `wallet_advanced_fields` | ❌ | ❌ | ❌ | ✅ |
| `ai_assistant` | ❌ | ❌ | ✅ (50/mo) | ✅ (200/mo) |
| `wallet_campaigns` | ❌ | ✅ (100/mo) | ✅ (500/mo) | ✅ (2000/mo) |
| `data_export` | ❌ | ❌ | ✅ (10/mo) | ✅ (50/mo) |

### 10.3 Rate Limit Rules (NEW)

```python
RATE_LIMIT_RULES = [
    # WALLET PASS STUDIO RATE LIMITS
    ("/api/v1/wallet/studio/ai/", "user", 10, 60),      # 10 AI requests/min
    ("/api/v1/wallet/studio/templates/", "user", 30, 60), # 30 template ops/min
    ("/api/v1/wallet/studio/generate/", "user", 20, 60),  # 20 generation/min
    # Existing catch-all (must come AFTER specific rules)
    ("/api/v1/wallet/", "ip", 30, 60),
]
```

---

## 11. AI Integration Specification

### 11.1 Groq API Configuration

| Property | Value |
|----------|-------|
| Provider | Groq |
| Model | `kimi-k2-6` |
| Base URL | `https://api.groq.com/openai/v1` |
| Key Storage | HashiCorp Vault (`kimi_api_key`) |
| Timeout | 30s |
| Max Tokens | 4096 |

### 11.2 AI Features

| Feature | Trigger | Endpoint | Avg Cost |
|---------|---------|----------|----------|
| Magic Template | "✨ Diseñar con IA" button | `/api/v1/ai/generate-template/` | ~$0.015 |
| Smart Color | "Sugerir colores" in Colors tab | `/api/v1/ai/suggest-colors/` | ~$0.005 |
| Design Critique | Score < 7.0 or click score | `/api/v1/ai/critique-design/` | ~$0.010 |
| Stamp Icons | Configuring stamp card | `/api/v1/ai/suggest-stamp-icons/` | ~$0.008 |
| Auto-Layout | Add/remove fields | `/api/v1/ai/suggest-layout/` | ~$0.006 |

### 11.3 Rate Limits per AI Endpoint

| Endpoint | Per User/Hour | Per User/Day | Burst |
|----------|:-------------:|:------------:|:-----:|
| generate-template | 10 | 50 | 3/min |
| suggest-colors | 30 | 200 | 5/min |
| critique-design | 50 | 300 | 10/min |
| suggest-stamp-icons | 20 | 100 | 5/min |
| suggest-layout | 30 | 200 | 5/min |

### 11.4 Fallback Designer

When Groq API is unavailable, use rule-based fallback:
- Color presets by industry (cafe, gym, retail, salon, hotel)
- Default field configurations by card type
- Pre-defined layout patterns

---

## 12. Testing Strategy

> **Complete testing strategy documented in:** `TESTING-QA-STRATEGY.md`  
> (~75KB covering unit tests, component tests, integration tests, E2E, visual regression, accessibility, performance, CI/CD)

### 12.1 Test Pyramid

| Level | Count | Focus | Tools |
|-------|:-----:|-------|-------|
| Unit tests | ~80 | Utilities, hooks, mappers | Jest |
| Component tests | ~50 | React components in isolation | React Testing Library |
| Integration tests | ~30 | API endpoints, plan enforcement | Django TestCase + DRF |
| E2E tests | ~10 | Full user journeys | Playwright |
| Visual regression | ~20 | Pixel-perfect rendering | Chromatic/Storybook |
| Accessibility | ~15 | Screen readers, keyboard, contrast | axe-core + Lighthouse |
| Performance | ~10 | Load times, render times, memory | Lighthouse + custom |

### 12.2 Critical Test Scenarios

1. **State Migration:** v1 design loads correctly in v2 studio
2. **Undo/Redo:** 50 actions, no memory leaks
3. **Auto-save:** Recovery after browser crash
4. **Field Limits:** Cannot exceed Apple/Google limits
5. **Platform Mapping:** Same field renders correctly on both platforms
6. **Template CRUD:** Create, read, update, delete, duplicate
7. **AI Rate Limit:** 11th request blocked with proper message
8. **Plan Enforcement:** Feature blocked when not in plan
9. **Image Processing:** @2x/@3x generated correctly
10. **Back Content:** Flip toggle shows correct back preview
11. **Cross-browser:** Chrome, Safari, Firefox compatibility
12. **Mobile:** Bottom sheet, swipe gestures, touch targets
13. **Accessibility:** Keyboard nav, screen reader, WCAG AA contrast

### 12.3 E2E Test Scenarios

| Test | Journey | Time |
|------|---------|------|
| E2E-1 | Create stamp card from template → save → preview | ~3 min |
| E2E-2 | Create VIP card with AI → customize colors → save | ~5 min |
| E2E-3 | Edit existing design → add field → set notification | ~4 min |
| E2E-4 | Mobile: bottom sheet → upload image → configure stamps | ~4 min |
| E2E-5 | Plan limit: exceed template limit → see upgrade prompt | ~2 min |

### 12.4 Test Environments

| Environment | Data | Purpose |
|-------------|------|---------|
| Local Dev | Fake/test | Developer daily work |
| Test (CI) | Fixtures | Automated test runs |
| Staging | Production-like | Pre-release validation |
| Production | Real | Live monitoring |

### 12.5 Coverage Thresholds

| Category | Minimum Coverage | Enforced By |
|----------|:----------------:|-------------|
| Utilities / Hooks | 80% | CI gate |
| Components | 70% | CI gate |
| Backend APIs | 75% | CI gate |
| E2E critical paths | 100% | Manual QA |

---

## 13. Decision Points Checklist

Before coding begins, user must confirm these decisions:

| # | Decision | Options | Our Recommendation | Status |
|---|----------|---------|-------------------|--------|
| 1 | Template count at launch | 10 / 15 / 20 / 25+ | **20** | ⏳ |
| 2 | AI free tier | 5/10/20 templates/month | **10** | ⏳ |
| 3 | Mobile vs desktop priority | Desktop-first / Mobile-first / Both | **Both simultaneously** | ⏳ |
| 4 | Keep old designer? | Yes (v1 tab) / No (replace) | **No (full replace)** | ⏳ |
| 5 | Icon library | Lucide / Heroicons / Custom / All | **Lucide + Custom** | ⏳ |
| 6 | Stamp animation | CSS / Lottie / GIF | **CSS only** | ⏳ |
| 7 | Export formats | .pkpass / +JWT / +PNG | **.pkpass + JWT** | ⏳ |
| 8 | User custom templates? | Yes / No | **Yes** | ⏳ |
| 9 | Max user templates | 10 / 25 / 50 / Unlimited | **50** | ⏳ |
| 10 | Template sharing | Private / Team / Public | **Private + Team** | ⏳ |
| 11 | Default back content | Minimal / Standard / Full | **Standard** | ⏳ |
| 12 | Field notifications default | All ON / All OFF / Smart | **Smart defaults** | ⏳ |
| 13 | Dynamic templates scope | Basic(5) / Standard(15) / Full(25+) | **Full (25+)** | ⏳ |

**All 13 decisions must be confirmed before Phase 0 begins.**

---

## 14. Risk Matrix & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|:-----------:|:------:|------------|
| Groq API downtime | Medium | High | Fallback designer + caching + retries |
| Image processing memory | Medium | Medium | Celery background queue |
| Canvas performance | Medium | Medium | Lazy rendering, virtual scrolling |
| Migration breaks v1 designs | Low | High | Backup + thorough migration tests |
| Field notification complexity | Medium | Medium | Smart defaults + guided setup |
| Template storage growth | Low | Medium | Limits + cleanup policy |
| Undo/redo memory growth | Low | Medium | Cap at 50 actions |
| Mobile bottom sheet UX | Medium | Medium | Iterative user testing |
| Plan enforcement TOCTOU | Low | High | `select_for_update()` in decorators |
| AI cost overruns | Low | Medium | Daily budget tracking + alerts |

---

## 15. Definition of Done per Phase

### Phase 0 Done When:
- [ ] All utility functions have passing unit tests (≥80% coverage)
- [ ] State model is fully typed with TypeScript (no `any` types)
- [ ] Migration function converts all v1 test cases correctly
- [ ] Icon library has 200+ icons in 6+ categories
- [ ] Field mapping utilities handle all 5 field groups
- [ ] Contrast calculations match official WCAG algorithm
- [ ] Test fixtures created for all design states

### Phase 1 Done When:
- [ ] Studio shell renders without console errors
- [ ] Undo/redo works for 50+ consecutive actions
- [ ] Undo/redo memory usage stays under 1MB
- [ ] Auto-save persists to localStorage and recovers on reload
- [ ] Sidebar tab switching works smoothly
- [ ] Both iPhone and Pixel frames render side-by-side
- [ ] Keyboard shortcuts work (Ctrl+Z, Ctrl+Y, Ctrl+S, B for flip)
- [ ] Responsive at 1440px, 1024px, 768px, 390px
- [ ] Component tests pass for WalletStudio, StudioToolbar, StudioCanvas

### Phase 2 Done When:
- [ ] User can upload logo + hero image via drag-drop
- [ ] Crop preview shows correct Apple rect vs Google circle
- [ ] Image validation rejects oversized/invalid files
- [ ] Backend generates @2x/@3x variants with correct dimensions
- [ ] Uploaded images appear in both previews within 2s
- [ ] Image removal clears preview immediately
- [ ] Failed uploads show user-friendly error message
- [ ] Component tests pass for ImagesTab, SmartImageUpload

### Phase 3 Done When:
- [ ] User can add/edit/delete fields in all 5 groups
- [ ] Field limits enforced with error messages (header: 3, primary: 1, sec+aux: 4 with QR square)
- [ ] Dynamic value templates populate correctly in preview
- [ ] Apple changeMessage configured per field with %@ preview
- [ ] Google Messages configured per field (onChange/scheduled/beforeExpiry)
- [ ] Drag-to-reorder works within field groups
- [ ] Field deletion requires confirmation
- [ ] Platform visibility toggles per field work
- [ ] Component tests pass for FieldStudio, FieldCard, FieldEditorModal
- [ ] Unit tests pass for field validation, field mappers

### Phase 4 Done When:
- [ ] All 5 barcode formats selectable and preview correctly
- [ ] Barcode data builder generates valid data
- [ ] Platform-specific warnings shown for incompatible formats
- [ ] Color picker updates both previews in real-time
- [ ] Contrast check updates on every color change
- [ ] WCAG badge shows correct level (AAA/AA/FAIL)
- [ ] Preset swatches apply all 3 colors simultaneously
- [ ] Invalid hex colors rejected with error
- [ ] Component tests pass for BarcodeTab, ColorsTab

### Phase 5 Done When:
- [ ] All 10 card types have working configuration tabs
- [ ] Stamp grid renders correct number of filled/empty stamps
- [ ] Stamp icon changes reflected in preview
- [ ] VIP tier badge shows correct icon and color
- [ ] Cashback progress ring animates correctly
- [ ] Coupon cut line renders on Apple preview
- [ ] Gift certificate ribbon shows correctly
- [ ] Icon picker search filters correctly
- [ ] Custom icon upload works (PNG, SVG, max 256px)
- [ ] Component tests pass for all card type tabs
- [ ] Visual regression tests pass for all card types

### Phase 6 Done When:
- [ ] Front/back flip animation smooth (60fps)
- [ ] Back content renders correctly on Apple preview (backFields)
- [ ] Back content renders correctly on Google preview (detailsTemplateOverride)
- [ ] Design score calculates within 100ms
- [ ] All 14 checks have clear pass/fail messages
- [ ] Auto-fix works for contrast issues
- [ ] Default back content populated for all 10 card types
- [ ] App link button appears when configured
- [ ] Keyboard shortcut 'B' toggles front/back
- [ ] Component tests pass for BackDesignTab, AppleBackPreview, GoogleBackPreview
- [ ] Design score unit tests pass

### Phase 7 Done When:
- [ ] 20+ system templates load in < 2s
- [ ] Template search filters by name, type, industry
- [ ] Template preview shows both iPhone + Pixel side-by-side
- [ ] "Use template" applies all settings correctly
- [ ] "Save as template" creates new user template
- [ ] Template rename updates immediately
- [ ] Template duplicate creates independent copy
- [ ] Template delete requires confirmation
- [ ] Usage count increments on apply
- [ ] Favorite toggle persists
- [ ] Empty state shown when no user templates
- [ ] Backend API tests pass for template CRUD
- [ ] E2E test: Create stamp card from template

### Phase 8 Done When:
- [ ] AI button generates 3 variations in < 10s
- [ ] AI-generated designs have valid structure
- [ ] AI rate limit blocks after 10 requests/hour (429)
- [ ] AI quota display updates correctly in UI
- [ ] Fallback designer works when Groq API unavailable
- [ ] AI error shows user-friendly message with retry
- [ ] Color suggestions based on industry
- [ ] Design critique identifies real issues
- [ ] AI cost tracked correctly per request
- [ ] Backend tests pass for KimiService, AI endpoints
- [ ] E2E test: Create VIP card with AI

### Phase 9 Done When:
- [ ] Studio works on mobile (bottom sheet opens/closes smoothly)
- [ ] All touch targets ≥ 44x44px on mobile
- [ ] Swipe gestures work on canvas (switch platform)
- [ ] All keyboard shortcuts documented and working
- [ ] Session recovery works after simulated browser crash
- [ ] Canvas renders in < 16ms on mid-range device
- [ ] No memory leaks after 100 undo/redo operations
- [ ] Lighthouse score ≥ 90 on mobile
- [ ] Screen reader announces all interactive elements
- [ ] Keyboard navigation works throughout studio
- [ ] Reduced motion preference respected
- [ ] Accessibility audit passes (axe-core)
- [ ] Performance audit passes (Lighthouse)
- [ ] Cross-browser tests pass (Chrome, Safari, Firefox)
- [ ] Mobile tests pass (iPhone, Android)

### Phase 10 Done When:
- [ ] Old designer fully removed from wizard
- [ ] Existing v1 designs load correctly in v2 studio
- [ ] All E2E tests pass (5 critical journeys)
- [ ] Cross-browser tests pass (Chrome, Safari, Firefox)
- [ ] Mobile tests pass (iPhone, Android)
- [ ] Accessibility audit passes
- [ ] Performance budget met (Lighthouse ≥ 90)
- [ ] Visual regression tests pass (Chromatic)
- [ ] No console errors in staging
- [ ] Deployed to staging successfully
- [ ] QA sign-off on staging

### Phase 11 Done When:
- [ ] Free plan blocked from studio (403 Forbidden)
- [ ] Starter plan can access but not save templates
- [ ] Pro plan can save up to 10 templates
- [ ] Enterprise plan unlimited templates
- [ ] Trial gets all features with trial limits (5 templates, 50 updates, 20 AI)
- [ ] Rate limits enforced at middleware level (429 Too Many Requests)
- [ ] Plan features endpoint returns correct values for all tiers
- [ ] Upgrade prompts shown with correct plan comparison
- [ ] Database migrations run successfully
- [ ] No data loss during migration
- [ ] Backend integration tests pass for plan enforcement
- [ ] E2E test: Plan limit enforcement

---

## Appendix A: Weekly Schedule

| Week | Phase(s) | Focus | Key Deliverable |
|------|----------|-------|-----------------|
| 1 | 0 | Foundation | Types, utilities, tests |
| 2 | 1 + 2 | Shell + Images | Studio renders, images work |
| 3 | 3 + 4 | Fields + Barcode/Colors | Field Studio complete |
| 4 | 5 + 6 | Card visuals + Back/Score | All card types, flip works |
| 5 | 7 + 8 | Templates + AI | Templates + AI generation |
| 6 | 9 | Mobile + Polish | Responsive, shortcuts |
| 7 | 10 | Integration + Testing | E2E tests, staging |
| 8 | 11 | Launch | Production deploy |

---

## Appendix B: Dependencies Graph

```
Phase 0 (Foundation)
    │
    ├──→ Phase 1 (Canvas Shell)
    │       │
    │       ├──→ Phase 2 (Images) ──┐
    │       │                       │
    │       ├──→ Phase 3 (Field Studio) ─┤
    │       │                            ├──→ Phase 5 (Card-Type Visuals)
    │       ├──→ Phase 4 (Barcode/Colors)─┘       │
    │       │                                      │
    │       ├──→ Phase 6 (Advanced/Score/Back) ←──┘
    │       │
    │       └──→ Phase 7 (Templates + User Library)
    │               │
    │               ├──→ Phase 8 (AI)
    │               │       │
    │               │       └──→ Phase 9 (Mobile/Polish)
    │               │               │
    │               │               └──→ Phase 10 (Integration)
    │               │                       │
    │               │                       └──→ Phase 11 (Launch)
    │               │
    │               └──→ Can run parallel with Phase 8 backend
    │
    └──→ Phase 11 backend (plan integration) runs parallel with Phases 1-10
```

---

## Appendix C: Memory & Performance Budgets

| Metric | Budget | How |
|--------|--------|-----|
| Studio initial load | < 2s | Lazy load tabs, code splitting |
| Canvas re-render | < 16ms | Memoization, selective updates |
| Undo/redo memory | < 1MB | Cap 50 actions, compress state |
| Auto-save | Every 30s | Debounced, only if modified |
| Image upload | < 5s | Async processing, progress indicator |
| AI response | < 10s | Timeout with fallback |
| Mobile bundle | < 500KB | Tree shaking, lazy loading |

---

*End of Complete Implementation Guide*
*This document consolidates all 12 SRS documents into a single actionable reference.*
*NO CODE will be written until user explicitly confirms all decision points and says "PROCEED".*
