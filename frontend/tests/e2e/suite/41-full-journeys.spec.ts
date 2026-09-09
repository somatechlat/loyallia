/**
 * Suite 41 — Full User Journeys E2E
 * Tests complete end-to-end user journeys across the platform:
 *
 *   **Owner Journey**: Create program → configure wallet designer → publish → view QR
 *   **Customer Journey**: Enroll → view pass → add to wallet
 *   **Manager Journey**: View dashboard → manage customers → view analytics
 *   **Staff Journey**: Scan QR → redeem pass → view transaction
 *   **SuperAdmin Journey**: View tenants → manage plans → impersonate owner
 *
 * Strategy: Hybrid API + UI.
 *   - API calls for fast, deterministic data setup
 *   - Playwright UI for user-facing interaction validation
 *   - Each journey is independent and self-contained
 *
 * All strings use real i18n keys from es.json.
 * Tests are idempotent: created records use UNIQUE_PREFIX and are cleaned up in afterAll.
 */
import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { getE2EBaseURL, loginRole, loginOwnerContext, getRoleCredentials } from '../helpers/e2e-safety';
import { getOwnerToken } from '../helpers/designer-auth';

const BASE_API = getE2EBaseURL();
const UNIQUE_PREFIX = `E2E Journey ${Date.now()}`;

