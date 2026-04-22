import { test, expect } from '@playwright/test';

test.describe.serial('Owner Dashboard Journeys', () => {
  // Use a saved state if possible, or login before each
  test.beforeEach(async ({ page }) => {
    // Basic owner login
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', 'carlos@cafeelritmo.ec');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    // Wait for dashboard to load
    await expect(page.getByText('Resumen').first()).toBeVisible({ timeout: 15000 });
  });

  test('Owner can view core metrics on dashboard home', async ({ page }) => {
    // Should be on dashboard root /
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Resumen').first()).toBeVisible({ timeout: 15000 });
    
    // Check if some dashboard cards are visible
    // We expect some stat-cards (based on globals.css stat-card class or the UI elements)
    // E.g. Top Customers or Recent Transactions tables
    const dashboardLocators = page.locator('main');
    await expect(dashboardLocators).toBeVisible();
  });

  test('Owner can navigate to Campaigns', async ({ page }) => {
    await page.click('text="Campañas"');
    await expect(page).toHaveURL(/.*campaigns.*/);
  });
});
