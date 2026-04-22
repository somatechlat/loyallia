import { test, expect, Page } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

async function loginAs(page: Page, email: string, password: string = '123456') {
  // Navigate and wait for the login form to be fully interactive
  await page.goto('/login', { waitUntil: 'networkidle' });
  await expect(page.locator('#login-btn')).toBeVisible({ timeout: 10000 });

  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('#login-btn');

  // Wait for the SPA to process: API call, cookie set, /me fetch, router.replace
  // Use polling to detect when we've left the login page
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(1000);
    if (!page.url().includes('/login')) break;
  }
}

async function loginAndWaitForSidebar(page: Page, email: string) {
  await loginAs(page, email);
  await expect(page.locator('aside')).toBeVisible({ timeout: 30000 });
}

// ═══════════════════════════════════════════════════════════════════
// 1. SUPER_ADMIN JOURNEYS
// ═══════════════════════════════════════════════════════════════════

test.describe('SuperAdmin SaaS Manager Journeys', () => {
  test.setTimeout(90000);

  test('SA-1: Login redirects to /superadmin dashboard', async ({ page }) => {
    await loginAs(page, 'admin@loyallia.com');
    await page.waitForFunction(() => window.location.pathname.includes('/superadmin'), { timeout: 20000 });
    await expect(page.locator('h1')).toContainText('SaaS Central Command', { timeout: 15000 });
  });

  test('SA-2: Can navigate to tenants management', async ({ page }) => {
    await loginAs(page, 'admin@loyallia.com');
    await page.waitForFunction(() => window.location.pathname.includes('/superadmin'), { timeout: 20000 });
    await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
    const link = page.locator('aside').getByText('Negocios');
    await expect(link).toBeVisible({ timeout: 10000 });
    await link.click();
    await page.waitForFunction(() => window.location.pathname.includes('/superadmin/tenants'), { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('Negocios', { timeout: 10000 });
  });

  test('SA-3: Cannot access tenant dashboard routes', async ({ page }) => {
    await loginAs(page, 'admin@loyallia.com');
    await page.waitForFunction(() => window.location.pathname.includes('/superadmin'), { timeout: 20000 });
    await page.goto('/programs', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.location.pathname.includes('/superadmin'), { timeout: 15000 });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. OWNER JOURNEYS
// ═══════════════════════════════════════════════════════════════════

test.describe('Owner Business Admin Journeys', () => {
  test.setTimeout(90000);

  test('OW-1: Login shows dashboard with sidebar', async ({ page }) => {
    await loginAndWaitForSidebar(page, 'carlos@cafeelritmo.ec');
    await expect(page.locator('main')).toBeVisible();
    expect(page.url()).not.toContain('/superadmin');
  });

  test('OW-2: Settings and Billing visible in sidebar', async ({ page }) => {
    await loginAndWaitForSidebar(page, 'carlos@cafeelritmo.ec');
    await expect(page.locator('aside').getByText('Configuración')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('aside').getByText('Facturación')).toBeVisible({ timeout: 10000 });
  });

  test('OW-3: Can navigate to Programs', async ({ page }) => {
    await loginAndWaitForSidebar(page, 'carlos@cafeelritmo.ec');
    await page.locator('aside').getByText('Programas').click();
    await page.waitForFunction(() => window.location.pathname.includes('/programs'), { timeout: 10000 });
  });

  test('OW-4: Cannot access SuperAdmin routes', async ({ page }) => {
    await loginAndWaitForSidebar(page, 'carlos@cafeelritmo.ec');
    await page.goto('/superadmin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    expect(page.url()).not.toContain('/superadmin');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. MANAGER JOURNEYS
// ═══════════════════════════════════════════════════════════════════

test.describe('Manager Restricted Journeys', () => {
  test.setTimeout(60000);

  test('MG-1: Login shows dashboard', async ({ page }) => {
    await loginAndWaitForSidebar(page, 'gabriela@cafeelritmo.ec');
    await expect(page.locator('main')).toBeVisible();
  });

  test('MG-2: Settings NOT visible in sidebar', async ({ page }) => {
    await loginAndWaitForSidebar(page, 'gabriela@cafeelritmo.ec');
    await expect(page.locator('aside').getByText('Configuración')).not.toBeVisible({ timeout: 5000 });
  });

  test('MG-3: Billing NOT visible in sidebar', async ({ page }) => {
    await loginAndWaitForSidebar(page, 'gabriela@cafeelritmo.ec');
    await expect(page.locator('aside').getByText('Facturación')).not.toBeVisible({ timeout: 5000 });
  });

  test('MG-4: Programs visible in sidebar', async ({ page }) => {
    await loginAndWaitForSidebar(page, 'gabriela@cafeelritmo.ec');
    await expect(page.locator('aside').getByText('Programas')).toBeVisible({ timeout: 10000 });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. STAFF JOURNEYS
// ═══════════════════════════════════════════════════════════════════

test.describe('Staff Scanner-Only Journeys', () => {
  test.setTimeout(60000);

  test('ST-1: Redirected to scanner on login', async ({ page }) => {
    await loginAs(page, 'sebastian@cafeelritmo.ec');
    await page.waitForFunction(() => window.location.pathname.includes('/scanner'), { timeout: 20000 });
  });
});