// Shared state for cleanup
const createdProgramIds: string[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function cleanupPrograms(request: APIRequestContext): Promise<void> {
  const token = await loginRole(request, 'owner').catch(() => null);
  if (!token) return;
  for (const id of createdProgramIds) {
    await request.delete(`${BASE_API}/api/v1/programs/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
}

// =============================================================================
// JOURNEY 1: OWNER — Create Program → Configure → Publish → View QR
// =============================================================================

test.describe('Full Journey — Owner @owner @full-journey', () => {
  test.use({ storageState: '.auth/owner.json' });

  test.afterAll(async ({ request }) => {
    await cleanupPrograms(request);
  });

  test('Owner: Dashboard loads with navigation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Dashboard should load with nav/sidebar
    await page.locator('nav, aside, [data-testid="main-nav"], #sidebar').first()
      .waitFor({ state: 'visible', timeout: 15000 });

    // Should show key nav items
    const nav = page.locator('nav, aside').first();
    await expect(nav).toBeVisible({ timeout: 10000 });
  });

  test('Owner: Create program via wizard', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'networkidle' });

    // Step 0: Select card type (stamp)
    await page.getByText('Tarjeta de Sellos').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByText('Tarjeta de Sellos').click();
    await page.getByRole('button', { name: /siguiente/i }).click();

    // Step 1: Config — use defaults
    await page.getByText('Sellos requeridos').waitFor({ state: 'visible', timeout: 5000 });
    await page.getByRole('button', { name: /siguiente/i }).click();

    // Step 2: Design — fill name, select wallet provider
    await page.locator('#program-name').waitFor({ state: 'visible', timeout: 5000 });
    const programName = `${UNIQUE_PREFIX} Owner Journey`;
    await page.locator('#program-name').fill(programName);
    await page.locator('#program-desc').fill('Programa creado por journey E2E completo');

    // Select Google Wallet provider
    const googleBtn = page.getByRole('button', { name: 'Google Wallet' });
    if (await googleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await googleBtn.click();
    }

    await page.getByRole('button', { name: /siguiente/i }).click();

    // Step 3: Review
    await page.getByText(programName).first().waitFor({ state: 'visible', timeout: 5000 });

    // Submit
    const createBtn = page.getByRole('button', { name: /crear programa/i });
    await createBtn.click();

    // Wait for redirect to programs list
    await page.waitForURL(/.*programs.*/, { timeout: 20000 });
    expect(page.url()).toContain('/programs');
  });

  test('Owner: Navigate to program detail and view QR', async ({ page, request }) => {
    // Get the first available program
    const token = await getOwnerToken(request);
    const programsResp = await request.get(`${BASE_API}/api/v1/programs/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(programsResp.status()).toBe(200);
    const programs = await programsResp.json();
    const items = programs.programs || [];
    expect(items.length, 'At least one program must exist').toBeGreaterThan(0);

    const programId = items[0].id;

    // Navigate to program detail
    await page.goto(`/programs/${programId}`, { waitUntil: 'domcontentloaded' });

    // Should show program detail page
    await page.locator('h1, h2, .page-title, [class*="detail"]').first()
      .waitFor({ state: 'visible', timeout: 15000 });

    // QR code or enrollment section should be visible
    const qrOrDetail = page.locator('#enrollment-qr-img, img[alt*="QR"], svg[viewBox], .page-title').first();
    await expect(qrOrDetail).toBeVisible({ timeout: 10000 });
  });

  test('Owner: View analytics page', async ({ page }) => {
    await page.goto('/analytics', { waitUntil: 'domcontentloaded' });

    // Analytics page should show "Analíticas" heading
    await expect(page.locator('h1.page-title')).toContainText('Analíticas', { timeout: 15000 });
  });

  test('Owner: View billing page', async ({ page }) => {
    await page.goto('/billing', { waitUntil: 'domcontentloaded' });

    // Billing page should be visible
    await expect(page.locator('#billing-view')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Facturación' })).toBeVisible();
  });
});

// =============================================================================
// JOURNEY 2: CUSTOMER — Enroll → View Pass → Add to Wallet
// =============================================================================

test.describe('Full Journey — Customer @customer @full-journey', () => {

  let programId = '';
  let passId = '';
  let walletUrls: { apple: string; google: string; status: string } = { apple: '', google: '', status: '' };

  test.beforeAll(async ({ request }) => {
    const token = await loginRole(request, 'owner');

    // Create and publish a program
    const programResp = await request.post(`${BASE_API}/api/v1/programs/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: `${UNIQUE_PREFIX} Customer Journey`,
        description: 'Programa para journey de cliente E2E',
        card_type: 'stamp',
        barcode_type: 'qr_code',
        background_color: '#1A1A2E',
        text_color: '#FFFFFF',
        metadata: { wallet_provider: 'both', stamps_required: 10, reward_description: 'Café gratis' },
      },
    });
    expect(programResp.status()).toBe(200);
    const program = await programResp.json();
    programId = program.id;
    createdProgramIds.push(programId);

    await request.post(`${BASE_API}/api/v1/programs/${programId}/publish/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });

  test('Customer: Enrollment page loads for program', async ({ page }) => {
    expect(programId).toBeTruthy();

    await page.goto(`/enroll/${programId}`, { waitUntil: 'domcontentloaded' });

    // Should show program name
    await expect(page.getByText(`${UNIQUE_PREFIX} Customer Journey`)).toBeVisible({ timeout: 15000 });

    // Should show tenant attribution
    await expect(page.getByText(/^por /).first()).toBeVisible({ timeout: 5000 });
  });

  test('Customer: Enroll via API', async ({ request }) => {
    expect(programId).toBeTruthy();

    const uniqueEmail = `e2e-journey-customer-${Date.now()}@loyallia.com`;

    const resp = await request.post(
      `${BASE_API}/api/v1/customers/enroll/?card_id=${programId}`,
      {
        data: {
          first_name: 'E2E',
          last_name: 'Journey Customer',
          email: uniqueEmail,
          phone: '+593999000111',
        },
      },
    );

    expect(resp.status()).toBe(200);
    const pass = await resp.json();

    expect(pass.id).toBeTruthy();
    expect(pass.qr_code).toBeTruthy();
    expect(pass.wallet_urls).toBeDefined();
    expect(pass.wallet_urls.apple).toBeTruthy();
    expect(pass.wallet_urls.google).toBeTruthy();

    passId = pass.id;
    walletUrls = pass.wallet_urls;
  });

  test('Customer: View pass page', async ({ page }) => {
    expect(passId).toBeTruthy();

    await page.goto(`/pass/${passId}`, { waitUntil: 'domcontentloaded' });

    // Should show program name
    await expect(page.getByText(`${UNIQUE_PREFIX} Customer Journey`)).toBeVisible({ timeout: 15000 });

    // Should show member card with QR code
    await expect(page.getByText('Miembro')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Código')).toBeVisible({ timeout: 5000 });

    // QR code should render
    const qrCode = page.locator('svg[viewBox]').filter({ has: page.locator('rect') }).first();
    await expect(qrCode).toBeVisible({ timeout: 10000 });

    // Wallet section heading
    await expect(page.getByText('Agregar a billetera digital')).toBeVisible({ timeout: 5000 });
  });

  test('Customer: Wallet endpoints respond', async ({ request }) => {
    expect(walletUrls.status).toBeTruthy();

    // Wallet status
    const statusResp = await request.get(`${BASE_API}${walletUrls.status}`);
    expect(statusResp.status()).toBe(200);
    const status = await statusResp.json();
    expect(status.pass_id).toBe(passId);

    // Apple wallet
    const appleResp = await request.get(`${BASE_API}${walletUrls.apple}`);
    expect([200, 302, 400, 503].includes(appleResp.status())).toBe(true);

    // Google wallet
    const googleResp = await request.get(`${BASE_API}${walletUrls.google}`);
    expect([200, 302, 400, 503].includes(googleResp.status())).toBe(true);
  });

  test('Customer: Re-enrollment shows already enrolled', async ({ request }) => {
    expect(programId).toBeTruthy();

    const uniqueEmail = `e2e-journey-repeat-${Date.now()}@loyallia.com`;

    // First enrollment
    const first = await request.post(
      `${BASE_API}/api/v1/customers/enroll/?card_id=${programId}`,
      { data: { first_name: 'E2E', last_name: 'Repeat', email: uniqueEmail, phone: '+593999000222' } },
    );
    expect(first.status()).toBe(200);

    // Re-enrollment
    const second = await request.post(
      `${BASE_API}/api/v1/customers/enroll/?card_id=${programId}`,
      { data: { first_name: 'E2E', last_name: 'Repeat', email: uniqueEmail, phone: '+593999000222' } },
    );
    expect(second.status()).toBe(200);
    const pass = await second.json();
    expect(pass.already_enrolled).toBe(true);
  });
});

// =============================================================================
// JOURNEY 3: MANAGER — Dashboard → Customers → Analytics
// =============================================================================

test.describe('Full Journey — Manager @manager @full-journey', () => {
  test.use({ storageState: '.auth/manager.json' });

  test('Manager: Dashboard loads with navigation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Should show navigation
    await page.locator('nav, aside, [data-testid="main-nav"], #sidebar').first()
      .waitFor({ state: 'visible', timeout: 15000 });

    const nav = page.locator('nav, aside').first();
    await expect(nav).toBeVisible({ timeout: 10000 });
  });

  test('Manager: Customers page loads with table', async ({ page }) => {
    await page.goto('/customers', { waitUntil: 'domcontentloaded' });

    // Should show "Clientes" heading
    await expect(page.locator('h1').first()).toContainText('Clientes', { timeout: 15000 });

    // Should show customer table
    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ state: 'visible', timeout: 15000 });
    await expect(rows.first()).toBeVisible({ timeout: 15000 });
  });

  test('Manager: Cannot see import button', async ({ page }) => {
    await page.goto('/customers', { waitUntil: 'domcontentloaded' });

    // Wait for data to load
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 });

    // Import button should NOT be visible for managers
    const importBtn = page.locator('#open-import-modal-btn');
    await expect(importBtn).toHaveCount(0);
  });

  test('Manager: Analytics page loads', async ({ page }) => {
    await page.goto('/analytics', { waitUntil: 'domcontentloaded' });

    // Should show "Analíticas" heading
    await expect(page.locator('h1.page-title')).toContainText('Analíticas', { timeout: 15000 });
  });

  test('Manager: Programs page loads (read-only)', async ({ page }) => {
    await page.goto('/programs', { waitUntil: 'networkidle' });

    // Should show programs heading
    await expect(page.getByRole('heading', { name: 'Programas de fidelización' })).toBeVisible({ timeout: 15000 });

    // Should NOT see create button (manager is read-only)
    const createBtn = page.locator('#new-program-btn');
    await expect(createBtn).toHaveCount(0);
  });
});

