/**
 * Designer-suite authentication helper.
 *
 * The wallet/designer E2E suite targets PRODUCTION (rewards.loyallia.com) as a
 * real OWNER. Auth for the suite is owner-agnostic:
 *
 *   - Prefer explicit overrides: E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD.
 *   - Otherwise read the standard owner credentials from .auth/e2e-credentials.json.
 *
 * Credentials are NEVER printed, logged, or committed. Passwords live only in
 * the git-ignored credential file or environment for the run.
 */
import type { APIRequestContext } from '@playwright/test';
import { getE2EBaseURL } from './e2e-safety';
import { getE2ERoleCredential } from './e2e-test-config';

const BASE_API = getE2EBaseURL();

/**
 * Cached owner access token for the whole run. Production rate-limits the login
 * endpoint (503 under load), so we log in ONCE and reuse the token across all
 * tests instead of hitting the API from every scenario.
 */
let cachedToken: string | null = null;

export function ownerCredentials(): { email: string; password: string } {
  const email = process.env.E2E_OWNER_EMAIL;
  const password = process.env.E2E_OWNER_PASSWORD;
  if (email && password) {
    return { email, password };
  }
  return getE2ERoleCredential('owner');
}

/**
 * Obtain a JWT access token for the suite owner (cached for the run).
 * Retries against transient 503s from Gunicorn, exactly like auth.setup.ts.
 */
export async function getOwnerToken(request: APIRequestContext): Promise<string> {
  if (cachedToken) return cachedToken;

  const { email, password } = ownerCredentials();

  let loginResp;
  let lastStatus = 0;
  for (let attempt = 1; attempt <= 5; attempt++) {
    loginResp = await request.post(`${BASE_API}/api/v1/auth/login/`, {
      data: { email, password },
    });
    lastStatus = loginResp.status();
    if (lastStatus === 200) break;
    // Gunicorn worker exhaustion / rate limiting → back off and retry.
    if (attempt < 5) await new Promise((r) => setTimeout(r, 3000 * attempt));
  }

  if (loginResp!.status() !== 200) {
    throw new Error(`Designer owner login failed (HTTP ${lastStatus})`);
  }
  const body = await loginResp!.json();
  const token = body.access_token as string | undefined;
  if (!token) {
    throw new Error('Designer owner login response contained no access_token');
  }
  cachedToken = token;
  return token;
}