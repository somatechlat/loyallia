---
title: "UI Fix Plan — Match SRS-003 Exactly"
document_id: "LOYALLIA-DOC-UI-FIX-PLAN.MD"
version: "1.0"
status: "approved"
last_updated: "2026-09-16"
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
| **Document ID** | LOYALLIA-DOC-UI-FIX-PLAN.MD |
| **Title** | UI Fix Plan — Match SRS-003 Exactly |
| **Version** | 1.0 |
| **Date** | 2026-09-16 |
| **Author** | Engineering Lead |
| **Approver** | Product Owner |
| **Owner** | Engineering Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and Product teams |
| **Review Cycle** | Upon each major release, or annually (whichever comes first) |
| **Status** | approved |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011|
| **Parent Document** | N/A |
| **Supersedes** | N/A |
| **Language** | English |
| **Format** | Markdown (.md) |
| **Location** | `docs/06-planning/wallet-studio/UI-FIX-PLAN.md` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-09-16 | Engineering Lead | Added ISO-compliant document controls |

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
| LOYALLIA-AGENTS-001 | Loyallia Agent Instructions | Reference |
| LOYALLIA-DOC-ARCHITECTURE.MD | Loyallia Architecture, Sequence & Flowchart Diagrams | Reference |

### Change Control Process

1. All changes to this document MUST be recorded in the Revision History table above.
2. Status transitions: `draft` → `review` → `approved` → `active` → `deprecated` → `archived`.
3. Changes after `approved` status require a new version number and re-approval.
4. Minor corrections (typos, formatting) increment the minor version (e.g., 1.0 → 1.1).
5. Major changes (new requirements, scope changes) increment the major version (e.g., 1.0 → 2.0).
6. Deprecated documents MUST be moved to `docs/09-archive/` with a deprecation notice.
7. All dates in this document use ISO 8601 format (`YYYY-MM-DD`).

## DOCUMENT APPROVAL

| Role | Name | Signature | Date | Decision |
|------|------|-----------|------|----------|
| Engineering Lead | — | — | 2026-09-16 | Approved |
| Product Owner | — | — | 2026-09-16 | Approved |
| Security Officer | — | — | — | Pending Review |

### Document Lifecycle

| State | Date | Actor | Notes |
|-------|------|-------|-------|
| Draft | 2026-09-16 | Engineering Lead | Initial ISO controls added |
| Approved | 2026-09-16 | Engineering Lead | Document approved for use |

### Next Review Date

| Trigger | Date | Notes |
|---------|------|-------|
| Annual review | 2026-12-31 | End of year review cycle |
| Major release | — | Triggered by major platform release |

# UI Fix Plan — Match SRS-003 Exactly

## Objective
Rewrite all existing Wallet Pass Studio UI components to match SRS-003 ASCII mockups pixel-for-pixel, label-for-label, interaction-for-interaction.

## Fix Groups

### FIX-1: StudioSidebar + Dynamic Tab Labels
**File:** `frontend/src/components/wallet/studio/StudioSidebar.tsx`
**SRS-003 Ref:** Section 4 (Main Studio), Section 8 (Sidebar Tabs)
- Tab labels MUST change based on cardType:
  - stamp → "Sellos"
  - cashback → "Puntos"
  - coupon → "Cupón"
  - discount → "Descuento"
  - gift_certificate → "Regalo"
  - vip_membership → "VIP"
  - affiliate → "Afiliado"
  - corporate_discount → "Corp"
  - referral_pass → "Referido"
  - multipass → "Multi"
- Static tabs: "Imágenes", "Campos", "Reverso", "Código", "Colores", "Avanzado"
- Remove debug info block
- Remove temporary quick actions
- Tab strip must match SRS-003: `[🖼️ Img] [🎯 Sellos] [📝 Cont] [📄 Rev] [📊 Bar] [🎨 Cols] [⚙️]`

### FIX-2: ImagesTab
**File:** `frontend/src/components/wallet/studio/ImagesTab.tsx`
**SRS-003 Ref:** Section 8.1
- Label "LOGO DEL NEGOCIO" (not "Logo del programa")
- Show 3 preview panes AFTER upload: Apple Rect, Google Circle, Original
- Show dimensions under each: "160×50pt", "660×660px", "Full size"
- Auto-generate @2x/@3x checkbox: "[✓] Auto-generar @2x y @3x para Apple"
- Action buttons: "[🗑️ Eliminar] [🔄 Reemplazar] [✨ Mejorar con IA]"
- Section 2: "🖼️ IMAGEN PRINCIPAL (Strip / Hero)" with wide upload zone
- Section 3: "🎨 IMÁGENES ADICIONALES" with:
  - [+ Icono Apple] — "29×29pt, mostrado en notificaciones"
  - [+ Miniatura] — "90×90pt, junto a los campos"
  - [+ Fondo] — "180×220pt, imagen de fondo difuminada"
  - [+ Wide Logo] — "1032×150px, logo extendido"

### FIX-3: FieldStudio — Inline Editing (NOT Modal)
**Files:** `frontend/src/components/wallet/studio/FieldStudio.tsx`, `FieldCard.tsx`
**SRS-003 Ref:** Section 8.3
- Each field is EXPANDED inline, not a compact card
- Field groups as panels:
  - "🏷️ CAMPOS DE CABECERA — Máximo 3"
  - "⭐ CAMPO PRINCIPAL — 1 campo grande y prominente"
  - "📋 CAMPOS SECUNDARIOS — Hasta 4"
  - "🔍 CAMPOS AUXILIARES — Hasta 4"
  - "📄 DETALLES / TRASERO — Sin límite"
