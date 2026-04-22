import { test, expect } from '@playwright/test';

test.describe('Customer Enrollment Journeys', () => {
  test('Customer can access Zero-Friction Enrollment unconditionally', async ({ page }) => {
    // Navigate to a dynamic tenant enrollment link
    await page.goto('/enroll?tenant=loyallia', { waitUntil: 'domcontentloaded' });
    
    // We expect the customer facing enrollment page to render without a 401 redirect
    await expect(page).toHaveURL(/.*enroll.*/);
  });
});
