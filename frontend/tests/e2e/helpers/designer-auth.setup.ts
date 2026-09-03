/**
 * Designer-suite auth setup (production OWNER).
 *
 * Generates .auth/owner.json authenticated as the suite owner via the real
 * production auth API, for the wallet/designer suite. Auth is owner-agnostic:
 * specify E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD, otherwise it falls back to the
 * owner credentials in the git-ignored .auth/e2e-credentials.json.
 */
import { test as setup, expect } from '@playwright/test';
import { getE2EBaseURL } from './e2e-safety';
import { ownerCredentials } from './designer-auth';

const BASE_URL = getE2EBaseURL();
const COOKIE_DOMAIN = new URL(BASE_URL).hostname;
const COOKIE_SECURE = BASE_URL.startsWith('https');

setup('designer owner auth', async ({ context, request }) => {
  setup.setTimeout(120000);
  const { email, password } = ownerCredentials();

  let loginResp;
  for (let attempt = 1; attempt <= 3; attempt++) {
    loginResp = await request.post(`${BASE_URL}/api/v1/auth/login/`, {
      data: { email, password },
    });
    if (loginResp.status() === 200) break;
    if (attempt < 3) await new Promise((r) => setTimeout(r, 2000));
  }
  expect(loginResp!.status(), 'Owner login should return 200').toBe(200);
  const body = await loginResp!.json();
  const accessToken = body.access_token as string;
  const refreshToken = body.refresh_token as string | undefined;
  expect(accessToken).toBeTruthy();

  await context.addCookies([
    { name: 'access_token', value: accessToken, domain: COOKIE_DOMAIN, path: '/', httpOnly: false, secure: COOKIE_SECURE, sameSite: 'Lax' },
    ...(refreshToken ? [{ name: 'refresh_token', value: refreshToken, domain: COOKIE_DOMAIN, path: '/', httpOnly: false, secure: COOKIE_SECURE, sameSite: 'Lax' as const }] : []),
  ]);

  const state = await context.storageState();
  state.origins = state.origins || [];
  const baseOrigin = new URL(BASE_URL).origin;
  state.origins = state.origins.filter((o) => o.origin !== baseOrigin);
  state.origins.push({
    origin: baseOrigin,
    localStorage: [{ name: 'loyallia_cookie_consent', value: 'true' }],
  });

  const fs = await import('node:fs');
  fs.mkdirSync('.auth', { recursive: true });
  fs.writeFileSync('.auth/owner.json', JSON.stringify(state, null, 2));
});