# Wallet Designer UI/UX Architecture — Visual Zone Maps & Field Guidance

> **Date:** 2026-05-18  
> **Based on:** Apple PassKit Official Guide (developer.apple.com), PassKit.com, Google Wallet API docs

---

## 1. The Problem

Our current WalletDesigner has **functional field editors** but users don't understand **WHERE** each field appears on the actual pass. They see "Campos de cabecera" and don't know that means "top-right corner, small text, visible even when pass is stacked."

Apple's official documentation solves this with **clear labeled diagrams** (Figures 4-2 through 4-6) showing exactly where header, primary, secondary, auxiliary, and back fields render. PassKit.com uses inline zone maps next to each field group.

**We need the same visual guidance embedded directly in our UI.**

---

## 2. Proposed Solution: Inline SVG Zone Maps

### 2.1 Design Principles

1. **Show, don't just tell** — Every field group gets a mini SVG diagram showing its zone on the pass
2. **Pass-type aware** — Layout changes per Apple pass style (storeCard vs coupon vs generic)
3. **Bilingual labels** — Spanish UI with Spanish zone labels
4. **Interactive highlighting** — Hovering a field group highlights its zone on the phone preview
5. **Compact** — Zone maps are small (~200px wide) inline illustrations, not full-page diagrams

### 2.2 Zone Map Component Architecture

```
WalletDesigner
├── PlatformToggle (Apple/Google) — REMOVED, now single toggle above phone
├── PassStyleBanner — Shows current pass style + zone map
│   └── Apple: "Estilo de pase: storeCard" + mini zone map
│   └── Google: "Tipo de clase: LoyaltyClass" + mini zone map
├── ImagesSection
│   └── Each image upload gets a mini zone indicator
├── FieldsSection
│   ├── headerFields — Group card + zone map SVG
│   ├── primaryFields — Group card + zone map SVG
│   ├── secondaryFields — Group card + zone map SVG
│   ├── auxiliaryFields — Group card + zone map SVG
│   └── backFields — Group card + zone map SVG (back of pass)
├── AdvancedSection
└── WalletCardPreview (right side)
    ├── Big PlatformToggle
    └── Phone mockup with highlighted zones on hover
```

---

## 3. Apple Wallet Zone Maps (Per Pass Style)

### 3.1 Store Card / Loyalty Card (storeCard)

```
┌─────────────────────────────────┐
│ [LOGO]  Program Name     [HDR]  │  ← Header fields (1-3), top-right
│─────────────────────────────────│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  ← Strip image (375×123pt)
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│         PRIMARY VALUE           │  ← Primary field (1, large text)
│         primary label           │
├─────────────────────────────────┤
│ SEC1    │ SEC2    │ AUX1 │ AUX2 │  ← Secondary (1-4) + Auxiliary (1-4)
│ label   │ label   │ label│ label│     Combined max 4 fields visible
│ value   │ value   │ value│ value│
├─────────────────────────────────┤
│        ┌─────────┐              │
│        │ BARCODE │              │  ← Barcode (bottom)
│        └─────────┘              │
└─────────────────────────────────┘
```

**Field group labels (Spanish):**
- **Cabecera** → Esquina superior derecha. Visible cuando el pase está apilado.
- **Principal** → Texto grande sobre el strip. La información más importante.
- **Secundario** → Debajo del principal. Información de soporte.
- **Auxiliar** → Debajo del secundario. Información adicional.
- **Traseros** → Parte de atrás del pase. Texto largo permitido.

### 3.2 Coupon (coupon)

```
┌─────────────────────────────────┐
│ ○○○○○○○○○○○○○○○○○○○○○○○○○○○○○○○ │  ← Perforated edge (dashed line)
│ [LOGO]  Program Name     [HDR]  │  ← Header fields
│─────────────────────────────────│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  ← Strip image
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│         20% OFF                 │  ← Primary field (offer/discount)
│         Descuento especial      │
├─────────────────────────────────┤
│ SEC1    │ SEC2    │ AUX1 │ AUX2 │  ← Max 4 combined secondary+auxiliary
├─────────────────────────────────┤
│        ┌─────────┐              │
│        │ BARCODE │              │
│        └─────────┘              │
└─────────────────────────────────┘
```

**Unique:** Perforated top edge. Primary field typically shows discount amount.

### 3.3 Generic (generic)

