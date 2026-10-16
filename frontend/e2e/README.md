---
title: "Loyallia AI Chatbot E2E Characterization Suite"
document_id: "LOYALLIA-E2E-CHATBOT-001"
version: "1.0"
status: "approved"
last_updated: "2026-10-16"
author: "Engineering"
owner: "QA Lead"
approver: "Product Owner"
classification: "Internal Use"
confidentiality: "Internal — Restricted to Engineering and Product teams"
review_cycle: "Upon each major release, or annually (whichever comes first)"
standard: "ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011"
parent_document: "LOYALLIA-AGENTS-001"
---

## DOCUMENT CONTROL

| Field | Details |
|-------|---------|
| **Document ID** | LOYALLIA-E2E-CHATBOT-001 |
| **Title** | Loyallia AI Chatbot E2E Characterization Suite |
| **Version** | 1.0 |
| **Date** | 2026-10-16 |
| **Author** | Engineering |
| **Approver** | Product Owner |
| **Owner** | QA Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and Product teams |
| **Review Cycle** | Upon each major release, or annually (whichever comes first) |
| **Status** | approved |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011 |
| **Parent Document** | LOYALLIA-AGENTS-001 |
| **Supersedes** | N/A |
| **Language** | Spanish (UI assertions) / English (code comments) |
| **Format** | Markdown (.md) |
| **Location** | `frontend/e2e/README.md` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-10-16 | Engineering | Initial chatbot characterization suite (T1–T5) and runbook |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Engineering Lead | Reviewer | Technical review |
| QA Lead | Owner | Maintains and executes the suite |
| Product Owner | Approver | Accepts characterized behavior |
| Security Officer | Reviewer | Credentials/secrets handling validation |

### Related Documents

| Document ID | Document | Relationship |
|-------------|----------|--------------|
| LOYALLIA-AGENTS-001 | `AGENTS.md` | Parent — agent rules and testing standards |
| — | `frontend/playwright.config.ts` | Existing Playwright suite conventions |
| — | `frontend/tests/e2e/helpers/e2e-test-config.ts` | Shared dev-seed credential conventions |
| — | `frontend/src/components/chat/Chatbot.tsx` | System under test |

### Change Control Process

1. All changes to this document MUST be recorded in the Revision History table above.
2. Status transitions: `draft` → `review` → `approved` → `active` → `deprecated` → `archived`.
3. Changes after `approved` status require a new version number and re-approval.
4. Minor corrections (typos, formatting) increment the minor version (e.g., 1.0 → 1.1).
5. Major changes (new requirements, scope changes) increment the major version (e.g., 1.0 → 2.0).
6. Deprecated documents MUST be moved to `docs/09-archive/` with a deprecation notice.
7. All dates in this document use ISO 8601 format (`YYYY-MM-DD`).

## DOCUMENT APPROVAL

| Role | Name | Signature | Date | Decision |
|------|------|-----------|------|----------|
| Engineering Lead | — | — | 2026-10-16 | Approved |
| QA Lead | — | — | 2026-10-16 | Approved |
| Product Owner | — | — | — | Pending Review |

---

# Suite E2E de caracterización — "Chatea con AiGi"

Caracterización **humana** del chatbot con IA de Loyallia mediante Playwright:
cada escenario interactúa con la UI real (login, botón flotante, input de chat)
y audita el **tráfico de red real del navegador**. No hay mocks: las respuestas
provienen del stack completo (Next.js → Django → Agent Zero).

## Estructura

```
frontend/e2e/
├── playwright.config.ts      # Config de esta suite (chromium por defecto)
├── helpers/
│   ├── human.ts              # Primitivas humanas (tipeo, mouse, esperas)
│   └── chatbot.ts            # Flujos: login, apertura, envío, captura de red
└── tests/
    └── chatbot.spec.ts       # Escenarios T1–T5
```

## Cómo ejecutar

```bash
cd frontend
npm run test:e2e:chatbot
# o directamente:
npx playwright test --config=e2e/playwright.config.ts
```

Requisitos: cluster Docker local levantado (web en `127.0.0.1:33906`, API en
`127.0.0.1:33905`, Agent Zero con alias `ai-agent` en `loyallia_backend-net`).

## Variables de entorno

| Variable | Requerida | Uso |
|----------|-----------|-----|
| `E2E_BASE_URL` | no | Base URL del frontend. Por defecto `http://localhost:33906` (también se acepta `PLAYWRIGHT_BASE_URL`, la convención del suite existente). |
| `E2E_EMAIL` | no | Email del usuario OWNER para T1–T4. |
| `E2E_PASSWORD` | no | Contraseña del usuario OWNER para T1–T4. |
| `E2E_AGENT_BASE_URL` | no | URL del Agent Zero (ej. `http://localhost:34200`). Si se define, T1a verifica primero que el agente responda. |
| `E2E_STAFF_EMAIL` / `E2E_STAFF_PASSWORD` | no | Usuario STAFF para T5. |
| `E2E_SUPERADMIN_EMAIL` / `E2E_SUPERADMIN_PASSWORD` | no | Usuario SUPER_ADMIN para T4 (segunda cuenta). |
| `E2E_BROWSERS` | no | `chromium` (defecto), o lista `chromium,webkit,firefox`. WebKit/Firefox requieren `npx playwright install`. |

**Sin secretos en el código.** Si las variables no están definidas, las
credenciales se leen del archivo ignorado por Git
`frontend/.auth/e2e-credentials.json`, escrito por el seed oficial de
desarrollo:

```bash
# dentro del contenedor/backend de desarrollo:
python manage.py provision_development_rbac_test_users --generate
```

