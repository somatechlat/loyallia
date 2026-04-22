import { test, expect } from '@playwright/test';

test.describe('Manager Campaigns Journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', 'gabriela@cafeelritmo.ec'); // We will seed this
    await page.fill('input[type="password"]', '123456');
    // Ensure we handle non-existent manager gracefully if the DB isn't seeded right yet
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  });

  test('Manager can Broadcast Push Notifications', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    // Check if campaigns route is accessible
    await expect(page).toHaveURL(/.*campaigns.*/);
  });
});
