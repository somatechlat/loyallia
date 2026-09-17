/**
 * DEBUG: Full enrollment-to-wallet flow test
 * Captures screenshots at every step to identify where the flow breaks.
 */
import { test, expect } from '@playwright/test';
import { getE2EBaseURL, loginRole } from '../helpers/e2e-safety';

const BASE_API = getE2EBaseURL();

test.describe('Wallet Add Debug @wallet', () => {

  test('Full enrollment + wallet add flow', async ({ page, request }) => {
    // Step 1: Get a valid card ID
    const token = await loginRole(request, 'owner');
    const cardsResp = await request.get(`${BASE_API}/api/v1/cards/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const cardsBody = await cardsResp.json();
    const programs = cardsBody.programs || cardsBody;
    expect(programs.length, 'Need at least one program').toBeGreaterThan(0);
    const cardId = programs[0].id;
    const cardName = programs[0].name;
    console.log(`Using card: ${cardName} (${cardId})`);

    // Step 2: Navigate to enrollment page
    await page.goto(`/enroll/${cardId}`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'test-results/wallet-debug/01-enrollment-page.png', fullPage: true });

    // Check if page loaded correctly (not "Programa no encontrado")
    const pageContent = await page.textContent('body');
    if (pageContent?.includes('no encontrado') || pageContent?.includes('not found')) {
      console.log('ERROR: Program not found on enrollment page');
      console.log('Page content:', pageContent?.substring(0, 500));
    }

    // Step 3: Fill the enrollment form
    const firstNameInput = page.locator('input').first();
    await firstNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await firstNameInput.fill('E2E');

    const lastNameInput = page.locator('input').nth(1);
    await lastNameInput.fill('WalletTest');

    const emailInput = page.locator('input[type="email"]').first();
    const uniqueEmail = `e2e-wallet-${Date.now()}@test.com`;
    await emailInput.fill(uniqueEmail);
    console.log(`Enrolling with email: ${uniqueEmail}`);

    // Check privacy checkbox if present
    const privacyCheckbox = page.locator('input[type="checkbox"]').first();
    if (await privacyCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await privacyCheckbox.check();
      console.log('Privacy checkbox checked');
    }

    await page.screenshot({ path: 'test-results/wallet-debug/02-form-filled.png', fullPage: true });

    // Step 4: Submit the form
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await submitBtn.click();
      console.log('Submit button clicked');
    } else {
      // Try alternative submit buttons
      const altBtn = page.getByRole('button', { name: /inscribir|enroll|submit|registr/i }).first();
      if (await altBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await altBtn.click();
        console.log('Alternative submit button clicked');
      } else {
        console.log('ERROR: No submit button found');
      }
    }

    // Wait for response
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/wallet-debug/03-after-submit.png', fullPage: true });

    // Step 5: Check what's on screen after submission
    const bodyText = await page.textContent('body');
    console.log('After submit - page contains:');
    console.log('  success:', bodyText?.includes('éxito') || bodyText?.includes('success') || bodyText?.includes('Exitosamente'));
    console.log('  error:', bodyText?.includes('error') || bodyText?.includes('Error'));
    console.log('  already enrolled:', bodyText?.includes('ya está') || bodyText?.includes('already'));
    console.log('  wallet:', bodyText?.includes('Wallet') || bodyText?.includes('wallet') || bodyText?.includes('billetera'));
    console.log('  apple:', bodyText?.includes('Apple') || bodyText?.includes('apple'));
    console.log('  google:', bodyText?.includes('Google') || bodyText?.includes('google'));

    // Step 6: Look for wallet buttons
    const appleBtn = page.locator('#add-apple-wallet-btn').or(page.getByRole('button', { name: /apple wallet/i }));
    const googleBtn = page.locator('#add-google-wallet-btn').or(page.getByRole('button', { name: /google wallet/i }));

    const appleVisible = await appleBtn.isVisible({ timeout: 5000 }).catch(() => false);
    const googleVisible = await googleBtn.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Apple wallet button visible: ${appleVisible}`);
    console.log(`Google wallet button visible: ${googleVisible}`);

    // Also check for any generic wallet/add buttons
    const allButtons = page.locator('button');
    const buttonCount = await allButtons.count();
    console.log(`Total buttons on page: ${buttonCount}`);
    for (let i = 0; i < Math.min(buttonCount, 15); i++) {
      const text = await allButtons.nth(i).textContent().catch(() => '');
      const id = await allButtons.nth(i).getAttribute('id').catch(() => '');
      if (text?.trim()) {
        console.log(`  Button ${i}: "${text.trim()}" id="${id}"`);
      }
    }

    // Step 7: If wallet button is visible, try clicking it
    if (appleVisible) {
      console.log('Clicking Apple Wallet button...');
      // Listen for navigation
      const navPromise = page.waitForURL(/.*wallet.*/, { timeout: 10000 }).catch(() => null);
      await appleBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/wallet-debug/04-after-apple-click.png', fullPage: true });
      console.log('After Apple click - URL:', page.url());
    }

    // Step 8: Check for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.waitForTimeout(1000);
    if (errors.length > 0) {
      console.log('Console errors:', errors);
    }
  });
});