```
┌─────────────────────────────────┐
│ [LOGO]  Program Name  [HDR][TH] │  ← Header fields + Thumbnail (90×90pt)
│─────────────────────────────────│
│         PRIMARY VALUE           │  ← Primary field
│         primary label           │
├─────────────────────────────────┤
│ SEC1    │ SEC2    │ AUX1 │ AUX2 │  ← Max 4 combined secondary+auxiliary
├─────────────────────────────────┤
│        ┌─────────┐              │
│        │ BARCODE │              │
│        └─────────┘              │
└─────────────────────────────────┘
```

**Unique:** No strip image. Uses thumbnail (top-right) instead.

### 3.4 Event Ticket (eventTicket) — NOT YET SUPPORTED

```
┌─────────────────────────────────┐
│ [LOGO]  Event Name       [HDR]  │
│─────────────────────────────────│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  ← Strip image
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│         EVENT NAME              │  ← Primary field
│         Concert / Movie         │
├─────────────────────────────────┤
│ Date        │ Time      │ Venue  │  ← Secondary fields
├─────────────────────────────────┤
│ Seat │ Section │ Gate │ Row     │  ← Auxiliary fields
├─────────────────────────────────┤
│        ┌─────────┐              │
│        │ BARCODE │              │
│        └─────────┘              │
└─────────────────────────────────┘
```

**Unique:** Small cutout at top edge (like a ticket stub).

### 3.5 Boarding Pass (boardingPass) — NOT YET SUPPORTED

```
┌─────────────────────────────────┐
│ [LOGO]  Airline          [HDR]  │
│─────────────────────────────────│
│  SFO  ✈  LHR                    │  ← 2 Primary fields with transit icon
│ SAN FRANCISCO TO LONDON         │  ← Combined primary labels
├─────────────────────────────────┤
│ Gate  │ Flight │ Boarding       │  ← Secondary fields
├─────────────────────────────────┤
│ Seat  │ Class  │ Group          │  ← Auxiliary fields (up to 5!)
├─────────────────────────────────┤
│ [FOOTER IMAGE]                  │
│        ┌─────────┐              │
│        │ BARCODE │              │
│        └─────────┘              │
└─────────────────────────────────┘
```

**Unique:** 2 primary fields (origin/destination), footer image, up to 5 auxiliary fields.

### 3.6 Gift Card (giftCard) — NOT YET SUPPORTED

```
┌─────────────────────────────────┐
│ [LOGO]  Gift Card        [HDR]  │
│─────────────────────────────────│
│         $50.00                  │  ← Primary field (balance)
│         Saldo disponible        │
├─────────────────────────────────┤
│ [THUMB] │ SEC1    │ SEC2        │  ← Thumbnail + secondary fields
├─────────────────────────────────┤
│        ┌─────────┐              │
│        │ BARCODE │              │
│        └─────────┘              │
└─────────────────────────────────┘
```

---

## 4. Google Wallet Zone Map

Google Wallet has a **single unified layout** regardless of pass type:

```
┌─────────────────────────────────┐
│      Google Wallet              │
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  ← Hero image (1032×336px)
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│         ┌─────┐                 │
│         │ LOGO│  ← Program logo │  ← Circular, 660×660px
│         └─────┘                 │
│      Program Name               │  ← Title (centered)
│      Tipo de programa           │  ← Subtitle
├─────────────────────────────────┤
│ Label 1          Value 1        │  ← Row 1 (oneItem / twoItems / threeItems)
│─────────────────────────────────│
│ Label 2          Value 2        │  ← Row 2
│─────────────────────────────────│
│ Label 3          Value 3        │  ← Row 3
├─────────────────────────────────┤
│        ┌─────────┐              │
│        │ BARCODE │              │
│        └─────────┘              │
└─────────────────────────────────┘
│  [Text Modules]                 │  ← Details view (below card)
│  [Links Modules]                │
│  [Image Modules]                │
└─────────────────────────────────┘
```

**Field group labels (Spanish):**
- **Logo del programa** → Círculo centrado sobre el título
- **Imagen Hero** → Banner ancho en la parte superior
- **Filas de campos** → Filas con divisores dentro de la tarjeta
- **Módulos de texto** → Sección de detalles (parte inferior)
- **Módulos de enlaces** → Enlaces clickeables en detalles
- **Módulos de imagen** → Imágenes adicionales en detalles

---

## 5. Apple Watch Zone Maps

Apple Watch shows a **simplified version** of the pass:

```
┌─────────────┐
│ [LOGO]      │  ← Logo (always shown)
│ Logo Text   │  ← logoText (shown if fits)
├─────────────┤
│ Header 1    │  ← Header fields (one per line)
│ Header 2    │
├─────────────┤
│ Primary     │  ← Primary fields first
│ Secondary   │  ← Then secondary
│ Auxiliary   │  ← Then auxiliary (2 per line if same type)
├─────────────┤
│ [BARCODE]   │  ← Barcode at bottom (rotated if rectangular)
└─────────────┘
```

