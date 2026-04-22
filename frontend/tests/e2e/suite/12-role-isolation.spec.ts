/**
 * Suite 12 — Role Isolation Enforcement
 * Cross-role navigation tests to verify unauthorized routes are blocked.
 */
import { test, expect } from '@playwright/test';

test.describe('Role Isolation — MANAGER blocked routes @manager', () => {

  test('MANAGER navigating to /team does not crash @manager', async ({ page }) => {
    await page.goto('/team', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Should either redirect away or show no content — NOT crash
    const errorElement = page.locator('text=Application error');
    const errorCount = await errorElement.count();
    expect(errorCount).toBe(0);
  });

  test('MANAGER navigating to /automation does not crash @manager', async ({ page }) => {
    await page.goto('/automation', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const errorElement = page.locator('text=Application error');
    const errorCount = await errorElement.count();
    expect(errorCount).toBe(0);
  });

  test('MANAGER navigating to /settings does not crash @manager', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const errorElement = page.locator('text=Application error');
    const errorCount = await errorElement.count();
    expect(errorCount).toBe(0);
  });

  test('MANAGER navigating to /billing does not crash @manager', async ({ page }) => {
    await page.goto('/billing', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const errorElement = page.locator('text=Application error');
    const errorCount = await errorElement.count();
    expect(errorCount).toBe(0);
  });

});

test.describe('Role Isolation — STAFF blocked from dashboard @staff', () => {

  test('STAFF navigating to / redirects to scanner @staff', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).toMatch(/scanner/);
  });

  test('STAFF navigating to /customers is blocked @staff', async ({ page }) => {
    await page.goto('/customers', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).not.toMatch(/\/customers$/);
  });

  test('STAFF navigating to /analytics is blocked @staff', async ({ page }) => {
    await page.goto('/analytics', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).not.toMatch(/\/analytics$/);
  });

});

test.describe('Role Isolation — OWNER blocked from superadmin @owner', () => {

  test('OWNER navigating to /superadmin does not show SA dashboard @owner', async ({ page }) => {
    await page.goto('/superadmin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // OWNER should not see "Plataforma" heading
    const saHeading = page.locator('nav, aside').getByText('Plataforma');
    await expect(saHeading).toHaveCount(0);
  });

  test('OWNER navigating to /superadmin/tenants is blocked @owner', async ({ page }) => {
    await page.goto('/superadmin/tenants', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Should not show tenant management
    const saNav = page.locator('nav, aside').getByText('Negocios');
    await expect(saNav).toHaveCount(0);
  });

});
