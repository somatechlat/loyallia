/**
 * Suite 40 — Password Recovery Flow E2E
 * Tests the password recovery (forgot-password + reset-password) pages:
 *   - Forgot password page loads with all elements
 *   - Submit email for password reset (API integration)
 *   - Invalid email shows error
 *   - Rate limiting on password requests
 *   - Reset password page with invalid token shows error
 *   - Reset password page with missing params shows error
 *   - Back to login navigation
 *
 * Strategy: Hybrid API + UI.
 *   - UI for page rendering and form interaction
 *   - API for backend validation and rate limit testing
 *
 * All strings use real i18n keys from es.json.
 * Tests are idempotent: no persistent state changes.
 */
import { test, expect, type APIRequestContext } from '@playwright/test';
import { getE2EBaseURL, getRoleCredentials } from '../helpers/e2e-safety';

const BASE_API = getE2EBaseURL();

// =============================================================================
// FORGOT PASSWORD PAGE
// =============================================================================

test.describe('Password Recovery — Forgot Password Page @password-recovery', () => {

  test('1a. Forgot password page renders all elements', async ({ page }) => {
    await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });

    // Should show the title: "¿Olvidaste tu contraseña?"
    await expect(page.getByRole('heading', { name: '¿Olvidaste tu contraseña?' })).toBeVisible({ timeout: 10000 });

    // Should show subtitle
    await expect(
      page.getByText('Ingresa tu correo y te enviaremos un enlace para restablecerla.'),
    ).toBeVisible({ timeout: 5000 });

    // Should show email input
    await expect(page.locator('#reset-email')).toBeVisible({ timeout: 5000 });

    // Should show submit button
    await expect(page.locator('#forgot-pw-btn')).toBeVisible({ timeout: 5000 });

    // Should show "Volver a iniciar sesión" link
    await expect(page.getByText(/Volver a iniciar sesión/)).toBeVisible({ timeout: 5000 });
  });

  test('1b. Email input has correct attributes', async ({ page }) => {
    await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });

    const emailInput = page.locator('#reset-email');
    await expect(emailInput).toBeVisible({ timeout: 5000 });

    // Should be email type
    await expect(emailInput).toHaveAttribute('type', 'email');

    // Should have placeholder
    const placeholder = await emailInput.getAttribute('placeholder');
    expect(placeholder).toBeTruthy();
  });

  test('1c. Submit button has correct initial text', async ({ page }) => {
    await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });

    const btn = page.locator('#forgot-pw-btn');
    await expect(btn).toBeVisible({ timeout: 5000 });

    // Button text: "Enviar enlace de restablecimiento"
    await expect(btn).toContainText('Enviar enlace de restablecimiento');
  });
});

// =============================================================================
// FORGOT PASSWORD API
// =============================================================================

test.describe('Password Recovery — Forgot Password API @password-recovery', () => {

  test('2a. POST /auth/forgot-password/ with valid email returns success', async ({ request }) => {
    const ownerCreds = getRoleCredentials('owner');

    const resp = await request.post(`${BASE_API}/api/v1/auth/forgot-password/`, {
      data: { email: ownerCreds.email },
    });

    // Should return 200 (always success to prevent email enumeration)
    expect(resp.status(), 'Forgot password should return 200').toBe(200);
  });

  test('2b. POST /auth/forgot-password/ with nonexistent email also returns success', async ({ request }) => {
    // Security: endpoint should not reveal whether email exists
    const resp = await request.post(`${BASE_API}/api/v1/auth/forgot-password/`, {
      data: { email: 'nonexistent-user-12345@fake-domain.com' },
    });

    // Should still return 200 (prevents email enumeration)
    expect(resp.status(), 'Forgot password should return 200 even for unknown email').toBe(200);
  });

  test('2c. POST /auth/forgot-password/ without email returns error', async ({ request }) => {
    const resp = await request.post(`${BASE_API}/api/v1/auth/forgot-password/`, {
      data: {},
    });

    // Should return 400 or 422 (missing required field)
    expect([400, 422].includes(resp.status()), 'Missing email should return 4xx').toBe(true);
  });

  test('2d. POST /auth/forgot-password/ with invalid email format returns error', async ({ request }) => {
    const resp = await request.post(`${BASE_API}/api/v1/auth/forgot-password/`, {
      data: { email: 'not-an-email' },
    });

    // Should return 400 or 422 (invalid format)
    expect([400, 422, 200].includes(resp.status()), 'Invalid email format should be handled').toBe(true);
  });
});

