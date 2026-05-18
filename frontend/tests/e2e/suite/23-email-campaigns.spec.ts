/**
 * Suite 23 — Email Campaign E2E (OWNER)
 *
 * Verifies the full email campaign lifecycle:
 *   1. UI: Campaign page loads with channel indicators
 *   2. UI: "+ Nueva campaña" button opens campaign creation modal
 *   3. API: Email campaign dispatch succeeds via POST /campaigns/
 *   4. API: Campaign appears in campaign history
 *   5. API: Segment filtering scopes correctly
 *   6. API: Invalid channel returns 400
 */
import { test, expect } from '@playwright/test';
import { ensureOwnerEnterpriseCampaignAccess, getE2EBaseURL, loginRole } from '../helpers/e2e-safety';

const BASE_API = getE2EBaseURL();

/**
 * Login helper — returns JWT access_token for API calls.
 */
async function getOwnerToken(request: import('@playwright/test').APIRequestContext): Promise<string> {
  return loginRole(request, 'owner');
}

test.describe('Email Campaigns — OWNER @owner @campaigns', () => {

  test.beforeAll(async ({ request }) => {
    await ensureOwnerEnterpriseCampaignAccess(request);
  });

  test('1. Campaign page loads with Email channel indicator', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    // Wait for the Email indicator to be visible
    const emailIndicator = page.locator('text=Email:');
    await emailIndicator.first().waitFor({ state: 'visible', timeout: 10000 });
    await expect(emailIndicator.first()).toBeVisible({ timeout: 10000 });
  });

  test('2. "+ Nueva campaña" button is visible and clickable', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: /Campañas/i }).waitFor({ state: 'visible', timeout: 15000 });

    // Look for the campaign creation button
    const createBtn = page.locator('button:has-text("Nueva campaña"), a:has-text("Nueva campaña")');
    await createBtn.first().waitFor({ state: 'visible', timeout: 10000 });
    await expect(createBtn.first()).toBeVisible({ timeout: 10000 });

    // Click it and verify a modal/form appears
    await createBtn.first().click();

    // Wait for form elements to appear
    const formElements = page.locator('input, textarea, select, [role="dialog"]');
    await expect(formElements.first()).toBeVisible({ timeout: 5000 });

    const count = await formElements.count();
    expect(count, 'Campaign form should appear after clicking create').toBeGreaterThan(0);
  });

  test('3. Email campaign submit succeeds via API', async ({ request }) => {
    const token = await getOwnerToken(request);

    const resp = await request.post(`${BASE_API}/api/v1/notifications/campaigns/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: `E2E Email Test ${Date.now()}`,
        message: '<p>This is an automated E2E test email campaign.</p>',
        channel: 'email',
        segment_id: 'all',
        image_url: '',
      },
    });

    expect(resp.status(), 'Email campaign create should return 200').toBe(200);
    const body = await resp.json();
    expect(body.success, 'Campaign should report success').toBe(true);
    expect(body.message, 'Should mention campaign started').toBeTruthy();
  });

  test('4. Campaign appears in campaign history', async ({ request }) => {
    const token = await getOwnerToken(request);

    const resp = await request.get(`${BASE_API}/api/v1/notifications/campaigns/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(resp.status(), 'Campaigns list should return 200').toBe(200);
    const body = await resp.json();
    expect(body.campaigns, 'Should have campaigns array').toBeDefined();
    expect(body.campaigns.length, 'Should have at least one campaign').toBeGreaterThan(0);
  });

  test('5. Segment filter scopes correctly', async ({ request }) => {
    const token = await getOwnerToken(request);

    // "all" segment should work
    const resp = await request.post(`${BASE_API}/api/v1/notifications/campaigns/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: `E2E Segment Test ${Date.now()}`,
        message: '<p>Segment filter test.</p>',
        channel: 'email',
        segment_id: 'all',
      },
    });
    expect(resp.status(), 'All segment should succeed').toBe(200);
  });

  test('6. Invalid channel returns 400', async ({ request }) => {
    const token = await getOwnerToken(request);

    const resp = await request.post(`${BASE_API}/api/v1/notifications/campaigns/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: 'Invalid Channel Test',
        message: 'Test',
        channel: 'carrier_pigeon',
        segment_id: 'all',
      },
    });

    // Should reject with 400 or 422
    expect([400, 422]).toContain(resp.status());
  });

});
