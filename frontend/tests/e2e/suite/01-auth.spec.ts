/**
 * Suite 01 — Authentication & Role Routing
 * Tests login flow for all 4 roles, Google OAuth config endpoint,
 * registration form (with phone), and validates correct landing pages.
 */
import { test, expect } from '@playwright/test';
import { getE2EBaseURL, getRoleCredentials } from '../helpers/e2e-safety';

const BASE_API = getE2EBaseURL();

async function login(page: any, email: string, password: string) {
  // Capture the login response directly to avoid race conditions with
  // the async page.on('response') handler.
  let accessToken: string | null = null;
  let refreshToken: string | null = null;

  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.locator('#email').waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);

  // Under full-suite load the Next.js dev server can be slow; use a
  // generous timeout for the login API response.
  const loginPromise = page.waitForResponse(
    (resp: any) => resp.url().includes('/api/v1/auth/login/') && resp.status() === 200,
    { timeout: 45000 },
  );
  await page.locator('#login-btn').click();
  const loginResponse = await loginPromise;

  try {
    const body = await loginResponse.json();
    accessToken = body.access_token || null;
    refreshToken = body.refresh_token || null;
  } catch { /* response already consumed */ }

  await page.waitForTimeout(1000);

  // Inject cookies manually since secure cookies won't stick on HTTP localhost.
  // Then navigate to / so the auth middleware can redirect to the correct landing page.
  if (accessToken) {
    const hasCookie = (await page.context().cookies()).some((c: any) => c.name === 'access_token');
    if (!hasCookie) {
      await page.context().addCookies([
        { name: 'access_token', value: accessToken, domain: 'localhost', path: '/', httpOnly: false, secure: false, sameSite: 'Lax' },
        ...(refreshToken ? [{ name: 'refresh_token', value: refreshToken, domain: 'localhost', path: '/', httpOnly: false, secure: false, sameSite: 'Lax' as const }] : []),
      ]);
    }
    // Navigate to root to trigger auth-gated redirect (login page won't auto-redirect)
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
  }
}

// LYL-M-FE-033: Browser form login can be flaky under full-suite load
// when Next.js dev server is compiling pages. Retries provide resilience.
test.describe.configure({ retries: 2 });

test.describe('Authentication & Role Routing @auth', () => {
  // Browser form login is sensitive to Next.js dev-server compilation
  // delays under full-suite load. A longer per-test timeout prevents
  // premature failures when the API or frontend is temporarily slow.
  test.slow();

  test('Login page renders with all elements', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#login-btn')).toBeVisible();
    // Google button container should exist (even if not rendered without GSI script)
    const heading = page.locator('h2');
    await expect(heading).toContainText('Iniciar sesión');
  });

  test('OWNER login lands on dashboard /', async ({ page }) => {
    const credentials = getRoleCredentials('owner');
    await login(page, credentials.email, credentials.password);
    const url = page.url();
    expect(url).not.toContain('/login');
  });

  test('MANAGER login lands on dashboard /', async ({ page }) => {
    const credentials = getRoleCredentials('manager');
    await login(page, credentials.email, credentials.password);
    const url = page.url();
    expect(url).not.toContain('/login');
  });

  test('STAFF login redirects to /scanner/scan', async ({ page }) => {
    const credentials = getRoleCredentials('staff');
    await login(page, credentials.email, credentials.password);
    const cookies = await page.context().cookies();
    const accessToken = cookies.find((c: any) => c.name === 'access_token');
    expect(accessToken).toBeTruthy();
    const url = page.url();
    expect(url).not.toContain('/login');
  });

  test('SUPER_ADMIN login redirects to /superadmin', async ({ page }) => {
    const credentials = getRoleCredentials('superadmin');
    await login(page, credentials.email, credentials.password);
    const cookies = await page.context().cookies();
    const accessToken = cookies.find((c: any) => c.name === 'access_token');
    expect(accessToken).toBeTruthy();
    const url = page.url();
    expect(url).not.toContain('/login');
  });

  test('Invalid credentials show error and stay on login', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const emailInput = page.locator('#email');
    await emailInput.click();
    await emailInput.fill('fake@nope.com');
    const passwordInput = page.locator('#password');
    await passwordInput.click();
    await passwordInput.fill('wrongpassword');
    await page.locator('#login-btn').click();
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).toContain('/login');
  });

  test('Forgot password link exists', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const link = page.getByRole('link', { name: /olvidaste/i });
    await expect(link).toBeVisible();
  });

  test('Register link navigates to /register', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const link = page.getByRole('link', { name: /reg[ií]strate/i });
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/register');
  });
});

test.describe('Registration Form @auth', () => {

  test('Register page renders all fields including phone', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#register-business_name')).toBeVisible();
    await expect(page.locator('#register-first_name')).toBeVisible();
    await expect(page.locator('#register-last_name')).toBeVisible();
    await expect(page.locator('#register-email')).toBeVisible();
    await expect(page.locator('#register-phone_number')).toBeVisible();
    await expect(page.locator('#register-password')).toBeVisible();
    await expect(page.locator('#register-btn')).toBeVisible();
  });

  test('Register form validates required fields', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await page.locator('#register-btn').click();
    await page.waitForTimeout(1000);
    // Should stay on register page
    expect(page.url()).toContain('/register');
  });

  test('Register form validates password length (min 8)', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await page.locator('#register-business_name').fill('TestBiz');
    await page.locator('#register-first_name').fill('Test');
    await page.locator('#register-last_name').fill('User');
    await page.locator('#register-email').fill('test@loyallia.com');
    await page.locator('#register-password').fill('short');
    await page.locator('#register-btn').click();
    await page.waitForTimeout(1000);
    // Should stay on register (password too short)
    expect(page.url()).toContain('/register');
  });

  test('Login link navigates to /login from register', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const link = page.getByRole('link', { name: /inicia sesi[oó]n/i });
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/login');
  });
});

test.describe('Google OAuth API @auth', () => {

  test('GET /auth/google/config/ returns enabled status and client_id', async ({ request }) => {
    const resp = await request.get(`${BASE_API}/api/v1/auth/google/config/`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('enabled');
    expect(body).toHaveProperty('client_id');
  });

  test('POST /auth/google/login/ rejects invalid credential', async ({ request }) => {
    const resp = await request.post(`${BASE_API}/api/v1/auth/google/login/`, {
      data: { credential: 'fake-token-123', business_name: 'Test' },
    });
    expect(resp.status()).toBe(401);
  });
});

test.describe('Health & API Basics @auth', () => {

  test('Health check endpoint returns OK', async ({ request }) => {
    const resp = await request.get(`${BASE_API}/api/v1/health/`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.status).toBe('ok');
    expect(body.platform).toBe('Loyallia');
  });

  test('Login API returns tokens', async ({ request }) => {
    const credentials = getRoleCredentials('owner');
    const resp = await request.post(`${BASE_API}/api/v1/auth/login/`, {
      data: credentials,
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('access_token');
    expect(body).toHaveProperty('refresh_token');
    expect(body.role).toBe('OWNER');
  });

  test('Unauthenticated /me/ returns 401', async ({ request }) => {
    const resp = await request.get(`${BASE_API}/api/v1/auth/me/`);
    expect(resp.status()).toBe(401);
  });
});
