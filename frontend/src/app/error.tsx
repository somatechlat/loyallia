'use client';
import { useI18n } from '@/lib/i18n';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-surface-900 dark:text-white mb-4">{t('error.title')}</h2>
        <p className="text-surface-600 dark:text-surface-400 mb-6">{t('error.description')}</p>
        <button onClick={reset} className="px-6 py-2.5 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 transition-colors">
          {t('error.retry')}
        </button>
      </div>
    </div>
  );
}
