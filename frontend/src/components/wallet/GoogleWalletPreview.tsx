/**
 * Google Wallet pass preview — Material 3 fidelity.
 *
 * Every visual token comes from `design-system.ts`: type scale (min 11px),
 * palette contrast (no dimmed text), radii, shadow and chrome. Layout keeps
 * Google pass-type behaviour for LoyaltyClass, OfferClass and GiftCardClass.
 */
import React from 'react';
import { Pixel7Frame } from './DeviceFrame';
import { BarcodeSvg } from './BarcodeRenderer';
import { CardTypeIcon, GOOGLE_WALLET_TYPES, CARD_TYPE_LABEL_KEYS } from '@/components/programs/constants';
import { useI18n } from '@/lib/i18n';
import { resolveLegacyTemplate } from '@/components/wallet/apple-wallet-helpers';
import { formatFieldValue } from '@/components/wallet/utils/field-formatting';
import { applyCropStyle, cropToStyle, type ImageCrop } from '@/components/wallet/utils/crop-style';
import type { CardTypeConfig } from '@/components/wallet/types/unified-state';
import {
  getCardPalette,
  CARD_TYPE_SCALE,
  CARD_RADIUS,
  CARD_SHADOW,
  CARD_CHROME,
  CARD_SPACE,
  progressSlots,
  type CardPalette,
} from './design-system';

interface PreviewGoogleFieldItem {
  id: string;
  fieldPath: string;
  label: string;
  displayName: string;
  value: string;
  dataType?: import('@/components/wallet/types/unified-field').FieldDataType;
}

interface PreviewGoogleFieldRow {
  id: string;
  type: 'oneItem' | 'twoItems' | 'threeItems';
  items: PreviewGoogleFieldItem[];
}

interface PreviewGoogleMessage {
  header: string;
  body: string;
}

interface PreviewGoogleIdentity {
  passType?: string;
  programName?: string;
  hexBackgroundColor?: string;
  messages?: PreviewGoogleMessage[];
}

/** Wallet design slice consumed by the Google preview. */
export interface PreviewWalletDesign {
  googleProgramLogoUrl?: string;
  googleHeroImageUrl?: string;
  googleWideLogoUrl?: string;
  googleImageModuleUrl?: string;
  googleBackgroundUrl?: string;
  imageCrops?: {
    logo?: ImageCrop;
    strip?: ImageCrop;
    heroImage?: ImageCrop;
    wideLogo?: ImageCrop;
    imageModule?: ImageCrop;
    background?: ImageCrop;
  };
  googleRows?: PreviewGoogleFieldRow[];
  google?: PreviewGoogleIdentity;
  googleAdvanced?: {
    messages?: PreviewGoogleMessage[];
    [key: string]: unknown;
  };
}

type GooglePassKind = 'LoyaltyClass' | 'OfferClass' | 'GiftCardClass' | 'GenericClass';

function resolvePassKind(cardType: string, override?: string): GooglePassKind {
  const raw = override ?? GOOGLE_WALLET_TYPES[cardType]?.type ?? 'GenericClass';
  if (raw === 'LoyaltyClass' || raw === 'OfferClass' || raw === 'GiftCardClass' || raw === 'GenericClass') {
    return raw;
  }
  return 'GenericClass';
}

function buildContext(
  form: { name: string; description: string; card_type: string },
  cardTypeConfig: CardTypeConfig | undefined,
  customerName: string | undefined,
  t: (key: string) => string
): Record<string, string | undefined> {
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
        tiers_list: cfg.tiers?.map((tier) => `${tier.tierName} ${tier.discountPercentage}%`).join(', ') || defaults.tiers_list,
      };
    }
    case 'gift_certificate': {
      const firstDenom = cfg.denominations?.[0];
      return {
        ...defaults,
        gift_balance: firstDenom ? `${t('wallet.studio.currency.symbol')}${firstDenom.toFixed(2)}` : defaults.gift_balance,
        expiry_days: String(cfg.expiryDays ?? 365),
      };
    }
    case 'affiliate': {
      return {
        ...defaults,
        affiliate_code: cfg.affiliateCodePattern || defaults.affiliate_code,
        benefits: cfg.benefitsDescription || defaults.benefits,
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
      };
    }
    case 'multipass': {
      return {
        ...defaults,
        multipass_remaining: String(cfg.bundleSize ?? 10),
        bundle_size: String(cfg.bundleSize ?? 10),
        bundle_price: cfg.bundlePrice ? `${t('wallet.studio.currency.symbol')}${cfg.bundlePrice.toFixed(2)}` : defaults.bundle_price,
      };
    }
    default:
      return defaults;
  }
}

