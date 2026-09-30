/**
 * Suite 52 — IDE Card-Type Controls (MODULAR PER CARD TYPE)
 *
 * Parameterized over representative CARD_TYPES. Each card type is its own
 * independently runnable describe block: wizard → designer → canvas preview
 * non-empty → fields module → colors module.
 *
 * Card types covered: stamp, cashback (loyalty), coupon, vip_membership
 * (membership). See frontend/src/components/programs/constants.tsx CARD_TYPES.
 *
 * Tags: @designerV2 @cardTypeControls @owner
 */
import { test, expect, type Page } from '@playwright/test';
import {
  DESIGNER_OVERLAY,
  STUDIO_TOOL,
  gotoDesignerFromWizard,
} from '../helpers/wizard-designer';

const UNIQUE_PREFIX = `E2E IDE52 ${Date.now()}`;

// Wizard → designer navigation is multi-step. Top-level test.describe.configure
// is unusable here (dual @playwright/test + playwright versions), so each test
// raises its own timeout — same pattern as 43-card-creation-flows.spec.ts.
const TEST_TIMEOUT_MS = 120000;

/** Assert the live wallet preview exists and is not an empty shell. */
async function expectCanvasNonEmpty(page: Page): Promise<void> {
  const card = page
    .locator('[data-testid="apple-wallet-card"], [data-testid="google-wallet-card"]')
    .first();
  await expect(card).toBeVisible({ timeout: 15000 });
  const text = (await card.innerText()).trim();
  expect(text.length, 'wallet card preview must render non-empty content').toBeGreaterThan(0);
}

/** Assert the fields tool mounts with its five field groups. */
async function expectFieldsModule(page: Page): Promise<void> {
  await page.locator(STUDIO_TOOL('fields')).click();
  const panel = page.locator('[data-testid="studio-panel-fields"]');
  await expect(panel).toBeVisible({ timeout: 10000 });
  for (const group of ['header', 'primary', 'secondary', 'auxiliary', 'back'] as const) {
    await expect(
      panel.locator(`[data-testid="field-group-${group}"]`),
      `field-group-${group} must be visible`
    ).toBeVisible({ timeout: 10000 });
  }
}

/** Assert the colors tool mounts with a usable hex input. */
async function expectColorsModule(page: Page): Promise<void> {
  await page.locator(STUDIO_TOOL('colors')).click();
  const panel = page.locator('[data-testid="studio-panel-colors"]');
  await expect(panel).toBeVisible({ timeout: 10000 });
  const hex = panel.locator('[data-testid="hex-input"]').first();
  await expect(hex).toBeVisible();
  await expect(hex).toBeEditable();
}

interface CardTypeModule {
  /** CARD_TYPES value — matches `#card-type-${value}` tile in the wizard. */
  value: string;
  /** Human label used in the describe/test titles. */
  label: string;
}

const CARD_TYPE_MODULES: CardTypeModule[] = [
  { value: 'stamp', label: 'stamp (loyalty stamps)' },
  { value: 'cashback', label: 'cashback (loyalty)' },
  { value: 'coupon', label: 'coupon' },
  { value: 'vip_membership', label: 'vip_membership (membership)' },
];

for (const ct of CARD_TYPE_MODULES) {
  test.describe(`Card-type module: ${ct.label} @cardTypeControls @designerV2 @owner`, () => {
    test(`wizard → designer → canvas → fields → colors for ${ct.value}`, async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT_MS);
      await gotoDesignerFromWizard(page, {
        cardType: ct.value,
        name: `${UNIQUE_PREFIX} ${ct.value}`,
        description: `card-type controls ${ct.value}`,
      });

      await expect(page.locator(DESIGNER_OVERLAY)).toBeVisible();
      await expectCanvasNonEmpty(page);

      await expectFieldsModule(page);
      await expectColorsModule(page);

      await expect(page.locator(DESIGNER_OVERLAY)).toBeVisible();
    });
  });
}
