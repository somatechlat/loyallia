/**
 * Suite 27 — Tenant Creation Wizard E2E
 * Tests the new 4-step tenant creation flow:
 * 1. Plan Selection
 * 2. Entity & Data
 * 3. Owner
 * 4. Locations
 */
import { test, expect } from '@playwright/test';

test.describe('SuperAdmin — Tenant Creation Wizard @superadmin @superadmin', () => {

  test('SA can create a tenant using the 4-step wizard', async ({ page }) => {
    test.setTimeout(90000);
    const suffix = Date.now();
    const tenantName = `E2E Tenant ${suffix}`;
    const ownerEmail = `e2e-owner-${suffix}@example.com`;

    await page.goto('/superadmin/tenants', { waitUntil: 'domcontentloaded' });

    // Open wizard
    await page.locator('#btn-wizard-open').click();
    await expect(page.getByRole('heading', { name: 'Registrar Nuevo Negocio' })).toBeVisible({ timeout: 10000 });

    // Step 1: Plan Selection
    await expect(page.getByText('Plan y Facturación')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /Starter/i }).first().click();
    await page.locator('#wiz-next').click();

    // Step 2: Entity & Data
    await expect(page.getByText('Datos del Negocio')).toBeVisible({ timeout: 5000 });
    await page.locator('#wiz-name').fill(tenantName);
    await page.locator('#wiz-legal').fill(`${tenantName} S.A.`);
    await page.locator('#wiz-ruc').fill('1790000000001');
    await page.locator('input[placeholder="info@empresa.com.ec"]').fill(`tenant-${suffix}@example.com`);
    await page.locator('#wiz-next').click();

    // Step 3: Owner
    await expect(page.getByText('Propietario / Administrador')).toBeVisible({ timeout: 5000 });
    await page.locator('#wiz-owner-fn').fill('John');
    await page.locator('#wiz-owner-ln').fill('Doe');
    await page.locator('#wiz-owner-email').fill(ownerEmail);
    await page.locator('#wiz-next').click();

    // Step 4: Locations
    await expect(page.getByRole('heading', { name: 'Sucursales' })).toBeVisible({ timeout: 5000 });
    await page.locator('input[placeholder="Mall del Sol"]').fill('Matriz E2E');
    await page.locator('input[placeholder="Guayaquil"]').fill('Quito');

    // Submit
    await page.locator('#wiz-submit').click();

    await expect(page.getByText('Negocio creado correctamente')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(ownerEmail)).toBeVisible();
  });

});
