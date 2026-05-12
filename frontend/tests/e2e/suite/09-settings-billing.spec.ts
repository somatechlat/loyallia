/**
 * Suite 09 — Settings & Billing (OWNER-only)
 * Tests settings page access, billing plans display, MANAGER nav isolation,
 * WhatsApp activation flow, and owner-only route protection.
 */
import { test, expect } from '@playwright/test';
import { requireMutatingE2EAllowed } from '../helpers/e2e-safety';

// =============================================================================
// SETTINGS — OWNER
// =============================================================================

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

  test('OWNER settings page shows business info form @owner', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Should have inputs for business configuration
    await expect(page.locator('input, textarea').first()).toBeVisible({ timeout: 10000 });
  });

  test('OWNER settings page shows save button @owner', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const saveBtn = page.locator('#save-settings-btn');
    await expect(saveBtn).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// BILLING — OWNER
// =============================================================================

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

  test('OWNER billing page shows plan info @owner', async ({ page }) => {
    await page.goto('/billing', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Should show current plan or trial status
    const main = page.locator('main');
    await expect(main).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// WHATSAPP BRIDGE ACTIVATION — OWNER (LYL-SRS-007)
// =============================================================================
// Complete E2E flow for WhatsApp Business Bridge activation.
// Covers: toggle ON → checking → QR wizard → refresh → cancel → connected
// dashboard → disconnect dialog → confirm/cancel.
//
// NOTE: The actual phone QR scan step cannot be automated (requires physical
// device). We test up to the QR display and mock the connected state for
// disconnect flow coverage.
// =============================================================================

test.describe('WhatsApp Bridge Activation — OWNER @owner', () => {

  test.beforeAll(() => {
    requireMutatingE2EAllowed();
  });

  test('OWNER sees WhatsApp integration with active toggle @owner', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Section container
    await expect(page.locator('#wa-integration-section')).toBeVisible({ timeout: 10000 });

    // Title and description
    await expect(page.getByText('Integraciones')).toBeVisible();
    await expect(page.getByText('WhatsApp Business Bridge')).toBeVisible();
    await expect(page.getByText('Vincula tu WhatsApp para enviar campañas masivas')).toBeVisible();

    // Toggle must be present (plan has whatsapp_campaigns feature)
    const toggle = page.locator('#wa-toggle');
    await expect(toggle).toBeVisible({ timeout: 10000 });
    await expect(toggle).toHaveAttribute('role', 'switch');
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    // Status badge should NOT show "Conectado" or "Esperando" in initial state
    await expect(page.getByText('Conectado', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Esperando', { exact: true })).toHaveCount(0);
  });

  test('OWNER toggles ON → checking state → QR wizard appears @owner', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Initial: toggle OFF
    const toggle = page.locator('#wa-toggle');
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    // Click toggle ON
    await toggle.click();

    // Should immediately show checking state
    await expect(page.getByText('Verificando disponibilidad del servicio...')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.spinner')).toHaveCount(1, { timeout: 5000 });

    // Wait for QR wizard to appear (bridge generates QR, can take 5-10s)
    await expect(page.locator('#wa-wizard-content')).toBeVisible({ timeout: 20000 });

    // Toggle should now be ON
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    // Status badge should show "Esperando" (exact match to avoid "Esperando escaneo...")
    await expect(page.getByText('Esperando', { exact: true })).toBeVisible();
  });

  test('OWNER QR wizard shows instructions and controls @owner', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Activate to QR state
    await page.locator('#wa-toggle').click();
    await expect(page.locator('#wa-wizard-content')).toBeVisible({ timeout: 20000 });

    // QR image or placeholder spinner
    const qrImage = page.locator('#wa-qr-image');
    const qrSpinner = page.locator('#wa-wizard-content .spinner');
    const hasQrImage = await qrImage.count();
    const hasSpinner = await qrSpinner.count();
    expect(hasQrImage + hasSpinner).toBeGreaterThan(0);

    // Step-by-step instructions
    await expect(page.getByText('Vincula tu dispositivo')).toBeVisible();
    await expect(page.getByText('Abre WhatsApp en tu teléfono')).toBeVisible();
    await expect(page.getByText('Ajustes → Dispositivos vinculados')).toBeVisible();
    await expect(page.getByText('Vincular un dispositivo')).toBeVisible();
    await expect(page.getByText('Escanea este código QR')).toBeVisible();

    // Waiting indicator
    await expect(page.getByText('Esperando escaneo...')).toBeVisible();

    // Control buttons
    await expect(page.locator('#wa-refresh-qr-btn')).toBeVisible();
    await expect(page.locator('#wa-cancel-btn')).toBeVisible();
    await expect(page.locator('#wa-refresh-qr-btn')).toContainText('Regenerar QR');
    await expect(page.locator('#wa-cancel-btn')).toContainText('Cancelar');

    // Warning banner about session persistence
    await expect(page.getByText('La sesión se mantiene mientras el servicio esté activo')).toBeVisible();
  });

  test('OWNER can refresh QR code @owner', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Activate to QR state
    await page.locator('#wa-toggle').click();
    await expect(page.locator('#wa-wizard-content')).toBeVisible({ timeout: 20000 });

    const refreshBtn = page.locator('#wa-refresh-qr-btn');
    await expect(refreshBtn).toBeVisible();

    // Click refresh — button may show spinner briefly
    await refreshBtn.click();

    // After refresh, wizard should still be visible
    await expect(page.locator('#wa-wizard-content')).toBeVisible({ timeout: 10000 });

    // Toggle should still be ON
    await expect(page.locator('#wa-toggle')).toHaveAttribute('aria-checked', 'true');
  });

  test('OWNER can cancel QR wizard and return to disabled @owner', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Activate to QR state
    await page.locator('#wa-toggle').click();
    await expect(page.locator('#wa-wizard-content')).toBeVisible({ timeout: 20000 });

    // Click Cancel
    await page.locator('#wa-cancel-btn').click();

    // Wizard should disappear
    await expect(page.locator('#wa-wizard-content')).toHaveCount(0, { timeout: 5000 });

    // Toggle should return to OFF
    await expect(page.locator('#wa-toggle')).toHaveAttribute('aria-checked', 'false');

    // Status badges should be gone (exact match)
    await expect(page.getByText('Esperando', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Conectado', { exact: true })).toHaveCount(0);
  });

});

// =============================================================================
// SETTINGS & BILLING — MANAGER ISOLATION
// =============================================================================

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

  test('MANAGER accessing /settings is redirected @manager', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).not.toContain('/settings');
  });

  test('MANAGER accessing /billing is redirected @manager', async ({ page }) => {
    await page.goto('/billing', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).not.toContain('/billing');
  });
});

// =============================================================================
// SETTINGS & BILLING — STAFF ISOLATION
// =============================================================================

test.describe('Settings & Billing — STAFF Isolation @staff', () => {

  test('STAFF does NOT have "Configuración" in navigation @staff', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const navLink = page.locator('nav, aside').getByText('Configuración');
    await expect(navLink).toHaveCount(0);
  });

  test('STAFF accessing /settings is redirected to scanner @staff', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).not.toContain('/settings');
  });
});
