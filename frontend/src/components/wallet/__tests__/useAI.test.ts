/**
 * Unit tests for useAI hook.
 *
 * Mocks the backend API to test hook behavior in isolation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAI } from '@/hooks/useAI';
import type { WalletPassStudioState } from '@/components/wallet/types/unified-state';

const mockPost = vi.fn();

vi.mock('@/lib/api', () => ({
  aiApi: {
    generateTemplate: (...args: unknown[]) => mockPost(...args),
    suggestColors: (...args: unknown[]) => mockPost(...args),
    critiqueDesign: (...args: unknown[]) => mockPost(...args),
    suggestStampIcons: (...args: unknown[]) => mockPost(...args),
  },
}));

describe('useAI', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initial state is correct', () => {
    const { result } = renderHook(() => useAI());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.quota.used).toBe(0);
    expect(result.current.quota.limit).toBe(10);
  });

  it('generateTemplate returns variations from API', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        data: [
          { name: 'V1', description: 'Desc 1', confidence: 0.9, design: { cardType: 'stamp', industry: 'food' } },
          { name: 'V2', description: 'Desc 2', confidence: 0.8, design: { cardType: 'stamp', industry: 'food' } },
        ],
      },
    });

    const { result } = renderHook(() => useAI());

    let variations: Awaited<ReturnType<typeof result.current.generateTemplate>> = [];

    await act(async () => {
      variations = await result.current.generateTemplate(
        'Café acogedor con tonos tierra',
        'stamp',
        'food'
      );
    });

    expect(variations).toHaveLength(2);
    expect(variations[0]!.name).toBe('V1');
    expect(variations[0]!.confidence).toBe(0.9);
    expect(variations[0]!.id).toBeDefined();
    expect(mockPost).toHaveBeenCalledWith({
      description: 'Café acogedor con tonos tierra',
      card_type: 'stamp',
      industry: 'food',
      language: 'es',
    });
  });

  it('generateTemplate sets loading state during call', async () => {
    mockPost.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ data: { data: [] } }), 50)));

    const { result } = renderHook(() => useAI());

    act(() => {
      result.current.generateTemplate('Test', 'coupon', 'retail');
    });

    expect(result.current.isLoading).toBe(true);

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
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('suggestColors returns palettes from API', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        data: [
          { name: 'P1', primary: '#000', secondary: '#111', background: '#222', text: '#333', accent: '#444' },
          { name: 'P2', primary: '#fff', secondary: '#eee', background: '#ddd', text: '#ccc', accent: '#bbb' },
        ],
      },
    });

    const { result } = renderHook(() => useAI());

    let palettes: Awaited<ReturnType<typeof result.current.suggestColors>> = [];

    await act(async () => {
      palettes = await result.current.suggestColors('Tech store', 'retail');
    });

    expect(palettes).toHaveLength(2);
    expect(palettes[0]!).toHaveProperty('primary');
    expect(palettes[0]!).toHaveProperty('background');
    expect(palettes[0]!).toHaveProperty('accent');
    expect(mockPost).toHaveBeenCalledWith({
      description: 'Tech store',
      industry: 'retail',
    });
  });

  it('critiqueDesign returns suggestions from API', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        data: ['Improve contrast', 'Add more whitespace'],
      },
    });

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
      suggestions = await result.current.critiqueDesign(mockState);
    });

    expect(suggestions.length).toBe(2);
    expect(suggestions.every((s) => typeof s === 'string')).toBe(true);
    expect(mockPost).toHaveBeenCalledWith({
      design_data: mockState,
    });
  });

  it('suggestStampIcons returns icons from API', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        data: ['coffee', 'mug', 'bean', 'cup', 'croissant', 'steam'],
      },
    });

    const { result } = renderHook(() => useAI());

    let icons: Awaited<ReturnType<typeof result.current.suggestStampIcons>> = [];

    await act(async () => {
      icons = await result.current.suggestStampIcons('cafe');
    });

    expect(icons).toHaveLength(6);
    expect(icons[0]).toBe('coffee');
    expect(mockPost).toHaveBeenCalledWith({
      business_type: 'cafe',
    });
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
    mockPost.mockResolvedValueOnce({
      data: { data: [{ name: 'V1', description: '', confidence: 0.9, design: {} }] },
    });

    const { result } = renderHook(() => useAI());

    const initialUsed = result.current.quota.used;

    await act(async () => {
      await result.current.generateTemplate('Test description', 'stamp', 'food');
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

  it('handles API errors gracefully', async () => {
    mockPost.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useAI());

    let variations: Awaited<ReturnType<typeof result.current.generateTemplate>> = [];

    await act(async () => {
      variations = await result.current.generateTemplate('Test', 'stamp', 'food');
    });

    expect(variations).toHaveLength(0);
    expect(result.current.error).toBe('Network error');
  });
});
