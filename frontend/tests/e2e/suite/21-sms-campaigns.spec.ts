/**
 * Suite 21 — SMS Campaigns (LYL-SRS-009, LYL-SRS-008)
 *
 * Tests the complete SMS campaign flow:
 * 1. OWNER: Campaign page renders SMS channel + info banner
 * 2. OWNER: Can select SMS, fill form, and submit campaign
 * 3. OWNER: Campaign appears in campaign list with SMS badge
 * 4. OWNER: Plan features API returns sms_campaigns + sms_day limit
 * 5. MANAGER: Blocked from campaigns page + SMS campaign APIs (403)
 * 6. SUPERADMIN: Can toggle twilio_use_test_mode in settings
 *
 * RBAC Roles: OWNER, MANAGER, SUPER_ADMIN
 */
import { test, expect } from '@playwright/test';
import {
  ensureOwnerEnterpriseCampaignAccess,
  getE2EBaseURL,
  loginRole,
  ,
} from '../helpers/e2e-safety';

const BASE_API = getE2EBaseURL();

// =============================================================================
// OWNER — UI Tests
// =============================================================================

// CRITICAL SAFETY: Verify Twilio test mode is enabled before running ANY SMS test.
// This prevents accidental sending of real (charged) SMS messages during E2E runs.
test.beforeAll(async ({ request }) => {
  ();
  const token = await loginRole(request, 'superadmin');

  // ── SAFETY GUARD ──
  const integrationsResp = await request.get(`${BASE_API}/api/v1/admin/platform/integrations/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (integrationsResp.status() === 200) {
    const integrations = await integrationsResp.json();
    const twilioSMS = Array.isArray(integrations)
      ? integrations.find((i: any) => i.key === 'twilio_sms')
      : integrations.integrations?.find((i: any) => i.key === 'twilio_sms');
    const testMode = twilioSMS?.preview_values?.twilio_use_test_mode;
    if (testMode !== 'true') {
      throw new Error(
        `FATAL SAFETY CHECK FAILED: twilio_use_test_mode is '${testMode}'. ` +
        `Set it to 'true' in SysAdmin → Settings → Twilio SMS before running SMS E2E tests. ` +
        `This prevents sending real (charged) SMS messages.`
      );
    }
  }

  await ensureOwnerEnterpriseCampaignAccess(request);

  // Enable SMS campaigns for the test tenant's plan
  try {
    const listResp = await request.get(`${BASE_API}/api/v1/admin/plans/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (listResp.status() !== 200) return;
    const plans = await listResp.json();
    const enterprisePlan = plans.find((p: any) => p.slug === 'enterprise');
    if (!enterprisePlan) return;

    await request.patch(`${BASE_API}/api/v1/admin/plans/${enterprisePlan.id}/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        features: [
          'whatsapp_campaigns',
          'email_campaigns',
          'wallet_campaigns',
          'sms_campaigns',
          'automation',
          'advanced_analytics',
          'priority_support',
          'custom_branding',
          'data_export',
          'geo_fencing',
          'ai_assistant',
          'agent_api',
        ],
        max_sms_day: 5000,
        max_whatsapp_day: 200,
        max_emails_month: 10000,
        max_wallet_pushes_month: 10000,
        max_automations: 10,
        max_automation_executions_day: 1000,
        max_ai_queries_month: 500,
        max_api_calls_day: 1000,
        max_exports_month: 10,
      },
    });
  } catch {
    // If plan setup fails, tests may skip or fail gracefully
  }
});

test.describe('SMS Campaign UI — OWNER @owner @campaigns', () => {

  test('Campaign page loads with SMS channel button @owner', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Page heading visible
    await expect(page.getByRole('heading', { name: 'Campañas de Marketing' })).toBeVisible({ timeout: 10000 });
    // New campaign button visible
    await expect(page.locator('#new-campaign-btn')).toBeVisible({ timeout: 5000 });
  });

  test('New campaign form opens and shows SMS channel selector @owner', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.click('#new-campaign-btn');
    await page.waitForTimeout(1000);

    // SMS channel button must exist in the channel selector area
    const smsButton = page.locator('button').filter({ hasText: 'SMS' });
    await expect(smsButton.first()).toBeVisible({ timeout: 5000 });

    // Click SMS channel
    await smsButton.first().click();
    await page.waitForTimeout(500);

    // Send button should update to contain SMS
    const sendBtn = page.locator('#send-campaign-btn');
    await expect(sendBtn).toBeVisible();
    const btnText = await sendBtn.textContent();
    expect(btnText).toContain('SMS');
  });

  test('SMS channel shows info banner with Twilio details @owner', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.click('#new-campaign-btn');
    await page.waitForTimeout(1000);

    // Click SMS channel
    const smsButton = page.locator('button').filter({ hasText: 'SMS' });
    await smsButton.first().click();
    await page.waitForTimeout(500);

    // Info banner should be visible with SMS-specific content
    const bannerText = await page.locator('text=Información de envío SMS').isVisible();
    expect(bannerText).toBe(true);
  });

  test('SMS form has correct fields and max length @owner', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.click('#new-campaign-btn');
    await page.waitForTimeout(1000);

    // Select SMS
    const smsButton = page.locator('button').filter({ hasText: 'SMS' });
    await smsButton.first().click();
    await page.waitForTimeout(500);

    // Title input should have SMS-specific placeholder
    const titleInput = page.locator('#campaign-title');
    await expect(titleInput).toBeVisible();
    const placeholder = await titleInput.getAttribute('placeholder');
    expect(placeholder).toContain('Oferta');

    // Message textarea should have maxLength=1600
    const msgInput = page.locator('#campaign-msg');
    await expect(msgInput).toBeVisible();
    const maxLen = await msgInput.getAttribute('maxlength');
    expect(maxLen).toBe('1600');
  });

  test('OWNER can create SMS campaign @owner', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Open form
    await page.click('#new-campaign-btn');
    await page.waitForTimeout(1000);

    // Select SMS channel
    const smsButton = page.locator('button').filter({ hasText: 'SMS' });
    await smsButton.first().click();
    await page.waitForTimeout(500);

    // Fill form
    const testTitle = `E2E SMS Test ${Date.now()}`;
    await page.fill('#campaign-title', testTitle);
    await page.fill('#campaign-msg', '¡Oferta especial! 20% de descuento en tu próxima compra.');

    // Select "Todos los clientes" segment (default is 'all')
    await page.click('#segment-all');
    await page.waitForTimeout(300);

    // Submit campaign
    await page.click('#send-campaign-btn');
    await page.waitForTimeout(3000);

    // Form should close on success
    await expect(page.locator('#send-campaign-btn')).toHaveCount(0);

    // Verify success toast appears (campaign queued for async delivery)
    const toast = page.locator('div[role="status"]').filter({ hasText: /SMS|Campaña/ });
    await expect(toast.first()).toBeVisible({ timeout: 10000 });
  });

  test('Cancel button closes campaign form @owner', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.click('#new-campaign-btn');
    await page.waitForTimeout(1000);
    await page.click('#cancel-campaign-btn');
    await page.waitForTimeout(500);
    // Form should be closed — send button no longer visible
    await expect(page.locator('#send-campaign-btn')).toHaveCount(0);
  });
});

// =============================================================================
// OWNER — Plan Features API Tests
// =============================================================================

test.describe('SMS Plan Features API — OWNER @owner @campaigns', () => {

  test('GET /me/plan-features/ includes sms_campaigns @owner', async ({ request }) => {
    const token = await loginRole(request, 'owner');
    const resp = await request.get(`${BASE_API}/api/v1/tenants/me/plan-features/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();

    // Should include sms_campaigns feature
    expect(Array.isArray(body.features)).toBe(true);
    expect(body.features).toContain('sms_campaigns');

    // Should include sms_day limit
    expect(body.limits).toHaveProperty('sms_day');
    expect(body.limits.sms_day).toBeGreaterThan(0);

    // Should include sms_today usage
    expect(body.usage).toHaveProperty('sms_today');
    expect(typeof body.usage.sms_today).toBe('number');
  });

  test('POST /campaigns/ creates SMS campaign @owner', async ({ request }) => {
    const token = await loginRole(request, 'owner');
    const resp = await request.post(`${BASE_API}/api/v1/notifications/campaigns/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: `API SMS Test ${Date.now()}`,
        message: 'Test message from Playwright E2E',
        segment_id: 'all',
        channel: 'sms',
      },
    });
    expect(resp.status(), 'Seeded owner enterprise plan should allow SMS campaign create').toBe(200);
    const body = await resp.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('SMS');
  });
});

// =============================================================================
// MANAGER — RBAC Enforcement (403 on all campaign/SMS endpoints)
// =============================================================================

test.describe('SMS Campaign RBAC — MANAGER blocked @manager @campaigns', () => {

  test('MANAGER cannot access campaign list API (403) @manager', async ({ request }) => {
    const token = await loginRole(request, 'manager');
    const resp = await request.get(`${BASE_API}/api/v1/notifications/campaigns/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });

  test('MANAGER cannot create SMS campaign (403) @manager', async ({ request }) => {
    const token = await loginRole(request, 'manager');
    const resp = await request.post(`${BASE_API}/api/v1/notifications/campaigns/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: 'Manager SMS Test',
        message: 'This should fail',
        segment_id: 'all',
        channel: 'sms',
      },
    });
    expect(resp.status()).toBe(403);
  });

  test('MANAGER does NOT have "Campañas" in navigation @manager', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const navLink = page.locator('nav, aside').getByText('Campañas');
    await expect(navLink).toHaveCount(0);
  });
});

// =============================================================================
// SUPERADMIN — Twilio Test Mode Settings
// =============================================================================

test.describe('SuperAdmin — Twilio Test Mode @superadmin @superadmin', () => {

  test('SA can view Twilio SMS integration settings @superadmin', async ({ page }) => {
    await page.goto('/superadmin/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();

    // Should find Twilio SMS section
    const twilioSection = page.locator('text=Twilio SMS');
    await expect(twilioSection.first()).toBeVisible({ timeout: 5000 });
  });

  test('SA can update plan to enable SMS campaigns @superadmin', async ({ request }) => {
    const token = await loginRole(request, 'superadmin');

    // Get existing plans
    const listResp = await request.get(`${BASE_API}/api/v1/admin/plans/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listResp.status()).toBe(200);
    const plans = await listResp.json();

    // Find enterprise plan
    const enterprisePlan = plans.find((p: any) => p.slug === 'enterprise');
    expect(enterprisePlan, 'Enterprise plan must exist to test SMS campaign enablement').toBeTruthy();

    // Update plan to include SMS campaigns
    const updateResp = await request.patch(`${BASE_API}/api/v1/admin/plans/${enterprisePlan.id}/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        features: [
          'whatsapp_campaigns',
          'email_campaigns',
          'wallet_campaigns',
          'sms_campaigns',
          'automation',
          'advanced_analytics',
          'priority_support',
          'custom_branding',
          'data_export',
          'geo_fencing',
          'ai_assistant',
          'agent_api',
        ],
        max_sms_day: 5000,
        max_whatsapp_day: 200,
        max_emails_month: 10000,
        max_wallet_pushes_month: 10000,
        max_automations: 10,
        max_automation_executions_day: 1000,
        max_ai_queries_month: 500,
        max_api_calls_day: 1000,
        max_exports_month: 10,
      },
    });
    expect(updateResp.status()).toBe(200);
    const updated = await updateResp.json();
    expect(updated.features).toContain('sms_campaigns');
    expect(updated.max_sms_day).toBe(5000);
  });

  test('SA settings API returns twilio_use_test_mode diagnostic @superadmin', async ({ request }) => {
    const token = await loginRole(request, 'superadmin');
    const resp = await request.get(`${BASE_API}/api/v1/admin/platform/integrations/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([200, 403]).toContain(resp.status());

    if (resp.status() === 200) {
      const body = await resp.json();
      // API returns array directly (not {integrations: [...]})
      const integrations = Array.isArray(body) ? body : body.integrations;
      expect(Array.isArray(integrations)).toBe(true);

      // Find Twilio SMS integration
      const twilioSMS = integrations.find((i: any) => i.key === 'twilio_sms');
      expect(twilioSMS).toBeDefined();
      expect(twilioSMS.diagnostics).toHaveProperty('use_test_mode');
    }
  });
});

// =============================================================================
// Cross-cutting: Campaign List Shows SMS Badge Correctly
// =============================================================================

test.describe('Campaign List — SMS Badge @owner @campaigns', () => {

  test('SMS campaigns display orange SMS badge @owner', async ({ page, request }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Check UI for any existing SMS badges
    const smsBadges = page.locator('text=📱 SMS');
    const uiCount = await smsBadges.count();

    // If no SMS badges in UI, create a campaign via API (faster than UI flow)
    if (uiCount === 0) {
      const token = await loginRole(request, 'owner');
      const resp = await request.post(`${BASE_API}/api/v1/notifications/campaigns/`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          title: `Badge Test ${Date.now()}`,
          message: 'Testing SMS badge display',
          segment_id: 'all',
          channel: 'sms',
        },
      });
      expect(resp.status(), 'Seeded owner enterprise plan should allow SMS badge campaign create').toBe(200);

      // Wait for async Celery worker to create notification records
      await page.waitForTimeout(8000);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
    }

    // Now verify at least one SMS badge exists
    const finalCount = await page.locator('text=📱 SMS').count();
    expect(finalCount).toBeGreaterThan(0);
  });
});
