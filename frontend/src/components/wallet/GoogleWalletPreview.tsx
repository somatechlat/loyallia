import { Pixel7Frame } from './DeviceFrame';
import { BarcodeSvg } from './BarcodeRenderer';
import { CardTypeIcon, GOOGLE_WALLET_TYPES } from '@/components/programs/constants';
import { useI18n } from '@/lib/i18n';

interface PreviewGoogleFieldItem {
  id: string;
  fieldPath: string;
  label: string;
  displayName: string;
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
  googleRows?: PreviewGoogleFieldRow[];
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
    multipass_remaining: '10',
    bundle_size: '10',
    bundle_price: '25.00',
    stamp_display: '0 / 10',
    perks: t('wallet.studio.vip.perks'),
    expiry_days: '365',
    tiers_list: `${t('wallet.studio.vip.badgeBronze')} 5%, ${t('wallet.studio.vip.badgeSilver')} 10%, ${t('wallet.studio.vip.badgeGold')} 15%`,
  };
}

function getGoogleSampleValue(fieldPath: string, ctx: Record<string, string>, t: (key: string) => string): string {
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
}

/**
 * @description Google Wallet card preview with hero image, logo, and barcode.
 * @param {GoogleWalletCardProps} props - Component props
 * @returns JSX.Element
 */
export function GoogleWalletCard({
  form, selectedType, logoPreview, stripPreview, barcodeType, customerName, walletDesign,
}: GoogleWalletCardProps) {
  const { t } = useI18n();
  const bgColor = form.background_color || '#1a1a2e';
  const textColor = form.text_color || '#ffffff';
  const heroImage = walletDesign?.googleHeroImageUrl || stripPreview || form.strip_image_url;
  const logoImage = walletDesign?.googleProgramLogoUrl || logoPreview;
  const ctx = buildContext(form, customerName, t);

  const googleRows = walletDesign?.googleRows;
  const hasCustomRows = googleRows && googleRows.length > 0;

  const defaultRows: Array<{ label: string; value: string }> = [
    { label: t('wallet.preview.member'), value: customerName || t('wallet.preview.customer') },
  ];
  switch (form.card_type) {
    case 'stamp':             defaultRows.push({ label: t('wallet.preview.defaultHeader.stamp'), value: '0 / 10' }); break;
    case 'cashback':          defaultRows.push({ label: t('wallet.preview.defaultHeader.cashback'), value: '$0.00' }, { label: t('wallet.studio.cashback.percentage'), value: '10%' }); break;
    case 'coupon':            defaultRows.push({ label: t('wallet.preview.business'), value: ctx.program_name || t('wallet.preview.business') }, { label: t('wallet.preview.offer'), value: form.name || t('wallet.preview.offer') }, { label: t('wallet.preview.uses'), value: '0 / 1' }, { label: t('wallet.preview.validUntil'), value: t('wallet.preview.validUntilDate') }, { label: t('wallet.preview.terms'), value: form.description || t('wallet.preview.terms') }); break;
    case 'vip_membership':    defaultRows.push({ label: t('wallet.preview.membership'), value: t('wallet.studio.vip.defaultName') }); break;
    case 'referral_pass':     defaultRows.push({ label: t('wallet.preview.business'), value: ctx.program_name || t('wallet.preview.business') }, { label: t('wallet.preview.offer'), value: form.name || t('wallet.preview.offer') }, { label: t('wallet.preview.defaultHeader.referral'), value: '0' }, { label: t('wallet.studio.affiliate.codePattern'), value: 'REF-XXXX' }, { label: t('wallet.preview.reward'), value: t('wallet.preview.reward') }); break;
    case 'discount':          defaultRows.push({ label: t('wallet.preview.business'), value: ctx.program_name || t('wallet.preview.business') }, { label: t('wallet.preview.offer'), value: form.name || t('wallet.preview.offer') }, { label: t('wallet.preview.tier'), value: t('wallet.studio.vip.badgeBronze') }, { label: t('wallet.preview.currentDiscount'), value: '5%' }); break;
    case 'gift_certificate':  defaultRows.push({ label: t('wallet.preview.defaultHeader.gift'), value: '$0.00' }); break;
    case 'affiliate':         defaultRows.push({ label: t('wallet.preview.affiliateProgram'), value: form.name || t('programs.cardTypes.affiliate') }); break;
    case 'corporate_discount':defaultRows.push({ label: t('wallet.preview.business'), value: ctx.program_name || t('wallet.preview.business') }, { label: t('wallet.preview.offer'), value: form.name || t('wallet.preview.offer') }, { label: t('wallet.preview.corporateDiscount'), value: '10%' }, { label: t('wallet.preview.company'), value: t('wallet.preview.company') }); break;
    case 'multipass':         defaultRows.push({ label: t('wallet.preview.remainingUses'), value: '10' }); break;
  }
  defaultRows.push({ label: t('wallet.preview.passType'), value: GOOGLE_WALLET_TYPES[form.card_type]?.label || t('wallet.preview.loyaltyProgram') });

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
        {/* Hero image */}
        {heroImage && (
          <div className="relative w-full shrink-0" style={{ aspectRatio: '16/7' }}>
            <img src={heroImage} alt={t('wallet.studio.images.hero')} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-10" style={{ background: `linear-gradient(to bottom, transparent, ${bgColor})` }} />
          </div>
        )}

        {/* Logo circle */}
        <div className="flex flex-col items-center px-4 relative z-10 shrink-0" style={{ marginTop: heroImage ? -28 : 12 }}>
          <div className="w-14 h-14 rounded-[18px] overflow-hidden border-2 border-white/10 shadow-lg bg-neutral-900">
            {logoImage ? (
              <img src={logoImage} alt={t('wallet.studio.images.logo')} className="w-full h-full object-cover" />
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
                        {getGoogleSampleValue(item.fieldPath, ctx, t)}
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

        {/* Spacer */}
        <div className="flex-1 min-h-0" />

        {/* Barcode */}
        <div className="px-3 pb-3 pt-1 shrink-0">
          <div className="bg-white rounded-2xl p-2 shadow-sm flex flex-col items-center gap-1">
            <BarcodeSvg type={barcodeType} size={barcodeType === 'code_128' || barcodeType === 'pdf417' ? 68 : 38} />
            <span className="text-[6px] text-black text-opacity-40 font-mono tracking-wider">0000 0000 0000</span>
          </div>
        </div>
      </div>
    </Pixel7Frame>
  );
}
