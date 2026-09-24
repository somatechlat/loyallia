/**
 * Unit tests for the 10 card-type config tabs.
 *
 * Each tab is a pure `{ config, onChange }` form. These locks cover the
 * controls the E2E suites only smoke-test: number clamping, toggle enums,
 * list add/remove, and the exported label resolvers.
 */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { getDefaultCardTypeConfig } from '@/components/wallet/types/card-type-config';
import type {
  StampCardConfig,
  CashbackCardConfig,
  CouponCardConfig,
  AffiliateCardConfig,
  DiscountCardConfig,
  GiftCertificateCardConfig,
  VipMembershipCardConfig,
  CorporateDiscountCardConfig,
  ReferralPassCardConfig,
  MultipassCardConfig,
} from '@/components/wallet/types/card-type-config';

import { StampTab } from '@/components/wallet/studio/tabs/StampTab';
import { CashbackTab } from '@/components/wallet/studio/tabs/CashbackTab';
import { CouponTab } from '@/components/wallet/studio/tabs/CouponTab';
import { AffiliateTab } from '@/components/wallet/studio/tabs/AffiliateTab';
import { DiscountTab } from '@/components/wallet/studio/tabs/DiscountTab';
import { GiftTab, resolveOccasionLabel } from '@/components/wallet/studio/tabs/GiftTab';
import { VIPTab, resolvePerkLabel } from '@/components/wallet/studio/tabs/VIPTab';
import { CorporateTab } from '@/components/wallet/studio/tabs/CorporateTab';
import { ReferralTab } from '@/components/wallet/studio/tabs/ReferralTab';
import { MultipassTab } from '@/components/wallet/studio/tabs/MultipassTab';

function renderTab(node: React.ReactElement) {
  return render(<I18nProvider>{node}</I18nProvider>);
}

