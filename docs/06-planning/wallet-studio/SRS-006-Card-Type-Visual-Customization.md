# SRS-006: Card-Type Visual Customization Matrix

> **ISO/IEC/IEEE 29148:2018 — Software Requirements Specification**
> Document ID: SRS-LOY-WPS-006 | Version: 1.0.0-Draft

---

## Overview

Every Loyallia card type has **platform-standard images** (logo, strip, icon, thumbnail, hero) PLUS **card-type-specific visual elements** that enhance the user experience and brand identity. This document specifies ALL customizable visual elements per card type.

**Two categories of visual customization:**
1. **Platform Images** — Standard Apple/Google image slots (logo, strip, hero, etc.)
2. **Card-Type Decorative Elements** — Custom icons, badges, stamps, graphics specific to the card type's purpose

---

## Visual Customization Summary Table

| # | Card Type | Platform Images | Custom Decorative Elements | Icon Picker | Image Upload |
|---|-----------|----------------|---------------------------|:-----------:|:------------:|
| 1 | **stamp** | logo, strip, icon | Stamp shapes, stamp icons, progress grid | ✅ | ✅ |
| 2 | **cashback** | logo, strip, icon | Points coin icon, tier badge, progress ring | ✅ | ✅ |
| 3 | **coupon** | logo, strip, icon | Scissors cut line, discount badge, offer tag | ✅ | ❌ |
| 4 | **affiliate** | logo, icon, thumbnail | Referral chain icon, ambassador badge | ✅ | ✅ |
| 5 | **discount** | logo, strip, icon | Tier indicator, percentage ring, sale burst | ✅ | ❌ |
| 6 | **gift_certificate** | logo, strip, icon | Gift box/ribbon graphic, denomination badge | ✅ | ✅ |
| 7 | **vip_membership** | logo, icon, thumbnail | Crown/star tier icon, member badge, seal | ✅ | ✅ |
| 8 | **corporate_discount** | logo, icon, thumbnail | Building icon, employee badge, corp seal | ✅ | ✅ |
| 9 | **referral_pass** | logo, icon, thumbnail | Friend icons, gift icon, referral chain | ✅ | ✅ |
| 10 | **multipass** | logo, strip, icon | Multi-ticket indicator, bundle count, countdown | ✅ | ❌ |

---

## 1. STAMP CARD — Custom Stamp Designs ⭐

> **Most customizable card type.** Full stamp icon system with image OR flat icon options.

### Platform Mapping
| Platform | Pass Style | Images Available |
|----------|-----------|-----------------|
| Apple | `storeCard` | logo, icon, strip |
| Google | `loyalty` | logo, heroImage |

### Custom Stamp Visual Elements

| Element | Type | Customizable | Options |
|---------|------|:------------:|---------|
| **Empty Stamp Shape** | Icon picker | ✅ | Circle, Square, Star, Heart, Diamond, Hexagon, Coffee Cup, Custom |
| **Filled Stamp Shape** | Icon picker | ✅ | Same as empty + color fill |
| **Stamp Icon (Empty)** | Image OR Icon | ✅ | Upload image OR pick from 50+ flat icons |
| **Stamp Icon (Filled)** | Image OR Icon | ✅ | Upload image OR pick from 50+ flat icons |
| **Stamp Grid Layout** | Config | ✅ | 5, 6, 8, 10, 12 stamps |
| **Grid Arrangement** | Config | ✅ | Horizontal row, 2×N grid, scattered |
| **Stamp Color (Empty)** | Color picker | ✅ | Any color + opacity |
| **Stamp Color (Filled)** | Color picker | ✅ | Any color |
| **Stamp Border** | Config | ✅ | None, solid, dashed, dotted |
| **Reward Reveal Style** | Config | ✅ | Fade in, pop, sparkle, confetti |

### Stamp Icon Library (50+ Flat Icons)

**Food & Drink:** ☕ 🍕 🍔 🍦 🍩 🧁 🍪 🥤 🍺 🍷 🥐 🍰 🌮 🍣 🍜  
**Retail:** 🛍️ 🎁 👕 💄 🧴 🕶️ 💍 📱 💻 ⌚ 🎮 📚 🧸  
**Services:** ✂️ 💇 💆 💅 🏋️ 🧘 🏊 🚗 🏠 🔧 💼  
**Generic:** ⭐ ❤️ 🔥 ✨ 🎉 🏆 🎯 💎 🌟 ⚡ 🎵 🌈 🦋 🍀  
**Custom:** Upload any PNG/SVG icon

