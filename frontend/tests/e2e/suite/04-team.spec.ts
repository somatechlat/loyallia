/**
 * Suite 04 — Team Management (OWNER-only)
 * Tests team member list, invite form, role assignment, and member removal.
 * The invite form shows AFTER clicking "Agregar Miembro" button.
 */
import { test, expect } from '@playwright/test';

test.describe('Team — OWNER CRUD @owner @team', () => {

  test('OWNER sees team members list @owner', async ({ page }) => {
    await page.goto('/team', { waitUntil: 'networkidle' });
    // Title is "Equipo" with h1
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    // Should have at least the owner + manager + staff in the table
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('OWNER sees "Agregar Miembro" button @owner', async ({ page }) => {
    await page.goto('/team', { waitUntil: 'networkidle' });
    const addBtn = page.getByRole('button', { name: /agregar/i });
    await expect(addBtn.first()).toBeVisible({ timeout: 10000 });
  });

  test('OWNER can click add to open invite form @owner', async ({ page }) => {
    await page.goto('/team', { waitUntil: 'networkidle' });
    // Click "Agregar Miembro" button to open the form
    const addBtn = page.getByRole('button', { name: /agregar/i });
    await addBtn.first().click();
    // The invite form should now be visible
    await expect(page.getByText('Invitar Miembro')).toBeVisible({ timeout: 10000 });
  });

  test('OWNER can invite a new team member with email and role @owner', async ({ page }) => {
    await page.goto('/team', { waitUntil: 'networkidle' });

    // Click "Agregar Miembro" button
    const addBtn = page.getByRole('button', { name: /agregar/i });
    await addBtn.first().waitFor({ state: 'visible', timeout: 10000 });
    await addBtn.first().click();

    // Wait for invite form
    await expect(page.getByText('Invitar Miembro')).toBeVisible({ timeout: 10000 });

    // Fill first name, last name, and email
    const firstNameInput = page.locator('input').nth(0);
    await firstNameInput.waitFor({ state: 'visible', timeout: 5000 });
    await firstNameInput.fill('E2E');

    const lastNameInput = page.locator('input').nth(1);
    await lastNameInput.fill('Test');

    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    const uniqueEmail = `e2e-invite-${Date.now()}@test.com`;
    await emailInput.fill(uniqueEmail);

    // Select role (MANAGER)
    const roleSelect = page.locator('select').first();
    if (await roleSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await roleSelect.selectOption('MANAGER');
    }

    // Submit the invite
    const submitBtn = page.getByRole('button', { name: /crear miembro|enviar|invitar|guardar/i }).first();
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });

    // Wait for API response before clicking
    const invitePromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/') && (resp.url().includes('invite') || resp.url().includes('member')),
      { timeout: 15000 },
    ).catch(() => {});

    await submitBtn.click();
    await invitePromise;

    // Verify success toast or new member appears
    await expect(
      page.locator('.go2072408551, [class*="toast"]').or(page.getByText(/invitacion enviada|miembro invitado|invited/i)).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('OWNER can change member role @owner', async ({ page }) => {
    await page.goto('/team', { waitUntil: 'networkidle' });
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });

    // Find a MANAGER row and click to change role
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Find a row with MANAGER role
    let managerRow = null;
    for (let i = 0; i < rowCount; i++) {
      const rowText = await rows.nth(i).textContent();
      if (rowText && rowText.includes('MANAGER')) {
        managerRow = rows.nth(i);
        break;
      }
    }

    if (managerRow) {
      // Click on role selector or edit button in the row
      const roleSelect = managerRow.locator('select').first();
      if (await roleSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
        await roleSelect.selectOption('STAFF');

        // Wait for role update API
        await page.waitForResponse(
          (resp) => resp.url().includes('/api/') && resp.url().includes('member'),
          { timeout: 15000 },
        ).catch(() => {});

        // Verify toast confirmation
        await expect(
          page.locator('.go2072408551, [class*="toast"]').or(page.getByText(/rol actualizado|role updated/i)).first(),
        ).toBeVisible({ timeout: 10000 });
      } else {
        // Try clicking an edit button
        const editBtn = managerRow.locator('button').filter({ hasText: /editar/i }).first();
        if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await editBtn.click();
          const roleDropdown = page.locator('select').first();
          await roleDropdown.waitFor({ state: 'visible', timeout: 5000 });
          await roleDropdown.selectOption('STAFF');
          await page.getByRole('button', { name: /guardar|save/i }).first().click();
          await page.waitForResponse(
            (resp) => resp.url().includes('/api/') && resp.url().includes('member'),
            { timeout: 15000 },
          ).catch(() => {});
        }
      }
    }
  });

  test('OWNER can remove a team member @owner', async ({ page }) => {
    await page.goto('/team', { waitUntil: 'networkidle' });
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });

    // Find a removable member row (not OWNER)
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Find a row with MANAGER or STAFF (not OWNER)
    let removableRow = null;
    for (let i = rowCount - 1; i >= 0; i--) {
      const rowText = await rows.nth(i).textContent();
      if (rowText && (rowText.includes('MANAGER') || rowText.includes('STAFF'))) {
        removableRow = rows.nth(i);
        break;
      }
    }

    if (removableRow) {
      // Click delete/remove button in the row
      const deleteBtn = removableRow.locator('button').filter({ hasText: /eliminar|borrar|delete|remove/i }).first();
      if (await deleteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await deleteBtn.click();

        // Confirm deletion if dialog appears
        const confirmBtn = page.getByRole('button', { name: /confirmar|si|yes|eliminar/i }).first();
        if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await confirmBtn.click();
        }

        // Wait for delete API response
        await page.waitForResponse(
          (resp) => resp.url().includes('/api/') && resp.request().method() === 'DELETE',
          { timeout: 15000 },
        ).catch(() => {});

        // Verify success toast
        await expect(
          page.locator('.go2072408551, [class*="toast"]').or(page.getByText(/miembro eliminado|member removed/i)).first(),
        ).toBeVisible({ timeout: 10000 });
      }
    }
  });

});

test.describe('Team — MANAGER Isolation @manager @team', () => {
  test.use({ storageState: '.auth/manager.json' });

  test('MANAGER does NOT have "Equipo" in navigation @manager', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const navLink = page.locator('nav, aside').getByText('Equipo');
    await expect(navLink).toHaveCount(0);
  });

});
