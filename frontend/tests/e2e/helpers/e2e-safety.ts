import { expect, type APIRequestContext } from '@playwright/test';

export type E2ERole = 'owner' | 'manager' | 'staff' | 'superadmin';

const PRODUCTION_HOSTS = new Set([
  'rewards.loyallia.com',
  'app.loyallia.com',
  'loyallia.com',
  'www.loyallia.com',
]);

export function getE2EBaseURL(): string {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL;
  if (!baseURL) {
    throw new Error('PLAYWRIGHT_BASE_URL is required for Playwright tests.');
  }

  let parsed: URL;
  try {
    parsed = new URL(baseURL);
  } catch {
    throw new Error(`PLAYWRIGHT_BASE_URL is not a valid URL: ${baseURL}`);
  }

  if (PRODUCTION_HOSTS.has(parsed.hostname)) {
    throw new Error(`Refusing to run E2E tests against production host: ${parsed.hostname}`);
  }

  return baseURL.replace(/\/$/, '');
}

export async function loginRole(request: APIRequestContext, role: E2ERole): Promise<string> {
  const { getE2ESeedPassword, E2E_TEST_USERS } = await import('./e2e-test-config');
  const baseURL = getE2EBaseURL();
  const email = E2E_TEST_USERS[role].email;
  const password = getE2ESeedPassword();
  const response = await request.post(`${baseURL}/api/v1/auth/login/`, {
    data: { email, password },
  });

  expect(response.status(), `Login API should return 200 for ${role}`).toBe(200);
  const body = await response.json();
  expect(body.access_token, `access_token should exist for ${role}`).toBeTruthy();
  return body.access_token;
}

export async function loginOwnerContext(
  request: APIRequestContext,
): Promise<{ token: string; tenantId: string }> {
  const { getE2ESeedPassword, E2E_TEST_USERS } = await import('./e2e-test-config');
  const baseURL = getE2EBaseURL();
  const email = E2E_TEST_USERS.owner.email;
  const password = getE2ESeedPassword();
  const response = await request.post(`${baseURL}/api/v1/auth/login/`, {
    data: { email, password },
  });

  expect(response.status(), 'Owner login API should return 200').toBe(200);
  const body = await response.json();
  expect(body.access_token, 'owner access_token should exist').toBeTruthy();
  expect(body.tenant_id, 'owner tenant_id should exist').toBeTruthy();
  return { token: body.access_token, tenantId: body.tenant_id };
}

const ENTERPRISE_CAMPAIGN_FEATURES = [
  'whatsapp_campaigns',
  'email_campaigns',
  'wallet_campaigns',
  'sms_campaigns',
  'automation',
  'advanced_analytics',
  'priority_support',
  'custom_branding',
  'data_export',
  'geo_fencing',
  'ai_assistant',
  'agent_api',
];

export async function ensureOwnerEnterpriseCampaignAccess(
  request: APIRequestContext,
): Promise<void> {
  const baseURL = getE2EBaseURL();
  const superToken = await loginRole(request, 'superadmin');

  const plansResp = await request.get(`${baseURL}/api/v1/admin/plans/`, {
    headers: { Authorization: `Bearer ${superToken}` },
  });
  expect(plansResp.status(), 'SuperAdmin plans list should return 200').toBe(200);
  const plans = await plansResp.json();
  const enterprisePlan = plans.find((plan: { slug?: string }) => plan.slug === 'enterprise');
  expect(enterprisePlan, 'enterprise plan must exist before campaign E2E').toBeTruthy();

  const updateResp = await request.patch(`${baseURL}/api/v1/admin/plans/${enterprisePlan.id}/`, {
    headers: { Authorization: `Bearer ${superToken}` },
    data: {
      features: ENTERPRISE_CAMPAIGN_FEATURES,
      max_sms_day: 5000,
      max_whatsapp_day: 200,
      max_emails_month: 10000,
      max_wallet_pushes_month: 10000,
      max_automations: 10,
      max_automation_executions_day: 1000,
      max_ai_queries_month: 500,
      max_api_calls_day: 1000,
      max_exports_month: 10,
    },
  });
  expect(updateResp.status(), 'Enterprise plan campaign setup should return 200').toBe(200);

  const ownerToken = await loginRole(request, 'owner');
  const currentResp = await request.get(`${baseURL}/api/v1/billing/subscription/`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  expect(currentResp.status(), 'Owner subscription API should return 200').toBe(200);
  const currentSub = await currentResp.json();
  if (
    currentSub.plan_slug === 'enterprise' &&
    ['active', 'trialing'].includes(currentSub.status)
  ) {
    return;
  }

  const subscribeResp = await request.post(`${baseURL}/api/v1/billing/subscribe/`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
    data: { plan_slug: 'enterprise', billing_cycle: 'monthly' },
  });
  expect(subscribeResp.status(), 'Owner enterprise subscribe should return 200').toBe(200);
  const subscribeBody = await subscribeResp.json();
  expect(subscribeBody.invoice_id, 'Manual-payment invoice id should exist').toBeTruthy();

  const confirmResp = await request.post(
    `${baseURL}/api/v1/admin/billing/confirm-payment/${subscribeBody.invoice_id}/`,
    { headers: { Authorization: `Bearer ${superToken}` } },
  );
  expect(confirmResp.status(), 'SuperAdmin manual payment confirmation should return 200').toBe(200);

  const verifiedResp = await request.get(`${baseURL}/api/v1/billing/subscription/`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  expect(verifiedResp.status(), 'Owner subscription verification should return 200').toBe(200);
  const verifiedSub = await verifiedResp.json();
  expect(verifiedSub.plan_slug, 'Owner tenant should be linked to enterprise').toBe('enterprise');
  expect(verifiedSub.status, 'Owner enterprise subscription should be active').toBe('active');
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
