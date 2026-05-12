/**
 * Suite 28 — Tenant Lifecycle E2E
 * Tests suspend/reactivate flows and trial extension cap.
 */
import { test, expect } from '@playwright/test';

test.describe('SuperAdmin — Tenant Lifecycle @superadmin', () => {

  test('SA can suspend and reactivate a tenant', async ({ page }) => {
    await page.goto('/superadmin/tenants', { waitUntil: 'domcontentloaded' });
    
    // Search for a specific tenant or click the first one
    const firstTenant = page.locator('table tbody tr').first();
    await expect(firstTenant).toBeVisible({ timeout: 15000 });
    await firstTenant.click();
    
    // Suspend
    await page.getByRole('button', { name: /Suspender Negocio/i }).click();
    // Assuming a confirm dialog or modal
    const confirmButton = page.getByRole('button', { name: /Confirmar Suspensión/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    
    await expect(page.getByText(/Suspendido/i).first()).toBeVisible({ timeout: 5000 });
    
    // Reactivate
    await page.getByRole('button', { name: /Reactivar Negocio/i }).click();
    const reactivateConfirm = page.getByRole('button', { name: /Confirmar Reactivación/i });
    if (await reactivateConfirm.isVisible()) {
      await reactivateConfirm.click();
    }
    await expect(page.getByText(/Activo/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('SA can extend trial up to 90 days', async ({ page }) => {
    await page.goto('/superadmin/tenants', { waitUntil: 'domcontentloaded' });
    
    const firstTenant = page.locator('table tbody tr').first();
    await expect(firstTenant).toBeVisible({ timeout: 15000 });
    await firstTenant.click();
    
    // Extend trial button
    await page.getByRole('button', { name: /Extender Prueba/i }).click();
    
    // Should see a modal with days input
    await page.getByLabel(/Días/i).fill('30');
    await page.getByRole('button', { name: /Extender/i }).click();
    
    await expect(page.getByText(/Prueba extendida/i)).toBeVisible({ timeout: 5000 });
    
    // Try to extend beyond 90 days (should show error or cap)
    await page.getByRole('button', { name: /Extender Prueba/i }).click();
    await page.getByLabel(/Días/i).fill('100');
    await page.getByRole('button', { name: /Extender/i }).click();
    
    // Expect 400 validation error in UI
    await expect(page.getByText(/límite máximo/i)).toBeVisible({ timeout: 5000 });
  });

});
