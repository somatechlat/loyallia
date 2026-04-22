/**
 * Suite 04 — Team Management (OWNER-only)
 * Tests team member list, add button, and MANAGER nav isolation.
 * The invite form shows AFTER clicking "Agregar Miembro" button.
 */
import { test, expect } from '@playwright/test';

test.describe('Team — OWNER CRUD @owner', () => {

  test('OWNER sees team members list @owner', async ({ page }) => {
    await page.goto('/team', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Title is "Equipo" with h1
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    // Should have at least the owner + manager + staff in the table
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('OWNER sees "Agregar Miembro" button @owner', async ({ page }) => {
    await page.goto('/team', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const addBtn = page.getByRole('button', { name: /agregar/i });
    await expect(addBtn.first()).toBeVisible({ timeout: 10000 });
  });

  test('OWNER can click add to open invite form @owner', async ({ page }) => {
    await page.goto('/team', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    // Click "Agregar Miembro" button to open the form
    const addBtn = page.getByRole('button', { name: /agregar/i });
    await addBtn.first().click();
    await page.waitForTimeout(1000);
    // The invite form should now be visible
    await expect(page.getByText('Invitar Miembro')).toBeVisible({ timeout: 10000 });
  });

});

test.describe('Team — MANAGER Isolation @manager', () => {

  test('MANAGER does NOT have "Equipo" in navigation @manager', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const navLink = page.locator('nav, aside').getByText('Equipo');
    await expect(navLink).toHaveCount(0);
  });

});
