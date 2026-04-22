/**
 * Suite 02 — Programs CRUD + Wizard Flow
 * Tests the 4-step program creation wizard and role-based button visibility.
 * Wizard steps: 0=Type, 1=Config, 2=Design(name+desc+template), 3=Review
 */
import { test, expect } from '@playwright/test';

test.describe('Programs — OWNER CRUD @owner', () => {

  test('OWNER sees programs list page @owner', async ({ page }) => {
    await page.goto('/programs', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Title is "Programas de fidelización"
    await expect(page.getByText('Programas de fidelización')).toBeVisible({ timeout: 10000 });
  });

  test('OWNER sees "Nuevo programa" button @owner', async ({ page }) => {
    await page.goto('/programs', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const btn = page.getByText('Nuevo programa');
    await expect(btn).toBeVisible({ timeout: 10000 });
  });

  test('OWNER completes full 4-step wizard — Stamp Card @owner', async ({ page }) => {
    // Navigate to wizard
    await page.goto('/programs/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // --- Step 0: Select card type (stamp) ---
    await expect(page.getByText('Tarjeta de Sellos')).toBeVisible({ timeout: 10000 });
    await page.getByText('Tarjeta de Sellos').click();
    await page.waitForTimeout(500);
    // Click "Siguiente" button
    const nextBtn1 = page.getByRole('button', { name: /siguiente/i });
    await nextBtn1.click();
    await page.waitForTimeout(1000);

    // --- Step 1: Type-specific Config (stamps_required, reward_description) ---
    await expect(page.getByText('Sellos requeridos')).toBeVisible({ timeout: 5000 });
    // Default values are fine, just click next
    const nextBtn2 = page.getByRole('button', { name: /siguiente/i });
    await nextBtn2.click();
    await page.waitForTimeout(1000);

    // --- Step 2: Design — Name, description, template ---
    await expect(page.locator('#program-name')).toBeVisible({ timeout: 5000 });
    await page.locator('#program-name').fill('E2E Test Stamps');
    await page.locator('#program-desc').fill('Programa de prueba creado por Playwright');
    // Click next
    const nextBtn3 = page.getByRole('button', { name: /siguiente/i });
    await nextBtn3.click();
    await page.waitForTimeout(1000);

    // --- Step 3: Review ---
    await expect(page.getByText('E2E Test Stamps').first()).toBeVisible({ timeout: 5000 });
    // Submit — click "Crear programa"
    const createBtn = page.getByRole('button', { name: /crear programa/i });
    await createBtn.click();
    await page.waitForTimeout(5000);

    // Should redirect to programs list
    await expect(page).toHaveURL(/.*programs.*/, { timeout: 10000 });
  });

  test('Created program appears in programs list @owner', async ({ page }) => {
    await page.goto('/programs', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Check the E2E test program exists
    await expect(page.getByText('E2E Test Stamps').first()).toBeVisible({ timeout: 10000 });
  });

  test('Program detail page loads with QR @owner', async ({ page }) => {
    await page.goto('/programs', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Click "Ver detalles" on the E2E test card
    const detailBtn = page.locator('text=Ver detalles').first();
    await detailBtn.click();
    await page.waitForTimeout(3000);
    // Should be on /programs/{id}
    await expect(page).toHaveURL(/.*programs\/.+/);
    // QR image should be visible
    await expect(page.locator('#enrollment-qr-img')).toBeVisible({ timeout: 10000 });
  });

});

test.describe('Programs — MANAGER Read-Only @manager', () => {

  test('MANAGER sees programs list @manager', async ({ page }) => {
    await page.goto('/programs', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await expect(page.getByText('Programas de fidelización')).toBeVisible({ timeout: 10000 });
  });

  test('MANAGER does NOT see "Nuevo programa" button @manager', async ({ page }) => {
    await page.goto('/programs', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const btn = page.getByText('Nuevo programa');
    await expect(btn).toHaveCount(0);
  });

});
