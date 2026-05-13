/**
 * Suite 29 — Plan Management E2E
 * Tests plan deactivation constraints on the current SuperAdmin plan API/UI.
 */
import { test, expect } from '@playwright/test';
import { getE2EBaseURL, loginRole } from '../helpers/e2e-safety';

const BASE_API = getE2EBaseURL();

test.describe('SuperAdmin — Plan Management @superadmin', () => {

  test('SA gets 409 conflict when deactivating a plan with active subscriptions', async ({ page, request }) => {
    const token = await loginRole(request, 'superadmin');
    const plansResp = await request.get(`${BASE_API}/api/v1/admin/plans/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(plansResp.status(), 'SuperAdmin plans API should return 200').toBe(200);
    const plans = await plansResp.json();
    const enterprise = plans.find((plan: { slug?: string }) => plan.slug === 'enterprise');
    expect(enterprise, 'seeded enterprise plan should exist').toBeTruthy();

    const deactivateResp = await request.delete(`${BASE_API}/api/v1/admin/plans/${enterprise.id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(deactivateResp.status(), 'Enterprise plan has the owner E2E subscription attached').toBe(409);
    const conflict = await deactivateResp.text();
    expect(conflict).toMatch(/suscripciones|subscriptions|no se puede/i);

    await page.goto('/superadmin/plans', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Planes de Suscripción/ })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: enterprise.name })).toBeVisible({ timeout: 10000 });
  });

});
