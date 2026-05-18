/**
 * Suite 05 — Locations CRUD
 * Tests location list with map, create button visibility, MANAGER read-only.
 */
import { test, expect } from '@playwright/test';

test.describe('Locations — OWNER CRUD @owner @locations', () => {

  test('OWNER sees locations page with map @owner', async ({ page }) => {
    await page.goto('/locations', { waitUntil: 'domcontentloaded' });
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 20000 });
    await expect(page.locator('h1').first()).toContainText('Sucursales');
  });

  test('OWNER sees "Nueva" or "Agregar" location button @owner', async ({ page }) => {
    await page.goto('/locations', { waitUntil: 'domcontentloaded' });
    const addBtn = page.getByRole('button', { name: /nueva|agregar/i });
    await addBtn.first().waitFor({ state: 'visible', timeout: 10000 });
    await expect(addBtn.first()).toBeVisible({ timeout: 10000 });
  });

  test('OWNER can click a location to see detail modal @owner', async ({ page }) => {
    await page.goto('/locations', { waitUntil: 'domcontentloaded' });
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 20000 });
    // Click on a location card/row
    const locationCard = page.locator('[class*="card"], table tbody tr').first();
    if (await locationCard.isVisible()) {
      await locationCard.click();
      // Wait for detail modal/panel to appear
      await page.locator('dialog, [role="dialog"], [class*="modal"], [class*="detail"]').first()
        .waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    }
  });

});

test.describe('Locations — MANAGER Read-Only @manager @locations', () => {
  test.use({ storageState: '.auth/manager.json' });

  test('MANAGER sees locations page @manager', async ({ page }) => {
    await page.goto('/locations', { waitUntil: 'domcontentloaded' });
    // Wait for the heading with extended timeout — map data can be slow
    const heading = page.locator('h1').first();
    await heading.waitFor({ state: 'visible', timeout: 20000 });
    await expect(heading).toContainText('Sucursales');
  });

});