function getGoogleSampleValue(fieldPath: string, ctx: Record<string, string | undefined>, t: (key: string) => string): string {
  const map: Record<string, string> = {
    'object.accountName': ctx.customer_name || t('wallet.preview.customer'),
    'object.loyaltyPoints.balance': '1,250',
    'object.loyaltyPoints.label': t('wallet.preview.points'),
    'object.secondaryLoyaltyPoints.balance': '500',
    'object.secondaryLoyaltyPoints.label': t('wallet.preview.stars'),
    'class.rewardsTier': t('wallet.studio.vip.badgeGold'),
    'class.rewardsTierLabel': t('wallet.preview.tier'),
    'class.programName': ctx.program_name || t('wallet.preview.programName'),
    'class.issuerName': t('wallet.preview.business'),
    'object.balance.money': `${t('wallet.studio.currency.symbol')}25.00`,
  };
  return map[fieldPath] || ctx[fieldPath.replace(/\./g, '_')] || '—';
}

interface HeroMetric {
  value: string;
  label: string;
}

function resolveHeroMetric(
  cardType: string,
  passKind: GooglePassKind,
  cardTypeConfig: CardTypeConfig | undefined,
  ctx: Record<string, string | undefined>,
  t: (key: string) => string,
): HeroMetric {
  const symbol = t('wallet.studio.currency.symbol');
  switch (cardType) {
    case 'stamp': {
      const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'stamp' }> | undefined;
      const at = cfg?.stampsAtIssue ?? 0;
      const req = cfg?.stampsRequired ?? 10;
      return { value: `${at}/${req}`, label: t('wallet.preview.defaultHeader.stamp') };
    }
    case 'cashback': {
      const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'cashback' }> | undefined;
      const pct = cfg?.cashbackPercentage ?? 5;
      const minPurchase = cfg?.minimumPurchase ?? 0;
      return {
        value: passKind === 'GiftCardClass' ? `${symbol}${minPurchase.toFixed(2)}` : `${pct}%`,
        label: t('wallet.preview.defaultHeader.cashback'),
      };
    }
    case 'coupon': {
      const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'coupon' }> | undefined;
      const val = cfg?.discountValue ?? 10;
      const type = cfg?.discountType ?? 'percentage';
      return {
        value: type === 'percentage' ? `${val}%` : `${symbol}${val.toFixed(2)}`,
        label: t('wallet.preview.offer'),
      };
    }
    case 'discount': {
      const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'discount' }> | undefined;
      const firstTier = cfg?.tiers?.[0];
      return {
        value: firstTier ? `${firstTier.discountPercentage}%` : `${ctx.discount_percentage ?? '5'}%`,
        label: t('wallet.preview.currentDiscount'),
      };
    }
    case 'gift_certificate': {
      const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'gift_certificate' }> | undefined;
      const firstDenom = cfg?.denominations?.[0];
      return {
        value: firstDenom ? `${symbol}${firstDenom.toFixed(2)}` : `${symbol}0.00`,
        label: t('wallet.preview.availableBalance'),
      };
    }
    case 'vip_membership': {
      const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'vip_membership' }> | undefined;
      return {
        value: cfg?.membershipName || t('wallet.studio.vip.defaultName'),
        label: t('wallet.preview.membership'),
      };
    }
    case 'referral_pass': {
      const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'referral_pass' }> | undefined;
      const maxRef = cfg?.maxReferralsPerCustomer ?? 5;
      return { value: `0/${maxRef}`, label: t('wallet.preview.defaultHeader.referral') };
    }
    case 'multipass': {
      const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'multipass' }> | undefined;
      return {
        value: String(cfg?.bundleSize ?? 10),
        label: t('wallet.preview.remainingUses'),
      };
    }
    case 'affiliate': {
      const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'affiliate' }> | undefined;
      return {
        value: cfg?.affiliateCodePattern || 'AFIL-001',
        label: t('wallet.preview.affiliateCode'),
      };
    }
    case 'corporate_discount': {
      const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'corporate_discount' }> | undefined;
      return {
        value: `${cfg?.corporateDiscountPercentage ?? 10}%`,
        label: t('wallet.preview.corporateDiscount'),
      };
    }
    default:
      return {
        value: ctx.balance || `${symbol}0.00`,
        label: t('wallet.preview.availableBalance'),
      };
  }
}

