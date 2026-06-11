# 📐 Documento 3: Decisiones de UX + Especificaciones Técnicas

## Decisiones de diseño y sus justificaciones

---

### 1. ¿Por qué eliminar el dropdown "Device Type"?

**Problema actual:** El UI muestra dos controles que se solapan:
- `WalletPlatformSelector` (Apple/Google/Ambos) — líneas 392-398
- Dropdown `targetDeviceType` (iOS/Android/Ambos) — líneas 586-598

**Análisis:**
| Canal | Wallet Platform aplica | Device Type aplica |
|-------|----------------------|-------------------|
| Email | ❌ No | ❌ No |
| Wallet | ✅ Sí (Apple=iOS, Google=Android) | ❌ Redundante |
| WhatsApp | ❌ No | ❌ No |
| SMS | ❌ No | ❌ No |

**Decisión:** Eliminar `targetDeviceType` del frontend por completo. El backend ya filtra correctamente por `target_wallet_platform` en `apply_campaign_filters`. Si en el futuro se necesita filtrar por device type para push notifications genéricas, se agrega entonces.

**Backend impacto:** Ninguno. El campo `target_device_type` en `CampaignCreateIn` puede seguir existiendo con default `"both"` para backwards compatibility, pero el frontend no lo envía.

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

**Flujo de datos:**

```
Usuario selecciona "Café Rewards"
         │
         ▼
    Frontend llama:
    GET /api/v1/programs/{cafe_id}/members/count/
    └── Response: { total: 1240, apple: 890, google: 350 }
         │
         ▼
    Las tarjetas de segmento se actualizan:
    GET /api/v1/programs/{cafe_id}/members/count/?wallet_platform=both&segment=all
    GET /api/v1/programs/{cafe_id}/members/count/?wallet_platform=both&segment=vip
    GET /api/v1/programs/{cafe_id}/members/count/?wallet_platform=both&segment=active
    ... (una llamada por segmento, o una sola batch)
         │
         ▼
    Usuario cambia a "Apple Wallet"
         │
         ▼
    Se repiten las llamadas con wallet_platform=apple
    Los contadores se actualizan en tiempo real
```

**Optimización:** Se puede hacer UNA sola llamada batch:
```
GET /api/v1/programs/{id}/segment-counts/?wallet_platform=apple
Response: {
  "all": 890,
  "vip": 32,
  "active": 480,
  "at_risk": 89,
  "inactive": 210,
  "new": 120,
  "most_active": 45
}
```

**Debounce:** Las llamadas se hacen con debounce de 300ms para no saturar el backend mientras el usuario cambia opciones rápidamente.

---

### 4. ¿Qué es el preset "Más Activos"?

**Definición:** Top 15% de clientes del programa seleccionado ordenados por:
1. `total_visits` (descendente)
2. `total_spent` (descendente, tie-breaker)

**Implementación backend:**
```python
# En segment_api.py, nuevo segmento "most_active"
"most_active": {
    "name": "Clientes más activos",
    "description": "Top 15% de clientes por actividad",
    "filter": {"is_active": True},
    "extra": "most_active",
}

# En _apply_segment_filter:
elif extra == "most_active":
    count = base.count()
    if count == 0:
        return base.none()
    threshold = max(1, int(count * 0.15))
    return base.order_by("-total_visits", "-total_spent")[:threshold]
```

**Nota:** Este preset requiere que el cliente esté inscrito en el programa seleccionado. No aplica a "Todos los programas".

---

### 5. ¿Cómo funciona la selección manual de clientes?

**Flujo:**
1. Usuario elige Programa + Plataforma (ej: Café Rewards + Apple)
2. Hace click en "PERSONALIZADO..."
3. Se abre modal con la lista de 890 clientes (ya filtrados)
4. El usuario puede:
   - Buscar por nombre/email/teléfono
   - Seleccionar/desseleccionar con checkboxes
   - "Seleccionar todos visibles" (solo la página actual)
   - Paginar (25 por página)
5. Al confirmar, se guardan los `customer_ids` seleccionados
6. El wizard muestra "✓ 47 clientes seleccionados manualmente"

**Backend:** Se envía `target_customer_ids: [...]` en el payload de campaña. Esto tiene PRIORIDAD sobre segmento y programa en `apply_campaign_filters`.

