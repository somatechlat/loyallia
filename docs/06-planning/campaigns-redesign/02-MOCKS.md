# 🎨 Documento 2: Mocks de Todas las Pantallas

> ⚠️ **Estado del documento (2026-06-11):** Estos mocks representan el **diseño
> propuesto**. La implementación real (`CampaignWizard.tsx` y componentes en
> `frontend/src/components/campaigns/`) usa **3 pasos** (Canal → Audiencia →
> Contenido), no 4. También incluye selección/exclusión manual de clientes y
> programación de envío. Los endpoints reales se documentan en el Documento 3.

Muestras completas del wizard rediseñado. Cada pantalla representa el estado final del diseño.

---

## Pantalla 0: Home — Lista de Campañas

Esta pantalla NO cambia drásticamente, solo se mejora el botón de creación.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📢 Campañas de Marketing                                                   │
│  Crea y envía campañas a tus clientes            [+ Nueva Campaña]          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 📧 Email: 1,240 / 5,000 este mes                                    │   │
│  │ 📱 Wallet: ilimitado   │   💬 WhatsApp: 45 / 100 hoy               │   │
│  │ 📨 SMS: 0 / 50 hoy                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Título              │ Tipo    │ Audiencia          │ Estado │ Envíos │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ Promo de Verano     │ Wallet  │ ☕ Café Rewards    │ ✅ OK  │ 1,240  │   │
│  │ Descuento VIP       │ Email   │ 🏆 VIP             │ ✅ OK  │ 89     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Cambios implementados:**
- El botón `[+ Nueva Campaña]` abre el wizard de pantalla completa (no un form inline)
- Los banners de uso por canal son más compactos (una sola línea cada uno)

---

## Pantalla 1: Paso 1 — Seleccionar Canal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ❌  Cancelar                                                               │
│                                                                             │
│                    ● Canal        ○ Audiencia      ○ Contenido             │
│                    ●──────        ○────────        ○─────────              │
│                                                                             │
│                                                                             │
│           ┌──────────────────┐                                              │
│           │                                                  │              │
│           │   💌 Email              [✓ SELECCIONADO]         │              │
│           │   ──────────────────────────────────────────     │              │
│           │   Envía mensajes ricos con imágenes y HTML       │              │
│   ┌───────│   límite: 5,000/mes                              │────────┐    │
│   │       │                                                  │        │    │
│   │       └──────────────────┘                               │        │    │
│   │                                                          │        │    │
│   │       ┌──────────────────┐                               │        │    │
│   │       │                                                  │        │    │
│   │       │   📱 Wallet               [ ]                    │        │    │
│   │       │   ──────────────────────────────────────────     │        │    │
│   │       │   Notificaciones push directo al móvil del       │        │    │
│   │       │   cliente (Apple Wallet / Google Wallet)         │        │    │
│   │       │   límite: ilimitado                                │        │    │
│   │       │                                                  │        │    │
│   │       └──────────────────┘                               │        │    │
│   │                                                          │        │    │
│   │       ┌──────────────────┐                               │        │    │
│   │       │                                                  │        │    │
│   │       │   💬 WhatsApp             [ ]                    │        │    │
│   │       │   ──────────────────────────────────────────     │        │    │
│   │       │   Mensajes directos vía WhatsApp Business        │        │    │
│   │       │   límite: 100/día                                  │        │    │
│   │       │                                                  │        │    │
│   │       └──────────────────┘                               │        │    │
│   │                                                          │        │    │
│   │       ┌──────────────────┐                               │        │    │
│   │       │                                                  │        │    │
│   │       │   📨 SMS                  [🔒 BLOQUEADO]         │        │    │
│   │       │   ──────────────────────────────────────────     │        │    │
│   │       │   Mensajes de texto directos                     │        │    │
│   │       │   Actualiza tu plan para activar                 │        │    │
│   │       │                                                  │        │    │
│   │       └──────────────────┘                               │        │    │
│   │                                                          │        │    │
│   └──────────────────────────────────────────────────────────┘        │    │
│                                                                        │    │
│                                    [Continuar →]                       │    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Reglas de esta pantalla (implementadas):**
- Solo se puede seleccionar UN canal
- Los canales bloqueados por plan muestran candado y mensaje de upgrade
- El canal seleccionado se marca con checkmark y borde de color
- Existen "Quick Presets" que permiten saltar directamente al paso de contenido

