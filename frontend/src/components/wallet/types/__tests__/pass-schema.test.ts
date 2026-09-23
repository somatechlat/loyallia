/**
 * Unit tests for the single pass schema: limits table and namespaced token dictionary.
 */

import { describe, it, expect } from 'vitest';
import {
  LIMITS,
  TOKENS,
  LEGACY_ID_MAP,
  PASS_TOKEN_PATTERN,
  PASS_TOKEN_PATTERN_GLOBAL,
  resolveToken,
  resolvePassTemplate,
  migrateLegacyTokens,
  PASS_STYLE_OPTIONS,
} from '../pass-schema';
import { DYNAMIC_TEMPLATES } from '../dynamic-templates';
import { CARD_TYPE_METADATA } from '../../constants';
import type { CardType } from '../unified-state';

const ALL_CARD_TYPES: CardType[] = [
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

const PLAN_MANDATED_NEW_TOKENS = [
  '{{customer.first_name}}',
  '{{customer.last_name}}',
  '{{stamp.total}}',
  '{{cashback.balance}}',
];

const BANNED_KEYS = [
  '{{first_name}}',
  '{{customer_name}}',
  'customer_name',
  'stamp_count',
  'gift_amount',
  'points_balance',
];

describe('LIMITS', () => {
  it('has exactly one auxiliary-field limit', () => {
    expect(LIMITS.auxiliaryFields.max).toBe(4);
  });

  it('has one limit per field group with the canonical Apple field counts', () => {
    expect(LIMITS.headerFields.max).toBe(3);
    expect(LIMITS.primaryFields.max).toBe(1);
    expect(LIMITS.secondaryFields.max).toBe(4);
    expect(LIMITS.auxiliaryFields.max).toBe(4);
    expect(LIMITS.backFields.max).toBe(8);
  });
});

describe('TOKENS', () => {
  it('exposes one namespaced token dictionary', () => {
    expect(Object.keys(TOKENS).every((k) => k.startsWith('{{'))).toBe(true);
    expect(Object.keys(TOKENS).every((k) => k.endsWith('}}'))).toBe(true);
    expect(TOKENS).toHaveProperty('{{customer.first_name}}');
    expect(TOKENS).toHaveProperty('{{gift.balance}}');
    expect(TOKENS).not.toHaveProperty('{{first_name}}');
    expect(TOKENS).not.toHaveProperty('{{customer_name}}');
  });

  it('every token key is namespaced (namespace.leaf inside the braces)', () => {
    for (const k of Object.keys(TOKENS)) {
      expect(k.slice(2, -2)).toMatch(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/);
    }
  });

  it('bans legacy bare ids and un-namespaced forms as keys', () => {
    for (const banned of BANNED_KEYS) {
      expect(TOKENS).not.toHaveProperty(banned);
    }
  });

  it('preserves every legacy id under a namespaced key', () => {
    for (const [, newKey] of Object.entries(LEGACY_ID_MAP)) {
      expect(TOKENS).toHaveProperty(newKey);
    }
  });

  it('includes every plan-mandated new token', () => {
    for (const key of PLAN_MANDATED_NEW_TOKENS) {
      expect(TOKENS).toHaveProperty(key);
    }
  });

  it('covers the full migrated dictionary (26 legacy + 4 new)', () => {
    expect(Object.keys(TOKENS)).toHaveLength(
      Object.keys(LEGACY_ID_MAP).length + PLAN_MANDATED_NEW_TOKENS.length
    );
  });

  it('TOKENS values describe each token (label + example), not a placeholder string', () => {
    for (const v of Object.values(TOKENS)) {
      expect(typeof v.label).toBe('string');
      expect(v.label.length).toBeGreaterThan(0);
      expect(typeof v.example).toBe('string');
      expect(v.example.length).toBeGreaterThan(0);
      expect(typeof v.description).toBe('string');
      expect(v.description.length).toBeGreaterThan(0);
    }
  });

  it('every token lists at least one applicable card type', () => {
    for (const v of Object.values(TOKENS)) {
      expect(Array.isArray(v.applicableCardTypes)).toBe(true);
      expect(v.applicableCardTypes.length).toBeGreaterThan(0);
      for (const ct of v.applicableCardTypes) {
        expect(ALL_CARD_TYPES).toContain(ct);
      }
    }
  });
});

describe('resolveToken', () => {
  it('resolves tokens against a sample customer (flat camelCase context)', () => {
    expect(resolveToken('{{customer.first_name}}', { firstName: 'Ana' })).toBe('Ana');
  });

  it('supports nested context', () => {
    expect(resolveToken('{{customer.first_name}}', { customer: { firstName: 'Ana' } })).toBe('Ana');
  });

  it('supports nested snake_case context', () => {
    expect(resolveToken('{{customer.first_name}}', { customer: { first_name: 'Ana' } })).toBe('Ana');
  });

  it('supports flat snake_case context', () => {
    expect(resolveToken('{{customer.first_name}}', { first_name: 'Ana' })).toBe('Ana');
  });

  it('resolves multi-word leaves via snake_to_camel', () => {
    expect(resolveToken('{{loyalty.points_balance}}', { pointsBalance: '1,250' })).toBe('1,250');
  });

  it('returns the token unchanged when nothing resolves', () => {
    expect(resolveToken('{{customer.first_name}}', {})).toBe('{{customer.first_name}}');
    expect(resolveToken('{{nope.nothing}}', { firstName: 'Ana' })).toBe('{{nope.nothing}}');
  });

  it('never resolves inherited prototype keys (constructor and friends)', () => {
    expect(resolveToken('{{customer.constructor}}', {})).toBe('{{customer.constructor}}');
    expect(resolveToken('{{x.constructor}}', {})).toBe('{{x.constructor}}');
    expect(resolveToken('{{customer.constructor}}', { customer: {} })).toBe(
      '{{customer.constructor}}'
    );
    expect(resolveToken('{{customer.toString}}', { customer: {} })).toBe('{{customer.toString}}');
  });

  it('applies the documented coercion rule (bool/int/float parity)', () => {
    expect(resolveToken('{{x.ok}}', { ok: true })).toBe('true');
    expect(resolveToken('{{x.ok}}', { ok: false })).toBe('false');
    expect(resolveToken('{{x.n}}', { n: 1.0 })).toBe('1');
    expect(resolveToken('{{x.z}}', { z: 0 })).toBe('0');
    expect(resolveToken('{{x.z}}', { z: false })).toBe('false');
    expect(resolveToken('{{x.half}}', { half: 1.5 })).toBe('1.5');
  });

  it('treats null/undefined/array/non-plain-object leaves as unresolved', () => {
    expect(resolveToken('{{x.nil}}', { nil: null })).toBe('{{x.nil}}');
    expect(resolveToken('{{x.missing}}', { missing: undefined })).toBe('{{x.missing}}');
    expect(resolveToken('{{x.arr}}', { arr: [1, 2] })).toBe('{{x.arr}}');
    expect(resolveToken('{{x.fn}}', { fn: () => 'x' })).toBe('{{x.fn}}');
  });

  it('rejects malformed brace shapes without slicing blindly', () => {
    expect(resolveToken('{{customer.first_name}', { firstName: 'Ana' })).toBe(
      '{{customer.first_name}'
    );
    expect(resolveToken('{customer.first_name}}', { firstName: 'Ana' })).toBe(
      '{customer.first_name}}'
    );
    expect(resolveToken('customer.first_name', { firstName: 'Ana' })).toBe('customer.first_name');
    expect(resolveToken('{{first_name}}', { first_name: 'Ana' })).toBe('{{first_name}}');
  });
});

describe('resolvePassTemplate', () => {
  it('substitutes every known token and leaves unknown ones intact', () => {
    const out = resolvePassTemplate(
      'Hi {{customer.first_name}}, you have {{stamp.count}} stamps',
      { firstName: 'Ana', stamp: { count: 7 } }
    );
    expect(out).toBe('Hi Ana, you have 7 stamps');
    expect(resolvePassTemplate('{{nope.nothing}}', {})).toBe('{{nope.nothing}}');
  });

  it('does not touch single-brace i18n interpolation syntax', () => {
    expect(resolvePassTemplate('Hello {name}', { name: 'Ana' })).toBe('Hello {name}');
    expect(resolvePassTemplate('{count} of {total}', { count: 1, total: 2 })).toBe('{count} of {total}');
  });

  it('only matches well-formed {{namespace.leaf}} tokens', () => {
    expect(resolvePassTemplate('{{foo}}', { foo: 'x' })).toBe('{{foo}}');
    expect(resolvePassTemplate('{{Foo.bar}}', { Foo: { bar: 'x' } })).toBe('{{Foo.bar}}');
    expect(resolvePassTemplate('{{a.b.c}}', {})).toBe('{{a.b.c}}');
  });

  it('replaces repeated tokens', () => {
    expect(
      resolvePassTemplate('{{customer.name}} / {{customer.name}}', { name: 'Ana Smith' })
    ).toBe('Ana Smith / Ana Smith');
  });
});

describe('PASS_TOKEN_PATTERN (single source)', () => {
  it('exports a non-global source and a global derivative', () => {
    expect(PASS_TOKEN_PATTERN.global).toBe(false);
    expect(PASS_TOKEN_PATTERN_GLOBAL.global).toBe(true);
    expect(PASS_TOKEN_PATTERN.source).toBe(PASS_TOKEN_PATTERN_GLOBAL.source);
  });

  it('matches only well-formed {{namespace.leaf}} tokens', () => {
    expect(PASS_TOKEN_PATTERN.test('{{customer.name}}')).toBe(true);
    expect(PASS_TOKEN_PATTERN.test('{{foo}}')).toBe(false);
    expect(PASS_TOKEN_PATTERN.test('{customer.name}')).toBe(false);
    expect(PASS_TOKEN_PATTERN.test('{{customer_name}}')).toBe(false);
  });
});

describe('migrateLegacyTokens (I5 vocabulary rewrite)', () => {
  it('rewrites known single-brace placeholders to namespaced tokens', () => {
    expect(migrateLegacyTokens('Hi {customer_name}!')).toBe('Hi {{customer.name}}!');
    expect(migrateLegacyTokens('{stamp_count}')).toBe('{{stamp.count}}');
  });

  it('rewrites a bare legacy id used as a whole template', () => {
    expect(migrateLegacyTokens('customer_name')).toBe('{{customer.name}}');
    expect(migrateLegacyTokens('points_balance')).toBe('{{loyalty.points_balance}}');
  });

  it('leaves unknown single-brace placeholders alone', () => {
    expect(migrateLegacyTokens('Hi {unknown_thing}!')).toBe('Hi {unknown_thing}!');
    expect(migrateLegacyTokens('{not_a_legacy_id}')).toBe('{not_a_legacy_id}');
  });

  it('leaves namespaced tokens and i18n-style text alone', () => {
    expect(migrateLegacyTokens('{{customer.name}}')).toBe('{{customer.name}}');
    expect(migrateLegacyTokens('Hello {name}')).toBe('Hello {name}');
    expect(migrateLegacyTokens('Hello customer_name')).toBe('Hello customer_name');
  });

  it('maps every LEGACY_ID_MAP entry into TOKENS', () => {
    for (const newKey of Object.values(LEGACY_ID_MAP)) {
      expect(TOKENS).toHaveProperty(newKey);
    }
  });
});

describe('M1 schema array isolation', () => {
  it('DYNAMIC_TEMPLATES.applicableCardTypes does not alias TOKENS', () => {
    const template = DYNAMIC_TEMPLATES.find((t) => t.id === '{{customer.name}}');
    expect(template).toBeDefined();
    const token = TOKENS['{{customer.name}}'];
    expect(template!.applicableCardTypes).not.toBe(token!.applicableCardTypes);
    template!.applicableCardTypes.length = 0;
    expect(token!.applicableCardTypes.length).toBeGreaterThan(0);
  });
});

describe('D-11 PassStyle deletion lock', () => {
  it('PassStyle never contains transitStyle (D-11)', () => {
    expect(PASS_STYLE_OPTIONS).not.toContain('transitStyle');
    expect(PASS_STYLE_OPTIONS).toEqual(
      expect.arrayContaining(['generic', 'coupon', 'storeCard', 'boardingPass', 'eventTicket'])
    );
    expect(PASS_STYLE_OPTIONS).toHaveLength(5);
  });
});

describe('D-10 limit-table deletion lock', () => {
  it('CARD_TYPE_METADATA carries no second limit table (D-10)', () => {
    for (const meta of Object.values(CARD_TYPE_METADATA)) {
      expect(meta).not.toHaveProperty('maxHeaderFields');
      expect(meta).not.toHaveProperty('maxPrimaryFields');
      expect(meta).not.toHaveProperty('maxSecondaryFields');
      expect(meta).not.toHaveProperty('maxAuxiliaryFields');
      expect(meta).not.toHaveProperty('maxBackFields');
      expect(meta).not.toHaveProperty('maxFields');
    }
  });
});

describe('golden fixture parity', () => {
  it('frontend schema matches the committed golden fixture', async () => {
    const fixture = (await import('./golden/pass-schema.json')).default as {
      limits: Record<string, number>;
      tokens: Record<string, unknown>;
    };
    expect(
      Object.fromEntries(Object.entries(LIMITS).map(([k, v]) => [k, v.max]))
    ).toEqual(fixture.limits);
    expect(JSON.parse(JSON.stringify(TOKENS))).toEqual(fixture.tokens);
  });
});
