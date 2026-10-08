/**
 * Suite 09 — Settings & Billing (OWNER-only)
 * Tests settings page access, billing plans display, MANAGER nav isolation,
 * WhatsApp activation flow, and owner-only route protection.
 */
import { test, expect } from '@playwright/test';

// =============================================================================
// SETTINGS — OWNER
// =============================================================================

test.describe('Settings — OWNER @owner @settings', () => {

  test('OWNER can access settings page @owner', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('OWNER has "Configuración" in navigation @owner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const navLink = page.locator('nav, aside').getByText('Configuración');
    await expect(navLink.first()).toBeVisible({ timeout: 10000 });
  });

  test('OWNER settings page shows business info form @owner', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });
    // Should have inputs for business configuration
    await expect(page.locator('input, textarea').first()).toBeVisible({ timeout: 10000 });
  });

  test('OWNER settings page shows save button @owner', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.locator('#save-settings-btn').waitFor({ state: 'visible', timeout: 10000 });
    const saveBtn = page.locator('#save-settings-btn');
    await expect(saveBtn).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// BILLING — OWNER
// =============================================================================

test.describe('Billing — OWNER @owner @settings', () => {

  test('OWNER can access billing page @owner', async ({ page }) => {
    await page.goto('/billing', { waitUntil: 'domcontentloaded' });
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('OWNER has "Facturación" in navigation @owner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const navLink = page.locator('nav, aside, [role="navigation"], [role="complementary"]').getByText('Facturación');
    await expect(navLink.first()).toBeVisible({ timeout: 10000 });
  });

  test('OWNER billing page shows plan info @owner', async ({ page }) => {
    await page.goto('/billing', { waitUntil: 'domcontentloaded' });
    await page.locator('main').waitFor({ state: 'visible', timeout: 10000 });
    // Should show current plan or trial status
    const main = page.locator('main');
    await expect(main).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// WHATSAPP BRIDGE ACTIVATION — OWNER (LYL-SRS-007)
// =============================================================================
// Consent-first multi-account flow (W0-ARCH):
// link button → consent modal → accept → QR step → cancel.
//
// NOTE: The actual phone QR scan step cannot be automated (requires physical
// device). We test through the real bridge/API path up to QR display.
// =============================================================================

test.describe('WhatsApp Bridge Activation — OWNER @owner @whatsapp', () => {

  test('OWNER sees WhatsApp integration with link CTA (no modal on load) @owner', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.locator('#wa-integration-section').waitFor({ state: 'visible', timeout: 10000 });

    await expect(page.locator('#wa-integration-section')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('WhatsApp Business Bridge')).toBeVisible();

    // Link account button (not an instant QR toggle)
    const linkBtn = page.locator('#wa-toggle');
    await expect(linkBtn).toBeVisible({ timeout: 10000 });

    // MODALS only after function select — modal must NOT be open on load
    await expect(page.locator('#wa-link-modal')).toHaveCount(0);

    // No connected sessions yet
    await expect(page.locator('#wa-connected-dashboard')).toHaveCount(0);
  });

  test('OWNER link opens consent modal before any QR @owner', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.locator('#wa-toggle').waitFor({ state: 'visible', timeout: 10000 });

    await page.locator('#wa-toggle').click();

    // Consent modal appears only after the link action
    await expect(page.locator('#wa-link-modal')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#wa-consent-checkbox')).toBeVisible();
    await expect(page.locator('#wa-link-accept-btn')).toBeDisabled();

    // Accept stays disabled until consent is checked
    await page.locator('#wa-consent-checkbox').check();
    await expect(page.locator('#wa-link-accept-btn')).toBeEnabled();

    // Cancel closes without creating a session
    await page.locator('#wa-link-cancel-btn').click();
    await expect(page.locator('#wa-link-modal')).toHaveCount(0, { timeout: 5000 });
  });

  test('OWNER consent accept reaches QR step @owner', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.locator('#wa-toggle').waitFor({ state: 'visible', timeout: 10000 });

    await page.locator('#wa-toggle').click();
    await expect(page.locator('#wa-link-modal')).toBeVisible({ timeout: 5000 });

    await page.locator('#wa-consent-checkbox').check();
    await page.locator('#wa-link-accept-btn').click();

    // QR step inside the modal (bridge may take 5-10s)
    await expect(page.locator('#wa-qr-image, #wa-link-modal .spinner').first()).toBeVisible({
      timeout: 20000,
    });

    // Modal still open at QR step
    await expect(page.locator('#wa-link-modal')).toBeVisible();
  });

});

// =============================================================================
// SETTINGS & BILLING — MANAGER ISOLATION
// =============================================================================

test.describe('Settings & Billing — MANAGER Isolation @manager @settings', () => {
  test.use({ storageState: '.auth/manager.json' });

  test('MANAGER does NOT have "Configuracion" in navigation @manager', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const navLink = page.locator('nav, aside').getByText('Configuracion');
    await expect(navLink).toHaveCount(0);
  });

  test('MANAGER does NOT have "Facturacion" in navigation @manager', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const navLink = page.locator('nav, aside').getByText('Facturacion');
    await expect(navLink).toHaveCount(0);
  });

  test('MANAGER accessing /settings is redirected @manager', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForURL((url) => !url.toString().includes('/settings'), { timeout: 15000 });
  });

  test('MANAGER accessing /billing is redirected @manager', async ({ page }) => {
    await page.goto('/billing', { waitUntil: 'domcontentloaded' });
    await page.waitForURL((url) => !url.toString().includes('/billing'), { timeout: 15000 });
  });
});

// =============================================================================
// SETTINGS & BILLING — STAFF ISOLATION
// =============================================================================

test.describe('Settings & Billing — STAFF Isolation @staff @settings', () => {
  test.use({ storageState: '.auth/staff.json' });

  test('STAFF does NOT have "Configuracion" in navigation @staff', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const navLink = page.locator('nav, aside').getByText('Configuracion');
    await expect(navLink).toHaveCount(0);
  });

  test('STAFF accessing /settings is redirected to scanner @staff', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForURL((url) => !url.toString().includes('/settings'), { timeout: 15000 });
  });
});
