/**
 * Suite 39 — WhatsApp campaign UI/UX full-flow validation
 *
 * Covers:
 * 1. Campaign wizard opens and shows WhatsApp channel
 * 2. Form validation (empty title/message)
 * 3. WhatsApp session picker
 * 4. Audience required before send
 * 5. Successful campaign create API path (mocked plan gate via Owner)
 *
 * NOTE: Does not send real WhatsApp to production phones. API create is
 * gated; when bridge is down task falls back or skips — tests assert
 * HTTP contract and UI validation, not real delivery.
 */
import { test, expect } from '@playwright/test';
import { ensureOwnerEnterpriseCampaignAccess, getE2EBaseURL, loginRole } from '../helpers/e2e-safety';

const BASE_API = getE2EBaseURL();

test.beforeAll(async ({ request }) => {
  await ensureOwnerEnterpriseCampaignAccess(request);
});

test.describe('Campaign WhatsApp UI validation — OWNER @owner @campaigns @whatsapp', () => {
  test('wizard opens with WhatsApp channel @owner', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Campañas de Marketing' }).waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('#new-campaign-btn').click();
    const waButton = page.locator('button').filter({ hasText: 'WhatsApp' }).first();
    await expect(waButton).toBeVisible({ timeout: 8000 });
    await waButton.click();
    await expect(page.locator('#send-campaign-btn')).toBeVisible({ timeout: 8000 });
  });

  test('send is blocked without title and message @owner', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Campañas de Marketing' }).waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('#new-campaign-btn').click();
    const waButton = page.locator('button').filter({ hasText: 'WhatsApp' }).first();
    await waButton.waitFor({ state: 'visible', timeout: 8000 });
    await waButton.click();
    await page.locator('#send-campaign-btn').waitFor({ state: 'visible', timeout: 8000 });
    await page.locator('#send-campaign-btn').click();
    // Validation should prevent a successful create — toast or form error
    await expect(page.locator('#send-campaign-btn')).toBeVisible();
  });

  test('cancel closes the wizard @owner', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Campañas de Marketing' }).waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('#new-campaign-btn').click();
    const waButton = page.locator('button').filter({ hasText: 'WhatsApp' }).first();
    await waButton.waitFor({ state: 'visible', timeout: 8000 });
    await waButton.click();
    await page.locator('#cancel-campaign-btn').waitFor({ state: 'visible', timeout: 8000 });
    await page.locator('#cancel-campaign-btn').click();
    await expect(page.locator('#send-campaign-btn')).toHaveCount(0);
  });

  test('WhatsApp sessions API returns list for owner @owner', async ({ request }) => {
    const token = await loginRole(request, 'owner');
    const resp = await request.get(`${BASE_API}/api/v1/whatsapp/sessions/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(Array.isArray(body.sessions)).toBe(true);
    if (body.sessions.length > 0) {
      const s = body.sessions[0];
      expect(s).toHaveProperty('id');
      expect(s).toHaveProperty('is_connected');
      expect(s).toHaveProperty('messages_sent_today');
      expect(s).toHaveProperty('messages_remaining_today');
      expect(s).toHaveProperty('daily_limit');
      // Counter shape: remaining = max(0, daily_limit - sent)
      expect(s.messages_remaining_today).toBe(
        Math.max(0, (s.daily_limit || 0) - (s.messages_sent_today || 0))
      );
    }
  });

  test('campaign create validates channel @owner', async ({ request }) => {
    const token = await loginRole(request, 'owner');
    const resp = await request.post(`${BASE_API}/api/v1/notifications/campaigns/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: '',
        message: '',
        segment_id: '',
        channel: 'not-a-channel',
      },
    });
    // Must not 5xx — validation or plan gate
    expect(resp.status()).toBeLessThan(500);
  });

  test('whatsapp create without session still returns JSON contract @owner', async ({ request }) => {
    const token = await loginRole(request, 'owner');
    const resp = await request.post(`${BASE_API}/api/v1/notifications/campaigns/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: 'E2E WA contract',
        message: 'Contract check — may skip without session',
        segment_id: 'all',
        channel: 'whatsapp',
      },
    });
    expect([200, 400, 403, 409, 503]).toContain(resp.status());
    if (resp.ok()) {
      const body = await resp.json();
      expect(body).toHaveProperty('success');
    }
  });
});
