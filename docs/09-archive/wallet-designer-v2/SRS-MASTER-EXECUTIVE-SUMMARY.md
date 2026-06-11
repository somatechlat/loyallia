# Wallet Pass Studio — Master Executive Summary

> **Branch:** PASS-DESIGNER  
> **Status:** ⏳ Awaiting User Approval Before Any Code  
> **Date:** 2026-06-03  
> **Documents:** 10 SRS documents, 1 Implementation Plan  
> **Total Documentation:** ~450KB of specifications

---

## What We Are Building

A **complete redesign** of the Loyallia Wallet Pass Studio — transforming an accordion-based form editor into a **Canva-like visual design environment** where business owners create Apple Wallet + Google Wallet passes simultaneously.

---

## The 10 Document Library

| # | Document | Size | What It Covers |
|---|----------|------|---------------|
| **SRS-001** | Requirements & Research | 13KB | Apple/Google specs, competitive analysis, 10 critical issues |
| **SRS-002** | Architecture & State Model | 17KB | Unified state v2, canvas layers, undo/redo, auto-save, migration |
| **SRS-003** | UI Specifications & Mockups | 60KB | Every screen, every tab, every button, every interaction |
| **SRS-004** | Appendices — Platform Reference | 85KB | Complete Apple PassKit + Google Wallet technical reference |
| **SRS-005** | User Journeys | 52KB | 33 complete user journeys covering every path |
| **SRS-006** | Card-Type Visual Customization | 37KB | All 10 card types with icons, stamps, badges, tiers |
| **SRS-007** | AI Integration | 40KB | Kimi K2.6 backend, prompts, rate limiting, cost tracking |
| **SRS-008** | Back of Pass Design | 48KB | Front/back flip, Apple backFields, Google detailsTemplateOverride |
| **SRS-009** | User Template Library | 55KB | System templates + My Templates with full CRUD |
| **SRS-010** | Custom Fields & Notifications | 70KB | Field Studio, dynamic values, changeMessage, push notifications |
| **IMPL-PLAN** | Implementation Plan | 18KB | 11 phases, 87+ new files, 8-week roadmap |

---

## Key Features (The Complete List)

### 🎨 Design Surface
| Feature | Status in Docs | Priority |
|---------|---------------|----------|
| Canvas-based studio (not forms) | ✅ SRS-003 | CRITICAL |
| Dual-platform preview (iPhone + Pixel simultaneously) | ✅ SRS-003 | CRITICAL |
| Front ↔ Back flip toggle | ✅ SRS-008 | CRITICAL |
| Drag/drop/resize layers | ✅ SRS-003 | HIGH |
| Undo/redo (50 actions) | ✅ SRS-002 | HIGH |
| Auto-save every 30s | ✅ SRS-002 | HIGH |
| Design quality score (14 checks) | ✅ SRS-002, SRS-008 | HIGH |
| Keyboard shortcuts | ✅ SRS-003 | MEDIUM |

### 🖼️ Images & Visuals
| Feature | Status in Docs | Priority |
|---------|---------------|----------|
| Smart image upload (drag & drop) | ✅ SRS-003 | CRITICAL |
| Auto-generate @2x/@3x for Apple | ✅ SRS-002 | CRITICAL |
| Crop preview (Apple rect vs Google circle) | ✅ SRS-003 | HIGH |
| 50+ flat icon library | ✅ SRS-006 | HIGH |
| Custom stamp/icon upload per card type | ✅ SRS-006 | HIGH |
| Color picker with WCAG contrast check | ✅ SRS-003 | HIGH |
| Quick color preset swatches | ✅ SRS-003 | MEDIUM |

### 📝 Fields & Content
| Feature | Status in Docs | Priority |
|---------|---------------|----------|
| **Field Studio** (visual field editor) | ✅ SRS-010 | CRITICAL |
| 5 field groups (Header/Primary/Secondary/Auxiliary/Back) | ✅ SRS-010 | CRITICAL |
| **25+ dynamic value templates** ({customer_name}, {stamp_count}) | ✅ SRS-010 | CRITICAL |
| **Apple changeMessage push notifications** per field | ✅ SRS-010 | CRITICAL |
| **Google Wallet messages** per field | ✅ SRS-010 | CRITICAL |
| Field limit validation with visual indicators | ✅ SRS-010 | HIGH |
| Platform visibility toggles per field | ✅ SRS-010 | HIGH |
| Link detection (email, phone, URL) | ✅ SRS-010 | MEDIUM |
| Date/currency/number formatting | ✅ SRS-010 | MEDIUM |

