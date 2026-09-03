/**
 * Multipass configuration tab.
 */

'use client';

import React, { useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { useCallback } from 'react';
import type { MultipassCardConfig } from '@/components/wallet/types/card-type-config';
import { IconPicker } from '@/components/wallet/studio/IconPicker';

export interface MultipassTabProps {
  config: MultipassCardConfig;
  onChange: (config: Partial<MultipassCardConfig>) => void;
}

const INDICATOR_STYLES: Array<{ value: NonNullable<MultipassCardConfig['indicatorStyle']>; label: string }> = [
  { value: 'numeric', label: 'Numérico' },
  { value: 'visual', label: 'Visual' },
  { value: 'minimal', label: 'Minimal' },
];

export function MultipassTab({ config, onChange }: MultipassTabProps) {
  const { t } = useI18n();
  const handleNumberChange = useCallback(
    (field: keyof MultipassCardConfig, min: number, max: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      if (!Number.isNaN(value) && value >= min && value <= max) {
        onChange({ [field]: value } as Partial<MultipassCardConfig>);
      }
    },
    [onChange]
  );

  const handleTextChange = useCallback(
    (field: keyof MultipassCardConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ [field]: e.target.value } as Partial<MultipassCardConfig>);
    },
    [onChange]
  );

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">
        t('wallet.studio.multipass.configTitle')
      </h3>

      {/* Bundle size */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          t('wallet.studio.multipass.bundleSize')
        </label>
        <input
          type="number"
          min={1}
          max={100}
          value={config.bundleSize}
          onChange={handleNumberChange('bundleSize', 1, 100)}
          className="w-full px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="bundle-size-input"
        />
      </div>

      {/* Bundle price */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          t('wallet.studio.multipass.bundlePrice')
        </label>
        <input
          type="number"
          min={0}
          value={config.bundlePrice}
          onChange={handleNumberChange('bundlePrice', 0, 999999)}
          className="w-full px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="bundle-price-input"
        />
      </div>

      {/* Pass type label */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          t('wallet.studio.multipass.passTypeLabel')
        </label>
        <input
          type="text"
          value={config.passTypeLabel}
          onChange={handleTextChange('passTypeLabel')}
          placeholder="Ej: Clases de yoga"
          className="w-full px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="pass-label-input"
        />
      </div>

      {/* Ticket icon */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          t('wallet.studio.multipass.ticketIcon')
        </label>
        <IconPicker
          value={config.ticketGraphic}
          onChange={(iconId) => onChange({ ticketGraphic: iconId })}
          category="transport"
        />
      </div>

      {/* Punch icon */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          t('wallet.studio.multipass.punchIcon')
        </label>
        <IconPicker
          value={config.punchIcon}
          onChange={(iconId) => onChange({ punchIcon: iconId })}
          category="stamp"
        />
      </div>

      {/* Bundle badge style */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          t('wallet.studio.multipass.bundleBadgeStyle')
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['numeric', 'visual', 'minimal'] as const).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => onChange({ bundleBadgeStyle: style })}
              className={`px-2 py-1 rounded-lg border text-xs font-medium transition-colors ${
                config.bundleBadgeStyle === style
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500'
              }`}
              data-testid={`badge-style-${style}`}
            >
              {style === 'numeric' ? 'Numérico' : style === 'visual' ? 'Visual' : 'Minimal'}
            </button>
          ))}
        </div>
      </div>

      {/* Used/remaining indicator style */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          t('wallet.studio.multipass.indicatorStyle')
        </label>
        <div className="grid grid-cols-3 gap-2">
          {INDICATOR_STYLES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ indicatorStyle: opt.value })}
              className={`px-2 py-1 rounded-lg border text-xs font-medium transition-colors ${
                config.indicatorStyle === opt.value
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500'
              }`}
              data-testid={`indicator-style-${opt.value}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
