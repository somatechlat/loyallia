/**
 * Field mapping utilities for the Wallet Pass Studio.
 *
 * Converts unified fields to Apple PassKit and Google Wallet formats.
 */

import type {
  UnifiedField,
  WalletPassStudioState,
  FieldGroup,
} from '../types/index';
import { FIELD_GROUP_TO_APPLE, FIELD_GROUP_TO_GOOGLE } from '../constants';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Apple PassKit field structure */
export interface ApplePassField {
  key: string;
  label: string;
  value: string;
  dataType?: import('../types/unified-field').FieldDataType;
  changeMessage?: string;
  textAlignment?: string;
  dateStyle?: string;
  timeStyle?: string;
  numberStyle?: string;
  currencyCode?: string;
  attributedValue?: string;
}

/** Extract Apple change message from structured config. */
function getAppleChangeMessage(field: UnifiedField): string | undefined {
  const cfg = field.notifications?.appleChangeMessage;
  if (!cfg || typeof cfg === 'string') return undefined;
  return cfg.enabled ? cfg.message : undefined;
}

/** Apple PassKit field groups */
export interface ApplePassFields {
  headerFields: ApplePassField[];
  primaryFields: ApplePassField[];
  secondaryFields: ApplePassField[];
  auxiliaryFields: ApplePassField[];
  backFields: ApplePassField[];
}

/** Google Wallet row item */
export interface GoogleRowItem {
  id: string;
  fieldPath: string;
  label: string;
  displayName: string;
  value: string;
  dataType?: import('../types/unified-field').FieldDataType;
}

