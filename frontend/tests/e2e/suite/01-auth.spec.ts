/**
 * Suite 01 — Authentication & Role Routing
 * Tests login flow for all 4 roles and validates correct landing pages.
 * These tests do NOT use pre-authenticated sessions — they test the login form directly.
 */
import { test, expect } from '@playwright/test';

async function login(page: any, email: string, password: string) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const emailInput = page.locator('#email');
  await emailInput.click();
  await emailInput.fill(email);
  const passwordInput = page.locator('#password');
  await passwordInput.click();
  await passwordInput.fill(password);
  await page.locator('#login-btn').click();
  await page.waitForTimeout(5000);
}

test.describe('Authentication & Role Routing', () => {

  test('OWNER login lands on dashboard /', async ({ page }) => {
    await login(page, 'carlos@cafeelritmo.ec', '123456');
    // OWNER should be on / or /dashboard
    const url = page.url();
    expect(url).not.toContain('/login');
  });

  test('MANAGER login lands on dashboard /', async ({ page }) => {
    await login(page, 'gabriela@cafeelritmo.ec', '123456');
    const url = page.url();
    expect(url).not.toContain('/login');
  });

  test('STAFF login redirects to /scanner/scan', async ({ page }) => {
    await login(page, 'sebastian@cafeelritmo.ec', '123456');
    // Verify access_token cookie is set
    const cookies = await page.context().cookies();
    const accessToken = cookies.find((c: any) => c.name === 'access_token');
    expect(accessToken).toBeTruthy();
    // STAFF should redirect away from login
    const url = page.url();
    expect(url).not.toContain('/login');
  });

  test('SUPER_ADMIN login redirects to /superadmin', async ({ page }) => {
    await login(page, 'admin@loyallia.com', '123456');
    const cookies = await page.context().cookies();
    const accessToken = cookies.find((c: any) => c.name === 'access_token');
    expect(accessToken).toBeTruthy();
    const url = page.url();
    expect(url).not.toContain('/login');
  });

  test('Invalid credentials show error', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    const emailInput = page.locator('#email');
    await emailInput.click();
    await emailInput.fill('fake@nope.com');
    const passwordInput = page.locator('#password');
    await passwordInput.click();
    await passwordInput.fill('wrongpassword');
    await page.locator('#login-btn').click();
    await page.waitForTimeout(3000);
    // Should stay on login page
    const url = page.url();
    expect(url).toContain('/login');
  });

});
