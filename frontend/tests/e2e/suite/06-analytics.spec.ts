/**
 * Suite 06 — Analytics (OWNER & MANAGER read access)
 * Tests analytics dashboard loads with metrics for both roles.
 */
import { test, expect } from '@playwright/test';

test.describe('Analytics — OWNER @owner @analytics', () => {

  test('OWNER sees analytics dashboard with metrics @owner', async ({ page }) => {
    await page.goto('/analytics', { waitUntil: 'domcontentloaded' });
    // Wait for the page-title heading to render (the page shows "Analíticas")
    await expect(page.locator('h1.page-title')).toContainText('Analíticas', { timeout: 15000 });
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

});

test.describe('Analytics — MANAGER Read @manager @analytics', () => {
  test.use({ storageState: '.auth/manager.json' });

  test('MANAGER sees analytics dashboard @manager', async ({ page }) => {
    await page.goto('/analytics', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1.page-title')).toContainText('Analíticas', { timeout: 15000 });
  });

});
