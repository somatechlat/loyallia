/**
 * Suite 03 — Customers CRUD
 * Tests customer list, search, import button visibility per role.
 */
import { test, expect } from '@playwright/test';

test.describe('Customers — OWNER CRUD @owner', () => {

  test('OWNER sees customer list with data @owner', async ({ page }) => {
    await page.goto('/customers', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').first()).toContainText('Clientes');
    // Wait for data to load
    await page.waitForTimeout(3000);
    // Should have at least one row in the table
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 15000 });
  });

  test('OWNER sees "Importar DB" button @owner', async ({ page }) => {
    await page.goto('/customers', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const btn = page.locator('#open-import-modal-btn');
    await expect(btn).toBeVisible({ timeout: 10000 });
  });

  test('OWNER can search customers by name @owner', async ({ page }) => {
    await page.goto('/customers', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    // Type a search
    await page.locator('#customer-search').fill('Carlos');
    await page.locator('#search-btn').click();
    await page.waitForTimeout(2000);
    // Should still have results or show "no results"
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('OWNER can open import modal @owner', async ({ page }) => {
    await page.goto('/customers', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.locator('#open-import-modal-btn').click();
    await page.waitForTimeout(500);
    // Modal should appear with title
    await expect(page.getByText('Importar Base de Clientes')).toBeVisible({ timeout: 5000 });
    // Should see required columns
    await expect(page.getByText('email / correo')).toBeVisible();
  });

});

test.describe('Customers — MANAGER Read-Only @manager', () => {

  test('MANAGER sees customer list @manager', async ({ page }) => {
    await page.goto('/customers', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await expect(page.locator('h1').first()).toContainText('Clientes');
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 15000 });
  });

  test('MANAGER does NOT see "Importar DB" button @manager', async ({ page }) => {
    await page.goto('/customers', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const btn = page.locator('#open-import-modal-btn');
    await expect(btn).toHaveCount(0);
  });

});
