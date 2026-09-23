/**
 * Field validation utilities for the Wallet Pass Studio.
 */

import type { UnifiedField, FieldGroup, CardType } from '../types/index';
import { LIMITS, TOKENS, PASS_TOKEN_PATTERN, PASS_TOKEN_PATTERN_GLOBAL } from '../types/pass-schema';

/* Barcode formats that reduce field space on Apple Wallet */
const RECTANGULAR_BARCODE_FORMATS = new Set(['PDF417', 'CODE128']);

/** Card types mapped to Apple storeCard / coupon — always have combined sec+aux ≤ 4 */
const COMBINED_LIMIT_4_CARD_TYPES = new Set<CardType>([
  'stamp',
  'cashback',
  'coupon',
  'discount',
  'gift_certificate',
  'multipass',
]);

/** Combined secondary+auxiliary max per SRS-012 / Apple PassKit */
function getCombinedSecAuxMax(cardType: CardType): number | null {
  if (COMBINED_LIMIT_4_CARD_TYPES.has(cardType)) return 4;
  // generic style: 8 combined (separate sections)
  return 8;
}

/**
 * storeCard and coupon always enforce combined sec+aux ≤ 4 (SRS-012).
 * Rectangular barcodes also tighten layout for generic styles.
 */
function isCombinedLimitConstrained(
  cardType: CardType,
  barcodeFormat?: string
): boolean {
  if (COMBINED_LIMIT_4_CARD_TYPES.has(cardType)) return true;
  if (!barcodeFormat) return false;
  return RECTANGULAR_BARCODE_FORMATS.has(barcodeFormat);
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface FieldValidationError {
  fieldId: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface FieldGroupValidation {
  group: FieldGroup;
  current: number;
  max: number;
  isValid: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getMaxForGroup(group: FieldGroup): number {
  switch (group) {
    case 'header':
      return LIMITS.headerFields.max;
    case 'primary':
      return LIMITS.primaryFields.max;
    case 'secondary':
      return LIMITS.secondaryFields.max;
    case 'auxiliary':
      return LIMITS.auxiliaryFields.max;
    case 'back':
      return LIMITS.backFields.max;
    default:
      return 0;
  }
}

function countFieldsInGroup(
  fields: UnifiedField[],
  group: FieldGroup
): number {
  return fields.filter((f) => f.fieldGroup === group).length;
}

/* ------------------------------------------------------------------ */
/*  Single-field validation                                            */
/* ------------------------------------------------------------------ */

/**
 * Validate a single unified field.
 */
export function validateField(field: UnifiedField): FieldValidationError[] {
  const errors: FieldValidationError[] = [];

  if (!field.label || field.label.trim().length === 0) {
    errors.push({
      fieldId: field.id,
      message: 'fieldLabelRequired',
      severity: 'error',
    });
  }

  if (!field.value || field.value.trim().length === 0) {
    errors.push({
      fieldId: field.id,
      message: 'fieldValueRequired',
      severity: 'error',
    });
  }

  const dynamicErrors = validateDynamicTemplates(field.value);
  errors.push(...dynamicErrors.map((e) => ({ ...e, fieldId: field.id })));

  return errors;
}

/* ------------------------------------------------------------------ */
/*  Group limit validation                                             */
/* ------------------------------------------------------------------ */

export interface CombinedLimitWarning {
  groups: FieldGroup[];
  current: number;
  max: number;
  message: string;
}

/**
 * Validate field group limits for a given card type.
 * Also checks combined secondary+auxiliary limit when rectangular
 * barcode is used with affected card types.
 */
export function validateFieldGroupLimits(
  fields: UnifiedField[],
  cardType: CardType,
  barcodeFormat?: string
): FieldGroupValidation[] {
  const groups: FieldGroup[] = ['header', 'primary', 'secondary', 'auxiliary', 'back'];

  const results = groups.map((group) => {
    const current = countFieldsInGroup(fields, group);
    const max = getMaxForGroup(group);
    return {
      group,
      current,
      max,
      isValid: current <= max,
    };
  });

  // Combined secondary + auxiliary limit (storeCard/coupon always; others by barcode)
  if (isCombinedLimitConstrained(cardType, barcodeFormat)) {
    const secCount = countFieldsInGroup(fields, 'secondary');
    const auxCount = countFieldsInGroup(fields, 'auxiliary');
    const combined = secCount + auxCount;
    const combinedMax = getCombinedSecAuxMax(cardType) ?? 4;

    if (combined > combinedMax) {
      results.push({
        group: 'secondary' as FieldGroup,
        current: combined,
        max: combinedMax,
        isValid: false,
      });
    }
  }

  return results;
}

/**
 * Get a combined limit warning if applicable.
 */
export function getCombinedLimitWarning(
  fields: UnifiedField[],
  cardType: CardType,
  barcodeFormat?: string
): CombinedLimitWarning | null {
  if (!isCombinedLimitConstrained(cardType, barcodeFormat)) return null;

  const secCount = countFieldsInGroup(fields, 'secondary');
  const auxCount = countFieldsInGroup(fields, 'auxiliary');
  const combined = secCount + auxCount;
  const combinedMax = getCombinedSecAuxMax(cardType) ?? 4;

  if (combined >= combinedMax) {
    return {
      groups: ['secondary', 'auxiliary'],
      current: combined,
      max: combinedMax,
      message: `combinedLimitWarning`,
    };
  }
  return null;
}

/**
 * Check if adding a field to a group would exceed limits.
 * Accounts for combined secondary+auxiliary limit when rectangular barcode is used.
 */
export function canAddFieldToGroup(
  fields: UnifiedField[],
  group: FieldGroup,
  cardType: CardType,
  barcodeFormat?: string
): boolean {
  const current = countFieldsInGroup(fields, group);
  const max = getMaxForGroup(group);

  if (current >= max) return false;

  // Combined secondary + auxiliary check
  if (
    isCombinedLimitConstrained(cardType, barcodeFormat) &&
    (group === 'secondary' || group === 'auxiliary')
  ) {
    const secCount = countFieldsInGroup(fields, 'secondary');
    const auxCount = countFieldsInGroup(fields, 'auxiliary');
    const combined = secCount + auxCount;
    const combinedMax = getCombinedSecAuxMax(cardType) ?? 4;
    if (combined >= combinedMax) return false;
  }

  return true;
}

/**
 * Get remaining slots for a field group.
 * Accounts for combined secondary+auxiliary limit when rectangular barcode is used.
 */
export function getRemainingSlots(
  fields: UnifiedField[],
  group: FieldGroup,
  cardType: CardType,
  barcodeFormat?: string
): number {
  const current = countFieldsInGroup(fields, group);
  const max = getMaxForGroup(group);
  const baseRemaining = Math.max(0, max - current);

  // Combined secondary + auxiliary check
  if (
    isCombinedLimitConstrained(cardType, barcodeFormat) &&
    (group === 'secondary' || group === 'auxiliary')
  ) {
    const secCount = countFieldsInGroup(fields, 'secondary');
    const auxCount = countFieldsInGroup(fields, 'auxiliary');
    const combinedRemaining = Math.max(0, (getCombinedSecAuxMax(cardType) ?? 4) - (secCount + auxCount));
    return Math.min(baseRemaining, combinedRemaining);
  }

  return baseRemaining;
}

/* ------------------------------------------------------------------ */
/*  Full validation                                                    */
/* ------------------------------------------------------------------ */

/**
 * Validate all fields for a given card type.
 */
export function validateFields(
  fields: UnifiedField[],
  cardType: CardType
): FieldValidationError[] {
  const errors: FieldValidationError[] = [];

  // Validate individual fields
  for (const field of fields) {
    errors.push(...validateField(field));
  }

  // Validate group limits
  const groupValidations = validateFieldGroupLimits(fields, cardType);
  for (const validation of groupValidations) {
    if (!validation.isValid) {
      errors.push({
        fieldId: `group:${validation.group}`,
        message: 'groupExceedsLimit',
        severity: 'error',
      });
    }
  }

  // Apple-specific: total front fields should be reasonable
  const frontFields = fields.filter(
    (f) =>
      f.showOnApple &&
      (f.fieldGroup === 'header' ||
        f.fieldGroup === 'primary' ||
        f.fieldGroup === 'secondary' ||
        f.fieldGroup === 'auxiliary')
  );
  if (frontFields.length > 12) {
    errors.push({
      fieldId: 'apple:frontFields',
      message: 'tooManyFrontFields',
      severity: 'warning',
    });
  }

  // Google-specific: each row max 3 items
  const groups: FieldGroup[] = ['header', 'primary', 'secondary', 'auxiliary', 'back'];
  for (const group of groups) {
    const googleFields = fields.filter(
      (f) => f.fieldGroup === group && f.showOnGoogle
    );
    if (googleFields.length > 3) {
      errors.push({
        fieldId: `google:row:${group}`,
        message: 'googleRowMaxItems',
        severity: 'error',
      });
    }
  }

  return errors;
}

/* ------------------------------------------------------------------ */
/*  Dynamic template helpers                                           */
/* ------------------------------------------------------------------ */

/**
 * Check if a field value contains dynamic template placeholders.
 * Matches well-formed `{{namespace.leaf}}` pass-schema tokens only.
 */
export function hasDynamicTemplates(value: string): boolean {
  return PASS_TOKEN_PATTERN.test(value);
}

/**
 * Extract dynamic template tokens from a value.
 * Returns literal `{{namespace.leaf}}` tokens in source order (duplicates kept).
 */
export function extractDynamicTemplates(value: string): string[] {
  return value.match(PASS_TOKEN_PATTERN_GLOBAL) ?? [];
}

/**
 * Validate that all dynamic templates in a value are known.
 * Unknown tokens produce an `unknownDynamicTemplate` error.
 */
export function validateDynamicTemplates(value: string): FieldValidationError[] {
  const errors: FieldValidationError[] = [];
  const templates = extractDynamicTemplates(value);
  const knownTemplateIds = new Set(Object.keys(TOKENS));

  for (const template of templates) {
    if (!knownTemplateIds.has(template)) {
      errors.push({
        fieldId: `template:${template}`,
        message: 'unknownDynamicTemplate',
        severity: 'error',
      });
    }
  }

  return errors;
}
