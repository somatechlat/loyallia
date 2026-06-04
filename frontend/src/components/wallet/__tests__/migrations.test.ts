import { describe, it, expect } from 'vitest';
import type { WalletDesignState } from '../types-v1';
import {
  migrateV1ToV2,
  detectCardType,
  detectIndustry,
  migrateAppleFields,
  migrateGoogleRows,
  isV1State,
  isV2State,
} from '../migrations/v1-to-v2';
import { defaultWalletDesignState } from '../types-v1';

/* ------------------------------------------------------------------ */
/*  Fixtures                                                          */
/* ------------------------------------------------------------------ */

const sampleV1Apple: WalletDesignState = {
  ...defaultWalletDesignState(),
  provider: 'apple',
  appleLogoUrl: 'https://example.com/apple-logo.png',
  appleLogo2xUrl: 'https://example.com/apple-logo@2x.png',
  appleStripUrl: 'https://example.com/strip.png',
  appleStrip2xUrl: 'https://example.com/strip@2x.png',
  appleThumbnailUrl: 'https://example.com/thumb.png',
  appleThumbnail2xUrl: 'https://example.com/thumb@2x.png',
  appleIconUrl: 'https://example.com/icon.png',
  appleIcon2xUrl: 'https://example.com/icon@2x.png',
  appleFields: {
    headerFields: [
      { key: 'h1', label: 'Tier', value: 'Gold', changeMessage: 'Changed to %@' },
    ],
    primaryFields: [
      { key: 'p1', label: 'Balance', value: '50 pts', textAlignment: 'PKTextAlignmentCenter' },
    ],
    secondaryFields: [
      { key: 's1', label: 'Member Since', value: '2023' },
    ],
    auxiliaryFields: [
      { key: 'a1', label: 'Store', value: 'Madrid' },
    ],
    backFields: [
      { key: 'b1', label: 'Terms', value: 'See website for details' },
    ],
  },
  locations: [
    { id: 'loc-1', latitude: 40.4168, longitude: -3.7038, altitude: 0, relevantText: 'Welcome to Madrid!' },
  ],
  beacons: [
    { id: 'beacon-1', uuid: '550e8400-e29b-41d4-a716-446655440000', major: 1, minor: 2, relevantText: 'Hello' },
  ],
  links: [
    { id: 'link-1', label: 'Website', uri: 'https://example.com' },
    { id: 'link-2', label: 'Contact', uri: 'mailto:support@example.com' },
  ],
};

const sampleV1Google: WalletDesignState = {
  ...defaultWalletDesignState(),
  provider: 'google',
  googleProgramLogoUrl: 'https://example.com/google-logo.png',
  googleHeroImageUrl: 'https://example.com/hero.png',
  googleWideLogoUrl: 'https://example.com/wide-logo.png',
  googleImageModuleUrl: 'https://example.com/image-module.png',
  googleRows: [
    {
      id: 'r1',
      type: 'oneItem',
      items: [
        { id: 'g1', fieldPath: 'object.textModulesData["offer"]', label: 'Offer', displayName: 'Special Offer' },
      ],
    },
    {
      id: 'r2',
      type: 'twoItems',
      items: [
        { id: 'g2', fieldPath: 'object.textModulesData["valid"]', label: 'Valid Until', displayName: '2024-12-31' },
        { id: 'g3', fieldPath: 'object.textModulesData["code"]', label: 'Code', displayName: 'SAVE20' },
      ],
    },
  ],
};

const sampleV1Mixed: WalletDesignState = {
  ...defaultWalletDesignState(),
  provider: 'apple',
  appleLogoUrl: 'https://example.com/a-logo.png',
  googleProgramLogoUrl: 'https://example.com/g-logo.png',
  appleFields: {
    primaryFields: [{ key: 'coupon-primary', label: 'Discount', value: '20% OFF' }],
  },
  googleRows: [
    {
      id: 'gr1',
      type: 'oneItem',
      items: [{ id: 'gi1', fieldPath: 'object.textModulesData["desc"]', label: 'Description', displayName: 'Coupon' }],
    },
  ],
};

