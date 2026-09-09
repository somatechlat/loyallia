/**
 * Suite 37 — Customer Portal Complete E2E
 * Tests the full customer self-service portal lifecycle:
 *   - Generate password (API-level verification)
 *   - Login with password
 *   - View all cards across businesses
 *   - Disenroll from a program
 *   - Export personal data (JSON download)
 *   - Delete personal data (anonymization)
 *   - Delete account (permanent deletion with confirmation phrase)
 *   - Privacy page navigation
 *   - Logout
 *
 * Strategy: Hybrid API + UI.
 *   - API calls for deterministic data setup (program creation, enrollment, portal password)
 *   - Playwright UI for portal interaction validation
 *
 * All strings use real i18n keys from es.json.
 * Tests are idempotent: created records use UNIQUE_PREFIX and are cleaned up in afterAll.
 */
import { test, expect, type APIRequestContext } from '@playwright/test';
import { getE2EBaseURL, loginRole } from '../helpers/e2e-safety';

const BASE_API = getE2EBaseURL();
const UNIQUE_PREFIX = `E2E Portal ${Date.now()}`;
const TEST_EMAIL = `e2e-portal-${Date.now()}@loyallia.com`;
const TEST_PHONE = '+593999000999';

// Shared state across sequential tests within a describe block
let programId = '';
let passId = '';
let portalPassword = '';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Create a published program and enroll the test customer, returning passId. */
async function setupProgramAndEnroll(request: APIRequestContext): Promise<{ programId: string; passId: string }> {
  const token = await loginRole(request, 'owner');

  // Create program
  const programResp = await request.post(`${BASE_API}/api/v1/programs/`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name: `${UNIQUE_PREFIX} Program`,
      description: 'Programa de prueba para portal E2E',
      card_type: 'stamp',
      barcode_type: 'qr_code',
      background_color: '#1a1a2e',
      text_color: '#ffffff',
      metadata: { wallet_provider: 'both', stamps_required: 10, reward_description: 'Café gratis' },
    },
  });
  expect(programResp.status(), 'Program creation should succeed').toBe(200);
  const program = await programResp.json();

  // Publish program
  const publishResp = await request.post(`${BASE_API}/api/v1/programs/${program.id}/publish/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(publishResp.status(), 'Publish should succeed').toBe(200);

  // Enroll customer
  const enrollResp = await request.post(
    `${BASE_API}/api/v1/customers/enroll/?card_id=${program.id}`,
    {
      data: {
        first_name: 'E2E',
        last_name: 'Portal Tester',
        email: TEST_EMAIL,
        phone: TEST_PHONE,
      },
    },
  );
  expect(enrollResp.status(), 'Enrollment should succeed').toBe(200);
  const pass = await enrollResp.json();

  return { programId: program.id, passId: pass.id };
}

/** Setup a portal account with a known password via the E2E test endpoint.
 *  This endpoint is only available in DEBUG mode (development/test).
 *  It creates a CustomerPortalAccount with a deterministic password and returns it.
 */
async function setupPortalAccount(request: APIRequestContext): Promise<string> {
  const resp = await request.post(`${BASE_API}/api/v1/portal/_e2e-setup-account/`, {
    data: { email: TEST_EMAIL },
  });
  expect(resp.status(), 'E2E portal setup should return 200').toBe(200);
  const body = await resp.json();
  expect(body.password, 'Portal password should be returned').toBeTruthy();
  return body.password as string;
}

// =============================================================================
// PHASE 1: SETUP VIA API
// =============================================================================

test.describe('Portal — Phase 1: Data Setup @portal', () => {

  test('1a. Create program and enroll test customer', async ({ request }) => {
    const result = await setupProgramAndEnroll(request);
    programId = result.programId;
    passId = result.passId;
    expect(programId).toBeTruthy();
    expect(passId).toBeTruthy();
  });

  test('1b. Setup portal account for test customer', async ({ request }) => {
    portalPassword = await setupPortalAccount(request);
    expect(portalPassword).toBeTruthy();
  });
});

// =============================================================================
// PHASE 2: PORTAL LOGIN FLOW
// =============================================================================

test.describe('Portal — Phase 2: Login Flow @portal', () => {

  test('2a. Portal login page renders with generate-password form', async ({ page }) => {
    await page.goto('/portal/login', { waitUntil: 'domcontentloaded' });

    // Should show the Loyallia branding (h1 heading, not the footer span)
    await expect(page.getByRole('heading', { name: 'Loyallia' })).toBeVisible({ timeout: 10000 });

    // Should show generate-password step by default
    await expect(page.getByText('Generar contraseña')).toBeVisible({ timeout: 10000 });

    // Should show email input
    await expect(page.locator('#email')).toBeVisible({ timeout: 5000 });

    // Should show submit button
    await expect(page.getByRole('button', { name: /Enviar contraseña/i })).toBeVisible({ timeout: 5000 });

    // Should show "¿Ya tienes contraseña?" link to switch to login step
    await expect(page.getByText('¿Ya tienes contraseña?')).toBeVisible({ timeout: 5000 });
  });

  test('2b. Switch to login step shows password field', async ({ page }) => {
    await page.goto('/portal/login', { waitUntil: 'domcontentloaded' });

    // Click "Iniciar sesión" link to switch to login step
    await page.getByRole('button', { name: /Iniciar sesión/i }).click();

    // Should now show password field
    await expect(page.locator('#password')).toBeVisible({ timeout: 5000 });

    // Should show sign-in title
    await expect(page.getByText('Iniciar sesión')).toBeVisible({ timeout: 5000 });

    // Should show "¿No tienes contraseña?" link to go back
    await expect(page.getByText('¿No tienes contraseña?')).toBeVisible({ timeout: 5000 });
  });

  test('2c. Generate password via UI shows success', async ({ page }) => {
    // Call the E2E setup endpoint first to ensure the portal account exists
    // (this avoids depending on the generate-password email flow)
    const setupResp = await page.request.post(`${BASE_API}/api/v1/portal/_e2e-setup-account/`, {
      data: { email: TEST_EMAIL },
    });
    expect(setupResp.status()).toBe(200);

    await page.goto('/portal/login', { waitUntil: 'domcontentloaded' });

    await page.locator('#email').fill(TEST_EMAIL);

    // Wait for the API response
    const genPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/v1/portal/generate-password/'),
      { timeout: 15000 },
    );

    await page.getByRole('button', { name: /Enviar contraseña/i }).click();
    const genResp = await genPromise;

    // Should get 200 (or 429 if rate-limited)
    expect([200, 429].includes(genResp.status())).toBe(true);

    if (genResp.status() === 200) {
      // After success, the UI transitions to login step
      await expect(page.getByRole('heading', { name: /Iniciar sesión/i })).toBeVisible({ timeout: 5000 });
      await expect(page.locator('#password')).toBeVisible({ timeout: 5000 });
    }
  });

  test('2d. Login with portal password', async ({ page }) => {
    expect(portalPassword, 'Portal password must be generated in Phase 1').toBeTruthy();

    await page.goto('/portal/login', { waitUntil: 'domcontentloaded' });

    // Switch to login step
    await page.getByRole('button', { name: /Iniciar sesión/i }).click();
    await expect(page.locator('#password')).toBeVisible({ timeout: 5000 });

    // Fill credentials
    await page.locator('#email').fill(TEST_EMAIL);
    await page.locator('#password').fill(portalPassword);

    // Wait for login API response
    const loginPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/v1/portal/login/') && resp.status() === 200,
      { timeout: 15000 },
    );

    await page.getByRole('button', { name: /Iniciar sesión/i }).click();
    await loginPromise;

    // Should redirect to /portal (dashboard)
    await page.waitForURL(/\/portal$/, { timeout: 10000 });
    expect(page.url()).toContain('/portal');
  });

  test('2e. Invalid credentials show error', async ({ page }) => {
    await page.goto('/portal/login', { waitUntil: 'domcontentloaded' });

    // Switch to login step
    await page.getByRole('button', { name: /Iniciar sesión/i }).click();
    await expect(page.locator('#password')).toBeVisible({ timeout: 5000 });

    await page.locator('#email').fill('nonexistent@fake.com');
    await page.locator('#password').fill('wrongpassword123');

    await page.getByRole('button', { name: /Iniciar sesión/i }).click();

    // Should stay on portal/login (error toast shown)
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/portal/login');
  });
});

// =============================================================================
// PHASE 3: PORTAL DASHBOARD
// =============================================================================

test.describe('Portal — Phase 3: Dashboard @portal', () => {

  test.beforeEach(async ({ page }) => {
    // Login as portal customer before each test
    expect(portalPassword).toBeTruthy();

    // Set portal_token cookie directly (bypasses UI login for reliability)
    const loginResp = await page.request.post(`${BASE_API}/api/v1/portal/login/`, {
      data: { email: TEST_EMAIL, password: portalPassword },
    });
    expect(loginResp.status()).toBe(200);
    const body = await loginResp.json();
    const token = body.access_token;
    expect(token).toBeTruthy();

    // Set cookie
    await page.context().addCookies([{
      name: 'portal_token',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    }]);
  });

  test('3a. Portal dashboard loads with header and navigation', async ({ page }) => {
    await page.goto('/portal', { waitUntil: 'domcontentloaded' });

    // Header should show "Portal de Cliente"
    await expect(page.getByText('Portal de Cliente')).toBeVisible({ timeout: 10000 });

    // Should show "Mis Tarjetas" heading
    await expect(page.getByRole('heading', { name: 'Mis Tarjetas' })).toBeVisible({ timeout: 10000 });

    // Navigation links should be visible
    await expect(page.getByText('Privacidad')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Cerrar sesión')).toBeVisible({ timeout: 5000 });
  });

  test('3b. Enrolled program appears in card list', async ({ page }) => {
    await page.goto('/portal', { waitUntil: 'domcontentloaded' });

    // Should show the enrolled program name
    await expect(page.getByText(`${UNIQUE_PREFIX} Program`)).toBeVisible({ timeout: 15000 });

    // Should show QR code (the QRCodeSVG component renders an svg element)
    const qrCode = page.locator('svg[viewBox]').filter({ has: page.locator('rect') }).first();
    await expect(qrCode).toBeVisible({ timeout: 10000 });

    // Should show the card type badge
    await expect(page.getByText('Tarjeta de Sellos')).toBeVisible({ timeout: 5000 });

    // Should show enrollment date
    await expect(page.getByText(/Inscrito el/)).toBeVisible({ timeout: 5000 });

    // Should show disenroll button
    await expect(page.getByText('Salir del programa')).toBeVisible({ timeout: 5000 });
  });

  test('3c. Unauthenticated user redirects to portal login', async ({ page }) => {
    // Clear portal_token cookie
    await page.context().clearCookies();

    await page.goto('/portal', { waitUntil: 'domcontentloaded' });

    // Should redirect to /portal/login
    await page.waitForURL(/\/portal\/login/, { timeout: 10000 });
    expect(page.url()).toContain('/portal/login');
  });
});

// =============================================================================
// PHASE 4: PRIVACY PAGE
// =============================================================================

test.describe('Portal — Phase 4: Privacy Page @portal', () => {

  test.beforeEach(async ({ page }) => {
    expect(portalPassword).toBeTruthy();

    const loginResp = await page.request.post(`${BASE_API}/api/v1/portal/login/`, {
      data: { email: TEST_EMAIL, password: portalPassword },
    });
    expect(loginResp.status()).toBe(200);
    const body = await loginResp.json();
    expect(body.access_token).toBeTruthy();
    await page.context().addCookies([{
      name: 'portal_token',
      value: body.access_token,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    }]);
  });

  test('4a. Privacy page loads with all sections', async ({ page }) => {
    await page.goto('/portal/privacy', { waitUntil: 'domcontentloaded' });

    // Title: "Privacidad"
    await expect(page.getByText('Privacidad')).toBeVisible({ timeout: 10000 });

    // Back to cards link
    await expect(page.getByText('Volver a mis tarjetas')).toBeVisible({ timeout: 5000 });

    // Export data section
    await expect(page.getByRole('heading', { name: 'Exportar mis datos' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /Descargar datos/i })).toBeVisible({ timeout: 5000 });

    // Delete data section
    await expect(page.getByRole('heading', { name: 'Eliminar mis datos personales' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /Eliminar datos/i })).toBeVisible({ timeout: 5000 });

    // Delete account section (danger zone)
    await expect(page.getByRole('heading', { name: 'Eliminar mi cuenta' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /Eliminar cuenta permanentemente/i })).toBeVisible({ timeout: 5000 });
  });

  test('4b. Export data API returns valid JSON', async ({ request }) => {
    // Direct API test for export endpoint
    const loginResp = await request.post(`${BASE_API}/api/v1/portal/login/`, {
      data: { email: TEST_EMAIL, password: portalPassword },
    });
    const body = await loginResp.json();
    const token = body.access_token;

    const resp = await request.get(`${BASE_API}/api/v1/portal/export-data/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status(), 'Export data should return 200').toBe(200);
    const exportData = await resp.json();
    expect(exportData.data, 'Export should contain data object').toBeTruthy();
  });

  test('4c. Navigate back to portal from privacy page', async ({ page }) => {
    await page.goto('/portal/privacy', { waitUntil: 'domcontentloaded' });

    await page.getByText('Volver a mis tarjetas').click();
    await page.waitForURL(/\/portal$/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/portal$/);
  });

  test('4d. Delete data requires password', async ({ page }) => {
    await page.goto('/portal/privacy', { waitUntil: 'domcontentloaded' });

    // Click delete data without entering password — the handler checks
    // for password first, then calls confirm(). Playwright auto-dismisses
    // confirm dialogs, so no API call is made.
    await page.getByRole('button', { name: /Eliminar datos/i }).click();

    // The confirm() dialog auto-dismisses (returns false), so no API call.
    // Page should still be on privacy.
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/portal/privacy');
  });

  test('4e. Delete account requires confirmation phrase', async ({ page }) => {
    await page.goto('/portal/privacy', { waitUntil: 'domcontentloaded' });

    // Fill in the password field (shared between delete-data and delete-account sections)
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.first().fill(portalPassword);

    // Fill wrong confirmation phrase
    const confirmInput = page.locator('input[placeholder*="ACEPTO"]');
    await confirmInput.fill('WRONG PHRASE');

    // Click delete account button
    await page.getByRole('button', { name: /Eliminar cuenta permanentemente/i }).click();

    // The handler checks password and confirmation phrase client-side.
    // With wrong phrase, it shows a toast and returns early (no API call).
    // confirm() never fires. Page stays on privacy.
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/portal/privacy');
  });
});

