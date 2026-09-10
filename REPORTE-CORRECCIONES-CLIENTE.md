# REPORTE DE CORRECCIONES — EDICION LOYALLIA

**Fecha:** 2026-09-10
**Documento del cliente:** EDICION LOYALLIA.docx
**Estado:** Todos los items implementados

---

## 1. PROGRAMAS DE FIDELIZACIÓN — Menú Principal

| # | Requerimiento del Cliente | Estado | Archivo(s) Modificado(s) | Detalle |
|---|---------------------------|--------|--------------------------|---------|
| 1.1 | Donde dice DESCRIPCIÓN, poner: "Crea, administra y consulta tus programas de fidelización" (en cursiva) | ✅ Completado | `es.json:209`, `en.json:209`, `programs/page.tsx:239` | Texto actualizado en ambos idiomas + clase `italic` agregada al párrafo |
| 1.2 | Donde dice "Crea tu primer programa de fidelización", cambiar a: "Crea tu primer programa y empieza a fidelizar a tus clientes" | ✅ Completado | `es.json:246`, `en.json:246` | Texto actualizado en ambos idiomas |

---

## 2. BUG — "Algo salió mal" al dar clic en Ver o Editar

| # | Requerimiento del Cliente | Estado | Archivo(s) Modificado(s) | Detalle |
|---|---------------------------|--------|--------------------------|---------|
| 2.1 | No funciona Ver ni editar, aparece "Algo salió mal" | ✅ Completado | `programs/[id]/page.tsx` | **Causa raíz:** El botón Editar enlaza a `?tab=edit` pero la página nunca leía ese parámetro. Además, `Promise.all` con `stats()` fallaba y bloqueaba toda la carga. **Fix:** (1) Importado `useSearchParams`, (2) se lee `?tab=edit` y se ejecuta `startEdit()` automáticamente, (3) `stats()` se ejecuta en background sin bloquear la carga del programa |
| 2.2 | Handler de publicar duplicado 3 veces | ✅ Completado | `programs/[id]/page.tsx` | Extraído a función compartida `handlePublish()` usando `useCallback` |

---

## 3. TARJETA DE SELLOS — Configuración (Seleccionar Idioma + Textos)

| # | Requerimiento del Cliente | Estado | Archivo(s) Modificado(s) | Detalle |
|---|---------------------------|--------|--------------------------|---------|
| 3.1 | Textos en español e inglés rotos (MachTranslate) — arreglar todos | ✅ Completado | `es.json`, `en.json` (~50 keys) | Todas las keys `stampConfig.*` y `formBuilder.*` corregidas con valores reales en español e inglés |
| 3.2 | TIPO DE SELLO — tooltip: "Elige la forma en que tus clientes acumularán sellos..." | ✅ Completado | `es.json`, `en.json` | `stampTypeTooltip` actualizado |
| 3.3 | Modo visita — tooltip: "Cada vez que un cliente visite tu negocio..." | ✅ Completado | `es.json`, `en.json` | `visitTooltip` actualizado |
| 3.4 | Modo visita — ejemplo: "1 visita = 1 sello" | ✅ Completado | `es.json`, `en.json` | `visitExample` actualizado |
| 3.5 | Modo consumo — renombrar a "Modo otorgar sello por consumo" | ✅ Completado | `es.json`, `en.json` | `consumptionMode` actualizado |
| 3.6 | Modo consumo — tooltip: "Define cuánto debe gastar un cliente para recibir 1 sello" | ✅ Completado | `es.json`, `en.json` | `consumptionTooltip` actualizado |
| 3.7 | Modo consumo — ejemplo: "Por cada $5 de compra, el cliente recibe 1 sello" | ✅ Completado | `es.json`, `en.json` | `consumptionExample` actualizado |

---

## 4. TARJETA DE SELLOS — Sección "Cómo ganan sellos tus clientes"

