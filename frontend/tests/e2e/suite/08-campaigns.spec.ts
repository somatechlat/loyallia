/**
 * Suite 08 — Campaigns (OWNER-only write, MANAGER nav isolation)
 * Tests campaigns page loads for OWNER and is hidden from MANAGER nav.
 */
import { test, expect } from '@playwright/test';

test.describe('Campaigns — OWNER @owner', () => {

  test('OWNER sees campaigns page @owner', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('OWNER has "Campañas" in navigation @owner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const navLink = page.locator('nav, aside').getByText('Campañas');
    await expect(navLink.first()).toBeVisible({ timeout: 10000 });
  });

});

test.describe('Campaigns — MANAGER Isolation @manager', () => {

  test('MANAGER does NOT have "Campañas" in navigation @manager', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const navLink = page.locator('nav, aside').getByText('Campañas');
    await expect(navLink).toHaveCount(0);
  });

});
