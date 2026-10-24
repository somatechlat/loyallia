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
/** Map designer field ids to real Google Wallet object/class paths. */
const GOOGLE_FIELD_ID_TO_PATH: Record<string, string> = {
  customer_name: 'object.accountName',
  program_name: 'class.programName',
  membership_id: 'object.accountId',
  stamps: 'object.loyaltyPoints.balance',
  balance: 'object.loyaltyPoints.balance',
  gift_balance: 'object.balance.money',
  cashback_balance: 'object.loyaltyPoints.balance',
  tier: 'class.rewardsTier',
  membership_tier: 'class.rewardsTier',
  business_name: 'class.issuerName',
  tenant_name: 'class.issuerName',
};

export function mapFieldToGoogle(
  field: UnifiedField,
  _position: number
): GoogleRowItem | null {
  const explicit = (field as UnifiedField & { fieldPath?: string }).fieldPath;
  const mapped = GOOGLE_FIELD_ID_TO_PATH[field.id];
  const fieldPath = explicit || mapped;
  if (!fieldPath) return null;
  return {
    id: field.id,
    fieldPath,
    label: field.label,
    displayName: field.label,
    value: field.value,
    dataType: field.dataType,
  };
}

/**
 * @description Resolve the Google Wallet fieldPath for a designer field,
 * mapping CUSTOM fields dynamically onto their own text module path
 * (`object.textModulesData['<id>']`) instead of dropping them. Well-known
 * ids and explicit fieldPaths resolve exactly as in {@link mapFieldToGoogle}.
 * The referenced text module is emitted alongside the rows, so the path is
 * always backed by a real module on the object (see backend
 * `_build_v2_text_modules_data`).
 * @param {UnifiedField} field - Designer field
 * @returns {string | null} Google fieldPath, or null when the field has no id
 */
export function resolveGoogleFieldPath(field: UnifiedField): string | null {
  const explicit = (field as UnifiedField & { fieldPath?: string }).fieldPath;
  const mapped = GOOGLE_FIELD_ID_TO_PATH[field.id];
  const fieldPath = explicit || mapped;
  if (fieldPath) return fieldPath;
  if (!field.id) return null;
  return `object.textModulesData['${field.id.replace(/'/g, '')}']`;
}

/**
 * Map a single unified field to a Google Wallet row item, including custom
 * fields (dynamic text-module path). Additive counterpart of
 * {@link mapFieldToGoogle}, which stays strict for backward compatibility.
 */
export function mapFieldToGoogleRow(
  field: UnifiedField,
  _position: number
): GoogleRowItem | null {
  const fieldPath = resolveGoogleFieldPath(field);
  if (!fieldPath) return null;
  return {
    id: field.id,
    fieldPath,
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
 * Shared Google row grouping: one row per field group, typed by item count.
 */
function buildGoogleRows(
  fields: UnifiedField[],
  mapField: (field: UnifiedField, position: number) => GoogleRowItem | null
): GoogleRow[] {
  const rows: GoogleRow[] = [];
  const groups: FieldGroup[] = ['header', 'primary', 'secondary', 'auxiliary', 'back'];

  for (const group of groups) {
    const groupFields = getFieldGroupFields(fields, group).filter(
      (f) => f.showOnGoogle
    );

    if (groupFields.length === 0) continue;

    const items = groupFields
      .map((field, index) => mapField(field, index))
      .filter((item): item is GoogleRowItem => item !== null);

    if (items.length === 0) continue;

    let rowType: GoogleRow['type'];
    if (items.length === 1) {
      rowType = 'oneItem';
    } else if (items.length === 2) {
      rowType = 'twoItems';
    } else {
      rowType = 'threeItems';
    }

    rows.push({
      id: FIELD_GROUP_TO_GOOGLE[group],
      type: rowType,
      items,
    });
  }

  return rows;
}

/**
 * Convert unified fields to Google Wallet rows (strict: only fields with a
 * real object/class fieldPath survive — custom fields are dropped).
 */
export function mapFieldsToGoogle(fields: UnifiedField[]): GoogleRow[] {
  return buildGoogleRows(fields, mapFieldToGoogle);
}

/**
 * Convert unified fields to Google Wallet rows, including CUSTOM fields
 * mapped dynamically to their text module path. Additive counterpart of
 * {@link mapFieldsToGoogle}: well-known ids keep the same rows as today,
 * custom fields are no longer silently dropped.
 */
export function mapFieldsToGoogleRows(fields: UnifiedField[]): GoogleRow[] {
  return buildGoogleRows(fields, mapFieldToGoogleRow);
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
  const googleRows = mapFieldsToGoogleRows(state.fields);

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

  // Hero image — unified source is state.images.heroImage
  const heroAsset = state.images.heroImage ?? state.google.heroImage;
  if (heroAsset?.url) {
    passClass.heroImage = heroAsset;
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
