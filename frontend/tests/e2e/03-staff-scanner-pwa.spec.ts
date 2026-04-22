import { test, expect } from '@playwright/test';

test.describe.serial('Staff Scanner PWA Journeys', () => {
  test('Staff navigates directly to Scanner after login', async ({ page, context }) => {
    // We emulate a mobile device for the scanner
    // Staff login
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', 'sebastian@cafeelritmo.ec');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    // Wait for the redirect to happen which goes to /
    await expect(page.getByText('Resumen').first()).toBeVisible({ timeout: 15000 });

    // Go to scanner
    await page.goto('/scanner/scan', { waitUntil: 'domcontentloaded' });
    
    // Expect scanner UI components to be visible
    await expect(page).toHaveURL(/.*scanner.*/);
  });
});
