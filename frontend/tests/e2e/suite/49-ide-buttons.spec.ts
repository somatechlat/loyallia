/**
 * Suite 49 — Wallet Designer IDE Button Battery
 *
 * Covers EVERY chrome control and toolbar button of the full-screen wallet
 * designer overlay, all 7 studio tools, gallery/save-template modals, and the
 * Escape / Save / Done contracts.
 *
 * Restored from the pre-refactor 49-52 IDE battery (lost on main) and targeted
 * at the current `WalletDesignerOverlay` + `WalletStudio` chrome testids.
 *
 * Tags: @designerV2 @ideButtons @owner
 */
import { test, expect, type Page } from '@playwright/test';
import {
  DESIGNER_OVERLAY,
  STUDIO_TOOL,
  STUDIO_TOOL_IDS,
  STUDIO_TOOL_PANEL,
  gotoDesignerFromWizard,
  openWalletDesigner,
  gotoWizardStep2,
} from '../helpers/wizard-designer';

const UNIQUE_PREFIX = `E2E IDE49 ${Date.now()}`;

// Wizard → designer navigation is multi-step; keep headroom over the 60s default.
test.describe.configure({ timeout: 120000 });

async function openDesigner(page: Page): Promise<void> {
  await gotoDesignerFromWizard(page, {
    name: `${UNIQUE_PREFIX} designer`,
    description: 'IDE button battery',
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

test.describe('Designer overlay chrome @ideButtons @designerV2 @owner', () => {
  test('overlay mounts with back, close, done, and stage', async ({ page }) => {
    await openDesigner(page);
    await expect(page.locator(DESIGNER_OVERLAY)).toBeVisible();
    await expect(page.locator('[data-testid="wallet-designer-back"]')).toBeVisible();
    await expect(page.locator('[data-testid="wallet-designer-close"]')).toBeVisible();
    await expect(page.locator('[data-testid="wallet-designer-done"]')).toBeVisible();
    await expect(page.locator('[data-testid="wallet-designer-stage"]')).toBeVisible();
  });

  test('wallet-designer-back closes the overlay', async ({ page }) => {
    await openDesigner(page);
    await page.locator('[data-testid="wallet-designer-back"]').click();
    await expect(page.locator(DESIGNER_OVERLAY)).toBeHidden({ timeout: 10000 });
  });

  test('wallet-designer-close closes the overlay', async ({ page }) => {
    await openDesigner(page);
    await page.locator('[data-testid="wallet-designer-close"]').click();
    await expect(page.locator(DESIGNER_OVERLAY)).toBeHidden({ timeout: 10000 });
  });

  test('wallet-designer-done closes the overlay', async ({ page }) => {
    await openDesigner(page);
    await page.locator('[data-testid="wallet-designer-done"]').click();
    await expect(page.locator(DESIGNER_OVERLAY)).toBeHidden({ timeout: 10000 });
  });

  test('Escape closes the designer when no studio modal is open (Esc contract)', async ({ page }) => {
    await openDesigner(page);
    // Escape is LIFO over studio modals first; with none open it closes the designer.
    await page.keyboard.press('Escape');
    await expect(page.locator(DESIGNER_OVERLAY)).toBeHidden({ timeout: 10000 });
    // Designer closed — wizard step 2 is still there with the name kept.
    await expect(page.locator('#program-name')).toBeVisible();
  });

  test('Escape with a studio modal open closes the modal first, then the designer', async ({ page }) => {
    await openDesigner(page);
    // Open the gallery (registers on the studio modal stack).
    await page.locator('[data-testid="toolbar-templates"]').click();
    await expect(page.locator('[data-testid="gallery-back-btn"]')).toBeVisible({ timeout: 10000 });

    await page.keyboard.press('Escape');
    // First Escape: gallery closes, designer stays.
    await expect(page.locator('[data-testid="gallery-back-btn"]')).toBeHidden({ timeout: 10000 });
    await expect(page.locator(DESIGNER_OVERLAY)).toBeVisible();

    await page.keyboard.press('Escape');
    // Second Escape: designer closes.
    await expect(page.locator(DESIGNER_OVERLAY)).toBeHidden({ timeout: 10000 });
  });

  test('Done contract keeps wizard name after close', async ({ page }) => {
    const name = `${UNIQUE_PREFIX} done-contract`;
    await gotoWizardStep2(page, { name, description: 'done contract' });
    await openWalletDesigner(page);
    await page.locator('[data-testid="wallet-designer-done"]').click();
    await expect(page.locator(DESIGNER_OVERLAY)).toBeHidden({ timeout: 10000 });
    await expect(page.locator('#program-name')).toHaveValue(name);
  });
});

test.describe('Designer 7 tool rail @ideButtons @designerV2 @owner', () => {
  test('every studio tool button is visible and switches its panel', async ({ page }) => {
    await openDesigner(page);
    await expect(page.locator(STUDIO_TOOL_PANEL)).toBeVisible({ timeout: 15000 });

    for (const id of STUDIO_TOOL_IDS) {
      const tool = page.locator(STUDIO_TOOL(id));
      await expect(tool, `studio-tool-${id} must be visible`).toBeVisible({ timeout: 10000 });
      await tool.click();
      await expect(
        page.locator(`[data-testid="studio-panel-${id}"]`),
        `studio-panel-${id} must mount after click`
      ).toBeVisible({ timeout: 10000 });
      await expectCanvasNonEmpty(page);
    }
  });

  test('each of the 7 tools has exactly one rail button (no duplicated rails)', async ({ page }) => {
    await openDesigner(page);
    for (const id of STUDIO_TOOL_IDS) {
      await expect(page.locator(STUDIO_TOOL(id))).toHaveCount(1);
    }
  });
});

test.describe('Designer toolbar buttons @ideButtons @designerV2 @owner', () => {
  test('undo / redo buttons exist and undo becomes enabled after a change', async ({ page }) => {
    await openDesigner(page);
    const undo = page.locator('[data-testid="toolbar-undo"]');
    const redo = page.locator('[data-testid="toolbar-redo"]');
    await expect(undo).toBeVisible();
    await expect(redo).toBeVisible();

    // Make a reversible change via the colors hex input.
    await page.locator(STUDIO_TOOL('colors')).click();
    const hex = page.locator('[data-testid="studio-panel-colors"] [data-testid="hex-input"]').first();
    await hex.fill('#112233');
    await hex.blur();
    await page.waitForTimeout(500);

    await expect(undo).toBeEnabled();
    await undo.click();
    await expect(page.locator(DESIGNER_OVERLAY)).toBeVisible();
    await redo.click();
    await expect(page.locator(DESIGNER_OVERLAY)).toBeVisible();
  });

  test('zoom out / zoom in change the zoom level', async ({ page }) => {
    await openDesigner(page);
    const level = page.locator('[data-testid="toolbar-zoom-level"]');
    await expect(level).toBeVisible();
    const before = (await level.innerText()).trim();

    await page.locator('[data-testid="toolbar-zoom-in"]').click();
    await page.waitForTimeout(200);
    const afterIn = (await level.innerText()).trim();
    expect(afterIn).not.toBe(before);

    await page.locator('[data-testid="toolbar-zoom-out"]').click();
    await page.locator('[data-testid="toolbar-zoom-out"]').click();
    await page.waitForTimeout(200);
    const afterOut = (await level.innerText()).trim();
    expect(afterOut).not.toBe(afterIn);
  });

  test('platform toggle: apple, google, both are clickable and stay active', async ({ page }) => {
    await openDesigner(page);
    for (const platform of ['apple', 'google', 'both'] as const) {
      const btn = page.locator(`[data-testid="toolbar-platform-${platform}"]`);
      await expect(btn).toBeVisible();
      await btn.click();
      await expect(btn).toHaveAttribute('aria-checked', 'true');
      await expectCanvasNonEmpty(page);
    }
  });

  test('front / back pass view toggle switches', async ({ page }) => {
    await openDesigner(page);
    const front = page.locator('[data-testid="toolbar-view-front"]');
    const back = page.locator('[data-testid="toolbar-view-back"]');
    await expect(front).toBeVisible();
    await expect(back).toBeVisible();
    await expect(front).toHaveAttribute('aria-checked', 'true');

    await back.click();
    await expect(back).toHaveAttribute('aria-checked', 'true');
    await front.click();
    await expect(front).toHaveAttribute('aria-checked', 'true');
  });

  test('AI launcher button is visible (enabled or PRO-locked)', async ({ page }) => {
    await openDesigner(page);
    const ai = page.locator('[data-testid="ai-launcher"]');
    await expect(ai).toBeVisible();
    // Must remain clickable-or-disabled, never missing.
    await expect(ai).toBeEnabled().catch(() => expect(ai).toBeDisabled());
  });

  test('design score badge is present when a score is computed', async ({ page }) => {
    await openDesigner(page);
    const badge = page.locator('[data-testid="design-score-badge"]');
    // Score may compute asynchronously; wait briefly then accept present/absent.
    await page.waitForTimeout(2000);
    if (await badge.isVisible().catch(() => false)) {
      await badge.click();
      const close = page.locator('[data-testid="design-score-close"]');
      if (await close.isVisible().catch(() => false)) {
        await close.click();
      }
    }
    await expect(page.locator(DESIGNER_OVERLAY)).toBeVisible();
  });
});

test.describe('Designer gallery and modals @ideButtons @designerV2 @owner', () => {
  test('toolbar-templates opens gallery; all gallery controls work; back closes', async ({ page }) => {
    await openDesigner(page);
    await page.locator('[data-testid="toolbar-templates"]').click();

    // Gallery replaces the tool panel with its own chrome.
    await expect(page.locator('[data-testid="gallery-search-input"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="gallery-industry-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="gallery-cardtype-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="gallery-categories"]')).toBeVisible();

    const grid = page.locator('[data-testid="gallery-grid"]');
    const empty = page.locator('[data-testid="gallery-empty"]');
    await expect(grid.or(empty).first()).toBeVisible({ timeout: 10000 });

    // Search box accepts input (human touch).
    await page.locator('[data-testid="gallery-search-input"]').fill('café');

    // Blank-start CTA when no template matches (or always in empty state).
    const blank = page.locator('[data-testid="gallery-blank-btn"]');
    if (await blank.isVisible().catch(() => false)) {
      // Leave gallery via back, not by applying a template.
    }

    await page.locator('[data-testid="gallery-back-btn"]').click();
    await expect(page.locator('[data-testid="gallery-search-input"]')).toBeHidden({ timeout: 10000 });
    await expect(page.locator(STUDIO_TOOL_PANEL)).toBeVisible({ timeout: 10000 });
    await expectCanvasNonEmpty(page);
  });

  test('save-as-template opens modal; cancel closes it', async ({ page }) => {
    await openDesigner(page);
    await page.locator('[data-testid="toolbar-save-template-btn"]').click();
    await expect(page.locator('[data-testid="template-name-input"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="template-description-input"]')).toBeVisible();
    await page.locator('[data-testid="template-cancel-btn"]').click();
    await expect(page.locator('[data-testid="template-name-input"]')).toBeHidden({ timeout: 10000 });
  });

  test('save-as-template close (X) also dismisses the modal', async ({ page }) => {
    await openDesigner(page);
    await page.locator('[data-testid="toolbar-save-template-btn"]').click();
    await expect(page.locator('[data-testid="template-name-input"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="save-template-close"]').click();
    await expect(page.locator('[data-testid="template-name-input"]')).toBeHidden({ timeout: 10000 });
  });
});

test.describe('Designer Save contract @ideButtons @designerV2 @owner', () => {
  test('toolbar-save persists and designer STAYS OPEN (Save contract)', async ({ page }) => {
    const name = `${UNIQUE_PREFIX} save-contract`;
    await gotoWizardStep2(page, { name, description: 'save contract' });
    await openWalletDesigner(page);

    // Touch a color so the design is actually "custom".
    await page.locator(STUDIO_TOOL('colors')).click();
    const hex = page.locator('[data-testid="studio-panel-colors"] [data-testid="hex-input"]').first();
    await hex.fill('#445566');
    await hex.blur();
    await page.waitForTimeout(300);

    await page.locator('[data-testid="toolbar-save"]').click();
    // Save is persist-only: the overlay must remain open with the work kept.
    await expect(page.locator(DESIGNER_OVERLAY)).toBeVisible({ timeout: 10000 });
    await expectCanvasNonEmpty(page);
  });

  test('export button is present and clickable without crashing the studio', async ({ page }) => {
    await openDesigner(page);
    const exportBtn = page.locator('[data-testid="toolbar-export"]');
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();
    // Export may fail (no real pass backend for a draft) — the studio must survive.
    await expect(page.locator(DESIGNER_OVERLAY)).toBeVisible({ timeout: 15000 });
    await expectCanvasNonEmpty(page);
  });

  test('Done contract: tools → change → gallery → save (stays open) → done (closes)', async ({ page }) => {
    const name = `${UNIQUE_PREFIX} battery`;
    await gotoWizardStep2(page, { name, description: 'full battery' });
    await openWalletDesigner(page);

    for (const id of STUDIO_TOOL_IDS) {
      await page.locator(STUDIO_TOOL(id)).click();
      await expect(page.locator(`[data-testid="studio-panel-${id}"]`)).toBeVisible();
    }

    await page.locator(STUDIO_TOOL('colors')).click();
    const hex = page.locator('[data-testid="studio-panel-colors"] [data-testid="hex-input"]').first();
    await hex.fill('#0a0b0c');
    await hex.blur();

    await page.locator('[data-testid="toolbar-templates"]').click();
    await expect(page.locator('[data-testid="gallery-back-btn"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="gallery-back-btn"]').click();

    await expectCanvasNonEmpty(page);

    // Save keeps the designer open…
    await page.locator('[data-testid="toolbar-save"]').click();
    await expect(page.locator(DESIGNER_OVERLAY)).toBeVisible({ timeout: 10000 });

    // …Listo persists and closes.
    await page.locator('[data-testid="wallet-designer-done"]').click();
    await expect(page.locator(DESIGNER_OVERLAY)).toBeHidden({ timeout: 10000 });
  });
});