### 📄 Back / Reverse of Pass
| Feature | Status in Docs | Priority |
|---------|---------------|----------|
| Front/back flip with animation | ✅ SRS-008 | CRITICAL |
| Apple backFields preview (ⓘ button) | ✅ SRS-008 | CRITICAL |
| Google detailsTemplateOverride preview | ✅ SRS-008 | CRITICAL |
| Default back content per card type | ✅ SRS-008 | HIGH |
| Back content editor sidebar | ✅ SRS-008 | HIGH |
| Quick links (website, phone, email) | ✅ SRS-008 | MEDIUM |
| App link configuration | ✅ SRS-008 | MEDIUM |

### 🎨 Templates
| Feature | Status in Docs | Priority |
|---------|---------------|----------|
| **20+ system templates** by industry | ✅ SRS-009 | CRITICAL |
| **User template library** (save own designs) | ✅ SRS-009 | CRITICAL |
| **Template CRUD** (create, rename, duplicate, delete) | ✅ SRS-009 | CRITICAL |
| Template favorites (⭐) | ✅ SRS-009 | MEDIUM |
| Usage counter per template | ✅ SRS-009 | MEDIUM |
| AI-generated template variations | ✅ SRS-009 | MEDIUM |
| Template preview (iPhone + Pixel) before apply | ✅ SRS-009 | HIGH |

### 🤖 AI Assistant
| Feature | Status in Docs | Priority |
|---------|---------------|----------|
| ✨ "Diseñar con IA" button (purple gradient) | ✅ SRS-007 | CRITICAL |
| Kimi K2.6 backend proxy (key in Vault) | ✅ SRS-007 | CRITICAL |
| Generate template from business description | ✅ SRS-007 | HIGH |
| Suggest colors based on industry | ✅ SRS-007 | HIGH |
| Design critique and scoring | ✅ SRS-007 | MEDIUM |
| Rate limiting (10/month free tier) | ✅ SRS-007 | HIGH |
| Fallback designer when AI unavailable | ✅ SRS-007 | MEDIUM |

### 📊 Barcode & Advanced
| Feature | Status in Docs | Priority |
|---------|---------------|----------|
| 5 barcode formats (QR, Aztec, PDF417, Code 128, Data Matrix) | ✅ SRS-003 | HIGH |
| Barcode data builder | ✅ SRS-003 | MEDIUM |
| Platform-specific barcode warnings | ✅ SRS-003 | MEDIUM |
| Apple NFC configuration | ✅ SRS-004 | LOW |
| Google Smart Tap | ✅ SRS-004 | LOW |
| Location/beacon configuration | ✅ SRS-004 | LOW |

### 📱 Mobile
| Feature | Status in Docs | Priority |
|---------|---------------|----------|
| Responsive design | ✅ SRS-003 | HIGH |
| Bottom sheet sidebar | ✅ SRS-003 | HIGH |
| Swipe to switch platform | ✅ SRS-003 | MEDIUM |
| Touch-friendly field editor | ✅ SRS-003 | MEDIUM |

---

## 10 Loyallia Card Types — Visual Features

| # | Card Type | Apple Style | Google Type | Custom Visual |
|---|-----------|------------|-------------|---------------|
| 1 | **Stamp Card** | storeCard | loyalty | Stamp grid (shape, icon, color, count) |
| 2 | **Cashback** | storeCard | loyalty | Coin icon, tier badges, progress bar |
| 3 | **Coupon** | coupon | offer | Cut line, discount badge, tag |
| 4 | **Affiliate** | generic | generic | Custom layout, referral code |
| 5 | **Discount** | coupon | offer | Percentage badge, tier display |
| 6 | **Gift Certificate** | storeCard | giftCard | Box graphic, ribbon, denomination |
| 7 | **VIP Membership** | generic | loyalty | Crown icon, member badge, benefits list |
| 8 | **Corporate Discount** | coupon | offer | Corporate badge, employee ID |
| 9 | **Referral Pass** | generic | generic | Referral code, friend bonus |
| 10 | **Multipass** | storeCard | generic | Package counter, session tracker |

