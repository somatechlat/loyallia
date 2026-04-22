/**
 * Suite 09 — Settings & Billing (OWNER-only)
 * Tests settings page access, billing plans display, and MANAGER nav isolation.
 */
import { test, expect } from '@playwright/test';

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

});

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

});

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

});
