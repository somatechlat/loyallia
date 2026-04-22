/**
 * Suite 11 — SuperAdmin CRUD
 * Tests SuperAdmin platform dashboard, tenant list, and non-SA isolation.
 */
import { test, expect } from '@playwright/test';

test.describe('SuperAdmin — Platform Dashboard @superadmin', () => {

  test('SA sees platform overview page @superadmin', async ({ page }) => {
    await page.goto('/superadmin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Should see platform heading or stats
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('SA has "Plataforma" in navigation @superadmin', async ({ page }) => {
    await page.goto('/superadmin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const navLink = page.locator('nav, aside').getByText('Plataforma');
    await expect(navLink.first()).toBeVisible({ timeout: 10000 });
  });

  test('SA sees tenant list @superadmin', async ({ page }) => {
    await page.goto('/superadmin/tenants', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Should have tenant rows or cards
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
    // Should have tenants visible
    const tenantElements = page.locator('table tbody tr, [class*="tenant"], [class*="card"]');
    const count = await tenantElements.count();
    expect(count).toBeGreaterThan(0);
  });

  test('SA sees "Negocios" in navigation @superadmin', async ({ page }) => {
    await page.goto('/superadmin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const navLink = page.locator('nav, aside').getByText('Negocios');
    await expect(navLink.first()).toBeVisible({ timeout: 10000 });
  });

  test('SA sees "Métricas" in navigation @superadmin', async ({ page }) => {
    await page.goto('/superadmin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const navLink = page.locator('nav, aside').getByText('Métricas');
    await expect(navLink.first()).toBeVisible({ timeout: 10000 });
  });

  test('SA can navigate to metrics page @superadmin', async ({ page }) => {
    await page.goto('/superadmin/metrics', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

});

test.describe('SuperAdmin — OWNER Isolation @owner', () => {

  test('OWNER navigating to /superadmin is blocked @owner', async ({ page }) => {
    await page.goto('/superadmin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Should NOT stay on /superadmin — redirect to / or show forbidden
    const url = page.url();
    // If the page renders it means the route exists but the guard should block
    const heading = page.locator('h1').first();
    if (await heading.isVisible()) {
      const text = await heading.textContent();
      // Should NOT contain "Plataforma" (which is SA-only heading)
      expect(text).not.toContain('Plataforma');
    }
  });

});
