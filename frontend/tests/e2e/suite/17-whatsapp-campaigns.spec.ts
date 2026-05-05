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

const BASE_API = 'http://localhost:80';

// Helper: login and return access_token
async function loginAs(
  request: import('@playwright/test').APIRequestContext,
  email: string,
  password: string = '123456',
): Promise<string> {
  const resp = await request.post(`${BASE_API}/api/v1/auth/login/`, {
    data: { email, password },
  });
  expect(resp.status(), `Login should succeed for ${email}`).toBe(200);
  const body = await resp.json();
  expect(body.access_token).toBeTruthy();
  return body.access_token;
}

// =============================================================================
// OWNER — UI Tests
// =============================================================================

test.describe('WhatsApp Campaign UI — OWNER @owner', () => {

  test('Campaign page loads with WhatsApp channel info @owner', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Page heading visible
    await expect(page.getByRole('heading', { name: 'Campañas de Marketing' })).toBeVisible({ timeout: 10000 });
    // WhatsApp label visible in info banner (the bold label)
    await expect(page.getByText('Mensaje directo vía puente')).toBeVisible({ timeout: 5000 });
  });

  test('New campaign form shows WhatsApp rate info banner @owner', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Open new campaign form
    await page.click('#new-campaign-btn');
    await page.waitForTimeout(1000);
    // Select WhatsApp channel — the button with font-medium "WhatsApp" text inside the type selector
    const waButton = page.locator('button[aria-pressed]').filter({ hasText: 'WhatsApp' });
    await waButton.click();
    await page.waitForTimeout(500);
    // Rate info banner should appear
    await expect(page.getByText('Límites de envío por WhatsApp')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('~8 mensajes por minuto')).toBeVisible();
    await expect(page.getByText('200 mensajes por hora')).toBeVisible();
  });

  test('Send button text shows "(WhatsApp)" not "(WhatsApp Mock)" @owner', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.click('#new-campaign-btn');
    await page.waitForTimeout(1000);
    const waButton = page.locator('button[aria-pressed]').filter({ hasText: 'WhatsApp' });
    await waButton.click();
    await page.waitForTimeout(500);
    const sendBtn = page.locator('#send-campaign-btn');
    await expect(sendBtn).toContainText('(WhatsApp)');
    // Must NOT contain "Mock"
    const btnText = await sendBtn.textContent();
    expect(btnText).not.toContain('Mock');
  });

  test('WhatsApp rate banner hidden when Email selected @owner', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.click('#new-campaign-btn');
    await page.waitForTimeout(1000);
    // Email is default — banner should NOT be visible
    const banner = page.getByText('Límites de envío por WhatsApp');
    await expect(banner).toHaveCount(0);
  });
});

// =============================================================================
// OWNER — Campaign Analytics API Tests
// =============================================================================

