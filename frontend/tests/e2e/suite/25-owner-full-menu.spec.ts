/**
 * Suite 25 — Owner Full Menu Coverage
 *
 * Visits every dashboard page available to the OWNER role and verifies
 * each loads without errors. This is a smoke test ensuring no broken
 * routes, missing components, or server errors across the entire UI.
 */
import { test, expect } from '@playwright/test';
import { getE2EBaseURL, loginRole } from '../helpers/e2e-safety';

const BASE_API = getE2EBaseURL();

test.describe('Owner Full Menu — Every Page Loads @owner', () => {

  test('1. Dashboard (/) loads with KPI cards', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Dashboard should have visible content (KPI cards, charts, etc.)
    const heading = page.locator('h1, h2, [class*="stat"], [class*="kpi"], [class*="card"]').first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    // No error state should be present
    const errorBanner = page.locator('[class*="error"], [role="alert"]').filter({ hasText: /500|error|failed/i });
    expect(await errorBanner.count(), 'No error banner on dashboard').toBe(0);
  });

  test('2. Programs (/programs) loads with list', async ({ page }) => {
    await page.goto('/programs', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const content = page.locator('h1, [class*="program"], table, [class*="card"], [class*="grid"]').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('3. Program Detail loads for existing program', async ({ page, request }) => {
    // Get first program ID
    const access_token = await loginRole(request, 'owner');

    const programsResp = await request.get(`${BASE_API}/api/v1/programs/`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const programs = await programsResp.json();
    const items = programs.programs || programs.items || [];

    test.skip(items.length === 0, 'No programs to test detail page');

    const firstId = items[0].id;
    await page.goto(`/programs/${firstId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const content = page.locator('h1, h2, [class*="detail"], [class*="card"]').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('4. Customers (/customers) loads with table', async ({ page }) => {
    await page.goto('/customers', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const content = page.locator('table, [class*="customer"], [class*="list"], [class*="grid"]').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('5. Customer Detail loads for existing customer', async ({ page, request }) => {
    const access_token = await loginRole(request, 'owner');

    const customersResp = await request.get(`${BASE_API}/api/v1/customers/`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const customers = await customersResp.json();
    const items = customers.customers || customers.items || customers.results || [];

    test.skip(items.length === 0, 'No customers to test detail page');

    const firstId = items[0].id;
    await page.goto(`/customers/${firstId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const content = page.locator('h1, h2, [class*="detail"], [class*="card"], [class*="profile"]').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('6. Team (/team) loads with member list', async ({ page }) => {
    await page.goto('/team', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const content = page.locator('table, [class*="team"], [class*="member"], [class*="list"], [class*="card"]').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('7. Locations (/locations) loads', async ({ page }) => {
    await page.goto('/locations', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const content = page.locator('h1, h2, [class*="location"], [class*="map"], [class*="card"]').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('8. Analytics (/analytics) loads with charts', async ({ page }) => {
    await page.goto('/analytics', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const content = page.locator('canvas, svg, [class*="chart"], [class*="analytics"], h1, h2').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('9. Automation (/automation) loads with rules', async ({ page }) => {
    await page.goto('/automation', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const content = page.locator('h1, h2, [class*="automation"], [class*="rule"], [class*="card"]').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('10. Campaigns (/campaigns) loads with type selector', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const content = page.locator('h1, h2, button[aria-pressed], [class*="campaign"], [class*="card"]').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('11. Settings (/settings) loads with sections', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const content = page.locator('h1, h2, [class*="settings"], [class*="section"], [class*="card"]').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('12. Billing (/billing) loads with plan details', async ({ page }) => {
    await page.goto('/billing', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const content = page.locator('h1, h2, [class*="billing"], [class*="plan"], [class*="card"]').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

});
