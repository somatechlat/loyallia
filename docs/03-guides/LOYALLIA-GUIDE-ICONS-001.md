---
title: "Wallet Icon System Guide"
document_id: "LOYALLIA-GUIDE-ICONS-001"
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

# WALLET ICON SYSTEM GUIDE
## Loyallia — Stamp Motifs, Shapes, Renderer, Picker
**Document ID:** LOYALLIA-GUIDE-ICONS-001
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
| **Document ID** | LOYALLIA-GUIDE-ICONS-001 |
| **Title** | Wallet Icon System Guide |
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
| **Location** | `docs/03-guides/LOYALLIA-GUIDE-ICONS-001.md` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-09-30 | Engineering Lead | Initial release. Documents motif and shape inventories, `IconRenderer` resolution, `StampGridDecoration` layouts and palette roles, and `IconPicker` structure. |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Engineering Lead | Author / Owner | Maintains document |
| Product Owner | Approver | Business validation |
| Security Officer | Reviewer | Security requirements validation |
| QA Lead | Reviewer | Quality assurance validation |
| Frontend Engineer | Implementer | Primary consumer of the icon APIs |

### Related Documents

| Document ID | Title | Relationship |
|-------------|-------|-------------|
| LOYALLIA-RULES-001 | Loyallia Agent Rules And Coding Standards | Reference |
| LOYALLIA-AGENTS-001 | Loyallia Agent Instructions | Reference |
| LOYALLIA-GUIDE-DS-001 | Wallet Card Design System Guide | Sibling |
| LOYALLIA-GUIDE-TPL-001 | Wallet Card Templates Guide | Sibling |
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

Code roots:

| Path | Role |
|------|------|
| `frontend/src/components/wallet/icons/motifs.ts` | Stamp motif artwork (595 lines) |
| `frontend/src/components/wallet/icons/shapes.ts` | Stamp slot silhouettes (86 lines) |
| `frontend/src/components/wallet/icon-library.ts` | Icon registry and lookup (459 lines) |
| `frontend/src/components/wallet/IconRenderer.tsx` | ID-to-SVG renderer (135 lines) |
| `frontend/src/components/wallet/studio/IconPicker.tsx` | Studio picker modal (602 lines) |
| `frontend/src/components/wallet/preview-decorations.tsx` | `StampGridDecoration` and card decorations (635 lines) |

## 2. Motif set

`grep -c "id: '" icon-library.ts` returns **50**. Those 50 ids are the icon registry entries: 40 `motif-*` ids in `STAMP_MOTIF_ICONS` plus 10 `shape-*` ids in `STAMP_SHAPE_ICONS`. Both arrays are spread into `ICON_LIBRARY`.

Motif breakdown (40 entries):

| Group | Filled motifs | Empty/outline variants | Filled ids |
|-------|---------------|------------------------|------------|
| `food` | 6 | 4 | `motif-coffee`, `motif-croissant`, `motif-cocktail`, `motif-pizza`, `motif-burger`, `motif-ice-cream` |
| `retail` | 7 | 5 | `motif-shopping-bag`, `motif-gift`, `motif-tag`, `motif-crown`, `motif-star`, `motif-heart`, `motif-diamond` |
| `services` | 6 | 2 | `motif-scissors`, `motif-spray`, `motif-car`, `motif-barber`, `motif-paw`, `motif-leaf` |
| `loyalty` | 8 | 2 | `motif-check`, `motif-flame`, `motif-bolt`, `motif-medal`, `motif-rocket`, `motif-sparkle`, `motif-badge`, `motif-bell` |
| **Total** | **27** | **13** | |

Filled motifs are solid silhouettes. Empty variants are matched outline pairs: the same silhouette reduced to a consistent 2px outline for empty slots. 13 of the 27 filled motifs ship a dedicated empty variant. The remaining 14 fall back to the outline rendering path in `IconRenderer` (`outline: true` stroke painting of the same `svgPaths`).

Pairing is declared on the `IconDefinition`: `emptyId` on the filled entry, `filledId` on the empty entry. Example from `icon-library.ts`:

```ts
{ id: 'motif-coffee', name: 'Coffee Cup', category: 'stamp', group: 'food',
  svgPaths: motifArt('motif-coffee').filled, emptyId: 'motif-coffee-empty' },
{ id: 'motif-coffee-empty', name: 'Coffee Cup', category: 'stamp', group: 'food',
  outline: true, filledId: 'motif-coffee', svgPaths: motifArt('motif-coffee-empty').outline },
```

