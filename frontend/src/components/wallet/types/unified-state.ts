/**
 * Unified v2 state model for the Wallet Pass Studio.
 * Replaces the split Apple/Google v1 model with a single source of truth.
 */

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

export type FieldGroup = 'header' | 'primary' | 'secondary' | 'auxiliary' | 'back';

export type TextAlignment =
  | 'PKTextAlignmentLeft'
  | 'PKTextAlignmentCenter'
  | 'PKTextAlignmentRight'
  | 'PKTextAlignmentNatural';

export type DateStyle = 'PKDateStyleNone' | 'PKDateStyleShort' | 'PKDateStyleMedium' | 'PKDateStyleLong' | 'PKDateStyleFull';
export type TimeStyle = 'PKTimeStyleNone' | 'PKTimeStyleShort' | 'PKTimeStyleMedium' | 'PKTimeStyleLong' | 'PKTimeStyleFull';
export type NumberStyle = 'PKNumberStyleDecimal' | 'PKNumberStylePercent' | 'PKNumberStyleScientific' | 'PKNumberStyleSpellOut';

export type BarcodeFormat = 'QR_CODE' | 'AZTEC' | 'PDF417' | 'CODE128' | 'DATA_MATRIX';

export type PlatformView = 'both' | 'apple' | 'google';

export type PassStyle = 'generic' | 'coupon' | 'storeCard' | 'boardingPass' | 'eventTicket' | 'transitStyle';

export type GooglePassType = 'LoyaltyClass' | 'OfferClass' | 'GiftCardClass' | 'GenericClass';

export type LinkType = 'website' | 'email' | 'phone' | 'map' | 'social';

export interface ImageAsset {
  url: string;
  width: number;
  height: number;
}

export interface AppleFieldOptions {
  changeMessage?: string;
  textAlignment?: TextAlignment;
  dateStyle?: DateStyle;
  timeStyle?: TimeStyle;
  numberStyle?: NumberStyle;
  currencyCode?: string;
  attributedValue?: string;
}

export interface GoogleFieldOptions {
  isPredefined: boolean;
  predefinedPath?: string;
  textModulesId?: string;
}

export interface FieldNotifications {
  appleChangeMessage?: string;
  googleMessage?: string;
}

export interface FieldFormatting {
  isLink: boolean;
  linkUrl?: string;
  linkType?: LinkType;
}

export interface UnifiedField {
  id: string;
  label: string;
  value: string;
  fieldGroup: FieldGroup;
  order: number;
  showOnApple: boolean;
  showOnGoogle: boolean;
  isDynamic: boolean;
  dynamicTemplate?: string;
  appleOptions: AppleFieldOptions;
  googleOptions: GoogleFieldOptions;
  notifications: FieldNotifications;
  formatting: FieldFormatting;
}

export interface BackField {
  id: string;
  label: string;
  value: string;
  isLink: boolean;
  linkUrl?: string;
  linkType?: LinkType;
  order: number;
}

export interface BackLink {
  id: string;
  type: LinkType;
  url: string;
  label: string;
  icon?: string;
}

export interface DetailImage {
  url: string;
  width: number;
  height: number;
  description?: string;
}

export interface AppLinkConfig {
  iosAppId?: string;
  iosAppLink?: string;
  androidAppPackage?: string;
  androidAppLink?: string;
}

export interface BackContent {
  fields: BackField[];
  links: BackLink[];
  detailImages: DetailImage[];
  appLink?: AppLinkConfig;
  termsAndConditions?: string;
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

export interface StampCardConfig {
  cardType: 'stamp';
  stampsRequired: number;
  rewardDescription: string;
  stampType: 'visit' | 'consumption';
  consumptionPerStamp: number;
  stampExpiry: 'unlimited' | number;
  stampStartDate?: string;
  stampEndDate?: string;
  stampsAtIssue: number;
  dailyStampLimit: number;
  birthdayStamps: number;
  stampShape: 'circle' | 'square' | 'star' | 'heart' | 'diamond' | 'hexagon';
}

export interface CashbackCardConfig {
  cardType: 'cashback';
  cashbackPercentage: number;
  minimumPurchase: number;
  creditExpiryDays: number;
}

export interface CouponCardConfig {
  cardType: 'coupon';
  discountType: 'fixed_amount' | 'percentage';
  discountValue: number;
  usageLimitPerCustomer: number;
  couponDescription: string;
  specialPromotionText: string;
  couponExpiry: 'unlimited' | number;
  couponStartDate?: string;
  couponEndDate?: string;
  pushMessage: string;
}

export interface AffiliateCardConfig {
  cardType: 'affiliate';
  affiliateCodePattern: string;
  benefitsDescription: string;
}

export interface DiscountCardConfig {
  cardType: 'discount';
  tiers: Array<{
    tierName: string;
    threshold: number;
    discountPercentage: number;
  }>;
}

export interface GiftCertificateCardConfig {
  cardType: 'gift_certificate';
  denominations: number[];
  expiryDays: number;
}

export interface VipMembershipCardConfig {
  cardType: 'vip_membership';
  membershipName: string;
  monthlyFee: number;
  annualFee: number;
  validityPeriod: 'monthly' | 'annual' | 'lifetime';
  perks: string[];
}

export interface CorporateDiscountCardConfig {
  cardType: 'corporate_discount';
  corporateDiscountPercentage: number;
  companyName: string;
  employeeIdRequired: boolean;
}

export interface ReferralPassCardConfig {
  cardType: 'referral_pass';
  referrerReward: string;
  refereeReward: string;
  maxReferralsPerCustomer: number;
  referralCodePattern: string;
}

export interface MultipassCardConfig {
  cardType: 'multipass';
  bundleSize: number;
  bundlePrice: number;
  passTypeLabel: string;
}

export type CardTypeConfig =
  | StampCardConfig
  | CashbackCardConfig
  | CouponCardConfig
  | AffiliateCardConfig
  | DiscountCardConfig
  | GiftCertificateCardConfig
  | VipMembershipCardConfig
  | CorporateDiscountCardConfig
  | ReferralPassCardConfig
  | MultipassCardConfig;

export interface WalletColors {
  background: string;
  foreground: string;
  label: string;
  accent: string;
}

export interface WalletImages {
  logo?: ImageAsset;
  logo2x?: ImageAsset;
  strip?: ImageAsset;
  strip2x?: ImageAsset;
  thumbnail?: ImageAsset;
  thumbnail2x?: ImageAsset;
  icon?: ImageAsset;
  icon2x?: ImageAsset;
  heroImage?: ImageAsset;
  wideLogo?: ImageAsset;
  imageModule?: ImageAsset;
}

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
    activeTab: string;
    platformView: PlatformView;
    showBack: boolean;
    zoom: number;
    appliedTemplateId?: string;
    isModified: boolean;
  };
}
