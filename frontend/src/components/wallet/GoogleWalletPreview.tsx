import { Pixel7Frame } from './DeviceFrame';
import { BarcodeSvg } from './BarcodeRenderer';
import { CardTypeIcon, GOOGLE_WALLET_TYPES } from '@/components/programs/constants';
import { useI18n } from '@/lib/i18n';
import { resolveTemplate } from '@/components/wallet/AppleWalletPreview';
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

interface PreviewWalletDesign {
  googleProgramLogoUrl?: string;
  googleHeroImageUrl?: string;
  googleWideLogoUrl?: string;
  googleImageModuleUrl?: string;
  googleBackgroundUrl?: string;
  googleRows?: PreviewGoogleFieldRow[];
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
      return { ...defaults, stamp_count: String(stampsAt), stamps_required: String(stampsReq), stamp_display: `${stampsAt} / ${stampsReq}`, reward_description: cfg.rewardDescription || defaults.reward_description };
    }
    case 'cashback': {
      const pct = cfg.cashbackPercentage ?? 5;
      const minPurchase = cfg.minimumPurchase ?? 0;
      return { ...defaults, cashback_percentage: String(pct), cashback_balance: `${t('wallet.studio.currency.symbol')}${minPurchase.toFixed(2)}`, membership_tier: cfg.tierName || defaults.membership_tier };
    }
    case 'coupon': {
      const val = cfg.discountValue ?? 10;
      const limit = cfg.usageLimitPerCustomer ?? 1;
      return { ...defaults, discount_percentage: String(val), coupon_usage: `0 / ${limit}`, coupon_end_date: cfg.couponEndDate || defaults.coupon_end_date, coupon_terms: cfg.couponDescription || form.description || defaults.coupon_terms };
    }
    case 'vip_membership': {
      return { ...defaults, membership_tier: cfg.membershipName || defaults.membership_tier, perks: cfg.perks?.join(', ') || defaults.perks, expiry_days: cfg.validityPeriod === 'lifetime' ? t('wallet.preview.lifetime') : String(cfg.validityPeriod === 'annual' ? 365 : 30) };
    }
    case 'discount': {
      const firstTier = cfg.tiers?.[0];
      return { ...defaults, discount_percentage: firstTier ? String(firstTier.discountPercentage) : defaults.discount_percentage, discount_tier: firstTier?.tierName || defaults.discount_tier, tiers_list: cfg.tiers?.map((t) => `${t.tierName} ${t.discountPercentage}%`).join(', ') || defaults.tiers_list };
    }
    case 'gift_certificate': {
      const firstDenom = cfg.denominations?.[0];
      return { ...defaults, gift_balance: firstDenom ? `${t('wallet.studio.currency.symbol')}${firstDenom.toFixed(2)}` : defaults.gift_balance, expiry_days: String(cfg.expiryDays ?? 365) };
    }
    case 'affiliate': {
      return { ...defaults, affiliate_code: cfg.affiliateCodePattern || defaults.affiliate_code, benefits: cfg.benefitsDescription || defaults.benefits };
    }
    case 'corporate_discount': {
      return { ...defaults, corporate_discount: String(cfg.corporateDiscountPercentage ?? 10), company_name: cfg.companyName || defaults.company_name };
    }
    case 'referral_pass': {
      const maxRef = cfg.maxReferralsPerCustomer ?? 5;
      return { ...defaults, referral_code: cfg.referralCodePattern || defaults.referral_code, referrals_made: `0 / ${maxRef}`, referrer_reward: cfg.referrerReward || defaults.referrer_reward };
    }
    case 'multipass': {
      return { ...defaults, multipass_remaining: String(cfg.bundleSize ?? 10), bundle_size: String(cfg.bundleSize ?? 10), bundle_price: cfg.bundlePrice ? `${t('wallet.studio.currency.symbol')}${cfg.bundlePrice.toFixed(2)}` : defaults.bundle_price };
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
    'object.balance.money': '$25.00',
  };
  return map[fieldPath] || ctx[fieldPath.replace(/\./g, '_')] || '—';
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
    card_type: string;
    strip_image_url?: string;
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
 * @description Google Wallet card preview with hero image, logo, and barcode.
 * @param {GoogleWalletCardProps} props - Component props
 * @returns JSX.Element
 */
