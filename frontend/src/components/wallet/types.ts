export interface AppleWalletFeatureConfig {
  nfc_enabled: boolean;
  nfc_requires_authentication: boolean;
}

export interface GoogleFieldRow {
  id: string;
  type: 'oneItem' | 'twoItems' | 'threeItems';
  items: GoogleFieldItem[];
}

export interface GoogleFieldItem {
  id: string;
  fieldPath: string;
  label: string;
  displayName: string;
}

export interface AppleFieldDef {
  key: string;
  label: string;
  value: string;
  changeMessage?: string;
  textAlignment?: 'PKTextAlignmentLeft' | 'PKTextAlignmentCenter' | 'PKTextAlignmentRight' | 'PKTextAlignmentNatural';
  attributedValue?: string;
}

export interface GoogleAdvancedConfig {
  reviewStatus: 'UNDER_REVIEW' | 'approved' | 'rejected';
  allowMultipleUsers: string;
  homepageUri: string;
  helpUri: string;
  linksModuleUris: { label: string; uri: string }[];
  messages: { header: string; body: string }[];
  notifyPreference: boolean;
}

export interface AppleAdvancedConfig {
  suppressStripShine: boolean;
  nfcMessage: string;
  sharingProhibited: boolean;
  voided: boolean;
  expirationDate: string;
}

export interface WalletLocation {
  id: string;
  latitude: number;
  longitude: number;
  altitude: number;
  relevantText: string;
}

export interface WalletBeacon {
  id: string;
  uuid: string;
  major: number;
  minor: number;
  relevantText: string;
}

export interface WalletLink {
  id: string;
  label: string;
  uri: string;
}

export interface WalletDesignState {
  provider: 'apple' | 'google';
  appleLogoUrl: string;
  appleLogo2xUrl: string;
  appleStripUrl: string;
  appleStrip2xUrl: string;
  appleThumbnailUrl: string;
  appleThumbnail2xUrl: string;
  appleIconUrl: string;
  appleIcon2xUrl: string;
  googleProgramLogoUrl: string;
  googleHeroImageUrl: string;
  googleWideLogoUrl: string;
  googleImageModuleUrl: string;
  appleFields: Record<string, AppleFieldDef[]>;
  googleRows: GoogleFieldRow[];
  googleAdvanced: GoogleAdvancedConfig;
  appleAdvanced: AppleAdvancedConfig;
  appleNfc: AppleWalletFeatureConfig;
  locations: WalletLocation[];
  beacons: WalletBeacon[];
  links: WalletLink[];
  homepageUri: string;
  helpUri: string;
}

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
