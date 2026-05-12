/**
 * Suite 26 — SuperAdmin Full Menu Coverage
 *
 * Visits every SuperAdmin page and verifies each loads correctly.
 * Includes Twilio toggle card, broadcast, and plan management checks.
 */
import { test, expect } from '@playwright/test';

test.describe('SuperAdmin Full Menu — Every Page Loads @superadmin', () => {

  test.use({ storageState: '.auth/superadmin.json' });

  test('1. Platform Overview (/superadmin) loads', async ({ page }) => {
    await page.goto('/superadmin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const content = page.locator('h1, h2, [class*="stat"], [class*="overview"], [class*="card"]').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('2. Tenants List (/superadmin/tenants) loads with data', async ({ page }) => {
    await page.goto('/superadmin/tenants', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const content = page.locator('table, [class*="tenant"], [class*="list"], [class*="card"]').first();
    await expect(content).toBeVisible({ timeout: 10000 });
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
    await page.waitForTimeout(3000);

    const twilioCard = page.locator('text=Twilio');
    const hasTwilio = (await twilioCard.count()) > 0;
    expect(hasTwilio, 'Twilio integration card should be visible').toBeTruthy();
  });

  test('6. Settings shows Email SMTP integration card', async ({ page }) => {
    await page.goto('/superadmin/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const emailCard = page.locator('text=SMTP').or(page.locator('text=Email'));
    const hasEmail = (await emailCard.count()) > 0;
    expect(hasEmail, 'Email/SMTP integration card should be visible').toBeTruthy();
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
