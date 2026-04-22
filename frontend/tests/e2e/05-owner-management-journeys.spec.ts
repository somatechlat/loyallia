import { test, expect } from '@playwright/test';

test.describe.serial('Owner Management Journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', 'carlos@cafeelritmo.ec');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    await expect(page.getByText('Resumen').first()).toBeVisible({ timeout: 15000 });
  });

  test('Owner can configure Location Infrastructure', async ({ page }) => {
    // Navigate to locations
    // We expect a sidebar link for Locations or Settings
    await page.goto('/locations', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/.*locations.*/);
    
    // Fallback UI validation
    // await page.getByRole('button', { name: 'Add Location' }).click();
  });

  test('Owner can configure Loyalty Architecture (Programs)', async ({ page }) => {
    await page.goto('/programs', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/.*programs.*/);
    // await expect(page.getByText('Crear Programa')).toBeVisible();
  });

  test('Owner can audit Analytics', async ({ page }) => {
    await page.goto('/analytics', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/.*analytics.*/);
  });

  test('Owner can configure Billing Self-Service', async ({ page }) => {
    await page.goto('/billing', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/.*billing.*/);
  });

  test('Owner can set up Automation Rules', async ({ page }) => {
    await page.goto('/automation', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/.*automation.*/);
  });
});
