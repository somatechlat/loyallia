/**
 * Unified v2 state model for the Wallet Pass Studio.
 * Replaces the split Apple/Google v1 model with a single source of truth.
 */

import type {
  UnifiedField,
  FieldGroup,
  TextAlignment,
  DateStyle,
  TimeStyle,
  NumberStyle,
  LinkType,
  AppleFieldOptions,
  GoogleFieldOptions,
  FieldNotifications,
  FieldFormatting,
  DynamicValueTemplate,
  DynamicTemplateRegistry,
} from './unified-field';

import type {
  BackField,
  BackLink,
  DetailImage,
  AppLinkConfig,
  BackContent,
  BackContentDefaults,
} from './back-content';

import type {
  StampCardConfig,
  CashbackCardConfig,
  CouponCardConfig,
  AffiliateCardConfig,
  DiscountCardConfig,
  GiftCertificateCardConfig,
  VipMembershipCardConfig,
  CorporateDiscountCardConfig,
  ReferralPassCardConfig,
  MultipassCardConfig,
  CardTypeConfig,
} from './card-type-config';

import type { DynamicTemplate } from './dynamic-templates';

// Re-export all field types
export type {
  UnifiedField,
  FieldGroup,
  TextAlignment,
  DateStyle,
  TimeStyle,
  NumberStyle,
  LinkType,
  AppleFieldOptions,
  GoogleFieldOptions,
  FieldNotifications,
  FieldFormatting,
  DynamicValueTemplate,
  DynamicTemplateRegistry,
};

// Re-export all back-content types
export type {
  BackField,
  BackLink,
  DetailImage,
  AppLinkConfig,
  BackContent,
  BackContentDefaults,
};

// Re-export all card-type config types
export type {
  StampCardConfig,
  CashbackCardConfig,
  CouponCardConfig,
  AffiliateCardConfig,
  DiscountCardConfig,
  GiftCertificateCardConfig,
  VipMembershipCardConfig,
  CorporateDiscountCardConfig,
  ReferralPassCardConfig,
  MultipassCardConfig,
  CardTypeConfig,
};

// Re-export dynamic template types
export type { DynamicTemplate };

export type CardType =
  | 'stamp'
  | 'cashback'
  | 'coupon'
  | 'affiliate'
  | 'discount'
  | 'gift_certificate'
  | 'vip_membership'
  | 'corporate_discount'
  | 'referral_pass'
  | 'multipass';

export type Industry =
  | 'food'
  | 'retail'
  | 'services'
  | 'health'
  | 'entertainment'
  | 'transport'
  | 'education'
  | 'technology'
  | 'generic';

export type BarcodeFormat = 'QR_CODE' | 'AZTEC' | 'PDF417' | 'CODE128' | 'DATA_MATRIX';

export type PlatformView = 'both' | 'apple' | 'google';

export type PassStyle = 'generic' | 'coupon' | 'storeCard' | 'boardingPass' | 'eventTicket' | 'transitStyle';

export type GooglePassType = 'LoyaltyClass' | 'OfferClass' | 'GiftCardClass' | 'GenericClass';

export interface ImageAsset {
  url: string;
  width: number;
  height: number;
}

export interface BarcodeConfig {
  format: BarcodeFormat;
  message: string;
  messageEncoding: string;
  altText?: string;
}

export interface NFCConfig {
  enabled: boolean;
  message?: string;
  requiresAuthentication: boolean;
  encryptionPublicKey?: string;
}

export interface LocationConfig {
  id: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  relevantText?: string;
}

export interface BeaconConfig {
  id: string;
  uuid: string;
  major: number;
  minor: number;
  relevantText?: string;
}

export interface AppleSpecificConfig {
  passStyle: PassStyle;
  description: string;
  organizationName: string;
  appLaunchURL?: string;
  nfc: NFCConfig;
  locations: LocationConfig[];
  beacons: BeaconConfig[];
  suppressStripShine: boolean;
  sharingProhibited: boolean;
  voided: boolean;
  expirationDate?: string;
}

export interface GoogleSpecificConfig {
  passType: GooglePassType;
  programName: string;
  hexBackgroundColor: string;
  heroImage?: ImageAsset;
  smartTapRedemptionValue?: string;
  groupingId?: string;
  reviewStatus: 'UNDER_REVIEW' | 'approved' | 'rejected';
  allowMultipleUsers: 'ONE_USER_ALL_DEVICES' | 'ONE_USER_ONE_DEVICE' | 'MULTIPLE_USERS';
  homepageUri?: string;
  helpUri?: string;
  messages: Array<{ header: string; body: string }>;
  notifyPreference: boolean;
}

export interface WalletColors {
  background: string;
  foreground: string;
  label: string;
  accent: string;
}

export interface WalletImages {
  logo?: ImageAsset;
  logo2x?: ImageAsset;
  logo3x?: ImageAsset;
  strip?: ImageAsset;
  strip2x?: ImageAsset;
  strip3x?: ImageAsset;
  thumbnail?: ImageAsset;
  thumbnail2x?: ImageAsset;
  icon?: ImageAsset;
  icon2x?: ImageAsset;
  heroImage?: ImageAsset;
  wideLogo?: ImageAsset;
  imageModule?: ImageAsset;
  background?: ImageAsset; // Apple event ticket background
}

export type ActiveTab = 'images' | 'cardType' | 'fields' | 'back' | 'barcode' | 'colors' | 'advanced';

export interface WalletPassStudioState {
  version: 2;
  id: string;
  name: string;

  cardType: CardType;
  industry: Industry;

  colors: WalletColors;
  images: WalletImages;

  fields: UnifiedField[];
  cardTypeConfig: CardTypeConfig;

  barcode: BarcodeConfig;
  backContent: BackContent;

  apple: AppleSpecificConfig;
  google: GoogleSpecificConfig;

  ui: {
    activeTab: ActiveTab;
    platformView: PlatformView;
    showBack: boolean;
    zoom: number;
    appliedTemplateId?: string;
    isModified: boolean;
  };
}
