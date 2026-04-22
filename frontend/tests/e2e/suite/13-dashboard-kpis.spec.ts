/**
 * Suite 13 — Dashboard KPIs, Date Filters, Chart Tabs
 * Tests the enhanced dashboard with date range selector, chart tabs, and KPI cards.
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
    // All 4 stat cards should be visible
    await expect(page.locator('.stat-card')).toHaveCount(4, { timeout: 10000 });
  });

  test('Date range selector shows 7d/14d/30d/90d @owner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await expect(page.locator('#date-range-7')).toBeVisible();
    await expect(page.locator('#date-range-14')).toBeVisible();
    await expect(page.locator('#date-range-30')).toBeVisible();
    await expect(page.locator('#date-range-90')).toBeVisible();
  });

  test('Clicking 7d filter reloads data @owner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.locator('#date-range-7').click();
    await page.waitForTimeout(2000);
    // Should still have stat cards after reload
    await expect(page.locator('.stat-card')).toHaveCount(4, { timeout: 10000 });
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
    // Click Visitas tab
    await page.locator('#chart-tab-visits').click();
    await page.waitForTimeout(500);
    // Click Clientes tab
    await page.locator('#chart-tab-customers').click();
    await page.waitForTimeout(500);
    // Click back to Ganancias
    await page.locator('#chart-tab-revenue').click();
    await page.waitForTimeout(500);
    // No crash — page still visible
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
    // Check first stat card links to /customers
    const customerCard = page.locator('a[href="/customers"]').first();
    await expect(customerCard).toBeVisible();
    // Check programs card links to /programs
    const programsCard = page.locator('a[href="/programs"]').first();
    await expect(programsCard).toBeVisible();
  });
});

test.describe('Dashboard API Endpoints', () => {

  test('Analytics overview API returns valid structure', async ({ request }) => {
    // Login first to get token
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
});
