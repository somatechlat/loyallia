/**
 * Unit tests for Wallet Pass Studio constants and icon library.
 */

import { describe, it, expect } from 'vitest';
import type { CardType, Industry, BarcodeFormat, FieldGroup } from '@/components/wallet/types';
import {
  CARD_TYPE_METADATA,
  INDUSTRY_METADATA,
  FIELD_GROUP_METADATA,
  BARCODE_FORMAT_METADATA,
  COLOR_PRESETS,
  STUDIO_TABS,
  APPLE_TO_GOOGLE_PASS_TYPE,
  FIELD_GROUP_TO_APPLE,
  FIELD_GROUP_TO_GOOGLE,
  DEFAULT_COLORS,
  DEFAULT_BARCODE,
} from '@/components/wallet/constants';
import {
  ICON_LIBRARY,
  getIconsByCategory,
  getIconById,
  searchIcons,
  getStampIcons,
  getBadgeIcons,
  type IconCategory,
} from '@/components/wallet/icon-library';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function isValidHex(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(color);
}

/* ------------------------------------------------------------------ */
/*  Card Type Metadata Tests                                          */
/* ------------------------------------------------------------------ */

describe('CARD_TYPE_METADATA', () => {
  const cardTypes: CardType[] = [
    'stamp',
    'cashback',
    'coupon',
    'affiliate',
    'discount',
    'gift_certificate',
    'vip_membership',
    'corporate_discount',
    'referral_pass',
    'multipass',
  ];

  it('has metadata for all 10 card types', () => {
    expect(Object.keys(CARD_TYPE_METADATA)).toHaveLength(10);
    for (const ct of cardTypes) {
      expect(CARD_TYPE_METADATA[ct]).toBeDefined();
    }
  });

  it.each(cardTypes)('%s has required metadata fields', (cardType) => {
    const meta = CARD_TYPE_METADATA[cardType];
    expect(meta.label).toBeTruthy();
    expect(meta.description).toBeTruthy();
    expect(meta.applePassStyle).toBeTruthy();
    expect(meta.googlePassType).toBeTruthy();
    expect(meta.defaultIndustry).toBeTruthy();
    expect(typeof meta.maxHeaderFields).toBe('number');
    expect(typeof meta.maxPrimaryFields).toBe('number');
    expect(typeof meta.maxSecondaryFields).toBe('number');
    expect(typeof meta.maxAuxiliaryFields).toBe('number');
    expect(typeof meta.maxBackFields).toBe('number');
    expect(typeof meta.supportsStripImage).toBe('boolean');
    expect(typeof meta.supportsThumbnail).toBe('boolean');
    expect(Array.isArray(meta.visualElements)).toBe(true);
    expect(meta.defaultBackContent).toBeDefined();
  });

  it('has valid field limits (non-negative)', () => {
    for (const ct of cardTypes) {
      const meta = CARD_TYPE_METADATA[ct];
      expect(meta.maxHeaderFields).toBeGreaterThanOrEqual(0);
      expect(meta.maxPrimaryFields).toBeGreaterThanOrEqual(0);
      expect(meta.maxSecondaryFields).toBeGreaterThanOrEqual(0);
      expect(meta.maxAuxiliaryFields).toBeGreaterThanOrEqual(0);
      expect(meta.maxBackFields).toBeGreaterThanOrEqual(0);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Industry Metadata Tests                                           */
/* ------------------------------------------------------------------ */

describe('INDUSTRY_METADATA', () => {
  const industries: Industry[] = [
    'food',
    'retail',
    'services',
    'health',
    'entertainment',
    'transport',
    'education',
    'technology',
    'generic',
  ];

  it('has metadata for all industries', () => {
    expect(Object.keys(INDUSTRY_METADATA)).toHaveLength(industries.length);
    for (const ind of industries) {
      expect(INDUSTRY_METADATA[ind]).toBeDefined();
    }
  });

  it.each(industries)('%s has label, icon, and color presets', (industry) => {
    const meta = INDUSTRY_METADATA[industry];
    expect(meta.label).toBeTruthy();
    expect(meta.icon).toBeTruthy();
    expect(Array.isArray(meta.colorPresets)).toBe(true);
    expect(meta.colorPresets.length).toBeGreaterThan(0);
  });

  it('industry color presets are valid hex colors', () => {
    for (const ind of industries) {
      for (const preset of INDUSTRY_METADATA[ind].colorPresets) {
        expect(isValidHex(preset.background)).toBe(true);
        expect(isValidHex(preset.foreground)).toBe(true);
        expect(isValidHex(preset.label)).toBe(true);
        expect(isValidHex(preset.accent)).toBe(true);
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Field Group Metadata Tests                                        */
/* ------------------------------------------------------------------ */

describe('FIELD_GROUP_METADATA', () => {
  const groups: FieldGroup[] = ['header', 'primary', 'secondary', 'auxiliary', 'back'];

  it('has metadata for all field groups', () => {
    expect(Object.keys(FIELD_GROUP_METADATA)).toHaveLength(groups.length);
    for (const g of groups) {
      expect(FIELD_GROUP_METADATA[g]).toBeDefined();
    }
  });

  it.each(groups)('%s maps to apple and google field groups', (group) => {
    const meta = FIELD_GROUP_METADATA[group];
    expect(meta.appleFieldGroup).toBeTruthy();
    expect(meta.googleRowType).toBeTruthy();
  });

  it('FIELD_GROUP_TO_APPLE matches FIELD_GROUP_METADATA', () => {
    for (const g of groups) {
      expect(FIELD_GROUP_TO_APPLE[g]).toBe(FIELD_GROUP_METADATA[g].appleFieldGroup);
    }
  });

  it('FIELD_GROUP_TO_GOOGLE matches FIELD_GROUP_METADATA', () => {
    for (const g of groups) {
      expect(FIELD_GROUP_TO_GOOGLE[g]).toBe(FIELD_GROUP_METADATA[g].googleRowType);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Barcode Format Metadata Tests                                     */
/* ------------------------------------------------------------------ */

describe('BARCODE_FORMAT_METADATA', () => {
  const formats: BarcodeFormat[] = ['QR_CODE', 'AZTEC', 'PDF417', 'CODE128', 'DATA_MATRIX'];

  it('has metadata for all barcode formats', () => {
    expect(Object.keys(BARCODE_FORMAT_METADATA)).toHaveLength(formats.length);
    for (const f of formats) {
      expect(BARCODE_FORMAT_METADATA[f]).toBeDefined();
    }
  });

  it.each(formats)('%s has label and description', (format) => {
    const meta = BARCODE_FORMAT_METADATA[format];
    expect(meta.label).toBeTruthy();
    expect(meta.description).toBeTruthy();
    expect(typeof meta.appleSupported).toBe('boolean');
    expect(typeof meta.googleSupported).toBe('boolean');
  });

  it('QR_CODE is supported on both platforms', () => {
    expect(BARCODE_FORMAT_METADATA.QR_CODE.appleSupported).toBe(true);
    expect(BARCODE_FORMAT_METADATA.QR_CODE.googleSupported).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  Color Presets Tests                                               */
/* ------------------------------------------------------------------ */

describe('COLOR_PRESETS', () => {
  it('has at least 15 presets', () => {
    expect(COLOR_PRESETS.length).toBeGreaterThanOrEqual(15);
  });

  it('every preset has a name and valid hex colors', () => {
    for (const preset of COLOR_PRESETS) {
      expect(preset.name).toBeTruthy();
      expect(isValidHex(preset.background)).toBe(true);
      expect(isValidHex(preset.foreground)).toBe(true);
      expect(isValidHex(preset.label)).toBe(true);
      expect(isValidHex(preset.accent)).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Studio Tabs Tests                                                 */
/* ------------------------------------------------------------------ */

describe('STUDIO_TABS', () => {
  it('has exactly 7 tabs', () => {
    expect(STUDIO_TABS).toHaveLength(7);
  });

  it('has unique ids', () => {
    const ids = STUDIO_TABS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has required fields on every tab', () => {
    for (const tab of STUDIO_TABS) {
      expect(tab.id).toBeTruthy();
      expect(tab.label).toBeTruthy();
      expect(tab.icon).toBeTruthy();
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Platform Mapping Tests                                            */
/* ------------------------------------------------------------------ */

describe('Platform Mappings', () => {
  it('APPLE_TO_GOOGLE_PASS_TYPE covers all PassStyles', () => {
    const styles = Object.keys(APPLE_TO_GOOGLE_PASS_TYPE);
    expect(styles).toContain('generic');
    expect(styles).toContain('coupon');
    expect(styles).toContain('storeCard');
    expect(styles).toContain('boardingPass');
    expect(styles).toContain('eventTicket');
    expect(styles).toContain('transitStyle');
  });

  it('FIELD_GROUP_TO_APPLE covers all FieldGroups', () => {
    const groups: FieldGroup[] = ['header', 'primary', 'secondary', 'auxiliary', 'back'];
    for (const g of groups) {
      expect(FIELD_GROUP_TO_APPLE[g]).toBeTruthy();
    }
  });

  it('FIELD_GROUP_TO_GOOGLE covers all FieldGroups', () => {
    const groups: FieldGroup[] = ['header', 'primary', 'secondary', 'auxiliary', 'back'];
    for (const g of groups) {
      expect(FIELD_GROUP_TO_GOOGLE[g]).toBeTruthy();
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Default Design Values Tests                                       */
/* ------------------------------------------------------------------ */

describe('Default Design Values', () => {
  it('DEFAULT_COLORS has valid hex colors', () => {
    expect(isValidHex(DEFAULT_COLORS.background)).toBe(true);
    expect(isValidHex(DEFAULT_COLORS.foreground)).toBe(true);
    expect(isValidHex(DEFAULT_COLORS.label)).toBe(true);
    expect(isValidHex(DEFAULT_COLORS.accent)).toBe(true);
  });

  it('DEFAULT_BARCODE has valid format and encoding', () => {
    expect(DEFAULT_BARCODE.format).toBe('QR_CODE');
    expect(DEFAULT_BARCODE.message).toBe('');
    expect(DEFAULT_BARCODE.messageEncoding).toBe('iso-8859-1');
  });
});

/* ------------------------------------------------------------------ */
/*  Icon Library Tests                                                */
/* ------------------------------------------------------------------ */

describe('ICON_LIBRARY', () => {
  it('has at least 200 entries', () => {
    expect(ICON_LIBRARY.length).toBeGreaterThanOrEqual(200);
  });

  it('every icon has id, name, and category', () => {
    for (const icon of ICON_LIBRARY) {
      expect(icon.id).toBeTruthy();
      expect(icon.name).toBeTruthy();
      expect(icon.category).toBeTruthy();
      expect(icon.lucideName || icon.svgPath).toBeTruthy();
    }
  });

  it('has unique ids', () => {
    const ids = ICON_LIBRARY.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Icon Library Utilities', () => {
  const categories: IconCategory[] = [
    'food',
    'retail',
    'transport',
    'health',
    'finance',
    'social',
    'nature',
    'technology',
    'stamp',
    'badge',
    'decorative',
  ];

  it('getIconsByCategory returns only icons for that category', () => {
    for (const cat of categories) {
      const icons = getIconsByCategory(cat);
      expect(icons.length).toBeGreaterThan(0);
      for (const icon of icons) {
        expect(icon.category).toBe(cat);
      }
    }
  });

  it('getIconById returns correct icon or undefined', () => {
    expect(getIconById('coffee')?.name).toBe('Coffee');
    expect(getIconById('nonexistent')).toBeUndefined();
  });

  it('searchIcons filters by name', () => {
    const results = searchIcons('coffee');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((i) => i.id === 'coffee')).toBe(true);
  });

  it('searchIcons filters by category', () => {
    const results = searchIcons('food');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((i) => i.category === 'food' || i.id.includes('food'))).toBe(true);
  });

  it('getStampIcons returns only stamp category icons', () => {
    const stamps = getStampIcons();
    expect(stamps.length).toBeGreaterThan(0);
    expect(stamps.every((i) => i.category === 'stamp')).toBe(true);
  });

  it('getBadgeIcons returns only badge category icons', () => {
    const badges = getBadgeIcons();
    expect(badges.length).toBeGreaterThan(0);
    expect(badges.every((i) => i.category === 'badge')).toBe(true);
  });
});
