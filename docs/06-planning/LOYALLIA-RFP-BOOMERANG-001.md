---
title: "Loyallia RFP — Feature Parity with Boomerangme + Quality Remediation"
document_id: "LOYALLIA-RFP-BOOMERANG-001"
version: "1.0"
status: "draft"
last_updated: "2026-09-12"
author: "Engineering Team"
owner: "Product Owner"
approver: "Product Owner"
classification: "Confidential"
confidentiality: "Loyallia engineering and product team only"
review_cycle: "Weekly during implementation"
---

## DOCUMENT CONTROL

| Field | Value |
|---|---|
| Document ID | LOYALLIA-RFP-BOOMERANG-001 |
| Title | Loyallia RFP — Feature Parity with Boomerangme + Quality Remediation |
| Version | 1.0 |
| Date | 2026-09-12 |
| Author | Engineering Team |
| Approver | Product Owner |
| Owner | Engineering Team |
| Classification | Confidential |
| Confidentiality | Loyallia engineering and product team only |
| Review Cycle | Weekly during implementation |
| Status | draft |
| Standard | ISO 25010:2011, ISO 27001:2022, ISO 9001:2015 |
| Parent Document | LOYALLIA-SRS-MASTER-001 |
| Supersedes | LOYALLIA-SRS-BOOMERANG-001 |
| Language | Spanish + English |
| Format | .md |
| Location | docs/06-planning/LOYALLIA-RFP-BOOMERANG-001.md |

### Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-09-12 | Engineering Team | Initial draft — Boomerangme deep analysis + gap analysis + implementation plan |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Product Owner | Approver | Review and approve implementation priorities |
| Engineering Team | Implementer | Execute the implementation |
| QA Team | Verifier | Verify all changes with automated tests |

### Related Documents

| Document ID | Title | Relationship |
|---|---|---|
| LOYALLIA-SRS-MASTER-001 | Master SRS | Parent |
| LOYALLIA-PLAN-HARDENING-001 | System Hardening Plan | Related — atomicity fixes |
| LOYALLIA-PLAN-DESIGNER-FIX-002 | Wallet Designer Fix Plan | Related — icon preview fix |
| EDICION-LOYALLIA-DOCX | Client Corrections Document | Predecessor — all 27 items completed |

---

## 1. CONTEXTO

Boomerangme (boomerangme.com) es una plataforma directamente competidora con 30,000+ clientes que ofrece tarjetas de lealtad digitales para negocios locales. Este documento analiza TODAS las funcionalidades de Boomerangme contra Loyallia para identificar brechas y priorizar el trabajo.

**Paridad actual: ~75%** — Loyallia cubre la mayoria de funciones core pero le faltan herramientas de engagement, RFM analysis, y capacidades de agencia/franquicia.

---

## 2. ANALISIS COMPLETO DE BOOMERANGME

### 2.1 Tarjetas de Lealtad Digitales

| Tipo de Tarjeta | Boomerangme | Loyallia | Estado |
|---|---|---|---|
| Punch cards (sellos) | SI | SI — StampCard | PARIDAD |
| Cashback cards | SI | SI — CashbackCard | PARIDAD |
| Membership cards | SI | SI — VipMembershipCard | PARIDAD |
| Reward cards (niveles) | SI | SI — DiscountCard | PARIDAD |
| Discount cards | SI | SI — DiscountCard | PARIDAD |
| Prepaid punch cards | SI | NO | **BRECHA** |
| Coupon cards | SI | SI — CouponCard | PARIDAD |
| Gift cards | SI | SI — GiftCertificateCard | PARIDAD |
| Diseno personalizado (WYSIWYG) | SI — 111 plantillas | SI — WalletPassStudio | PARIDAD |
| Apple Wallet | SI | SI | PARIDAD |
| Google Wallet | SI | SI | PARIDAD |
| Campos personalizados | SI | SI — FormBuilder | PARIDAD |
| Codigo de barras unico | SI | SI — QR/barcode | PARIDAD |
| Fecha de expiracion | SI | SI — stampExpiry | PARIDAD |
| Subida de logo | SI | SI | PARIDAD |
| Formas de sello (6 tipos) | SI (limitado) | SI — 6 formas | PARIDAD+ |
| Color de sello personalizado | SI | SI | PARIDAD |
| Biblioteca de iconos (200+) | SI | SI — icon-library.ts | PARIDAD |
| Layouts de grid (5 opciones) | SI | SI — 5 layouts | PARIDAD |

### 2.2 Engagement del Cliente

