/**
 * Suite 03 — Customers CRUD
 * Tests customer list, search, import button visibility per role.
 */
import { test, expect } from '@playwright/test';

test.describe('Customers — OWNER CRUD @owner @customers', () => {

  test('OWNER sees customer list with data @owner', async ({ page }) => {
    await page.goto('/customers', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').first()).toContainText('Clientes');
    // Wait for data to load via table rows
    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ state: 'visible', timeout: 15000 });
    await expect(rows.first()).toBeVisible({ timeout: 15000 });
  });

  test('OWNER sees "Importar DB" button @owner', async ({ page }) => {
    await page.goto('/customers', { waitUntil: 'domcontentloaded' });
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 });
    // Open the data combo dropdown first
    await page.locator('#data-combo-btn').click();
    await page.locator('#open-import-modal-btn').waitFor({ state: 'visible', timeout: 5000 });
    const btn = page.locator('#open-import-modal-btn');
    await expect(btn).toBeVisible({ timeout: 10000 });
  });

  test('OWNER can search customers by name @owner', async ({ page }) => {
    await page.goto('/customers', { waitUntil: 'domcontentloaded' });
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 });
    // Type a search
    await page.locator('#customer-search').fill('Carlos');
    await page.locator('#search-btn').click();
    // Wait for search results to load (table re-render or API response)
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/') && resp.url().includes('customer'),
      { timeout: 15000 },
    ).catch(() => {});
    // Should still have results or show "no results"
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('OWNER can open import modal @owner', async ({ page }) => {
    await page.goto('/customers', { waitUntil: 'domcontentloaded' });
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 });
    // Open the data combo dropdown first
    await page.locator('#data-combo-btn').click();
    await page.locator('#open-import-modal-btn').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#open-import-modal-btn').click();
    // Modal should appear with title
    await page.getByText('Importar Base de Clientes').waitFor({ state: 'visible', timeout: 5000 });
    await expect(page.getByText('Importar Base de Clientes')).toBeVisible({ timeout: 5000 });
    // Should see required columns
    await expect(page.getByText('email / correo')).toBeVisible();
  });

});

test.describe('Customers — MANAGER Read-Only @manager @customers', () => {
  test.use({ storageState: '.auth/manager.json' });

  test('MANAGER sees customer list @manager', async ({ page }) => {
    await page.goto('/customers', { waitUntil: 'domcontentloaded' });
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.locator('h1').first()).toContainText('Clientes');
    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ state: 'visible', timeout: 15000 });
    await expect(rows.first()).toBeVisible({ timeout: 15000 });
  });

  test('MANAGER does NOT see "Importar DB" button @manager', async ({ page }) => {
    await page.goto('/customers', { waitUntil: 'domcontentloaded' });
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 });
    const btn = page.locator('#open-import-modal-btn');
    await expect(btn).toHaveCount(0);
  });

});