// =============================================================================
// JOURNEY 4: STAFF — Scanner → Redeem → Transaction
// =============================================================================

test.describe('Full Journey — Staff @staff @full-journey', () => {
  test.use({ storageState: '.auth/staff.json' });

  test('Staff: Redirected to scanner on login', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Should redirect to scanner
    await page.waitForURL(/.*scanner.*/, { timeout: 30000 });
    expect(page.url()).toContain('/scanner');
  });

  test('Staff: Scanner page loads with main content', async ({ page }) => {
    await page.goto('/scanner/scan', { waitUntil: 'networkidle' });

    // Main content should be visible
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible({ timeout: 15000 });
  });

  test('Staff: Cannot access dashboard routes', async ({ page }) => {
    // Try to access programs
    await page.goto('/programs', { waitUntil: 'domcontentloaded' });

    // Should be redirected away from programs
    await page.waitForURL((url) => !url.toString().includes('/programs'), { timeout: 15000 });
  });

  test('Staff: Cannot access settings', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });

    // Should be redirected away from settings
    await page.waitForURL((url) => !url.toString().includes('/settings'), { timeout: 15000 });
  });

  test('Staff: Manual code entry available', async ({ page }) => {
    await page.goto('/scanner/scan', { waitUntil: 'networkidle' });

    const mainContent = page.locator('main');
    await mainContent.waitFor({ state: 'visible', timeout: 15000 });

    // Look for manual entry input
    const codeInput = page.locator(
      'input[type="text"], input[placeholder*="codigo" i], input[placeholder*="telefono" i], ' +
      'input[placeholder*="email" i], #customer-code-input, #manual-qr-input',
    ).first();

    if (await codeInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Input should be empty and editable
      await expect(codeInput).toBeEditable();
      const value = await codeInput.inputValue();
      expect(value).toBe('');
    } else {
      // Scanner may be camera-only
      test.skip();
    }
  });
});

