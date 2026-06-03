# SRS-005: User Journeys & Interaction Flows

> **ISO/IEC/IEEE 29148:2018 — Software Requirements Specification**
> Document ID: SRS-LOY-WPS-005 | Version: 1.0.0-Draft

---

## Table of Contents

1. [Journey Map Overview](#1-journey-map-overview)
2. [Primary Journeys (Happy Paths)](#2-primary-journeys-happy-paths)
   - [J-01: Template → Studio → Save](#j-01-template--studio--save)
   - [J-02: AI-Generated Design](#j-02-ai-generated-design)
   - [J-03: Blank Canvas → Manual Design](#j-03-blank-canvas--manual-design)
   - [J-04: Edit Existing Pass Design](#j-04-edit-existing-pass-design)
3. [Alternative Journeys](#3-alternative-journeys)
   - [J-05: Template Preview Before Apply](#j-05-template-preview-before-apply)
   - [J-06: AI Suggestion on Existing Design](#j-06-ai-suggestion-on-existing-design)
   - [J-07: Import from v1 Designer](#j-07-import-from-v1-designer)
   - [J-08: Mobile-First Design](#j-08-mobile-first-design)
4. [Feature-Specific Journeys](#4-feature-specific-journeys)
   - [J-09: Image Upload & Processing](#j-09-image-upload--processing)
   - [J-10: Field Configuration](#j-10-field-configuration)
   - [J-11: Color & Theme Configuration](#j-11-color--theme-configuration)
   - [J-12: Barcode Configuration](#j-12-barcode-configuration)
   - [J-13: Design Quality Fix Flow](#j-13-design-quality-fix-flow)
5. [Edge Cases & Recovery](#5-edge-cases--recovery)
   - [J-14: Session Recovery](#j-14-session-recovery)
   - [J-15: Browser Crash Recovery](#j-15-browser-crash-recovery)
   - [J-16: Invalid Image Handling](#j-16-invalid-image-handling)
   - [J-17: Platform-Specific Conflict](#j-17-platform-specific-conflict)
6. [Cross-Platform Journeys](#6-cross-platform-journeys)
   - [J-18: Apple-Only Features](#j-18-apple-only-features)
   - [J-19: Google-Only Features](#j-19-google-only-features)
   - [J-20: Dual-Platform Balancing](#j-20-dual-platform-balancing)
7. [User Persona Journeys](#7-user-persona-journeys)
   - [J-21: María — Café Owner (Non-Technical)](#j-21-maría--café-owner-non-technical)
   - [J-22: Carlos — Gym Manager (Semi-Technical)](#j-22-carlos--gym-manager-semi-technical)
   - [J-23: Ana — Marketing Agency (Power User)](#j-23-ana--marketing-agency-power-user)

---

## 1. Journey Map Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WALLET PASS STUDIO FLOW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐           │
│   │  ENTRY   │───→│ TEMPLATE │───→│  STUDIO  │───→│  SAVE    │           │
│   │  POINT   │    │ GALLERY  │    │  CANVAS  │    │  EXPORT  │           │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘           │
│        │               │               │               │                  │
│        │               │               │               │                  │
│   ┌────┴────┐     ┌────┴────┐     ┌────┴────┐     ┌────┴────┐           │
│   │• Wizard │     │• Browse │     │• Images │     │• Draft  │           │
│   │• Edit   │     │• Search │     │• Fields │     │• Publish│           │
│   │• Clone  │     │• Filter │     │• Colors │     │• Test   │           │
│   │         │     │• AI Gen │     │• Barcode│     │         │           │
│   │         │     │• Blank  │     │• Layout │     │         │           │
│   └─────────┘     └─────────┘     └─────────┘     └─────────┘           │
│                                                                             │
│   ════════════════════════════════════════════════════════════════════     │
│   PARALLEL PATHS: Undo/Redo │ Auto-Save │ AI Assistant │ Preview Toggle   │
│   ════════════════════════════════════════════════════════════════════     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Primary Journeys (Happy Paths)

---

### J-01: Template → Studio → Save

**User Goal:** Create a professional wallet pass quickly using a template.

**Persona:** María, café owner, first time using the platform.

```
STEP 1: ENTRY — Program Wizard Step 2
├─ User has entered program name "Café Central"
├─ Selected card type: "stamp" (Tarjeta de Sellos)
├─ System shows: "Elige un diseño para tu tarjeta" with template gallery
└─ Entry point: Template Gallery (auto-shown for new programs)

STEP 2: TEMPLATE GALLERY
├─ Gallery shows filtered templates: Café category + Stamp card compatible
├─ Templates displayed: "Café Clásico", "Café Moderno", "Café Vintage"
├─ María clicks "Café Clásico" template card
├─ Modal opens showing template preview on both iPhone + Pixel
├─ Preview shows: Brown/coffee colors, coffee cup logo, stamp grid
├─ María clicks "Usar este diseño" button
└─ Gallery closes, Studio loads with template applied

STEP 3: STUDIO LOADS
├─ Canvas shows: iPhone 15 frame with café-themed pass
├─ Apple preview: storeCard style, strip image, 10 stamps layout
├─ Google preview: Loyalty class, hero image, points display
├─ Sidebar defaults to "Images" tab
├─ Toolbar shows Design Score: 9.2/10 (green)
└─ Auto-save initializes (design saved as draft)

STEP 4: QUICK CUSTOMIZATION (3 minutes)
├─ María clicks Logo upload zone
├─ Uploads her café logo (PNG, 800×800px)
├─ System auto-generates @2x/@3x for Apple, crops for Google circle
├─ Logo appears instantly on both previews
├─ Design Score updates: 9.5/10
├─ María clicks "Content" tab
├─ Changes primary field label from "Sellos" to "Tus Sellos"
├─ Changes reward from "Café gratis" to "Croissant gratis"
├─ Real-time preview updates on both platforms
└─ All changes auto-saved

STEP 5: REVIEW & SAVE
├─ María clicks "Siguiente" (bottom navigation)
├─ Confirmation modal: "¿Guardar diseño de tarjeta?"
├─ Option to "Guardar como plantilla" (for reuse)
├─ María clicks "Guardar y continuar"
├─ Design persisted to backend
├─ Redirected to Wizard Step 3 (Barcode configuration)
└─ SUCCESS ✓
```

**Duration:** ~5 minutes  
**Touchpoints:** 12  
**Decision points:** 3 (template choice, content edits, save confirmation)

---

### J-02: AI-Generated Design

**User Goal:** Let AI create a complete design from business description.

**Persona:** Carlos, gym owner, wants something unique.

```
STEP 1: ENTRY
├─ Carlos at Wizard Step 2, card type: "vip_membership"
├─ Sees template gallery but wants something custom
└─ Clicks "✨ Diseñar con IA" (purple gradient button, top-right)

STEP 2: AI ASSISTANT MODAL OPENS
├─ Modal title: "Diseña tu tarjeta con inteligencia artificial"
├─ Input field: "Describe tu negocio y el tipo de tarjeta que quieres"
├─ Placeholder: "Ej: Gimnasio de CrossFit con ambiente industrial, colores negro y naranja..."
├─ Below: Example prompts as clickable chips
│   ├─ "Café acogedor con tonos tierra"
│   ├─ "Salón de belleza elegante, dorado y blanco"
│   └─ "Tienda de tecnología moderna, azul eléctrico"
└─ Carlos types: "Gimnasio de pesas con ambiente hardcore, colores negro mate, rojo y gris metálico"

STEP 3: AI GENERATION (5-10 seconds)
├─ Loading state: "Analizando tu descripción..."
├─ Progress steps shown:
│   1. "Generando paleta de colores..."
│   2. "Seleccionando imágenes apropiadas..."
│   3. "Organizando campos para membresía VIP..."
│   4. "Aplicando diseño profesional..."
└─ Generation complete

STEP 4: AI RESULTS
├─ Modal shows 3 design variations side by side
├─ Each variation:
│   ├─ Mini preview (iPhone + Pixel)
│   ├─ Color palette swatches
│   ├─ Brief description: "Diseño 1: Industrial oscuro con acentos rojos"
│   └─ [Seleccionar] button
├─ Carlos clicks Design 1
└─ Modal closes, Studio loads with AI design

STEP 5: AI DESIGN LOADED
├─ Canvas shows: Dark metallic theme, red accents
├─ Apple: generic pass with thumbnail (dumbbell icon)
├─ Google: generic class with hero image (gym interior)
├─ Fields pre-configured for VIP membership:
│   ├─ Primary: "NIVEL VIP" / "Gold"
│   ├─ Secondary: "Miembro desde" / "Marzo 2024"
│   └─ Auxiliary: "Próximo pago" / "15/04/2024"
├─ Design Score: 8.7/10
├─ AI suggestion banner: "💡 Sugerencia: Añade tu logo para aumentar la puntuación a 9.5"
└─ Carlos clicks suggestion, uploads logo, score goes to 9.6

STEP 6: REFINE & SAVE
├─ Carlos makes minor text adjustments
├─ Clicks "Guardar"
├─ Design saved
└─ SUCCESS ✓
```

**Duration:** ~3-4 minutes (AI does heavy lifting)  
**Touchpoints:** 8  
**AI interaction points:** 4

---

### J-03: Blank Canvas → Manual Design

**User Goal:** Start from scratch for maximum control.

**Persona:** Ana, marketing agency, designing for a client.

```
STEP 1: ENTRY
├─ Ana at Wizard Step 2, card type: "gift_certificate"
└─ Clicks "✏️ Empezar desde cero" at bottom of template gallery

STEP 2: BLANK STUDIO LOADS
├─ Canvas shows empty pass frames (iPhone + Pixel)
├─ Default colors: White background, black text
├─ Sidebar shows "Images" tab with empty upload zones
├─ Toolbar shows Design Score: 3.0/10 (red, "Añade contenido")
├─ Smart defaults applied based on card type:
│   ├─ Gift certificate → suggests "Monto" primary field
│   ├─ Pre-selects storeCard (Apple) + giftCard (Google)
│   └─ Suggests QR code barcode
└─ Auto-save starts

STEP 3: ADD LOGO
├─ Ana uploads client logo
├─ System shows 3 crop options:
│   ├─ Apple rectangle (160×50pt)
│   ├─ Google circle (masked)
│   └─ Original (full)
├─ Ana adjusts crop for Apple, system auto-applies Google version
└─ Score: 5.0/10

STEP 4: ADD HERO IMAGE
├─ Uploads gift card background image
├─ System auto-detects dominant color → suggests background color
├─ Ana accepts suggestion
├─ Image appears on Apple strip + Google heroImage
└─ Score: 6.5/10

STEP 5: CONFIGURE FIELDS
├─ Clicks "Content" tab
├─ System shows field organizer with gift certificate defaults:
│   ├─ Header: "Regalo" / "$50.00"
│   ├─ Primary: "Valor" / "$50.00"
│   ├─ Secondary: "Para" / "[Nombre]"
│   └─ Auxiliary: "De" / "[Remitente]"
├─ Ana customizes labels to Spanish
├─ Sets fields as dynamic (will be personalized per user)
└─ Score: 7.8/10

STEP 6: COLORS
├─ Clicks "Colors" tab
├─ Adjusts background to client's brand color (#C41E3A)
├─ System auto-suggests text color (white, high contrast)
├─ Contrast ratio: 15.2:1 ✓ AAA
└─ Score: 8.5/10

STEP 7: BARCODE
├─ Clicks "Barcode" tab
├─ Selects QR Code
├─ Configures data: "GIFT-{gift_card_id}"
├─ Adds alternate text: "Tarjeta de Regalo $50"
└─ Score: 9.0/10

STEP 8: FINAL REVIEW
├─ Ana toggles platform preview:
│   ├─ Apple: storeCard with strip, fields, QR
│   ├─ Google: giftCardClass with hero, fields, QR
│   └─ Both: Side by side
├─ Clicks "Export" → downloads .pkpass for iOS testing
├─ Clicks "Guardar"
└─ SUCCESS ✓
```

**Duration:** ~10-15 minutes  
**Touchpoints:** 20+  
**Decision points:** 8

---

### J-04: Edit Existing Pass Design

**User Goal:** Modify an already-saved pass design.

**Persona:** María, updating her café stamp card for summer season.

```
STEP 1: ENTRY
├─ María goes to Program Settings → Wallet Pass tab
├─ Sees current design: "Café Clásico" (created 3 months ago)
├─ Clicks "Editar diseño" button
└─ Studio loads with existing design

STEP 2: STUDIO LOADS WITH EXISTING DESIGN
├─ All previous settings loaded: colors, images, fields, barcode
├─ Undo history starts fresh (editing mode)
├─ Toolbar shows: "Editando: Café Central — Tarjeta de Sellos"
├─ Design Score shows current: 9.2/10
└─ Sidebar defaults to last active tab (or Images)

STEP 3: SUMMER UPDATE
├─ María wants lighter colors for summer
├─ Clicks "Colors" tab
├─ Changes background from dark brown (#3E2723) to cream (#FFF8E1)
├─ Changes text from white to dark brown
├─ System warns: "⚠️ El contraste es bajo (2.8:1)"
├─ Auto-suggests darker text (#5D4037) for 7.2:1 ratio
├─ María accepts suggestion
└─ Score: 9.0/10

STEP 4: UPDATE HERO IMAGE
├─ Clicks "Images" tab
├─ Clicks "Reemplazar" on hero image
├─ Uploads summer-themed coffee image (iced coffee)
├─ New image appears on both previews
└─ Score: 9.3/10

STEP 5: UPDATE REWARD
├─ Clicks "Content" tab
├─ Changes reward from "Café gratis" to "Frappé gratis"
├─ Updates stamp requirement from 10 to 8 (summer promo)
└─ Score: 9.4/10

STEP 6: SAVE CHANGES
├─ Clicks "Guardar cambios"
├─ System asks: "¿Actualizar las tarjetas existentes de los clientes?"
│   ├─ [Sí, actualizar todas] — Push update to all saved passes
│   ├─ [Solo guardar diseño] — Design saved, existing passes unchanged
│   └─ [Cancelar]
├─ María selects "Solo guardar diseño" (new customers get new design)
├─ Changes persisted
└─ SUCCESS ✓
```

**Duration:** ~5 minutes  
**Touchpoints:** 10  
**Key feature:** Push update option for existing passes

---

## 3. Alternative Journeys

---

### J-05: Template Preview Before Apply

**Trigger:** User wants to see template in detail before committing.

```
├─ User clicks template card in gallery
├─ Instead of directly applying, modal opens
├─ Modal shows LARGE preview:
│   ├─ iPhone 15 Pro frame (left)
│   ├─ Pixel 8 Pro frame (right)
│   ├─ Both platforms rendered with template
│   └─ Template details: colors, fields, images included
├─ User can:
│   ├─ [Usar este diseño] → Apply and enter studio
│   ├─ [Ver en tamaño real] → Full-screen preview
│   ├─ [Ver colores] → Color palette breakdown
│   └─ [Cerrar] → Return to gallery
└─ User makes informed decision
```

---

### J-06: AI Suggestion on Existing Design

**Trigger:** User has a design but wants AI improvements.

```
├─ User in Studio with existing design (Score: 6.5/10)
├─ Clicks "✨ Diseñar con IA" toolbar button
├─ AI analyzes current design
├─ Modal shows suggestions:
│   ├─ "💡 El contraste del texto es bajo. ¿Cambiar a blanco?"
│   ├─ "💡 Falta un campo principal. ¿Añadir 'Puntos acumulados'?"
│   └─ "💡 La imagen hero es muy pequeña. ¿Usar una de mayor resolución?"
├─ User clicks any suggestion → AI applies change
├─ User can undo if unhappy
├─ Score updates in real-time
└─ User continues designing
```

---

### J-07: Import from v1 Designer

**Trigger:** User has an existing program created with old designer.

```
├─ User opens existing program settings
├─ System detects v1 design format
├─ Banner shown: "🎨 Nuevo diseñador disponible. ¿Migrar tu diseño?"
├─ User clicks "Migrar"
├─ Migration modal:
│   ├─ Shows v1 design preview (left)
│   ├─ Shows v2 migrated preview (right)
│   ├─ Lists what migrated:
│   │   ├─ ✅ Colores
│   │   ├─ ✅ Logo
│   │   ├─ ✅ Imagen principal
│   │   ├─ ✅ Campos de contenido
│   │   ├─ ⚠️ Barcode (reconfigurado)
│   │   └─ ❌ Posiciones personalizadas (usar layout por defecto)
│   └─ [Confirmar migración] / [Editar manualmente]
├─ User confirms
├─ Design migrated, studio opens in edit mode
├─ v1 design backed up (accessible via "Restaurar diseño anterior")
└─ User continues editing in v2
```

---

### J-08: Mobile-First Design

**Trigger:** User on tablet or phone.

```
├─ User opens Studio on iPad
├─ Layout adapts to tablet:
│   ├─ Canvas takes full width
│   ├─ Platform toggle: swipe left/right to switch Apple/Google
│   ├─ Sidebar becomes bottom sheet (draggable)
│   └─ Toolbar compacted to icon-only
├─ User designs primarily on Apple preview
├─ Swipes to check Google preview
├─ Bottom sheet expanded for field editing
├─ Collapsed to see full preview
├─ All features accessible via bottom sheet tabs
└─ User saves design
```

---

## 4. Feature-Specific Journeys

---

### J-09: Image Upload & Processing

**Covers all image upload scenarios:**

```
SCENARIO A: Logo Upload (Happy Path)
├─ User clicks logo upload zone
├─ File picker opens (or drag-and-drop)
├─ User selects logo.png (PNG, 800×800px, 2MB)
├─ Client-side validation:
│   ├─ ✓ Format: PNG/JPG/WebP
│   ├─ ✓ Size: < 5MB
│   ├─ ✓ Dimensions: > 300×300px
│   └─ ✓ Process: Sharp.js resize, WebP → PNG if needed
├─ Upload to backend (signed URL)
├─ Backend generates variants:
│   ├─ Apple: @1x, @2x, @3x (160×50pt base)
│   ├─ Google: 660×660px circle crop + full
│   └─ Preview: 200×200px thumbnail
├─ All variants stored in S3/MinIO
├─ Preview updates instantly on canvas
├─ Design Score recalculates
└─ Auto-save triggers

SCENARIO B: Invalid File Type
├─ User selects file.bmp
├─ Client rejects: "❌ Formato no soportado. Usa PNG, JPG o WebP."
├─ Upload zone shows error state
├─ User selects correct file
└─ Process continues

SCENARIO C: Image Too Small
├─ User selects logo_100x100.png
├─ Client warns: "⚠️ Imagen muy pequeña (100×100px). Mínimo recomendado: 660×660px."
├─ Options: [Subir de todos modos] / [Elegir otra]
├─ If "Subir": System upscales with warning flag
└─ Design Score penalized for low resolution

SCENARIO D: Drag & Drop Multiple Images
├─ User drags 3 images to upload zone
├─ System detects: logo + hero + icon
├─ Asks: "¿Asignar estas imágenes?"
│   ├─ Image 1 → Logo
│   ├─ Image 2 → Hero/Strip
│   └─ Image 3 → Icon (Apple only)
├─ User confirms or reassigns
└─ All uploaded at once
```

---

### J-10: Field Configuration

**Complete field editing journey:**

```
ENTRY: User clicks "Content" tab in sidebar

SECTION A: Add New Field
├─ User clicks "+ Añadir campo"
├─ Dropdown: Select field type
│   ├─ Header (máx 3) — visible in stack
│   ├─ Primary (máx 1) — most prominent
│   ├─ Secondary (máx 4) — supporting info
│   ├─ Auxiliary (máx 4) — additional details
│   └─ Back (sin límite) — back of pass / details view
├─ User selects "Secondary"
├─ New field card appears in sidebar
├─ Field card:
│   ├─ Label input: "PUNTOS"
│   ├─ Value input: "{loyalty_points}" (dynamic)
│   ├─ [✓] Mostrar toggle
│   ├─ Dynamic toggle: "Usar valor del sistema"
│   └─ [🗑️] Delete button
├─ Canvas preview updates
└─ Field count indicator updates: "2/4 secundarios usados"

SECTION B: Edit Existing Field
├─ User clicks on field card or field in canvas
├─ Field enters edit mode:
│   ├─ Label: editable inline
│   ├─ Value: editable or template selector
│   ├─ Format options: text, number, currency, date
│   └─ Alignment: left/center/right
├─ Changes reflected in real-time on canvas
└─ Auto-save

SECTION C: Reorder Fields
├─ User drags field card by handle (⋮⋮)
├─ Drag ghost shows new position
├─ Drop updates order
├─ Canvas re-renders with new layout
└─ Auto-save

SECTION D: Delete Field
├─ User clicks 🗑️ on field card
├─ Confirmation: "¿Eliminar campo 'PUNTOS'?"
│   ├─ [Eliminar] → Field removed, canvas updates
│   └─ [Cancelar] → No change
└─ Auto-save

SECTION E: Platform-Specific Fields
├─ User clicks "⚙️ Avanzado" on field card
├─ Shows platform toggles:
│   ├─ [✓] Mostrar en Apple Wallet
│   ├─ [✓] Mostrar en Google Wallet
│   └─ [✓] Mostrar en ambos (default)
├─ User unchecks Google → field only on Apple
├─ Canvas shows platform-specific preview
└─ Warning if field only exists on one platform
```

---

### J-11: Color & Theme Configuration

```
ENTRY: User clicks "Colors" tab

SECTION A: Basic Color Editing
├─ Color swatches displayed:
│   ├─ Fondo (Background)
│   ├─ Texto principal (Foreground/Text)
│   ├─ Etiquetas (Labels)
│   └─ Acento (Accent — optional)
├─ User clicks "Fondo" swatch
├─ Color picker popover opens:
│   ├─ Hex input: #1A1A2E
│   ├─ RGB sliders
│   ├─ HSL sliders
│   ├─ Preset swatches (8 quick colors)
│   ├─ Recently used colors
│   └─ Eyedropper tool
├─ User enters #C41E3A (red)
├─ Real-time preview updates
├─ Contrast check runs:
│   ├─ Texto vs Fondo: 15.2:1 ✓ AAA
│   └─ Etiquetas vs Fondo: 12.1:1 ✓ AAA
└─ Score updates

SECTION B: Quick Templates
├─ 8 color preset buttons shown
├─ User hovers: tooltip shows palette name
├─ User clicks "Ocean":
│   ├─ Background: #0A2540
│   ├─ Text: #FFFFFF
│   ├─ Labels: #A5B4FC
│   └─ Accent: #00D4AA
├─ All colors update simultaneously
├─ Preview updates
└─ Score: 9.1/10

SECTION C: AI Color Suggestion
├─ User clicks "✨ Sugerir colores" in Colors tab
├─ AI analyzes:
│   ├─ Uploaded images (dominant colors)
│   ├─ Card type (stamp = warm, gym = energetic)
│   ├─ Industry norms
│   └─ Accessibility requirements
├─ AI suggests 3 palettes
├─ User clicks suggestion → applied instantly
└─ Score optimized
```

---

### J-12: Barcode Configuration

```
ENTRY: User clicks "Barcode" tab

SECTION A: Format Selection
├─ Visual grid of barcode formats:
│   ├─ QR Code (recommended, square)
│   ├─ Aztec (square, compact)
│   ├─ PDF417 (rectangular, dense)
│   ├─ Code 128 (linear, short codes)
│   └─ Data Matrix (Google only, GS1)
├─ User selects QR Code
├─ Format availability checked per platform:
│   ├─ QR: ✅ Apple + Google
│   └─ Data Matrix: ⚠️ Google only
├─ If platform conflict: warning shown

SECTION B: Data Configuration
├─ Data builder:
│   ├─ [✓] ID de cliente: {customer_id}
│   ├─ [✓] ID de programa: {program_id}
│   ├─ [✓] Timestamp: {timestamp}
│   └─ [ ] Custom field: [_________]
├─ Preview shows: "Formato: CUST-123_PROG-456_1700000000"
├─ Live barcode preview rendered
├─ Alternate text input: "0000 0000 0000"

SECTION C: Testing
├─ User clicks "📱 Probar en dispositivo"
├─ Modal: QR code displayed large
├─ Instructions: "Escanea con tu teléfono para probar"
├─ User scans, system validates
├─ Result: "✓ Código válido" or "✗ Error: formato incorrecto"
└─ User returns to configure

SECTION D: Platform-Specific Barcode
├─ Apple: barcode section at bottom, square or rectangular
├─ Google: barcode in cardBarcodeSectionDetails
├─ If rectangular selected:
│   ├─ Apple: affects field layout (4 sec/aux combined for coupon/store)
│   └─ Google: no layout impact
└─ Preview reflects changes
```

---

### J-13: Design Quality Fix Flow

```
TRIGGER: Design Score < 7.0 or user clicks score badge

SECTION A: Score Breakdown
├─ Panel opens showing 9 checks:
│   ├─ Contrast ratio: 2.8:1 ✗ FAIL (need 4.5:1)
│   ├─ Logo present: ✅ PASS
│   ├─ Hero image: ✅ PASS
│   ├─ Primary field: ✅ PASS
│   ├─ All required fields: ✅ PASS
│   ├─ Barcode configured: ✅ PASS
│   ├─ Image dimensions: ✅ PASS
│   ├─ Color harmony: ⚠️ WARN (clashing colors)
│   └─ Platform compatibility: ✅ PASS
├─ Overall: 5.2/10 (RED)

SECTION B: Auto-Fix
├─ User clicks "🔧 Arreglar automáticamente" on contrast issue
├─ System:
│   ├─ Analyzes background color
│   ├─ Computes optimal text color for 7:1 ratio
│   ├─ Suggests: Texto → #FFFFFF (from #CCCCCC)
│   └─ User clicks "Aplicar"
├─ Contrast updates: 7.2:1 ✓ PASS
├─ Score: 7.8/10 (YELLOW)

SECTION C: Manual Fix
├─ User clicks "Color harmony" warning
├─ Suggestion: "Los colores rojo y verde pueden causar problemas para daltónicos"
├─ Options:
│   ├─ [Ver alternativas] → AI suggests 3 harmonious palettes
│   ├─ [Ignorar] → Dismiss warning
│   └─ [Más información] → Accessibility docs
├─ User selects alternative palette
├─ Score: 8.5/10 (BLUE)

SECTION D: Target Score
├─ User wants 9.0+ (GREEN)
├─ Remaining improvements suggested:
│   ├─ "Añade un campo auxiliar para información de contacto (+0.3)"
│   ├─ "Usa una imagen de mayor resolución (+0.2)"
│   └─ "Añade texto alternativo al barcode (+0.2)"
├─ User applies all
├─ Score: 9.2/10 (GREEN) ✓
└─ User continues
```

---

## 5. Edge Cases & Recovery

---

### J-14: Session Recovery

```
TRIGGER: User accidentally closes browser or navigates away

├─ User closes tab after 20 minutes of design work
├─ Returns to Studio 2 hours later
├─ System detects unsaved draft in localStorage
├─ Banner appears: "🔄 Tienes un borrador sin guardar de hace 2 horas"
├─ Options:
│   ├─ [Restaurar borrador] → Loads from localStorage
│   ├─ [Descartar] → Clears localStorage, starts fresh
│   └─ [Guardar como copia] → Keep both
├─ User clicks "Restaurar"
├─ Full design state restored
├─ Undo history restored (last 50 actions)
└─ User continues designing
```

---

### J-15: Browser Crash Recovery

```
TRIGGER: Browser crashes or computer restarts

├─ User's browser crashes during design
├─ User reopens browser, navigates back
├─ System checks:
│   1. localStorage (client-side draft)
│   2. Backend auto-save (if user was logged in)
│   3. Most recent saved version
├─ If backend auto-save exists and is newer than localStorage:
│   ├─ "✓ Tu diseño se guardó automáticamente a las 15:42"
│   └─ Loads from server
├─ If only localStorage exists:
│   ├─ "🔄 Recuperamos tu borrador local"
│   └─ Prompts to save to server
├─ User never loses more than 30 seconds of work
└─ Auto-save interval: every 30 seconds + on every significant action
```

---

### J-16: Invalid Image Handling

```
SCENARIO A: Wrong Aspect Ratio
├─ User uploads 16:9 image for logo (needs ~3:1)
├─ System shows crop tool:
│   ├─ Overlay showing recommended crop area
│   ├─ Handles to adjust
│   ├─ [Aplicar recorte] / [Usar original]
│   └─ Preview of how it'll look on pass
├─ User adjusts crop
├─ System warns if crop is too small for @3x
└─ Proceeds with cropped image

SCENARIO B: Corrupt Image
├─ User uploads damaged PNG file
├─ System error: "❌ No se pudo procesar la imagen. Parece estar dañada."
├─ Suggests: re-export from design tool, try JPG format
└─ User uploads corrected file

SCENARIO C: Server Upload Failure
├─ Upload reaches 85%, network error
├─ System: "⚠️ Error de red. ¿Reintentar?"
├─ Auto-retries 3 times with exponential backoff
├─ If all fail: "No se pudo subir. Guardado localmente."
├─ Image stored in IndexedDB, retry on reconnect
└─ User sees preview from local blob
```

---

### J-17: Platform-Specific Conflict

```
SCENARIO A: Image Not Available on One Platform
├─ User designs for Apple + Google
├─ User adds thumbnail image (Apple generic only)
├─ Google preview shows: "⚠️ Miniatura no disponible en Google Wallet"
├─ Options:
│   ├─ [Ocultar en Google] → Thumbnail Apple-only
│   ├─ [Usar como hero] → Use same image as hero on Google
│   └─ [Subir imagen alternativa] → Different image for Google
├─ User selects option
└─ Both previews update

SCENARIO B: Field Limit Exceeded on One Platform
├─ User adds 5 secondary fields
├─ Apple (coupon/store): shows "⚠️ Máximo 4 campos secundarios+auxiliares"
├─ Google: no limit (can display all)
├─ Options:
│   ├─ [Combinar campos] → Merge 2 fields into 1
│   ├─ [Mover a detalles] → Move extra to back/details
│   └─ [Cambiar tipo de paso] → Switch to generic (allows more fields)
├─ User selects "Mover a detalles"
└─ Apple shows 4 on front, rest on back; Google shows all on front

SCENARIO C: Barcode Shape Conflict
├─ User selects Code 128 (rectangular)
├─ For Apple coupon: layout changes (4 sec/aux combined limit)
├─ User sees layout shift on Apple preview
├─ Tooltip: "Código rectangular reduce espacio en Apple Wallet"
├─ Options: keep (smaller layout) or switch to QR (square, full layout)
└─ User makes informed choice
```

---

## 6. Cross-Platform Journeys

---

### J-18: Apple-Only Features

```
FEATURE: Add Beacon for Location
├─ User clicks "Advanced ▼" tab
├─ Apple-specific section appears (only when Apple preview active)
├─ "Ubicaciones y Beacons"
├─ User adds beacon:
│   ├─ UUID: [________-____-____-____-____________]
│   ├─ Major: [____]
│   ├─ Minor: [____]
│   └─ Texto: "¡Bienvenido a nuestro gimnasio!"
├─ Google preview shows: "ℹ️ Beacons solo disponibles en Apple Wallet"
├─ User saves
└─ Feature active on Apple only

FEATURE: Add Back Fields
├─ User adds back fields in Content tab
├─ Apple: "backFields" array in pass.json
├─ Google: fields appear in detailsTemplateOverride
├─ Back of pass accessible via ⓘ button (Apple) or Details (Google)
└─ Unified editing, platform-appropriate output

FEATURE: NFC Configuration
├─ Advanced tab → NFC section (Apple only)
├─ Requires Apple Developer NFC entitlement
├─ If no entitlement: "⚠️ Requiere certificado NFC de Apple"
├─ User provides NFC message payload
└─ Google equivalent: Smart Tap (separate configuration)
```

---

### J-19: Google-Only Features

```
FEATURE: Rotating Barcode
├─ User clicks Barcode tab
├─ Selects "Código rotativo" (Google only)
├─ Configuration:
│   ├─ Algorithm: TOTP
│   ├─ Period: 30 seconds
│   ├─ Digits: 6
│   └─ Secret key: [auto-generated]
├─ Apple preview shows: "ℹ️ Códigos rotativos solo en Google Wallet"
├─ Apple falls back to static QR
└─ Google uses rotating barcode

FEATURE: App Link Button
├─ Content tab → "Enlace de app"
├─ User adds:
│   ├─ Android app link: com.company.app
│   ├─ iOS app link: https://apps.apple.com/...
│   └─ Web fallback: https://company.com
├─ Button appears on Google pass front
├─ Apple: appLaunchURL used on back of pass
└─ Both platforms link to app, different UI

FEATURE: Grouping
├─ Advanced tab → "Agrupar tarjetas"
├─ Grouping ID: "summer_campaign_2024"
├─ Sort index: 1
├─ Google: passes grouped in Wallet app
├─ Apple: groupingIdentifier in pass.json
└─ Same concept, different JSON keys
```

---

### J-20: Dual-Platform Balancing

```
SCENARIO: Optimal Dual-Platform Design
├─ User wants best possible design on BOTH platforms
├─ System enforces common denominator:
│   ├─ Images: logo + hero (both support)
│   ├─ Fields: up to Apple limits (stricter than Google)
│   ├─ Barcode: QR (both support perfectly)
│   └─ Colors: rgb/hex convertible
├─ Platform toggle helps user see differences
├─ Warnings for platform-specific features
├─ User can choose "Platform-first" mode:
│   ├─ Apple-first: optimize for Apple, best-effort Google
│   ├─ Google-first: optimize for Google, best-effort Apple
│   └─ Balanced: common denominator (default)
└─ User selects "Balanced", designs accordingly
```

---

## 7. User Persona Journeys

---

### J-21: María — Café Owner (Non-Technical)

**Profile:** 45 years old, owns a café, uses WhatsApp and Instagram. Never heard of "@2x" or "pass.json". Wants something that "looks professional like Starbucks".

**Journey:**
```
1. Opens Loyallia to create loyalty program
2. Wizard Step 1: Names it "Café Central"
3. Wizard Step 2: Sees Template Gallery
4. Thinks: "¡Qué bonitos!"
5. Clicks "Café Clásico" → sees preview → "Usar este diseño"
6. Studio opens with beautiful café design
7. Uploads her logo (just drags from desktop)
8. System handles everything automatically
9. Changes "Café gratis" to "Croissant gratis"
10. Clicks "Siguiente" → done!
11. Total time: 4 minutes
12. Result: Professional pass, both platforms
```

**Friction Points Avoided:**
- ❌ No technical specs shown ("160×50pt")
- ❌ No platform switching confusion
- ❌ No field taxonomy ("auxiliaryFields")
- ✅ Simple language: "Imagen principal" not "strip.png"
- ✅ Visual previews, no JSON

---

### J-22: Carlos — Gym Manager (Semi-Technical)

**Profile:** 32 years old, manages a CrossFit gym. Uses Canva for social media. Understands basic design concepts. Wants control but needs guidance.

**Journey:**
```
1. Creates VIP membership program
2. Wizard Step 2: Template Gallery
3. Doesn't find gym template he likes
4. Clicks "✨ Diseñar con IA"
5. Describes: "Gimnasio CrossFit, industrial, negro y rojo"
6. AI generates 3 designs in 8 seconds
7. Picks Design 2, clicks "Seleccionar"
8. Studio loads with industrial theme
9. Uploads gym logo
10. Adjusts colors slightly (uses color picker)
11. Adds custom field: "Próximo pago" with date
12. Checks both Apple and Google previews
13. Clicks "Guardar"
14. Total time: 8 minutes
15. Result: Custom branded pass, unique design
```

**Features Used:**
- AI generation
- Color picker with contrast feedback
- Custom fields
- Dual-platform preview toggle
- Design score (got 9.1/10)

---

### J-23: Ana — Marketing Agency (Power User)

**Profile:** 28 years old, digital marketing agency. Manages 15+ client programs. Needs efficiency, batch operations, and brand consistency.

**Journey:**
```
1. Creates program for client "Hotel del Mar"
2. Wizard Step 2: Template Gallery
3. Clicks "Empezar desde cero" (wants full control)
4. Blank studio loads
5. Uploads client brand kit:
   ├─ Logo (vector SVG → converted to PNG)
   ├─ Hero image (professionally shot)
   ├─ Brand colors from brand guide
   └─ Typography (system fonts only)
6. Configures all fields manually:
   ├─ Header: Room number (dynamic)
   ├─ Primary: Guest name (dynamic)
   ├─ Secondary: Check-in, Check-out dates
   ├─ Auxiliary: WiFi code, Breakfast time
   └─ Back: Hotel policies, contact, map
7. Sets exact colors from brand guide (#002B5C, #C9A227)
8. Configures barcode: Data Matrix for GS1 compliance
9. Tests barcode on physical scanner
10. Exports .pkpass for client approval
11. Saves as template: "Hotel del Mar Base"
12. Clones template for 3 other hotel clients
13. Each clone: swap logo, adjust colors, done
14. Total time: 20 minutes first, 3 minutes per clone
15. Result: 4 professional hotel key cards
```

**Power Features Used:**
- Blank canvas
- Batch template cloning
- Export (.pkpass testing)
- Brand color exact input
- Template saving/reuse
- Barcode testing
- All field types configured

---

## 8. Journey Metrics & Success Criteria

| Journey | Target Time | Max Touchpoints | Success Criteria |
|---------|:-----------:|:---------------:|------------------|
| J-01 Template → Save | 5 min | 12 | Design Score ≥ 8.0, both platforms rendered |
| J-02 AI Generation | 4 min | 8 | AI generates 3 valid designs in < 10s |
| J-03 Blank Canvas | 12 min | 20 | Full customization, Score ≥ 8.5 |
| J-04 Edit Existing | 5 min | 10 | Changes applied, push update option shown |
| J-09 Image Upload | 2 min | 6 | Auto-variants generated, preview updated |
| J-10 Field Config | 3 min | 8 | Field added/edited, preview updated |
| J-13 Quality Fix | 2 min | 5 | Score improved by ≥ 1.5 points |
| J-14 Session Recovery | 30s | 3 | Draft restored, < 30s work lost |

---

*End of Document SRS-005*
