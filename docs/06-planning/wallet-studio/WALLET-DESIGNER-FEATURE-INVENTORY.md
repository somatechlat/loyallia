---
title: "Wallet Designer — Complete Feature Inventory & Audit"
document_id: "LOYALLIA-DOC-WALLET-DESIGNER-INVENTORY-001"
version: "1.0"
status: "approved"
last_updated: "2026-09-19"
author: "Engineering Lead"
owner: "Engineering Lead"
approver: "Product Owner"
classification: "Internal Use"
confidentiality: "Internal — Restricted to Engineering and Product teams"
review_cycle: "Upon each major release, or annually (whichever comes first)"
standard: "ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011"
parent_document: "N/A"
---

## DOCUMENT CONTROL

| Field | Details |
|-------|---------|
| **Document ID** | LOYALLIA-DOC-WALLET-DESIGNER-INVENTORY-001 |
| **Title** | Wallet Designer — Complete Feature Inventory & Audit |
| **Version** | 1.0 |
| **Date** | 2026-09-19 |
| **Author** | Engineering Lead |
| **Approver** | Product Owner |
| **Owner** | Engineering Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and Product teams |
| **Review Cycle** | Upon each major release, or annually (whichever comes first) |
| **Status** | approved |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011 |
| **Parent Document** | N/A |
| **Supersedes** | N/A |
| **Language** | English |
| **Format** | Markdown (.md) |
| **Location** | `docs/06-planning/wallet-studio/WALLET-DESIGNER-FEATURE-INVENTORY.md` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-09-19 | Engineering Lead | Initial inventory — complete audit of wallet designer codebase vs SRS specifications |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Engineering Lead | Author / Owner | Maintains document |
| Product Owner | Approver | Business validation |
| Security Officer | Reviewer | Security requirements validation |
| QA Lead | Reviewer | Quality assurance validation |

### Related Documents

| Document ID | Title | Relationship |
|-------------|-------|-------------|
| LOYALLIA-RULES-001 | Loyallia Agent Rules And Coding Standards | Reference |
| LOYALLIA-RFP-BOOMERANG-001 | RFP — Feature Parity with Boomerangme | Reference |
| SRS-LOY-WPS-001 | Wallet Pass Studio SRS (12 documents) | Parent specification |
| LOYALLIA-DOC-COMPLETE-IMPLEMENTATION-GUIDE.MD | Complete Implementation Guide | Reference |

### Change Control Process

1. All changes to this document MUST be recorded in the Revision History table above.
2. Status transitions: `draft` → `review` → `approved` → `active` → `deprecated` → `archived`.
3. Changes after `approved` status require a new version number and re-approval.
4. Minor corrections increment the minor version (e.g., 1.0 → 1.1).
5. Major changes increment the major version (e.g., 1.0 → 2.0).
6. Deprecated documents MUST be moved to `docs/09-archive/` with a deprecation notice.
7. All dates use ISO 8601 format (`YYYY-MM-DD`).

## DOCUMENT APPROVAL

| Role | Name | Signature | Date | Decision |
|------|------|-----------|------|----------|
| Engineering Lead | — | — | 2026-09-19 | Approved |
| Product Owner | — | — | — | Pending Review |
| Security Officer | — | — | — | Pending Review |

### Document Lifecycle

| State | Date | Actor | Notes |
|-------|------|-------|-------|
| Draft | 2026-09-19 | Engineering Lead | Initial inventory created |
| Approved | 2026-09-19 | Engineering Lead | Document approved for use |

### Next Review Date

| Trigger | Date | Notes |
|---------|------|-------|
| Annual review | 2026-12-31 | End of year review cycle |
| Major release | — | Triggered by major platform release |

---

# Wallet Designer — Complete Feature Inventory & Audit

## 1. Executive Summary

| Metric | Value |
|--------|-------|
| **Total source files** | 57 |
| **Total lines of code** | ~11,500+ |
| **SRS specification documents** | 16 |
| **Specified features** | 150+ |
| **Implemented features** | 130+ |
| **Bugs identified** | 25+ |
| **i18n violations** | 6 files with hardcoded Spanish |
| **Boomerangme parity** | ~75% |
| **Card types** | 10 |
| **System templates** | 20 |
| **Dynamic value templates** | 26 |
| **AI features** | 5 |
| **Keyboard shortcuts** | 16 |
| **Design quality checks** | 16 |
| **API endpoints used** | 11 |

