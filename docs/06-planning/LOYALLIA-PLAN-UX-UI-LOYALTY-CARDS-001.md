---
title: "Loyallia — UX/UI Improvement Plan for Loyalty Card Designer"
document_id: "LOYALLIA-PLAN-UX-UI-LOYALTY-CARDS-001"
version: "1.0"
status: "draft"
last_updated: "2026-09-15"
author: "Engineering Team"
owner: "Product Owner"
approver: "Product Owner"
classification: "Internal Use"
confidentiality: "Loyallia engineering and product team only"
review_cycle: "Per sprint"
standard: "ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011"
parent_document: "LOYALLIA-SRS-MASTER-001"
---

## DOCUMENT CONTROL

| Field | Value |
|---|---|
| **Document ID** | LOYALLIA-PLAN-UX-UI-LOYALTY-CARDS-001 |
| **Title** | UX/UI Improvement Plan for Loyalty Card Designer |
| **Version** | 1.0 |
| **Date** | 2026-09-15 |
| **Author** | Engineering Team |
| **Approver** | Product Owner |
| **Owner** | Product Owner |
| **Classification** | Internal Use |
| **Confidentiality** | Loyallia engineering and product team only |
| **Status** | draft |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011|
| **Parent Document** | LOYALLIA-SRS-MASTER-001 |
| **Supersedes** | N/A |
| **Language** | Spanish (source requirements) / English (implementation) |
| **Format** | .md |
| **Location** | docs/06-planning/LOYALLIA-PLAN-UX-UI-LOYALTY-CARDS-001.md |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 0.1 | 2026-09-15 | Engineering Team | Initial draft — gap analysis + development plan |
| 1.0 | 2026-09-15 | Engineering Team | Full plan with expert recommendations and phased roadmap |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Product Owner | Approver | Review, prioritize, and approve phases |
| Engineering Team | Implementer | Execute development per phase |
| QA Team | Validator | Verify each phase before merge |
| Design Team | Reviewer | Validate visual fidelity against competition |

### Related Documents

| Document ID | Title | Relationship |
|-------------|-------|-------------|
| LOYALLIA-PLAN-DESIGNER-FIX-002 | Wallet Designer UI/UX Full Audit + Fix Plan | Sibling — icon rendering fix |
| LOYALLIA-SRS-MASTER-001 | Master SRS | Parent |
| LOYALLIA-SRS-BOOMERANG-001 | Boomerangme Feature Parity SRS | Reference — competitive features |
| Source Document | Mejoras UX/UI – Selección de Tipo de Programa de Fidelización (.docx) | Input requirements |

### Change Control Process

1. All changes are recorded in the Revision History table above.
2. Status transitions: `draft` → `review` → `approved` → `active` → `deprecated` → `archived`.
3. Minor corrections (typos, clarifications) increment the minor version (e.g., 1.0 → 1.1).
4. Scope changes (new phases, removed items) increment the major version (e.g., 1.0 → 2.0).
5. All dates use ISO 8601 format (`YYYY-MM-DD`).
6. Deprecated documents move to `docs/09-archive/`.
7. All dates in this document use ISO 8601 format (`YYYY-MM-DD`).

## DOCUMENT APPROVAL

| Role | Name | Signature | Date | Decision |
|------|------|-----------|------|----------|
| Engineering Lead | — | — | 2026-09-23 | Approved |
| Product Owner | — | — | 2026-09-23 | Approved |
| Security Officer | — | — | — | Pending Review |

### Document Lifecycle

| State | Date | Actor | Notes |
|-------|------|-------|-------|
| Draft | 2026-09-12 | Engineering Team | initial authoring |
| Reviewed | 2026-09-23 | Engineering Lead | ISO document-control completeness applied |

### Next Review Date

| Trigger | Date | Notes |
|---------|------|-------|
| Annual review | 2027-09-23 | Annual ISO document-control review |
| Plan completion | — | Triggered upon plan completion |

---

## 1. EXECUTIVE SUMMARY

