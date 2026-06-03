'use client';

import { useI18n } from '@/lib/i18n';
import type { WalletPlatform, ProgramOption } from './CampaignWizard';

interface PlatformSelectorProps {
  programs: ProgramOption[];
  programCounts: Record<string, { total: number; apple: number; google: number }>;
  selectedPlatform: WalletPlatform;
  selectedProgramId: string | 'all';
  onSelect: (platform: WalletPlatform) => void;
}

export default function PlatformSelector({
  programs,
  programCounts,
  selectedPlatform,
  selectedProgramId,
  onSelect,
}: PlatformSelectorProps) {
  const { t } = useI18n();

  const platforms: { key: WalletPlatform; emoji: string; labelKey: string }[] = [
    { key: 'both', emoji: '✓', labelKey: 'wallet.both' },
    { key: 'apple', emoji: '🍎', labelKey: 'wallet.appleWallet' },
    { key: 'google', emoji: '🤖', labelKey: 'wallet.googleWallet' },
  ];

  return (
    <div className="flex gap-3">
      {platforms.map(({ key, emoji, labelKey }) => {
        const isSelected = selectedPlatform === key;
        const counts = selectedProgramId === 'all'
          ? { apple: 0, google: 0 }
          : programCounts[selectedProgramId] || { apple: 0, google: 0 };
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={`flex-1 text-left p-4 rounded-xl border-2 transition-all duration-200
              ${isSelected
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-md'
                : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-surface-300'
              }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{emoji}</span>
              <span className="font-semibold text-sm">{t(labelKey)}</span>
              {isSelected && (
                <svg className="w-4 h-4 text-brand-500 ml-auto" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              )}
            </div>
            {selectedProgramId !== 'all' && (
              <p className="text-xs text-brand-600 dark:text-brand-400 font-bold mt-2">
                {key === 'apple' && `🍎 ${counts.apple.toLocaleString()}`}
                {key === 'google' && `🤖 ${counts.google.toLocaleString()}`}
                {key === 'both' && `👥 ${(counts.apple + counts.google).toLocaleString()}`}
                {' '}{t('campaigns.clients')}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
