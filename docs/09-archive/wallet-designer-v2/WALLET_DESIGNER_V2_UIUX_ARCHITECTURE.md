# Wallet Designer V2 — UI/UX Architecture (PassKit-Inspired)

> **Date:** 2026-05-18  
> **Inspiration:** PassKit Pass Designer (passkit.com) + Apple PassKit Official Guide  
> **Goal:** Merge PassKit's proven 3-column layout with Loyallia's powerful field editing

---

## Why This Interface Is Better

| PassKit's Approach | Our Current Approach | Problem |
|-------------------|---------------------|---------|
| **Preview is CENTER and HERO** — largest element | Preview is small, stuck to the right | Users can't see what they're designing |
| **Editor is RIGHT panel** — like Photoshop/Figma | Editor is LEFT — competes with preview | Eye has to travel too much |
| **Icon nav on LEFT** — tool switching | Big toggle tabs + accordions | Takes too much vertical space |
| **Flat card preview** — shows the actual pass | Phone mockup | Phone chrome distracts from the pass itself |
| **Collapsible sections** — clean, scannable | All accordions expanded | Overwhelming amount of UI |
| **Contextual right panel** — shows only active section | Everything visible at once | Cognitive overload |
| **Links with icons** — visual, scannable | Plain text inputs | Hard to scan |

---

## V2 Layout Architecture (3-Column)

```
┌─────────┬──────────────────────────────┬──────────────────────────────┐
│         │                              │                              │
│  NAV    │       PREVIEW CENTER         │      EDITOR PANEL            │
│  (64px) │       (flexible, large)      │      (400-500px)             │
│         │                              │                              │
│  ────   │                              │   ┌──────────────────────┐   │
│  🍎/G   │    ┌──────────────────┐      │   │  🎨 Colors           │   │
│  🎨     │    │                  │      │   │  Background: [#1a...]│   │
│  🖼️     │    │   PASS PREVIEW   │      │   │  Text:       [#fff]  │   │
│  📋     │    │   (big, centered)│      │   │  Labels:     [#ccc]  │   │
│  📍     │    │                  │      │   └──────────────────────┘   │
│  🔗     │    │  ┌────────────┐  │      │   ┌──────────────────────┐   │
│  📟     │    │  │            │  │      │   │  🖼️ Images            │   │
│  ⚙️     │    │  │   CARD     │  │      │   │  [Logo]  [Hero]      │   │
│  💾     │    │  │   FACE     │  │      │   │  [Icon]  [Strip]     │   │
│         │    │  │            │  │      │   └──────────────────────┘   │
│         │    │  └────────────┘  │      │   ┌──────────────────────┐   │
│         │    │                  │      │   │  📋 Fields            │   │
│         │    │  ┌────────────┐  │      │   │  Header (1/3)  [+]   │   │
│         │    │  │   BACK     │  │      │   │  Primary (1/1) [+]   │   │
│         │    │  │   (flip)   │  │      │   │  Secondary (2/4)     │   │
│         │    │  └────────────┘  │      │   └──────────────────────┘   │
│         │    └──────────────────┘      │                              │
│         │                              │                              │
│         │   [🔄 Flip card]  [📱 Phone] │   [💾 Guardar cambios]      │
│         │                              │                              │
└─────────┴──────────────────────────────┴──────────────────────────────┘
```

---

## Column 1: Navigation Sidebar (64px)

### Icon Buttons (vertical stack)

| Icon | Label | Action |
|------|-------|--------|
| 🍎 / G | Plataforma | Toggle between Apple/Google mode |
| 🎨 | Colores | Open color editor |
| 🖼️ | Imágenes | Open image uploads |
| 📋 | Campos | Open field editor (Apple groups / Google rows) |
| 📍 | Ubicación | Open locations/beacons editor |
| 🔗 | Enlaces | Open links module editor |
| 📟 | Código | Open barcode settings |
| ⚙️ | Avanzado | Open advanced settings (NFC, expiration, etc.) |
| 💾 | Guardar | Save button (sticky at bottom) |

### Design Specs
- Width: 64px fixed
- Background: `bg-surface-100 dark:bg-surface-800`
- Border-right: `border-surface-200 dark:border-surface-700`
- Icon size: 20px
- Active state: `bg-white dark:bg-surface-700 shadow-sm rounded-lg`
- Inactive state: `text-surface-400 hover:text-surface-600`
- Tooltip on hover showing label

---

## Column 2: Preview Center (Flexible)

### Two Preview Modes

