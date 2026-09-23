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
import { getDefaultCardTypeConfig } from '@/components/wallet/types/card-type-config';

/**
 * Durable projection of studio state: every durable key, omitting only the
 * ephemeral `ui`. Derived (not hand-picked) so no durable key can fall through.
 */
function durableProjection(state: WalletPassStudioState): Partial<WalletPassStudioState> {
  const { ui: _ui, ...durable } = state;
  return durable;
}

/** Full legitimate durable state, including a populated ephemeral `ui`. */
function makeFullState(): WalletPassStudioState {
  return {
    version: 2,
    id: 'ws-roundtrip-1',
    name: 'Round Trip Pass',
    cardType: 'coupon',
    industry: 'retail',
    colors: {
      background: '#123456',
      foreground: '#FFFFFF',
      label: '#CCCCCC',
      accent: '#FF5733',
      centralBackground: '#1A1A1A',
    },
    images: {
      logo: {
        url: 'https://example.com/logo.png',
        width: 160,
        height: 160,
        crop: { zoom: 1.2, offsetX: 4, offsetY: -2, rotate: 90, flipH: true, flipV: false },
      },
      strip: { url: 'https://example.com/strip.png', width: 750, height: 250 },
    },
    fields: [
      {
        id: 'welcome',
        label: 'Bienvenido',
        value: 'Hi {{customer.first_name}}',
        fieldGroup: 'primary',
        order: 0,
        showOnApple: true,
        showOnGoogle: true,
        isDynamic: true,
        dynamicTemplate: '{{customer.first_name}}',
        dataType: 'text',
        appleOptions: { textAlignment: 'PKTextAlignmentCenter' },
        googleOptions: { isPredefined: false },
        notifications: {},
        formatting: { isLink: false },
      },
    ],
    cardTypeConfig: getDefaultCardTypeConfig('coupon'),
    barcode: {
      format: 'QR_CODE',
      message: 'LOY-12345',
      messageEncoding: 'iso-8859-1',
      altText: 'Scan me',
    },
    backContent: {
      fields: [
        { id: 'terms', label: 'Terms', value: 'No combo.', isLink: false, order: 0 },
        {
          id: 'website',
          label: 'Site',
          value: 'https://example.com',
          isLink: true,
          linkUrl: 'https://example.com',
          linkType: 'website',
          order: 1,
        },
      ],
      links: [
        { id: 'web', type: 'website', url: 'https://example.com', label: 'Site', icon: 'globe' },
      ],
      detailImages: [
        {
          url: 'https://example.com/detail.png',
          width: 400,
          height: 300,
          description: 'Detail shot',
        },
      ],
      appLink: { iosAppId: 'id123', androidAppPackage: 'com.example' },
      termsAndConditions: 'Be nice.',
    },
    apple: {
      passStyle: 'coupon',
      description: 'A coupon for tests',
      organizationName: 'Loyallia',
      appLaunchURL: 'https://example.com/app',
      nfc: { enabled: false, requiresAuthentication: false },
      locations: [],
      beacons: [],
      suppressStripShine: false,
      sharingProhibited: false,
      voided: false,
      expirationDate: '2027-01-01',
    },
    google: {
      passType: 'OfferClass',
      programName: 'Round Trip Pass',
      hexBackgroundColor: '#123456',
      heroImage: { url: 'https://example.com/hero.png', width: 100, height: 100 },
      smartTapRedemptionValue: '1234',
      groupingId: 'grp-1',
      reviewStatus: 'UNDER_REVIEW',
      allowMultipleUsers: 'ONE_USER_ALL_DEVICES',
      homepageUri: 'https://example.com',
      helpUri: 'https://example.com/help',
      messages: [{ header: 'Hi', body: 'There' }],
      notifyPreference: true,
    },
    ui: {
      activeTab: 'colors',
      platformView: 'apple',
      showBack: true,
      zoom: 1.5,
      showGrid: true,
      appliedTemplateId: 'tpl-01',
      isModified: true,
    },
  };
}

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
      value: '{{customer.name}}',
      fieldGroup: 'primaryFields',
      order: 0,
      showOnApple: true,
      showOnGoogle: true,
      isDynamic: true,
      dynamicTemplate: '{{customer.name}}',
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

  it('throws a loud error for legacy V1 wallet_design metadata', () => {
    const v1Metadata = {
      card_type: 'discount',
      wallet_design: {
        provider: 'both',
        apple_fields: {
          primaryFields: [
            { key: 'tier', label: 'Nivel', value: 'Gold', changeMessage: 'Updated' },
          ],
        },
      },
    };
    expect(() => parseWalletDesignFromMetadata(v1Metadata)).toThrow(/Legacy V1 wallet_design/);
  });

  it('throws for unknown wallet_studio versions', () => {
    expect(() =>
      parseWalletDesignFromMetadata({ wallet_studio: { version: 3, id: 'x' } })
    ).toThrow(/Unsupported wallet_studio version/);
  });

  it('does not persist ui or write undefined own-keys', () => {
    const metadata = buildWalletDesignMetadata(MINIMAL_V2_STATE);
    const ws = metadata.wallet_studio as Record<string, unknown>;
    expect(ws).not.toHaveProperty('ui');

    const parsed = parseWalletDesignFromMetadata({
      wallet_studio: { version: 2, id: 'no-optional', name: 'N' },
    });
    expect('apple' in parsed).toBe(false);
    expect('google' in parsed).toBe(false);
    expect('ui' in parsed).toBe(false);
  });

  it('never restores ui even when the payload carries one', () => {
    const parsed = parseWalletDesignFromMetadata({
      wallet_studio: {
        version: 2,
        id: 'has-ui',
        name: 'N',
        ui: { activeTab: 'colors', platformView: 'apple', showBack: true, zoom: 2, isModified: true },
      },
    });
    expect(parsed).not.toHaveProperty('ui');
  });

  it('generates a UUID v4 id when the payload has none', () => {
    const parsed = parseWalletDesignFromMetadata({
      wallet_studio: { version: 2, cardType: 'stamp' },
    });
    expect(parsed.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('round-trip yields deep-equal durable state with no ui key', () => {
    const state = makeFullState();
    const metadata = buildWalletDesignMetadata(state);
    const parsed = parseWalletDesignFromMetadata(metadata);

    expect(parsed).not.toHaveProperty('ui');
    expect((metadata.wallet_studio as Record<string, unknown>)).not.toHaveProperty('ui');

    expect(parsed).toEqual(durableProjection(state));
  });

  it('rewrites legacy single-brace and bare-id tokens to namespaced form on parse', () => {
    const parsed = parseWalletDesignFromMetadata({
      wallet_studio: {
        version: 2,
        id: 'legacy-tokens',
        name: 'Legacy',
        cardType: 'coupon',
        fields: [
          {
            id: 'welcome',
            label: 'Hi',
            value: 'Hi {customer_name}!',
            fieldGroup: 'primary',
            order: 0,
            showOnApple: true,
            showOnGoogle: true,
            isDynamic: true,
            dynamicTemplate: 'customer_name',
            dataType: 'text',
            appleOptions: {},
            googleOptions: { isPredefined: false },
            notifications: {},
            formatting: { isLink: false },
          },
        ],
      },
    });

    const fields = parsed.fields ?? [];
    expect(fields[0]?.value).toBe('Hi {{customer.name}}!');
    expect(fields[0]?.dynamicTemplate).toBe('{{customer.name}}');
  });

  it('leaves unknown single-brace placeholders alone on parse', () => {
    const parsed = parseWalletDesignFromMetadata({
      wallet_studio: {
        version: 2,
        id: 'unknown-placeholder',
        name: 'Unknown',
        cardType: 'coupon',
        fields: [
          {
            id: 'f1',
            label: 'L',
            value: 'Hi {not_a_legacy_id}!',
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
      },
    });

    expect(parsed.fields?.[0]?.value).toBe('Hi {not_a_legacy_id}!');
  });
});
