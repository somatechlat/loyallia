/**
 * Helper types and functions for Apple Wallet preview components.
 *
 * Extracted from AppleWalletPreview.tsx to keep each file under the 650-line limit.
 */

import type { FieldDataType } from '@/components/wallet/types/unified-field';
import type { CardTypeConfig } from '@/components/wallet/types/unified-state';
import type { ImageCrop } from '@/components/wallet/utils/crop-style';
import { resolveOccasionLabel } from '@/components/wallet/studio/tabs/GiftTab';

export interface PreviewAppleField {
  key: string;
  label: string;
  value: string;
  dataType?: FieldDataType;
  changeMessage?: string;
  textAlignment?: 'PKTextAlignmentLeft' | 'PKTextAlignmentCenter' | 'PKTextAlignmentRight' | 'PKTextAlignmentNatural';
  attributedValue?: string;
}

/** Non-destructive crops keyed by image role, paired with the *Url fields. */
export interface PreviewImageCrops {
  logo?: ImageCrop;
  strip?: ImageCrop;
  thumbnail?: ImageCrop;
  icon?: ImageCrop;
  background?: ImageCrop;
  heroImage?: ImageCrop;
  wideLogo?: ImageCrop;
  imageModule?: ImageCrop;
}

export interface PreviewWalletDesign {
  appleLogoUrl?: string;
  appleLogo2xUrl?: string;
  appleStripUrl?: string;
  appleStrip2xUrl?: string;
  appleThumbnailUrl?: string;
  appleThumbnail2xUrl?: string;
  appleIconUrl?: string;
  appleIcon2xUrl?: string;
  appleBackgroundUrl?: string;
  imageCrops?: PreviewImageCrops;
  appleFields?: {
    headerFields?: PreviewAppleField[];
    primaryFields?: PreviewAppleField[];
    secondaryFields?: PreviewAppleField[];
    auxiliaryFields?: PreviewAppleField[];
    backFields?: PreviewAppleField[];
  };
}

/** Pass-schema `{{namespace.leaf}}` → flat preview context key map. */
const SCHEMA_TOKEN_TO_CTX_KEY: Record<string, string> = {
  'customer.name': 'customer_name',
  'customer.first_name': 'first_name',
  'customer.last_name': 'last_name',
  'customer.email': 'email',
  'customer.phone': 'phone_number',
  'customer.visit_count': 'visit_count',
  'customer.purchase_total': 'purchase_total',
  'membership.id': 'membership_id',
  'membership.tier': 'membership_tier',
  'membership.tier_name': 'membership_tier',
  'stamp.count': 'stamp_count',
  'stamp.total': 'stamps_required',
  'stamp.display': 'stamp_display',
  'loyalty.points_balance': 'loyalty_points',
  'cashback.balance': 'cashback_balance',
  'cashback.earned': 'cashback_balance',
  'cashback.percentage': 'cashback_percentage',
  'coupon.discount_amount': 'discount_percentage',
  'coupon.used_count': 'coupon_redemption_count',
  'coupon.remaining_uses': 'remaining_uses',
  'gift.balance': 'gift_balance',
  'program.name': 'program_name',
  'program.card_name': 'card_name',
  'program.reward_description': 'reward_description',
  'program.description': 'description',
  'merchant.name': 'business_name',
  'merchant.company_name': 'company_name',
  'referral.code': 'referral_code',
  'referral.count': 'referral_count',
  'referral.friend_name': 'friend_name',
  'session.count': 'session_count',
  'pass.qr_code': 'qr_code',
  'pass.barcode_data': 'barcode_data',
  'pass.last_message': 'last_message',
  'pass.expiration_date': 'expiration_date',
  'pass.current_date': 'current_date',
  'discount.percentage': 'discount_percentage',
  'discount.tier': 'discount_tier',
  'multipass.remaining_uses': 'multipass_remaining',
  'affiliate.code': 'affiliate_code',
};

