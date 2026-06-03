# SRS-003: UI Specifications & Screen Mockups

> **ISO/IEC/IEEE 29148:2018 — Software Requirements Specification**
> Document ID: SRS-LOY-WPS-001 | Version: 1.0.0-Draft

---

## Table of Contents

1. [Template Gallery Entry Point](#1-template-gallery-entry-point)
2. [Main Studio Screen](#2-main-studio-screen)
3. [Toolbar Specification](#3-toolbar-specification)
4. [Canvas Interactions](#4-canvas-interactions)
5. [Sidebar Tabs](#5-sidebar-tabs)

---

## 1. Template Gallery Entry Point

### 1.1 Entry Point A: Template Gallery (Recommended for New Users)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Volver                              Wallet Pass Studio              [?]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🎨 Elige un diseño para comenzar                                   │   │
│  │                                                                     │   │
│  │  Los templates incluyen colores, imágenes y campos preconfigurados. │   │
│  │  Puedes personalizar todo después.                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🔍 Buscar templates...    [Café ▼] [Tarjeta de Sellos ▼]          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ✨ También puedes:  [Diseñar con IA →]                             │   │
│  │  Describe tu negocio y la IA generará diseños personalizados.       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  CATEGORÍAS:  [Todas]  [Café]  [Retail]  [Gym]  [Salón]  [Hotel]   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐           │
│  │ ┌──────────────┐ │ │ ┌──────────────┐ │ │ ┌──────────────┐ │           │
│  │ │  [PASS PREV] │ │ │ │  [PASS PREV] │ │ │ │  [PASS PREV] │ │           │
│  │ │   Coffee     │ │ │ │   Shopping   │ │ │ │   Dumbbell   │ │           │
│  │ │   Cup Icon   │ │ │ │    Bag       │ │ │ │    Icon      │ │           │
│  │ └──────────────┘ │ │ └──────────────┘ │ │ └──────────────┘ │           │
│  │ ☕ Café Clásico  │ │ 🛍️ Retail Modern │ │ 💪 Gym Pro       │           │
│  │ Tarjeta de Sellos│ │ Cashback         │ │ Membresía VIP    │           │
│  │ [Usar Template]  │ │ [Usar Template]  │ │ [Usar Template]  │           │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘           │
│                                                                             │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐           │
│  │ ┌──────────────┐ │ │ ┌──────────────┐ │ │ ┌──────────────┐ │           │
│  │ │  [PASS PREV] │ │ │ │  [PASS PREV] │ │ │ │  [PASS PREV] │ │           │
│  │ │   Scissors   │ │ │ │   Crown      │ │ │ │   Building   │ │           │
│  │ │    Icon      │ │ │ │   Icon       │ │ │ │   Icon       │ │           │
│  │ └──────────────┘ │ │ └──────────────┘ │ │ └──────────────┘ │           │
│  │ ✂️ Salón Elite   │ │ 👑 VIP Oro       │ │ 🏢 Corporate     │           │
│  │ Cupón Descuento  │ │ Membresía VIP    │ │ Desc. Corporativo│           │
│  │ [Usar Template]  │ │ [Usar Template]  │ │ [Usar Template]  │           │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘           │
│                                                                             │
│                     ┌─────────────────────────┐                            │
│                     │  ✏️ Empezar desde cero  │                            │
│                     └─────────────────────────┘                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Element Specifications:**

| Element | Behavior | Interaction |
|---------|----------|-------------|
| Search bar | Filters templates by name, description, tags | Debounced 300ms, instant filter |
| Category dropdown | Filters by industry | Single select, instant filter |
| Card type dropdown | Filters by compatible card type | Single select, instant filter |
| Category tabs | Horizontal scroll on mobile | Active tab highlighted with underline |
| Template card | Hover: scale 1.02, shadow increase | Click opens template preview modal |
| "Usar Template" button | Applies template, enters studio | Green button, loading state while applying |
| "✨ Diseñar con IA" button | Opens AI assistant modal | Purple gradient button, prominent placement |
| "Empezar desde cero" | Creates blank pass with smart defaults | Gray outline button |
| Back arrow | Returns to Step 2 | Confirmation if unsaved changes |

---

## 2. Main Studio Screen

### 2.1 Desktop Layout (≥1280px)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Toolbar                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌──────────────────────────────────────────────────┐  ┌──────────────────────────────┐ │
│  │                                                  │  │ Sidebar                      │ │
│  │         CANVAS (Wallet Pass Preview)             │  │ ┌──────────────────────────┐ │ │
│  │                                                  │  │ │ [Templates] [Images]      │ │ │
│  │    ┌────────────────────────────────────┐       │  │ │ [Content] [Barcode]       │ │ │
│  │    │    🍎 iPhone 15 Pro Frame           │       │  │ │ [Colors] [Advanced ▼]     │ │ │
│  │    │  ┌──────────────────────────────┐   │       │  │ └──────────────────────────┘ │ │
│  │    │  │  LOGO        Program Name    │   │       │  │                              │ │
│  │    │  │  ┌────────────────────────┐  │   │       │  │ ┌──────────────────────────┐ │ │
│  │    │  │  │    HERO IMAGE          │  │   │       │  │ │ SMART UPLOAD: Logo       │ │ │
│  │    │  │  │    (strip/hero)        │  │   │       │  │ │ ┌────────────────────┐   │ │ │
│  │    │  │  └────────────────────────┘  │   │       │  │ │ │ 📤 Arrastra tu     │   │ │ │
│  │    │  │                                │   │       │  │ │ │    logo aquí       │   │ │ │
│  │    │  │  SELLOS                        │   │       │  │ │ │    o haz click     │   │ │ │
│  │    │  │  3 / 10                        │   │       │  │ │ │    para subir      │   │ │ │
│  │    │  │                                │   │       │  │ │ │                    │   │ │ │
│  │    │  │  RECOMPENSA    CLIENTE         │   │       │  │ │ │  [Vista previa     │   │ │ │
│  │    │  │  Café gratis   Juan Pérez      │   │       │  │ │ │   circular]        │   │ │ │
│  │    │  │                                │   │       │  │ │ └────────────────────┘   │ │ │
│  │    │  │  ┌──────────────────────────┐  │   │       │  │ │ Recomendado: PNG con    │ │ │
│  │    │  │  │  ┌────┐                  │  │   │       │  │ │ fondo transparente      │ │ │
│  │    │  │  │  │ QR │  0000 0000 0000  │  │   │       │  │ │ Mínimo: 660×660px      │ │ │
│  │    │  │  │  └────┘                  │  │   │       │  │ └──────────────────────────┘ │ │
│  │    │  │  └──────────────────────────┘  │   │       │  │                              │ │
│  │    │  └──────────────────────────────┘   │       │  │ ┌──────────────────────────┐ │ │
│  │    │                                     │       │  │ │ SMART UPLOAD: Hero       │ │ │
│  │    │    🤖 Pixel 7 Frame (smaller)       │       │  │ │ ┌────────────────────┐   │ │ │
│  │    │  ┌──────────────────────────────┐   │       │  │ │ │ 📤 Imagen          │   │ │ │
│  │    │  │  [Google Pass Preview]       │   │       │  │ │ │    panorámica      │   │ │ │
│  │    │  └──────────────────────────────┘   │       │  │ │ └────────────────────┘   │ │ │
│  │    └────────────────────────────────────┘       │  │ │ Proporción: 3.07:1      │ │ │
│  │                                                  │  │ │ (Apple) / 3:1 (Google)  │ │ │
│  │  [−] 100% [+]    [Grid ▢]  [Both 👁️]            │  │ └──────────────────────────┘ │ │
│  │                                                  │  │                              │ │
│  │                                                  │  │ ┌──────────────────────────┐ │ │
│  │                                                  │  │ │ CONTENT FIELDS           │ │ │
│  │                                                  │  │ │                          │ │ │
│  │                                                  │  │ │ ┌────────────────────┐   │ │ │
│  │                                                  │  │ │ │ 🏷️ Header          │   │ │ │
│  │                                                  │  │ │ │ Label: SELLOS      │   │ │ │
│  │                                                  │  │ │ │ Value: {stamps}    │   │ │ │
│  │                                                  │  │ │ │ [✓] Mostrar        │   │ │ │
│  │                                                  │  │ │ └────────────────────┘   │ │ │
│  │                                                  │  │ │ ┌────────────────────┐   │ │ │
│  │                                                  │  │ │ │ ⭐ Primary         │   │ │ │
│  │                                                  │  │ │ │ Label: PROGRESO    │   │ │ │
│  │                                                  │  │ │ │ Value: {progress}  │   │ │ │
│  │                                                  │  │ │ │ [✓] Mostrar        │   │ │ │
│  │                                                  │  │ │ └────────────────────┘   │ │ │
│  │                                                  │  │ └──────────────────────────┘ │ │
│  │                                                  │  │                              │ │
│  │                                                  │  │ ┌──────────────────────────┐ │ │
│  │                                                  │  │ │ DESIGN SCORE             │ │ │
│  │                                                  │  │ │ ████████░░ 8/10          │ │ │
│  │                                                  │  │ │ ⚠️ Contraste bajo        │ │ │
│  │                                                  │  │ │ [Ver detalles →]         │ │ │
│  │                                                  │  │ └──────────────────────────┘ │ │
│  └──────────────────────────────────────────────────┘  └──────────────────────────────┘ │
│                                                                                         │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │  [← Anterior]                              [Guardar borrador]  [Siguiente →]       │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Mobile Layout (<768px)

```
┌─────────────────────────────────────────┐
│ Toolbar (compact)                       │
│ [↩] [↪] [🍎|🤖] [✨ IA] [100%]        │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │      CANVAS (single preview)    │   │
│  │  ┌──────────────────────────┐   │   │
│  │  │    [iPhone or Pixel]     │   │   │
│  │  │    [Pass Preview]        │   │   │
│  │  └──────────────────────────┘   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Swipe ←→ to switch platforms]        │
│                                         │
├─────────────────────────────────────────┤
│ Bottom Sheet (draggable)                │
│ ┌─────────────────────────────────────┐ │
│ │ [Templates] [Images] [Content]     │ │
│ │ [Barcode] [Colors] [Advanced]      │ │
│ ├─────────────────────────────────────┤ │
│ │                                     │ │
│ │ [Selected tab content]             │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Drag up to expand, down to collapse]  │
│                                         │
└─────────────────────────────────────────┘
```

---

## 3. Toolbar Specification

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Toolbar                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─────────┐ ┌─────────┐    ┌──────────────────────┐    ┌─────┐ ┌─────┐ ┌────────────┐ │
│  │ ↩ Undo  │ │ ↪ Redo  │    │ [🍎] [🤖] [👁️ Both] │    │ −   │ │100% │ │ +          │ │
│  └─────────┘ └─────────┘    └──────────────────────┘    └─────┘ └─────┘ └────────────┘ │
│                                                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────────────────────────┐ │
│  │ 🎨 Templates │ │ 💾 Guardar   │ │ ⬇️ Exportar  │ │  ████████░░ Puntuación: 8/10  │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────────────────────────┘ │
│                                                                                         │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│  │  ✨ Diseñar con IA  ← PURPLE GRADIENT BUTTON, TOP-RIGHT                           │ │
│  └────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

| Element | Type | Behavior | States |
|---------|------|----------|--------|
| Undo | IconButton | Reverts last action | Disabled when history empty |
| Redo | IconButton | Re-applies undone action | Disabled when redo stack empty |
| Platform Toggle | SegmentedControl | Shows/hides platform previews | Apple/Google/Both |
| Zoom Out | IconButton | Decreases canvas zoom | Disabled at 50% |
| Zoom Level | Text | Displays current zoom | Non-interactive |
| Zoom In | IconButton | Increases canvas zoom | Disabled at 200% |
| Templates | Button | Opens template gallery modal | — |
| Save Preset | Button | Saves current design as reusable preset | Prompts for name |
| Export | Button | Downloads .pkpass for testing | Generates signed pass |
| **✨ AI Button** | **Button** | **Opens AI assistant modal** | **Purple gradient, sparkles icon** |
| Design Score | ProgressBar + Text | Shows quality score + issues | Green/Yellow/Red |

**AI Button Specification:**
- **Position:** Top-right of toolbar, prominently displayed
- **Background:** Purple/violet gradient (#8B5CF6 → #A78BFA)
- **Icon:** Sparkles (✨) to indicate magic/AI assistance
- **Text:** "Diseñar con IA" (Spanish) / "Design with AI" (English)
- **States:**
  - Default: Purple gradient, gentle pulse on first visit
  - Hover: Brighter gradient, scale 1.05, tooltip "Diseña tu tarjeta con IA"
  - Loading: Spinner, "Generando..."
  - Success: Green checkmark flash
  - Disabled: Gray when no program name set

---

## 4. Canvas Interactions

### 4.1 Mouse/Pointer Interactions

| Interaction | Behavior |
|-------------|----------|
| **Click empty canvas** | Deselects all layers |
| **Click layer** | Selects layer, shows blue border, resize handles, rotation handle, delete button |
| **Drag selected layer** | Layer follows cursor, snap-to-grid optional, alignment guides shown |
| **Drag resize handle** | Resizes from edge/corner, Shift = maintain aspect ratio, tooltip shows dimensions |
| **Double-click text layer** | Enters inline editing mode (cursor appears, type to edit) |
| **Right-click layer** | Context menu: Duplicate, Lock/Unlock, Hide/Show, Bring to Front, Send to Back, Delete |
| **Scroll (mouse wheel)** | Pans canvas when zoomed in |
| **Pinch (touch)** | Zoom in/out |

### 4.2 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + D` | Duplicate selected layer |
| `Delete / Backspace` | Delete selected layer |
| `Arrow Keys` | Nudge 1px |
| `Shift + Arrow Keys` | Nudge 10px |
| `Ctrl/Cmd + G` | Toggle grid |
| `Ctrl/Cmd + 0` | Reset zoom to 100% |
| `Ctrl/Cmd + +` | Zoom in |
| `Ctrl/Cmd + -` | Zoom out |
| `Escape` | Deselect / Cancel |

---

## 5. Sidebar Tabs

### 5.1 Images Tab

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR: IMAGES TAB                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  📤 LOGO DEL NEGOCIO                                             │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │              [Upload Zone - Drag & Drop]                │    │   │
│  │  │         🖼️  Arrastra una imagen o haz click            │    │   │
│  │  │              para seleccionar un archivo                │    │   │
│  │  │              Formatos: PNG, JPG, WebP                   │    │   │
│  │  │              Tamaño máximo: 5 MB                        │    │   │
│  │  │              Mínimo recomendado: 660×660px              │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │   │
│  │  │ Apple Rect   │  │ Google Circle│  │ Original     │         │   │
│  │  │ ┌──────────┐ │  │    ╭────╮    │  │ ┌──────────┐ │         │   │
│  │  │ │  LOGO    │ │  │   │ LOGO │   │  │ │  LOGO    │ │         │   │
│  │  │ └──────────┘ │  │    ╰────╯    │  │ └──────────┘ │         │   │
│  │  │ 160×50pt     │  │  660×660px   │  │ Full size    │         │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘         │   │
│  │                                                                  │   │
│  │  [✓] Auto-generar @2x y @3x (recomendado)                      │   │
│  │                                                                  │   │
│  │  [🗑️ Eliminar]  [🔄 Reemplazar]  [✨ Mejorar con IA]           │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🖼️ IMAGEN PRINCIPAL (Hero / Strip)                              │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │              [Upload Zone - Wide Format]                │    │   │
│  │  │         📤 Arrastra una imagen panorámica              │    │   │
│  │  │              Proporción: 3.07:1 (Apple) / 3:1 (Google) │    │   │
│  │  │              Mínimo: 1032×336px                        │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🎨 IMÁGENES ADICIONALES                                         │   │
│  │                                                                  │   │
│  │  [+ Añadir imagen de fondo]  — Solo disponible para Generic     │   │
│  │  [+ Añadir miniatura]        — Solo disponible para Generic     │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Upload Zone States:**

| State | Visual | Behavior |
|-------|--------|----------|
| Empty | Dashed border, upload icon | Click opens file picker, drag-drop accepts files |
| Drag Over | Blue border highlight, "Suelta aquí" | Accepts drop, validates file type |
| Uploading | Progress bar, "Procesando..." | Client-side validation, then server upload |
| Uploaded | Thumbnail preview, file name | Click to replace, hover shows delete button |
| Error | Red border, error icon | Shows specific error: type, size, dimensions |

### 5.2 Content Tab

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR: CONTENT TAB                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🏷️ CAMPOS DE CABECERA (Header) — Máximo 3                       │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │ [✓] Campo 1                                             │    │   │
│  │  │ Etiqueta:  [SELLOS                    ]                 │    │   │
│  │  │ Valor:     [{stamp_count}/{stamps_required} ]           │    │   │
│  │  │           [📋 Plantillas ▼]  [✓] Dinámico               │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  │  [+ Añadir campo de cabecera] (máximo 3)                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  ⭐ CAMPO PRINCIPAL (Primary) — 1 campo grande y prominente      │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │ [✓] Mostrar campo principal                             │    │   │
│  │  │ Etiqueta:  [PROGRESO                  ]                 │    │   │
│  │  │ Valor:     [{stamp_display}           ]                 │    │   │
│  │  │ Tamaño:    [ Grande ▼ ]                                │    │   │
│  │  │ Alineación: [ Izquierda ●] [Centro ○] [Derecha ○]      │    │   │
│  │  │ [✓] Dinámico  [✓] Enviar notificación al cambiar      │    │   │
│  │  │ Mensaje de cambio: [¡Tienes un nuevo sello! ]          │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  📋 CAMPOS SECUNDARIOS (Secondary) — Hasta 4                    │   │
│  │                                                                  │   │
│  │  [Drag handle] [✓] RECOMPENSA: Café gratis    [🗑️]             │   │
│  │  [Drag handle] [✓] CLIENTE: Juan Pérez        [🗑️]             │   │
│  │                                                                  │   │
│  │  [+ Añadir campo secundario]                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🔍 CAMPOS AUXILIARES (Auxiliary) — Hasta 4                     │   │
│  │                                                                  │   │
│  │  [Drag handle] [✓] NIVEL: Bronce              [🗑️]             │   │
│  │                                                                  │   │
│  │  [+ Añadir campo auxiliar]                                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  📄 CAMPOS TRASEROS (Back) — Sin límite                         │   │
│  │                                                                  │   │
│  │  [✓] Términos y condiciones                                    │   │
│  │  [✓] Contacto: soporte@negocio.com                             │   │
│  │                                                                  │   │
│  │  [+ Añadir campo trasero]                                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Barcode Tab

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR: BARCODE TAB                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  📊 FORMATO DE CÓDIGO                                            │   │
│  │                                                                  │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │   │
│  │  │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │          │   │
│  │  │ │▓▓▓▓▓▓│ │ │ │▓▓  ▓▓│ │ │ │░░░░░░│ │ │ │123ABC│ │          │   │
│  │  │ │▓▓  ▓▓│ │ │ │  ▓▓  │ │ │ │░░  ░░│ │ │ │      │ │          │   │
│  │  │ │▓▓▓▓▓▓│ │ │ │▓▓  ▓▓│ │ │ │░░░░░░│ │ │ │      │ │          │   │
│  │  │ └──────┘ │ │ └──────┘ │ │ └──────┘ │ │ └──────┘ │          │   │
│  │  │ QR Code  │ │  Aztec   │ │ PDF417   │ │ Code 128 │          │   │
│  │  │ ●        │ │ ○        │ │ ○        │ │ ○        │          │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │   │
│  │                                                                  │   │
│  │  [Data Matrix] — Solo Google Wallet                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  📝 CONTENIDO DEL CÓDIGO                                         │   │
│  │  Formato: {customer_id}_{program_id}_{timestamp}                │   │
│  │  [✓] Incluir ID de cliente   [✓] Incluir ID de programa        │   │
│  │  [✓] Incluir timestamp                                          │   │
│  │  Texto legible: [0000 0000 0000          ]                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  👁️ VISTA PREVIA                                                 │   │
│  │           ┌──────────────┐                                      │   │
│  │           │ ▓▓▓▓▓▓▓▓▓▓▓▓ │                                      │   │
│  │           │ ▓▓  ▓▓▓▓  ▓▓ │                                      │   │
│  │           │ ▓▓▓▓▓▓▓▓▓▓▓▓ │                                      │   │
│  │           │ ▓▓  ▓▓▓▓  ▓▓ │                                      │   │
│  │           │ ▓▓▓▓▓▓▓▓▓▓▓▓ │                                      │   │
│  │           └──────────────┘                                      │   │
│  │              0000 0000 0000                                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Colors Tab

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR: COLORS TAB                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🎨 PALETA DE COLORES                                            │   │
│  │                                                                  │   │
│  │  Fondo:    ████████  #1A1A2E  [Color picker ▼]                  │   │
│  │  Texto:    ████████  #FFFFFF  [Color picker ▼]                  │   │
│  │  Acento:   ████████  #E2E8F0  [Color picker ▼]                  │   │
│  │  Etiquetas:████████  #FFFFFF  [Color picker ▼] (iOS 18+)        │   │
│  │                                                                  │   │
│  │  📊 CONTRASTE                                                    │   │
│  │  Ratio:  ████████░░  12.5:1  ✓ Excelente (AAA)                  │   │
│  │                                                                  │   │
│  │  ⚠️ Consejo: Los colores oscuros con texto blanco funcionan     │   │
│  │     mejor en pantallas con brillo alto.                         │   │
│  │                                                                  │   │
│  │  🎨 PLANTILLAS DE COLOR RÁPIDAS                                  │   │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐     │   │
│  │  │████│ │████│ │████│ │████│ │████│ │████│ │████│ │████│     │   │
│  │  │Mid │ │Oce │ │Sun │ │For │ │Roy │ │Ros │ │Gol │ │Arc │     │   │
│  │  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘     │   │
│  │                                                                  │   │
│  │  [+ Guardar como preset de color]                               │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Color Picker Behavior:**

| Interaction | Behavior |
|-------------|----------|
| Click color swatch | Opens popover: Hex input, RGB/HSL sliders, Preset swatches, Eyedropper |
| Eyedropper | Click anywhere on screen to pick color |
| Hex input | Validates #RRGGBB, updates preview in real-time |
| Quick templates | Click applies immediately |
| Contrast check | Updates in real-time, warning if < 4.5:1 |

---

*End of Document SRS-003*
