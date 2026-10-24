/**
 * Google field-parity: custom designer fields must reach the Google rows
 * through their own text-module path (`object.textModulesData['<id>']`),
 * exactly like the backend pass engine emits them — while well-known ids keep
 * their legacy object/class paths and the strict legacy mapper is unchanged.
 */
import { describe, it, expect } from 'vitest';
import type { UnifiedField } from '@/components/wallet/types';
import {
  mapFieldToGoogle,
  mapFieldToGoogleRow,
  mapFieldsToGoogle,
  mapFieldsToGoogleRows,
  resolveGoogleFieldPath,
} from '@/components/wallet/utils/field-mappers';

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

describe('resolveGoogleFieldPath', () => {
  it('maps custom fields to their own text-module path', () => {
    const field = makeField({ id: 'bebida_favorita', label: 'Bebida favorita', value: 'Té verde' });
    expect(resolveGoogleFieldPath(field)).toBe("object.textModulesData['bebida_favorita']");
  });

  it('keeps well-known ids on their legacy object/class paths', () => {
    expect(resolveGoogleFieldPath(makeField({ id: 'customer_name' }))).toBe('object.accountName');
    expect(resolveGoogleFieldPath(makeField({ id: 'membership_id' }))).toBe('object.accountId');
    expect(resolveGoogleFieldPath(makeField({ id: 'stamps' }))).toBe('object.loyaltyPoints.balance');
    expect(resolveGoogleFieldPath(makeField({ id: 'tier' }))).toBe('class.rewardsTier');
  });

  it('honours an explicit fieldPath over the dynamic mapping', () => {
    const field = makeField({ id: 'custom_x' }) as UnifiedField & { fieldPath?: string };
    field.fieldPath = "object.textModulesData['explicit']";
    expect(resolveGoogleFieldPath(field)).toBe("object.textModulesData['explicit']");
  });

  it('returns null for fields without an id', () => {
    const field = makeField({ id: '' });
    expect(resolveGoogleFieldPath(field)).toBeNull();
  });
});

describe('mapFieldsToGoogleRows custom-field parity', () => {
  it('includes custom fields as text-module rows with label and value', () => {
    const rows = mapFieldsToGoogleRows([
      makeField({ id: 'bebida_favorita', label: 'Bebida favorita', value: 'Té verde', fieldGroup: 'secondary' }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe('oneItem');
    expect(rows[0].items).toHaveLength(1);
    expect(rows[0].items[0]).toMatchObject({
      id: 'bebida_favorita',
      fieldPath: "object.textModulesData['bebida_favorita']",
      label: 'Bebida favorita',
      displayName: 'Bebida favorita',
      value: 'Té verde',
    });
  });

  it('keeps well-known ids identical to the legacy strict mapper', () => {
    const fields = [
      makeField({ id: 'customer_name', label: 'Cliente', value: 'Ana', fieldGroup: 'header' }),
      makeField({ id: 'stamps', label: 'Sellos', value: '3 / 5', fieldGroup: 'primary' }),
    ];
    expect(mapFieldsToGoogleRows(fields)).toEqual(mapFieldsToGoogle(fields));
  });

  it('hides custom fields with showOnGoogle=false', () => {
    const rows = mapFieldsToGoogleRows([
      makeField({ id: 'interno', label: 'Interno', value: 'x', showOnGoogle: false, fieldGroup: 'secondary' }),
    ]);
    expect(rows).toEqual([]);
  });

  it('keeps the legacy strict mapper behaviour pinned (custom fields dropped)', () => {
    // Existing contract: mapFieldToGoogle returns null for custom ids.
    // The dynamic path lives in mapFieldToGoogleRow only.
    expect(mapFieldToGoogle(makeField({ id: 'bebida_favorita' }), 0)).toBeNull();
    expect(mapFieldsToGoogle([makeField({ id: 'bebida_favorita' })])).toEqual([]);
  });

  it('mapFieldToGoogleRow emits one item per custom field', () => {
    const item = mapFieldToGoogleRow(
      makeField({ id: 'postre_favorito', label: 'Postre', value: 'Tarta' }),
      0,
    );
    expect(item).not.toBeNull();
    expect(item?.fieldPath).toBe("object.textModulesData['postre_favorito']");
  });
});
