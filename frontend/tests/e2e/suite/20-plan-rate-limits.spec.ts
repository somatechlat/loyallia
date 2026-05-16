/**
 * Suite 20 — Plan Rate Limits Enforcement
 * Tests that subscription plans expose all rate-limit fields and that
 * the billing API returns complete plan data including messaging/AI/automation limits.
 */
import { test, expect } from '@playwright/test';
import { getE2EBaseURL, loginRole } from '../helpers/e2e-safety';

const BASE_API = getE2EBaseURL();

// =============================================================================
// PUBLIC BILLING API — Rate Limits in Response
// =============================================================================

test.describe('Public Billing API — Rate Limits @owner @security', () => {

  test('GET /billing/plans/ returns plans with all rate limit fields @owner', async ({ request }) => {
    const resp = await request.get(`${BASE_API}/api/v1/billing/plans/`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(Array.isArray(body.plans)).toBe(true);
    expect(body.plans.length).toBeGreaterThan(0);

    const plan = body.plans[0];
    // Core resource limits
    expect(plan.limits).toHaveProperty('max_locations');
    expect(plan.limits).toHaveProperty('max_users');
    expect(plan.limits).toHaveProperty('max_customers');
    expect(plan.limits).toHaveProperty('max_programs');

    // Messaging rate limits
    expect(plan.limits).toHaveProperty('max_notifications_month');
    expect(plan.limits).toHaveProperty('max_transactions_month');
    expect(plan.limits).toHaveProperty('max_whatsapp_day');
    expect(plan.limits).toHaveProperty('max_emails_month');
    expect(plan.limits).toHaveProperty('max_sms_day');
    expect(plan.limits).toHaveProperty('max_wallet_pushes_month');

    // Automation & AI rate limits
    expect(plan.limits).toHaveProperty('max_automations');
    expect(plan.limits).toHaveProperty('max_automation_executions_day');
    expect(plan.limits).toHaveProperty('max_ai_queries_month');
    expect(plan.limits).toHaveProperty('max_api_calls_day');
    expect(plan.limits).toHaveProperty('max_exports_month');

    // Features array
    expect(plan).toHaveProperty('features');
    expect(Array.isArray(plan.features)).toBe(true);
  });

  test('Plan rate limits are non-negative integers @owner', async ({ request }) => {
    const resp = await request.get(`${BASE_API}/api/v1/billing/plans/`);
    const body = await resp.json();

    for (const plan of body.plans) {
      expect(plan.limits.max_locations).toBeGreaterThanOrEqual(0);
      expect(plan.limits.max_users).toBeGreaterThanOrEqual(0);
      expect(plan.limits.max_customers).toBeGreaterThanOrEqual(0);
      expect(plan.limits.max_whatsapp_day).toBeGreaterThanOrEqual(0);
      expect(plan.limits.max_emails_month).toBeGreaterThanOrEqual(0);
      expect(plan.limits.max_sms_day).toBeGreaterThanOrEqual(0);
      expect(plan.limits.max_wallet_pushes_month).toBeGreaterThanOrEqual(0);
      expect(plan.limits.max_automations).toBeGreaterThanOrEqual(0);
      expect(plan.limits.max_automation_executions_day).toBeGreaterThanOrEqual(0);
      expect(plan.limits.max_ai_queries_month).toBeGreaterThanOrEqual(0);
      expect(plan.limits.max_api_calls_day).toBeGreaterThanOrEqual(0);
      expect(plan.limits.max_exports_month).toBeGreaterThanOrEqual(0);
    }
  });
});

// =============================================================================
// OWNER SUBSCRIPTION — Current Plan & Usage
// =============================================================================

test.describe('Owner Subscription — Rate Limit Visibility @owner @settings', () => {

  test('GET /billing/subscription/ returns current plan with limits @owner', async ({ request }) => {
    const token = await loginRole(request, 'owner');
    const resp = await request.get(`${BASE_API}/api/v1/billing/subscription/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // 200 = has subscription, 404 = no subscription (both valid)
    expect([200, 404]).toContain(resp.status());

    if (resp.status() === 200) {
      const body = await resp.json();
      expect(body).toHaveProperty('plan');
      if (body.plan) {
        expect(body).toHaveProperty('features');
        expect(Array.isArray(body.features)).toBe(true);
      }
    }
  });

  test('GET /billing/usage/ returns usage breakdown @owner', async ({ request }) => {
    const token = await loginRole(request, 'owner');
    const resp = await request.get(`${BASE_API}/api/v1/billing/usage/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([200, 404]).toContain(resp.status());

    if (resp.status() === 200) {
      const body = await resp.json();
      expect(body).toHaveProperty('limits');
    }
  });
});

// =============================================================================
// SUPERADMIN — Plan CRUD with Rate Limits
// =============================================================================

test.describe('SuperAdmin — Plan Rate Limit CRUD @superadmin @superadmin', () => {

  test.beforeAll(() => {
    ();
  });

  test('SA can create plan with all rate limits via API @superadmin', async ({ request }) => {
    const token = await loginRole(request, 'superadmin');
    const planPayload = {
      name: `RateLimit Test ${Date.now()}`,
      slug: `rate-test-${Date.now()}`,
      description: 'Plan for testing rate limits',
      price_monthly: 99,
      price_annual: 950,
      max_locations: 5,
      max_users: 15,
      max_customers: 5000,
      max_programs: 5,
      max_notifications_month: 10000,
      max_transactions_month: 50000,
      max_whatsapp_day: 200,
      max_emails_month: 10000,
      max_sms_day: 100,
      max_wallet_pushes_month: 5000,
      max_automations: 10,
      max_automation_executions_day: 1000,
      max_ai_queries_month: 500,
      max_api_calls_day: 1000,
      max_exports_month: 10,
      features: [
        'whatsapp_campaigns',
        'email_campaigns',
        'sms_campaigns',
        'wallet_campaigns',
        'automation',
        'ai_assistant',
        'agent_api',
        'data_export',
      ],
      is_active: true,
      is_featured: false,
      trial_days: 14,
      sort_order: 99,
    };

    const resp = await request.post(`${BASE_API}/api/v1/admin/plans/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: planPayload,
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.id).toBeTruthy();
    expect(body.max_whatsapp_day).toBe(planPayload.max_whatsapp_day);
    expect(body.max_wallet_pushes_month).toBe(planPayload.max_wallet_pushes_month);
    expect(body.max_automations).toBe(planPayload.max_automations);
    expect(body.max_api_calls_day).toBe(planPayload.max_api_calls_day);
  });

  test('SA can update plan rate limits @superadmin', async ({ request }) => {
    const token = await loginRole(request, 'superadmin');

    const createResp = await request.post(`${BASE_API}/api/v1/admin/plans/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: `RateLimit Update ${Date.now()}`,
        slug: `rate-update-${Date.now()}`,
        description: 'Plan for testing rate limit updates',
        price_monthly: 79,
        price_annual: 790,
        max_locations: 5,
        max_users: 15,
        max_customers: 5000,
        max_programs: 5,
        max_notifications_month: 10000,
        max_transactions_month: 50000,
        max_whatsapp_day: 100,
        max_emails_month: 10000,
        max_sms_day: 100,
        max_wallet_pushes_month: 5000,
        max_automations: 10,
        max_automation_executions_day: 1000,
        max_ai_queries_month: 500,
        max_api_calls_day: 1000,
        max_exports_month: 10,
        features: [
          'whatsapp_campaigns',
          'email_campaigns',
          'sms_campaigns',
          'wallet_campaigns',
          'automation',
          'ai_assistant',
          'agent_api',
          'data_export',
        ],
        is_active: true,
        is_featured: false,
        trial_days: 14,
        sort_order: 99,
      },
    });
    expect(createResp.status()).toBe(200);
    const plan = await createResp.json();
    const newMaxWhatsApp = 101;

    const updateResp = await request.patch(`${BASE_API}/api/v1/admin/plans/${plan.id}/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { max_whatsapp_day: newMaxWhatsApp },
    });
    expect(updateResp.status()).toBe(200);
    const updated = await updateResp.json();
    expect(updated.max_whatsapp_day).toBe(newMaxWhatsApp);
  });
});

// =============================================================================
// RBAC — Non-SuperAdmin blocked from plan admin APIs
// =============================================================================

test.describe('Plan Admin RBAC — Non-SA blocked @owner @manager @security', () => {

  test('OWNER cannot list admin plans (403) @owner', async ({ request }) => {
    const token = await loginRole(request, 'owner');
    const resp = await request.get(`${BASE_API}/api/v1/admin/plans/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });

  test('MANAGER cannot list admin plans (403) @manager', async ({ request }) => {
    const token = await loginRole(request, 'manager');
    const resp = await request.get(`${BASE_API}/api/v1/admin/plans/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });

  test('OWNER cannot create admin plans (403) @owner', async ({ request }) => {
    const token = await loginRole(request, 'owner');
    const resp = await request.post(`${BASE_API}/api/v1/admin/plans/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: 'Hack', slug: 'hack' },
    });
    expect(resp.status()).toBe(403);
  });
});
