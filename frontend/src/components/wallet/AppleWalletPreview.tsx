import { IPhone15ProFrame } from './DeviceFrame';
import { BarcodeSvg } from './BarcodeRenderer';
import { CardTypeIcon, APPLE_PASS_STYLES } from '@/components/programs/constants';
import { useI18n } from '@/lib/i18n';
import { formatFieldValue } from '@/components/wallet/utils/field-formatting';
import type { CardTypeConfig } from '@/components/wallet/types/unified-state';
import {
  StampGridDecoration,
  CashbackDecoration,
  CouponDecoration,
  VIPMembershipDecoration,
  GiftCertificateDecoration,
  ReferralPassDecoration,
  DiscountDecoration,
  AffiliateDecoration,
  CorporateDiscountDecoration,
  MultipassDecoration,
} from '@/components/wallet/preview-decorations';

interface PreviewAppleField {
  key: string;
  label: string;
  value: string;
  dataType?: import('@/components/wallet/types/unified-field').FieldDataType;
  changeMessage?: string;
  textAlignment?: 'PKTextAlignmentLeft' | 'PKTextAlignmentCenter' | 'PKTextAlignmentRight' | 'PKTextAlignmentNatural';
  attributedValue?: string;
}

interface PreviewWalletDesign {
  appleLogoUrl?: string;
  appleLogo2xUrl?: string;
  appleStripUrl?: string;
  appleStrip2xUrl?: string;
  appleThumbnailUrl?: string;
  appleThumbnail2xUrl?: string;
  appleIconUrl?: string;
  appleIcon2xUrl?: string;
  appleBackgroundUrl?: string;
  appleFields?: {
    headerFields?: PreviewAppleField[];
    primaryFields?: PreviewAppleField[];
    secondaryFields?: PreviewAppleField[];
    auxiliaryFields?: PreviewAppleField[];
    backFields?: PreviewAppleField[];
  };
}

export function resolveTemplate(value: string, ctx: Record<string, string | undefined>): string {
  return value.replace(/\{(\w+)\}/g, (_, key) => ctx[key] ?? `{${key}}`);
}

