/**
 * Loyallia — Playwright Global Auth Setup
 * Logs in once per role and saves browser state for reuse across all tests.
 *
 * Strategy: Use the Playwright request API to login directly, capture tokens,
 * then inject them as cookies. This bypasses the browser entirely for auth setup
 * and is the most reliable approach.
 *
 * Test users are created by the backend seed_test_data management command.
 * Set LOYALLIA_SEED_PASSWORD to match the password used during seeding.
 * NEVER hardcode passwords. NEVER fetch user passwords from Vault.
 */
import { test as setup, expect } from '@playwright/test';
import { getE2EBaseURL } from './e2e-safety';
import { E2E_TEST_USERS, getE2ESeedPassword } from './e2e-test-config';

const BASE_URL = getE2EBaseURL();
const COOKIE_DOMAIN = new URL(BASE_URL).hostname;
const COOKIE_SECURE = BASE_URL.startsWith('https');

setup('authenticate all roles', async ({ page, context, request }) => {
  const password = getE2ESeedPassword();

  const users = [
    { file: '.auth/owner.json', email: E2E_TEST_USERS.owner.email, password },
    { file: '.auth/manager.json', email: E2E_TEST_USERS.manager.email, password },
    { file: '.auth/staff.json', email: E2E_TEST_USERS.staff.email, password },
    { file: '.auth/superadmin.json', email: E2E_TEST_USERS.superadmin.email, password },
  ];

  for (const user of users) {
    // Clear all cookies from previous iterations
    await context.clearCookies();

    // Login via API directly (most reliable — no browser form interaction needed)
    const loginResp = await request.post(`${BASE_URL}/api/v1/auth/login/`, {
      data: { email: user.email, password: user.password },
    });

    expect(loginResp.status(), `Login API should return 200 for ${user.email}`).toBe(200);
    const body = await loginResp.json();
    const accessToken = body.access_token;
    const refreshToken = body.refresh_token;

    expect(accessToken, `access_token should exist for ${user.email}`).toBeTruthy();

    // Inject tokens as cookies
    await context.addCookies([
      {
        name: 'access_token',
        value: accessToken,
        domain: COOKIE_DOMAIN,
        path: '/',
        httpOnly: false,
        secure: COOKIE_SECURE,
        sameSite: 'Lax',
      },
      ...(refreshToken ? [{
        name: 'refresh_token',
        value: refreshToken,
        domain: COOKIE_DOMAIN,
        path: '/',
        httpOnly: false,
        secure: COOKIE_SECURE,
        sameSite: 'Lax' as const,
      }] : []),
    ]);

    // Navigate to verify the cookies work (page loads with auth)
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Pre-accept cookie consent banner to prevent it from blocking UI interactions
    await page.evaluate(() => localStorage.setItem('loyallia_cookie_consent', 'true'));

    // Wait for page to stabilize after navigation
    await page.waitForLoadState('networkidle');

    // Verify we're NOT on the login page (auth succeeded)
    const url = page.url();
    expect(url, `Should not be on login page for ${user.email}`).not.toContain('/login');

    // Save storage state (includes cookies + localStorage with consent)
    await page.context().storageState({ path: user.file });
  }
});
