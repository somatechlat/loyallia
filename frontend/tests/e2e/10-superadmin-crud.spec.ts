import { test, expect, type Page } from '@playwright/test';

/**
 * Loyallia SuperAdmin E2E — Full Journey
 * Tests: Login → Metrics → Plans CRUD → Tenants Wizard (Natural/Jurídica) → Detail Modal → Sucursales Tab
 */

const SA_EMAIL = 'admin@loyallia.com';
const SA_PASS = '123456';
const UNIQUE = Date.now().toString(36);

async function loginSuperAdmin(page: Page) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', SA_EMAIL);
  await page.fill('input[type="password"]', SA_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(superadmin|dashboard)/, { timeout: 15000 });
}

test.describe('SuperAdmin Full Journey', () => {
  test.beforeEach(async ({ page }) => {
    await loginSuperAdmin(page);
  });

  // ── METRICS ──
  test('Metrics dashboard loads with charts and KPIs', async ({ page }) => {
    await page.goto('/superadmin/metrics/', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /Métricas/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Crecimiento de Plataforma')).toBeVisible();
    await expect(page.getByText('Distribución de Planes')).toBeVisible();
    await expect(page.locator('.recharts-responsive-container').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });

  // ── PLANS ──
  test('Plans page shows plan cards and opens detail modal', async ({ page }) => {
    await page.goto('/superadmin/plans/', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /Planes/i })).toBeVisible({ timeout: 10000 });

    // Click first plan card
    const planCards = page.locator('[style*="box-shadow"]').first();
    await planCards.click();

    // Detail modal should show edit button (specific button role)
    const editBtn = page.getByRole('button', { name: 'Editar Plan' });
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();
    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeVisible();

    // Close modal by clicking cancel
    await page.getByRole('button', { name: 'Cancelar' }).click();
  });

  test('Plans create modal has feature tag input (no JSON)', async ({ page }) => {
    await page.goto('/superadmin/plans/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: /Nuevo Plan/i }).click();
    await expect(page.getByText('Crear Plan').first()).toBeVisible({ timeout: 5000 });

    // Feature tag input should exist (not a textarea)
    const featureInput = page.locator('input[placeholder*="Google Wallet"]');
    await expect(featureInput).toBeVisible();

    // Add a feature tag
    await featureInput.fill('Google Wallet');
    await featureInput.press('Enter');

    // Tag should appear
    await expect(page.locator('span:has-text("Google Wallet")').first()).toBeVisible();

    // No textarea should exist on the form
    await expect(page.locator('textarea')).toHaveCount(0);

    await page.getByRole('button', { name: 'Cancelar' }).click();
  });

  // ── TENANTS WIZARD: JURÍDICA ──
  test('Tenant wizard creates Persona Jurídica', async ({ page }) => {
    await page.goto('/superadmin/tenants/', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Negocios' })).toBeVisible({ timeout: 10000 });

    await page.click('#btn-wizard-open');
    await expect(page.getByRole('heading', { name: /Registrar Nuevo/i })).toBeVisible({ timeout: 5000 });

    // Entity type selection — Jurídica default
    await expect(page.locator('#entity-juridica')).toBeVisible();
    await page.click('#entity-juridica');

    // RUC should be visible
    await expect(page.locator('#wiz-ruc')).toBeVisible();

    // Fill step 1
    await page.fill('#wiz-name', `TestEmpresa ${UNIQUE}`);
    await page.fill('#wiz-legal', `TESTEMPRESA ${UNIQUE} S.A.`);
    await page.fill('#wiz-ruc', '0992339324001');

    await page.click('#wiz-next');
    await expect(page.locator('#wiz-owner-email')).toBeVisible({ timeout: 5000 });

    // Fill step 2
    await page.fill('#wiz-owner-fn', 'Juan');
    await page.fill('#wiz-owner-ln', 'Pérez');
    await page.fill('#wiz-owner-email', `juan.${UNIQUE}@test.com`);

    await page.click('#wiz-next');
    await page.waitForTimeout(500);

    // Step 3: locations
    await page.click('#wiz-next');
    await page.waitForTimeout(500);

    // Step 4: summary should show Jurídica
    await expect(page.getByText('Persona Jurídica').first()).toBeVisible();

    // Submit
    await page.click('#wiz-submit');
    await expect(page.getByText('Negocio creado correctamente')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Password Temporal')).toBeVisible();
  });

  // ── TENANTS WIZARD: NATURAL ──
  test('Tenant wizard creates Persona Natural', async ({ page }) => {
    await page.goto('/superadmin/tenants/', { waitUntil: 'networkidle' });
    await page.click('#btn-wizard-open');
    await expect(page.getByRole('heading', { name: /Registrar/i })).toBeVisible({ timeout: 5000 });

    // Switch to Natural
    await page.click('#entity-natural');
    await expect(page.locator('#wiz-cedula')).toBeVisible();

    await page.fill('#wiz-name', `María ${UNIQUE} Café`);
    await page.fill('#wiz-legal', `María López ${UNIQUE}`);
    await page.fill('#wiz-cedula', '1712345678');

    await page.click('#wiz-next');
    await page.fill('#wiz-owner-fn', 'María');
    await page.fill('#wiz-owner-ln', `López${UNIQUE}`);
    await page.fill('#wiz-owner-email', `maria.${UNIQUE}@test.com`);

    await page.click('#wiz-next');
    await page.click('#wiz-next');

    await expect(page.getByText('Persona Natural').first()).toBeVisible();

    await page.click('#wiz-submit');
    await expect(page.getByText('Negocio creado correctamente')).toBeVisible({ timeout: 15000 });
  });

  // ── TENANT DETAIL MODAL ──
  test('Tenant detail modal tabs work', async ({ page }) => {
    await page.goto('/superadmin/tenants/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Click first tenant row
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });
    await firstRow.click();

    // Info tab content
    await expect(page.getByText('Razón Social').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /Editar Información/i })).toBeVisible();

    // Sucursales tab
    await page.getByRole('button', { name: /Sucursales/i }).click();
    await page.waitForTimeout(2000);
    await expect(page.getByText('sucursales registradas')).toBeVisible({ timeout: 8000 });

    // Actions tab
    await page.getByRole('button', { name: /Acciones/i }).click();
    await expect(page.getByText('Estado del Negocio')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Impersonar' })).toBeVisible();

    // Close
    await page.keyboard.press('Escape');
  });

  test('Tenant edit mode toggles', async ({ page }) => {
    await page.goto('/superadmin/tenants/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.locator('table tbody tr').first().click();
    const editBtn = page.getByRole('button', { name: /Editar Información/i });
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();

    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeVisible({ timeout: 3000 });
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('button', { name: /Editar Información/i })).toBeVisible({ timeout: 3000 });
  });
});
