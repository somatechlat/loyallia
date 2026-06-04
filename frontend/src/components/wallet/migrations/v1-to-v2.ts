/**
 * v1 → v2 migration for Wallet Pass Studio state.
 */

import type { WalletDesignState } from '../types-v1';
import type {
  WalletPassStudioState,
  CardType,
  Industry,
  UnifiedField,
  FieldGroup,
  ImageAsset,
  LocationConfig,
  BeaconConfig,
  BackLink,
  LinkType,
  AppleSpecificConfig,
  GoogleSpecificConfig,
  PassStyle,
  GooglePassType,
} from '../types/index';
import { DEFAULT_COLORS, DEFAULT_BARCODE, CARD_TYPE_METADATA } from '../constants';
import { getDefaultCardTypeConfig } from '../types/card-type-config';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function toImageAsset(url: string): ImageAsset | undefined {
  return url ? { url, width: 0, height: 0 } : undefined;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `mig-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function inferLinkType(url: string): LinkType {
  if (url.startsWith('mailto:')) return 'email';
  if (url.startsWith('tel:')) return 'phone';
  if (/maps\.google|google\.com\/maps|waze\.com|maps\.apple/.test(url)) return 'map';
  if (/instagram\.com|facebook\.com|twitter\.com|x\.com|tiktok\.com|linkedin\.com/.test(url))
    return 'social';
  return 'website';
}

function normalizePassStyle(style: string | undefined): PassStyle {
  const valid: PassStyle[] = ['generic', 'coupon', 'storeCard', 'boardingPass', 'eventTicket', 'transitStyle'];
  return valid.includes(style as PassStyle) ? (style as PassStyle) : 'generic';
}

function normalizeGooglePassType(type: string | undefined): GooglePassType {
  const valid: GooglePassType[] = ['LoyaltyClass', 'OfferClass', 'GiftCardClass', 'GenericClass'];
  return valid.includes(type as GooglePassType) ? (type as GooglePassType) : 'GenericClass';
}

/* ------------------------------------------------------------------ */
/*  Type guards                                                       */
/* ------------------------------------------------------------------ */

export function isV1State(obj: unknown): obj is WalletDesignState {
  if (obj === null || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;

  const providerOk = o.provider === 'apple' || o.provider === 'google';
  const hasAppleFields = typeof o.appleFields === 'object' && o.appleFields !== null;
  const hasGoogleRows = Array.isArray(o.googleRows);
  const hasAppleAdvanced = typeof o.appleAdvanced === 'object' && o.appleAdvanced !== null;
  const hasGoogleAdvanced = typeof o.googleAdvanced === 'object' && o.googleAdvanced !== null;

  // A v2 state has `version: 2`; v1 does not.
  return providerOk && hasAppleFields && hasGoogleRows && hasAppleAdvanced && hasGoogleAdvanced && o.version !== 2;
}

export function isV2State(obj: unknown): obj is WalletPassStudioState {
  if (obj === null || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (
    o.version === 2 &&
    typeof o.cardType === 'string' &&
    Array.isArray(o.fields) &&
    typeof o.ui === 'object' &&
    o.ui !== null
  );
}

/* ------------------------------------------------------------------ */
/*  Detection                                                         */
/* ------------------------------------------------------------------ */

export function detectCardType(v1: WalletDesignState): CardType {
  const text = extractAllText(v1).toLowerCase();

  if (/\b(coupon|descuento|discount|offer|oferta|promo|promoción)\b/.test(text)) return 'coupon';
  if (/\b(cashback|devolución|rebate|reembolso)\b/.test(text)) return 'cashback';
  if (/\b(gift\s*card|tarjeta\s*regalo|certificado|certificate|regalo)\b/.test(text))
    return 'gift_certificate';
  if (/\b(vip|membership|membresía|member|suscripción|subscription|premium|exclusive)\b/.test(text))
    return 'vip_membership';
  if (/\b(corporate|corporativo|employee|empleado|empresa|company|business)\b/.test(text))
    return 'corporate_discount';
  if (/\b(affiliate|afiliado|partner|referral\s*code|código\s*de\s*afiliado)\b/.test(text))
    return 'affiliate';
  if (/\b(referral|referido|friend|amigo|invita|invite)\b/.test(text)) return 'referral_pass';
  if (/\b(multipass|multi-pase|bundle|paquete|session|sesión|entradas|tickets)\b/.test(text))
    return 'multipass';
  if (/\b(stamp|sello|visita|visit|punch|points|puntos|loyalty|fidelidad)\b/.test(text))
    return 'stamp';

  // Provider + structural hints
  if (v1.provider === 'apple') {
    const couponStyles = ['coupon'];
    // If we ever add passStyle to v1 we could use it here; for now rely on text.
    if (couponStyles.some((s) => text.includes(s))) return 'coupon';
  }

  return 'stamp';
}

export function detectIndustry(v1: WalletDesignState): Industry {
  const hasContent =
    Object.keys(v1.appleFields || {}).length > 0 ||
    (v1.googleRows || []).length > 0 ||
    (v1.links || []).length > 0;

  if (!hasContent) {
    return 'generic';
  }

  const cardType = detectCardType(v1);
  const meta = CARD_TYPE_METADATA[cardType];
  return meta?.defaultIndustry ?? 'generic';
}

function extractAllText(v1: WalletDesignState): string {
  const parts: string[] = [];

  // Apple fields
  for (const group of Object.values(v1.appleFields || {})) {
    for (const f of group) {
      parts.push(f.label, f.value);
    }
  }

  // Google rows
  for (const row of v1.googleRows || []) {
    for (const item of row.items || []) {
      parts.push(item.label, item.displayName, item.fieldPath);
    }
  }

  // Links
  for (const link of v1.links || []) {
    parts.push(link.label);
  }

  // URIs
  parts.push(v1.homepageUri || '', v1.helpUri || '');

  return parts.join(' ');
}

/* ------------------------------------------------------------------ */
/*  Field migration                                                   */
/* ------------------------------------------------------------------ */

const APPLE_GROUP_MAP: Record<string, FieldGroup> = {
  headerFields: 'header',
  primaryFields: 'primary',
  secondaryFields: 'secondary',
  auxiliaryFields: 'auxiliary',
  backFields: 'back',
};

export function migrateAppleFields(v1: WalletDesignState): UnifiedField[] {
  const fields: UnifiedField[] = [];
  const appleFields = v1.appleFields || {};

  for (const [groupKey, groupFields] of Object.entries(appleFields)) {
    const fieldGroup = APPLE_GROUP_MAP[groupKey] ?? 'auxiliary';
    for (let i = 0; i < groupFields.length; i++) {
      const f = groupFields[i];
      fields.push({
        id: f.key || `${groupKey}-${i}`,
        label: f.label ?? '',
        value: f.value ?? '',
        fieldGroup,
        order: i,
        showOnApple: true,
        showOnGoogle: false,
        isDynamic: false,
        appleOptions: {
          changeMessage: f.changeMessage,
          textAlignment: f.textAlignment,
          attributedValue: f.attributedValue,
        },
        googleOptions: {
          isPredefined: false,
        },
        notifications: {},
        formatting: {
          isLink: false,
        },
      });
    }
  }

  return fields;
}

export function migrateGoogleRows(v1: WalletDesignState): UnifiedField[] {
  const fields: UnifiedField[] = [];
  const rows = v1.googleRows || [];

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const fieldGroup: FieldGroup = rowIdx < 2 ? 'secondary' : 'auxiliary';

    for (let itemIdx = 0; itemIdx < row.items.length; itemIdx++) {
      const item = row.items[itemIdx];
      fields.push({
        id: item.id || `google-${rowIdx}-${itemIdx}`,
        label: item.label || item.displayName || '',
        value: '',
        fieldGroup,
        order: rowIdx * 10 + itemIdx,
        showOnApple: false,
        showOnGoogle: true,
        isDynamic: false,
        appleOptions: {},
        googleOptions: {
          isPredefined: true,
          predefinedPath: item.fieldPath,
        },
        notifications: {},
        formatting: {
          isLink: false,
        },
      });
    }
  }

  return fields;
}

/* ------------------------------------------------------------------ */
/*  Full migration                                                    */
/* ------------------------------------------------------------------ */

export function migrateV1ToV2(v1: WalletDesignState): WalletPassStudioState {
  const cardType = detectCardType(v1);
  const industry = detectIndustry(v1);
  const meta = CARD_TYPE_METADATA[cardType];

  // Images
  const images: WalletPassStudioState['images'] = {};
  if (v1.appleLogoUrl) images.logo = toImageAsset(v1.appleLogoUrl);
  else if (v1.googleProgramLogoUrl) images.logo = toImageAsset(v1.googleProgramLogoUrl);

  if (v1.appleLogo2xUrl) images.logo2x = toImageAsset(v1.appleLogo2xUrl);
  if (v1.appleStripUrl) images.strip = toImageAsset(v1.appleStripUrl);
  if (v1.appleStrip2xUrl) images.strip2x = toImageAsset(v1.appleStrip2xUrl);
  if (v1.appleThumbnailUrl) images.thumbnail = toImageAsset(v1.appleThumbnailUrl);
  if (v1.appleThumbnail2xUrl) images.thumbnail2x = toImageAsset(v1.appleThumbnail2xUrl);
  if (v1.appleIconUrl) images.icon = toImageAsset(v1.appleIconUrl);
  if (v1.appleIcon2xUrl) images.icon2x = toImageAsset(v1.appleIcon2xUrl);
  if (v1.googleHeroImageUrl) images.heroImage = toImageAsset(v1.googleHeroImageUrl);
  if (v1.googleWideLogoUrl) images.wideLogo = toImageAsset(v1.googleWideLogoUrl);
  if (v1.googleImageModuleUrl) images.imageModule = toImageAsset(v1.googleImageModuleUrl);

  // Fields
  const appleFields = migrateAppleFields(v1);
  const googleFields = migrateGoogleRows(v1);
  const fields: UnifiedField[] = [...appleFields, ...googleFields];

  // Advanced configs
  const appleAdvanced = v1.appleAdvanced || {
    suppressStripShine: false,
    nfcMessage: '',
    sharingProhibited: false,
    voided: false,
    expirationDate: '',
  };

  const googleAdvanced = v1.googleAdvanced || {
    reviewStatus: 'UNDER_REVIEW' as const,
    allowMultipleUsers: 'ONE_USER_ALL_DEVICES',
    homepageUri: '',
    helpUri: '',
    linksModuleUris: [],
    messages: [],
    notifyPreference: true,
  };

  // Locations
  const locations: LocationConfig[] = (v1.locations || []).map((loc) => ({
    id: loc.id,
    latitude: loc.latitude,
    longitude: loc.longitude,
    altitude: loc.altitude,
    relevantText: loc.relevantText,
  }));

  // Beacons
  const beacons: BeaconConfig[] = (v1.beacons || []).map((b) => ({
    id: b.id,
    uuid: b.uuid,
    major: b.major,
    minor: b.minor,
    relevantText: b.relevantText,
  }));

  // Links → backContent.links
  const backLinks: BackLink[] = (v1.links || []).map((link) => ({
    id: link.id,
    label: link.label,
    url: link.uri,
    type: inferLinkType(link.uri),
  }));

  const appleNfc = v1.appleNfc || { nfc_enabled: false, nfc_requires_authentication: false };

  const apple: AppleSpecificConfig = {
    passStyle: normalizePassStyle(meta?.applePassStyle),
    description: '',
    organizationName: '',
    nfc: {
      enabled: appleNfc.nfc_enabled ?? false,
      message: appleAdvanced.nfcMessage || undefined,
      requiresAuthentication: appleNfc.nfc_requires_authentication ?? false,
    },
    locations,
    beacons,
    suppressStripShine: appleAdvanced.suppressStripShine ?? false,
    sharingProhibited: appleAdvanced.sharingProhibited ?? false,
    voided: appleAdvanced.voided ?? false,
    expirationDate: appleAdvanced.expirationDate || undefined,
  };

  const google: GoogleSpecificConfig = {
    passType: normalizeGooglePassType(meta?.googlePassType),
    programName: '',
    hexBackgroundColor: '#FFFFFF',
    reviewStatus: googleAdvanced.reviewStatus ?? 'UNDER_REVIEW',
    allowMultipleUsers: (googleAdvanced.allowMultipleUsers as GoogleSpecificConfig['allowMultipleUsers']) ?? 'ONE_USER_ALL_DEVICES',
    homepageUri: googleAdvanced.homepageUri || undefined,
    helpUri: googleAdvanced.helpUri || undefined,
    messages: googleAdvanced.messages || [],
    notifyPreference: googleAdvanced.notifyPreference ?? true,
  };

  const state: WalletPassStudioState = {
    version: 2,
    id: generateId(),
    name: 'Migrated Pass Design',
    cardType,
    industry,
    colors: { ...DEFAULT_COLORS },
    images,
    fields,
    cardTypeConfig: getDefaultCardTypeConfig(cardType),
    barcode: { ...DEFAULT_BARCODE },
    backContent: {
      fields: [],
      links: backLinks,
      detailImages: [],
    },
    apple,
    google,
    ui: {
      activeTab: 'images',
      platformView: 'both',
      showBack: false,
      zoom: 100,
      isModified: false,
    },
  };

  return state;
}