---

## 2. File Inventory

### 2.1 Studio Components (39 files, ~8,500 lines)

| # | File | Lines | Purpose | Key Exports |
|---|------|-------|---------|-------------|
| 1 | `WalletStudio.tsx` | 586 | Main container | `WalletStudio`, `WalletStudioProps` |
| 2 | `StudioSidebar.tsx` | 380 | 7-tab sidebar | `StudioSidebar`, `StudioSidebarProps` |
| 3 | `StudioToolbar.tsx` | 421 | 2-row toolbar | `StudioToolbar`, `StudioToolbarProps` |
| 4 | `StudioCanvas.tsx` | 293 | Dual-platform preview | `StudioCanvas`, `StudioCanvasProps` |
| 5 | `ColorsTab.tsx` | 516 | WCAG contrast, presets, harmony | `ColorsTab`, `ColorsTabProps` |
| 6 | `ImagesTab.tsx` | 594 | Image upload, crop, variants | `ImagesTab`, `ImagesTabProps` |
| 7 | `FieldStudio.tsx` | 375 | Drag-drop field groups | `FieldStudio`, `FieldStudioProps` |
| 8 | `FieldCard.tsx` | 300 | Inline field editor | `FieldCard`, `FieldCardProps` |
| 9 | `BackDesignTab.tsx` | 563 | Back-of-pass content | `BackDesignTab`, `BackDesignTabProps` |
| 10 | `BarcodeTab.tsx` | 195 | Barcode format selection | `BarcodeTab`, `BarcodeTabProps` |
| 11 | `CardTypeTab.tsx` | 109 | Card-type router | `CardTypeTab`, `CardTypeTabProps` |
| 12 | `AdvancedTab.tsx` | 331 | Apple/Google specifics | `AdvancedTab`, `AdvancedTabProps` |
| 13 | `AIChatModal.tsx` | 381 | AI design assistant | `AIChatModal`, `AIChatModalProps` |
| 14 | `TemplateGallery.tsx` | 489 | 3-tab template gallery | `TemplateGallery`, `TemplateGalleryProps` |
| 15 | `TemplateCard.tsx` | 199 | Template card with menu | `TemplateCard`, `TemplateCardProps` |
| 16 | `TemplatePreviewModal.tsx` | 261 | Side-by-side preview | `TemplatePreviewModal` |
| 17 | `SaveTemplateModal.tsx` | 178 | Save-as-template modal | `SaveTemplateModal`, `SaveTemplateModalProps` |
| 18 | `DesignScore.tsx` | 139 | Score panel with checks | `DesignScore`, `DesignScoreProps` |
| 19 | `DynamicTemplatePicker.tsx` | 205 | Dynamic value picker | `DynamicTemplatePicker`, `DynamicTemplatePickerProps` |
| 20 | `IconPicker.tsx` | 294 | Icon picker modal | `IconPicker`, `IconPickerProps` |
| 21 | `ImageCropEditor.tsx` | 197 | Crop/position editor | `ImageCropEditor`, `ImageCropEditorProps` |
| 22 | `StampGrid.tsx` | 168 | Stamp grid preview | `StampGrid`, `StampGridProps` |
| 23 | `FieldLimitIndicator.tsx` | 92 | Progress bar for limits | `FieldLimitIndicator`, `FieldLimitIndicatorProps` |
| 24 | `NotificationConfigInline.tsx` | 194 | Inline notification config | `NotificationConfigInline`, `NotificationConfigInlineProps` |
| 25 | `NotificationConfigPanel.tsx` | 275 | Full notification panel | `NotificationConfigPanel`, `NotificationConfigPanelProps` |
| 26 | `MobileBottomSheet.tsx` | 153 | Draggable bottom sheet | `MobileBottomSheet`, `MobileBottomSheetProps` |
| 27 | `ErrorBoundary.tsx` | 78 | Error boundary | `ErrorBoundary`, `ErrorBoundaryProps` |
| 28 | `LockedFeature.tsx` | 78 | Plan gate overlay | `LockedFeature`, `LockedFeatureProps` |
| 29 | `LimitReached.tsx` | 68 | Limit warning banner | `LimitReached`, `LimitReachedProps` |

### 2.2 Card-Type Tabs (10 files, ~2,094 lines)

