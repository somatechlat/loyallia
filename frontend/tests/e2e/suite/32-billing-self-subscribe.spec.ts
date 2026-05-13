/**
 * Suite 32 — Owner Billing E2E
 * Verifies the billing page for the current seeded owner subscription.
 */
import { test, expect } from '@playwright/test';

test.describe('Owner — Billing @owner', () => {

  test('Owner billing page shows current plan and usage controls', async ({ page }) => {
    await page.goto('/billing', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#billing-view')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Facturación' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cambiar plan|Mejorar plan/i })).toBeVisible();
    await expect(page.getByText(/Enterprise|Professional|Starter|Prueba Gratuita/i).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Consumo del plan' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Comparar planes' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Starter' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Professional' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Enterprise' })).toBeVisible();
  });

});
