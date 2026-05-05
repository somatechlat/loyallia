/**
 * Loyallia — Playwright Global Auth Setup
 * Logs in once per role and saves browser state for reuse across all tests.
 *
 * Strategy: intercept the login API response to capture tokens, then
 * inject them as cookies. This avoids the secure-cookie-over-HTTP issue
 * when running E2E tests against the Docker stack on localhost.
 */
import { test as setup, expect } from '@playwright/test';

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
  setup(`authenticate as ${user.email}`, async ({ page, context }) => {
    if (!user.email || !user.password) {
      throw new Error(`Missing Playwright credentials for ${user.file}`);
    }

    // Clear all cookies from previous tests
    await context.clearCookies();

    // Intercept the login API response to capture tokens
    let accessToken: string | null = null;
    let refreshToken: string | null = null;

    page.on('response', async (response) => {
      if (response.url().includes('/api/v1/auth/login/') && response.status() === 200) {
        try {
          const body = await response.json();
          accessToken = body.access_token || null;
          refreshToken = body.refresh_token || null;
        } catch { /* response already consumed */ }
      }
    });

    // Navigate to login
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Wait for the login form to be visible
    await page.locator('#email').waitFor({ state: 'visible', timeout: 15000 });

    // Fill credentials
    await page.locator('#email').fill(user.email);
    await page.locator('#password').fill(user.password);

    // Submit and wait for the login response
    await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('/api/v1/auth/login/'),
        { timeout: 15000 },
      ),
      page.locator('#login-btn').click(),
    ]);

    // Give the auth redirect time to settle
    await page.waitForTimeout(2000);

    // If the app couldn't set secure cookies (HTTP localhost), inject them manually
    const cookies = await context.cookies();
    const hasAccessCookie = cookies.some(c => c.name === 'access_token');

    if (!hasAccessCookie && accessToken) {
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
    }

    // Verify token was captured
    const finalCookies = await context.cookies();
    const finalToken = finalCookies.find(c => c.name === 'access_token');
    expect(finalToken, `access_token cookie should exist after login for ${user.email}`).toBeTruthy();

    // Save storage state
    await page.context().storageState({ path: user.file });
  });
}
