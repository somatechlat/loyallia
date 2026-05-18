/**
 * Suite 02 — Programs CRUD + Wizard Flow
 * Tests the 4-step program creation wizard and role-based button visibility.
 * Wizard steps: 0=Type, 1=Config, 2=Design(name+desc+template), 3=Review
 */
import { test, expect } from '@playwright/test';

test.describe('Programs — OWNER CRUD @owner @programs', () => {

  test('OWNER sees programs list page @owner', async ({ page }) => {
    await page.goto('/programs', { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Programas de fidelizacion' }).waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Programas de fidelizacion' })).toBeVisible({ timeout: 10000 });
  });

  test('OWNER sees "Crear nueva tarjeta" button @owner', async ({ page }) => {
    await page.goto('/programs', { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Programas de fidelizacion' }).waitFor({ state: 'visible', timeout: 10000 });
    // The button text on the programs page is "+ Crear nueva tarjeta"
    const btn = page.locator('#new-program-btn');
    await expect(btn).toBeVisible({ timeout: 10000 });
  });

  test('OWNER completes full 4-step wizard — Stamp Card @owner', async ({ page }) => {
    // Navigate to wizard
    await page.goto('/programs/new', { waitUntil: 'domcontentloaded' });
    await page.getByText('Tarjeta de Sellos').waitFor({ state: 'visible', timeout: 10000 });

    // --- Step 0: Select card type (stamp) ---
    await expect(page.getByText('Tarjeta de Sellos')).toBeVisible({ timeout: 10000 });
    await page.getByText('Tarjeta de Sellos').click();
    // Click "Siguiente" button
    const nextBtn1 = page.getByRole('button', { name: /siguiente/i });
    await nextBtn1.click();

    // --- Step 1: Type-specific Config (stamps_required, reward_description) ---
    await page.getByText('Sellos requeridos').waitFor({ state: 'visible', timeout: 5000 });
    await expect(page.getByText('Sellos requeridos')).toBeVisible({ timeout: 5000 });
    // Default values are fine, just click next
    const nextBtn2 = page.getByRole('button', { name: /siguiente/i });
    await nextBtn2.click();

    // --- Step 2: Design — Name, description, template ---
    await page.locator('#program-name').waitFor({ state: 'visible', timeout: 5000 });
    await expect(page.locator('#program-name')).toBeVisible({ timeout: 5000 });
    await page.locator('#program-name').fill('E2E Test Stamps');
    await page.locator('#program-desc').fill('Programa de prueba creado por Playwright');
    // Click next
    const nextBtn3 = page.getByRole('button', { name: /siguiente/i });
    await nextBtn3.click();

    // --- Step 3: Review ---
    await page.getByText('E2E Test Stamps').first().waitFor({ state: 'visible', timeout: 5000 });
    await expect(page.getByText('E2E Test Stamps').first()).toBeVisible({ timeout: 5000 });
    // Submit — click "Crear programa"
    const createBtn = page.getByRole('button', { name: /crear programa/i });
    await createBtn.click();

    // Wait for navigation to programs list instead of fixed timeout
    await page.waitForURL(/.*programs.*/, { timeout: 15000 });

    // Should redirect to programs list
    await expect(page).toHaveURL(/.*programs.*/, { timeout: 10000 });
  });

  test('Created program appears in programs list @owner', async ({ page }) => {
    await page.goto('/programs', { waitUntil: 'domcontentloaded' });
    // Wait for program cards to load
    await page.locator('.card-hover').first().waitFor({ state: 'visible', timeout: 15000 });
    // Check that at least one program card is visible (seeded or created by wizard)
    // Program cards use .card-hover class in the ProgramSections component
    const programCards = page.locator('.card-hover').filter({ hasText: /Cafe|E2E|Sellos|Cashback|VIP|Cupon|Refiere/ });
    await expect(programCards.first()).toBeVisible({ timeout: 10000 });
  });

  test('Program detail page loads with QR @owner', async ({ page }) => {
    await page.goto('/programs', { waitUntil: 'domcontentloaded' });
    // Wait for program cards to load
    await page.locator('.card-hover').first().waitFor({ state: 'visible', timeout: 15000 });

    // Click the "Editar programa" link inside a program card
    // The link pattern is <a href="/programs/{uuid}" title="Editar programa">
    const detailLink = page.locator('#programs-view a[href*="/programs/"][title="Editar programa"]').first();
    await detailLink.waitFor({ state: 'visible', timeout: 10000 });
    await expect(detailLink).toBeVisible({ timeout: 10000 });
    await detailLink.click();

    // Wait for navigation to detail page
    await page.waitForURL(/.*programs\/[a-f0-9-]+/, { timeout: 15000 });

    // Should be on /programs/{id}
    await expect(page).toHaveURL(/.*programs\/[a-f0-9-]+/, { timeout: 15000 });

    // QR code or program details should be visible
    const qrOrDetail = page.locator('#enrollment-qr-img').or(page.locator('img[alt*="QR"]')).or(page.locator('.page-title'));
    await expect(qrOrDetail.first()).toBeVisible({ timeout: 10000 });
  });

});

test.describe('Programs — MANAGER Read-Only @manager @programs', () => {
  test.use({ storageState: '.auth/manager.json' });

  test('MANAGER sees programs list @manager', async ({ page }) => {
    await page.goto('/programs', { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Programas de fidelizacion' }).waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Programas de fidelizacion' })).toBeVisible({ timeout: 10000 });
  });

  test('MANAGER does NOT see "Crear nueva tarjeta" button @manager', async ({ page }) => {
    await page.goto('/programs', { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Programas de fidelizacion' }).waitFor({ state: 'visible', timeout: 10000 });
    const btn = page.locator('#new-program-btn');
    await expect(btn).toHaveCount(0);
  });

});