Motif art lives in `icons/motifs.ts` as `MotifArtwork`:

```ts
export interface MotifArtwork {
  filled: string[];   // solid silhouette path(s)
  outline: string[];  // matched outline path(s)
}
```

Every path is designed in a 24×24 viewBox and painted with `currentColor`. A motif inherits `palette.accent` (filled) or `palette.accentSoft` (empty) without any raw colour in the artwork file. The comment in `icon-library.ts` on `getStampIcons()` states the floor as follows: "Curated stamp motifs — filled + empty pairs, ≥24 silhouettes." The test `stamp-icon-system.test.ts` asserts `>= 24` filled motifs and `>= 12` empty variants. Current counts are 27 and 13.

## 3. Shape set

`icons/shapes.ts` defines `STAMP_SHAPE_IDS` and `STAMP_SHAPE_PATHS`. Count of `SHAPE_PATHS` keys: **10**.

| Id | Slot class (`getShapeClass`) | Silhouette (`SVG_SLOT_SHAPES`) |
|----|------------------------------|--------------------------------|
| `circle` | `rounded-full` | no |
| `square` | `rounded-sm` | no |
| `rounded` | `rounded-lg` | no |
| `heart` | `rounded-none` | yes |
| `star` | `rounded-none` | yes |
| `shield` | `rounded-none` | yes |
| `hexagon` | `rounded-none` | yes |
| `diamond` | `rounded-none` | yes |
| `ticket` | `rounded-lg` | yes |
| `flower` | `rounded-none` | yes |

Each shape is a single closed path in a 24×24 viewBox, optically balanced so a row of mixed shapes reads as one system. Paths are painted with `currentColor`, never raw hex. `SVG_SLOT_SHAPES` marks the seven shapes that read as a true silhouette slot rather than a bordered box. `preview-decorations.tsx` re-exports the same 10 keys as `SHAPE_PATHS`, filled from `STAMP_SHAPE_PATHS`.

## 4. `icon-library.ts`

`IconDefinition` fields: `id`, `name`, `category`, optional `lucideName`, `svgPath`, `svgPaths`, `outline`, `group`, `emptyId`, `filledId`.

Categories: `food`, `retail`, `transport`, `health`, `finance`, `social`, `nature`, `technology`, `stamp`, `badge`, `decorative`. Motif groups: `food`, `retail`, `services`, `loyalty`.

Lookup helpers: `getIconsByCategory`, `getIconById`, `searchIcons`, `getStampIcons`, `getStampEmptyIcons`, `getStampShapes`, `getStampMotifGroups`, `getStampIconsByGroup`, `getBadgeIcons`, `getMotifArt`, `getMotifMeta`. `searchIcons` matches name, id and category against a lowercased query.

## 5. `IconRenderer`

`frontend/src/components/wallet/IconRenderer.tsx` turns a symbolic id into SVG or an image. It must never render an empty box.

Resolution order in `IconRenderer`:

1. **Image URL / data URI.** If `iconId` starts with `http`, `/`, or `data:`, render `<img src={iconId} />`.
2. **Library motif.** `icon.svgPaths` (multi-path `MotifSvg`, `fill: currentColor` when filled, `stroke: currentColor` at 1.75 when `outline`).
3. **Lucide map.** `icon.lucideName` through `getLucideIcon()` from `lucide-icon-map`. Stroke width 2 filled, 1.75 outline.
4. **Stroke path.** `icon.svgPath` as a single stroked `<path>` at 2px.
5. **Fallback circle.** `FALLBACK_PATH` (`M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z`) painted as an outline. Used when `iconId` is missing, unknown, or the definition has none of the three paint sources.

`renderDefinition` applies steps 2–5. `outline` on the component overrides `icon.outline`. Covered by `__tests__/icon-renderer.test.tsx` and `__tests__/stamp-icon-system.test.ts`.

## 6. `StampGridDecoration`

In `preview-decorations.tsx`. Props: `current`, `total`, `color`, `stampShape`, `stampColor`, `stampIcon`, `stampFilledIcon`, `stampGridLayout`, `cardType`.

### Layouts

`StampGridLayout` is one of seven values:

| Layout | Cols | Rows | Capacity |
|--------|------|------|----------|
| `5x2` | 5 | 2 | 10 |
| `3x3` | 3 | 3 | 9 |
| `10x1` | 10 | 1 | 10 |
| `4x2` | 4 | 2 | 8 |
| `6x2` | 6 | 2 | 12 |
| `4x4` | 4 | 4 | 16 |
| `dynamic` | `min(max(total,1),10)` | `ceil(total/cols)` | `total` |