test.describe('Campaign Analytics API — OWNER @owner', () => {

  test('GET /campaigns/runs/ returns list @owner', async ({ request }) => {
    const token = await loginAs(request, 'owner@example.com');
    const resp = await request.get(`${BASE_API}/api/v1/notifications/campaigns/runs/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // 200 = success (may return empty array)
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('GET /campaigns/{bad-id}/results/ returns 404 @owner', async ({ request }) => {
    const token = await loginAs(request, 'owner@example.com');
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const resp = await request.get(`${BASE_API}/api/v1/notifications/campaigns/${fakeId}/results/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([404, 422]).toContain(resp.status());
  });

  test('GET /campaigns/{bad-id}/recipients/ returns 404 @owner', async ({ request }) => {
    const token = await loginAs(request, 'owner@example.com');
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const resp = await request.get(`${BASE_API}/api/v1/notifications/campaigns/${fakeId}/recipients/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([404, 422]).toContain(resp.status());
  });

  test('GET /campaigns/{bad-id}/export/ returns 404 @owner', async ({ request }) => {
    const token = await loginAs(request, 'owner@example.com');
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

test.describe('WhatsApp Session API — OWNER @owner', () => {

  test('GET /whatsapp/status/{tenant_id}/ returns status @owner', async ({ request }) => {
    const token = await loginAs(request, 'owner@example.com');
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
    const token = await loginAs(request, 'owner@example.com');
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
    const token = await loginAs(request, 'owner@example.com');
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

test.describe('WhatsApp & Analytics RBAC — MANAGER blocked @manager', () => {

  test('MANAGER cannot access campaign runs API (403) @manager', async ({ request }) => {
    const token = await loginAs(request, 'manager@example.com');
    const resp = await request.get(`${BASE_API}/api/v1/notifications/campaigns/runs/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });

  test('MANAGER cannot access campaign results API (403) @manager', async ({ request }) => {
    const token = await loginAs(request, 'manager@example.com');
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const resp = await request.get(`${BASE_API}/api/v1/notifications/campaigns/${fakeId}/results/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });

  test('MANAGER cannot create campaigns (403) @manager', async ({ request }) => {
    const token = await loginAs(request, 'manager@example.com');
    const resp = await request.post(`${BASE_API}/api/v1/notifications/campaigns/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: 'Hack', message: 'Test', segment_id: 'all', channel: 'whatsapp' },
    });
    expect(resp.status()).toBe(403);
  });

  test('MANAGER cannot access WhatsApp QR (403) @manager', async ({ request }) => {
    const token = await loginAs(request, 'manager@example.com');
    const fakeTenantId = '00000000-0000-0000-0000-000000000000';
    const resp = await request.get(`${BASE_API}/api/v1/whatsapp/qr/${fakeTenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });

  test('MANAGER cannot disconnect WhatsApp (403) @manager', async ({ request }) => {
    const token = await loginAs(request, 'manager@example.com');
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

test.describe('WhatsApp & Analytics RBAC — STAFF blocked @staff', () => {

  test('STAFF cannot access campaign runs API (403) @staff', async ({ request }) => {
    const token = await loginAs(request, 'staff@example.com');
    const resp = await request.get(`${BASE_API}/api/v1/notifications/campaigns/runs/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });

  test('STAFF cannot create campaigns (403) @staff', async ({ request }) => {
    const token = await loginAs(request, 'staff@example.com');
    const resp = await request.post(`${BASE_API}/api/v1/notifications/campaigns/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: 'Hack', message: 'Test', segment_id: 'all', channel: 'email' },
    });
    expect(resp.status()).toBe(403);
  });

  test('STAFF cannot access WhatsApp QR (403) @staff', async ({ request }) => {
    const token = await loginAs(request, 'staff@example.com');
    const fakeTenantId = '00000000-0000-0000-0000-000000000000';
    const resp = await request.get(`${BASE_API}/api/v1/whatsapp/qr/${fakeTenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });

  test('STAFF cannot access campaign export (403) @staff', async ({ request }) => {
    const token = await loginAs(request, 'staff@example.com');
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

test.describe('WhatsApp & Analytics RBAC — SUPERADMIN blocked @superadmin', () => {

  test('SUPERADMIN cannot access campaign runs (no tenant, 403) @superadmin', async ({ request }) => {
    const token = await loginAs(request, 'admin@loyallia.com');
    const resp = await request.get(`${BASE_API}/api/v1/notifications/campaigns/runs/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // SUPER_ADMIN has no tenant → is_owner returns false → 403
    expect(resp.status()).toBe(403);
  });

  test('SUPERADMIN cannot create campaigns (403) @superadmin', async ({ request }) => {
    const token = await loginAs(request, 'admin@loyallia.com');
    const resp = await request.post(`${BASE_API}/api/v1/notifications/campaigns/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: 'SA Hack', message: 'Test', segment_id: 'all', channel: 'whatsapp' },
    });
    expect(resp.status()).toBe(403);
  });

  test('SUPERADMIN cannot access WhatsApp QR (403) @superadmin', async ({ request }) => {
    const token = await loginAs(request, 'admin@loyallia.com');
    const fakeTenantId = '00000000-0000-0000-0000-000000000000';
    const resp = await request.get(`${BASE_API}/api/v1/whatsapp/qr/${fakeTenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });
});

// =============================================================================
// WEBHOOK SECURITY — Unauthenticated calls blocked
// =============================================================================

test.describe('Webhook Security — Unauthenticated', () => {

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

test.describe('Cross-Tenant Isolation — OWNER @owner', () => {

  test('OWNER cannot access WhatsApp status for another tenant @owner', async ({ request }) => {
    const token = await loginAs(request, 'owner@example.com');
    // Use a different tenant ID that doesn't belong to this owner
    const otherTenantId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const resp = await request.get(`${BASE_API}/api/v1/whatsapp/status/${otherTenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });

  test('OWNER cannot disconnect another tenant WhatsApp @owner', async ({ request }) => {
    const token = await loginAs(request, 'owner@example.com');
    const otherTenantId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const resp = await request.post(`${BASE_API}/api/v1/whatsapp/disconnect/${otherTenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });
});