This document is the **ISO-compliant development plan** derived from the client-provided requirements document "Mejoras UX/UI – Selección de Tipo de Programa de Fidelización" (`.docx`).

The requirements document specifies **~35 discrete changes** across the Loyallia wallet card designer. After deep code analysis, this plan:

- **Accepts 18 changes** as immediately actionable and safe.
- **Recommends 10 changes** with modifications to avoid breaking existing functionality.
- **Defers 7 changes** that require significant architectural decisions or backend work first.

Each item is classified by **risk level**, **effort estimate**, and **recommended phase**.

---

## 2. EXPERT RECOMMENDATIONS — ACCEPT / MODIFY / DEFER

### Legend

| Verdict | Meaning |
|---------|---------|
| **ACCEPT** | Safe to implement. Low risk, clear spec, existing code supports it. |
| **MODIFY** | Good idea but needs adjustment to avoid damage. Spec as-written would break something. |
| **DEFER** | Requires backend changes, architectural decisions, or is a new feature (not a UI fix). Plan separately. |
| **REJECT** | Would damage current functionality or conflicts with Apple/Google Wallet specs. |

---

### 2.1 PROGRAM TYPE SELECTION PAGE — Text Changes

| ID | Requirement | Verdict | Risk | Effort | Notes |
|----|-------------|---------|------|--------|-------|
| TXT-01 | Update heading: "Selecciona el programa que mejor se adapte a tu negocio" | **ACCEPT** | Trivial | 5 min | i18n key change in `es.json` |
| TXT-02 | Update subtext: "Elige el programa que deseas crear..." | **ACCEPT** | Trivial | 5 min | i18n key change |
| TXT-03 | Update 9 program descriptions (stamp, cashback, coupon, affiliate, discount, gift, VIP, corporate, referral, multipass) | **ACCEPT** | Trivial | 15 min | 10 i18n key changes. All text-only, no code impact. |

**Recommendation:** These are the lowest-risk, highest-value changes. Ship first.

---

### 2.2 APPLE / GOOGLE WALLET TOGGLE IN PREVIEW

| ID | Requirement | Verdict | Risk | Effort | Notes |
|----|-------------|---------|------|--------|-------|
| TOG-01 | Add clickable Apple/Google toggle above the phone mockup | **MODIFY** | Low | 2h | The toggle already exists in `StudioToolbar`. The doc wants it *inside the creation wizard* (not just the Studio). Needs a lightweight toggle component for the wizard flow. Do NOT duplicate the full Studio toolbar. |
| TOG-02 | Show iPhone frame for Apple, Android phone for Google | **MODIFY** | Medium | 4h | `IPhone15ProFrame` exists. Need to create `AndroidPhoneFrame`. Use a generic Android device frame (not a specific brand to avoid trademark issues). The Google preview (`GoogleWalletPreview.tsx`) currently has no device frame — wrap it. |

**Recommendation:** TOG-01 is safe — add a simple segmented control above the preview in the wizard. TOG-02 needs a new `AndroidPhoneFrame` component — use a clean vector frame, not a pixel-perfect Samsung/Pixel replica.

---

### 2.3 STAMP CARD — Configuration Changes

| ID | Requirement | Verdict | Risk | Effort | Notes |
|----|-------------|---------|------|--------|-------|
| STP-01 | Remove "stamps required" from config, move to Design section | **MODIFY** | Medium | 3h | Currently `stampsRequired` is in `StampTab.tsx` (config). The doc wants it in the "Design" section. **Problem:** The Studio uses a flat tab structure (images/cardType/fields/back/barcode/colors/advanced) — there is no separate "Design" section. **Recommendation:** Keep it in the cardType tab but move it to the TOP of the section (before other config fields) and relabel it. This matches the intent without restructuring the entire tab layout. |
| STP-02 | Max stamps should be 30 (currently 20) | **ACCEPT** | Trivial | 5 min | Change `max={20}` to `max={30}` in `StampTab.tsx:110` |
| STP-03 | Add "Ubicación" (Locations) field with plan limits | **DEFER** | High | 2-3 days | Requires: (1) Location management UI, (2) Plan enforcement backend, (3) Upsell flow integration, (4) Stripe/payment integration for $10 add-on. This is a **new feature**, not a UI fix. Plan separately. |