### Stamp Card Mockup

```
┌─────────────────────────────────────────────┐
│  [LOGO]  Café Central                       │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐   │
│  │         STRIP IMAGE                 │   │
│  │       (coffee beans photo)          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  SELLOS                    3 / 10           │
│                                             │
│  [☕] [☕] [☕] [○] [○] [○] [○] [○] [○] [○]│
│   F    F    F    E   E   E   E   E   E   E │
│                                             │
│  RECOMPENSA: Café gratis                   │
│  CLIENTE: Juan Pérez                       │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ [QR]  0000 0000 0000                │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘

F = Filled stamp (custom icon: coffee cup)
E = Empty stamp (custom shape: circle)
```

### Implementation Notes
- Stamp icons are rendered in the canvas preview layer (not part of the actual .pkpass)
- On Apple/Google Wallet, stamps are shown as text values (e.g., "3/10")
- The stamp visual is for the Loyallia app preview and marketing materials
- Stamp icons can be SVG for sharp rendering at any size
- User can upload custom stamp image (e.g., branded coffee cup silhouette)

---

## 2. CASHBACK — Points & Tier Badges

### Platform Mapping
| Platform | Pass Style | Images Available |
|----------|-----------|-----------------|
| Apple | `storeCard` | logo, icon, strip |
| Google | `loyalty` | logo, heroImage |

### Custom Cashback Visual Elements

| Element | Type | Customizable | Options |
|---------|------|:------------:|---------|
| **Points Coin Icon** | Icon picker | ✅ | Coin, Star, Diamond, Gem, Flame, Custom |
| **Tier Badge Shape** | Icon picker | ✅ | Circle, Shield, Crown, Star, Hexagon |
| **Tier Badge Icon** | Image OR Icon | ✅ | Upload OR pick from tier icons |
| **Progress Ring Style** | Config | ✅ | Circular, Linear, Segmented, Dotted |
| **Progress Fill Animation** | Config | ✅ | Slide, Grow, Color shift, Pulse |
| **Cashback Percentage Display** | Config | ✅ | Large number, Badge, Floating label |

### Tier Badge Icon Library

**Bronze Tier:** 🥉 ⚙️ 🏗️ 🪵  
**Silver Tier:** 🥈 🔧 ⚖️ 🪙  
**Gold Tier:** 🥇 👑 🏆 💎  
**Platinum Tier:** 💠 🌟 ✨ 💍  
**Diamond Tier:** 💎 🔷 💠 🌌  

### Cashback Mockup

```
┌─────────────────────────────────────────────┐
│  [LOGO]  SuperMart                          │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐   │
│  │         STRIP IMAGE                 │   │
│  └─────────────────────────────────────┘   │
│                                             │
│         ┌─────────┐                         │
│         │  🥇     │  GOLD                   │
│         │  5%     │  cashback               │
│         └─────────┘                         │
│                                             │
│  PUNTOS: 1,250    VALOR: $12.50            │
│                                             │
│  [==========>        ] 62% al siguiente    │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ [QR]                                │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 3. COUPON — Discount Badges & Cut Lines

### Platform Mapping
| Platform | Pass Style | Images Available |
|----------|-----------|-----------------|
| Apple | `coupon` | logo, icon, strip |
| Google | `offer` | logo, heroImage |

### Custom Coupon Visual Elements

| Element | Type | Customizable | Options |
|---------|------|:------------:|---------|
| **Scissors Cut Line** | Config | ✅ | Dashed, Dotted, Zigzag, Wavy |
| **Discount Badge Shape** | Icon picker | ✅ | Circle, Burst, Tag, Ribbon, Star |
| **Offer Tag Style** | Config | ✅ | Classic tag, Modern pill, Floating badge |
| **Expiration Countdown** | Config | ✅ | Days left, Hours left, Timer ring |
| **Redeem Button Style** | Config | ✅ | Pill, Rectangle, Ghost, Outline |
| **Perforation Effect** | Config | ✅ | Top edge (Apple style), Side tear, None |

### Coupon Mockup

```
┌─────────────────────────────────────────────┐
│  [LOGO]  FashionStore          ╭──────╮    │
│                                 │ -30% │    │
│  ┌─────────────────────────────╰──────╯──┐  │
│  │         STRIP IMAGE                    │  │
│  │      (summer sale photo)               │  │
│  └────────────────────────────────────────┘  │
│  ·········································· │
│  ✂ DESCUENTO: 30% en toda la tienda         │
│  CÓDIGO: VERANO30                           │
│  VÁLIDO HASTA: 15 días                      │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ [QR]  VERANO30                      │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘

