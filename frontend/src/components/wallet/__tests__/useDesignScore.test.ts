/**
 * Unit tests for useDesignScore hook.
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDesignScore } from '@/hooks/useDesignScore';
import type { WalletPassStudioState } from '@/components/wallet/types/unified-state';

function makeState(overrides: Partial<WalletPassStudioState> = {}): WalletPassStudioState {
  return {
    version: 2,
    id: 'test-id',
    name: 'Test Pass',
    cardType: 'stamp',
    industry: 'cafe',
    colors: {
      background: '#1A1A1A',
      foreground: '#FFFFFF',
      label: '#AAAAAA',
      accent: '#4F46E5',
    },
    images: {},
    fields: [
      {
        id: 'f1',
        label: 'Sellos',
        value: '5/10',
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
    ],
    cardTypeConfig: { cardType: 'stamp', stampsRequired: 10, stampIcon: 'coffee', rewardText: 'Café gratis', emptyStampColor: '#333333', filledStampColor: '#4F46E5' },
    barcode: { format: 'QR_CODE', message: 'TEST123', messageEncoding: 'iso-8859-1' },
    backContent: {
      fields: [
        { id: 'b1', label: 'REGLAS DEL PROGRAMA', value: 'Acumula sellos', isLink: false, order: 0 },
        { id: 'b2', label: 'TÉRMINOS Y CONDICIONES', value: 'Válido por 12 meses', isLink: false, order: 1 },
        { id: 'b3', label: 'CONTACTO', value: 'test@example.com', isLink: true, linkUrl: 'mailto:test@example.com', linkType: 'email', order: 2 },
      ],
      links: [
        { id: 'l1', type: 'website', url: 'https://example.com', label: 'Sitio web' },
      ],
      detailImages: [],
    },
    apple: {
      passStyle: 'storeCard',
      description: 'Test',
      sharingProhibited: false,
      suppressStripShine: false,
      locations: [],
      beacons: [],
      appLaunchURL: '',
      associatedStoreIdentifiers: [],
    },
    google: {
      passType: 'LoyaltyClass',
      programName: 'Test',
      hexBackgroundColor: '#1A1A1A',
      reviewStatus: 'UNDER_REVIEW',
    },
    ui: {
      activeTab: 'images',
      platformView: 'both',
      showBack: false,
      zoom: 1,
      isModified: false,
    },
    ...overrides,
  } as WalletPassStudioState;
}

describe('useDesignScore', () => {
  it('returns a score between 0 and 10', () => {
    const state = makeState();
    const { result } = renderHook(() => useDesignScore(state));

    expect(result.current.score).toBeGreaterThanOrEqual(0);
    expect(result.current.score).toBeLessThanOrEqual(10);
    expect(['excelente', 'bueno', 'aceptable', 'necesita_trabajo']).toContain(result.current.level);
  });

  it('penalizes missing logo', () => {
    const state = makeState({ images: {} });
    const { result } = renderHook(() => useDesignScore(state));

    const logoCheck = result.current.checks.find((c) => c.id === 'logo_present');
    expect(logoCheck).toBeDefined();
    expect(logoCheck!.passed).toBe(false);
  });

  it('penalizes logo with insufficient dimensions', () => {
    const state = makeState({
      images: { logo: { url: 'https://example.com/logo.png', width: 200, height: 200 } },
    });
    const { result } = renderHook(() => useDesignScore(state));

    const dimCheck = result.current.checks.find((c) => c.id === 'logo_dimensions');
    expect(dimCheck).toBeDefined();
    expect(dimCheck!.passed).toBe(false);
    expect(dimCheck!.message).toContain('660');
  });

  it('passes logo dimensions when logo is large enough', () => {
    const state = makeState({
      images: { logo: { url: 'https://example.com/logo.png', width: 800, height: 800 } },
    });
    const { result } = renderHook(() => useDesignScore(state));

    const dimCheck = result.current.checks.find((c) => c.id === 'logo_dimensions');
    expect(dimCheck!.passed).toBe(true);
  });

  it('penalizes poor aspect ratios on images', () => {
    const state = makeState({
      images: {
        strip: { url: 'https://example.com/strip.png', width: 100, height: 100 }, // 1:1, should be 2-5:1
      },
    });
    const { result } = renderHook(() => useDesignScore(state));

    const aspectCheck = result.current.checks.find((c) => c.id === 'image_aspect_ratios');
    expect(aspectCheck).toBeDefined();
    expect(aspectCheck!.passed).toBe(false);
  });

  it('passes aspect ratios when images have correct proportions', () => {
    const state = makeState({
      images: {
        logo: { url: 'https://example.com/logo.png', width: 800, height: 800 },
        strip: { url: 'https://example.com/strip.png', width: 1200, height: 400 },
        heroImage: { url: 'https://example.com/hero.png', width: 1200, height: 600 },
      },
    });
    const { result } = renderHook(() => useDesignScore(state));

    const aspectCheck = result.current.checks.find((c) => c.id === 'image_aspect_ratios');
    expect(aspectCheck!.passed).toBe(true);
  });

  it('checks for terms in back content', () => {
    const stateOk = makeState({
      backContent: {
        fields: [
          { id: 'b1', label: 'REGLAS', value: 'Rules', isLink: false, order: 0 },
          { id: 'b2', label: 'TÉRMINOS Y CONDICIONES', value: 'Terms', isLink: false, order: 1 },
        ],
        links: [],
        detailImages: [],
      },
    });
    const { result: resultOk } = renderHook(() => useDesignScore(stateOk));
    const termsCheck = resultOk.current.checks.find((c) => c.id === 'has_terms');
    expect(termsCheck!.passed).toBe(true);

    const stateBad = makeState({
      backContent: {
        fields: [{ id: 'b1', label: 'INFO', value: 'Info', isLink: false, order: 0 }],
        links: [],
        detailImages: [],
      },
    });
    const { result: resultBad } = renderHook(() => useDesignScore(stateBad));
    const termsCheckBad = resultBad.current.checks.find((c) => c.id === 'has_terms');
    expect(termsCheckBad!.passed).toBe(false);
  });

  it('checks for contact info in back content', () => {
    const stateOk = makeState({
      backContent: {
        fields: [
          { id: 'b1', label: 'CONTACTO', value: 'test@example.com', isLink: false, order: 0 },
        ],
        links: [],
        detailImages: [],
      },
    });
    const { result: resultOk } = renderHook(() => useDesignScore(stateOk));
    const contactCheck = resultOk.current.checks.find((c) => c.id === 'has_contact_info');
    expect(contactCheck!.passed).toBe(true);

    const stateBad = makeState({
      backContent: {
        fields: [{ id: 'b1', label: 'INFO', value: 'Just some text', isLink: false, order: 0 }],
        links: [],
        detailImages: [],
      },
    });
    const { result: resultBad } = renderHook(() => useDesignScore(stateBad));
    const contactCheckBad = resultBad.current.checks.find((c) => c.id === 'has_contact_info');
    expect(contactCheckBad!.passed).toBe(false);
  });

  it('checks for program rules in back content', () => {
    const stateOk = makeState({
      backContent: {
        fields: [
          { id: 'b1', label: 'REGLAS DEL PROGRAMA', value: 'Rules', isLink: false, order: 0 },
        ],
        links: [],
        detailImages: [],
      },
    });
    const { result: resultOk } = renderHook(() => useDesignScore(stateOk));
    const rulesCheck = resultOk.current.checks.find((c) => c.id === 'has_program_rules');
    expect(rulesCheck!.passed).toBe(true);
  });

  it('checks back content length', () => {
    const stateShort = makeState({
      backContent: {
        fields: [{ id: 'b1', label: 'X', value: 'Y', isLink: false, order: 0 }],
        links: [],
        detailImages: [],
      },
    });
    const { result: resultShort } = renderHook(() => useDesignScore(stateShort));
    const lenCheck = resultShort.current.checks.find((c) => c.id === 'back_content_length');
    expect(lenCheck!.passed).toBe(false);

    const stateLong = makeState({
      backContent: {
        fields: [
          { id: 'b1', label: 'REGLAS', value: 'This is a very long value that exceeds fifty characters easily', isLink: false, order: 0 },
        ],
        links: [{ id: 'l1', type: 'website', url: 'https://example.com', label: 'Website' }],
        detailImages: [],
      },
    });
    const { result: resultLong } = renderHook(() => useDesignScore(stateLong));
    const lenCheckLong = resultLong.current.checks.find((c) => c.id === 'back_content_length');
    expect(lenCheckLong!.passed).toBe(true);
  });

  it('checks has_back_fields requires at least 2 fields', () => {
    const stateOne = makeState({
      backContent: {
        fields: [{ id: 'b1', label: 'X', value: 'Y', isLink: false, order: 0 }],
        links: [],
        detailImages: [],
      },
    });
    const { result: resultOne } = renderHook(() => useDesignScore(stateOne));
    const backFieldsCheck = resultOne.current.checks.find((c) => c.id === 'has_back_fields');
    expect(backFieldsCheck!.passed).toBe(false);

    const stateTwo = makeState({
      backContent: {
        fields: [
          { id: 'b1', label: 'A', value: 'B', isLink: false, order: 0 },
          { id: 'b2', label: 'C', value: 'D', isLink: false, order: 1 },
        ],
        links: [],
        detailImages: [],
      },
    });
    const { result: resultTwo } = renderHook(() => useDesignScore(stateTwo));
    const backFieldsCheckTwo = resultTwo.current.checks.find((c) => c.id === 'has_back_fields');
    expect(backFieldsCheckTwo!.passed).toBe(true);
  });

  it('full default state scores reasonably', () => {
    const state = makeState();
    const { result } = renderHook(() => useDesignScore(state));

    // Should have many checks
    expect(result.current.checks.length).toBeGreaterThanOrEqual(14);

    // With logo missing, score should be below 9 but above 5
    expect(result.current.score).toBeGreaterThanOrEqual(5);
    expect(result.current.score).toBeLessThan(9);
  });
});
