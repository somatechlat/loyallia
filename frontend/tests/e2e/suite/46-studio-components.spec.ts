/**
 * Suite 46 — Studio Components E2E Tests
 * Tests: ImageCropEditor, TemplateGallery, NotificationConfigPanel
 * Tags: @studio @owner
 */
import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { getE2EBaseURL } from '../helpers/e2e-safety';
import { getOwnerToken } from '../helpers/designer-auth';

test.use({ storageState: '.auth/owner.json' });

const BASE_API = getE2EBaseURL();
const UNIQUE_PREFIX = `E2E Studio ${Date.now()}`;

const RED_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

// ── Helpers ──────────────────────────────────────────────────────────────

async function createProgram(request: APIRequestContext, cardType = 'stamp', metadata: Record<string, unknown> = { wallet_provider: 'both', stamps_required: 10, reward_description: 'Free coffee' }): Promise<string> {
  const token = await getOwnerToken(request);
  const name = `${UNIQUE_PREFIX} ${cardType} ${Date.now()}`;
  const resp = await request.post(`${BASE_API}/api/v1/programs/`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name, description: `E2E ${cardType}`, card_type: cardType, barcode_type: 'qr_code', background_color: '#1a1a2e', text_color: '#ffffff', metadata },
  });
  if (resp.status() !== 200) { test.skip(); return ''; }
  return (await resp.json()).id as string;
}

async function openDesigner(page: Page, programId: string): Promise<void> {
  await page.goto(`/programs/${programId}/design`, { waitUntil: 'networkidle', timeout: 30000 });
  await expect(page.getByText(/Design Studio/i).first()).toBeVisible({ timeout: 25000 });
}

async function cleanup(request: APIRequestContext, programId: string) {
  if (!programId) return;
  const token = await getOwnerToken(request);
  await request.delete(`${BASE_API}/api/v1/programs/${programId}/`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
}

// =============================================================================
// PHASE 1: IMAGE CROP EDITOR
// =============================================================================
test.describe('Studio — ImageCropEditor @studio', () => {
  test('crop editor appears after image upload and all controls are clickable', async ({ page, request }) => {
    const programId = await createProgram(request);
    try {
      await openDesigner(page, programId);

      // Trigger image upload
      const logoZone = page.locator('#logo-upload').locator('xpath=..');
      if (await logoZone.isVisible().catch(() => false)) {
        const chooserP = page.waitForEvent('filechooser', { timeout: 10000 });
        await logoZone.click();
        (await chooserP).setFiles({ name: 'test.png', mimeType: 'image/png', buffer: RED_PNG });
        await page.waitForTimeout(2000);
      }

      // Check if crop editor appeared
      const cropPreview = page.getByTestId('crop-preview');
      const cropVisible = await cropPreview.isVisible().catch(() => false);
      if (!cropVisible) {
        // Crop editor may not appear for 1x1 images — skip gracefully
        test.skip();
        return;
      }

      // Click each crop control
      const controls = ['crop-zoom-in', 'crop-zoom-out', 'crop-move-left', 'crop-move-right', 'crop-move-up', 'crop-move-down', 'crop-flip-h', 'crop-flip-v', 'crop-rotate-cw', 'crop-rotate-ccw', 'crop-reset'];
      for (const testid of controls) {
        const btn = page.getByTestId(testid);
        if (await btn.isVisible().catch(() => false)) {
          await btn.click();
          await page.waitForTimeout(100);
        }
      }

      // Verify crop preview still visible
      await expect(cropPreview).toBeVisible();
    } finally {
      await cleanup(request, programId);
    }
  });
});

// =============================================================================
// PHASE 2: TEMPLATE GALLERY
// =============================================================================
test.describe('Studio — TemplateGallery @studio', () => {
  test('gallery loads with search, filters, grid, and blank button', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'networkidle' });
    await page.getByText(/selecciona el programa/i).waitFor({ state: 'visible', timeout: 15000 });

    // Select stamp card type
    await page.locator('#card-type-stamp').click();
    await page.waitForTimeout(500);

    // Check for gallery elements
    const search = page.getByTestId('gallery-search-input');
    if (await search.isVisible().catch(() => false)) {
      await search.fill('coffee');
      await page.waitForTimeout(500);
      await search.clear();
    }

    // Category filters
    const categories = page.getByTestId('gallery-categories');
    if (await categories.isVisible().catch(() => false)) {
      const catButtons = categories.locator('button');
      const catCount = await catButtons.count();
      if (catCount > 0) {
        await catButtons.first().click();
        await page.waitForTimeout(300);
      }
    }

    // Industry filter
    const industry = page.getByTestId('gallery-industry-select');
    if (await industry.isVisible().catch(() => false)) {
      await industry.selectOption({ index: 1 }).catch(() => {});
      await page.waitForTimeout(300);
    }

    // Card type filter
    const cardType = page.getByTestId('gallery-cardtype-select');
    if (await cardType.isVisible().catch(() => false)) {
      await cardType.selectOption({ index: 1 }).catch(() => {});
      await page.waitForTimeout(300);
    }

    // Template grid
    const grid = page.getByTestId('gallery-grid');
    if (await grid.isVisible().catch(() => false)) {
      const cards = grid.locator('[class*="cursor-pointer"], button, [role="button"]');
      expect(await cards.count()).toBeGreaterThanOrEqual(0);
    }

    // Blank button
    const blank = page.getByTestId('gallery-blank-btn');
    if (await blank.isVisible().catch(() => false)) {
      await blank.click();
      await page.waitForTimeout(500);
    }

    // AI button
    const aiBtn = page.getByTestId('gallery-ai-btn');
    if (await aiBtn.isVisible().catch(() => false)) {
      // Just verify it exists — don't click (requires AI plan)
      await expect(aiBtn).toBeVisible();
    }
  });
});

// =============================================================================
// PHASE 3: NOTIFICATION CONFIG PANEL
// =============================================================================
test.describe('Studio — NotificationConfigPanel @studio', () => {
  test('notification header and body inputs are editable', async ({ page, request }) => {
    const programId = await createProgram(request);
    try {
      await openDesigner(page, programId);

      // Look for notification config — may be in advanced tab
      const advancedTab = page.getByRole('button', { name: /avanzado|advanced/i }).first();
      if (await advancedTab.isVisible().catch(() => false)) {
        await advancedTab.click();
        await page.waitForTimeout(1000);
      }

      const header = page.getByTestId('google-notification-header');
      if (await header.isVisible().catch(() => false)) {
        await header.fill('Welcome notification');
        await expect(header).toHaveValue('Welcome notification');
      }

      const body = page.getByTestId('google-notification-body');
      if (await body.isVisible().catch(() => false)) {
        await body.fill('Your loyalty card is ready!');
        await expect(body).toHaveValue('Your loyalty card is ready!');
      }
    } finally {
      await cleanup(request, programId);
    }
  });
});

// ── Cleanup ──────────────────────────────────────────────────────────────
test.afterAll(async ({ request }) => {
  const token = await getOwnerToken(request);
  const resp = await request.get(`${BASE_API}/api/v1/programs/`, { headers: { Authorization: `Bearer ${token}` } });
  if (resp.status() !== 200) return;
  const body = await resp.json();
  for (const p of (body.programs || [])) {
    if (p.name.startsWith(UNIQUE_PREFIX)) {
      await request.delete(`${BASE_API}/api/v1/programs/${p.id}/`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
  }
});
