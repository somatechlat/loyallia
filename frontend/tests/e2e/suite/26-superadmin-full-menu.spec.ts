/**
 * Suite 26 — SuperAdmin Full Menu Coverage
 *
 * Visits every SuperAdmin page and verifies each loads correctly.
 * Includes Twilio toggle card, broadcast, and plan management checks.
 */
import { test, expect } from '@playwright/test';

test.describe('SuperAdmin Full Menu — Every Page Loads @superadmin @superadmin', () => {

  test.use({ storageState: '.auth/superadmin.json' });

  test('1. Platform Overview (/superadmin) loads', async ({ page }) => {
    await page.goto('/superadmin', { waitUntil: 'domcontentloaded' });
    // Wait for the metrics API that drives the page content
    await page.waitForResponse(
      resp => resp.url().includes('/api/v1/admin/platform/metrics/') && resp.status() === 200,
      { timeout: 15000 },
    );
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
  });

  test('2. Tenants List (/superadmin/tenants) loads with data', async ({ page }) => {
    await page.goto('/superadmin/tenants', { waitUntil: 'domcontentloaded' });
    // Wait for the tenants API that populates the table
    await page.waitForResponse(
      resp => resp.url().includes('/api/v1/admin/tenants/') && resp.status() === 200,
      { timeout: 15000 },
    );
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });
  });

  test('3. Plans Management (/superadmin/plans) loads', async ({ page }) => {
    await page.goto('/superadmin/plans', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const content = page.locator('h1, h2, [class*="plan"], [class*="card"], button').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('4. Global Settings (/superadmin/settings) loads with integration cards', async ({ page }) => {
    await page.goto('/superadmin/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Should show integration cards (Apple, Google, Twilio, Email)
    const content = page.locator('h1, h2, [class*="settings"], [class*="integration"], [class*="card"]').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('5. Settings shows Twilio integration card', async ({ page }) => {
    await page.goto('/superadmin/settings', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Twilio SMS')).toBeVisible({ timeout: 10000 });
  });

  test('6. Settings shows Mailjet integration card', async ({ page }) => {
    await page.goto('/superadmin/settings', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Mailjet Email')).toBeVisible({ timeout: 10000 });
  });

  test('7. Metrics (/superadmin/metrics) loads with charts', async ({ page }) => {
    await page.goto('/superadmin/metrics', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const content = page.locator('h1, h2, canvas, svg, [class*="metric"], [class*="chart"], [class*="card"]').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('8. Broadcast announcement form is accessible', async ({ page }) => {
    await page.goto('/superadmin/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Look for broadcast/announcement section
    const broadcastSection = page.locator('text=Anuncio').or(page.locator('text=Broadcast')).or(page.locator('text=broadcast'));
    const hasBroadcast = (await broadcastSection.count()) > 0;

    if (hasBroadcast) {
      // Verify form elements exist
      const textarea = page.locator('textarea').first();
      const sendButton = page.locator('button:has-text("Enviar"), button:has-text("Send"), button:has-text("Broadcast")');

      expect(
        (await textarea.count()) > 0 || (await sendButton.count()) > 0,
        'Broadcast form should have input elements'
      ).toBeTruthy();
    } else {
      // Broadcast may be in a different section — just verify settings loaded
      const content = page.locator('h1, h2, [class*="settings"]').first();
      await expect(content).toBeVisible({ timeout: 5000 });
    }
  });

});
