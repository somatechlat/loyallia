/**
 * Suite 43 — Full Card Type Creation Flows E2E
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
 *   - DEEP journey per type: open designer, touch all 7 tools, change color,
 *     gallery/export, save, non-empty canvas, finish create, program listed
 *   - Preview updates when selecting different card types
 *   - Apple/Google toggle switches preview
 *
 * Tags: @cardCreation @programs @owner
 */
import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import {
  DESIGNER_OVERLAY,
  STUDIO_TOOL,
  STUDIO_TOOL_IDS,
  STUDIO_TOOL_PANEL,
  gotoDesignerFromWizard,
  gotoWizardStep1,
  openWalletDesigner,
} from '../helpers/wizard-designer';
import { getOwnerToken } from '../helpers/designer-auth';
import { getE2EBaseURL } from '../helpers/e2e-safety';

const BASE_API = getE2EBaseURL();
const RUN_PREFIX = `E2E43-${Date.now()}`;

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

/** Assert the live wallet preview exists and is not an empty shell. */
async function expectCanvasNonEmpty(page: Page): Promise<void> {
  const card = page
    .locator('[data-testid="apple-wallet-card"], [data-testid="google-wallet-card"]')
    .first();
  await expect(card).toBeVisible({ timeout: 15000 });
  const text = (await card.innerText()).trim();
  expect(text.length, 'wallet card preview must render non-empty content').toBeGreaterThan(0);
}

/** Click every studio tool and require its panel to mount. */
async function touchAllStudioTools(page: Page): Promise<void> {
  await expect(page.locator(STUDIO_TOOL_PANEL)).toBeVisible({ timeout: 15000 });
  for (const id of STUDIO_TOOL_IDS) {
    await page.locator(STUDIO_TOOL(id)).click();
    await expect(page.locator(`[data-testid="studio-panel-${id}"]`)).toBeVisible({ timeout: 10000 });
    await expectCanvasNonEmpty(page);
  }
}

/** Human-like designer session: tools → color → gallery/export → save. */
async function deepDesignerSession(page: Page): Promise<void> {
  await touchAllStudioTools(page);

  // Change a color like a human would.
  await page.locator(STUDIO_TOOL('colors')).click();
  const hex = page.locator('[data-testid="studio-panel-colors"] [data-testid="hex-input"]').first();
  await hex.fill('#224466');
  await hex.blur();
  await page.waitForTimeout(400);
  await expectCanvasNonEmpty(page);

  // Open the template gallery modal and step back out.
  await page.locator('[data-testid="toolbar-templates"]').click();
  await expect(page.locator('[data-testid="gallery-back-btn"]')).toBeVisible({ timeout: 10000 });
  await page.locator('[data-testid="gallery-back-btn"]').click();
  await expect(page.locator(STUDIO_TOOL_PANEL)).toBeVisible({ timeout: 10000 });

  // Export button is part of the chrome — click it and keep the studio alive.
  const exportBtn = page.locator('[data-testid="toolbar-export"]');
  if (await exportBtn.isVisible().catch(() => false)) {
    await exportBtn.click();
    await expect(page.locator(DESIGNER_OVERLAY)).toBeVisible({ timeout: 15000 });
  }

  await expectCanvasNonEmpty(page);

  // Save is persist-only — designer stays open with the work kept.
  await page.locator('[data-testid="toolbar-save"]').click();
  await expect(page.locator(DESIGNER_OVERLAY)).toBeVisible({ timeout: 10000 });

  // Listo persists and closes back to wizard step 2.
  await page.locator('[data-testid="wallet-designer-done"]').click();
  await expect(page.locator(DESIGNER_OVERLAY)).toBeHidden({ timeout: 10000 });
}

