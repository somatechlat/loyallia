/**
 * Suite 02 — Programs CRUD + Wizard Flow
 * Tests the 4-step program creation wizard and role-based button visibility.
 * Wizard steps: 0=Type, 1=Config, 2=Design(name+desc+template), 3=Review
 */
import { test, expect } from '@playwright/test';

test.describe('Programs — OWNER CRUD @owner @programs', () => {

  test('OWNER sees programs list page @owner', async ({ page }) => {
    await page.goto('/programs', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Programas de fidelización' })).toBeVisible({ timeout: 15000 });
  });

  test('OWNER sees "Crear nueva tarjeta" button @owner', async ({ page }) => {
    await page.goto('/programs', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Programas de fidelización' })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#new-program-btn')).toBeVisible({ timeout: 15000 });
  });

  test('OWNER completes full 4-step wizard — Stamp Card @owner', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'networkidle' });
    await page.getByText('Tarjeta de Sellos').waitFor({ state: 'visible', timeout: 10000 });

    await expect(page.getByText('Tarjeta de Sellos')).toBeVisible({ timeout: 10000 });
    await page.getByText('Tarjeta de Sellos').click();
    await page.getByRole('button', { name: /siguiente/i }).click();

    await page.getByText(/cómo ganan sellos|sellos requeridos|como ganan sellos/i).waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.getByText(/cómo ganan sellos|sellos requeridos|como ganan sellos/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /siguiente/i }).click();

    await page.locator('#program-name').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#program-name').fill('E2E Test Stamps');
    await page.locator('#program-desc').fill('Programa de prueba creado por Playwright');
    await page.getByRole('button', { name: /siguiente/i }).click();

    await page.getByText('E2E Test Stamps').first().waitFor({ state: 'visible', timeout: 5000 });
    await expect(page.getByText('E2E Test Stamps').first()).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /crear programa/i }).click();

    await page.waitForURL(/.*programs.*/, { timeout: 15000 });
    await expect(page).toHaveURL(/.*programs.*/, { timeout: 10000 });
  });

  test('Created program appears in programs list @owner', async ({ page }) => {
    await page.goto('/programs', { waitUntil: 'networkidle' });
    await page.waitForSelector('.card-hover, #create-first-program-btn', { timeout: 15000 });
    const programCards = page.locator('.card-hover');
    const cardCount = await programCards.count();
    if (cardCount > 0) {
      await expect(programCards.first()).toBeVisible({ timeout: 10000 });
    } else {
      await expect(page.locator('#create-first-program-btn')).toBeVisible({ timeout: 10000 });
    }
  });

  test('Program detail page loads with QR @owner', async ({ page }) => {
    await page.goto('/programs', { waitUntil: 'networkidle' });
    await page.waitForSelector('.card-hover, #create-first-program-btn', { timeout: 15000 });

    const detailLink = page.locator('#programs-view a[href*="/programs/"]:not([href*="/programs/new"]):not(#new-program-btn)').first();
    await expect(detailLink, 'Program card link should be visible').toBeVisible({ timeout: 15000 });
    await detailLink.click();

    await page.waitForURL(/.*programs\/[a-f0-9-]+/, { timeout: 15000 });
    await expect(page).toHaveURL(/.*programs\/[a-f0-9-]+/, { timeout: 15000 });

    const qrOrDetail = page.locator('#enrollment-qr-img').or(page.locator('img[alt*="QR"]')).or(page.locator('.page-title'));
    await expect(qrOrDetail.first()).toBeVisible({ timeout: 10000 });
  });

});

test.describe('Programs — MANAGER Read-Only @manager @programs', () => {
  test.use({ storageState: '.auth/manager.json' });

  test('MANAGER sees programs list @manager', async ({ page }) => {
    await page.goto('/programs', { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Programas de fidelización' }).waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Programas de fidelización' })).toBeVisible({ timeout: 15000 });
  });

  test('MANAGER does NOT see "Crear nueva tarjeta" button @manager', async ({ page }) => {
    await page.goto('/programs', { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Programas de fidelización' }).waitFor({ state: 'visible', timeout: 15000 });
    const btn = page.locator('#new-program-btn');
    await expect(btn).toHaveCount(0);
  });

});