---

## Pantalla 2: Paso 2 — Seleccionar Audiencia (EL CAMBIO PRINCIPAL)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ❌  Cancelar                                                               │
│                                                                             │
│     ① ✓ Canal  ● Audiencia      ○ Contenido                                 │
│                  ●─────────      ○─────────                                  │
│                                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  📌 RESUMEN:  📱 Wallet  │  Programa: —  │  Audiencia: —                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                             │
│  ╔═══════════════════════════════════════════════════════════════════════╗  │
│  ║                                                                       ║  │
│  ║  📍 PASO A: ¿A qué programa quieres enviar?                          ║  │
│  ║                                                                       ║  │
│  ║      [🔍 Buscar programa...]                                         ║  │
│  ║                                                                       ║  │
│  ║      ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            ║  │
│  ║      │              │  │              │  │              │            ║  │
│  ║      │   ☕ CAFÉ      │  │   🍕 PIZZA     │  │   🏋️ GYM       │            ║  │
│  ║      │   REWARDS      │  │   VIP ORO      │  │   FITPASS      │            ║  │
│  ║      │              │  │              │  │              │            ║  │
│  ║      │  ● selected   │  │              │  │              │            ║  │
│  ║      │  ───────────  │  │  ───────────  │  │  ───────────  │            ║  │
│  ║      │  👥 1,240     │  │  👥 89        │  │  👥 340       │            ║  │
│  ║      │  inscritos    │  │  inscritos    │  │  inscritos    │            ║  │
│  ║      └──────────────┘  └──────────────┘  └──────────────┘            ║  │
│  ║                                                                       ║  │
│  ║      ┌────────────────────────────────────────────────────────────┐   ║  │
│  ║      │ ☐  Todos los programas activos  —  2,456 clientes totales  │   ║  │
│  ║      └────────────────────────────────────────────────────────────┘   ║  │
│  ║                                                                       ║  │
│  ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                             │
│  ╔═══════════════════════════════════════════════════════════════════════╗  │
│  ║                                                                       ║  │
│  ║  📱 PASO B: ¿Qué plataforma de wallet? (solo si canal = Wallet)      ║  │
│  ║                                                                       ║  │
│  ║     [🍎 Apple Wallet  ●]  [🤖 Google Wallet  ○]  [✓ Ambos  ○]       ║  │
│  ║                                                                       ║  │
│  ║     En ☕ Café Rewards:  890 tienen Apple  │  350 tienen Google       ║  │
│  ║                                                                       ║  │
│  ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                             │
│  ╔═══════════════════════════════════════════════════════════════════════╗  │
│  ║                                                                       ║  │
│  ║  👥 PASO C: ¿Qué segmento quieres alcanzar?                          ║  │
│  ║                                                                       ║  │
│  ║     Estos números ya filtran por: ☕ Café Rewards + Todas las wallets ║  │
│  ║                                                                       ║  │
│  ║     ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             ║  │
│  ║     │          │ │          │ │          │ │          │             ║  │
│  ║     │   👥     │ │   🔥     │ │   ⭐     │ │   ⚡     │             ║  │
│  ║     │  TODOS   │ │  MÁS     │ │   VIP    │ │  ACTIVOS │             ║  │
│  ║     │          │ │  ACTIVOS │ │          │ │          │             ║  │
│  ║     │  1,240   │ │   180    │ │   45     │ │   680    │             ║  │
│  ║     │ ● sel    │ │          │ │          │ │          │             ║  │
│  ║     └──────────┘ └──────────┘ └──────────┘ └──────────┘             ║  │
│  ║                                                                       ║  │
│  ║     ┌──────────┐ ┌──────────┐ ┌──────────────────────────────────┐  ║  │
│  ║     │          │ │          │ │                                  │  ║  │
│  ║     │   ⚠️     │ │   😴     │ │   ✏️ PERSONALIZADO...            │  ║  │
│  ║     │ EN RIESGO│ │INACTIVOS │ │   Seleccionar clientes uno     │  ║  │
│  ║     │          │ │          │ │   a uno de la lista            │  ║  │
│  ║     │   89     │ │   340    │ │                                  │  ║  │
│  ║     └──────────┘ └──────────┘ └──────────────────────────────────┘  ║  │
│  ║                                                                       ║  │
│  ║     ─────────────────────────────────────────────────────────────    ║  │
│  ║                                                                       ║  │
│  ║     📊 TOTAL DE CLIENTES QUE RECIBIRÁN ESTA CAMPAÑA:                 ║  │
│  ║                                                                       ║  │
│  ║     ┌────────────────────────────────────────────────────────────┐   ║  │
│  ║     │  👥  1,240  clientes                                       │   ║  │
│  ║     │  ☕  Café Rewards  │  📱  Todas las wallets  │  👥  Todos  │   ║  │
│  ║     └────────────────────────────────────────────────────────────┘   ║  │
│  ║                                                                       ║  │
│  ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                             │
│                      [← Volver]            [Continuar →]                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Comportamiento dinámico:**
- Cuando el usuario selecciona un programa, TODOS los contadores de segmento se actualizan para reflejar SOLO los clientes de ese programa
- Cuando el usuario cambia la plataforma de wallet, los contadores de segmento se actualizan de nuevo
- El resumen sticky (arriba) se actualiza en tiempo real
- "Más activos" = top 15% por actividad (visitas y gasto) en el programa seleccionado

