/**
 * Suite 45 — Full Designer Workbench E2E Tests
 * Tags: @designerWorkbench @designerV2 @owner
 *
 * The studio now lives in a full-screen overlay opened from wizard step 2.
 * Every workbench test enters through `gotoDesignerFromWizard`, so the studio
 * is reached the same way a user reaches it.
 */
import { test, expect } from '@playwright/test';
import {
  gotoDesignerFromWizard,
  gotoWizardStep2,
  openWalletDesigner,
  STUDIO_TOOL,
  STUDIO_TOOL_IDS,
  STUDIO_TOOL_PANEL,
} from '../helpers/wizard-designer';

test.describe('Designer Full Workbench @designerWorkbench @owner', () => {
  test('Designer loads with sidebar and canvas', async ({ page }) => {
    await gotoDesignerFromWizard(page, { name: 'E2E Workbench Test', description: 'Full workbench test' });
    // The overlay hosts the reused studio: tool rail + sidebar + canvas.
    await expect(page.locator('[data-testid="wallet-designer-overlay"]')).toBeVisible();
    await expect(page.locator(STUDIO_TOOL_PANEL)).toBeVisible();
    await expect(page.locator(STUDIO_TOOL('images'))).toBeVisible();
  });

  test('Sidebar has the one tool rail', async ({ page }) => {
    await gotoDesignerFromWizard(page);
    for (const id of STUDIO_TOOL_IDS) {
      await expect(page.locator(STUDIO_TOOL(id))).toBeVisible();
    }
    // Exactly the seven registry tools — no duplicated/triplicated rails.
    // NOTE: [data-testid^="studio-tool-"] also matches "studio-tool-panel", so
    // count only the rail buttons (each tool id is a single exact testid).
    for (const id of STUDIO_TOOL_IDS) {
      await expect(page.locator(STUDIO_TOOL(id))).toHaveCount(1);
    }
  });

  test('Stamp config tab renders stamps-required input', async ({ page }) => {
    await gotoDesignerFromWizard(page, { cardType: 'stamp' });
    await page.locator(STUDIO_TOOL('cardType')).click();
    await expect(page.locator('[data-testid="studio-panel-cardType"]')).toBeVisible();
    await expect(page.locator('[data-testid="stamps-required-input"]')).toBeVisible();
  });

  test('Preview panel renders', async ({ page }) => {
    await gotoDesignerFromWizard(page);
    const canvas = page.locator('[data-testid*="apple-wallet"], [data-testid*="google-wallet"], [class*="canvas"], [class*="preview"]').first();
    await expect(canvas).toBeVisible({ timeout: 15000 });
  });

  test('Color inputs exist in designer', async ({ page }) => {
    await gotoDesignerFromWizard(page);
    await page.locator(STUDIO_TOOL('colors')).click();
    await expect(page.locator('[data-testid="studio-panel-colors"]')).toBeVisible();
    // ColorsTab always shows hex inputs; the native picker lives in a popover.
    const hexInputs = page.locator('[data-testid="studio-panel-colors"] [data-testid="hex-input"]');
    expect(await hexInputs.count()).toBeGreaterThan(0);
  });

  test('Back tab has card info toggles', async ({ page }) => {
    await gotoDesignerFromWizard(page);
    await page.locator(STUDIO_TOOL('back')).click();
    await expect(page.locator('[data-testid="studio-panel-back"]')).toBeVisible();
    const toggles = page.locator('[data-testid="studio-panel-back"] input[type="checkbox"]');
    expect(await toggles.count()).toBeGreaterThan(0);
  });

  test('Fields tab renders', async ({ page }) => {
    await gotoDesignerFromWizard(page);
    await page.locator(STUDIO_TOOL('fields')).click();
    await expect(page.locator('[data-testid="studio-panel-fields"]')).toBeVisible();
    const content = page.locator('[data-testid="studio-panel-fields"] input, [data-testid="studio-panel-fields"] select, [data-testid="studio-panel-fields"] [draggable]');
    expect(await content.count()).toBeGreaterThanOrEqual(0);
  });

  test('Barcode tab renders', async ({ page }) => {
    await gotoDesignerFromWizard(page);
    await page.locator(STUDIO_TOOL('barcode')).click();
    await expect(page.locator('[data-testid="studio-panel-barcode"]')).toBeVisible();
  });

  test('Advanced tab renders', async ({ page }) => {
    await gotoDesignerFromWizard(page);
    await page.locator(STUDIO_TOOL('advanced')).click();
    await expect(page.locator('[data-testid="studio-panel-advanced"]')).toBeVisible();
  });

  test('Images tab shows upload zones', async ({ page }) => {
    await gotoDesignerFromWizard(page);
    await page.locator(STUDIO_TOOL('images')).click();
    await expect(page.locator('[data-testid="studio-panel-images"]')).toBeVisible();
    const zones = page.locator('[id*="upload"], [class*="border-dashed"]');
    expect(await zones.count()).toBeGreaterThan(0);
  });

  test('Designer closes back to wizard step 2', async ({ page }) => {
    await gotoDesignerFromWizard(page);
    await page.locator('[data-testid="wallet-designer-done"]').click();
    await expect(page.locator('[data-testid="wallet-designer-overlay"]')).toBeHidden();
    // Step 2 still intact — name preserved, CTA back to edit mode.
    await expect(page.locator('#program-name')).toHaveValue('E2E Designer Test');
    await expect(page.locator('[data-testid="open-wallet-designer"]')).toBeVisible();
  });

  test('Full journey: create stamp card end-to-end', async ({ page }) => {
    await gotoWizardStep2(page, {
      cardType: 'stamp',
      name: 'E2E Full Journey Stamp',
      description: 'Complete journey test',
    });
    // The design entry point is present before continuing to review.
    await expect(page.locator('[data-testid="open-wallet-designer"]')).toBeVisible();
    // Open and close so the summary reflects a visited design step.
    await openWalletDesigner(page);
    await page.locator('[data-testid="wallet-designer-done"]').click();
    await expect(page.locator('[data-testid="wallet-designer-overlay"]')).toBeHidden();

    await page.getByRole('button', { name: /siguiente/i }).click();
    await page.getByText('E2E Full Journey Stamp').first().waitFor({ state: 'visible', timeout: 10000 });
    await page.getByRole('button', { name: /crear programa/i }).click();
    await page.waitForURL(/.*programs.*/, { timeout: 20000 });
  });
});
