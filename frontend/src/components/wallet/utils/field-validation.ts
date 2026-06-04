/**
 * Field validation utilities for the Wallet Pass Studio.
 */

import type { UnifiedField, FieldGroup, CardType } from '../types';
import { CARD_TYPE_METADATA } from '../constants';
import { DYNAMIC_TEMPLATES } from '../types/dynamic-templates';

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

function getMaxForGroup(cardType: CardType, group: FieldGroup): number {
  const meta = CARD_TYPE_METADATA[cardType];
  switch (group) {
    case 'header':
      return meta.maxHeaderFields;
    case 'primary':
      return meta.maxPrimaryFields;
    case 'secondary':
      return meta.maxSecondaryFields;
    case 'auxiliary':
      return meta.maxAuxiliaryFields;
    case 'back':
      return meta.maxBackFields;
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
      message: 'Field label is required',
      severity: 'error',
    });
  }

  if (!field.value || field.value.trim().length === 0) {
    errors.push({
      fieldId: field.id,
      message: 'Field value is required',
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

/**
 * Validate field group limits for a given card type.
 */
export function validateFieldGroupLimits(
  fields: UnifiedField[],
  cardType: CardType
): FieldGroupValidation[] {
  const groups: FieldGroup[] = ['header', 'primary', 'secondary', 'auxiliary', 'back'];

  return groups.map((group) => {
    const current = countFieldsInGroup(fields, group);
    const max = getMaxForGroup(cardType, group);
    return {
      group,
      current,
      max,
      isValid: current <= max,
    };
  });
}

/**
 * Check if adding a field to a group would exceed limits.
 */
export function canAddFieldToGroup(
  fields: UnifiedField[],
  group: FieldGroup,
  cardType: CardType
): boolean {
  const current = countFieldsInGroup(fields, group);
  const max = getMaxForGroup(cardType, group);
  return current < max;
}

/**
 * Get remaining slots for a field group.
 */
export function getRemainingSlots(
  fields: UnifiedField[],
  group: FieldGroup,
  cardType: CardType
): number {
  const current = countFieldsInGroup(fields, group);
  const max = getMaxForGroup(cardType, group);
  return Math.max(0, max - current);
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
        message: `${validation.group} group exceeds limit (${validation.current} / ${validation.max})`,
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
      message: `Total front fields (${frontFields.length}) may be too many for Apple Wallet`,
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
        message: `Google Wallet ${group} row has ${googleFields.length} items (max 3)`,
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
 */
export function hasDynamicTemplates(value: string): boolean {
  return /\{[^}]+\}/.test(value);
}

/**
 * Extract dynamic template names from a value.
 */
export function extractDynamicTemplates(value: string): string[] {
  const matches = value.match(/\{([^}]+)\}/g);
  if (!matches) return [];
  return matches.map((m) => m.slice(1, -1));
}

/**
 * Validate that all dynamic templates in a value are known.
 */
export function validateDynamicTemplates(value: string): FieldValidationError[] {
  const errors: FieldValidationError[] = [];
  const templates = extractDynamicTemplates(value);
  const knownTemplateIds = new Set(DYNAMIC_TEMPLATES.map((t) => t.id));

  for (const template of templates) {
    if (!knownTemplateIds.has(template)) {
      errors.push({
        fieldId: `template:${template}`,
        message: `Unknown dynamic template "{${template}}"`,
        severity: 'error',
      });
    }
  }

  return errors;
}
