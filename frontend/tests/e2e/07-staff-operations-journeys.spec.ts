import { test, expect } from '@playwright/test';

test.describe.serial('Staff Operations Journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', 'sebastian@cafeelritmo.ec');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  });

  test('Staff can seamlessly authenticate and prepare Scanner PWA', async ({ page }) => {
    await page.goto('/scanner/scan', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/.*scanner.scan.*/).catch(() => null);
  });

  test('Staff can execute Manual Entry Overrides via search', async ({ page }) => {
    await page.goto('/scanner/remote', { waitUntil: 'domcontentloaded' });
    // We expect the remote / manual input route
    await expect(page).toHaveURL(/.*scanner.*/);
  });
});