Perforated top edge (Apple coupon style)
Scissors cut line visual indicator
```

---

## 4. AFFILIATE — Referral Chain & Ambassador Badges

### Platform Mapping
| Platform | Pass Style | Images Available |
|----------|-----------|-----------------|
| Apple | `generic` | logo, icon, thumbnail |
| Google | `generic` | logo, heroImage |

### Custom Affiliate Visual Elements

| Element | Type | Customizable | Options |
|---------|------|:------------:|---------|
| **Referral Chain Icon** | Icon picker | ✅ | Link, Chain, Network, Tree, Graph |
| **Ambassador Badge** | Image OR Icon | ✅ | Upload OR pick from badge icons |
| **Referral Counter Style** | Config | ✅ | Number badge, Progress bar, Tier tower |
| **Success Indicator** | Config | ✅ | Checkmark, Star burst, Confetti |
| **Earnings Display** | Config | ✅ | Coin stack, Graph, Number with trend |

### Affiliate Mockup

```
┌─────────────────────────────────────────────┐
│  [LOGO]  FitLife Affiliate                  │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐   │
│  │  [THUMBNAIL]  AMBASSADOR BADGE      │   │
│  │     👤       ┌──────────┐           │   │
│  │             │  🏅 PRO   │           │   │
│  │             └──────────┘           │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  REFERIDOS: 12        GANANCIAS: $45       │
│                                             │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐      │
│  │ 👤 │→│ 👤 │→│ 👤 │→│ 👤 │→│ 💰 │      │
│  └────┘ └────┘ └────┘ └────┘ └────┘      │
│                                             │
│  Próximo nivel: 3 más para Platinum        │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ [QR]                                │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 5. DISCOUNT — Tier Rings & Sale Bursts

### Platform Mapping
| Platform | Pass Style | Images Available |
|----------|-----------|-----------------|
| Apple | `storeCard` | logo, icon, strip |
| Google | `offer` | logo, heroImage |

### Custom Discount Visual Elements

| Element | Type | Customizable | Options |
|---------|------|:------------:|---------|
| **Tier Indicator Ring** | Config | ✅ | Circular progress, Segmented ring, Dots |
| **Percentage Display** | Config | ✅ | Large number, Badge, Ring with % |
| **Sale Burst Graphic** | Icon picker | ✅ | Starburst, Explosion, Confetti, Flash |
| **Spending Threshold Bar** | Config | ✅ | Linear, Segmented, Milestone markers |
| **Active Tier Highlight** | Config | ✅ | Glow, Border, Background fill |

### Discount Tier Example

| Tier | Min Spend | Discount | Visual Badge |
|------|-----------|----------|-------------|
| Bronce | $0 | 5% | 🥉 Brown ring |
| Plata | $100 | 10% | 🥈 Silver ring |
| Oro | $300 | 15% | 🥇 Gold ring |
| Platino | $500 | 20% | 💠 Platinum ring |

### Discount Mockup

