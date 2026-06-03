# SRS-003: UI Specifications & Screen Mockups — OPTIMIZED v2

> **ISO/IEC/IEEE 29148:2018 — Software Requirements Specification**
> Document ID: SRS-LOY-WPS-001 | Version: 2.0.0-Draft  
> **OPTIMIZED** with all Apple PassKit & Google Wallet platform knowledge

---

## Table of Contents

1. [Design Principles (8 Rules)](#1-design-principles-8-rules)
2. [Template Gallery Entry Point](#2-template-gallery-entry-point)
3. [AI Assistant Modal](#3-ai-assistant-modal)
4. [Main Studio Screen — Desktop](#4-main-studio-screen--desktop)
5. [Main Studio Screen — Mobile](#5-main-studio-screen--mobile)
6. [Toolbar Specification](#6-toolbar-specification)
7. [Canvas Interactions](#7-canvas-interactions)
8. [Sidebar Tabs](#8-sidebar-tabs)
   - [8.1 Images Tab (with Stamp/Icon Support)](#81-images-tab)
   - [8.2 Card-Type Tab (Dynamic per Type)](#82-card-type-tab-dynamic-per-type)
   - [8.3 Content Tab](#83-content-tab)
   - [8.4 Barcode Tab](#84-barcode-tab)
   - [8.5 Colors Tab](#85-colors-tab)
   - [8.6 Advanced Tab](#86-advanced-tab)
   - [8.7 Back / Details Tab (Reverso)](#87-back--details-tab-reverso)
9. [Platform-Specific Preview Behaviors](#9-platform-specific-preview-behaviors)
10. [Design Quality Score Panel](#10-design-quality-score-panel)
11. [Keyboard Shortcuts](#11-keyboard-shortcuts)

---

## 1. Design Principles (8 Rules)

| # | Principle | Rationale |
|---|-----------|-----------|
| 1 | **No technical jargon** | "Imagen principal" not "strip.png @2x". Café owners don't know @2x. |
| 2 | **Visual first, forms second** | Canvas preview is PRIMARY. Sidebar edits update canvas in real-time. |
| 3 | **Smart defaults for every card type** | Stamp card starts with 10 stamps, café colors, coffee icon. |
| 4 | **Platform differences handled automatically** | User designs once, system adapts for Apple + Google. |
| 5 | **AI assistance always available** | ✨ button in toolbar for instant help. |
| 6 | **No dead ends** | Every action has a visible result on the canvas. |
| 7 | **Mobile is first-class** | Bottom sheet design, not a shrunk desktop. |
| 8 | **Accessibility by default** | WCAG AA contrast enforced, not optional. |

---

## 2. Template Gallery Entry Point

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
│  │  ✨ También puedes:  [Diseñar con IA →]  ← PURPLE GRADIENT BUTTON   │   │
│  │  Describe tu negocio y la IA generará diseños personalizados.       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  CATEGORÍAS:  [Todas]  [Café]  [Retail]  [Gym]  [Salón]  [Hotel]   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐           │
│  │ ┌──────────────┐ │ │ ┌──────────────┐ │ │ ┌──────────────┐ │           │
│  │ │  ☕ CAFÉ     │ │ │ │  🛍️ RETAIL   │ │ │ │  💪 GYM      │ │           │
│  │ │  ┌────────┐  │ │ │ │  ┌────────┐  │ │ │ │  ┌────────┐  │ │           │
│  │ │  │[PASS]  │  │ │ │ │  │[PASS]  │  │ │ │ │  │[PASS]  │  │ │           │
│  │ │  │preview │  │ │ │ │  │preview │  │ │ │ │  │preview │  │ │           │
│  │ │  └────────┘  │ │ │ │  └────────┘  │ │ │ │  └────────┘  │ │           │
│  │ │              │ │ │ │              │ │ │ │              │ │           │
│  │ │  Café Clásico│ │ │ │  Retail Mod. │ │ │ │  Gym Pro     │ │           │
│  │ │  Sellos: ☕×10│ │ │ │  Cashback 5% │ │ │ │  VIP Oro     │ │           │
│  │ │  [Usar]      │ │ │ │  [Usar]      │ │ │ │  [Usar]      │ │           │
│  │ └──────────────┘ │ │ └──────────────┘ │ │ └──────────────┘ │           │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘           │
│                                                                             │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐           │
│  │ ┌──────────────┐ │ │ ┌──────────────┐ │ │ ┌──────────────┐ │           │
│  │ │  ✂️ SALÓN    │ │ │ │  👑 VIP      │ │ │ │  🏢 CORP     │ │           │
│  │ │  ┌────────┐  │ │ │ │  ┌────────┐  │ │ │ │  ┌────────┐  │ │           │
│  │ │  │[PASS]  │  │ │ │ │  │[PASS]  │  │ │ │ │  │[PASS]  │  │ │           │
│  │ │  │preview │  │ │ │ │  │preview │  │ │ │ │  │preview │  │ │           │
│  │ │  └────────┘  │ │ │ │  └────────┘  │ │ │ │  └────────┘  │ │           │
│  │ │              │ │ │ │              │ │ │ │              │ │           │
│  │ │  Salón Elite │ │ │ │  VIP Platino │ │ │ │  Corporate   │ │           │
│  │ │  Cupón 20%   │ │ │ │  Membresía   │ │ │ │  Desc. 15%   │ │           │
│  │ │  [Usar]      │ │ │ │  [Usar]      │ │ │ │  [Usar]      │ │           │
│  │ └──────────────┘ │ │ └──────────────┘ │ │ └──────────────┘ │           │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘           │
│                                                                             │
│                     ┌─────────────────────────┐                            │
│                     │  ✏️ Empezar desde cero  │                            │
│                     └─────────────────────────┘                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Template Card Specifications:**

| Element | Behavior |
|---------|----------|
| Card hover | Scale 1.03, shadow-lg, border highlight |
| Card click | Opens preview modal (large iPhone + Pixel side by side) |
| "Usar" button | Applies template, transitions to Studio with slide animation |
| Preview thumbnail | Shows BOTH Apple (with visual signature) AND Google previews mini |
| Stamp indicator | Template cards for stamp type show stamp icon (e.g., "☕×10") |

---

## 3. AI Assistant Modal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ✨ Diseña tu tarjeta con inteligencia artificial                    [✕]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Describe tu negocio:                                               │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ Gimnasio de CrossFit con ambiente industrial...              │   │   │
│  │  │ colores negro mate, rojo y gris metálico                     │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  Sugerencias rápidas (haz click):                                   │   │
│  │  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────┐  │   │
│  │  │ "Café acogedor     │ │ "Salón elegante,   │ │ "Tienda tech   │  │   │
│  │  │  con tonos tierra" │ │  dorado y blanco"  │ │  moderna"      │  │   │
│  │  └────────────────────┘ └────────────────────┘ └────────────────┘  │   │
│  │                                                                     │   │
│  │  Tipo de tarjeta:  [Tarjeta de Sellos ▼]                           │   │
│  │  Industria:        [Gimnasio ▼]                                     │   │
│  │                                                                     │   │
│  │              ┌──────────────────────┐                               │   │
│  │              │  ✨ Generar diseños  │                               │   │
│  │              └──────────────────────┘                               │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  RESULTADOS (aparecen después de generar):                                  │
│                                                                             │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐           │
│  │  ┌────────────┐  │ │  ┌────────────┐  │ │  ┌────────────┐  │           │
│  │  │ [iPhone]   │  │ │  │ [iPhone]   │  │ │  │ [iPhone]   │  │           │
│  │  │ Industrial │  │ │  │ Minimal    │  │ │  │ Energético │  │           │
│  │  │ Oscuro     │  │ │  │ Rojo       │  │ │  │ Neon       │  │           │
│  │  └────────────┘  │ │  └────────────┘  │ │  └────────────┘  │           │
│  │  [Pixel preview] │ │  [Pixel preview] │ │  [Pixel preview] │           │
│  │  Paleta: ████    │ │  Paleta: ████    │ │  Paleta: ████    │           │
│  │  Score: 9.1/10   │ │  Score: 8.7/10   │ │  Score: 8.9/10   │           │
│  │  [Seleccionar]   │ │  [Seleccionar]   │ │  [Seleccionar]   │           │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Main Studio Screen — Desktop

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TOOLBAR                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  [↩ Undo] [↪ Redo]    [🍎 Apple] [🤖 Google] [👁️ Both]    [−] [100%] [+]    [🎨 Tmpl] │
│                                                                                         │
│  [💾 Guardar] [⬇️ Exportar]        ████████░░ 8.2/10    [✨ Diseñar con IA] ← PURPLE  │
│                                                                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌──────────────────────────────────────────────────┐  ┌──────────────────────────────┐ │
│  │                                                  │  │ SIDEBAR                      │ │
│  │         CANVAS (Dual Platform Preview)           │  │ ┌──────────────────────────┐ │ │
│  │                                                  │  │ │ [🖼️ Img] [🎯 Sellos]    │ │ │
│  │    ┌────────────────────────────────────┐       │  │ │ [📝 Cont] [📄 Reverso]   │ │ │
│  │    │  [🎨 FRENTE] [📄 REVERSO] ← FLIP   │       │  │ │ [📊 Bar] [🎨 Cols] [⚙️]  │ │ │
│  │    │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │       │  │ └──────────────────────────┘ │ │
│  │    │                                    │       │  │                              │ │
│  │    │    🍎 iPhone 15 Pro Frame           │       │  │                              │ │
│  │    │  ┌──────────────────────────────┐   │       │  │ └──────────────────────────┘ │ │
│  │    │  │  [LOGO]  Café Central        │   │       │  │                              │ │
│  │    │  │                              │   │       │  │ ┌──────────────────────────┐ │ │
│  │    │  │  ┌────────────────────────┐  │   │       │  │ │ 📤 LOGO DEL NEGOCIO      │ │ │
│  │    │  │  │    STRIP IMAGE         │  │   │       │  │ │ ┌────────────────────┐   │ │ │
│  │    │  │  │  (coffee beans photo)  │  │   │       │  │ │ │ 📤 Arrastra tu     │   │ │ │
│  │    │  │  │  375×123pt Apple       │  │   │       │  │ │ │    logo aquí       │   │ │ │
│  │    │  │  └────────────────────────┘  │   │       │  │ │ │    o haz click     │   │ │ │
│  │    │  │                              │   │       │  │ │ └────────────────────┘   │ │ │
│  │    │  │  SELLOS:  3 / 10             │   │       │  │ │ [Apple ▭] [Google ●]   │ │ │
│  │    │  │                              │   │       │  │ │ 160×50pt   660×660px   │ │ │
│  │    │  │  ☕ ☕ ☕ ○ ○ ○ ○ ○ ○ ○      │   │       │  │ │                        │ │ │
│  │    │  │  (custom stamp icons)        │   │       │  │ │ [✓] Auto @2x/@3x       │ │ │
│  │    │  │                              │   │       │  │ └──────────────────────────┘ │ │
│  │    │  │  RECOMPENSA: Café gratis     │   │       │  │                              │ │
│  │    │  │  CLIENTE: Juan Pérez         │   │       │  │ ┌──────────────────────────┐ │ │
│  │    │  │                              │   │       │  │ │ 🖼️ IMAGEN PRINCIPAL      │ │ │
│  │    │  │  ┌──────────────────────────┐│   │       │  │ │ (Strip / Hero)           │ │ │
│  │    │  │  │ [QR]  0000 0000 0000   ││   │       │  │ │ ┌────────────────────┐   │ │ │
│  │    │  │  └──────────────────────────┘│   │       │  │ │ │ 📤 Imagen          │   │ │ │
│  │    │  └──────────────────────────────┘   │       │  │ │ │    panorámica      │   │ │ │
│  │    │                                     │       │  │ │ └────────────────────┘   │ │ │
│  │    │    🤖 Pixel 8 Frame (smaller)       │       │  │ │ Apple: 375×123pt        │ │ │
│  │    │  ┌──────────────────────────────┐   │       │  │ │ Google: 1032×336px      │ │ │
│  │    │  │  [LOGO circle]               │   │       │  │ └──────────────────────────┘ │ │
│  │    │  │  HERO IMAGE (banner)         │   │       │  │                              │ │
│  │    │  │  Google Loyalty preview      │   │       │  │ ┌──────────────────────────┐ │ │
│  │    │  │  (cardTemplateOverride rows) │   │       │  │ │ 🎯 CONFIGURACIÓN DE      │ │ │
│  │    │  │                              │   │       │  │ │    SELLOS                │ │ │
│  │    │  │  [QR]                        │   │       │  │ │                          │ │ │
│  │    │  └──────────────────────────────┘   │       │  │ │ Forma del sello:         │ │ │
│  │    └────────────────────────────────────┘       │  │ │ [●] Círculo  [○] Cuadro │ │ │
│  │                                                  │  │ │ [○] Estrella [○] Corazón│ │ │
│  │  [−] 100% [+]    [Grid ▢]  [Both 👁️]            │  │ │ [○] Taza ☕  [○] Custom  │ │ │
│  │                                                  │  │ │                          │ │ │
│  │                                                  │  │ │ Icono del sello:         │ │ │
│  │                                                  │  │ │ ┌────┐ ┌────┐ ┌────┐     │ │ │
│  │                                                  │  │ │ │ ☕ │ │ ⭐ │ │ 🍩 │     │ │ │
│  │                                                  │  │ │ └────┘ └────┘ └────┘     │ │ │
│  │                                                  │  │ │ [📤 Subir custom]        │ │ │
│  │                                                  │  │ │                          │ │ │
│  │                                                  │  │ │ Color sello vacío: ████  │ │ │
│  │                                                  │  │ │ Color sello lleno: ████  │ │ │
│  │                                                  │  │ │                          │ │ │
│  │                                                  │  │ │ Total sellos: [10 ▼]     │ │ │
│  │                                                  │  │ │ Disposición: [Fila ▼]    │ │ │
│  │                                                  │  │ └──────────────────────────┘ │ │
│  │                                                  │  │                              │ │
│  │                                                  │  │ ┌──────────────────────────┐ │ │
│  │                                                  │  │ │ 📊 DESIGN SCORE          │ │ │
│  │                                                  │  │ │ ████████░░ 8.2/10        │ │ │
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

**Key Optimizations from Platform Knowledge:**

| Element | Before (v1) | After (v2 Optimized) | Rationale |
|---------|-------------|---------------------|-----------|
| Apple preview | Generic rectangle | **iPhone 15 Pro frame with rounded top** matching pass style visual signature | Apple passes have distinct top edges |
| Google preview | Generic rectangle | **Pixel 8 frame** showing actual cardTemplateOverride rows | Google uses row-based layout |
| Image specs | "160×50pt (320×100px @2x)" shown | **"Logo del negocio"** with visual crop preview only | No technical jargon |
| Stamp display | Text only "3/10" | **Visual stamp grid with custom icons** | Visual feedback for stamp cards |
| Sidebar tabs | Images, Content, Barcode, Colors | **Dynamic 6th tab per card type** (Sellos, Puntos, VIP, etc.) | Card-type-specific config |
| Platform toggle | Segmented control | **Visual device frames** with platform badges | Clearer platform distinction |

---

## 5. Main Studio Screen — Mobile

```
┌─────────────────────────────────────────┐
│ Toolbar (compact)                       │
│ [↩] [↪] [🍎|🤖] [✨ IA] [100%]        │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │      CANVAS (single preview)    │   │
│  │  ┌──────────────────────────┐   │   │
│  │  │    [iPhone 15 Pro]       │   │   │
│  │  │    ┌────────────────┐    │   │   │
│  │  │    │ [LOGO]  Café   │    │   │   │
│  │  │    │ ┌────────────┐ │    │   │   │
│  │  │    │ │ STRIP IMG  │ │    │   │   │
│  │  │    │ └────────────┘ │    │   │   │
│  │  │    │ SELLOS: 3/10   │    │   │   │
│  │  │    │ ☕ ☕ ☕ ○ ○ ○ │    │   │   │
│  │  │    │ [QR]           │    │   │   │
│  │  │    └────────────────┘    │   │   │
│  │  │    (swipe ←→ platform)   │   │   │
│  │  └──────────────────────────┘   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ○ ● ○  (platform indicator dots)      │
│                                         │
├─────────────────────────────────────────┤
│ Bottom Sheet (draggable)                │
│ ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ │
│ [🖼️ Img] [🎯 Sellos] [📝 Cont] [🎨 Col]│
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                       │
│  📤 LOGO DEL NEGOCIO                  │
│  ┌────────────────────────────────┐   │
│  │      [Upload Zone]             │   │
│  └────────────────────────────────┘   │
│                                       │
│  🎯 CONFIGURACIÓN DE SELLOS          │
│  Forma: [● Círculo] [○ Cuadro]       │
│  Icono: [☕] [⭐] [🍩] [📤]           │
│  Color: ████ vacío / ████ lleno      │
│                                       │
│  [Drag up ↑ to expand fully]          │
│                                       │
└─────────────────────────────────────────┘
```

---

## 6. Toolbar Specification

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TOOLBAR                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ROW 1:                                                                                 │
│  [↩ Undo] [↪ Redo]    [🍎 Apple] [🤖 Google] [👁️ Both]    [−] [100%] [+]            │
│                                                                                         │
│  ROW 2:                                                                                 │
│  [🎨 Templates] [💾 Guardar] [⬇️ Exportar]  [🔄 Frente/Reverso]  ████ Score: 8.2/10 │
│                                                                                         │
│  ROW 3 (RIGHT-ALIGNED):                                                                │
│  ┌────────────────────────────────────────────────────────┐                            │
│  │  ✨ Diseñar con IA  ← PURPLE GRADIENT                  │                            │
│  │  bg-gradient-to-r from-violet-600 to-indigo-400       │                            │
│  │  Sparkles icon, white text, rounded-xl                │                            │
│  └────────────────────────────────────────────────────────┘                            │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

| Element | Spec | States |
|---------|------|--------|
| **Undo** | IconButton, ↩ | Disabled when history empty |
| **Redo** | IconButton, ↪ | Disabled when redo stack empty |
| **Platform Toggle** | SegmentedControl | Apple (shows iPhone frame) / Google (shows Pixel frame) / Both |
| **Flip Toggle** | SegmentedControl | Frente (shows front of pass) / Reverso (shows back/details) |
| **Zoom** | − / 100% / + | Range 50%-200% |
| **Templates** | Button | Opens template gallery modal |
| **Save** | Button | Saves as draft, toast confirmation |
| **Export** | Button | Downloads .pkpass (Apple test) or JWT link (Google test) |
| **✨ AI Button** | **Primary CTA** | Purple gradient, sparkles icon, pulse animation on first visit |
| **Design Score** | Progress bar + text | Green (≥9) / Blue (7-8) / Yellow (5-6) / Red (<5) |

---

## 7. Canvas Interactions

| Interaction | Behavior |
|-------------|----------|
| **Click empty canvas** | Deselects all layers |
| **Click layer** | Selects layer, shows blue border, resize handles, rotation handle |
| **Drag selected layer** | Follows cursor, snap-to-grid optional, alignment guides |
| **Drag resize handle** | Resizes from edge/corner, Shift = maintain aspect ratio |
| **Double-click text layer** | Inline editing mode |
| **Right-click layer** | Context menu: Duplicate, Lock, Hide, Bring to Front, Send to Back, Delete |
| **Click stamp icon** | Opens stamp icon picker |
| **Scroll (wheel)** | Pans canvas when zoomed |
| **Pinch (touch)** | Zoom in/out |
| **Swipe left/right** | Switch between Apple/Google preview (mobile) |

---

## 8. Sidebar Tabs

### 8.1 Images Tab

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
│  │  │              Formatos: PNG, JPG, WebP                   │    │   │
│  │  │              Tamaño máximo: 5 MB                        │    │   │
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
│  │  [✓] Auto-generar @2x y @3x para Apple                         │   │
│  │                                                                  │   │
│  │  [🗑️ Eliminar]  [🔄 Reemplazar]  [✨ Mejorar con IA]           │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🖼️ IMAGEN PRINCIPAL (Strip / Hero)                              │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │              [Upload Zone - Wide Format]                │    │   │
│  │  │         📤 Arrastra una imagen panorámica              │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  │  Apple: Banner detrás de campos (375×123pt)                    │   │
│  │  Google: Banner superior (1032×336px)                          │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🎨 IMÁGENES ADICIONALES                                         │   │
│  │                                                                  │   │
│  │  [+ Icono Apple] — Lock screen y notificaciones                 │   │
│  │      29×29pt, mostrado en notificaciones                        │   │
│  │                                                                  │   │
│  │  [+ Miniatura] — Solo Apple Generic / Event Ticket              │   │
│  │      90×90pt, junto a los campos                                │   │
│  │                                                                  │   │
│  │  [+ Fondo] — Solo Apple Event Ticket                            │   │
│  │      180×220pt, imagen de fondo difuminada                      │   │
│  │                                                                  │   │
│  │  [+ Wide Logo] — Solo Google Wallet                             │   │
│  │      1032×150px, logo extendido                                 │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Card-Type Tab (Dynamic per Type)

**For STAMP cards:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR: SELLOS (🎯) — Solo para Tarjetas de Sellos                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🎯 CONFIGURACIÓN DE SELLOS                                      │   │
│  │                                                                  │   │
│  │  Forma del sello vacío:                                          │   │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                    │   │
│  │  │ ●  │ │ ■  │ │ ★  │ │ ♥  │ │ ⬡  │ │ ☕ │                    │   │
│  │  │Circ│ │Cdrd│ │Star│ │Heart│ │Hex │ │Cstm│                    │   │
│  │  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘                    │   │
│  │                                                                  │   │
│  │  Icono del sello (vacío):                                        │   │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐     │   │
│  │  │ ☕ │ │ ⭐ │ │ 🍩 │ │ 🍪 │ │ 🧁 │ │ 🍕 │ │ 🍔 │ │ 🥤 │     │   │
│  │  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘     │   │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐     │   │
│  │  │ 🍺 │ │ 🥐 │ │ 🍰 │ │ 🏋️ │ │ ✂️ │ │ 💇 │ │ 🛍️ │ │ 📤 │     │   │
│  │  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘     │   │
│  │                                                                  │   │
│  │  [📤 Subir imagen personalizada]                                 │   │
│  │  Formatos: PNG, SVG. Tamaño: 128×128px                          │   │
│  │                                                                  │   │
│  │  Icono del sello (lleno):                                        │   │
│  │  [Mismo selector con iconos llenos]                              │   │
│  │                                                                  │   │
│  │  Color sello vacío:  ████ #E0E0E0  [Picker]                      │   │
│  │  Color sello lleno:  ████ #FF6B35  [Picker]                      │   │
│  │                                                                  │   │
│  │  Total de sellos:     [ 10 ▼]  (5, 6, 8, 10, 12)                │   │
│  │  Disposición:         [ Fila ▼]  (Fila, 2×N, Disperso)          │   │
│  │                                                                  │   │
│  │  Animación al completar: [ Destello ▼]                           │   │
│  │  (Destello, Pop, Confeti, Brillo)                                │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │ VISTA PREVIA DE SELLOS                                  │    │   │
│  │  │ ☕ ☕ ☕ ○ ○ ○ ○ ○ ○ ○    ← clic para probar           │    │   │
│  │  │ (3 llenos, 7 vacíos)                                    │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**For CASHBACK cards:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR: PUNTOS & NIVELES (🏆) — Solo para Cashback                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🏆 CONFIGURACIÓN DE PUNTOS                                      │   │
│  │                                                                  │   │
│  │  Icono de puntos:                                                │   │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                            │   │
│  │  │ 🪙 │ │ ⭐ │ │ 💎 │ │ 🔥 │ │ 📤 │                            │   │
│  │  │Coin│ │Star│ │Gem │ │Flame│ │Custom│                          │   │
│  │  └────┘ └────┘ └────┘ └────┘ └────┘                            │   │
│  │                                                                  │   │
│  │  Niveles de recompensa:                                          │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │ 🥉 Bronce    0 pts    5% cashback    ●───────○          │    │   │
│  │  │ 🥈 Plata   100 pts   10% cashback    ●●──────○          │    │   │
│  │  │ 🥇 Oro     300 pts   15% cashback    ●●●─────○          │    │   │
│  │  │ 💠 Platino 500 pts   20% cashback    ●●●●────○          │    │   │
│  │  │                                          [Editar niveles]│    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  │  Forma de insignia de nivel:                                     │   │
│  │  [●] Círculo  [○] Escudo  [○] Corona  [○] Estrella            │   │
│  │                                                                  │   │
│  │  Color de progreso: ████ #10B981                                │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**For VIP MEMBERSHIP cards:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR: MEMBRESÍA VIP (👑)                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  👑 CONFIGURACIÓN VIP                                            │   │
│  │                                                                  │   │
│  │  Icono de nivel:                                                 │   │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                            │   │
│  │  │ 👑 │ │ ⭐ │ │ 💎 │ │ 🏆 │ │ 📤 │                            │   │
│  │  │Crown│ │Star│ │Diam│ │Trophy│ │Custom│                        │   │
│  │  └────┘ └────┘ └────┘ └────┘ └────┘                            │   │
│  │                                                                  │   │
│  │  Insignia de miembro:                                            │   │
│  │  [●] Escudo  [○] Círculo  [○] Cresta  [○] Custom               │   │
│  │                                                                  │   │
│  │  Sello exclusivo:                                                │   │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐                                    │   │
│  │  │ ✨ │ │ 🔒 │ │ 👑 │ │ 📤 │                                    │   │
│  │  │Sparkle│ │Lock│ │Crown│ │Custom│                              │   │
│  │  └────┘ └────┘ └────┘ └────┘                                    │   │
│  │                                                                  │   │
│  │  Lista de beneficios:                                            │   │
│  │  [✓] Acceso 24/7        Icono: [🔓 ▼]                           │   │
│  │  [✓] Clases ilimitadas  Icono: [🏃 ▼]                           │   │
│  │  [✓] Spa & sauna        Icono: [🧖 ▼]                           │   │
│  │  [+] Añadir beneficio                                            │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.3 Content Tab

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR: CONTENT TAB                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🏷️ CAMPOS DE CABECERA — Máximo 3                                │   │
│  │  (Visibles incluso cuando el pase está en pila)                  │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │ [✓] Campo 1  [⋮⋮]                                      │    │   │
│  │  │ Etiqueta:  [SELLOS                    ]                 │    │   │
│  │  │ Valor:     [{stamp_count}/{stamps_required} ]           │    │   │
│  │  │ [📋 Plantillas ▼]  [✓] Dinámico  [🗑️]                  │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  │  [+ Añadir campo de cabecera] (máximo 3)                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  ⭐ CAMPO PRINCIPAL — 1 campo grande y prominente                │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │ [✓] Mostrar campo principal                             │    │   │
│  │  │ Etiqueta:  [PROGRESO                  ]                 │    │   │
│  │  │ Valor:     [{stamp_display}           ]                 │    │   │
│  │  │ Alineación: [ Izquierda ●] [Centro ○] [Derecha ○]      │    │   │
│  │  │ [✓] Dinámico                                            │    │   │
│  │  │ [✓] Enviar notificación: [¡Nuevo sello! ]              │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  📋 CAMPOS SECUNDARIOS — Hasta 4 (2 en Apple si barcode rect.)   │   │
│  │                                                                  │   │
│  │  [⋮⋮] [✓] RECOMPENSA: Café gratis    [🍎✓] [🤖✓]  [🗑️]        │   │
│  │  [⋮⋮] [✓] CLIENTE: Juan Pérez        [🍎✓] [🤖✓]  [🗑️]        │   │
│  │                                                                  │   │
│  │  [+ Añadir campo secundario]                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🔍 CAMPOS AUXILIARES — Hasta 4 (2 en Apple si barcode rect.)    │   │
│  │                                                                  │   │
│  │  [⋮⋮] [✓] NIVEL: Bronce            [🍎✓] [🤖✓]  [🗑️]          │   │
│  │                                                                  │   │
│  │  [+ Añadir campo auxiliar]                                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  📄 DETALLES / TRASERO — Sin límite                              │   │
│  │  (Apple: campos traseros | Google: detailsTemplateOverride)      │   │
│  │                                                                  │   │
│  │  [✓] Términos y condiciones                                    │   │
│  │  [✓] Contacto: soporte@negocio.com                             │   │
│  │                                                                  │   │
│  │  [+ Añadir campo de detalles]                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.4 Barcode Tab

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
│  │  ⚠️ PDF417 y Code 128 son rectangulares. En Apple Coupon/       │   │
│  │     StoreCard, esto reduce el espacio para campos a 4 total.    │   │
│  │                                                                  │   │
│  │  [Data Matrix] — Solo Google Wallet                              │   │
│  │                                                                  │   │
│  │  [Rotating Barcode] — Solo Google Wallet (seguridad extra)      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  📝 CONTENIDO DEL CÓDIGO                                         │   │
│  │  [✓] ID de cliente: {customer_id}                               │   │
│  │  [✓] ID de programa: {program_id}                               │   │
│  │  [✓] Timestamp                                                  │   │
│  │  Texto legible: [0000 0000 0000          ]                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  👁️ VISTA PREVIA                                                 │   │
│  │           ┌──────────────┐                                      │   │
│  │           │ ▓▓▓▓▓▓▓▓▓▓▓▓ │                                      │   │
│  │           │ ▓▓  ▓▓▓▓  ▓▓ │                                      │   │
│  │           │ ▓▓▓▓▓▓▓▓▓▓▓▓ │                                      │   │
│  │           └──────────────┘                                      │   │
│  │              0000 0000 0000                                      │   │
│  │  [📱 Probar en dispositivo]                                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.5 Colors Tab

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR: COLORS TAB                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🎨 PALETA DE COLORES                                            │   │
│  │                                                                  │   │
│  │  Fondo:     ████████  #1A1A2E  [Color picker ▼]                 │   │
│  │  Texto:     ████████  #FFFFFF  [Color picker ▼]                 │   │
│  │  Etiquetas: ████████  #FFFFFF  [Color picker ▼]                 │   │
│  │  Acento:    ████████  #E2E8F0  [Color picker ▼]                 │   │
│  │                                                                  │   │
│  │  Apple:  rgb(255,255,255)  →  Google: #FFFFFF                   │   │
│  │  Conversión automática entre formatos                            │   │
│  │                                                                  │   │
│  │  📊 CONTRASTE                                                    │   │
│  │  Texto vs Fondo:     ████████░░  12.5:1  ✓ AAA                  │   │
│  │  Etiquetas vs Fondo: ████████░░  12.1:1  ✓ AAA                  │   │
│  │                                                                  │   │
│  │  [✨ Sugerir colores con IA]                                      │   │
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

### 8.6 Advanced Tab

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR: ADVANCED (⚙️)                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🍎 APPLE WALLET — Exclusivo                                     │   │
│  │                                                                  │   │
│  │  Icono para notificaciones:                                      │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │ [Upload: 29×29pt, aparece en lock screen]               │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  │  Descripción (accesibilidad):                                    │   │
│  │  [Tarjeta de sellos de Café Central            ]                │   │
│  │                                                                  │   │
│  │  [✓] Prohibir compartir (iOS 11+)                               │   │
│  │  [  ] Suprimir brillo del strip (default: sí)                   │   │
│  │                                                                  │   │
│  │  ────────────────────────────────────────────────────────────    │   │
│  │                                                                  │   │
│  │  📍 UBICACIONES Y BEACONS                                        │   │
│  │  [+ Añadir ubicación]  [+ Añadir beacon]                        │   │
│  │                                                                  │   │
│  │  ────────────────────────────────────────────────────────────    │   │
│  │                                                                  │   │
│  │  📲 ENLACE A APP                                                 │   │
│  │  URL de lanzamiento: [https://...              ]                │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🤖 GOOGLE WALLET — Exclusivo                                    │   │
│  │                                                                  │   │
│  │  [✓] Smart Tap / NFC (requiere certificación)                   │   │
│  │                                                                  │   │
│  │  Enlace a app (Google Play):                                     │   │
│  │  [com.company.app                              ]                │   │
│  │                                                                  │   │
│  │  [  ] Deshabilitar capturas de pantalla                          │   │
│  │                                                                  │   │
│  │  ────────────────────────────────────────────────────────────    │   │
│  │                                                                  │   │
│  │  🎟️ AGRUPAR TARJETAS                                             │   │
│  │  ID de grupo: [summer_2024        ]                             │   │
│  │  Orden: [1 ▼]                                                   │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 8.7 Back / Details Tab (Reverso)

**This tab is ONLY visible when the user toggles to "Reverso"** (back view) in the canvas.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR: REVERSO TAB                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  📄 CAMPOS DEL REVERSO — Sin límite                              │   │
│  │  (Apple: backFields | Google: textModulesData en details)        │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │ [⋮⋮] Campo 1  [🗑️]                                    │    │   │
│  │  │ Etiqueta:  [TÉRMINOS Y CONDICIONES      ]               │    │   │
│  │  │ Valor:     [Participa acumulando sellos...]             │    │   │
│  │  │                                                          │    │   │
│  │  │ [✓] Convertir en enlace clickeable                      │    │   │
│  │  │    URL:     [https://...                   ]            │    │   │
│  │  │    Texto:   [Leer términos completos       ]            │    │   │
│  │  │                                                          │    │   │
│  │  │ 🍎 Solo Apple: [✓] attributedValue                      │    │   │
│  │  │ 🤖 Solo Google: [✓] linksModuleData                      │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │ [⋮⋮] Campo 2  [🗑️]                                    │    │   │
│  │  │ Etiqueta:  [CONTACTO                    ]               │    │   │
│  │  │ Valor:     [contacto@cafecentral.com    ]               │    │   │
│  │  │                                                          │    │   │
│  │  │ [✓] Convertir en enlace                                 │    │   │
│  │  │    Tipo: [Email ●] [Teléfono ○] [Web ○]                │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │ [⋮⋮] Campo 3  [🗑️]                                    │    │   │
│  │  │ Etiqueta:  [REGLAS DEL PROGRAMA         ]               │    │   │
│  │  │ Valor:     [• 1 sello por compra >$5    ]               │    │   │
│  │  │            [• Recompensa: café gratis     ]               │    │   │
│  │  │            [• No acumulable con otras     ]               │    │   │
│  │  │            [  promociones                 ]               │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  │  [+ Añadir campo del reverso]                                   │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🔗 ENLACES RÁPIDOS                                              │   │
│  │  (Aparecen como botones en Google, links en Apple)              │   │
│  │                                                                  │   │
│  │  [✓] Sitio Web:     [https://cafecentral.com       ]           │   │
│  │  [✓] Teléfono:      [+1-234-567-8900               ]           │   │
│  │  [✓] Email:         [contacto@cafecentral.com      ]           │   │
│  │  [  ] Instagram:    [                                ]           │   │
│  │  [  ] Facebook:     [                                ]           │   │
│  │                                                                  │   │
│  │  [+ Añadir enlace]                                              │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  📱 ENLACE A LA APP                                              │   │
│  │                                                                  │   │
│  │  [✓] Añadir botón "Abrir en la app"                             │   │
│  │                                                                  │   │
│  │  Apple (appLaunchURL):                                           │   │
│  │  [https://loyallia.app/open?program=123            ]            │   │
│  │                                                                  │   │
│  │  Google (appLinkData):                                           │   │
│  │  Android: [com.loyallia.app                        ]            │   │
│  │  iOS:     [https://apps.apple.com/app/id...        ]            │   │
│  │  Web:     [https://loyallia.app                    ]            │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🎨 IMÁGENES EN DETALLES (Google Wallet exclusivo)               │   │
│  │                                                                  │   │
│  │  [+ Añadir imagen a la vista de detalles]                       │   │
│  │  ⚠️ Apple Wallet no soporta imágenes en el reverso              │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Back Tab Rules:**

| Rule | Behavior |
|------|----------|
| **Visibility** | Only shown when canvas is in "Reverso" mode |
| **Field count** | Unlimited (both platforms support unlimited back fields) |
| **Link detection** | Auto-detects email, phone, URL patterns and suggests link conversion |
| **Smart links** | `mailto:`, `tel:`, `https://` auto-formatting |
| **Platform badges** | Each field shows 🍎/🤖 toggles for platform-specific visibility |
| **Default content** | Every template includes: Terms, Contact, Rules (auto-populated) |

---

## 9. Platform-Specific Preview Behaviors

### Apple Wallet Preview

| Pass Style | Visual Signature | Top Edge | Images Shown |
|-----------|-----------------|----------|-------------|
| **storeCard** (stamp, cashback, gift) | Rounded top, plain | ─────── | logo, strip, icon |
| **coupon** (coupon, discount) | Perforated top edge | ﹏﹏﹏﹏﹏ | logo, strip, icon |
| **generic** (affiliate, vip, referral) | Rounded top, plain | ─────── | logo, icon, thumbnail |
| **eventTicket** | Small notch/cutout at top center | ╭─╮ | logo, icon, strip OR bg+thumb |

**Apple Preview Notes:**
- Strip image appears BEHIND primary fields (semi-transparent overlay)
- Logo is top-left, next to logoText
- Icon is NOT shown on pass face (only lock screen)
- Thumbnail appears top-right (generic/event only)
- Barcode at bottom

### Google Wallet Preview

| Pass Type | Layout | Images Shown |
|-----------|--------|-------------|
| **loyalty** (stamp, cashback, vip) | Hero banner + rows | logo, heroImage |
| **offer** (coupon, discount, referral) | Hero banner + rows | logo, heroImage |
| **giftCard** (gift_certificate) | Hero banner + balance | logo, heroImage, programLogo |
| **generic** (affiliate, corporate) | Hero banner + custom rows | logo, heroImage |

**Google Preview Notes:**
- Logo is circular, top-center
- Hero image is full-width banner at top
- Rows defined by cardTemplateOverride
- Barcode in cardBarcodeSectionDetails
- Details view via detailsTemplateOverride

---

## 10. Design Quality Score Panel

```
┌─────────────────────────────────────────┐
│ 📊 DESIGN SCORE                         │
├─────────────────────────────────────────┤
│                                         │
│  ██████████ 9.2/10  ✓ EXCELENTE        │
│                                         │
│  ✅ Contraste: 15.2:1 (AAA)            │
│  ✅ Logo presente                      │
│  ✅ Hero/Strip image configurada       │
│  ✅ Campo principal definido           │
│  ✅ Campos requeridos completos        │
│  ✅ Barcode configurado                │
│  ✅ Dimensiones de imagen correctas    │
│  ✅ Armonía de colores                 │
│  ⚠️  Compatibilidad plataformas: OK    │
│                                         │
│  [🔧 Ver sugerencias de mejora →]     │
│                                         │
└─────────────────────────────────────────┘
```

**Score Color Coding:**

| Score | Color | Label | Action |
|:-----:|:-----:|-------|--------|
| ≥ 9.0 | 🟢 Green | Excelente | Ready to publish |
| 7.0-8.9 | 🔵 Blue | Bueno | Minor improvements suggested |
| 5.0-6.9 | 🟡 Yellow | Aceptable | Several improvements needed |
| < 5.0 | 🔴 Red | Necesita trabajo | Major issues must be fixed |

---

## 11. Keyboard Shortcuts

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
| `B` | Toggle front / back (Reverso) |
| `Escape` | Deselect / Cancel / Close modal |
| `Ctrl/Cmd + S` | Save draft |
| `Ctrl/Cmd + E` | Export |
| `Ctrl/Cmd + I` | Open AI assistant |
| `Tab` | Next field |
| `Shift + Tab` | Previous field |

---

*End of Document SRS-003 v2*
