/**
 * Card-type-specific configuration types for the Wallet Pass Studio.
 */

import type { CardType } from './unified-state';

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
  /** Visual customization: shape of each stamp */
  stampShape: 'circle' | 'square' | 'star' | 'heart' | 'diamond' | 'hexagon';
  /** Visual customization: icon URL for empty stamp */
  stampIcon: string;
  /** Visual customization: icon URL for filled stamp */
  stampFilledIcon: string;
  /** Visual customization: color of filled stamps */
  stampColor: string;
  /** Visual customization: grid layout for stamp display */
  stampGridLayout: '3x3' | '4x4' | '5x2' | '6x2' | 'dynamic';
}

export interface CashbackCardConfig {
  cardType: 'cashback';
  cashbackPercentage: number;
  minimumPurchase: number;
  creditExpiryDays: number;
  /** Visual customization: coin icon URL */
  coinIcon: string;
  /** Visual customization: tier badge graphic URL */
  tierBadge: string;
  /** Visual customization: progress ring color */
  progressRingColor: string;
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
  /** Visual customization: style of the cut/separation line */
  cutLineStyle: 'dashed' | 'dotted' | 'solid' | 'zigzag';
  /** Visual customization: style of the discount badge */
  discountBadgeStyle: 'pill' | 'banner' | 'circle' | 'tag';
  /** Visual customization: offer tag text or label */
  offerTag: string;
}

export interface AffiliateCardConfig {
  cardType: 'affiliate';
  affiliateCodePattern: string;
  benefitsDescription: string;
  /** Visual customization: partner logo image URL */
  partnerLogoUrl?: string;
  /** Visual customization: badge accent color */
  badgeColor: string;
  /** Visual customization: banner text for referral section */
  referralBannerText: string;
}

export interface DiscountCardConfig {
  cardType: 'discount';
  tiers: Array<{
    tierName: string;
    threshold: number;
    discountPercentage: number;
  }>;
  /** Visual customization: icons for each tier badge */
  tierBadgeIcons: string[];
  /** Visual customization: progress bar accent color */
  progressBarColor: string;
  /** Visual customization: banner text for discount section */
  discountBannerText: string;
}

export interface GiftCertificateCardConfig {
  cardType: 'gift_certificate';
  denominations: number[];
  expiryDays: number;
  /** Visual customization: gift box graphic URL */
  boxGraphic: string;
  /** Visual customization: ribbon accent color */
  ribbonColor: string;
  /** Visual customization: denomination badge style or text */
  denominationBadge: string;
}

export interface VipMembershipCardConfig {
  cardType: 'vip_membership';
  membershipName: string;
  monthlyFee: number;
  annualFee: number;
  validityPeriod: 'monthly' | 'annual' | 'lifetime';
  perks: string[];
  /** Visual customization: crown or VIP icon URL */
  crownIcon: string;
  /** Visual customization: style of the membership badge */
  memberBadgeStyle: 'gold' | 'silver' | 'platinum' | 'bronze';
  /** Visual customization: icons for each benefit in the list */
  benefitsListIcons: string[];
}

export interface CorporateDiscountCardConfig {
  cardType: 'corporate_discount';
  corporateDiscountPercentage: number;
  companyName: string;
  employeeIdRequired: boolean;
  /** Visual customization: company logo image URL */
  companyLogoUrl?: string;
  /** Visual customization: badge visual style */
  badgeStyle: 'corporate' | 'standard' | 'minimal';
  /** Visual customization: ID badge accent color */
  idBadgeColor: string;
}

export interface ReferralPassCardConfig {
  cardType: 'referral_pass';
  referrerReward: string;
  refereeReward: string;
  maxReferralsPerCustomer: number;
  referralCodePattern: string;
  /** Visual customization: share button color */
  shareButtonColor: string;
  /** Visual customization: reward badge icon URL */
  rewardBadgeIcon: string;
  /** Visual customization: placeholder avatar graphic URL */
  friendAvatarPlaceholder: string;
}

export interface MultipassCardConfig {
  cardType: 'multipass';
  bundleSize: number;
  bundlePrice: number;
  passTypeLabel: string;
  /** Visual customization: ticket graphic URL */
  ticketGraphic: string;
  /** Visual customization: punch or check icon URL */
  punchIcon: string;
  /** Visual customization: style of the bundle badge */
  bundleBadgeStyle: 'numeric' | 'visual' | 'minimal';
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

export function getDefaultCardTypeConfig(cardType: CardType): CardTypeConfig {
  switch (cardType) {
    case 'stamp':
      return {
        cardType: 'stamp',
        stampsRequired: 10,
        rewardDescription: '',
        stampType: 'visit',
        consumptionPerStamp: 1,
        stampExpiry: 'unlimited',
        stampsAtIssue: 0,
        dailyStampLimit: 1,
        birthdayStamps: 0,
        stampShape: 'circle',
        stampIcon: '',
        stampFilledIcon: '',
        stampColor: '#3B82F6',
        stampGridLayout: '5x2',
      };
    case 'cashback':
      return {
        cardType: 'cashback',
        cashbackPercentage: 5,
        minimumPurchase: 0,
        creditExpiryDays: 365,
        coinIcon: '',
        tierBadge: '',
        progressRingColor: '#10B981',
      };
    case 'coupon':
      return {
        cardType: 'coupon',
        discountType: 'percentage',
        discountValue: 10,
        usageLimitPerCustomer: 1,
        couponDescription: '',
        specialPromotionText: '',
        couponExpiry: 'unlimited',
        pushMessage: '',
        cutLineStyle: 'dashed',
        discountBadgeStyle: 'pill',
        offerTag: '',
      };
    case 'affiliate':
      return {
        cardType: 'affiliate',
        affiliateCodePattern: '',
        benefitsDescription: '',
        partnerLogoUrl: '',
        badgeColor: '#8B5CF6',
        referralBannerText: '',
      };
    case 'discount':
      return {
        cardType: 'discount',
        tiers: [],
        tierBadgeIcons: [],
        progressBarColor: '#F59E0B',
        discountBannerText: '',
      };
    case 'gift_certificate':
      return {
        cardType: 'gift_certificate',
        denominations: [],
        expiryDays: 365,
        boxGraphic: '',
        ribbonColor: '#EF4444',
        denominationBadge: '',
      };
    case 'vip_membership':
      return {
        cardType: 'vip_membership',
        membershipName: '',
        monthlyFee: 0,
        annualFee: 0,
        validityPeriod: 'monthly',
        perks: [],
        crownIcon: '',
        memberBadgeStyle: 'gold',
        benefitsListIcons: [],
      };
    case 'corporate_discount':
      return {
        cardType: 'corporate_discount',
        corporateDiscountPercentage: 10,
        companyName: '',
        employeeIdRequired: true,
        companyLogoUrl: '',
        badgeStyle: 'corporate',
        idBadgeColor: '#6366F1',
      };
    case 'referral_pass':
      return {
        cardType: 'referral_pass',
        referrerReward: '',
        refereeReward: '',
        maxReferralsPerCustomer: 5,
        referralCodePattern: '',
        shareButtonColor: '#3B82F6',
        rewardBadgeIcon: '',
        friendAvatarPlaceholder: '',
      };
    case 'multipass':
      return {
        cardType: 'multipass',
        bundleSize: 10,
        bundlePrice: 0,
        passTypeLabel: '',
        ticketGraphic: '',
        punchIcon: '',
        bundleBadgeStyle: 'numeric',
      };
    default:
      // Exhaustiveness check
      throw new Error(`Unknown card type: ${cardType as string}`);
  }
}