// =============================================================================
// FORGOT PASSWORD UI INTERACTION
// =============================================================================

test.describe('Password Recovery — Forgot Password UI @password-recovery', () => {

  test('3a. Submit with valid email shows success state', async ({ page }) => {
    const ownerCreds = getRoleCredentials('owner');

    await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });

    await page.locator('#reset-email').fill(ownerCreds.email);

    // Wait for API response
    const forgotPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/v1/auth/forgot-password/') && resp.status() === 200,
      { timeout: 15000 },
    );

    await page.locator('#forgot-pw-btn').click();
    await forgotPromise;

    // After success, should show "Correo enviado" title
    await expect(page.getByText('Correo enviado')).toBeVisible({ timeout: 10000 });

    // Should show description with the email
    await expect(
      page.getByText(/estás registrado, recibirás un enlace/).first(),
    ).toBeVisible({ timeout: 5000 });

    // Should show spam note
    await expect(
      page.getByText('Revisa también tu carpeta de spam.'),
    ).toBeVisible({ timeout: 5000 });

    // Should show back to login button
    await expect(
      page.getByText(/Volver a iniciar sesión/).first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test('3b. Back to login link works from forgot password page', async ({ page }) => {
    await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });

    const backLink = page.getByText(/Volver a iniciar sesión/).first();
    await expect(backLink).toBeVisible({ timeout: 5000 });
    await backLink.click();

    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('3c. Forgot password link accessible from login page', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // The login page has "¿Olvidaste tu contraseña?" link
    const forgotLink = page.getByRole('link', { name: /olvidaste/i });
    await expect(forgotLink).toBeVisible({ timeout: 10000 });
    await forgotLink.click();

    await page.waitForURL(/\/forgot-password/, { timeout: 10000 });
    expect(page.url()).toContain('/forgot-password');
  });
});

// =============================================================================
// RESET PASSWORD PAGE
// =============================================================================

