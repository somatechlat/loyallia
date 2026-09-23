import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { AppleWalletCard, AppleWalletBackCard } from '@/components/wallet/AppleWalletPreview';
import { GoogleWalletCard } from '@/components/wallet/GoogleWalletPreview';
import type { WalletPassStudioState } from '@/components/wallet/types/unified-state';

/**
 * @description Toggle switch between Apple Wallet and Google Wallet previews.
 * @param {Object} props - Component props
 * @param {'apple' | 'google'} props.platform - Active platform
 * @param {(p: 'apple' | 'google') => void} props.onChange - Platform change handler
 * @returns JSX.Element
 */
function PlatformToggle({ platform, onChange }: {
  platform: 'apple' | 'google';
  onChange: (p: 'apple' | 'google') => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex justify-center mb-4">
      <div className="inline-flex bg-surface-200 dark:bg-surface-700 rounded-full p-1.5 gap-1">
        <button
          type="button"
          onClick={() => onChange('apple')}
          className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-2
            ${platform === 'apple'
              ? 'bg-white dark:bg-surface-600 text-surface-900 dark:text-white shadow-md'
              : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'}`}
          id="toggle-apple"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
          {t('wallet.appleWallet')}
        </button>
        <button
          type="button"
          onClick={() => onChange('google')}
          className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-2
            ${platform === 'google'
              ? 'bg-white dark:bg-surface-600 text-surface-900 dark:text-white shadow-md'
              : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'}`}
          id="toggle-google"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C6.477 2 1.545 6.932 1.545 13s4.932 11 11 11c6.068 0 11-4.932 11-11 0-.73-.074-1.44-.213-2.128H12.545z"/></svg>
          {t('wallet.googleWallet')}
        </button>
      </div>
    </div>
  );
}

/**
 * @description Live wallet card preview with platform toggle for Apple and Google Wallet.
 * @param {Object} props - Component props
 * @param {CardProps['form']} props.form - Program form data
 * @param {CardProps['selectedType']} props.selectedType - Selected card type
 * @param {string | null} [props.logoPreview] - Logo preview URL
 * @param {string | null} [props.stripPreview] - Strip preview URL
 * @param {string} [props.barcodeType='qr_code'] - Barcode type
 * @param {'apple' | 'google'} [props.walletPlatform='apple'] - Active wallet platform
 * @param {(platform: 'apple' | 'google') => void} [props.onWalletPlatformChange] - Platform change handler
 * @param {string} [props.customerName] - Customer name
 * @param {unknown} [props.walletDesign] - Wallet design state
 * @returns JSX.Element
 */
export default function WalletCardPreview({
  form,
  selectedType,
  logoPreview,
  stripPreview,
  barcodeType = 'qr_code',
  walletPlatform = 'apple',
  onWalletPlatformChange,
  customerName,
}: {
  form: { name: string; description: string; background_color: string; text_color: string; central_background?: string; card_type: string; strip_image_url?: string };
  selectedType?: { value: string; icon: string };
  logoPreview?: string | null;
  stripPreview?: string | null;
  barcodeType?: string;
  walletPlatform?: 'apple' | 'google';
  onWalletPlatformChange?: (platform: 'apple' | 'google') => void;
  customerName?: string;
  walletDesign?: WalletPassStudioState;
}) {
  const { t } = useI18n();
  const [platform, setPlatform] = useState(walletPlatform);

  useEffect(() => {
    if (walletPlatform !== platform) {
      setPlatform(walletPlatform);
    }
  }, [walletPlatform]);

  const handlePlatformChange = (next: 'apple' | 'google') => {
    setPlatform(next);
    onWalletPlatformChange?.(next);
  };

  const [showAppleBack, setShowAppleBack] = useState(false);

  return (
    <div className="relative w-full flex flex-col items-center" style={{ maxWidth: 320 }}>
      <PlatformToggle platform={platform} onChange={handlePlatformChange} />
      {platform === 'apple' ? (
        <div className="flex flex-col items-center">
          {showAppleBack ? (
            <AppleWalletBackCard
              form={form}
              customerName={customerName}
            />
          ) : (
            <AppleWalletCard
              form={form}
              selectedType={selectedType}
              logoPreview={logoPreview}
              stripPreview={stripPreview}
              barcodeType={barcodeType}
              customerName={customerName}
            />
          )}
          <button
            onClick={() => setShowAppleBack(v => !v)}
            className="mt-3 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-medium text-surface-300 transition-colors border border-white/10"
            type="button"
          >
            {showAppleBack ? t('programs.walletCardPreview.frontCard') : t('programs.walletCardPreview.backCard')}
          </button>
        </div>
      ) : (
        <GoogleWalletCard
          form={form}
          selectedType={selectedType}
          logoPreview={logoPreview}
          stripPreview={stripPreview}
          barcodeType={barcodeType}
          customerName={customerName}
        />
      )}
      <p className="text-center text-xs text-surface-400 mt-4 font-medium">
        {t('programs.walletCardPreview.preview')} — {platform === 'apple' ? t('wallet.appleWallet') : t('wallet.googleWallet')}
      </p>
    </div>
  );
}
