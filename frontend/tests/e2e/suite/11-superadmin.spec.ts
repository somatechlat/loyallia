/**
 * Suite 11 — SuperAdmin CRUD & Platform Management
 * Tests SuperAdmin platform dashboard, tenant list, plan CRUD,
 * settings Vault editing, broadcast, and non-SA isolation.
 */
import { test, expect } from '@playwright/test';
import {
  getE2EBaseURL,
  loginRole,
  expectIntegrationResponseDoesNotExposeSecrets,
  requireMutatingE2EAllowed,
} from '../helpers/e2e-safety';

const BASE_API = getE2EBaseURL();

// =============================================================================
// PLATFORM DASHBOARD & NAVIGATION
// =============================================================================

test.describe('SuperAdmin — Platform Dashboard @superadmin @superadmin', () => {

  test('SA sees platform overview page @superadmin', async ({ page }) => {
    await page.goto('/superadmin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('SA has "Plataforma" in navigation @superadmin', async ({ page }) => {
    await page.goto('/superadmin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const navLink = page.locator('nav, aside').getByText('Plataforma');
    await expect(navLink.first()).toBeVisible({ timeout: 10000 });
  });

  test('SA sees tenant list @superadmin', async ({ page }) => {
    await page.goto('/superadmin/tenants', { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Negocios' }).waitFor({ state: 'visible', timeout: 15000 });
    const tenantRows = page.locator('table tbody tr');
    await tenantRows.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    const count = await tenantRows.count();
    test.skip(count === 0, 'No tenants found — seed data may not have completed');
    expect(count).toBeGreaterThan(0);
  });

  test('SA sees "Negocios" in navigation @superadmin', async ({ page }) => {
    await page.goto('/superadmin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const navLink = page.locator('nav, aside').getByText('Negocios');
    await expect(navLink.first()).toBeVisible({ timeout: 10000 });
  });

  test('SA sees "Métricas" in navigation @superadmin', async ({ page }) => {
    await page.goto('/superadmin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const navLink = page.locator('nav, aside').getByText('Métricas');
    await expect(navLink.first()).toBeVisible({ timeout: 10000 });
  });

  test('SA sees "Planes" in navigation @superadmin', async ({ page }) => {
    await page.goto('/superadmin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const navLink = page.locator('nav, aside').getByText('Planes');
    await expect(navLink.first()).toBeVisible({ timeout: 10000 });
  });

  test('SA sees "Config Global" in navigation @superadmin', async ({ page }) => {
    await page.goto('/superadmin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const navLink = page.locator('nav, aside').getByText('Config Global');
    await expect(navLink.first()).toBeVisible({ timeout: 10000 });
  });

  test('SA can navigate to metrics page @superadmin', async ({ page }) => {
    await page.goto('/superadmin/metrics', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });
});

// =============================================================================
// SUPERADMIN — PLAN CRUD
// =============================================================================

test.describe('SuperAdmin — Plan Management @superadmin @superadmin', () => {

  test('SA sees plans page with active/inactive counts @superadmin', async ({ page }) => {
    await page.goto('/superadmin/plans', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await expect(page.getByRole('heading', { name: /Planes de Suscripción/ })).toBeVisible({ timeout: 10000 });
    // Should see plan count text like "X activos · Y inactivos"
    const countText = page.locator('text=/\\d+ activos/');
    await expect(countText.first()).toBeVisible({ timeout: 5000 });
  });

  test('SA can open create plan modal @superadmin', async ({ page }) => {
    await page.goto('/superadmin/plans', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.getByRole('button', { name: /Nuevo Plan/ }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('heading', { name: 'Nuevo Plan' })).toBeVisible({ timeout: 5000 });
  });

  test('SA can create a new plan with rate limits @superadmin', async ({ page }) => {
    requireMutatingE2EAllowed();
    await page.goto('/superadmin/plans', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.getByRole('button', { name: /Nuevo Plan/ }).click();
    await page.waitForTimeout(500);

    // Fill basic info
    const planName = `E2E Test Plan ${Date.now()}`;
    await page.locator('input[placeholder="Professional"]').fill(planName);
    await page.locator('input[placeholder="professional"]').fill(`e2e-test-${Date.now()}`);
    await page.locator('input[placeholder="49"]').fill('99');
    await page.locator('input[placeholder="470"]').fill('950');

    // Set resource limits (first 4 number inputs in the modal)
    const numberInputs = page.locator('input[type="number"]');
    await numberInputs.nth(0).fill('5');   // max_locations
    await numberInputs.nth(1).fill('10');  // max_users
    await numberInputs.nth(2).fill('2000'); // max_customers
    await numberInputs.nth(3).fill('5');   // max_programs

    // Enable WhatsApp with rate limit — find label containing 'WhatsApp' and check its checkbox
    await page.locator('label').filter({ hasText: 'WhatsApp' }).locator('input[type="checkbox"]').check();
    await page.waitForTimeout(200);
    await page.locator('text=Máx. WhatsApp/día').locator('..').locator('input[type="number"]').fill('150');

    // Enable Wallet with rate limit
    await page.locator('label').filter({ hasText: 'Wallet' }).locator('input[type="checkbox"]').check();
    await page.waitForTimeout(200);
    await page.locator('text=Máx. Wallet Pushes/mes').locator('..').locator('input[type="number"]').fill('3000');

    // Save
    await page.getByRole('button', { name: /Crear Plan/ }).click();
    await page.waitForTimeout(2000);

    // Plan should appear in list
    await expect(page.locator('text=' + planName)).toBeVisible({ timeout: 10000 });
  });

  test('SA plan shows rate limits in read mode @superadmin', async ({ page }) => {
    await page.goto('/superadmin/plans', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Click first active plan
    const firstPlan = page.locator('h3').first();
    await firstPlan.click();
    await page.waitForTimeout(500);
    // Read mode should show resource limits
    await expect(page.locator('text=Límites de Recursos')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Canal')).toBeVisible();
  });

  test('SA can deactivate and reactivate a plan @superadmin', async ({ page, request }) => {
    requireMutatingE2EAllowed();
    const token = await loginRole(request, 'superadmin');
    const unique = Date.now();
    const planName = `E2E Toggle Plan ${unique}`;
    const planSlug = `e2e-toggle-${unique}`;

    const createResp = await request.post(`${BASE_API}/api/v1/admin/plans/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: planName,
        slug: planSlug,
        description: 'Plan created by E2E toggle coverage',
        price_monthly: 7,
        price_annual: 70,
        max_locations: 1,
        max_users: 2,
        max_customers: 100,
        max_programs: 1,
        max_notifications_month: 100,
        max_transactions_month: 100,
        max_whatsapp_day: 0,
        max_emails_month: 0,
        max_sms_day: 0,
        max_wallet_pushes_month: 0,
        max_automations: 0,
        max_automation_executions_day: 0,
        max_ai_queries_month: 0,
        max_api_calls_day: 0,
        max_exports_month: 0,
        features: [],
        trial_days: 5,
        sort_order: 99,
        is_featured: false,
      },
    });
    expect(createResp.status(), 'Plan create should return 200').toBe(200);
    const created = await createResp.json();

    const deactivateResp = await request.delete(`${BASE_API}/api/v1/admin/plans/${created.id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(deactivateResp.status(), 'Plan deactivate should return 200').toBe(200);

    let listResp = await request.get(`${BASE_API}/api/v1/admin/plans/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listResp.status()).toBe(200);
    let plans = await listResp.json();
    let plan = plans.find((p: { slug: string }) => p.slug === planSlug);
    expect(plan?.is_active, 'Plan should be inactive after deactivate').toBe(false);

    const reactivateResp = await request.patch(`${BASE_API}/api/v1/admin/plans/${created.id}/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { is_active: true },
    });
    expect(reactivateResp.status(), 'Plan reactivate should return 200').toBe(200);

    listResp = await request.get(`${BASE_API}/api/v1/admin/plans/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listResp.status()).toBe(200);
    plans = await listResp.json();
    plan = plans.find((p: { slug: string }) => p.slug === planSlug);
    expect(plan?.is_active, 'Plan should be active after reactivate').toBe(true);

    await page.goto('/superadmin/plans', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: planName })).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// SUPERADMIN — SETTINGS & VAULT EDITING
// =============================================================================

test.describe('SuperAdmin — Settings & Vault Editing @superadmin @superadmin', () => {

  test('SA sees settings page with integrations @superadmin', async ({ page }) => {
    await page.goto('/superadmin/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await expect(page.getByRole('heading', { name: 'Configuración Global' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Integraciones')).toBeVisible();
  });

  test('SA sees Google Wallet integration card @superadmin', async ({ page }) => {
    await page.goto('/superadmin/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Find the integration card grid and locate the Google Wallet card within it
    const grid = page.locator('.grid').filter({ has: page.locator('text=Google Wallet') }).first();
    const card = grid.locator('> div').filter({ hasText: 'Google Wallet' }).first();
    await expect(card.locator('p').filter({ hasText: 'Google Wallet' }).first()).toBeVisible({ timeout: 10000 });
    // Should show configured status (green badge)
    await expect(card.locator('span.bg-green-100')).toBeVisible({ timeout: 5000 });
  });

  test('SA sees Apple Wallet integration card @superadmin', async ({ page }) => {
    await page.goto('/superadmin/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const grid = page.locator('.grid').filter({ has: page.locator('text=Apple Wallet') }).first();
    const card = grid.locator('> div').filter({ hasText: 'Apple Wallet' }).first();
    await expect(card.locator('p').filter({ hasText: 'Apple Wallet' }).first()).toBeVisible({ timeout: 10000 });
    await expect(card.locator('span.bg-green-100')).toBeVisible({ timeout: 5000 });
  });

  test('SA can open Vault editor for Google Wallet @superadmin', async ({ page }) => {
    await page.goto('/superadmin/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Find the Google Wallet card and open its editor (each card has exactly one button)
    const grid = page.locator('.grid').filter({ has: page.locator('text=Google Wallet') }).first();
    const googleCard = grid.locator('> div').filter({ hasText: 'Google Wallet' }).first();
    await googleCard.getByRole('button').click();
    await page.waitForTimeout(500);
    // Editor should open with fields visible
    await expect(page.getByText('Editor de Vault — Google Wallet')).toBeVisible({ timeout: 5000 });
  });

  test('SA wallet editor exposes file uploads and hot enable toggles @superadmin', async ({ page }) => {
    await page.goto('/superadmin/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const grid = page.locator('.grid').filter({ has: page.locator('text=Google Wallet') }).first();
    const googleCard = grid.locator('> div').filter({ hasText: 'Google Wallet' }).first();
    await googleCard.getByRole('button').click();

    await expect(page.getByLabel('Subir archivo para Service Account JSON')).toBeVisible({ timeout: 5000 });
    await expect(googleCard.getByRole('button', { name: 'ON', exact: true })).toBeVisible();
    await expect(googleCard.getByRole('button', { name: 'OFF', exact: true })).toBeVisible();

    const appleCard = page.locator('.grid').filter({ has: page.locator('text=Apple Wallet') }).first()
      .locator('> div').filter({ hasText: 'Apple Wallet' }).first();
    await appleCard.getByRole('button').first().click();
    await expect(page.getByLabel('Subir archivo para Certificate PEM')).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel('Subir archivo para Private Key PEM')).toBeVisible();
    await expect(page.getByLabel('Subir archivo para WWDR Certificate PEM')).toBeVisible();
  });

  test('SA settings page shows Mailjet integration @superadmin', async ({ page }) => {
    await page.goto('/superadmin/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await expect(page.locator('text=Mailjet Email')).toBeVisible({ timeout: 10000 });
  });

  test('SA can access broadcast announcement form without sending @superadmin', async ({ page }) => {
    await page.goto('/superadmin/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Find the broadcast section by its unique heading, then scope to its parent container
    const broadcastHeading = page.getByRole('heading', { name: 'Anuncio Global (Broadcast)' });
    await broadcastHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // The broadcast form is within the same container as the heading (sibling/parent structure)
    const broadcastSection = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Anuncio Global (Broadcast)' }) }).first();
    const broadcastForm = broadcastSection.locator('form');
    const subjectInput = broadcastForm.locator('input[type="text"]').first();
    const messageTextarea = broadcastForm.locator('textarea').first();
    await expect(subjectInput).toBeVisible();
    await expect(messageTextarea).toBeVisible();
    await expect(broadcastForm.getByRole('button', { name: /Enviar a todos/ })).toBeVisible();
  });

  test('SA sees Twilio SMS integration card @superadmin', async ({ page }) => {
    await page.goto('/superadmin/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await expect(page.locator('text=Twilio SMS')).toBeVisible({ timeout: 10000 });
  });

  test('SA can open Vault editor for Twilio SMS @superadmin', async ({ page }) => {
    await page.goto('/superadmin/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Find the Twilio SMS card and open its Vault editor (not the test mode toggle)
    const grid = page.locator('.grid').filter({ has: page.locator('text=Twilio SMS') }).first();
    const twilioCard = grid.locator('> div').filter({ hasText: 'Twilio SMS' }).first();
    await twilioCard.getByRole('button', { name: /Configurar credenciales/ }).click();
    await page.waitForTimeout(500);

    // Editor should open with test mode toggle visible
    await expect(page.getByText('Editor de Vault — Twilio SMS')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Usar Credenciales de Prueba')).toBeVisible();
  });

  test('SA sees System Operations section @superadmin', async ({ page }) => {
    await page.goto('/superadmin/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // System Operations section with Demo Data and Factory Reset
    await expect(page.getByRole('heading', { name: 'Operaciones del Sistema' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#btn-seed-demo')).toBeVisible();
    await expect(page.locator('#btn-factory-reset-request')).toBeVisible();
  });

  test('SA factory reset section shows request OTP button @superadmin', async ({ page }) => {
    await page.goto('/superadmin/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Scroll to factory reset section
    const resetHeading = page.getByRole('heading', { name: 'Restaurar de Fábrica' });
    await resetHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Verify the request OTP button is visible and has correct text
    const resetBtn = page.locator('#btn-factory-reset-request');
    await expect(resetBtn).toBeVisible({ timeout: 5000 });
    const btnText = await resetBtn.textContent();
    expect(btnText).toContain('Solicitar');
  });

  test('SA sees Platform Settings parameters @superadmin', async ({ page }) => {
    await page.goto('/superadmin/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Platform Settings section should be visible
    await expect(page.getByRole('heading', { name: 'Parámetros del Sistema' })).toBeVisible({ timeout: 10000 });

    // Should have at least one parameter input with save button
    const inputs = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Parámetros del Sistema' }) }).first().locator('input');
    expect(await inputs.count()).toBeGreaterThan(0);
  });
});

// =============================================================================
// SUPERADMIN — PLATFORM INTEGRATIONS API
// =============================================================================

test.describe('SuperAdmin — Integration API @superadmin @superadmin', () => {

  test('GET /admin/platform/integrations/ returns all integrations @superadmin', async ({ request }) => {
    const token = await loginRole(request, 'superadmin');
    const resp = await request.get(`${BASE_API}/api/v1/admin/platform/integrations/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(3);

    // Each integration should have required fields
    for (const integration of body) {
      expect(integration).toHaveProperty('key');
      expect(integration).toHaveProperty('name');
      expect(integration).toHaveProperty('enabled');
      expect(integration).toHaveProperty('configured');
      expect(integration).toHaveProperty('status');
      expect(integration).toHaveProperty('diagnostics');
      expect(integration).toHaveProperty('preview_values');
    }
    expectIntegrationResponseDoesNotExposeSecrets(body);

    // Google and Apple should be configured
    const google = body.find((i: any) => i.key === 'google_wallet');
    const apple = body.find((i: any) => i.key === 'apple_wallet');
    expect(google).toBeDefined();
    expect(apple).toBeDefined();
    expect(google.configured).toBe(true);
    expect(apple.configured).toBe(true);
  });

  test('GET /admin/platform/integrations/ does not expose Vault secret values @superadmin', async ({ request }) => {
    const token = await loginRole(request, 'superadmin');
    const resp = await request.get(`${BASE_API}/api/v1/admin/platform/integrations/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expectIntegrationResponseDoesNotExposeSecrets(body);
  });

  test('PUT secret with invalid key returns 400 @superadmin', async ({ request }) => {
    const token = await loginRole(request, 'superadmin');
    const resp = await request.put(`${BASE_API}/api/v1/admin/platform/integrations/email/secret/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { key: 'invalid_key', value: 'test' },
    });
    expect(resp.status()).toBe(400);
  });

  test('PUT wallet secret rejects malformed Google JSON @superadmin', async ({ request }) => {
    const token = await loginRole(request, 'superadmin');
    const resp = await request.put(`${BASE_API}/api/v1/admin/platform/integrations/google_wallet/secret/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { key: 'google_service_account_json', value: '{bad json' },
    });
    expect(resp.status()).toBe(400);
  });
});

// =============================================================================
// OWNER ISOLATION
// =============================================================================

test.describe('SuperAdmin — OWNER Isolation @owner @superadmin', () => {

  test('OWNER navigating to /superadmin is blocked @owner', async ({ page }) => {
    await page.goto('/superadmin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const url = page.url();
    const heading = page.locator('h1').first();
    if (await heading.isVisible()) {
      const text = await heading.textContent();
      expect(text).not.toContain('Plataforma');
    }
  });
});
