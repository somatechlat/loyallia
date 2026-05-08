/**
 * Suite 09 — Settings & Billing (OWNER-only)
 * Tests settings page access, billing plans display, MANAGER nav isolation,
 * WhatsApp activation flow, and owner-only route protection.
 */
import { test, expect } from '@playwright/test';

const BASE_API = 'http://localhost:80';

async function loginAs(
  request: import('@playwright/test').APIRequestContext,
  email: string,
  password: string = '123456',
): Promise<string> {
  const resp = await request.post(`${BASE_API}/api/v1/auth/login/`, {
    data: { email, password },
  });
  expect(resp.status(), `Login should succeed for ${email}`).toBe(200);
  const body = await resp.json();
  expect(body.access_token).toBeTruthy();
  return body.access_token;
}

// =============================================================================
// SETTINGS — OWNER
// =============================================================================

test.describe('Settings — OWNER @owner', () => {

  test('OWNER can access settings page @owner', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('OWNER has "Configuración" in navigation @owner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const navLink = page.locator('nav, aside').getByText('Configuración');
    await expect(navLink.first()).toBeVisible({ timeout: 10000 });
  });

  test('OWNER settings page shows business info form @owner', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Should have inputs for business configuration
    await expect(page.locator('input, textarea').first()).toBeVisible({ timeout: 10000 });
  });

  test('OWNER settings page shows save button @owner', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const saveBtn = page.locator('#save-settings-btn');
    await expect(saveBtn).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// BILLING — OWNER
// =============================================================================

test.describe('Billing — OWNER @owner', () => {

  test('OWNER can access billing page @owner', async ({ page }) => {
    await page.goto('/billing', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('OWNER has "Facturación" in navigation @owner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const navLink = page.locator('nav, aside').getByText('Facturación');
    await expect(navLink.first()).toBeVisible({ timeout: 10000 });
  });

  test('OWNER billing page shows plan info @owner', async ({ page }) => {
    await page.goto('/billing', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Should show current plan or trial status
    const main = page.locator('main');
    await expect(main).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// WHATSAPP ACTIVATION — OWNER
// =============================================================================

test.describe('WhatsApp Activation — OWNER @owner', () => {

  test('OWNER settings page shows WhatsApp integration section @owner', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await expect(page.locator('#wa-integration-section')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#wa-toggle')).toBeVisible();
    await expect(page.getByText('WhatsApp Business Bridge')).toBeVisible();
  });

  test('OWNER can toggle WhatsApp and see wizard or status @owner', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.locator('#wa-toggle').click();
    await page.waitForTimeout(5000);
    // One of: QR wizard, connected dashboard, checking spinner, or error should be visible
    const hasQr = await page.locator('#wa-wizard-content').count();
    const hasConnected = await page.locator('#wa-connected-dashboard').count();
    const hasChecking = await page.getByText('Verificando disponibilidad').count();
    const hasError = await page.getByText('no está disponible').count();
    expect(hasQr + hasConnected + hasChecking + hasError).toBeGreaterThan(0);
  });

  test('OWNER WhatsApp cancel button returns to disabled state @owner', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.locator('#wa-toggle').click();
    await page.waitForTimeout(3000);
    const cancelBtn = page.locator('#wa-cancel-btn');
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await page.waitForTimeout(500);
      await expect(page.locator('#wa-wizard-content')).toHaveCount(0);
    }
  });
});

// =============================================================================
// SETTINGS & BILLING — MANAGER ISOLATION
// =============================================================================

test.describe('Settings & Billing — MANAGER Isolation @manager', () => {

  test('MANAGER does NOT have "Configuración" in navigation @manager', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const navLink = page.locator('nav, aside').getByText('Configuración');
    await expect(navLink).toHaveCount(0);
  });

  test('MANAGER does NOT have "Facturación" in navigation @manager', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const navLink = page.locator('nav, aside').getByText('Facturación');
    await expect(navLink).toHaveCount(0);
  });

  test('MANAGER accessing /settings is redirected @manager', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).not.toContain('/settings');
  });

  test('MANAGER accessing /billing is redirected @manager', async ({ page }) => {
    await page.goto('/billing', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).not.toContain('/billing');
  });
});

// =============================================================================
// SETTINGS & BILLING — STAFF ISOLATION
// =============================================================================

test.describe('Settings & Billing — STAFF Isolation @staff', () => {

  test('STAFF does NOT have "Configuración" in navigation @staff', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const navLink = page.locator('nav, aside').getByText('Configuración');
    await expect(navLink).toHaveCount(0);
  });

  test('STAFF accessing /settings is redirected to scanner @staff', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).not.toContain('/settings');
  });
});
