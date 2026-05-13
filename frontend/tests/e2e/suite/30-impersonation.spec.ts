/**
 * Suite 30 — Impersonation Flow E2E
 * Tests SuperAdmin impersonating an Owner.
 */
import { test, expect } from '@playwright/test';
import {
  getE2EBaseURL,
  getRoleCredentials,
  loginOwnerContext,
  loginRole,
} from '../helpers/e2e-safety';

const BASE_API = getE2EBaseURL();

test.describe('SuperAdmin — Impersonation @superadmin', () => {

  test('SA can impersonate an owner with PIN and return to SA', async ({ page, request }) => {
    const owner = await loginOwnerContext(request);
    const ownerCredentials = getRoleCredentials('owner');
    const pinResp = await request.post(`${BASE_API}/api/v1/tenants/security-pin/`, {
      headers: { Authorization: `Bearer ${owner.token}` },
      data: {
        current_password: ownerCredentials.password,
        pin: '[REDACTED]',
      },
    });
    expect(pinResp.status(), 'Owner security PIN setup should return 200').toBe(200);

    const superToken = await loginRole(request, 'superadmin');
    const tenantsResp = await request.get(`${BASE_API}/api/v1/admin/tenants/`, {
      headers: { Authorization: `Bearer ${superToken}` },
    });
    expect(tenantsResp.status(), 'SuperAdmin tenants API should return 200').toBe(200);
    const tenants = await tenantsResp.json();
    const ownerTenant = tenants.find((tenant: { id?: string }) => tenant.id === owner.tenantId);
    expect(ownerTenant?.name, 'Owner tenant should be present in SuperAdmin list').toBeTruthy();

    await page.goto('/superadmin/tenants', { waitUntil: 'domcontentloaded' });
    const ownerTenantRow = page.locator('table tbody tr', { hasText: ownerTenant.name }).first();
    await expect(ownerTenantRow).toBeVisible({ timeout: 15000 });
    await ownerTenantRow.click();

    await page.getByRole('button', { name: 'Acciones' }).click();
    await page.getByLabel('PIN del propietario').fill('[REDACTED]');
    await page.getByLabel('Justificación').fill('Soporte solicitado por el propietario en E2E');

    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /Impersonar Propietario/ }).click();

    await expect(page.getByText('Modo impersonación activo')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('nav, aside').getByText(/Resumen|Programas|Clientes/).first()).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Volver al Admin/ }).click();
    await expect(page).toHaveURL(/\/superadmin\/tenants/, { timeout: 15000 });
    await expect(page.getByRole('link', { name: 'Plataforma' })).toBeVisible({ timeout: 10000 });
  });

});
