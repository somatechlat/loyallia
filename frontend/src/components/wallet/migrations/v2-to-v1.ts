/**
 * v2 → v1 reverse migration for Wallet Pass Studio state.
 */

import type { WalletPassStudioState } from '../types';
import type {
  WalletDesignState,
  AppleFieldDef,
  GoogleFieldRow,
  GoogleFieldItem,
  WalletLocation,
  WalletBeacon,
  WalletLink,
} from '../types-v1';
import { FIELD_GROUP_TO_APPLE, FIELD_GROUP_TO_GOOGLE } from '../constants';
import type { UnifiedField, FieldGroup } from '../types/unified-field';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function sortByOrder(a: UnifiedField, b: UnifiedField): number {
  return a.order - b.order;
}

/* ------------------------------------------------------------------ */
/*  Field mappers                                                     */
/* ------------------------------------------------------------------ */

export function mapUnifiedToAppleFields(fields: UnifiedField[]): Record<string, AppleFieldDef[]> {
  const appleFields: Record<string, AppleFieldDef[]> = {
    headerFields: [],
    primaryFields: [],
    secondaryFields: [],
    auxiliaryFields: [],
    backFields: [],
  };

  const groups: FieldGroup[] = ['header', 'primary', 'secondary', 'auxiliary', 'back'];

  for (const group of groups) {
    const groupFields = fields
      .filter((f) => f.fieldGroup === group && f.showOnApple)
      .sort(sortByOrder);

    const appleGroup = FIELD_GROUP_TO_APPLE[group];
    appleFields[appleGroup] = groupFields.map((f) => ({
      key: f.id,
      label: f.label,
      value: f.value,
      changeMessage: f.appleOptions.changeMessage,
      textAlignment: f.appleOptions.textAlignment,
      attributedValue: f.appleOptions.attributedValue,
    }));
  }

  return appleFields;
}

export function mapUnifiedToGoogleRows(fields: UnifiedField[]): GoogleFieldRow[] {
  const rows: GoogleFieldRow[] = [];
  const groups: FieldGroup[] = ['header', 'primary', 'secondary', 'auxiliary', 'back'];

  for (const group of groups) {
    const groupFields = fields
      .filter((f) => f.fieldGroup === group && f.showOnGoogle)
      .sort(sortByOrder);

    if (groupFields.length === 0) continue;

    let rowType: GoogleFieldRow['type'];
    if (groupFields.length === 1) {
      rowType = 'oneItem';
    } else if (groupFields.length === 2) {
      rowType = 'twoItems';
    } else {
      rowType = 'threeItems';
    }

    const items: GoogleFieldItem[] = groupFields.map((field, index) => ({
      id: field.id,
      fieldPath:
        field.googleOptions.predefinedPath ?? `class.${field.fieldGroup}[${index}]`,
      label: field.label,
      displayName: field.label,
    }));

    rows.push({
      id: FIELD_GROUP_TO_GOOGLE[group],
      type: rowType,
      items,
    });
  }

  return rows;
}

/* ------------------------------------------------------------------ */
/*  Full reverse migration                                            */
/* ------------------------------------------------------------------ */

export function migrateV2ToV1(v2: WalletPassStudioState): WalletDesignState {
  // Images
  const appleLogoUrl = v2.images.logo?.url ?? '';
  const appleLogo2xUrl = v2.images.logo2x?.url ?? '';
  const appleStripUrl = v2.images.strip?.url ?? '';
  const appleStrip2xUrl = v2.images.strip2x?.url ?? '';
  const appleThumbnailUrl = v2.images.thumbnail?.url ?? '';
  const appleThumbnail2xUrl = v2.images.thumbnail2x?.url ?? '';
  const appleIconUrl = v2.images.icon?.url ?? '';
  const appleIcon2xUrl = v2.images.icon2x?.url ?? '';

  const googleProgramLogoUrl = v2.images.logo?.url ?? '';
  const googleHeroImageUrl = v2.images.heroImage?.url ?? '';
  const googleWideLogoUrl = v2.images.wideLogo?.url ?? '';
  const googleImageModuleUrl = v2.images.imageModule?.url ?? '';

  // Fields
  const appleFields = mapUnifiedToAppleFields(v2.fields);
  const googleRows = mapUnifiedToGoogleRows(v2.fields);

  // Locations
  const locations: WalletLocation[] = v2.apple.locations.map((l) => ({
    id: l.id,
    latitude: l.latitude,
    longitude: l.longitude,
    altitude: l.altitude ?? 0,
    relevantText: l.relevantText ?? '',
  }));

  // Beacons
  const beacons: WalletBeacon[] = v2.apple.beacons.map((b) => ({
    id: b.id,
    uuid: b.uuid,
    major: b.major,
    minor: b.minor,
    relevantText: b.relevantText ?? '',
  }));

  // Links
  const links: WalletLink[] = v2.backContent.links.map((l) => ({
    id: l.id,
    label: l.label,
    uri: l.url,
  }));

  // Homepage URI from website links or google config
  const homepageUri =
    v2.backContent.links.find((l) => l.type === 'website')?.url ??
    v2.google.homepageUri ??
    '';

  const helpUri = v2.google.helpUri ?? '';

  // Advanced configs
  const appleAdvanced = {
    suppressStripShine: v2.apple.suppressStripShine,
    nfcMessage: v2.apple.nfc.message ?? '',
    sharingProhibited: v2.apple.sharingProhibited,
    voided: v2.apple.voided,
    expirationDate: v2.apple.expirationDate ?? '',
  };

  const googleAdvanced = {
    reviewStatus: v2.google.reviewStatus,
    allowMultipleUsers: v2.google.allowMultipleUsers,
    homepageUri: v2.google.homepageUri ?? '',
    helpUri: v2.google.helpUri ?? '',
    linksModuleUris: [] as { label: string; uri: string }[],
    messages: v2.google.messages,
    notifyPreference: v2.google.notifyPreference,
  };

  const appleNfc = {
    nfc_enabled: v2.apple.nfc.enabled,
    nfc_requires_authentication: v2.apple.nfc.requiresAuthentication,
  };

  return {
    provider: 'apple',
    appleLogoUrl,
    appleLogo2xUrl,
    appleStripUrl,
    appleStrip2xUrl,
    appleThumbnailUrl,
    appleThumbnail2xUrl,
    appleIconUrl,
    appleIcon2xUrl,
    googleProgramLogoUrl,
    googleHeroImageUrl,
    googleWideLogoUrl,
    googleImageModuleUrl,
    appleFields,
    googleRows,
    googleAdvanced,
    appleAdvanced,
    appleNfc,
    locations,
    beacons,
    links,
    homepageUri,
    helpUri,
  };
}