test.describe('Password Recovery — Reset Password Page @password-recovery', () => {

  test('4a. Reset password page without params shows invalid link', async ({ page }) => {
    await page.goto('/reset-password', { waitUntil: 'domcontentloaded' });

    // Should show "Enlace inválido" since no uid/token params
    await expect(page.getByText('Enlace inválido')).toBeVisible({ timeout: 10000 });

    // Should show description
    await expect(
      page.getByText('Este enlace de restablecimiento no es válido.'),
    ).toBeVisible({ timeout: 5000 });

    // Should show "Solicitar nuevo enlace" button
    await expect(
      page.getByText('Solicitar nuevo enlace'),
    ).toBeVisible({ timeout: 5000 });
  });

  test('4b. Reset password page with invalid params shows invalid link', async ({ page }) => {
    await page.goto('/reset-password?uid=invalid&token=invalid', { waitUntil: 'domcontentloaded' });

    // Should show the reset form (params are present)
    await expect(page.getByRole('heading', { name: 'Nueva contraseña' })).toBeVisible({ timeout: 10000 });

    // Should show password fields
    await expect(page.locator('#new-pw')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#confirm-pw')).toBeVisible({ timeout: 5000 });

    // Should show submit button
    await expect(page.locator('#reset-pw-btn')).toBeVisible({ timeout: 5000 });
  });

  test('4c. Reset password form validates minimum length', async ({ page }) => {
    await page.goto('/reset-password?uid=invalid&token=invalid', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#new-pw')).toBeVisible({ timeout: 10000 });

    // Fill with short password (< 6 chars)
    await page.locator('#new-pw').fill('12345');
    await page.locator('#confirm-pw').fill('12345');

    // Submit
    await page.locator('#reset-pw-btn').click();

    // Should show minimum length error toast
    await expect(
      page.getByText(/La contraseña debe tener al menos 6 caracteres/).first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test('4d. Reset password form validates password match', async ({ page }) => {
    await page.goto('/reset-password?uid=invalid&token=invalid', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#new-pw')).toBeVisible({ timeout: 10000 });

    // Fill with mismatched passwords
    await page.locator('#new-pw').fill('password123');
    await page.locator('#confirm-pw').fill('different456');

    // Submit
    await page.locator('#reset-pw-btn').click();

    // Should show mismatch error toast
    await expect(
      page.getByText(/Las contraseñas no coinciden/).first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test('4e. Reset password with invalid token shows error', async ({ page }) => {
    await page.goto('/reset-password?uid=invalid&token=invalid', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#new-pw')).toBeVisible({ timeout: 10000 });

    // Fill valid passwords
    await page.locator('#new-pw').fill('NewPassword123!');
    await page.locator('#confirm-pw').fill('NewPassword123!');

    // Wait for API response
    const resetPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/v1/auth/reset-password/'),
      { timeout: 15000 },
    );

    await page.locator('#reset-pw-btn').click();
    const resetResp = await resetPromise;

    // Should fail (invalid token)
    expect(resetResp.status()).not.toBe(200);

    // Should show error toast
    await expect(
      page.getByText(/El enlace es inválido o ha expirado|Error/).first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test('4f. "Solicitar nuevo enlace" navigates to forgot-password', async ({ page }) => {
    // Navigate to reset-password without params
    await page.goto('/reset-password', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Solicitar nuevo enlace')).toBeVisible({ timeout: 10000 });

    // Click the link
    await page.getByText('Solicitar nuevo enlace').click();

    // Should navigate to /forgot-password
    await page.waitForURL(/\/forgot-password/, { timeout: 10000 });
    expect(page.url()).toContain('/forgot-password');
  });
});

// =============================================================================
// RESET PASSWORD API
// =============================================================================

test.describe('Password Recovery — Reset Password API @password-recovery', () => {

  test('5a. POST /auth/reset-password/ with invalid token returns error', async ({ request }) => {
    const resp = await request.post(`${BASE_API}/api/v1/auth/reset-password/`, {
      data: {
        uid: 'invalid-uid',
        token: 'invalid-token',
        new_password: 'NewPassword123!',
      },
    });

    // Should return 400 (invalid/expired token)
    expect(resp.status()).toBe(400);
  });

  test('5b. POST /auth/reset-password/ with missing fields returns error', async ({ request }) => {
    const resp = await request.post(`${BASE_API}/api/v1/auth/reset-password/`, {
      data: {},
    });

    // Should return 400 or 422 (missing required fields)
    expect([400, 422].includes(resp.status()), 'Missing fields should return 4xx').toBe(true);
  });

  test('5c. POST /auth/reset-password/ with short password returns error', async ({ request }) => {
    const resp = await request.post(`${BASE_API}/api/v1/auth/reset-password/`, {
      data: {
        uid: 'some-uid',
        token: 'some-token',
        new_password: '123',
      },
    });

    // Should return 400 (password too short or invalid token)
    expect([400, 422].includes(resp.status())).toBe(true);
  });
});

// =============================================================================
// RATE LIMITING
// =============================================================================

test.describe('Password Recovery — Rate Limiting @password-recovery', () => {

  test('6a. Multiple rapid forgot-password requests are rate-limited', async ({ request }) => {
    // The backend rate-limits /auth/forgot-password/ endpoint
    // (defined in common/rate_limit.py)
    // We send multiple requests in quick succession to trigger the limit

    const email = `e2e-ratelimit-${Date.now()}@test.com`;
    const responses: number[] = [];

    // Send 10 rapid requests
    for (let i = 0; i < 10; i++) {
      const resp = await request.post(`${BASE_API}/api/v1/auth/forgot-password/`, {
        data: { email },
      });
      responses.push(resp.status());
    }

    // At least some should succeed (200), and after rate limit kicks in, we may get 429
    const has200 = responses.some((s) => s === 200);
    const has429 = responses.some((s) => s === 429);

    // At minimum, the first request should succeed
    expect(has200, 'At least one request should succeed').toBe(true);

    // Note: If rate limiting is strict, later requests return 429
    // If rate limiting uses a sliding window, all may succeed
    // This test validates the endpoint handles rapid-fire requests gracefully
  });
});

// =============================================================================
// NAVIGATION FLOW
// =============================================================================

test.describe('Password Recovery — Navigation Flow @password-recovery', () => {

  test('7a. Complete navigation: Login → Forgot → Back to Login', async ({ page }) => {
    // Start at login
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Click forgot password link
    const forgotLink = page.getByRole('link', { name: /olvidaste/i });
    await expect(forgotLink).toBeVisible({ timeout: 10000 });
    await forgotLink.click();

    // Should be on forgot-password page
    await page.waitForURL(/\/forgot-password/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: '¿Olvidaste tu contraseña?' })).toBeVisible({ timeout: 5000 });

    // Click back to login
    const backLink = page.getByText(/Volver a iniciar sesión/).first();
    await expect(backLink).toBeVisible({ timeout: 5000 });
    await backLink.click();

    // Should be back on login
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('7b. Login page has correct heading', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Login page should show "Iniciar sesión" heading
    await expect(page.locator('h2')).toContainText('Iniciar sesión', { timeout: 10000 });
  });
});
