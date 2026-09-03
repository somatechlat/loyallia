# GAP ANALYSIS REPORT — Loyallia
## Client Requests vs. Current Codebase

**Date:** 2026-07-24
**Source:** "CHANGES AND ADDONS CLIENT REQUESTED" folder (5 documents)
**Status:** No code changes — analysis only

---

## TABLE OF CONTENTS

1. [Session Timeout Bug](#1-session-timeout-bug)
2. [Dashboard — Summary & Date Filters](#2-dashboard--summary--date-filters)
3. [Dashboard — Ganancias Tab](#3-dashboard--ganancias-tab)
4. [Dashboard — Visitas Tab](#4-dashboard--visitas-tab)
5. [Dashboard — Campaigns & Push KPIs](#5-dashboard--campaigns--push-kpis)
6. [Programs — Section UX](#6-programs--section-ux)
7. [Programs — Card Type Selection](#7-programs--card-type-selection)
8. [Stamp Card — Configuration](#8-stamp-card--configuration)
9. [Stamp Card — Design (Artes)](#9-stamp-card--design-artes)
10. [Stamp Card — Colors & Fields](#10-stamp-card--colors--fields)
11. [Stamp Card — Card Info Section](#11-stamp-card--card-info-section)
12. [Coupon Card — Configuration](#12-coupon-card--configuration)
13. [Coupon Card — Design](#13-coupon-card--design)
14. [Coupon Card — Linked Card Template](#14-coupon-card--linked-card-template)
15. [Coupon Card — Card Info Section](#15-coupon-card--card-info-section)
16. [Cashback / Points Card](#16-cashback--points-card)
17. [Cashback — Levels System](#17-cashback--levels-system)
18. [Cashback — Happy Hours](#18-cashback--happy-hours)
19. [Gift Card](#19-gift-card)
20. [Discount by Levels](#20-discount-by-levels)
21. [Enrollment Form — All Cards](#21-enrollment-form--all-cards)
22. [QR / Barcode Type Selection](#22-qr--barcode-type-selection)
23. [Privacy Policy](#23-privacy-policy)
24. [UX/UI — Program Type Descriptions](#24-uxui--program-type-descriptions)
25. [Wallet Preview — Apple/Google Toggle](#25-wallet-preview--applegoogle-toggle)
26. [Image Cropping Tool](#26-image-cropping-tool)
27. [Image Auto-Pass to Google Wallet](#27-image-auto-pass-to-google-wallet)
28. [Push Notification on Card Download](#28-push-notification-on-card-download)
29. [Location per Plan Limit](#29-location-per-plan-limit)
30. [Mockup Scroll Behavior](#30-mockup-scroll-behavior)

---

## 1. SESSION TIMEOUT BUG

**Client Request:** "Cuando ingreso a la plataforma, luego de unos 10-15 minutos, me saca de la página web y tengo que volver a iniciar sesión."

| Aspect | Current State | Gap |
|--------|--------------|-----|
| Access token lifetime | 60 minutes (`JWT_ACCESS_TOKEN_LIFETIME_MINUTES = 60`) | **No obvious bug here** — token lasts 1 hour |
| Refresh token | 30 days (DB), 7 days (cookie) | Cookie expires before DB token |
| Idle timeout | **NOT implemented** | Platform setting `session_timeout_minutes = 60` exists but is **UNUSED** |
| Auto-logout on inactivity | **NOT implemented** | No frontend idle detection |
| Proactive token refresh | ✅ Implemented (`token-manager.ts` — refresh 5 min before expiry) | Should work |

**Verdict:** The session timeout complaint is **likely a bug** in the proactive refresh flow or a race condition. The `session_timeout_minutes` platform setting is seeded but never consumed. The refresh token cookie (7 days) expires well before the DB token (30 days), which could cause silent failures after a week.

**Priority:** HIGH — User-facing bug

---

## 2. DASHBOARD — SUMMARY & DATE FILTERS

**Client Request (A.1):** Date range filter above the 4 KPI cards with options: Hoy, Últimos 7 días, Últimas 4 semanas, 6 meses, 12 meses, Mes hasta la fecha, Periodo personalizado.

| Feature | Current State | Gap |
|---------|--------------|-----|
| Date range selector | ✅ Implemented as pill buttons | Covers: 1, 7, 28, 180, 365 days, MTD, Custom |
| Position | **BELOW** the welcome header, **ABOVE** the KPI cards | Client wants it **above** the 4 KPI indicators |
| Preset ranges | 7 options | **Missing "Últimas 4 semanas" (28 days exists but label may differ)**, **Missing "6 meses" (180 exists)** — functionally close |
| Custom date picker | ✅ Implemented (start/end date inputs) | **Should be a date range picker, not separate inputs** — minor UX |
| Current date display | ✅ Shows at bottom: "Hoy - DD de MES de YYYY" | Position is at footer; client wants it more visible |

**Verdict:** MOSTLY IMPLEMENTED. Minor position/label adjustments needed.

**Gap Size:** SMALL — Mostly label/positioning tweaks

---

## 3. DASHBOARD — GANANCIAS TAB

**Client Request (A.3):** Tab "Ganancias" with: Ingresos brutos, Ingresos por fidelización, Ingresos por referencias, Nuevas visitas, Visitas repetidas, Referencias.

| KPI | Current State | Gap |
|-----|--------------|-----|
| Ingresos brutos | ✅ `KPICard` with `total_revenue` | Present |
| Ingresos por fidelización | ✅ `KPICard` with `loyalty` | Present |
| Ingresos por referencias | ✅ `KPICard` with `referral` | Present |
| Nuevas visitas | ✅ `KPICard` with `new_visitors` | Present |
| Visitas repetidas | ✅ `KPICard` with `recurring_visitors` | Present |
| Referencias | ⚠️ Calculated as `new_visitors * 0.15` (fake) | **HARDCODED ESTIMATE** — not real data |

**Verdict:** MOSTLY IMPLEMENTED. The "Referencias" KPI is a fake calculation (15% of new visitors). Needs real referral tracking data.

**Gap Size:** SMALL — One fake metric needs real backend support

---

## 4. DASHBOARD — VISITAS TAB

**Client Request (A.5):** Visitas totales, Clientes únicos, Nuevos visitantes, Visitantes recurrentes, Clientes que no han regresado, Visitas de no registrados, Tasa de retorno, Frecuencia promedio de visita (Top 15 + notify button), Filtro por tipos de programas, Edad, Género.

| KPI | Current State | Gap |
|-----|--------------|-----|
| Visitas totales | ✅ | Present |
| Clientes únicos | ✅ | Present |
| Nuevos visitantes | ✅ | Present |
| Visitantes recurrentes | ✅ | Present |
| Clientes que no han regresado | ✅ `non_returning` | Present |
| Visitas de no registrados | ✅ `unregistered_visits` | Present |
| Tasa de retorno | ✅ `retention_rate` | Present |
| Top 15 + notify button | ✅ `topBuyers` + `notifyTopBuyers()` | Present |
| Filtro por tipo de programa | ❌ **NOT implemented** | **GAP** — No program filter on visitas section |
| Edad (gráfico) | ✅ Demographics age ranges shown | Present |
| Género (gráfico) | ✅ Demographics gender shown | Present |

**Verdict:** MOSTLY IMPLEMENTED. Missing program-type filter for visits section.

**Gap Size:** SMALL — One missing filter

---

## 5. DASHBOARD — CAMPAIGNS & PUSH KPIs

**Client Request (A.7):** Campañas enviadas (count + clients joined), Notificaciones push abiertas.

| KPI | Current State | Gap |
|-----|--------------|-----|
| Campañas enviadas | ✅ `CampaignsBlock` shows `sent` | Present |
| Notificaciones push abiertas | ✅ Shows `read` count | Present |
| Open rate | ✅ `open_rate` | Present (bonus) |
| Click rate | ✅ `click_rate` | Present (bonus) |

**Verdict:** FULLY IMPLEMENTED.

**Gap Size:** NONE

---

## 6. PROGRAMS — SECTION UX

**Client Requests (B.1-B.4):** Button rename, description text, green active count, status sections.

| Feature | Current State | Gap |
|---------|--------------|-----|
| Button: "Crear nueva tarjeta" | ❌ Currently says `+ {t('programs.createProgram')}` | **GAP** — Button label needs change |
| Description text below title | ✅ `programs.description` i18n key exists | Present |
| Active count in green | ✅ `text-emerald-500 font-bold` | Present |
| Status sections (Active/Drafts/Inactive) | ✅ `ProgramSections` component with color-coded borders | Present |
| Show max 3 + "Show more" | ✅ `sec.items.slice(0, 3)` + expand button | Present |

**Verdict:** MOSTLY IMPLEMENTED. Only the button label needs updating.

**Gap Size:** MINIMAL — One label change

---

## 7. PROGRAMS — CARD TYPE SELECTION

**Client Requests (B.5):** Hover preview, same card order.

| Feature | Current State | Gap |
|---------|--------------|-----|
| Hover preview on card type | ✅ `hoveredType` state + `WalletPreviewContent` | Present |
| Card type order | ✅ Uses `CARD_TYPES` array | Present |
| Card type descriptions | ⚠️ Current descriptions are technical | **GAP** — Descriptions need updating per UX/UI document |

**UX/UI Document Changes Required:**

| Card Type | Current Text | Requested Text |
|-----------|-------------|----------------|
| Tarjeta de Sellos | "Compra X, obtén 1 gratis" | "Acumula visitas o compras y gana recompensa" |
| Cashback / Puntos | "Devuelve un porcentaje de cada compra" | "Acumula puntos o saldo por cada compra" |
| Cupón de Descuento | "Cupón al registrarse en el programa" | "Entrega cupón al registrarse al programa" |
| Afiliación | "Regístrate para recibir promociones" | "Registra clientes para enviar promociones y novedades" |
| Descuento por Niveles | "Descuentos progresivos por gasto acumulado" | "Premia a tus mejores clientes con beneficios exclusivos" |
| Certificado de Regalo | "Certificados de regalo digitales" | "Vende o entrega tarjetas de regalo digitales" |
| Membresía VIP | "Club VIP con pagos recurrentes" | "Ofrece beneficios exclusivos mediante suscripción" |
| Descuento Corporativo | "Descuentos especiales para empresas" | "Descuentos exclusivos para empresas y colaboradores" |
| Programa de Referidos | "Recompensa por traer nuevos clientes" | "Premia a tus clientes por recomendar tu negocio" |
| Multipase Prepago | "Sellos prepagados en paquete" | "Vende paquetes de servicios o consumos por adelantado" |

**Header text changes:**
- Current title: `programs.new.step0.title` — needs change to "Selecciona el programa que mejor se adapte a tu negocio"
- Current hint: `programs.new.step0.hint` — needs change to "Elige el programa que deseas crear. Podrás modificar su configuración más adelante. Pasa el mouse sobre cada tipo para ver una vista previa."

**Verdict:** MOSTLY IMPLEMENTED. Text/i18n changes needed.

**Gap Size:** SMALL — Text updates only

---

## 8. STAMP CARD — CONFIGURATION

**Client Requests (B.6.1):**

| Feature | Current State | Gap |
|---------|--------------|-----|
| QR / Barcode type selection | ❌ **NOT in StampTab** | **GAP** — No QR vs barcode selector |
| Stamp type: Visit vs Consumption | ✅ `stampType: 'visit' | 'consumption'` | Present |
| Consumption per stamp amount | ✅ `consumptionPerStamp` (when type=consumption) | Present |
| Info tooltips on stamp type | ❌ Floating info text not implemented | **GAP** — No tooltip descriptions per option |
| Reward description | ✅ `rewardDescription` field | Present |
| Stamp expiry: Unlimited | ✅ `stampExpiry: 'unlimited'` | Present |
| Stamp expiry: By days | ✅ `stampExpiry: number` (days) | Present |
| Stamp expiry: By date range | ✅ `stampStartDate` / `stampEndDate` | Present |
| Stamps at issuance | ✅ `stampsAtIssue` | Present |
| Daily stamp limit | ✅ `dailyStampLimit` | Present |
| Birthday stamps | ✅ `birthdayStamps` | Present |
| Program name (public + internal) | ⚠️ Only `name` field exists | **GAP** — No separate internal name field |
| Card name (visible on card) | ⚠️ Only program name | **PARTIAL** — No separate "card display name" |
| Activate / Draft / Disable | ⚠️ Publish/suspend exists but no "save as draft" from config | **GAP** — Draft save should be available from configuration |

**Verdict:** ~70% implemented. Missing QR/barcode selector, info tooltips, internal name, and draft save from config step.

**Gap Size:** MEDIUM

---

## 9. STAMP CARD — DESIGN (ARTES)

**Client Requests (B.7.2):**

| Feature | Current State | Gap |
|---------|--------------|-----|
| Stamps required selector (in Design) | ⚠️ Currently in StampTab (config), not in design | **GAP** — Client wants this in Design section, max 30 |
| Icon picker: inactive stamp | ✅ `stampIcon` via `IconPicker` | Present |
| Icon picker: active stamp | ✅ `stampFilledIcon` via `IconPicker` | Present |
| Generic icon library | ✅ `IconPicker` has 100+ icons in categories | Present |
| Custom image upload for stamps | ❌ **NOT implemented** — Only pre-built icons | **GAP** — No custom PNG upload for stamp icons |
| Image crop/positioning tool | ❌ **NOT implemented** — No `react-image-crop` or equivalent | **GAP** — Client wants zoom, move, rotate, reset |
| Logo upload | ✅ In `ImagesTab` — logo upload exists | Present |
| Icon (push notification) upload | ✅ In `ImagesTab` — icon upload exists | Present |
| Background image upload | ✅ In `ImagesTab` — background upload exists | Present |
| Image dimension/weight guidance | ⚠️ `SmartImageUpload` shows warnings but not exact specs | **PARTIAL** — Needs explicit px/size/format requirements |
| PNG-only validation | ⚠️ Not enforced | **GAP** — Should validate PNG format only |

**Verdict:** ~50% implemented. Major gaps in custom image upload for stamps and image editing tools.

**Gap Size:** LARGE — Image upload/cropping for stamps is a significant new feature

---

## 10. STAMP CARD — COLORS & FIELDS

**Client Requests (B.7.3, B.7.4):**

| Feature | Current State | Gap |
|---------|--------------|-----|
| Card background color | ✅ `ColorsTab` with color picker | Present |
| Stamp area background color | ⚠️ Not separate from card background | **GAP** — Need separate "fondo debajo de los sellos" color |
| Text color | ✅ `ColorsTab` includes text color | Present |
| Fields: card name | ✅ FieldStudio exists | Present |
| Fields: customer name | ✅ FieldStudio exists | Present |
| Fields: reward + stamps needed | ⚠️ May need explicit field | **PARTIAL** |
| Fields: enrollment date | ⚠️ May need explicit field | **PARTIAL** |
| Fields: QR/barcode + "Powered By Loyallia" | ⚠️ QR exists but "Powered By" text not configurable | **PARTIAL** |
| Enable/disable individual fields | ✅ `FieldStudio` has visibility toggles | Present |
| Editable field labels (program name, reward) | ⚠️ `FieldStudio` edits field values but not all labels | **PARTIAL** — Only some fields editable |

**Verdict:** ~70% implemented. Needs separate stamp area background color and more field customization.

**Gap Size:** MEDIUM

---

## 11. STAMP CARD — CARD INFO SECTION

**Client Request:** New section "INFORMACIÓN DE TARJETA" for all program types — the "back" of the wallet pass with:

| Field | Current State | Gap |
|-------|--------------|-----|
| Terms of use | ⚠️ `FieldStudio` has `back` field group | **PARTIAL** — Exists but no dedicated "terms of use" field |
| Referral program link | ❌ **NOT implemented** | **GAP** — No referral link on card back |
| Card validity date / unlimited | ⚠️ Expiry exists but not on card back | **PARTIAL** |
| Next reward info | ❌ **NOT implemented** | **GAP** — No "next reward" display on card back |
| Points for next reward | ❌ **NOT implemented** | **GAP** |
| Bonus points balance | ❌ **NOT implemented** | **GAP** |
| Total visits | ⚠️ May exist in `auxiliary` fields | **PARTIAL** |
| Reward level descriptions | ❌ **NOT implemented** | **GAP** — No per-level descriptions on card back |
| Location links (all branches) | ⚠️ Locations exist in form but not on card back | **PARTIAL** |
| Company name | ⚠️ Program name exists | **PARTIAL** |
| Issuer info (Loyallia + email) | ❌ **NOT implemented** | **GAP** |
| Serial number | ⚠️ Pass has ID but not displayed on back | **PARTIAL** |
| "Created by Loyallia" | ❌ **NOT implemented** | **GAP** |
| Last updated date | ❌ **NOT implemented** | **GAP** |
| Android back content | ⚠️ `FieldStudio` has `back` group | **PARTIAL** — Needs parity with Apple |

**Verdict:** ~20% implemented. This is a **NEW FEATURE** — the "back of card" information section for both Apple and Google Wallet passes.

**Gap Size:** LARGE — Entirely new section for all card types

---

## 12. COUPON CARD — CONFIGURATION

**Client Requests (B.8.5):**

| Feature | Current State | Gap |
|---------|--------------|-----|
| Discount type: Fixed amount | ✅ `discountType: 'fixed_amount'` | Present |
| Discount type: Percentage | ✅ `discountType: 'percentage'` | Present |
| Discount type: Special promotion | ⚠️ `specialPromotionText` field exists but not a 3rd radio option | **PARTIAL** — Field exists but UI doesn't clearly show 3 distinct types |
| Fixed amount: $ prefix | ✅ Shows `$` suffix in UI | Present |
| Percentage: % suffix with 1-100 range | ⚠️ Max is 100 but no decimal support | **GAP** — Client wants decimal support (e.g., 15.5%) |
| Special promo: free text, max 100 chars | ⚠️ `specialPromotionText` exists but no char limit | **PARTIAL** — Needs 100 char max |
| Help/Tooltip texts | ❌ **NOT implemented** — 8 help texts specified | **GAP** — No help tooltips for coupon types |
| Help button explaining discount types | ❌ **NOT implemented** | **GAP** |
| QR / Barcode type selection | ❌ **NOT in CouponTab** | **GAP** — No QR vs barcode selector |
| Coupon name field | ⚠️ Not in CouponTab (uses program name) | **PARTIAL** — Need dedicated coupon name |
| Coupon description | ✅ `couponDescription` | Present |
| Push notification config | ⚠️ `pushMessage` exists | Present |
| Image upload with specs | ❌ Image upload in config section, not design | **GAP** — Should be in Design section, needs dimension specs |
| Expiry: Unlimited | ✅ `couponExpiry: 'unlimited'` | Present |
| Expiry: Date range | ✅ `couponStartDate` / `couponEndDate` | Present |
| Date validation (end >= start) | ⚠️ Not validated in frontend | **GAP** — Needs validation |

**Verdict:** ~60% implemented. Missing: special promotion as clear 3rd option, decimals, help texts, QR/barcode selector, image in design section.

**Gap Size:** MEDIUM

---

## 13. COUPON CARD — DESIGN

**Client Request:** Image upload section with 3 types: Logo, Icon (push notifications), Background.

| Feature | Current State | Gap |
|---------|--------------|-----|
| Logo upload | ✅ In `ImagesTab` | Present |
| Icon upload (push) | ✅ In `ImagesTab` | Present |
| Background image upload | ✅ In `ImagesTab` | Present |
| Image crop/positioning | ❌ **NOT implemented** | **GAP** — Same as stamp card |
| Color: card background | ✅ `ColorsTab` | Present |
| Color: text color | ⚠️ Not separate from card | **GAP** — Need separate text color picker |
| Color: central area background | ❌ **NOT implemented** | **GAP** — Need "fondo de la parte central" color |
| 6 image types (current) vs 3 (competitor) | ⚠️ Current has more image slots than needed | **Review** — May need simplification |

**Verdict:** ~50% implemented. Missing image cropping and color customizations.

**Gap Size:** MEDIUM

---

## 14. COUPON CARD — LINKED CARD TEMPLATE

**Client Request:** After using a coupon, the card transforms into a different loyalty card. User selects which existing card it converts to.

| Feature | Current State | Gap |
|---------|--------------|-----|
| Linked card template | ❌ **NOT implemented** | **GAP** — Entirely new feature |
| Select from existing cards | ❌ **NOT implemented** | **GAP** |
| Card naming convention (type + name) | ❌ **NOT implemented** | **GAP** — Cards should auto-name as "Tipo + Nombre" |

**Verdict:** NOT IMPLEMENTED. Entirely new feature.

**Gap Size:** LARGE

---

## 15. COUPON CARD — CARD INFO SECTION

Same as Section 11 — needs "INFORMACIÓN DE TARJETA" for coupons. See Section 11 for full list.

**Gap Size:** LARGE (same as Section 11)

---

## 16. CASHBACK / POINTS CARD

**Client Requests:**

| Feature | Current State | Gap |
|---------|--------------|-----|
| Cashback percentage | ✅ `cashbackPercentage` slider | Present |
| Minimum purchase | ✅ `minimumPurchase` | Present |
| Credit expiry (days) | ✅ `creditExpiryDays` | Present |
| Expiry: "Fecha de vencimiento de la tarjeta" (Unlimited / Defined period) | ❌ Currently uses days count | **GAP** — Should be Unlimited / Date range, not days |
| Tier name | ✅ `tierName` | Present |
| Progress ring color | ✅ `progressRingColor` | Present |
| Tier badge icon | ✅ `tierBadge` | Present |
| Coin icon | ✅ `coinIcon` | Present |
| Mockup preview in config section | ⚠️ May exist in wallet studio | **Verify** |
| Points permanent vs time-limited | ❌ **NOT implemented** | **GAP** — "Puntos permanentes" option missing |
| Card info section | ❌ **NOT implemented** | **GAP** — Same as Section 11 |

**Verdict:** ~50% implemented. Missing permanent points, card expiry redesign, card info section.

**Gap Size:** MEDIUM-LARGE

---

## 17. CASHBACK — LEVELS SYSTEM

**Client Request:** 4-5 configurable tiers (e.g., Bronze, Silver, Gold) with: name, spending threshold, points multiplier. Visual display in wallet (level + progress like "300/500").

| Feature | Current State | Gap |
|---------|--------------|-----|
| Single tier name | ✅ `tierName` (one tier) | Present but limited |
| Multiple tiers (4-5) | ❌ **NOT implemented** — Only 1 tier | **GAP** — Need array of tier configs |
| Tier name customization | ❌ Only one name | **GAP** |
| Spending threshold per tier | ❌ **NOT implemented** | **GAP** |
| Points multiplier per tier | ❌ **NOT implemented** | **GAP** |
| Visual tier display in wallet | ❌ **NOT implemented** | **GAP** — "300/500" progress display |

**Verdict:** NOT IMPLEMENTED (only single tier exists). This is a significant new feature.

**Gap Size:** LARGE

---

## 18. CASHBACK — HAPPY HOURS

**Client Request:** "Horas felices" — multiplier for points during specific hours/days.

| Feature | Current State | Gap |
|---------|--------------|-----|
| Happy hours configuration | ❌ **NOT implemented** | **GAP** — Entirely new feature |
| Multiplier per time slot | ❌ **NOT implemented** | **GAP** |
| Day-of-week scheduling | ❌ **NOT implemented** | **GAP** |

**Verdict:** NOT IMPLEMENTED. Entirely new feature.

**Gap Size:** LARGE

---

## 19. GIFT CARD

**Client Request:** Only mentions QR/barcode type selection.

| Feature | Current State | Gap |
|---------|--------------|-----|
| QR / Barcode type selection | ❌ **NOT in GiftTab** | **GAP** — No QR vs barcode selector |
| Card info section | ❌ **NOT implemented** | **GAP** |

**Verdict:** MINIMAL — Mostly needs QR/barcode selector and card info.

**Gap Size:** SMALL-MEDIUM

---

## 20. DISCOUNT BY LEVELS

**Client Request:** QR/barcode selector + levels with name, spending threshold, discount percentage.

| Feature | Current State | Gap |
|---------|--------------|-----|
| QR / Barcode type selection | ❌ **NOT in DiscountTab** | **GAP** |
| Multiple discount levels | ⚠️ `DiscountTab` may have some level config | **Verify** |
| Level name, threshold, percentage | ⚠️ Needs verification | **Verify** |
| Card info section | ❌ **NOT implemented** | **GAP** |

**Verdict:** Needs verification of current DiscountTab. Likely partially implemented.

**Gap Size:** MEDIUM

---

## 21. ENROLLMENT FORM — ALL CARDS

**Client Request:** "Obligatorio" vs "Opcional" toggle (mutually exclusive), field label changes.

| Feature | Current State | Gap |
|---------|--------------|-----|
| Required checkbox | ✅ `field.required` exists | Present |
| "Obligatorio" / "Opcional" labels | ❌ Currently uses "Requerido" / "Único" | **GAP** — Labels need changing |
| Mutually exclusive toggle | ❌ **NOT implemented** — `required` and `unique` are independent | **GAP** — Should be radio: Obligatorio OR Opcional |
| Country code selector for phone | ✅ `country_code: true` | Present |
| Custom fields | ✅ Add/remove/reorder | Present |
| Applies to ALL card types | ✅ `FormBuilder` used in new program wizard | Present |
| Data stored in DB | ✅ `card.metadata.form_fields` | Present |

**Verdict:** ~70% implemented. Need label changes and mutually exclusive radio behavior.

**Gap Size:** SMALL — UI behavior change

---

## 22. QR / BARCODE TYPE SELECTION

**Client Request:** All cards should let user choose between QR code and Barcode, with live preview.

| Feature | Current State | Gap |
|---------|--------------|-----|
| QR/barcode in stamp config | ❌ Not in `StampTab` | **GAP** |
| QR/barcode in coupon config | ❌ Not in `CouponTab` | **GAP** |
| QR/barcode in cashback config | ❌ Not in `CashbackTab` | **GAP** |
| QR/barcode in gift config | ❌ Not in `GiftTab` | **GAP** |
| QR/barcode in discount config | ❌ Not in `DiscountTab` | **GAP** |
| QR/barcode in new program form | ✅ `barcode_type: 'qr_code'` default | Present but hardcoded |
| Barcode rendering | ✅ `BarcodeRenderer` + `PremiumQrSvg` | Present |
| Live preview of selected type | ❌ **NOT implemented** | **GAP** |

**Verdict:** QR/barcode rendering exists but selection UI is missing from all card config tabs.

**Gap Size:** MEDIUM — Needs to be added to 5+ card type configs

---

## 23. PRIVACY POLICY

**Client Request:** Privacy policy for enrollment forms — checkbox acceptance + full policy text. Open question about whether to provide templates or let clients write their own.

| Feature | Current State | Gap |
|---------|--------------|-----|
| Privacy checkbox in enrollment | ❌ **NOT implemented** | **GAP** |
| Privacy policy page | ✅ `/legal/privacy` and `/portal/privacy` exist | Present (platform-level) |
| Per-program privacy policy | ❌ **NOT implemented** | **GAP** |
| Policy templates | ❌ **NOT implemented** | **GAP** |
| Custom policy per program | ❌ **NOT implemented** | **GAP** |
| DataPrivacySection in settings | ✅ Exists in tenant settings | Present (tenant-level) |

**Verdict:** NOT IMPLEMENTED for per-program level. Platform-level privacy exists but not per-card.

**Gap Size:** LARGE — New feature with legal implications

---

## 24. UX/UI — PROGRAM TYPE DESCRIPTIONS

**Client Request:** Update all card type descriptions and header texts. (See Section 7 for full list)

**Status:** All changes are **i18n text updates** in the translation files.

**Gap Size:** MINIMAL — Pure text/i18n changes

---

## 25. WALLET PREVIEW — APPLE/GOOGLE TOGGLE

**Client Request:** Mockup should show Apple Wallet and Google Wallet views with proper device frames (iPhone for Apple, Android phone for Google).

| Feature | Current State | Gap |
|---------|--------------|-----|
| Apple/Google platform toggle | ✅ `PlatformToggle` in wallet studio | Present |
| Device frame mockup | ✅ `DeviceFrame` component | Present |
| iPhone frame for Apple | ⚠️ Needs verification of actual frame design | **Verify** |
| Android frame for Google | ⚠️ Needs verification of actual frame design | **Verify** |
| Toggle on type selection page | ⚠️ Not in step 0 (type selection) | **GAP** — Should be on type selection hover preview |

**Verdict:** Mostly implemented in wallet studio. Needs toggle on type selection page.

**Gap Size:** SMALL

---

## 26. IMAGE CROPPING TOOL

**Client Request:** When uploading images (stamps, logos, icons, backgrounds), provide a cropping tool with: Zoom +/-, Move (up/down/left/right), Rotate (horizontal/vertical/360°), Reset.

| Feature | Current State | Gap |
|---------|--------------|-----|
| Image upload | ✅ `ImageUploadField` and `SmartImageUpload` | Present |
| CSS-based preview | ✅ `object-cover`/`object-contain` | Present |
| Crop tool (react-image-crop) | ❌ **NOT installed or used** | **GAP** |
| Zoom controls | ❌ **NOT implemented** | **GAP** |
| Move controls | ❌ **NOT implemented** | **GAP** |
| Rotate controls | ❌ **NOT implemented** | **GAP** |
| Reset button | ❌ **NOT implemented** | **GAP** |
| Crop overlay with dimension guide | ❌ **NOT implemented** | **GAP** |

**Verdict:** NOT IMPLEMENTED. Entirely new image editing feature needed.

**Gap Size:** LARGE — Significant new UI component

---

## 27. IMAGE AUTO-PASS TO GOOGLE WALLET

**Client Request:** When images are uploaded for Apple Wallet, they should automatically be used for Google Wallet (no re-upload needed).

| Feature | Current State | Gap |
|---------|--------------|-----|
| Per-platform image storage | ✅ `walletDesign.images` stores per-platform | Present |
| Auto-copy Apple → Google | ❌ **NOT implemented** | **GAP** — Images don't auto-sync between platforms |
| Manual re-upload required | Yes | **GAP** — Client wants automatic transfer |

**Verdict:** NOT IMPLEMENTED. Competitor (Devotion Rewards) does this automatically.

**Gap Size:** MEDIUM

---

## 28. PUSH NOTIFICATION ON CARD DOWNLOAD

**Client Request:** When a customer downloads a card to their wallet, send a default push notification. User should configure the notification title and body (with character count, emoji support, save button).

| Feature | Current State | Gap |
|---------|--------------|-----|
| Push on download | ⚠️ `WalletNotificationPreview` exists | **Verify** if it triggers on download |
| Configurable title + body | ⚠️ `pushMessage` field exists in CouponTab | **PARTIAL** — Not in all card types |
| Character count display | ❌ **NOT implemented** | **GAP** |
| Emoji support in push text | ⚠️ `EmojiPickerButton` component exists | **Verify** integration |
| Save button for push config | ❌ **NOT implemented** | **GAP** |
| Max character limit | ❌ **NOT enforced** | **GAP** |
| Help/tooltip texts for push section | ❌ **NOT implemented** | **GAP** |

**Verdict:** Partially implemented for coupons. Needs expansion to all card types with additional features.

**Gap Size:** MEDIUM

---

## 29. LOCATION PER PLAN LIMIT

**Client Request:** Limit the number of locations per plan. If user exceeds, show upgrade prompt with "$10 per additional location" payment option.

| Feature | Current State | Gap |
|---------|--------------|-----|
| Location management | ✅ `form.locations` array | Present |
| Plan-based location limit | ❌ **NOT enforced** | **GAP** — No limit based on plan |
| Upgrade prompt on limit | ❌ **NOT implemented** | **GAP** |
| $10/location add-on | ❌ **NOT implemented** | **GAP** |
| Auto-activate after payment | ❌ **NOT implemented** | **GAP** |

**Verdict:** NOT IMPLEMENTED. Locations are unlimited regardless of plan.

**Gap Size:** MEDIUM-LARGE — Requires billing integration

---

## 30. MOCKUP SCROLL BEHAVIOR

**Client Request:** When scrolling the configuration form, the phone mockup on the right should stay fixed (sticky) and scroll with the user, not stay at the top.

| Feature | Current State | Gap |
|---------|--------------|-----|
| Sticky mockup | ⚠️ `sticky top-8` class exists in some places | **Verify** actual behavior |
| Scroll sync | ⚠️ Needs verification | **Verify** |

**Verdict:** Partially implemented with `sticky` positioning. Needs verification across all card types.

**Gap Size:** SMALL — CSS positioning verification

---

## SUMMARY — GAP SIZES BY PRIORITY

### CRITICAL (User-facing bug)
| # | Item | Gap Size |
|---|------|----------|
| 1 | Session timeout bug | HIGH |

### LARGE GAPS (New features, significant work)
| # | Item | Gap Size |
|---|------|----------|
| 9 | Stamp custom image upload + cropping | LARGE |
| 11 | Card Info Section (all card types) | LARGE |
| 14 | Coupon linked card template | LARGE |
| 17 | Multi-tier levels system | LARGE |
| 18 | Happy hours (point multipliers) | LARGE |
| 23 | Privacy policy per program | LARGE |
| 26 | Image cropping tool | LARGE |

### MEDIUM GAPS (Partial implementation, moderate work)
| # | Item | Gap Size |
|---|------|----------|
| 8 | Stamp config (QR/barcode, tooltips, internal name) | MEDIUM |
| 10 | Stamp colors & field customization | MEDIUM |
| 12 | Coupon config (help texts, decimals, special promo) | MEDIUM |
| 13 | Coupon design (colors, cropping) | MEDIUM |
| 16 | Cashback card (expiry redesign, permanent points) | MEDIUM |
| 19 | Gift card (QR/barcode) | MEDIUM |
| 20 | Discount by levels (verification needed) | MEDIUM |
| 22 | QR/barcode type selection (all cards) | MEDIUM |
| 27 | Image auto-pass to Google Wallet | MEDIUM |
| 28 | Push notification config (all cards) | MEDIUM |
| 29 | Location per plan limit | MEDIUM-LARGE |

### SMALL GAPS (Mostly implemented, minor fixes)
| # | Item | Gap Size |
|---|------|----------|
| 2 | Dashboard date filters (position/labels) | SMALL |
| 3 | Ganancias tab (fake referrals metric) | SMALL |
| 4 | Visitas tab (missing program filter) | SMALL |
| 6 | Programs button label | MINIMAL |
| 7 | Card type descriptions (i18n text) | SMALL |
| 21 | Enrollment form labels | SMALL |
| 24 | UX/UI text changes | MINIMAL |
| 25 | Wallet preview toggle on type selection | SMALL |
| 30 | Mockup scroll behavior | SMALL |

---

## TOTAL ESTIMATED GAPS

| Category | Count |
|----------|-------|
| FULLY IMPLEMENTED | 3 items |
| LARGE GAP | 7 items |
| MEDIUM GAP | 11 items |
| SMALL/MINIMAL GAP | 9 items |
| **Total items with gaps** | **27 items** |

---

## RECOMMENDED IMPLEMENTATION ORDER

1. **Phase 1 — Quick wins + bug fix** (1-2 days)
   - Fix session timeout bug (#1)
   - Update button labels and i18n texts (#6, #7, #24)
   - Fix enrollment form labels (#21)
   - Add program filter to visitas (#4)

2. **Phase 2 — Dashboard completion** (2-3 days)
   - Fix fake referrals metric (#3)
   - Position/label adjustments for date filter (#2)
   - Verify mockup scroll behavior (#30)

3. **Phase 3 — QR/Barcode + Config improvements** (3-5 days)
   - Add QR/barcode selector to all card types (#22)
   - Add help/tooltip texts to coupon (#12)
   - Add special promotion as 3rd coupon type (#12)
   - Stamp config improvements (#8)
   - Push notification config expansion (#28)

4. **Phase 4 — Design & Image features** (5-8 days)
   - Image cropping tool (#26)
   - Custom stamp image upload (#9)
   - Color customization for stamp area and coupon central area (#10, #13)
   - Image auto-pass to Google Wallet (#27)
   - Wallet preview toggle on type selection (#25)

5. **Phase 5 — New major features** (8-12 days)
   - Card Info Section for all types (#11)
   - Multi-tier levels system (#17)
   - Coupon linked card template (#14)
   - Privacy policy per program (#23)
   - Location per plan limit (#29)

6. **Phase 6 — Advanced features** (5-8 days)
   - Happy hours (#18)
   - Permanent points option (#16)
   - Cashback expiry redesign (#16)

---

*End of GAP Analysis Report*
