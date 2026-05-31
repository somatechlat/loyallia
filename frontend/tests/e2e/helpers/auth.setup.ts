/**
 * Loyallia — Playwright Global Auth Setup
 * Logs in once per role and saves browser state for reuse across all tests.
 *
 * Strategy: Use the Playwright request API to login directly, capture tokens,
 * then inject them as cookies. This bypasses the browser entirely for auth setup
 * and is the most reliable approach.
 *
 * Test users are real Django RBAC users created by:
 *   python manage.py provision_development_rbac_test_users --generate
 * NEVER hardcode passwords. NEVER fetch user passwords from Vault.
 */
import { test as setup, expect } from '@playwright/test';
import { getE2EBaseURL } from './e2e-safety';
import { getE2ECredentials } from './e2e-test-config';

const BASE_URL = getE2EBaseURL();
const COOKIE_DOMAIN = new URL(BASE_URL).hostname;
const COOKIE_SECURE = BASE_URL.startsWith('https');
// Use API port directly for login requests (frontend proxy can be unreliable under load)
const API_URL = BASE_URL.replace(/:\d+/, ':33905');

setup('authenticate all roles', async ({ page, context, request }) => {
  setup.setTimeout(120000);
  const credentials = getE2ECredentials();

  const users = [
    { file: '.auth/owner.json', ...credentials.owner },
    { file: '.auth/manager.json', ...credentials.manager },
    { file: '.auth/staff.json', ...credentials.staff },
    { file: '.auth/superadmin.json', ...credentials.superadmin },
  ];

  for (const user of users) {
    // Clear all cookies from previous iterations
    await context.clearCookies();

    // Login via API directly (most reliable — no browser form interaction needed)
    const loginResp = await request.post(`${API_URL}/api/v1/auth/login/`, {
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

    // Save storage state (includes cookies + localStorage with consent)
    // Add cookie consent to localStorage directly in storage state
    const state = await page.context().storageState();
    state.origins = state.origins || [];
    const originEntry = state.origins.find((o: any) => o.origin === BASE_URL);
    if (originEntry) {
      const existing = originEntry.localStorage.find((ls: any) => ls.name === 'loyallia_cookie_consent');
      if (!existing) {
        originEntry.localStorage.push({ name: 'loyallia_cookie_consent', value: 'true' });
      }
    } else {
      state.origins.push({ origin: BASE_URL, localStorage: [{ name: 'loyallia_cookie_consent', value: 'true' }] });
    }
    // Write the modified state directly
    const fs = require('fs');
    fs.mkdirSync('.auth', { recursive: true });
    fs.writeFileSync(user.file, JSON.stringify(state, null, 2));
  }
});
