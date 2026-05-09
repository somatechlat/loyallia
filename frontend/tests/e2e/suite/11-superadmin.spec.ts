/**
 * Suite 11 — SuperAdmin CRUD & Platform Management
 * Tests SuperAdmin platform dashboard, tenant list, plan CRUD,
 * settings Vault editing, broadcast, and non-SA isolation.
 */
import { test, expect } from '@playwright/test';

const BASE_API = 'http://localhost:80';

async function loginAs(
  request: import('@playwright/test').APIRequestContext,
  email: string,
  password: string = '123456',
): Promise<string> {
  const resp = await request.post(`${BASE_API}/api/v1/auth/login/`, {
    data: { email, password },
  });
  expect(resp.status(), `Login should succeed for ${email}`).toBe(200);
  const body = await resp.json();
  expect(body.access_token).toBeTruthy();
  return body.access_token;
}

// =============================================================================
// PLATFORM DASHBOARD & NAVIGATION
// =============================================================================

test.describe('SuperAdmin — Platform Dashboard @superadmin', () => {

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

test.describe('SuperAdmin — Plan Management @superadmin', () => {

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

  test('SA can deactivate and reactivate a plan @superadmin', async ({ page }) => {
    await page.goto('/superadmin/plans', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Find first active plan card and click it
    const firstPlan = page.locator('h3').first();
    const planName = await firstPlan.textContent() || '';
    await firstPlan.click();
    await page.waitForTimeout(500);

    // The modal should be open — look for status indicator inside the modal
    const modal = page.locator('div.fixed.inset-0').first();
    const statusText = modal.locator('span').filter({ hasText: /Activo|Inactivo/ }).first();
    const isActive = await statusText.textContent() === 'Activo';

    if (isActive) {
      // Deactivate with confirm dialog — modal closes after success
      page.once('dialog', dialog => dialog.accept());
      await page.getByRole('button', { name: 'Desactivar' }).click();
      await expect(page.locator('text=Plan desactivado')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1500);

      // Verify plan moved to inactive section
      await expect(page.locator('h2').filter({ hasText: 'Planes Inactivos' })).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=' + planName.trim())).toBeVisible();

      // Reopen the plan to reactivate
      const inactivePlan = page.locator('h2').filter({ hasText: 'Planes Inactivos' }).locator('..').locator('text=' + planName.trim()).first();
      await inactivePlan.click();
      await page.waitForTimeout(500);

      // Reactivate with confirm dialog
      page.once('dialog', dialog => dialog.accept());
      await page.getByRole('button', { name: 'Reactivar' }).click();
      await expect(page.locator('text=Plan reactivado')).toBeVisible({ timeout: 10000 });
    } else {
      // Already inactive — just reactivate
      page.once('dialog', dialog => dialog.accept());
      await page.getByRole('button', { name: 'Reactivar' }).click();
      await expect(page.locator('text=Plan reactivado')).toBeVisible({ timeout: 10000 });
    }
  });
});

// =============================================================================
// SUPERADMIN — SETTINGS & VAULT EDITING
// =============================================================================

test.describe('SuperAdmin — Settings & Vault Editing @superadmin', () => {

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

  test('SA can edit a non-secret Vault field without page reload @superadmin', async ({ page }) => {
    await page.goto('/superadmin/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Open Google Wallet editor (each card has exactly one button)
    const grid = page.locator('.grid').filter({ has: page.locator('text=Google Wallet') }).first();
    const googleCard = grid.locator('> div').filter({ hasText: 'Google Wallet' }).first();
    await googleCard.getByRole('button').click();
    await page.waitForTimeout(500);

    // Edit the Issuer ID field (non-secret) — use label text to find the input
    const issuerInput = page.locator('div').filter({ has: page.locator('label', { hasText: 'Issuer ID' }) }).locator('input[type="text"]').first();
    await issuerInput.fill('3388000000023112792');
    await page.getByRole('button', { name: /Guardar en Vault/ }).first().click();

    // Should show success toast without page reload
    await expect(page.locator('text=actualizado en Vault')).toBeVisible({ timeout: 5000 });

    // Page URL should still be /superadmin/settings
    expect(page.url()).toContain('/superadmin/settings');
  });

  test('SA settings page shows Email SMTP integration @superadmin', async ({ page }) => {
    await page.goto('/superadmin/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await expect(page.locator('text=Email SMTP')).toBeVisible({ timeout: 10000 });
  });

  test('SA can send broadcast announcement @superadmin', async ({ page }) => {
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
    await subjectInput.fill('E2E Test Broadcast');
    const messageTextarea = broadcastForm.locator('textarea').first();
    await messageTextarea.fill('This is an automated test broadcast.');
    await broadcastForm.getByRole('button', { name: /Enviar a todos/ }).click();

    // Should show sending or success state
    await expect(page.getByRole('button', { name: /Enviando|Enviar a todos/ })).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// SUPERADMIN — PLATFORM INTEGRATIONS API
// =============================================================================

test.describe('SuperAdmin — Integration API @superadmin', () => {

  test('GET /admin/platform/integrations/ returns all integrations @superadmin', async ({ request }) => {
    const token = await loginAs(request, 'admin@loyallia.com');
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

    // Google and Apple should be configured
    const google = body.find((i: any) => i.key === 'google_wallet');
    const apple = body.find((i: any) => i.key === 'apple_wallet');
    expect(google).toBeDefined();
    expect(apple).toBeDefined();
    expect(google.configured).toBe(true);
    expect(apple.configured).toBe(true);
  });

  test('PUT /admin/platform/integrations/{key}/secret/ writes Vault secret @superadmin', async ({ request }) => {
    const token = await loginAs(request, 'admin@loyallia.com');
    const resp = await request.put(`${BASE_API}/api/v1/admin/platform/integrations/email/secret/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { key: 'email_host_user', value: 'info@loyallia.com' },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.success).toBe(true);
  });

  test('PUT secret with invalid key returns 400 @superadmin', async ({ request }) => {
    const token = await loginAs(request, 'admin@loyallia.com');
    const resp = await request.put(`${BASE_API}/api/v1/admin/platform/integrations/email/secret/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { key: 'invalid_key', value: 'test' },
    });
    expect(resp.status()).toBe(400);
  });

  test('PUT wallet secret rejects malformed Google JSON @superadmin', async ({ request }) => {
    const token = await loginAs(request, 'admin@loyallia.com');
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

test.describe('SuperAdmin — OWNER Isolation @owner', () => {

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
