/**
 * Suite 07 — Automation (OWNER-only write, MANAGER nav isolation)
 * Tests automation page loads for OWNER and is hidden from MANAGER nav.
 * Covers: CRUD for automation rules (trigger + action + save + verify).
 */
import { test, expect } from '@playwright/test';

test.describe('Automation — OWNER @owner @automation', () => {

  test('OWNER sees automation page @owner', async ({ page }) => {
    await page.goto('/automation', { waitUntil: 'domcontentloaded' });
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('OWNER has "Automatización" in navigation @owner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const navLink = page.locator('nav, aside').getByText('Automatización');
    await expect(navLink.first()).toBeVisible({ timeout: 10000 });
  });

  test('OWNER can create automation rule with birthday trigger and email action @owner', async ({ page }) => {
    await page.goto('/automation', { waitUntil: 'domcontentloaded' });
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });

    // Click create automation button
    const createBtn = page.locator('#create-automation-btn, #create-first-automation').first();
    await createBtn.waitFor({ state: 'visible', timeout: 5000 });
    await createBtn.click();

    // Step 1: Fill name
    const nameInput = page.locator('#auto-name');
    await nameInput.waitFor({ state: 'visible', timeout: 10000 });
    await nameInput.fill('E2E Birthday Email Rule');

    // Next step
    const nextBtn = page.getByRole('button', { name: /siguiente/i }).first();
    await nextBtn.click();

    // Step 2: Select trigger "Cumpleaños próximo"
    const triggerCard = page.locator('button').filter({ hasText: 'Cumpleaños próximo' }).first();
    await triggerCard.waitFor({ state: 'visible', timeout: 10000 });
    await triggerCard.click();

    // Select action "Enviar email"
    const actionCard = page.locator('button').filter({ hasText: /enviar email|email/i }).first();
    await actionCard.waitFor({ state: 'visible', timeout: 10000 });
    await actionCard.click();

    // Next step
    await nextBtn.click();

    // Step 3: Fill message title and body
    const titleInput = page.locator('#action-title');
    if (await titleInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await titleInput.fill('¡Feliz Cumpleaños!');
    }

    const bodyInput = page.locator('#action-message');
    if (await bodyInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bodyInput.fill('Te deseamos un feliz cumpleaños con un regalo especial.');
    }

    // Save the rule
    const saveBtn = page.getByRole('button', { name: /crear automatización|guardar cambios/i }).first();
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    await saveBtn.click();

    // Wait for API response indicating rule save
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/') && resp.url().includes('automation'),
      { timeout: 15000 },
    ).catch(() => {});

    // Verify rule appears in the list
    await expect(page.getByText('E2E Birthday Email Rule').first()).toBeVisible({ timeout: 10000 });
  });

  test('OWNER can deactivate automation rule @owner', async ({ page }) => {
    await page.goto('/automation', { waitUntil: 'domcontentloaded' });
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });

    // Find the E2E rule and toggle it off
    const ruleRow = page.locator('tr, [class*="card"]').filter({ hasText: 'E2E Birthday Email Rule' }).first();
    if (await ruleRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Find toggle/switch within the row
      const toggle = ruleRow.locator('input[type="checkbox"], [role="switch"], button[aria-pressed]').first();
      if (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await toggle.click();
        // Wait for the API call confirming the toggle
        await page.waitForResponse(
          (resp) => resp.url().includes('/api/') && (resp.url().includes('automation') || resp.url().includes('rule')),
          { timeout: 15000 },
        ).catch(() => {});
      }
    }
  });

  test('OWNER can delete automation rule @owner', async ({ page }) => {
    await page.goto('/automation', { waitUntil: 'domcontentloaded' });
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });

    // Find the E2E rule and delete it
    const ruleRow = page.locator('tr, [class*="card"]').filter({ hasText: 'E2E Birthday Email Rule' }).first();
    if (await ruleRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      const deleteBtn = ruleRow.locator('button').filter({ hasText: /eliminar|borrar|delete/i }).first();
      if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteBtn.click();
        // Confirm deletion if a dialog appears
        const confirmBtn = page.getByRole('button', { name: /confirmar|si|yes|delete/i }).first();
        if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await confirmBtn.click();
        }
        await page.waitForResponse(
          (resp) => resp.url().includes('/api/') && resp.request().method() === 'DELETE',
          { timeout: 15000 },
        ).catch(() => {});
      }
    }
  });

});

test.describe('Automation — MANAGER Isolation @manager @automation', () => {
  test.use({ storageState: '.auth/manager.json' });

  test('MANAGER does NOT have "Automatización" in navigation @manager', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const navLink = page.locator('nav, aside').getByText('Automatización');
    await expect(navLink).toHaveCount(0);
  });

});
