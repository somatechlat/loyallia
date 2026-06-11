/**
 * Unit tests for useWalletStudio hook.
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWalletStudio } from '@/hooks/useWalletStudio';
import type { WalletTemplate } from '@/components/wallet/types/templates';

describe('useWalletStudio', () => {
  it('default state has version 2', () => {
    const { result } = renderHook(() => useWalletStudio());

    expect(result.current.state.version).toBe(2);
  });

  it('default state uses stamp card type with defaults', () => {
    const { result } = renderHook(() => useWalletStudio());

    expect(result.current.state.cardType).toBe('stamp');
    expect(result.current.state.cardTypeConfig.cardType).toBe('stamp');
    expect((result.current.state.cardTypeConfig as Extract<typeof result.current.state.cardTypeConfig, { cardType: 'stamp' }>).stampsRequired).toBe(10);
  });

  it('updateColors merges partial colors', () => {
    const { result } = renderHook(() => useWalletStudio());

    act(() => {
      result.current.updateColors({ accent: '#FF0000' });
    });

    expect(result.current.state.colors.accent).toBe('#FF0000');
    expect(result.current.state.colors.background).toBe('#1A1A1A');
    expect(result.current.state.ui.isModified).toBe(true);
  });

  it('updateFields replaces fields', () => {
    const { result } = renderHook(() => useWalletStudio());

    const newFields = [
      {
        id: 'f1',
        label: 'Test',
        value: 'Value',
        fieldGroup: 'header' as const,
        order: 0,
        showOnApple: true,
        showOnGoogle: true,
        isDynamic: false,
        dataType: 'text',
        appleOptions: {},
        googleOptions: { isPredefined: false },
        notifications: {},
        formatting: { isLink: false },
      },
    ];

    act(() => {
      result.current.updateFields(newFields);
    });

    expect(result.current.state.fields).toHaveLength(1);
    expect(result.current.state.fields[0]!.label).toBe('Test');
    expect(result.current.state.ui.isModified).toBe(true);
  });

  it('updateFields supports functional updater', () => {
    const { result } = renderHook(() => useWalletStudio());

    act(() => {
      result.current.updateFields((prev) => [
        ...prev,
        {
          id: 'f2',
          label: 'Added',
          value: 'Val',
          fieldGroup: 'primary',
          order: 0,
          showOnApple: true,
          showOnGoogle: true,
          isDynamic: false,
          dataType: 'text',
          appleOptions: {},
          googleOptions: { isPredefined: false },
          notifications: {},
          formatting: { isLink: false },
        },
      ]);
    });

    expect(result.current.state.fields).toHaveLength(1);
    expect(result.current.state.fields[0]!.label).toBe('Added');
  });

  it('setCardType updates card type and config', () => {
    const { result } = renderHook(() => useWalletStudio());

    act(() => {
      result.current.setCardType('coupon');
    });

    expect(result.current.state.cardType).toBe('coupon');
    expect(result.current.state.cardTypeConfig.cardType).toBe('coupon');
    expect(result.current.state.apple.passStyle).toBe('coupon');
    expect(result.current.state.google.passType).toBe('OfferClass');
    expect(result.current.state.ui.isModified).toBe(true);
  });

  it('isModified tracks changes', () => {
    const { result } = renderHook(() => useWalletStudio());

    expect(result.current.isModified).toBe(false);

    act(() => {
      result.current.updateColors({ accent: '#00FF00' });
    });

    expect(result.current.isModified).toBe(true);
  });

  it('resetState restores initial state', () => {
    const { result } = renderHook(() => useWalletStudio());

    act(() => {
      result.current.updateColors({ accent: '#00FF00' });
    });

    expect(result.current.state.colors.accent).toBe('#00FF00');
    expect(result.current.isModified).toBe(true);

    act(() => {
      result.current.resetState();
    });

    expect(result.current.state.colors.accent).toBe('#3B82F6');
    expect(result.current.isModified).toBe(false);
  });

  it('applyTemplate replaces design state', () => {
    const { result } = renderHook(() => useWalletStudio());

    const template: WalletTemplate = {
      id: 'tpl-1',
      name: 'Test Template',
      description: 'A test template',
      type: 'system',
      cardType: 'coupon',
      industry: 'retail',
      colors: {
        background: '#FFFFFF',
        foreground: '#000000',
        label: '#666666',
        accent: '#E53935',
      },
      cardTypeConfig: {
        cardType: 'coupon',
        discountType: 'percentage',
        discountValue: 20,
        usageLimitPerCustomer: 1,
        couponDescription: 'Test coupon',
        specialPromotionText: '',
        couponExpiry: 'unlimited',
        pushMessage: '',
        cutLineStyle: 'dashed',
        discountBadgeStyle: 'pill',
        offerTag: '',
      },
      barcode: {
        format: 'QR_CODE',
        message: 'TEST123',
        messageEncoding: 'iso-8859-1',
      },
      backContent: { fields: [], links: [], detailImages: [] },
      apple: {
        passStyle: 'coupon',
        description: 'Test coupon desc',
        organizationName: 'Test Org',
      },
      google: {
        passType: 'OfferClass',
        programName: 'Test Program',
        hexBackgroundColor: '#FFFFFF',
      },
      tags: ['test'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    act(() => {
      result.current.applyTemplate(template);
    });

    expect(result.current.state.cardType).toBe('coupon');
    expect(result.current.state.colors.background).toBe('#FFFFFF');
    expect(result.current.state.barcode.message).toBe('TEST123');
    expect(result.current.state.ui.appliedTemplateId).toBe('tpl-1');
    expect(result.current.state.ui.isModified).toBe(true);
  });

  it('setIndustry updates industry', () => {
    const { result } = renderHook(() => useWalletStudio());

    act(() => {
      result.current.setIndustry('retail');
    });

    expect(result.current.state.industry).toBe('retail');
  });

  it('updateImages merges partial images', () => {
    const { result } = renderHook(() => useWalletStudio());

    act(() => {
      result.current.updateImages({
        logo: { url: 'https://example.com/logo.png', width: 100, height: 100 },
      });
    });

    expect(result.current.state.images.logo?.url).toBe('https://example.com/logo.png');
  });

  it('updateBarcode merges partial barcode config', () => {
    const { result } = renderHook(() => useWalletStudio());

    act(() => {
      result.current.updateBarcode({ message: 'HELLO' });
    });

    expect(result.current.state.barcode.message).toBe('HELLO');
    expect(result.current.state.barcode.format).toBe('QR_CODE');
  });

  it('updateAppleConfig merges partial config', () => {
    const { result } = renderHook(() => useWalletStudio());

    act(() => {
      result.current.updateAppleConfig({ organizationName: 'Acme Inc.' });
    });

    expect(result.current.state.apple.organizationName).toBe('Acme Inc.');
  });

  it('updateGoogleConfig merges partial config', () => {
    const { result } = renderHook(() => useWalletStudio());

    act(() => {
      result.current.updateGoogleConfig({ programName: 'Acme Rewards' });
    });

    expect(result.current.state.google.programName).toBe('Acme Rewards');
  });

  it('updateUI updates UI state without forcing isModified', () => {
    const { result } = renderHook(() => useWalletStudio());

    act(() => {
      result.current.updateUI({ zoom: 1.5 });
    });

    expect(result.current.state.ui.zoom).toBe(1.5);
  });

  it('initialState is respected', () => {
    const { result } = renderHook(() =>
      useWalletStudio({
        name: 'Custom Pass',
        cardType: 'vip_membership',
      })
    );

    expect(result.current.state.name).toBe('Custom Pass');
    expect(result.current.state.cardType).toBe('vip_membership');
  });
});
