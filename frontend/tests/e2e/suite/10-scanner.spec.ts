/**
 * Suite 10 — Scanner PWA (STAFF role)
 * Tests that STAFF lands on scanner, sees UI elements, and is isolated from dashboard.
 */
import { test, expect } from '@playwright/test';

test.describe('Scanner — STAFF @staff @scanner', () => {
  test.use({ storageState: '.auth/staff.json' });

  test('STAFF lands on scanner page after login @staff', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/.*scanner.*/, { timeout: 15000 });
  });

  test('STAFF sees scanner UI elements @staff', async ({ page }) => {
    await page.goto('/scanner/scan', { waitUntil: 'networkidle' });
    // Main scanner area should be visible
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible({ timeout: 15000 });
  });

  test('STAFF cannot access dashboard routes @staff', async ({ page }) => {
    await page.goto('/programs', { waitUntil: 'domcontentloaded' });
    await page.waitForURL((url) => !url.toString().includes('/programs'), { timeout: 15000 });
  });

  test('STAFF cannot access settings @staff', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForURL((url) => !url.toString().includes('/settings'), { timeout: 15000 });
  });

});
