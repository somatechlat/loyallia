# SRS-008: Back of Pass (Reverse) Design Specification

> **ISO/IEC/IEEE 29148:2018 — Software Requirements Specification**  
> Document ID: SRS-LOY-WPS-008 | Version: 1.0.0-Draft  
> **Status:** Critical Addition — Integrates into SRS-002, SRS-003, SRS-004  
> **Date:** 2026-06-03

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Apple Wallet — Back of Pass](#2-apple-wallet--back-of-pass)
3. [Google Wallet — Details View](#3-google-wallet--details-view)
4. [Studio Integration: Front ↔ Back Toggle](#4-studio-integration-front--back-toggle)
5. [Back Content Sidebar Design](#5-back-content-sidebar-design)
6. [Back Preview Mockups](#6-back-preview-mockups)
7. [Default Back Content by Card Type](#7-default-back-content-by-card-type)
8. [Design Score: Back Checks](#8-design-score-back-checks)
9. [State Model Additions](#9-state-model-additions)
10. [Platform Differences Summary](#10-platform-differences-summary)

---

## 1. Executive Summary

**The Problem:** Current Wallet Pass Studio documentation focuses 95% on the **front** of passes. The back/reverse is mentioned in passing (`backFields` for Apple, `detailsTemplateOverride` for Google) but:
- ❌ No visual preview of the back side in the Studio canvas
- ❌ No "flip" mechanism to design the back
- ❌ Back content is buried inside the "Content" tab
- ❌ No default back content in templates (terms, contact, rules)
- ❌ No design score checks for back content quality
- ❌ Users cannot SEE how the back looks on iPhone vs Pixel

**The Solution:** Treat the back as a **peer design surface** to the front. Add a front/back toggle to the canvas, dedicated back preview rendering, a clear back-content editor, default back content per template, and back-specific design quality checks.

---

## 2. Apple Wallet — Back of Pass

### 2.1 How Users Access It

| Action | iOS Behavior |
|--------|-------------|
| Tap ⓘ (info button) | Flips pass to show back |
| Tap "Done" or swipe | Returns to front |
| Back is NOT shown on Apple Watch | Watch shows front content only |

### 2.2 Visual Layout (iOS Renders This — We Must Preview It)

```
┌──────────────────────────────┐
│  ← Back        [Done]        │  ← Navigation bar (system)
├──────────────────────────────┤
│                              │
│  ┌────────────────────────┐  │
│  │  [LOGO]  Café Central  │  │  ← logoText + logo (small)
│  └────────────────────────┘  │
│                              │
│  ──────────────────────────  │  ← Separator line
│                              │
│  TÉRMINOS Y CONDICIONES      │  ← backFields[0].label (small, gray)
│  Participa acumulando sellos │  ← backFields[0].value (larger)
│  en cada compra. Válido por  │     (attributedValue supported)
│  12 meses desde la emisión.  │
│                              │
│  ──────────────────────────  │
│                              │
│  CONTACTO                    │  ← backFields[1].label
│  contacto@cafecentral.com    │  ← backFields[1].value
│                              │
│  ──────────────────────────  │
│                              │
│  SITIO WEB                   │  ← backFields[2].label
│  www.cafecentral.com         │  ← backFields[2].value (can be <a> link)
│                              │
│  ──────────────────────────  │
│                              │
│  REGLAS DEL PROGRAMA         │  ← backFields[3].label
│  • 1 sello por compra >$5    │  ← backFields[3].value
│  • Recompensa: café gratis   │
│  • No acumulable con otras   │
│    promociones               │
│                              │
│  ──────────────────────────  │
│                              │
│  POLÍTICA DE PRIVACIDAD      │  ← backFields[4].label
│  Leer más...                 │  ← backFields[4].value (attributed link)
│                              │
│  ──────────────────────────  │
│                              │
│  [📱 Abrir en la app]        │  ← appLaunchURL (if configured)
│                              │
│  ──────────────────────────  │
│                              │
│  Compartido desde Loyallia   │  ← footer (system text)
│                              │
└──────────────────────────────┘
│          ⬚ ⬚ ⬚              │  ← Page indicator dots (front/back)
└──────────────────────────────┘
```

### 2.3 Apple Back Design Rules

| Rule | Detail |
|------|--------|
| **Background** | Same as front (`backgroundColor`) |
| **Text color** | Same as front (`foregroundColor`) |
| **Label color** | Same as front (`labelColor`) |
| **Images** | ❌ NO images allowed on back |
| **Field count** | ✅ Unlimited `backFields` |
| **Links** | ✅ Via `attributedValue` with `<a href>` tags |
| **App button** | ✅ `appLaunchURL` renders as "Open in App" button |
| **Format** | Plain vertical list, system styling |
| **Customizable** | ❌ Layout is fixed by iOS. Only content changes. |

### 2.4 Apple backFields Structure

```json
{
  "storeCard": {
    "backFields": [
      {
        "key": "terms",
        "label": "TÉRMINOS Y CONDICIONES",
        "value": "Participa acumulando sellos en cada compra. Válido por 12 meses."
      },
      {
        "key": "contact",
        "label": "CONTACTO",
        "value": "contacto@negocio.com"
      },
      {
        "key": "website",
        "label": "SITIO WEB",
        "value": "Visita nuestro sitio",
        "attributedValue": "<a href='https://example.com'>Visita nuestro sitio</a>"
      },
      {
        "key": "rules",
        "label": "REGLAS DEL PROGRAMA",
        "value": "• 1 sello por compra >$5\n• Recompensa: café gratis\n• No acumulable"
      },
      {
        "key": "privacy",
        "label": "POLÍTICA DE PRIVACIDAD",
        "value": "<a href='https://example.com/privacy'>Leer política completa</a>",
        "attributedValue": "<a href='https://example.com/privacy'>Leer política completa</a>"
      }
    ]
  }
}
```

### 2.5 Apple Back — What Loyallia Should Always Include

Every Loyallia pass should have these back fields by default:

| # | Field | Label | Value | Required |
|---|-------|-------|-------|:--------:|
| 1 | Program Rules | REGLAS DEL PROGRAMA | Card-type-specific rules | ✅ |
| 2 | Terms | TÉRMINOS Y CONDICIONES | Generic terms | ✅ |
| 3 | Contact | CONTACTO | Business email/phone | ✅ |
| 4 | Website | SITIO WEB | Business URL (attributed link) | ⚪ |
| 5 | Privacy | POLÍTICA DE PRIVACIDAD | Privacy policy link | ⚪ |
| 6 | App Link | ABRIR EN LA APP | `appLaunchURL` (system button) | ⚪ |

---

## 3. Google Wallet — Details View (Back of Pass)

### 3.1 How Users Access It

| Action | Android Behavior |
|--------|-----------------|
| Tap "Details" button | Expands/shows details view |
| Swipe up on card | Reveals details section |
| Back arrow | Returns to card front |

### 3.2 Visual Layout (Google Wallet App Renders This)

```
┌──────────────────────────────┐
│  ← Details                   │  ← Header with back arrow
├──────────────────────────────┤
│                              │
│  ┌────────────────────────┐  │
│  │  [LOGO]  Café Central  │  │  ← Program logo + name
│  └────────────────────────┘  │
│                              │
│  ═══════════════════════════ │
│  TÉRMINOS Y CONDICIONES      │  ← Section title (bold)
│  ─────────────────────────── │
│  Participa acumulando sellos │  ← Body text
│  en cada compra. Válido por  │
│  12 meses desde la emisión.  │
│                              │
│  ═══════════════════════════ │
│  REGLAS DEL PROGRAMA         │  ← Section title
│  ─────────────────────────── │
│  • 1 sello por compra >$5    │
│  • Recompensa: café gratis   │
│  • No acumulable con otras   │
│    promociones               │
│                              │
│  ═══════════════════════════ │
│  ENLACES                     │  ← Section title
│  ─────────────────────────── │
│  🌐 Sitio Web                │  ← linksModuleData URI
│  📞 Llamar: +1-234-567-8900  │  ← tel: link
│  📧 Email: contacto@...      │  ← mailto: link
│                              │
│  ═══════════════════════════ │
│  [📱 Abrir App]              │  ← appLinkData button (if configured)
│                              │
└──────────────────────────────┘
```

### 3.3 Google Details Design Rules

| Rule | Detail |
|------|--------|
| **Background** | White/light gray (system default, NOT card background color) |
| **Text color** | System default (dark gray/black) |
| **Images** | ✅ `imageModulesData` can show images in details |
| **Field count** | ✅ Unlimited `detailsItemInfos` |
| **Links** | ✅ `linksModuleData` URIs render as clickable rows with icons |
| **App button** | ✅ `appLinkData` renders as button |
| **Format** | Section-based with dividers, more structured than Apple |
| **Customizable** | ✅ Full control via `detailsTemplateOverride` |

### 3.4 Google detailsTemplateOverride Structure

```json
{
  "classTemplateInfo": {
    "detailsTemplateOverride": {
      "detailsItemInfos": [
        {
          "item": {
            "firstValue": {
              "fields": [
                {
                  "fieldPath": "class.textModulesData['terms']"
                }
              ]
            }
          }
        },
        {
          "item": {
            "firstValue": {
              "fields": [
                {
                  "fieldPath": "class.textModulesData['rules']"
                }
              ]
            }
          }
        },
        {
          "item": {
            "firstValue": {
              "fields": [
                {
                  "fieldPath": "class.linksModuleData.uris['website']"
                }
              ]
            }
          }
        },
        {
          "item": {
            "firstValue": {
              "fields": [
                {
                  "fieldPath": "class.linksModuleData.uris['phone']"
                }
              ]
            }
          }
        }
      ]
    }
  }
}
```

### 3.5 Google Details — What Loyallia Should Always Include

| # | Section | Source | Required |
|---|---------|--------|:--------:|
| 1 | Terms & Conditions | `textModulesData['terms']` | ✅ |
| 2 | Program Rules | `textModulesData['rules']` | ✅ |
| 3 | Contact Info | `linksModuleData` (website, phone, email) | ✅ |
| 4 | App Link | `appLinkData` | ⚪ |
| 5 | Extra Images | `imageModulesData` | ⚪ |

---

## 4. Studio Integration: Front ↔ Back Toggle

### 4.1 Canvas Flip Mechanism

The Studio canvas MUST allow users to flip between front and back views.

```
┌─────────────────────────────────────────────────────────────────┐
│ TOOLBAR                                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [↩ Undo] [↪ Redo]    [🍎 Apple] [🤖 Google] [👁️ Both]        │
│                                                                 │
│  [🎨 Templates] [💾 Guardar]  ████ 8.2/10  [✨ Diseñar con IA] │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────┐           │
│  │                                                  │           │
│  │    ┌────────────────────────────────────┐       │           │
│  │    │  [🔄 FRENTE] [REVERSO]  ← TOGGLE   │       │           │
│  │    │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │       │           │
│  │    │                                    │       │           │
│  │    │    🍎 iPhone 15 Pro Frame           │       │           │
│  │    │  ┌──────────────────────────────┐   │       │           │
│  │    │  │  ← Back        [Done]        │   │       │           │
│  │    │  ├──────────────────────────────┤   │       │           │
│  │    │  │  [LOGO]  Café Central        │   │       │           │
│  │    │  │                              │   │       │           │
│  │    │  │  ──────────────────────────  │   │       │           │
│  │    │  │  TÉRMINOS Y CONDICIONES      │   │       │           │
│  │    │  │  Participa acumulando...     │   │       │           │
│  │    │  │                              │   │       │           │
│  │    │  │  ──────────────────────────  │   │       │           │
│  │    │  │  CONTACTO                    │   │       │           │
│  │    │  │  contacto@cafecentral.com    │   │       │           │
│  │    │  │                              │   │       │           │
│  │    │  │  ──────────────────────────  │   │       │           │
│  │    │  │  [📱 Abrir en la app]        │   │       │           │
│  │    │  │                              │   │       │           │
│  │    │  └──────────────────────────────┘   │       │           │
│  │    │                                    │       │           │
│  │    │    🤖 Pixel 8 Frame (Details view)  │       │           │
│  │    │  ┌──────────────────────────────┐   │       │           │
│  │    │  │  ← Details                   │   │       │           │
│  │    │  ├──────────────────────────────┤   │       │           │
│  │    │  │  [LOGO]  Café Central        │   │       │           │
│  │    │  │                              │   │       │           │
│  │    │  │  TÉRMINOS Y CONDICIONES      │   │       │           │
│  │    │  │  Participa acumulando...     │   │       │           │
│  │    │  │                              │   │       │           │
│  │    │  │  REGLAS DEL PROGRAMA         │   │       │           │
│  │    │  │  • 1 sello por compra...     │   │       │           │
│  │    │  │                              │   │       │           │
│  │    │  │  ENLACES                     │   │       │           │
│  │    │  │  🌐 Sitio Web                │   │       │           │
│  │    │  │  📞 +1-234-567-8900          │   │       │           │
│  │    │  │                              │   │       │           │
│  │    │  │  [📱 Abrir App]              │   │       │           │
│  │    │  └──────────────────────────────┘   │       │           │
│  │    └────────────────────────────────────┘       │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  SIDEBAR (shows BACK content when REVERSO is active)      │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │  📄 CONTENIDO DEL REVERSO                            │ │   │
│  │  │                                                      │ │   │
│  │  │  Campo 1:                                            │ │   │
│  │  │  Etiqueta: [TÉRMINOS Y CONDICIONES        ]         │ │   │
│  │  │  Valor:    [Participa acumulando sellos...]         │ │   │
│  │  │  [✓] Incluir enlace atribuido                       │ │   │
│  │  │  [🗑️]                                               │ │   │
│  │  │                                                      │ │   │
│  │  │  Campo 2:                                            │ │   │
│  │  │  Etiqueta: [CONTACTO                      ]         │ │   │
│  │  │  Valor:    [contacto@cafecentral.com      ]         │ │   │
│  │  │  [✓] Convertir en enlace (mailto:)                  │ │   │
│  │  │  [🗑️]                                               │ │   │
│  │  │                                                      │ │   │
│  │  │  [+ Añadir campo del reverso]                       │ │   │
│  │  │                                                      │ │   │
│  │  │  ────────────────────────────────────────────────   │ │   │
│  │  │                                                      │ │   │
│  │  │  🔗 ENLACES (Google Wallet)                          │ │   │
│  │  │  [✓] Sitio Web: [https://...             ]          │ │   │
│  │  │  [✓] Teléfono:  [+1-234-567-8900         ]          │ │   │
│  │  │  [✓] Email:     [contacto@...            ]          │ │   │
│  │  │  [+ Añadir enlace]                                  │ │   │
│  │  │                                                      │ │   │
│  │  │  ────────────────────────────────────────────────   │ │   │
│  │  │                                                      │ │   │
│  │  │  [📱] ENLACE A LA APP                                │ │   │
│  │  │  URL de lanzamiento: [https://app...      ]         │ │   │
│  │  │  (Apple: appLaunchURL | Google: appLinkData)        │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Flip Toggle Specifications

| Element | Spec |
|---------|------|
| **Location** | Top of canvas area, centered above device frames |
| **Label (Front)** | "🎨 FRENTE" or icon-only [▭] |
| **Label (Back)** | "📄 REVERSO" or icon-only [☰] |
| **Style** | Segmented toggle, pill shape, active side highlighted |
| **Animation** | Card flip animation (CSS 3D rotateY) when switching |
| **Keyboard shortcut** | `B` key toggles front/back |
| **Auto-flip** | When user clicks a back field in sidebar, auto-flip to back view |

### 4.3 Mobile Behavior

On mobile, the flip toggle becomes a swipe gesture:
- Swipe up on pass → show back
- Swipe down on back → return to front
- OR: Tab buttons at bottom: [FRENTE] [REVERSO]

---

## 5. Back Content Sidebar Design

### 5.1 Sidebar Changes When "Reverso" is Active

When the user toggles to "Reverso", the sidebar changes to show back-specific editing:

```
┌─────────────────────────────────────────────────────────────────┐
│ SIDEBAR: REVERSO TAB (replaces Content tab when back is active) │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📄 CAMPOS DEL REVERSO — Sin límite                      │   │
│  │  (Apple: backFields | Google: textModulesData en details)│   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ [⋮⋮] Campo 1                                    │    │   │
│  │  │ Etiqueta:  [TÉRMINOS Y CONDICIONES    ]         │    │   │
│  │  │ Valor:     [Participa acumulando...   ]         │    │   │
│  │  │                                                 │    │   │
│  │  │ [✓] Incluir enlace clickeable                   │    │   │
│  │  │    URL: [https://...                   ]        │    │   │
│  │  │    Texto visible: [Leer más            ]        │    │   │
│  │  │                                                 │    │   │
│  │  │ 🍎 Solo Apple: [✓] attributedValue              │    │   │
│  │  │ 🤖 Solo Google: [✓] linksModuleData             │    │   │
│  │  │ [🗑️]                                            │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ [⋮⋮] Campo 2                                    │    │   │
│  │  │ Etiqueta:  [CONTACTO                  ]         │    │   │
│  │  │ Valor:     [contacto@cafecentral.com  ]         │    │   │
│  │  │                                                 │    │   │
│  │  │ [✓] Convertir en enlace                         │    │   │
│  │  │    Tipo: [Email ●] [Teléfono ○] [Web ○]        │    │   │
│  │  │    (auto-formatea mailto:, tel:, https://)      │    │   │
│  │  │ [🗑️]                                            │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │                                                          │   │
│  │  [+ Añadir campo del reverso]                           │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🔗 ENLACES RÁPIDOS (Google Wallet + Apple links)        │   │
│  │                                                          │   │
│  │  [✓] Sitio Web:     [https://cafecentral.com     ]     │   │
│  │  [✓] Teléfono:      [+1-234-567-8900             ]     │   │
│  │  [✓] Email:         [contacto@cafecentral.com    ]     │   │
│  │  [  ] Instagram:    [                                ]     │   │
│  │  [  ] Facebook:     [                                ]     │   │
│  │                                                          │   │
│  │  ℹ️ Estos enlaces aparecen como botones clickeables     │   │
│  │     en Google Wallet y como texto con link en Apple.    │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📱 ENLACE A LA APP                                      │   │
│  │                                                          │   │
│  │  [✓] Añadir botón "Abrir en la app"                     │   │
│  │                                                          │   │
│  │  Apple (appLaunchURL):                                   │   │
│  │  [https://loyallia.app/open?program=123      ]          │   │
│  │                                                          │   │
│  │  Google (appLinkData):                                   │   │
│  │  Android: [com.loyallia.app                  ]          │   │
│  │  iOS:     [https://apps.apple.com/app/id...  ]          │   │
│  │  Web:     [https://loyallia.app              ]          │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🎨 IMÁGENES EN DETALLES (Google Wallet exclusivo)       │   │
│  │                                                          │   │
│  │  [+ Añadir imagen a la vista de detalles]               │   │
│  │  (Apple no soporta imágenes en el reverso)              │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Smart Link Detection

When user types a URL, email, or phone in a back field value:

| Input Pattern | Auto-Detected | Action |
|--------------|---------------|--------|
| `contacto@email.com` | Email | Suggest `mailto:` link |
| `+1-234-567-8900` | Phone | Suggest `tel:` link |
| `https://example.com` | Website | Suggest `https://` link |
| `@cafe_central` | Social | Suggest platform link |

---

## 6. Back Preview Mockups

### 6.1 Apple Back Preview (Inside iPhone Frame)

```
┌──────────────────────────────┐
│ ○ ○ ○ ○ ○      9:41    🔋  │  ← Status bar
│                              │
│  ┌────────────────────────┐  │
│  │  [LOGO]  Café Central  │  │  ← logo + logoText
│  └────────────────────────┘  │
│                              │
│  TÉRMINOS Y CONDICIONES      │  ← backFields[0].label
│  ──────────────────────────  │
│  Participa acumulando sellos │  ← backFields[0].value
│  en cada compra. Válido por  │
│  12 meses desde la emisión.  │
│                              │
│  CONTACTO                    │  ← backFields[1].label
│  ──────────────────────────  │
│  contacto@cafecentral.com    │  ← backFields[1].value
│                              │
│  SITIO WEB                   │  ← backFields[2].label
│  ──────────────────────────  │
│  Visita nuestro sitio →      │  ← attributedValue link (blue)
│                              │
│  REGLAS DEL PROGRAMA         │  ← backFields[3].label
│  ──────────────────────────  │
│  • 1 sello por compra >$5    │
│  • Recompensa: café gratis   │
│  • No acumulable con otras   │
│    promociones               │
│                              │
│  [📱 Abrir en la app]        │  ← appLaunchURL button
│                              │
│  ──────────────────────────  │
│  Compartido desde Loyallia   │  ← System footer
│                              │
└──────────────────────────────┘
```

**Visual Rules for Apple Back Preview:**
- Background: same `backgroundColor` as front
- Labels: `labelColor`, 12px, uppercase, light weight
- Values: `foregroundColor`, 15px, normal weight
- Links: iOS system blue (#007AFF), underlined
- Separators: 1px line, 20% opacity of foregroundColor
- App button: system blue, rounded rectangle

### 6.2 Google Back Preview (Inside Pixel Frame)

```
┌──────────────────────────────┐
│  ─────   9:41            🔋  │  ← Status bar
│                              │
│  ← Details                   │  ← Back arrow header
│                              │
│  ┌────────────────────────┐  │
│  │  [LOGO]  Café Central  │  │  ← Program logo
│  └────────────────────────┘  │
│                              │
│  ═══════════════════════════ │  ← Section divider
│  TÉRMINOS Y CONDICIONES      │  ← Section header (bold)
│  ─────────────────────────── │
│  Participa acumulando sellos │
│  en cada compra. Válido por  │
│  12 meses desde la emisión.  │
│                              │
│  ═══════════════════════════ │
│  REGLAS DEL PROGRAMA         │
│  ─────────────────────────── │
│  • 1 sello por compra >$5    │
│  • Recompensa: café gratis   │
│  • No acumulable con otras   │
│    promociones               │
│                              │
│  ═══════════════════════════ │
│  ENLACES                     │
│  ─────────────────────────── │
│  🌐  Sitio Web               │  ← Link row with icon
│      cafecentral.com         │
│  📞  +1-234-567-8900         │  ← Phone row
│  📧  contacto@cafecentral.com│  ← Email row
│                              │
│  ═══════════════════════════ │
│  [     📱  ABRIR APP      ]  │  ← Full-width button
│                              │
└──────────────────────────────┘
```

**Visual Rules for Google Details Preview:**
- Background: white (#FFFFFF) or very light gray
- Section headers: 16px, bold, dark gray
- Body text: 14px, regular, dark gray
- Link rows: icon + label + URL, full width, tappable
- Button: Google blue (#1A73E8), white text, rounded

---

## 7. Default Back Content by Card Type

Every template MUST include sensible default back content. Here's what each card type should have:

### 7.1 Stamp Card (Tarjeta de Sellos)

```
REGLAS DEL PROGRAMA
• Acumula 1 sello por cada compra de $5 o más
• Completa {stamps_required} sellos para tu recompensa
• Recompensa: {reward_description}
• Los sellos no tienen fecha de vencimiento
• No acumulable con otras promociones

TÉRMINOS Y CONDICIONES
Esta tarjeta es personal e intransferible. Loyallia y el comercio
se reservan el derecho de modificar el programa. Válido por
12 meses desde la emisión.

CONTACTO
{merchant_email}
{merchant_phone}
```

### 7.2 Cashback Card

```
REGLAS DEL PROGRAMA
• Acumula {cashback_percentage}% de cashback en cada compra
• Niveles: Bronce (5%), Plata (10%), Oro (15%), Platino (20%)
• El cashback se aplica como crédito en tu próxima compra
• Mínimo para redimir: ${min_redemption_amount}

TÉRMINOS Y CONDICIONES
El cashback tiene una vigencia de 6 meses desde su acumulación.
No aplica en productos en oferta. Sujeto a disponibilidad.
```

### 7.3 VIP Membership

```
BENEFICIOS VIP
• Acceso prioritario a eventos exclusivos
• Descuentos especiales en todos los productos
• Atención personalizada
• Acceso a áreas exclusivas

TÉRMINOS Y CONDICIONES
Membresía válida por 12 meses. Renovación automática.
Cancelación disponible 30 días antes del vencimiento.
```

### 7.4 Coupon / Discount

```
DETALLES DE LA OFERTA
• Descuento: {discount_percentage}% o ${discount_amount}
• Válido hasta: {expiration_date}
• Aplica en: {applicable_products}
• No combinable con otras ofertas

TÉRMINOS Y CONDICIONES
Un solo uso por cliente. Presentar esta tarjeta al momento de
pagar. El comercio se reserva el derecho de finalizar la
promoción sin previo aviso.
```

### 7.5 Gift Certificate

```
DETALLES DEL REGALO
• Valor: ${gift_amount}
• Válido hasta: {expiration_date}
• Canjeable en: todas las sucursales
• No canjeable por efectivo

TÉRMINOS Y CONDICIONES
Esta tarjeta de regalo no tiene valor en efectivo. No se
reemplazará si se pierde o es robada. El saldo restante se
acredita para futuras compras.
```

---

## 8. Design Score: Back Checks

Add these checks to the Design Score algorithm:

```typescript
const BACK_DESIGN_CHECKS = [
  { id: 'has_back_fields',      weight: 0.05, check: hasBackFields },
  { id: 'has_terms',            weight: 0.03, check: hasTermsField },
  { id: 'has_contact_info',     weight: 0.03, check: hasContactField },
  { id: 'has_program_rules',    weight: 0.02, check: hasRulesField },
  { id: 'back_content_length',  weight: 0.02, check: backContentNotEmpty },
];
```

| Check | Weight | Pass Criteria | Fail Message |
|-------|:------:|---------------|--------------|
| `has_back_fields` | 5% | At least 2 back fields | "Añade información al reverso de la tarjeta" |
| `has_terms` | 3% | Contains "términos" or "terms" label | "Faltan términos y condiciones" |
| `has_contact_info` | 3% | Contains email or phone | "Añade información de contacto" |
| `has_program_rules` | 2% | Contains "reglas" or "rules" label | "Añade las reglas del programa" |
| `back_content_length` | 2% | Total back content > 50 chars | "El reverso está muy vacío" |

**Updated Total Score Weights:**

| Category | Old Weight | New Weight | Change |
|----------|:----------:|:----------:|--------|
| Logo uploaded | 15% | 13% | -2% |
| Logo dimensions | 10% | 9% | -1% |
| Contrast ratio | 20% | 18% | -2% |
| Barcode configured | 10% | 9% | -1% |
| Required fields | 15% | 13% | -2% |
| Hero image | 10% | 9% | -1% |
| Image aspect ratios | 10% | 9% | -1% |
| **Back content (NEW)** | — | **15%** | **+15%** |
| Dual platform | 5% | 5% | — |
| **Total** | **100%** | **100%** | |

---

## 9. State Model Additions

### 9.1 Additions to `WalletPassStudioState`

```typescript
interface WalletPassStudioState {
  // ... existing fields ...
  
  // BACK CONTENT (NEW — added to state)
  backContent: {
    // Unified back fields (rendered differently per platform)
    fields: BackField[];
    
    // Quick links (rendered as links on both platforms)
    links: BackLink[];
    
    // App link configuration
    appLink?: {
      appleUrl?: string;      // appLaunchURL
      googleAndroidAppId?: string;
      googleIosAppUrl?: string;
      googleWebUrl?: string;
    };
    
    // Google-only: images in details view
    detailImages?: DetailImage[];
  };
}

interface BackField {
  id: string;
  label: string;
  value: string;
  isLink: boolean;
  linkUrl?: string;
  linkType?: 'web' | 'email' | 'phone' | 'custom';
  order: number;
}

interface BackLink {
  id: string;
  type: 'website' | 'phone' | 'email' | 'instagram' | 'facebook' | 'custom';
  url: string;
  label: string;
  icon?: string;
}

interface DetailImage {
  id: string;
  sourceUrl: string;
  description: string;
}
```

### 9.2 Mapping to Apple

```typescript
// backContent.fields → Apple backFields
const appleBackFields = backContent.fields.map(field => ({
  key: field.id,
  label: field.label,
  value: field.value,
  ...(field.isLink ? {
    attributedValue: `<a href='${field.linkUrl}'>${field.value}</a>`
  } : {})
}));

// backContent.appLink.appleUrl → appLaunchURL
const appLaunchURL = backContent.appLink?.appleUrl;
```

### 9.3 Mapping to Google

```typescript
// backContent.fields → Google textModulesData (class-level)
const googleTextModules = backContent.fields.map(field => ({
  id: field.id,
  header: field.label,
  body: field.value
}));

// backContent.links → Google linksModuleData
const googleLinks = backContent.links.map(link => ({
  id: link.id,
  description: link.label,
  uri: link.url
}));

// backContent.detailImages → Google imageModulesData
const googleDetailImages = backContent.detailImages?.map(img => ({
  id: img.id,
  mainImage: {
    sourceUri: { uri: img.sourceUrl },
    contentDescription: {
      defaultValue: { language: 'es-ES', value: img.description }
    }
  }
}));

// detailsTemplateOverride references these
const detailsTemplateOverride = {
  detailsItemInfos: [
    ...backContent.fields.map(f => ({
      item: {
        firstValue: {
          fields: [{ fieldPath: `class.textModulesData['${f.id}']` }]
        }
      }
    })),
    ...backContent.links.map(l => ({
      item: {
        firstValue: {
          fields: [{ fieldPath: `class.linksModuleData.uris['${l.id}']` }]
        }
      }
    }))
  ]
};
```

---

## 10. Platform Differences Summary

| Aspect | Apple Wallet Back | Google Wallet Details |
|--------|------------------|----------------------|
| **Access** | Tap ⓘ button | Tap "Details" or swipe up |
| **Background** | Same as front | White/light gray (fixed) |
| **Text colors** | Same as front | System default (dark) |
| **Images** | ❌ Not supported | ✅ Supported via `imageModulesData` |
| **Links** | ✅ `attributedValue` `<a href>` | ✅ `linksModuleData` URIs |
| **Link styling** | Blue underlined text | Clickable row with icon |
| **App button** | System "Open in App" button | `appLinkData` button |
| **Field count** | Unlimited | Unlimited |
| **Layout** | Vertical list, system-styled | Section-based with dividers |
| **Customizable** | ❌ Fixed layout | ✅ `detailsTemplateOverride` |
| **Section headers** | Labels above values | Bold section titles |
| **Separator** | Thin line between fields | Thick divider between sections |
| **Footer** | "Shared from [App]" | None |

---

## 11. Integration Checklist for Existing Documents

### SRS-002 (Architecture) Updates:
- [ ] Add `backContent` to `WalletPassStudioState`
- [ ] Add `BackField`, `BackLink`, `DetailImage` interfaces
- [ ] Add flip toggle to `ui` state (`showBack: boolean`)
- [ ] Add back content to migration function (v1→v2)

### SRS-003 (UI Specs) Updates:
- [ ] Add front/back toggle to toolbar mockup
- [ ] Add back preview to canvas mockups (both iPhone + Pixel)
- [ ] Add "Reverso" sidebar tab/section mockup
- [ ] Add back content to template gallery cards
- [ ] Add flip animation description

### SRS-004 (Appendices) Updates:
- [ ] Expand Apple A.4 with backFields full specification
- [ ] Expand Google B.11 with detailsTemplateOverride full specification
- [ ] Add back content to Feature Parity Matrix (C.2)
- [ ] Add back content to Field Mapping (C.4)

### IMPLEMENTATION-PLAN Updates:
- [ ] Add `BackDesignTab.tsx` to new files list
- [ ] Add `AppleBackPreview.tsx` component
- [ ] Add `GoogleBackPreview.tsx` component
- [ ] Add back content to Phase 3 (Content Tab)
- [ ] Add back design score checks to Phase 6
- [ ] Add back content to template definitions in Phase 7

---

*End of SRS-008 — Back of Pass Design Specification*
*This document MUST be integrated into the master design before coding begins*
