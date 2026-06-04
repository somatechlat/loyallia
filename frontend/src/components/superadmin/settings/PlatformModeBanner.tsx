'use client';
import { AlertCircle, CheckCircle } from '@/components/ui/LucideIcons';
import { useI18n } from '@/lib/i18n';

/**
 * Props for the PlatformModeBanner component.
 */
interface PlatformModeBannerProps {
  /** Current platform mode */
  platformMode: 'development' | 'production';
}

/**
 * @description Banner indicating whether the platform is in development or production mode.
 * @param {PlatformModeBannerProps} props - Component props
 * @returns JSX.Element
 */
export default function PlatformModeBanner({ platformMode }: PlatformModeBannerProps) {
  const { t } = useI18n();
  return (
    <div
      className={`rounded-2xl border p-5 ${
        platformMode === 'development'
          ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700'
          : 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700'
      }`}
    >
      <div className="flex items-center gap-3">
        {platformMode === 'development' ? (
          <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
        ) : (
          <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
        )}
        <div>
          <p
            className={`text-sm font-bold uppercase ${
              platformMode === 'development'
                ? 'text-amber-800 dark:text-amber-300'
                : 'text-emerald-800 dark:text-emerald-300'
            }`}
          >
            {platformMode === 'development' ? t('superadmin.settings.platformMode.development') : t('superadmin.settings.platformMode.production')}
          </p>
          <p
            className={`text-xs ${
              platformMode === 'development'
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-emerald-700 dark:text-emerald-400'
            }`}
          >
            {platformMode === 'development'
              ? t('superadmin.settings.platformMode.developmentDesc')
              : t('superadmin.settings.platformMode.productionDesc')}
          </p>
        </div>
      </div>
    </div>
  );
}
