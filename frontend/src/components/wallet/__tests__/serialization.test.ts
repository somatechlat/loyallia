/**
 * Tests for wallet design serialization and V1/V2 metadata parsing.
 *
 * These tests verify the critical frontend→backend contract:
 *   1. V2 state serializes into metadata.wallet_studio
 *   2. V2 metadata parses back into state
 *   3. V1 metadata (legacy) migrates into V2 state
 */

import { describe, it, expect } from 'vitest';
import {
  parseWalletDesignFromMetadata,
  buildWalletDesignMetadata,
} from '@/components/wallet/serialization';
import type { WalletPassStudioState } from '@/components/wallet/types/unified-state';
import { DEFAULT_COLORS, DEFAULT_BARCODE } from '@/components/wallet/constants';

const MINIMAL_V2_STATE: WalletPassStudioState = {
  version: 2,
  id: 'ws-test-1',
  name: 'Test Pass',
  cardType: 'stamp',
  industry: 'retail',
  colors: {
    background: '#123456',
    foreground: '#FFFFFF',
    label: '#CCCCCC',
    accent: '#FF5733',
  },
  images: {
    logo: { url: 'https://example.com/logo.png', width: 160, height: 160 },
  },
  fields: [
    {
      id: 'welcome',
      label: 'Bienvenido',
      value: '{customer_name}',
      fieldGroup: 'primaryFields',
      order: 0,
      showOnApple: true,
      showOnGoogle: true,
      isDynamic: true,
      dynamicTemplate: '{customer_name}',
      dataType: 'text',
      appleOptions: {},
      googleOptions: { isPredefined: false },
      notifications: {},
      formatting: { isLink: false },
    },
  ],
  cardTypeConfig: {
    cardType: 'stamp',
    stampsRequired: 10,
    rewardDescription: 'Free coffee',
  } as WalletPassStudioState['cardTypeConfig'],
  barcode: { type: 'qr_code', altText: 'Scan me' },
  backContent: {
    fields: [
      { id: 'terms', label: 'Terms', value: 'No combo.', isLink: false },
      { id: 'website', label: 'Site', value: 'https://example.com', isLink: true },
    ],
    links: [],
    detailImages: [],
  },
  apple: {
    passStyle: 'storeCard',
    nfc: { enabled: false, requiresAuthentication: false, message: '' },
    advanced: { sharingProhibited: false, voided: false },
  },
  google: {
    passType: 'loyalty',
    programName: 'Test Pass',
    hexBackgroundColor: '#123456',
    reviewStatus: 'UNDER_REVIEW',
    allowMultipleUsers: 'ONE_USER_ALL_DEVICES',
    messages: [],
    notifyPreference: true,
  },
  ui: {
    activeTab: 'images',
    platformView: 'both',
    showBack: false,
    zoom: 1,
    showGrid: false,
    isModified: false,
    appliedTemplateId: undefined,
  },
};

describe('buildWalletDesignMetadata', () => {
  it('stores V2 state under wallet_studio key', () => {
    const metadata = buildWalletDesignMetadata(MINIMAL_V2_STATE);

    expect(metadata).toHaveProperty('wallet_studio');
    expect(metadata.wallet_provider).toBe('both');

    const ws = metadata.wallet_studio as Record<string, unknown>;
    expect(ws.version).toBe(2);
    expect(ws.id).toBe('ws-test-1');
    expect(ws.name).toBe('Test Pass');
    expect(ws.cardType).toBe('stamp');
    expect(ws.industry).toBe('retail');
  });

  it('preserves colors, images, fields, and barcode', () => {
    const metadata = buildWalletDesignMetadata(MINIMAL_V2_STATE);
    const ws = metadata.wallet_studio as Record<string, unknown>;

    expect(ws.colors).toEqual(MINIMAL_V2_STATE.colors);
    expect(ws.images).toEqual(MINIMAL_V2_STATE.images);
    expect(ws.fields).toEqual(MINIMAL_V2_STATE.fields);
    expect(ws.barcode).toEqual(MINIMAL_V2_STATE.barcode);
  });

  it('preserves back content, apple, and google config', () => {
    const metadata = buildWalletDesignMetadata(MINIMAL_V2_STATE);
    const ws = metadata.wallet_studio as Record<string, unknown>;

    expect(ws.backContent).toEqual(MINIMAL_V2_STATE.backContent);
    expect(ws.apple).toEqual(MINIMAL_V2_STATE.apple);
    expect(ws.google).toEqual(MINIMAL_V2_STATE.google);
  });
});

