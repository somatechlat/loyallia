import { IPhone15ProFrame } from './DeviceFrame';
import { BarcodeSvg } from './BarcodeRenderer';
import { CardTypeIcon, APPLE_PASS_STYLES } from '@/components/programs/constants';
import { useI18n } from '@/lib/i18n';
import { formatFieldValue } from '@/components/wallet/utils/field-formatting';
import { applyCropStyle, cropToStyle } from '@/components/wallet/utils/crop-style';
import { isCombinedLimitConstrained, getCombinedSecAuxMax } from '@/components/wallet/utils/field-validation';
import type { CardType, CardTypeConfig } from '@/components/wallet/types/unified-state';
import {
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
import { StampProgressGrid, type StampShape } from '@/components/ui/StampIcons';
import {
  getCardPalette,
  CARD_TYPE_SCALE,
  CARD_SPACE,
  CARD_RADIUS,
  CARD_SHADOW,
  CARD_CHROME,
} from '@/components/wallet/design-system';
import {
  resolveLegacyTemplate,
  buildContext,
  type PreviewAppleField,
  type PreviewWalletDesign,
} from './apple-wallet-helpers';

// Re-export for consumers that imported this symbol from AppleWalletPreview
export { resolveLegacyTemplate } from './apple-wallet-helpers';
export type { PreviewAppleField, PreviewWalletDesign } from './apple-wallet-helpers';

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
    label_color?: string;
    accent_color?: string;
    central_background?: string;
    card_type: string;
    strip_image_url?: string;
    discount_percentage?: string;
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
}