```
┌─────────────────────────────────────────────┐
│  [LOGO]  TechStore                          │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐   │
│  │         STRIP IMAGE                 │   │
│  └─────────────────────────────────────┘   │
│                                             │
│         ┌─────────┐                         │
│         │  🥈     │  TIER PLATA             │
│         │ -10%    │  Descuento activo       │
│         └─────────┘                         │
│                                             │
│  GASTADO: $145 / $300 para Oro             │
│  [===========>          ] 48%              │
│                                             │
│  🥉 5%    🥈 10%●   🥇 15%   💠 20%        │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ [QR]                                │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 6. GIFT CERTIFICATE — Gift Box & Ribbon Graphics

### Platform Mapping
| Platform | Pass Style | Images Available |
|----------|-----------|-----------------|
| Apple | `storeCard` | logo, icon, strip |
| Google | `giftCard` | logo, heroImage, programLogo |

### Custom Gift Certificate Visual Elements

| Element | Type | Customizable | Options |
|---------|------|:------------:|---------|
| **Gift Box Graphic** | Image OR Icon | ✅ | Upload custom OR pick from gift icons |
| **Ribbon/Bow Style** | Icon picker | ✅ | Classic bow, Modern ribbon, Seal, Wax stamp |
| **Denomination Badge** | Config | ✅ | Circle, Tag, Banner, Floating |
| **Decorative Corners** | Config | ✅ | Ornate, Minimal, Corner flourishes |
| **Recipient Name Style** | Config | ✅ | Script font, Bold label, Gift tag |
| **Occasion Theme** | Icon picker | ✅ | Birthday 🎂, Wedding 💒, Holiday 🎄, Generic 🎁 |

### Gift Certificate Mockup

```
┌─────────────────────────────────────────────┐
│  [LOGO]  Café Central                       │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐   │
│  │         STRIP IMAGE                 │   │
│  │    (gift wrapping pattern)          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│           🎁                                │
│         ┌──────────┐                        │
│         │  $50.00  │  TARJETA DE REGALO     │
│         └──────────┘                        │
│                                             │
│  PARA: María González                       │
│  DE: Carlos Pérez                           │
│  VÁLIDO HASTA: 31/12/2025                  │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ [QR]  GIFT-12345                    │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 7. VIP MEMBERSHIP — Crown & Star Tier Icons

### Platform Mapping
| Platform | Pass Style | Images Available |
|----------|-----------|-----------------|
| Apple | `generic` | logo, icon, thumbnail |
| Google | `loyalty` | logo, heroImage |

### Custom VIP Visual Elements

| Element | Type | Customizable | Options |
|---------|------|:------------:|---------|
| **Crown/Tier Icon** | Image OR Icon | ✅ | Upload OR pick from crown/star icons |
| **Member Badge** | Image OR Icon | ✅ | Shield, Crest, Circle with initial |
| **Exclusive Seal** | Icon picker | ✅ | Star, Crown, Diamond, Laurel wreath |
| **Tier Color Coding** | Config | ✅ | Automatic gradient per tier |
| **Member Since Display** | Config | ✅ | Date badge, Anniversary counter |
| **Benefits List Icon** | Icon picker | ✅ | Checkmark, Star, Diamond, Crown |

### VIP Tier Icons

| Tier | Icon | Color | Badge Shape |
|------|------|-------|------------|
| Básico | ⭐ | #CD7F32 (Bronze) | Circle |
| Plata | 🥈 | #C0C0C0 (Silver) | Shield |
| Oro | 🥇 | #FFD700 (Gold) | Crown |
| Platino | 💎 | #E5E4E2 (Platinum) | Diamond |
| Diamante | 👑 | #B9F2FF (Diamond) | Royal Crest |

### VIP Mockup