---

## Pantalla 2b: Modal — Selección Manual de Clientes

Aparece cuando el usuario hace click en "PERSONALIZADO..."

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  ✏️ Seleccionar clientes manualmente                          ✕    │   │
│  │                                                                     │   │
│  │  Filtros:  ☕ Café Rewards  │  🍎 Apple Wallet                    │   │
│  │                                                                     │   │
│  │  [🔍 Buscar por nombre, email o teléfono...]    [🔎 Buscar]       │   │
│  │                                                                     │   │
│  │  ┌──┬─────────────────┬─────────────────┬──────────┬─────────┐     │   │
│  │  │☑️ │ Cliente         │ Email           │ Teléfono │Inscrito │     │   │
│  │  ├──┼─────────────────┼─────────────────┼──────────┼─────────┤     │   │
│  │  │☑️ │ Juan Pérez      │ juan@email.com  │ 0999...  │ hace 2d │     │   │
│  │  │☐ │ María García    │ maria@email.com │ 0988...  │ hace 5d │     │   │
│  │  │☑️ │ Carlos López    │ carlos@email.com│ 0977...  │ hace 1s │     │   │
│  │  │☐ │ Ana Torres      │ ana@email.com   │ 0966...  │ hace 1m │     │   │
│  │  │☐ │ Pedro Ruiz      │ pedro@email.com │ 0955...  │ hace 3d │     │   │
│  │  └──┴─────────────────┴─────────────────┴──────────┴─────────┘     │   │
│  │                                                                     │   │
│  │  ☑️ Seleccionar todos los visibles en esta página                   │   │
│  │                                                                     │   │
│  │  Mostrando 1-5 de 890    [← Anterior]  [1] [2] [3] ... [Siguiente→]│   │
│  │                                                                     │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │   │
│  │                                                                     │   │
│  │  👥 2 clientes seleccionados                                        │   │
│  │                                                                     │   │
│  │                           [Cancelar]   [✓ Confirmar selección]     │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Reglas del modal (implementadas):**
- Los filtros de programa y plataforma YA están aplicados (no se pueden cambiar aquí)
- Búsqueda por nombre, email o teléfono
- Checkbox por fila + checkbox global "seleccionar todos visibles"
- Paginación (25 por página)
- Al confirmar, se guardan los customer_ids y se cierra el modal
- En el paso 2 del wizard, la tarjeta "PERSONALIZADO" muestra "✓ N clientes seleccionados"
- También existe un modo **Exclusión** para quitar clientes específicos de una selección mayor

