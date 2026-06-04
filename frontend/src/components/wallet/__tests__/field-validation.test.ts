/**
 * Unit tests for field validation utilities.
 */

import { describe, it, expect } from 'vitest';
import type { UnifiedField, CardType, FieldGroup } from '@/components/wallet/types';
import {
  validateFields,
  validateFieldGroupLimits,
  canAddFieldToGroup,
  validateField,
  getRemainingSlots,
  hasDynamicTemplates,
  extractDynamicTemplates,
  validateDynamicTemplates,
} from '@/components/wallet/utils/field-validation';

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
    appleOptions: {},
    googleOptions: { isPredefined: false },
    notifications: {},
    formatting: { isLink: false },
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  validateFieldGroupLimits                                           */
/* ------------------------------------------------------------------ */

describe('validateFieldGroupLimits', () => {
  it('returns correct counts for stamp card type', () => {
    const fields: UnifiedField[] = [
      makeField({ id: 'h1', fieldGroup: 'header' }),
      makeField({ id: 'p1', fieldGroup: 'primary' }),
      makeField({ id: 's1', fieldGroup: 'secondary' }),
      makeField({ id: 's2', fieldGroup: 'secondary' }),
      makeField({ id: 'a1', fieldGroup: 'auxiliary' }),
    ];
    const result = validateFieldGroupLimits(fields, 'stamp');

    const header = result.find((r) => r.group === 'header');
    expect(header).toBeDefined();
    expect(header!.current).toBe(1);
    expect(header!.max).toBe(1);
    expect(header!.isValid).toBe(true);

    const primary = result.find((r) => r.group === 'primary');
    expect(primary!.current).toBe(1);
    expect(primary!.max).toBe(1);

    const secondary = result.find((r) => r.group === 'secondary');
    expect(secondary!.current).toBe(2);
    expect(secondary!.max).toBe(2);
    expect(secondary!.isValid).toBe(true);

    const auxiliary = result.find((r) => r.group === 'auxiliary');
    expect(auxiliary!.current).toBe(1);
    expect(auxiliary!.max).toBe(4);
  });

  it('flags invalid when limit exceeded', () => {
    const fields: UnifiedField[] = [
      makeField({ id: 'h1', fieldGroup: 'header' }),
      makeField({ id: 'h2', fieldGroup: 'header' }),
    ];
    const result = validateFieldGroupLimits(fields, 'stamp');

    const header = result.find((r) => r.group === 'header');
    expect(header!.isValid).toBe(false);
    expect(header!.current).toBe(2);
    expect(header!.max).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/*  canAddFieldToGroup                                                 */
/* ------------------------------------------------------------------ */

describe('canAddFieldToGroup', () => {
  it('returns true when under limit', () => {
    const fields: UnifiedField[] = [
      makeField({ id: 'h1', fieldGroup: 'header' }),
    ];
    expect(canAddFieldToGroup(fields, 'header', 'stamp')).toBe(false); // stamp maxHeaderFields = 1
  });

  it('returns false when limit reached', () => {
    const fields: UnifiedField[] = [
      makeField({ id: 'h1', fieldGroup: 'header' }),
    ];
    expect(canAddFieldToGroup(fields, 'header', 'stamp')).toBe(false);
  });

  it('returns true for groups with room', () => {
    const fields: UnifiedField[] = [
      makeField({ id: 'a1', fieldGroup: 'auxiliary' }),
    ];
    expect(canAddFieldToGroup(fields, 'auxiliary', 'stamp')).toBe(true); // max 4
  });

  it('returns false when no room in auxiliary', () => {
    const fields: UnifiedField[] = [
      makeField({ id: 'a1', fieldGroup: 'auxiliary' }),
      makeField({ id: 'a2', fieldGroup: 'auxiliary' }),
      makeField({ id: 'a3', fieldGroup: 'auxiliary' }),
      makeField({ id: 'a4', fieldGroup: 'auxiliary' }),
    ];
    expect(canAddFieldToGroup(fields, 'auxiliary', 'stamp')).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  getRemainingSlots                                                  */
/* ------------------------------------------------------------------ */

describe('getRemainingSlots', () => {
  it('returns correct remaining number for header', () => {
    const fields: UnifiedField[] = [
      makeField({ id: 'h1', fieldGroup: 'header' }),
    ];
    expect(getRemainingSlots(fields, 'header', 'stamp')).toBe(0); // 1/1 used
  });

  it('returns correct remaining number for secondary', () => {
    const fields: UnifiedField[] = [
      makeField({ id: 's1', fieldGroup: 'secondary' }),
    ];
    expect(getRemainingSlots(fields, 'secondary', 'stamp')).toBe(1); // 1/2 used
  });

  it('returns 0 when over limit (saturates at 0)', () => {
    const fields: UnifiedField[] = [
      makeField({ id: 'h1', fieldGroup: 'header' }),
      makeField({ id: 'h2', fieldGroup: 'header' }),
    ];
    expect(getRemainingSlots(fields, 'header', 'stamp')).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  validateField                                                      */
/* ------------------------------------------------------------------ */

describe('validateField', () => {
  it('catches empty label', () => {
    const field = makeField({ id: 'f1', label: '' });
    const errors = validateField(field);

    expect(errors.some((e) => e.message.includes('label'))).toBe(true);
    expect(errors.find((e) => e.message.includes('label'))!.severity).toBe('error');
  });

  it('catches empty value', () => {
    const field = makeField({ id: 'f2', value: '' });
    const errors = validateField(field);

    expect(errors.some((e) => e.message.includes('value'))).toBe(true);
    expect(errors.find((e) => e.message.includes('value'))!.severity).toBe('error');
  });

  it('returns no errors for valid field', () => {
    const field = makeField({ id: 'f3', label: 'Name', value: 'John' });
    const errors = validateField(field);

    const labelOrValueErrors = errors.filter(
      (e) => e.message.includes('label') || e.message.includes('value')
    );
    expect(labelOrValueErrors).toHaveLength(0);
  });

  it('includes dynamic template errors', () => {
    const field = makeField({ id: 'f4', label: 'X', value: 'Hello {unknown_template}' });
    const errors = validateField(field);

    expect(errors.some((e) => e.message.includes('Unknown dynamic template'))).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  hasDynamicTemplates                                                */
/* ------------------------------------------------------------------ */

describe('hasDynamicTemplates', () => {
  it('detects {stamp_count}', () => {
    expect(hasDynamicTemplates('You have {stamp_count} stamps')).toBe(true);
  });

  it('returns false for plain text', () => {
    expect(hasDynamicTemplates('No templates here')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(hasDynamicTemplates('')).toBe(false);
  });

  it('detects multiple templates', () => {
    expect(hasDynamicTemplates('{a} and {b}')).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  extractDynamicTemplates                                            */
/* ------------------------------------------------------------------ */

describe('extractDynamicTemplates', () => {
  it('returns array of template names from {stamp_count}', () => {
    expect(extractDynamicTemplates('You have {stamp_count} stamps')).toEqual(['stamp_count']);
  });

  it('returns empty array for plain text', () => {
    expect(extractDynamicTemplates('plain text')).toEqual([]);
  });

  it('extracts multiple templates in order', () => {
    const result = extractDynamicTemplates('{customer_name} has {points_balance} points');
    expect(result).toEqual(['customer_name', 'points_balance']);
  });

  it('handles duplicates', () => {
    const result = extractDynamicTemplates('{a} and {a}');
    expect(result).toEqual(['a', 'a']);
  });
});

/* ------------------------------------------------------------------ */
/*  validateDynamicTemplates                                           */
/* ------------------------------------------------------------------ */

describe('validateDynamicTemplates', () => {
  it('returns empty for known templates', () => {
    const errors = validateDynamicTemplates('Hello {customer_name}');
    expect(errors).toHaveLength(0);
  });

  it('flags unknown templates', () => {
    const errors = validateDynamicTemplates('Hello {totally_unknown_template}');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('totally_unknown_template');
    expect(errors[0].severity).toBe('error');
  });

  it('flags multiple unknown templates', () => {
    const errors = validateDynamicTemplates('{unknown_one} and {unknown_two}');
    expect(errors).toHaveLength(2);
    expect(errors[0].message).toContain('unknown_one');
    expect(errors[1].message).toContain('unknown_two');
  });

  it('allows mixed known and unknown', () => {
    const errors = validateDynamicTemplates('{customer_name} and {bogus}');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('bogus');
  });
});

/* ------------------------------------------------------------------ */
/*  validateFields (full validation)                                   */
/* ------------------------------------------------------------------ */

describe('validateFields', () => {
  it('returns empty array for valid fields within limits', () => {
    const fields: UnifiedField[] = [
      makeField({ id: 'h1', fieldGroup: 'header' }),
      makeField({ id: 'p1', fieldGroup: 'primary' }),
    ];
    const errors = validateFields(fields, 'stamp');
    const limitErrors = errors.filter((e) => e.fieldId.startsWith('group:'));
    expect(limitErrors).toHaveLength(0);
  });

  it('returns group limit errors when exceeded', () => {
    const fields: UnifiedField[] = [
      makeField({ id: 'h1', fieldGroup: 'header' }),
      makeField({ id: 'h2', fieldGroup: 'header' }),
    ];
    const errors = validateFields(fields, 'stamp');

    const limitError = errors.find((e) => e.fieldId === 'group:header');
    expect(limitError).toBeDefined();
    expect(limitError!.severity).toBe('error');
    expect(limitError!.message).toContain('exceeds limit');
  });

  it('warns when too many Apple front fields', () => {
    const fields: UnifiedField[] = Array.from({ length: 14 }, (_, i) =>
      makeField({
        id: `f${i}`,
        fieldGroup: i < 4 ? 'header' : i < 8 ? 'secondary' : 'auxiliary',
        showOnApple: true,
      })
    );
    const errors = validateFields(fields, 'stamp');

    const warning = errors.find((e) => e.fieldId === 'apple:frontFields');
    expect(warning).toBeDefined();
    expect(warning!.severity).toBe('warning');
  });

  it('returns error for Google rows with more than 3 items', () => {
    const fields: UnifiedField[] = Array.from({ length: 5 }, (_, i) =>
      makeField({
        id: `g${i}`,
        fieldGroup: 'auxiliary',
        showOnGoogle: true,
      })
    );
    const errors = validateFields(fields, 'stamp');

    const googleError = errors.find((e) => e.fieldId === 'google:row:auxiliary');
    expect(googleError).toBeDefined();
    expect(googleError!.severity).toBe('error');
    expect(googleError!.message).toContain('max 3');
  });
});
