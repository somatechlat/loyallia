/**
 * Loyallia — Playwright Global Auth Setup
 * Logs in once per role and saves browser state for reuse across all tests.
 *
 * Strategy: Use the Playwright request API to login directly, capture tokens,
 * then inject them as cookies. This bypasses the browser entirely for auth setup
 * and is the most reliable approach.
 */
import { test as setup, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:80';

const USERS = [
  {
    file: '.auth/owner.json',
    email: process.env.PLAYWRIGHT_OWNER_EMAIL,
    password: process.env.PLAYWRIGHT_OWNER_PASSWORD,
  },
  {
    file: '.auth/manager.json',
    email: process.env.PLAYWRIGHT_MANAGER_EMAIL,
    password: process.env.PLAYWRIGHT_MANAGER_PASSWORD,
  },
  {
    file: '.auth/staff.json',
    email: process.env.PLAYWRIGHT_STAFF_EMAIL,
    password: process.env.PLAYWRIGHT_STAFF_PASSWORD,
  },
  {
    file: '.auth/superadmin.json',
    email: process.env.PLAYWRIGHT_SUPERADMIN_EMAIL,
    password: process.env.PLAYWRIGHT_SUPERADMIN_PASSWORD,
  },
];

for (const user of USERS) {
  setup(`authenticate as ${user.email}`, async ({ page, context, request }) => {
    if (!user.email || !user.password) {
      throw new Error(`Missing Playwright credentials for ${user.file}`);
    }

    // Clear all cookies from previous tests
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
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      },
      ...(refreshToken ? [{
        name: 'refresh_token',
        value: refreshToken,
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
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
    expect(url, `Should not be on login page for ${user.email}`).not.toContain('/login');

    // Save storage state (includes cookies + localStorage with consent)
    await page.context().storageState({ path: user.file });
  });
}
