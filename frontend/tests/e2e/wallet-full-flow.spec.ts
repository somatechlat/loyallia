import { test, expect } from '@playwright/test';

/**
 * E2E Test — Customer Enrollment & Google Wallet Flow
 * Journey: Navigate to Enrollment -> Fill Form -> Enroll -> Click 'Add to Google Wallet'
 */
test.describe('Customer Wallet Enrollment Flow', () => {
  const CARD_ID = 'f9dbaffc-42e1-4895-a955-b41b1a3e93ba'; // Active card ID found in DB
  const TEST_CUSTOMER = {
    first_name: 'Test',
    last_name: 'User',
    email: `tester${Date.now()}@loyallia.test`,
    phone: '0999999999',
  };

  test('complete enrollment and trigger google wallet redirect', async ({ page }) => {
    console.log(`📝 Starting enrollment for card: ${CARD_ID}`);
    
    // 1. Go to enrollment page
    await page.goto(`/enroll/?card_id=${CARD_ID}`, { waitUntil: 'networkidle' });
    
    // Verify we are on the right page
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    console.log('✅ Enrollment page loaded');

    // 2. Fill enrollment form
    await page.fill('input[id="first_name"]', TEST_CUSTOMER.first_name);
    await page.fill('input[id="last_name"]', TEST_CUSTOMER.last_name);
    await page.fill('input[id="email"]', TEST_CUSTOMER.email);
    await page.fill('input[id="phone"]', TEST_CUSTOMER.phone);
    
    // Accept terms if any (checkbox)
    const terms = page.locator('input[type="checkbox"]');
    if (await terms.isVisible()) {
      await terms.check();
    }

    // 3. Click Enroll
    console.log('🚀 Submitting enrollment...');
    await page.click('button[type="submit"]');
    
    // 4. Wait for success step
    // The page should show "Inscripción exitosa" or the wallet buttons
    await expect(page.getByText(/Inscripción exitosa/i)).toBeVisible({ timeout: 15000 });
    console.log('✅ Enrollment successful');

    // 5. Verify Wallet buttons are visible
    const googleBtn = page.locator('button:has-text("Google Wallet")');
    await expect(googleBtn).toBeVisible({ timeout: 5000 });
    console.log('✅ Google Wallet button is visible');

    // 6. Click 'Add to Google Wallet' and intercept redirect
    console.log('🖱️ Clicking Google Wallet button...');
    
    // Monitor for the API call to get the save URL
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/v1/wallet/google/'), { timeout: 10000 }),
      googleBtn.click(),
    ]);

    expect(response.status()).toBe(200);
    const data = await response.json();
    console.log('✅ API returned save_url');
    expect(data.save_url).toContain('pay.google.com/gp/v/save');

    // Due to the redirect, the page URL should change to pay.google.com
    // We don't want to actually load the Google page in headless test as it might fail due to cookies/auth,
    // so we just verify the redirect intention.
    
    // In Playwright, we can check if the current URL changed or if a new page opened.
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    console.log(`Final URL: ${currentUrl}`);
    
    // If it redirected, the URL should be pay.google.com
    // Note: window.location.href changes the origin, so Playwright might lose tracking if not handled.
  });
});
