/**
 * Suite 08 — Campaigns Wizard (OWNER-only)
 * Tests the full campaign creation wizard: channel selection,
 * audience selection with program/platform/segment sub-steps,
 * message composition, and submission.
 */
import { test, expect } from '@playwright/test';

test.describe('Campaigns Wizard — OWNER @owner @campaigns', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });
  });

  test('OWNER sees campaigns page', async ({ page }) => {
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('OWNER has "Campañas" in navigation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const navLink = page.locator('nav, aside').getByText('Campañas');
    await expect(navLink.first()).toBeVisible({ timeout: 10000 });
  });

  test('opens campaign wizard on click', async ({ page }) => {
    await page.getByRole('button', { name: /Nueva campaña/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Canal/i)).toBeVisible();
  });

  test('wizard step 1: channel selection', async ({ page }) => {
    await page.getByRole('button', { name: /Nueva campaña/i }).click();

    // Wallet channel should be selectable
    const walletBtn = page.locator('button').filter({ hasText: /Wallet/i }).first();
    await walletBtn.click();

    // Should show checkmark on selected channel
    await expect(walletBtn.locator('svg')).toBeVisible();

    // Continue to next step
    await page.getByRole('button', { name: /Continuar/i }).click();
    await expect(page.getByText(/Programa/i)).toBeVisible();
  });

  test('wizard step 2: program selection advances to platform', async ({ page }) => {
    await page.getByRole('button', { name: /Nueva campaña/i }).click();
    await page.locator('button').filter({ hasText: /Wallet/i }).first().click();
    await page.getByRole('button', { name: /Continuar/i }).click();

    // Select first program card
    const firstProgram = page.locator('button[class*="border-2"]').filter({ hasText: /inscritos/i }).first();
    await firstProgram.click();

    // Should advance to platform step for wallet
    await expect(page.getByText(/Plataforma/i)).toBeVisible();
  });

  test('wizard step 2: platform selection advances to segments', async ({ page }) => {
    await page.getByRole('button', { name: /Nueva campaña/i }).click();
    await page.locator('button').filter({ hasText: /Wallet/i }).first().click();
    await page.getByRole('button', { name: /Continuar/i }).click();

    // Select program
    await page.locator('button[class*="border-2"]').filter({ hasText: /inscritos/i }).first().click();

    // Select Apple platform
    const appleBtn = page.locator('button').filter({ hasText: /Apple Wallet/i }).first();
    await appleBtn.click();

    // Should advance to segment step
    await expect(page.getByText(/Segmento/i)).toBeVisible();
    await expect(page.getByText(/Todos/i).first()).toBeVisible();
  });

  test('wizard step 2: segment selection shows count', async ({ page }) => {
    await page.getByRole('button', { name: /Nueva campaña/i }).click();
    await page.locator('button').filter({ hasText: /Wallet/i }).first().click();
    await page.getByRole('button', { name: /Continuar/i }).click();
    await page.locator('button[class*="border-2"]').filter({ hasText: /inscritos/i }).first().click();
    await page.locator('button').filter({ hasText: /Apple Wallet/i }).first().click();

    // Click "Todos" segment
    const allSegment = page.locator('button').filter({ hasText: /Todos/i }).first();
    await allSegment.click();

    // Should show selected state
    await expect(allSegment.locator('svg')).toBeVisible();
  });

  test('wizard step 3: compose and submit wallet campaign', async ({ page }) => {
    await page.getByRole('button', { name: /Nueva campaña/i }).click();

    // Step 1: Select Wallet
    await page.locator('button').filter({ hasText: /Wallet/i }).first().click();
    await page.getByRole('button', { name: /Continuar/i }).click();

    // Step 2: Select program → platform → segment
    await page.locator('button[class*="border-2"]').filter({ hasText: /inscritos/i }).first().click();
    await page.locator('button').filter({ hasText: /Todas las plataformas/i }).first().click();
    await page.locator('button').filter({ hasText: /Todos/i }).first().click();
    await page.getByRole('button', { name: /Continuar/i }).click();

    // Step 3: Fill title and message
    await page.locator('input[placeholder*="título"], input[id*="title"]').first().fill('Test Campaign');
    await page.locator('textarea').first().fill('This is a test message');

    // Send
    await page.getByRole('button', { name: /Enviar ahora/i }).click();

    // Should show success toast or return to list
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
  });

  test('wizard: cancel closes modal', async ({ page }) => {
    await page.getByRole('button', { name: /Nueva campaña/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.locator('button[aria-label="Cancelar"], button').filter({ has: page.locator('svg') }).first().click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

});

test.describe('Campaigns — MANAGER Isolation @manager @campaigns', () => {
  test.use({ storageState: '.auth/manager.json' });

  test('MANAGER does NOT have "Campañas" in navigation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const navLink = page.locator('nav, aside').getByText('Campañas');
    await expect(navLink).toHaveCount(0);
  });
});
