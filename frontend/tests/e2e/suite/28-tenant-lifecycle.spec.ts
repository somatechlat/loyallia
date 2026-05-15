/**
 * Suite 28 — Tenant Lifecycle E2E
 * Tests suspend/reactivate flows and trial extension cap.
 */
import { test, expect } from '@playwright/test';

test.describe('SuperAdmin — Tenant Lifecycle @superadmin', () => {

  test('SA can suspend and reactivate a tenant', async ({ page }) => {
    await page.goto('/superadmin/tenants', { waitUntil: 'domcontentloaded' });

    // Suite 27 creates an 'E2E Tenant {timestamp}' — use partial match
    const tenantRow = page.locator('table tbody tr', { hasText: 'E2E Tenant' }).first();
    await expect(tenantRow).toBeVisible({ timeout: 15000 });
    await tenantRow.click();
    await page.getByRole('button', { name: 'Acciones' }).click();

    // Suspend
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /Suspender Negocio/i }).click();
    await expect(page.locator('table tbody tr', { hasText: 'E2E Tenant' }).first()).toContainText('Suspendido', { timeout: 15000 });

    // Reactivate
    await page.locator('table tbody tr', { hasText: 'E2E Tenant' }).first().click();
    await page.getByRole('button', { name: 'Acciones' }).click();
    await page.getByRole('button', { name: /Reactivar Negocio/i }).click();
    await expect(page.locator('table tbody tr', { hasText: 'E2E Tenant' }).first()).toContainText('Activo', { timeout: 15000 });
  });

  test('SA tenant detail exposes actions and technical information', async ({ page }) => {
    await page.goto('/superadmin/tenants', { waitUntil: 'domcontentloaded' });

    const tenantRow = page.locator('table tbody tr', { hasText: 'E2E Tenant' }).first();
    await expect(tenantRow).toBeVisible({ timeout: 15000 });
    await tenantRow.click();
    await page.getByRole('button', { name: 'Acciones' }).click();

    await expect(page.getByText('Estado del Negocio')).toBeVisible();
    await expect(page.getByText('Información Técnica')).toBeVisible();
    await expect(page.getByText(/ID:/)).toBeVisible();
    await expect(page.getByText(/Slug:/)).toBeVisible();
  });

});
