/**
 * Suite 30 — Impersonation Flow E2E
 * Tests SuperAdmin impersonating an Owner.
 */
import { test, expect } from '@playwright/test';

test.describe('SuperAdmin — Impersonation @superadmin', () => {

  test('SA can impersonate an owner and return to SA', async ({ page }) => {
    await page.goto('/superadmin/tenants', { waitUntil: 'domcontentloaded' });
    
    // Search for a specific tenant or click the first one
    const firstTenant = page.locator('table tbody tr').first();
    await expect(firstTenant).toBeVisible({ timeout: 15000 });
    await firstTenant.click();
    
    // Go to Owners tab
    await page.getByRole('button', { name: /Propietarios/i }).click();
    
    // Click Login As
    const loginAsBtn = page.getByRole('button', { name: /Iniciar Sesión Como/i }).first();
    await loginAsBtn.click();
    
    // Should be redirected to Owner dashboard
    await expect(page.locator('nav, aside').getByText(/Dashboard/i)).toBeVisible({ timeout: 10000 });
    
    // Verify impersonation banner exists
    const banner = page.getByText(/Estás viendo la plataforma como/i);
    await expect(banner).toBeVisible({ timeout: 5000 });
    
    // Click Return to SuperAdmin
    await page.getByRole('button', { name: /Volver/i }).click();
    
    // Verify back to SuperAdmin
    await expect(page.locator('nav, aside').getByText('Plataforma')).toBeVisible({ timeout: 10000 });
  });

});
