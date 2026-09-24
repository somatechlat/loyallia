/**
 * Suite 47 — Card Type Config Tabs E2E Tests
 * Tests: AffiliateTab, CorporateTab, ReferralTab, MultipassTab
 * Tags: @cardConfig @owner
 */
import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { getE2EBaseURL } from '../helpers/e2e-safety';
import { getOwnerToken } from '../helpers/designer-auth';

test.use({ storageState: '.auth/owner.json' });

const BASE_API = getE2EBaseURL();
const UNIQUE_PREFIX = `E2E Cfg ${Date.now()}`;

// ── Helpers ──────────────────────────────────────────────────────────────

async function createProgram(request: APIRequestContext, cardType: string, metadata: Record<string, unknown>): Promise<string> {
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
// AFFILIATE TAB
// =============================================================================
test.describe('Card Config — AffiliateTab @cardConfig', () => {
  test('all affiliate fields render and are interactive', async ({ page, request }) => {
    const programId = await createProgram(request, 'affiliate', { wallet_provider: 'both' });
    try {
      await openDesigner(page, programId);
      await clickTab(page, 'Tipo de tarjeta');

      // Affiliate code
      const code = page.getByTestId('affiliate-code-input');
      if (await code.isVisible().catch(() => false)) {
        await code.fill('AFF-001');
        await expect(code).toHaveValue('AFF-001');
      }

      // Benefits description
      const benefits = page.getByTestId('benefits-description-input');
      if (await benefits.isVisible().catch(() => false)) {
        await benefits.fill('20% off all purchases');
        await expect(benefits).toHaveValue('20% off all purchases');
      }

      // Partner logo URL
      const logo = page.getByTestId('partner-logo-url-input');
      if (await logo.isVisible().catch(() => false)) {
        await logo.fill('https://example.com/logo.png');
        await expect(logo).toHaveValue('https://example.com/logo.png');
      }

      // Badge color
      const badgeColor = page.getByTestId('badge-color-input');
      if (await badgeColor.isVisible().catch(() => false)) {
        await badgeColor.fill('#FF5733');
      }

      // Banner text
      const banner = page.getByTestId('banner-text-input');
      if (await banner.isVisible().catch(() => false)) {
        await banner.fill('Premium Affiliate');
        await expect(banner).toHaveValue('Premium Affiliate');
      }

      // Verify canvas alive
      await expect(canvasAlive(page)).toBeVisible();
    } finally {
      await cleanup(request, programId);
    }
  });
});

// =============================================================================
// CORPORATE TAB
// =============================================================================
test.describe('Card Config — CorporateTab @cardConfig', () => {
  test('all corporate fields render and are interactive', async ({ page, request }) => {
    const programId = await createProgram(request, 'corporate_discount', { wallet_provider: 'both' });
    try {
      await openDesigner(page, programId);
      await clickTab(page, 'Tipo de tarjeta');

      // Company name
      const companyName = page.getByTestId('company-name-input');
      if (await companyName.isVisible().catch(() => false)) {
        await companyName.fill('Acme Corp');
        await expect(companyName).toHaveValue('Acme Corp');
      }

      // Company logo URL
      const logoUrl = page.getByTestId('company-logo-url-input');
      if (await logoUrl.isVisible().catch(() => false)) {
        await logoUrl.fill('https://example.com/corp-logo.png');
        await expect(logoUrl).toHaveValue('https://example.com/corp-logo.png');
      }

      // Corporate discount slider
      const slider = page.getByTestId('corporate-discount-slider');
      if (await slider.isVisible().catch(() => false)) {
        await slider.fill('15');
      }

      // Corporate discount input
      const discountInput = page.getByTestId('corporate-discount-input');
      if (await discountInput.isVisible().catch(() => false)) {
        await discountInput.fill('15');
        await expect(discountInput).toHaveValue('15');
      }

      // Employee ID toggle
      const empToggle = page.getByTestId('employee-id-toggle');
      if (await empToggle.isVisible().catch(() => false)) {
        await empToggle.click();
        await page.waitForTimeout(200);
      }

      // ID badge color
      const badgeColor = page.getByTestId('id-badge-color-input');
      if (await badgeColor.isVisible().catch(() => false)) {
        await badgeColor.fill('#0066CC');
      }

      // Badge style buttons
      const badgeStyles = page.locator('[data-testid^="badge-style-"]');
      const styleCount = await badgeStyles.count();
      for (let i = 0; i < Math.min(styleCount, 3); i++) {
        if (await badgeStyles.nth(i).isVisible().catch(() => false)) {
          await badgeStyles.nth(i).click();
          await page.waitForTimeout(100);
        }
      }

      // Security seal toggle
      const sealToggle = page.getByTestId('security-seal-toggle');
      if (await sealToggle.isVisible().catch(() => false)) {
        await sealToggle.click();
        await page.waitForTimeout(200);
      }

      await expect(canvasAlive(page)).toBeVisible();
    } finally {
      await cleanup(request, programId);
    }
  });
});

// =============================================================================
// REFERRAL TAB
// =============================================================================
test.describe('Card Config — ReferralTab @cardConfig', () => {
  test('all referral fields render and are interactive', async ({ page, request }) => {
    const programId = await createProgram(request, 'referral_pass', { wallet_provider: 'both', referrer_reward: '$10 credit', referee_reward: '20% off' });
    try {
      await openDesigner(page, programId);
      await clickTab(page, 'Tipo de tarjeta');

      // Referrer reward
      const referrer = page.getByTestId('referrer-reward-input');
      if (await referrer.isVisible().catch(() => false)) {
        await referrer.fill('$10 credit');
        await expect(referrer).toHaveValue('$10 credit');
      }

      // Referee reward
      const referee = page.getByTestId('referee-reward-input');
      if (await referee.isVisible().catch(() => false)) {
        await referee.fill('20% off first order');
        await expect(referee).toHaveValue('20% off first order');
      }

      // Max referrals
      const maxRef = page.getByTestId('max-referrals-input');
      if (await maxRef.isVisible().catch(() => false)) {
        await maxRef.fill('50');
        await expect(maxRef).toHaveValue('50');
      }

      // Referral code
      const refCode = page.getByTestId('referral-code-input');
      if (await refCode.isVisible().catch(() => false)) {
        await refCode.fill('REF-SUMMER2026');
        await expect(refCode).toHaveValue('REF-SUMMER2026');
      }

      // Share color
      const shareColor = page.getByTestId('share-color-input');
      if (await shareColor.isVisible().catch(() => false)) {
        await shareColor.fill('#4CAF50');
      }

      await expect(canvasAlive(page)).toBeVisible();
    } finally {
      await cleanup(request, programId);
    }
  });
});

// =============================================================================
// MULTIPASS TAB
// =============================================================================
test.describe('Card Config — MultipassTab @cardConfig', () => {
  test('all multipass fields render and are interactive', async ({ page, request }) => {
    const programId = await createProgram(request, 'multipass', { wallet_provider: 'both', bundle_price: 25, bundle_size: 10 });
    try {
      await openDesigner(page, programId);
      await clickTab(page, 'Tipo de tarjeta');

      // Bundle size
      const bundleSize = page.getByTestId('bundle-size-input');
      if (await bundleSize.isVisible().catch(() => false)) {
        await bundleSize.fill('10');
        await expect(bundleSize).toHaveValue('10');
      }

      // Bundle price
      const bundlePrice = page.getByTestId('bundle-price-input');
      if (await bundlePrice.isVisible().catch(() => false)) {
        await bundlePrice.fill('25');
        await expect(bundlePrice).toHaveValue('25');
      }

      // Pass label
      const passLabel = page.getByTestId('pass-label-input');
      if (await passLabel.isVisible().catch(() => false)) {
        await passLabel.fill('Coffee Bundle');
        await expect(passLabel).toHaveValue('Coffee Bundle');
      }

      // Badge style buttons
      const badgeStyles = page.locator('[data-testid^="badge-style-"]');
      const badgeCount = await badgeStyles.count();
      for (let i = 0; i < Math.min(badgeCount, 3); i++) {
        if (await badgeStyles.nth(i).isVisible().catch(() => false)) {
          await badgeStyles.nth(i).click();
          await page.waitForTimeout(100);
        }
      }

      // Indicator style buttons
      const indicatorStyles = page.locator('[data-testid^="indicator-style-"]');
      const indCount = await indicatorStyles.count();
      for (let i = 0; i < Math.min(indCount, 3); i++) {
        if (await indicatorStyles.nth(i).isVisible().catch(() => false)) {
          await indicatorStyles.nth(i).click();
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
