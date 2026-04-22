/**
 * Suite 13 — Dashboard KPIs, Date Filters, Chart Tabs, Ganancia/Visitas Tabs
 * Tests the enhanced dashboard with expanded date ranges, tabbed views,
 * campaign KPIs block, custom date picker, and InfoTooltips.
 */
import { test, expect } from '@playwright/test';

const BASE_API = 'http://localhost:33905';

test.describe('Dashboard KPIs — OWNER @owner', () => {

  test('Dashboard loads with welcome message @owner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const title = page.locator('.page-title');
    await expect(title).toContainText('Bienvenido');
  });

  test('Dashboard shows all 4 stat cards @owner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await expect(page.locator('.stat-card')).toHaveCount(4, { timeout: 10000 });
  });

  test('Date range selector shows Hoy/7d/4sem/6m/12m/MTD/Periodo @owner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await expect(page.locator('#date-range-1')).toBeVisible();
    await expect(page.locator('#date-range-7')).toBeVisible();
    await expect(page.locator('#date-range-28')).toBeVisible();
    await expect(page.locator('#date-range-180')).toBeVisible();
    await expect(page.locator('#date-range-365')).toBeVisible();
    await expect(page.locator('#date-range-mtd')).toBeVisible();
    await expect(page.locator('#date-range-custom')).toBeVisible();
  });

  test('Clicking 7d filter reloads data @owner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.locator('#date-range-7').click();
    await page.waitForTimeout(2000);
    await expect(page.locator('.stat-card')).toHaveCount(4, { timeout: 10000 });
  });

  test('Clicking Hoy filter reloads data @owner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.locator('#date-range-1').click();
    await page.waitForTimeout(2000);
    await expect(page.locator('.stat-card')).toHaveCount(4, { timeout: 10000 });
  });

  test('Custom date picker appears on Periodo click @owner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.locator('#date-range-custom').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#custom-date-picker')).toBeVisible();
  });

  test('Ganancia/Visitas tab selector renders @owner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await expect(page.locator('#dash-tab-ganancia')).toBeVisible();
    await expect(page.locator('#dash-tab-visitas')).toBeVisible();
  });

  test('Clicking Visitas tab switches content @owner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.locator('#dash-tab-visitas').click();
    await page.waitForTimeout(500);
    // Visitas tab should contain visit-specific KPIs
    await expect(page.getByText('Visitas totales')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Clientes únicos')).toBeVisible({ timeout: 5000 });
  });

  test('Clicking Ganancia tab shows revenue KPIs @owner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // First click Visitas to switch away
    await page.locator('#dash-tab-visitas').click();
    await page.waitForTimeout(500);
    // Then click back to Ganancia
    await page.locator('#dash-tab-ganancia').click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Ingresos brutos')).toBeVisible({ timeout: 5000 });
  });

  test('Chart tabs Ganancias/Visitas/Clientes render @owner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await expect(page.locator('#chart-tab-revenue')).toBeVisible();
    await expect(page.locator('#chart-tab-visits')).toBeVisible();
    await expect(page.locator('#chart-tab-customers')).toBeVisible();
  });

  test('Switching chart tabs works without errors @owner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.locator('#chart-tab-visits').click();
    await page.waitForTimeout(500);
    await page.locator('#chart-tab-customers').click();
    await page.waitForTimeout(500);
    await page.locator('#chart-tab-revenue').click();
    await page.waitForTimeout(500);
    await expect(page.locator('.page-title')).toBeVisible();
  });

  test('Scanner button is visible @owner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await expect(page.locator('#open-scanner-btn')).toBeVisible();
  });

  test('Stat cards link to correct pages @owner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await expect(page.locator('a[href="/customers"]').first()).toBeVisible();
    await expect(page.locator('a[href="/programs"]').first()).toBeVisible();
  });

  test('Dashboard has InfoTooltip icons @owner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // At least one info tooltip should be present
    const tooltipBtns = page.locator('button[aria-label="Más información"]');
    await expect(tooltipBtns.first()).toBeVisible({ timeout: 5000 });
  });

  test('Current date footer renders @owner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await expect(page.locator('#current-date')).toBeVisible();
    await expect(page.locator('#current-date')).toContainText('Hoy');
  });
});

test.describe('Dashboard API Endpoints', () => {

  test('Analytics overview API returns valid structure', async ({ request }) => {
    const loginResp = await request.post(`${BASE_API}/api/v1/auth/login/`, {
      data: { email: 'carlos@cafeelritmo.ec', password: '123456' },
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
      data: { email: 'carlos@cafeelritmo.ec', password: '123456' },
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
      data: { email: 'carlos@cafeelritmo.ec', password: '123456' },
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
      data: { email: 'carlos@cafeelritmo.ec', password: '123456' },
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