| # | File | Lines | Card Type | Key Config Fields |
|---|------|-------|-----------|-------------------|
| 1 | `tabs/StampTab.tsx` | 260 | stamp | stampsRequired, shapes, icons, grid layout, expiry |
| 2 | `tabs/CashbackTab.tsx` | 102 | cashback | percentage, expiry, min purchase, tier badge |
| 3 | `tabs/CouponTab.tsx` | 352 | coupon | discount type/value, cut line, badge style, offer tag |
| 4 | `tabs/VIPTab.tsx` | 310 | vip_membership | fees, validity, perks, crown icon, badge style |
| 5 | `tabs/GiftTab.tsx` | 220 | gift_certificate | denominations, expiry, box graphic, occasion |
| 6 | `tabs/AffiliateTab.tsx` | 132 | affiliate | code pattern, badge color, chain icon |
| 7 | `tabs/DiscountTab.tsx` | 197 | discount | tiers (CRUD), badge icons, display style |
| 8 | `tabs/CorporateTab.tsx` | 200 | corporate_discount | company name/logo, discount %, badge style |
| 9 | `tabs/ReferralTab.tsx` | 156 | referral_pass | rewards, max referrals, share color, icons |
| 10 | `tabs/MultipassTab.tsx` | 165 | multipass | bundle size/price, ticket graphic, indicator style |

### 2.3 Hooks (7 files, ~1,565 lines)

| # | File | Lines | Purpose | Key Features |
|---|------|-------|---------|--------------|
| 1 | `useWalletStudio.ts` | 358 | Main state management | 13 typed updaters, field CRUD, template application |
| 2 | `useUndoRedo.ts` | 117 | History management | 50-state cap, debounce, structural dedup |
| 3 | `useAutoSave.ts` | 101 | localStorage persistence | 30s interval, recovery, manual save |
| 4 | `useDesignScore.ts` | 295 | Quality scoring | 16 checks, weighted 0-10 |
| 5 | `useAI.ts` | 471 | AI integration | 5 API methods, AbortController, quota tracking |
| 6 | `useKeyboardShortcuts.ts` | 153 | Keyboard shortcuts | 16 shortcuts, input guard |
| 7 | `useSessionRecovery.ts` | 70 | Crash recovery | localStorage persistence, recovery detection |

### 2.4 Types (7 files, ~1,079 lines)

| # | File | Lines | Purpose |
|---|------|-------|---------|
| 1 | `unified-state.ts` | 245 | Main state type (WalletPassStudioState) |
| 2 | `unified-field.ts` | 105 | Field types (5 groups, 7 data types) |
| 3 | `card-type-config.ts` | 308 | 10 card type configs |
| 4 | `back-content.ts` | 220 | Back-of-pass types |
| 5 | `dynamic-templates.ts` | 294 | 26 dynamic value templates |
| 6 | `templates.ts` | 32 | Template types |
| 7 | `index.ts` | 10 | Barrel re-export |

### 2.5 Utilities (6 files, ~1,166 lines)

| # | File | Lines | Purpose |
|---|------|-------|---------|
| 1 | `colors.ts` | 179 | Color manipulation (hex/RGB/HSL, darken/lighten) |
| 2 | `contrast.ts` | 120 | WCAG 2.1 contrast ratio calculation |
| 3 | `field-mappers.ts` | 340 | Unified field → Apple/Google format mapping |
| 4 | `field-validation.ts` | 360 | Field group limits, combined limits, dynamic templates |
| 5 | `field-formatting.ts` | 86 | Locale-aware value formatting |
| 6 | `back-content-defaults.ts` | 81 | Default back content per card type |

### 2.6 Preview Components (10 files, ~2,165 lines)

| # | File | Lines | Purpose |
|---|------|-------|---------|
| 1 | `AppleWalletPreview.tsx` | 489 | Apple Wallet card + back preview |
| 2 | `GoogleWalletPreview.tsx` | 572 | Google Wallet card + back preview |
| 3 | `DeviceFrame.tsx` | 123 | iPhone 15 Pro + Pixel 7 frames |
| 4 | `BarcodeRenderer.tsx` | 109 | SVG barcode renderer (5 formats) |
| 5 | `preview-decorations.tsx` | 543 | 10 card-type decoration components |
| 6 | `IconRenderer.tsx` | 28 | Icon rendering (URL/SVG/library) |
| 7 | `icon-library.ts` | 344 | 225 icons in 11 categories |
| 8 | `lucide-icon-map.tsx` | 383 | 185 Lucide icon mappings |
| 9 | `apple-wallet-helpers.ts` | 200 | Template resolution, context building |
| 10 | `icons.tsx` | 71 | 5 shared SVG icons |

