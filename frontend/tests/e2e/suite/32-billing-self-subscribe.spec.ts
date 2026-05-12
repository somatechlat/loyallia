/**
 * Suite 32 — Billing Self-Subscribe E2E
 * Tests the flow for an Owner to subscribe to a paid plan.
 */
import { test, expect } from '@playwright/test';

test.describe('Owner — Billing @owner', () => {

  test('Owner can select a plan and subscribe', async ({ page }) => {
    // Assuming logged in as owner
    await page.goto('/settings/billing', { waitUntil: 'domcontentloaded' });
    
    // Look for "Upgrade" or "Cambiar Plan" button
    await page.getByRole('button', { name: /Cambiar Plan/i }).click();
    
    // Select Professional Plan
    await page.getByRole('button', { name: /Elegir Professional/i }).click();
    
    // Verify checkout modal or redirect
    await expect(page.getByText(/Resumen de Compra/i)).toBeVisible({ timeout: 10000 });
    
    // Confirm subscription
    await page.getByRole('button', { name: /Confirmar Suscripción/i }).click();
    
    // Success message
    await expect(page.getByText(/Suscripción activada con éxito/i)).toBeVisible({ timeout: 15000 });
  });

});
