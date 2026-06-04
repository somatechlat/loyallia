/**
 * Multipass configuration tab.
 */

'use client';

import React, { useCallback } from 'react';
import type { MultipassCardConfig } from '@/components/wallet/types/card-type-config';
import { IconPicker } from '@/components/wallet/studio/IconPicker';
import { useI18n } from '@/lib/i18n';

export interface MultipassTabProps {
  config: MultipassCardConfig;
  onChange: (config: Partial<MultipassCardConfig>) => void;
}

function MultipassPreview({ config }: { config: MultipassCardConfig }) {
  const { t } = useI18n();
  const used = 3;
  const remaining = Math.max(0, config.bundleSize - used);

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
              <path d="M13 5v2" />
              <path d="M13 17v2" />
              <path d="M13 11v2" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              {config.passTypeLabel || t('wallet.studio.multipass.defaultName')}
            </p>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {t('wallet.studio.multipass.passesCount', { count: config.bundleSize })}
            </p>
          </div>
        </div>
        {config.bundlePrice > 0 && (
          <span className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
            ${config.bundlePrice}
          </span>
        )}
      </div>

      {/* Indicator */}
      <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
        {config.indicatorStyle === 'numeric' && (
          <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
            <span>{t('wallet.studio.multipass.used', { count: used })}</span>
            <span>{t('wallet.studio.multipass.remaining', { count: remaining })}</span>
          </div>
        )}
        {config.indicatorStyle === 'visual' && (
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: config.bundleSize }, (_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-sm ${
                  i < used
                    ? 'bg-neutral-300 dark:bg-neutral-600'
                    : 'bg-purple-500'
                }`}
              />
            ))}
          </div>
        )}
        {config.indicatorStyle === 'minimal' && (
          <div className="text-center text-xs text-neutral-600 dark:text-neutral-400">
            {t('wallet.studio.multipass.remainingSlash', { remaining, total: config.bundleSize })}
          </div>
        )}
      </div>
    </div>
  );
}

export function MultipassTab({ config, onChange }: MultipassTabProps) {
  const { t } = useI18n();

  const INDICATOR_STYLES: Array<{ value: NonNullable<MultipassCardConfig['indicatorStyle']>; label: string }> = [
    { value: 'numeric', label: t('wallet.studio.multipass.numeric') },
    { value: 'visual', label: t('wallet.studio.multipass.visual') },
    { value: 'minimal', label: t('wallet.studio.multipass.minimal') },
  ];

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
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        {t('wallet.studio.multipass.title')}
      </h3>

      {/* Bundle size */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.multipass.bundleSize')}
        </label>
        <input
          type="number"
          min={1}
          max={100}
          value={config.bundleSize}
          onChange={handleNumberChange('bundleSize', 1, 100)}
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="bundle-size-input"
        />
      </div>

      {/* Bundle price */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.multipass.bundlePrice')}
        </label>
        <input
          type="number"
          min={0}
          value={config.bundlePrice}
          onChange={handleNumberChange('bundlePrice', 0, 999999)}
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="bundle-price-input"
        />
      </div>

      {/* Pass type label */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.multipass.passLabel')}
        </label>
        <input
          type="text"
          value={config.passTypeLabel}
          onChange={handleTextChange('passTypeLabel')}
          placeholder={t('wallet.studio.multipass.passPlaceholder')}
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="pass-label-input"
        />
      </div>

      {/* Ticket icon */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.multipass.ticketIcon')}
        </label>
        <IconPicker
          value={config.ticketGraphic}
          onChange={(iconId) => onChange({ ticketGraphic: iconId })}
          category="transport"
        />
      </div>

      {/* Punch icon */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.multipass.punchIcon')}
        </label>
        <IconPicker
          value={config.punchIcon}
          onChange={(iconId) => onChange({ punchIcon: iconId })}
          category="stamp"
        />
      </div>

      {/* Bundle badge style */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.multipass.bundleBadgeStyle')}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['numeric', 'visual', 'minimal'] as const).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => onChange({ bundleBadgeStyle: style })}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                config.bundleBadgeStyle === style
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500'
              }`}
              data-testid={`badge-style-${style}`}
            >
              {style === 'numeric' ? t('wallet.studio.multipass.numeric') : style === 'visual' ? t('wallet.studio.multipass.visual') : t('wallet.studio.multipass.minimal')}
            </button>
          ))}
        </div>
      </div>

      {/* Used/remaining indicator style */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.multipass.indicatorStyle')}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {INDICATOR_STYLES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ indicatorStyle: opt.value })}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
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

      {/* Live preview */}
      <div className="space-y-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 p-4">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.multipass.preview')}
        </label>
        <MultipassPreview config={config} />
      </div>
    </div>
  );
}