### 2.7 Other Files

| # | File | Lines | Purpose |
|---|------|-------|---------|
| 1 | `constants.ts` | 727 | All metadata, presets, mappings |
| 2 | `serialization.ts` | 83 | V2 state serialization |
| 3 | `services/export.ts` | 57 | Preview pass generation, download |
| 4 | `templates/registry.ts` | 66 | 20 system templates registry |
| 5 | `templates/templates-01.ts` | 458 | Templates 1-10 |
| 6 | `templates/templates-02.ts` | 436 | Templates 11-20 |

---

## 3. SRS Specification vs Implementation Matrix

| SRS Doc | Feature | Status | Evidence |
|---------|---------|--------|----------|
| SRS-002 | Unified v2 state model | IMPLEMENTED | `unified-state.ts`, `useWalletStudio.ts` |
| SRS-002 | Undo/redo (50 states) | IMPLEMENTED | `useUndoRedo.ts` |
| SRS-002 | Auto-save (30s) | IMPLEMENTED | `useAutoSave.ts` |
| SRS-002 | Session recovery | IMPLEMENTED | `useSessionRecovery.ts` |
| SRS-003 | 7-tab sidebar | IMPLEMENTED | `StudioSidebar.tsx` |
| SRS-003 | 2-row toolbar | IMPLEMENTED | `StudioToolbar.tsx` |
| SRS-003 | Dual-platform preview | IMPLEMENTED | `StudioCanvas.tsx` |
| SRS-003 | Images tab with upload | IMPLEMENTED | `ImagesTab.tsx` |
| SRS-003 | Card-type tabs (10) | IMPLEMENTED | `tabs/*.tsx` |
| SRS-003 | Field studio | IMPLEMENTED | `FieldStudio.tsx`, `FieldCard.tsx` |
| SRS-003 | Barcode tab | IMPLEMENTED | `BarcodeTab.tsx` |
| SRS-003 | Colors tab | IMPLEMENTED | `ColorsTab.tsx` |
| SRS-003 | Advanced tab | IMPLEMENTED | `AdvancedTab.tsx` |
| SRS-003 | Back design tab | IMPLEMENTED | `BackDesignTab.tsx` |
| SRS-003 | Canvas drag-drop layers | MISSING | No layer system in code |
| SRS-003 | Context menu (right-click) | MISSING | No context menu component |
| SRS-003 | Snap-to-grid | MISSING | `showGrid` in state but no implementation |
| SRS-003 | Keyboard shortcuts (17) | PARTIAL | 16 implemented, Tab/Shift+Tab partially |
| SRS-005 | 33 user journeys | DOCUMENTED | Spec exists, not all tested |
| SRS-006 | Stamp shapes (8) | PARTIAL | 6 shapes implemented |
| SRS-006 | Stamp icon library (50+) | IMPLEMENTED | 225 icons in `icon-library.ts` |
| SRS-006 | Card-type decorations (10) | IMPLEMENTED | `preview-decorations.tsx` |
| SRS-007 | AI template generation | IMPLEMENTED | `useAI.ts`, `AIChatModal.tsx` |
| SRS-007 | AI color suggestions | IMPLEMENTED | `useAI.ts` |
| SRS-007 | AI design critique | IMPLEMENTED | `useAI.ts` |
| SRS-007 | AI stamp icon suggestions | IMPLEMENTED | `useAI.ts` |
| SRS-007 | AI layout suggestions | IMPLEMENTED | `useAI.ts` |
| SRS-008 | Back-of-pass design | IMPLEMENTED | `BackDesignTab.tsx` |
| SRS-008 | Design quality score (14 checks) | IMPLEMENTED | `useDesignScore.ts` (16 checks) |
| SRS-009 | Template gallery (3 tabs) | IMPLEMENTED | `TemplateGallery.tsx` |
| SRS-009 | User template CRUD | IMPLEMENTED | API + UI |
| SRS-009 | Template preview modal | IMPLEMENTED | `TemplatePreviewModal.tsx` |
| SRS-010 | Dynamic value templates (25+) | IMPLEMENTED | 26 templates in `dynamic-templates.ts` |
| SRS-010 | Field notifications | IMPLEMENTED | `NotificationConfigPanel.tsx` |
| SRS-011 | Plan enforcement | IMPLEMENTED | `LockedFeature.tsx`, `LimitReached.tsx` |
| SRS-012 | storeCard combined limit | BUG | Allows 9, should be 4 |
| SRS-012 | Google hero ratio 5:4 | BUG | Uses different ratio |
| SRS-012 | Google logo circular | BUG | Shows rounded rectangle |
| SRS-012 | DATA_MATRIX barcode | MISSING | Defined but not in UI |

