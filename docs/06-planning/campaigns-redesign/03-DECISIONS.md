# 📐 Documento 3: Decisiones de UX + Especificaciones Técnicas

> ⚠️ **Estado del documento (2026-06-11):** Las decisiones de UX reflejan el
> diseño adoptado. Algunos detalles técnicos y endpoints han cambiado en la
> implementación real; se han corregido más abajo. Verificar siempre contra
> `backend/apps/notifications/models/campaigns.py`,
> `backend/apps/notifications/api/campaigns.py`,
> `backend/apps/cards/api.py` y
> `frontend/src/components/campaigns/CampaignWizard.tsx`.

## Decisiones de diseño y sus justificaciones

---

### 1. ¿Por qué eliminar el dropdown "Device Type"?

**Problema actual (UI histórico):** El UI mostraba dos controles que se solapan:
- `WalletPlatformSelector` (Apple/Google/Ambos)
- Dropdown `targetDeviceType` (iOS/Android/Ambos)

**Análisis:**
| Canal | Wallet Platform aplica | Device Type aplica |
|-------|----------------------|-------------------|
| Email | ❌ No | ❌ No |
| Wallet | ✅ Sí (Apple=iOS, Google=Android) | ❌ Redundante |
| WhatsApp | ❌ No | ❌ No |
| SMS | ❌ No | ❌ No |

**Decisión:** Eliminar `targetDeviceType` del frontend por completo. El backend ya filtra correctamente por `target_wallet_platform` en `apply_campaign_filters`. Si en el futuro se necesita filtrar por device type para push notifications genéricas, se agrega entonces.

**Backend impacto:** Ninguno. El campo `target_device_type` en `CampaignCreateIn` sigue existiendo con default `"both"` para backwards compatibility; el frontend lo envía siempre como `"both"` y el usuario no lo ve ni lo controla.

---

### 2. ¿Por qué Programa va ANTES que Segmento?

**Problema actual:** Segmentos y programas son tarjetas idénticas en la misma pantalla. El usuario no entiende la relación.

**Lógica de negocio real:**
```
Universo total de clientes
    │
    ├── Programa A (1,240 clientes)  ← PRIMERO eliges el universo
    │       │
    │       ├── Segmento "Todos" (1,240)  ← LUEGO filtras dentro
    │       ├── Segmento "VIP" (45)
    │       ├── Segmento "Activos" (680)
    │       └── ...
    │
    └── Programa B (89 clientes)
            │
            ├── Segmento "Todos" (89)
            ├── Segmento "VIP" (12)
            └── ...
```

**Decisión:** El wizard fuerza el orden: Programa → Plataforma → Segmento. Cada paso filtra el paso anterior.

**UX benefit:** Los contadores de segmento son DINÁMICOS. Si el usuario elige "Café Rewards", la tarjeta "VIP" muestra 45 (no el total de VIPs del tenant). Si luego filtra por "Apple Wallet", "VIP" muestra 32. El usuario SIEMPRE sabe exactamente cuántos clientes recibirán la campaña.

---

### 3. ¿Cómo funcionan los contadores dinámicos?

**Flujo de datos real:**

```
Usuario selecciona "Café Rewards"
         │
         ▼
    Frontend llama:
    GET /api/v1/programs/{cafe_id}/member-count/
    └── Response: { count: <total>, active_count: <active> }
         │
         ▼
    Las tarjetas de segmento se actualizan con UNA sola llamada:
    GET /api/v1/programs/{cafe_id}/segment-counts/?wallet_platform=apple
    └── Response: {
          "counts": {
            "all": 890,
            "vip": 32,
            "active": 480,
            "at_risk": 89,
            "inactive": 210,
            "new": 120,
            "most_active": 45
          }
        }
         │
         ▼
    Usuario cambia a "Apple Wallet"
         │
         ▼
    Se repite la llamada con wallet_platform=apple
    Los contadores se actualizan en tiempo real
```

