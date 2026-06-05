import { IPhone15ProFrame } from './DeviceFrame';
import { BarcodeSvg } from './BarcodeRenderer';
import { CardTypeIcon, APPLE_PASS_STYLES } from '@/components/programs/constants';
import { useI18n } from '@/lib/i18n';

interface PreviewAppleField {
  key: string;
  label: string;
  value: string;
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
  appleFields?: {
    headerFields?: PreviewAppleField[];
    primaryFields?: PreviewAppleField[];
    secondaryFields?: PreviewAppleField[];
    auxiliaryFields?: PreviewAppleField[];
    backFields?: PreviewAppleField[];
  };
}

function resolveTemplate(value: string, ctx: Record<string, string>): string {
  return value.replace(/\{(\w+)\}/g, (_, key) => ctx[key] ?? `{${key}}`);
}

function buildContext(form: { name: string; description: string; card_type: string }, customerName: string | undefined, t: (key: string) => string): Record<string, string> {
  return {
    customer_name: customerName || t('wallet.preview.customer'),
    program_name: form.name || t('wallet.preview.programName'),
    description: form.description || '',
    stamp_count: '0',
    stamps_required: '10',
    reward_description: t('wallet.preview.reward'),
    cashback_balance: '0.00',
    cashback_percentage: '5',
    membership_tier: t('wallet.studio.vip.defaultName'),
    referral_code: 'REF-XXXX',
    referrals_made: '0',
    discount_percentage: '5',
    discount_tier: t('wallet.studio.vip.badgeBronze'),
    gift_balance: '0.00',
    affiliate_code: 'AFIL-001',
    enrolled_date: '01/01/2025',
    benefits: t('wallet.studio.vip.perks'),
    company_name: t('wallet.preview.company'),
    corporate_discount: '10',
    coupon_usage: '0 / 1',
    coupon_end_date: t('wallet.preview.validUntilDate'),
    coupon_terms: t('wallet.preview.terms'),
    referrer_reward: t('wallet.preview.reward'),
    multipass_remaining: '10',
    bundle_size: '10',
    bundle_price: '25.00',
    stamp_display: '0 / 10',
    perks: t('wallet.studio.vip.perks'),
    expiry_days: '365',
    tiers_list: `${t('wallet.studio.vip.badgeBronze')} 5%, ${t('wallet.studio.vip.badgeSilver')} 10%, ${t('wallet.studio.vip.badgeGold')} 15%`,
  };
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
}

/**
 * @description Apple Wallet pass preview with dynamic fields and barcode.
 * @param {AppleWalletCardProps} props - Component props
 * @returns JSX.Element
 */
