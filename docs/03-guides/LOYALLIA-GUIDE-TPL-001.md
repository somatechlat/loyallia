---
title: "Wallet Card Templates Guide"
document_id: "LOYALLIA-GUIDE-TPL-001"
version: "1.0"
status: "draft"
last_updated: "2026-09-30"
author: "Engineering Lead"
owner: "Engineering Lead"
approver: "Product Owner"
classification: "Internal Use"
confidentiality: "Internal — Restricted to Engineering and Product teams"
review_cycle: "Upon each major release, or annually (whichever comes first)"
standard: "ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011"
parent_document: "N/A"
---

# WALLET CARD TEMPLATES GUIDE
## Loyallia — System Presets, Registry, Gallery
**Document ID:** LOYALLIA-GUIDE-TPL-001
**Version:** 1.0
**Status:** draft
**Date:** 2026-09-30
**Last Updated:** 2026-09-30
**Author:** Engineering Lead
**Owner:** Engineering Lead
**Approver:** Product Owner
**Classification:** Internal Use
**Confidentiality:** Internal — Restricted to Engineering and Product teams
**Review Cycle:** Upon each major release, or annually (whichever comes first)
**Standard:** ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011
**Parent Document:** N/A

---

## DOCUMENT CONTROL

| Field | Details |
|-------|---------|
| **Document ID** | LOYALLIA-GUIDE-TPL-001 |
| **Title** | Wallet Card Templates Guide |
| **Version** | 1.0 |
| **Date** | 2026-09-30 |
| **Author** | Engineering Lead |
| **Approver** | Product Owner |
| **Owner** | Engineering Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and Product teams |
| **Review Cycle** | Upon each major release, or annually (whichever comes first) |
| **Status** | draft |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011 |
| **Parent Document** | N/A |
| **Supersedes** | N/A |
| **Language** | English |
| **Format** | Markdown (.md) |
| **Location** | `docs/03-guides/LOYALLIA-GUIDE-TPL-001.md` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-09-30 | Engineering Lead | Initial release. Documents the 31 system presets, `WalletTemplate` shape, registry, gallery components, and the field-application rule. |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Engineering Lead | Author / Owner | Maintains document |
| Product Owner | Approver | Business validation |
| Security Officer | Reviewer | Security requirements validation |
| QA Lead | Reviewer | Quality assurance validation |
| Frontend Engineer | Implementer | Primary consumer of template APIs |

### Related Documents

| Document ID | Title | Relationship |
|-------------|-------|-------------|
| LOYALLIA-RULES-001 | Loyallia Agent Rules And Coding Standards | Reference |
| LOYALLIA-AGENTS-001 | Loyallia Agent Instructions | Reference |
| LOYALLIA-GUIDE-DS-001 | Wallet Card Design System Guide | Sibling |
| LOYALLIA-GUIDE-ICONS-001 | Wallet Icon System Guide | Sibling |
| LOYALLIA-DOC-ARCHITECTURE.MD | Loyallia Architecture, Sequence & Flowchart Diagrams | Reference |

### Change Control Process

1. All changes to this document MUST be recorded in the Revision History table above.
2. Status transitions: `draft` → `review` → `approved` → `active` → `deprecated` → `archived`.
3. Changes after `approved` status require a new version number and re-approval.
4. Minor corrections (typos, formatting) increment the minor version (e.g., 1.0 → 1.1).
5. Major changes (new requirements, scope changes) increment the major version (e.g., 1.0 → 2.0).
6. Deprecated documents MUST be moved to `docs/09-archive/` with a deprecation notice.
7. All dates in this document use ISO 8601 format (`YYYY-MM-DD`).

---

## 1. Scope

This guide covers the system template library for the Wallet Pass Studio: the preset files, the registry, the `WalletTemplate` type, the palette and field factories, the API mapper, and the three gallery UI components.

Code roots:

- `frontend/src/components/wallet/templates/`
- `frontend/src/components/wallet/types/templates.ts`
- `frontend/src/components/wallet/studio/TemplateGallery.tsx`
- `frontend/src/components/wallet/studio/TemplateCard.tsx`
- `frontend/src/components/wallet/studio/TemplatePreviewModal.tsx`