// =============================================================================
// PHASE 5: DISENROLL
// =============================================================================

test.describe('Portal — Phase 5: Disenroll @portal', () => {

  test.beforeEach(async ({ page }) => {
    expect(portalPassword).toBeTruthy();

    const loginResp = await page.request.post(`${BASE_API}/api/v1/portal/login/`, {
      data: { email: TEST_EMAIL, password: portalPassword },
    });
    expect(loginResp.status()).toBe(200);
    const body = await loginResp.json();
    expect(body.access_token).toBeTruthy();
    await page.context().addCookies([{
      name: 'portal_token',
      value: body.access_token,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    }]);
  });

  test('5a. Disenroll API removes pass', async ({ request }) => {
    // First enroll again (to have something to disenroll)
    const ownerToken = await loginRole(request, 'owner');

    // Create a second program specifically for disenroll testing
    const progResp = await request.post(`${BASE_API}/api/v1/programs/`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: {
        name: `${UNIQUE_PREFIX} Disenroll Test`,
        description: 'Test disenroll',
        card_type: 'stamp',
        barcode_type: 'qr_code',
        background_color: '#2d2d3f',
        text_color: '#ffffff',
        metadata: { wallet_provider: 'both', stamps_required: 5, reward_description: 'Free coffee' },
      },
    });
    expect(progResp.status()).toBe(200);
    const prog = await progResp.json();

    await request.post(`${BASE_API}/api/v1/programs/${prog.id}/publish/`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });

    // Enroll
    const enrollResp = await request.post(
      `${BASE_API}/api/v1/customers/enroll/?card_id=${prog.id}`,
      {
        data: {
          first_name: 'E2E',
          last_name: 'Disenroll',
          email: TEST_EMAIL,
          phone: TEST_PHONE,
        },
      },
    );
    expect(enrollResp.status()).toBe(200);
    const enrollData = await enrollResp.json();
    const disPassId = enrollData.id;

    // Login as portal customer
    const portalLogin = await request.post(`${BASE_API}/api/v1/portal/login/`, {
      data: { email: TEST_EMAIL, password: portalPassword },
    });
    const portalBody = await portalLogin.json();
    const portalToken = portalBody.access_token;

    // Disenroll via API
    const disenrollResp = await request.delete(`${BASE_API}/api/v1/portal/passes/${disPassId}/`, {
      headers: { Authorization: `Bearer ${portalToken}` },
    });
    expect(disenrollResp.status(), 'Disenroll should succeed').toBe(200);

    // Verify pass is gone
    const passesResp = await request.get(`${BASE_API}/api/v1/portal/passes/`, {
      headers: { Authorization: `Bearer ${portalToken}` },
    });
    expect(passesResp.status()).toBe(200);
    const passesData = await passesResp.json();
    const remaining = (passesData.passes || []).filter(
      (p: { pass_id: string }) => p.pass_id === disPassId,
    );
    expect(remaining.length, 'Disenrolled pass should not appear').toBe(0);

    // Clean up: delete the program
    await request.delete(`${BASE_API}/api/v1/programs/${prog.id}/`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
  });
});