---

### 6. ¿Qué pasa con "Todos los programas"?

**Comportamiento:**
- Es una opción adicional al grid de programas (checkbox debajo)
- Si se selecciona, NO se aplica filtro de programa
- Los segmentos muestran los contadores del tenant completo
- El preset "Más Activos" se deshabilita (no aplica sin programa específico)
- Wallet Platform sigue aplicando (filtra clientes que tengan AL MENOS un pass de esa plataforma en CUALQUIER programa)

---

### 7. ¿Por qué wizard de pantalla completa en lugar de modal?

**Alternativa considerada:** Modal tipo `ProgramMembersModal` (max-w-4xl)

**Problema:** En un modal no caben:
- Grid de programas (3+ tarjetas)
- Selector de plataforma
- Grid de segmentos (7+ tarjetas)
- Resumen dinámico
- Todo en una sola pantalla

**Decisión:** Wizard de pantalla completa (como `EditProgramModal.tsx`: `w-[96vw] h-[92vh]`). Esto da espacio suficiente para cada paso sin scroll excesivo.

**Excepción:** La selección manual de clientes SÍ es un modal porque es una tabla grande que necesita su propio espacio.

---

## Integración con Backend Existente

### Qué YA existe y NO necesita cambios:

| Feature | Estado | Archivo |
|---------|--------|---------|
| Modelo `CampaignRun` con `target_programs` | ✅ Listo | `campaigns.py` |
| Modelo `CampaignRun` con `target_wallet_platform` | ✅ Listo | `campaigns.py` |
| Modelo `CampaignRun` con `target_customers` | ✅ Listo | `campaigns.py` |
| API `createCampaign` con todos los campos | ✅ Listo | `campaigns.py` |
| Filtros `apply_campaign_filters` | ✅ Listo | `segment_api.py` |
| Celery tasks por canal | ✅ Listo | `tasks/campaigns.py` |
| Segmentos builtin (all, vip, active, etc.) | ✅ Listo | `segment_api.py` |
| Endpoint de miembros de programa | ✅ Listo | `programsApi.members()` |

### Qué necesita EXTENSIÓN:

| Feature | Cambio | Archivo |
|---------|--------|---------|
| Miembros filtrados por wallet platform | Agregar query param | `backend/apps/cards/api.py` |
| Conteo por segmento dentro de programa | Nuevo endpoint | `backend/apps/cards/api.py` |
| Segmento "most_active" | Agregar a `_BUILTIN_SEGMENTS` | `backend/apps/customers/segment_api.py` |

### Qué NO se usa más:

| Feature | Razón |
|---------|-------|
| Dropdown `targetDeviceType` | Redundante con Wallet Platform |
| Formulario inline en page.tsx | Reemplazado por wizard |
| Segment cards en grid actual | Reemplazados por wizard paso 2 |
| Program cards en grid actual | Reemplazados por wizard paso 2 |

---

## Checklist de implementación (Fase 2)

### Backend
- [ ] Extender `programs.members` endpoint con `wallet_platform` filter
- [ ] Crear endpoint `programs/{id}/segment-counts/` para contadores dinámicos
- [ ] Agregar segmento `most_active` a `_BUILTIN_SEGMENTS`
- [ ] Tests para filtros combinados

### Frontend
- [ ] Crear componente `CampaignWizard` (contenedor de 4 pasos)
- [ ] Crear componente `StepIndicator` (barra de progreso 1-2-3-4)
- [ ] Crear componente `ChannelSelector` (Paso 1)
- [ ] Crear componente `AudienceSelector` (Paso 2: programa + plataforma + segmento)
- [ ] Crear componente `CustomerPickerModal` (selección manual)
- [ ] Crear componente `MessageComposer` (Paso 3: título, mensaje, preview)
- [ ] Crear componente `CampaignReview` (Paso 4: resumen y envío)
- [ ] Reescribir `campaigns/page.tsx` para usar wizard
- [ ] Extender `api.ts` con nuevos helpers
- [ ] Agregar traducciones i18n

### Tests
- [ ] E2E: Flujo completo wizard
- [ ] E2E: Selección manual de clientes
- [ ] E2E: Validación de límites de plan
