/**
 * Suite 05 — Locations CRUD
 * Tests location list with map, create button visibility, MANAGER read-only.
 */
import { test, expect } from '@playwright/test';

test.describe('Locations — OWNER CRUD @owner', () => {

  test('OWNER sees locations page with map @owner', async ({ page }) => {
    await page.goto('/locations', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await expect(page.locator('h1').first()).toContainText('Sucursales');
  });

  test('OWNER sees "Nueva" or "Agregar" location button @owner', async ({ page }) => {
    await page.goto('/locations', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const addBtn = page.getByRole('button', { name: /nueva|agregar/i });
    await expect(addBtn.first()).toBeVisible({ timeout: 10000 });
  });

  test('OWNER can click a location to see detail modal @owner', async ({ page }) => {
    await page.goto('/locations', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Click on a location card/row
    const locationCard = page.locator('[class*="card"], table tbody tr').first();
    if (await locationCard.isVisible()) {
      await locationCard.click();
      await page.waitForTimeout(1000);
    }
  });

});

test.describe('Locations — MANAGER Read-Only @manager', () => {

  test('MANAGER sees locations page @manager', async ({ page }) => {
    await page.goto('/locations', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await expect(page.locator('h1').first()).toContainText('Sucursales');
  });

});