const sampleV1Coupon: WalletDesignState = {
  ...defaultWalletDesignState(),
  provider: 'google',
  googleRows: [
    {
      id: 'c1',
      type: 'oneItem',
      items: [
        { id: 'ci1', fieldPath: 'object.textModulesData["coupon"]', label: 'Coupon', displayName: '50% Descuento' },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('isV1State', () => {
  it('returns true for a valid v1 state', () => {
    expect(isV1State(sampleV1Apple)).toBe(true);
  });

  it('returns false for a v2 state', () => {
    const v2 = migrateV1ToV2(sampleV1Apple);
    expect(isV1State(v2)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isV1State(null)).toBe(false);
  });

  it('returns false for a plain object missing required fields', () => {
    expect(isV1State({})).toBe(false);
    expect(isV1State({ provider: 'apple' })).toBe(false);
  });
});

describe('isV2State', () => {
  it('returns true for a valid v2 state', () => {
    const v2 = migrateV1ToV2(sampleV1Apple);
    expect(isV2State(v2)).toBe(true);
  });

  it('returns false for a v1 state', () => {
    expect(isV2State(sampleV1Apple)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isV2State(null)).toBe(false);
  });
});

describe('migrateV1ToV2', () => {
  it('returns version 2', () => {
    const v2 = migrateV1ToV2(sampleV1Apple);
    expect(v2.version).toBe(2);
  });

  it('sets UI defaults', () => {
    const v2 = migrateV1ToV2(sampleV1Apple);
    expect(v2.ui).toEqual({
      activeTab: 'images',
      platformView: 'both',
      showBack: false,
      zoom: 100,
      isModified: false,
    });
  });

  it('uses DEFAULT_COLORS when v1 has no colors', () => {
    const v2 = migrateV1ToV2(sampleV1Apple);
    expect(v2.colors).toEqual({
      background: '#1A1A1A',
      foreground: '#FFFFFF',
      label: '#9CA3AF',
      accent: '#3B82F6',
    });
  });

  it('uses DEFAULT_BARCODE when v1 has no barcode', () => {
    const v2 = migrateV1ToV2(sampleV1Apple);
    expect(v2.barcode).toEqual({
      format: 'QR_CODE',
      message: '',
      messageEncoding: 'iso-8859-1',
    });
  });
});

describe('image migration', () => {
  it('maps Apple-only design images correctly', () => {
    const v2 = migrateV1ToV2(sampleV1Apple);
    expect(v2.images.logo?.url).toBe('https://example.com/apple-logo.png');
    expect(v2.images.logo2x?.url).toBe('https://example.com/apple-logo@2x.png');
    expect(v2.images.strip?.url).toBe('https://example.com/strip.png');
    expect(v2.images.strip2x?.url).toBe('https://example.com/strip@2x.png');
    expect(v2.images.thumbnail?.url).toBe('https://example.com/thumb.png');
    expect(v2.images.thumbnail2x?.url).toBe('https://example.com/thumb@2x.png');
    expect(v2.images.icon?.url).toBe('https://example.com/icon.png');
    expect(v2.images.icon2x?.url).toBe('https://example.com/icon@2x.png');
  });

  it('maps Google-only design images correctly', () => {
    const v2 = migrateV1ToV2(sampleV1Google);
    expect(v2.images.logo?.url).toBe('https://example.com/google-logo.png');
    expect(v2.images.heroImage?.url).toBe('https://example.com/hero.png');
    expect(v2.images.wideLogo?.url).toBe('https://example.com/wide-logo.png');
    expect(v2.images.imageModule?.url).toBe('https://example.com/image-module.png');
  });

  it('prefers Apple logo over Google logo when both present', () => {
    const v2 = migrateV1ToV2(sampleV1Mixed);
    expect(v2.images.logo?.url).toBe('https://example.com/a-logo.png');
  });
});

describe('Apple field migration', () => {
  it('migrates each group to the correct field group', () => {
    const fields = migrateAppleFields(sampleV1Apple);
    expect(fields.find((f) => f.id === 'h1')?.fieldGroup).toBe('header');
    expect(fields.find((f) => f.id === 'p1')?.fieldGroup).toBe('primary');
    expect(fields.find((f) => f.id === 's1')?.fieldGroup).toBe('secondary');
    expect(fields.find((f) => f.id === 'a1')?.fieldGroup).toBe('auxiliary');
    expect(fields.find((f) => f.id === 'b1')?.fieldGroup).toBe('back');
  });

  it('preserves Apple options', () => {
    const fields = migrateAppleFields(sampleV1Apple);
    const header = fields.find((f) => f.id === 'h1')!;
    expect(header.showOnApple).toBe(true);
    expect(header.showOnGoogle).toBe(false);
    expect(header.appleOptions.changeMessage).toBe('Changed to %@');
    expect(header.label).toBe('Tier');
    expect(header.value).toBe('Gold');
  });

  it('preserves text alignment', () => {
    const fields = migrateAppleFields(sampleV1Apple);
    const primary = fields.find((f) => f.id === 'p1')!;
    expect(primary.appleOptions.textAlignment).toBe('PKTextAlignmentCenter');
  });
});

describe('Google row migration', () => {
  it('maps row items to unified fields with showOnGoogle true', () => {
    const fields = migrateGoogleRows(sampleV1Google);
    const offer = fields.find((f) => f.id === 'g1')!;
    expect(offer.showOnGoogle).toBe(true);
    expect(offer.showOnApple).toBe(false);
    expect(offer.googleOptions.isPredefined).toBe(true);
    expect(offer.googleOptions.predefinedPath).toBe('object.textModulesData["offer"]');
    expect(offer.label).toBe('Offer');
  });

  it('maps first rows to secondary by default', () => {
    const fields = migrateGoogleRows(sampleV1Google);
    expect(fields.filter((f) => f.fieldGroup === 'secondary').length).toBe(3);
  });
});

describe('detectCardType', () => {
  it('detects coupon from coupon-like fields', () => {
    expect(detectCardType(sampleV1Coupon)).toBe('coupon');
  });

  it('defaults to stamp when unclear', () => {
    const vague: WalletDesignState = {
      ...defaultWalletDesignState(),
      provider: 'apple',
      appleFields: {},
      googleRows: [],
    };
    expect(detectCardType(vague)).toBe('stamp');
  });
});

describe('detectIndustry', () => {
  it('defaults to generic for vague designs', () => {
    const vague: WalletDesignState = {
      ...defaultWalletDesignState(),
      provider: 'apple',
      appleFields: {},
      googleRows: [],
    };
    expect(detectIndustry(vague)).toBe('generic');
  });

  it('infers retail from coupon card type', () => {
    expect(detectIndustry(sampleV1Coupon)).toBe('retail');
  });
});

describe('advanced config migration', () => {
  it('populates apple.locations from v1 locations', () => {
    const v2 = migrateV1ToV2(sampleV1Apple);
    expect(v2.apple.locations).toHaveLength(1);
    expect(v2.apple.locations[0]).toMatchObject({
      id: 'loc-1',
      latitude: 40.4168,
      longitude: -3.7038,
      relevantText: 'Welcome to Madrid!',
    });
  });

  it('populates apple.beacons from v1 beacons', () => {
    const v2 = migrateV1ToV2(sampleV1Apple);
    expect(v2.apple.beacons).toHaveLength(1);
    expect(v2.apple.beacons[0]).toMatchObject({
      id: 'beacon-1',
      uuid: '550e8400-e29b-41d4-a716-446655440000',
      major: 1,
      minor: 2,
    });
  });

  it('populates backContent.links from v1 links', () => {
    const v2 = migrateV1ToV2(sampleV1Apple);
    expect(v2.backContent.links).toHaveLength(2);
    expect(v2.backContent.links[0]).toMatchObject({
      id: 'link-1',
      label: 'Website',
      url: 'https://example.com',
      type: 'website',
    });
    expect(v2.backContent.links[1]).toMatchObject({
      id: 'link-2',
      label: 'Contact',
      url: 'mailto:support@example.com',
      type: 'email',
    });
  });
});
