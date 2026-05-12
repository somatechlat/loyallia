import { expect, type APIRequestContext } from '@playwright/test';

export type E2ERole = 'owner' | 'manager' | 'staff' | 'superadmin';

const ROLE_ENV: Record<E2ERole, { email: string; password: string }> = {
  owner: {
    email: 'PLAYWRIGHT_OWNER_EMAIL',
    password: 'PLAYWRIGHT_OWNER_PASSWORD',
  },
  manager: {
    email: 'PLAYWRIGHT_MANAGER_EMAIL',
    password: 'PLAYWRIGHT_MANAGER_PASSWORD',
  },
  staff: {
    email: 'PLAYWRIGHT_STAFF_EMAIL',
    password: 'PLAYWRIGHT_STAFF_PASSWORD',
  },
  superadmin: {
    email: 'PLAYWRIGHT_SUPERADMIN_EMAIL',
    password: 'PLAYWRIGHT_SUPERADMIN_PASSWORD',
  },
};

const PRODUCTION_HOSTS = new Set([
  'rewards.loyallia.com',
  'app.loyallia.com',
  'loyallia.com',
  'www.loyallia.com',
]);

export function getE2EBaseURL(): string {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL;
  if (!baseURL) {
    throw new Error('PLAYWRIGHT_BASE_URL is required for production-readiness E2E tests.');
  }

  let parsed: URL;
  try {
    parsed = new URL(baseURL);
  } catch {
    throw new Error(`PLAYWRIGHT_BASE_URL is not a valid URL: ${baseURL}`);
  }

  if (PRODUCTION_HOSTS.has(parsed.hostname) && process.env.PLAYWRIGHT_ALLOW_PRODUCTION !== 'true') {
    throw new Error(`Refusing to run E2E tests against production host: ${parsed.hostname}`);
  }

  return baseURL.replace(/\/$/, '');
}

export function requireMutatingE2EAllowed(): void {
  if (process.env.PLAYWRIGHT_ALLOW_MUTATING_E2E !== 'true') {
    throw new Error('PLAYWRIGHT_ALLOW_MUTATING_E2E=true is required for mutating E2E tests.');
  }
}

export function requireExternalE2EAllowed(serviceName: string): void {
  if (process.env.PLAYWRIGHT_ALLOW_EXTERNAL_E2E !== 'true') {
    throw new Error(`PLAYWRIGHT_ALLOW_EXTERNAL_E2E=true is required for E2E tests that call ${serviceName}.`);
  }
}

export function getRoleCredentials(role: E2ERole): { email: string; password: string } {
  const keys = ROLE_ENV[role];
  const email = process.env[keys.email];
  const password = process.env[keys.password];

  if (!email || !password) {
    throw new Error(`${keys.email} and ${keys.password} are required for ${role} E2E tests.`);
  }

  return { email, password };
}

export async function loginRole(request: APIRequestContext, role: E2ERole): Promise<string> {
  const baseURL = getE2EBaseURL();
  const credentials = getRoleCredentials(role);
  const response = await request.post(`${baseURL}/api/v1/auth/login/`, {
    data: credentials,
  });

  expect(response.status(), `Login API should return 200 for ${role}`).toBe(200);
  const body = await response.json();
  expect(body.access_token, `access_token should exist for ${role}`).toBeTruthy();
  return body.access_token;
}

export async function loginOwnerContext(
  request: APIRequestContext,
): Promise<{ token: string; tenantId: string }> {
  const baseURL = getE2EBaseURL();
  const credentials = getRoleCredentials('owner');
  const response = await request.post(`${baseURL}/api/v1/auth/login/`, {
    data: credentials,
  });

  expect(response.status(), 'Owner login API should return 200').toBe(200);
  const body = await response.json();
  expect(body.access_token, 'owner access_token should exist').toBeTruthy();
  expect(body.tenant_id, 'owner tenant_id should exist').toBeTruthy();
  return { token: body.access_token, tenantId: body.tenant_id };
}

export function expectIntegrationResponseDoesNotExposeSecrets(integrations: unknown): void {
  expect(Array.isArray(integrations), 'integrations response should be an array').toBe(true);

  const secretKeyPattern = /(secret|password|private_key|token|tran_key|auth_token)$/i;
  for (const integration of integrations as Array<{ preview_values?: Record<string, unknown> }>) {
    const previewValues = integration.preview_values || {};
    for (const key of Object.keys(previewValues)) {
      expect(key, `preview_values must not expose secret-like key '${key}'`).not.toMatch(secretKeyPattern);
    }
  }
}
