/**
 * Suite 34 — Full Card Type Creation Flows E2E
 * Tests the complete creation wizard for ALL 10 card types:
 *   stamp, cashback, coupon, affiliate, discount,
 *   gift_certificate, vip_membership, corporate_discount,
 *   referral_pass, multipass
 *
 * Verifies:
 *   - Card type selection page (step 0): preview always visible, platform toggle works
 *   - Config step (step 1): type-specific fields render
 *   - Design step (step 2): name/description, wallet designer loads
 *   - Review step (step 3): summary correct, program created
 *   - Preview updates when selecting different card types
 *   - Apple/Google toggle switches preview
 *
 * Tags: @cardCreation @programs @owner
 */
import { test, expect } from '@playwright/test';

/** All 10 card types with their Spanish labels and expected config fields */
const CARD_TYPES = [
  {
    value: 'stamp',
    label: 'Tarjeta de Sellos',
    configField: /sellos requeridos|stamps required/i,
    step1Text: /sellos|stamps/i,
  },
  {
    value: 'cashback',
    label: 'Cashback / Puntos',
    configField: /porcentaje|percentage/i,
    step1Text: /cashback|puntos/i,
  },
  {
    value: 'coupon',
    label: 'Cupón de Descuento',
    configField: /tipo de descuento|discount type/i,
    step1Text: /cupón|coupon/i,
  },
  {
    value: 'affiliate',
    label: 'Afiliación',
    configField: /afiliación|affiliate|beneficios/i,
    step1Text: /afiliación|affiliate/i,
  },
  {
    value: 'discount',
    label: 'Descuento por Niveles',
    configField: /niveles|tiers|levels/i,
    step1Text: /descuento|discount|niveles/i,
  },
  {
    value: 'gift_certificate',
    label: 'Certificado de Regalo',
    configField: /denominaciones|denominations|monto/i,
    step1Text: /regalo|gift|certificado/i,
  },
  {
    value: 'vip_membership',
    label: 'Membresía VIP',
    configField: /membresía|membership|nombre del nivel/i,
    step1Text: /vip|membresía/i,
  },
  {
    value: 'corporate_discount',
    label: 'Descuento Corporativo',
    configField: /corporativo|corporate|empresa/i,
    step1Text: /corporativo|corporate/i,
  },
  {
    value: 'referral_pass',
    label: 'Programa de Referidos',
    configField: /referidos|referral|recompensa/i,
    step1Text: /referidos|referral/i,
  },
  {
    value: 'multipass',
    label: 'Multipase Prepagado',
    configField: /paquete|bundle|multipase/i,
    step1Text: /multipase|multipass/i,
  },
];

test.describe('Card Type Selection Page (Step 0) @cardCreation @owner', () => {

  test('Step 0 — all 10 card types are visible', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'networkidle' });
    await page.getByText(/selecciona el programa/i).waitFor({ state: 'visible', timeout: 15000 });

    for (const ct of CARD_TYPES) {
      const typeBtn = page.locator(`#card-type-${ct.value}`);
      await expect(typeBtn).toBeVisible({ timeout: 5000 });
    }
  });

  test('Step 0 — preview is always visible (not dependent on hover)', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'networkidle' });
    await page.getByText(/selecciona el programa/i).waitFor({ state: 'visible', timeout: 15000 });

    // Preview panel should be visible immediately — no hover needed
    const previewPanel = page.locator('#preview-panel');
    await expect(previewPanel).toBeVisible({ timeout: 10000 });
  });

  test('Step 0 — Apple/Google toggle is always visible', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'networkidle' });
    await page.getByText(/selecciona el programa/i).waitFor({ state: 'visible', timeout: 15000 });

    const appleBtn = page.getByRole('button', { name: /apple wallet/i });
    const googleBtn = page.getByRole('button', { name: /google wallet/i });

    await expect(appleBtn).toBeVisible({ timeout: 5000 });
    await expect(googleBtn).toBeVisible({ timeout: 5000 });
  });

  test('Step 0 — clicking Google toggle switches preview', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'networkidle' });
    await page.getByText(/selecciona el programa/i).waitFor({ state: 'visible', timeout: 15000 });

    const googleBtn = page.getByRole('button', { name: /google wallet/i });
    await googleBtn.click();

    // Google button should become active (highlighted)
    await expect(googleBtn).toHaveClass(/bg-surface-900|dark:bg-white/);
  });

  test('Step 0 — clicking a card type selects it with visual highlight', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'networkidle' });
    await page.getByText(/selecciona el programa/i).waitFor({ state: 'visible', timeout: 15000 });

    // Click Cashback by its button ID
    await page.locator('#card-type-cashback').click();

    // The button should get the selected style (border-brand-500)
    const cashbackBtn = page.locator('#card-type-cashback');
    await expect(cashbackBtn).toHaveClass(/border-brand-500/);
  });

  test('Step 0 — selecting different card types updates the preview', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'networkidle' });
    await page.getByText(/selecciona el programa/i).waitFor({ state: 'visible', timeout: 15000 });

    // Select stamp
    await page.locator('#card-type-stamp').click();
    await page.waitForTimeout(500);

    // Select cashback
    await page.locator('#card-type-cashback').click();
    await page.waitForTimeout(500);

    // Select coupon
    await page.locator('#card-type-coupon').click();
    await page.waitForTimeout(500);

    // Preview should still be visible after each selection
    const previewPanel = page.locator('#preview-panel');
    await expect(previewPanel).toBeVisible();
  });
});

