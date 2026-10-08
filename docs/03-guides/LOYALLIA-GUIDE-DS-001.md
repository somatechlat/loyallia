---
title: "Wallet Card Design System Guide"
document_id: "LOYALLIA-GUIDE-DS-001"
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

# WALLET CARD DESIGN SYSTEM GUIDE
## Loyallia — Frontend Wallet Design Tokens
**Document ID:** LOYALLIA-GUIDE-DS-001
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
| **Document ID** | LOYALLIA-GUIDE-DS-001 |
| **Title** | Wallet Card Design System Guide |
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
| **Location** | `docs/03-guides/LOYALLIA-GUIDE-DS-001.md` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-09-30 | Engineering Lead | Initial release. Documents `frontend/src/components/wallet/design-system.ts`, card palettes, type scale, opacity floor, chrome tokens, `progressSlots()`, and the brand-mark exception. |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Engineering Lead | Author / Owner | Maintains document |
| Product Owner | Approver | Business validation |
| Security Officer | Reviewer | Security requirements validation |
| QA Lead | Reviewer | Quality assurance validation |
| Frontend Engineer | Implementer | Primary consumer of design tokens |

### Related Documents

| Document ID | Title | Relationship |
|-------------|-------|-------------|
| LOYALLIA-RULES-001 | Loyallia Agent Rules And Coding Standards | Reference |
| LOYALLIA-AGENTS-001 | Loyallia Agent Instructions | Reference |
| LOYALLIA-GUIDE-TPL-001 | Wallet Card Templates Guide | Sibling |
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

## 1. Purpose

`frontend/src/components/wallet/design-system.ts` is the single source of truth for how a loyalty card looks on Apple Wallet and Google Wallet. The file is 251 lines. Every preview component must import from it. Raw hex on a card, sub-11px type, and low-opacity text are banned.

The file exists because earlier previews used ad-hoc hex, `text-[8px]`, `opacity-30`, and `max-w-[52px]`. Those choices made cards unreadable at the rendered card width. The design system turns the style rules into named tokens so a test can enforce them.

Enforcement lives in `frontend/src/components/wallet/__tests__/design-system.rules.test.ts`. That test reads the source of `AppleWalletPreview.tsx` and `programs/WalletPreviewContent.tsx` and asserts:

- no `text-[(8|9|10)px]`
- no `opacity-(30|40|50)`
- no `max-w-[52px]`
- both files import `getCardPalette` and `CARD_TYPE_SCALE` from `@/components/wallet/design-system`
- `AppleWalletPreview.tsx` also imports `CARD_CHROME`, `CARD_RADIUS`, `CARD_SHADOW`
- stamp glyphs come from `@/components/ui/StampIcons` (no block characters `█░`)

## 2. Card types

`CardTypeKey` covers all 10 program types:

`stamp`, `cashback`, `coupon`, `vip_membership`, `gift_certificate`, `discount`, `affiliate`, `corporate_discount`, `referral_pass`, `multipass`.

## 3. Palettes

`CardPalette` has seven fields:

| Field | Role |
|-------|------|
| `gradient` | CSS `background-image` for the card face |
| `base` | Solid colour painted under the gradient |
| `accent` | Progress, stamps, call-outs |
| `accentSoft` | Accent at low alpha, for chips and wells |
| `text` | Text on the card face |
| `textMuted` | Secondary text. Never below 0.72 effective contrast |
| `glass` | Glass overlay on the header strip |

`CARD_PALETTES` holds one palette per card type. Values from `design-system.ts`:

