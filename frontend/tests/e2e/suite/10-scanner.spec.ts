/**
 * Suite 10 — Scanner PWA (STAFF role)
 * Tests that STAFF lands on scanner, sees UI elements, and is isolated from dashboard.
 */
import { test, expect } from '@playwright/test';

test.describe('Scanner — STAFF @staff', () => {

  test('STAFF lands on scanner page after login @staff', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // STAFF should be redirected to scanner
    await expect(page).toHaveURL(/.*scanner.*/);
  });

  test('STAFF sees scanner UI elements @staff', async ({ page }) => {
    await page.goto('/scanner/scan', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Main scanner area should be visible
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('STAFF cannot access dashboard routes @staff', async ({ page }) => {
    // Try to navigate to programs — should redirect or show error
    await page.goto('/programs', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Should NOT be on /programs — either redirected to scanner or login
    const url = page.url();
    expect(url).not.toContain('/programs');
  });

  test('STAFF cannot access settings @staff', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).not.toContain('/settings');
  });

});