/** Google Wallet row structure */
export interface GoogleRow {
  id: string;
  type: 'oneItem' | 'twoItems' | 'threeItems';
  items: GoogleRowItem[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function sortByOrder(a: UnifiedField, b: UnifiedField): number {
  return a.order - b.order;
}

function getFieldGroupFields(
  fields: UnifiedField[],
  group: FieldGroup
): UnifiedField[] {
  return fields.filter((f) => f.fieldGroup === group).sort(sortByOrder);
}

/* ------------------------------------------------------------------ */
/*  Single-field mappers                                               */
/* ------------------------------------------------------------------ */

/**
 * Map a single unified field to Apple PassKit format.
 */
export function mapFieldToApple(field: UnifiedField): ApplePassField {
  const appleField: ApplePassField = {
    key: field.id,
    label: field.label,
    value: field.value,
    dataType: field.dataType,
  };

  const opts = field.appleOptions;
  const changeMessage = getAppleChangeMessage(field);
  if (changeMessage) appleField.changeMessage = changeMessage;
  if (opts.textAlignment) appleField.textAlignment = opts.textAlignment;
  if (opts.dateStyle) appleField.dateStyle = opts.dateStyle;
  if (opts.timeStyle) appleField.timeStyle = opts.timeStyle;
  if (opts.numberStyle) appleField.numberStyle = opts.numberStyle;
  if (opts.currencyCode) appleField.currencyCode = opts.currencyCode;
  if (opts.attributedValue) appleField.attributedValue = opts.attributedValue;

  // Auto-populate Apple formatting options based on dataType if not explicitly set
  if (!opts.dateStyle && !opts.timeStyle && field.dataType === 'date') {
    appleField.dateStyle = 'PKDateStyleShort';
  }
  if (!opts.numberStyle && field.dataType === 'number') {
    appleField.numberStyle = 'PKNumberStyleDecimal';
  }
  if (!opts.numberStyle && !opts.currencyCode && field.dataType === 'currency') {
    appleField.numberStyle = 'PKNumberStyleDecimal';
    appleField.currencyCode = 'USD';
  }

  return appleField;
}

/**
 * Map a single unified field to Google Wallet row item.
 */
export function mapFieldToGoogle(
  field: UnifiedField,
  position: number
): GoogleRowItem {
  return {
    id: field.id,
    fieldPath: `class.${field.fieldGroup}[${position}]`,
    label: field.label,
    displayName: field.label,
    value: field.value,
    dataType: field.dataType,
  };
}

/* ------------------------------------------------------------------ */
/*  Bulk mappers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Convert unified fields to Apple PassKit format.
 */
export function mapFieldsToApple(fields: UnifiedField[]): ApplePassFields {
  const appleFields: ApplePassFields = {
    headerFields: [],
    primaryFields: [],
    secondaryFields: [],
    auxiliaryFields: [],
    backFields: [],
  };

  const groups: FieldGroup[] = ['header', 'primary', 'secondary', 'auxiliary', 'back'];

  for (const group of groups) {
    const groupFields = getFieldGroupFields(fields, group).filter(
      (f) => f.showOnApple
    );
    const appleGroup = FIELD_GROUP_TO_APPLE[group] as keyof ApplePassFields;
    appleFields[appleGroup] = groupFields.map(mapFieldToApple);
  }

  return appleFields;
}

/**
 * Convert unified fields to Google Wallet rows.
 */
export function mapFieldsToGoogle(fields: UnifiedField[]): GoogleRow[] {
  const rows: GoogleRow[] = [];
  const groups: FieldGroup[] = ['header', 'primary', 'secondary', 'auxiliary', 'back'];

  for (const group of groups) {
    const groupFields = getFieldGroupFields(fields, group).filter(
      (f) => f.showOnGoogle
    );

    if (groupFields.length === 0) continue;

    let rowType: GoogleRow['type'];
    if (groupFields.length === 1) {
      rowType = 'oneItem';
    } else if (groupFields.length === 2) {
      rowType = 'twoItems';
    } else {
      rowType = 'threeItems';
    }

    const items = groupFields.map((field, index) =>
      mapFieldToGoogle(field, index)
    );

    rows.push({
      id: FIELD_GROUP_TO_GOOGLE[group],
      type: rowType,
      items,
    });
  }

  return rows;
}

/* ------------------------------------------------------------------ */
/*  Dynamic template resolution                                        */
/* ------------------------------------------------------------------ */

/**
 * Convert dynamic template placeholders to actual values.
 *
 * Replaces `{template_name}` with the corresponding value from the context.
 * If a template is not found in the context, the placeholder is removed.
 */
export function resolveDynamicTemplate(
  template: string,
  context: Record<string, string | number>
): string {
  return template.replace(/\{([^}]+)\}/g, (_match, key: string) => {
    const value = context[key];
    return value !== undefined ? String(value) : '';
  });
}

/* ------------------------------------------------------------------ */
/*  Complete pass builders                                             */
/* ------------------------------------------------------------------ */

/**
 * Build complete Apple pass JSON from studio state.
 */
export function buildApplePass(state: WalletPassStudioState): object {
  const appleFields = mapFieldsToApple(state.fields);

  const pass: Record<string, unknown> = {
    formatVersion: 1,
    passTypeIdentifier: 'pass.com.loyallia.wallet',
    serialNumber: state.id,
    description: state.name,
    organizationName: state.apple.organizationName || 'Loyallia',
    teamIdentifier: 'LOYALLIA',
    logoText: state.name,
    foregroundColor: state.colors.foreground,
    backgroundColor: state.colors.background,
    labelColor: state.colors.label,
    ...appleFields,
  };

  // Barcode
  if (state.barcode.message) {
    pass.barcode = {
      format: state.barcode.format,
      message: state.barcode.message,
      messageEncoding: state.barcode.messageEncoding,
      altText: state.barcode.altText,
    };
  }

  // Locations
  if (state.apple.locations.length > 0) {
    pass.locations = state.apple.locations;
  }

  // Beacons
  if (state.apple.beacons.length > 0) {
    pass.beacons = state.apple.beacons;
  }

  // NFC
  if (state.apple.nfc.enabled) {
    pass.nfc = {
      message: state.apple.nfc.message,
      requiresAuthentication: state.apple.nfc.requiresAuthentication,
      encryptionPublicKey: state.apple.nfc.encryptionPublicKey,
    };
  }

  // Expiration
  if (state.apple.expirationDate) {
    pass.expirationDate = state.apple.expirationDate;
  }

  // Sharing / voided flags
  pass.sharingProhibited = state.apple.sharingProhibited;
  pass.voided = state.apple.voided;
  pass.suppressStripShine = state.apple.suppressStripShine;

  // Pass style wrapper
  const style = state.apple.passStyle;
  return {
    [style]: pass,
  };
}

/**
 * Build complete Google pass class JSON from studio state.
 */
export function buildGooglePass(state: WalletPassStudioState): object {
  const googleRows = mapFieldsToGoogle(state.fields);

  const passClass: Record<string, unknown> = {
    id: `${state.id}.${state.google.passType}`,
    classId: `${state.id}.${state.google.passType}`,
    issuerName: state.google.programName || 'Loyallia',
    programName: state.google.programName || state.name,
    programLogo: state.images.logo?.url,
    hexBackgroundColor: state.colors.background,
    hexForegroundColor: state.colors.foreground,
    hexLabelColor: state.colors.label,
    reviewStatus: state.google.reviewStatus,
    allowMultipleUsers: state.google.allowMultipleUsers,
    messages: state.google.messages,
    notifyPreference: state.google.notifyPreference,
    rows: googleRows,
  };

  // Hero image
  if (state.google.heroImage?.url) {
    passClass.heroImage = state.google.heroImage;
  }

  // Homepage / help URIs
  if (state.google.homepageUri) {
    passClass.homepageUri = state.google.homepageUri;
  }
  if (state.google.helpUri) {
    passClass.helpUri = state.google.helpUri;
  }

  // Smart Tap
  if (state.google.smartTapRedemptionValue) {
    passClass.smartTapRedemptionValue = state.google.smartTapRedemptionValue;
  }

  // Grouping
  if (state.google.groupingId) {
    passClass.groupingId = state.google.groupingId;
  }

  return passClass;
}