**Recommendation:** STP-01 + STP-02 are safe. STP-03 is a product feature that needs its own sprint.

---

### 2.4 FORM ENROLLMENT — "Obligatorio/Opcional" Toggles

| ID | Requirement | Verdict | Risk | Effort | Notes |
|----|-------------|---------|------|--------|-------|
| FRM-01 | Rename section: "Datos que solicitarás a tus clientes" | **ACCEPT** | Trivial | 5 min | i18n change |
| FRM-02 | Add subtext: "Selecciona la información que deseas recopilar..." | **ACCEPT** | Trivial | 5 min | i18n change |
| FRM-03 | Replace "Requerido" with "Obligatorio", "Único" with "Opcional" | **ACCEPT** | Trivial | 10 min | i18n changes in `es.json` |
| FRM-04 | Make "Obligatorio"/"Opcional" mutually exclusive radio toggles | **MODIFY** | Low | 2h | Currently `FieldCard.tsx` has checkbox toggles for `required` and `unique`. The doc wants them as mutually exclusive radios. **This is correct** — a field can't be both required AND optional. Change to radio-style UI. **However:** Keep the `required` boolean in the data model. Just change the UI to radio behavior: `required=true` = Obligatorio, `required=false` = Opcional. Remove the `unique` toggle entirely or repurpose it (it means "unique value per customer" which is a different concept). |
| FRM-05 | Backend enforcement: required fields block card download | **DEFER** | High | 1-2 days | Requires backend validation changes to the pass issuance API. Not a frontend-only change. |

**Recommendation:** FRM-01 through FRM-04 are safe. FRM-05 needs backend coordination.

---

### 2.5 STAMP CARD — Design Section (Image Uploads)

| ID | Requirement | Verdict | Risk | Effort | Notes |
|----|-------------|---------|------|--------|-------|
| IMG-01 | 5 image upload slots for Apple Wallet (inactive stamp, active stamp, logo, push icon, stamp background) | **MODIFY** | Medium | 4h | Currently `ImagesTab.tsx` has 6 generic slots (logo, strip, icon, thumbnail, background, wideLogo). The doc wants stamp-specific slots. **Recommendation:** Add card-type-conditional image slots. When `cardType === 'stamp'`, show stamp-specific slots instead of generic ones. This avoids breaking other card types. |
| IMG-02 | Full crop/position editor (zoom, move, flip, rotate, reset) | **DEFER** | High | 3-5 days | `CropPreviewPane` is currently a static preview. A full crop editor requires a library like `react-image-crop` or `cropperjs`, plus significant UI work. This is a **cross-cutting feature** that benefits ALL card types. Plan as its own phase. |
| IMG-03 | Generic icon library fallback | **ACCEPT** | None | 0 min | Already exists via `IconPicker.tsx` + `icon-library.ts` |
| IMG-04 | Auto-transfer images Apple → Google when switching | **MODIFY** | Medium | 3h | Images are already in shared state (`WalletImages`). The issue is that Apple and Google use different image *dimensions*. **Recommendation:** When switching to Google, auto-map: Apple logo → Google logo (same), Apple icon → Google icon (same), Apple strip → Google hero (same). Show a toast: "Images transferred. Adjust dimensions if needed." Do NOT force-fit — let users override. |

**Recommendation:** IMG-01 and IMG-04 are safe with modifications. IMG-02 (crop editor) should be Phase 2 or 3.

---

### 2.6 COUPON CARD — Configuration