---

## The Studio UI — Complete Tab System

```
┌─────────────────────────────────────────────────────────────────┐
│ TOOLBAR                                                         │
│ [↩ Undo] [↪ Redo] [🍎|🤖|👁️] [−] [100%] [+] [🎨 Plantillas]  │
│ [💾 Guardar ▼] [🔄 Frente/Reverso] ████ Score [✨ Diseñar con IA]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CANVAS (Dual preview with flip toggle)                         │
│  ┌────────────────────┐  ┌────────────────────┐               │
│  │  🍎 iPhone (Front) │  │  🤖 Pixel (Front)  │               │
│  │  or                │  │  or                │               │
│  │  🍎 iPhone (Back)  │  │  🤖 Pixel (Details)│               │
│  └────────────────────┘  └────────────────────┘               │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ SIDEBAR TABS                                                    │
│ [🖼️ Img] [🎯 Tipo] [📝 Campos] [📄 Reverso] [📊 Barcode] [🎨 Col] [⚙️ Adv]│
│                                                                 │
│  Images: Logo + Hero upload with crop preview                   │
│  Card-Type: Dynamic per type (stamps, VIP, etc.)               │
│  Fields: Field Studio with notifications                        │
│  Back: Back content + links + app config                        │
│  Barcode: Format + data builder                                 │
│  Colors: Picker + contrast check                                │
│  Advanced: Platform-specific settings                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Backend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js)                       │
│  WalletStudio.tsx → Canvas + Sidebar + Toolbar               │
│  hooks/useWalletStudio.ts → Unified state v2                 │
│  hooks/useTemplateLibrary.ts → Template CRUD                 │
│  hooks/useFieldStudio.ts → Field editor state                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (Django)                         │
│  apps/wallet/                                               │
│    ├── models.py → WalletTemplate, PassGeneration           │
│    ├── views.py → Template CRUD, pass generation            │
│    └── urls.py → /api/v1/wallet/templates/*                 │
│  apps/ai/                                                   │
│    ├── services/kimi_service.py → Kimi K2.6 API             │
│    ├── views.py → AI endpoints                              │
│    └── middleware.py → Rate limiting                        │
│  common/vault.py → get_secret('kimi_api_key')               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                        │
│  Kimi API (api.moonshot.cn/v1) → AI generation               │
│  Apple Push Notification Service → Field change alerts       │
│  Google Wallet REST API → Pass updates                      │
│  S3/MinIO → Image storage + template previews               │
└─────────────────────────────────────────────────────────────┘
```

---

## 11-Phase Implementation Roadmap

| Phase | Week | Goal | Key Deliverables |
|-------|:----:|------|-----------------|
| **0** | 1 | Foundation | Unified types, utilities, tests |
| **1** | 2 | Canvas Shell | Studio container, toolbar, sidebar, undo/redo |
| **2** | 2-3 | Images | Smart upload, crop preview, auto @2x/@3x |
| **3** | 3 | Field Studio | Field editor, dynamic templates, notifications |
| **4** | 3-4 | Barcode/Colors | Barcode config, color picker, contrast check |
| **5** | 4 | Card-Type Visuals | 10 card type tabs, stamps, icons, badges |
| **6** | 4-5 | Advanced/Score/Back | Settings, design score (14 checks), back content |
| **7** | 5 | Templates + User Library | 20+ system templates, My Templates CRUD |
| **8** | 5-6 | AI Integration | Kimi K2.6, rate limiting, fallback |
| **9** | 6 | Mobile & Polish | Responsive, bottom sheet, shortcuts, performance |
| **10** | 7 | Integration | Replace old designer, migrate v1→v2, E2E tests |
| **11** | 8 | Launch | Production deploy, monitoring |

**Can stop after any phase** — each phase delivers usable value.

---

## File Count Estimate

| Category | New Files | Modified | Deleted |
|----------|:---------:|:--------:|:-------:|
| Components | ~35 | ~5 | ~2 |
| Hooks | ~10 | 0 | 0 |
| Utilities | ~6 | 0 | 0 |
| Types/Constants | ~4 | ~2 | ~1 |
| Tests | ~20 | 0 | 0 |
| Backend (Django) | ~12 | ~3 | 0 |
| **Total** | **~87** | **~10** | **~3** |