| Funcionalidad | Boomerangme | Loyallia | Estado |
|---|---|---|---|
| Push notifications | SI — ilimitadas gratis | SI — wallet pushes | PARIDAD |
| SMS mailings | SI | SI — Twilio | PARIDAD |
| Email mailings | SI | SI — Mailjet | PARIDAD |
| Comunicacion 2 via | SI — SMS & Email | SI — WhatsApp bridge | PARIDAD |
| Programa de referidos | SI | SI — ReferralPassCard | PARIDAD |
| Recoleccion de feedback (Google Reviews) | SI | NO | **BRECHA** |
| Push geo-localizado (100m) | SI | SI — Location model | PARIDAD |
| Automatizacion push (triggers) | SI | SI — Automation engine | PARIDAD |
| Plataforma de datos del cliente (CDP) | SI | SI — Customer model | PARIDAD |
| Analisis RFM | SI — segmentacion automatica | NO | **BRECHA** |
| Richie AI Marketer | SI — agente autonomo | SI — AI assistant | PARIDAD (enfoque diferente) |
| Control de duplicados | SI | SI — unique constraint | PARIDAD |
| Campos personalizados por tarjeta | SI | SI — FormBuilder | PARIDAD |

### 2.3 Scanner y POS

| Funcionalidad | Boomerangme | Loyallia | Estado |
|---|---|---|---|
| Scanner PWA | SI | SI — scanner/scan | PARIDAD |
| Integracion POS | SI — Clover, Square, Toast | NO | **BRECHA** |
| Entrada manual de codigo | SI | SI | PARIDAD |
| Escaneo QR | SI | SI | PARIDAD |
| Historial de transacciones | SI | SI — Transaction model | PARIDAD |

### 2.4 Analytics y Reportes

| Funcionalidad | Boomerangme | Loyallia | Estado |
|---|---|---|---|
| Analytics en tiempo real | SI | SI — analytics API | PARIDAD |
| Reportes automatizados | SI | SI — Celery tasks | PARIDAD |
| Leaderboards | SI | NO | **BRECHA** |
| Calculadora ROI (publica) | SI — herramienta publica | NO | **BRECHA** |
| Tasa de engagement | SI | SI | PARIDAD |
| Analytics por ubicacion | SI | SI — Location model | PARIDAD |

### 2.5 Agencia y Franquicia

| Funcionalidad | Boomerangme | Loyallia | Estado |
|---|---|---|---|
| Plataforma white-label | SI — plan Agency | SI — tenant branding | PARIDAD |
| Sub-cuentas (multi-tenant) | SI — 3 incluidas | SI — tenants ilimitados | PARIDAD+ |
| Dashboard de reventa | SI | NO | **BRECHA** |
| Dashboard de franquicia | SI | NO | **BRECHA** |
| Gestion multi-ubicacion | SI | SI — Location model | PARIDAD |
| Acceso basado en roles | SI | SI — RBAC (4 roles) | PARIDAD |
| Pasarela de pago (Stripe/PayPal) | SI | SI — payment_api.py | PARIDAD |
| Herramienta de prospeccion | SI | NO | **BRECHA** |

### 2.6 Integraciones

| Funcionalidad | Boomerangme | Loyallia | Estado |
|---|---|---|---|
| API y Webhooks | SI | SI — Django Ninja API | PARIDAD |
| Integraciones POS | SI — Clover, Square, Toast | NO | **BRECHA** |
| WhatsApp | SI | SI — Baileys bridge | PARIDAD |
| Email (Mailjet) | SI | SI | PARIDAD |
| SMS (Twilio) | SI | SI | PARIDAD |
| Google OAuth | SI | SI | PARIDAD |

### 2.7 Plataforma y Admin

| Funcionalidad | Boomerangme | Loyallia | Estado |
|---|---|---|---|
| Dashboard SuperAdmin | SI | SI | PARIDAD |
| Gestion de planes | SI | SI — SubscriptionPlan | PARIDAD |
| Gestion de tenants | SI | SI | PARIDAD |
| Gestion de configuraciones | SI | SI — PlatformSetting | PARIDAD |
| Factory reset | SI | SI — 3 mecanismos | PARIDAD |
| Seed de datos demo | SI | SI — seed_demo_data | PARIDAD |
| Auditoria | SI | SI — AuditAction | PARIDAD |
| Sistema de backups | SI | SI — backup service | PARIDAD |
| Monitoreo (Prometheus/Grafana) | NO | SI | **VENTAJA DE LOYALLIA** |

---

## 3. BRECHAS IDENTIFICADAS

### 3.1 ALTA PRIORIDAD (Funcionalidades solicitadas por clientes)

