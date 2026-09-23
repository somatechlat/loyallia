/**
 * Single source of truth for pass field limits and mail-merge token vocabulary.
 *
 * LIMITS is the only frontend limit table. TOKENS is the only token dictionary.
 * Keys are literal `{{namespace.leaf}}` strings. Bare snake_case ids and
 * un-namespaced `{{leaf}}` forms are banned.
 *
 * This is NOT the i18n system. Pass-schema tokens are content placeholders for
 * pass field values; i18n uses single-brace `{name}` interpolation in UI chrome.
 */

import type { CardType } from './unified-state';

/* ------------------------------------------------------------------ */
/*  Field group limits                                                */
/* ------------------------------------------------------------------ */

/** Canonical Apple Wallet field-count limits, one entry per field group. */
export const LIMITS = {
  headerFields: { max: 3 },
  primaryFields: { max: 1 },
  secondaryFields: { max: 4 },
  auxiliaryFields: { max: 4 },
  backFields: { max: 8 },
} as const;

/* ------------------------------------------------------------------ */
/*  Pass styles                                                       */
/* ------------------------------------------------------------------ */

/**
 * Runtime list of Apple pass styles. Single source of truth; `PassStyle` in
 * unified-state is an alias of the derived union. `transitStyle` is banned.
 */
export const PASS_STYLE_OPTIONS = [
  'generic',
  'coupon',
  'storeCard',
  'boardingPass',
  'eventTicket',
] as const;

/** Union of PASS_STYLE_OPTIONS members. Compile-time locked to the array. */
export type PassStyleOption = (typeof PASS_STYLE_OPTIONS)[number];

/* ------------------------------------------------------------------ */
/*  Token dictionary                                                  */
/* ------------------------------------------------------------------ */

/** Definition of one mail-merge token in the pass content vocabulary. */
export interface TokenDefinition {
  label: string;
  description: string;
  example: string;
  /** Card types this token applies to. Treated as read-only by consumers. */
  applicableCardTypes: readonly CardType[];
}