export function GoogleWalletCard({
  form, selectedType, logoPreview, stripPreview, barcodeType, customerName, walletDesign, cardTypeConfig,
}: GoogleWalletCardProps) {
  const { t } = useI18n();
  const bgColor = form.background_color || '#1a1a2e';
  const textColor = form.text_color || '#ffffff';
  const heroImage = walletDesign?.googleHeroImageUrl || stripPreview || form.strip_image_url;
  const logoImage = walletDesign?.googleProgramLogoUrl || logoPreview;
  const backgroundImage = walletDesign?.googleBackgroundUrl;
  const wideLogoImage = walletDesign?.googleWideLogoUrl;
  const imageModuleImage = walletDesign?.googleImageModuleUrl;
  const ctx = buildContext(form, cardTypeConfig, customerName, t);

  const googleRows = walletDesign?.googleRows;
  const hasCustomRows = googleRows && googleRows.length > 0;

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
        rows.push({ label: t('wallet.preview.defaultHeader.cashback'), value: `${t('wallet.studio.currency.symbol')}${minPurchase.toFixed(2)}` }, { label: t('wallet.studio.cashback.percentage'), value: `${pct}%` });
        break;
      }
      case 'coupon': {
        const val = (config as Extract<CardTypeConfig, { cardType: 'coupon' }>)?.discountValue ?? 10;
        const type = (config as Extract<CardTypeConfig, { cardType: 'coupon' }>)?.discountType ?? 'percentage';
        const displayVal = type === 'percentage' ? `${val}% ${t('wallet.studio.coupon.off')}` : `$${val.toFixed(2)} ${t('wallet.studio.coupon.off')}`;
        rows.push({ label: t('wallet.preview.business'), value: ctx.program_name || t('wallet.preview.business') }, { label: t('wallet.preview.offer'), value: displayVal }, { label: t('wallet.preview.uses'), value: `0 / ${(config as Extract<CardTypeConfig, { cardType: 'coupon' }>)?.usageLimitPerCustomer ?? 1}` }, { label: t('wallet.preview.validUntil'), value: t('wallet.preview.validUntilDate') }, { label: t('wallet.preview.terms'), value: form.description || t('wallet.preview.terms') });
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
        rows.push({ label: t('wallet.preview.business'), value: ctx.program_name || t('wallet.preview.business') }, { label: t('wallet.preview.offer'), value: form.name || t('wallet.preview.offer') }, { label: t('wallet.preview.defaultHeader.referral'), value: `0 / ${maxRef}` }, { label: t('wallet.studio.affiliate.codePattern'), value: pattern || 'REF-XXXX' }, { label: t('wallet.preview.reward'), value: (config as Extract<CardTypeConfig, { cardType: 'referral_pass' }>)?.referrerReward || t('wallet.preview.reward') });
        break;
      }
      case 'discount': {
        const firstTier = (config as Extract<CardTypeConfig, { cardType: 'discount' }>)?.tiers?.[0];
        rows.push({ label: t('wallet.preview.business'), value: ctx.program_name || t('wallet.preview.business') }, { label: t('wallet.preview.offer'), value: form.name || t('wallet.preview.offer') }, { label: t('wallet.preview.tier'), value: firstTier?.tierName || t('wallet.studio.vip.badgeBronze') }, { label: t('wallet.preview.currentDiscount'), value: firstTier ? `${firstTier.discountPercentage}%` : '5%' });
        break;
      }
      case 'gift_certificate': {
        const firstDenom = (config as Extract<CardTypeConfig, { cardType: 'gift_certificate' }>)?.denominations?.[0];
        rows.push({ label: t('wallet.preview.defaultHeader.gift'), value: firstDenom ? `${t('wallet.studio.currency.symbol')}${firstDenom.toFixed(2)}` : `${t('wallet.studio.currency.symbol')}0.00` });
        break;
      }
      case 'affiliate': {
        rows.push({ label: t('wallet.preview.affiliateProgram'), value: form.name || t('programs.cardTypes.affiliate') });
        break;
      }
      case 'corporate_discount': {
        const pct = (config as Extract<CardTypeConfig, { cardType: 'corporate_discount' }>)?.corporateDiscountPercentage ?? 10;
        rows.push({ label: t('wallet.preview.business'), value: ctx.program_name || t('wallet.preview.business') }, { label: t('wallet.preview.offer'), value: form.name || t('wallet.preview.offer') }, { label: t('wallet.preview.corporateDiscount'), value: `${pct}%` }, { label: t('wallet.preview.company'), value: (config as Extract<CardTypeConfig, { cardType: 'corporate_discount' }>)?.companyName || t('wallet.preview.company') });
        break;
      }
      case 'multipass': {
        const size = (config as Extract<CardTypeConfig, { cardType: 'multipass' }>)?.bundleSize ?? 10;
        rows.push({ label: t('wallet.preview.remainingUses'), value: String(size) });
        break;
      }
    }
    rows.push({ label: t('wallet.preview.passType'), value: GOOGLE_WALLET_TYPES[form.card_type]?.label || t('wallet.preview.loyaltyProgram') });
    return rows;
  }

  const defaultRows = buildDefaultRows(form.card_type, cardTypeConfig);

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
    <Pixel7Frame>
      <div
        className="rounded-[28px] overflow-hidden flex flex-col shadow-lg h-full"
        style={{
          background: backgroundImage ? `${bgColor} url(${backgroundImage}) center/cover no-repeat` : bgColor,
          color: textColor,
          boxShadow: '0 8px 24px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.2)',
        }}
        data-testid="google-wallet-card"
      >
        {/* Hero image */}
        {heroImage && (
          <div className="relative w-full shrink-0" style={{ aspectRatio: '16/7' }} data-testid="google-hero-image">
            <img src={heroImage} alt={t('wallet.studio.images.hero')} className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div className="absolute inset-x-0 bottom-0 h-10" style={{ background: `linear-gradient(to bottom, transparent, ${bgColor})` }} />
          </div>
        )}

        {/* Logo circle */}
        <div className="flex flex-col items-center px-4 relative z-10 shrink-0" style={{ marginTop: heroImage ? -28 : 12 }}>
          <div className="w-14 h-14 rounded-[18px] overflow-hidden border-2 border-white/10 shadow-lg bg-neutral-900">
            {logoImage ? (
              <img src={logoImage} alt={t('wallet.studio.images.logo')} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white/10">
                <CardTypeIcon icon={selectedType?.icon || 'stamp'} className="w-7 h-7" />
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="px-4 pt-2 pb-1 text-center shrink-0">
          <p className="text-[15px] font-bold leading-tight truncate">{form.name || t('wallet.preview.programName')}</p>
          <p className="text-[10px] opacity-40 mt-0.5 font-medium truncate">{selectedType?.label || t('wallet.preview.loyaltyProgram')}</p>
        </div>

        {/* Wide Logo */}
        {wideLogoImage && (
          <div className="px-4 pb-1 shrink-0">
            <div className="w-full h-10 rounded-lg overflow-hidden border border-white/10">
              <img src={wideLogoImage} alt={t('wallet.studio.images.wideLogo')} className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          </div>
        )}

        {/* Info rows with dividers */}
        <div className="px-3 pt-1.5 pb-1 shrink-0">
          {hasCustomRows ? (
            googleRows!.map((row, rIdx) => (
              <div key={row.id}>
                <div
                  className="grid gap-2 py-2"
                  style={{ gridTemplateColumns: `repeat(${row.type === 'oneItem' ? 1 : row.type === 'twoItems' ? 2 : 3}, 1fr)` }}
                >
                  {row.items.map((item, iIdx) => (
                    <div key={item.id} className={`min-w-0 overflow-hidden ${row.type !== 'oneItem' && iIdx > 0 ? 'text-right' : ''}`}>
                      <p className="text-[8px] opacity-35 font-medium leading-none mb-0.5 truncate">{item.displayName || item.label || t('wallet.studio.fields.label')}</p>
                      <p className="text-[10px] font-semibold leading-tight truncate">
                        {item.value ? formatFieldValue(resolveTemplate(item.value, ctx), item.dataType ?? 'text') : getGoogleSampleValue(item.fieldPath, ctx, t)}
                      </p>
                    </div>
                  ))}
                </div>
                {rIdx < googleRows!.length - 1 && <div className="h-px bg-white/10" />}
              </div>
            ))
          ) : (
            defaultRows.map((row, i) => (
              <div key={i}>
                <div className="flex justify-between items-baseline py-2">
                  <span className="text-[8px] opacity-35 font-medium truncate max-w-[50%]">{row.label}</span>
                  <span className="text-[10px] font-semibold text-right truncate max-w-[50%]">{row.value}</span>
                </div>
                {i < defaultRows.length - 1 && <div className="h-px bg-white/10" />}
              </div>
            ))
          )}
          {form.description && !hasCustomRows && (
            <>
              <div className="h-px bg-white/10" />
              <p className="text-[8px] opacity-30 line-clamp-2 pt-2 pb-1">{form.description}</p>
            </>
          )}
        </div>

        {/* ── CARD TYPE DECORATION ── */}
        <div className="shrink-0" data-testid="google-decoration">{renderDecoration()}</div>

        {/* Image Module */}
        {imageModuleImage && (
          <div className="px-3 pt-2 pb-1 shrink-0">
            <div className="w-full rounded-xl overflow-hidden border border-white/10 shadow-sm">
              <img src={imageModuleImage} alt={t('wallet.studio.images.imageModule')} className="w-full h-auto object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1 min-h-0" />

        {/* Barcode */}
        <div className="px-3 pb-3 pt-1 shrink-0" data-testid="google-barcode">
          <div className="bg-white rounded-2xl p-2 shadow-sm flex flex-col items-center gap-1">
            <BarcodeSvg type={barcodeType} size={barcodeType === 'code_128' || barcodeType === 'pdf417' ? 68 : 38} />
            <span className="text-[6px] text-black text-opacity-40 font-mono tracking-wider">0000 0000 0000</span>
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
}

export function GoogleWalletBackCard({
  form, logoPreview, walletDesign, backFields, backLinks,
}: GoogleWalletBackCardProps) {
  const { t } = useI18n();
  const bgColor = form.background_color || '#1a1a2e';
  const textColor = form.text_color || '#ffffff';
  const logoImage = walletDesign?.googleProgramLogoUrl || logoPreview;

  return (
    <Pixel7Frame>
      <div
        className="rounded-[28px] overflow-hidden flex flex-col shadow-lg h-full"
        style={{
          background: bgColor,
          color: textColor,
          boxShadow: '0 8px 24px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header bar */}
        <div className="px-4 py-3 flex items-center gap-2 shrink-0 border-b border-white/10">
          <svg className="w-4 h-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span className="text-[11px] font-semibold opacity-60">{t('wallet.preview.details')}</span>
        </div>

        {/* Logo + name */}
        <div className="px-4 py-3 flex items-center gap-3 shrink-0 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shadow-sm bg-neutral-900 flex-shrink-0">
            {logoImage ? (
              <img src={logoImage} alt={t('wallet.studio.images.logo')} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white/10">
                <span className="text-xs opacity-50">{form.name?.charAt(0) || 'L'}</span>
              </div>
            )}
          </div>
          <div>
            <p className="text-[13px] font-bold leading-tight">{form.name || t('wallet.preview.programName')}</p>
            <p className="text-[10px] opacity-40 mt-0.5">{t('wallet.preview.loyaltyProgram')}</p>
          </div>
        </div>

        {/* Scrollable details content */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {/* Back fields as sections */}
          {backFields && backFields.length > 0 ? (
            <div className="space-y-4">
              {backFields.map((field, i) => (
                <div key={i}>
                  <div className="h-px bg-white/10 mb-3" />
                  <p className="text-[9px] font-bold uppercase tracking-wider opacity-40 mb-1">{field.label}</p>
                  <p className="text-[11px] leading-relaxed opacity-90 whitespace-pre-wrap break-words">{field.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center">
              <p className="text-[10px] opacity-30">{t('wallet.preview.noBackFields')}</p>
            </div>
          )}

          {/* Quick links */}
          {backLinks && backLinks.length > 0 && (
            <>
              <div className="h-px bg-white/10 my-4" />
              <p className="text-[9px] font-bold uppercase tracking-wider opacity-40 mb-2">{t('wallet.preview.links')}</p>
              <div className="space-y-2">
                {backLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[11px] hover:bg-white/10 transition-colors"
                  >
                    <span className="opacity-60">{getLinkIcon(link.type)}</span>
                    <span className="truncate">{link.label || link.url}</span>
                  </a>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Bottom nav pill */}
        <div className="flex justify-center pb-3 pt-1 shrink-0">
          <div className="w-28 h-[3px] bg-white rounded-full opacity-15" />
        </div>
      </div>
    </Pixel7Frame>
  );
}

function getLinkIcon(type: string): string {
  switch (type) {
    case 'website': return '🌐';
    case 'phone': return '📞';
    case 'email': return '✉️';
    case 'instagram': return '📸';
    case 'facebook': return '👍';
    default: return '🔗';
  }
}