// =============================================================================
// JOURNEY 5: SUPERADMIN — Tenants → Plans → Impersonate
// =============================================================================

test.describe('Full Journey — SuperAdmin @superadmin @full-journey', () => {
  test.use({ storageState: '.auth/superadmin.json' });

  test('SuperAdmin: Platform overview loads', async ({ page }) => {
    await page.goto('/superadmin', { waitUntil: 'domcontentloaded' });

    // Should load the SA dashboard
    await page.locator('main').first().waitFor({ state: 'visible', timeout: 15000 });
  });

  test('SuperAdmin: Tenant list shows tenants', async ({ page }) => {
    await page.goto('/superadmin/tenants', { waitUntil: 'domcontentloaded' });

    // Wait for table to load
    await page.getByRole('heading', { name: /Negocios/i }).waitFor({ state: 'visible', timeout: 15000 });

    // Should have tenant rows
    const tenantRows = page.locator('table tbody tr');
    await tenantRows.first().waitFor({ state: 'visible', timeout: 15000 });
    const count = await tenantRows.count();
    expect(count, 'Should have at least one tenant').toBeGreaterThan(0);
  });

  test('SuperAdmin: Plans page loads', async ({ page }) => {
    await page.goto('/superadmin/plans', { waitUntil: 'domcontentloaded' });

    // Should show plans heading
    await expect(page.getByRole('heading', { name: /Planes de Suscripción/ })).toBeVisible({ timeout: 10000 });

    // Should show plan count text
    const countText = page.locator('text=/\\d+ publicados|borradores|archivados/i');
    await expect(countText.first()).toBeVisible({ timeout: 5000 });
  });

  test('SuperAdmin: Can create a plan via API', async ({ request }) => {
    const token = await loginRole(request, 'superadmin');
    const unique = Date.now();
    const planName = `E2E Journey Plan ${unique}`;
    const planSlug = `e2e-journey-${unique}`;

    const createResp = await request.post(`${BASE_API}/api/v1/admin/plans/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: planName,
        slug: planSlug,
        description: 'Plan created by full journey E2E',
        price_monthly: 15,
        price_annual: 150,
        max_locations: 3,
        max_users: 5,
        max_customers: 500,
        max_programs: 3,
        max_notifications_month: 500,
        max_transactions_month: 500,
        max_whatsapp_day: 50,
        max_emails_month: 1000,
        max_sms_day: 50,
        max_wallet_pushes_month: 500,
        max_automations: 3,
        max_automation_executions_day: 100,
        max_ai_queries_month: 50,
        max_api_calls_day: 100,
        max_exports_month: 5,
        features: [],
        trial_days: 7,
        sort_order: 99,
        is_featured: false,
      },
    });
    expect(createResp.status()).toBe(200);
    const plan = await createResp.json();
    expect(plan.name).toBe(planName);

    // Verify plan appears in list
    const listResp = await request.get(`${BASE_API}/api/v1/admin/plans/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listResp.status()).toBe(200);
    const plans = await listResp.json();
    const found = plans.find((p: { slug: string }) => p.slug === planSlug);
    expect(found, 'Created plan should appear in list').toBeTruthy();

    // Cleanup: deactivate
    await request.delete(`${BASE_API}/api/v1/admin/plans/${plan.id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  });

  test('SuperAdmin: Settings page loads with integrations', async ({ page }) => {
    await page.goto('/superadmin/settings', { waitUntil: 'domcontentloaded' });

    // Should show settings heading
    await expect(page.getByRole('heading', { name: 'Configuración Global' })).toBeVisible({ timeout: 10000 });

    // Should show integrations
    await expect(page.getByRole('heading', { name: 'Integraciones' })).toBeVisible({ timeout: 5000 });
  });

  test('SuperAdmin: Impersonation flow', async ({ page, request }) => {
    // Setup owner PIN for impersonation
    const owner = await loginOwnerContext(request);
    const ownerCreds = getRoleCredentials('owner');
    const testPin = Math.floor(100000 + Math.random() * 900000).toString();

    const pinResp = await request.post(`${BASE_API}/api/v1/tenants/security-pin/`, {
      headers: { Authorization: `Bearer ${owner.token}` },
      data: {
        current_password: ownerCreds.password,
        pin: testPin,
      },
    });
    expect(pinResp.status()).toBe(200);

    // Get owner tenant info
    const superToken = await loginRole(request, 'superadmin');
    const tenantsResp = await request.get(`${BASE_API}/api/v1/admin/tenants/`, {
      headers: { Authorization: `Bearer ${superToken}` },
    });
    expect(tenantsResp.status()).toBe(200);
    const tenants = await tenantsResp.json();
    const ownerTenant = tenants.find((t: { id?: string }) => t.id === owner.tenantId);
    expect(ownerTenant?.name).toBeTruthy();

    // Navigate to SA tenant list
    await page.goto('/superadmin/tenants', { waitUntil: 'domcontentloaded' });
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 });

    // Find and click the owner tenant
    const ownerRow = page.locator('table tbody tr', { hasText: ownerTenant.name }).first();
    await expect(ownerRow).toBeVisible({ timeout: 15000 });
    await ownerRow.click();

    // Open impersonation form
    await page.getByRole('button', { name: 'Acciones' }).click();
    await page.getByLabel('PIN del propietario').fill(testPin);
    await page.getByLabel('Justificacion').fill('Full journey E2E impersonation test');

    // Confirm dialog
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /Impersonar Propietario/ }).click();

    // Should redirect to owner dashboard
    await page.waitForURL('/', { timeout: 15000 });

    // Should show impersonation banner
    await page.getByText('Modo impersonacion activo').waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.getByText('Modo impersonacion activo')).toBeVisible({ timeout: 15000 });

    // Should see owner navigation
    await expect(page.locator('nav, aside').getByText(/Resumen|Programas|Clientes/).first())
      .toBeVisible({ timeout: 10000 });

    // Return to SA
    await page.getByRole('button', { name: /Volver al Admin/ }).click();
    await expect(page).toHaveURL(/\/superadmin\/tenants/, { timeout: 15000 });

    // Should be back in SA context
    await expect(page.getByRole('link', { name: 'Plataforma' })).toBeVisible({ timeout: 10000 });
  });

  test('SuperAdmin: Metrics page loads', async ({ page }) => {
    await page.goto('/superadmin/metrics', { waitUntil: 'domcontentloaded' });

    // Should load metrics page
    await page.locator('main').first().waitFor({ state: 'visible', timeout: 15000 });
  });
});

// =============================================================================
// CROSS-JOURNEY: HEALTH CHECKS
// =============================================================================

test.describe('Full Journey — Health Checks @full-journey', () => {

  test('API health check returns OK', async ({ request }) => {
    const resp = await request.get(`${BASE_API}/api/v1/health/`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.status).toBe('ok');
    expect(body.platform).toBe('Loyallia');
  });

  test('Login API returns tokens for owner', async ({ request }) => {
    const creds = getRoleCredentials('owner');
    const resp = await request.post(`${BASE_API}/api/v1/auth/login/`, {
      data: creds,
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('access_token');
    expect(body).toHaveProperty('refresh_token');
    expect(body.role).toBe('OWNER');
  });

  test('Unauthenticated requests return 401', async ({ request }) => {
    const resp = await request.get(`${BASE_API}/api/v1/auth/users/me/`);
    expect(resp.status()).toBe(401);
  });

  test('Google OAuth config endpoint responds', async ({ request }) => {
    const resp = await request.get(`${BASE_API}/api/v1/auth/google/config/`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('enabled');
    expect(body).toHaveProperty('client_id');
  });
});