---

## Pantalla 3: Paso 3 — Contenido del Mensaje

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ❌  Cancelar                                                               │
│                                                                             │
│     ① ✓      ② ✓        ● Contenido                                       │
│                           ●─────────                                        │
│                                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  📌 RESUMEN:  📱 Wallet  │  ☕ Café Rewards  │  👥 1,240 clientes (Todos)   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                             │
│  Título de la notificación:                                   [😀 emoji]    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ☕ ¡Nuevo reward disponible!                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  45 / 200 caracteres                                                        │
│                                                                             │
│  Mensaje:                                                     [😀 emoji]    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Ven hoy a Café Rewards y recibe un café GRATIS por ser cliente      │   │
│  │ frecuente. ¡Te esperamos!                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  89 / 500 caracteres                                                        │
│                                                                             │
│  URL de acción (opcional):                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ https://loyallia.com/promo-verano                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  📱 VISTA PREVIA EN TIEMPO REAL                                     │    │
│  │                                                                     │    │
│  │    ┌─────────┐                                                      │    │
│  │    │  9:41   │                                                      │    │
│  │    │         │    ☕ Café Rewards                                    │    │
│  │    │         │    ────────────────────                               │    │
│  │    │         │    ☕ ¡Nuevo reward disponible!                       │    │
│  │    │         │    Ven hoy a Café Rewards y recibe...                 │    │
│  │    │         │    [Abrir]                                            │    │
│  │    │         │                                                      │    │
│  │    └─────────┘                                                      │    │
│  │      iPhone 14 Pro                                                   │    │
│  │                                                                     │    │
│  │    ┌─────────┐                                                      │    │
│  │    │         │    ☕ Café Rewards                                    │    │
│  │    │         │    ────────────────────                               │    │
│  │    │         │    ☕ ¡Nuevo reward disponible!                       │    │
│  │    │         │    Ven hoy a Café Rewards y recibe...                 │    │
│  │    │         │    [Abrir]                                            │    │
│  │    │         │                                                      │    │
│  │    └─────────┘                                                      │    │
│  │      Google Pixel                                                    │    │
│  │                                                                     │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│                      [← Volver]        [🕐 Programar] [🚀 Enviar ahora]     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Cambios implementados:**
- El preview muestra **ambas plataformas** lado a lado para Wallet
- Contador de caracteres visible
- Emoji picker accesible
- Campo "Nombre interno" adicional
- Selector de programación: inmediata o fecha/hora futura
- Los botones "Programar" y "Enviar ahora" están en el paso de contenido

---

## Pantalla 4: Revisar y Enviar (diseño original; fusionado en Paso 3)

