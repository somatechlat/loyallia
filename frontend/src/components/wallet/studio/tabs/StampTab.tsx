/**
 * Stamp card configuration tab.
 */

'use client';

import React, { useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import type { StampCardConfig } from '@/components/wallet/types/card-type-config';
import { IconPicker } from '@/components/wallet/studio/IconPicker';

export interface StampTabProps {
  config: StampCardConfig;
  onChange: (config: Partial<StampCardConfig>) => void;
}

const SHAPE_OPTIONS: Array<{ value: StampCardConfig['stampShape']; labelKey: string }> = [
  { value: 'circle', labelKey: 'wallet.studio.stamp.circle' },
  { value: 'square', labelKey: 'wallet.studio.stamp.square' },
  { value: 'star', labelKey: 'wallet.studio.stamp.star' },
  { value: 'heart', labelKey: 'wallet.studio.stamp.heart' },
  { value: 'diamond', labelKey: 'wallet.studio.stamp.diamond' },
  { value: 'hexagon', labelKey: 'wallet.studio.stamp.hexagon' },
];

function ShapePreview({ shape, color }: { shape: StampCardConfig['stampShape']; color: string }) {
  const paths: Record<StampCardConfig['stampShape'], string> = {
    circle: 'M12 12 m-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0',
    square: 'M2 2 h20 v20 h-20 z',
    star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    heart: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
    diamond: 'M12 2l10 10-10 10L2 12z',
    hexagon: 'M21 16.5l-9 5.2-9-5.2v-9l9-5.2 9 5.2z',
  };
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill={color} stroke={color} strokeWidth="1.5">
      <path d={paths[shape]} />
    </svg>
  );
}

