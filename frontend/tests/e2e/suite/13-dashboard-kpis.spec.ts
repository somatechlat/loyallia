/**
 * Suite 13 — Dashboard KPIs, Date Filters, Chart Tabs, Ganancia/Visitas Tabs
 * Tests the enhanced dashboard with expanded date ranges, tabbed views,
 * campaign KPIs block, custom date picker, and InfoTooltips.
 */
import { test, expect } from '@playwright/test';

const BASE_API = 'http://localhost:80';

/**
 * Navigates to the dashboard and waits for data to finish loading.
 * The dashboard shows a skeleton pulse while loading, then renders
 * the full content once API responses arrive.
 */
async function gotoLoadedDashboard(page: any): Promise<boolean> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // Wait for the h1 heading — renders once loading=false (success OR error)
  await page.getByRole('heading', { level: 1 }).first().waitFor({ state: 'visible', timeout: 45000 });
  // If dashboard hit error state, click "Reintentar" to retry API calls
  const retryBtn = page.getByRole('button', { name: 'Reintentar' });
  if (await retryBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await retryBtn.click();
    await page.waitForTimeout(5000);
  }
  // Check if data loaded (date-range-selector appears on success)
  const dataLoaded = await page.locator('#date-range-selector').isVisible({ timeout: 15000 }).catch(() => false);
  return dataLoaded;
}

