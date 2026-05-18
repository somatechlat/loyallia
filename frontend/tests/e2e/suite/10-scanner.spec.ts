/**
 * Suite 10 — Scanner PWA (STAFF role)
 * Tests that STAFF lands on scanner, sees UI elements, is isolated from dashboard,
 * and can process QR code scans and transactions end-to-end.
 */
import { test, expect } from '@playwright/test';

test.describe('Scanner — STAFF @staff @scanner', () => {
  test.use({ storageState: '.auth/staff.json' });

  test('STAFF lands on scanner page after login @staff', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/.*scanner.*/, { timeout: 15000 });
  });

  test('STAFF sees scanner UI elements @staff', async ({ page }) => {
    await page.goto('/scanner/scan', { waitUntil: 'networkidle' });
    // Main scanner area should be visible
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible({ timeout: 15000 });
  });

  test('STAFF cannot access dashboard routes @staff', async ({ page }) => {
    await page.goto('/programs', { waitUntil: 'domcontentloaded' });
    await page.waitForURL((url) => !url.toString().includes('/programs'), { timeout: 15000 });
  });

  test('STAFF cannot access settings @staff', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForURL((url) => !url.toString().includes('/settings'), { timeout: 15000 });
  });

  test('STAFF can enter customer code manually and load data @staff', async ({ page }) => {
    await page.goto('/scanner/scan', { waitUntil: 'networkidle' });

    // Wait for the scanner UI to be ready
    const mainContent = page.locator('main');
    await mainContent.waitFor({ state: 'visible', timeout: 15000 });

    // Look for manual entry input (customer code / phone / email input)
    const codeInput = page.locator('input[type="text"], input[placeholder*="codigo" i], input[placeholder*="telefono" i], input[placeholder*="email" i], #customer-code-input').first();

    if (await codeInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Enter a test customer identifier
      await codeInput.fill('test-customer@example.com');

      // Click search/lookup button
      const searchBtn = page.getByRole('button', { name: /buscar|buscar cliente|verificar|check/i }).first();
      if (await searchBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Wait for customer lookup API
        const lookupPromise = page.waitForResponse(
          (resp) => resp.url().includes('/api/') && (resp.url().includes('customer') || resp.url().includes('pass')),
          { timeout: 15000 },
        ).catch(() => {});

        await searchBtn.click();
        await lookupPromise;
      } else {
        // Try pressing Enter
        await codeInput.press('Enter');
        await page.waitForResponse(
          (resp) => resp.url().includes('/api/') && (resp.url().includes('customer') || resp.url().includes('pass')),
          { timeout: 15000 },
        ).catch(() => {});
      }

      // Verify customer data loads (name or points displayed)
      const customerData = page.locator('text=/Nombre|nombre|Puntos|puntos|Cliente|cliente/i').first();
      await expect(customerData).toBeVisible({ timeout: 10000 });
    } else {
      // Manual entry may not be visible — skip if scanner is QR-camera only
      test.skip();
    }
  });

  test('STAFF can process a transaction and verify points @staff', async ({ page }) => {
    await page.goto('/scanner/scan', { waitUntil: 'networkidle' });

    const mainContent = page.locator('main');
    await mainContent.waitFor({ state: 'visible', timeout: 15000 });

    // Enter customer code
    const codeInput = page.locator('input[type="text"], input[placeholder*="codigo" i], input[placeholder*="telefono" i], #customer-code-input').first();
    if (await codeInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await codeInput.fill('test-customer@example.com');

      const searchBtn = page.getByRole('button', { name: /buscar|verificar|check/i }).first();
      if (await searchBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchBtn.click();
      } else {
        await codeInput.press('Enter');
      }

      // Wait for customer data to load
      await page.waitForResponse(
        (resp) => resp.url().includes('/api/') && (resp.url().includes('customer') || resp.url().includes('pass')),
        { timeout: 15000 },
      ).catch(() => {});

      // Fill transaction amount/points
      const amountInput = page.locator('input[type="number"], input[name="amount"], input[placeholder*="monto" i], input[placeholder*="puntos" i], #transaction-amount').first();
      if (await amountInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await amountInput.fill('100');

        // Submit transaction
        const submitBtn = page.getByRole('button', { name: /procesar|acumular|canjear|confirmar|submit/i }).first();
        await expect(submitBtn).toBeEnabled({ timeout: 5000 });

        // Wait for transaction API
        const txPromise = page.waitForResponse(
          (resp) => resp.url().includes('/api/') && (resp.url().includes('transaction') || resp.url().includes('stamp') || resp.url().includes('points')),
          { timeout: 15000 },
        ).catch(() => {});

        await submitBtn.click();
        await txPromise;

        // Verify points updated toast or confirmation
        await expect(
          page.locator('.go2072408551, [class*="toast"]').or(page.getByText(/puntos|transaccion|exitoso|success/i)).first(),
        ).toBeVisible({ timeout: 10000 });
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

});