export function StampTab({ config, onChange }: StampTabProps) {
  const { t } = useI18n();
  const handleNumberChange = useCallback(
    (field: keyof StampCardConfig, min: number, max: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      if (!Number.isNaN(value) && value >= min && value <= max) {
        onChange({ [field]: value } as Partial<StampCardConfig>);
      }
    },
    [onChange]
  );

  const handleTextChange = useCallback(
    (field: keyof StampCardConfig) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ [field]: e.target.value } as Partial<StampCardConfig>);
    },
    [onChange]
  );

  const handleShapeChange = useCallback(
    (shape: StampCardConfig['stampShape']) => {
      onChange({ stampShape: shape });
    },
    [onChange]
  );

  const handleStampTypeChange = useCallback(
    (stampType: StampCardConfig['stampType']) => {
      onChange({ stampType });
    },
    [onChange]
  );

  const handleGridLayoutChange = useCallback(
    (isGrid: boolean) => {
      onChange({ stampGridLayout: isGrid ? '5x2' : 'dynamic' });
    },
    [onChange]
  );

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">
        {t('wallet.studio.stamp.configTitle')}
      </h3>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-0.5">
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('wallet.studio.stamp.stampsRequired')}</label>
          <input type="number" min={1} max={20} value={config.stampsRequired} onChange={handleNumberChange('stampsRequired', 1, 20)} className="w-full px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500" data-testid="stamps-required-input" />
        </div>
        <div className="space-y-0.5">
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('wallet.studio.stamp.stampsAtIssue')}</label>
          <input type="number" min={0} max={20} value={config.stampsAtIssue} onChange={handleNumberChange('stampsAtIssue', 0, 20)} className="w-full px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500" data-testid="stamps-at-issue-input" />
        </div>
        <div className="space-y-0.5">
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('wallet.studio.stamp.dailyLimit')}</label>
          <input type="number" min={0} max={100} value={config.dailyStampLimit} onChange={handleNumberChange('dailyStampLimit', 0, 100)} className="w-full px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500" data-testid="daily-stamp-limit-input" />
        </div>
      </div>

      <div className="space-y-0.5">
        <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('wallet.studio.stamp.reward')}</label>
        <input type="text" value={config.rewardDescription} onChange={handleTextChange('rewardDescription')} placeholder={t('wallet.studio.stamp.rewardPlaceholder')} className="w-full px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500" data-testid="reward-description-input" />
      </div>

      {/* Expiry */}
      <div className="space-y-0.5">
        <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('wallet.studio.stamp.expiry')}</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange({ stampExpiry: 'unlimited' })}
            className={`flex-1 px-2 py-1 rounded-md border text-xs font-medium transition-colors ${
              config.stampExpiry === 'unlimited'
                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500'
            }`}
            data-testid="stamp-expiry-unlimited"
          >
            {t('wallet.studio.stamp.unlimited')}
          </button>
          <div className="flex-1 flex items-center gap-2 px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700">
            <input
              type="number"
              min={1}
              value={typeof config.stampExpiry === 'number' ? config.stampExpiry : ''}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                if (!Number.isNaN(value) && value >= 1) {
                  onChange({ stampExpiry: value });
                }
              }}
              placeholder={t('wallet.studio.stamp.daysPlaceholder')}
              className="w-full text-xs text-neutral-800 dark:text-neutral-100 bg-transparent focus:outline-none"
              data-testid="stamp-expiry-days-input"
            />
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 whitespace-nowrap">{t('wallet.studio.stamp.days')}</span>
          </div>
        </div>
      </div>

      {/* Start/End dates */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('wallet.studio.stamp.startDate')}</label>
          <input
            type="date"
            value={config.stampStartDate ?? ''}
            onChange={(e) => onChange({ stampStartDate: e.target.value || undefined })}
            className="w-full px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="stamp-start-date-input"
          />
        </div>
        <div className="space-y-0.5">
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('wallet.studio.stamp.endDate')}</label>
          <input
            type="date"
            value={config.stampEndDate ?? ''}
            onChange={(e) => onChange({ stampEndDate: e.target.value || undefined })}
            className="w-full px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="stamp-end-date-input"
          />
        </div>
      </div>

      <div className="space-y-0.5">
        <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('wallet.studio.stamp.shape')}</label>
        <div className="grid grid-cols-6 gap-1">
          {SHAPE_OPTIONS.map((opt) => (
            <button key={opt.value} type="button" onClick={() => handleShapeChange(opt.value)} className={`flex flex-col items-center gap-0.5 p-1 rounded-md border transition-colors ${config.stampShape === opt.value ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'}`} data-testid={`shape-option-${opt.value}`}>
              <ShapePreview shape={opt.value} color={config.stampColor} />
              <span className="text-[9px] text-neutral-600 dark:text-neutral-400">{t(opt.labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('wallet.studio.stamp.color')}</label>
          <div className="flex items-center gap-2">
            <input type="color" value={config.stampColor} onChange={(e) => onChange({ stampColor: e.target.value })} className="w-7 h-7 rounded-md border border-neutral-300 dark:border-neutral-700 cursor-pointer p-0 overflow-hidden" data-testid="stamp-color-input" />
            <span className="text-[10px] font-mono text-neutral-500">{config.stampColor}</span>
          </div>
        </div>
        <div className="space-y-0.5">
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('wallet.studio.stamp.birthday')}</label>
          <input type="number" min={0} max={20} value={config.birthdayStamps} onChange={handleNumberChange('birthdayStamps', 0, 20)} className="w-full px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500" data-testid="birthday-stamps-input" />
        </div>
      </div>

      <div className="space-y-0.5">
        <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('wallet.studio.stamp.emptyIcon')}</label>
        <IconPicker value={config.stampIcon} onChange={(iconId) => onChange({ stampIcon: iconId })} category="stamp" />
      </div>

      <div className="space-y-0.5">
        <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('wallet.studio.stamp.filledIcon')}</label>
        <IconPicker value={config.stampFilledIcon} onChange={(iconId) => onChange({ stampFilledIcon: iconId })} category="stamp" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('wallet.studio.stamp.layout')}</label>
          <div className="flex gap-1">
            <button type="button" onClick={() => handleGridLayoutChange(true)} className={`flex-1 px-2 py-1 rounded-md border text-[11px] font-medium transition-colors ${config.stampGridLayout !== 'dynamic' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700' : 'border-neutral-200 text-neutral-600'}`}>{t('wallet.studio.stamp.grid')}</button>
            <button type="button" onClick={() => handleGridLayoutChange(false)} className={`flex-1 px-2 py-1 rounded-md border text-[11px] font-medium transition-colors ${config.stampGridLayout === 'dynamic' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700' : 'border-neutral-200 text-neutral-600'}`}>{t('wallet.studio.stamp.linear')}</button>
          </div>
        </div>
        <div className="space-y-0.5">
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('wallet.studio.stamp.type')}</label>
          <div className="flex gap-1">
            <button type="button" onClick={() => handleStampTypeChange('visit')} className={`flex-1 px-2 py-1 rounded-md border text-[11px] font-medium transition-colors ${config.stampType === 'visit' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700' : 'border-neutral-200 text-neutral-600'}`}>{t('wallet.studio.stamp.visit')}</button>
            <button type="button" onClick={() => handleStampTypeChange('consumption')} className={`flex-1 px-2 py-1 rounded-md border text-[11px] font-medium transition-colors ${config.stampType === 'consumption' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700' : 'border-neutral-200 text-neutral-600'}`}>{t('wallet.studio.stamp.consumption')}</button>
          </div>
        </div>
      </div>

      {config.stampType === 'consumption' && (
        <div className="space-y-0.5">
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('wallet.studio.stamp.consumptionPerStamp')}</label>
          <input type="number" min={1} value={config.consumptionPerStamp} onChange={handleNumberChange('consumptionPerStamp', 1, 9999)} className="w-full px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500" data-testid="consumption-per-stamp-input" />
        </div>
      )}
    </div>
  );
}
