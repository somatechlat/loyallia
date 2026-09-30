/**
 * Suite 51 — IDE Tool Controls (TAB BY TAB)
 *
 * One independently runnable module per STUDIO_TOOL. Each module opens the
 * designer, clicks its studio-tool button, asserts studio-panel-${id} mounts,
 * and verifies 1–3 key controls of that tab are present and interactable.
 *
 * Tools: images, cardType, fields, back, barcode, colors, advanced.
 *
 * Tags: @designerV2 @ideToolControls @owner
 */
import { test, expect, type Page } from '@playwright/test';
import {
  DESIGNER_OVERLAY,
  STUDIO_TOOL,
  STUDIO_TOOL_PANEL,
  gotoDesignerFromWizard,
} from '../helpers/wizard-designer';

const UNIQUE_PREFIX = `E2E IDE51 ${Date.now()}`;

// Wizard → designer navigation is multi-step. Top-level test.describe.configure
// is unusable here (dual @playwright/test + playwright versions), so each test
// raises its own timeout — same pattern as 43-card-creation-flows.spec.ts.
const TEST_TIMEOUT_MS = 120000;

async function openDesigner(page: Page): Promise<void> {
  test.setTimeout(TEST_TIMEOUT_MS);
  await gotoDesignerFromWizard(page, {
    name: `${UNIQUE_PREFIX} tool-ctl`,
    description: 'ide tool controls',
  });
}

/** Open the given studio tool and wait for its panel body to mount. */
async function openTool(page: Page, id: string): Promise<Page['locator']> {
  const tool = page.locator(STUDIO_TOOL(id));
  await expect(tool, `studio-tool-${id} must be visible`).toBeVisible({ timeout: 15000 });
  await tool.click();
  const panel = page.locator(`[data-testid="studio-panel-${id}"]`);
  await expect(panel, `studio-panel-${id} must mount after click`).toBeVisible({ timeout: 10000 });
  return panel;
}

/* ── images ─────────────────────────────────────────────────────────── */

test.describe('Tool module: images @ideToolControls @designerV2 @owner', () => {
  test('images panel mounts with logo, strip, and additional upload zones', async ({ page }) => {
    await openDesigner(page);
    const panel = await openTool(page, 'images');

    // UploadZone file inputs (ids from ImagesTab.tsx).
    await expect(panel.locator('#logo-upload')).toBeAttached();
    await expect(panel.locator('#strip-upload')).toBeAttached();

    // Section headings rendered by ImagesTab (Spanish i18n).
    await expect(panel.getByText(/logo/i).first()).toBeVisible();
    await expect(panel.getByText(/imagen principal|strip|hero/i).first()).toBeVisible();

    // At least one additional-image upload input is wired up.
    await expect(panel.locator('#push-icon-upload, #icon-upload').first()).toBeAttached();
    await expect(page.locator(DESIGNER_OVERLAY)).toBeVisible();
  });
});

/* ── cardType ───────────────────────────────────────────────────────── */

test.describe('Tool module: cardType @ideToolControls @designerV2 @owner', () => {
  test('cardType panel mounts with stamp config controls (default stamp card)', async ({ page }) => {
    await openDesigner(page);
    const panel = await openTool(page, 'cardType');

    // StampTab controls (wizard default cardType is stamp).
    const stampsRequired = panel.locator('[data-testid="stamps-required-input"]');
    await expect(stampsRequired).toBeVisible();
    await expect(stampsRequired).toBeEnabled();

    const reward = panel.locator('[data-testid="reward-description-input"]');
    await expect(reward).toBeVisible();
    await expect(reward).toBeEnabled();

    // Stamp shape / type toggles are present.
    await expect(panel.locator('[data-testid="stamp-type-visit"]')).toBeVisible();
    await expect(page.locator(DESIGNER_OVERLAY)).toBeVisible();
  });
});

/* ── fields ─────────────────────────────────────────────────────────── */

test.describe('Tool module: fields @ideToolControls @designerV2 @owner', () => {
  test('fields panel mounts with field groups and add-field buttons', async ({ page }) => {
    await openDesigner(page);
    const panel = await openTool(page, 'fields');

    // FieldStudio field groups (header, primary, secondary, auxiliary, back).
    for (const group of ['header', 'primary', 'secondary', 'auxiliary', 'back'] as const) {
      await expect(
        panel.locator(`[data-testid="field-group-${group}"]`),
        `field-group-${group} must be visible`
      ).toBeVisible({ timeout: 10000 });
    }

    // Add-field CTA is present and clickable for at least one group.
    const addHeader = panel.locator('[data-testid="add-field-header"]');
    await expect(addHeader).toBeVisible();
    await expect(addHeader).toBeEnabled();

    // Existing field cards expose the delete control.
    const deleteBtns = panel.locator('[data-testid="field-delete-btn"]');
    expect(await deleteBtns.count(), 'at least one field card must render').toBeGreaterThan(0);
    await expect(page.locator(DESIGNER_OVERLAY)).toBeVisible();
  });
});