> Nota: Existe un desfase documentado entre fuentes de conteo:
>
> - Las **tarjetas de programa** usan `GET /api/v1/programs/{id}/member-count/`,
>   el cual devuelve `{ count, active_count }` y **no** incluye campos
>   `apple_wallet` ni `google_wallet`. Por ello, el desglose por plataforma en
>   esas tarjetas mostrará 0.
> - Las **tarjetas de segmento** usan `GET /api/v1/programs/{id}/segment-counts/?wallet_platform=...`,
>   que sí filtra y devuelve conteos por plataforma.
>
> Los desgloses por plataforma precisos se obtienen únicamente de `segment-counts`.

**Debounce:** Las llamadas se hacen con debounce de 300ms para no saturar el backend mientras el usuario cambia opciones rápidamente.

---

### 4. ¿Qué es el preset "Más Activos"?

**Definición:** Top 15% de clientes del programa seleccionado ordenados por:
1. `total_visits` (descendente)
2. `total_spent` (descendente, tie-breaker)

**Implementación backend (ya existe):**
```python
# backend/apps/customers/segment_api.py
_BUILTIN_SEGMENTS = {
    ...
    "most_active": {
        "name": "Más activos",
        "description": "Top 15% de clientes por actividad (visitas y gasto)",
        "filter": {"is_active": True},
        "extra": "most_active",
    },
}

# En _apply_segment_filter:
elif extra == "most_active":
    count = base.count()
    if count == 0:
        return base.none()
    threshold = max(1, int(count * MOST_ACTIVE_PERCENTILE))
    return base.order_by("-total_visits", "-total_spent")[:threshold]
```

**Nota:** Este preset ordena a los clientes por actividad y toma el top 15%. Cuando se elige un programa específico, el cálculo se hace sobre los inscritos de ese programa. Cuando se elige "Todos los programas", el cálculo se hace sobre todo el tenant, por lo que el preset sigue disponible.

---

### 5. ¿Cómo funciona la selección manual de clientes?

**Flujo:**
1. Usuario elige Programa + Plataforma (ej: Café Rewards + Apple)
2. Hace click en "PERSONALIZADO..."
3. Se abre modal con la lista de clientes (ya filtrados)
4. El usuario puede:
   - Buscar por nombre/email/teléfono
   - Seleccionar/desseleccionar con checkboxes
   - "Seleccionar todos visibles" (solo la página actual)
   - Paginar (25 por página)
5. Al confirmar, se guardan los `customer_ids` seleccionados
6. El wizard muestra "✓ N clientes seleccionados manualmente"

**Exclusión manual:** También es posible abrir el modal en modo "Exclusión" para
quitar clientes específicos de un segmento/programa mayor. Los IDs excluidos se
restan del conteo final en el frontend.

**Backend:** Se envía `target_customer_ids: [...]` en el payload de campaña. Esto
tiene PRIORIDAD sobre segmento y programa en `apply_campaign_filters`.

---

### 6. ¿Qué pasa con "Todos los programas"?

**Comportamiento:**
- Es una opción adicional al grid de programas (checkbox debajo)
- Si se selecciona, NO se aplica filtro de programa
- Los segmentos muestran los contadores del tenant completo
- El preset "Más Activos" sigue disponible: calcula el top 15% de actividad sobre todo el tenant
- Wallet Platform sigue aplicando (filtra clientes que tengan AL MENOS un pass de esa plataforma en CUALQUIER programa)

---

### 7. ¿Por qué wizard en modal grande en lugar de formulario inline?

**Alternativa considerada:** Modal tipo `ProgramMembersModal` (max-w-4xl)

**Problema:** En un modal pequeño no caben:
- Grid de programas (3+ tarjetas)
- Selector de plataforma
- Grid de segmentos (7+ tarjetas)
- Resumen dinámico
- Todo en una sola pantalla

**Decisión:** Wizard en modal de pantalla completa (`w-[96vw] h-[92vh]`) con 3 pasos:
1. **Canal**
2. **Audiencia** (programa → plataforma → segmento)
3. **Contenido** (título, mensaje, preview, programación y envío)

Esto da espacio suficiente para cada paso sin scroll excesivo.

**Excepción:** La selección manual de clientes SÍ es un modal secundario porque es
una tabla grande que necesita su propio espacio.

---