#### Mode A: Flat Card (Default — like PassKit)
- Shows just the pass card, no phone chrome
- Card size: ~320px wide (scales with viewport)
- Front of card shown by default
- Back of card accessible via "Flip" button
- Clean, minimal, focus on the design itself

#### Mode B: Phone Mockup (Optional toggle)
- iPhone 15 Pro or Pixel 7 frame
- For clients who want to see "on device"
- Smaller card inside phone bezel

### Preview Elements

```
┌─────────────────────────────────┐
│                                 │
│      [PASS FRONT]               │
│                                 │
│  ┌─────────────────────────┐    │
│  │ [LOGO]  Name     [HDR]  │    │
│  ├─────────────────────────┤    │
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│    │
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│    │
│  │      PRIMARY VALUE      │    │
│  ├─────────────────────────┤    │
│  │ SEC 1  │ SEC 2 │ AUX... │    │
│  ├─────────────────────────┤    │
│  │       [BARCODE]         │    │
│  └─────────────────────────┘    │
│                                 │
│   [← Flip →]  [🍎] [📱] [⌚]   │
│                                 │
└─────────────────────────────────┘
```

### Interactive Features
- **Hover zone on preview** → Highlights corresponding editor section
- **Click zone on preview** → Opens that section in right panel
- **Flip button** → Shows back of pass (back fields, links)
- **Platform toggle below preview** → Apple / Google / Apple Watch
- **Zone labels overlay** → Optional "show zones" mode with colored overlays

---

## Column 3: Editor Panel (400-500px, scrollable)

### Section: Colors 🎨

```
┌─────────────────────────────────────┐
│ 🎨 Colores                          │
├─────────────────────────────────────┤
│                                     │
│  Fondo                              │
│  ┌────┐  [#1A1A2E]                 │
│  └────┘                             │
│                                     │
│  Texto (valores)                    │
│  ┌────┐  [#FFFFFF]                 │
│  └────┘                             │
│                                     │
│  Etiquetas (labels) — Apple only    │
│  ┌────┐  [#CCCCCC]                 │
│  └────┘                             │
│                                     │
│  [Plantillas rápidas]               │
│  [🔵] [🟢] [🟠] [🟣] [🔴] [⚫]    │
│                                     │
└─────────────────────────────────────┘
```

### Section: Images 🖼️

```
┌─────────────────────────────────────┐
│ 🖼️ Imágenes                         │
├─────────────────────────────────────┤
│                                     │
│  Logo del programa *                │
│  ┌─────────────────────────────┐    │
│  │  [upload area]              │    │
│  │  160×50pt  |  660×660px    │    │
│  └─────────────────────────────┘    │
│  Miniatura del logo                 │
│  [🗑️ Eliminar]                      │
│                                     │
│  Imagen Hero / Strip                │
│  ┌─────────────────────────────┐    │
│  │  [upload area]              │    │
│  │  375×123pt  |  1032×336px  │    │
│  └─────────────────────────────┘    │
│                                     │
│  Ícono *                            │
│  ┌────┐  29×29pt  |  58×58px      │
│  └────┘                             │
│                                     │
└─────────────────────────────────────┘
```

**Key improvement over current:** Each image shows WHERE it appears on the pass with a mini inline diagram.

### Section: Fields 📋

