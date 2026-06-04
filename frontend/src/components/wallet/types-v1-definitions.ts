/**
 * Apple Wallet NFC feature configuration.
 */
export interface AppleWalletFeatureConfig {
  /** Whether NFC is enabled */
  nfc_enabled: boolean;
  /** Whether NFC requires authentication */
  nfc_requires_authentication: boolean;
}

/**
 * A row of fields in a Google Wallet pass.
 */
export interface GoogleFieldRow {
  /** Row identifier */
  id: string;
  /** Row layout type */
  type: 'oneItem' | 'twoItems' | 'threeItems';
  /** Fields in this row */
  items: GoogleFieldItem[];
}

/**
 * A single field item within a Google Wallet row.
 */
export interface GoogleFieldItem {
  /** Item identifier */
  id: string;
  /** Google Wallet field path */
  fieldPath: string;
  /** Display label */
  label: string;
  /** Display name */
  displayName: string;
}

/**
 * Definition of an Apple Wallet pass field.
 */
export interface AppleFieldDef {
  /** Field key */
  key: string;
  /** Display label */
  label: string;
  /** Field value or template */
  value: string;
  /** Message shown when value changes */
  changeMessage?: string;
  /** Text alignment */
  textAlignment?: 'PKTextAlignmentLeft' | 'PKTextAlignmentCenter' | 'PKTextAlignmentRight' | 'PKTextAlignmentNatural';
  /** Attributed value string */
  attributedValue?: string;
}

/**
 * Advanced configuration for Google Wallet passes.
 */
export interface GoogleAdvancedConfig {
  /** Review status */
  reviewStatus: 'UNDER_REVIEW' | 'approved' | 'rejected';
  /** Multiple users policy */
  allowMultipleUsers: string;
  /** Homepage URI */
  homepageUri: string;
  /** Help URI */
  helpUri: string;
  /** Links module URIs */
  linksModuleUris: { label: string; uri: string }[];
  /** Messages array */
  messages: { header: string; body: string }[];
  /** Notification preference */
  notifyPreference: boolean;
}

/**
 * Advanced configuration for Apple Wallet passes.
 */
export interface AppleAdvancedConfig {
  /** Whether to suppress strip shine */
  suppressStripShine: boolean;
  /** NFC message text */
  nfcMessage: string;
  /** Whether sharing is prohibited */
  sharingProhibited: boolean;
  /** Whether the pass is voided */
  voided: boolean;
  /** Expiration date */
  expirationDate: string;
}

/**
 * Location associated with a wallet pass.
 */
export interface WalletLocation {
  /** Location identifier */
  id: string;
  /** Latitude */
  latitude: number;
  /** Longitude */
  longitude: number;
  /** Altitude */
  altitude: number;
  /** Relevant text for the location */
  relevantText: string;
}

/**
 * Beacon associated with a wallet pass.
 */
export interface WalletBeacon {
  /** Beacon identifier */
  id: string;
  /** Beacon UUID */
  uuid: string;
  /** Major value */
  major: number;
  /** Minor value */
  minor: number;
  /** Relevant text for the beacon */
  relevantText: string;
}

/**
 * Link module entry for a wallet pass.
 */
export interface WalletLink {
  /** Link identifier */
  id: string;
  /** Display label */
  label: string;
  /** URI */
  uri: string;
}

/**
 * Complete design state for a wallet pass (Apple or Google).
 */
export interface WalletDesignState {
  /** Active wallet provider */
  provider: 'apple' | 'google';
  /** Apple logo URL */
  appleLogoUrl: string;
  /** Apple logo 2x URL */
  appleLogo2xUrl: string;
  /** Apple strip image URL */
  appleStripUrl: string;
  /** Apple strip 2x URL */
  appleStrip2xUrl: string;
  /** Apple thumbnail URL */
  appleThumbnailUrl: string;
  /** Apple thumbnail 2x URL */
  appleThumbnail2xUrl: string;
  /** Apple icon URL */
  appleIconUrl: string;
  /** Apple icon 2x URL */
  appleIcon2xUrl: string;
  /** Google program logo URL */
  googleProgramLogoUrl: string;
  /** Google hero image URL */
  googleHeroImageUrl: string;
  /** Google wide logo URL */
  googleWideLogoUrl: string;
  /** Google image module URL */
  googleImageModuleUrl: string;
  /** Apple field groups */
  appleFields: Record<string, AppleFieldDef[]>;
  /** Google field rows */
  googleRows: GoogleFieldRow[];
  /** Google advanced config */
  googleAdvanced: GoogleAdvancedConfig;
  /** Apple advanced config */
  appleAdvanced: AppleAdvancedConfig;
  /** Apple NFC config */
  appleNfc: AppleWalletFeatureConfig;
  /** Associated locations */
  locations: WalletLocation[];
  /** Associated beacons */
  beacons: WalletBeacon[];
  /** Associated links */
  links: WalletLink[];
  /** Homepage URI */
  homepageUri: string;
  /** Help URI */
  helpUri: string;
}

/**
 * @description Returns the default empty wallet design state.
 * @returns {WalletDesignState} Default design state
 */
export function defaultWalletDesignState(): WalletDesignState {
  return {
    provider: 'apple',
    appleLogoUrl: '', appleLogo2xUrl: '', appleStripUrl: '', appleStrip2xUrl: '',
    appleThumbnailUrl: '', appleThumbnail2xUrl: '', appleIconUrl: '', appleIcon2xUrl: '',
    googleProgramLogoUrl: '', googleHeroImageUrl: '', googleWideLogoUrl: '', googleImageModuleUrl: '',
    appleFields: {},
    googleRows: [],
    googleAdvanced: {
      reviewStatus: 'UNDER_REVIEW',
      allowMultipleUsers: 'ONE_USER_ALL_DEVICES',
      homepageUri: '',
      helpUri: '',
      linksModuleUris: [],
      messages: [],
      notifyPreference: true,
    },
    appleAdvanced: {
      suppressStripShine: false,
      nfcMessage: '',
      sharingProhibited: false,
      voided: false,
      expirationDate: '',
    },
    appleNfc: { nfc_enabled: false, nfc_requires_authentication: false },
    locations: [],
    beacons: [],
    links: [],
    homepageUri: '',
    helpUri: '',
  };
}
