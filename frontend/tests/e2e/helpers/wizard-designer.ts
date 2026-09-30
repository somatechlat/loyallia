/**
 * Wizard → full-screen Wallet Designer navigation helper.
 *
 * Since the re-layout, the Wallet Studio no longer sits inline on step 2 of
 * `/programs/new`. Step 2 shows a summary card with one CTA that opens the
 * designer as a full-screen overlay (`WalletDesignerOverlay`), which mounts the
 * studio unchanged.
 *
 * These helpers are the single way E2E specs reach the studio from the wizard,
 * so a change to the entry point is a one-line fix here instead of a hunt
 * through every suite.
 */
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/** Stable selectors for the overlay chrome and the reused studio inside it. */
export const DESIGNER_OVERLAY = '[data-testid="wallet-designer-overlay"]';
export const DESIGNER_OPEN_CTA = '[data-testid="open-wallet-designer"]';
export const STUDIO_TOOL_PANEL = '[data-testid="studio-tool-panel"]';
export const STUDIO_TOOL = (id: string) => `[data-testid="studio-tool-${id}"]`;

/** The seven studio tools, in registry order (see src/components/wallet/studio/tools.ts). */
export const STUDIO_TOOL_IDS = [
  'images',
  'cardType',
  'fields',
  'back',
  'barcode',
  'colors',
  'advanced',
] as const;

/**
 * Drive the wizard to step 1 (card-type config + FormBuilder).
 * This is where the "Obligatorio / Opcional" field radios live — NOT the studio.
 */
export async function gotoWizardStep1(page: Page, cardType = 'stamp'): Promise<void> {
  // domcontentloaded + explicit card-type tile: networkidle hangs on the wizard
  // (live preview requests) and the step-0 headline copy is not a stable contract.
  await page.goto('/programs/new', { waitUntil: 'domcontentloaded' });
  await page.locator(`#card-type-${cardType}`).waitFor({ state: 'visible', timeout: 30000 });
  await page.locator(`#card-type-${cardType}`).click();
  await page.getByRole('button', { name: /siguiente/i }).click();
  await page.waitForTimeout(2000);
}

/**
 * Drive the wizard to step 2 (name + description) for a card type.
 * Leaves the designer closed — step 2's summary card is visible.
 */
export async function gotoWizardStep2(
  page: Page,
  options: { cardType?: string; name?: string; description?: string } = {}
): Promise<void> {
  const {
    cardType = 'stamp',
    name = 'E2E Designer Test',
    description = 'Designer interaction test',
  } = options;

  await gotoWizardStep1(page, cardType);
  await page.getByRole('button', { name: /siguiente/i }).click();
  await page.locator('#program-name').waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('#program-name').fill(name);
  await page.locator('#program-desc').fill(description);
}

/**
 * Open the full-screen designer overlay from wizard step 2 and wait until the
 * studio tool rail and sidebar are mounted inside it.
 */
export async function openWalletDesigner(page: Page): Promise<void> {
  const cta = page.locator(DESIGNER_OPEN_CTA);
  await expect(cta).toBeVisible({ timeout: 15000 });
  await cta.click();
  await expect(page.locator(DESIGNER_OVERLAY)).toBeVisible({ timeout: 15000 });
  await expect(page.locator(STUDIO_TOOL_PANEL)).toBeVisible({ timeout: 20000 });
}

/** Close the overlay via the "Listo" button and confirm it unmounted. */
export async function closeWalletDesigner(page: Page): Promise<void> {
  await page.locator('[data-testid="wallet-designer-done"]').click();
  await expect(page.locator(DESIGNER_OVERLAY)).toBeHidden({ timeout: 10000 });
}

/**
 * Wizard step 2 → open the full-screen designer. The common path for every
 * spec that drives studio controls from the creation wizard.
 */
export async function gotoDesignerFromWizard(
  page: Page,
  options: { cardType?: string; name?: string; description?: string } = {}
): Promise<void> {
  await gotoWizardStep2(page, options);
  await openWalletDesigner(page);
}
