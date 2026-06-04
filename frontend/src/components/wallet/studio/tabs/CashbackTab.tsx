/**
 * Cashback card configuration tab.
 */

'use client';

import React, { useCallback, useMemo } from 'react';
import type { CashbackCardConfig } from '@/components/wallet/types/card-type-config';
import { IconPicker } from '@/components/wallet/studio/IconPicker';
import { useI18n } from '@/lib/i18n';

export interface CashbackTabProps {
  config: CashbackCardConfig;
  onChange: (config: Partial<CashbackCardConfig>) => void;
}

function ProgressRingPreview({ percentage, color }: { percentage: number; color: string }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex items-center justify-center py-2">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="6"
          className="dark:stroke-neutral-700"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 40 40)"
        />
        <text
          x="40"
          y="40"
          textAnchor="middle"
          dominantBaseline="central"
          className="text-[14px] font-bold fill-neutral-800 dark:fill-neutral-100"
        >
          {percentage}%
        </text>
      </svg>
    </div>
  );
}

export function CashbackTab({ config, onChange }: CashbackTabProps) {
  const { t } = useI18n();

  const handleNumberChange = useCallback(
    (field: keyof CashbackCardConfig, min: number, max: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      if (!Number.isNaN(value) && value >= min && value <= max) {
        onChange({ [field]: value } as Partial<CashbackCardConfig>);
      }
    },
    [onChange]
  );

  const handleTextChange = useCallback(
    (field: keyof CashbackCardConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ [field]: e.target.value } as Partial<CashbackCardConfig>);
    },
    [onChange]
  );

  const percentage = useMemo(() => {
    return Math.max(0, Math.min(100, config.cashbackPercentage));
  }, [config.cashbackPercentage]);

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        {t('wallet.studio.cashback.title')}
      </h3>

      {/* Cashback percentage */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.cashback.percentage')}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            value={percentage}
            onChange={handleNumberChange('cashbackPercentage', 0, 100)}
            className="flex-1"
            data-testid="cashback-percentage-slider"
          />
          <input
            type="number"
            min={0}
            max={100}
            value={percentage}
            onChange={handleNumberChange('cashbackPercentage', 0, 100)}
            className="w-16 px-2 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 text-center"
            data-testid="cashback-percentage-input"
          />
          <span className="text-sm text-neutral-500 dark:text-neutral-400">%</span>
        </div>
      </div>

      {/* Minimum purchase */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.cashback.minPurchase')}
        </label>
        <input
          type="number"
          min={0}
          value={config.minimumPurchase}
          onChange={handleNumberChange('minimumPurchase', 0, 999999)}
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="minimum-purchase-input"
        />
      </div>

      {/* Credit expiry days */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.cashback.creditExpiry')}
        </label>
        <input
          type="number"
          min={0}
          value={config.creditExpiryDays}
          onChange={handleNumberChange('creditExpiryDays', 0, 9999)}
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="credit-expiry-input"
        />
      </div>

      {/* Tier name */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.cashback.tierName')}
        </label>
        <input
          type="text"
          value={config.tierName ?? ''}
          onChange={handleTextChange('tierName')}
          placeholder={t('wallet.studio.cashback.tierNamePlaceholder')}
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="tier-name-input"
        />
      </div>

      {/* Tier badge */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.cashback.tierBadge')}
        </label>
        <IconPicker
          value={config.tierBadge}
          onChange={(iconId) => onChange({ tierBadge: iconId })}
          category="badge"
        />
      </div>

      {/* Progress ring color */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.cashback.progressRingColor')}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={config.progressRingColor}
            onChange={(e) => onChange({ progressRingColor: e.target.value })}
            className="w-10 h-10 rounded-lg border border-neutral-300 dark:border-neutral-700 cursor-pointer p-0 overflow-hidden"
            data-testid="progress-ring-color-input"
          />
          <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">{config.progressRingColor}</span>
        </div>
      </div>

      {/* Coin icon */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.cashback.coinIcon')}
        </label>
        <IconPicker
          value={config.coinIcon}
          onChange={(iconId) => onChange({ coinIcon: iconId })}
          category="finance"
        />
      </div>

      {/* Live preview */}
      <div className="space-y-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 p-4">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.cashback.preview')}
        </label>
        <ProgressRingPreview percentage={percentage} color={config.progressRingColor} />
      </div>
    </div>
  );
}