> En la implementación actual el resumen y los botones de envío/programación
> forman parte del **Paso 3 — Contenido**. No hay un paso separado.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ❌  Cancelar                                                               │
│                                                                             │
│     ① ✓ Canal  ② ✓ Audiencia  ③ ✓ Contenido (Revisar y Enviar)            │
│                                         ●────────────────                   │
│                                                                             │
│                                                                             │
│                    ┌─────────────────────────────────────┐                  │
│                    │                                     │                  │
│                    │     📢 RESUMEN DE TU CAMPAÑA        │                  │
│                    │                                     │                  │
│                    │  ┌──────────┐  ┌──────────┐        │                  │
│                    │  │          │  │          │        │                  │
│                    │  │   📱     │  │   👥     │        │                  │
│                    │  │  Wallet  │  │  1,240   │        │                  │
│                    │  │          │  │ clientes │        │                  │
│                    │  └──────────┘  └──────────┘        │                  │
│                    │                                     │                  │
│                    │  ─────────────────────────────────  │                  │
│                    │                                     │                  │
│                    │  📌 Programa:     ☕ Café Rewards    │                  │
│                    │  📌 Plataforma:   Todas las wallets  │                  │
│                    │  📌 Segmento:     Todos los clientes │                  │
│                    │                                     │                  │
│                    │  ─────────────────────────────────  │                  │
│                    │                                     │                  │
│                    │  ✏️ Título:                        │                  │
│                    │     "☕ ¡Nuevo reward disponible!"   │                  │
│                    │                                     │                  │
│                    │  📝 Mensaje:                       │                  │
│                    │     "Ven hoy a Café Rewards..."     │                  │
│                    │                                     │                  │
│                    │  🔗 URL: https://loyallia.com/...   │                  │
│                    │                                     │                  │
│                    │  ─────────────────────────────────  │                  │
│                    │                                     │                  │
│                    │  📊 USO DEL PLAN:                  │                  │
│                    │                                     │                  │
│                    │  Wallet pushes este mes             │                  │
│                    │  ┌────────────────────────────┐    │                  │
│                    │  │ ████████░░░░░░░░░░░░░░░░░░ │    │                  │
│                    │  │ 12 usado / 500 límite      │    │                  │
│                    │  └────────────────────────────┘    │                  │
│                    │                                     │                  │
│                    │  ✅ Suficiente. Esta campaña       │                  │
│                    │     usará 1,240 de tus 500         │                  │
│                    │     disponibles.                   │                  │
│                    │                                     │                  │
│                    └─────────────────────────────────────┘                  │
│                                                                             │
│      [🕐 Programar para más tarde]        [🚀 ENVIAR AHORA]                 │
│                                                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Cambios:**
- Tarjeta central grande con todo el resumen visual
- Uso del plan con barra de progreso
- Validación: si la campaña excede el límite, muestra error en rojo
- Dos botones de acción claros: Programar vs Enviar ahora

---

## Diagrama de Flujo Completo

```
                    ┌───────────────┐
                    │  Home: Lista  │
                    │  de campañas  │
                    └───────┬───────┘
                            │ [+ Nueva]
                            ▼
                    ┌───────────────┐
                    │  PASO 1       │
                    │  Canal        │
                    │  [Email]      │
                    │  [Wallet] ●   │
                    │  [WhatsApp]   │
                    │  [SMS 🔒]     │
                    └───────┬───────┘
                            │ [Continuar]
                            ▼
                    ┌───────────────┐
                    │  PASO 2       │
                    │  Audiencia    │
                    │  ──────────── │
                    │  A. Programa  │────┐
                    │  B. Plataforma│    │
                    │  C. Segmento  │    │
                    │  [Personaliz.]│──┐ │
                    └───────┬───────┘  │ │
                            │          │ │
              [Continuar]   │      [Modal]│
                            │          │ │
                            ▼          │ │
                    ┌───────────────┐  │ │
                    │  PASO 3       │  │ │
                    │  Contenido    │  │ │
                    │  ──────────── │  │ │
                    │  Título       │  │ │
                    │  Mensaje      │  │ │
                    │  Preview      │  │ │
                    │  Programación │  │ │
                    │  [Programar]  │  │ │
                    │  [Enviar]     │  │ │
                    └───────┬───────┘  │ │
                            │          │ │
                            ▼          │ │
                    ┌───────────────┐  │ │
                    │  ✅ Éxito     │◄─┘ │
                    │  Volver a     │    │
                    │  la lista     │    │
                    └───────────────┘    │
                                         │
                                         ▼
                              ┌─────────────────┐
                              │  Modal:         │
                              │  Selección /    │
                              │  exclusión      │
                              │  manual de      │
                              │  clientes       │
                              │  (tabla + ☑️)   │
                              └─────────────────┘
```
