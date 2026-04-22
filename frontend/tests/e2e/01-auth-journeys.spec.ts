import { test, expect } from '@playwright/test';

test.describe('Authentication Journeys', () => {

  test('Owner can login successfully and view dashboard', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Expect login page to be visible
    await expect(page.getByText('Iniciar sesión').first()).toBeVisible();

    // Fill in credentials for Owner
    // Assuming standard email/password inputs and a submit button
    await page.fill('input[type="email"]', 'carlos@cafeelritmo.ec');
    await page.fill('input[type="password"]', '123456');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Check we got routed properly
    // The dashboard is at '/'
    await expect(page.getByText('Resumen').first()).toBeVisible({ timeout: 15000 });
  });

  test('Staff can login successfully and access scanner route', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    await page.fill('input[type="email"]', 'sebastian@cafeelritmo.ec');
    await page.fill('input[type="password"]', '123456');
    
    await Promise.all([
      page.waitForNavigation(),
      page.click('button[type="submit"]')
    ]);

    // Assuming the system redirects staff to the scanner or they can navigate
    // to /scanner
    await page.goto('/scanner');
    await expect(page).toHaveURL(/.*scanner.*/);
  });

});