/* ── back ───────────────────────────────────────────────────────────── */

test.describe('Tool module: back @ideToolControls @designerV2 @owner', () => {
  test('back panel mounts; add-field creates an editable back field row', async ({ page }) => {
    await openDesigner(page);
    const panel = await openTool(page, 'back');

    // BackDesignTab always renders the "add field" CTA (aria-label from i18n).
    const addBtn = panel.getByRole('button', { name: /añadir campo|add field/i });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // A new row exposes label + value inputs keyed by the generated field id.
    const labelInput = panel.locator('[data-testid^="back-field-label-"]').first();
    await expect(labelInput).toBeVisible({ timeout: 10000 });
    await expect(labelInput).toBeEditable();

    const valueInput = panel.locator('[data-testid^="back-field-value-"]').first();
    await expect(valueInput).toBeVisible();
    await expect(valueInput).toBeEditable();
    await expect(page.locator(DESIGNER_OVERLAY)).toBeVisible();
  });
});

/* ── barcode ────────────────────────────────────────────────────────── */

test.describe('Tool module: barcode @ideToolControls @designerV2 @owner', () => {
  test('barcode panel mounts with format selector and alt-text input', async ({ page }) => {
    await openDesigner(page);
    const panel = await openTool(page, 'barcode');

    // FORMAT_CARDS render as buttons with aria-pressed (8 formats).
    const formatButtons = panel.locator('button[aria-pressed]');
    await expect(formatButtons).toHaveCount(8);

    // Exactly one format is selected at a time.
    await expect(panel.locator('button[aria-pressed="true"]')).toHaveCount(1);

    // Click a different format — selection moves.
    const aztec = panel.getByRole('button', { name: /aztec/i });
    await aztec.click();
    await expect(aztec).toHaveAttribute('aria-pressed', 'true');

    // Alt-text input is editable.
    const altText = panel.locator('[data-testid="barcode-alt-text-input"]');
    await expect(altText).toBeVisible();
    await expect(altText).toBeEditable();
    await altText.fill('E2E-ALT-51');
    await expect(altText).toHaveValue('E2E-ALT-51');
    await expect(page.locator(DESIGNER_OVERLAY)).toBeVisible();
  });
});

/* ── colors ─────────────────────────────────────────────────────────── */

test.describe('Tool module: colors @ideToolControls @designerV2 @owner', () => {
  test('colors panel mounts with hex inputs and preset swatches', async ({ page }) => {
    await openDesigner(page);
    const panel = await openTool(page, 'colors');

    // COLOR_FIELDS render one hex-input each (background, foreground, label, accent, centralBackground).
    const hexInputs = panel.locator('[data-testid="hex-input"]');
    expect(await hexInputs.count(), 'colors panel must expose hex inputs').toBeGreaterThanOrEqual(1);

    // First hex input is interactable.
    const hex = hexInputs.first();
    await expect(hex).toBeEditable();
    await hex.fill('#112233');
    await hex.blur();
    await expect(page.locator(DESIGNER_OVERLAY)).toBeVisible();

    // COLOR_PRESETS render as color-preset buttons.
    const presets = panel.locator('[data-testid="color-preset"]');
    expect(await presets.count(), 'color presets must render').toBeGreaterThan(0);
  });
});

/* ── advanced ───────────────────────────────────────────────────────── */

test.describe('Tool module: advanced @ideToolControls @designerV2 @owner', () => {
  test('advanced panel mounts with Apple description and Google Smart-Tap inputs', async ({ page }) => {
    await openDesigner(page);
    const panel = await openTool(page, 'advanced');

    // Apple description is always rendered.
    const appleDesc = panel.locator('[data-testid="apple-description-input"]');
    await expect(appleDesc).toBeVisible();
    await expect(appleDesc).toBeEditable();

    // App launch URL is always rendered.
    await expect(panel.locator('[data-testid="app-launch-url-input"]')).toBeVisible();

    // Smart-Tap value input is gated behind its toggle — switch it on.
    const smartTapToggle = panel
      .locator('label')
      .filter({ hasText: /smart\s*tap|nfc/i })
      .locator('input[type="checkbox"]')
      .first();
    await expect(smartTapToggle).toBeVisible();
    await smartTapToggle.check();
    const smartTapValue = panel.locator('[data-testid="smart-tap-value-input"]');
    await expect(smartTapValue).toBeVisible({ timeout: 10000 });
    await expect(smartTapValue).toBeEditable();

    // Google homepage / grouping inputs are always rendered.
    await expect(panel.locator('[data-testid="homepage-uri-input"]')).toBeVisible();
    await expect(panel.locator('[data-testid="grouping-id-input"]')).toBeVisible();
    await expect(page.locator(DESIGNER_OVERLAY)).toBeVisible();
  });
});