interface ProgressMetric {
  filled: number;
  total: number;
  label: string;
}

function resolveProgressMetric(
  cardType: string,
  passKind: GooglePassKind,
  cardTypeConfig: CardTypeConfig | undefined,
  t: (key: string) => string,
): ProgressMetric | null {
  // Gift cards show balance, not a collection meter.
  if (passKind === 'GiftCardClass' && cardType !== 'multipass') return null;
  switch (cardType) {
    case 'stamp': {
      const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'stamp' }> | undefined;
      return {
        filled: cfg?.stampsAtIssue ?? 0,
        total: cfg?.stampsRequired ?? 10,
        label: t('wallet.preview.stampAccumulated'),
      };
    }
    case 'referral_pass': {
      const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'referral_pass' }> | undefined;
      return {
        filled: 0,
        total: cfg?.maxReferralsPerCustomer ?? 5,
        label: t('wallet.preview.defaultHeader.referral'),
      };
    }
    case 'multipass': {
      const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'multipass' }> | undefined;
      const total = cfg?.bundleSize ?? 10;
      return {
        filled: total,
        total,
        label: t('wallet.preview.remainingUses'),
      };
    }
    case 'coupon': {
      const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'coupon' }> | undefined;
      return {
        filled: 0,
        total: cfg?.usageLimitPerCustomer ?? 1,
        label: t('wallet.preview.uses'),
      };
    }
    default:
      return null;
  }
}

function ProgressSlots({ filled, total, label, palette }: {
  filled: number;
  total: number;
  label: string;
  palette: CardPalette;
}) {
  const slots = progressSlots(filled, total);
  if (slots.length === 0) return null;
  return (
    <div className={CARD_SPACE.sm} data-testid="google-progress">
      <p className={`${CARD_TYPE_SCALE.xs} font-semibold uppercase tracking-wider`} style={{ color: palette.textMuted }}>
        {label}
      </p>
      <div className="flex flex-wrap items-center gap-1.5" role="img" aria-label={`${label}: ${filled} / ${total}`}>
        {slots.map((slot, index) => (
          <svg
            key={`${slot}-${index}`}
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill={slot === 'filled' ? palette.accent : 'none'}
            stroke={slot === 'filled' ? palette.accent : palette.textMuted}
            strokeWidth="1.75"
            aria-hidden
          >
            <path d="M12 2.5l2.74 5.55 6.12.89-4.43 4.32 1.05 6.1L12 16.5l-5.48 2.86 1.05-6.1L3.14 8.94l6.12-.89L12 2.5z" strokeLinejoin="round" />
          </svg>
        ))}
      </div>
    </div>
  );
}

