import { stripLocalMinioUrl } from '@/lib/url-utils';
import type { WalletPassStudioState, CardType, Industry } from '@/components/wallet/types/unified-state';
import { DEFAULT_COLORS, DEFAULT_BARCODE } from '@/components/wallet/constants';
import { getDefaultCardTypeConfig } from '@/components/wallet/types/card-type-config';

function stripTempUrl(url: string | undefined): string {
  return stripLocalMinioUrl(url);
}

const CARD_TYPE_MAP: Record<string, CardType> = {
  stamp: 'stamp',
  cashback: 'cashback',
  coupon: 'coupon',
  affiliate: 'affiliate',
  discount: 'discount',
  gift_certificate: 'gift_certificate',
  vip_membership: 'vip_membership',
  corporate_discount: 'corporate_discount',
  referral_pass: 'referral_pass',
  multipass: 'multipass',
};

/* ── V2 serialization ─────────────────────────────────────────────────── */

/**
 * @description Parses wallet design state from program metadata (V2 first, then V1 fallback).
 * @param {Record<string, unknown>} metadata - Program metadata object
 * @returns {Partial<WalletPassStudioState>} Parsed wallet design state
 */
export function parseWalletDesignFromMetadata(
  metadata: Record<string, unknown>
): Partial<WalletPassStudioState> {
  const v2 = metadata?.wallet_studio as Record<string, unknown> | undefined;
  if (v2) {
    return parseV2(v2);
  }

  const v1 = metadata?.wallet_design as Record<string, unknown> | undefined;
  if (v1) {
    return parseV1(v1, metadata);
  }

  return {};
}

function parseV2(v2: Record<string, unknown>): Partial<WalletPassStudioState> {
  const cardType = CARD_TYPE_MAP[String(v2.cardType)] || 'stamp';
  return {
    version: 2,
    id: String(v2.id || `pass-${Date.now()}`),
    name: String(v2.name || 'Nuevo Pase'),
    cardType,
    industry: (v2.industry as Industry) || 'generic',
    colors: (v2.colors as WalletPassStudioState['colors']) || { ...DEFAULT_COLORS },
    images: (v2.images as WalletPassStudioState['images']) || {},
    fields: (v2.fields as WalletPassStudioState['fields']) || [],
    cardTypeConfig: (v2.cardTypeConfig as WalletPassStudioState['cardTypeConfig']) || getDefaultCardTypeConfig(cardType),
    barcode: (v2.barcode as WalletPassStudioState['barcode']) || { ...DEFAULT_BARCODE },
    backContent: (v2.backContent as WalletPassStudioState['backContent']) || { fields: [], links: [], detailImages: [] },
    apple: (v2.apple as WalletPassStudioState['apple']) || undefined,
    google: (v2.google as WalletPassStudioState['google']) || undefined,
    ui: (v2.ui as WalletPassStudioState['ui']) || undefined,
  };
}

/* Minimal inline V1 shape for backward-compatible parsing */
interface V1AppleField {
  key: string;
  label: string;
  value: string;
  changeMessage?: string;
  textAlignment?: string;
  attributedValue?: string;
}

interface V1GoogleFieldItem {
  id: string;
  fieldPath: string;
  label: string;
  displayName: string;
}

interface V1GoogleFieldRow {
  id: string;
  type: 'oneItem' | 'twoItems' | 'threeItems';
  items: V1GoogleFieldItem[];
}

interface V1Location {
  id: string;
  latitude: number;
  longitude: number;
  altitude: number;
  relevantText: string;
}

interface V1Beacon {
  id: string;
  uuid: string;
  major: number;
  minor: number;
  relevantText: string;
}