| ID | Requirement | Verdict | Risk | Effort | Notes |
|----|-------------|---------|------|--------|-------|
| CPN-01 | Live mockup updates as user fills config | **ACCEPT** | None | 0 min | Already works in Studio — the preview updates live via state |
| CPN-02 | Sticky mockup (scroll left, fixed right) | **ACCEPT** | None | 0 min | Already implemented in `WalletStudio.tsx` layout |
| CPN-03 | "Plantilla tarjeta vinculada" — coupon transforms into another card after use | **DEFER** | Critical | 5-7 days | This is an **entirely new product feature**: (1) New database model for card transformation rules, (2) Backend logic for post-redemption card issuance, (3) New UI for selecting target card, (4) Pass lifecycle management. This should be a separate epic with its own SRS. |
| CPN-04 | Show user's existing cards with custom names in selector | **DEFER** | Medium | 2 days | Requires: (1) API endpoint to list user's created programs with names, (2) New selector UI component. Backend dependency. |
| CPN-05 | Card naming convention: "Card Type — Custom Name" on save | **MODIFY** | Low | 1h | Can be done as a frontend-only display convention. When saving, prepend the card type label. **Recommendation:** Implement as a display helper, not enforced storage format. |
| CPN-06 | Move coupon image from config to Design, add dimension specs | **MODIFY** | Low | 2h | Same pattern as IMG-01 — add card-type-conditional image slots in `ImagesTab.tsx` |

**Recommendation:** CPN-01, CPN-02 are already done. CPN-05, CPN-06 are safe. CPN-03 and CPN-04 are major features — defer.

---

### 2.7 COUPON CARD — Design Section

| ID | Requirement | Verdict | Risk | Effort | Notes |
|----|-------------|---------|------|--------|-------|
| CPD-01 | Only 3 image types for coupon (Logo, Icon, Central background) | **MODIFY** | Low | 2h | Filter image slots by card type. Show only coupon-relevant slots when `cardType === 'coupon'`. |
| CPD-02 | Auto-transfer Apple → Google images | (Same as IMG-04) | — | — | Covered above |
| CPD-03 | Text color picker separate from background | **ACCEPT** | None | 0 min | `ColorsTab.tsx` already has `foreground` (text color) + `background`. Already exists. |
| CPD-04 | Central area background color picker | **MODIFY** | Low | 2h | Add `centralBackground` to `WalletColors` interface. Add a 5th color picker in `ColorsTab.tsx`. This is safe — additive only. |
| CPD-05 | Push notification preview | **DEFER** | Medium | 1-2 days | Would need a modal/overlay showing how the push looks on a phone notification. Nice-to-have, not blocking. |

**Recommendation:** CPD-01, CPD-04 are safe. CPD-03 already exists. CPD-05 is polish.

---

### 2.8 CASHBACK/POINTS CARD — Configuration

| ID | Requirement | Verdict | Risk | Effort | Notes |
|----|-------------|---------|------|--------|-------|
| CBK-01 | Rename credit expiry to "Fecha de vencimiento" with 3 options: Ilimitado, plazo definido, plazo definido al emitir | **MODIFY** | Low | 3h | Currently a simple number input. Change to 3-option toggle: `unlimited` | `defined_period` | `defined_at_issue`. **Keep backward compatibility** — map existing `creditExpiryDays` values: 0 = unlimited, >0 = defined_period. |
| CBK-02 | Add "Puntos permanentes" (Lifetime points) by days/months/years | **DEFER** | Medium | 1-2 days | New field in `CashbackCardConfig`. Requires backend to track point expiration per-category. Not just a UI change. |
| CBK-03 | Add "Horas felices" (Happy Hours) point multiplier | **DEFER** | High | 3-5 days | New feature: schedule configuration (day/time ranges + multiplier value), backend enforcement during point accrual, real-time multiplier display on pass. |
| CBK-04 | Add "Estado del titular" (Tier status) with configurable levels | **DEFER** | High | 3-5 days | New feature: tier definitions (name, threshold, percentage), backend tier calculation, automatic tier upgrades, pass visual update on tier change. The `DiscountCardConfig.tiers` has a similar structure but for discount tiers, not cashback tiers. |
| CBK-05 | Live tier preview in mockup | **DEFER** | — | — | Depends on CBK-04 |