| Card type | gradient | base | accent | accentSoft | text | textMuted |
|-----------|----------|------|--------|------------|------|-----------|
| `stamp` | `linear-gradient(135deg, #F59E0B 0%, #F43F5E 100%)` | `#B45309` | `#FBBF24` | `rgba(251, 191, 36, 0.22)` | `#FFFBEB` | `rgba(255, 251, 235, 0.82)` |
| `cashback` | `linear-gradient(135deg, #10B981 0%, #0D9488 100%)` | `#047857` | `#34D399` | `rgba(52, 211, 153, 0.22)` | `#ECFDF5` | `rgba(236, 253, 245, 0.82)` |
| `coupon` | `linear-gradient(135deg, #D946EF 0%, #F97316 100%)` | `#A21CAF` | `#F0ABFC` | `rgba(240, 171, 252, 0.24)` | `#FDF4FF` | `rgba(253, 244, 255, 0.82)` |
| `vip_membership` | `linear-gradient(135deg, #8B5CF6 0%, #4F46E5 100%)` | `#5B21B6` | `#C4B5FD` | `rgba(196, 181, 253, 0.24)` | `#F5F3FF` | `rgba(245, 243, 255, 0.82)` |
| `gift_certificate` | `linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%)` | `#0369A1` | `#7DD3FC` | `rgba(125, 211, 252, 0.24)` | `#F0F9FF` | `rgba(240, 249, 255, 0.82)` |
| `discount` | `linear-gradient(135deg, #84CC16 0%, #10B981 100%)` | `#4D7C0F` | `#BEF264` | `rgba(190, 242, 100, 0.22)` | `#F7FEE7` | `rgba(247, 254, 231, 0.82)` |
| `affiliate` | `linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)` | `#1D4ED8` | `#93C5FD` | `rgba(147, 197, 253, 0.24)` | `#EFF6FF` | `rgba(239, 246, 255, 0.82)` |
| `corporate_discount` | `linear-gradient(135deg, #475569 0%, #1E293B 100%)` | `#0F172A` | `#94A3B8` | `rgba(148, 163, 184, 0.24)` | `#F1F5F9` | `rgba(241, 245, 249, 0.82)` |
| `referral_pass` | `linear-gradient(135deg, #EC4899 0%, #F43F5E 100%)` | `#BE185D` | `#F9A8D4` | `rgba(249, 168, 212, 0.24)` | `#FDF2F8` | `rgba(253, 242, 248, 0.82)` |
| `multipass` | `linear-gradient(135deg, #F97316 0%, #EAB308 100%)` | `#C2410C` | `#FDBA74` | `rgba(253, 186, 116, 0.24)` | `#FFF7ED` | `rgba(255, 247, 237, 0.82)` |

`glass` is `rgba(255, 255, 255, 0.14)` for nine types. `corporate_discount` uses `rgba(255, 255, 255, 0.12)`.

### `getCardPalette()`

```ts
export function getCardPalette(cardType: string | undefined): CardPalette {
  const key = (cardType ?? '') as CardTypeKey;
  return CARD_PALETTES[key] ?? CARD_PALETTES.stamp;
}
```

An unknown `cardType` falls back to the stamp palette. A bad value can never render as a blank card. `CARD_PALETTES_ALL` re-exports the record for tests and template tooling.

## 4. Type scale

`CARD_TYPE_SCALE` exposes five Tailwind size classes. Sizes are 11 / 13 / 15 / 20 / 28 px.

| Token | Class | Size | Use |
|-------|-------|------|-----|
| `xs` | `text-[11px]` | 11px | Overlines, field labels, timestamps |
| `sm` | `text-[13px]` | 13px | Field values, secondary copy |
| `md` | `text-[15px]` | 15px | Body, program name |
| `lg` | `text-[20px]` | 20px | Card title, secondary hero |
| `xl` | `text-[28px]` | 28px | Primary hero value (balance, `3/5`, `15%`) |

Floor rule: nothing below 11px on a card. `MIN_CARD_FONT_PX = 11`. The rules test asserts every font-size class in the two preview sources comes from `CARD_TYPE_SCALE`, and that `MIN_CARD_FONT_PX` equals 11.

## 5. Opacity floor

```ts
export const MIN_TEXT_OPACITY = 72;
```

Text never sits at 30–50% opacity on a gradient. 72 is the floor. `textMuted` in every palette is already at 0.82 alpha. The rules test bans `opacity-(30|40|50)` in the preview sources.

## 6. Layout, radius, shadow, chrome

### `CARD_SPACE`

4px base rhythm: `xs` = `gap-1`, `sm` = `gap-2`, `md` = `gap-3`, `lg` = `gap-4`, `page` = `p-4`.

### `CARD_RADIUS`

