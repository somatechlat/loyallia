/**
 * Unit tests for CardTypeTab router component.
 * NO mocks — all tests use real components and real code paths.
 */

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { CardTypeTab } from '@/components/wallet/studio/CardTypeTab';
import { getDefaultCardTypeConfig } from '@/components/wallet/types/card-type-config';
import type { CardType } from '@/components/wallet/types/unified-state';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider>{children}</I18nProvider>
);

describe('CardTypeTab', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders StampTab for stamp card type', () => {
    const config = getDefaultCardTypeConfig('stamp');
    render(<Wrapper><CardTypeTab cardType="stamp" config={config} onChange={() => {}} /></Wrapper>);
    expect(screen.getByText('Stamp Configuration')).toBeDefined();
  });

  it('renders CashbackTab for cashback card type', () => {
    const config = getDefaultCardTypeConfig('cashback');
    render(<Wrapper><CardTypeTab cardType="cashback" config={config} onChange={() => {}} /></Wrapper>);
    expect(screen.getByText('Cashback Configuration')).toBeDefined();
  });

  it('renders CouponTab for coupon card type', () => {
    const config = getDefaultCardTypeConfig('coupon');
    render(<Wrapper><CardTypeTab cardType="coupon" config={config} onChange={() => {}} /></Wrapper>);
    expect(screen.getByText('Coupon Configuration')).toBeDefined();
  });

  it('renders VIPTab for vip_membership card type', () => {
    const config = getDefaultCardTypeConfig('vip_membership');
    render(<Wrapper><CardTypeTab cardType="vip_membership" config={config} onChange={() => {}} /></Wrapper>);
    expect(screen.getByText('VIP Membership Configuration')).toBeDefined();
  });

  it('renders GiftTab for gift_certificate card type', () => {
    const config = getDefaultCardTypeConfig('gift_certificate');
    render(<Wrapper><CardTypeTab cardType="gift_certificate" config={config} onChange={() => {}} /></Wrapper>);
    expect(screen.getByText('Gift Card Configuration')).toBeDefined();
  });

  it('renders AffiliateTab for affiliate card type', () => {
    const config = getDefaultCardTypeConfig('affiliate');
    render(<Wrapper><CardTypeTab cardType="affiliate" config={config} onChange={() => {}} /></Wrapper>);
    expect(screen.getByText('Affiliate Configuration')).toBeDefined();
  });

  it('renders DiscountTab for discount card type', () => {
    const config = getDefaultCardTypeConfig('discount');
    render(<Wrapper><CardTypeTab cardType="discount" config={config} onChange={() => {}} /></Wrapper>);
    expect(screen.getByText('Tiered Discount Configuration')).toBeDefined();
  });

  it('renders CorporateTab for corporate_discount card type', () => {
    const config = getDefaultCardTypeConfig('corporate_discount');
    render(<Wrapper><CardTypeTab cardType="corporate_discount" config={config} onChange={() => {}} /></Wrapper>);
    expect(screen.getByText('Corporate Discount Configuration')).toBeDefined();
  });

  it('renders ReferralTab for referral_pass card type', () => {
    const config = getDefaultCardTypeConfig('referral_pass');
    render(<Wrapper><CardTypeTab cardType="referral_pass" config={config} onChange={() => {}} /></Wrapper>);
    expect(screen.getByText('Referral Pass Configuration')).toBeDefined();
  });

  it('renders MultipassTab for multipass card type', () => {
    const config = getDefaultCardTypeConfig('multipass');
    render(<Wrapper><CardTypeTab cardType="multipass" config={config} onChange={() => {}} /></Wrapper>);
    expect(screen.getByText('Multipass Configuration')).toBeDefined();
  });

  it('calls onChange when stamp config is updated', () => {
    let changedConfig: Partial<typeof config> | null = null;
    const config = getDefaultCardTypeConfig('stamp');
    const onChange = (c: Partial<typeof config>) => { changedConfig = c; };
    render(<Wrapper><CardTypeTab cardType="stamp" config={config} onChange={onChange} /></Wrapper>);

    const input = screen.getByTestId('stamps-required-input');
    fireEvent.change(input, { target: { value: '5' } });

    expect(changedConfig).toMatchObject({ stampsRequired: 5 });
  });

  it('calls onChange when cashback config is updated', () => {
    let changedConfig: Partial<typeof config> | null = null;
    const config = getDefaultCardTypeConfig('cashback');
    const onChange = (c: Partial<typeof config>) => { changedConfig = c; };
    render(<Wrapper><CardTypeTab cardType="cashback" config={config} onChange={onChange} /></Wrapper>);

    const input = screen.getByTestId('cashback-percentage-input');
    fireEvent.change(input, { target: { value: '10' } });

    expect(changedConfig).toMatchObject({ cashbackPercentage: 10 });
  });

  it('calls onChange when coupon config is updated', () => {
    let changedConfig: Partial<typeof config> | null = null;
    const config = getDefaultCardTypeConfig('coupon');
    const onChange = (c: Partial<typeof config>) => { changedConfig = c; };
    render(<Wrapper><CardTypeTab cardType="coupon" config={config} onChange={onChange} /></Wrapper>);

    const input = screen.getByTestId('discount-value-input');
    fireEvent.change(input, { target: { value: '25' } });

    expect(changedConfig).toMatchObject({ discountValue: 25 });
  });

  it('calls onChange when multipass config is updated', () => {
    let changedConfig: Partial<typeof config> | null = null;
    const config = getDefaultCardTypeConfig('multipass');
    const onChange = (c: Partial<typeof config>) => { changedConfig = c; };
    render(<Wrapper><CardTypeTab cardType="multipass" config={config} onChange={onChange} /></Wrapper>);

    const input = screen.getByTestId('bundle-size-input');
    fireEvent.change(input, { target: { value: '15' } });

    expect(changedConfig).toMatchObject({ bundleSize: 15 });
  });

  it('renders fallback for unsupported card type', () => {
    render(<Wrapper><CardTypeTab cardType={'unknown' as CardType} config={undefined as never} onChange={() => {}} /></Wrapper>);
    expect(screen.getByText('Unsupported card type: unknown')).toBeDefined();
  });
});