- Each field shows:
  - Drag handle [⋮⋮]
  - Checkbox [✓] to show/hide
  - Label input
  - Value input with [📋 Plantillas ▼] dropdown
  - [✓] Dinámico toggle
  - [🗑️] delete button
  - Apple [🍎✓] / Google [🤖✓] visibility toggles
- Primary field has text alignment selector: "[ Izquierda ●] [Centro ○] [Derecha ○]"
- Notification toggle per field: "[✓] Enviar notificación: [¡Nuevo sello! ]"
- "[+ Añadir campo de X]" buttons per group

### FIX-4: BarcodeTab — Visual Format Selector
**File:** `frontend/src/components/wallet/studio/BarcodeTab.tsx`
**SRS-003 Ref:** Section 8.4
- Visual grid selector (not dropdown):
  ```
  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │
  │ │▓▓▓▓▓▓│ │ │ │▓▓  ▓▓│ │ │ │░░░░░░│ │ │ │123ABC│ │
  │ │▓▓  ▓▓│ │ │ │  ▓▓  │ │ │ │░░  ░░│ │ │ │      │ │
  │ │▓▓▓▓▓▓│ │ │ │▓▓  ▓▓│ │ │ │░░░░░░│ │ │ │      │ │
  │ └──────┘ │ │ └──────┘ │ │ └──────┘ │ │ └──────┘ │
  │ QR Code  │ │  Aztec   │ │ PDF417   │ │ Code 128 │
  │ ●        │ │ ○        │ │ ○        │ │ ○        │
  └──────────┘ └──────────┘ └──────────┘ └──────────┘
  ```
- Platform warnings inline: "⚠️ PDF417 y Code 128 son rectangulares..."
- Data builder: checkboxes for ID cliente, ID programa, Timestamp
- "[📱 Probar en dispositivo]" button
- Large preview with alt text below

### FIX-5: ColorsTab
**File:** `frontend/src/components/wallet/studio/ColorsTab.tsx`
**SRS-003 Ref:** Section 8.5
- Color inputs with inline picker: "Fondo: ████████ #1A1A2E [Color picker ▼]"
- RGB readout: "Apple: rgb(255,255,255) → Google: #FFFFFF"
- Contrast section with progress bar visual:
  "Texto vs Fondo: ████████░░ 12.5:1 ✓ AAA"
- "[✨ Sugerir colores con IA]" button
- Preset swatches in grid: 8+ visible at once with names below
- "[+ Guardar como preset de color]" button

### FIX-6: Toolbar
**File:** `frontend/src/components/wallet/studio/StudioToolbar.tsx`
**SRS-003 Ref:** Section 6
- 3-row layout:
  - Row 1: [↩ Undo] [↪ Redo] [🍎 Apple] [🤖 Google] [👁️ Both] [−] [100%] [+]
  - Row 2: [🎨 Templates] [💾 Guardar] [⬇️ Exportar] [🔄 Frente/Reverso] ████ Score: 8.2/10
  - Row 3 (right-aligned): [✨ Diseñar con IA] ← PURPLE GRADIENT
- AI button: `bg-gradient-to-r from-violet-600 to-indigo-400`, sparkles icon, white text, rounded-xl
- Score: progress bar + text, color-coded (green ≥9, blue 7-8, yellow 5-6, red <5)

### FIX-7: Card-Type Tabs — Match Mockups
**Files:** `frontend/src/components/wallet/studio/tabs/*.tsx`
**SRS-003 Ref:** Section 8.2
- StampTab: empty shape selector (6 shapes), empty icon grid, filled icon grid, color pickers, total sellos dropdown, disposición dropdown, animación dropdown, live preview
- CashbackTab: coin icon grid, tier levels with progress bars (Bronce/Plata/Oro/Platino), badge shape selector, progress color
- VIPTab: crown icon grid, member badge shapes, exclusive seal grid, benefit list with per-item icon pickers
- GiftTab: box graphic grid, ribbon color, denominations list, occasion selector
- All others: match SRS-003 Section 8.2 mockups

### FIX-8: BackDesignTab + AdvancedTab
**Files:** New `BackDesignTab.tsx`, `AdvancedTab.tsx`
**SRS-003 Ref:** Section 8.7, Section 8.6
- BackDesignTab: inline back field editing, quick links (Website/Phone/Email/Instagram/Facebook), app link config, Google details images
- AdvancedTab: Apple icon upload, description, sharing toggle, strip shine, locations/beacons, app link; Google Smart Tap, app link, screenshot disable, grouping

### FIX-9: DesignScore Panel
**File:** `frontend/src/components/wallet/studio/DesignScore.tsx`
**SRS-003 Ref:** Section 10
- Embedded in sidebar (not just toolbar)
- Circular score badge: "██████████ 9.2/10 ✓ EXCELENTE"
- Checklist with ✅/⚠️ per item
- Color coding: green ≥9, blue 7-8, yellow 5-6, red <5
- "[🔧 Ver sugerencias de mejora →]" button

## Execution Order
1. FIX-1 + FIX-6 (Sidebar + Toolbar) — foundation
2. FIX-2 (ImagesTab) — high visibility
3. FIX-3 (FieldStudio inline) — major interaction change
4. FIX-4 + FIX-5 (Barcode + Colors) — visual selectors
5. FIX-7 (Card-Type tabs) — per-type detail
6. FIX-8 (Back + Advanced) — new tabs
7. FIX-9 (DesignScore) — polish
