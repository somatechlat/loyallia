/**
 * Unit tests for useAI hook.
 *
 * Tests the real hook with mocked API responses (no fake timers — real async).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAI } from '@/hooks/useAI';
import type { WalletPassStudioState } from '@/components/wallet/types/unified-state';

// Mock the api module so we don't hit the real backend
vi.mock('@/lib/api', () => ({
  aiApi: {
    generateTemplate: vi.fn(),
    suggestColors: vi.fn(),
    critiqueDesign: vi.fn(),
    suggestStampIcons: vi.fn(),
  },
}));

import { aiApi } from '@/lib/api';

const mockedGenerateTemplate = vi.mocked(aiApi.generateTemplate);
const mockedSuggestColors = vi.mocked(aiApi.suggestColors);
const mockedCritiqueDesign = vi.mocked(aiApi.critiqueDesign);
const mockedSuggestStampIcons = vi.mocked(aiApi.suggestStampIcons);

describe('useAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('generateTemplate returns backend variations', async () => {
    mockedGenerateTemplate.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          variations: [
            {
              name: 'Café Cálido',
              description: 'Diseño cálido',
              confidence: 9.1,
              design: {
                background_color: '#6B4226',
                foreground_color: '#FFFFFF',
                accent_color: '#D2691E',
                header_image: '',
                logo_position: 'top-left',
                fields_layout: 'standard',
                font_family: 'system',
              },
            },
            {
              name: 'Industrial Oscuro',
              description: 'Estilo industrial',
              confidence: 8.9,
              design: {
                background_color: '#1A1A1A',
                foreground_color: '#FFFFFF',
                accent_color: '#C0A062',
                header_image: '',
                logo_position: 'top-left',
                fields_layout: 'standard',
                font_family: 'system',
              },
            },
            {
              name: 'Minimal',
              description: 'Diseño minimalista',
              confidence: 8.7,
              design: {
                background_color: '#0D1117',
                foreground_color: '#C9D1D9',
                accent_color: '#58A6FF',
                header_image: '',
                logo_position: 'top-left',
                fields_layout: 'standard',
                font_family: 'system',
              },
            },
          ],
        },
        tokens_used: { prompt: 100, completion: 200 },
      },
    } as any);

    const { result } = renderHook(() => useAI());

    let variations: Awaited<ReturnType<typeof result.current.generateTemplate>> = [];

    await act(async () => {
      variations = await result.current.generateTemplate('Café acogedor', 'stamp', 'food');
    });

    expect(variations).toHaveLength(3);
    expect(variations[0]!.name).toBe('Café Cálido');
    expect(variations[0]!.confidence).toBe(9.1);
    expect(variations[0]!.design.colors).toBeDefined();
    expect(variations[0]!.id).toBeDefined();
    expect(mockedGenerateTemplate).toHaveBeenCalledWith({
      description: 'Café acogedor',
      card_type: 'stamp',
      industry: 'food',
      language: 'es',
    });
  });

  it('generateTemplate sets loading state during call', async () => {
    mockedGenerateTemplate.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 50))
    );

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

    expect(result.current.error).toBe('wallet.studio.ai.describeBusiness');
    expect(mockedGenerateTemplate).not.toHaveBeenCalled();
  });

  it('suggestColors returns backend palettes', async () => {
    mockedSuggestColors.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          palettes: [
            {
              background_color: '#6B4226',
              foreground_color: '#FFFFFF',
              label_color: '#F5DEB3',
              accent_color: '#D2691E',
            },
          ],
        },
        tokens_used: { prompt: 50, completion: 100 },
      },
    } as any);

    const { result } = renderHook(() => useAI());

    let palettes: Awaited<ReturnType<typeof result.current.suggestColors>> = [];

    await act(async () => {
      palettes = await result.current.suggestColors('Tech store', 'retail');
    });

    expect(palettes).toHaveLength(1);
    expect(palettes[0]!).toHaveProperty('background', '#6B4226');
    expect(palettes[0]!).toHaveProperty('foreground', '#FFFFFF');
    expect(palettes[0]!).toHaveProperty('label', '#F5DEB3');
    expect(palettes[0]!).toHaveProperty('accent', '#D2691E');
    expect(mockedSuggestColors).toHaveBeenCalledWith({
      description: 'Tech store',
      industry: 'retail',
    });
  });

  it('critiqueDesign returns backend suggestions', async () => {
    mockedCritiqueDesign.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          suggestions: [
            'Aumenta el contraste entre fondo y texto.',
            'Añade un logo para reforzar la marca.',
          ],
        },
        tokens_used: { prompt: 80, completion: 150 },
      },
    } as any);

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
    expect(mockedCritiqueDesign).toHaveBeenCalled();
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
    mockedGenerateTemplate.mockResolvedValueOnce({
      data: {
        success: true,
        data: { variations: [] },
        tokens_used: {},
        quota: { used: 7, limit: 10 },
      },
    } as any);

    const { result } = renderHook(() => useAI());

    await act(async () => {
      await result.current.generateTemplate('Test description', 'stamp', 'food');
    });

    await waitFor(() => {
      expect(result.current.quota.used).toBe(7);
    });
  });

  it('disabled hook returns error on generateTemplate', async () => {
    const { result } = renderHook(() => useAI({ enabled: false }));

    await act(async () => {
      await result.current.generateTemplate('Test', 'stamp', 'food');
    });

    expect(result.current.error).toBe('wallet.studio.ai.disabled');
    expect(mockedGenerateTemplate).not.toHaveBeenCalled();
  });

  it('generateTemplate uses provided cardType and industry in variations', async () => {
    mockedGenerateTemplate.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          variations: [
            {
              name: 'Gym Pro',
              description: 'Test',
              confidence: 9.0,
              design: {
                background_color: '#000',
                foreground_color: '#FFF',
                accent_color: '#F00',
                header_image: '',
                logo_position: 'top-left',
                fields_layout: 'standard',
                font_family: 'system',
              },
            },
          ],
        },
        tokens_used: {},
      },
    } as any);

    const { result } = renderHook(() => useAI());

    let variations: Awaited<ReturnType<typeof result.current.generateTemplate>> = [];

    await act(async () => {
      variations = await result.current.generateTemplate('Gym', 'cashback', 'health');
    });

    expect(variations[0]!.design.cardType).toBe('cashback');
    expect(variations[0]!.design.industry).toBe('health');
  });

  it('handles backend error gracefully', async () => {
    mockedGenerateTemplate.mockResolvedValueOnce({
      data: {
        success: false,
        message: 'Rate limit exceeded',
        error: 'RATE_LIMIT',
      },
    } as any);

    const { result } = renderHook(() => useAI());

    await act(async () => {
      await result.current.generateTemplate('Test', 'stamp', 'food');
    });

    expect(result.current.error).toBe('Rate limit exceeded');
  });

  it('handles network error gracefully', async () => {
    mockedGenerateTemplate.mockRejectedValueOnce(new Error('Network Error'));

    const { result } = renderHook(() => useAI());

    await act(async () => {
      await result.current.generateTemplate('Test', 'stamp', 'food');
    });

    expect(result.current.error).toBe('Network Error');
  });
});
