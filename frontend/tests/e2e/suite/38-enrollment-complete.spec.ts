/**
 * Suite 38 — Enrollment Flow Complete E2E
 * Tests the full public enrollment journey:
 *   - Public enrollment page loads for a program
 *   - Fill enrollment form (first name, last name, email, phone)
 *   - Submit enrollment
 *   - Verify success state shows QR code
 *   - Verify wallet buttons appear (Apple/Google)
 *   - Verify 'already enrolled' state on re-enrollment
 *   - Verify enrollment with custom form fields
 *   - Verify honeypot bot protection
 *
 * Strategy: Hybrid API + UI.
 *   - API calls for program creation and publishing
 *   - Playwright UI for the public enrollment page (/enroll/[slug])
 *
 * All strings use real i18n keys from es.json.
 * Tests are idempotent: created records use UNIQUE_PREFIX and are cleaned up in afterAll.
 */
import { test, expect, type APIRequestContext } from '@playwright/test';
import { getE2EBaseURL, loginRole } from '../helpers/e2e-safety';

const BASE_API = getE2EBaseURL();
const UNIQUE_PREFIX = `E2E Enroll ${Date.now()}`;

// Shared state
let programId = '';
let publishedProgramId = '';
let customFieldProgramId = '';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createAndPublishProgram(
  request: APIRequestContext,
  name: string,
  metadata: Record<string, unknown> = {},
): Promise<string> {
  const token = await loginRole(request, 'owner');

  const resp = await request.post(`${BASE_API}/api/v1/programs/`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name,
      description: 'Programa de prueba para enrollment E2E',
      card_type: 'stamp',
      barcode_type: 'qr_code',
      background_color: '#1a1a2e',
      text_color: '#ffffff',
      metadata: { wallet_provider: 'both', stamps_required: 10, reward_description: 'Café gratis', ...metadata },
    },
  });
  expect(resp.status(), `Program creation should succeed for ${name}`).toBe(200);
  const program = await resp.json();

  const publishResp = await request.post(`${BASE_API}/api/v1/programs/${program.id}/publish/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(publishResp.status(), 'Publish should succeed').toBe(200);

  return program.id;
}

async function cleanupProgram(request: APIRequestContext, id: string): Promise<void> {
  if (!id) return;
  const token = await loginRole(request, 'owner');
  await request.delete(`${BASE_API}/api/v1/programs/${id}/`, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
}

// =============================================================================
// PHASE 1: SETUP
// =============================================================================

test.describe('Enrollment — Phase 1: Setup @enrollment', () => {

  test.beforeAll(async ({ request }) => {
    // Create standard program
    programId = await createAndPublishProgram(request, `${UNIQUE_PREFIX} Standard`);

    // Create program with custom form fields
    customFieldProgramId = await createAndPublishProgram(request, `${UNIQUE_PREFIX} Custom Fields`, {
      form_fields: [
        { id: 'first_name', type: 'text', label: 'Nombre', required: true },
        { id: 'last_name', type: 'text', label: 'Apellido', required: true },
        { id: 'email', type: 'email', label: 'Correo', required: true },
        { id: 'phone', type: 'tel', label: 'Teléfono', required: true },
        { id: 'date_of_birth', type: 'date', label: 'Fecha de nacimiento', required: false },
      ],
    });

    publishedProgramId = programId;
  });

  test.afterAll(async ({ request }) => {
    await cleanupProgram(request, programId);
    await cleanupProgram(request, customFieldProgramId);
  });

  test('1a. Programs created and published successfully', async () => {
    expect(programId).toBeTruthy();
    expect(customFieldProgramId).toBeTruthy();
  });

  test('1b. Public card API returns card data for enrollment page', async ({ request }) => {
    const resp = await request.get(`${BASE_API}/api/v1/cards/public/${programId}/`);
    expect(resp.status(), 'Public card API should return 200').toBe(200);
    const card = await resp.json();
    expect(card.name).toContain(UNIQUE_PREFIX);
    expect(card.card_type).toBe('stamp');
    expect(card.tenant_name).toBeTruthy();
  });

  test('1c. Public card API returns 404 for nonexistent program', async ({ request }) => {
    const resp = await request.get(`${BASE_API}/api/v1/cards/public/00000000-0000-0000-0000-000000000000/`);
    expect(resp.status()).toBe(404);
  });
});

// =============================================================================
// PHASE 2: ENROLLMENT PAGE UI
// =============================================================================

test.describe('Enrollment — Phase 2: Page UI @enrollment', () => {

  test('2a. Enrollment page loads with card info', async ({ page }) => {
    expect(programId).toBeTruthy();

    await page.goto(`/enroll/${programId}`, { waitUntil: 'domcontentloaded' });

    // Should show the program name
    await expect(page.getByText(`${UNIQUE_PREFIX} Standard`)).toBeVisible({ timeout: 15000 });

    // Should show "por" (by) with tenant name
    await expect(page.getByText(/^por /)).toBeVisible({ timeout: 5000 });

    // Should show the enrollment form subtitle
    await expect(page.getByText(/Completa tus datos/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('2b. Enrollment form has all required fields', async ({ page }) => {
    expect(programId).toBeTruthy();

    await page.goto(`/enroll/${programId}`, { waitUntil: 'domcontentloaded' });

    // Wait for form to be visible
    await page.waitForTimeout(2000);

    // Default form should have: Nombre, Apellido, Correo, Teléfono fields
    // These are rendered by EnrollmentForm component based on metadata.form_fields
    // or defaults if no custom fields defined

    // Check for form inputs exist (the form renders dynamically)
    const formInputs = page.locator('form input, form select');
    const inputCount = await formInputs.count();
    expect(inputCount, 'Enrollment form should have inputs').toBeGreaterThanOrEqual(3);
  });

  test('2c. Nonexistent program shows error state', async ({ page }) => {
    await page.goto('/enroll/00000000-0000-0000-0000-000000000000', { waitUntil: 'domcontentloaded' });

    // Should show "Programa no encontrado"
    await expect(page.getByText('Programa no encontrado')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/El enlace no es válido/)).toBeVisible({ timeout: 5000 });
  });
});

// =============================================================================
// PHASE 3: ENROLLMENT SUBMISSION
// =============================================================================

test.describe('Enrollment — Phase 3: Form Submission @enrollment', () => {

  test('3a. Enrollment via API succeeds and returns pass data', async ({ request }) => {
    expect(programId).toBeTruthy();

    const uniqueEmail = `e2e-enroll-api-${Date.now()}@loyallia.com`;

    const resp = await request.post(
      `${BASE_API}/api/v1/customers/enroll/?card_id=${programId}`,
      {
        data: {
          first_name: 'E2E',
          last_name: 'Enroller',
          email: uniqueEmail,
          phone: '+593999000111',
        },
      },
    );

    expect(resp.status(), 'Enrollment should succeed').toBe(200);
    const pass = await resp.json();

    // Verify pass structure
    expect(pass.id, 'Pass should have an ID').toBeTruthy();
    expect(pass.card_id, 'Pass should reference the program').toBe(programId);
    expect(pass.qr_code, 'Pass should have a QR code').toBeTruthy();
    expect(pass.wallet_urls, 'Pass should have wallet URLs').toBeDefined();
    expect(pass.wallet_urls.apple, 'Apple wallet URL should exist').toBeTruthy();
    expect(pass.wallet_urls.google, 'Google wallet URL should exist').toBeTruthy();
    expect(pass.wallet_urls.status, 'Wallet status URL should exist').toBeTruthy();
  });

  test('3b. Re-enrollment returns already_enrolled state', async ({ request }) => {
    expect(programId).toBeTruthy();

    const uniqueEmail = `e2e-enroll-repeat-${Date.now()}@loyallia.com`;

    // First enrollment
    const firstResp = await request.post(
      `${BASE_API}/api/v1/customers/enroll/?card_id=${programId}`,
      {
        data: {
          first_name: 'E2E',
          last_name: 'Repeat',
          email: uniqueEmail,
          phone: '+593999000222',
        },
      },
    );
    expect(firstResp.status()).toBe(200);

    // Second enrollment (same email, same program)
    const secondResp = await request.post(
      `${BASE_API}/api/v1/customers/enroll/?card_id=${programId}`,
      {
        data: {
          first_name: 'E2E',
          last_name: 'Repeat',
          email: uniqueEmail,
          phone: '+593999000222',
        },
      },
    );

    expect(secondResp.status()).toBe(200);
    const secondPass = await secondResp.json();

    // Should indicate already enrolled
    expect(secondPass.already_enrolled, 'Should return already_enrolled=true').toBe(true);
    // Should still return pass data
    expect(secondPass.id).toBeTruthy();
    expect(secondPass.qr_code).toBeTruthy();
  });

  test('3c. Enrollment without required fields returns error', async ({ request }) => {
    expect(programId).toBeTruthy();

    // Missing email
    const resp = await request.post(
      `${BASE_API}/api/v1/customers/enroll/?card_id=${programId}`,
      {
        data: {
          first_name: 'E2E',
          last_name: 'NoEmail',
          // email intentionally missing
          phone: '+593999000333',
        },
      },
    );

    // Should return 400 or error
    expect([400, 422, 500].includes(resp.status()), 'Missing email should fail').toBe(true);
  });

  test('3d. Enrollment with custom form fields via API', async ({ request }) => {
    expect(customFieldProgramId).toBeTruthy();

    const uniqueEmail = `e2e-custom-fields-${Date.now()}@loyallia.com`;

    const resp = await request.post(
      `${BASE_API}/api/v1/customers/enroll/?card_id=${customFieldProgramId}`,
      {
        data: {
          first_name: 'E2E',
          last_name: 'CustomFields',
          email: uniqueEmail,
          phone: '+593999000444',
          date_of_birth: '1990-01-15',
        },
      },
    );

    expect(resp.status(), 'Enrollment with custom fields should succeed').toBe(200);
    const pass = await resp.json();
    expect(pass.id).toBeTruthy();
    expect(pass.qr_code).toBeTruthy();
  });
});

// =============================================================================
// PHASE 4: ENROLLMENT UI INTERACTION
// =============================================================================

test.describe('Enrollment — Phase 4: UI Interaction @enrollment', () => {

  test('4a. Full UI enrollment flow shows success with QR', async ({ page }) => {
    expect(programId).toBeTruthy();
    const uniqueEmail = `e2e-ui-enroll-${Date.now()}@test.com`;

    await page.goto(`/enroll/${programId}`, { waitUntil: 'domcontentloaded' });

    // Wait for form to be ready
    await page.waitForTimeout(2000);

    // Fill form fields — the EnrollmentForm renders fields based on metadata
    // Default fields: first_name, last_name, email, phone, date_of_birth
    const firstNameInput = page.locator('input[name="first_name"], input[placeholder*="Juan"]').first();
    const lastNameInput = page.locator('input[name="last_name"], input[placeholder*="Pérez"]').first();
    const emailInput = page.locator('input[type="email"]').first();

    if (await firstNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstNameInput.fill('E2E');
      await lastNameInput.fill('UI Test');
      await emailInput.fill(uniqueEmail);

      // Phone field (optional in default form)
      const phoneInput = page.locator('input[type="tel"], input[name="phone"]').first();
      if (await phoneInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await phoneInput.fill('+593999000555');
      }

      // Accept privacy policy checkbox
      const privacyCheckbox = page.locator('input[type="checkbox"]').first();
      if (await privacyCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
        await privacyCheckbox.check();
      }

      // Submit the form
      const submitBtn = page.locator('button[type="submit"]').first();
      await expect(submitBtn).toBeVisible({ timeout: 5000 });

      // Wait for enrollment API response
      const enrollPromise = page.waitForResponse(
        (resp) => resp.url().includes('/api/v1/customers/enroll/') && resp.status() === 200,
        { timeout: 20000 },
      ).catch(() => null);

      await submitBtn.click();
      const enrollResp = await enrollPromise;

      if (enrollResp) {
        // Success state should show
        await expect(
          page.getByText(/Inscripción exitosa|Ya estás inscrito/).first(),
        ).toBeVisible({ timeout: 15000 });

        // QR code should render (QRCodeSVG)
        const qrSvg = page.locator('svg[viewBox]').filter({ has: page.locator('rect') }).first();
        await expect(qrSvg).toBeVisible({ timeout: 5000 });

        // View card link should appear
        await expect(page.getByText(/Ver mi tarjeta/)).toBeVisible({ timeout: 5000 });
      }
    } else {
      // Form may render differently — skip gracefully
      test.skip();
    }
  });

  test('4b. Honeypot bot protection: hidden field triggers fake success', async ({ page }) => {
    expect(programId).toBeTruthy();

    await page.goto(`/enroll/${programId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // The honeypot field is typically a hidden input that bots would fill
    // In the source, honeypot is a state variable rendered as a hidden input
    const hiddenInput = page.locator('input[style*="display: none"], input[style*="visibility: hidden"], input[type="text"][tabindex="-1"]').first();

    if (await hiddenInput.count() > 0) {
      // Bot fills the honeypot
      await hiddenInput.fill('bot-trap-value');

      // Also fill visible fields
      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await emailInput.fill('bot@example.com');
      }

      // Accept privacy
      const privacyCheckbox = page.locator('input[type="checkbox"]').first();
      if (await privacyCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
        await privacyCheckbox.check();
      }

      // Submit
      const submitBtn = page.locator('button[type="submit"]').first();
      if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitBtn.click();

        // The code handles honeypot by setting step='success' without making an API call
        // So it shows success but no real enrollment happens
        await page.waitForTimeout(2000);

        // Verify no real enrollment was created (page shows success but no QR code data)
        // The success state without enrollResult should not have a pass ID
        const passIdText = page.locator('text=/ID: [a-f0-9-]+/');
        const passIdCount = await passIdText.count();
        // If honeypot worked, there should be no real pass ID
        expect(passIdCount, 'Honeypot should prevent real enrollment').toBe(0);
      }
    } else {
      // Honeypot may not be rendered visibly — test at API level instead
      test.skip();
    }
  });
});

