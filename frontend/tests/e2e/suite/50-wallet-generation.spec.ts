/**
 * Suite 50 — Wallet Generation Modules
 *
 * Modular wallet-generation tests: toolbar platform toggles that switch the
 * live preview, zoom, front/back view, undo/redo, the Save-stays-open
 * contract, export, design-score dialog, and the template gallery entry.
 *
 * Each test.describe is an independently runnable module.
 *
 * Tags: @designerV2 @walletGeneration @owner
 */
import { test, expect, type Page } from '@playwright/test';
import {
  DESIGNER_OVERLAY,
  STUDIO_TOOL,
  gotoDesignerFromWizard,
} from '../helpers/wizard-designer';

const UNIQUE_PREFIX = `E2E IDE50 ${Date.now()}`;

// Wizard → designer navigation is multi-step. Top-level test.describe.configure
// is unusable here (dual @playwright/test + playwright versions), so each test
// raises its own timeout — same pattern as 43-card-creation-flows.spec.ts.
const TEST_TIMEOUT_MS = 120000;

async function openDesigner(page: Page): Promise<void> {
  test.setTimeout(TEST_TIMEOUT_MS);
  await gotoDesignerFromWizard(page, {
    name: `${UNIQUE_PREFIX} wallet-gen`,
    description: 'wallet generation modules',
  });
}

/** Assert the live wallet preview exists and is not an empty shell. */
async function expectCanvasNonEmpty(page: Page): Promise<void> {
  const card = page
    .locator('[data-testid="apple-wallet-card"], [data-testid="google-wallet-card"]')
    .first();
  await expect(card).toBeVisible({ timeout: 15000 });
  const text = (await card.innerText()).trim();
  expect(text.length, 'wallet card preview must render non-empty content').toBeGreaterThan(0);
}

test.describe('Platform preview toggle @walletGeneration @designerV2 @owner', () => {
  test('apple shows only the Apple pass preview', async ({ page }) => {
    await openDesigner(page);
    await page.locator('[data-testid="toolbar-platform-apple"]').click();
    await expect(page.locator('[data-testid="toolbar-platform-apple"]')).toHaveAttribute(
      'aria-checked',
      'true'
    );
    await expect(page.locator('[data-testid="apple-wallet-card"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="google-wallet-card"]')).toBeHidden({ timeout: 10000 });
  });

  test('google shows only the Google pass preview', async ({ page }) => {
    await openDesigner(page);
    await page.locator('[data-testid="toolbar-platform-google"]').click();
    await expect(page.locator('[data-testid="toolbar-platform-google"]')).toHaveAttribute(
      'aria-checked',
      'true'
    );
    await expect(page.locator('[data-testid="google-wallet-card"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="apple-wallet-card"]')).toBeHidden({ timeout: 10000 });
  });

  test('both shows Apple and Google previews side by side', async ({ page }) => {
    await openDesigner(page);
    await page.locator('[data-testid="toolbar-platform-both"]').click();
    await expect(page.locator('[data-testid="toolbar-platform-both"]')).toHaveAttribute(
      'aria-checked',
      'true'
    );
    await expect(page.locator('[data-testid="apple-wallet-card"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="google-wallet-card"]')).toBeVisible({ timeout: 15000 });
    await expectCanvasNonEmpty(page);
  });
});

test.describe('Zoom module @walletGeneration @designerV2 @owner', () => {
  test('zoom in and zoom out update the zoom level readout', async ({ page }) => {
    await openDesigner(page);
    const level = page.locator('[data-testid="toolbar-zoom-level"]');
    await expect(level).toBeVisible();
    const before = (await level.innerText()).trim();

    await page.locator('[data-testid="toolbar-zoom-in"]').click();
    await page.waitForTimeout(200);
    const afterIn = (await level.innerText()).trim();
    expect(afterIn, 'zoom-in must change the zoom level').not.toBe(before);

    await page.locator('[data-testid="toolbar-zoom-out"]').click();
    await page.locator('[data-testid="toolbar-zoom-out"]').click();
    await page.waitForTimeout(200);
    const afterOut = (await level.innerText()).trim();
    expect(afterOut, 'zoom-out must change the zoom level').not.toBe(afterIn);
    await expect(page.locator(DESIGNER_OVERLAY)).toBeVisible();
  });
});

