# SRS-009: User Custom Template Library

> **ISO/IEC/IEEE 29148:2018 — Software Requirements Specification**  
> Document ID: SRS-LOY-WPS-009 | Version: 1.0.0-Draft  
> **Status:** Critical Addition — Integrates into SRS-002, SRS-003, SRS-005, IMPLEMENTATION-PLAN  
> **Date:** 2026-06-03

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Template Types: System vs User](#2-template-types-system-vs-user)
3. [Template Data Model](#3-template-data-model)
4. [Template Gallery Redesign](#4-template-gallery-redesign)
5. [Save as Template Flow](#5-save-as-template-flow)
6. [My Templates Management](#6-my-templates-management)
7. [Template Preview & Apply](#7-template-preview--apply)
8. [Template Smart Features](#8-template-smart-features)
9. [Backend Schema & API](#9-backend-schema--api)
10. [Integration Checklist](#10-integration-checklist)

---

## 1. Executive Summary

**The Problem:** Current documentation treats templates as a **read-only system feature** — 20+ pre-built templates created by Loyallia. But users will invest significant time designing passes and will want to **save, reuse, and iterate** on their own designs.

**The Solution:** A **dual-template system**:
- **System Templates** (read-only): Professionally designed by Loyallia, organized by industry
- **My Templates** (user-owned): Created by the user from any design, fully editable and deletable

**Business Value:**
- Users with multiple locations/branches (franchises) can reuse designs
- Marketing agencies managing multiple clients can build a template library
- Users save 80%+ time on subsequent program creation
- Increases platform stickiness and retention

---

## 2. Template Types: System vs User

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TEMPLATE GALLERY                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  [🏢 Sistema]  [⭐ Mis Plantillas]  [✨ Generadas por IA]           │   │
│  │   ─────────    ────────────────     ─────────────────              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│  TAB: SISTEMA (Read-only, created by Loyallia)                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ Café     │ │ Retail   │ │ Gym      │ │ Salón    │ │ Hotel    │         │
│  │ Clásico  │ │ Moderno  │ │ Pro      │ │ Elite    │ │ Deluxe   │         │
│  │ [Usar]   │ │ [Usar]   │ │ [Usar]   │ │ [Usar]   │ │ [Usar]   │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│  TAB: MIS PLANTILLAS (User-owned, CRUD enabled)                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                      │
│  │ ☕ Café   │ │ 💪 Gym   │ │ 🎁 Regalo│ │ [+ Nueva]│                      │
│  │ Central  │ │ Power    │ │ Navidad  │ │          │                      │
│  │ [⋮] [🗑️] │ │ [⋮] [🗑️] │ │ [⋮] [🗑️] │ │  Crear   │                      │
│  │ Usada 5x │ │ Usada 3x │ │ Usada 1x │ │plantilla │                      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                      │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│  TAB: GENERADAS POR IA (AI-created, temporary)                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                                   │
│  │ Diseño 1 │ │ Diseño 2 │ │ Diseño 3 │                                   │
│  │ [Guardar]│ │ [Guardar]│ │ [Guardar]│                                   │
│  └──────────┘ └──────────┘ └──────────┘                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 System Templates

| Property | Value |
|----------|-------|
| **Source** | Created by Loyallia design team |
| **Count** | 20+ at launch, expandable |
| **Editable** | ❌ No (read-only) |
| **Deletable** | ❌ No |
| **Categories** | Café, Retail, Gym, Salón, Hotel, Restaurant, Bar, Spa, Clinic, Education |
| **Card type compatibility** | Each template tagged with compatible card types |
| **Preview** | Side-by-side iPhone + Pixel |

### 2.2 My Templates (User-Created)

| Property | Value |
|----------|-------|
| **Source** | Saved from any Studio design |
| **Count** | Unlimited per user |
| **Editable** | ✅ Name, description, preview thumbnail |
| **Deletable** | ✅ With confirmation |
| **Shareable** | ⚪ Future: share with team/organization |
| **Cloneable** | ✅ Duplicate template |
| **Preview** | Side-by-side iPhone + Pixel |

### 2.3 AI-Generated Templates (Temporary)

| Property | Value |
|----------|-------|
| **Source** | Generated by Kimi AI assistant |
| **Count** | 3 per generation |
| **Editable** | Only after saving to "My Templates" |
| **Deletable** | Auto-deleted after 7 days if not saved |
| **Save action** | "Guardar como mi plantilla" → moves to My Templates |

---

## 3. Template Data Model

### 3.1 Frontend Template Interface

```typescript
interface WalletTemplate {
  id: string;                    // UUID
  type: 'system' | 'user' | 'ai'; // Source type
  
  // Metadata
  name: string;                  // "Café Clásico"
  description: string;           // "Diseño cálido con tonos café para tarjetas de sellos"
  cardType: string;              // "stamp" | "cashback" | "coupon" | ...
  industry: string;              // "cafe" | "retail" | "gym" | ...
  
  // Visual Preview
  previewImageUrl: string;       // Thumbnail (300×400px)
  previewAppleUrl: string;       // Apple preview image
  previewGoogleUrl: string;      // Google preview image
  
  // Design Data (complete WalletPassStudioState)
  design: WalletPassStudioState; // Full design state (layers, colors, fields, backContent)
  
  // System Templates Only
  category: string;              // "featured" | "new" | "popular"
  tags: string[];                // ["minimal", "warm", "professional"]
  
  // User Templates Only
  userId: string;                // Owner user ID
  programId?: string;            // Source program (if cloned from existing)
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
  usageCount: number;            // How many times applied
  lastUsedAt?: string;           // ISO 8601
  isFavorite: boolean;           // ⭐ Favorite flag
  
  // AI Templates Only
  aiPrompt?: string;             // The prompt that generated this
  aiSessionId?: string;          // Reference to AI generation session
  expiresAt?: string;            // Auto-delete if not saved
}
```

### 3.2 Template vs Design Relationship

```
┌─────────────────────────────────────────────────────────────┐
│                    RELATIONSHIP DIAGRAM                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────┐      ┌──────────────┐                   │
│   │   TEMPLATE   │─────→│   STUDIO     │                   │
│   │  (read-only) │      │  (editable)  │                   │
│   └──────────────┘      └──────┬───────┘                   │
│         │                       │                           │
│         │ CLONE (deep copy)     │ EDIT                      │
│         ▼                       ▼                           │
│   ┌──────────────┐      ┌──────────────┐                   │
│   │   TEMPLATE   │      │    DESIGN    │                   │
│   │  (unchanged) │      │  (live state) │                   │
│   └──────────────┘      └──────┬───────┘                   │
│                                 │                           │
│                                 │ SAVE AS TEMPLATE          │
│                                 ▼                           │
│                           ┌──────────────┐                 │
│                           │   MY TEMPLATE│                 │
│                           │  (new entry)  │                 │
│                           └──────────────┘                 │
│                                                              │
│   KEY RULE: Templates are CLONED, never referenced.        │
│   Editing a design does NOT update the source template.    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Template Gallery Redesign

### 4.1 Entry Points

| Entry Point | When Shown | Action |
|-------------|-----------|--------|
| **Wizard Step 2** | Creating new program | Opens Template Gallery as first step |
| **Studio Toolbar** | Anytime in Studio | "🎨 Plantillas" button opens gallery |
| **Program Settings** | Editing existing program | "Cambiar plantilla" option |
| **Dashboard** | From main dashboard | "Crear desde plantilla" quick action |

### 4.2 Gallery Layout with Tabs

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Volver                              Wallet Pass Studio              [?]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🎨 Elige un diseño para comenzar                                   │   │
│  │  Puedes usar una plantilla del sistema o una de las tuyas.          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🔍 Buscar plantillas...                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  [🏢 Sistema]  [⭐ Mis Plantillas (8)]  [✨ Generadas por IA (3)]  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  FILTROS:  [Todas]  [Café ▼]  [Sellos ▼]  [⭐ Favoritos]           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  PLANTILLAS:                                                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │  ☕ CAFÉ     │ │  🛍️ RETAIL   │ │  💪 GYM      │ │  [+ NUEVA]   │       │
│  │  ┌────────┐  │ │  ┌────────┐  │ │  ┌────────┐  │ │  ┌────────┐  │       │
│  │  │[PASS]  │  │ │  │[PASS]  │  │ │  │[PASS]  │  │ │  │   +    │  │       │
│  │  │preview │  │ │  │preview │  │  │  │preview │  │ │  │        │  │       │
│  │  └────────┘  │ │  └────────┘  │ │  └────────┘  │ │  └────────┘  │       │
│  │              │ │              │ │              │ │              │       │
│  │  Café Centro │ │  Mi Retail   │ │  Gym Power   │ │  Crear nueva │       │
│  │  ⭐ Sellos   │ │  Cashback 5% │ │  VIP Oro     │ │  plantilla   │       │
│  │  Usada 5 veces│ │  Usada 2 veces│ │ Usada 1 vez │ │  desde cero  │       │
│  │              │ │              │ │              │ │  o desde     │       │
│  │  [⋮] [✏️] [🗑️]│ │  [⋮] [✏️] [🗑️]│ │ [⋮] [✏️] [🗑️]│ │  diseño actual│      │
│  │              │ │              │ │              │ │              │       │
│  │  [Usar]      │ │  [Usar]      │ │  [Usar]      │ │  [Crear →]   │       │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                        │
│  │  👑 VIP      │ │  🏢 CORP     │ │  🎁 REGALO   │                        │
│  │  ┌────────┐  │ │  ┌────────┐  │ │  ┌────────┐  │                        │
│  │  │[PASS]  │  │ │  │[PASS]  │  │ │  │[PASS]  │  │                        │
│  │  │preview │  │ │  │preview │  │ │  │preview │  │                        │
│  │  └────────┘  │ │  └────────┘  │ │  └────────┘  │                        │
│  │              │ │              │ │              │                        │
│  │  Mi VIP      │ │  Corp 15%    │ │  Navidad     │                        │
│  │  Membresía   │ │  Descuento   │ │  2024        │                        │
│  │  [⋮] [✏️] [🗑️]│ │ [⋮] [✏️] [🗑️]│ │ [⋮] [✏️] [🗑️]│                        │
│  │  [Usar]      │ │  [Usar]      │ │  [Usar]      │                        │
│  └──────────────┘ └──────────────┘ └──────────────┘                        │
│                                                                              │
│                     ┌─────────────────────────┐                              │
│                     │  ✏️ Empezar desde cero  │                              │
│                     └─────────────────────────┘                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Template Card Specifications (My Templates)

| Element | System Template | My Template |
|---------|----------------|-------------|
| **Preview** | Static thumbnail | Live-rendered from saved design |
| **Star icon** | ❌ No | ✅ Click to favorite |
| **Menu (⋮)** | ❌ No | ✅ Rename, Duplicate, Delete |
| **Edit (✏️)** | ❌ No | ✅ Edit metadata (name, desc, preview) |
| **Delete (🗑️)** | ❌ No | ✅ With confirmation dialog |
| **Usage counter** | ❌ No | ✅ "Usada N veces" |
| **Last used** | ❌ No | ✅ "Usada hace 2 días" |
| **Card type badge** | ✅ Yes | ✅ Yes |
| **Industry badge** | ✅ Yes | ✅ Yes |

---

## 5. Save as Template Flow

### 5.1 From Studio Toolbar

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ STUDIO — User has designed a great stamp card for Café Central               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  User clicks [💾 Guardar] dropdown → selects "Guardar como plantilla"       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  💾 GUARDAR COMO PLANTILLA                                           │   │
│  │                                                                      │   │
│  │  Nombre de la plantilla:                                             │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ Café Central — Tarjeta de Sellos                              │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  │  Descripción (opcional):                                             │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ Diseño cálido con tonos café y sellos de taza. Ideal para    │   │   │
│  │  │ cafeterías y panaderías.                                     │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  │  Tipo de tarjeta:  [Tarjeta de Sellos ▼]                            │   │
│  │  Industria:        [Café ▼]                                         │   │
│  │                                                                      │   │
│  │  🖼️ VISTA PREVIA DE LA PLANTILLA                                     │   │
│  │  ┌────────────┐    ┌────────────┐                                   │   │
│  │  │  [iPhone]  │    │  [Pixel]   │                                   │   │
│  │  │  preview   │    │  preview   │                                   │   │
│  │  └────────────┘    └────────────┘                                   │   │
│  │  (se genera automáticamente desde el diseño actual)                 │   │
│  │                                                                      │   │
│  │  [✓] Incluir contenido del reverso (términos, contacto)            │   │
│  │                                                                      │   │
│  │              ┌──────────────────────┐                               │   │
│  │              │  💾 Guardar plantilla │                               │   │
│  │              └──────────────────────┘                               │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  SUCCESS: "✅ Plantilla guardada en 'Mis Plantillas'"                       │
│  Toast with quick action: "[Ver mis plantillas]  [Crear otro programa]"     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Save Template Rules

| Rule | Behavior |
|------|----------|
| **Name required** | Must be 2-50 characters |
| **Name uniqueness** | Per-user unique (can have same name as system template) |
| **Description** | Optional, max 200 characters |
| **Preview auto-generated** | System captures iPhone + Pixel preview images from current canvas |
| **Back content** | Optional include (checkbox) — defaults to ✅ yes |
| **What gets saved** | Complete `WalletPassStudioState` — layers, colors, fields, backContent, card type settings |
| **What does NOT get saved** | Program-specific data (customer names, current stamp counts, etc.) |
| **Dynamic fields** | Preserved as templates (`{customer_name}`, `{stamp_count}`) |

### 5.3 Auto-Naming Suggestions

When user clicks "Save as Template", pre-fill name with:
- `{Program Name} — {Card Type Label}` (e.g., "Café Central — Tarjeta de Sellos")
- If from blank canvas: "Mi diseño {Card Type} {timestamp}"
- If duplicate name exists: append "(2)", "(3)" etc.

---

## 6. My Templates Management

### 6.1 Template Context Menu (⋮)

```
┌─────────────────────┐
│  ☕ Café Central    │
│  ─────────────────  │
│  ✏️ Renombrar      │
│  📋 Duplicar       │
│  ⭐ Favorito       │
│  ─────────────────  │
│  🗑️ Eliminar       │
└─────────────────────┘
```

### 6.2 Rename Template

```
┌─────────────────────────────────────┐
│  ✏️ Renombrar plantilla             │
│                                     │
│  Nombre actual: Café Central        │
│  Nuevo nombre: [Café Centro       ] │
│                                     │
│  [Cancelar]  [Guardar]              │
└─────────────────────────────────────┘
```

### 6.3 Duplicate Template

```
┌─────────────────────────────────────┐
│  📋 Duplicar plantilla              │
│                                     │
│  Nombre original: Café Central      │
│  Nombre de la copia: [Café Central │
│                        (copia)    ] │
│                                     │
│  [Cancelar]  [Duplicar]             │
└─────────────────────────────────────┘
```

### 6.4 Delete Template

```
┌─────────────────────────────────────┐
│  🗑️ Eliminar plantilla              │
│                                     │
│  ¿Estás seguro de eliminar          │
│  "Café Central"?                    │
│                                     │
│  Esta acción no se puede deshacer.  │
│  Los programas creados con esta     │
│  plantilla NO se verán afectados.   │
│                                     │
│  [Cancelar]  [Eliminar permanentemente]│
└─────────────────────────────────────┘
```

### 6.5 Edit Template Metadata

```
┌─────────────────────────────────────────────────────────────┐
│  ✏️ Editar plantilla                                        │
│                                                             │
│  Nombre:        [Café Centro — Sellos        ]             │
│  Descripción:   [Diseño para cafeterías...   ]             │
│                                                             │
│  Tipo de tarjeta: [Tarjeta de Sellos ▼]                    │
│  Industria:       [Café ▼]                                 │
│                                                             │
│  🖼️ VISTA PREVIA                                           │
│  ┌────────────┐    ┌────────────┐                          │
│  │ [iPhone]   │    │ [Pixel]    │                          │
│  │ [Regenerar]│    │ [Regenerar]│                          │
│  └────────────┘    └────────────┘                          │
│  (Puedes regenerar la vista previa desde el diseño actual) │
│                                                             │
│  [Cancelar]  [Guardar cambios]                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.6 Empty State (No Templates Yet)

```
┌─────────────────────────────────────────────────────────────┐
│  TAB: ⭐ MIS PLANTILLAS                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    ┌──────────┐                             │
│                    │  🎨 🖼️   │                             │
│                    │          │                             │
│                    └──────────┘                             │
│                                                             │
│         Aún no tienes plantillas guardadas                  │
│                                                             │
│   Cuando diseñes una tarjeta que te guste,                │
│   guárdala como plantilla para reutilizarla.              │
│                                                             │
│   ┌──────────────────────────────────────┐                │
│   │  💡 Consejo: Después de diseñar tu   │                │
│   │  primera tarjeta, haz clic en        │                │
│   │  "Guardar como plantilla" en la      │                │
│   │  barra de herramientas.              │                │
│   └──────────────────────────────────────┘                │
│                                                             │
│              [✨ Diseñar con IA →]                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Template Preview & Apply

### 7.1 Preview Modal (Same for System + User Templates)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Vista previa: Café Central — Tarjeta de Sellos                      [✕]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  METADATA                                                            │   │
│  │  Nombre: Café Central — Tarjeta de Sellos                           │   │
│  │  Tipo: Tarjeta de Sellos    Industria: Café                         │   │
│  │  Creada: hace 3 días    Usada: 5 veces                              │   │
│  │                                                                      │   │
│  │  COLORES:  ████ ████ ████                                           │   │
│  │  INCLUYE: Logo, Imagen principal, 5 campos, Reverso                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌────────────────────────────┐  ┌────────────────────────────┐           │
│  │  🍎 iPhone 15 Pro          │  │  🤖 Google Pixel 8         │           │
│  │  ┌────────────────────┐    │  │  ┌────────────────────┐    │           │
│  │  │                    │    │  │  │                    │    │           │
│  │  │  [PASS PREVIEW]    │    │  │  │  [PASS PREVIEW]    │    │           │
│  │  │  FRONT             │    │  │  │  FRONT             │    │           │
│  │  │                    │    │  │  │                    │    │           │
│  │  └────────────────────┘    │  │  └────────────────────┘    │           │
│  │                            │  │                            │           │
│  │  ┌────────────────────┐    │  │  ┌────────────────────┐    │           │
│  │  │  [PASS PREVIEW]    │    │  │  │  [PASS PREVIEW]    │    │           │
│  │  │  BACK / REVERSO    │    │  │  │  DETAILS / REVERSO │    │           │
│  │  └────────────────────┘    │  │  └────────────────────┘    │           │
│  └────────────────────────────┘  └────────────────────────────┘           │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  CONTENIDO DE LA PLANTILLA                                           │   │
│  │  ✅ Logo configurado                                                  │   │
│  │  ✅ Imagen principal (strip/hero)                                     │   │
│  │  ✅ 3 campos de cabecera                                              │   │
│  │  ✅ 1 campo principal                                                 │   │
│  │  ✅ 2 campos secundarios                                              │   │
│  │  ✅ Barcode QR configurado                                            │   │
│  │  ✅ Contenido del reverso (4 campos)                                  │   │
│  │  ✅ Colores: fondo #3E2723, texto #FFFFFF                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│       [Cancelar]              [✏️ Personalizar primero]  [Usar ahora →]    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Apply Flow

| Step | Action | Result |
|------|--------|--------|
| 1 | User clicks "Usar ahora" | Template data cloned into Studio |
| 2 | Studio loads with template | All layers, colors, fields, back content applied |
| 3 | `appliedTemplateId` set | References source template (for analytics) |
| 4 | `isModified` = false | User hasn't made changes yet |
| 5 | Usage count incremented | Backend: `usageCount + 1`, `lastUsedAt = now` |

### 7.3 "Personalizar primero" Flow

Instead of applying directly, user enters Studio with template loaded:
- Same as "Usar ahora" but with a banner: "🎨 Personalizando plantilla: Café Central"
- User can modify before committing
- When saving: prompt to "Guardar como nueva plantilla" or "Solo usar este diseño"

---

## 8. Template Smart Features

### 8.1 Template Recommendations

Based on user's history and current context:

| Context | Recommendation |
|---------|---------------|
| Creating stamp card | "Usaste 'Café Central' para sellos. ¿Quieres usarla como base?" |
| Same industry | "Otras plantillas de Café que podrían gustarte..." |
| Seasonal | "🎄 ¿Crear una versión navideña de tu plantilla 'Café Central'?" |
| Popular | "⭐ Tu plantilla más usada: 'Gym Power' (usada 12 veces)" |

### 8.2 Template Variants (AI-Powered)

```
User has template "Café Central" (warm brown, coffee icon, 10 stamps)

┌─────────────────────────────────────────────────────────────┐
│  🎨 Generar variaciones de "Café Central"                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Quiero una versión:                                         │
│  [●] Para verano (colores claros, frescos)                  │
│  [○] Para Navidad (rojo, verde, dorado)                     │
│  [○] Minimalista (blanco y negro, simple)                   │
│  [○] Premium (negro y dorado, elegante)                     │
│  [○] Festiva (colores vibrantes, celebración)               │
│                                                              │
│  [✨ Generar variaciones]                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

AI generates 3 variations of the same template with different colors/styles while preserving layout and fields.

### 8.3 Template Sharing (Future v2)

```
┌─────────────────────────────────────────────────────────────┐
│  🔗 Compartir plantilla                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Compartir "Café Central" con:                              │
│                                                              │
│  [●] Solo yo (privada)                                      │
│  [○] Mi equipo / organización                               │
│  [○] Pública (cualquiera en Loyallia puede verla)          │
│                                                              │
│  Enlace de compartir:                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  https://loyallia.app/templates/share/abc-123      │   │
│  └─────────────────────────────────────────────────────┘   │
│  [📋 Copiar enlace]                                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Backend Schema & API

### 9.1 Database Schema (Django)

```python
# apps/wallet/models.py

class WalletTemplate(models.Model):
    """User-created and system templates for wallet passes."""
    
    TEMPLATE_TYPE_CHOICES = [
        ('system', 'System Template'),
        ('user', 'User Template'),
        ('ai', 'AI Generated'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type = models.CharField(max_length=10, choices=TEMPLATE_TYPE_CHOICES)
    
    # Metadata
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    card_type = models.CharField(max_length=30)  # stamp, cashback, etc.
    industry = models.CharField(max_length=30, blank=True)
    
    # Ownership
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='wallet_templates'
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='wallet_templates'
    )
    
    # Visual previews
    preview_image = models.ImageField(
        upload_to='template_previews/',
        null=True,
        blank=True
    )
    preview_apple = models.ImageField(
        upload_to='template_previews/apple/',
        null=True,
        blank=True
    )
    preview_google = models.ImageField(
        upload_to='template_previews/google/',
        null=True,
        blank=True
    )
    
    # Design data (complete state)
    design_data = models.JSONField(
        default=dict,
        help_text="Complete WalletPassStudioState as JSON"
    )
    
    # System template fields
    category = models.CharField(max_length=20, blank=True)  # featured, new, popular
    tags = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    
    # User template fields
    source_program = models.ForeignKey(
        Program,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='derived_templates'
    )
    usage_count = models.PositiveIntegerField(default=0)
    last_used_at = models.DateTimeField(null=True, blank=True)
    is_favorite = models.BooleanField(default=False)
    
    # AI template fields
    ai_prompt = models.TextField(blank=True)
    ai_session_id = models.CharField(max_length=100, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-usage_count', '-created_at']
        indexes = [
            models.Index(fields=['type', 'card_type', 'industry']),
            models.Index(fields=['user', 'is_favorite']),
            models.Index(fields=['organization', 'type']),
        ]
        constraints = [
            # System templates don't have a user
            models.CheckConstraint(
                check=models.Q(type='system', user__isnull=True) | 
                       models.Q(type__in=['user', 'ai'], user__isnull=False),
                name='system_templates_no_user'
            ),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.type})"
    
    def increment_usage(self):
        """Increment usage counter when template is applied."""
        self.usage_count += 1
        self.last_used_at = timezone.now()
        self.save(update_fields=['usage_count', 'last_used_at'])
```

### 9.2 API Endpoints

```python
# apps/wallet/urls.py

urlpatterns = [
    # Template CRUD
    path('templates/', TemplateListCreateView.as_view(), name='template-list'),
    path('templates/<uuid:pk>/', TemplateRetrieveUpdateDestroyView.as_view(), name='template-detail'),
    path('templates/<uuid:pk>/duplicate/', TemplateDuplicateView.as_view(), name='template-duplicate'),
    path('templates/<uuid:pk>/favorite/', TemplateFavoriteToggleView.as_view(), name='template-favorite'),
    
    # Template application
    path('templates/<uuid:pk>/apply/', TemplateApplyView.as_view(), name='template-apply'),
    
    # Preview generation
    path('templates/<uuid:pk>/preview/', TemplatePreviewGenerateView.as_view(), name='template-preview'),
    
    # AI template variants
    path('templates/<uuid:pk>/variations/', TemplateVariationGenerateView.as_view(), name='template-variations'),
    
    # System templates (read-only)
    path('templates/system/', SystemTemplateListView.as_view(), name='system-templates'),
]
```

### 9.3 API Specifications

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/wallet/templates/` | GET | ✅ | List user's templates + system templates |
| `/api/v1/wallet/templates/` | POST | ✅ | Create new template from current design |
| `/api/v1/wallet/templates/<id>/` | GET | ✅ | Get template detail |
| `/api/v1/wallet/templates/<id>/` | PATCH | ✅ | Update template metadata |
| `/api/v1/wallet/templates/<id>/` | DELETE | ✅ | Delete user template |
| `/api/v1/wallet/templates/<id>/duplicate/` | POST | ✅ | Clone template |
| `/api/v1/wallet/templates/<id>/favorite/` | POST | ✅ | Toggle favorite |
| `/api/v1/wallet/templates/<id>/apply/` | POST | ✅ | Apply template to current design |
| `/api/v1/wallet/templates/<id>/preview/` | POST | ✅ | Regenerate preview images |
| `/api/v1/wallet/templates/system/` | GET | ✅ | List system templates only |

### 9.4 Request/Response Examples

**Create Template:**
```json
// POST /api/v1/wallet/templates/
{
  "name": "Café Central — Tarjeta de Sellos",
  "description": "Diseño cálido con tonos café",
  "card_type": "stamp",
  "industry": "cafe",
  "design_data": { /* complete WalletPassStudioState */ },
  "include_back_content": true
}

// Response: 201 Created
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "user",
  "name": "Café Central — Tarjeta de Sellos",
  "description": "Diseño cálido con tonos café",
  "card_type": "stamp",
  "industry": "cafe",
  "preview_image_url": "https://cdn.loyallia.app/templates/550e8400/preview.png",
  "preview_apple_url": "https://cdn.loyallia.app/templates/550e8400/apple.png",
  "preview_google_url": "https://cdn.loyallia.app/templates/550e8400/google.png",
  "usage_count": 0,
  "is_favorite": false,
  "created_at": "2026-06-03T15:40:21Z",
  "updated_at": "2026-06-03T15:40:21Z"
}
```

**Apply Template:**
```json
// POST /api/v1/wallet/templates/550e8400/apply/
{
  "program_id": "prog-123"  // optional: link to program
}

// Response: 200 OK
{
  "design_data": { /* cloned WalletPassStudioState */ },
  "template_id": "550e8400",
  "message": "Template applied successfully"
}
```

---

## 10. Integration Checklist

### SRS-001 Updates:
- [ ] Update "Template" definition in glossary
- [ ] Add "Preset" vs "Template" clarification
- [ ] Add Issue #11: "No User Template Library" (MEDIUM)

### SRS-002 (Architecture) Updates:
- [ ] Add `appliedTemplateId` to `WalletPassStudioState`
- [ ] Add `WalletTemplate` interface
- [ ] Update template gallery state management

### SRS-003 (UI Specs) Updates:
- [ ] Redesign Template Gallery with 3 tabs (System, My Templates, AI)
- [ ] Add "Save as Template" modal
- [ ] Add template card with actions (⋮ menu, ⭐ favorite, usage count)
- [ ] Add "My Templates" empty state
- [ ] Add template preview modal with metadata
- [ ] Add "Duplicate Template" flow
- [ ] Add "Delete Template" confirmation
- [ ] Add template variant generation UI

### SRS-005 (User Journeys) Updates:
- [ ] J-24: Save Design as Template
- [ ] J-25: Apply My Template to New Program
- [ ] J-26: Manage My Templates (CRUD)
- [ ] J-27: Generate Template Variations with AI
- [ ] J-28: Duplicate and Modify Template

### SRS-008 (Back Design) Updates:
- [ ] Template save dialog: "Include back content" checkbox

### IMPLEMENTATION-PLAN Updates:
- [ ] Add Phase 7.5: User Template Library
- [ ] Add backend models and migrations
- [ ] Add template CRUD API endpoints
- [ ] Add template preview image generation
- [ ] Add template gallery tab system
- [ ] Add save-as-template modal
- [ ] Add template management UI

---

*End of SRS-009 — User Custom Template Library*
*This document MUST be integrated into the master design before coding begins*