## 2. `WalletTemplate`

Defined in `frontend/src/components/wallet/types/templates.ts` (44 lines).

```ts
export interface WalletTemplate {
  id: string;
  name: string;
  description: string;
  type: TemplateType;            // 'system' | 'user' | 'ai'
  cardType: CardType;
  industry: Industry;
  paletteKey: CardTypeKey;
  colors: WalletColors;
  fields: UnifiedField[];
  cardTypeConfig: CardTypeConfig;
  barcode: BarcodeConfig;
  backContent: BackContent;
  apple: Pick<AppleSpecificConfig, 'passStyle' | 'description' | 'organizationName'>;
  google: Pick<GoogleSpecificConfig, 'passType' | 'programName' | 'hexBackgroundColor'>;
  previewUrl?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
```

`paletteKey` is the design-system palette used for the live template preview. It lets the same `cardType` ship distinct art directions without inventing hex. `fields` holds the curated display fields (labels and values) rendered on the mini preview.

## 3. Preset files

| File | Exports | Line count |
|------|---------|------------|
| `templates/presets-stamp.ts` | `STAMP_PRESETS` | 218 |
| `templates/presets-loyalty.ts` | `CASHBACK_PRESETS`, `COUPON_PRESETS` | 302 |
| `templates/presets-membership.ts` | `VIP_PRESETS`, `GIFT_PRESETS` | 294 |
| `templates/presets-growth.ts` | `DISCOUNT_PRESETS`, `AFFILIATE_PRESETS` | 291 |
| `templates/presets-advanced.ts` | `CORPORATE_PRESETS`, `REFERRAL_PRESETS`, `MULTIPASS_PRESETS` | 425 |
| `templates/registry.ts` | `SYSTEM_TEMPLATES`, `CARD_TYPE_ORDER`, category and filter option tables | 91 |
| `templates/palette-utils.ts` | `colorsFromPalette`, `accentFromPalette`, `baseFromPalette`, `makeField`, `makeBackContent`, `makeBarcode`, `buildSystemTemplate` | 197 |
| `templates/gallery-api.ts` | `ApiTemplate`, `apiToWalletTemplate` | 56 |

Every colour on a preset comes from `design-system.ts` via `palette-utils.ts`. Presets never invent hex. Field and back-content helpers keep Spanish display copy consistent across the gallery.

`gallery-api.ts` maps a backend `ApiTemplate` (snake_case, `design_state`) onto `WalletTemplate`. If `design_state` is missing it falls back to `FALLBACK_COLORS` (background `#1a1a2e`) and empty structures. Tags containing `ai-generated` set `type: 'ai'`; otherwise `type: 'user'`.

## 4. The 31 presets

Verified count: 31 `buildSystemTemplate({...})` calls across the five preset files. Distribution by `cardType`:

| Card type | Count | File |
|-----------|-------|------|
| `stamp` | 4 | `presets-stamp.ts` |
| `cashback` | 3 | `presets-loyalty.ts` |
| `coupon` | 3 | `presets-loyalty.ts` |
| `vip_membership` | 3 | `presets-membership.ts` |
| `gift_certificate` | 3 | `presets-membership.ts` |
| `discount` | 3 | `presets-growth.ts` |
| `affiliate` | 3 | `presets-growth.ts` |
| `corporate_discount` | 3 | `presets-advanced.ts` |
| `referral_pass` | 3 | `presets-advanced.ts` |
| `multipass` | 3 | `presets-advanced.ts` |
| **Total** | **31** | |

Note: the comment block at the top of `templates/registry.ts` says "32 built-in presets". The array contents total 31. The comment is stale.

### 4.1 Stamp (4)

| Name | id | `paletteKey` | Industry |
|------|----|--------------|----------|
| Café Artesanal | `stamp-cafe-artesanal` | `stamp` | food |
| Lavado Premium | `stamp-lavado-premium` | `gift_certificate` | services |
| Fidelidad Minimal | `stamp-fidelidad-minimal` | `corporate_discount` | retail |
| Panadería Sol | `stamp-panaderia-sol` | `referral_pass` | food |

### 4.2 Cashback (3)

