/**
 * Unit tests for CardTypeTab router component.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CardTypeTab } from '@/components/wallet/studio/CardTypeTab';
import { getDefaultCardTypeConfig } from '@/components/wallet/types/card-type-config';
import type { CardType } from '@/components/wallet/types/unified-state';

describe('CardTypeTab', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders StampTab for stamp card type', () => {
    const config = getDefaultCardTypeConfig('stamp');
    render(<CardTypeTab cardType="stamp" config={config} onChange={onChange} />);
    expect(screen.getByText('Configuración de Sellos')).toBeDefined();
  });

  it('renders CashbackTab for cashback card type', () => {
    const config = getDefaultCardTypeConfig('cashback');
    render(<CardTypeTab cardType="cashback" config={config} onChange={onChange} />);
    expect(screen.getByText('Configuración de Cashback')).toBeDefined();
  });

  it('renders CouponTab for coupon card type', () => {
    const config = getDefaultCardTypeConfig('coupon');
    render(<CardTypeTab cardType="coupon" config={config} onChange={onChange} />);
    expect(screen.getByText('Configuración de Cupón')).toBeDefined();
  });

  it('renders VIPTab for vip_membership card type', () => {
    const config = getDefaultCardTypeConfig('vip_membership');
    render(<CardTypeTab cardType="vip_membership" config={config} onChange={onChange} />);
    expect(screen.getByText('Configuración de Membresía VIP')).toBeDefined();
  });

  it('renders GiftTab for gift_certificate card type', () => {
    const config = getDefaultCardTypeConfig('gift_certificate');
    render(<CardTypeTab cardType="gift_certificate" config={config} onChange={onChange} />);
    expect(screen.getByText('Configuración de Tarjeta Regalo')).toBeDefined();
  });

  it('renders AffiliateTab for affiliate card type', () => {
    const config = getDefaultCardTypeConfig('affiliate');
    render(<CardTypeTab cardType="affiliate" config={config} onChange={onChange} />);
    expect(screen.getByText('Configuración de Afiliado')).toBeDefined();
  });

  it('renders DiscountTab for discount card type', () => {
    const config = getDefaultCardTypeConfig('discount');
    render(<CardTypeTab cardType="discount" config={config} onChange={onChange} />);
    expect(screen.getByText('Configuración de Descuentos por Niveles')).toBeDefined();
  });

  it('renders CorporateTab for corporate_discount card type', () => {
    const config = getDefaultCardTypeConfig('corporate_discount');
    render(<CardTypeTab cardType="corporate_discount" config={config} onChange={onChange} />);
    expect(screen.getByText('Configuración de Descuento Corporativo')).toBeDefined();
  });

  it('renders ReferralTab for referral_pass card type', () => {
    const config = getDefaultCardTypeConfig('referral_pass');
    render(<CardTypeTab cardType="referral_pass" config={config} onChange={onChange} />);
    expect(screen.getByText('Configuración de Pase de Referido')).toBeDefined();
  });

  it('renders MultipassTab for multipass card type', () => {
    const config = getDefaultCardTypeConfig('multipass');
    render(<CardTypeTab cardType="multipass" config={config} onChange={onChange} />);
    expect(screen.getByText('Configuración de Multi-Pase')).toBeDefined();
  });

  it('calls onChange when stamp config is updated', () => {
    const config = getDefaultCardTypeConfig('stamp');
    render(<CardTypeTab cardType="stamp" config={config} onChange={onChange} />);

    const input = screen.getByTestId('stamps-required-input');
    fireEvent.change(input, { target: { value: '5' } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ stampsRequired: 5 }));
  });

  it('calls onChange when cashback config is updated', () => {
    const config = getDefaultCardTypeConfig('cashback');
    render(<CardTypeTab cardType="cashback" config={config} onChange={onChange} />);

    const input = screen.getByTestId('cashback-percentage-input');
    fireEvent.change(input, { target: { value: '10' } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ cashbackPercentage: 10 }));
  });

  it('calls onChange when coupon config is updated', () => {
    const config = getDefaultCardTypeConfig('coupon');
    render(<CardTypeTab cardType="coupon" config={config} onChange={onChange} />);

    const input = screen.getByTestId('discount-value-input');
    fireEvent.change(input, { target: { value: '25' } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ discountValue: 25 }));
  });

  it('calls onChange when multipass config is updated', () => {
    const config = getDefaultCardTypeConfig('multipass');
    render(<CardTypeTab cardType="multipass" config={config} onChange={onChange} />);

    const input = screen.getByTestId('bundle-size-input');
    fireEvent.change(input, { target: { value: '15' } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ bundleSize: 15 }));
  });

  it('renders fallback for unsupported card type', () => {
    render(<CardTypeTab cardType={'unknown' as CardType} config={undefined as never} onChange={onChange} />);
    expect(screen.getByText(/Tipo de tarjeta no soportado/)).toBeDefined();
  });
});