| # | Requerimiento del Cliente | Estado | Archivo(s) Modificado(s) | Detalle |
|---|---------------------------|--------|--------------------------|---------|
| 4.1 | Renombrar "SELLOS REQUERIDOS" a "CÓMO GANAN SELLOS TUS CLIENTES" | ✅ Completado | `es.json`, `en.json` | `stampsRequired` actualizado |
| 4.2 | Tooltip: "Configura cuántos sellos obtiene el cliente por 1 visita" | ✅ Completado | `es.json`, `en.json` | `stampsRequiredTooltip` actualizado |
| 4.3 | Subtítulo en cursiva: "Ejemplo: 5 sellos por cada visita" | ✅ Completado | `es.json`, `en.json`, `StampConfig.tsx` | Nueva key `stampsRequiredSubtitle` + `<p className="italic">` agregado |
| 4.4 | Modo visita: "1 visita" fijo a la izquierda, número de sellos editable a la derecha | ✅ Completado | `StampConfig.tsx` | Layout de dos columnas implementado con "1 visita" fijo + input editable |
| 4.5 | Modo consumo: "$" + monto editable a la izquierda, "=" + número de sellos (default 1) a la derecha | ✅ Completado | `StampConfig.tsx` | Layout de dos columnas implementado con `$` + input + `=` + input |
| 4.6 | Subtítulo para consumo: "Ejemplo: 1 sello por cada $10 de consumo" | ✅ Completado | `es.json`, `en.json`, `StampConfig.tsx` | Nueva key `consumptionSubtitle` + `<p className="italic">` agregado |

---

## 5. TARJETA DE SELLOS — Sección Recompensa

| # | Requerimiento del Cliente | Estado | Archivo(s) Modificado(s) | Detalle |
|---|---------------------------|--------|--------------------------|---------|
| 5.1 | Título: "¿Qué recompensa recibirá el cliente?" | ✅ Completado | `es.json`, `en.json` | `rewardDescription` actualizado |
| 5.2 | Tooltip: "Define el beneficio que recibirá el cliente al completar todos los sellos" | ✅ Completado | `es.json`, `en.json` | `rewardDescriptionTooltip` actualizado |
| 5.3 | Placeholder: "Ejemplo: Café gratis, hamburguesa gratis, $10 de descuento" | ✅ Completado | `es.json`, `en.json` | `rewardPlaceholder` actualizado |
| 5.4 | Tipo de recompensa — 3 opciones: Descuento en $, Descuento %, Recompensa | ✅ Completado | `es.json`, `en.json`, `StampConfig.tsx` | Nuevas keys `rewardType`, `rewardTypeDollar`, `rewardTypePercent`, `rewardTypeReward` + selector de 3 opciones implementado con inputs condicionales |

---

## 6. FORMULARIO DE EMISIÓN PARA CLIENTES

| # | Requerimiento del Cliente | Estado | Archivo(s) Modificado(s) | Detalle |
|---|---------------------------|--------|--------------------------|---------|
| 6.1 | Título: "Formulario de emisión para clientes" | ✅ Completado | `es.json`, `en.json` | `formBuilder.title` — estaba vacío, ahora tiene valor |
| 6.2 | Tooltip: "Define los datos que quieres solicitar al cliente antes de añadir su tarjeta" | ✅ Completado | `es.json`, `en.json` | `formBuilder.tooltip` — estaba vacío, ahora tiene valor |
| 6.3 | Tipos de campo: Texto, Correo electrónico, Teléfono, Fecha, Cédula | ✅ Completado | `FormBuilder.tsx` | Eliminados `select` y `number`, agregado `cedula`. Keys `fieldTypes.*` creadas |
| 6.4 | Eliminar campo "select" y su textarea de opciones | ✅ Completado | `FormBuilder.tsx` | Bloque de opciones eliminado |

---

## 7. PREVIEW DE WALLET — Correcciones CSS