| # | Funcionalidad | Referencia Boomerang | Estado Loyallia | Esfuerzo |
|---|---|---|---|---|
| B1 | Tarjetas prepaid | `/solutions/prepaid-digital-punch-cards` | Tipo de tarjeta faltante | Medio — nuevo CardType |
| B2 | Analisis RFM | `/customer-engagement/rfm-analysis` | Falta completamente | Grande — nuevo modulo |
| B3 | Recoleccion de feedback (Google Reviews) | `/customer-engagement/feedback-collection` | Falta completamente | Medio — nueva API + UI |
| B4 | Integraciones POS (Clover, Square, Toast) | `/integrations` | Falta completamente | Grande — nueva capa de integracion |

### 3.2 MEDIA PRIADAD (Deseables)

| # | Funcionalidad | Referencia | Estado | Esfuerzo |
|---|---|---|---|---|
| B5 | Leaderboard/analisis competitivo | Pricing page | Falta | Pequeno — nueva vista de analytics |
| B6 | Calculadora ROI (publica) | `/loyalty-roi-calculator` | Falta | Pequeno — pagina publica |
| B7 | Dashboard de reventa | Plan Agency | Falta | Medio — nueva vista admin |
| B8 | Dashboard de franquicia | Plan Franchise | Falta | Medio — nueva vista admin |
| B9 | Herramienta de prospeccion | Plan Agency | Falta | Grande — nuevo modulo |

### 3.3 BAJA PRIORIDAD (Ya cubierto o no necesario)

| # | Funcionalidad | Notas |
|---|---|---|
| B10 | Equivalente de Richie AI | Loyallia tiene AI assistant — diferente enfoque pero cubre lo mismo |
| B11 | 111 plantillas de diseno | Loyallia tiene sistema de plantillas — necesita mas plantillas |
| B12 | Tracking de ventas de empleados | Loyallia tiene rol Manager + tracking de transacciones |

---

## 4. CORRECCIONES DE CALIDAD DEL CODIGO (AI SLOP)

La auditoria del codigo encontro los siguientes problemas de calidad que deben corregirse:

### 4.1 Problemas Criticos

| # | Archivo | Problema | Accion |
|---|---|---|---|
| S1 | `en.json:39` | Texto en espanol "Campo obligatorio" en locale ingles | Cambiar a "Required" |
| S2 | `new/page.tsx:49` | Variable `coordError` sin usar + codigo muerto en linea 377 | Eliminar |
| S3 | `AppleWalletPreview.tsx` (670 lineas) | Excede limite de 650 lineas | Extraer funciones de utilidad |

### 4.2 Problemas de Calidad

| # | Archivo | Problema | Accion |
|---|---|---|---|
| S4 | `StampConfig.tsx` | 3 bloques JSDoc duplicados | Eliminar duplicados |
| S5 | `FormBuilder.tsx` | JSDoc que repite tipos TypeScript | Eliminar |
| S6 | `WalletPreviewContent.tsx` | JSDoc duplicado en export | Eliminar |
| S7 | `AppleWalletPreview.tsx` | JSDoc redundante (3 bloques) | Eliminar |
| S8 | `programs/[id]/page.tsx` | Comentarios obvios que repiten el codigo | Eliminar |
| S9 | `programs/page.tsx` | Comentario de seccion obsoleto | Eliminar |
| S10 | `constants.ts` | ROLE_LABELS hardcoded en espanol | Mover a i18n |

### 4.3 Problemas de Arquitectura

| # | Problema | Impacto | Accion |
|---|---|---|---|
| A1 | Error handler Pydantic copiado 3 veces | Mantenibilidad | Extraer `handleAxiosError` compartido |
| A2 | `onSaveAsTemplate` copiado 3 veces | Mantenibilidad | Extraer a modulo compartido |
| A3 | `as any` para cubrir tipos incorrectos | Seguridad de tipos | Definir tipo correcto |

---

## 5. CORRECCIONES DEL SISTEMA (ATOMICIDAD)

### 5.1 Endpoints AT RISK (sin transaction.atomic)

| # | Endpoint | Operaciones | Riesgo |
|---|---|---|---|
| T1 | `POST /tenants/{id}/suspend/` | tenant.save + subscription.save | Tenant suspendido, subscription no |
| T2 | `POST /tenants/{id}/reactivate/` | tenant.save + subscription.same | Tenant activo, subscription suspendida |
| T3 | `POST /tenants/{id}/extend-trial/` | tenant.save + subscription.save | Trial extendido en tenant, no en subscription |
| T4 | `POST /locations/` | Location.create + primary flag update | Dos ubicaciones marcadas como primarias |
| T5 | `PATCH /locations/{id}/` | Location.save + primary flag update | Mismo |
| T6 | `POST /automations/` | create + M2M set + save | Automacion sin programas |
| T7 | `PUT /automations/{id}/` | M2M set + save | Actualizacion parcial |
| T8 | `POST /automations/{id}/execute/` | execute + audit | Efectos sin auditoria |
| T9 | Wallet template CRUD (4 endpoints) | template + audit log | Template sin auditoria |

