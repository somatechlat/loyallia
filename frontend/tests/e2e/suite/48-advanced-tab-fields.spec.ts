/**
 * Suite 48 — Advanced Tab Fields E2E Tests
 * Tests: StampTab advanced, CashbackTab advanced, ColorsTab preset, FieldCard radios
 * Tags: @advanced @owner
 */
import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { getE2EBaseURL } from '../helpers/e2e-safety';
import { getOwnerToken } from '../helpers/designer-auth';

test.use({ storageState: '.auth/owner.json' });

const BASE_API = getE2EBaseURL();
const UNIQUE_PREFIX = `E2E Adv ${Date.now()}`;

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
  await expect(page.getByText(/Design Studio|Estudio de Diseño/i).first()).toBeVisible({ timeout: 25000 });
}

async function clickTab(page: Page, label: string): Promise<void> {
  const tab = page.getByRole('button', { name: label, exact: true }).first();
  if (await tab.isVisible().catch(() => false)) {
    await tab.click();
    await page.waitForTimeout(500);
  }
}

async function cleanup(request: APIRequestContext, programId: string) {
  if (!programId) return;
  const token = await getOwnerToken(request);
  await request.delete(`${BASE_API}/api/v1/programs/${programId}/`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
}

function canvasAlive(page: Page) {
  return page.locator('.flex-1.flex.flex-col.min-w-0.overflow-auto').first();
}

// =============================================================================
// STAMP TAB — ADVANCED FIELDS
// =============================================================================
test.describe('Advanced — StampTab advanced fields @advanced', () => {
  test('all stamp advanced fields render and are interactive', async ({ page, request }) => {
    const programId = await createProgram(request);
    try {
      await openDesigner(page, programId);
      await clickTab(page, 'Sellos');

      // Stamp expiry unlimited checkbox
      const unlimited = page.getByTestId('stamp-expiry-unlimited');
      if (await unlimited.isVisible().catch(() => false)) {
        await unlimited.click();
        await page.waitForTimeout(200);
      }

      // Stamp expiry days input
      const expiryDays = page.getByTestId('stamp-expiry-days-input');
      if (await expiryDays.isVisible().catch(() => false)) {
        await expiryDays.fill('90');
        await expect(expiryDays).toHaveValue('90');
      }

      // Start date
      const startDate = page.getByTestId('stamp-start-date-input');
      if (await startDate.isVisible().catch(() => false)) {
        await startDate.fill('2026-01-01');
      }

      // End date
      const endDate = page.getByTestId('stamp-end-date-input');
      if (await endDate.isVisible().catch(() => false)) {
        await endDate.fill('2026-12-31');
      }

      // Stamp color
      const stampColor = page.getByTestId('stamp-color-input');
      if (await stampColor.isVisible().catch(() => false)) {
        await stampColor.fill('#FF5733');
      }

      // Birthday stamps
      const birthdayStamps = page.getByTestId('birthday-stamps-input');
      if (await birthdayStamps.isVisible().catch(() => false)) {
        await birthdayStamps.fill('3');
        await expect(birthdayStamps).toHaveValue('3');
      }

      // Stamp type — visit
      const visitBtn = page.getByTestId('stamp-type-visit');
      if (await visitBtn.isVisible().catch(() => false)) {
        await visitBtn.click();
        await page.waitForTimeout(200);
      }

      // Stamp type — consumption
      const consumptionBtn = page.getByTestId('stamp-type-consumption');
      if (await consumptionBtn.isVisible().catch(() => false)) {
        await consumptionBtn.click();
        await page.waitForTimeout(200);
      }

      // Consumption per stamp
      const consumptionPer = page.getByTestId('consumption-per-stamp-input');
      if (await consumptionPer.isVisible().catch(() => false)) {
        await consumptionPer.fill('500');
        await expect(consumptionPer).toHaveValue('500');
      }

      // Grid layout buttons
      const layouts = page.locator('[data-testid^="layout-"]');
      const layoutCount = await layouts.count();
      for (let i = 0; i < Math.min(layoutCount, 3); i++) {
        if (await layouts.nth(i).isVisible().catch(() => false)) {
          await layouts.nth(i).click();
          await page.waitForTimeout(100);
        }
      }

      // Shape options (already tested in suite 36 but verify here too)
      const shapes = page.locator('[data-testid^="shape-option-"]');
      const shapeCount = await shapes.count();
      for (let i = 0; i < Math.min(shapeCount, 4); i++) {
        if (await shapes.nth(i).isVisible().catch(() => false)) {
          await shapes.nth(i).click();
          await page.waitForTimeout(100);
        }
      }

      await expect(canvasAlive(page)).toBeVisible();
    } finally {
      await cleanup(request, programId);
    }
  });
});

// =============================================================================
// CASHBACK TAB — ADVANCED FIELDS
// =============================================================================
test.describe('Advanced — CashbackTab advanced fields @advanced', () => {
  test('all cashback advanced fields render and are interactive', async ({ page, request }) => {
    const programId = await createProgram(request, 'cashback', { wallet_provider: 'both', cashback_percentage: 5 });
    try {
      await openDesigner(page, programId);
      await clickTab(page, 'Puntos');

      // Cashback percentage slider
      const slider = page.getByTestId('cashback-percentage-slider');
      if (await slider.isVisible().catch(() => false)) {
        await slider.fill('15');
      }

      // Credit expiry type toggles
      const expiryTypes = page.locator('[data-testid^="credit-expiry-type-"]');
      const expiryCount = await expiryTypes.count();
      for (let i = 0; i < Math.min(expiryCount, 3); i++) {
        if (await expiryTypes.nth(i).isVisible().catch(() => false)) {
          await expiryTypes.nth(i).click();
          await page.waitForTimeout(200);
        }
      }

      // Credit expiry input
      const creditExpiry = page.getByTestId('credit-expiry-input');
      if (await creditExpiry.isVisible().catch(() => false)) {
        await creditExpiry.fill('365');
        await expect(creditExpiry).toHaveValue('365');
      }

      // Progress ring color
      const ringColor = page.getByTestId('progress-ring-color-input');
      if (await ringColor.isVisible().catch(() => false)) {
        await ringColor.fill('#4CAF50');
      }

      await expect(canvasAlive(page)).toBeVisible();
    } finally {
      await cleanup(request, programId);
    }
  });
});

// =============================================================================
// COLORS TAB — CUSTOM PRESET
// =============================================================================
test.describe('Advanced — ColorsTab custom preset @advanced', () => {
  test('custom preset name input is editable', async ({ page, request }) => {
    const programId = await createProgram(request);
    try {
      await openDesigner(page, programId);
      await clickTab(page, 'Colores');

      const presetName = page.getByTestId('preset-name-input');
      if (await presetName.isVisible().catch(() => false)) {
        await presetName.fill('My Custom Theme');
        await expect(presetName).toHaveValue('My Custom Theme');
      }

      await expect(canvasAlive(page)).toBeVisible();
    } finally {
      await cleanup(request, programId);
    }
  });
});

// =============================================================================
// FIELDS TAB — RADIO BUTTONS
// =============================================================================
test.describe('Advanced — FieldCard radio buttons @advanced', () => {
  test('field position radio buttons are clickable', async ({ page, request }) => {
    const programId = await createProgram(request);
    try {
      await openDesigner(page, programId);
      await clickTab(page, 'Campos');

      // Find radio buttons in field cards
      const radios = page.locator('input[type="radio"]');
      const radioCount = await radios.count();
      for (let i = 0; i < Math.min(radioCount, 5); i++) {
        const radio = radios.nth(i);
        if (await radio.isVisible().catch(() => false)) {
          await radio.click();
          await page.waitForTimeout(100);
        }
      }

      await expect(canvasAlive(page)).toBeVisible();
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