## Integración con Backend Existente

### Qué YA existe y NO necesita cambios:

| Feature | Estado | Archivo |
|---------|--------|---------|
| Modelo `CampaignRun` con `target_programs` | ✅ Listo | `backend/apps/notifications/models/campaigns.py` |
| Modelo `CampaignRun` con `target_wallet_platforms` | ✅ Listo | `backend/apps/notifications/models/campaigns.py` |
| Modelo `CampaignRun` con `target_customers` | ✅ Listo | `backend/apps/notifications/models/campaigns.py` |
| API `createCampaign` con todos los campos | ✅ Listo | `backend/apps/notifications/api/campaigns.py` |
| Filtros `apply_campaign_filters` | ✅ Listo | `backend/apps/customers/segment_api.py` |
| Celery tasks por canal | ✅ Listo | `backend/apps/notifications/tasks/campaigns.py` |
| Segmentos builtin (all, vip, active, most_active, etc.) | ✅ Listo | `backend/apps/customers/segment_api.py` |
| Endpoint de miembros de programa | ✅ Listo | `/api/v1/programs/{id}/members/` |
| Endpoint de conteo de segmentos por programa | ✅ Listo | `/api/v1/programs/{id}/segment-counts/` |

### Qué necesita EXTENSIÓN / corrección:

| Feature | Cambio | Archivo |
|---------|--------|---------|
| Respuesta de `member-count` | El endpoint devuelve `{count, active_count}`; carece de campos `apple_wallet`/`google_wallet` | `backend/apps/cards/api.py` |
| Mapeo frontend del desglose por plataforma | El frontend espera `{total, apple_wallet, google_wallet}`; debe ajustar su consumo de `member-count` o usar `segment-counts` | `frontend/src/components/campaigns/AudienceSelector.tsx` |
| Fuente de tarjetas de programa | Las tarjetas de programa usan `member-count`, por lo que el desglose por plataforma muestra 0 | `frontend/src/components/campaigns/AudienceSelector.tsx` |
| Filtro `wallet_platform` en miembros de programa | Existe como query param en `AudienceSelector` pero `program_members` no lo aplica | `backend/apps/cards/services.py` |

### Qué NO se usa más:

| Feature | Razón |
|---------|-------|
| Dropdown `targetDeviceType` | Redundante con Wallet Platform; el frontend envía `"both"` por compatibilidad |
| Formulario inline en page.tsx | Reemplazado por `CampaignWizard` |
| Segment cards en grid actual | Reemplazados por wizard paso 2 |
| Program cards en grid actual | Reemplazados por wizard paso 2 |

---

## Checklist de implementación (Fase 2)

### Backend
- [x] Crear endpoint `programs/{id}/segment-counts/` para contadores dinámicos
- [x] Agregar segmento `most_active` a `_BUILTIN_SEGMENTS`
- [ ] Extender `programs.members` endpoint con `wallet_platform` filter (parcial: usado en frontend pero no filtrado en backend)
- [ ] Corregir desfase: `member-count` devuelve `{count, active_count}`; frontend espera `{total, apple_wallet, google_wallet}`
- [ ] Tests para filtros combinados

### Frontend
- [x] Crear componente `CampaignWizard` (contenedor de 3 pasos)
- [x] Crear componente `CampaignWizardStepIndicator` (barra de progreso 1-2-3)
- [x] Crear componente `ChannelSelector` (Paso 1)
- [x] Crear componente `AudienceSelector` (Paso 2: programa + plataforma + segmento + exclusión manual)
- [x] Crear componente `CustomerPicker` (selección/exclusión manual)
- [x] Crear componente `MessageComposer` (Paso 3: título, mensaje, preview, programación y envío)
- [x] Reescribir `campaigns/page.tsx` para usar wizard
- [x] Extender `api.ts` con nuevos helpers
- [x] Agregar traducciones i18n
- [ ] Componente `CampaignReview` separado (el resumen se muestra en `MessageComposer` y en la barra sticky)

### Tests
- [ ] E2E: Flujo completo wizard
- [ ] E2E: Selección manual de clientes
- [ ] E2E: Validación de límites de plan