### 5.2 Envio de email bloqueante

| # | Problema | Impacto | Solucion |
|---|---|---|---|
| E1 | `send_owner_welcome_email` bloquea en SMTP | Timeout de frontend, error fantasma | Enviar via Celery task async |

---

## 6. PLAN DE IMPLEMENTACION

### Fase 1: Correcciones de Calidad (1-2 dias)

| Tarea | Archivos | Descripcion |
|---|---|---|
| Eliminar AI slop | 7 archivos | JSDoc duplicados, comentarios obvios, codigo muerto |
| Fix `en.json` Spanish | `en.json` | "Campo obligatorio" → "Required" |
| Fix `coordError` dead code | `new/page.tsx` | Eliminar variable y codigo muerto |
| Fix comments in constants | `constants.ts` | Corregir comentarios enganosos |

### Fase 2: Atomicidad de Transacciones (1-2 dias)

| Tarea | Archivos | Descripcion |
|---|---|---|
| Wrap endpoints T1-T8 | `tenants.py`, `api.py`, `automation/api.py` | `transaction.atomic()` para operaciones multi-DB |
| Async email | `tenants.py`, `email.py` | Cambiar SMTP sync a Celery task async |
| Wrap wallet CRUD | `wallet/api.py` | `transaction.atomic()` para template + audit log |

### Fase 3: RFM Analysis (2-3 semanas)

| Tarea | Archivos | Descripcion |
|---|---|---|
| Modelo de scoring RFM | Nuevo `backend/apps/analytics/rfm.py` | Score de clientes en Recencia, Frecuencia, Monetario |
| Segmentos RFM | Nuevo `backend/apps/analytics/segments.py` | Champions, At Risk, Sleeping, etc. |
| Dashboard RFM | Nuevo `frontend/src/app/(dashboard)/analytics/rfm/page.tsx` | Grid visual de segmentos |
| Triggers de automatizacion | `backend/apps/automation/engine.py` | Ejecutar automatizaciones basadas en cambios de segmento |

### Fase 4: Feedback Collection (1-2 semanas)

| Tarea | Archivos | Descripcion |
|---|---|---|
| Integracion Google Reviews API | Nuevo `backend/apps/notifications/reviews/` | Solicitar reviews despues de transacciones |
| Automatizacion de solicitudes | `backend/apps/automation/engine.py` | Auto-enviar solicitudes de review |
| Dashboard de reviews | Nuevo componente frontend | Trackear metricas de reviews |

### Fase 5: Tarjetas Prepaid (1-2 semanas)

| Tarea | Archivos | Descripcion |
|---|---|---|
| Nuevo tipo de tarjeta | `backend/apps/cards/`, tabs frontend | Agregar PrepaidPunchCard |
| Tracking de balance | `backend/apps/transactions/` | Trackear balance prepago |
| Logica de redencion | `backend/apps/redemption/strategies/` | Descontar del balance prepago |

---

## 7. VERIFICACION

| Verificacion | Comando | Esperado |
|---|---|---|
| TypeScript | `npm run typecheck` | 0 errores |
| Unit tests | `npm run test:unit` | 503+ pasan |
| Build | `npm run build` | exit 0 |
| Ruff (Python) | `ruff check backend/` | 0 errores |
| Pyright (Python) | `pyright backend/` | 0 errores |
| E2E Suite 02 | Playwright programs | 8/8 pasan |
| E2E Suite 36 | Playwright designer | 22/22 pasan |
| E2E Suite 42 | Playwright corrections | 29/29 pasan |

---

## 8. CUMPLIMISO ISO

| Requisito | Fuente | Implementacion |
|---|---|---|
| Integridad de datos en escrituras multi-tabla | ISO 27001 A.14.2.5 | `transaction.atomic()` en todos los endpoints multi-op |
| Ingenieria de sistema seguro | ISO 27001 A.14.2.5 | Efectos async via Celery, no bloqueando HTTP |
| Gestion de calidad | ISO 9001:2015 8.5.1 | Todos los cambios verificados con tests automatizados |
| Descripcion de arquitectura | ISO 42010:2011 | Este documento describe el cambio de sistema |
| Pista de auditoria | ISO 27001 A.8.2.1 | Todos los endpoints de mutacion mantienen audit logs |