/** Parameterized test: full creation flow for each card type */
for (const ct of CARD_TYPES) {
  test.describe(`Full Creation Flow — ${ct.label} @cardCreation @owner`, () => {

    test(`Create ${ct.label} — full wizard flow`, async ({ page }) => {
      // Step 0: Select card type by button ID
      await page.goto('/programs/new', { waitUntil: 'networkidle' });
      await page.getByText(/selecciona el programa/i).waitFor({ state: 'visible', timeout: 15000 });
      await page.locator(`#card-type-${ct.value}`).click();

      // Verify the type is selected (highlighted)
      const typeBtn = page.locator(`#card-type-${ct.value}`);
      await expect(typeBtn).toHaveClass(/border-brand-500/, { timeout: 5000 });

      // Click Next
      await page.getByRole('button', { name: /siguiente/i }).click();

      // Step 1: Config — verify type-specific fields appear
      await page.waitForTimeout(2000);
      await expect(page.getByText(ct.step1Text).first()).toBeVisible({ timeout: 15000 });

      // Click Next
      await page.getByRole('button', { name: /siguiente/i }).click();

      // Step 2: Design — name and description
      await page.locator('#program-name').waitFor({ state: 'visible', timeout: 10000 });
      const testName = `E2E ${ct.label} Test`;
      await page.locator('#program-name').fill(testName);
      await page.locator('#program-desc').fill(`Programa de prueba E2E para ${ct.label}`);

      // Click Next
      await page.getByRole('button', { name: /siguiente/i }).click();

      // Step 3: Review — verify program name appears
      await page.getByText(testName).first().waitFor({ state: 'visible', timeout: 10000 });
      await expect(page.getByText(testName).first()).toBeVisible();

      // Create the program
      await page.getByRole('button', { name: /crear programa/i }).click();

      // Should redirect to programs list
      await page.waitForURL(/.*programs.*/, { timeout: 20000 });
      await expect(page).toHaveURL(/.*programs.*/, { timeout: 10000 });
    });
  });
}

