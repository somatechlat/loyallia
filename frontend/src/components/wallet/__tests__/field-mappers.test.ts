/**
 * Unit tests for field mapping utilities.
 */

import { describe, it, expect } from 'vitest';
import type { UnifiedField, WalletPassStudioState } from '@/components/wallet/types';
import {
  mapFieldToApple,
  mapFieldToGoogle,
  mapFieldsToApple,
  mapFieldsToGoogle,
  resolveDynamicTemplate,
  buildApplePass,
  buildGooglePass,
} from '@/components/wallet/utils/field-mappers';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function makeField(overrides: Partial<UnifiedField> & { id: string }): UnifiedField {
  return {
    label: 'Label',
    value: 'Value',
    fieldGroup: 'header',
    order: 0,
    showOnApple: true,
    showOnGoogle: true,
    isDynamic: false,
    dataType: 'text',
    appleOptions: {},
    googleOptions: { isPredefined: false },
    notifications: {},
    formatting: { isLink: false },
    ...overrides,
  };
}

function makeState(overrides: Partial<WalletPassStudioState> = {}): WalletPassStudioState {
  return {
    version: 2,
    id: 'test-pass-123',
    name: 'Test Pass',
    cardType: 'stamp',
    industry: 'food',
    colors: {
      background: '#1A1A1A',
      foreground: '#FFFFFF',
      label: '#9CA3AF',
      accent: '#3B82F6',
    },
    images: {},
    fields: [],
    cardTypeConfig: {
      cardType: 'stamp',
      stampsRequired: 10,
      rewardDescription: '',
      stampType: 'visit',
      consumptionPerStamp: 1,
      stampExpiry: 'unlimited',
      stampsAtIssue: 0,
      dailyStampLimit: 1,
      birthdayStamps: 0,
      stampShape: 'circle',
      stampIcon: '',
      stampFilledIcon: '',
      stampColor: '#3B82F6',
      stampGridLayout: '5x2',
    },
    barcode: {
      format: 'QR_CODE',
      message: '',
      messageEncoding: 'iso-8859-1',
    },
    backContent: { fields: [], links: [], detailImages: [] },
    apple: {
      passStyle: 'storeCard',
      description: 'Test',
      organizationName: 'Loyallia',
      nfc: {
        enabled: false,
        requiresAuthentication: false,
      },
      locations: [],
      beacons: [],
      suppressStripShine: false,
      sharingProhibited: false,
      voided: false,
    },
    google: {
      passType: 'LoyaltyClass',
      programName: 'Loyallia Rewards',
      hexBackgroundColor: '#1A1A1A',
      reviewStatus: 'UNDER_REVIEW',
      allowMultipleUsers: 'ONE_USER_ALL_DEVICES',
      messages: [],
      notifyPreference: false,
    },
    ui: {
      activeTab: 'fields',
      platformView: 'both',
      showBack: false,
      zoom: 1,
      isModified: false,
    },
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  mapFieldToApple                                                    */
/* ------------------------------------------------------------------ */

describe('mapFieldToApple', () => {
  it('maps basic field properties', () => {
    const field = makeField({ id: 'f1', label: 'Name', value: 'John' });
    const apple = mapFieldToApple(field);

    expect(apple.key).toBe('f1');
    expect(apple.label).toBe('Name');
    expect(apple.value).toBe('John');
  });

  it('includes optional Apple options when present', () => {
    const field = makeField({
      id: 'f2',
      label: 'Date',
      value: '2025-01-01',
      appleOptions: {
        textAlignment: 'PKTextAlignmentCenter',
        dateStyle: 'PKDateStyleShort',
      },
    });
    const apple = mapFieldToApple(field);

    expect(apple.textAlignment).toBe('PKTextAlignmentCenter');
    expect(apple.dateStyle).toBe('PKDateStyleShort');
    expect(apple.timeStyle).toBeUndefined();
  });

  it('reads changeMessage from structured notification config', () => {
    const field = makeField({
      id: 'f3',
      label: 'Points',
      value: '100',
      notifications: {
        appleChangeMessage: { enabled: true, message: 'Updated to %@' },
      },
    });
    const apple = mapFieldToApple(field);

    expect(apple.changeMessage).toBe('Updated to %@');
  });

  it('reads changeMessage from legacy flat string for backward compat', () => {
    const field = makeField({
      id: 'f4',
      label: 'Points',
      value: '100',
      notifications: {
        appleChangeMessage: 'Legacy message' as any,
      },
    });
    const apple = mapFieldToApple(field);

    expect(apple.changeMessage).toBe('Legacy message');
  });
});

/* ------------------------------------------------------------------ */
/*  mapFieldToGoogle                                                   */
/* ------------------------------------------------------------------ */

describe('mapFieldToGoogle', () => {
  it('maps basic field to Google row item', () => {
    const field = makeField({ id: 'g1', label: 'Points', value: '100' });
    const google = mapFieldToGoogle(field, 0);

    expect(google.id).toBe('g1');
    expect(google.fieldPath).toBe('class.header[0]');
    expect(google.label).toBe('Points');
    expect(google.displayName).toBe('Points');
    expect(google.value).toBe('100');
  });

  it('uses the provided position index', () => {
    const field = makeField({ id: 'g2', fieldGroup: 'secondary' });
    const google = mapFieldToGoogle(field, 2);

    expect(google.fieldPath).toBe('class.secondary[2]');
  });
});

/* ------------------------------------------------------------------ */
/*  mapFieldsToApple                                                   */
/* ------------------------------------------------------------------ */

describe('mapFieldsToApple', () => {
  it('maps 3 header fields to Apple headerFields', () => {
    const fields: UnifiedField[] = [
      makeField({ id: 'h1', fieldGroup: 'header', order: 0 }),
      makeField({ id: 'h2', fieldGroup: 'header', order: 1 }),
      makeField({ id: 'h3', fieldGroup: 'header', order: 2 }),
    ];
    const apple = mapFieldsToApple(fields);

    expect(apple.headerFields).toHaveLength(3);
    expect(apple.headerFields.map((f) => f.key)).toEqual(['h1', 'h2', 'h3']);
  });

  it('maps 1 primary field to Apple primaryFields', () => {
    const fields: UnifiedField[] = [
      makeField({ id: 'p1', fieldGroup: 'primary', order: 0 }),
    ];
    const apple = mapFieldsToApple(fields);

    expect(apple.primaryFields).toHaveLength(1);
    expect(apple.primaryFields[0].key).toBe('p1');
  });

  it('skips fields where showOnApple=false', () => {
    const fields: UnifiedField[] = [
      makeField({ id: 'a1', fieldGroup: 'header', showOnApple: true }),
      makeField({ id: 'a2', fieldGroup: 'header', showOnApple: false }),
      makeField({ id: 'a3', fieldGroup: 'header', showOnApple: true }),
    ];
    const apple = mapFieldsToApple(fields);

    expect(apple.headerFields).toHaveLength(2);
    expect(apple.headerFields.map((f) => f.key)).toEqual(['a1', 'a3']);
  });

  it('sorts fields by order within each group', () => {
    const fields: UnifiedField[] = [
      makeField({ id: 'z1', fieldGroup: 'header', order: 2 }),
      makeField({ id: 'z2', fieldGroup: 'header', order: 0 }),
      makeField({ id: 'z3', fieldGroup: 'header', order: 1 }),
    ];
    const apple = mapFieldsToApple(fields);

    expect(apple.headerFields.map((f) => f.key)).toEqual(['z2', 'z3', 'z1']);
  });

  it('places back group fields into backFields', () => {
    const fields: UnifiedField[] = [
      makeField({ id: 'b1', fieldGroup: 'back', order: 0 }),
      makeField({ id: 'b2', fieldGroup: 'back', order: 1 }),
    ];
    const apple = mapFieldsToApple(fields);

    expect(apple.backFields).toHaveLength(2);
    expect(apple.headerFields).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/*  mapFieldsToGoogle                                                  */
/* ------------------------------------------------------------------ */

describe('mapFieldsToGoogle', () => {
  it('skips fields where showOnGoogle=false', () => {
    const fields: UnifiedField[] = [
      makeField({ id: 'g1', fieldGroup: 'header', showOnGoogle: true }),
      makeField({ id: 'g2', fieldGroup: 'header', showOnGoogle: false }),
    ];
    const google = mapFieldsToGoogle(fields);

    const headerRow = google.find((r) => r.id === 'row1');
    expect(headerRow).toBeDefined();
    expect(headerRow!.items).toHaveLength(1);
    expect(headerRow!.items[0].id).toBe('g1');
  });

  it('assigns row types based on item count', () => {
    const fields: UnifiedField[] = [
      makeField({ id: 's1', fieldGroup: 'secondary', order: 0 }),
      makeField({ id: 's2', fieldGroup: 'secondary', order: 1 }),
    ];
    const google = mapFieldsToGoogle(fields);

    const secondaryRow = google.find((r) => r.id === 'row3');
    expect(secondaryRow).toBeDefined();
    expect(secondaryRow!.type).toBe('twoItems');
  });

  it('assigns threeItems when more than 2 fields in a group', () => {
    const fields: UnifiedField[] = [
      makeField({ id: 'a1', fieldGroup: 'auxiliary', order: 0 }),
      makeField({ id: 'a2', fieldGroup: 'auxiliary', order: 1 }),
      makeField({ id: 'a3', fieldGroup: 'auxiliary', order: 2 }),
      makeField({ id: 'a4', fieldGroup: 'auxiliary', order: 3 }),
    ];
    const google = mapFieldsToGoogle(fields);

    const auxRow = google.find((r) => r.id === 'row4');
    expect(auxRow).toBeDefined();
    expect(auxRow!.type).toBe('threeItems');
    expect(auxRow!.items).toHaveLength(4);
  });
});

/* ------------------------------------------------------------------ */
/*  resolveDynamicTemplate                                             */
/* ------------------------------------------------------------------ */

describe('resolveDynamicTemplate', () => {
  it('resolves {customer_name} with context', () => {
    const result = resolveDynamicTemplate('Hello {customer_name}', {
      customer_name: 'Alice',
    });
    expect(result).toBe('Hello Alice');
  });

  it('resolves multiple templates', () => {
    const result = resolveDynamicTemplate('{greeting} {customer_name}!', {
      greeting: 'Hi',
      customer_name: 'Bob',
    });
    expect(result).toBe('Hi Bob!');
  });

  it('replaces unknown templates with empty string', () => {
    const result = resolveDynamicTemplate('Hello {unknown}', {});
    expect(result).toBe('Hello ');
  });

  it('converts number context values to strings', () => {
    const result = resolveDynamicTemplate('Points: {balance}', {
      balance: 1250,
    });
    expect(result).toBe('Points: 1250');
  });

  it('returns plain string when no templates present', () => {
    const result = resolveDynamicTemplate('No templates here', {});
    expect(result).toBe('No templates here');
  });
});

/* ------------------------------------------------------------------ */
/*  buildApplePass                                                     */
/* ------------------------------------------------------------------ */

describe('buildApplePass', () => {
  it('builds complete Apple pass object structure', () => {
    const state = makeState({
      fields: [
        makeField({ id: 'h1', fieldGroup: 'header', label: 'Store', value: 'Acme' }),
        makeField({ id: 'p1', fieldGroup: 'primary', label: 'Balance', value: '100 pts' }),
      ],
      barcode: {
        format: 'QR_CODE',
        message: '123456',
        messageEncoding: 'iso-8859-1',
        altText: 'Scan me',
      },
    });

    const pass = buildApplePass(state) as Record<string, unknown>;
    const storeCard = pass.storeCard as Record<string, unknown>;

    expect(storeCard).toBeDefined();
    expect(storeCard.formatVersion).toBe(1);
    expect(storeCard.serialNumber).toBe('test-pass-123');
    expect(storeCard.description).toBe('Test Pass');
    expect(storeCard.organizationName).toBe('Loyallia');
    expect(storeCard.foregroundColor).toBe('#FFFFFF');
    expect(storeCard.backgroundColor).toBe('#1A1A1A');

    const headerFields = storeCard.headerFields as Array<{ key: string }>;
    expect(headerFields).toHaveLength(1);
    expect(headerFields[0].key).toBe('h1');

    const primaryFields = storeCard.primaryFields as Array<{ key: string }>;
    expect(primaryFields).toHaveLength(1);
    expect(primaryFields[0].key).toBe('p1');

    const barcode = storeCard.barcode as Record<string, unknown>;
    expect(barcode).toBeDefined();
    expect(barcode.message).toBe('123456');
  });

  it('omits barcode when message is empty', () => {
    const state = makeState({
      barcode: { format: 'QR_CODE', message: '', messageEncoding: 'iso-8859-1' },
    });
    const pass = buildApplePass(state) as Record<string, unknown>;
    const storeCard = pass.storeCard as Record<string, unknown>;

    expect(storeCard.barcode).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/*  buildGooglePass                                                    */
/* ------------------------------------------------------------------ */

describe('buildGooglePass', () => {
  it('builds complete Google pass class object structure', () => {
    const state = makeState({
      fields: [
        makeField({ id: 'h1', fieldGroup: 'header', label: 'Store', value: 'Acme' }),
        makeField({ id: 's1', fieldGroup: 'secondary', label: 'Tier', value: 'Gold' }),
        makeField({ id: 's2', fieldGroup: 'secondary', label: 'Since', value: '2024' }),
      ],
      google: {
        passType: 'LoyaltyClass',
        programName: 'Acme Rewards',
        hexBackgroundColor: '#1A1A1A',
        reviewStatus: 'UNDER_REVIEW',
        allowMultipleUsers: 'ONE_USER_ALL_DEVICES',
        messages: [{ header: 'Welcome', body: 'Thanks for joining!' }],
        notifyPreference: true,
      },
    });

    const passClass = buildGooglePass(state) as Record<string, unknown>;

    expect(passClass.id).toBe('test-pass-123.LoyaltyClass');
    expect(passClass.issuerName).toBe('Acme Rewards');
    expect(passClass.programName).toBe('Acme Rewards');
    expect(passClass.reviewStatus).toBe('UNDER_REVIEW');
    expect(passClass.hexBackgroundColor).toBe('#1A1A1A');

    const rows = passClass.rows as Array<{ id: string; items: unknown[] }>;
    expect(rows).toBeDefined();
    expect(rows.length).toBeGreaterThanOrEqual(1);

    const secondaryRow = rows.find((r) => r.id === 'row3');
    expect(secondaryRow).toBeDefined();
    expect(secondaryRow!.items).toHaveLength(2);
  });
});