function FieldCell({
  label,
  value,
  valueColor,
  testId,
}: {
  label: string;
  value: string;
  valueColor?: string;
  testId?: string;
}) {
  return (
    <div className="min-w-0" data-testid={testId}>
      <p className={`${CARD_TYPE_SCALE.xs} font-semibold uppercase tracking-wider leading-tight`} style={{ color: 'var(--card-text-muted)' }}>
        {label}
      </p>
      <p
        className={`${CARD_TYPE_SCALE.sm} font-semibold leading-snug line-clamp-2 break-words`}
        style={{ color: valueColor ?? 'var(--card-text)' }}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * @description Apple Wallet pass preview with dynamic fields and barcode.
 * @param {AppleWalletCardProps} props - Component props
 * @returns JSX.Element
 */
export function AppleWalletCard({
  form, selectedType, logoPreview, stripPreview, barcodeType, customerName, walletDesign, cardTypeConfig, deviceFrame = true,
}: AppleWalletCardProps) {
  const { t } = useI18n();
  const palette = getCardPalette(form.card_type);
  const accent = form.accent_color || palette.accent;
  const passStyle = APPLE_PASS_STYLES[form.card_type] || 'generic';
  const heroImage = walletDesign?.appleStripUrl || walletDesign?.appleStrip2xUrl || stripPreview || form.strip_image_url;
  const hasStrip = Boolean(heroImage) && (passStyle === 'storeCard' || passStyle === 'coupon');
  const isCoupon = passStyle === 'coupon';
  const isGeneric = passStyle === 'generic';
  const backgroundImage = walletDesign?.appleBackgroundUrl;
  const ctx = buildContext(form, cardTypeConfig, customerName, t);
  const crops = walletDesign?.imageCrops;

  const appleFields = walletDesign?.appleFields;
  const headerFields = appleFields?.headerFields?.length ? appleFields.headerFields : undefined;
  const primaryFields = appleFields?.primaryFields?.length ? appleFields.primaryFields : undefined;
  const secondaryFields = appleFields?.secondaryFields?.length ? appleFields.secondaryFields : undefined;
  const auxiliaryFields = appleFields?.auxiliaryFields?.length ? appleFields.auxiliaryFields : undefined;

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
        return { label: t('wallet.preview.referralCode'), value: pattern || t('wallet.preview.sampleCode') };
      }
      case 'discount': {
        const firstTier = (config as Extract<CardTypeConfig, { cardType: 'discount' }>)?.tiers?.[0];
        return { label: t('wallet.preview.currentDiscount'), value: firstTier ? `${firstTier.discountPercentage}%` : t('wallet.preview.samplePercent') };
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
        return { label: '', value: t('wallet.preview.emptyValue') };
    }
  }

  const defaultPrimary = buildDefaultPrimary(form.card_type, cardTypeConfig);

  const defaultAux: PreviewAppleField[] = [
    { key: 'default-aux-customer', label: t('wallet.preview.customer'), value: customerName || t('wallet.preview.customer') },
    { key: 'default-aux-validity', label: t('wallet.preview.validUntil'), value: t('wallet.preview.validUntilDate') },
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
        return form.name?.slice(0, 6) || t('wallet.preview.emptyValue');
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

  const auxItems: PreviewAppleField[] = auxiliaryFields || defaultAux;

  // Mirror validateFieldGroupLimits / COMBINED_LIMIT_4:
  // storeCard/coupon card types cap secondary+auxiliary at 4 combined.
  const cardTypeKey = form.card_type as CardType;
  const secAuxMax = isCombinedLimitConstrained(cardTypeKey)
    ? getCombinedSecAuxMax(cardTypeKey)
    : 8;
  const secList = secondaryFields ?? [];
  const auxList = auxItems;
  const secShown = secList.slice(0, secAuxMax);
  const auxShown = auxList.slice(0, Math.max(0, secAuxMax - secShown.length));

  const stampCfg = form.card_type === 'stamp'
    ? (cardTypeConfig as Extract<CardTypeConfig, { cardType: 'stamp' }>)
    : undefined;
  const stampFilled = stampCfg?.stampsAtIssue ?? 0;
  const stampTotal = stampCfg?.stampsRequired ?? 10;

  function renderDecoration() {
    switch (form.card_type) {
      case 'stamp': {
        return (
          <StampProgressGrid
            filled={stampFilled}
            total={stampTotal}
            shape={(stampCfg?.stampShape as StampShape) || 'circle'}
            filledColor={stampCfg?.stampColor || accent}
            emptyColor={palette.accentSoft}
            label={t('wallet.preview.stampProgress', { filled: stampFilled, total: stampTotal })}
            className="py-2 px-1"
          />
        );
      }
      case 'cashback': {
        const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'cashback' }>;
        return <CashbackDecoration percentage={cfg?.cashbackPercentage ?? 5} tierName={cfg?.tierName || t('wallet.studio.vip.defaultName')} color={accent} coinIcon={cfg?.coinIcon} tierBadge={cfg?.tierBadge} progressRingColor={cfg?.progressRingColor} />;
      }
      case 'coupon': {
        const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'coupon' }>;
        return <CouponDecoration discount={cfg?.discountValue ?? 10} discountType={cfg?.discountType ?? 'percentage'} validUntil={cfg?.couponEndDate || t('wallet.preview.validUntilDate')} color={accent} cutLineStyle={cfg?.cutLineStyle} discountBadgeStyle={cfg?.discountBadgeStyle} offerTag={cfg?.offerTag} />;
      }
      case 'vip_membership': {
        const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'vip_membership' }>;
        return <VIPMembershipDecoration tierName={cfg?.membershipName || t('wallet.studio.vip.defaultName')} perks={cfg?.perks || []} color={accent} crownIcon={cfg?.crownIcon} memberBadgeStyle={cfg?.memberBadgeStyle} benefitsListIcons={cfg?.benefitsListIcons} />;
      }
      case 'gift_certificate': {
        const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'gift_certificate' }>;
        const firstDenom = cfg?.denominations?.[0];
        const balance = firstDenom ? `${t('wallet.studio.currency.symbol')}${firstDenom.toFixed(2)}` : `${t('wallet.studio.currency.symbol')}0.00`;
        return <GiftCertificateDecoration balance={balance} color={accent} boxGraphic={cfg?.boxGraphic} ribbonColor={cfg?.ribbonColor} denominationBadge={cfg?.denominationBadge} />;
      }
      case 'referral_pass': {
        const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'referral_pass' }>;
        return <ReferralPassDecoration code={cfg?.referralCodePattern || t('wallet.preview.sampleCode')} referralsMade={0} maxReferrals={cfg?.maxReferralsPerCustomer ?? 5} color={accent} referralIcon={cfg?.referralIcon} shareButtonColor={cfg?.shareButtonColor} rewardBadgeIcon={cfg?.rewardBadgeIcon} friendAvatarPlaceholder={cfg?.friendAvatarPlaceholder} />;
      }
      case 'discount': {
        const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'discount' }>;
        return <DiscountDecoration tiers={cfg?.tiers || []} color={accent} tierBadgeIcons={cfg?.tierBadgeIcons} progressBarColor={cfg?.progressBarColor} discountBannerText={cfg?.discountBannerText} percentageDisplayStyle={cfg?.percentageDisplayStyle} />;
      }
      case 'affiliate': {
        const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'affiliate' }>;
        return <AffiliateDecoration code={cfg?.affiliateCodePattern || t('wallet.preview.sampleAffiliateCode')} color={accent} referralChainIcon={cfg?.referralChainIcon} badgeColor={cfg?.badgeColor} referralBannerText={cfg?.referralBannerText} ambassadorBadge={cfg?.ambassadorBadge} partnerLogoUrl={cfg?.partnerLogoUrl} />;
      }
      case 'corporate_discount': {
        const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'corporate_discount' }>;
        return <CorporateDiscountDecoration companyName={cfg?.companyName || t('wallet.preview.company')} discountPercentage={cfg?.corporateDiscountPercentage ?? 10} color={accent} companyLogoUrl={cfg?.companyLogoUrl} buildingIcon={cfg?.buildingIcon} badgeStyle={cfg?.badgeStyle} idBadgeColor={cfg?.idBadgeColor} securitySeal={cfg?.securitySeal} departmentBadge={cfg?.departmentBadge} />;
      }
      case 'multipass': {
        const cfg = cardTypeConfig as Extract<CardTypeConfig, { cardType: 'multipass' }>;
        return <MultipassDecoration remaining={cfg?.bundleSize ?? 10} total={cfg?.bundleSize ?? 10} color={accent} ticketGraphic={cfg?.ticketGraphic} punchIcon={cfg?.punchIcon} bundleBadgeStyle={cfg?.bundleBadgeStyle} indicatorStyle={cfg?.indicatorStyle} />;
      }
      default:
        return null;
    }
  }

  return (
    <IPhone15ProFrame chrome={deviceFrame}>
      <div
        className={`${CARD_RADIUS.apple} ${CARD_SHADOW.card} overflow-hidden flex flex-col h-full relative`}
        style={{
          backgroundImage: palette.gradient,
          backgroundColor: palette.base,
          color: palette.text,
          border: '1px solid rgba(255,255,255,0.12)',
          ['--card-text' as string]: palette.text,
          ['--card-text-muted' as string]: palette.textMuted,
        }}
        data-testid="apple-wallet-card"
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

        {/* Gloss sweep across the card face */}
        <div className={`absolute inset-x-0 top-0 h-24 pointer-events-none z-[1] ${CARD_CHROME.gloss}`} aria-hidden />

        <div className="relative z-10 flex flex-col h-full min-h-0">
        {/* Perforated edge for coupon */}
        {isCoupon && (
          <div
            className="absolute top-2 left-3 right-3 h-0.5 z-20"
            style={{ background: `repeating-linear-gradient(90deg, ${palette.text}30 0px, ${palette.text}30 5px, transparent 5px, transparent 9px)` }}
          />
        )}

        {/* Strip image */}
        {hasStrip && (
          <div className="relative w-full shrink-0 overflow-hidden" style={{ aspectRatio: '375/123' }} data-testid="apple-strip-image">
            <img
              src={heroImage}
              alt={t('wallet.studio.images.hero')}
              className="absolute inset-0 w-full h-full object-cover"
              style={cropToStyle(crops?.strip ?? crops?.heroImage)}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="absolute inset-x-0 bottom-0 h-10" style={{ background: `linear-gradient(to bottom, transparent, ${palette.base})` }} />
          </div>
        )}

        {/* ── HEADER (frosted glass strip) ── */}
        <div className={`relative shrink-0 px-3 flex items-center gap-2.5 ${CARD_CHROME.headerGlass} ${hasStrip ? 'pt-2.5 pb-2' : 'pt-3 pb-2'}`}>
          {/* Logo chip */}
          {(walletDesign?.appleLogoUrl || walletDesign?.appleLogo2xUrl || logoPreview) ? (
            <div className={`shrink-0 w-[52px] h-[36px] ${CARD_RADIUS.chip} overflow-hidden ${CARD_CHROME.logoRing} bg-white/10 flex items-center justify-center`}>
              <img
                src={walletDesign?.appleLogoUrl || walletDesign?.appleLogo2xUrl || logoPreview!}
                alt={t('wallet.studio.images.logo')}
                className="w-full h-full object-contain"
                style={cropToStyle(crops?.logo)}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          ) : (
            <div className={`shrink-0 w-[52px] h-[36px] ${CARD_RADIUS.chip} ${CARD_CHROME.logoRing} bg-white/10 flex items-center justify-center`}>
              <CardTypeIcon icon={selectedType?.icon || 'stamp'} className="w-5 h-5" />
            </div>
          )}

          {/* Icon — small square shown when set */}
          {(walletDesign?.appleIconUrl || walletDesign?.appleIcon2xUrl) && (
            <div className={`shrink-0 w-7 h-7 ${CARD_RADIUS.chip} overflow-hidden ${CARD_CHROME.logoRing}`}>
              <img
                src={walletDesign?.appleIconUrl || walletDesign?.appleIcon2xUrl}
                alt={t('wallet.studio.images.icon')}
                className="w-full h-full object-cover"
                style={cropToStyle(crops?.icon)}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}

          {/* Program name */}
          <div className="flex-1 min-w-0">
            <p className={`${CARD_TYPE_SCALE.md} font-bold leading-tight line-clamp-2 break-words`}>
              {form.name || t('wallet.preview.programName')}
            </p>
          </div>

          {/* Header field — right aligned (PassKit: 1 header field) */}
          {headerFields ? (
            <div className="shrink-0 text-right max-w-[88px]">
              {headerFields.slice(0, 1).map((f, i) => (
                <div key={f.key || i} className="min-w-0">
                  <p className={`${CARD_TYPE_SCALE.xs} font-semibold uppercase tracking-wider leading-tight`} style={{ color: palette.textMuted }}>
                    {f.label}
                  </p>
                  <p className={`${CARD_TYPE_SCALE.sm} font-black leading-none line-clamp-2 break-words`}>
                    {formatFieldValue(resolveLegacyTemplate(f.value, ctx), f.dataType ?? 'text')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            defaultHeaderValue[form.card_type] && (
              <div className="shrink-0 text-right max-w-[88px]">
                <p className={`${CARD_TYPE_SCALE.xs} font-semibold uppercase tracking-wider leading-tight`} style={{ color: palette.textMuted }}>
                  {defaultHeaderLabel[form.card_type]}
                </p>
                <p className={`${CARD_TYPE_SCALE.sm} font-black leading-none line-clamp-2 break-words`}>
                  {defaultHeaderValue[form.card_type]}
                </p>
              </div>
            )
          )}

          {/* Thumbnail — generic only */}
          {isGeneric && (walletDesign?.appleThumbnailUrl || walletDesign?.appleThumbnail2xUrl || heroImage) && (
            <img
              src={walletDesign?.appleThumbnailUrl || walletDesign?.appleThumbnail2xUrl || heroImage}
              alt={t('wallet.studio.images.icon')}
              className={`w-10 h-10 ${CARD_RADIUS.chip} object-cover ${CARD_CHROME.logoRing} shrink-0`}
              style={cropToStyle(crops?.thumbnail ?? crops?.heroImage ?? crops?.strip)}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </div>

        {/* ── HERO / PRIMARY FIELD ── */}
        <div className="px-3 pt-2.5 pb-1 shrink-0" data-testid="apple-primary-field">
          {primaryFields ? (
            primaryFields.slice(0, 1).map((f, i) => (
              <div key={f.key || i}>
                <p className={`${CARD_TYPE_SCALE.xs} font-semibold uppercase tracking-wider leading-tight mb-1`} style={{ color: palette.textMuted }}>
                  {f.label}
                </p>
                <p className={`${CARD_TYPE_SCALE.xl} font-black leading-none tracking-tight line-clamp-2 break-words`}>
                  {formatFieldValue(resolveLegacyTemplate(f.value, ctx), f.dataType ?? 'text')}
                </p>
              </div>
            ))
          ) : (
            <div>
              <p className={`${CARD_TYPE_SCALE.xs} font-semibold uppercase tracking-wider leading-tight mb-1`} style={{ color: palette.textMuted }}>
                {defaultPrimary.label}
              </p>
              <p className={`${CARD_TYPE_SCALE.xl} font-black leading-none tracking-tight line-clamp-2 break-words`} style={{ color: accent }}>
                {defaultPrimary.value}
              </p>
            </div>
          )}
        </div>

        {/* ── SECONDARY FIELDS ── */}
        {secShown.length > 0 && (
          <div className="px-3 pt-2 pb-1 shrink-0">
            <div className={`grid grid-cols-2 ${CARD_SPACE.sm}`}>
              {secShown.map((f, i) => (
                <FieldCell
                  key={f.key || i}
                  label={f.label}
                  value={formatFieldValue(resolveLegacyTemplate(f.value, ctx), f.dataType ?? 'text')}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── AUXILIARY FIELDS ── */}
        {auxShown.length > 0 && (
          <div className={`px-3 shrink-0 ${secShown.length > 0 ? 'pt-1 pb-2' : 'pt-2 pb-2'}`}>
            <div className={`grid grid-cols-2 ${CARD_SPACE.sm}`}>
              {auxShown.map((f, i) => (
                <FieldCell
                  key={f.key || i}
                  label={f.label}
                  value={formatFieldValue(resolveLegacyTemplate(f.value, ctx), f.dataType ?? 'text')}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── DESCRIPTION ── */}
        {form.description && (
          <div className="px-3 pb-1.5 shrink-0">
            <p className={`${CARD_TYPE_SCALE.xs} leading-snug line-clamp-2`} style={{ color: palette.textMuted }}>
              {form.description}
            </p>
          </div>
        )}

        {/* ── STAMP / PROGRESS + CARD TYPE DECORATION ── */}
        <div
          className="shrink-0"
          data-testid="apple-decoration"
          style={form.central_background ? { backgroundColor: form.central_background, borderRadius: '8px', margin: '0 12px', padding: '8px 4px' } : undefined}
        >
          {renderDecoration()}
        </div>

        {/* Spacer to push barcode to bottom */}
        <div className="flex-1 min-h-0" />

        {/* ── BARCODE ── */}
        <div className="relative px-3 pb-3 pt-2 shrink-0" data-testid="apple-barcode">
          {/* Accent watermark behind the plate */}
          <div
            className="absolute inset-x-3 bottom-3 top-1 rounded-xl pointer-events-none"
            style={{ background: palette.accentSoft }}
            aria-hidden
          />
          <div className={`relative ${CARD_CHROME.barcodePlate} flex flex-col items-center gap-1`}>
            <BarcodeSvg type={barcodeType} size={barcodeType === 'code_128' || barcodeType === 'pdf417' ? 68 : 38} message={form.barcode_message} />
            <span className={`${CARD_TYPE_SCALE.xs} font-mono tracking-wider text-neutral-700`}>
              {form.barcode_alt_text || form.barcode_message || t('wallet.preview.sampleBarcode')}
            </span>
          </div>
        </div>
        </div>
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
  const palette = getCardPalette(form.card_type);
  const backFields = walletDesign?.appleFields?.backFields;
  const ctx = buildContext(form, cardTypeConfig, customerName, t);

  return (
    <IPhone15ProFrame>
      <div
        className={`${CARD_RADIUS.apple} ${CARD_SHADOW.card} overflow-hidden flex flex-col h-full`}
        style={{
          backgroundImage: palette.gradient,
          backgroundColor: palette.base,
          color: palette.text,
          ['--card-text' as string]: palette.text,
          ['--card-text-muted' as string]: palette.textMuted,
        }}
      >
        {/* Title bar */}
        <div className={`px-3 py-2.5 flex items-center justify-between shrink-0 ${CARD_CHROME.headerGlass}`}>
          <span className={`${CARD_TYPE_SCALE.sm} font-bold`} style={{ color: palette.textMuted }}>{t('wallet.preview.info')}</span>
          <span className={`${CARD_TYPE_SCALE.sm} font-semibold`}>{t('wallet.preview.ready')}</span>
        </div>

        {/* Back fields scrollable area */}
        <div className="flex-1 px-3 py-3 overflow-y-auto">
          {backFields && backFields.length > 0 ? (
            <div className="space-y-3">
              {backFields.map((f, i) => (
                <div key={f.key || i} className="border-b border-white/10 pb-2.5 last:border-0">
                  <p className={`${CARD_TYPE_SCALE.xs} font-semibold uppercase tracking-wider mb-1`} style={{ color: palette.textMuted }}>
                    {f.label}
                  </p>
                  <p className={`${CARD_TYPE_SCALE.sm} leading-relaxed whitespace-pre-wrap break-words`}>
                    {formatFieldValue(resolveLegacyTemplate(f.value, ctx), f.dataType ?? 'text')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center">
              <p className={`${CARD_TYPE_SCALE.sm}`} style={{ color: palette.textMuted }}>{t('wallet.preview.noBackFields')}</p>
            </div>
          )}
        </div>

        {/* Nav pill */}
        <div className="flex justify-center pb-3 pt-1 shrink-0 z-10">
          <div className="w-28 h-[3px] rounded-full bg-white/25" />
        </div>
      </div>
    </IPhone15ProFrame>
  );
}