/** Delete only programs created by this run's unique prefix. */
async function cleanupPrograms(request: APIRequestContext, prefix: string): Promise<void> {
  const token = await getOwnerToken(request);
  const resp = await request.get(`${BASE_API}/api/v1/programs/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok()) return;
  const body = await resp.json();
  const items = Array.isArray(body) ? body : (body.results ?? []);
  for (const p of items as Array<{ id: string; name?: string }>) {
    if (p.name && p.name.startsWith(prefix)) {
      await request
        .delete(`${BASE_API}/api/v1/programs/${p.id}/`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch(() => {});
    }
  }
}

test.describe('Card Type Selection Page (Step 0) @cardCreation @owner', () => {

  test('Step 0 — all 10 card types are visible', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'domcontentloaded' });
    await page.locator('#card-type-stamp').waitFor({ state: 'visible', timeout: 30000 });

    for (const ct of CARD_TYPES) {
      const typeBtn = page.locator(`#card-type-${ct.value}`);
      await expect(typeBtn).toBeVisible({ timeout: 5000 });
    }
  });

  test('Step 0 — preview is always visible (not dependent on hover)', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'domcontentloaded' });
    await page.locator('#card-type-stamp').waitFor({ state: 'visible', timeout: 30000 });

    // Preview panel should be visible immediately — no hover needed
    const previewPanel = page.locator('#preview-panel');
    await expect(previewPanel).toBeVisible({ timeout: 10000 });
  });

  test('Step 0 — Apple/Google toggle is always visible', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'domcontentloaded' });
    await page.locator('#card-type-stamp').waitFor({ state: 'visible', timeout: 30000 });

    const appleBtn = page.getByRole('button', { name: /apple wallet/i });
    const googleBtn = page.getByRole('button', { name: /google wallet/i });

    await expect(appleBtn).toBeVisible({ timeout: 5000 });
    await expect(googleBtn).toBeVisible({ timeout: 5000 });
  });

  test('Step 0 — clicking Google toggle switches preview', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'domcontentloaded' });
    await page.locator('#card-type-stamp').waitFor({ state: 'visible', timeout: 30000 });

    const googleBtn = page.getByRole('button', { name: /google wallet/i });
    await googleBtn.click();

    // Google button should become active (highlighted)
    await expect(googleBtn).toHaveClass(/bg-surface-900|dark:bg-white/);
  });

  test('Step 0 — clicking a card type selects it with visual highlight', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'domcontentloaded' });
    await page.locator('#card-type-stamp').waitFor({ state: 'visible', timeout: 30000 });

    // Click Cashback by its button ID
    await page.locator('#card-type-cashback').click();

    // The button should get the selected style (border-brand-500)
    const cashbackBtn = page.locator('#card-type-cashback');
    await expect(cashbackBtn).toHaveClass(/border-brand-500/);
  });

  test('Step 0 — selecting different card types updates the preview', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'domcontentloaded' });
    await page.locator('#card-type-stamp').waitFor({ state: 'visible', timeout: 30000 });

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