describe('parseWalletDesignFromMetadata', () => {
  it('parses V2 wallet_studio metadata correctly', () => {
    const metadata = buildWalletDesignMetadata(MINIMAL_V2_STATE);
    const parsed = parseWalletDesignFromMetadata(metadata);

    expect(parsed.version).toBe(2);
    expect(parsed.id).toBe('ws-test-1');
    expect(parsed.name).toBe('Test Pass');
    expect(parsed.cardType).toBe('stamp');
    expect(parsed.industry).toBe('retail');
    expect(parsed.colors).toEqual(MINIMAL_V2_STATE.colors);
    expect(parsed.images).toEqual(MINIMAL_V2_STATE.images);
    expect(parsed.fields).toEqual(MINIMAL_V2_STATE.fields);
    expect(parsed.barcode).toEqual(MINIMAL_V2_STATE.barcode);
    expect(parsed.backContent).toEqual(MINIMAL_V2_STATE.backContent);
  });

  it('prefers wallet_studio over wallet_design when both are present', () => {
    const metadata = {
      ...buildWalletDesignMetadata(MINIMAL_V2_STATE),
      wallet_design: {
        provider: 'apple',
        apple_fields: {},
      },
    };
    const parsed = parseWalletDesignFromMetadata(metadata);

    expect(parsed.name).toBe('Test Pass');
    expect(parsed.cardType).toBe('stamp');
  });

  it('returns empty object when no wallet_studio or wallet_design exists', () => {
    const parsed = parseWalletDesignFromMetadata({ other_key: true });
    expect(Object.keys(parsed)).toHaveLength(0);
  });

  it('falls back to defaults for missing V2 fields', () => {
    const metadata = {
      wallet_studio: {
        version: 2,
        id: 'ws-minimal',
        name: 'Minimal',
        cardType: 'coupon',
      },
    };
    const parsed = parseWalletDesignFromMetadata(metadata);

    expect(parsed.cardType).toBe('coupon');
    expect(parsed.colors).toEqual(DEFAULT_COLORS);
    expect(parsed.barcode).toEqual(DEFAULT_BARCODE);
    expect(parsed.fields).toEqual([]);
    expect(parsed.images).toEqual({});
  });

  it('migrates legacy V1 wallet_design metadata to V2', () => {
    const v1Metadata = {
      card_type: 'discount',
      wallet_design: {
        provider: 'both',
        apple_fields: {
          primaryFields: [
            { key: 'tier', label: 'Nivel', value: 'Gold', changeMessage: 'Updated' },
          ],
        },
        google_rows: [
          {
            id: 'row-1',
            type: 'oneItem',
            items: [
              {
                id: 'item-1',
                fieldPath: 'object.accountName',
                label: 'Cuenta',
                displayName: 'Mi Cuenta',
              },
            ],
          },
        ] as unknown[],
        apple_images: {
          logo: 'https://example.com/apple-logo.png',
          strip: 'https://example.com/apple-strip.png',
        },
        google_images: {
          hero_image: 'https://example.com/google-hero.png',
        },
      },
    };
    const parsed = parseWalletDesignFromMetadata(v1Metadata);

    expect(parsed.version).toBe(2);
    expect(parsed.cardType).toBe('discount');
    expect(parsed.fields).toHaveLength(2);

    const appleField = parsed.fields?.find((f) => f.id === 'field-tier');
    expect(appleField).toBeDefined();
    expect(appleField?.label).toBe('Nivel');
    expect(appleField?.fieldGroup).toBe('primary');
    expect(appleField?.showOnApple).toBe(true);

    const googleField = parsed.fields?.find((f) => f.id === 'field-item-1');
    expect(googleField).toBeDefined();
    expect(googleField?.label).toBe('Cuenta');
    expect(googleField?.fieldGroup).toBe('primary');
    expect(googleField?.showOnGoogle).toBe(true);

    expect(parsed.images?.logo?.url).toBe('https://example.com/apple-logo.png');
    expect(parsed.images?.strip?.url).toBe('https://example.com/apple-strip.png');
    expect(parsed.images?.heroImage?.url).toBe('https://example.com/google-hero.png');
  });
});
