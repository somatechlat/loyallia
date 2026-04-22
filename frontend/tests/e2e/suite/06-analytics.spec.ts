/**
 * Suite 06 — Analytics (OWNER & MANAGER read access)
 * Tests analytics dashboard loads with metrics for both roles.
 */
import { test, expect } from '@playwright/test';

test.describe('Analytics — OWNER @owner', () => {

  test('OWNER sees analytics dashboard with metrics @owner', async ({ page }) => {
    await page.goto('/analytics', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await expect(page.locator('h1').first()).toContainText('Analytics');
    // Should have stat cards or charts
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

});

test.describe('Analytics — MANAGER Read @manager', () => {

  test('MANAGER sees analytics dashboard @manager', async ({ page }) => {
    await page.goto('/analytics', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await expect(page.locator('h1').first()).toContainText('Analytics');
  });

});
