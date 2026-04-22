import { test, expect } from '@playwright/test';

test.describe.serial('Geofencing & NFC Program Creation Journeys', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    
    // Login as a seeded owner
    await page.fill('input[type="email"]', 'carlos@cafeelritmo.ec');
    await page.fill('input[type="password"]', '123456');
    
    // Submit login
    await page.click('button[type=\"submit\"]');
    await page.waitForTimeout(2000);
  });

  test('Owner can create a new program with Wallet Geofences', async ({ page }) => {
    // Go to new program creation
    await page.goto('/programs/new', { waitUntil: 'domcontentloaded' });

    // Step 0: Select card type
    await page.click('id=card-type-cashback');
    await page.click('id=wizard-next');

    // Step 1: Config
    await page.click('id=wizard-next');

    // Step 2: Program configuration (Design)
    await page.fill('input#program-name', 'Geofence Test Program');
    await page.fill('textarea#program-desc', 'Test program for Apple / Google Wallet proximities.');

    // Step 2: Add Geofences via Manager
    // The previous implementation added an "add-geofence-btn" button or similar. Let's find by text.
    await page.getByRole('button', { name: /Agregar/i }).click();

    // Locators for dynamically generated inputs
    const locNames = page.getByPlaceholder('Ej: Sucursal Centro');
    const locLats = page.getByPlaceholder('Lat (-0.18)');
    const locLngs = page.getByPlaceholder('Lng (-78.48)');

    await locNames.first().fill('Test Store Location');
    await locLats.first().fill('-0.1806');
    await locLngs.first().fill('-78.4678');

    // Add another geofence
    await page.getByRole('button', { name: /Agregar/i }).click();
    await locNames.nth(1).fill('Secondary Store');
    await locLats.nth(1).fill('-0.2000');
    await locLngs.nth(1).fill('-78.5000');

    // Submit form (intercept API call to ensure locations array passes through)
    const requestPromise = page.waitForRequest(req => 
      req.url().includes('/api/v1/programs/') && 
      req.method() === 'POST'
    );

    await page.click('id=wizard-next');
    await page.getByRole('button', { name: /Crear Programa/i }).click();

    const request = await requestPromise;
    const postData = JSON.parse(request.postData() || '{}');
    
    // Verify our new locations parameter natively reached the backend payload untouched!
    expect(postData.locations).toBeDefined();
    expect(postData.locations.length).toBe(2);
    expect(postData.locations[0].name).toBe('Test Store Location');
    
    // Verify successful progression
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/.*programs\/.*/);
  });
});
