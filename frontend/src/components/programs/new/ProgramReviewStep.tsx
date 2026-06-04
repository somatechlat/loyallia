import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { CardTypeIcon, BARCODE_TYPES } from '@/components/programs/constants';
import WalletCardPreview from '@/components/programs/WalletCardPreview';
import type { AppleWalletFeatureConfig } from '@/components/programs/WalletCardPreview';
import type { WalletDesignState } from '@/components/wallet/types';
import { APPLE_FIELD_GROUPS } from '@/components/programs/constants';

/** Translation keys for all program metadata keys — prevents mixed languages in review step. */
const META_LABEL_KEYS: Record<string, string> = {
  // Stamp
  stamp_type: 'programs.metaLabels.stampType',
  consumption_per_stamp: 'programs.metaLabels.consumptionPerStamp',
  stamps_required: 'programs.metaLabels.stampsRequired',
  reward_description: 'programs.metaLabels.rewardDescription',
  stamp_expiry: 'programs.metaLabels.stampExpiry',
  stamp_start_date: 'programs.metaLabels.startDate',
  stamp_end_date: 'programs.metaLabels.endDate',
  stamps_at_issue: 'programs.metaLabels.stampsAtIssue',
  daily_stamp_limit: 'programs.metaLabels.dailyStampLimit',
  birthday_stamps: 'programs.metaLabels.birthdayStamps',
  // Coupon
  discount_type: 'programs.metaLabels.discountType',
  discount_value: 'programs.metaLabels.discountValue',
  special_promotion_text: 'programs.metaLabels.specialPromotionText',
  coupon_expiry: 'programs.metaLabels.couponExpiry',
  coupon_start_date: 'programs.metaLabels.startDate',
  coupon_end_date: 'programs.metaLabels.endDate',
  usage_limit_per_customer: 'programs.metaLabels.usageLimitPerCustomer',
  coupon_description: 'programs.metaLabels.couponDescription',
  coupon_image_url: 'programs.metaLabels.couponImageUrl',
  push_title: 'programs.metaLabels.pushTitle',
  push_message: 'programs.metaLabels.pushMessage',
  push_expiry_reminder: 'programs.metaLabels.pushExpiryReminder',
  // Cashback
  cashback_percentage: 'programs.metaLabels.cashbackPercentage',
  minimum_purchase: 'programs.metaLabels.minimumPurchase',
  credit_expiry_days: 'programs.metaLabels.creditExpiryDays',
  // Discount
  tiers: 'programs.metaLabels.tiers',
  // Gift
  denominations: 'programs.metaLabels.denominations',
  expiry_days: 'programs.metaLabels.expiryDays',
  // VIP
  membership_name: 'programs.metaLabels.membershipName',
  monthly_fee: 'programs.metaLabels.monthlyFee',
  annual_fee: 'programs.metaLabels.annualFee',
  validity_period: 'programs.metaLabels.validityPeriod',
  // Referral
  referrer_reward: 'programs.metaLabels.referrerReward',
  referee_reward: 'programs.metaLabels.refereeReward',
  max_referrals_per_customer: 'programs.metaLabels.maxReferralsPerCustomer',
  // Multipass
  bundle_size: 'programs.metaLabels.bundleSize',
  bundle_price: 'programs.metaLabels.bundlePrice',
};

/**
 * Program form data shape used in the review step.
 */
type ProgramForm = {
  name: string;
  card_type: string;
  description: string;
  background_color: string;
  text_color: string;
  logo_url: string;
  strip_image_url: string;
  icon_url: string;
  barcode_type: string;
  locations: Array<{ lat: number; lng: number; name: string }>;
};

/**
 * Selected card type option or undefined.
 */
type SelectedType = {
  value: string;
  label: string;
  icon: string;
  desc: string;
} | undefined;

/**
 * Props for the ProgramReviewStep component.
 */