```
┌─────────────────────────────────────────────┐
│  [LOGO]  GymPro                    [👤]    │
│                                     (thumb) │
├─────────────────────────────────────────────┤
│                                             │
│           👑                                │
│         ┌──────────┐                        │
│         │   VIP    │  ORO                   │
│         │  DIAMANTE│                        │
│         └──────────┘                        │
│                                             │
│  MIEMBRO: Juan Pérez                        │
│  DESDE: Marzo 2022 (3 años)                │
│                                             │
│  BENEFICIOS:                               │
│  ✓ Acceso 24/7                             │
│  ✓ Clases grupales ilimitadas              │
│  ✓ 1 sesión personal/mes                   │
│  ✓ Spa & sauna                             │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ [QR]                                │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 8. CORPORATE DISCOUNT — Building & Employee Badges

### Platform Mapping
| Platform | Pass Style | Images Available |
|----------|-----------|-----------------|
| Apple | `coupon` | logo, icon, strip |
| Google | `offer` | logo, heroImage |

### Custom Corporate Visual Elements

| Element | Type | Customizable | Options |
|---------|------|:------------:|---------|
| **Building/Company Icon** | Image OR Icon | ✅ | Upload company icon OR pick from building icons |
| **Employee Badge Frame** | Config | ✅ | ID card style, Corporate badge, Minimal |
| **Department Badge** | Icon picker | ✅ | Briefcase, Gear, Code, Design, Support |
| **Security Seal** | Config | ✅ | Verified check, Lock, Shield |
| **Employee Photo Placeholder** | Config | ✅ | Circle, Rounded square, Badge shape |
| **Company Color Bar** | Config | ✅ | Top bar, Side bar, Bottom accent |

### Corporate Mockup

```
┌─────────────────────────────────────────────┐
│  [LOGO]  TechCorp Inc.                      │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐   │
│  │         STRIP IMAGE                 │   │
│  │    (corporate office photo)         │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌──────────┐  EMPLEADO CORPORATIVO        │
│  │  👤      │  Juan Pérez                  │
│  │ (photo)  │  ID: EMP-4521                │
│  └──────────┘  Depto: Ingeniería           │
│                                             │
│  DESCUENTO: 15% en toda la tienda          │
│  VÁLIDO: Lunes a Viernes                    │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ [QR]  EMP-4521-CORP                 │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 9. REFERRAL PASS — Friend Icons & Gift Graphics

### Platform Mapping
| Platform | Pass Style | Images Available |
|----------|-----------|-----------------|
| Apple | `generic` | logo, icon, thumbnail |
| Google | `generic` | logo, heroImage |

### Custom Referral Visual Elements

| Element | Type | Customizable | Options |
|---------|------|:------------:|---------|
| **Referral Icon** | Icon picker | ✅ | Two people, Handshake, Gift exchange, Chain |
| **Gift/Reward Icon** | Image OR Icon | ✅ | Upload OR pick from reward icons |
| **Progress to Reward** | Config | ✅ | Counter, Progress bar, Milestone dots |
| **Success Celebration** | Config | ✅ | Confetti, Star burst, Trophy pop |
| **Friend Counter Style** | Config | ✅ | Avatar stack, Number badge, Growing circle |
| **Reward Tier Display** | Config | ✅ | Tier list, Unlock animation, Preview |

### Referral Reward Tiers Example

| Referrals | Reward | Visual |
|-----------|--------|--------|
| 1 | $5 credit | 🎁 Small gift |
| 3 | $20 credit | 🎁🎁 Medium gift |
| 5 | $50 credit + free item | 🎁🎁🎁 Large gift |
| 10 | VIP status | 👑 Crown |

### Referral Mockup

```
┌─────────────────────────────────────────────┐
│  [LOGO]  ShopOnline                         │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐   │
│  │         STRIP IMAGE                 │   │
│  └─────────────────────────────────────┘   │
│                                             │
│     👤 → 👤 = 🎁                            │
│   Invita amigos y gana                     │
│                                             │
│  TUS REFERIDOS: 2 / 5 para $50             │
│  [🟢] [🟢] [⚪] [⚪] [⚪]                  │
│                                             │
│  RECOMPENSAS:                              │
│  ✓ 1 referido = $5                         │
│  ✓ 3 referidos = $20                       │
│  ⏳ 5 referidos = $50                      │
│  🔒 10 referidos = VIP                     │
│                                             │
│  TU CÓDIGO: JUAN456                        │
│  ┌─────────────────────────────────────┐   │
│  │ [QR]  JUAN456                       │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 10. MULTIPASS — Multi-Ticket Indicators

### Platform Mapping
| Platform | Pass Style | Images Available |
|----------|-----------|-----------------|
| Apple | `storeCard` | logo, icon, strip |
| Google | `loyalty` | logo, heroImage |

### Custom Multipass Visual Elements

| Element | Type | Customizable | Options |
|---------|------|:------------:|---------|
| **Ticket Icon** | Icon picker | ✅ | Ticket stub, Pass card, Admission, Entry |
| **Bundle Count Display** | Config | ✅ | Number stack, Counter ring, Ticket row |
| **Used/Remaining Indicator** | Config | ✅ | Checkmarks, Crossed out, Color change |
| **Expiration Countdown** | Config | ✅ | Days left, Calendar view, Urgency color |
| **Individual Ticket Visual** | Config | ✅ | Mini tickets, Grid, List with checkboxes |
| **Session/Entry Type Badge** | Icon picker | ✅ | Yoga 🧘, Pool 🏊, Gym 🏋️, Class 📚 |

### Multipass Mockup

```
┌─────────────────────────────────────────────┐
│  [LOGO]  Wellness Center                    │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐   │
│  │         STRIP IMAGE                 │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  PAQUETE: 10 Sesiones                      │
│  RESTANTES: 4                              │
│                                             │
│  🎟️ 🎟️ 🎟️ 🎟️ ❌ ❌ ❌ ❌ ❌ ❌            │
│   ✓   ✓   ✓   ✓   ✗   ✗   ✗   ✗   ✗   ✗   │
│                                             │
│  PRÓXIMA EXPIRA: 15 días                   │
│  [========>          ]                     │
│                                             │
│  CLASES INCLUIDAS:                         │
│  ✓ Yoga   ✓ Pilates   ✓ Natación          │
│  ✓ Gym    ✓ Spinning  ✓ Zumba             │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ [QR]                                │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## Implementation: Icon Picker Component

