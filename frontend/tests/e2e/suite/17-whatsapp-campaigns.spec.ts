/**
 * Suite 17 — WhatsApp Bridge & Campaign Analytics (LYL-SRS-006)
 *
 * Tests:
 * 1. OWNER: Campaign page renders WhatsApp channel + rate info banner
 * 2. OWNER: Campaign analytics API endpoints (runs, results, recipients, export)
 * 3. OWNER: WhatsApp session API (QR, status, disconnect)
 * 4. MANAGER: Blocked from campaigns page + all WhatsApp/analytics APIs (403)
 * 5. STAFF: Blocked from campaigns page + all WhatsApp/analytics APIs (403)
 * 6. SUPERADMIN: No tenant → blocked from WhatsApp/campaigns APIs (403)
 *
 * RBAC Roles: OWNER, MANAGER, STAFF, SUPER_ADMIN
 */
import { test, expect } from '@playwright/test';
import { getE2EBaseURL, loginRole } from '../helpers/e2e-safety';

const BASE_API = getE2EBaseURL();

// =============================================================================
// OWNER — UI Tests
// =============================================================================

test.describe('WhatsApp Campaign UI — OWNER @owner @campaigns', () => {

  test('Campaign page loads with heading and form button @owner', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Page heading visible
    await expect(page.getByRole('heading', { name: 'Campañas de Marketing' })).toBeVisible({ timeout: 10000 });
    // New campaign button visible
    await expect(page.locator('#new-campaign-btn')).toBeVisible({ timeout: 5000 });
  });

  test('New campaign form opens and has channel selector @owner', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.click('#new-campaign-btn');
    await page.waitForTimeout(1000);
    // WhatsApp channel button must exist in the channel selector area
    const waButton = page.locator('button').filter({ hasText: 'WhatsApp' });
    await expect(waButton.first()).toBeVisible({ timeout: 5000 });
    // Click WhatsApp channel
    await waButton.first().click();
    await page.waitForTimeout(500);
    // Send button should update to contain WhatsApp
    const sendBtn = page.locator('#send-campaign-btn');
    await expect(sendBtn).toBeVisible();
    const btnText = await sendBtn.textContent();
    expect(btnText).toContain('WhatsApp');
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
// OWNER — Campaign Analytics API Tests
// =============================================================================

test.describe('Campaign Analytics API — OWNER @owner @analytics', () => {

  test('GET /campaigns/runs/ returns list @owner', async ({ request }) => {
    const token = await loginRole(request, 'owner');
    const resp = await request.get(`${BASE_API}/api/v1/notifications/campaigns/runs/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // 200 = success (may return empty array)
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('GET /campaigns/{bad-id}/results/ returns 404 @owner', async ({ request }) => {
    const token = await loginRole(request, 'owner');
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const resp = await request.get(`${BASE_API}/api/v1/notifications/campaigns/${fakeId}/results/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([404, 422]).toContain(resp.status());
  });

  test('GET /campaigns/{bad-id}/recipients/ returns 404 @owner', async ({ request }) => {
    const token = await loginRole(request, 'owner');
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const resp = await request.get(`${BASE_API}/api/v1/notifications/campaigns/${fakeId}/recipients/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([404, 422]).toContain(resp.status());
  });

  test('GET /campaigns/{bad-id}/export/ returns 404 @owner', async ({ request }) => {
    const token = await loginRole(request, 'owner');
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const resp = await request.get(`${BASE_API}/api/v1/notifications/campaigns/${fakeId}/export/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([404, 422]).toContain(resp.status());
  });
});

// =============================================================================
// OWNER — WhatsApp Session API Tests
// =============================================================================

test.describe('WhatsApp Session API — OWNER @owner @whatsapp', () => {

  test('GET /whatsapp/status/{tenant_id}/ returns status @owner', async ({ request }) => {
    const token = await loginRole(request, 'owner');
    // Get tenant ID from /auth/me/
    const meResp = await request.get(`${BASE_API}/api/v1/auth/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(meResp.status()).toBe(200);
    const me = await meResp.json();
    const tenantId = me.tenant_id || me.tenant?.id;
    if (!tenantId) { test.skip(); return; }

    const resp = await request.get(`${BASE_API}/api/v1/whatsapp/status/${tenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // 200 = status returned, 502 = bridge unavailable (both valid in test env)
    expect([200, 502]).toContain(resp.status());
    if (resp.status() === 200) {
      const body = await resp.json();
      expect(body).toHaveProperty('connected');
    }
  });

  test('GET /whatsapp/qr/{tenant_id}/ returns QR or bridge error @owner', async ({ request }) => {
    const token = await loginRole(request, 'owner');
    const meResp = await request.get(`${BASE_API}/api/v1/auth/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const me = await meResp.json();
    const tenantId = me.tenant_id || me.tenant?.id;
    if (!tenantId) { test.skip(); return; }

    const resp = await request.get(`${BASE_API}/api/v1/whatsapp/qr/${tenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // 200 = QR generated, 502 = bridge not running (expected in test without Docker)
    expect([200, 502]).toContain(resp.status());
  });

  test('GET /whatsapp/status/ with wrong tenant_id returns 403 @owner', async ({ request }) => {
    const token = await loginRole(request, 'owner');
    const fakeTenantId = '00000000-0000-0000-0000-000000000099';
    const resp = await request.get(`${BASE_API}/api/v1/whatsapp/status/${fakeTenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // 403 = tenant mismatch (cross-tenant isolation)
    expect(resp.status()).toBe(403);
  });
});

// =============================================================================
// MANAGER — RBAC Enforcement (403 on all campaign/WhatsApp endpoints)
// =============================================================================

test.describe('WhatsApp & Analytics RBAC — MANAGER blocked @manager @whatsapp', () => {

  test('MANAGER cannot access campaign runs API (403) @manager', async ({ request }) => {
    const token = await loginRole(request, 'manager');
    const resp = await request.get(`${BASE_API}/api/v1/notifications/campaigns/runs/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });

  test('MANAGER cannot access campaign results API (403) @manager', async ({ request }) => {
    const token = await loginRole(request, 'manager');
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const resp = await request.get(`${BASE_API}/api/v1/notifications/campaigns/${fakeId}/results/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });

  test('MANAGER cannot create campaigns (403) @manager', async ({ request }) => {
    const token = await loginRole(request, 'manager');
    const resp = await request.post(`${BASE_API}/api/v1/notifications/campaigns/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: 'Hack', message: 'Test', segment_id: 'all', channel: 'whatsapp' },
    });
    expect(resp.status()).toBe(403);
  });

  test('MANAGER cannot access WhatsApp QR (403) @manager', async ({ request }) => {
    const token = await loginRole(request, 'manager');
    const fakeTenantId = '00000000-0000-0000-0000-000000000000';
    const resp = await request.get(`${BASE_API}/api/v1/whatsapp/qr/${fakeTenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });

  test('MANAGER cannot disconnect WhatsApp (403) @manager', async ({ request }) => {
    const token = await loginRole(request, 'manager');
    const fakeTenantId = '00000000-0000-0000-0000-000000000000';
    const resp = await request.post(`${BASE_API}/api/v1/whatsapp/disconnect/${fakeTenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });

  test('MANAGER does NOT see "Campañas" in nav @manager', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const navLink = page.locator('nav, aside').getByText('Campañas');
    await expect(navLink).toHaveCount(0);
  });
});

// =============================================================================
// STAFF — RBAC Enforcement (403 on all campaign/WhatsApp endpoints)
// =============================================================================

test.describe('WhatsApp & Analytics RBAC — STAFF blocked @staff @whatsapp', () => {

  test('STAFF cannot access campaign runs API (403) @staff', async ({ request }) => {
    const token = await loginRole(request, 'staff');
    const resp = await request.get(`${BASE_API}/api/v1/notifications/campaigns/runs/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });

  test('STAFF cannot create campaigns (403) @staff', async ({ request }) => {
    const token = await loginRole(request, 'staff');
    const resp = await request.post(`${BASE_API}/api/v1/notifications/campaigns/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: 'Hack', message: 'Test', segment_id: 'all', channel: 'email' },
    });
    expect(resp.status()).toBe(403);
  });

  test('STAFF cannot access WhatsApp QR (403) @staff', async ({ request }) => {
    const token = await loginRole(request, 'staff');
    const fakeTenantId = '00000000-0000-0000-0000-000000000000';
    const resp = await request.get(`${BASE_API}/api/v1/whatsapp/qr/${fakeTenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });

  test('STAFF cannot access campaign export (403) @staff', async ({ request }) => {
    const token = await loginRole(request, 'staff');
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const resp = await request.get(`${BASE_API}/api/v1/notifications/campaigns/${fakeId}/export/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });

  test('STAFF navigating to /campaigns is blocked @staff', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const url = page.url();
    // Should redirect away or not show campaign content
    const heading = page.getByRole('heading', { name: 'Campañas de Marketing' });
    const count = await heading.count();
    expect(count).toBe(0);
  });
});

// =============================================================================
// SUPERADMIN — RBAC Enforcement (no tenant → 403)
// =============================================================================

test.describe('WhatsApp & Analytics RBAC — SUPERADMIN blocked @superadmin @whatsapp', () => {

  test('SUPERADMIN cannot access campaign runs (no tenant, 403) @superadmin', async ({ request }) => {
    const token = await loginRole(request, 'superadmin');
    const resp = await request.get(`${BASE_API}/api/v1/notifications/campaigns/runs/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // SUPER_ADMIN has no tenant → is_owner returns false → 403
    expect(resp.status()).toBe(403);
  });

  test('SUPERADMIN cannot create campaigns (403 — no tenant) @superadmin', async ({ request }) => {
    const token = await loginRole(request, 'superadmin');
    const resp = await request.post(`${BASE_API}/api/v1/notifications/campaigns/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: 'SA Hack', message: 'Test', segment_id: 'all', channel: 'whatsapp' },
    });
    // SUPER_ADMIN has no tenant → is_owner returns false → 403
    expect(resp.status()).toBe(403);
  });

  test('SUPERADMIN cannot access WhatsApp QR (403 — no tenant) @superadmin', async ({ request }) => {
    const token = await loginRole(request, 'superadmin');
    const fakeTenantId = '00000000-0000-0000-0000-000000000000';
    const resp = await request.get(`${BASE_API}/api/v1/whatsapp/qr/${fakeTenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // SUPER_ADMIN has no tenant → is_owner returns false → 403
    expect(resp.status()).toBe(403);
  });
});

// =============================================================================
// WEBHOOK SECURITY — Unauthenticated calls blocked
// =============================================================================

test.describe('Webhook Security — Unauthenticated @security', () => {

  test('Delivery webhook responds without crash', async ({ request }) => {
    const resp = await request.post(`${BASE_API}/api/v1/whatsapp/webhook/delivery/`, {
      data: {
        tenant_id: '00000000-0000-0000-0000-000000000000',
        status: 'sent',
      },
    });
    // In dev (no API key): 200. In prod (API key set): 401.
    // Never 500 (crash).
    expect([200, 401, 422]).toContain(resp.status());
  });

  test('Session webhook responds without crash', async ({ request }) => {
    const resp = await request.post(`${BASE_API}/api/v1/whatsapp/webhook/session/`, {
      data: {
        tenant_id: '00000000-0000-0000-0000-000000000000',
        event: 'connected',
      },
    });
    expect([200, 401, 422]).toContain(resp.status());
  });
});

// =============================================================================
// CROSS-TENANT ISOLATION
// =============================================================================

test.describe('Cross-Tenant Isolation — OWNER @owner @security', () => {

  test('OWNER cannot access WhatsApp status for another tenant @owner', async ({ request }) => {
    const token = await loginRole(request, 'owner');
    // Use a different tenant ID that doesn't belong to this owner
    const otherTenantId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const resp = await request.get(`${BASE_API}/api/v1/whatsapp/status/${otherTenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });

  test('OWNER cannot disconnect another tenant WhatsApp @owner', async ({ request }) => {
    const token = await loginRole(request, 'owner');
    const otherTenantId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const resp = await request.post(`${BASE_API}/api/v1/whatsapp/disconnect/${otherTenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });
});

// =============================================================================
// SETTINGS PAGE — WhatsApp Bridge Wizard (LYL-SRS-007)
// =============================================================================

test.describe('WhatsApp Settings Wizard — OWNER @owner @whatsapp', () => {

  test('Settings page shows WhatsApp integration section @owner', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Integrations section must be visible
    await expect(page.locator('#wa-integration-section')).toBeVisible({ timeout: 10000 });
    // Toggle must be present
    await expect(page.locator('#wa-toggle')).toBeVisible();
    // WhatsApp label visible
    await expect(page.getByText('WhatsApp Business Bridge')).toBeVisible();
  });

  test('WhatsApp toggle triggers bridge status check @owner', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Click toggle — should trigger checking or QR or error
    await page.locator('#wa-toggle').click();
    await page.waitForTimeout(5000);

    // One of: QR wizard, connected dashboard, checking spinner, or error should be visible
    const hasQr = await page.locator('#wa-wizard-content').count();
    const hasConnected = await page.locator('#wa-connected-dashboard').count();
    const hasChecking = await page.getByText('Verificando disponibilidad').count();
    const hasError = await page.getByText('no está disponible').count();
    expect(hasQr + hasConnected + hasChecking + hasError).toBeGreaterThan(0);
  });

  test('Cancel button in QR wizard returns to disabled state @owner', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.locator('#wa-toggle').click();
    await page.waitForTimeout(3000);

    // If QR wizard appeared, cancel it
    const cancelBtn = page.locator('#wa-cancel-btn');
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await page.waitForTimeout(500);
      // QR wizard should be gone
      await expect(page.locator('#wa-wizard-content')).toHaveCount(0);
    }
  });

  test('Settings save button still works with integrations section @owner', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Save button must still be visible
    await expect(page.locator('#save-settings-btn')).toBeVisible();
  });
});

test.describe('WhatsApp Settings — MANAGER denied @manager @whatsapp', () => {
  test('MANAGER cannot access settings page @manager', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Settings is OWNER-only route — should redirect or show no WA section
    const waSection = page.locator('#wa-integration-section');
    // Either the section is hidden or the page redirected away from settings
    const isOnSettings = page.url().includes('/settings');
    if (isOnSettings) {
      await expect(waSection).toHaveCount(0);
    }
    // else: redirected away, which is the correct behavior
  });
});