function MessageChips({ messages, palette, label }: {
  messages: PreviewGoogleMessage[];
  palette: CardPalette;
  label: string;
}) {
  if (messages.length === 0) return null;
  return (
    <div className={`flex flex-col ${CARD_SPACE.sm}`} data-testid="google-messages" aria-label={label}>
      {messages.map((message, index) => (
        <div
          key={`${message.header}-${index}`}
          className={`${CARD_RADIUS.chip} px-3 py-2`}
          style={{ background: palette.accentSoft }}
        >
          <p className={`${CARD_TYPE_SCALE.xs} font-semibold uppercase tracking-wide`} style={{ color: palette.accent }}>
            {message.header}
          </p>
          <p className={`${CARD_TYPE_SCALE.sm} leading-snug mt-0.5 line-clamp-2`} style={{ color: palette.text }}>
            {message.body}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * Props for the GoogleWalletCard component.
 */
interface GoogleWalletCardProps {
  /** Program form data */
  form: {
    name: string;
    description: string;
    background_color: string;
    text_color: string;
    central_background?: string;
    card_type: string;
    strip_image_url?: string;
    label_color?: string;
    accent_color?: string;
    barcode_message?: string;
    barcode_alt_text?: string;
  };
  /** Selected card type option */
  selectedType?: { value: string; icon: string };
  /** Logo image URL preview */
  logoPreview?: string | null;
  /** Strip image URL preview */
  stripPreview?: string | null;
  /** Selected barcode type */
  barcodeType: string;
  /** Customer name for the preview */
  customerName?: string;
  /** Wallet design state */
  walletDesign?: PreviewWalletDesign;
  /** Card type configuration */
  cardTypeConfig?: CardTypeConfig;
  /** Render inside a device frame (default true). Set false for a naked card. */
  deviceFrame?: boolean;
  /** Device stage width in px (used when `deviceFrame` is true). */
  deviceWidth?: number;
}

function resolveGoogleSurface(cardType: string, hexBackgroundColor?: string) {
  const palette = getCardPalette(cardType);
  const bg = hexBackgroundColor?.trim();
  const surfaceStyle: React.CSSProperties = bg
    ? { background: bg }
    : { background: palette.base, backgroundImage: palette.gradient };
  return { palette, surfaceStyle };
}

/**
 * @description Google Wallet card preview with hero band, hero value and barcode.
 * @param {GoogleWalletCardProps} props - Component props
 * @returns JSX.Element
 */
export function GoogleWalletCard({
  form, selectedType, logoPreview, stripPreview, barcodeType, customerName, walletDesign, cardTypeConfig, deviceFrame = true, deviceWidth,
}: GoogleWalletCardProps) {
  const { t } = useI18n();
  const hexBackgroundColor = walletDesign?.google?.hexBackgroundColor || form.background_color || undefined;
  const { palette, surfaceStyle } = resolveGoogleSurface(form.card_type, hexBackgroundColor);
  const heroImage = walletDesign?.googleHeroImageUrl || stripPreview || form.strip_image_url;
  const logoImage = walletDesign?.googleProgramLogoUrl || logoPreview;
  const backgroundImage = walletDesign?.googleBackgroundUrl;
  const wideLogoImage = walletDesign?.googleWideLogoUrl;
  const imageModuleImage = walletDesign?.googleImageModuleUrl;
  const crops = walletDesign?.imageCrops;
  const ctx = buildContext(form, cardTypeConfig, customerName, t);
  const passKind = resolvePassKind(form.card_type, walletDesign?.google?.passType);
  const programName = walletDesign?.google?.programName || form.name || t('wallet.preview.programName');
  const messages = walletDesign?.google?.messages ?? walletDesign?.googleAdvanced?.messages ?? [];
  const hero = resolveHeroMetric(form.card_type, passKind, cardTypeConfig, ctx, t);
  const progress = resolveProgressMetric(form.card_type, passKind, cardTypeConfig, t);

  const googleRows = walletDesign?.googleRows;
  const hasCustomRows = Boolean(googleRows && googleRows.length > 0);

  function buildDefaultRows(cardType: string, config: CardTypeConfig | undefined): Array<{ label: string; value: string }> {
    const rows: Array<{ label: string; value: string }> = [
      { label: t('wallet.preview.member'), value: customerName || t('wallet.preview.customer') },
    ];
    switch (cardType) {
      case 'stamp': {
        const stampsAt = (config as Extract<CardTypeConfig, { cardType: 'stamp' }>)?.stampsAtIssue ?? 0;
        const stampsReq = (config as Extract<CardTypeConfig, { cardType: 'stamp' }>)?.stampsRequired ?? 10;
        rows.push({ label: t('wallet.preview.defaultHeader.stamp'), value: `${stampsAt} / ${stampsReq}` });
        break;
      }
      case 'cashback': {
        const pct = (config as Extract<CardTypeConfig, { cardType: 'cashback' }>)?.cashbackPercentage ?? 5;
        const minPurchase = (config as Extract<CardTypeConfig, { cardType: 'cashback' }>)?.minimumPurchase ?? 0;
        rows.push(
          { label: t('wallet.preview.defaultHeader.cashback'), value: `${t('wallet.studio.currency.symbol')}${minPurchase.toFixed(2)}` },
          { label: t('wallet.studio.cashback.percentage'), value: `${pct}%` },
        );
        break;
      }
      case 'coupon': {
        const val = (config as Extract<CardTypeConfig, { cardType: 'coupon' }>)?.discountValue ?? 10;
        const type = (config as Extract<CardTypeConfig, { cardType: 'coupon' }>)?.discountType ?? 'percentage';
        const displayVal = type === 'percentage'
          ? `${val}% ${t('wallet.studio.coupon.off')}`
          : `${t('wallet.studio.currency.symbol')}${val.toFixed(2)} ${t('wallet.studio.coupon.off')}`;
        rows.push(
          { label: t('wallet.preview.business'), value: ctx.program_name || t('wallet.preview.business') },
          { label: t('wallet.preview.offer'), value: displayVal },
          { label: t('wallet.preview.uses'), value: `0 / ${(config as Extract<CardTypeConfig, { cardType: 'coupon' }>)?.usageLimitPerCustomer ?? 1}` },
          { label: t('wallet.preview.validUntil'), value: t('wallet.preview.validUntilDate') },
          { label: t('wallet.preview.terms'), value: form.description || t('wallet.preview.terms') },
        );
        break;
      }
      case 'vip_membership': {
        const name = (config as Extract<CardTypeConfig, { cardType: 'vip_membership' }>)?.membershipName;
        rows.push({ label: t('wallet.preview.membership'), value: name || t('wallet.studio.vip.defaultName') });
        break;
      }
      case 'referral_pass': {
        const maxRef = (config as Extract<CardTypeConfig, { cardType: 'referral_pass' }>)?.maxReferralsPerCustomer ?? 5;
        const pattern = (config as Extract<CardTypeConfig, { cardType: 'referral_pass' }>)?.referralCodePattern;
        rows.push(
          { label: t('wallet.preview.business'), value: ctx.program_name || t('wallet.preview.business') },
          { label: t('wallet.preview.offer'), value: form.name || t('wallet.preview.offer') },
          { label: t('wallet.preview.defaultHeader.referral'), value: `0 / ${maxRef}` },
          { label: t('wallet.studio.affiliate.codePattern'), value: pattern || 'REF-XXXX' },
          { label: t('wallet.preview.reward'), value: (config as Extract<CardTypeConfig, { cardType: 'referral_pass' }>)?.referrerReward || t('wallet.preview.reward') },
        );
        break;
      }
      case 'discount': {
        const firstTier = (config as Extract<CardTypeConfig, { cardType: 'discount' }>)?.tiers?.[0];
        rows.push(
          { label: t('wallet.preview.business'), value: ctx.program_name || t('wallet.preview.business') },
          { label: t('wallet.preview.offer'), value: form.name || t('wallet.preview.offer') },
          { label: t('wallet.preview.tier'), value: firstTier?.tierName || t('wallet.studio.vip.badgeBronze') },
          { label: t('wallet.preview.currentDiscount'), value: firstTier ? `${firstTier.discountPercentage}%` : '5%' },
        );
        break;
      }
      case 'gift_certificate': {
        const firstDenom = (config as Extract<CardTypeConfig, { cardType: 'gift_certificate' }>)?.denominations?.[0];
        rows.push({
          label: t('wallet.preview.defaultHeader.gift'),
          value: firstDenom ? `${t('wallet.studio.currency.symbol')}${firstDenom.toFixed(2)}` : `${t('wallet.studio.currency.symbol')}0.00`,
        });
        break;
      }
      case 'affiliate': {
        rows.push({ label: t('wallet.preview.affiliateProgram'), value: form.name || t('programs.cardTypes.affiliate') });
        break;
      }
      case 'corporate_discount': {
        const pct = (config as Extract<CardTypeConfig, { cardType: 'corporate_discount' }>)?.corporateDiscountPercentage ?? 10;
        rows.push(
          { label: t('wallet.preview.business'), value: ctx.program_name || t('wallet.preview.business') },
          { label: t('wallet.preview.offer'), value: form.name || t('wallet.preview.offer') },
          { label: t('wallet.preview.corporateDiscount'), value: `${pct}%` },
          { label: t('wallet.preview.company'), value: (config as Extract<CardTypeConfig, { cardType: 'corporate_discount' }>)?.companyName || t('wallet.preview.company') },
        );
        break;
      }
      case 'multipass': {
        const size = (config as Extract<CardTypeConfig, { cardType: 'multipass' }>)?.bundleSize ?? 10;
        rows.push({ label: t('wallet.preview.remainingUses'), value: String(size) });
        break;
      }
    }
    rows.push({
      label: t('wallet.preview.passType'),
      value: t(GOOGLE_WALLET_TYPES[form.card_type]?.labelKey ?? 'wallet.preview.loyaltyProgram'),
    });
    return rows;
  }

  const defaultRows = buildDefaultRows(form.card_type, cardTypeConfig);

  return (
    <Pixel7Frame chrome={deviceFrame} width={deviceWidth}>
      <div
        className={`${CARD_RADIUS.google} overflow-hidden flex flex-col ${CARD_SHADOW.card} h-full relative`}
        style={surfaceStyle}
        data-testid="google-wallet-card"
      >
        {backgroundImage && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }} aria-hidden>
            <img
              src={backgroundImage}
              alt=""
              className="w-full h-full object-cover"
              style={applyCropStyle({ crop: crops?.background })}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}

        <div className={`relative z-10 flex flex-col h-full min-h-0 ${CARD_SPACE.sm} p-4`}>
          {/* Hero band */}
          <div className="relative w-full shrink-0 overflow-hidden rounded-2xl" data-testid="google-hero-image">
            <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1032/336' }}>
              {heroImage ? (
                <img
                  src={heroImage}
                  alt={t('wallet.studio.images.hero')}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={cropToStyle(crops?.heroImage ?? crops?.strip)}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="absolute inset-0" style={{ background: palette.gradient }} />
              )}
              <div className={`absolute inset-0 ${CARD_CHROME.gloss}`} aria-hidden />
            </div>

            {/* Logo plate overlapping the hero */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-6 z-10">
              <div
                className={`w-14 h-14 rounded-full overflow-hidden ${CARD_CHROME.logoRing} shadow-lg flex items-center justify-center`}
                style={{ background: palette.glass }}
              >
                {logoImage ? (
                  <img
                    src={logoImage}
                    alt={t('wallet.studio.images.logo')}
                    className="w-full h-full object-cover"
                    style={cropToStyle(crops?.logo)}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <CardTypeIcon icon={selectedType?.icon || 'stamp'} className="w-7 h-7" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Program header */}
          <div className="text-center shrink-0 pt-8">
            <p className={`${CARD_TYPE_SCALE.lg} font-bold leading-tight line-clamp-2`} style={{ color: palette.text }}>
              {programName}
            </p>
            <p className={`${CARD_TYPE_SCALE.xs} font-semibold uppercase tracking-wider mt-1`} style={{ color: palette.textMuted }}>
              {t(CARD_TYPE_LABEL_KEYS[selectedType?.value ?? form.card_type]?.labelKey ?? 'wallet.preview.loyaltyProgram')}
            </p>
          </div>

          {/* Hero value */}
          <div className="text-center shrink-0" data-testid="google-hero-value">
            <p className={`${CARD_TYPE_SCALE.xl} font-extrabold leading-none`} style={{ color: palette.text }}>
              {hero.value}
            </p>
            <p className={`${CARD_TYPE_SCALE.xs} font-semibold uppercase tracking-wider mt-1.5`} style={{ color: palette.accent }}>
              {hero.label}
            </p>
          </div>

          {/* Progress meter */}
          {progress && (
            <ProgressSlots
              filled={progress.filled}
              total={progress.total}
              label={progress.label}
              palette={palette}
            />
          )}

          {/* Message chips (Google Wallet `addMessage` / pass messages) */}
          <MessageChips messages={messages} palette={palette} label={t('wallet.preview.messages')} />

          {/* Wide logo */}
          {wideLogoImage && (
            <div className="shrink-0">
              <div className={`w-full h-10 ${CARD_RADIUS.chip} overflow-hidden border border-white/15`}>
                <img
                  src={wideLogoImage}
                  alt={t('wallet.studio.images.wideLogo')}
                  className="w-full h-full object-contain"
                  style={cropToStyle(crops?.wideLogo)}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            </div>
          )}

          {/* Info fields — 2-column Material grid */}
          <div
            className="shrink-0"
            data-testid="google-fields"
            style={form.central_background
              ? { background: form.central_background, borderRadius: 12, padding: '8px 10px' }
              : undefined}
          >
            {hasCustomRows ? (
              <div className={CARD_SPACE.sm}>
                {googleRows!.map((row, rIdx) => (
                  <div key={row.id}>
                    <div
                      className={`grid ${CARD_SPACE.sm} py-1`}
                      style={{ gridTemplateColumns: `repeat(${row.type === 'oneItem' ? 1 : row.type === 'twoItems' ? 2 : 3}, minmax(0, 1fr))` }}
                    >
                      {row.items.map((item) => (
                        <div key={item.id} className="min-w-0">
                          <p className={`${CARD_TYPE_SCALE.xs} font-semibold uppercase tracking-wider leading-none`} style={{ color: palette.textMuted }}>
                            {item.displayName || item.label || t('wallet.studio.fields.label')}
                          </p>
                          <p className={`${CARD_TYPE_SCALE.sm} font-semibold leading-snug mt-1 line-clamp-2`} style={{ color: palette.text }}>
                            {item.value
                              ? formatFieldValue(resolveLegacyTemplate(item.value, ctx), item.dataType ?? 'text')
                              : getGoogleSampleValue(item.fieldPath, ctx, t)}
                          </p>
                        </div>
                      ))}
                    </div>
                    {rIdx < googleRows!.length - 1 && <div className="h-px bg-white/15" />}
                  </div>
                ))}
              </div>
            ) : (
              <div className={`grid grid-cols-2 ${CARD_SPACE.sm}`}>
                {defaultRows.map((row, i) => (
                  <div key={`${row.label}-${i}`} className="min-w-0">
                    <p className={`${CARD_TYPE_SCALE.xs} font-semibold uppercase tracking-wider leading-none`} style={{ color: palette.textMuted }}>
                      {row.label}
                    </p>
                    <p className={`${CARD_TYPE_SCALE.sm} font-semibold leading-snug mt-1 line-clamp-2`} style={{ color: palette.text }}>
                      {row.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {form.description && (
              <p className={`${CARD_TYPE_SCALE.sm} leading-snug mt-2 line-clamp-2`} style={{ color: palette.textMuted }}>
                {form.description}
              </p>
            )}
          </div>

          {/* Image module */}
          {imageModuleImage && (
            <div className="shrink-0">
              <div className={`w-full ${CARD_RADIUS.plate} overflow-hidden border border-white/15`}>
                <img
                  src={imageModuleImage}
                  alt={t('wallet.studio.images.imageModule')}
                  className="w-full h-auto object-cover"
                  style={cropToStyle(crops?.imageModule)}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0" />

          {/* Barcode */}
          <div className="shrink-0" data-testid="google-barcode">
            <div className={`${CARD_CHROME.barcodePlate} flex flex-col items-center gap-1`}>
              <BarcodeSvg
                type={barcodeType}
                size={barcodeType === 'code_128' || barcodeType === 'pdf417' ? 68 : 38}
                message={form.barcode_message}
              />
              <span className={`${CARD_TYPE_SCALE.xs} font-mono tracking-wider text-zinc-700`}>
                {form.barcode_alt_text || form.barcode_message || '0000 0000 0000'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Pixel7Frame>
  );
}

/* ── Google Wallet Back / Details View ─────────────────────────────── */

interface GoogleWalletBackCardProps {
  form: {
    name: string;
    description: string;
    background_color: string;
    text_color: string;
    card_type: string;
  };
  logoPreview?: string | null;
  walletDesign?: PreviewWalletDesign;
  cardTypeConfig?: CardTypeConfig;
  backFields?: Array<{ label: string; value: string }>;
  backLinks?: Array<{ type: string; url: string; label: string }>;
  deviceWidth?: number;
}

export function GoogleWalletBackCard({
  form, logoPreview, walletDesign, backFields, backLinks, deviceWidth,
}: GoogleWalletBackCardProps) {
  const { t } = useI18n();
  const hexBackgroundColor = walletDesign?.google?.hexBackgroundColor || form.background_color || undefined;
  const { palette, surfaceStyle } = resolveGoogleSurface(form.card_type, hexBackgroundColor);
  const logoImage = walletDesign?.googleProgramLogoUrl || logoPreview;

  return (
    <Pixel7Frame width={deviceWidth}>
      <div
        className={`${CARD_RADIUS.google} overflow-hidden flex flex-col ${CARD_SHADOW.card} h-full`}
        style={surfaceStyle}
        data-testid="google-wallet-back-card"
      >
        {/* Header bar */}
        <div className={`px-4 py-3 flex items-center gap-2 shrink-0 border-b border-white/15 ${CARD_CHROME.headerGlass}`}>
          <svg className="w-4 h-4" style={{ color: palette.textMuted }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span className={`${CARD_TYPE_SCALE.md} font-semibold`} style={{ color: palette.text }}>
            {t('wallet.preview.details')}
          </span>
        </div>

        {/* Logo + name */}
        <div className="px-4 py-3 flex items-center gap-3 shrink-0 border-b border-white/15">
          <div
            className={`w-12 h-12 ${CARD_RADIUS.chip} overflow-hidden ${CARD_CHROME.logoRing} flex-shrink-0 flex items-center justify-center`}
            style={{ background: palette.glass }}
          >
            {logoImage ? (
              <img
                src={logoImage}
                alt={t('wallet.studio.images.logo')}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <span className={`${CARD_TYPE_SCALE.md} font-bold`} style={{ color: palette.text }}>
                {form.name?.charAt(0) || 'L'}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className={`${CARD_TYPE_SCALE.md} font-bold leading-tight line-clamp-2`} style={{ color: palette.text }}>
              {form.name || t('wallet.preview.programName')}
            </p>
            <p className={`${CARD_TYPE_SCALE.xs} font-semibold uppercase tracking-wider mt-0.5`} style={{ color: palette.textMuted }}>
              {t('wallet.preview.loyaltyProgram')}
            </p>
          </div>
        </div>

        {/* Details content */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {backFields && backFields.length > 0 ? (
            <div className="space-y-4">
              {backFields.map((field, i) => (
                <div key={`${field.label}-${i}`}>
                  <div className="h-px bg-white/15 mb-3" />
                  <p className={`${CARD_TYPE_SCALE.xs} font-bold uppercase tracking-wider mb-1`} style={{ color: palette.textMuted }}>
                    {field.label}
                  </p>
                  <p className={`${CARD_TYPE_SCALE.sm} leading-relaxed whitespace-pre-wrap break-words`} style={{ color: palette.text }}>
                    {field.value}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center">
              <p className={`${CARD_TYPE_SCALE.sm}`} style={{ color: palette.textMuted }}>
                {t('wallet.preview.noBackFields')}
              </p>
            </div>
          )}

          {backLinks && backLinks.length > 0 && (
            <>
              <div className="h-px bg-white/15 my-4" />
              <p className={`${CARD_TYPE_SCALE.xs} font-bold uppercase tracking-wider mb-2`} style={{ color: palette.textMuted }}>
                {t('wallet.preview.links')}
              </p>
              <div className={CARD_SPACE.sm}>
                {backLinks.map((link, i) => (
                  <a
                    key={`${link.url}-${i}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 px-3 py-2 ${CARD_RADIUS.chip} border border-white/15 ${CARD_TYPE_SCALE.sm}`}
                    style={{ background: palette.accentSoft, color: palette.text }}
                  >
                    <span style={{ color: palette.accent }}>{getLinkIcon(link.type)}</span>
                    <span className="line-clamp-2">{link.label || link.url}</span>
                  </a>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Gesture nav pill */}
        <div className="flex justify-center pb-3 pt-1 shrink-0">
          <div className="w-28 h-[3px] bg-white rounded-full" />
        </div>
      </div>
    </Pixel7Frame>
  );
}

function getLinkIcon(type: string): React.ReactNode {
  const cls = 'w-3.5 h-3.5';
  switch (type) {
    case 'website':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>;
    case 'phone':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>;
    case 'email':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>;
    case 'instagram':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>;
    case 'facebook':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>;
    default:
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>;
  }
}
