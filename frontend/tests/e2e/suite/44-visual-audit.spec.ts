/**
 * Visual audit script — screenshots every card type in the Loyallia designer.
 * Run with: PLAYWRIGHT_BASE_URL=http://localhost:33906 npx playwright test <this-file>
 */
import { test } from '@playwright/test';
import path from 'path';
import { gotoWizardStep2, openWalletDesigner } from '../helpers/wizard-designer';

const CARD_TYPES = [
  'stamp', 'cashback', 'coupon', 'affiliate', 'discount',
  'gift_certificate', 'vip_membership', 'corporate_discount',
  'referral_pass', 'multipass',
];

const SCREENSHOT_DIR = '/tmp/loyallia-audit';

test.describe('Visual Audit — Screenshot All Card Types', () => {

  test('Capture card type selection page', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'networkidle' });
    await page.getByText(/selecciona el programa/i).waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '00-card-type-selection.png'),
      fullPage: true,
    });
  });

  for (const cardType of CARD_TYPES) {
    test(`Capture preview for ${cardType}`, async ({ page }) => {
      await page.goto('/programs/new', { waitUntil: 'networkidle' });
      await page.getByText(/selecciona el programa/i).waitFor({ state: 'visible', timeout: 15000 });

      // Click the card type
      await page.locator(`#card-type-${cardType}`).click();
      await page.waitForTimeout(500);

      // Screenshot the full page with preview
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `01-${cardType}-selected.png`),
        fullPage: true,
      });

      // Screenshot just the preview panel
      const previewPanel = page.locator('#preview-panel');
      if (await previewPanel.isVisible()) {
        await previewPanel.screenshot({
          path: path.join(SCREENSHOT_DIR, `02-${cardType}-preview.png`),
        });
      }
    });
  }

  test('Capture Google Wallet toggle', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'networkidle' });
    await page.getByText(/selecciona el programa/i).waitFor({ state: 'visible', timeout: 15000 });

    // Click Google toggle
    await page.getByRole('button', { name: /google wallet/i }).click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03-google-wallet-toggle.png'),
      fullPage: true,
    });
  });

  test('Capture step 1 config for stamp', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'networkidle' });
    await page.getByText(/selecciona el programa/i).waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('#card-type-stamp').click();
    await page.getByRole('button', { name: /siguiente/i }).click();
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04-step1-stamp-config.png'),
      fullPage: true,
    });
  });

  test('Capture step 2 design with wallet studio', async ({ page }) => {
    await gotoWizardStep2(page, {
      cardType: 'stamp',
      name: 'Audit Test Card',
      description: 'Visual audit test',
    });

    // Step 2 summary + entry CTA
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '05-step2-design-studio.png'),
      fullPage: true,
    });

    // The full-screen designer overlay itself
    await openWalletDesigner(page);
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '06-wallet-designer-overlay.png'),
      fullPage: false,
    });
  });
});
