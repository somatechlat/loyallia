'use client';
import { useI18n } from '@/lib/i18n';
import { AlertTriangle } from '@/components/ui/LucideIcons';

/**
 * Props for the WalletNotificationPreview component.
 */
interface WalletNotificationPreviewProps {
  /** Notification title (used by Google Wallet; ignored by Apple Wallet) */
  title: string;
  /** Message body (Google) / field value that triggers the Apple changeMessage */
  message: string;
  /** Target wallet platform for the preview */
  platform?: 'apple' | 'google' | 'both';
  /** Name of the loyalty card */
  cardName?: string;
  /** Primary color of the card */
  cardColor?: string;
}

// Must match backend CAMPAIGN_MESSAGE_MAX_LEN (pass_engine/campaign_message.py).
// Apple last_message is truncated at 120 chars before the changeMessage alert.
const APPLE_MESSAGE_LIMIT = 120;
const GOOGLE_HEADER_LIMIT = 100;
const GOOGLE_BODY_LIMIT = 500;

/**
 * @description Side-by-side preview of wallet notifications for Apple Wallet and Google Wallet.
 * Apple Wallet shows PassKit changeMessage lock-screen semantics (no free-text push).
 * Google Wallet shows a title+body notification.
 * @param {WalletNotificationPreviewProps} props - Component props
 * @returns JSX.Element
 */
