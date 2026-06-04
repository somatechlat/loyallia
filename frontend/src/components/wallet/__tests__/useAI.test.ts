/**
 * Unit tests for useAI hook.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAI } from '@/hooks/useAI';
import type { WalletPassStudioState } from '@/components/wallet/types/unified-state';

describe('useAI', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('initial state is correct', () => {
    const { result } = renderHook(() => useAI());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.quota.used).toBe(3);
    expect(result.current.quota.limit).toBe(10);
  });

  it('generateTemplate returns 3 variations with correct structure', async () => {
    const { result } = renderHook(() => useAI());

    let variations: Awaited<ReturnType<typeof result.current.generateTemplate>> = [];

    await act(async () => {
      const promise = result.current.generateTemplate(
        'Café acogedor con tonos tierra',
        'stamp',
        'food'
      );
      vi.advanceTimersByTime(1500);
      variations = await promise;
    });

    expect(variations).toHaveLength(3);
    expect(variations[0]!.name).toBe('Café Cálido');
    expect(variations[1]!.name).toBe('Industrial Oscuro');
    expect(variations[2]!.name).toBe('Minimal');
    expect(variations[0]!.confidence).toBeGreaterThan(0);
    expect(variations[0]!.design.colors).toBeDefined();
    expect(variations[0]!.id).toBeDefined();
  });

  it('generateTemplate sets loading state during call', async () => {
    const { result } = renderHook(() => useAI());

    act(() => {
      result.current.generateTemplate('Test', 'coupon', 'retail');
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('generateTemplate returns error when description is empty', async () => {
    const { result } = renderHook(() => useAI());

    await act(async () => {
      await result.current.generateTemplate('', 'stamp', 'food');
    });

    expect(result.current.error).toBe('Por favor, describe tu negocio para generar diseños.');
  });

  it('suggestColors returns 3 color palettes', async () => {
    const { result } = renderHook(() => useAI());

    let palettes: Awaited<ReturnType<typeof result.current.suggestColors>> = [];

    await act(async () => {
      const promise = result.current.suggestColors('Tech store');
      vi.advanceTimersByTime(1000);
      palettes = await promise;
    });

    expect(palettes).toHaveLength(3);
    expect(palettes[0]!).toHaveProperty('background');
    expect(palettes[0]!).toHaveProperty('foreground');
    expect(palettes[0]!).toHaveProperty('label');
    expect(palettes[0]!).toHaveProperty('accent');
  });

  it('critiqueDesign returns array of suggestions', async () => {
    const { result } = renderHook(() => useAI());

    const mockState: WalletPassStudioState = {
      version: 2,
      id: 'test',
      name: 'Test',
      cardType: 'stamp',
      industry: 'food',
      colors: { background: '#000000', foreground: '#FFFFFF', label: '#999999', accent: '#3B82F6' },
      images: {},
      fields: [],
      cardTypeConfig: { cardType: 'stamp', stampsRequired: 10 },
      barcode: { format: 'QR_CODE', message: '', messageEncoding: 'iso-8859-1' },
      backContent: { fields: [], links: [], detailImages: [] },
      apple: {
        passStyle: 'storeCard',
        description: '',
        organizationName: 'Loyallia',
        nfc: { enabled: false, requiresAuthentication: false },
        locations: [],
        beacons: [],
        suppressStripShine: false,
        sharingProhibited: false,
        voided: false,
      },
      google: {
        passType: 'LoyaltyClass',
        programName: 'Loyallia Rewards',
        hexBackgroundColor: '#000000',
        reviewStatus: 'UNDER_REVIEW',
        allowMultipleUsers: 'ONE_USER_ALL_DEVICES',
        messages: [],
        notifyPreference: false,
      },
      ui: {
        activeTab: 'images',
        platformView: 'both',
        showBack: false,
        zoom: 1,
        isModified: false,
      },
    };

    let suggestions: Awaited<ReturnType<typeof result.current.critiqueDesign>> = [];

    await act(async () => {
      const promise = result.current.critiqueDesign(mockState);
      vi.advanceTimersByTime(1200);
      suggestions = await promise;
    });

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.every((s) => typeof s === 'string')).toBe(true);
  });

  it('reset clears error and loading state', async () => {
    const { result } = renderHook(() => useAI());

    await act(async () => {
      await result.current.generateTemplate('', 'stamp', 'food');
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('quota increments after successful generateTemplate', async () => {
    const { result } = renderHook(() => useAI());

    const initialUsed = result.current.quota.used;

    await act(async () => {
      const promise = result.current.generateTemplate('Test description', 'stamp', 'food');
      vi.advanceTimersByTime(1500);
      await promise;
    });

    expect(result.current.quota.used).toBe(initialUsed + 1);
  });

  it('disabled hook returns error on generateTemplate', async () => {
    const { result } = renderHook(() => useAI({ enabled: false }));

    await act(async () => {
      await result.current.generateTemplate('Test', 'stamp', 'food');
    });

    expect(result.current.error).toBe('La funcionalidad de IA no está habilitada.');
  });

  it('generateTemplate uses provided cardType and industry in variations', async () => {
    const { result } = renderHook(() => useAI());

    let variations: Awaited<ReturnType<typeof result.current.generateTemplate>> = [];

    await act(async () => {
      const promise = result.current.generateTemplate('Gym', 'cashback', 'health');
      vi.advanceTimersByTime(1500);
      variations = await promise;
    });

    expect(variations[0]!.design.cardType).toBe('cashback');
    expect(variations[0]!.design.industry).toBe('health');
  });
});