---

## 4. Bug Inventory

### 4.1 Critical (5)

| # | File | Line | Bug | Impact |
|---|------|------|-----|--------|
| C1 | `IconRenderer.tsx` | 19 | Cannot render 99% of icons — only checks `svgPath`, ignores `lucideName` | Icons in stamp grid, cashback badges, VIP crowns all fail to render |
| C2 | `AIChatModal.tsx` | all | All strings hardcoded in Spanish, bypasses i18n system | Breaks for English users |
| C3 | `TemplateCard.tsx` | all | All strings hardcoded in Spanish | Breaks for English users |
| C4 | `field-validation.ts` | 275 | `barcodeFormat` not passed to `validateFieldGroupLimits()` | Combined secondary+auxiliary limit never enforced |
| C5 | `WalletStudio.tsx` | 458 | `imgs.icon && !imgs.icon` tautology (always false) | Auto-transfer logic broken |

### 4.2 High (6)

| # | File | Line | Bug | Impact |
|---|------|------|-----|--------|
| H1 | `useAI.ts` | 165 | AbortController signal never passed to API calls | Network requests cannot be cancelled |
| H2 | `GoogleWalletPreview.tsx` | 46 | `buildContext` duplicated from `apple-wallet-helpers.ts` | Maintenance burden, token drift |
| H3 | `lucide-icon-map.tsx` | all | 185 Lucide components imported but never used by `IconRenderer` | Dead code, bundle bloat |
| H4 | `field-mappers.ts` | 115 | Hardcoded `'pass.com.loyallia.wallet'` and `'LOYALLIA'` | Should come from settings |
| H5 | `services/export.ts` | 42 | `triggerDownload` uses raw fetch without auth | Download URLs requiring auth will fail |
| H6 | `ErrorBoundary.tsx` | all | Hardcoded Spanish error messages | Breaks for English users |

### 4.3 Medium (8)

| # | File | Line | Bug | Impact |
|---|------|------|-----|--------|
| M1 | `useKeyboardShortcuts.ts` | 146 | `config` object causes listener re-registration every render | Performance churn |
| M2 | `useDesignScore.ts` | 265 | Hardcoded Spanish level names | Bypasses i18n |
| M3 | `useAutoSave.ts` | 41 | `isSaving` never visible in render | State set true/false in same tick |
| M4 | `StudioSidebar.tsx` | 38-209 | 16 inline SVG icons | Should be shared |
| M5 | `NotificationConfigInline.tsx` + `NotificationConfigPanel.tsx` | all | Duplicated handler logic | Should share hook |
| M6 | `TemplatePreviewModal.tsx` | all | Hardcoded Spanish strings | Breaks for English users |
| M7 | `dynamic-templates.ts` | all | English labels/descriptions | Should be Spanish or i18n keys |
| M8 | `back-content-defaults.ts` | all | All labels/values empty strings | Default content is blank |

### 4.4 Low (6)

| # | File | Line | Bug | Impact |
|---|------|------|-----|--------|
| L1 | `StudioToolbar.tsx` | 186 | `PLATFORM_OPTIONS` recreated every render | Minor perf |
| L2 | `FieldLimitIndicator.tsx` | 47 | Magic number 999 for "unlimited" | Should be constant |
| L3 | `field-formatting.ts` | 53 | US-centric phone format, USD default | Not locale-aware |
| L4 | `MultipassTab.tsx` | all | `bundleBadgeStyle`/`indicatorStyle` redundancy | Confusing UX |
| L5 | `DiscountTab.tsx` | all | No tier ordering validation | Nonsensical tiers possible |
| L6 | `back-content.ts` | all | All 10 card types produce identical empty content | Redundant factories |

---

## 5. Boomerangme Feature Parity (from RFP)