```
┌─────────────────────────────────────┐
│ 📋 Campos del pase                  │
├─────────────────────────────────────┤
│                                     │
│ ┌─ Cabecera (1/3) ─────────────┐   │
│ │  [Esquina superior derecha]   │   │
│ │  ┌─────────────────────────┐  │   │
│ │  │ Label: [SELLOS   ]      │  │   │
│ │  │ Valor: [{stamp_count}]  │  │   │
│ │  │ Formato: [Texto ▼]      │  │   │
│ │  └─────────────────────────┘  │   │
│ │  [+ Añadir campo]             │   │
│ └───────────────────────────────┘   │
│                                     │
│ ┌─ Principal (1/1) ────────────┐   │
│ │  [Texto grande central]       │   │
│ │  ┌─────────────────────────┐  │   │
│ │  │ Label: [RECOMPENSA ]    │  │   │
│ │  │ Valor: [{reward_desc}]  │  │   │
│ │  └─────────────────────────┘  │   │
│ └───────────────────────────────┘   │
│                                     │
│ ┌─ Secundario (2/4) ───────────┐   │
│ │  [Debajo del principal]       │   │
│ │  ...                          │   │
│ └───────────────────────────────┘   │
│                                     │
│ ┌─ Auxiliar (0/4) ─────────────┐   │
│ │  [Parte inferior]             │   │
│ │  [+ Añadir campo]             │   │
│ └───────────────────────────────┘   │
│                                     │
│ ┌─ Traseros (3/∞) ─────────────┐   │
│ │  [Parte de atrás del pase]    │   │
│ │  ...                          │   │
│ └───────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

**Key improvement:** Each field group card has a mini zone map SVG at the top showing WHERE those fields appear.

### Section: Links 🔗

```
┌─────────────────────────────────────┐
│ 🔗 Enlaces y contacto               │
├─────────────────────────────────────┤
│                                     │
│  📧 Email                           │
│  ┌─────────────────────────────┐    │
│  │ contacto@tienda.com         │    │
│  └─────────────────────────────┘    │
│                                     │
│  🌐 Sitio web                       │
│  ┌─────────────────────────────┐    │
│  │ https://tienda.com          │    │
│  └─────────────────────────────┘    │
│                                     │
│  📞 Teléfono                        │
│  ┌─────────────────────────────┐    │
│  │ +52 55 1234 5678            │    │
│  └─────────────────────────────┘    │
│                                     │
│  📍 Ubicación                       │
│  [Añadir enlace a Google Maps]      │
│                                     │
└─────────────────────────────────────┘
```

### Section: Locations 📍

```
┌─────────────────────────────────────┐
│ 📍 Relevancia (Lock Screen)         │
├─────────────────────────────────────┤
│                                     │
│  Texto en pantalla de bloqueo       │
│  ┌─────────────────────────────┐    │
│  │ ¡Tienda cerca! Muestra tu   │    │
│  │ pase para 10% de descuento. │    │
│  └─────────────────────────────┘    │
│                                     │
│  Ubicaciones GPS (máx. 10)          │
│  ┌─────────────────────────────┐    │
│  │ 📍 19.4326, -99.1332        │    │
│  │    "Sucursal Centro"        │    │
│  │ [🗑️]                       │    │
│  └─────────────────────────────┘    │
│  [+ Añadir ubicación]               │
│                                     │
│  iBeacons (máx. 10)                 │
│  ┌─────────────────────────────┐    │
│  │ 📡 UUID: F8F5-89E9-...      │    │
│  │    Major: 1, Minor: 2       │    │
│  │ [🗑️]                       │    │
│  └─────────────────────────────┘    │
│  [+ Añadir beacon]                  │
│                                     │
└─────────────────────────────────────┘
```

### Section: Barcode 📟

```
┌─────────────────────────────────────┐
│ 📟 Código de barras                 │
├─────────────────────────────────────┤
│                                     │
│  Tipo                               │
│  [QR Code ▼] [Aztec] [PDF417]      │
│  [Code 128] [Data Matrix]          │
│                                     │
│  Vista previa:                      │
│  ┌─────────────────────────────┐    │
│  │  ┌─────┐                    │    │
│  │  │ ▓▓▓ │                    │    │
│  │  │ ▓▓▓ │                    │    │
│  │  │ ▓▓▓ │                    │    │
│  │  └─────┘                    │    │
│  │  0000 0000 0000             │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

### Section: Advanced ⚙️

```
┌─────────────────────────────────────┐
│ ⚙️ Configuración avanzada           │
├─────────────────────────────────────┤
│                                     │
│  Apple Wallet                       │
│  ┌─────────────────────────────┐    │
│  │ ☐ NFC activado              │    │
│  │ ☐ Requerir autenticación    │    │
│  │ ☐ Prohibir compartir        │    │
│  │ ☐ Marcar como anulada       │    │
│  │ ☐ Desactivar brillo strip   │    │
│  │                             │    │
│  │ Mensaje NFC: [________]     │    │
│  │ Fecha de expiración: [date] │    │
│  │ Texto del logo: [________]  │    │
│  └─────────────────────────────┘    │
│                                     │
│  Google Wallet                      │
│  ┌─────────────────────────────┐    │
│  │ Estado: [Activo ▼]          │    │
│  │ ☐ Desactivar screenshot     │    │
│  │                             │    │
│  │ Revisión: [En revisión ▼]   │    │
│  │ Compartir: [Un usuario ▼]   │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

---

## Component Architecture

```
WalletDesignShell (new)
├── DesignerNavBar (new)
│   ├── NavButton (platform: apple/google)
│   ├── NavButton (section: colors)
│   ├── NavButton (section: images)
│   ├── NavButton (section: fields)
│   ├── NavButton (section: locations)
│   ├── NavButton (section: links)
│   ├── NavButton (section: barcode)
│   ├── NavButton (section: advanced)
│   └── SaveButton
├── DesignerPreview (refactored from WalletCardPreview)
│   ├── PassCardFront (flat card, no phone)
│   ├── PassCardBack (back fields, links)
│   ├── PlatformSwitcher (apple/google/watch tabs)
│   ├── ViewModeToggle (flat/phone)
│   └── ZoneHighlighter (optional overlay)
└── DesignerEditorPanel (new)
    ├── ColorsSection
    ├── ImagesSection
    ├── FieldsSection
    │   ├── AppleFieldEditor (existing, enhanced)
    │   └── GoogleRowBuilder (existing, enhanced)
    ├── LocationsSection (new)
    ├── LinksSection (new)
    ├── BarcodeSection
    └── AdvancedSection
