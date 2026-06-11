# 📋 Documento 1: Análisis de Problemas + Propuesta de Arquitectura

> ⚠️ **Estado del documento (2026-06-11):** Este análisis describe la UI **histórica**
> de campañas (formulario inline en `frontend/src/app/(dashboard)/campaigns/page.tsx`).
> La implementación actual ya utiliza el asistente (`CampaignWizard`) con los pasos
> **Canal → Audiencia → Contenido** (3 pasos). Algunos problemas mencionados aquí
> (formulario saturado, tarjetas idénticas, etc.) ya fueron resueltos; otros detalles
> técnicos (nombres de endpoints, campos del modelo) deben verificarse contra el
> código real. Véase `frontend/src/components/campaigns/CampaignWizard.tsx`.

## Problemas identificados en el UI histórico de Campañas

Análisis basado en el código histórico de `frontend/src/app/(dashboard)/campaigns/page.tsx` (el archivo actual solo monta `CampaignWizard`).

---

### 🔴 Problema 1: "No programs available" / Programas vacíos

**Ubicación:** `page.tsx` (UI histórico)

**Qué pasa:** El grid de programas puede mostrar `No programs available` o tarjetas vacías porque:
- Los programas se cargan en un `useEffect` separado pero no hay estado de carga
- No hay manejo de error visual si la API falla
- Las tarjetas de programa no muestran conteo de miembros, solo el nombre

**Impacto:** El usuario no sabe si sus programas están cargando, si fallaron, o si realmente no tiene programas.

```
[UI ACTUAL — Filtro de Programas]
┌──────────────────────────────────────────┐
│ Filtrar por programa                     │
│ [? tooltip]                              │
│                                          │
│  ┌────────┐  ┌────────┐  ┌────────┐     │
│  │ Café   │  │ Pizza  │  │ Gym    │     │
│  │        │  │        │  │        │     │
│  │ ✓ sel  │  │        │  │        │     │
│  └────────┘  └────────┘  └────────┘     │
│                                          │
│  (sin conteo, sin contexto de uso)       │
└──────────────────────────────────────────┘
```

---

### 🔴 Problema 2: Device Type duplicado / Confusión con Wallet Platform

**Ubicación:** `page.tsx` (UI histórico: WalletPlatformSelector y Device Type dropdown)

**Qué pasa:**
- Cuando el canal es **Wallet**, aparece un selector "Wallet Platform" (Apple/Google/Ambos)
- MÁS ABAJO aparece un dropdown "Device Type" (iOS/Android/Ambos)
- Son conceptos que se solapan: Apple Wallet ≈ iOS, Google Wallet ≈ Android
- El usuario no entiende por qué necesita elegir dos veces lo "mismo"

**Impacto:** Confusión. El usuario no sabe si debe filtrar por wallet platform, device type, o ambos. Aumenta la carga cognitiva innecesariamente.

```
[UI ACTUAL — Sección de Wallet]
┌──────────────────────────────────────────┐
│ Plataforma de Wallet                     │
│ [Apple] [Google] [Ambos]  ← selector 1   │
│                                          │
│ ...más contenido...                      │
│                                          │
│ ───────────────────────────────────────  │
│                                          │
│ Tipo de dispositivo                      │
│ [▼ iOS]  ← dropdown 2  ← ¿POR QUÉ?      │
│ (iOS implica Apple Wallet ya)            │
└──────────────────────────────────────────┘
```

**Solución propuesta:** Eliminar "Device Type" cuando el canal es Wallet. Mantener solo "Wallet Platform". Para otros canales (Email, SMS, WhatsApp) el device type no aplica.

---

### 🔴 Problema 3: Formulario inline saturado (~15 controles simultáneos)

**Ubicación:** `page.tsx` (UI histórico: formulario inline completo)

**Qué pasa:** Todo el flujo de creación está en una sola pantalla:
1. Selector de tipo de campaña (4 botones grandes)
2. Wallet Platform (si aplica)
3. Título + emoji picker
4. Imagen (si email)
5. Mensaje + emoji picker
6. Preview de notificación
7. Segmentos (6 tarjetas)
8. Resumen de segmento seleccionado
9. Programas (N tarjetas)
10. Device Type dropdown
11. Botones Cancelar / Enviar

**Impacto:** El usuario se pierde. No hay flujo narrativo. Es como ver un formulario de impuestos.