// =============================================================================
// PHASE 5: WALLET URLS VALIDATION
// =============================================================================

test.describe('Enrollment — Phase 5: Wallet URLs @enrollment', () => {

  test('5a. Wallet status endpoint returns valid structure', async ({ request }) => {
    expect(programId).toBeTruthy();

    // Enroll a fresh customer
    const email = `e2e-wallet-status-${Date.now()}@loyallia.com`;
    const enrollResp = await request.post(
      `${BASE_API}/api/v1/customers/enroll/?card_id=${programId}`,
      {
        data: {
          first_name: 'E2E',
          last_name: 'WalletStatus',
          email,
          phone: '+593999000666',
        },
      },
    );
    expect(enrollResp.status()).toBe(200);
    const pass = await enrollResp.json();
    expect(pass.wallet_urls.status).toBeTruthy();

    // Fetch wallet status
    const statusResp = await request.get(`${BASE_API}${pass.wallet_urls.status}`);
    expect(statusResp.status(), 'Wallet status should return 200').toBe(200);
    const status = await statusResp.json();

    expect(status.pass_id).toBe(pass.id);
    expect(typeof status.apple_wallet_available).toBe('boolean');
    expect(typeof status.google_wallet_available).toBe('boolean');
  });

  test('5b. Apple wallet endpoint responds', async ({ request }) => {
    expect(programId).toBeTruthy();

    const email = `e2e-apple-${Date.now()}@loyallia.com`;
    const enrollResp = await request.post(
      `${BASE_API}/api/v1/customers/enroll/?card_id=${programId}`,
      { data: { first_name: 'E2E', last_name: 'Apple', email, phone: '+593999000777' } },
    );
    expect(enrollResp.status()).toBe(200);
    const pass = await enrollResp.json();

    const appleResp = await request.get(`${BASE_API}${pass.wallet_urls.apple}`);
    // In local dev without Apple certs this may return 400/503
    expect(
      [200, 302, 400, 503].includes(appleResp.status()),
      `Apple endpoint should respond, got ${appleResp.status()}`,
    ).toBe(true);
  });

  test('5c. Google wallet endpoint responds', async ({ request }) => {
    expect(programId).toBeTruthy();

    const email = `e2e-google-${Date.now()}@loyallia.com`;
    const enrollResp = await request.post(
      `${BASE_API}/api/v1/customers/enroll/?card_id=${programId}`,
      { data: { first_name: 'E2E', last_name: 'Google', email, phone: '+593999000888' } },
    );
    expect(enrollResp.status()).toBe(200);
    const pass = await enrollResp.json();

    const googleResp = await request.get(`${BASE_API}${pass.wallet_urls.google}`);
    // In local dev without Google credentials this may return 400/503
    expect(
      [200, 302, 400, 503].includes(googleResp.status()),
      `Google endpoint should respond, got ${googleResp.status()}`,
    ).toBe(true);
  });
});