| Name | id | `paletteKey` | Industry |
|------|----|--------------|----------|
| Verde Mercado | `cashback-verde-mercado` | `cashback` | food |
| Tech Rewards | `cashback-tech-rewards` | `affiliate` | technology |
| Spa Cashback | `cashback-spa-wellness` | `vip_membership` | health |

### 4.3 Coupon (3)

| Name | id | `paletteKey` | Industry |
|------|----|--------------|----------|
| Brunch 2×1 | `coupon-brunch-2x1` | `coupon` | food |
| Outlet Flash | `coupon-outlet-flash` | `discount` | retail |
| Cine Noche | `coupon-cine-noche` | `multipass` | entertainment |

### 4.4 VIP membership (3)

| Name | id | `paletteKey` | Industry |
|------|----|--------------|----------|
| Club Dorado | `vip-club-dorado` | `vip_membership` | services |
| Platinum Circle | `vip-platinum-circle` | `corporate_discount` | services |
| Wellness Black | `vip-wellness-black` | `corporate_discount` | health |

### 4.5 Gift certificate (3)

| Name | id | `paletteKey` | Industry |
|------|----|--------------|----------|
| Regalo Celeste | `gift-regalo-celeste` | `gift_certificate` | retail |
| Tarjeta Rosa | `gift-tarjeta-rosa` | `referral_pass` | retail |
| Vale Esmeralda | `gift-vale-esmeralda` | `cashback` | services |

### 4.6 Discount (3)

| Name | id | `paletteKey` | Industry |
|------|----|--------------|----------|
| Escalera Retail | `discount-escalera-retail` | `discount` | retail |
| Farmacia Ahorro | `discount-farmacia-ahorro` | `cashback` | health |
| Moda Joven | `discount-moda-joven` | `referral_pass` | retail |

### 4.7 Affiliate (3)

| Name | id | `paletteKey` | Industry |
|------|----|--------------|----------|
| Embajador Azul | `affiliate-embajador-azul` | `affiliate` | services |
| Partner Pro | `affiliate-partner-pro` | `vip_membership` | technology |
| Influencer Gold | `affiliate-influencer-gold` | `multipass` | entertainment |

### 4.8 Corporate discount (3)

| Name | id | `paletteKey` | Industry |
|------|----|--------------|----------|
| Corp Slate | `corp-corp-slate` | `corporate_discount` | services |
| Enterprise Navy | `corp-enterprise-navy` | `affiliate` | technology |
| Office Mono | `corp-office-mono` | `corporate_discount` | services |

### 4.9 Referral pass (3)

| Name | id | `paletteKey` | Industry |
|------|----|--------------|----------|
| Refiere y Gana | `referral-refiere-y-gana` | `referral_pass` | services |
| Amigo Amigo | `referral-amigo-amigo` | `coupon` | entertainment |
| Comparte Premium | `referral-comparte-premium` | `multipass` | technology |

### 4.10 Multipass (3)

| Name | id | `paletteKey` | Industry |
|------|----|--------------|----------|
| Bono 10 Visitas | `multipass-bono-10-visitas` | `multipass` | services |
| Carné Multiservicio | `multipass-carne-multiservicio` | `gift_certificate` | retail |
| Pass Anual | `multipass-pass-anual` | `vip_membership` | entertainment |

### 4.11 Coverage rule

Every card type has at least 3 presets. Stamp has 4. Art direction within a card type is distinct: at least two different `paletteKey` values among the presets of a type, and every preset `name` is unique. Enforced by `frontend/src/components/wallet/__tests__/template-presets.test.ts`:

- `covers all 10 card types`. Each `CARD_TYPE_ORDER` entry has `>= 3` presets
- `ships at least 30 presets in total`
- `art direction is distinct within each card type`. `paletteKeys.size >= 2` and unique names
- every preset has a valid `paletteKey`, `>= 2` fields with Spanish labels, colours derived from its palette, back content with rules/terms and a link, barcode config, and Apple/Google metadata

Observed distinct `paletteKey` counts: stamp 4; cashback, coupon, gift_certificate, discount, affiliate, referral_pass, multipass 3 each; vip_membership and corporate_discount 2 each.

## 5. Registry

