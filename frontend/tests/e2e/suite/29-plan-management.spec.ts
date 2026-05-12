/**
 * Suite 29 — Plan Management E2E
 * Tests plan deactivation and active subscriber constraints.
 */
import { test, expect } from '@playwright/test';

test.describe('SuperAdmin — Plan Management @superadmin', () => {

  test('SA gets 409 conflict when deactivating plan with active subscriptions', async ({ page }) => {
    await page.goto('/superadmin/plans', { waitUntil: 'domcontentloaded' });
    
    // Find the Starter or Professional plan which presumably has an active sub from T1
    const planRow = page.locator('table tbody tr', { hasText: /Starter/i }).first();
    await expect(planRow).toBeVisible({ timeout: 15000 });
    
    // Open action menu and click deactivate
    await planRow.getByRole('button', { name: /Desactivar/i }).click();
    
    const confirmButton = page.getByRole('button', { name: /Confirmar/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    
    // Expect conflict error since there are active tenants on this plan
    await expect(page.getByText(/no se puede desactivar un plan con suscripciones activas/i)).toBeVisible({ timeout: 5000 });
  });

});