### Icon Picker UI Specification

```
┌─────────────────────────────────────────────────────────────┐
│ ICON PICKER                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [🔍 Buscar iconos...                    ] [📤 Subir]      │
│                                                             │
│  CATEGORÍAS:                                                │
│  [Todos] [Comida] [Retail] [Servicios] [Deportes] [Custom] │
│                                                             │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ │
│  │ ☕ │ │ 🍕 │ │ 🍔 │ │ 🍦 │ │ 🍩 │ │ 🧁 │ │ 🍪 │ │ 🥤 │ │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ │
│  │ 🍺 │ │ 🥐 │ │ 🍰 │ │ 🌮 │ │ 🍣 │ │ 🏋️ │ │ ✂️ │ │ 💇 │ │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ │
│  │ ⭐ │ │ ❤️ │ │ 🔥 │ │ ✨ │ │ 🎉 │ │ 🏆 │ │ 🎯 │ │ 💎 │ │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ │
│                                                             │
│  [Subir imagen personalizada]                               │
│  Formatos: PNG, SVG. Tamaño recomendado: 128×128px         │
│                                                             │
│              ┌──────────────┐                               │
│  VISTA PREV: │    [ICON]    │  Tamaño: 64×64px             │
│              │   selected   │                               │
│              └──────────────┘                               │
│                                                             │
│  Color del icono: ████████ #FF6B35  [Color picker]         │
│                                                             │
│              [Cancelar]  [Aplicar]                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Icon Picker Behaviors

| Interaction | Behavior |
|-------------|----------|
| Click icon | Selects icon, updates preview |
| Search | Filters icons by keyword (name, category, tags) |
| Category tab | Filters by category |
| Upload button | Opens file picker for custom icon image |
| Color picker | Changes icon color (tint) in real-time |
| Preview | Shows icon at pass-appropriate size |
| Apply | Confirms selection, closes picker |
| Cancel | Discards changes |

### Technical Specs

- **Icon library:** 200+ SVG icons, categorized
- **Custom upload:** PNG or SVG, max 256×256px, auto-resized
- **Rendering:** SVG preferred for sharpness, PNG fallback
- **Color support:** Monochrome icons with CSS color tint
- **Accessibility:** All icons have aria-labels

---

## Card-Type → Sidebar Tab Mapping

When user selects a card type, the sidebar shows a **card-type-specific tab** in addition to the standard tabs:

| Card Type | Extra Sidebar Tab | Tab Icon |
|-----------|------------------|----------|
| **stamp** | Sellos | 🎯 |
| **cashback** | Puntos & Niveles | 🏆 |
| **coupon** | Oferta & Descuento | 🏷️ |
| **affiliate** | Referidos | 👥 |
| **discount** | Niveles de Descuento | 📊 |
| **gift_certificate** | Regalo | 🎁 |
| **vip_membership** | Membresía VIP | 👑 |
| **corporate_discount** | Corporativo | 🏢 |
| **referral_pass** | Referidos | 🤝 |
| **multipass** | Paquete | 🎟️ |

---

*End of Document SRS-006*