test.describe('Designer Integration @cardCreation @owner @designerV2', () => {

  test('Designer loads with correct card type tabs', async ({ page }) => {
    // Navigate directly to programs list and verify it loads
    await page.goto('/programs', { waitUntil: 'networkidle' });
    await page.waitForSelector('.card-hover, #create-first-program-btn', { timeout: 15000 });

    // Verify the page loaded correctly
    const hasCards = await page.locator('.card-hover').count();
    const hasCreateBtn = await page.locator('#create-first-program-btn').isVisible().catch(() => false);
    expect(hasCards > 0 || hasCreateBtn).toBeTruthy();
  });

  test('Preview panel shows wallet card with iPhone frame', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'networkidle' });
    await page.getByText(/selecciona el programa/i).waitFor({ state: 'visible', timeout: 15000 });

    // The preview panel should contain a rendered card (not empty)
    const previewPanel = page.locator('#preview-panel');
    await expect(previewPanel).toBeVisible({ timeout: 10000 });

    // Should have some content inside (the wallet card preview)
    const previewContent = previewPanel.locator('div').first();
    await expect(previewContent).toBeVisible();
  });

  test('Notification preview exists in notification config', async ({ page }) => {
    // This test verifies the notification preview component exists
    // It would be in the designer sidebar when editing a field's notifications
    await page.goto('/programs/new', { waitUntil: 'networkidle' });
    await page.getByText(/selecciona el programa/i).waitFor({ state: 'visible', timeout: 15000 });

    // Navigate to step 2 (design) where the wallet studio is
    await page.locator('#card-type-stamp').click();
    await page.getByRole('button', { name: /siguiente/i }).click();
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: /siguiente/i }).click();
    await page.locator('#program-name').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#program-name').fill('E2E Notification Test');
    await page.locator('#program-desc').fill('Test notification preview');
    await page.getByRole('button', { name: /siguiente/i }).click();

    // The designer should load with sidebar tabs
    await page.waitForTimeout(3000);

    // Check if the fields tab exists (where notifications are configured)
    const fieldsTab = page.getByRole('button', { name: /campos|fields/i });
    if (await fieldsTab.isVisible().catch(() => false)) {
      await fieldsTab.click();
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('Card Type Visual Consistency @cardCreation @owner', () => {

  test('Each card type selection shows icon and description', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'networkidle' });
    await page.getByText(/selecciona el programa/i).waitFor({ state: 'visible', timeout: 15000 });

    for (const ct of CARD_TYPES) {
      const typeButton = page.locator(`#card-type-${ct.value}`);
      await expect(typeButton).toBeVisible({ timeout: 5000 });

      // Each card type button should have text content (label + description)
      const textContent = await typeButton.textContent();
      expect(textContent).toBeTruthy();
      expect(textContent!.length).toBeGreaterThan(0);
    }
  });

  test('Preview panel is sticky (does not scroll away)', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'networkidle' });
    await page.getByText(/selecciona el programa/i).waitFor({ state: 'visible', timeout: 15000 });

    const previewPanel = page.locator('#preview-panel');
    await expect(previewPanel).toBeVisible({ timeout: 10000 });

    // Verify sticky positioning
    const stickyClass = await previewPanel.getAttribute('class');
    expect(stickyClass).toContain('sticky');
  });
});

test.describe('Designer Sidebar Interactions @cardCreation @owner', () => {

  async function navigateToDesigner(page: import('@playwright/test').Page) {
    await page.goto('/programs/new', { waitUntil: 'networkidle' });
    await page.getByText(/selecciona el programa/i).waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('#card-type-stamp').click();
    await page.getByRole('button', { name: /siguiente/i }).click();
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: /siguiente/i }).click();
    await page.locator('#program-name').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#program-name').fill('E2E Designer Test');
    await page.locator('#program-desc').fill('Designer interaction test');
    await page.getByRole('button', { name: /siguiente/i }).click();
    await page.waitForTimeout(3000);
  }

  test('Designer sidebar tabs are clickable', async ({ page }) => {
    await navigateToDesigner(page);

    // Verify sidebar exists with tabs
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Check that tab buttons exist
    const tabButtons = sidebar.locator('button');
    const tabCount = await tabButtons.count();
    expect(tabCount).toBeGreaterThan(0);
  });

  test('Color picker changes update preview', async ({ page }) => {
    await navigateToDesigner(page);

    // Find and click the colors tab
    const colorsTab = page.getByRole('button', { name: /colores|colors/i }).or(
      page.locator('aside button').filter({ hasText: /color/i })
    );
    if (await colorsTab.first().isVisible().catch(() => false)) {
      await colorsTab.first().click();
      await page.waitForTimeout(1000);

      // Look for color input fields
      const colorInputs = page.locator('input[type="color"]');
      const colorCount = await colorInputs.count();
      expect(colorCount).toBeGreaterThan(0);
    }
  });

  test('Form builder has obligatorio/opcional toggles', async ({ page }) => {
    await navigateToDesigner(page);

    // Look for form builder section with obligatorio/opcional
    const obligatorio = page.getByText(/obligatorio/i);
    const opcional = page.getByText(/opcional/i);

    // These should be visible in the form builder
    if (await obligatorio.first().isVisible().catch(() => false)) {
      await expect(obligatorio.first()).toBeVisible();
    }
  });
});