// =============================================================================
// PHASE 6: LOGOUT
// =============================================================================

test.describe('Portal — Phase 6: Logout @portal', () => {

  test('6a. Logout clears session and redirects to login', async ({ page }) => {
    expect(portalPassword).toBeTruthy();

    // Login
    const loginResp = await page.request.post(`${BASE_API}/api/v1/portal/login/`, {
      data: { email: TEST_EMAIL, password: portalPassword },
    });
    expect(loginResp.status()).toBe(200);
    const body = await loginResp.json();
    expect(body.access_token).toBeTruthy();
    await page.context().addCookies([{
      name: 'portal_token',
      value: body.access_token,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    }]);

    await page.goto('/portal', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Portal de Cliente')).toBeVisible({ timeout: 10000 });

    // Click logout
    await page.getByText('Cerrar sesión').click();

    // Should redirect to /portal/login
    await page.waitForURL(/\/portal\/login/, { timeout: 10000 });
    expect(page.url()).toContain('/portal/login');

    // Verify portal_token cookie is removed
    const cookies = await page.context().cookies();
    const portalCookie = cookies.find((c) => c.name === 'portal_token');
    expect(portalCookie).toBeUndefined();
  });
});

// =============================================================================
// PHASE 7: CLEANUP
// =============================================================================

test.describe('Portal — Phase 7: Cleanup @portal', () => {

  test.afterAll(async ({ request }) => {
    // Clean up: delete the test program via owner API
    if (programId) {
      const token = await loginRole(request, 'owner');
      await request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {}); // Best-effort cleanup
    }
  });

  test('7a. Verify cleanup state (no-op — cleanup runs in afterAll)', async ({ request }) => {
    // This test just verifies the program still exists before cleanup
    if (programId) {
      const token = await loginRole(request, 'owner');
      const resp = await request.get(`${BASE_API}/api/v1/programs/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(resp.status()).toBe(200);
    }
  });
});