function buildContext(
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
        occasion: cfg.occasion || '',
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

/**
 * Props for the AppleWalletCard component.
 */
interface AppleWalletCardProps {
  /** Program form data */
  form: {
    name: string;
    description: string;
    background_color: string;
    text_color: string;
    card_type: string;
    strip_image_url?: string;
    discount_percentage?: string;
  };
  /** Selected card type option */
  selectedType?: { value: string; label: string; icon: string; desc: string };
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
}

/**
 * @description Apple Wallet pass preview with dynamic fields and barcode.
 * @param {AppleWalletCardProps} props - Component props
 * @returns JSX.Element
 */
export function AppleWalletCard({
  form, selectedType, logoPreview, stripPreview, barcodeType, customerName, walletDesign, cardTypeConfig,
}: AppleWalletCardProps) {
  const { t } = useI18n();
  const bgColor = form.background_color || '#1a1a2e';
  const textColor = form.text_color || '#ffffff';
  const passStyle = APPLE_PASS_STYLES[form.card_type] || 'generic';
  const heroImage = walletDesign?.appleStripUrl || walletDesign?.appleStrip2xUrl || stripPreview || form.strip_image_url;
  const hasStrip = heroImage && (passStyle === 'storeCard' || passStyle === 'coupon');
  const isCoupon = passStyle === 'coupon';
  const isGeneric = passStyle === 'generic';
  const backgroundImage = walletDesign?.appleBackgroundUrl;
  const ctx = buildContext(form, cardTypeConfig, customerName, t);

  const appleFields = walletDesign?.appleFields;
  const headerFields = appleFields?.headerFields?.length ? appleFields.headerFields : undefined;
  const primaryFields = appleFields?.primaryFields?.length ? appleFields.primaryFields : undefined;
  const secondaryFields = appleFields?.secondaryFields?.length ? appleFields.secondaryFields : undefined;
  const auxiliaryFields = appleFields?.auxiliaryFields?.length ? appleFields.auxiliaryFields : undefined;
  const backFields = appleFields?.backFields?.length ? appleFields.backFields : undefined;

  // Build default primary field based on cardTypeConfig
  function buildDefaultPrimary(cardType: string, config: CardTypeConfig | undefined): { label: string; value: string } {
    switch (cardType) {
      case 'stamp': {
        const stampsReq = (config as Extract<CardTypeConfig, { cardType: 'stamp' }>)?.stampsRequired ?? 10;
        const stampsAt = (config as Extract<CardTypeConfig, { cardType: 'stamp' }>)?.stampsAtIssue ?? 0;
        return { label: t('wallet.preview.stampAccumulated'), value: `${stampsAt} / ${stampsReq}` };
      }
      case 'cashback': {
        const minPurchase = (config as Extract<CardTypeConfig, { cardType: 'cashback' }>)?.minimumPurchase ?? 0;
        return { label: t('wallet.preview.availableBalance'), value: `${t('wallet.studio.currency.symbol')}${minPurchase.toFixed(2)}` };
      }
      case 'coupon': {
        const val = (config as Extract<CardTypeConfig, { cardType: 'coupon' }>)?.discountValue ?? 10;
        const type = (config as Extract<CardTypeConfig, { cardType: 'coupon' }>)?.discountType ?? 'percentage';
        const displayVal = type === 'percentage' ? `${val}% ${t('wallet.studio.coupon.off')}` : `${t('wallet.studio.currency.symbol')}${val.toFixed(2)} ${t('wallet.studio.coupon.off')}`;
        return { label: form.description || t('wallet.preview.specialDiscount'), value: displayVal };
      }
      case 'vip_membership': {
        const name = (config as Extract<CardTypeConfig, { cardType: 'vip_membership' }>)?.membershipName;
        return { label: t('wallet.preview.membership'), value: name || t('wallet.studio.vip.defaultName') };
      }
      case 'referral_pass': {
        const pattern = (config as Extract<CardTypeConfig, { cardType: 'referral_pass' }>)?.referralCodePattern;
        return { label: t('wallet.preview.referralCode'), value: pattern || 'REF-XXXX' };
      }
      case 'discount': {
        const firstTier = (config as Extract<CardTypeConfig, { cardType: 'discount' }>)?.tiers?.[0];
        return { label: t('wallet.preview.currentDiscount'), value: firstTier ? `${firstTier.discountPercentage}%` : '5%' };
      }
      case 'gift_certificate': {
        const firstDenom = (config as Extract<CardTypeConfig, { cardType: 'gift_certificate' }>)?.denominations?.[0];
        return { label: t('wallet.preview.giftBalance'), value: firstDenom ? `${t('wallet.studio.currency.symbol')}${firstDenom.toFixed(2)}` : `${t('wallet.studio.currency.symbol')}0.00` };
      }
      case 'affiliate': {
        return { label: t('wallet.preview.affiliateProgram'), value: form.name || t('programs.cardTypes.affiliate') };
      }
      case 'corporate_discount': {
        const pct = (config as Extract<CardTypeConfig, { cardType: 'corporate_discount' }>)?.corporateDiscountPercentage ?? 10;
        return { label: t('wallet.preview.corporateDiscount'), value: `${pct}%` };
      }
      case 'multipass': {
        const size = (config as Extract<CardTypeConfig, { cardType: 'multipass' }>)?.bundleSize ?? 10;
        return { label: t('wallet.preview.remainingUses'), value: String(size) };
      }
      default:
        return { label: '', value: '—' };
    }
  }

  const defaultPrimary = buildDefaultPrimary(form.card_type, cardTypeConfig);

  const defaultAux: Array<{ label: string; value: string }> = [
    { label: t('wallet.preview.customer'), value: customerName || t('wallet.preview.customer') },
    { label: t('wallet.preview.validUntil'), value: t('wallet.preview.validUntilDate') },
  ];

  function buildDefaultHeaderValue(cardType: string, config: CardTypeConfig | undefined): string {
    switch (cardType) {
      case 'stamp': {
        const stampsAt = (config as Extract<CardTypeConfig, { cardType: 'stamp' }>)?.stampsAtIssue ?? 0;
        const stampsReq = (config as Extract<CardTypeConfig, { cardType: 'stamp' }>)?.stampsRequired ?? 10;
        return `${stampsAt}/${stampsReq}`;
      }
      case 'cashback': {
        const minPurchase = (config as Extract<CardTypeConfig, { cardType: 'cashback' }>)?.minimumPurchase ?? 0;
        return `${t('wallet.studio.currency.symbol')}${minPurchase.toFixed(2)}`;
      }
      case 'coupon': {
        const val = (config as Extract<CardTypeConfig, { cardType: 'coupon' }>)?.discountValue ?? 10;
        const type = (config as Extract<CardTypeConfig, { cardType: 'coupon' }>)?.discountType ?? 'percentage';
        return type === 'percentage' ? `${val}%` : `${t('wallet.studio.currency.symbol')}${val}`;
      }
      case 'vip_membership':
        return t('wallet.preview.vip');
      case 'referral_pass': {
        const maxRef = (config as Extract<CardTypeConfig, { cardType: 'referral_pass' }>)?.maxReferralsPerCustomer ?? 5;
        return `0 / ${maxRef}`;
      }
      case 'discount': {
        const firstTier = (config as Extract<CardTypeConfig, { cardType: 'discount' }>)?.tiers?.[0];
        return firstTier?.tierName || t('wallet.studio.vip.badgeBronze');
      }
      case 'gift_certificate': {
        const firstDenom = (config as Extract<CardTypeConfig, { cardType: 'gift_certificate' }>)?.denominations?.[0];
        return firstDenom ? `${t('wallet.studio.currency.symbol')}${firstDenom.toFixed(2)}` : `${t('wallet.studio.currency.symbol')}0`;
      }
      case 'affiliate':
        return form.name?.slice(0, 6) || '—';
      case 'corporate_discount': {
        const pct = (config as Extract<CardTypeConfig, { cardType: 'corporate_discount' }>)?.corporateDiscountPercentage ?? 10;
        return `${pct}%`;
      }
      case 'multipass': {
        const size = (config as Extract<CardTypeConfig, { cardType: 'multipass' }>)?.bundleSize ?? 10;
        return `${size}/${size}`;
      }
      default:
        return '';
    }
  }

  const defaultHeaderValue: Record<string, string> = {
    stamp: buildDefaultHeaderValue('stamp', cardTypeConfig),
    cashback: buildDefaultHeaderValue('cashback', cardTypeConfig),
    coupon: buildDefaultHeaderValue('coupon', cardTypeConfig),
    vip_membership: buildDefaultHeaderValue('vip_membership', cardTypeConfig),
    referral_pass: buildDefaultHeaderValue('referral_pass', cardTypeConfig),
    discount: buildDefaultHeaderValue('discount', cardTypeConfig),
    gift_certificate: buildDefaultHeaderValue('gift_certificate', cardTypeConfig),
    affiliate: buildDefaultHeaderValue('affiliate', cardTypeConfig),
    corporate_discount: buildDefaultHeaderValue('corporate_discount', cardTypeConfig),
    multipass: buildDefaultHeaderValue('multipass', cardTypeConfig),
  };

  const defaultHeaderLabel: Record<string, string> = {
    stamp: t('wallet.preview.defaultHeader.stamp'),
    cashback: t('wallet.preview.defaultHeader.cashback'),
    coupon: t('wallet.preview.defaultHeader.coupon'),
    vip_membership: t('wallet.preview.defaultHeader.vip'),
    referral_pass: t('wallet.preview.defaultHeader.referral'),
    discount: t('wallet.preview.defaultHeader.discount'),
    gift_certificate: t('wallet.preview.defaultHeader.gift'),
    affiliate: t('wallet.preview.defaultHeader.affiliate'),
    corporate_discount: t('wallet.preview.defaultHeader.corporate'),
    multipass: t('wallet.preview.defaultHeader.multipass'),
  };

  const auxItems: Array<{ label: string; value: string }> = auxiliaryFields || defaultAux;

  function renderDecoration() {
    switch (form.card_type) {
      case 'stamp': {
        const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'stamp' }>;
        return <StampGridDecoration current={cfg?.stampsAtIssue ?? 0} total={cfg?.stampsRequired ?? 10} color={textColor} stampShape={cfg?.stampShape} stampColor={cfg?.stampColor} stampIcon={cfg?.stampIcon} stampFilledIcon={cfg?.stampFilledIcon} stampGridLayout={cfg?.stampGridLayout} />;
      }
      case 'cashback': {
        const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'cashback' }>;
        return <CashbackDecoration percentage={cfg?.cashbackPercentage ?? 5} tierName={cfg?.tierName || t('wallet.studio.vip.defaultName')} color={textColor} coinIcon={cfg?.coinIcon} tierBadge={cfg?.tierBadge} progressRingColor={cfg?.progressRingColor} />;
      }
      case 'coupon': {
        const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'coupon' }>;
        return <CouponDecoration discount={cfg?.discountValue ?? 10} discountType={cfg?.discountType ?? 'percentage'} validUntil={cfg?.couponEndDate || t('wallet.preview.validUntilDate')} color={textColor} cutLineStyle={cfg?.cutLineStyle} discountBadgeStyle={cfg?.discountBadgeStyle} offerTag={cfg?.offerTag} />;
      }
      case 'vip_membership': {
        const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'vip_membership' }>;
        return <VIPMembershipDecoration tierName={cfg?.membershipName || t('wallet.studio.vip.defaultName')} perks={cfg?.perks || []} color={textColor} crownIcon={cfg?.crownIcon} memberBadgeStyle={cfg?.memberBadgeStyle} />;
      }
      case 'gift_certificate': {
        const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'gift_certificate' }>;
        const firstDenom = cfg?.denominations?.[0];
        const balance = firstDenom ? `${t('wallet.studio.currency.symbol')}${firstDenom.toFixed(2)}` : `${t('wallet.studio.currency.symbol')}0.00`;
        return <GiftCertificateDecoration balance={balance} color={textColor} boxGraphic={cfg?.boxGraphic} ribbonColor={cfg?.ribbonColor} denominationBadge={cfg?.denominationBadge} />;
      }
      case 'referral_pass': {
        const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'referral_pass' }>;
        return <ReferralPassDecoration code={cfg?.referralCodePattern || 'REF-XXXX'} referralsMade={0} maxReferrals={cfg?.maxReferralsPerCustomer ?? 5} color={textColor} referralIcon={cfg?.referralIcon} shareButtonColor={cfg?.shareButtonColor} rewardBadgeIcon={cfg?.rewardBadgeIcon} />;
      }
      case 'discount': {
        const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'discount' }>;
        return <DiscountDecoration tiers={cfg?.tiers || []} color={textColor} tierBadgeIcons={cfg?.tierBadgeIcons} progressBarColor={cfg?.progressBarColor} discountBannerText={cfg?.discountBannerText} />;
      }
      case 'affiliate': {
        const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'affiliate' }>;
        return <AffiliateDecoration code={cfg?.affiliateCodePattern || 'AFIL-001'} color={textColor} referralChainIcon={cfg?.referralChainIcon} badgeColor={cfg?.badgeColor} referralBannerText={cfg?.referralBannerText} />;
      }
      case 'corporate_discount': {
        const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'corporate_discount' }>;
        return <CorporateDiscountDecoration companyName={cfg?.companyName || t('wallet.preview.company')} discountPercentage={cfg?.corporateDiscountPercentage ?? 10} color={textColor} companyLogoUrl={cfg?.companyLogoUrl} buildingIcon={cfg?.buildingIcon} badgeStyle={cfg?.badgeStyle} idBadgeColor={cfg?.idBadgeColor} securitySeal={cfg?.securitySeal} />;
      }
      case 'multipass': {
        const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'multipass' }>;
        return <MultipassDecoration remaining={cfg?.bundleSize ?? 10} total={cfg?.bundleSize ?? 10} color={textColor} ticketGraphic={cfg?.ticketGraphic} punchIcon={cfg?.punchIcon} bundleBadgeStyle={cfg?.bundleBadgeStyle} indicatorStyle={cfg?.indicatorStyle} />;
      }
      default:
        return null;
    }
  }

  return (
    <IPhone15ProFrame>
      <div
        className="rounded-2xl overflow-hidden flex flex-col shadow-lg h-full"
        style={{
          background: backgroundImage ? `${bgColor} url(${backgroundImage}) center/cover no-repeat` : bgColor,
          color: textColor,
          boxShadow: '0 10px 30px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.25)',
        }}
        data-testid="apple-wallet-card"
      >
        {/* Perforated edge for coupon */}
        {isCoupon && (
          <div
            className="absolute top-2 left-3 right-3 h-0.5 z-20"
            style={{ background: `repeating-linear-gradient(90deg, ${textColor}30 0px, ${textColor}30 5px, transparent 5px, transparent 9px)` }}
          />
        )}

        {/* Strip image */}
        {hasStrip && (
          <div className="relative w-full shrink-0" style={{ aspectRatio: '375/123' }} data-testid="apple-strip-image">
            <img src={heroImage} alt={t('wallet.studio.images.hero')} className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div className="absolute inset-x-0 bottom-0 h-10" style={{ background: `linear-gradient(to bottom, transparent, ${bgColor})` }} />
          </div>
        )}

        {/* ── HEADER ── */}
        <div className={`px-3 flex items-center gap-2.5 shrink-0 ${hasStrip ? 'pt-2.5 pb-1.5' : 'pt-3 pb-1.5'}`}>
          {/* Logo — wide rectangle like real Apple PassKit logo (160×50pt) */}
          {(walletDesign?.appleLogoUrl || walletDesign?.appleLogo2xUrl || logoPreview) ? (
            <div className="shrink-0 w-[60px] h-[22px] rounded overflow-hidden border border-white/10 shadow-sm bg-white/5 flex items-center justify-center">
              <img
                src={walletDesign?.appleLogoUrl || walletDesign?.appleLogo2xUrl || logoPreview!}
                alt={t('wallet.studio.images.logo')}
                className="w-full h-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          ) : (
            <div className="shrink-0 w-[60px] h-[22px] rounded bg-white/10 flex items-center justify-center border border-white/5">
              <CardTypeIcon icon={selectedType?.icon || 'stamp'} className="w-3.5 h-3.5" />
            </div>
          )}

          {/* Icon — small square shown when set */}
          {(walletDesign?.appleIconUrl || walletDesign?.appleIcon2xUrl) && (
            <div className="shrink-0 w-[18px] h-[18px] rounded overflow-hidden border border-white/10 shadow-sm">
              <img
                src={walletDesign?.appleIconUrl || walletDesign?.appleIcon2xUrl}
                alt={t('wallet.studio.images.icon')}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}

          {/* Program name */}
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-[10px] font-bold truncate leading-tight">{form.name || t('wallet.preview.programName')}</p>
          </div>

          {/* Header fields — right aligned */}
          {headerFields ? (
            <div className="flex gap-2.5 shrink-0 pt-0.5">
              {headerFields.slice(0, 3).map((f, i) => (
                <div key={f.key || i} className="text-right shrink-0">
                  <p className="text-[7px] font-semibold uppercase tracking-wider opacity-30 leading-none mb-0.5 truncate max-w-[52px]">{f.label}</p>
                  <p className="text-[10px] font-black leading-none truncate max-w-[52px]">{formatFieldValue(resolveTemplate(f.value, ctx), f.dataType ?? 'text')}</p>
                </div>
              ))}
            </div>
          ) : (
            defaultHeaderValue[form.card_type] && (
              <div className="text-right shrink-0 pt-0.5">
                <p className="text-[7px] font-semibold uppercase tracking-wider opacity-30 leading-none mb-0.5">{defaultHeaderLabel[form.card_type]}</p>
                <p className="text-[10px] font-black leading-none">{defaultHeaderValue[form.card_type]}</p>
              </div>
            )
          )}

          {/* Thumbnail — generic only */}
          {isGeneric && (walletDesign?.appleThumbnailUrl || walletDesign?.appleThumbnail2xUrl || heroImage) && (
            <img
              src={walletDesign?.appleThumbnailUrl || walletDesign?.appleThumbnail2xUrl || heroImage}
              alt={t('wallet.studio.images.icon')}
              className="w-9 h-9 rounded object-cover border border-white/10 shadow-sm shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </div>

        {/* ── PRIMARY FIELD ── */}
        <div className="px-3 pt-1 pb-1 shrink-0 min-h-[48px] overflow-hidden" data-testid="apple-primary-field">
          {primaryFields ? (
            primaryFields.map((f, i) => (
              <div key={f.key || i}>
                <p className="text-[8px] font-semibold uppercase tracking-wider opacity-35 leading-none mb-1 truncate">{f.label}</p>
                <p className="text-[22px] font-black leading-none tracking-tight truncate">{formatFieldValue(resolveTemplate(f.value, ctx), f.dataType ?? 'text')}</p>
              </div>
            ))
          ) : (
            <div>
              <p className="text-[8px] font-semibold uppercase tracking-wider opacity-35 leading-none mb-1 truncate">{defaultPrimary.label}</p>
              <p className="text-[22px] font-black leading-none tracking-tight truncate">{defaultPrimary.value}</p>
            </div>
          )}
        </div>

        {/* ── SECONDARY FIELDS ── */}
        {secondaryFields && secondaryFields.length > 0 && (
          <div className="px-3 pt-1.5 pb-1 shrink-0 min-h-[34px] overflow-hidden">
            <div className="grid grid-cols-4 gap-2">
              {secondaryFields.slice(0, 4).map((f, i) => (
                <div key={f.key || i} className="min-w-0 overflow-hidden">
                  <p className="text-[7px] font-semibold uppercase tracking-wider opacity-30 leading-none mb-0.5 truncate">{f.label}</p>
                  <p className="text-[11px] font-semibold opacity-85 leading-tight truncate">{formatFieldValue(resolveTemplate(f.value, ctx), f.dataType ?? 'text')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── AUXILIARY FIELDS ── */}
        <div className={`px-3 shrink-0 min-h-[30px] overflow-hidden ${secondaryFields && secondaryFields.length > 0 ? 'pt-1.5 pb-2' : 'pt-2 pb-2'}`}>
          <div className="grid grid-cols-4 gap-2">
            {auxItems.slice(0, 4).map((f, i) => (
              <div key={(f as any).key || i} className="min-w-0 overflow-hidden">
                <p className="text-[6px] font-semibold uppercase tracking-wider opacity-30 leading-none mb-0.5 truncate">{f.label}</p>
                <p className="text-[10px] font-semibold opacity-85 leading-tight truncate">{formatFieldValue(resolveTemplate(f.value, ctx), (f as any).dataType ?? 'text')}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── CARD TYPE DECORATION ── */}
        <div className="shrink-0" data-testid="apple-decoration">{renderDecoration()}</div>

        {/* Spacer to push barcode to bottom */}
        <div className="flex-1 min-h-0" />

        {/* ── BARCODE ── */}
        <div className="px-3 pb-3 pt-1 shrink-0" data-testid="apple-barcode">
          <div className="bg-white rounded-lg p-2 shadow-sm flex flex-col items-center gap-1">
            <BarcodeSvg type={barcodeType} size={barcodeType === 'code_128' || barcodeType === 'pdf417' ? 68 : 38} />
            <span className="text-[6px] text-black text-opacity-40 font-mono tracking-wider">0000 0000 0000</span>
          </div>
        </div>

        {/* ── BACK FIELDS ── */}
        {backFields && backFields.length > 0 && (
          <div className="px-3 pb-3 pt-1 border-t border-white/10 shrink-0">
            <p className="text-[6px] font-semibold uppercase tracking-widest opacity-25 mb-1.5">{t('wallet.preview.backFieldsTitle')}</p>
            <div className="space-y-1">
              {backFields.slice(0, 6).map((f, i) => (
                <div key={f.key || i} className="flex justify-between gap-2">
                  <span className="text-[7px] opacity-40 truncate">{f.label}</span>
                  <span className="text-[7px] font-medium opacity-80 text-right truncate max-w-[55%]">{formatFieldValue(resolveTemplate(f.value, ctx), f.dataType ?? 'text')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </IPhone15ProFrame>
  );
}

/**
 * @description Apple Wallet pass back side preview with back fields.
 * @param {Object} props - Component props
 * @param {Object} props.form - Program form data
 * @param {PreviewWalletDesign} [props.walletDesign] - Wallet design state
 * @param {string} [props.customerName] - Customer name
 * @param {CardTypeConfig} [props.cardTypeConfig] - Card type configuration
 * @returns JSX.Element
 */
export function AppleWalletBackCard({
  form, walletDesign, customerName, cardTypeConfig,
}: {
  form: { name: string; description: string; background_color: string; text_color: string; card_type: string; discount_percentage?: string };
  walletDesign?: PreviewWalletDesign;
  customerName?: string;
  cardTypeConfig?: CardTypeConfig;
}) {
  const { t } = useI18n();
  const bgColor = form.background_color || '#1a1a2e';
  const textColor = form.text_color || '#ffffff';
  const backFields = walletDesign?.appleFields?.backFields;
  const ctx = buildContext(form, cardTypeConfig, customerName, t);

  return (
    <IPhone15ProFrame>
      <div
        className="rounded-2xl overflow-hidden flex flex-col shadow-lg h-full"
        style={{
          background: bgColor,
          color: textColor,
          boxShadow: '0 10px 30px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.25)',
        }}
      >
        {/* Title bar */}
        <div className="px-3 py-2.5 flex items-center justify-between shrink-0 border-b border-white/10">
          <span className="text-[10px] font-bold opacity-40">{t('wallet.preview.info')}</span>
          <span className="text-[10px] font-semibold opacity-60">{t('wallet.preview.ready')}</span>
        </div>

        {/* Back fields scrollable area */}
        <div className="flex-1 px-3 py-3 overflow-y-auto">
          {backFields && backFields.length > 0 ? (
            <div className="space-y-3">
              {backFields.map((f, i) => (
                <div key={f.key || i} className="border-b border-white/10 pb-2.5 last:border-0">
                  <p className="text-[7px] font-semibold uppercase tracking-wider opacity-35 mb-1">{f.label}</p>
                  <p className="text-[10px] leading-relaxed opacity-90 whitespace-pre-wrap break-words">{formatFieldValue(resolveTemplate(f.value, ctx), f.dataType ?? 'text')}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center">
              <p className="text-[10px] opacity-30">{t('wallet.preview.noBackFields')}</p>
            </div>
          )}
        </div>

        {/* Nav pill */}
        <div className="flex justify-center pb-3 pt-1 shrink-0 z-10">
          <div className="w-28 h-[3px] bg-white rounded-full opacity-15" />
        </div>
      </div>
    </IPhone15ProFrame>
  );
}