```
[UI ACTUAL — Todo apilado verticalmente]
┌──────────────────────────────────────────┐
│ ╔══════════════════════════════════════╗ │
│ ║ Nueva Campaña                       ║ │
│ ╠══════════════════════════════════════╣ │
│ ║ [Email] [Wallet] [WhatsApp] [SMS]   ║ │
│ ║                                     ║ │
│ ║ Wallet Platform: [A] [G] [Both]     ║ │
│ ║                                     ║ │
│ ║ Título: [________________] [😀]     ║ │
│ ║                                     ║ │
│ ║ Mensaje: [                          ║ │
│ ║           ____________________]     ║ │
│ ║                                     ║ │
│ ║ ┌────────────┐ PREVIEW              ║ │
│ ║ │ 📱 iPhone   │ aquí               ║ │
│ ║ └────────────┘                     ║ │
│ ║                                     ║ │
│ ║ Segmentos: 6 tarjetas en grid       ║ │
│ ║ ┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐   ║ │
│ ║ │All││VIP││Act││Rsk││Ina││New│   ║ │
│ ║ └───┘└───┘└───┘└───┘└───┘└───┘   ║ │
│ ║                                     ║ │
│ ║ 📤 Enviando a 1,240 clientes...    ║ │
│ ║                                     ║ │
│ ║ Filtrar por programa:               ║ │
│ ║ ┌────┐┌────┐┌────┐┌────┐          ║ │
│ ║ │Café││Pizz││ Gym││ etc│          ║ │
│ ║ └────┘└────┘└────┘└────┘          ║ │
│ ║                                     ║ │
│ ║ Tipo de dispositivo: [▼ iOS]       ║ │
│ ║                                     ║ │
│ ║ [Cancelar]  [Enviar campaña]       ║ │
│ ╚══════════════════════════════════════╝ │
└──────────────────────────────────────────┘
```

---

### 🔴 Problema 4: Segmentos y Programas usan componentes idénticos

**Ubicación:** `page.tsx` (UI histórico)

**Qué pasa:**
- Las tarjetas de segmento (`all`, `vip`, `active`...) y las tarjetas de programa tienen el EXACTO MISMO diseño visual
- Mismo border-2, mismos colores de selección, mismo checkmark
- El usuario no distingue visualmente que UNO es un segmento de clientes y EL OTRO es un filtro de programa
- No se entiende si se acumulan, si son excluyentes, o qué combinación resulta

**Impacto:** Confusión sobre la lógica de targeting. ¿Si elijo "VIP" y "Café Rewards", es la intersección? ¿La unión? El UI no lo explica.

---

### 🔴 Problema 5: No hay flujo "Programa primero, luego audiencia"

**Qué pasa:** Todo se muestra simultáneamente. El usuario no puede:
1. Primero elegir un programa
2. Ver cuántos clientes tiene ese programa
3. Luego decidir a qué segmento de ESE PROGRAMA quiere enviar

**Impacto:** El usuario toma decisiones sin contexto. Elige un segmento sin saber si hay gente de ese segmento en su programa.

---

## 🏗️ Propuesta de Arquitectura: Wizard de Pantalla Completa

Convertir la creación de campañas en un **wizard progresivo** (como `EditProgramModal.tsx`),
con pasos claros. La implementación actual (`CampaignWizard.tsx`) usa **3 pasos**:

```
┌─────────────────────────────────────────────────────────────────┐
│  ❌  Cancelar                                                   │
│                                                                 │
│    ① Canal ●──────  ② Audiencia ○──────  ③ Contenido ○        │
│    (activo)         (bloqueado)         (bloqueado)             │
│                                                                 │
│  ╔═══════════════════════════════════════════════════════════╗  │
│  ║                                                           ║  │
│  ║   CONTENIDO DEL PASO ACTIVO                               ║  │
│  ║                                                           ║  │
│  ║   [Email] [Wallet] [WhatsApp] [SMS]                       ║  │
│  ║                                                           ║  │
│  ╚═══════════════════════════════════════════════════════════╝  │
│                                                                 │
│              [← Volver]            [Continuar →]                │
└─────────────────────────────────────────────────────────────────┘
```

### Reglas del wizard implementado:
1. **Canal primero** — Determina qué opciones aparecen después
2. **Audiencia en segundo** — Programa → Plataforma (solo Wallet) → Segmento (jerarquía lógica)
3. **Contenido en tercero** — Composición del mensaje, preview y programación

> Nota: El paso 4 "Revisar" del diseño original se fusionó con el paso 3; el envío
> inmediato o programado se realiza desde el paso de contenido.

### Resumen sticky en cada paso:
Siempre visible arriba, mostrando las decisiones ya tomadas:
```
📌 Canal: Wallet  │  👥 Audiencia: 1,240 clientes  │  Programa: Café Rewards
```

---

## Comparativa rápida

| Aspecto | UI histórica | UI actual (CampaignWizard) |
|---------|-----------|--------------|
| Controles visibles | ~15 simultáneos | 3-5 por paso |
| Jerarquía | Plana (todo al mismo nivel) | Progresiva (pasos) |
| Contexto de programa | Desconectado del segmento | Programa primero, luego segmento |
| Contadores | Solo por segmento (sin filtrar) | Dinámicos (programa + plataforma + segmento) |
| Wallet vs Device | Dos controles duplicados | Solo Wallet Platform |
| Selección manual | No existía | Modal con tabla y checkboxes |
| Exclusiones manuales | No existía | Soportado en AudienceSelector |
| Preview | Solo Wallet | Wallet + Email (según canal) |
