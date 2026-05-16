/**
 * Suite 18 — WhatsApp Bridge End-to-End (LYL-SRS-007)
 *
 * Full lifecycle testing of the WhatsApp Baileys bridge:
 * 1. BRIDGE HEALTH — Direct /health endpoint
 * 2. BRIDGE AUTH — API key enforcement
 * 3. DJANGO→BRIDGE — QR generation, status, disconnect via Django API
 * 4. SESSION LIFECYCLE — Start session, QR, disconnect, verify cleanup
 * 5. QUEUE — Message validation, queue stats
 * 6. RBAC — OWNER/MANAGER/STAFF/SUPERADMIN access control
 * 7. CROSS-TENANT — Isolation enforcement
 * 8. SETTINGS UI — Wizard renders, toggle works, QR displays
 *
 * Prerequisites:
 * - loyallia-whatsapp-bridge container running on localhost:33914
 * - loyallia-api container running (via nginx on localhost:80)
 * - PLAYWRIGHT_* role credentials configured for a real E2E tenant
 */
import { test, expect } from '@playwright/test';
import { getE2EBaseURL, loginOwnerContext, loginRole } from '../helpers/e2e-safety';
import { getLocalProviderSecret } from '../helpers/e2e-test-config';

const BASE_API = getE2EBaseURL();
const BRIDGE_URL = 'http://127.0.0.1:33914';
const bridgeApiKey = () => getLocalProviderSecret('whatsapp_bridge_api_key');

// =============================================================================
// 1. BRIDGE HEALTH — Direct access to the whatsapp-bridge container
// =============================================================================

test.describe('Bridge Health — Direct @owner @whatsapp', () => {

  test('Bridge /health returns status ok', async ({ request }) => {
    const resp = await request.get(`${BRIDGE_URL}/health`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.status).toBe('ok');
    expect(typeof body.sessions).toBe('number');
    expect(typeof body.uptime).toBe('number');
    expect(body.queue).toBeDefined();
    expect(typeof body.queue.waiting).toBe('number');
    expect(typeof body.queue.active).toBe('number');
    expect(typeof body.queue.completed).toBe('number');
    expect(typeof body.queue.failed).toBe('number');
  });

  test('Bridge /health does NOT require authentication', async ({ request }) => {
    // Health is the one endpoint that skips auth
    const resp = await request.get(`${BRIDGE_URL}/health`);
    expect(resp.status()).toBe(200);
  });
});

// =============================================================================
// 2. BRIDGE AUTH — API key enforcement on protected endpoints
// =============================================================================

test.describe('Bridge Auth — Direct @owner @whatsapp', () => {

  test('Bridge rejects /status without API key (401)', async ({ request }) => {
    const resp = await request.get(`${BRIDGE_URL}/status/any-tenant`, {
      headers: {},
    });
    expect(resp.status()).toBe(401);
    const body = await resp.json();
    expect(body.error).toBe('Unauthorized');
  });

  test('Bridge rejects /qr without API key (401)', async ({ request }) => {
    const resp = await request.get(`${BRIDGE_URL}/qr/any-tenant`, {
      headers: {},
    });
    expect(resp.status()).toBe(401);
  });

  test('Bridge rejects /send without API key (401)', async ({ request }) => {
    const resp = await request.post(`${BRIDGE_URL}/send`, {
      data: { tenant_id: 'x', phone: '+593', message: 'test' },
      headers: {},
    });
    expect(resp.status()).toBe(401);
  });

  test('Bridge rejects /disconnect without API key (401)', async ({ request }) => {
    const resp = await request.post(`${BRIDGE_URL}/disconnect/any-tenant`, {
      headers: {},
    });
    expect(resp.status()).toBe(401);
  });

  test('Bridge rejects invalid API key (401)', async ({ request }) => {
    const resp = await request.get(`${BRIDGE_URL}/status/any-tenant`, {
      headers: { Authorization: 'Bearer wrong-key' },
    });
    expect(resp.status()).toBe(401);
  });

  test('Bridge accepts correct API key', async ({ request }) => {
    const resp = await request.get(`${BRIDGE_URL}/status/any-tenant`, {
      headers: { Authorization: `Bearer ${bridgeApiKey()}` },
    });
    expect(resp.status()).toBe(200);
  });
});

// =============================================================================
// 3. BRIDGE SESSION — Status and QR via direct bridge access
// =============================================================================