`templates/registry.ts` concatenates the ten export arrays into `SYSTEM_TEMPLATES: WalletTemplate[]`. `CARD_TYPE_ORDER` lists the 10 card types in gallery chip order. `TEMPLATE_CATEGORIES` is `Todos` plus one chip per card type. `INDUSTRY_FILTER_OPTIONS` and `CARD_TYPE_FILTER_OPTIONS` drive the dropdown filters; every label is an i18n key.

## 6. Gallery components

### `TemplateGallery` at `studio/TemplateGallery.tsx` (639 lines)

Modal gallery. Tabs for `system` / `user` / `ai`. Text search across name, description and tags. Industry dropdown and card-type dropdown. Category chips (`role="tablist"`, one chip per card type plus `all`). Responsive card grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`. Keyboard navigation across `button[data-template-card-btn]` via `handleGridKeyDown`. Rename, duplicate, delete and favourite actions for user and AI templates. All chrome labels go through `t()`.

### `TemplateCard` at `studio/TemplateCard.tsx` (349 lines)

Renders a live mini pass preview. `TemplateMiniPreview` builds it from `getCardPalette(template.paletteKey ?? template.cardType)`: gradient background, text and textMuted colours, progress slots using `palette.accent` (filled) and `palette.accentSoft` (empty), and an accent bar. The selected card rings with `palette.accent` and `CARD_SHADOW.lift`-equivalent depth. Option buttons are labelled through `t('wallet.studio.templateCard.options')`.

### `TemplatePreviewModal` at `studio/TemplatePreviewModal.tsx` (570 lines)

Full WYSIWYG preview. Pixel-accurate design-system card at iPhone scale with an Apple/Google variant toggle (`data-testid="preview-platform-toggle"`, `aria-pressed` per variant). Apple uses `AppleWalletCard` and the PassKit store-card corner (`CARD_RADIUS.apple`, 18px). Google uses `GoogleWalletCard` and the taller Wallet sheet corner (`CARD_RADIUS.google`, 28px). Fields are mapped through `mapFieldsToApple` / `mapFieldsToGoogle`. A secondary device-frame mode shows the card inside `DeviceFrame`.

## 7. Field-application rule

`WalletStudio.handleSelectTemplate` (in `frontend/src/components/wallet/studio/WalletStudio.tsx`) must copy `template.fields` onto the studio state:

```ts
// Preset fields carry the curated copy (SELLOS, RECOMPENSA, …).
// Without this the template applies its colours but leaves the
// previous card's fields on the canvas.
fields: (template.fields ?? prev.fields) as WalletPassStudioState['fields'],
```

The callback also copies `name`, `cardType`, `industry`, `colors`, `cardTypeConfig`, `barcode`, `backContent`, and merges `apple` and `google` over the previous values. It sets `ui.appliedTemplateId` and `ui.isModified`. If `displayState.ui.isModified` it asks for confirmation first.

A template change that updates colours but not fields is a bug. When adding a new template-owned property, extend this setter.

## 8. Verification commands

```bash
cd frontend && npx vitest run src/components/wallet/__tests__/template-presets.test.ts
cd frontend && npx vitest run src/components/wallet/__tests__/template-gallery-design.test.tsx
cd frontend && npx vitest run src/components/wallet/__tests__/template-cards.test.tsx
cd frontend && npx vitest run src/components/wallet/__tests__/TemplateGallery.test.tsx
cd frontend && npm run typecheck
```

---

## DOCUMENT APPROVAL

| Role | Name | Signature | Date | Decision |
|------|------|-----------|------|----------|
| Engineering Lead | — | — | 2026-09-30 | Approved |
| Product Owner | — | — | 2026-09-30 | Approved |
| Security Officer | — | — | — | Pending Review |

### Document Lifecycle

| State | Date | Actor | Notes |
|-------|------|-------|-------|
| Draft | 2026-09-30 | Engineering Lead | Initial draft of wallet card templates documentation |
| Approved | 2026-09-30 | Engineering Lead | Document approved for use |

### Next Review Date

| Trigger | Date | Notes |
|---------|------|-------|
| Annual review | 2026-12-31 | End of year review cycle |
| Major release | — | Triggered by major platform release |