`getStampSlotCount(layout, total)` returns the grid capacity capped by `total`. For `dynamic` it returns `total`. `filledCount` is `current` clamped to `[0, slotCount]`.

### Palette roles

```ts
const palette = getCardPalette(cardType);   // default cardType 'stamp'
const filledColor = stampColor || palette.accent;
const emptyColor = palette.accentSoft;
```

Filled slots use `palette.accent`. Empty slots use `palette.accentSoft`. `stampColor` is the user override and wins over the design-system accent; `color` is the legacy prop and is not used for slot fill. The same rule drives `TemplateMiniPreview` progress dots.

The grid renders `data-testid="stamp-grid-decoration"` with `data-layout` and `data-slot-count`. Each slot is `data-testid="stamp-slot"`. Covered by `__tests__/stamp-grid-decoration.test.tsx`.

## 7. `IconPicker`

`frontend/src/components/wallet/studio/IconPicker.tsx`. Props: `value`, `onChange`, optional `category`, `allowUpload`, `cardType` (default `'stamp'`, used for the live preview accent via `getCardPalette`).

Structure:

- **Tabs.** `role="tablist"` with two tabs: **Formas** (`shapes`, `wallet.studio.iconPicker.tabShapes`, `data-testid="icon-picker-tab-shapes"`) and **Iconos** (`motifs`, `wallet.studio.iconPicker.tabIcons`, `data-testid="icon-picker-tab-icons"`). `aria-selected` tracks the active tab.
- **Live filled + empty preview.** `StampPairPreview` renders two 8×8 wells. Filled well paints `accent` with the icon in the surface colour (`data-testid="icon-picker-preview-filled"`). Empty well paints `accentSoft` with the icon outlined in `accent` (`data-testid="icon-picker-preview-empty"`). The pair is `role="img"` with `aria-label` from `t('wallet.studio.iconPicker.previewLabel')`.
- **Search.** Input with placeholder and `aria-label` from `t('wallet.studio.iconPicker.search')`, `data-testid="icon-picker-search"`. Filtering goes through `searchIcons()` on the motif tab.
- **Category and group filters.** `CATEGORY_LABELS` maps every `IconCategory` plus `all` to an i18n key. Motif groups (`food`, `retail`, `services`, `loyalty`) filter the Iconos tab.
- **Keyboard navigation.** `handleGridKeyDown` on the grid (`aria-label` from `t('wallet.studio.iconPicker.gridLabel')`): `ArrowRight`, `ArrowLeft`, `ArrowDown`, `ArrowUp`, `Home`, `End`.
- **Accessibility.** Dialog title `t('wallet.studio.iconPicker.title')`, close button `t('common.close')`, per-icon `aria-label` from `t('wallet.studio.iconPicker.selectIconNamed', {...})`, focus trap via `useFocusTrap`. Every user-facing string goes through `t()`.

Palette, type scale (`CARD_TYPE_SCALE`), radius and shadow inside the picker come from the wallet design system.

## 8. Verification commands

```bash
cd frontend && npx vitest run src/components/wallet/__tests__/stamp-icon-system.test.ts
cd frontend && npx vitest run src/components/wallet/__tests__/icon-renderer.test.tsx
cd frontend && npx vitest run src/components/wallet/__tests__/stamp-grid-decoration.test.tsx
cd frontend && npx vitest run src/components/wallet/__tests__/IconPicker.test.tsx
cd frontend && npm run typecheck
```

### Inventory re-check

Re-run these when the icon set changes and update this document's counts:

```bash
grep -c "id: '" frontend/src/components/wallet/icon-library.ts
python3 -c "import re;s=open('frontend/src/components/wallet/icons/shapes.ts').read();m=re.search(r'STAMP_SHAPE_PATHS[^{]*\\{(.*?)\\n\\}',s,re.S);print(len(re.findall(r'^\\s+(\\w+):',m.group(1),re.M)))"
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
| Draft | 2026-09-30 | Engineering Lead | Initial draft of wallet icon system documentation |
| Approved | 2026-09-30 | Engineering Lead | Document approved for use |

### Next Review Date

| Trigger | Date | Notes |
|---------|------|-------|
| Annual review | 2026-12-31 | End of year review cycle |
| Major release | — | Triggered by major platform release |
