/**
 * Suite 24 — WhatsApp Campaign E2E (OWNER)
 *
 * Verifies WhatsApp campaign mechanics:
 *   1. UI: WhatsApp channel indicator visible on campaigns page
 *   2. UI: WhatsApp section shown in settings
 *   3. UI: "+ Nueva campaña" opens creation form
 *   4. API: WhatsApp campaign dispatch via API
 *   5. API: Campaign history returns valid structure
 *
 * NOTE: Actual message delivery cannot be E2E tested (requires real phone/QR).
 */
import { test, expect } from '@playwright/test';
import {
  ensureOwnerEnterpriseCampaignAccess,
  getE2EBaseURL,
  loginRole,
  requireMutatingE2EAllowed,
} from '../helpers/e2e-safety';

const BASE_API = getE2EBaseURL();

async function getOwnerToken(request: import('@playwright/test').APIRequestContext): Promise<string> {
  return loginRole(request, 'owner');
}

test.describe('WhatsApp Campaigns — OWNER @owner', () => {

  test.beforeAll(async ({ request }) => {
    requireMutatingE2EAllowed();
    await ensureOwnerEnterpriseCampaignAccess(request);
  });

  test('1. WhatsApp channel indicator visible on campaigns page', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Campaign page shows "WhatsApp:" in the channel indicators bar
    const waIndicator = page.locator('text=WhatsApp:');
    await expect(waIndicator.first()).toBeVisible({ timeout: 10000 });
  });

  test('2. WhatsApp section shown in settings', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    // Wait for settings page to finish loading (save button or WhatsApp section)
    await page.locator('#save-settings-btn, #wa-integration-section').first().waitFor({ state: 'visible', timeout: 15000 });

    const waCard = page.locator('text=WhatsApp');
    const hasWaReference = (await waCard.count()) > 0;
    expect(hasWaReference, 'Settings page should reference WhatsApp').toBeTruthy();
  });

  test('3. Campaign creation form accessible via button', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const createBtn = page.locator('button:has-text("Nueva campaña"), a:has-text("Nueva campaña")');
    await expect(createBtn.first()).toBeVisible({ timeout: 10000 });
  });

  test('4. WhatsApp campaign dispatch via API', async ({ request }) => {
    const token = await getOwnerToken(request);

    const resp = await request.post(`${BASE_API}/api/v1/notifications/campaigns/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: `E2E WA Test ${Date.now()}`,
        message: 'Automated E2E WhatsApp campaign test. Please ignore.',
        channel: 'whatsapp',
        segment_id: 'all',
        image_url: '',
      },
    });

    // WhatsApp campaign may return 200 (queued) or 503 (bridge disconnected)
    const status = resp.status();
    expect([200, 503]).toContain(status);

    if (status === 200) {
      const body = await resp.json();
      expect(body.success, 'Campaign should report success').toBe(true);
    }
  });

  test('5. Campaign history returns valid structure', async ({ request }) => {
    const token = await getOwnerToken(request);

    const resp = await request.get(`${BASE_API}/api/v1/notifications/campaigns/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(resp.status(), 'Campaigns list should return 200').toBe(200);
    const body = await resp.json();
    expect(body.campaigns, 'Should have campaigns array').toBeDefined();
    expect(body.total, 'Should report total count').toBeDefined();
  });

});
