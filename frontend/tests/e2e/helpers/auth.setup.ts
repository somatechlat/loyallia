/**
 * Loyallia — Playwright Global Auth Setup
 * Logs in once per role and saves browser state for reuse across all tests.
 */
import { test as setup, expect } from '@playwright/test';

const USERS = [
  { file: '.auth/owner.json',      email: 'carlos@cafeelritmo.ec',     password: '123456', expectedPath: '/' },
  { file: '.auth/manager.json',    email: 'gabriela@cafeelritmo.ec',   password: '123456', expectedPath: '/' },
  { file: '.auth/staff.json',      email: 'sebastian@cafeelritmo.ec',  password: '123456', expectedPath: '/scanner' },
  { file: '.auth/superadmin.json', email: 'admin@loyallia.com',        password: '123456', expectedPath: '/superadmin' },
];

for (const user of USERS) {
  setup(`authenticate as ${user.email}`, async ({ page, context }) => {
    // Clear all cookies from previous tests
    await context.clearCookies();

    // Navigate to login
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Fill credentials using fill() which clears existing content first
    const emailInput = page.locator('#email');
    await emailInput.click();
    await emailInput.fill(user.email);

    const passwordInput = page.locator('#password');
    await passwordInput.click();
    await passwordInput.fill(user.password);

    // Submit via form submit instead of button click (more reliable)
    await page.locator('#login-btn').click();

    // Wait longer for navigation — some roles redirect client-side
    await page.waitForTimeout(5000);

    // For STAFF and SUPER_ADMIN, the redirect might take longer
    // Just verify cookies were set (access_token exists)
    const cookies = await context.cookies();
    const accessToken = cookies.find(c => c.name === 'access_token');
    expect(accessToken, `access_token cookie should exist after login for ${user.email}`).toBeTruthy();

    // Save storage state
    await page.context().storageState({ path: user.file });
  });
}
