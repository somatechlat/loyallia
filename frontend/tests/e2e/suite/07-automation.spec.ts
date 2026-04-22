/**
 * Suite 07 — Automation (OWNER-only write, MANAGER nav isolation)
 * Tests automation page loads for OWNER and is hidden from MANAGER nav.
 */
import { test, expect } from '@playwright/test';

test.describe('Automation — OWNER @owner', () => {

  test('OWNER sees automation page @owner', async ({ page }) => {
    await page.goto('/automation', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('OWNER has "Automatización" in navigation @owner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const navLink = page.locator('nav, aside').getByText('Automatización');
    await expect(navLink.first()).toBeVisible({ timeout: 10000 });
  });

});

test.describe('Automation — MANAGER Isolation @manager', () => {

  test('MANAGER does NOT have "Automatización" in navigation @manager', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const navLink = page.locator('nav, aside').getByText('Automatización');
    await expect(navLink).toHaveCount(0);
  });

});
