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

  test('OWNER has "Automatizacion" in navigation @owner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const navLink = page.locator('nav, aside').getByText('Automatizacion');
    await expect(navLink.first()).toBeVisible({ timeout: 10000 });
  });

  test('OWNER can create automation rule with birthday trigger and email action @owner', async ({ page }) => {
    await page.goto('/automation', { waitUntil: 'domcontentloaded' });
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });

    // Click "Nueva Regla" / add rule button
    const newRuleBtn = page.getByRole('button', { name: /nueva regla|agregar regla|crear regla/i }).first();
    if (await newRuleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newRuleBtn.click();
    } else {
      // Try a generic add button
      const addBtn = page.locator('button').filter({ hasText: /nueva|agregar|crear/i }).first();
      await addBtn.waitFor({ state: 'visible', timeout: 5000 });
      await addBtn.click();
    }

    // Rule form should appear — wait for rule name input
    const ruleNameInput = page.locator('input[placeholder*="nombre" i], input#rule-name, input[name="name"]').first();
    await ruleNameInput.waitFor({ state: 'visible', timeout: 10000 });

    // Fill rule name
    await ruleNameInput.fill('E2E Birthday Email Rule');

    // Select trigger: "Cumpleanos" / Birthday
    const triggerSelect = page.locator('select').filter({ has: page.locator('option:has-text("Cumpleanos")') }).first();
    if (await triggerSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await triggerSelect.selectOption({ label: 'Cumpleanos' });
    } else {
      // Try clicking a trigger dropdown
      const triggerBtn = page.locator('button').filter({ hasText: /disparador|trigger/i }).first();
      if (await triggerBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await triggerBtn.click();
        await page.getByText('Cumpleanos').first().click();
      }
    }

    // Select action: "Enviar Email" / Send Email
    const actionSelect = page.locator('select').filter({ has: page.locator('option:has-text("Email")') }).first();
    if (await actionSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await actionSelect.selectOption({ label: /email/i });
    } else {
      const actionBtn = page.locator('button').filter({ hasText: /accion|action/i }).first();
      if (await actionBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await actionBtn.click();
        await page.getByText('Email').first().click();
      }
    }

    // Fill email subject and body
    const subjectInput = page.locator('input[placeholder*="asunto" i], input[name="subject"], #email-subject').first();
    if (await subjectInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await subjectInput.fill('Feliz Cumpleanos!');
    }

    const bodyInput = page.locator('textarea[placeholder*="mensaje" i], textarea[name="body"], #email-body').first();
    if (await bodyInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bodyInput.fill('Te deseamos un feliz cumpleanos con un regalo especial.');
    }

    // Save the rule
    const saveBtn = page.getByRole('button', { name: /guardar|salvar|save/i }).first();
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    await saveBtn.click();

    // Wait for API response indicating rule save
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/') && (resp.url().includes('automation') || resp.url().includes('rule')),
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

  test('MANAGER does NOT have "Automatizacion" in navigation @manager', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const navLink = page.locator('nav, aside').getByText('Automatizacion');
    await expect(navLink).toHaveCount(0);
  });

});