Eseed crea el tenant `e2e-development-tenant` y los usuarios
`e2e-owner@loyallia.com`, `e2e-manager@loyallia.com`, `e2e-staff@loyallia.com`,
`e2e-superadmin@loyallia.com`. Nunca se commitea ese archivo.

## Escenarios

| # | Escenario | Aserciones clave (UI en español + red real) | Comportamiento esperado |
|---|-----------|---------------------------------------------|-------------------------|
| T1a | Continuidad — dos turnos | Primer turno viaja **sin** `context_id`; segundo turno reutiliza el MISMO `context_id`; 2 burbujas de usuario + respuestas visibles | PASS |
| T1b | Continuidad — reload | Tras recargar aparece "Continuar conversación" / "Continuar"; al continuar se muestra "Continuando tu conversación anterior."; el siguiente turno continúa el MISMO `context_id` | PASS |
| T2a | Ciclo de vida — finalizar | Click en "Finalizar conversación" → `POST /api/v1/tenants/me/ai-chat/end/` con el `context_id` activo y respuesta `success: true`; mensaje "Conversación finalizada. ¡Gracias por usar el asistente!"; el botón desaparece; el siguiente mensaje viaja **sin** `context_id` (conversación nueva) | PASS |
| T2b | Ciclo de vida — sin conversación activa | "Finalizar conversación" no se ofrece; "Nueva conversación" no emite ninguna petición `/end/` ni errores; vuelve el mensaje de bienvenida | PASS |
| T3 | Robustez — mensaje de ~3500 caracteres | El mensaje completo viaja en `POST /api/chat` sin truncarse (cota actual del router: 8000); la transcripción lo muestra completo; el asistente alcanza un estado terminal (respuesta o error visible, nunca silencio) | **FALLO CONOCIDO** — el campo no trunca, pero el payload pierde la pregunta del usuario: las plantillas i18n `chatbot.context.*` (es/en) no incluyen los marcadores `{userMessage}`/`{pageLabel}`/… que `Chatbot.tsx` intenta interpolar. El test está marcado `test.fail()`; si se corrigen las plantillas, su "fallo inesperado" lo señalará. |
| T4 | Aislamiento entre cuentas/tenants | Cambiando de cuenta en el mismo navegador: (a) el mensaje de la cuenta previa NO es visible; (b) el payload del request NO lleva el `context_id` ajeno | PASS |
| T5 | Roles — STAFF | El asistente no se monta para el rol STAFF (ni antes ni después del redirect) | PASS |

El detalle de red se audita sobre el stream real del navegador:

- `POST /api/chat` → turno de chat (ruta Next.js que proxea a Django).
- `POST /api/v1/tenants/me/ai-chat/end/` → teardown de la conversación.
- `GET /api/v1/tenants/me/ai-chat/session/` → restauración al montar (204 si no hay).

## Primitivas humanas (`helpers/human.ts`)

- `humanType` — tipeo carácter a carácter con demoras aleatorias de 40–120 ms y
  pausas de "pensamiento" (jitter). Textos > 500 caracteres se ingresan como un
  humano pega texto: primeros caracteres a mano + pegado. Devuelve el texto
  normalizado para verificar que el campo lo recibió completo.
- `humanMove` — el mouse viaja al objetivo en 2–4 puntos intermedios con
  variación, nunca en teletransporte.
- `waitForNetworkIdleAndBot` — espera por estado real (indicador "Pensando…",
  red ociosa, burbuja nueva y estable). Sin `sleep` fijos > 2 s.

## Ejecución y tiempos

- **Serial**: `workers: 1`, `fullyParallel: false` (el chat mantiene estado y el
  límite de `/api/chat` es 30 req/min por IP). Aun así NO se usa
  `test.describe.configure({ mode: 'serial' })` a propósito: una
  caracterización debe informar TODOS los escenarios aunque uno falle.
- `retries: 1` local para absorber la recompilación del dev server; traza y
  screenshot se guardan solo en fallos (`e2e/test-results/`, `e2e/playwright-report/`).
- Presupuesto total objetivo: < 10 minutos (la latencia de respuesta del agente
  es de ~15–60 s por turno).

## Notas de entorno (verificado 2026-10-16)

- **Ruta del chat server-side**: `src/app/api/chat/route.ts` hace fetch a
  `NEXT_PUBLIC_API_URL`. Dentro del contenedor `loyallia-web` ese valor
  (`http://localhost:33905` en `docker-compose.yml`) apunta al propio
  contenedor → "Internal server error while contacting AI agent" (500). La
  corrección de producto es usar `NEXT_INTERNAL_API_URL` (`http://api:8000`);
  mientras tanto, se puede recrear el contenedor con un override de entorno
  fuera del repo que fije `NEXT_PUBLIC_API_URL=http://api:8000`.
- **Payload de contexto sin la pregunta**: las plantillas i18n
  `chatbot.context.*` (es/en) no incluyen los marcadores
  `{userMessage}`/`{pageLabel}`/`{pathname}`/… que `Chatbot.tsx` intenta
  interpolar, así que el mensaje del usuario no llega al backend (T3 lo
  caracteriza como fallo conocido).
- **Latencia del agente**: las respuestas de Agent Zero tardan típicamente
  15–60 s, pero a veces exceden el timeout del proxy Django (~35 s) y el turno
  responde 503 con la burbuja "Error al procesar". Los flujos reintenta el
  turno una vez antes de fallar.

## Restricciones de seguridad

- Sin credenciales ni secretos en el código, el reporte ni el versionado.
- La suite no muta Vault, no ejecuta factory reset ni seed demo.
- Los registros creados (conversaciones de IA) se limpian con el propio flujo
  "Nueva conversación" / "Finalizar conversación" y expiran server-side.