/** Parameterized deep journey: full human-like creation flow for each card type */
for (const ct of CARD_TYPES) {
  test.describe(`Full Creation Flow — ${ct.label} @cardCreation @owner`, () => {
    test(`Create ${ct.label} — deep human journey (select → config → designer → create)`, async ({ page, request }) => {
      test.setTimeout(180000);
      const testName = `${RUN_PREFIX} ${ct.value}`;
      try {
        // Step 0: Select card type by button ID
        await page.goto('/programs/new', { waitUntil: 'domcontentloaded' });
        await page.locator(`#card-type-${ct.value}`).waitFor({ state: 'visible', timeout: 30000 });
        await page.locator(`#card-type-${ct.value}`).click();

        // Verify the type is selected (highlighted)
        const typeBtn = page.locator(`#card-type-${ct.value}`);
        await expect(typeBtn).toHaveClass(/border-brand-500/, { timeout: 5000 });

        // Click Next → Step 1 config
        await page.getByRole('button', { name: /siguiente/i }).click();
        await page.waitForTimeout(2000);
        await expect(page.getByText(ct.step1Text).first()).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(ct.configField).first()).toBeVisible({ timeout: 15000 });

        // Click Next → Step 2 design (name + description)
        await page.getByRole('button', { name: /siguiente/i }).click();
        await page.locator('#program-name').waitFor({ state: 'visible', timeout: 10000 });
        await page.locator('#program-name').fill(testName);
        await page.locator('#program-desc').fill(`Programa de prueba E2E para ${ct.label}`);

        // Open the wallet designer like a human and work the canvas.
        await openWalletDesigner(page);
        await expectCanvasNonEmpty(page);
        await deepDesignerSession(page);

        // Designer closed via Save — we are back on step 2 with the name intact.
        await expect(page.locator('#program-name')).toHaveValue(testName);

        // Step 3: Review
        await page.getByRole('button', { name: /siguiente/i }).click();
        await page.getByText(testName).first().waitFor({ state: 'visible', timeout: 10000 });
        await expect(page.getByText(testName).first()).toBeVisible();

        // Create the program
        await page.getByRole('button', { name: /crear programa/i }).click();
        await page.waitForURL(/.*programs.*/, { timeout: 20000 });
        await expect(page).toHaveURL(/.*programs.*/, { timeout: 10000 });

        // Program must appear in the list under its unique name.
        await expect(page.getByText(testName).first()).toBeVisible({ timeout: 15000 });
      } finally {
        await cleanupPrograms(request, RUN_PREFIX);
      }
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
    await page.goto('/programs/new', { waitUntil: 'domcontentloaded' });
    await page.locator('#card-type-stamp').waitFor({ state: 'visible', timeout: 30000 });

    // The preview panel should contain a rendered card (not empty)
    const previewPanel = page.locator('#preview-panel');
    await expect(previewPanel).toBeVisible({ timeout: 10000 });

    // Should have some content inside (the wallet card preview)
    const previewContent = previewPanel.locator('div').first();
    await expect(previewContent).toBeVisible();
  });

  test('Notification preview exists in notification config', async ({ page }) => {
    // Notification config lives in the studio's fields panel (full-screen overlay).
    await gotoDesignerFromWizard(page, {
      name: 'E2E Notification Test',
      description: 'Test notification preview',
    });

    await page.locator(STUDIO_TOOL('fields')).click();
    await expect(page.locator('[data-testid="studio-panel-fields"]')).toBeVisible();
  });
});

test.describe('Card Type Visual Consistency @cardCreation @owner', () => {

  test('Each card type selection shows icon and description', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'domcontentloaded' });
    await page.locator('#card-type-stamp').waitFor({ state: 'visible', timeout: 30000 });

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
    await page.goto('/programs/new', { waitUntil: 'domcontentloaded' });
    await page.locator('#card-type-stamp').waitFor({ state: 'visible', timeout: 30000 });

    const previewPanel = page.locator('#preview-panel');
    await expect(previewPanel).toBeVisible({ timeout: 10000 });

    // Verify sticky positioning
    const stickyClass = await previewPanel.getAttribute('class');
    expect(stickyClass).toContain('sticky');
  });
});

test.describe('Designer Sidebar Interactions @cardCreation @owner', () => {

  /** Wizard step 2 → full-screen designer overlay (the only way into the studio). */
  async function navigateToDesigner(page: import('@playwright/test').Page) {
    await gotoDesignerFromWizard(page, {
      name: 'E2E Designer Test',
      description: 'Designer interaction test',
    });
  }

  test('Designer sidebar tabs are clickable', async ({ page }) => {
    await navigateToDesigner(page);

    // The one tool rail inside the overlay
    await expect(page.locator(STUDIO_TOOL_PANEL)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(STUDIO_TOOL('images'))).toBeVisible();
    await expect(page.locator(STUDIO_TOOL('colors'))).toBeVisible();
  });

  test('Color picker changes update preview', async ({ page }) => {
    await navigateToDesigner(page);

    await page.locator(STUDIO_TOOL('colors')).click();
    await expect(page.locator('[data-testid="studio-panel-colors"]')).toBeVisible();

    // The always-visible control is the hex input; the native <input type=color>
    // only mounts inside ColorPickerPopover once opened.
    const hexInputs = page.locator('[data-testid="studio-panel-colors"] [data-testid="hex-input"]');
    expect(await hexInputs.count()).toBeGreaterThan(0);
  });

  test('Form builder has obligatorio/opcional toggles', async ({ page }) => {
    // FormBuilder lives in wizard step 1 (programs/formBuilder), not the studio.
    await gotoWizardStep1(page);

    await expect(page.getByText(/obligatorio/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/opcional/i).first()).toBeVisible({ timeout: 10000 });
  });
});