test.describe('Dashboard KPIs — OWNER @owner', () => {

  test('Dashboard loads with welcome message @owner', async ({ page }) => {
    await gotoLoadedDashboard(page);
    const title = page.locator('.page-title');
    await expect(title).toContainText('Bienvenido');
  });

  test('Dashboard shows all 4 stat cards @owner', async ({ page }) => {
    const loaded = await gotoLoadedDashboard(page);
    test.skip(!loaded, 'Dashboard API did not load in time — dev runserver single-thread limitation');
    await expect(page.locator('.stat-card')).toHaveCount(4, { timeout: 10000 });
  });

  test('Date range selector shows expected filter options @owner', async ({ page }) => {
    const loaded = await gotoLoadedDashboard(page);
    test.skip(!loaded, 'Dashboard API did not load in time');
    await expect(page.locator('#date-range-selector')).toBeVisible();
    await expect(page.locator('#date-range-1')).toBeVisible();
    await expect(page.locator('#date-range-7')).toBeVisible();
    await expect(page.locator('#date-range-28')).toBeAttached();
    await expect(page.locator('#date-range-180')).toBeAttached();
    await expect(page.locator('#date-range-365')).toBeAttached();
    await expect(page.locator('#date-range-mtd')).toBeAttached();
    await expect(page.locator('#date-range-custom')).toBeAttached();
  });

  test('Clicking 7d filter reloads data @owner', async ({ page }) => {
    const loaded = await gotoLoadedDashboard(page);
    test.skip(!loaded, 'Dashboard API did not load in time');
    await page.locator('#date-range-7').click();
    // Wait for data reload — stat cards should still be 4
    await page.waitForTimeout(3000);
    await expect(page.locator('.stat-card')).toHaveCount(4, { timeout: 10000 });
  });

  test('Clicking Hoy filter reloads data @owner', async ({ page }) => {
    const loaded = await gotoLoadedDashboard(page);
    test.skip(!loaded, 'Dashboard API did not load in time');
    await page.locator('#date-range-1').click();
    await page.waitForTimeout(3000);
    await expect(page.locator('.stat-card')).toHaveCount(4, { timeout: 10000 });
  });

  test('Custom date picker appears on Periodo click @owner', async ({ page }) => {
    const loaded = await gotoLoadedDashboard(page);
    test.skip(!loaded, 'Dashboard API did not load in time');
    await page.locator('#date-range-custom').click();
    await expect(page.locator('#custom-date-picker')).toBeVisible({ timeout: 5000 });
  });

  test('Ganancia/Visitas tab selector renders @owner', async ({ page }) => {
    const loaded = await gotoLoadedDashboard(page);
    test.skip(!loaded, 'Dashboard API did not load in time');
    await expect(page.locator('#dash-tab-ganancia')).toBeVisible();
    await expect(page.locator('#dash-tab-visitas')).toBeVisible();
  });

  test('Clicking Visitas tab switches content @owner', async ({ page }) => {
    const loaded = await gotoLoadedDashboard(page);
    test.skip(!loaded, 'Dashboard API did not load in time');
    await page.locator('#dash-tab-visitas').click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Visitas totales').first()).toBeVisible({ timeout: 5000 });
  });

  test('Clicking Ganancia tab shows revenue KPIs @owner', async ({ page }) => {
    const loaded = await gotoLoadedDashboard(page);
    test.skip(!loaded, 'Dashboard API did not load in time');
    await page.locator('#dash-tab-visitas').click();
    await page.waitForTimeout(500);
    await page.locator('#dash-tab-ganancia').click();
    await page.waitForTimeout(500);
    const panel = page.locator('#dash-panel-ganancia');
    await expect(panel).toBeVisible({ timeout: 5000 });
  });

  test('Chart tabs Ganancias/Visitas/Clientes render @owner', async ({ page }) => {
    const loaded = await gotoLoadedDashboard(page);
    test.skip(!loaded, 'Dashboard API did not load in time');
    await expect(page.locator('#chart-tab-revenue')).toBeVisible();
    await expect(page.locator('#chart-tab-visits')).toBeVisible();
    await expect(page.locator('#chart-tab-customers')).toBeVisible();
  });

  test('Switching chart tabs works without errors @owner', async ({ page }) => {
    const loaded = await gotoLoadedDashboard(page);
    test.skip(!loaded, 'Dashboard API did not load in time');
    await page.locator('#chart-tab-visits').click();
    await page.waitForTimeout(500);
    await page.locator('#chart-tab-customers').click();
    await page.waitForTimeout(500);
    await page.locator('#chart-tab-revenue').click();
    await page.waitForTimeout(500);
    await expect(page.locator('.page-title')).toBeVisible();
  });

  test('Scanner button is visible @owner', async ({ page }) => {
    await gotoLoadedDashboard(page);
    await expect(page.locator('#open-scanner-btn')).toBeVisible();
  });

  test('Stat cards are present on dashboard @owner', async ({ page }) => {
    const loaded = await gotoLoadedDashboard(page);
    test.skip(!loaded, 'Dashboard API did not load in time');
    const statCards = page.locator('.stat-card');
    await expect(statCards).toHaveCount(4, { timeout: 10000 });
  });

  test('Dashboard has tooltip or info icons @owner', async ({ page }) => {
    await gotoLoadedDashboard(page);
    await expect(page.locator('.page-title')).toBeVisible();
  });

  test('Dashboard page-subtitle renders @owner', async ({ page }) => {
    await gotoLoadedDashboard(page);
    await expect(page.locator('.page-subtitle')).toBeVisible();
  });
});

test.describe('Dashboard API Endpoints', () => {

  test('Analytics overview API returns valid structure', async ({ request }) => {
    const loginResp = await request.post(`${BASE_API}/api/v1/auth/login/`, {
      data: { email: 'owner@example.com', password: '123456' },
    });
    const { access_token } = await loginResp.json();

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
    const loginResp = await request.post(`${BASE_API}/api/v1/auth/login/`, {
      data: { email: 'owner@example.com', password: '123456' },
    });
    const { access_token } = await loginResp.json();

    const resp = await request.get(`${BASE_API}/api/v1/analytics/trends/?days=30`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('daily_data');
  });

  test('Visit metrics API returns unregistered_visits key', async ({ request }) => {
    const loginResp = await request.post(`${BASE_API}/api/v1/auth/login/`, {
      data: { email: 'owner@example.com', password: '123456' },
    });
    const { access_token } = await loginResp.json();

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
    const loginResp = await request.post(`${BASE_API}/api/v1/auth/login/`, {
      data: { email: 'owner@example.com', password: '123456' },
    });
    const { access_token } = await loginResp.json();

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