export function AppleWalletCard({
  form, selectedType, logoPreview, stripPreview, barcodeType, customerName, walletDesign,
}: AppleWalletCardProps) {
  const { t } = useI18n();
  const bgColor = form.background_color || '#1a1a2e';
  const textColor = form.text_color || '#ffffff';
  const passStyle = APPLE_PASS_STYLES[form.card_type] || 'generic';
  const heroImage = walletDesign?.appleStripUrl || walletDesign?.appleStrip2xUrl || stripPreview || form.strip_image_url;
  const hasStrip = heroImage && (passStyle === 'storeCard' || passStyle === 'coupon');
  const isCoupon = passStyle === 'coupon';
  const isGeneric = passStyle === 'generic';
  const ctx = buildContext(form, customerName, t);

  const appleFields = walletDesign?.appleFields;
  const headerFields = appleFields?.headerFields?.length ? appleFields.headerFields : undefined;
  const primaryFields = appleFields?.primaryFields?.length ? appleFields.primaryFields : undefined;
  const secondaryFields = appleFields?.secondaryFields?.length ? appleFields.secondaryFields : undefined;
  const auxiliaryFields = appleFields?.auxiliaryFields?.length ? appleFields.auxiliaryFields : undefined;
  const backFields = appleFields?.backFields?.length ? appleFields.backFields : undefined;

  const defaultPrimary: { label: string; value: string } = {
    stamp:             { label: t('wallet.preview.stampAccumulated'), value: '0 / 10' },
    cashback:          { label: t('wallet.preview.availableBalance'), value: '$0.00' },
    coupon:            { label: form.description || t('wallet.preview.specialDiscount'), value: form.discount_percentage ? `${form.discount_percentage}% ${t('wallet.studio.coupon.off')}` : `20% ${t('wallet.studio.coupon.off')}` },
    vip_membership:    { label: t('wallet.preview.membership'), value: t('wallet.studio.vip.defaultName') },
    referral_pass:     { label: t('wallet.preview.referralCode'), value: 'REF-XXXX' },
    discount:          { label: t('wallet.preview.currentDiscount'), value: '5%' },
    gift_certificate:  { label: t('wallet.preview.giftBalance'), value: '$0.00' },
    affiliate:         { label: t('wallet.preview.affiliateProgram'), value: form.name || t('programs.cardTypes.affiliate') },
    corporate_discount:{ label: t('wallet.preview.corporateDiscount'), value: '0%' },
    multipass:         { label: t('wallet.preview.remainingUses'), value: '10' },
  }[form.card_type] || { label: '', value: '—' };

  const defaultAux: Array<{ label: string; value: string }> = [
    { label: t('wallet.preview.customer'), value: customerName || t('wallet.preview.customer') },
    { label: t('wallet.preview.validUntil'), value: t('wallet.preview.validUntilDate') },
  ];

  const defaultHeaderValue: Record<string, string> = {
    stamp: '0/10', cashback: '$0.00', coupon: t('portal.cardTypes.coupon'), vip_membership: t('wallet.preview.vip'),
    referral_pass: '0', discount: t('wallet.studio.vip.badgeBronze'), gift_certificate: '$0',
    affiliate: form.name?.slice(0, 6) || '—', corporate_discount: '0%', multipass: '10/10',
  };
  const defaultHeaderLabel: Record<string, string> = {
    stamp: t('wallet.preview.defaultHeader.stamp'), cashback: t('wallet.preview.defaultHeader.cashback'), coupon: t('wallet.preview.defaultHeader.coupon'), vip_membership: t('wallet.preview.defaultHeader.vip'),
    referral_pass: t('wallet.preview.defaultHeader.referral'), discount: t('wallet.preview.defaultHeader.discount'), gift_certificate: t('wallet.preview.defaultHeader.gift'),
    affiliate: t('wallet.preview.defaultHeader.affiliate'), corporate_discount: t('wallet.preview.defaultHeader.corporate'), multipass: t('wallet.preview.defaultHeader.multipass'),
  };

  const auxItems: Array<{ label: string; value: string }> = auxiliaryFields || defaultAux;

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
        {/* Perforated edge for coupon */}
        {isCoupon && (
          <div
            className="absolute top-2 left-3 right-3 h-0.5 z-20"
            style={{ background: `repeating-linear-gradient(90deg, ${textColor}30 0px, ${textColor}30 5px, transparent 5px, transparent 9px)` }}
          />
        )}

        {/* Strip image */}
        {hasStrip && (
          <div className="relative w-full shrink-0" style={{ aspectRatio: '375/123' }}>
            <img src={heroImage} alt={t('wallet.studio.images.hero')} className="absolute inset-0 w-full h-full object-cover" />
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
              />
            </div>
          ) : (
            <div className="shrink-0 w-[60px] h-[22px] rounded bg-white/10 flex items-center justify-center border border-white/5">
              <CardTypeIcon icon={selectedType?.icon || 'stamp'} className="w-3.5 h-3.5" />
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
                  <p className="text-[10px] font-black leading-none truncate max-w-[52px]">{resolveTemplate(f.value, ctx)}</p>
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
            />
          )}
        </div>

        {/* ── PRIMARY FIELD ── */}
        <div className="px-3 pt-1 pb-1 shrink-0 min-h-[48px] overflow-hidden">
          {primaryFields ? (
            primaryFields.map((f, i) => (
              <div key={f.key || i}>
                <p className="text-[8px] font-semibold uppercase tracking-wider opacity-35 leading-none mb-1 truncate">{f.label}</p>
                <p className="text-[22px] font-black leading-none tracking-tight truncate">{resolveTemplate(f.value, ctx)}</p>
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
                  <p className="text-[11px] font-semibold opacity-85 leading-tight truncate">{resolveTemplate(f.value, ctx)}</p>
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
                <p className="text-[10px] font-semibold opacity-85 leading-tight truncate">{resolveTemplate(f.value, ctx)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Spacer to push barcode to bottom */}
        <div className="flex-1 min-h-0" />

        {/* ── BARCODE ── */}
        <div className="px-3 pb-3 pt-1 shrink-0">
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
                  <span className="text-[7px] font-medium opacity-80 text-right truncate max-w-[55%]">{resolveTemplate(f.value, ctx)}</span>
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
 * @returns JSX.Element
 */
export function AppleWalletBackCard({
  form, walletDesign, customerName,
}: {
  form: { name: string; description: string; background_color: string; text_color: string; card_type: string; discount_percentage?: string };
  walletDesign?: PreviewWalletDesign;
  customerName?: string;
}) {
  const { t } = useI18n();
  const bgColor = form.background_color || '#1a1a2e';
  const textColor = form.text_color || '#ffffff';
  const backFields = walletDesign?.appleFields?.backFields;
  const ctx = buildContext(form, customerName, t);

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
                  <p className="text-[10px] leading-relaxed opacity-90 whitespace-pre-wrap break-words">{resolveTemplate(f.value, ctx)}</p>
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
