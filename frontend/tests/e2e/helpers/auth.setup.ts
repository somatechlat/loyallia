/**
 * Loyallia — Playwright Global Auth Setup
 * Logs in once per role and saves browser state for reuse across all tests.
 *
 * Strategy: Use the Playwright request API to login directly, capture tokens,
 * then inject them as cookies. This bypasses the browser entirely for auth setup
 * and is the most reliable approach.
 *
 * ALL credentials are read from Vault. NO .env.test. NO hardcoded secrets.
 */
import { test as setup, expect } from '@playwright/test';
import { getE2EBaseURL, getRoleCredentials } from './e2e-safety';

const BASE_URL = getE2EBaseURL();
const COOKIE_DOMAIN = new URL(BASE_URL).hostname;
const COOKIE_SECURE = BASE_URL.startsWith('https');

const ROLES = [
  { file: '.auth/owner.json', role: 'owner' as const },
  { file: '.auth/manager.json', role: 'manager' as const },
  { file: '.auth/staff.json', role: 'staff' as const },
  { file: '.auth/superadmin.json', role: 'superadmin' as const },
];

for (const { file, role } of ROLES) {
  setup(`authenticate as ${role}`, async ({ page, context, request }) => {
    const credentials = await getRoleCredentials(role);

    // Clear all cookies from previous tests
    await context.clearCookies();

    // Login via API directly (most reliable — no browser form interaction needed)
    const loginResp = await request.post(`${BASE_URL}/api/v1/auth/login/`, {
      data: credentials,
    });

    expect(loginResp.status(), `Login API should return 200 for ${role}`).toBe(200);
    const body = await loginResp.json();
    const accessToken = body.access_token;
    const refreshToken = body.refresh_token;

    expect(accessToken, `access_token should exist for ${role}`).toBeTruthy();

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

    await page.waitForTimeout(2000);

    // Verify we're NOT on the login page (auth succeeded)
    const url = page.url();
    expect(url, `Should not be on login page for ${role}`).not.toContain('/login');

    // Save storage state (includes cookies + localStorage with consent)
    await page.context().storageState({ path: file });
  });
}