function fill(testId: string, value: string) {
  fireEvent.change(screen.getByTestId(testId), { target: { value } });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ── StampTab ────────────────────────────────────────────────────────────────

describe('StampTab', () => {
  const config = getDefaultCardTypeConfig('stamp') as StampCardConfig;

  it('clamps stampsRequired into range and ignores out-of-range values', () => {
    const onChange = vi.fn();
    renderTab(<StampTab config={config} onChange={onChange} />);
    fill('stamps-required-input', '7');
    expect(onChange).toHaveBeenLastCalledWith({ stampsRequired: 7 });
    onChange.mockClear();
    fill('stamps-required-input', '0');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('switches stamp type and exposes consumption field only for consumption', () => {
    const onChange = vi.fn();
    const { rerender } = renderTab(<StampTab config={config} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('stamp-type-consumption'));
    expect(onChange).toHaveBeenLastCalledWith({ stampType: 'consumption' });

    rerender(
      <I18nProvider>
        <StampTab config={{ ...config, stampType: 'consumption' }} onChange={onChange} />
      </I18nProvider>
    );
    expect(screen.getByTestId('consumption-per-stamp-input')).toBeDefined();
  });

  it('picks a stamp shape and grid layout', () => {
    const onChange = vi.fn();
    renderTab(<StampTab config={config} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('shape-option-star'));
    expect(onChange).toHaveBeenLastCalledWith({ stampShape: 'star' });
    fireEvent.click(screen.getByTestId('layout-4x4'));
    expect(onChange).toHaveBeenLastCalledWith({ stampGridLayout: '4x4' });
  });
});

// ── CashbackTab ─────────────────────────────────────────────────────────────

describe('CashbackTab', () => {
  const config = getDefaultCardTypeConfig('cashback') as CashbackCardConfig;

  it('updates percentage from slider and number input', () => {
    const onChange = vi.fn();
    renderTab(<CashbackTab config={config} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('cashback-percentage-slider'), { target: { value: '15' } });
    expect(onChange).toHaveBeenLastCalledWith({ cashbackPercentage: 15 });
    fireEvent.change(screen.getByTestId('cashback-percentage-input'), { target: { value: '40' } });
    expect(onChange).toHaveBeenLastCalledWith({ cashbackPercentage: 40 });
  });

  it('shows credit expiry days only for defined_period', () => {
    const onChange = vi.fn();
    const { rerender } = renderTab(
      <CashbackTab config={{ ...config, creditExpiryType: 'unlimited' }} onChange={onChange} />
    );
    expect(screen.queryByTestId('credit-expiry-input')).toBeNull();

    rerender(
      <I18nProvider>
        <CashbackTab
          config={{ ...config, creditExpiryType: 'defined_period' }}
          onChange={onChange}
        />
      </I18nProvider>
    );
    expect(screen.getByTestId('credit-expiry-input')).toBeDefined();
    fireEvent.click(screen.getByTestId('credit-expiry-type-unlimited'));
    expect(onChange).toHaveBeenLastCalledWith({ creditExpiryType: 'unlimited' });
  });
});

// ── CouponTab ───────────────────────────────────────────────────────────────

describe('CouponTab', () => {
  const config = getDefaultCardTypeConfig('coupon') as CouponCardConfig;

  it('toggles discount type between percentage and fixed', () => {
    const onChange = vi.fn();
    renderTab(<CouponTab config={config} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('discount-type-fixed'));
    expect(onChange).toHaveBeenLastCalledWith({ discountType: 'fixed_amount' });
    fireEvent.click(screen.getByTestId('discount-type-percentage'));
    expect(onChange).toHaveBeenLastCalledWith({ discountType: 'percentage' });
  });

  it('picks cut line and badge style', () => {
    const onChange = vi.fn();
    renderTab(<CouponTab config={config} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('cut-line-zigzag'));
    expect(onChange).toHaveBeenLastCalledWith({ cutLineStyle: 'zigzag' });
    fireEvent.click(screen.getByTestId('badge-style-pill'));
    expect(onChange).toHaveBeenLastCalledWith({ discountBadgeStyle: 'pill' });
  });
});

// ── AffiliateTab ────────────────────────────────────────────────────────────

describe('AffiliateTab', () => {
  const config = getDefaultCardTypeConfig('affiliate') as AffiliateCardConfig;

  it('edits code pattern, benefits and referral banner', () => {
    const onChange = vi.fn();
    renderTab(<AffiliateTab config={config} onChange={onChange} />);
    fill('affiliate-code-input', 'AFI-*');
    expect(onChange).toHaveBeenLastCalledWith({ affiliateCodePattern: 'AFI-*' });
    fill('benefits-description-input', '20% off');
    expect(onChange).toHaveBeenLastCalledWith({ benefitsDescription: '20% off' });
    fill('banner-text-input', 'Refiere y gana');
    expect(onChange).toHaveBeenLastCalledWith({ referralBannerText: 'Refiere y gana' });
  });
});

// ── DiscountTab ─────────────────────────────────────────────────────────────

describe('DiscountTab', () => {
  const config = getDefaultCardTypeConfig('discount') as DiscountCardConfig;

  it('adds and removes tiers', () => {
    const onChange = vi.fn();
    renderTab(<DiscountTab config={config} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('add-tier-btn'));
    expect(onChange).toHaveBeenLastCalledWith({
      tiers: [...config.tiers, expect.objectContaining({ tierName: expect.any(String) })],
    });

    const withTwo: DiscountCardConfig = {
      ...config,
      tiers: [
        { tierName: 'Bronze', threshold: 0, discountPercentage: 5 },
        { tierName: 'Silver', threshold: 100, discountPercentage: 10 },
      ],
    };
    onChange.mockClear();
    renderTab(<DiscountTab config={withTwo} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('remove-tier-0'));
    expect(onChange).toHaveBeenLastCalledWith({ tiers: [withTwo.tiers[1]!] });
  });
});

// ── GiftTab ─────────────────────────────────────────────────────────────────

describe('GiftTab', () => {
  const config = getDefaultCardTypeConfig('gift_certificate') as GiftCertificateCardConfig;

  it('adds and removes denominations', () => {
    const onChange = vi.fn();
    renderTab(<GiftTab config={config} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('denomination-input'), { target: { value: '25' } });
    fireEvent.click(screen.getByTestId('add-denomination-btn'));
    expect(onChange).toHaveBeenLastCalledWith({ denominations: [...config.denominations, 25] });

    const withOne: GiftCertificateCardConfig = { ...config, denominations: [50] };
    onChange.mockClear();
    renderTab(<GiftTab config={withOne} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('remove-denomination-0'));
    expect(onChange).toHaveBeenLastCalledWith({ denominations: [] });
  });

  it('resolveOccasionLabel falls back to the raw value for unknown occasions', () => {
    const t = (key: string) => `T:${key}`;
    expect(resolveOccasionLabel('unknown-occasion', t)).toBe('unknown-occasion');
  });
});

// ── VIPTab ──────────────────────────────────────────────────────────────────

describe('VIPTab', () => {
  const config = getDefaultCardTypeConfig('vip_membership') as VipMembershipCardConfig;

  it('edits membership name and fees', () => {
    const onChange = vi.fn();
    renderTab(<VIPTab config={config} onChange={onChange} />);
    fill('membership-name-input', 'Gold');
    expect(onChange).toHaveBeenLastCalledWith({ membershipName: 'Gold' });
    fill('monthly-fee-input', '29');
    expect(onChange).toHaveBeenLastCalledWith({ monthlyFee: 29 });
  });

  it('adds a common perk and removes it by index', () => {
    const onChange = vi.fn();
    renderTab(<VIPTab config={{ ...config, perks: [] }} onChange={onChange} />);
    const boxes = screen.getAllByTestId(/^perk-check-/);
    fireEvent.click(boxes[0]!);
    expect(onChange).toHaveBeenCalled();

    onChange.mockClear();
    renderTab(<VIPTab config={{ ...config, perks: ['priority_access'] }} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('remove-perk-0'));
    expect(onChange).toHaveBeenLastCalledWith({ perks: [] });
  });

  it('resolvePerkLabel maps legacy Spanish labels and falls back to raw', () => {
    const t = (key: string) => `T:${key}`;
    expect(resolvePerkLabel('priority_access', t)).toBe('T:wallet.studio.vip.perkPriorityAccess');
    expect(resolvePerkLabel('Regalos de cumpleaños', t)).toBe('T:wallet.studio.vip.perkBirthdayGifts');
    expect(resolvePerkLabel('totally-unknown', t)).toBe('totally-unknown');
  });
});

// ── CorporateTab ────────────────────────────────────────────────────────────

describe('CorporateTab', () => {
  const config = getDefaultCardTypeConfig('corporate_discount') as CorporateDiscountCardConfig;

  it('edits company name and discount percentage', () => {
    const onChange = vi.fn();
    renderTab(<CorporateTab config={config} onChange={onChange} />);
    fill('company-name-input', 'Acme');
    expect(onChange).toHaveBeenLastCalledWith({ companyName: 'Acme' });
    fill('corporate-discount-input', '25');
    expect(onChange).toHaveBeenLastCalledWith({ corporateDiscountPercentage: 25 });
  });

  it('toggles employee-id requirement and security seal', () => {
    const onChange = vi.fn();
    renderTab(<CorporateTab config={config} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('employee-id-toggle'));
    expect(onChange).toHaveBeenLastCalledWith({ employeeIdRequired: !config.employeeIdRequired });
    fireEvent.click(screen.getByTestId('security-seal-toggle'));
    expect(onChange).toHaveBeenCalled();
  });
});

// ── ReferralTab ─────────────────────────────────────────────────────────────

describe('ReferralTab', () => {
  const config = getDefaultCardTypeConfig('referral_pass') as ReferralPassCardConfig;

  it('edits rewards, code pattern and max referrals', () => {
    const onChange = vi.fn();
    renderTab(<ReferralTab config={config} onChange={onChange} />);
    fill('referrer-reward-input', '$10');
    expect(onChange).toHaveBeenLastCalledWith({ referrerReward: '$10' });
    fill('referee-reward-input', '20%');
    expect(onChange).toHaveBeenLastCalledWith({ refereeReward: '20%' });
    fill('referral-code-input', 'REF-*');
    expect(onChange).toHaveBeenLastCalledWith({ referralCodePattern: 'REF-*' });
    fill('max-referrals-input', '7');
    expect(onChange).toHaveBeenLastCalledWith({ maxReferralsPerCustomer: 7 });
  });
});

// ── MultipassTab ────────────────────────────────────────────────────────────

describe('MultipassTab', () => {
  const config = getDefaultCardTypeConfig('multipass') as MultipassCardConfig;

  it('edits bundle size, price and pass label', () => {
    const onChange = vi.fn();
    renderTab(<MultipassTab config={config} onChange={onChange} />);
    fill('bundle-size-input', '12');
    expect(onChange).toHaveBeenLastCalledWith({ bundleSize: 12 });
    fill('bundle-price-input', '30');
    expect(onChange).toHaveBeenLastCalledWith({ bundlePrice: 30 });
    fill('pass-label-input', 'Café');
    expect(onChange).toHaveBeenLastCalledWith({ passTypeLabel: 'Café' });
  });

  it('picks badge and indicator styles', () => {
    const onChange = vi.fn();
    renderTab(<MultipassTab config={config} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('badge-style-numeric'));
    expect(onChange).toHaveBeenLastCalledWith({ bundleBadgeStyle: 'numeric' });
    fireEvent.click(screen.getByTestId('indicator-style-minimal'));
    expect(onChange).toHaveBeenCalled();
  });
});