interface ProgramReviewStepProps {
  /** Program form data */
  form: ProgramForm;
  /** Program metadata */
  meta: Record<string, unknown>;
  /** Selected card type */
  selectedType: SelectedType;
  /** Active wallet provider */
  walletProvider: 'apple' | 'google';
  /** Wallet provider change handler */
  setWalletProvider: (value: 'apple' | 'google') => void;
  /** Apple Wallet feature configuration */
  appleWalletConfig: AppleWalletFeatureConfig;
  /** Wallet design state */
  walletDesign?: WalletDesignState;
}

/**
 * @description Small checkmark or empty circle indicator.
 * @param {Object} props - Component props
 * @param {boolean} props.filled - Whether to show a filled checkmark
 * @returns JSX.Element
 */
function Checkmark({ filled }: { filled: boolean }) {
  return filled ? (
    <span className="text-green-500 text-sm">✓</span>
  ) : (
    <span className="text-surface-300 dark:text-surface-600 text-sm">○</span>
  );
}

/**
 * @description Final review step of the program wizard with a live wallet preview.
 * @param {ProgramReviewStepProps} props - Component props
 * @returns JSX.Element
 */
export default function ProgramReviewStep({
  form,
  meta,
  selectedType,
  walletProvider,
  setWalletProvider,
  appleWalletConfig,
  walletDesign,
}: ProgramReviewStepProps) {
  const { t } = useI18n();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const appleImages = walletDesign ? [
    { labelKey: 'programs.walletPreview.logo', url: walletDesign.appleLogoUrl },
    { labelKey: 'programs.walletPreview.logo2x', url: walletDesign.appleLogo2xUrl },
    { labelKey: 'programs.walletPreview.icon', url: walletDesign.appleIconUrl },
    { labelKey: 'programs.walletPreview.icon2x', url: walletDesign.appleIcon2xUrl },
    { labelKey: 'programs.walletPreview.strip', url: walletDesign.appleStripUrl },
    { labelKey: 'programs.walletPreview.strip2x', url: walletDesign.appleStrip2xUrl },
    { labelKey: 'programs.walletPreview.thumbnail', url: walletDesign.appleThumbnailUrl },
    { labelKey: 'programs.walletPreview.thumbnail2x', url: walletDesign.appleThumbnail2xUrl },
  ] : [];

  const googleImages = walletDesign ? [
    { labelKey: 'programs.walletPreview.programLogo', url: walletDesign.googleProgramLogoUrl },
    { labelKey: 'programs.walletPreview.heroImage', url: walletDesign.googleHeroImageUrl },
    { labelKey: 'programs.walletPreview.wideLogo', url: walletDesign.googleWideLogoUrl },
    { labelKey: 'programs.walletPreview.additionalImage', url: walletDesign.googleImageModuleUrl },
  ] : [];

  const appleFieldCounts = walletDesign
    ? APPLE_FIELD_GROUPS.map(g => ({
        labelKey: `programs.appleFieldGroups.${g.key}`,
        count: (walletDesign.appleFields[g.key] || []).length,
      }))
    : [];

  const totalAppleFields = appleFieldCounts.reduce((sum, f) => sum + f.count, 0);
  const googleRowCount = walletDesign?.googleRows?.length ?? 0;

  const barcodeLabel = BARCODE_TYPES.find(b => b.value === form.barcode_type)?.label;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      <div className="card p-6 space-y-5">
        <h2 className="text-lg font-bold text-surface-900 dark:text-white">{t('programs.review.title')}</h2>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-surface-100 dark:border-surface-700">
            <span className="text-sm text-surface-500">{t('common.type')}</span>
            <span className="text-sm font-semibold"><CardTypeIcon icon={selectedType?.icon || 'stamp'} className="w-4 h-4 inline-block mr-1" /> {selectedType?.label}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-surface-100 dark:border-surface-700">
            <span className="text-sm text-surface-500">{t('common.name')}</span>
            <span className="text-sm font-semibold">{form.name}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-surface-100 dark:border-surface-700">
            <span className="text-sm text-surface-500">{t('programs.review.code')}</span>
            <span className="text-sm font-semibold">{barcodeLabel || 'QR Code'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-surface-100 dark:border-surface-700">
            <span className="text-sm text-surface-500">{t('programs.review.wallet')}</span>
            <span className="text-sm font-semibold">{walletProvider === 'apple' ? t('wallet.appleWallet') : t('wallet.googleWallet')}</span>
          </div>
          {walletProvider === 'apple' && (
            <div className="flex justify-between py-2 border-b border-surface-100 dark:border-surface-700">
              <span className="text-sm text-surface-500">{t('programs.review.appleNfc')}</span>
              <span className="text-sm font-semibold">
                {appleWalletConfig.nfc_enabled
                  ? appleWalletConfig.nfc_requires_authentication
                    ? t('programs.review.nfcEnabledAuth')
                    : t('programs.review.nfcEnabled')
                  : t('programs.review.nfcDisabled')}
              </span>
            </div>
          )}
          {form.description && (
            <div className="flex justify-between py-2 border-b border-surface-100 dark:border-surface-700">
              <span className="text-sm text-surface-500">{t('programs.description')}</span>
              <span className="text-sm font-medium text-right max-w-[60%]">{form.description}</span>
            </div>
          )}
          {Object.entries(meta).map(([key, value]) => (
            <div key={key} className="flex justify-between py-2 border-b border-surface-100 dark:border-surface-700">
              <span className="text-sm text-surface-500">{META_LABEL_KEYS[key] ? t(META_LABEL_KEYS[key]) : key.replace(/_/g, ' ')}</span>
              <span className="text-sm font-medium">
                {value === null || value === undefined
                  ? '—'
                  : typeof value === 'object'
                    ? Array.isArray(value)
                      ? t('programs.review.itemsCount', { count: value.length })
                      : Object.entries(value as Record<string, unknown>)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(', ')
                    : String(value)}
              </span>
            </div>
          ))}
        </div>

        {/* Wallet Design Summary */}
        {walletDesign && (
          <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-4 space-y-3 bg-surface-50 dark:bg-surface-900/40">
            <h3 className="text-sm font-bold text-surface-900 dark:text-white">{t('programs.review.walletDesign')}</h3>

            <div className="flex justify-between py-1 border-b border-surface-100 dark:border-surface-700">
              <span className="text-xs text-surface-500">{t('programs.review.platform')}</span>
              <span className="text-xs font-semibold">{walletDesign.provider === 'apple' ? t('wallet.appleWallet') : t('wallet.googleWallet')}</span>
            </div>

            {/* Images */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-surface-700 dark:text-surface-200">{t('programs.review.uploadedImages')}</p>
              {walletDesign.provider === 'apple' ? (
                <div className="grid grid-cols-2 gap-1">
                  {appleImages.map(img => (
                    <div key={img.labelKey} className="flex items-center gap-1.5 text-xs">
                      <Checkmark filled={!!img.url} />
                      <span className={img.url ? 'text-surface-700 dark:text-surface-200' : 'text-surface-400 dark:text-surface-500'}>{t(img.labelKey)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1">
                  {googleImages.map(img => (
                    <div key={img.labelKey} className="flex items-center gap-1.5 text-xs">
                      <Checkmark filled={!!img.url} />
                      <span className={img.url ? 'text-surface-700 dark:text-surface-200' : 'text-surface-400 dark:text-surface-500'}>{t(img.labelKey)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fields / Rows */}
            {walletDesign.provider === 'apple' ? (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-surface-700 dark:text-surface-200">{t('programs.review.configuredFields', { count: totalAppleFields })}</p>
                <div className="grid grid-cols-2 gap-1">
                  {appleFieldCounts.map(f => (
                    <div key={f.labelKey} className="flex items-center justify-between text-xs px-2 py-1 bg-white dark:bg-surface-800 rounded border border-surface-100 dark:border-surface-700">
                      <span className="text-surface-500">{t(f.labelKey)}</span>
                      <span className="font-semibold">{f.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex justify-between py-1 border-b border-surface-100 dark:border-surface-700">
                <span className="text-xs text-surface-500">{t('programs.review.configuredRows')}</span>
                <span className="text-xs font-semibold">{googleRowCount}</span>
              </div>
            )}

            {/* NFC status for Apple */}
            {walletDesign.provider === 'apple' && (
              <div className="flex justify-between py-1 border-b border-surface-100 dark:border-surface-700">
                <span className="text-xs text-surface-500">{t('programs.review.nfcStatus')}</span>
                <span className="text-xs font-semibold">
                  {walletDesign.appleNfc.nfc_enabled
                    ? walletDesign.appleNfc.nfc_requires_authentication
                      ? t('programs.review.nfcEnabledAuth')
                      : t('programs.review.nfcEnabled')
                    : t('programs.review.nfcDisabled')}
                </span>
              </div>
            )}

            {/* Advanced settings toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full text-left text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium flex items-center gap-1"
            >
              {showAdvanced ? '▼' : '▶'} {t('programs.review.advancedSettings')}
            </button>
            {showAdvanced && walletDesign.provider === 'apple' && (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-surface-500">{t('programs.review.suppressStripShine')}</span>
                  <span className="font-medium">{walletDesign.appleAdvanced.suppressStripShine ? t('common.yes') : t('common.no')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">{t('programs.review.sharingProhibited')}</span>
                  <span className="font-medium">{walletDesign.appleAdvanced.sharingProhibited ? t('common.yes') : t('common.no')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">{t('programs.review.voided')}</span>
                  <span className="font-medium">{walletDesign.appleAdvanced.voided ? t('common.yes') : t('common.no')}</span>
                </div>
                {walletDesign.appleAdvanced.nfcMessage && (
                  <div className="flex justify-between">
                    <span className="text-surface-500">{t('programs.review.nfcMessage')}</span>
                    <span className="font-medium">{walletDesign.appleAdvanced.nfcMessage}</span>
                  </div>
                )}
                {walletDesign.appleAdvanced.expirationDate && (
                  <div className="flex justify-between">
                    <span className="text-surface-500">{t('programs.review.expiration')}</span>
                    <span className="font-medium">{walletDesign.appleAdvanced.expirationDate}</span>
                  </div>
                )}
              </div>
            )}
            {showAdvanced && walletDesign.provider === 'google' && (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-surface-500">{t('programs.review.reviewStatus')}</span>
                  <span className="font-medium">{walletDesign.googleAdvanced.reviewStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">{t('programs.review.allowMultipleUsers')}</span>
                  <span className="font-medium">{walletDesign.googleAdvanced.allowMultipleUsers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">{t('programs.review.notifyChanges')}</span>
                  <span className="font-medium">{walletDesign.googleAdvanced.notifyPreference ? t('common.yes') : t('common.no')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">{t('programs.review.additionalLinks')}</span>
                  <span className="font-medium">{walletDesign.googleAdvanced.linksModuleUris.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">{t('programs.review.messages')}</span>
                  <span className="font-medium">{walletDesign.googleAdvanced.messages.length}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Wallet features info */}
        <div className="bg-brand-50 border border-brand-100 dark:bg-brand-900/20 dark:border-brand-800 rounded-xl p-4 text-sm space-y-2">
          <p className="font-semibold text-brand-800 dark:text-brand-200">{t('programs.review.includedFeatures')}</p>
          <ul className="text-brand-700 dark:text-brand-300 text-xs space-y-1 ml-4 list-disc">
            <li>{t('programs.review.digitalCard', { wallet: walletProvider === 'apple' ? t('wallet.appleWallet') : t('wallet.googleWallet') })}</li>
            <li>{t('programs.review.uniqueQr')}</li>
            <li>{t('programs.review.geoPush')}</li>
            <li>{t('programs.review.realTimeUpdate')}</li>
            {walletProvider === 'apple' && appleWalletConfig.nfc_enabled && (
              <li>{t('programs.review.nfcAppleNote')}</li>
            )}
          </ul>
        </div>
      </div>

      {/* Preview */}
      <div className="sticky top-24 self-start bg-gradient-to-b from-surface-100 to-surface-200 dark:from-surface-800 dark:to-surface-900 rounded-2xl p-6 shadow-inner">
        <WalletCardPreview
          form={form}
          selectedType={selectedType}
          barcodeType={form.barcode_type}
          walletPlatform={walletProvider}
          onWalletPlatformChange={setWalletProvider}
          walletDesign={walletDesign}
        />
      </div>
    </div>
  );
}