**Recommendation:** Only CBK-01 is safe for this phase. CBK-02 through CBK-05 are new features requiring backend work.

---

### 2.9 NEW "INFORMACIÓN DE TARJETA" SECTION

| ID | Requirement | Verdict | Risk | Effort | Notes |
|----|-------------|---------|------|--------|-------|
| INF-01 | Add 5th section "INFORMACIÓN DE TARJETA" with 15+ fields | **MODIFY** | Medium | 3-4 days | The `BackDesignTab.tsx` already exists for back-of-pass content. **Recommendation:** Extend BackDesignTab with structured sections rather than creating a new tab. Group the 15+ fields into categories: (1) Program Info, (2) Rewards Status, (3) Locations, (4) Legal, (5) Issuer Info. This avoids adding an 8th tab to the already-full sidebar. |
| INF-02 | Include: terms, referral share, expiry, next reward, points balance, total visits, reward levels, level descriptions, locations with links, company name, issuer info (Loyallia), serial number, "created by", "last updated" | **MODIFY** | Medium | — | Split into: (a) Fields already in `back-content.ts` (terms, contact, website) — just need default values, (b) Dynamic fields (points, visits, expiry) — these are runtime values populated by the backend, not designer config, (c) Static fields (issuer info, serial number) — can be auto-populated. **Key insight:** Most of these are NOT designer-time fields. They're runtime data that appears on the issued pass. The designer should configure *which* fields to show, not their values. |
| INF-03 | Same for Google Wallet (Android) | **MODIFY** | Medium | 1 day | Google Wallet uses a different back-content model (no "back of pass" — uses info module). Need to map fields to Google's `infoModuleData` rows. |

**Recommendation:** INF-01 is safe if done as an extension of BackDesignTab. INF-02 needs the correct architecture (config-time vs runtime fields). INF-03 follows naturally.

---

### 2.10 IMAGE CROP/POSITION EDITOR (All Cards)

| ID | Requirement | Verdict | Risk | Effort | Notes |
|----|-------------|---------|------|--------|-------|
| CROP-01 | Full crop editor: zoom +/-, move 4 directions, flip H/V, rotate 360, reset | **DEFER** | High | 5-7 days | This is a significant cross-cutting feature. Needs: (1) Library selection (`react-image-crop` recommended), (2) New `ImageCropEditor.tsx` component, (3) Integration with all upload zones, (4) Mobile touch support. **This is the single most impactful UX improvement** but also the most complex. |
| CROP-02 | Show exact dimension requirements per slot | **ACCEPT** | Trivial | 30 min | Already partially done in `CropPreviewPane`. Add dimension text to each upload zone. |
| CROP-03 | Apply to all image upload zones | **DEFER** | — | — | Depends on CROP-01 |

**Recommendation:** CROP-02 is trivial. CROP-01 should be Phase 3 — it's the highest-value, highest-effort item.

---

## 3. DEVELOPMENT PHASES — RECOMMENDED ROADMAP

### Phase 1: Text & UI Polish (No Risk, Immediate Value)
**Duration:** 1 day | **Risk:** Trivial | **Files:** i18n JSON files only

| Task | ID | Description |
|------|----|-------------|
| 1.1 | TXT-01 | Update heading text |
| 1.2 | TXT-02 | Update subtext |
| 1.3 | TXT-03 | Update 9 program descriptions |
| 1.4 | FRM-01 | Rename enrollment section title |
| 1.5 | FRM-02 | Add enrollment subtext |
| 1.6 | FRM-03 | Rename "Requerido" → "Obligatorio", "Único" → "Opcional" |
| 1.7 | STP-02 | Increase max stamps from 20 to 30 |

**Verification:** `npm run typecheck && npm run test:unit && npm run build`

---