export default function WalletNotificationPreview({
  title,
  message,
  platform = 'both',
  cardName,
  cardColor = '#6366f1',
}: WalletNotificationPreviewProps) {
  const { t } = useI18n();
  const resolvedCardName = cardName || t('campaigns.wallet.defaultCardName');

  const appleMessageOver = message.length > APPLE_MESSAGE_LIMIT;
  const googleHeaderOver = title.length > GOOGLE_HEADER_LIMIT;
  const googleBodyOver = message.length > GOOGLE_BODY_LIMIT;

  const showApple = platform === 'apple' || platform === 'both';
  const showGoogle = platform === 'google' || platform === 'both';

  const changeMessagePreview = message
    ? `${t('campaigns.wallet.appleFieldPreviewLabel')} ${message}`
    : t('campaigns.wallet.mockEmptyChangeMessage');

  return (
    <div className={`grid gap-4 ${showApple && showGoogle ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
      {/* Apple Wallet preview */}
      {showApple && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-surface-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.21-1.16 3.81-.99 1.65.17 2.81 1.04 3.52 2.37-.12.07-2.1 1.22-2.08 3.64.02 2.9 2.53 3.86 2.56 3.87-.02.1-.4 1.36-1.89 2.34zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            <span className="text-xs font-medium text-surface-500">{t('wallet.appleWallet')}</span>
            <span className="text-[10px] text-surface-400 bg-surface-100 dark:bg-surface-800 px-1.5 py-0.5 rounded">
              {t('campaigns.wallet.appleBadgeChangeMessage')}
            </span>
          </div>

          {/* iPhone mockup — lock-screen changeMessage */}
          <div className="relative mx-auto w-[220px] bg-black rounded-[36px] p-2.5 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6)] border-[3px] border-transparent bg-gradient-to-b from-gray-700 to-gray-800 bg-clip-padding ring-1 ring-white/20">
            {/* Buttons */}
            <div className="absolute top-20 -left-[3px] w-[2px] h-7 bg-gray-600 rounded-l-sm" />
            <div className="absolute top-32 -left-[3px] w-[2px] h-12 bg-gray-600 rounded-l-sm" />
            <div className="absolute top-28 -right-[3px] w-[2px] h-14 bg-gray-600 rounded-r-sm" />

            <div className="bg-black rounded-[32px] overflow-hidden relative">
              {/* Dynamic Island */}
              <div className="mx-auto mt-2 w-16 h-4 bg-black rounded-full mb-2" />

              <p className="text-[9px] text-surface-500 text-center mb-1.5 px-2">
                {t('campaigns.wallet.lockScreenLabel')}
              </p>

              {/* Lock-screen notification (PassKit changeMessage) */}
              <div className="mx-1 rounded-xl bg-white/85 dark:bg-neutral-700/80 backdrop-blur-xl border border-white/60 dark:border-neutral-600/50 shadow-lg p-2">
                <div className="flex items-center justify-between mb-0.5 gap-1">
                  <p className="text-[9px] font-bold text-neutral-800 dark:text-neutral-100 truncate">
                    {resolvedCardName}
                  </p>
                  <span className="text-[8px] text-neutral-400 dark:text-neutral-500 shrink-0">
                    {t('wallet.studio.notifications.now')}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-700 dark:text-neutral-200 leading-snug break-words">
                  {changeMessagePreview}
                </p>
              </div>

              {/* Pass card with message field */}
              <div className="rounded-xl overflow-hidden shadow-lg mx-1 mt-2 mb-2">
                <div
                  className="px-3 py-2.5 text-white"
                  style={{ backgroundColor: cardColor }}
                >
                  <p className="text-[10px] opacity-80 uppercase tracking-wide">{t('campaigns.wallet.mockLoyaltyCard')}</p>
                  <p className="text-sm font-semibold truncate">{resolvedCardName}</p>
                </div>
                <div className="bg-white dark:bg-surface-800 px-3 py-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-surface-500">{t('campaigns.wallet.mockStamps')}</span>
                    <span className="text-sm font-bold text-brand-600">5 / 10</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-200 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: '50%' }} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 bg-surface-200 rounded flex items-center justify-center">
                      <svg className="w-3 h-3 text-surface-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                    </div>
                    <span className="text-[10px] text-surface-400">{t('campaigns.wallet.mockClientQr')}</span>
                  </div>
                  <div className="pt-1 border-t border-surface-100 dark:border-surface-700">
                    <p className="text-[9px] text-surface-400 uppercase tracking-wider">{t('campaigns.wallet.mockMessage')}</p>
                    <p className="text-[10px] text-surface-600 dark:text-surface-300 leading-snug break-words">
                      {message || t('campaigns.wallet.mockNoMessage')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Platform explainer */}
          <p className="text-[10px] text-surface-500 leading-relaxed">
            {t('campaigns.wallet.appleExplainer')}
          </p>

          {/* Field length counter (field value, not free-text push) */}
          <div className="flex items-center gap-3 text-[10px]">
            <span className={appleMessageOver ? 'text-red-500 font-medium' : 'text-surface-400'}>
              {t('campaigns.wallet.messageCounterLabel')}: {message.length}/{APPLE_MESSAGE_LIMIT}
            </span>
          </div>

          {title.length > 0 && (
            <p className="text-[10px] text-surface-500 leading-relaxed">
              {t('campaigns.wallet.appleTitleIgnored')}
            </p>
          )}
          <p className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
            <AlertTriangle className="w-3 h-3 inline mr-1" />{t('campaigns.wallet.appleNoChangeWarning')}
          </p>
        </div>
      )}

      {/* Google Wallet preview */}
      {showGoogle && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-surface-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
            </svg>
            <span className="text-xs font-medium text-surface-500">{t('wallet.googleWallet')}</span>
            <span className="text-[10px] text-surface-400 bg-surface-100 dark:bg-surface-800 px-1.5 py-0.5 rounded">
              {t('campaigns.wallet.googleBadgeVisible')}
            </span>
          </div>

          {/* Android / Google Pass mockup */}
          <div className="relative mx-auto w-[240px] bg-black rounded-[32px] p-2.5 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6)] border-[3px] border-transparent bg-gradient-to-b from-gray-700 to-gray-800 bg-clip-padding ring-1 ring-white/20">
            {/* Buttons */}
            <div className="absolute top-20 -left-[3px] w-[2px] h-6 bg-gray-600 rounded-l-sm" />
            <div className="absolute top-36 -left-[3px] w-[2px] h-6 bg-gray-600 rounded-l-sm" />
            <div className="absolute top-24 -right-[3px] w-[2px] h-8 bg-gray-600 rounded-r-sm" />

            <div className="bg-black rounded-[28px] overflow-hidden relative">
              {/* Camera notch bar */}
              <div className="mx-auto mt-1.5 w-20 h-1 bg-gray-700 rounded-full mb-2" />

              {/* Pass card */}
              <div className="rounded-xl overflow-hidden shadow-md mx-1">
                <div
                  className="px-3 py-2.5 text-white"
                  style={{ backgroundColor: cardColor }}
                >
                  <p className="text-[10px] opacity-80">{resolvedCardName}</p>
                  <p className="text-sm font-semibold">{t('campaigns.wallet.mockLoyaltyProgram')}</p>
                </div>
                <div className="bg-white dark:bg-surface-900 px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-surface-500">{t('campaigns.wallet.mockPoints')}</span>
                    <span className="text-sm font-bold text-brand-600">50</span>
                  </div>
                </div>
              </div>

              {/* Message card overlay */}
              <div className="mt-2 mx-1 bg-white dark:bg-surface-900 rounded-xl shadow-lg border border-surface-200 dark:border-surface-700 overflow-hidden">
                <div className="px-3 py-2 bg-surface-50 dark:bg-surface-800 border-b border-surface-100 dark:border-surface-700">
                  <p className="text-[10px] text-surface-400 font-medium uppercase tracking-wider">{t('campaigns.wallet.mockMessage')}</p>
                </div>
                <div className="px-3 py-2.5 space-y-1">
                  <p className="text-xs font-semibold text-surface-900 dark:text-white truncate">
                    {title || t('campaigns.wallet.mockNoTitle')}
                  </p>
                  <p className="text-[11px] text-surface-600 dark:text-surface-300 leading-relaxed line-clamp-3">
                    {message || t('campaigns.wallet.mockNoMessage')}
                  </p>
                </div>
              </div>

              <p className="text-[9px] text-surface-500 text-center mt-2 mb-2 px-2 leading-relaxed">
                {t('campaigns.wallet.googleExplainer')}
              </p>
            </div>
          </div>

          {/* Character counters */}
          <div className="flex items-center gap-3 text-[10px]">
            <span className={googleHeaderOver ? 'text-red-500 font-medium' : 'text-surface-400'}>
              {t('campaigns.wallet.headerCounterLabel')}: {title.length}/{GOOGLE_HEADER_LIMIT}
            </span>
            <span className={googleBodyOver ? 'text-red-500 font-medium' : 'text-surface-400'}>
              {t('campaigns.wallet.bodyCounterLabel')}: {message.length}/{GOOGLE_BODY_LIMIT}
            </span>
          </div>
          {(googleHeaderOver || googleBodyOver) && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
              <AlertTriangle className="w-3 h-3 inline mr-1" />{t('campaigns.wallet.googleTruncateWarning')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
