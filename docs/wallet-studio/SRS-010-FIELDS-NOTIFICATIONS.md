# SRS-010: Custom Fields, Dynamic Values & Field-Based Notifications

> **ISO/IEC/IEEE 29148:2018 — Software Requirements Specification**  
> Document ID: SRS-LOY-WPS-010 | Version: 1.0.0-Draft  
> **Status:** Critical Addition — Core Design Tool  
> **Date:** 2026-06-03

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Apple PassKit Field System Deep Dive](#2-apple-passkit-field-system-deep-dive)
3. [Google Wallet Field System Deep Dive](#3-google-wallet-field-system-deep-dive)
4. [Unified Field Model](#4-unified-field-model)
5. [Custom Field Creator UI](#5-custom-field-creator-ui)
6. [Dynamic Value Templates](#6-dynamic-value-templates)
7. [Field-Based Notifications (changeMessage & Messages)](#7-field-based-notifications)
8. [Field Editor — Complete Sidebar Design](#8-field-editor--complete-sidebar-design)
9. [Field Preview & Validation](#9-field-preview--validation)
10. [Platform-Specific Field Behaviors](#10-platform-specific-field-behaviors)
11. [Integration Checklist](#11-integration-checklist)

---

## 1. Executive Summary

**The Problem:** Both Apple PassKit and Google Wallet support rich custom fields with notification capabilities, but our current design treats fields as static text boxes. Users cannot:
- Create truly custom fields with platform-specific features
- Configure push notifications when field values change
- Use dynamic values (customer name, points balance, stamp count)
- See field limits and validation in real-time
- Understand which fields trigger notifications on which platform

**The Solution:** A **Field Studio** within the Wallet Pass Studio that treats every field as a **smart, configurable entity** with:
- Visual drag-and-drop field creation
- Dynamic value template picker
- Per-field notification configuration
- Real-time platform limit validation
- Field-type-specific options (date, currency, links)

---

## 2. Apple PassKit Field System Deep Dive

### 2.1 Apple Field Types (5 Groups)

| Group | Max | Visibility | Use Case |
|-------|:---:|:----------:|----------|
| `headerFields` | 3 | ✅ Always (even in stack) | Quick status: stamps count, balance, tier |
| `primaryFields` | 1 | ✅ Most prominent | Main value: customer name, reward title |
| `secondaryFields` | 4 | ✅ Supporting info | Details: expiration, member since, points |
| `auxiliaryFields` | 4 | ✅ Additional | Extra: location, phone, last visit |
| `backFields` | ∞ | ℹ️ Tap ⓘ to see | Terms, rules, contact, policies |

**⚠️ Layout Limit:** Coupons, Store Cards, and Generic with **square barcode** = max 4 combined secondary + auxiliary.

### 2.2 Apple Field Properties (ALL Available)

```json
{
  "key": "stamp_count",
  "label": "SELLos",
  "value": "3 / 10",
  "changeMessage": "¡Nuevo sello! Ahora tienes %@",
  "textAlignment": "PKTextAlignmentCenter",
  "dateStyle": "PKDateStyleShort",
  "timeStyle": "PKDateStyleShort",
  "numberStyle": "PKNumberStyleDecimal",
  "currencyCode": "USD",
  "attributedValue": "<a href='https://...'>Click aquí</a>"
}
```

| Property | Type | UI Label | What It Does |
|----------|------|----------|--------------|
| `key` | String | ID interno | Unique identifier. Used by backend to update field via API |
| `label` | String | Etiqueta | Text shown above value (small, gray) |
| `value` | String/Number/Date | Valor | Main display text |
| `changeMessage` | String | Mensaje de cambio | **PUSH NOTIFICATION** sent when value changes. `%@` = new value |
| `textAlignment` | Enum | Alineación | Left / Center / Right / Natural |
| `dateStyle` | Enum | Formato de fecha | None / Short / Medium / Long / Full |
| `timeStyle` | Enum | Formato de hora | None / Short / Medium / Long / Full |
| `numberStyle` | Enum | Formato numérico | Decimal / Percent / Scientific / SpellOut |
| `currencyCode` | String | Moneda | ISO 4217 (USD, EUR, MXN) |
| `attributedValue` | String | Valor con formato | HTML-like: `<a>`, `<b>`, `<i>` links and styling |

### 2.3 Apple changeMessage — THE MOST IMPORTANT FIELD FEATURE

**What it does:** When your backend updates a field value via the Apple Web Service API, iOS automatically sends a **push notification** to the user's lock screen with this message.

```json
{
  "headerFields": [
    {
      "key": "stamp_count",
      "label": "SELLOS",
      "value": "3 / 10",
      "changeMessage": "⭐ ¡Nuevo sello en Café Central! Ahora tienes %@"
    }
  ]
}
```

**User sees on lock screen:**
```
┌─────────────────────────┐
│  ☕ Café Central        │
│  ⭐ ¡Nuevo sello en     │
│     Café Central!       │
│     Ahora tienes 4 / 10 │
│                         │
│  [Deslizar para ver]    │
└─────────────────────────┘
```

**When it fires:**
- Backend calls `PUT https://your-web-service/v1/passes/{passTypeIdentifier}/{serialNumber}`
- With updated `pass.json` containing new field value
- Apple Push Notification Service (APNs) delivers to device
- User sees lock screen notification with `changeMessage`

**changeMessage Rules:**
| Rule | Detail |
|------|--------|
| `%@` placeholder | Replaced with the NEW value |
| Max length | ~120 characters (system trims) |
| Only fires on VALUE change | Same value = no notification |
| Only for updated fields | Only fields with changed values notify |
| Requires web service | Must have `webServiceURL` + `authenticationToken` in pass |
| Silent updates | Possible with background update (no UI) |

### 2.4 Apple Field Data Types

| Type | Example Value | Renders As | Format Options |
|------|--------------|-----------|---------------|
| **Plain Text** | `"Juan Pérez"` | "Juan Pérez" | Alignment only |
| **Number** | `42` | "42" | Decimal, Percent, Scientific, SpellOut |
| **Currency** | `{"amount": "150.00", "currency": "USD"}` | "$150.00" | NumberStyle + currencyCode |
| **Date** | `"2024-12-25T18:00:00Z"` | "Dec 25, 2024" | DateStyle + TimeStyle |
| **Attributed** | `"<a href='...'>Link</a>"` | Clickable link | HTML subset |

---

## 3. Google Wallet Field System Deep Dive

### 3.1 Google Custom Fields: textModulesData

Google's primary custom field mechanism:

```json
{
  "textModulesData": [
    {
      "id": "customer_name",
      "header": "CLIENTE",
      "body": "Juan Pérez"
    },
    {
      "id": "stamp_count",
      "header": "SELLOS",
      "body": "3 / 10"
    },
    {
      "id": "tier_level",
      "header": "NIVEL",
      "body": "🥇 Oro"
    }
  ]
}
```

| Property | Type | UI Label | What It Does |
|----------|------|----------|--------------|
| `id` | String | ID interno | Unique identifier per textModulesData array |
| `header` | String | Etiqueta | Label shown above or beside value |
| `body` | String | Valor | Main display text |

### 3.2 Google Predefined Fields by Pass Type

Google has **built-in fields** that get special rendering:

| Pass Type | Field | Path | Special Rendering |
|-----------|-------|------|------------------|
| **Loyalty** | `accountName` | `object.accountName` | Large, prominent |
| **Loyalty** | `accountId` | `object.accountId` | Member ID |
| **Loyalty** | `loyaltyPoints` | `object.loyaltyPoints` | Points with tier color |
| **Loyalty** | `rewardsTier` | `class.rewardsTier` | Tier badge |
| **Offer** | `title` | `class.title` | Large title |
| **Offer** | `redemptionCode` | `object.redemptionCode` | Prominent code display |
| **GiftCard** | `balance` | `object.balance` | Large balance amount |
| **GiftCard** | `cardNumber` | `object.cardNumber` | Card number |
| **All** | `cardTitle` | `object.cardTitle` | Card header |
| **All** | `header` | `object.header` | Sub-header |
| **All** | `subheader` | `object.subheader` | Secondary text |

### 3.3 Google Messages (Lifecycle Notifications)

Google uses a **messages array** for notifications, NOT per-field like Apple:

```json
{
  "messages": [
    {
      "id": "welcome_msg",
      "header": "¡Bienvenido!",
      "body": "Gracias por unirte al programa de Café Central",
      "displayInterval": {
        "start": {"date": "2024-06-01"},
        "end": {"date": "2024-06-08"}
      }
    },
    {
      "id": "stamp_notification",
      "header": "⭐ ¡Nuevo sello!",
      "body": "Has recibido un sello. Llevas 4 de 10.",
      "displayInterval": {
        "start": {"date": "2024-06-15"},
        "end": {"date": "2024-06-16"}
      }
    },
    {
      "id": "expiration_warning",
      "header": "⚠️ Oferta por expirar",
      "body": "Tu cupón expira en 3 días. ¡Úsalo pronto!",
      "displayInterval": {
        "start": {"date": "2024-12-22"},
        "end": {"date": "2024-12-25"}
      }
    }
  ]
}
```

**Google Message Types:**

| Type | When Shown | Use Case |
|------|-----------|----------|
| **Welcome** | First 7 days after add | Onboarding message |
| **Update** | When specific field changes | "You got a new stamp!" |
| **Expiration** | X days before expiry | Urgency notification |
| **Reminder** | Scheduled date range | "Don't forget to use your pass" |
| **Congratulatory** | When goal reached | "🎉 You earned your free coffee!" |

**Key Difference from Apple:**
- Apple: `changeMessage` is **per-field**, fires automatically on value change
- Google: `messages` is **global**, requires explicit scheduling or API trigger

### 3.4 Google Notification Delivery

| Method | Trigger | Delivery |
|--------|---------|----------|
| **REST API patch** | Backend calls `PATCH /walletobjects/v1/loyaltyObject/{id}` | Push to device |
| **Message displayInterval** | Date range in message object | Shown during window |
| **State change** | `ACTIVE` → `EXPIRED` | System notification |
| **Smart Tap** | NFC tap at terminal | Real-time validation |

---

## 4. Unified Field Model

### 4.1 Our Unified Field (Platform-Agnostic)

```typescript
interface UnifiedField {
  id: string;                    // Unique field ID
  
  // Basic Info
  label: string;                 // Display label
  value: string;                 // Static value or template
  valueType: 'text' | 'number' | 'date' | 'currency' | 'url' | 'dynamic';
  
  // Position / Type
  fieldGroup: 'header' | 'primary' | 'secondary' | 'auxiliary' | 'back';
  order: number;                 // Display order within group
  
  // Platform Visibility
  showOnApple: boolean;
  showOnGoogle: boolean;
  
  // Dynamic Value
  isDynamic: boolean;            // Uses template like {customer_name}
  dynamicTemplate?: string;      // e.g., "{stamp_count} / {stamps_required}"
  
  // Apple-Specific
  appleOptions: {
    changeMessage?: string;      // Push notification message
    textAlignment?: 'left' | 'center' | 'right' | 'natural';
    dateStyle?: 'none' | 'short' | 'medium' | 'long' | 'full';
    timeStyle?: 'none' | 'short' | 'medium' | 'long' | 'full';
    numberStyle?: 'decimal' | 'percent' | 'scientific' | 'spellOut';
    currencyCode?: string;       // USD, EUR, MXN
    attributedValue?: string;    // HTML-like links
  };
  
  // Google-Specific
  googleOptions: {
    isPredefined?: boolean;      // Uses Google built-in field
    predefinedPath?: string;     // e.g., "object.loyaltyPoints"
    textModulesId?: string;      // textModulesData ID
  };
  
  // Notifications
  notifications: {
    appleChangeMessage?: {       // Apple: fires on value change
      enabled: boolean;
      message: string;           // "¡Nuevo sello! Ahora tienes %@"
    };
    googleMessage?: {            // Google: scheduled or triggered
      enabled: boolean;
      header: string;
      body: string;
      trigger: 'onChange' | 'scheduled' | 'beforeExpiry';
      daysBeforeExpiry?: number; // For beforeExpiry trigger
    };
  };
  
  // Formatting
  formatting: {
    isLink: boolean;
    linkUrl?: string;
    linkType?: 'web' | 'email' | 'phone';
  };
}
```

### 4.2 Field Mapping to Apple

```typescript
function mapToAppleField(field: UnifiedField): AppleField {
  return {
    key: field.id,
    label: field.label.toUpperCase(),
    value: field.isDynamic ? resolveTemplate(field.dynamicTemplate) : field.value,
    ...(field.appleOptions.changeMessage ? {
      changeMessage: field.appleOptions.changeMessage
    } : {}),
    ...(field.appleOptions.textAlignment ? {
      textAlignment: `PKTextAlignment${capitalize(field.appleOptions.textAlignment)}`
    } : {}),
    ...(field.valueType === 'date' ? {
      dateStyle: `PKDateStyle${capitalize(field.appleOptions.dateStyle || 'short')}`,
      timeStyle: `PKDateStyle${capitalize(field.appleOptions.timeStyle || 'none')}`
    } : {}),
    ...(field.valueType === 'number' || field.valueType === 'currency' ? {
      numberStyle: `PKNumberStyle${capitalize(field.appleOptions.numberStyle || 'decimal')}`,
      ...(field.appleOptions.currencyCode ? {
        currencyCode: field.appleOptions.currencyCode
      } : {})
    } : {}),
    ...(field.formatting.isLink ? {
      attributedValue: `<a href='${field.formatting.linkUrl}'>${field.value}</a>`
    } : {})
  };
}
```

### 4.3 Field Mapping to Google

```typescript
function mapToGoogleField(field: UnifiedField): GoogleFieldMapping {
  if (field.googleOptions.isPredefined && field.googleOptions.predefinedPath) {
    // Use Google's built-in field
    return {
      type: 'predefined',
      path: field.googleOptions.predefinedPath,
      value: field.value
    };
  }
  
  // Use textModulesData
  return {
    type: 'textModule',
    id: field.googleOptions.textModulesId || field.id,
    header: field.label,
    body: field.isDynamic ? resolveTemplate(field.dynamicTemplate) : field.value
  };
}
```

---

## 5. Custom Field Creator UI

### 5.1 "Add Field" Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CONTENT TAB — User clicks "+ Añadir campo"                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 1: Choose Field Position                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ¿Dónde quieres colocar este campo?                                  │   │
│  │                                                                      │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │   │
│  │  │    🏷️      │  │    ⭐      │  │    📋      │  │    🔍      │   │   │
│  │  │  CABECERA  │  │ PRINCIPAL  │  │ SECUNDARIO │  │ AUXILIAR   │   │   │
│  │  │            │  │            │  │            │  │            │   │   │
│  │  │ Máx: 3     │  │ Máx: 1     │  │ Máx: 4     │  │ Máx: 4     │   │   │
│  │  │ Usados: 1  │  │ Usados: 0  │  │ Usados: 2  │  │ Usados: 1  │   │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  📄 REVERSO — Sin límite                                   │   │   │
│  │  │  (Términos, contacto, reglas del programa)                 │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  STEP 2: Field Configuration (after selecting position)                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ✏️ NUEVO CAMPO: Secundario                                          │   │
│  │                                                                      │   │
│  │  Etiqueta (Label):                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ PUNTOS ACUMULADOS                                            │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │  ℹ️ Se mostrará en pequeño sobre el valor                          │   │
│  │                                                                      │   │
│  │  Valor:                                                              │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ {loyalty_points} pts                                         │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │  [📋 Plantillas de valor ▼]  [✓] Usar valor dinámico              │   │
│  │                                                                      │   │
│  │  Tipo de valor:                                                     │   │
│  │  [●] Texto  [○] Número  [○] Fecha  [○] Moneda  [○] Enlace        │   │
│  │                                                                      │   │
│  │  ────────────────────────────────────────────────────────────     │   │
│  │                                                                      │   │
│  │  🔔 NOTIFICACIONES                                                   │   │
│  │                                                                      │   │
│  │  🍎 Apple Wallet:                                                    │   │
│  │  [✓] Enviar notificación push cuando cambie este valor             │   │
│  │  Mensaje: [⭐ ¡Nuevos puntos! Ahora tienes %@        ]             │   │
│  │  ℹ️ %@ se reemplaza con el nuevo valor automáticamente            │   │
│  │                                                                      │   │
│  │  🤖 Google Wallet:                                                   │   │
│  │  [✓] Mostrar mensaje cuando cambie                                  │   │
│  │  Título: [⭐ ¡Nuevos puntos!                        ]               │   │
│  │  Cuerpo: [Has recibido puntos. Total: {loyalty_points}            ] │   │
│  │  Disparador: [Al cambiar el valor ●] [Programado ○] [Antes de    │   │
│  │               expirar ○]                                           │   │
│  │                                                                      │   │
│  │  ────────────────────────────────────────────────────────────     │   │
│  │                                                                      │   │
│  │  🎨 FORMATO (Apple)                                                  │   │
│  │  Alineación: [ Izquierda ●] [Centro ○] [Derecha ○]                │   │
│  │                                                                      │   │
│  │  [✓] Mostrar en Apple Wallet    [✓] Mostrar en Google Wallet      │   │
│  │                                                                      │   │
│  │              ┌────────────────────────┐                             │   │
│  │              │  ✅ Añadir campo       │                             │   │
│  │              └────────────────────────┘                             │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Field Type Selector

When user selects value type, the UI adapts:

| Type | UI Changes | Platform Support |
|------|-----------|-----------------|
| **Texto** | Plain text input | Both |
| **Número** | Number input + format selector (decimal, %, scientific) | Both |
| **Fecha** | Date picker + style selector (short, medium, long) | Both |
| **Moneda** | Number input + currency selector (USD, EUR, MXN) | Both |
| **Enlace** | URL input + display text + link type (web, email, phone) | Both |
| **Dinámico** | Template selector dropdown | Both |

---

## 6. Dynamic Value Templates

### 6.1 Available Dynamic Templates

```typescript
const DYNAMIC_TEMPLATES = {
  // Customer Info
  '{customer_name}':        { label: 'Nombre del cliente', example: 'Juan Pérez' },
  '{customer_id}':          { label: 'ID de cliente', example: 'CUST-12345' },
  '{customer_email}':       { label: 'Email del cliente', example: 'juan@email.com' },
  '{customer_phone}':       { label: 'Teléfono del cliente', example: '+1-234-567-8900' },
  
  // Stamp Card
  '{stamp_count}':          { label: 'Sellos actuales', example: '3' },
  '{stamps_required}':      { label: 'Sellos necesarios', example: '10' },
  '{stamp_display}':        { label: 'Sellos (formato X/Y)', example: '3 / 10' },
  '{reward_description}':   { label: 'Descripción de recompensa', example: 'Café gratis' },
  
  // Cashback / Points
  '{loyalty_points}':       { label: 'Puntos acumulados', example: '1,250' },
  '{cashback_balance}':     { label: 'Saldo de cashback', example: '$25.50' },
  '{cashback_percentage}':  { label: 'Porcentaje de cashback', example: '5%' },
  '{tier_name}':            { label: 'Nombre de nivel', example: 'Oro' },
  '{tier_badge}':           { label: 'Insignia de nivel', example: '🥇' },
  
  // Coupon / Discount
  '{discount_amount}':      { label: 'Monto de descuento', example: '$20.00' },
  '{discount_percentage}':  { label: 'Porcentaje de descuento', example: '20%' },
  '{redemption_code}':      { label: 'Código de canje', example: 'SUMMER20' },
  '{coupon_title}':         { label: 'Título del cupón', example: 'Verano 2024' },
  
  // VIP / Membership
  '{membership_start}':     { label: 'Inicio de membresía', example: 'Mar 2024' },
  '{membership_expiry}':    { label: 'Vencimiento', example: 'Mar 2025' },
  '{next_payment}':         { label: 'Próximo pago', example: '15/04/2024' },
  
  // Gift Card
  '{gift_balance}':         { label: 'Saldo de regalo', example: '$50.00' },
  '{gift_card_number}':     { label: 'Número de tarjeta', example: '**** 1234' },
  '{gift_amount}':          { label: 'Monto inicial', example: '$50.00' },
  
  // Program Info
  '{program_name}':         { label: 'Nombre del programa', example: 'Café Central' },
  '{merchant_name}':        { label: 'Nombre del negocio', example: 'Café Central' },
  '{merchant_phone}':       { label: 'Teléfono del negocio', example: '+1-234-567-8900' },
  '{merchant_email}':       { label: 'Email del negocio', example: 'hola@cafecentral.com' },
  '{merchant_website}':     { label: 'Sitio web', example: 'www.cafecentral.com' },
  
  // Date/Time
  '{current_date}':         { label: 'Fecha actual', example: 'Jun 3, 2026' },
  '{current_time}':         { label: 'Hora actual', example: '3:42 PM' },
  '{days_until_expiry}':    { label: 'Días hasta vencimiento', example: '12 días' },
};
```

### 6.2 Dynamic Value Picker UI

```
┌─────────────────────────────────────────────────────────────────┐
│  📋 PLANTILLAS DE VALOR DINÁMICO                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔍 Buscar plantillas...                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  CATEGORÍAS:                                                     │
│  [Todas] [Cliente] [Sellos] [Puntos] [Cupón] [VIP] [Regalo] [Fecha]│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  👤 INFORMACIÓN DEL CLIENTE                              │   │
│  │  ┌────────────────────┐ ┌────────────────────┐         │   │
│  │  │ {customer_name}    │ │ {customer_id}      │         │   │
│  │  │ Juan Pérez         │ │ CUST-12345         │         │   │
│  │  └────────────────────┘ └────────────────────┘         │   │
│  │  ┌────────────────────┐ ┌────────────────────┐         │   │
│  │  │ {customer_email}   │ │ {customer_phone}   │         │   │
│  │  │ juan@email.com     │ │ +1-234-567-8900    │         │   │
│  │  └────────────────────┘ └────────────────────┘         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ☕ TARJETA DE SELLOS                                    │   │
│  │  ┌────────────────────┐ ┌────────────────────┐         │   │
│  │  │ {stamp_count}      │ │ {stamps_required}  │         │   │
│  │  │ 3                  │ │ 10                 │         │   │
│  │  └────────────────────┘ └────────────────────┘         │   │
│  │  ┌────────────────────────────┐                        │   │
│  │  │ {stamp_display}            │                        │   │
│  │  │ 3 / 10                     │                        │   │
│  │  └────────────────────────────┘                        │   │
│  │  ┌────────────────────────────┐                        │   │
│  │  │ {reward_description}       │                        │   │
│  │  │ Café gratis                │                        │   │
│  │  └────────────────────────────┘                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🏆 PUNTOS Y CASHBACK                                    │   │
│  │  ┌────────────────────┐ ┌────────────────────┐         │   │
│  │  │ {loyalty_points}   │ │ {cashback_balance} │         │   │
│  │  │ 1,250 pts          │ │ $25.50             │         │   │
│  │  └────────────────────┘ └────────────────────┘         │   │
│  │  ┌────────────────────┐ ┌────────────────────┐         │   │
│  │  │ {tier_name}        │ │ {tier_badge}       │         │   │
│  │  │ Oro                │ │ 🥇                 │         │   │
│  │  └────────────────────┘ └────────────────────┘         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🎁 TARJETA DE REGALO                                    │   │
│  │  ┌────────────────────┐ ┌────────────────────┐         │   │
│  │  │ {gift_balance}     │ │ {gift_card_number} │         │   │
│  │  │ $50.00             │ │ **** 1234          │         │   │
│  │  └────────────────────┘ └────────────────────┘         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📅 FECHAS Y TIEMPO                                      │   │
│  │  ┌────────────────────┐ ┌────────────────────┐         │   │
│  │  │ {current_date}     │ │ {days_until_expiry}│         │   │
│  │  │ Jun 3, 2026        │ │ 12 días            │         │   │
│  │  └────────────────────┘ └────────────────────┘         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [✓] Mostrar solo plantillas compatibles con este tipo de tarjeta│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Template Preview in Field

When user selects a dynamic template, the field input shows:
```
Valor: [{stamp_count} / {stamps_required}        ]
       ─────────────────────────────────────────
       🔄 Valor dinámico — se actualiza automáticamente
       
       Vista previa:
       ┌────────────────────────┐
       │  SELLOS                │
       │  3 / 10                │
       └────────────────────────┘
```

---

## 7. Field-Based Notifications

### 7.1 Apple changeMessage Configuration UI

```
┌─────────────────────────────────────────────────────────────────┐
│  🍎 NOTIFICACIÓN PUSH DE APPLE WALLET                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Cuando el valor de este campo cambie, el cliente recibirá      │
│  una notificación push en la pantalla de bloqueo de su iPhone.  │
│                                                                  │
│  [✓] Activar notificación push para este campo                  │
│                                                                  │
│  Mensaje de notificación:                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ⭐ ¡Nuevo sello en Café Central! Ahora tienes %@        │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Caracteres: 52 / 120                                           │
│                                                                  │
│  ℹ️ %@ se reemplazará automáticamente con el nuevo valor:       │
│     "⭐ ¡Nuevo sello en Café Central! Ahora tienes 4 / 10"      │
│                                                                  │
│  VISTA PREVIA DE NOTIFICACIÓN:                                   │
│  ┌─────────────────────────────┐                                │
│  │  ☕ Café Central            │                                │
│  │  ⭐ ¡Nuevo sello en Café   │                                │
│  │     Central!                │                                │
│  │  Ahora tienes 4 / 10        │                                │
│  │                             │                                │
│  │  [Deslizar para ver]        │                                │
│  └─────────────────────────────┘                                │
│                                                                  │
│  ⚠️ Requiere configurar Web Service URL en la pestaña Avanzado  │
│     para que las notificaciones push funcionen.                 │
│                                                                  │
│  [📝 Ver guía de configuración →]                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Google Message Configuration UI

```
┌─────────────────────────────────────────────────────────────────┐
│  🤖 MENSAJE DE GOOGLE WALLET                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Google Wallet muestra mensajes en la tarjeta cuando se         │
│  cumplen ciertas condiciones.                                   │
│                                                                  │
│  [✓] Mostrar mensaje cuando este campo cambie                   │
│                                                                  │
│  Título del mensaje:                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ⭐ ¡Nuevos puntos!                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Cuerpo del mensaje:                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Has recibido puntos. Ahora tienes {loyalty_points} pts │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Disparador:                                                     │
│  [●] Al cambiar el valor de este campo                         │
│  [○] En fecha programada                                        │
│       Fecha: [____/__/__]  Hora: [__:__]                       │
│  [○] Días antes del vencimiento                                 │
│       [ 3 ▼] días antes                                         │
│                                                                  │
│  Duración de visualización:                                      │
│  Mostrar durante [ 7 ▼] días después del disparador            │
│                                                                  │
│  VISTA PREVIA EN GOOGLE WALLET:                                  │
│  ┌─────────────────────────────┐                                │
│  │  ⭐ ¡Nuevos puntos!         │                                │
│  │  Has recibido puntos.       │                                │
│  │  Ahora tienes 1,250 pts     │                                │
│  │                             │                                │
│  │  [Descartar]                │                                │
│  └─────────────────────────────┘                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Notification Comparison Table

| Feature | Apple changeMessage | Google Messages |
|---------|---------------------|-----------------|
| **Trigger** | Field value change | Field change OR scheduled date |
| **Delivery** | Push notification (lock screen) | In-app message banner |
| **Requires** | webServiceURL + APNs | REST API update |
| **Template var** | `%@` = new value | Any `{template}` in body |
| **Max length** | ~120 chars | ~200 chars |
| **User action** | Tap to open pass | Tap to dismiss |
| **Grouped** | Yes (per pass) | Yes (per pass) |
| **Custom sound** | System default | System default |
| **Badge count** | No | No |
| **Rich media** | No | No |

---

## 8. Field Editor — Complete Sidebar Design

### 8.1 Content Tab (Redesigned with Field Studio)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR: CONTENT TAB — FIELD STUDIO                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🏷️ CAMPOS DE CABECERA — 1/3 usados                                  │   │
│  │  (Visibles incluso cuando el pase está en pila)                      │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────┐        │   │
│  │  │ [⋮⋮] [🔔] SELLOS: 3/10  [🍎✓] [🤖✓]            [🗑️] │        │   │
│  │  │      ⭐ changeMessage: "¡Nuevo sello! %@"               │        │   │
│  │  │      🔄 Dinámico: {stamp_count} / {stamps_required}     │        │   │
│  │  └─────────────────────────────────────────────────────────┘        │   │
│  │                                                                      │   │
│  │  [+ Añadir campo de cabecera] (máximo 3)                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ⭐ CAMPO PRINCIPAL — 1/1 usado  ✅ COMPLETO                         │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────┐        │   │
│  │  │ [⋮⋮] [  ] PROGRESO  [🍎✓] [🤖✓]                [🗑️] │        │   │
│  │  │      Valor: {stamp_display}                             │        │   │
│  │  │      Formato: Texto  Alineación: Centro                 │        │   │
│  │  └─────────────────────────────────────────────────────────┘        │   │
│  │                                                                      │   │
│  │  [+ Añadir campo principal] (máximo 1) — DESHABILITADO             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📋 CAMPOS SECUNDARIOS — 2/4 usados                                  │   │
│  │  ⚠️ Con barcode cuadrado: máximo 4 combinados sec/aux               │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────┐        │   │
│  │  │ [⋮⋮] [🔔] RECOMPENSA: Café gratis  [🍎✓] [🤖✓] [🗑️] │        │   │
│  │  │      🔔 Apple: "☕ ¡Recompensa lista! %@"              │        │   │
│  │  │      🔔 Google: "Tu café gratis está listo"            │        │   │
│  │  └─────────────────────────────────────────────────────────┘        │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────┐        │   │
│  │  │ [⋮⋮] [  ] CLIENTE: {customer_name}  [🍎✓] [🤖✓] [🗑️]│        │   │
│  │  │      🔄 Dinámico  Formato: Texto                       │        │   │
│  │  └─────────────────────────────────────────────────────────┘        │   │
│  │                                                                      │   │
│  │  [+ Añadir campo secundario]                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🔍 CAMPOS AUXILIARES — 1/4 usados                                   │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────┐        │   │
│  │  │ [⋮⋮] [  ] NIVEL: {tier_name}  [🍎✓] [🤖✓]      [🗑️] │        │   │
│  │  │      🔄 Dinámico  Formato: Texto                       │        │   │
│  │  └─────────────────────────────────────────────────────────┘        │   │
│  │                                                                      │   │
│  │  [+ Añadir campo auxiliar]                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  📊 RESUMEN DE LÍMITES:                                                    │
│  Cabecera: ████░░░ (1/3)  Principal: ████████ (1/1) ✅                   │
│  Secundario: ██████░░ (2/4)  Auxiliar: ████░░░░ (1/4)                    │
│  Sec+Aux combinados: ████████░░░░░░░░ (3/8 max 4 con QR cuadrado) ⚠️     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Field Card (Compact View)

```
┌─────────────────────────────────────────────────────────────────┐
│  FIELD CARD — Compact view in sidebar                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [⋮⋮] Drag handle                                         │   │
│  │                                                          │   │
│  │ [🔔] Notification bell (filled = has notification)      │   │
│  │      Hover: "Enviará notificación push en Apple"        │   │
│  │                                                          │   │
│  │ LABEL: VALUE                                             │   │
│  │ "SELLOS: 3/10"                                          │   │
│  │                                                          │   │
│  │ 🔄 Dynamic icon (shows it's a template value)           │   │
│  │      Hover: "Valor dinámico: {stamp_count} / ..."       │   │
│  │                                                          │   │
│  │ [🍎✓] [🤖✓] Platform toggles                            │   │
│  │      Click to show/hide on each platform                │   │
│  │                                                          │   │
│  │ [🗑️] Delete                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  CLICK CARD → Opens expanded editor                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.3 Field Editor (Expanded Modal)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ✏️ EDITAR CAMPO: SELLOS                                             [✕]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  POSICIÓN:                                                                  │
│  [🏷️ Cabecera ●] [⭐ Principal ○] [📋 Secundario ○] [🔍 Auxiliar ○] [📄 Reverso ○]│
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ETIGUETA:                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ SELLOS                                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  VALOR:                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ {stamp_count} / {stamps_required}                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  [📋 Plantillas de valor ▼]  [✓] Usar valor dinámico                    │
│                                                                              │
│  TIPO DE VALOR:  [● Texto] [○ Número] [○ Fecha] [○ Moneda] [○ Enlace]   │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  🔔 NOTIFICACIONES                                                          │
│                                                                              │
│  🍎 Apple Wallet:                                                           │
│  [✓] Enviar notificación push cuando cambie                               │
│  Mensaje: ┌─────────────────────────────────────────────────────────┐     │
│           │ ⭐ ¡Nuevo sello en {program_name}! Ahora tienes %@       │     │
│           └─────────────────────────────────────────────────────────┘     │
│           Caracteres: 58 / 120                                             │
│                                                                              │
│  🤖 Google Wallet:                                                          │
│  [✓] Mostrar mensaje cuando cambie                                        │
│  Título:  ┌─────────────────────────────────────────────────────────┐     │
│           │ ⭐ ¡Nuevo sello!                                         │     │
│           └─────────────────────────────────────────────────────────┘     │
│  Cuerpo:  ┌─────────────────────────────────────────────────────────┐     │
│           │ Has recibido un sello. Llevas {stamp_count} de {stamps_required}│
│           └─────────────────────────────────────────────────────────┘     │
│  Disparador: [Al cambiar ●] [Programado ○] [Antes de expirar ○]          │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  🎨 FORMATO Y VISUALIZACIÓN                                                 │
│                                                                              │
│  Alineación: [ Izquierda ●] [Centro ○] [Derecha ○] [Natural ○]           │
│                                                                              │
│  Mostrar en:  [✓] Apple Wallet    [✓] Google Wallet                      │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  VISTA PREVIA:                                                              │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐         │
│  │  🍎 iPhone                  │  │  🤖 Pixel                   │         │
│  │  ┌─────────────────────┐    │  │  ┌─────────────────────┐    │         │
│  │  │ SELLOS              │    │  │  │ SELLOS              │    │         │
│  │  │ 3 / 10              │    │  │  │ 3 / 10              │    │         │
│  │  └─────────────────────┘    │  │  └─────────────────────┘    │         │
│  └─────────────────────────────┘  └─────────────────────────────┘         │
│                                                                              │
│         [Cancelar]                              [💾 Guardar cambios]       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Field Preview & Validation

### 9.1 Real-Time Validation

| Check | When | Error Message |
|-------|------|---------------|
| **Header max 3** | Adding 4th header | "⚠️ Máximo 3 campos de cabecera en Apple Wallet" |
| **Primary max 1** | Adding 2nd primary | "⚠️ Solo 1 campo principal permitido" |
| **Sec+Aux combined** | QR square + 5 total | "⚠️ Con barcode QR cuadrado: máximo 4 campos sec/aux combinados" |
| **Field key unique** | Duplicate key | "⚠️ El ID '{key}' ya existe. Usa un ID único." |
| **changeMessage length** | > 120 chars | "⚠️ El mensaje es muy largo. Máximo 120 caracteres." |
| **Dynamic template valid** | Unknown template | "⚠️ Plantilla desconocida: {unknown_var}" |
| **Date format valid** | Invalid ISO date | "⚠️ Formato de fecha inválido. Use YYYY-MM-DD" |
| **Currency valid** | Invalid code | "⚠️ Código de moneda inválido. Use ISO 4217 (ej: USD, EUR, MXN)" |

### 9.2 Field Limit Visual Indicator

```
Cabecera:    ████░░░ (1/3)  ✅
Principal:   ████████ (1/1)  ✅
Secundario:  ██████░░ (2/4)  ✅
Auxiliar:    ████░░░░ (1/4)  ✅
Reverso:     ████████░░░░░░░░░░░░ (8/∞)  ✅

Combinado Sec+Aux: ████████░░░░░░░░ (3/4)  ⚠️
                    └─ Con barcode QR cuadrado
```

---

## 10. Platform-Specific Field Behaviors

### 10.1 Apple-Only Field Features

| Feature | UI Indicator | How to Configure |
|---------|-------------|------------------|
| `changeMessage` push | 🔔 bell icon on field card | Toggle in field editor |
| `attributedValue` links | 🔗 link icon | "Convertir en enlace" checkbox |
| `textAlignment` | ↔ alignment buttons | Left/Center/Right/Natural |
| `dateStyle` | 📅 date format dropdown | Short/Medium/Long/Full |
| `numberStyle` | #️⃣ number format dropdown | Decimal/Percent/Scientific/SpellOut |
| `currencyCode` | 💱 currency selector | USD/EUR/MXN/etc |
| `labelColor` | 🎨 label color override | Advanced tab |

### 10.2 Google-Only Field Features

| Feature | UI Indicator | How to Configure |
|---------|-------------|------------------|
| `messages` banner | 📢 message icon | Messages section in field editor |
| `textModulesData` ID | #️⃣ ID field | Auto-generated, editable |
| Predefined fields | ⭐ star icon | "Usar campo predefinido de Google" |
| `displayInterval` | 📅 date range picker | Scheduled message trigger |
| `linksModuleData` | 🔗 link rows in details | Back tab → Links section |

### 10.3 Cross-Platform Field Behavior

| Behavior | Apple | Google | Our UI |
|----------|-------|--------|--------|
| Dynamic values | Resolved server-side | Resolved server-side | Template picker |
| Field update | Web Service API | REST API patch | Unified backend |
| Notification trigger | Field value change | Field change OR schedule | Both configured per field |
| Link rendering | `attributedValue` | `linksModuleData` | Auto-mapped |
| Label uppercase | iOS auto-uppercases | Original case | We uppercase for preview |
| Date formatting | `dateStyle` enum | `dateFormat` enum | Unified picker |

---

## 11. Integration Checklist

### SRS-002 (Architecture) Updates:
- [ ] Add `UnifiedField` interface with notification sub-objects
- [ ] Add `DynamicTemplate` registry
- [ ] Add `FieldGroup` type ('header' | 'primary' | 'secondary' | 'auxiliary' | 'back')
- [ ] Update `WalletPassStudioState` with fields array using UnifiedField

### SRS-003 (UI Specs) Updates:
- [ ] Redesign Content Tab as "Field Studio"
- [ ] Add field cards with notification bell (🔔) indicator
- [ ] Add field limit visual indicators
- [ ] Add "Add Field" flow with position selector
- [ ] Add expanded field editor modal
- [ ] Add dynamic value template picker
- [ ] Add Apple changeMessage configuration panel
- [ ] Add Google message configuration panel
- [ ] Add field preview (iPhone + Pixel)
- [ ] Add field validation error states

### SRS-004 (Appendices) Updates:
- [ ] Expand Apple A.4 with complete field properties table
- [ ] Add changeMessage deep dive with examples
- [ ] Expand Google B.7 with messages array specification
- [ ] Add field mapping crosswalk (C.4)

### SRS-005 (User Journeys) Updates:
- [ ] J-29: Add custom field with notification
- [ ] J-30: Configure dynamic value template
- [ ] J-31: Set up Apple push notification (changeMessage)
- [ ] J-32: Set up Google Wallet message
- [ ] J-33: Hit field limit and resolve conflict

### IMPLEMENTATION-PLAN Updates:
- [ ] Add `FieldStudio` component
- [ ] Add `FieldCard` component
- [ ] Add `FieldEditorModal` component
- [ ] Add `DynamicTemplatePicker` component
- [ ] Add `NotificationConfigPanel` component
- [ ] Add `FieldLimitIndicator` component
- [ ] Add field validation utilities
- [ ] Add template resolution engine

---

*End of SRS-010 — Custom Fields, Dynamic Values & Field-Based Notifications*
*This document MUST be integrated into the master design before coding begins*