```

---

## Responsive Behavior

### Desktop (≥1280px): 3-column
```
| 64px |   flexible preview   |  480px editor  |
```

### Tablet (≥1024px): 3-column (smaller editor)
```
| 64px |   flexible preview   |  360px editor  |
```

### Mobile (<1024px): Stacked
```
| 64px nav |
|  preview  |
|  editor   |
```
Nav becomes horizontal scrollable icon bar above preview.

---

## Data Flow

```
Parent Page (program detail / new program)
│
├─→ WalletDesignShell
│   ├─→ state: activeSection ('colors' | 'images' | 'fields' | ...)
│   ├─→ state: previewPlatform ('apple' | 'google')
│   ├─→ state: previewMode ('flat' | 'phone')
│   ├─→ state: showBackSide (false)
│   │
│   ├─→ DesignerNavBar
│   │   └─→ onSectionChange → activeSection
│   │   └─→ onPlatformChange → previewPlatform + walletDesign.provider
│   │
│   ├─→ DesignerPreview
│   │   ├─→ Receives: walletDesign, form, previewPlatform, previewMode
│   │   ├─→ Renders: flat card OR phone mockup
│   │   └─→ onZoneClick → activeSection = corresponding section
│   │
│   └─→ DesignerEditorPanel
│       ├─→ Receives: activeSection, walletDesign, onChange
│       ├─→ Renders: only the active section
│       └─→ onChange → updates walletDesign state in parent
│
└─→ Parent saves walletDesign to backend
```

---

## Implementation Phases

### Phase 1: Shell & Layout (Today)
- [ ] Create `WalletDesignShell` with 3-column grid
- [ ] Create `DesignerNavBar` with icon buttons
- [ ] Create `DesignerEditorPanel` framework
- [ ] Refactor `WalletCardPreview` → `DesignerPreview` with flat card mode
- [ ] Wire into existing pages (`[id]/page.tsx`, `new/page.tsx`)

### Phase 2: Editor Sections (This week)
- [ ] Colors section with color pickers + templates
- [ ] Images section with mini zone indicators
- [ ] Fields section with inline zone map SVGs
- [ ] Barcode section
- [ ] Advanced section

### Phase 3: New Features (Next week)
- [ ] Locations section (GPS + iBeacons)
- [ ] Links section (with icons like PassKit)
- [ ] Pass back side preview + editor
- [ ] Apple Watch preview

### Phase 4: Polish
- [ ] Zone highlight on hover
- [ ] Click preview zone → open editor section
- [ ] Animations (section transitions, flip)
- [ ] Keyboard shortcuts (⌘+S save, ⌘+1-9 nav)

---

## Files to Create/Modify

### New Files
- `frontend/src/components/programs/designer/WalletDesignShell.tsx`
- `frontend/src/components/programs/designer/DesignerNavBar.tsx`
- `frontend/src/components/programs/designer/DesignerEditorPanel.tsx`
- `frontend/src/components/programs/designer/DesignerPreview.tsx`
- `frontend/src/components/programs/designer/sections/ColorsSection.tsx`
- `frontend/src/components/programs/designer/sections/ImagesSection.tsx`
- `frontend/src/components/programs/designer/sections/LocationsSection.tsx`
- `frontend/src/components/programs/designer/sections/LinksSection.tsx`
- `frontend/src/components/programs/designer/ApplePassZoneMap.tsx` (SVG)
- `frontend/src/components/programs/designer/GooglePassZoneMap.tsx` (SVG)

### Modified Files
- `frontend/src/components/programs/WalletDesigner.tsx` — gut and rebuild
- `frontend/src/components/programs/WalletCardPreview.tsx` — extract preview logic
- `frontend/src/app/(dashboard)/programs/[id]/page.tsx` — use WalletDesignShell
- `frontend/src/app/(dashboard)/programs/new/page.tsx` — use WalletDesignShell

---

*This architecture gives us PassKit's proven UX patterns while preserving all of Loyallia's powerful backend integration and field editing capabilities.*
