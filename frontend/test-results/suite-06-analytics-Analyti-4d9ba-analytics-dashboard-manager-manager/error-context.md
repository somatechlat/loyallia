# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: suite/06-analytics.spec.ts >> Analytics — MANAGER Read @manager >> MANAGER sees analytics dashboard @manager
- Location: tests/e2e/suite/06-analytics.spec.ts:22:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1').first()
Expected substring: "Analytics"
Received string:    "Analíticas"
Timeout: 15000ms

Call log:
  - Expect "toContainText" with timeout 15000ms
  - waiting for locator('h1').first()
    19 × locator resolved to <h1 class="page-title">Analíticas</h1>
       - unexpected value "Analíticas"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - generic [ref=e5]:
        - img "Loyallia" [ref=e6]
        - generic [ref=e7]:
          - paragraph [ref=e8]: Loyallia
          - paragraph [ref=e9]: Café El Ritmo
      - navigation [ref=e10]:
        - link "Resumen" [ref=e11] [cursor=pointer]:
          - /url: /
          - img [ref=e12]
          - text: Resumen
        - link "Programas" [ref=e14] [cursor=pointer]:
          - /url: /programs/
          - img [ref=e15]
          - text: Programas
        - link "Clientes" [ref=e17] [cursor=pointer]:
          - /url: /customers/
          - img [ref=e18]
          - text: Clientes
        - link "Analíticas" [ref=e20] [cursor=pointer]:
          - /url: /analytics/
          - img [ref=e21]
          - text: Analíticas
        - link "Sucursales" [ref=e23] [cursor=pointer]:
          - /url: /locations/
          - img [ref=e24]
          - text: Sucursales
      - generic [ref=e27]:
        - button "Claro" [ref=e28] [cursor=pointer]:
          - img [ref=e29]
          - text: Claro
        - button "Oscuro" [ref=e32] [cursor=pointer]:
          - img [ref=e33]
          - text: Oscuro
      - generic "Editar perfil" [ref=e36] [cursor=pointer]:
        - generic [ref=e38]: G
        - generic [ref=e39]:
          - paragraph [ref=e40]: Gabriela Cevallos Torres
          - paragraph [ref=e41]: Gerente
        - button "Cerrar sesión" [ref=e42]:
          - img [ref=e43]
      - paragraph [ref=e46]:
        - text: Loyallia · Intelligent Rewards
        - text: powered by Yachaq.ai
    - main [ref=e47]:
      - heading "Analíticas" [level=1] [ref=e50]
      - button "Abrir asistente inteligente" [ref=e59] [cursor=pointer]:
        - img [ref=e60]
      - generic:
        - generic:
          - generic:
            - generic: AI
            - generic:
              - heading "Asistente Loyallia" [level=3]
              - paragraph: Analytics
          - button:
            - img
        - generic:
          - generic:
            - generic: AI
            - generic:
              - generic:
                - paragraph:
                  - text: ¡Hola! Soy el
                  - strong: Asistente Loyallia
                  - text: .
                - paragraph: "Pregúntame lo que quieras sobre los datos que ves en pantalla. Puedo ayudarte con:"
                - generic:
                  - generic: ●
                  - generic: Interpretar métricas y gráficos
                - generic:
                  - generic: ●
                  - generic: Sugerencias para tu negocio
                - generic:
                  - generic: ●
                  - generic: Cómo usar cada función de la plataforma
        - generic:
          - button "¿Qué KPIs debo monitorear?"
          - button "Explícame la tasa de canje"
        - generic:
          - generic:
            - textbox "Pregunta sobre lo que ves en pantalla..."
            - button [disabled]:
              - img
  - alert [ref=e63]
```

# Test source

```ts
  1  | /**
  2  |  * Suite 06 — Analytics (OWNER & MANAGER read access)
  3  |  * Tests analytics dashboard loads with metrics for both roles.
  4  |  */
  5  | import { test, expect } from '@playwright/test';
  6  | 
  7  | test.describe('Analytics — OWNER @owner', () => {
  8  | 
  9  |   test('OWNER sees analytics dashboard with metrics @owner', async ({ page }) => {
  10 |     await page.goto('/analytics', { waitUntil: 'domcontentloaded' });
  11 |     await page.waitForTimeout(3000);
  12 |     await expect(page.locator('h1').first()).toContainText('Analytics');
  13 |     // Should have stat cards or charts
  14 |     const mainContent = page.locator('main');
  15 |     await expect(mainContent).toBeVisible();
  16 |   });
  17 | 
  18 | });
  19 | 
  20 | test.describe('Analytics — MANAGER Read @manager', () => {
  21 | 
  22 |   test('MANAGER sees analytics dashboard @manager', async ({ page }) => {
  23 |     await page.goto('/analytics', { waitUntil: 'domcontentloaded' });
  24 |     await page.waitForTimeout(3000);
> 25 |     await expect(page.locator('h1').first()).toContainText('Analytics');
     |                                              ^ Error: expect(locator).toContainText(expected) failed
  26 |   });
  27 | 
  28 | });
  29 | 
```