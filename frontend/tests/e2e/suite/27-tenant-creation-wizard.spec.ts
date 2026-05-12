/**
 * Suite 27 — Tenant Creation Wizard E2E
 * Tests the new 4-step tenant creation flow:
 * 1. Plan Selection
 * 2. Entity & Data
 * 3. Owner
 * 4. Locations
 */
import { test, expect } from '@playwright/test';
import { getE2EBaseURL } from '../helpers/e2e-safety';

test.describe('SuperAdmin — Tenant Creation Wizard @superadmin', () => {

  test('SA can create a tenant using the 4-step wizard', async ({ page }) => {
    await page.goto('/superadmin/tenants', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // Open wizard
    await page.getByRole('button', { name: /Nuevo Negocio/i }).click();
    await expect(page.getByText('Paso 1 de 4: Plan de Suscripción')).toBeVisible({ timeout: 10000 });
    
    // Step 1: Plan Selection
    await page.getByRole('button', { name: /Starter/i }).click(); // Assuming 'Starter' is a plan
    await page.getByRole('button', { name: /Siguiente/i }).click();
    
    // Step 2: Entity & Data
    await expect(page.getByText('Paso 2 de 4: Datos del Negocio')).toBeVisible({ timeout: 5000 });
    await page.getByLabel(/Nombre del Negocio/i).fill('E2E Test Tenant');
    await page.getByLabel(/RUC/i).fill('1790000000001');
    await page.getByLabel(/Email Corporativo/i).fill(`e2e-tenant-${Date.now()}@example.com`);
    await page.getByRole('button', { name: /Siguiente/i }).click();
    
    // Step 3: Owner
    await expect(page.getByText('Paso 3 de 4: Propietario')).toBeVisible({ timeout: 5000 });
    await page.getByLabel(/Nombres/i).fill('John');
    await page.getByLabel(/Apellidos/i).fill('Doe');
    await page.getByLabel(/Teléfono/i).fill('0999999999');
    await page.getByRole('button', { name: /Siguiente/i }).click();
    
    // Step 4: Locations
    await expect(page.getByText('Paso 4 de 4: Sucursal Principal')).toBeVisible({ timeout: 5000 });
    await page.getByLabel(/Nombre de la Sucursal/i).fill('Matriz E2E');
    await page.getByLabel(/Dirección/i).fill('Av. E2E 123');
    
    // Submit
    await page.getByRole('button', { name: /Crear Negocio/i }).click();
    
    // Success toast
    await expect(page.getByText(/Negocio creado con éxito/i)).toBeVisible({ timeout: 15000 });
  });

});