### Phase 2: Safe Code Changes (Low Risk, High Value)
**Duration:** 2-3 days | **Risk:** Low | **Files:** Frontend components only

| Task | ID | Description | Files |
|------|----|-------------|-------|
| 2.1 | FRM-04 | Make Obligatorio/Opcional mutually exclusive radios | `FieldCard.tsx`, `FieldStudio.tsx` |
| 2.2 | STP-01 | Move stampsRequired to top of StampTab | `StampTab.tsx` |
| 2.3 | TOG-01 | Add Apple/Google toggle in creation wizard | Wizard page, new `PlatformToggle.tsx` |
| 2.4 | TOG-02 | Create Android device frame | New `DeviceFrame.tsx` addition |
| 2.5 | CPN-05 | Card naming convention on save | Save flow helper |
| 2.6 | CPD-04 | Add central area background color picker | `ColorsTab.tsx`, `unified-state.ts` |
| 2.7 | CBK-01 | Cashback expiry redesign (3 options) | `CashbackTab.tsx`, `card-type-config.ts` |
| 2.8 | CROP-02 | Show dimension requirements on upload zones | `ImagesTab.tsx` |
| 2.9 | IMG-04 | Auto-transfer images Apple → Google | `WalletStudio.tsx` or wizard |

**Verification:** `npm run typecheck && npm run test:unit && npm run build` + manual UI testing

---

### Phase 3: Card-Type-Specific Image Slots + Crop Editor
**Duration:** 5-7 days | **Risk:** Medium | **Files:** New component + multiple tab files

| Task | ID | Description | Files |
|------|----|-------------|-------|
| 3.1 | IMG-01 | Card-type-conditional image slots in ImagesTab | `ImagesTab.tsx` |
| 3.2 | CPD-01 | Coupon-specific 3 image slots | `ImagesTab.tsx` |
| 3.3 | CROP-01 | Full image crop/position editor component | New `ImageCropEditor.tsx` |
| 3.4 | CROP-03 | Integrate crop editor into all upload zones | `ImagesTab.tsx` + all card tabs |

**Prerequisites:** Phase 2 complete. Library install: `react-image-crop`.

**Verification:** Full E2E test of image upload flow for each card type.

---

### Phase 4: Back-of-Pass Information Section
**Duration:** 3-4 days | **Risk:** Medium | **Files:** BackDesignTab + types + previews

| Task | ID | Description | Files |
|------|----|-------------|-------|
| 4.1 | INF-01 | Extend BackDesignTab with structured sections | `BackDesignTab.tsx` |
| 4.2 | INF-02 | Add config-time field selector (which fields to show) | `back-content.ts`, `BackDesignTab.tsx` |
| 4.3 | INF-03 | Google Wallet info module mapping | `GoogleWalletPreview.tsx` |

**Prerequisites:** Phase 2 complete. Backend coordination for runtime field values.

---

### Phase 5: Backend-Dependent Features (Separate Epics)
**Duration:** TBD per feature | **Risk:** High | **Requires:** Backend + frontend

| Task | ID | Description | Epic Size |
|------|----|-------------|-----------|
| 5.1 | STP-03 | Location management with plan enforcement | Medium epic |
| 5.2 | FRM-05 | Required field backend validation | Small epic |
| 5.3 | CBK-02 | Lifetime points configuration | Medium epic |
| 5.4 | CBK-03 | Happy Hours point multiplier | Large epic |
| 5.5 | CBK-04 | Cashback tier system | Large epic |
| 5.6 | CPN-03 | Linked card template (coupon transforms) | Large epic |
| 5.7 | CPN-04 | Existing card selector with custom names | Medium epic |

**Each of these should be planned as a separate sprint item with its own SRS section.**

---

## 4. RISK ASSESSMENT MATRIX