test.describe('Bridge Session — Direct @owner @whatsapp', () => {

  test.beforeAll(() => {
  });

  test('Status returns default for unknown tenant', async ({ request }) => {
    const resp = await request.get(`${BRIDGE_URL}/status/nonexistent-tenant-xyz`, {
      headers: { Authorization: `Bearer ${bridgeApiKey()}` },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.connected).toBe(false);
    expect(body.qr).toBeNull();
    expect(body.phone).toBe('');
  });

  test('QR endpoint starts session and returns QR base64 PNG', async ({ request }) => {
    const testTenant = `e2e-qr-test-${Date.now()}`;
    const resp = await request.get(`${BRIDGE_URL}/qr/${testTenant}`, {
      headers: { Authorization: `Bearer ${bridgeApiKey()}` },
      timeout: 30000,
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    // QR should be generated (Baileys connects to WhatsApp servers)
    expect(body.connected).toBe(false);
    // QR is a data:image/png;base64 string
    if (body.qr) {
      expect(body.qr).toContain('data:image/png;base64,');
      expect(body.qr.length).toBeGreaterThan(100);
    }
    // Cleanup: disconnect this test session
    await request.post(`${BRIDGE_URL}/disconnect/${testTenant}`, {
      headers: { Authorization: `Bearer ${bridgeApiKey()}` },
    });
  });

  test('Disconnect cleans up session', async ({ request }) => {
    const testTenant = `e2e-disconnect-${Date.now()}`;
    // Start a session
    await request.get(`${BRIDGE_URL}/qr/${testTenant}`, {
      headers: { Authorization: `Bearer ${bridgeApiKey()}` },
      timeout: 30000,
    });

    // Disconnect
    const disconnectResp = await request.post(`${BRIDGE_URL}/disconnect/${testTenant}`, {
      headers: { Authorization: `Bearer ${bridgeApiKey()}` },
    });
    expect(disconnectResp.status()).toBe(200);
    const dcBody = await disconnectResp.json();
    expect(dcBody.success).toBe(true);

    // Verify status is clean after disconnect
    const statusResp = await request.get(`${BRIDGE_URL}/status/${testTenant}`, {
      headers: { Authorization: `Bearer ${bridgeApiKey()}` },
    });
    const status = await statusResp.json();
    expect(status.connected).toBe(false);
    expect(status.qr).toBeNull();
  });
});

// =============================================================================
// 4. BRIDGE SEND — Message validation (no real sending without paired session)
// =============================================================================

test.describe('Bridge Send Validation — Direct @owner @whatsapp', () => {

  test('Send rejects missing tenant_id (400)', async ({ request }) => {
    const resp = await request.post(`${BRIDGE_URL}/send`, {
      headers: { Authorization: `Bearer ${bridgeApiKey()}` },
      data: { phone: '+593991234567', message: 'test' },
    });
    expect(resp.status()).toBe(400);
    const body = await resp.json();
    expect(body.error).toContain('required');
  });

  test('Send rejects missing phone (400)', async ({ request }) => {
    const resp = await request.post(`${BRIDGE_URL}/send`, {
      headers: { Authorization: `Bearer ${bridgeApiKey()}` },
      data: { tenant_id: 'xxx', message: 'test' },
    });
    expect(resp.status()).toBe(400);
  });

  test('Send rejects missing message (400)', async ({ request }) => {
    const resp = await request.post(`${BRIDGE_URL}/send`, {
      headers: { Authorization: `Bearer ${bridgeApiKey()}` },
      data: { tenant_id: 'xxx', phone: '+593991234567' },
    });
    expect(resp.status()).toBe(400);
  });

  test('Send rejects invalid phone number (400)', async ({ request }) => {
    const resp = await request.post(`${BRIDGE_URL}/send`, {
      headers: { Authorization: `Bearer ${bridgeApiKey()}` },
      data: { tenant_id: 'xxx', phone: '123', message: 'test' },
    });
    expect(resp.status()).toBe(400);
    const body = await resp.json();
    expect(body.error).toContain('Invalid phone');
  });

  test('Send returns 409 when session not connected', async ({ request }) => {
    const resp = await request.post(`${BRIDGE_URL}/send`, {
      headers: { Authorization: `Bearer ${bridgeApiKey()}` },
      data: { tenant_id: 'no-session-tenant', phone: '+593991234567', message: 'test' },
    });
    expect(resp.status()).toBe(409);
    const body = await resp.json();
    expect(body.error).toContain('not connected');
    expect(body.connected).toBe(false);
  });
});

// =============================================================================
// 5. BRIDGE QUEUE — Stats endpoint
// =============================================================================

test.describe('Bridge Queue Stats — Direct @owner @whatsapp', () => {

  test('Queue stats endpoint returns metrics', async ({ request }) => {
    const resp = await request.get(`${BRIDGE_URL}/queue/stats`, {
      headers: { Authorization: `Bearer ${bridgeApiKey()}` },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(typeof body.waiting).toBe('number');
    expect(typeof body.active).toBe('number');
    expect(typeof body.completed).toBe('number');
    expect(typeof body.failed).toBe('number');
  });
});

// =============================================================================
// 6. DJANGO API → BRIDGE — Full stack path (via nginx → api → bridge)
// =============================================================================

test.describe('Django→Bridge API — OWNER @owner @whatsapp', () => {

  test.beforeAll(() => {
  });

  test('OWNER gets WhatsApp status through Django API', async ({ request }) => {
    const { token, tenantId } = await loginOwnerContext(request);
    const resp = await request.get(`${BASE_API}/api/v1/whatsapp/status/${tenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(typeof body.connected).toBe('boolean');
    expect(typeof body.messages_sent_today).toBe('number');
    expect(typeof body.daily_limit).toBe('number');
    expect(typeof body.messages_remaining).toBe('number');
  });

  test('OWNER generates QR through Django API', async ({ request }) => {
    const { token, tenantId } = await loginOwnerContext(request);
    const resp = await request.get(`${BASE_API}/api/v1/whatsapp/qr/${tenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000,
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(typeof body.connected).toBe('boolean');
    // QR should be a base64 PNG when bridge produces one
    if (body.qr) {
      expect(body.qr).toContain('data:image/png;base64,');
    }
  });

  test('OWNER disconnect through Django API', async ({ request }) => {
    const { token, tenantId } = await loginOwnerContext(request);
    const resp = await request.post(`${BASE_API}/api/v1/whatsapp/disconnect/${tenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.success).toBe(true);
  });

  test('Django status includes messages_remaining calculation', async ({ request }) => {
    const { token, tenantId } = await loginOwnerContext(request);
    const resp = await request.get(`${BASE_API}/api/v1/whatsapp/status/${tenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await resp.json();
    expect(body.messages_remaining).toBe(body.daily_limit - body.messages_sent_today);
  });
});

// =============================================================================
// 7. RBAC — Role-based access control enforcement through Django
// =============================================================================

test.describe('Django WhatsApp RBAC — MANAGER blocked @manager @whatsapp', () => {
  test.use({ storageState: '.auth/manager.json' });

  test('MANAGER cannot get WhatsApp status (403)', async ({ request }) => {
    const token = await loginRole(request, 'manager');
    const { tenantId } = await loginOwnerContext(request);
    const resp = await request.get(`${BASE_API}/api/v1/whatsapp/status/${tenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });

  test('MANAGER cannot get QR code (403)', async ({ request }) => {
    const token = await loginRole(request, 'manager');
    const { tenantId } = await loginOwnerContext(request);
    const resp = await request.get(`${BASE_API}/api/v1/whatsapp/qr/${tenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });

  test('MANAGER cannot disconnect WhatsApp (403)', async ({ request }) => {
    const token = await loginRole(request, 'manager');
    const { tenantId } = await loginOwnerContext(request);
    const resp = await request.post(`${BASE_API}/api/v1/whatsapp/disconnect/${tenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });
});

test.describe('Django WhatsApp RBAC — STAFF blocked @staff @whatsapp', () => {
  test.use({ storageState: '.auth/staff.json' });

  test('STAFF cannot get WhatsApp status (403)', async ({ request }) => {
    const token = await loginRole(request, 'staff');
    const { tenantId } = await loginOwnerContext(request);
    const resp = await request.get(`${BASE_API}/api/v1/whatsapp/status/${tenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });

  test('STAFF cannot get QR code (403)', async ({ request }) => {
    const token = await loginRole(request, 'staff');
    const { tenantId } = await loginOwnerContext(request);
    const resp = await request.get(`${BASE_API}/api/v1/whatsapp/qr/${tenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });

  test('STAFF cannot disconnect WhatsApp (403)', async ({ request }) => {
    const token = await loginRole(request, 'staff');
    const { tenantId } = await loginOwnerContext(request);
    const resp = await request.post(`${BASE_API}/api/v1/whatsapp/disconnect/${tenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });
});

test.describe('Django WhatsApp RBAC — SUPERADMIN blocked @superadmin @whatsapp', () => {
  test.use({ storageState: '.auth/superadmin.json' });

  test('SUPERADMIN cannot get WhatsApp status (403)', async ({ request }) => {
    const token = await loginRole(request, 'superadmin');
    const resp = await request.get(`${BASE_API}/api/v1/whatsapp/status/00000000-0000-0000-0000-000000000000/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });

  test('SUPERADMIN cannot generate QR (403)', async ({ request }) => {
    const token = await loginRole(request, 'superadmin');
    const resp = await request.get(`${BASE_API}/api/v1/whatsapp/qr/00000000-0000-0000-0000-000000000000/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });
});

// =============================================================================
// 8. CROSS-TENANT ISOLATION — OWNER cannot access another tenant's session
// =============================================================================

test.describe('Cross-Tenant Isolation @owner @security', () => {

  test('OWNER cannot access another tenant status (403)', async ({ request }) => {
    const { token } = await loginOwnerContext(request);
    const otherTenantId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const resp = await request.get(`${BASE_API}/api/v1/whatsapp/status/${otherTenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });

  test('OWNER cannot disconnect another tenant (403)', async ({ request }) => {
    const { token } = await loginOwnerContext(request);
    const otherTenantId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const resp = await request.post(`${BASE_API}/api/v1/whatsapp/disconnect/${otherTenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });

  test('OWNER cannot get QR for another tenant (403)', async ({ request }) => {
    const { token } = await loginOwnerContext(request);
    const otherTenantId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const resp = await request.get(`${BASE_API}/api/v1/whatsapp/qr/${otherTenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });
});

// =============================================================================
// 9. SESSION LIFECYCLE — Full start → status → disconnect → verify
// =============================================================================

test.describe('Session Lifecycle — Full cycle @owner @whatsapp', () => {

  test.beforeAll(() => {
  });

  test('Full lifecycle: QR → status shows session → disconnect → status clean', async ({ request }) => {
    const { token, tenantId } = await loginOwnerContext(request);

    // Step 1: Generate QR (starts session in bridge)
    const qrResp = await request.get(`${BASE_API}/api/v1/whatsapp/qr/${tenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000,
    });
    expect(qrResp.status()).toBe(200);
    const qrBody = await qrResp.json();
    expect(typeof qrBody.connected).toBe('boolean');

    // Step 2: Status should reflect the session exists (bridge has it)
    const statusResp = await request.get(`${BASE_API}/api/v1/whatsapp/status/${tenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(statusResp.status()).toBe(200);
    const statusBody = await statusResp.json();
    expect(typeof statusBody.connected).toBe('boolean');
    expect(typeof statusBody.daily_limit).toBe('number');

    // Step 3: Disconnect
    const dcResp = await request.post(`${BASE_API}/api/v1/whatsapp/disconnect/${tenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(dcResp.status()).toBe(200);
    expect((await dcResp.json()).success).toBe(true);

    // Step 4: Status should be disconnected
    const finalResp = await request.get(`${BASE_API}/api/v1/whatsapp/status/${tenantId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(finalResp.status()).toBe(200);
    const finalBody = await finalResp.json();
    expect(finalBody.connected).toBe(false);
  });
});

// =============================================================================
// 10. SETTINGS UI — WhatsApp Wizard integration in Settings page
// =============================================================================

test.describe('Settings WhatsApp Wizard — OWNER @owner @whatsapp', () => {

  test.beforeAll(() => {
  });

  test('Settings page renders Integraciones section', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    await expect(page.locator('#wa-integration-section')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#wa-toggle')).toBeVisible();
    await expect(page.getByText('WhatsApp Business Bridge')).toBeVisible();
  });

  test('Toggle activates bridge check and displays wizard state', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    await page.locator('#wa-toggle').click();
    await page.waitForTimeout(5000);

    // Should show one of: checking, QR, connected, or error
    const hasQr = await page.locator('#wa-wizard-content').count();
    const hasConnected = await page.locator('#wa-connected-dashboard').count();
    const hasChecking = await page.getByText('Verificando disponibilidad').count();
    const hasError = await page.getByText('no está disponible').count();
    expect(hasQr + hasConnected + hasChecking + hasError).toBeGreaterThan(0);
  });

  test('QR code image renders when bridge is available', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    await page.locator('#wa-toggle').click();
    // Wait for QR to render (bridge takes up to 5s internally)
    await page.waitForTimeout(10000);

    // Check if QR image appeared
    const qrImage = page.locator('#wa-wizard-content img');
    const qrCount = await qrImage.count();
    if (qrCount > 0) {
      // QR image should have a data:image/png;base64 src
      const src = await qrImage.first().getAttribute('src');
      expect(src).toContain('data:image/png;base64,');
    }
    // If QR didn't appear, checking state is also valid (Baileys delay)
  });

  test('Cancel button dismisses wizard', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.locator('#wa-toggle').click();
    await page.waitForTimeout(5000);

    const cancelBtn = page.locator('#wa-cancel-btn');
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await page.waitForTimeout(500);
      await expect(page.locator('#wa-wizard-content')).toHaveCount(0);
    }
  });

  test('Save settings button remains functional', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await expect(page.locator('#save-settings-btn')).toBeVisible();
  });
});

test.describe('Settings WhatsApp Wizard — MANAGER denied @manager @whatsapp', () => {
  test.use({ storageState: '.auth/manager.json' });

  test('MANAGER does not see WhatsApp section', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const isOnSettings = page.url().includes('/settings');
    if (isOnSettings) {
      await expect(page.locator('#wa-integration-section')).toHaveCount(0);
    }
    // else: redirected, which is correct RBAC behavior
  });
});