---

## 13 Decision Points for You

| # | Decision | Options | Our Recommendation |
|---|----------|---------|-------------------|
| 1 | **Template count at launch** | 10 / 15 / 20 / 25+ | **20** |
| 2 | **AI free tier** | 5/10/20 templates/month | **10** |
| 3 | **Mobile vs desktop priority** | Desktop-first / Mobile-first / Both | **Both simultaneously** |
| 4 | **Keep old designer?** | Yes (v1 tab) / No (replace) | **No (full replace)** |
| 5 | **Icon library** | Lucide / Heroicons / Custom / All | **Lucide + Custom** |
| 6 | **Stamp animation** | CSS / Lottie / GIF | **CSS only** |
| 7 | **Export formats** | .pkpass / +JWT / +PNG | **.pkpass + JWT** |
| 8 | **User custom templates?** | Yes / No | **Yes (this is NEW)** |
| 9 | **Max user templates** | 10 / 25 / 50 / Unlimited | **50** |
| 10 | **Template sharing** | Private / Team / Public | **Private + Team** |
| 11 | **Default back content** | Minimal / Standard / Full | **Standard** |
| 12 | **Field notifications default** | All ON / All OFF / Smart | **Smart defaults** |
| 13 | **Dynamic templates scope** | Basic(5) / Standard(15) / Full(25+) | **Full (25+)** |

---

## What Has Changed Since Your Last Review

### ✅ Added (Based on Your Feedback)

1. **Back/Reverse Pass Design** (SRS-008)
   - Front ↔ back flip toggle in canvas
   - Apple backFields preview with ⓘ button simulation
   - Google detailsTemplateOverride preview
   - Dedicated "Reverso" sidebar tab
   - Default back content per card type (terms, contact, rules)
   - 5 new design score checks for back content

2. **User Custom Template Library** (SRS-009)
   - Users can save ANY design as "My Template"
   - Full CRUD: Create, Rename, Duplicate, Delete
   - "Mis Plantillas" tab in Template Gallery
   - Usage counter, favorites, last used date
   - AI can generate variations of saved templates
   - Backend model + API endpoints

3. **Custom Fields & Notifications** (SRS-010)
   - **Field Studio** replaces simple field editor
   - 25+ dynamic value templates ({customer_name}, {stamp_count})
   - **Apple changeMessage** per field (push notification on value change)
   - **Google Wallet messages** per field (scheduled or triggered)
   - Field limit validation with visual progress bars
   - Smart link detection (email → mailto:, phone → tel:)
   - Date/currency/number formatting per field
   - Field conflict resolution when limits exceeded

### 🔄 Updated

- SRS-002: Added `backContent`, `showBack`, unified field model
- SRS-003: Added flip toggle, Reverso tab, Field Studio mockups
- SRS-005: Added 8 new user journeys (J-24 to J-33)
- IMPLEMENTATION-PLAN: Added Field Studio phase, Template Library phase, 87 files

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|:-----------:|:------:|------------|
| Kimi API downtime | Medium | High | Fallback designer + caching |
| Image processing memory | Medium | Medium | Celery background queue |
| Canvas performance | Medium | Medium | Lazy rendering |
| Migration breaks v1 designs | Low | High | Backup + thorough migration |
| Field notification complexity | Medium | Medium | Smart defaults + guided setup |
| Template storage growth | Low | Medium | Limits + cleanup policy |

---

## Next Step: YOUR APPROVAL

**Before any code is written, you must:**

1. ✅ Review this Executive Summary
2. ✅ Review any SRS document you want to dive into
3. ✅ Answer the 13 Decision Points above
4. ✅ Approve the 11-phase implementation roadmap
5. ✅ Confirm: "Proceed with implementation"

**Once approved, I will:**
- Start with Phase 0 (Foundation)
- Create files one by one with full tests
- Show you progress after each phase
- Never write code before your explicit approval

---

*This is the complete scope. Nothing more will be added without your explicit request.*
*All documentation lives in `docs/06-planning/wallet-studio/` on branch `PASS-DESIGNER`.*

**Are you ready to approve this scope and proceed?**