| Risk Level | Count | Mitigation |
|------------|-------|------------|
| **Trivial** (i18n only) | 10 | Ship immediately. Zero code risk. |
| **Low** (isolated component changes) | 7 | Standard PR review. Unit tests required. |
| **Medium** (cross-component, shared state) | 6 | Dedicated QA pass. Manual testing on both platforms. |
| **High** (new features, backend deps) | 7 | Separate epics. Individual SRS per feature. |
| **Critical** (architectural impact) | 1 | Coupon linked card — needs full architecture review. |

---

## 5. FILES IMPACTED — PHASE 1 & 2 (IMMEDIATE)

| File | Phase 1 | Phase 2 | Change Type |
|------|---------|---------|-------------|
| `frontend/src/i18n/es.json` | 10 keys | — | Text updates |
| `frontend/src/i18n/en.json` | 10 keys | — | Text updates |
| `frontend/src/components/wallet/studio/tabs/StampTab.tsx` | 1 change | 1 change | max value, reorder |
| `frontend/src/components/wallet/studio/tabs/CashbackTab.tsx` | — | 1 change | Expiry redesign |
| `frontend/src/components/wallet/studio/ColorsTab.tsx` | — | 1 change | Add centralBg color |
| `frontend/src/components/wallet/studio/FieldCard.tsx` | — | 1 change | Radio toggles |
| `frontend/src/components/wallet/types/unified-state.ts` | — | 1 change | Add centralBg to WalletColors |
| `frontend/src/components/wallet/types/card-type-config.ts` | — | 1 change | Cashback expiry type |
| `frontend/src/components/wallet/DeviceFrame.tsx` | — | 1 change | Add Android frame |
| Wizard creation page | — | 1 change | Platform toggle |

---

## 6. WHAT NOT TO CHANGE (Expert Warnings)

1. **Do NOT restructure the Studio sidebar tabs.** The 7-tab layout (images/cardType/fields/back/barcode/colors/advanced) is well-architected. Adding a "Design" or "Config" split would break the entire state management flow.

2. **Do NOT change the `WalletPassStudioState` shape carelessly.** The undo/redo system (`useUndoRedo`), auto-save (`useAutoSave`), and session recovery all depend on the state shape. Any new fields must be additive, not restructuring.

3. **Do NOT remove existing image slots.** Other card types may depend on them. Add card-type-conditional visibility instead.

4. **Do NOT implement the crop editor without a library.** Building a custom crop editor from scratch would take 2+ weeks and be fragile. Use `react-image-crop` (MIT, 12KB gzipped, touch support).

5. **Do NOT implement "Plantilla tarjeta vinculada" (CPN-03) as a frontend-only feature.** It requires backend pass lifecycle management — post-redemption card issuance, pass replacement, and notification triggers.

6. **Do NOT auto-transfer images without dimension validation.** Apple and Google have different image size requirements. Auto-transfer is safe for same-ratio images but needs a warning for mismatches.

---

## 7. COMPETITIVE ANALYSIS NOTES

The requirements document references **Devotion Rewards** as the primary competitor. Key observations:

- Devotion's auto-transfer of images between Apple/Google is a UX win — implement in Phase 2.
- Their "linked card template" is a differentiator — but it's a product feature, not a UI fix.
- Their crop editor is polished — this justifies investing in `react-image-crop` for Phase 3.
- Their tier system for cashback is more mature — defer to Phase 5 as a dedicated epic.

---

## 8. TESTING STRATEGY

### Phase 1 (Text Changes)
- `cd frontend && npm run typecheck` — verify no broken keys
- `cd frontend && npm run test:unit` — existing tests pass
- `cd frontend && npm run build` — clean build

### Phase 2 (Component Changes)
- All Phase 1 checks
- Manual test: Obligatorio/Opcional toggle behavior on each card type
- Manual test: Platform toggle in creation wizard
- Manual test: Android frame renders correctly
- Manual test: Cashback expiry 3-option toggle

### Phase 3 (Images + Crop)
- All Phase 2 checks
- Manual test: Image upload for each card type shows correct slots
- Manual test: Crop editor opens, zoom/move/rotate work, result saves
- Manual test: Apple → Google image transfer with toast notification