| Token | Class | Use |
|-------|-------|-----|
| `apple` | `rounded-[18px]` | Apple PassKit card corner |
| `google` | `rounded-[28px]` | Google Wallet pass corner |
| `chip` | `rounded-lg` | Chips and wells |
| `plate` | `rounded-2xl` | Plates |

### `CARD_SHADOW`

| Token | Class |
|-------|-------|
| `card` | `shadow-[0_10px_30px_-12px_rgba(0,0,0,0.45)]` |
| `lift` | `shadow-[0_18px_44px_-16px_rgba(0,0,0,0.55)]` |

### `CARD_CHROME`

| Token | Class | Use |
|-------|-------|-----|
| `headerGlass` | `backdrop-blur-xl bg-white/[0.14] border-b border-white/15` | Frosted header strip over the gradient |
| `gloss` | `bg-gradient-to-b from-white/20 to-transparent` | Gloss sweep across the top of the card |
| `logoRing` | `ring-2 ring-white/25` | Ring around logo plates |
| `barcodePlate` | `bg-white rounded-xl px-3 py-2 shadow-inner` | White plate so scanners read the barcode |

### `DEVICE_CHROME`

Device chrome is the phone frame the card is previewed inside: bezel, buttons, camera. It is not card styling, but it is still a design token so no component carries raw hex.

| Token | Value | Token | Value |
|-------|-------|-------|-------|
| `iphoneBody` | `#151515` | `androidBody` | `#1b1b1b` |
| `iphoneBezel` | `#2d2d2d` | `androidBezel` | `#2a2a2a` |
| `iphoneSideButton` | `#3a3a3a` | `androidSideButton` | `#3a3a3a` |
| `iphoneCameraRing` | `#1a1a1a` | `androidScreen` | `#121212` |
| `iphoneCameraDot` | `#0a0a0a` | | |
| `iphoneScreen` | `#000000` | | |

### `DEFAULT_CARD_BACKGROUND`

```ts
export const DEFAULT_CARD_BACKGROUND = '#1a1a2e';
```

Used when a program has not chosen a background. The same value is the fallback in `templates/gallery-api.ts` (`FALLBACK_COLORS.background`).

## 7. Progress slots

```ts
export const PROGRESS_SLOT = { filled: 'filled', empty: 'empty' } as const;

export function progressSlots(
  filled: number,
  total: number,
): Array<'filled' | 'empty'> {
  const safeTotal = Math.max(0, Math.floor(total));
  const safeFilled = Math.min(Math.max(0, Math.floor(filled)), safeTotal);
  return [
    ...Array.from({ length: safeFilled }, () => 'filled' as const),
    ...Array.from({ length: safeTotal - safeFilled }, () => 'empty' as const),
  ];
}
```

`progressSlots()` clamps both arguments. Negative or fractional input cannot produce a negative-length array or a `filled` count above `total`. The result is always `filled` slots first, then `empty`. Stamp and progress glyphs are rendered by `ui/StampIcons`, not by characters.

## 8. Brand-mark exception

The only permitted literal colours anywhere in the wallet preview stack are official brand marks. The Google logo keeps its real colours (`#EA4335`, `#4285F4`, `#FBBC05`, `#34A853`) and is never recoloured to match a card palette. Those four hex values appear inline in `studio/StudioToolbar.tsx`, `studio/NotificationConfigPanel.tsx`, `studio/BackDesignTab.tsx`, and `studio/AdvancedTab.tsx` as the Google "G" path fills. This is artwork, not a design token. Every other colour on a card must come from `design-system.ts`.

## 9. Import contract

Preview and studio components must import palettes, type scale, radius, shadow and chrome from `@/components/wallet/design-system`. Do not re-declare a hex value that already exists as a token. If a new colour is required, add a token here first, then consume it.

## 10. Verification commands

```bash
cd frontend && npx vitest run src/components/wallet/__tests__/design-system.rules.test.ts
cd frontend && npx vitest run src/components/wallet/__tests__/contrast.test.ts
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
| Draft | 2026-09-30 | Engineering Lead | Initial draft of wallet design system documentation |
| Approved | 2026-09-30 | Engineering Lead | Document approved for use |

### Next Review Date

| Trigger | Date | Notes |
|---------|------|-------|
| Annual review | 2026-12-31 | End of year review cycle |
| Major release | — | Triggered by major platform release |