| Category | Boomerangme | Loyallia | Status |
|----------|------------|----------|--------|
| **Cards** | 11 types | 10 types | PARITY (missing prepaid) |
| **Design** | 111 templates | 20 templates | GAP (needs more) |
| **Design** | WYSIWYG editor | WalletPassStudio | PARITY |
| **Design** | Apple Wallet | Apple Wallet | PARITY |
| **Design** | Google Wallet | Google Wallet | PARITY |
| **Design** | Custom fields | FormBuilder | PARITY |
| **Design** | Stamp shapes (6) | 6 shapes | PARITY |
| **Design** | Icon library (200+) | 225 icons | PARITY |
| **Engagement** | Push notifications | Wallet pushes | PARITY |
| **Engagement** | SMS | Twilio | PARITY |
| **Engagement** | Email | Mailjet | PARITY |
| **Engagement** | WhatsApp | Baileys bridge | PARITY |
| **Engagement** | Google Reviews | — | **GAP** |
| **Engagement** | RFM analysis | — | **GAP** |
| **Scanner** | PWA scanner | Scanner PWA | PARITY |
| **Scanner** | POS integration | — | **GAP** |
| **Analytics** | Real-time | Analytics API | PARITY |
| **Analytics** | Leaderboards | — | **GAP** |
| **Analytics** | ROI calculator | — | **GAP** |
| **Agency** | White-label | Tenant branding | PARITY |
| **Agency** | Multi-tenant | Unlimited tenants | PARITY+ |
| **Agency** | Reseller dashboard | — | **GAP** |
| **Agency** | Franchise dashboard | — | **GAP** |
| **Platform** | Monitoring | Prometheus/Grafana | **LOYALLIA ADVANTAGE** |
| **Platform** | Backups | Backup service | PARITY |
| **Platform** | Audit | AuditLog | PARITY |

**Overall parity: ~75%**

**Loyallia advantages:** Prometheus/Grafana monitoring, unlimited tenants, Baileys WhatsApp bridge, immutable audit trail

**High-priority gaps:** Prepaid cards, RFM analysis, Google Reviews, POS integrations

---

## 6. Implemented Features Summary

### Card Types (10)
Stamp, Cashback, Coupon, Affiliate, Discount, Gift Certificate, VIP Membership, Corporate Discount, Referral Pass, Multipass

### Industries (9)
Food, Retail, Services, Health, Entertainment, Transport, Education, Technology, Generic

### Studio Tabs (7)
Images, Card Type, Fields, Back, Barcode, Colors, Advanced

### AI Features (5)
Template generation, Color suggestions, Design critique, Stamp icon suggestions, Layout suggestions

### Keyboard Shortcuts (16)
Undo, Redo, Save, Export, AI Open, Toggle Back, Zoom In/Out/Reset, Escape, Duplicate, Delete, Toggle Grid, Next/Prev Field, Nudge (with Shift 10x)

### Design Quality Checks (16)
contrast_text, contrast_label, logo_present, logo_dimensions, primary_field, hero_present, image_aspect_ratios, barcode_configured, has_back_fields, has_terms, has_contact_info, has_program_rules, back_content_length, platform_compat, color_harmony, notifications_ok

### Dynamic Templates (26)
Customer: name, id, email, phone
Stamps: count, display, reward_description
Points: balance, percentage, tier_name, tier_badge
Coupon: discount_amount, percentage, redemption_code, title
VIP: membership_start, expiry, next_payment
Gift: balance, card_number, amount
Program: name, merchant_name, phone, email, website
Date: current_date, current_time, days_until_expiry
Other: visit_count, purchase_total, referral_code, friend_name, remaining_uses, session_count, employee_id, department, company_name, barcode_data, qr_code

### System Templates (20)
Cafe Clasico (stamp/food), Cafe Cashback (cashback/food), Retail Moderno (discount/retail), Gym Pro (vip/health), Salon de Belleza (stamp/services), Hotel Lujo (vip/services), Food Truck Rapido (coupon/food), Libreria Sabiduria (stamp/retail), Farmacia Salud (discount/health), Pet Shop Mascotas (stamp/retail), Panaderia Dulce (stamp/food), Restaurante Gourmet (cashback/food), Barberia Clasica (multipass/services), Spa Relax (gift/health), Cine Estrella (multipass/entertainment), Parking Ciudad (multipass/transport), Lavanderia Fresh (stamp/services), Floristeria Ramo (gift/retail), Tech Store Digital (discount/technology), Supermercado Ahorro (cashback/retail)

---

*End of document*