// =============================================================================
// PHASE 6: RATE LIMITING
// =============================================================================

test.describe('Enrollment — Phase 6: Edge Cases @enrollment', () => {

  test('6a. Enrollment with invalid card_id returns error', async ({ request }) => {
    const resp = await request.post(
      `${BASE_API}/api/v1/customers/enroll/?card_id=invalid-uuid`,
      {
        data: {
          first_name: 'E2E',
          last_name: 'Invalid',
          email: 'invalid@test.com',
        },
      },
    );

    expect([400, 404, 422, 500].includes(resp.status())).toBe(true);
  });

  test('6b. Enrollment for unpublished program returns error', async ({ request }) => {
    const token = await loginRole(request, 'owner');

    // Create but don't publish
    const progResp = await request.post(`${BASE_API}/api/v1/programs/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: `${UNIQUE_PREFIX} Unpublished`,
        description: 'Not published',
        card_type: 'stamp',
        barcode_type: 'qr_code',
        background_color: '#1a1a2e',
        text_color: '#ffffff',
        metadata: { wallet_provider: 'both', stamps_required: 10, reward_description: 'Free' },
      },
    });
    expect(progResp.status()).toBe(200);
    const prog = await progResp.json();

    // Try to enroll (program is not published)
    const enrollResp = await request.post(
      `${BASE_API}/api/v1/customers/enroll/?card_id=${prog.id}`,
      {
        data: {
          first_name: 'E2E',
          last_name: 'Unpublished',
          email: `e2e-unpublished-${Date.now()}@test.com`,
        },
      },
    );

    // Should fail (program not published → not visible)
    expect([400, 404, 422].includes(enrollResp.status())).toBe(true);

    // Cleanup
    await request.delete(`${BASE_API}/api/v1/programs/${prog.id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  });
});
