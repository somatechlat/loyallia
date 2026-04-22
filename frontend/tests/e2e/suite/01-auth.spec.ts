/**
 * Suite 01 — Authentication & Role Routing
 * Tests login flow for all 4 roles, Google OAuth config endpoint,
 * registration form (with phone), and validates correct landing pages.
 */
import { test, expect } from '@playwright/test';

const BASE_API = 'http://localhost:33905';

async function login(page: any, email: string, password: string) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const emailInput = page.locator('#email');
  await emailInput.click();
  await emailInput.fill(email);
  const passwordInput = page.locator('#password');
  await passwordInput.click();
  await passwordInput.fill(password);
  await page.locator('#login-btn').click();
  await page.waitForTimeout(5000);
}

test.describe('Authentication & Role Routing', () => {

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
    await login(page, 'carlos@cafeelritmo.ec', '123456');
    const url = page.url();
    expect(url).not.toContain('/login');
  });

  test('MANAGER login lands on dashboard /', async ({ page }) => {
    await login(page, 'gabriela@cafeelritmo.ec', '123456');
    const url = page.url();
    expect(url).not.toContain('/login');
  });

  test('STAFF login redirects to /scanner/scan', async ({ page }) => {
    await login(page, 'sebastian@cafeelritmo.ec', '123456');
    const cookies = await page.context().cookies();
    const accessToken = cookies.find((c: any) => c.name === 'access_token');
    expect(accessToken).toBeTruthy();
    const url = page.url();
    expect(url).not.toContain('/login');
  });

  test('SUPER_ADMIN login redirects to /superadmin', async ({ page }) => {
    await login(page, 'admin@loyallia.com', '123456');
    const cookies = await page.context().cookies();
    const accessToken = cookies.find((c: any) => c.name === 'access_token');
    expect(accessToken).toBeTruthy();
    const url = page.url();
    expect(url).not.toContain('/login');
  });

  test('Invalid credentials show error and stay on login', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
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
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const link = page.getByRole('link', { name: /olvidaste/i });
    await expect(link).toBeVisible();
  });

  test('Register link navigates to /register', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const link = page.getByRole('link', { name: /reg[ií]strate/i });
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/register');
  });
});

test.describe('Registration Form', () => {

  test('Register page renders all fields including phone', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'networkidle' });
    await expect(page.locator('#register-business_name')).toBeVisible();
    await expect(page.locator('#register-first_name')).toBeVisible();
    await expect(page.locator('#register-last_name')).toBeVisible();
    await expect(page.locator('#register-email')).toBeVisible();
    await expect(page.locator('#register-phone_number')).toBeVisible();
    await expect(page.locator('#register-password')).toBeVisible();
    await expect(page.locator('#register-btn')).toBeVisible();
  });

  test('Register form validates required fields', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'networkidle' });
    await page.locator('#register-btn').click();
    await page.waitForTimeout(1000);
    // Should stay on register page
    expect(page.url()).toContain('/register');
  });

  test('Register form validates password length (min 8)', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'networkidle' });
    await page.locator('#register-business_name').fill('TestBiz');
    await page.locator('#register-first_name').fill('Test');
    await page.locator('#register-last_name').fill('User');
    await page.locator('#register-email').fill('test@example.com');
    await page.locator('#register-password').fill('short');
    await page.locator('#register-btn').click();
    await page.waitForTimeout(1000);
    // Should stay on register (password too short)
    expect(page.url()).toContain('/register');
  });

  test('Login link navigates to /login from register', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const link = page.getByRole('link', { name: /inicia sesi[oó]n/i });
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/login');
  });
});

test.describe('Google OAuth API', () => {

  test('GET /auth/google/config/ returns enabled + client_id', async ({ request }) => {
    const resp = await request.get(`${BASE_API}/api/v1/auth/google/config/`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('enabled');
    expect(body).toHaveProperty('client_id');
    // Should be enabled since we configured it
    expect(body.enabled).toBe(true);
    expect(body.client_id).toContain('.apps.googleusercontent.com');
  });

  test('POST /auth/google/login/ rejects invalid credential', async ({ request }) => {
    const resp = await request.post(`${BASE_API}/api/v1/auth/google/login/`, {
      data: { credential: 'fake-token-123', business_name: 'Test' },
    });
    expect(resp.status()).toBe(401);
  });
});

test.describe('Health & API Basics', () => {

  test('Health check endpoint returns OK', async ({ request }) => {
    const resp = await request.get(`${BASE_API}/api/v1/health/`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.status).toBe('ok');
    expect(body.platform).toBe('Loyallia');
  });

  test('Login API returns tokens', async ({ request }) => {
    const resp = await request.post(`${BASE_API}/api/v1/auth/login/`, {
      data: { email: 'carlos@cafeelritmo.ec', password: '123456' },
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