const ALL_CARD_TYPES: readonly CardType[] = [
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

/**
 * Namespaced token dictionary keyed by the literal `{{namespace.leaf}}` string.
 * Every key must match `{{[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*}}`.
 */
export const TOKENS: Record<string, TokenDefinition> = {
  '{{customer.name}}': {
    label: 'Customer Name',
    description: 'Full name of the pass holder',
    example: 'Ana Smith',
    applicableCardTypes: [...ALL_CARD_TYPES],
  },
  '{{customer.first_name}}': {
    label: 'Customer First Name',
    description: 'First name of the pass holder',
    example: 'Ana',
    applicableCardTypes: [...ALL_CARD_TYPES],
  },
  '{{customer.last_name}}': {
    label: 'Customer Last Name',
    description: 'Last name of the pass holder',
    example: 'Smith',
    applicableCardTypes: [...ALL_CARD_TYPES],
  },
  '{{customer.phone}}': {
    label: 'Phone Number',
    description: 'Customer contact phone number',
    example: '+593 99 123 4567',
    applicableCardTypes: [...ALL_CARD_TYPES],
  },
  '{{customer.email}}': {
    label: 'Email Address',
    description: 'Customer contact email address',
    example: 'ana@example.com',
    applicableCardTypes: [...ALL_CARD_TYPES],
  },
  '{{customer.visit_count}}': {
    label: 'Visit Count',
    description: 'Total number of customer visits',
    example: '12',
    applicableCardTypes: ['stamp', 'cashback', 'multipass'],
  },
  '{{customer.purchase_total}}': {
    label: 'Purchase Total',
    description: 'Total amount of the current or last purchase',
    example: '1,240.50',
    applicableCardTypes: ['cashback', 'discount', 'coupon', 'gift_certificate'],
  },
  '{{membership.id}}': {
    label: 'Membership ID',
    description: 'Unique membership identifier',
    example: 'MEM-12345678',
    applicableCardTypes: [
      'stamp',
      'cashback',
      'coupon',
      'vip_membership',
      'corporate_discount',
      'multipass',
    ],
  },
  '{{membership.tier}}': {
    label: 'Tier Name',
    description: 'Current membership tier',
    example: 'Gold',
    applicableCardTypes: ['discount', 'vip_membership', 'cashback'],
  },
  '{{stamp.count}}': {
    label: 'Stamp Count',
    description: 'Current number of stamps collected',
    example: '7',
    applicableCardTypes: ['stamp'],
  },
  '{{stamp.total}}': {
    label: 'Stamp Total',
    description: 'Total stamps required to earn the reward',
    example: '10',
    applicableCardTypes: ['stamp'],
  },
  '{{loyalty.points_balance}}': {
    label: 'Points Balance',
    description: 'Current loyalty points balance',
    example: '1,250',
    applicableCardTypes: ['cashback', 'discount', 'vip_membership'],
  },
  '{{cashback.earned}}': {
    label: 'Cashback Earned',
    description: 'Total cashback earned to date',
    example: '25.40',
    applicableCardTypes: ['cashback'],
  },
  '{{cashback.balance}}': {
    label: 'Cashback Balance',
    description: 'Available cashback balance',
    example: '25.40',
    applicableCardTypes: ['cashback'],
  },
  '{{coupon.discount_amount}}': {
    label: 'Discount Amount',
    description: 'Calculated discount value',
    example: '15.00',
    applicableCardTypes: ['coupon', 'discount', 'corporate_discount', 'gift_certificate'],
  },
  '{{coupon.remaining_uses}}': {
    label: 'Remaining Uses',
    description: 'Number of uses left on a multi-use pass',
    example: '3',
    applicableCardTypes: ['multipass', 'coupon'],
  },
  '{{gift.balance}}': {
    label: 'Gift Amount',
    description: 'Remaining gift certificate balance',
    example: '50.00',
    applicableCardTypes: ['gift_certificate'],
  },
  '{{program.name}}': {
    label: 'Program Name',
    description: 'Name of the loyalty program',
    example: 'Café Central Loyalty',
    applicableCardTypes: [
      'stamp',
      'cashback',
      'coupon',
      'affiliate',
      'discount',
      'vip_membership',
      'corporate_discount',
      'multipass',
    ],
  },
  '{{program.reward_description}}': {
    label: 'Reward Description',
    description: 'Description of the available reward',
    example: 'Free coffee',
    applicableCardTypes: ['stamp', 'cashback', 'coupon', 'gift_certificate'],
  },
  '{{merchant.name}}': {
    label: 'Merchant Name',
    description: 'Name of the business or merchant',
    example: 'Café Central',
    applicableCardTypes: [
      'stamp',
      'cashback',
      'coupon',
      'affiliate',
      'discount',
      'gift_certificate',
      'vip_membership',
      'corporate_discount',
      'multipass',
    ],
  },
  '{{merchant.company_name}}': {
    label: 'Company Name',
    description: 'Name of the employer or company',
    example: 'Café Central',
    applicableCardTypes: ['corporate_discount', 'affiliate'],
  },
  '{{merchant.department}}': {
    label: 'Department',
    description: 'Employee department name',
    example: 'Marketing',
    applicableCardTypes: ['corporate_discount'],
  },
  '{{merchant.employee_id}}': {
    label: 'Employee ID',
    description: 'Corporate employee identifier',
    example: 'EMP-042',
    applicableCardTypes: ['corporate_discount'],
  },
  '{{referral.code}}': {
    label: 'Referral Code',
    description: "Customer's unique referral code",
    example: 'RAF-8891',
    applicableCardTypes: ['referral_pass', 'affiliate'],
  },
  '{{referral.friend_name}}': {
    label: 'Friend Name',
    description: 'Name of the referred friend',
    example: 'María González',
    applicableCardTypes: ['referral_pass'],
  },
  '{{session.count}}': {
    label: 'Session Count',
    description: 'Number of sessions or entries used',
    example: '4',
    applicableCardTypes: ['multipass'],
  },
  '{{pass.expiration_date}}': {
    label: 'Expiration Date',
    description: 'Date when the pass or offer expires',
    example: '2027-01-01',
    applicableCardTypes: ['coupon', 'gift_certificate', 'referral_pass', 'multipass'],
  },
  '{{pass.current_date}}': {
    label: 'Current Date',
    description: "Today's date, dynamically generated",
    example: '2026-09-23',
    applicableCardTypes: [...ALL_CARD_TYPES],
  },
  '{{pass.barcode_data}}': {
    label: 'Barcode Data',
    description: 'Raw data encoded in the barcode',
    example: 'LOY-12345',
    applicableCardTypes: [...ALL_CARD_TYPES],
  },
  '{{pass.qr_code}}': {
    label: 'QR Code',
    description: 'Data encoded in the QR code',
    example: 'LOY-12345',
    applicableCardTypes: [...ALL_CARD_TYPES],
  },
};

/* ------------------------------------------------------------------ */
/*  Legacy vocabulary migration                                       */
/* ------------------------------------------------------------------ */

/**
 * Canonical migration map: every legacy bare snake_case id to its namespaced
 * `{{namespace.leaf}}` token. Used at parse time to rewrite pre-P1 designs.
 */
export const LEGACY_ID_MAP: Readonly<Record<string, string>> = {
  customer_name: '{{customer.name}}',
  phone_number: '{{customer.phone}}',
  email_address: '{{customer.email}}',
  visit_count: '{{customer.visit_count}}',
  purchase_total: '{{customer.purchase_total}}',
  membership_id: '{{membership.id}}',
  tier_name: '{{membership.tier}}',
  stamp_count: '{{stamp.count}}',
  points_balance: '{{loyalty.points_balance}}',
  cashback_earned: '{{cashback.earned}}',
  discount_amount: '{{coupon.discount_amount}}',
  remaining_uses: '{{coupon.remaining_uses}}',
  gift_amount: '{{gift.balance}}',
  program_name: '{{program.name}}',
  reward_description: '{{program.reward_description}}',
  merchant_name: '{{merchant.name}}',
  company_name: '{{merchant.company_name}}',
  department: '{{merchant.department}}',
  employee_id: '{{merchant.employee_id}}',
  referral_code: '{{referral.code}}',
  friend_name: '{{referral.friend_name}}',
  session_count: '{{session.count}}',
  expiration_date: '{{pass.expiration_date}}',
  current_date: '{{pass.current_date}}',
  barcode_data: '{{pass.barcode_data}}',
  qr_code: '{{pass.qr_code}}',
};

/** Single-brace legacy placeholder that is not part of a `{{...}}` token. */
const LEGACY_SINGLE_BRACE_PATTERN = /(?<!\{)\{([a-z][a-z0-9_]*)\}(?!\})/g;

/**
 * @description Rewrite legacy bare ids and `{legacy_id}` placeholders to the
 * namespaced `{{namespace.leaf}}` form. Unknown placeholders are left alone.
 * Already-namespaced tokens and single-brace non-legacy text are untouched.
 * @param {string} value - Field value or dynamicTemplate id
 * @returns {string} Value rewritten to the namespaced vocabulary where known
 */
export function migrateLegacyTokens(value: string): string {
  if (typeof value !== 'string' || value.length === 0) return value;
  const whole = LEGACY_ID_MAP[value];
  if (whole !== undefined) return whole;
  return value.replace(LEGACY_SINGLE_BRACE_PATTERN, (match, id: string) => {
    const mapped = LEGACY_ID_MAP[id];
    return mapped !== undefined ? mapped : match;
  });
}

/* ------------------------------------------------------------------ */
/*  Resolution                                                        */
/* ------------------------------------------------------------------ */

/**
 * Well-formed pass-schema token: `{{namespace.leaf}}` with snake identifiers.
 * Non-global source. Derive the global form from this; never hand-copy.
 */
export const PASS_TOKEN_PATTERN = /\{\{[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\}\}/;

/** Global derivative of {@link PASS_TOKEN_PATTERN} for `replace`/`match`. */
export const PASS_TOKEN_PATTERN_GLOBAL = new RegExp(PASS_TOKEN_PATTERN.source, 'g');

function snakeToCamel(value: string): string {
  return value.replace(/_([a-z0-9])/g, (_match, chr: string) => chr.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

/**
 * Documented token value coercion. Mirrored exactly in backend schema.py.
 *
 * - `null` / `undefined` / non-finite numbers → unresolved (`null`)
 * - `boolean` → `"true"` / `"false"` (lowercase)
 * - integer-valued numbers → decimal with no fraction (`1.0` → `"1"`)
 * - other finite numbers → shortest round-trip decimal (`1.5` → `"1.5"`)
 * - `string` → as-is
 * - arrays, plain objects used as leaves, functions, anything else → unresolved
 */
function coerceTokenValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return String(value);
  }
  if (typeof value === 'string') return value;
  return null;
}

/**
 * @description Resolve one `{{namespace.leaf}}` token against a context object.
 * Lookup order: nested camelCase, nested snake_case, flat camelCase leaf,
 * flat snake_case leaf. Only own keys participate. Returns the token unchanged
 * when nothing resolves (never `""` or engine junk).
 * @param {string} token - Literal token including braces, e.g. `{{customer.first_name}}`
 * @param {Record<string, unknown>} context - Flat and/or nested lookup context
 * @returns {string} Resolved string value, or the token when unresolved
 */
export function resolveToken(token: string, context: Record<string, unknown>): string {
  if (!token.startsWith('{{') || !token.endsWith('}}')) return token;
  const body = token.slice(2, -2);
  const dot = body.indexOf('.');
  if (dot <= 0) return token;

  const namespace = body.slice(0, dot);
  const leaf = body.slice(dot + 1);
  if (!leaf) return token;
  const camelLeaf = snakeToCamel(leaf);

  const nested = context[namespace];
  if (isPlainObject(nested)) {
    if (Object.hasOwn(nested, camelLeaf)) {
      const hit = coerceTokenValue(nested[camelLeaf]);
      if (hit !== null) return hit;
    }
    if (camelLeaf !== leaf && Object.hasOwn(nested, leaf)) {
      const hit = coerceTokenValue(nested[leaf]);
      if (hit !== null) return hit;
    }
  }

  if (Object.hasOwn(context, camelLeaf)) {
    const hit = coerceTokenValue(context[camelLeaf]);
    if (hit !== null) return hit;
  }
  if (camelLeaf !== leaf && Object.hasOwn(context, leaf)) {
    const hit = coerceTokenValue(context[leaf]);
    if (hit !== null) return hit;
  }

  return token;
}

/**
 * @description Substitute every well-formed `{{namespace.leaf}}` token in a template.
 * Unknown tokens pass through unchanged. Single-brace `{name}` i18n interpolation
 * and the legacy single-brace resolver (`resolveLegacyTemplate`) never mix with this.
 * @param {string} template - String that may contain pass-schema tokens
 * @param {Record<string, unknown>} context - Flat and/or nested lookup context
 * @returns {string} Template with resolved tokens substituted
 */
export function resolvePassTemplate(
  template: string,
  context: Record<string, unknown>
): string {
  return template.replace(PASS_TOKEN_PATTERN_GLOBAL, (match) => resolveToken(match, context));
}
