/**
 * Suite 31 — WhatsApp Override E2E
 * Tests SA ability to set custom WhatsApp API URL/Key for a specific tenant.
 */
import { test, expect } from '@playwright/test';

test.describe('SuperAdmin — WhatsApp Override @superadmin', () => {

  test('SA can configure custom WhatsApp integration per tenant', async ({ page }) => {
    await page.goto('/superadmin/tenants', { waitUntil: 'domcontentloaded' });
    
    // Search for a specific tenant or click the first one
    const firstTenant = page.locator('table tbody tr').first();
    await expect(firstTenant).toBeVisible({ timeout: 15000 });
    await firstTenant.click();
    
    // Go to Settings/Integrations tab
    await page.getByRole('button', { name: /Configuración/i }).click();
    await page.getByRole('button', { name: /Integraciones/i }).click();
    
    // Find WhatsApp Custom config
    await page.getByRole('button', { name: /WhatsApp Bridge/i }).click();
    
    // Fill custom URL and key
    await page.getByLabel(/Bridge URL/i).fill('https://custom.wa.example.com');
    await page.getByLabel(/Bridge API Key/i).fill('test-key-1234');
    
    await page.getByRole('button', { name: /Guardar/i }).click();
    
    await expect(page.getByText(/actualizadas/i)).toBeVisible({ timeout: 5000 });
  });

});