test.describe('Front/back view module @walletGeneration @designerV2 @owner', () => {
  test('front and back toggles switch the active view', async ({ page }) => {
    await openDesigner(page);
    const front = page.locator('[data-testid="toolbar-view-front"]');
    const back = page.locator('[data-testid="toolbar-view-back"]');
    await expect(front).toBeVisible();
    await expect(back).toBeVisible();
    await expect(front).toHaveAttribute('aria-checked', 'true');

    await back.click();
    await expect(back).toHaveAttribute('aria-checked', 'true');
    await expect(front).toHaveAttribute('aria-checked', 'false');
    await expectCanvasNonEmpty(page);

    await front.click();
    await expect(front).toHaveAttribute('aria-checked', 'true');
    await expectCanvasNonEmpty(page);
  });
});

test.describe('Undo/redo module @walletGeneration @designerV2 @owner', () => {
  test('undo and redo are present and clickable after a change', async ({ page }) => {
    await openDesigner(page);
    const undo = page.locator('[data-testid="toolbar-undo"]');
    const redo = page.locator('[data-testid="toolbar-redo"]');
    await expect(undo).toBeVisible();
    await expect(redo).toBeVisible();

    // Make a reversible change via the colors hex input.
    await page.locator(STUDIO_TOOL('colors')).click();
    const hex = page
      .locator('[data-testid="studio-panel-colors"] [data-testid="hex-input"]')
      .first();
    await hex.fill('#112233');
    await hex.blur();
    await page.waitForTimeout(500);

    await expect(undo).toBeEnabled();
    await undo.click();
    await expect(page.locator(DESIGNER_OVERLAY)).toBeVisible();
    await redo.click();
    await expect(page.locator(DESIGNER_OVERLAY)).toBeVisible();
  });
});

test.describe('Save contract module @walletGeneration @designerV2 @owner', () => {
  test('toolbar-save persists and designer STAYS OPEN (Save contract)', async ({ page }) => {
    await openDesigner(page);

    // Touch a color so the design is actually "custom".
    await page.locator(STUDIO_TOOL('colors')).click();
    const hex = page
      .locator('[data-testid="studio-panel-colors"] [data-testid="hex-input"]')
      .first();
    await hex.fill('#445566');
    await hex.blur();
    await page.waitForTimeout(300);

    await page.locator('[data-testid="toolbar-save"]').click();
    // Save is persist-only: the overlay must remain open with the work kept.
    await expect(page.locator(DESIGNER_OVERLAY)).toBeVisible({ timeout: 10000 });
    await expectCanvasNonEmpty(page);
  });
});

test.describe('Export module @walletGeneration @designerV2 @owner', () => {
  test('export button is present and clickable without crashing the studio', async ({ page }) => {
    await openDesigner(page);
    const exportBtn = page.locator('[data-testid="toolbar-export"]');
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();
    // Export may fail (no real pass backend for a draft) — the studio must survive.
    await expect(page.locator(DESIGNER_OVERLAY)).toBeVisible({ timeout: 15000 });
    await expectCanvasNonEmpty(page);
  });
});

test.describe('Design score dialog module @walletGeneration @designerV2 @owner', () => {
  test('design score badge opens the dialog and close dismisses it', async ({ page }) => {
    await openDesigner(page);
    const badge = page.locator('[data-testid="design-score-badge"]');
    await expect(badge).toBeVisible({ timeout: 15000 });
    await badge.click();

    await expect(page.locator('[data-testid="design-score-dialog"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="design-score-close"]').click();
    await expect(page.locator('[data-testid="design-score-dialog"]')).toBeHidden({ timeout: 10000 });
    await expect(page.locator(DESIGNER_OVERLAY)).toBeVisible();
  });
});

test.describe('Template gallery module @walletGeneration @designerV2 @owner', () => {
  test('templates button opens the gallery modal and back returns to the studio', async ({ page }) => {
    await openDesigner(page);
    await page.locator('[data-testid="toolbar-templates"]').click();

    await expect(page.locator('[data-testid="gallery-search-input"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="gallery-back-btn"]')).toBeVisible();

    await page.locator('[data-testid="gallery-back-btn"]').click();
    await expect(page.locator('[data-testid="gallery-search-input"]')).toBeHidden({ timeout: 10000 });
    await expect(page.locator(DESIGNER_OVERLAY)).toBeVisible();
    await expectCanvasNonEmpty(page);
  });
});
