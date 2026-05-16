/**
 * Loyallia — Playwright Global Auth Setup
 * Logs in once per role and saves browser state for reuse across all tests.
 *
 * Strategy: Use the Playwright request API to login directly, capture tokens,
 * then inject them as cookies. This bypasses the browser entirely for auth setup
 * and is the most reliable approach.
 *
 * ALL credentials are loaded from HashiCorp Vault via vault-credentials.ts.
 * No hardcoded passwords. No env-var fallbacks.
 */
import { test as setup, expect } from '@playwright/test';
import { getE2EBaseURL, getAllRoleCredentialsFromVault } from './e2e-safety';

const BASE_URL = getE2EBaseURL();
const COOKIE_DOMAIN = new URL(BASE_URL).hostname;
const COOKIE_SECURE = BASE_URL.startsWith('https');

setup('authenticate all roles', async ({ page, context, request }) => {
  const allCreds = await getAllRoleCredentialsFromVault();

  const users = [
    { file: '.auth/owner.json', ...allCreds.owner },
    { file: '.auth/manager.json', ...allCreds.manager },
    { file: '.auth/staff.json', ...allCreds.staff },
    { file: '.auth/superadmin.json', ...allCreds.superadmin },
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