| # | Requerimiento del Cliente | Estado | Archivo(s) Modificado(s) | Detalle |
|---|---------------------------|--------|--------------------------|---------|
| 7.1 | Colores del usuario no se reflejan en el hover preview (hardcoded #1a1a2e) | ✅ Completado | `WalletPreviewContent.tsx` | Ahora lee `walletDesign.colors.background` y `colors.foreground` en vez de valores hardcoded |
| 7.2 | Radio de tarjeta inconsistente (14px vs 16px del studio) | ✅ Completado | `WalletPreviewContent.tsx` | Cambiado de `rounded-[14px]` a `rounded-2xl` para consistencia |
| 7.3 | Logo dimensiones inconsistentes (28px cuadrado vs 60×22px del studio) | ✅ Completado | `WalletPreviewContent.tsx` | Cambiado de `w-7 h-7 rounded-md` a `w-[60px] h-[22px] rounded` |

---

## 8. TEXTOS HARDCODED EN ESPAÑOL → i18n

| # | Ubicación | Texto Hardcoded | Reemplazo i18n |
|---|-----------|-----------------|----------------|
| 8.1 | `programs/[id]/page.tsx:479` | `'Plantilla sin nombre'` | `t('wallet.studio.untitledTemplate')` |
| 8.2 | `programs/[id]/page.tsx:487` | `'Plantilla guardada correctamente'` | `t('wallet.studio.saveTemplateSuccess')` |
| 8.3 | `programs/[id]/page.tsx:489` | `'Error al guardar plantilla'` | `t('wallet.studio.saveTemplateError')` |
| 8.4 | `programs/new/page.tsx:291` | `defaultValue: 'Nombre y descripción'` | `t('programs.new.step2.nameDescTitle')` |
| 8.5 | `programs/new/page.tsx:397` | `'Plantilla sin nombre'` | `t('wallet.studio.untitledTemplate')` |
| 8.6 | `programs/new/page.tsx:405` | `'Plantilla guardada correctamente'` | `t('wallet.studio.saveTemplateSuccess')` |
| 8.7 | `programs/new/page.tsx:407` | `'Error al guardar plantilla'` | `t('wallet.studio.saveTemplateError')` |

---

## 9. KEYS i18N NUEVAS AGREGADAS

| Key | es | en |
|-----|----|----|
| `stampConfig.stampsRequiredSubtitle` | Ejemplo: 5 sellos por cada visita | Example: 5 stamps per visit |
| `stampConfig.consumptionSubtitle` | Ejemplo: 1 sello por cada $10 de consumo | Example: 1 stamp per $10 spent |
| `stampConfig.rewardType` | Tipo de recompensa | Reward type |
| `stampConfig.rewardTypeDollar` | Descuento en dólares ($) | Dollar discount ($) |
| `stampConfig.rewardTypePercent` | Descuento porcentual (%) | Percentage discount (%) |
| `stampConfig.rewardTypeReward` | Recompensa que recibirá el cliente | Reward the customer will receive |
| `stampConfig.visitLabel` | visita | visit |
| `stampConfig.stampsLabel` | sellos | stamps |
| `formBuilder.fieldTypes.text` | Texto | Text |
| `formBuilder.fieldTypes.email` | Correo electrónico | Email |
| `formBuilder.fieldTypes.tel` | Teléfono | Phone |
| `formBuilder.fieldTypes.date` | Fecha | Date |
| `formBuilder.fieldTypes.cedula` | Cédula | ID number |
| `wallet.studio.untitledTemplate` | Plantilla sin nombre | Untitled template |
| `wallet.studio.saveTemplateSuccess` | Plantilla guardada correctamente | Template saved successfully |
| `wallet.studio.saveTemplateError` | Error al guardar plantilla | Error saving template |

---

## RESUMEN DE ARCHIVOS MODIFICADOS

| Archivo | Cambios |
|---------|---------|
| `frontend/src/lib/i18n/locales/es.json` | ~50 keys corregidas + 16 keys nuevas |
| `frontend/src/lib/i18n/locales/en.json` | ~50 keys corregidas + 16 keys nuevas |
| `frontend/src/app/(dashboard)/programs/[id]/page.tsx` | Bug fix View/Edit + split Promise.all + extracted handlePublish + 3 hardcoded → i18n |
| `frontend/src/app/(dashboard)/programs/new/page.tsx` | 4 hardcoded → i18n |
| `frontend/src/app/(dashboard)/programs/page.tsx` | italic en descripción |
| `frontend/src/components/programs/configs/StampConfig.tsx` | Subtítulos + layouts dos columnas + selector de tipo de recompensa |
| `frontend/src/components/programs/FormBuilder.tsx` | Removidos select/number, agregado cedula, removido bloque de opciones |
| `frontend/src/components/programs/WalletPreviewContent.tsx` | Colores dinámicos + radio consistente + dimensiones de logo |

**Total: 8 archivos modificados, 0 errores de TypeScript, 0 strings hardcoded en español sin i18n.**
