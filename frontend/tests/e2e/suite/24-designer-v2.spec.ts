/**
 * Suite 24 — V2 Pass Designer E2E
 * Tests the new V2 designer route: load, edit, save, preview.
 */
import { test, expect } from '@playwright/test';

test.describe('V2 Designer — OWNER @owner @designerV2', () => {

  test('OWNER opens V2 designer for existing program @owner', async ({ page }) => {
    // Navigate to programs list first
    await page.goto('/programs', { waitUntil: 'networkidle' });
    await page.waitForSelector('.card-hover, #create-first-program-btn', { timeout: 15000 });

    // If there are programs, open the first one's designer
    const programCards = page.locator('.card-hover');
    const cardCount = await programCards.count();

    if (cardCount === 0) {
      // Create a minimal program via wizard if none exists
      await page.goto('/programs/new', { waitUntil: 'networkidle' });
      await page.getByText('Tarjeta de Sellos').waitFor({ state: 'visible', timeout: 10000 });
      await page.getByText('Tarjeta de Sellos').click();
      await page.getByRole('button', { name: /siguiente/i }).click();
      await page.getByText('Sellos requeridos').waitFor({ state: 'visible', timeout: 5000 });
      await page.getByRole('button', { name: /siguiente/i }).click();
      await page.locator('#program-name').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('#program-name').fill('E2E Designer V2 Test');
      await page.locator('#program-desc').fill('Programa de prueba para designer V2');
      await page.getByRole('button', { name: /siguiente/i }).click();
      await page.getByText('E2E Designer V2 Test').first().waitFor({ state: 'visible', timeout: 5000 });
      await page.getByRole('button', { name: /crear programa/i }).click();
      await page.waitForURL(/.*programs.*/, { timeout: 15000 });
    }

    // Now navigate to the designer for program ID 1 (or first program)
    await page.goto('/programs/1/design', { waitUntil: 'networkidle' });

    // Verify designer loads
    await expect(page.getByText(/diseño/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[role="dialog"]').first()).not.toBeVisible();
  });

  test('V2 designer — switch platform tabs @owner', async ({ page }) => {
    await page.goto('/programs/1/design', { waitUntil: 'networkidle' });
    await expect(page.getByText(/diseño/i).first()).toBeVisible({ timeout: 15000 });

    // Default should show Apple or Google preview
    const appleBtn = page.getByRole('button', { name: /apple wallet/i });
    const googleBtn = page.getByRole('button', { name: /google wallet/i });

    if (await appleBtn.isVisible().catch(() => false)) {
      await appleBtn.click();
      await expect(page.getByText(/apple wallet/i).first()).toBeVisible();
    }
    if (await googleBtn.isVisible().catch(() => false)) {
      await googleBtn.click();
      await expect(page.getByText(/google wallet/i).first()).toBeVisible();
    }
  });

  test('V2 designer — change color and save @owner', async ({ page }) => {
    await page.goto('/programs/1/design', { waitUntil: 'networkidle' });
    await expect(page.getByText(/diseño/i).first()).toBeVisible({ timeout: 15000 });

    // Find the Design nav and click it
    const designNav = page.getByRole('button', { name: /^diseño$/i });
    if (await designNav.isVisible().catch(() => false)) {
      await designNav.click();
    }

    // Wait for color picker to be visible
    const colorInput = page.locator('input[type="color"]').first();
    await expect(colorInput).toBeVisible({ timeout: 10000 });

    // Change background color to a test color
    await colorInput.fill('#FF5733');

    // Click save
    const saveBtn = page.getByRole('button', { name: /guardar/i });
    await expect(saveBtn).toBeVisible({ timeout: 10000 });
    await saveBtn.click();

    // Wait for success toast
    await expect(page.getByText(/guardado/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('V2 designer — add and remove Apple field @owner', async ({ page }) => {
    await page.goto('/programs/1/design', { waitUntil: 'networkidle' });
    await expect(page.getByText(/diseño/i).first()).toBeVisible({ timeout: 15000 });

    // Click Data nav
    const dataNav = page.getByRole('button', { name: /^datos$/i });
    if (await dataNav.isVisible().catch(() => false)) {
      await dataNav.click();
    }

    // Click "Agregar campo" in the first group
    const addBtn = page.getByRole('button', { name: /agregar campo/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();

    // AddFieldModal should open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/agregar campo/i).first()).toBeVisible();

    // Fill in label
    const labelInput = page.locator('input[placeholder*="Etiqueta"]').first();
    await labelInput.fill('E2E Test Field');

    // Submit
    const submitBtn = page.getByRole('button', { name: /agregar$/i });
    await submitBtn.click();

    // Modal should close
    await expect(page.locator('[role="dialog"]')).toHaveCount(0, { timeout: 5000 });

    // Field should appear in list
    await expect(page.getByText('E2E Test Field')).toBeVisible({ timeout: 10000 });

    // Remove the field
    const fieldRow = page.getByText('E2E Test Field').locator('..').locator('..');
    const removeBtn = fieldRow.locator('button').last();
    await removeBtn.click();

    // Field should disappear
    await expect(page.getByText('E2E Test Field')).not.toBeVisible({ timeout: 5000 });
  });

  test('V2 designer — barcode type selector @owner', async ({ page }) => {
    await page.goto('/programs/1/design', { waitUntil: 'networkidle' });
    await expect(page.getByText(/diseño/i).first()).toBeVisible({ timeout: 15000 });

    // Click Barcode nav
    const barcodeNav = page.getByRole('button', { name: /^código$/i });
    if (await barcodeNav.isVisible().catch(() => false)) {
      await barcodeNav.click();
    }

    // Barcode section should show options
    await expect(page.getByText(/qr code/i).first()).toBeVisible({ timeout: 10000 });

    // Select Aztec
    await page.getByText(/aztec/i).click();

    // Save
    const saveBtn = page.getByRole('button', { name: /guardar/i });
    await saveBtn.click();
    await expect(page.getByText(/guardado/i).first()).toBeVisible({ timeout: 10000 });
  });

});
