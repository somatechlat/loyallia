/**
 * Suite 31 — WhatsApp Override E2E
 * Tests SA ability to set the per-tenant WhatsApp daily-limit override.
 */
import { test, expect } from '@playwright/test';
import { getE2EBaseURL, loginOwnerContext, loginRole } from '../helpers/e2e-safety';

const BASE_API = getE2EBaseURL();

test.describe('SuperAdmin — WhatsApp Override @superadmin @superadmin', () => {

  test('SA can configure and reset WhatsApp daily-limit override per tenant', async ({ page, request }) => {
    const owner = await loginOwnerContext(request);
    const token = await loginRole(request, 'superadmin');

    const invalidResp = await request.patch(`${BASE_API}/api/v1/admin/tenants/${owner.tenantId}/whatsapp-override/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { daily_limit_override: 201 },
    });
    expect(invalidResp.status(), 'Override above hard cap should be rejected').toBe(400);

    const setResp = await request.patch(`${BASE_API}/api/v1/admin/tenants/${owner.tenantId}/whatsapp-override/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { daily_limit_override: 150 },
    });
    expect(setResp.status(), 'Valid override should be accepted').toBe(200);
    const setBody = await setResp.json();
    expect(setBody.success).toBe(true);
    expect(setBody.message).toMatch(/150|override|límite|limit/i);

    const resetResp = await request.patch(`${BASE_API}/api/v1/admin/tenants/${owner.tenantId}/whatsapp-override/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { daily_limit_override: 0 },
    });
    expect(resetResp.status(), 'Override reset should be accepted').toBe(200);

    const tenantsResp = await request.get(`${BASE_API}/api/v1/admin/tenants/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(tenantsResp.status()).toBe(200);
    const tenants = await tenantsResp.json();
    const ownerTenant = tenants.find((tenant: { id?: string }) => tenant.id === owner.tenantId);
    expect(ownerTenant?.name).toBeTruthy();

    await page.goto('/superadmin/tenants', { waitUntil: 'domcontentloaded' });
    const ownerTenantRow = page.locator('table tbody tr', { hasText: ownerTenant.name }).first();
    await expect(ownerTenantRow).toBeVisible({ timeout: 15000 });
    await ownerTenantRow.click();
    await page.getByRole('button', { name: 'Acciones' }).click();
    await expect(page.getByText('Estado del Negocio')).toBeVisible();
    await expect(page.getByText('Información Técnica')).toBeVisible();
  });

});
