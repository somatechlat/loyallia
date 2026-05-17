/**
 * Suite 13 — Dashboard KPIs, Date Filters, Chart Tabs, Ganancia/Visitas Tabs
 * Tests the enhanced dashboard with expanded date ranges, tabbed views,
 * campaign KPIs block, custom date picker, and InfoTooltips.
 */
import { test, expect } from '@playwright/test';
import { getE2EBaseURL, loginRole } from '../helpers/e2e-safety';

const BASE_API = getE2EBaseURL();

/**
 * Navigates to the dashboard and waits for data to finish loading.
 * First waits for skeleton pulse to disappear, then polls for the
 * date-range selector. Clicks retry if an error state appears.
 */
async function gotoLoadedDashboard(page: any): Promise<boolean> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Wait up to 15s for skeleton to disappear
  const skeleton = page.locator('.animate-pulse').first();
  try {
    await skeleton.waitFor({ state: 'detached', timeout: 15000 });
  } catch {
    // Skeleton may not exist if page loads instantly — continue
  }

  // Poll for data-loaded indicator up to 15s
  for (let attempt = 0; attempt < 30; attempt++) {
    const selectorVisible = await page.locator('#date-range-selector').isVisible({ timeout: 500 }).catch(() => false);
    if (selectorVisible) return true;

    const retryBtn = page.getByRole('button', { name: 'Reintentar' });
    if (await retryBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await retryBtn.click();
      await page.waitForTimeout(3000);
      continue;
    }

    await page.waitForTimeout(500);
  }
  return false;
}

async function expectDashboardStatsReloaded(page: any) {
  await expect(page.locator('.stat-card')).toHaveCount(4, { timeout: 15000 });
}

test.describe('Dashboard KPIs — OWNER @owner @analytics', () => {

  test('Dashboard loads with all structural elements @owner', async ({ page }) => {
    const loaded = await gotoLoadedDashboard(page);
    expect(loaded, 'Dashboard API did not load in time').toBe(true);

    await expect(page.locator('.page-title')).toContainText('Bienvenido');
    await expect(page.locator('.page-subtitle')).toBeVisible();
    await expect(page.locator('.stat-card')).toHaveCount(4, { timeout: 10000 });
    await expect(page.locator('#date-range-selector')).toBeVisible();
    await expect(page.locator('#date-range-1')).toBeVisible();
    await expect(page.locator('#date-range-7')).toBeVisible();
    await expect(page.locator('#date-range-28')).toBeAttached();
    await expect(page.locator('#date-range-180')).toBeAttached();
    await expect(page.locator('#date-range-365')).toBeAttached();
    await expect(page.locator('#date-range-mtd')).toBeAttached();
    await expect(page.locator('#date-range-custom')).toBeAttached();
    await expect(page.locator('#dash-tab-ganancia')).toBeVisible();
    await expect(page.locator('#dash-tab-visitas')).toBeVisible();
    await expect(page.locator('#chart-tab-revenue')).toBeVisible();
    await expect(page.locator('#chart-tab-visits')).toBeVisible();
    await expect(page.locator('#chart-tab-customers')).toBeVisible();
    await expect(page.locator('#open-scanner-btn')).toBeVisible();
  });

  test('Date range filters reload dashboard data @owner', async ({ page }) => {
    const loaded = await gotoLoadedDashboard(page);
    expect(loaded, 'Dashboard API did not load in time').toBe(true);

    await page.locator('#date-range-7').click();
    await expectDashboardStatsReloaded(page);

    await page.locator('#date-range-1').click();
    await expectDashboardStatsReloaded(page);

    await page.locator('#date-range-custom').click();
    await expect(page.locator('#custom-date-picker')).toBeVisible({ timeout: 5000 });
  });

  test('Ganancia/Visitas tab switching works @owner', async ({ page }) => {
    const loaded = await gotoLoadedDashboard(page);
    expect(loaded, 'Dashboard API did not load in time').toBe(true);

    await page.locator('#dash-tab-visitas').click();
    await expect(page.getByText('Visitas totales').first()).toBeVisible({ timeout: 5000 });

    await page.locator('#dash-tab-ganancia').click();
    await expect(page.locator('#dash-panel-ganancia')).toBeVisible({ timeout: 5000 });
  });

  test('Chart tabs switch without errors @owner', async ({ page }) => {
    const loaded = await gotoLoadedDashboard(page);
    expect(loaded, 'Dashboard API did not load in time').toBe(true);

    await page.locator('#chart-tab-visits').click();
    await page.locator('#chart-tab-customers').click();
    await page.locator('#chart-tab-revenue').click();
    await expect(page.locator('.page-title')).toBeVisible();
  });
});

test.describe('Dashboard API Endpoints @analytics', () => {

  test('Analytics overview API returns valid structure', async ({ request }) => {
    const access_token = await loginRole(request, 'owner');
    const resp = await request.get(`${BASE_API}/api/v1/analytics/overview/`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('customers');
    expect(body).toHaveProperty('transactions');
    expect(body).toHaveProperty('programs');
    expect(body).toHaveProperty('notifications');
  });

  test('Analytics trends API returns daily_data', async ({ request }) => {
    const access_token = await loginRole(request, 'owner');
    const resp = await request.get(`${BASE_API}/api/v1/analytics/trends/?days=30`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('daily_data');
  });

  test('Visit metrics API returns unregistered_visits key', async ({ request }) => {
    const access_token = await loginRole(request, 'owner');
    const resp = await request.get(`${BASE_API}/api/v1/analytics/visits/?days=30`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('unregistered_visits');
    expect(body).toHaveProperty('retention_rate');
    expect(body).toHaveProperty('total_visits');
  });

  test('Revenue breakdown API returns loyalty/referral/non_loyalty', async ({ request }) => {
    const access_token = await loginRole(request, 'owner');
    const resp = await request.get(`${BASE_API}/api/v1/analytics/revenue-breakdown/?days=30`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('total_revenue');
    expect(body).toHaveProperty('loyalty');
    expect(body).toHaveProperty('referral');
    expect(body).toHaveProperty('non_loyalty');
  });
});