function parseV1(v1: Record<string, unknown>, metadata: Record<string, unknown>): Partial<WalletPassStudioState> {
  const provider = (v1.provider as 'apple' | 'google' | 'both') || 'apple';
  const appleImages = (v1.apple_images as Record<string, string>) || {};
  const googleImages = (v1.google_images as Record<string, string>) || {};
  const appleFieldsV1 = (v1.apple_fields as Record<string, V1AppleField[]>) || {};
  const googleRowsV1 = (v1.google_rows as V1GoogleFieldRow[]) || [];
  const appleNfc = (metadata.apple_wallet as { nfc_enabled: boolean; nfc_requires_authentication: boolean } | undefined);

  const cardType = CARD_TYPE_MAP[String(metadata.card_type)] || 'stamp';

  // Convert V1 fields to V2 UnifiedField[]
  const fields: WalletPassStudioState['fields'] = [];
  const groupMap: Record<string, string> = {
    headerFields: 'header',
    primaryFields: 'primary',
    secondaryFields: 'secondary',
    auxiliaryFields: 'auxiliary',
    backFields: 'back',
  };

  Object.entries(appleFieldsV1).forEach(([group, groupFields]) => {
    groupFields?.forEach((f) => {
      fields.push({
        id: `field-${f.key || Math.random().toString(36).slice(2)}`,
        label: f.label,
        value: f.value,
        fieldGroup: (groupMap[group] || group) as any,
        order: 0,
        showOnApple: true,
        showOnGoogle: false,
        isDynamic: false,
        appleOptions: {
          changeMessage: f.changeMessage,
          textAlignment: f.textAlignment as any,
          attributedValue: f.attributedValue,
        },
        googleOptions: { isPredefined: false },
        notifications: {},
        formatting: { isLink: false },
      });
    });
  });

  googleRowsV1.forEach((row) => {
    row.items.forEach((item) => {
      fields.push({
        id: `field-${item.id || Math.random().toString(36).slice(2)}`,
        label: item.label,
        value: item.displayName,
        fieldGroup: 'primary',
        order: 0,
        showOnApple: false,
        showOnGoogle: true,
        isDynamic: false,
        appleOptions: {},
        googleOptions: {
          isPredefined: true,
          predefinedPath: item.fieldPath,
        },
        notifications: {},
        formatting: { isLink: false },
      });
    });
  });

  return {
    version: 2,
    id: `pass-${Date.now()}`,
    name: 'Nuevo Pase',
    cardType,
    industry: 'generic',
    colors: { ...DEFAULT_COLORS },
    images: {
      logo: appleImages.logo ? { url: stripTempUrl(appleImages.logo), width: 0, height: 0 } : undefined,
      logo2x: appleImages.logo_2x ? { url: stripTempUrl(appleImages.logo_2x), width: 0, height: 0 } : undefined,
      strip: appleImages.strip ? { url: stripTempUrl(appleImages.strip), width: 0, height: 0 } : undefined,
      strip2x: appleImages.strip_2x ? { url: stripTempUrl(appleImages.strip_2x), width: 0, height: 0 } : undefined,
      thumbnail: appleImages.thumbnail ? { url: stripTempUrl(appleImages.thumbnail), width: 0, height: 0 } : undefined,
      thumbnail2x: appleImages.thumbnail_2x ? { url: stripTempUrl(appleImages.thumbnail_2x), width: 0, height: 0 } : undefined,
      icon: appleImages.icon ? { url: stripTempUrl(appleImages.icon), width: 0, height: 0 } : undefined,
      icon2x: appleImages.icon_2x ? { url: stripTempUrl(appleImages.icon_2x), width: 0, height: 0 } : undefined,
      heroImage: googleImages.hero_image ? { url: stripTempUrl(googleImages.hero_image), width: 0, height: 0 } : undefined,
      wideLogo: googleImages.wide_logo ? { url: stripTempUrl(googleImages.wide_logo), width: 0, height: 0 } : undefined,
      imageModule: googleImages.image_module ? { url: stripTempUrl(googleImages.image_module), width: 0, height: 0 } : undefined,
    },
    fields,
    cardTypeConfig: getDefaultCardTypeConfig(cardType),
    barcode: { ...DEFAULT_BARCODE },
    backContent: { fields: [], links: [], detailImages: [] },
    apple: {
      passStyle: provider === 'apple' ? 'storeCard' : 'generic',
      description: '',
      organizationName: 'Loyallia',
      nfc: {
        enabled: appleNfc?.nfc_enabled ?? false,
        requiresAuthentication: appleNfc?.nfc_requires_authentication ?? false,
      },
      locations: ((v1.locations as V1Location[]) || []).map((loc) => ({
        id: loc.id,
        latitude: loc.latitude,
        longitude: loc.longitude,
        altitude: loc.altitude,
        relevantText: loc.relevantText,
      })),
      beacons: ((v1.beacons as V1Beacon[]) || []).map((beacon) => ({
        id: beacon.id,
        uuid: beacon.uuid,
        major: beacon.major,
        minor: beacon.minor,
        relevantText: beacon.relevantText,
      })),
      suppressStripShine: false,
      sharingProhibited: false,
      voided: false,
    },
    google: {
      passType: 'LoyaltyClass',
      programName: 'Loyallia Rewards',
      hexBackgroundColor: DEFAULT_COLORS.background,
      reviewStatus: 'UNDER_REVIEW',
      allowMultipleUsers: 'ONE_USER_ALL_DEVICES',
      messages: [],
      notifyPreference: false,
    },
    ui: {
      activeTab: 'images',
      platformView: provider === 'both' ? 'both' : provider,
      showBack: false,
      zoom: 1,
      showGrid: false,
      isModified: false,
    },
  };
}

/**
 * @description Builds wallet design metadata from a V2 design state object.
 * @param {WalletPassStudioState} state - Wallet design state
 * @returns {Record<string, unknown>} Metadata object for storage
 */
export function buildWalletDesignMetadata(
  state: WalletPassStudioState
): Record<string, unknown> {
  return {
    wallet_studio: {
      version: state.version,
      id: state.id,
      name: state.name,
      cardType: state.cardType,
      industry: state.industry,
      colors: state.colors,
      images: state.images,
      fields: state.fields,
      cardTypeConfig: state.cardTypeConfig,
      barcode: state.barcode,
      backContent: state.backContent,
      apple: state.apple,
      google: state.google,
      ui: state.ui,
    },
    wallet_provider: 'both',
  };
}
