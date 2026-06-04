/**
 * Discount card configuration tab.
 */

'use client';

import React, { useCallback } from 'react';
import type { DiscountCardConfig } from '@/components/wallet/types/card-type-config';
import { useI18n } from '@/lib/i18n';

export interface DiscountTabProps {
  config: DiscountCardConfig;
  onChange: (config: Partial<DiscountCardConfig>) => void;
}

function DiscountPreview({ config }: { config: DiscountCardConfig }) {
  const { t } = useI18n();

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 space-y-3">
      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{t('wallet.studio.discount.levelsTitle')}</p>
      {config.tiers.length === 0 ? (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center py-2">
          {t('wallet.studio.discount.noLevels')}
        </p>
      ) : (
        <div className="space-y-2">
          {config.tiers.map((tier, i) => {
            const isCompact = config.percentageDisplayStyle === 'compact';
            return (
              <div
                key={i}
                className="flex items-center gap-2 p-2 rounded-md bg-neutral-50 dark:bg-neutral-700/50"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: config.progressBarColor }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">
                    {tier.tierName}
                  </p>
                  {!isCompact && (
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      {t('wallet.studio.discount.fromThreshold', { threshold: tier.threshold })}
                    </p>
                  )}
                </div>
                <span
                  className={`text-xs font-bold ${
                    config.percentageDisplayStyle === 'badge'
                      ? 'px-2 py-0.5 rounded-full bg-blue-600 text-white'
                      : 'text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {tier.discountPercentage}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DiscountTab({ config, onChange }: DiscountTabProps) {
  const { t } = useI18n();

  const DISPLAY_STYLES: Array<{ value: NonNullable<DiscountCardConfig['percentageDisplayStyle']>; label: string }> = [
    { value: 'compact', label: t('wallet.studio.discount.compact') },
    { value: 'expanded', label: t('wallet.studio.discount.expanded') },
    { value: 'badge', label: t('wallet.studio.discount.badge') },
  ];

  const addTier = useCallback(() => {
    const next = [
      ...config.tiers,
      { tierName: `Nivel ${config.tiers.length + 1}`, threshold: 0, discountPercentage: 5 },
    ];
    onChange({ tiers: next });
  }, [config.tiers, onChange]);

  const removeTier = useCallback(
    (index: number) => {
      const next = [...config.tiers];
      next.splice(index, 1);
      onChange({ tiers: next });
    },
    [config.tiers, onChange]
  );

  const updateTier = useCallback(
    (index: number, field: 'tierName' | 'threshold' | 'discountPercentage', value: string | number) => {
      const next = config.tiers.map((tier, i) => (i === index ? { ...tier, [field]: value } : tier));
      onChange({ tiers: next });
    },
    [config.tiers, onChange]
  );

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        {t('wallet.studio.discount.title')}
      </h3>

      {/* Tiers */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.discount.levels')}
        </label>
        {config.tiers.map((tier, i) => (
          <div
            key={i}
            className="flex items-center gap-2 p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            data-testid={`tier-row-${i}`}
          >
            <input
              type="text"
              value={tier.tierName}
              onChange={(e) => updateTier(i, 'tierName', e.target.value)}
              placeholder={t('wallet.studio.discount.tierName')}
              className="flex-1 min-w-0 px-2 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              data-testid={`tier-name-${i}`}
            />
            <input
              type="number"
              min={0}
              value={tier.threshold}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!Number.isNaN(value) && value >= 0) {
                  updateTier(i, 'threshold', value);
                }
              }}
              placeholder={t('wallet.studio.discount.threshold')}
              className="w-20 px-2 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              data-testid={`tier-threshold-${i}`}
            />
            <input
              type="number"
              min={0}
              max={100}
              value={tier.discountPercentage}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!Number.isNaN(value) && value >= 0 && value <= 100) {
                  updateTier(i, 'discountPercentage', value);
                }
              }}
              placeholder={t('wallet.studio.discount.percentage')}
              className="w-16 px-2 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500 text-center"
              data-testid={`tier-percentage-${i}`}
            />
            <button
              type="button"
              onClick={() => removeTier(i)}
              className="p-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              aria-label={t('wallet.studio.discount.deleteLevel')}
              data-testid={`remove-tier-${i}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addTier}
          className="w-full px-3 py-2 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 text-sm text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
          data-testid="add-tier-btn"
        >
          {t('wallet.studio.discount.addLevel')}
        </button>
      </div>

      {/* Tier indicator ring color */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.discount.tierColor')}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={config.progressBarColor}
            onChange={(e) => onChange({ progressBarColor: e.target.value })}
            className="w-10 h-10 rounded-lg border border-neutral-300 dark:border-neutral-700 cursor-pointer p-0 overflow-hidden"
            data-testid="tier-color-input"
          />
          <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">{config.progressBarColor}</span>
        </div>
      </div>

      {/* Percentage display style */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.discount.displayStyle')}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {DISPLAY_STYLES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ percentageDisplayStyle: opt.value })}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                config.percentageDisplayStyle === opt.value
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500'
              }`}
              data-testid={`display-style-${opt.value}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live preview */}
      <div className="space-y-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 p-4">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.discount.preview')}
        </label>
        <DiscountPreview config={config} />
      </div>
    </div>
  );
}