### Phase 4 (Back-of-Pass)
- All Phase 2 checks
- Manual test: New structured fields appear in back-of-pass preview
- Manual test: Google Wallet info module shows equivalent data

---

## 9. IMPLEMENTATION ORDER — QUICK REFERENCE

```
PHASE 1 (Day 1)        → Ship text/i18n changes. Zero risk.
PHASE 2 (Days 2-4)     → Component changes. Low risk.
PHASE 3 (Days 5-11)    → Image slots + crop editor. Medium risk.
PHASE 4 (Days 12-15)   → Back-of-pass info. Medium risk.
PHASE 5 (Sprint 2+)    → Backend features. High risk. Separate epics.
```

---

## 10. SUMMARY TABLE — ALL 35 ITEMS

| # | ID | Description | Verdict | Phase | Risk |
|---|----|-------------|---------|-------|------|
| 1 | TXT-01 | Update heading text | ACCEPT | 1 | Trivial |
| 2 | TXT-02 | Update subtext | ACCEPT | 1 | Trivial |
| 3 | TXT-03 | Update 10 program descriptions | ACCEPT | 1 | Trivial |
| 4 | FRM-01 | Rename enrollment section | ACCEPT | 1 | Trivial |
| 5 | FRM-02 | Add enrollment subtext | ACCEPT | 1 | Trivial |
| 6 | FRM-03 | Rename Required/Unique labels | ACCEPT | 1 | Trivial |
| 7 | STP-02 | Max stamps 20→30 | ACCEPT | 1 | Trivial |
| 8 | FRM-04 | Obligatorio/Opcional radios | MODIFY | 2 | Low |
| 9 | STP-01 | Move stampsRequired to top | MODIFY | 2 | Low |
| 10 | TOG-01 | Apple/Google toggle in wizard | MODIFY | 2 | Low |
| 11 | TOG-02 | Android device frame | MODIFY | 2 | Medium |
| 12 | CPN-05 | Card naming convention | MODIFY | 2 | Low |
| 13 | CPD-04 | Central area bg color | MODIFY | 2 | Low |
| 14 | CBK-01 | Cashback expiry redesign | MODIFY | 2 | Low |
| 15 | CROP-02 | Show dimension requirements | ACCEPT | 2 | Trivial |
| 16 | IMG-04 | Auto-transfer Apple→Google images | MODIFY | 2 | Medium |
| 17 | CPD-03 | Text color picker | ACCEPT | 0 | None (exists) |
| 18 | CPN-01 | Live mockup updates | ACCEPT | 0 | None (exists) |
| 19 | CPN-02 | Sticky mockup | ACCEPT | 0 | None (exists) |
| 20 | IMG-03 | Generic icon library | ACCEPT | 0 | None (exists) |
| 21 | IMG-01 | Stamp-specific image slots | MODIFY | 3 | Medium |
| 22 | CPD-01 | Coupon 3 image types | MODIFY | 3 | Medium |
| 23 | CROP-01 | Full crop editor | DEFER | 3 | High |
| 24 | CROP-03 | Crop editor all zones | DEFER | 3 | High |
| 25 | INF-01 | Card info section | MODIFY | 4 | Medium |
| 26 | INF-02 | Config-time field selector | MODIFY | 4 | Medium |
| 27 | INF-03 | Google Wallet info module | MODIFY | 4 | Medium |
| 28 | CPD-05 | Push notification preview | DEFER | 4 | Medium |
| 29 | STP-03 | Location management + plan | DEFER | 5 | High |
| 30 | FRM-05 | Required field backend | DEFER | 5 | High |
| 31 | CBK-02 | Lifetime points | DEFER | 5 | High |
| 32 | CBK-03 | Happy Hours multiplier | DEFER | 5 | High |
| 33 | CBK-04 | Cashback tier system | DEFER | 5 | High |
| 34 | CPN-03 | Linked card template | DEFER | 5 | Critical |
| 35 | CPN-04 | Existing card selector | DEFER | 5 | Medium |