function snakeToCamelLeaf(leaf: string): string {
  return leaf.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Resolve pass-schema `{{namespace.leaf}}` tokens AND legacy single-brace
 * `{name}` placeholders against the flat preview context.
 *
 * Designer fields use `{{program.name}}` / `{{stamp.count}}`; older templates
 * use `{program_name}`. Both must render as real preview values, never as raw
 * tokens on the card.
 */
export function resolveLegacyTemplate(
  value: string,
  ctx: Record<string, string | undefined>
): string {
  if (!value || typeof value !== 'string') return value ?? '';

  // 1) Pass-schema tokens: {{namespace.leaf}}
  let out = value.replace(/\{\{\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*\}\}/g, (_m, ns: string, leaf: string) => {
    const mapKey = `${ns}.${leaf}`;
    const flatKey = SCHEMA_TOKEN_TO_CTX_KEY[mapKey]
      ?? SCHEMA_TOKEN_TO_CTX_KEY[`${ns}.${snakeToCamelLeaf(leaf)}`]
      ?? `${ns}_${leaf}`;
    const hit = ctx[flatKey] ?? ctx[`${ns}_${leaf}`] ?? ctx[snakeToCamelLeaf(flatKey)];
    return hit != null && hit !== '' ? String(hit) : '';
  });

  // 2) Legacy single-brace {key}
  out = out.replace(/\{(\w+)\}/g, (_m, key: string) => {
    const hit = ctx[key];
    return hit != null && hit !== '' ? String(hit) : '';
  });

  return out;
}

export function buildContext(
  form: { name: string; description: string; card_type: string },
  cardTypeConfig: CardTypeConfig | undefined,
  customerName: string | undefined,
  t: (key: string) => string
): Record<string, string | undefined> {
  // Default fallback values — synced with backend _resolve_v2_dynamic_value tokens
  const defaults: Record<string, string | undefined> = {
    customer_name: customerName || t('wallet.preview.customer'),
    first_name: customerName?.split(' ')[0] || '',
    last_name: customerName?.split(' ').slice(1).join(' ') || '',
    email: '',
    program_name: form.name || t('wallet.preview.programName'),
    card_name: form.name || '',
    business_name: t('wallet.preview.company'),
    tenant_name: t('wallet.preview.company'),
    merchant_name: t('wallet.preview.company'),
    description: form.description || '',
    stamp_count: '0',
    stamps_required: '10',
    reward_description: t('wallet.preview.reward'),
    cashback_balance: '0.00',
    cashback_percentage: '5',
    membership_tier: t('wallet.studio.vip.defaultName'),
    referral_code: 'REF-XXXX',
    referral_count: '0',
    referrals_made: '0',
    discount_percentage: '5',
    discount_tier: t('wallet.studio.vip.badgeBronze'),
    current_tier: t('wallet.studio.vip.badgeBronze'),
    gift_balance: '0.00',
    balance: '0.00',
    points: '0',
    affiliate_code: 'AFIL-001',
    enrolled_date: '01/01/2025',
    benefits: t('wallet.studio.vip.perks'),
    company_name: t('wallet.preview.company'),
    corporate_discount: '10',
    coupon_usage: '0 / 1',
    coupon_redemption_count: '0',
    coupon_end_date: t('wallet.preview.validUntilDate'),
    coupon_terms: t('wallet.preview.terms'),
    usage_limit: '1',
    referrer_reward: t('wallet.preview.reward'),
    multipass_remaining: '10',
    bundle_remaining: '10',
    bundle_size: '10',
    bundle_price: '25.00',
    stamp_display: '0 / 10',
    perks: t('wallet.studio.vip.perks'),
    expiry_days: '365',
    tiers_list: `${t('wallet.studio.vip.badgeBronze')} 5%, ${t('wallet.studio.vip.badgeSilver')} 10%, ${t('wallet.studio.vip.badgeGold')} 15%`,
    qr_code: '0000 0000 0000',
    account_id: '00000000',
    last_message: '',
    phone_number: '',
    visit_count: '0',
    purchase_total: '',
    membership_id: '00000000',
    loyalty_points: '0',
    remaining_uses: '0',
    session_count: '0',
    friend_name: '',
    expiration_date: '',
    current_date: new Date().toISOString().slice(0, 10),
    barcode_data: '0000 0000 0000',
  };

  if (!cardTypeConfig) return defaults;

  const cfg = cardTypeConfig;
  switch (cfg.cardType) {
    case 'stamp': {
      const stampsReq = cfg.stampsRequired ?? 10;
      const stampsAt = cfg.stampsAtIssue ?? 0;
      return {
        ...defaults,
        stamp_count: String(stampsAt),
        stamps_required: String(stampsReq),
        stamp_display: `${stampsAt} / ${stampsReq}`,
        reward_description: cfg.rewardDescription || defaults.reward_description,
      };
    }
    case 'cashback': {
      const pct = cfg.cashbackPercentage ?? 5;
      const minPurchase = cfg.minimumPurchase ?? 0;
      return {
        ...defaults,
        cashback_percentage: String(pct),
        cashback_balance: `${t('wallet.studio.currency.symbol')}${minPurchase.toFixed(2)}`,
        membership_tier: cfg.tierName || defaults.membership_tier,
      };
    }
    case 'coupon': {
      const val = cfg.discountValue ?? 10;
      const limit = cfg.usageLimitPerCustomer ?? 1;
      return {
        ...defaults,
        discount_percentage: String(val),
        coupon_usage: `0 / ${limit}`,
        coupon_end_date: cfg.couponEndDate || defaults.coupon_end_date,
        coupon_terms: cfg.couponDescription || form.description || defaults.coupon_terms,
        offer_tag: cfg.offerTag || '',
      };
    }
    case 'vip_membership': {
      return {
        ...defaults,
        membership_tier: cfg.membershipName || defaults.membership_tier,
        perks: cfg.perks?.join(', ') || defaults.perks,
        expiry_days: cfg.validityPeriod === 'lifetime' ? t('wallet.preview.lifetime') : String(cfg.validityPeriod === 'annual' ? 365 : 30),
      };
    }
    case 'discount': {
      const firstTier = cfg.tiers?.[0];
      return {
        ...defaults,
        discount_percentage: firstTier ? String(firstTier.discountPercentage) : defaults.discount_percentage,
        discount_tier: firstTier?.tierName || defaults.discount_tier,
        tiers_list: cfg.tiers?.map((t) => `${t.tierName} ${t.discountPercentage}%`).join(', ') || defaults.tiers_list,
      };
    }
    case 'gift_certificate': {
      const firstDenom = cfg.denominations?.[0];
      return {
        ...defaults,
        gift_balance: firstDenom ? `${t('wallet.studio.currency.symbol')}${firstDenom.toFixed(2)}` : defaults.gift_balance,
        expiry_days: String(cfg.expiryDays ?? 365),
        occasion: cfg.occasion ? resolveOccasionLabel(cfg.occasion, t) : '',
      };
    }
    case 'affiliate': {
      return {
        ...defaults,
        affiliate_code: cfg.affiliateCodePattern || defaults.affiliate_code,
        benefits: cfg.benefitsDescription || defaults.benefits,
        referral_banner: cfg.referralBannerText || '',
      };
    }
    case 'corporate_discount': {
      return {
        ...defaults,
        corporate_discount: String(cfg.corporateDiscountPercentage ?? 10),
        company_name: cfg.companyName || defaults.company_name,
      };
    }
    case 'referral_pass': {
      const maxRef = cfg.maxReferralsPerCustomer ?? 5;
      return {
        ...defaults,
        referral_code: cfg.referralCodePattern || defaults.referral_code,
        referrals_made: `0 / ${maxRef}`,
        referrer_reward: cfg.referrerReward || defaults.referrer_reward,
        referee_reward: cfg.refereeReward || '',
      };
    }
    case 'multipass': {
      return {
        ...defaults,
        multipass_remaining: String(cfg.bundleSize ?? 10),
        bundle_size: String(cfg.bundleSize ?? 10),
        bundle_price: cfg.bundlePrice ? `${t('wallet.studio.currency.symbol')}${cfg.bundlePrice.toFixed(2)}` : defaults.bundle_price,
        pass_type_label: cfg.passTypeLabel || '',
      };
    }
    default:
      return defaults;
  }
}