**Critical:** NO strip image, NO thumbnail, NO back fields on Apple Watch.

---

## 6. UI Implementation Plan

### 6.1 Components to Create

1. **`ApplePassZoneMap`** — SVG component, receives `passStyle` prop, renders the correct layout diagram
2. **`GooglePassZoneMap`** — SVG component, renders Google Wallet layout diagram
3. **`AppleWatchZoneMap`** — SVG component, renders Apple Watch simplified layout
4. **`FieldZoneIndicator`** — Mini inline SVG shown in each field group card header
5. **`PassStyleInfoBanner`** — Top banner showing pass style + zone map + image requirements

### 6.2 Where to Show Zone Maps

| Location | What to show |
|----------|-------------|
| Top of designer (Apple mode) | PassStyleInfoBanner with full zone map + image checklist |
| Each field group card header | Mini zone indicator (color-coded highlight of that zone) |
| Image upload section | Mini indicator showing where each image appears |
| Phone preview (on hover) | Highlight the corresponding zone in the actual preview |
| Apple mode | Show AppleWatchZoneMap in a collapsible section |

### 6.3 Color Coding (consistent with existing)

| Field Group | Border Color | Zone Highlight |
|-------------|-------------|----------------|
| headerFields | Amber (#F59E0B) | Top-right corner |
| primaryFields | Emerald (#10B981) | Center, large text |
| secondaryFields | Indigo (#6366F1) | Below primary |
| auxiliaryFields | Slate (#64748B) | Below secondary |
| backFields | Gray (#9CA3AF) | Back of card icon |
| Google rows | Blue (#3B82F6) | Card body rows |

### 6.4 Interactive Behaviors

1. **Hover field group card** → Corresponding zone pulses on phone preview
2. **Click zone on phone preview** → Scrolls to and expands corresponding field group
3. **Add field** → Brief flash animation on the zone in preview
4. **Upload image** → Image appears in correct zone on preview immediately

---

## 7. Image Requirements Table (Per Pass Style)

### Apple Wallet

| Pass Style | Logo | Icon | Strip | Thumbnail | Footer | Background |
|-----------|:----:|:----:|:-----:|:---------:|:------:|:----------:|
| storeCard | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| coupon | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| generic | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| eventTicket | ✅ | ✅ | ✅* | ✅* | ❌ | ✅* |
| boardingPass | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| giftCard | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |

*Event ticket: strip OR background+thumbnail, not both

### Google Wallet (all types)

| Image | Required | Where it appears |
|-------|:--------:|-----------------|
| Program Logo (660×660) | ✅ | Circular, centered below hero |
| Hero Image (1032×336) | ❌ | Banner at top of card |
| Wide Logo (1032×150) | ❌ | Top-left, replaces circular logo |
| Additional Image (660×660) | ❌ | Details section below card |

---

## 8. Backend Pass.json Generation Updates Needed

### Apple pass.json additions:
```json
{
  "backgroundColor": "rgb(26, 26, 46)",
  "foregroundColor": "rgb(255, 255, 255)",
  "labelColor": "rgb(200, 200, 220)",
  "logoText": "Sweet & Coffee",
  "storeCard": {
    "primaryFields": [...],
    "secondaryFields": [...],
    "auxiliaryFields": [...],
    "backFields": [...],
    "headerFields": [...]
  },
  "locations": [
    { "latitude": 19.4326, "longitude": -99.1332, "relevantText": "¡Tienda cerca! Muestra tu pase para 10% de descuento." }
  ],
  "beacons": [
    { "proximityUUID": "...", "major": 1, "minor": 2, "relevantText": "Bienvenido a Sweet & Coffee" }
  ],
  "relevantDate": "2026-12-31T23:59:00-06:00"
}
```

### Google Wallet JWT additions:
```json
{
  "classTemplateInfo": {
    "cardTemplateOverride": { "cardRowTemplateInfos": [...] }
  },
  "textModulesData": [
    { "header": "Términos", "body": "Válido por 30 días..." }
  ],
  "linksModuleData": {
    "uris": [
      { "uri": "https://...", "description": "Sitio web" },
      { "uri": "tel:+52...", "description": "Llamar" }
    ]
  },
  "imageModulesData": {
    "mainImage": { "sourceUri": { "uri": "https://..." } }
  },
  "state": "ACTIVE",
  "disableScreenshot": false
}
```

---

*This architecture ensures users always know exactly what they're designing and where each element appears on the final pass.*
