'use client';

/**
 * StampConfig — Configuration for stamp-type loyalty cards.
 *
 * Extracted from TypeConfig.tsx (LYL-C-FE-002: mega-component decomposition).
 *
 * @param meta - Program metadata object
 * @param setMeta - State setter for metadata
 */
import React, { useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import Tooltip from '@/components/ui/Tooltip';
import type { ConfigProps } from './types';

/**
 * @description Stamp card configuration form with visit/consumption modes, expiry, and bonus settings.
 * @param {ConfigProps} props - Component props
 * @returns JSX.Element
 */
const StampConfig = React.memo(function StampConfig({ meta, setMeta }: ConfigProps) {
  const { t } = useI18n();
  const set = useCallback((k: string, v: unknown) => setMeta((prev: Record<string, unknown>) => ({ ...prev, [k]: v })), [setMeta]);
  const stampType = (meta.stamp_type ?? 'visit') as 'visit' | 'consumption';
  const rewardType = (meta.reward_type ?? 'reward') as 'dollar' | 'percent' | 'reward';

  return (
    <div className="space-y-5">
      {/* Stamp Type Selector */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="label mb-0">{t('programs.stampConfig.stampType')}</label>
          <Tooltip text={t('programs.stampConfig.stampTypeTooltip')} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(['visit', 'consumption'] as const).map(stampTypeOpt => (
            <label key={stampTypeOpt} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              stampType === stampTypeOpt
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                : 'border-surface-200 dark:border-surface-700'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <input type="radio" name="stamp_type" value={stampTypeOpt}
                  checked={stampType === stampTypeOpt}
                  onChange={() => set('stamp_type', stampTypeOpt)} className="accent-brand-500" />
                <span className="font-semibold text-sm text-surface-900 dark:text-white">
                  {stampTypeOpt === 'visit' ? t('programs.stampConfig.visitMode') : t('programs.stampConfig.consumptionMode')}
                </span>
                <Tooltip text={stampTypeOpt === 'visit'
                  ? t('programs.stampConfig.visitTooltip')
                  : t('programs.stampConfig.consumptionTooltip')
                } />
              </div>
              <p className="text-xs text-surface-500 ml-5">
                {stampTypeOpt === 'visit' ? t('programs.stampConfig.visitExample') : t('programs.stampConfig.consumptionExample')}
              </p>
            </label>
          ))}
        </div>
        {/* Consumption Equivalence */}
        {stampType === 'consumption' && (
          <div className="mt-3 p-4 bg-surface-50 dark:bg-surface-800 rounded-xl">
            <label className="label">{t('programs.stampConfig.consumptionEquivalence')}</label>
            <p className="text-xs text-surface-400 italic mb-3">{t('programs.stampConfig.consumptionSubtitle')}</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-surface-500">$</span>
                <input type="number" min={1} step={0.01} className="input w-24"
                  value={meta.consumption_per_stamp as number ?? 10}
                  onChange={e => set('consumption_per_stamp', parseFloat(e.target.value) || 10)} />
              </div>
              <span className="text-lg font-bold text-surface-400">=</span>
              <div className="flex items-center gap-2">
                <input type="number" min={1} max={99} className="input w-16"
                  value={meta.consumption_stamps_per as number ?? 1}
                  onChange={e => set('consumption_stamps_per', parseInt(e.target.value) || 1)} />
                <span className="text-sm text-surface-600 dark:text-surface-400">{t('programs.stampConfig.stampsLabel')}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stamps Required — Two-column layout */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <label className="label mb-0">{t('programs.stampConfig.stampsRequired')}</label>
          <Tooltip text={t('programs.stampConfig.stampsRequiredTooltip')} />
        </div>
        <p className="text-xs text-surface-400 italic mb-3">{t('programs.stampConfig.stampsRequiredSubtitle')}</p>
        {stampType === 'visit' ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-surface-100 dark:bg-surface-700 rounded-lg px-3 py-2">
              <span className="text-sm font-medium text-surface-700 dark:text-surface-300">1</span>
              <span className="text-xs text-surface-500">{t('programs.stampConfig.visitLabel')}</span>
            </div>
            <span className="text-lg font-bold text-surface-400">=</span>
            <div className="flex items-center gap-2">
              <input type="number" min={1} max={99} className="input w-20" value={meta.stamps_required as number ?? 10}
                onChange={e => set('stamps_required', parseInt(e.target.value) || 10)} />
              <span className="text-xs text-surface-500">{t('programs.stampConfig.stampsLabel')}</span>
            </div>
          </div>
        ) : (
          <input type="number" min={1} max={99} className="input" value={meta.stamps_required as number ?? 10}
            onChange={e => set('stamps_required', parseInt(e.target.value) || 10)} />
        )}
      </div>

      {/* Reward Section */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <label className="label mb-0">{t('programs.stampConfig.rewardDescription')}</label>
          <Tooltip text={t('programs.stampConfig.rewardDescriptionTooltip')} />
        </div>
        <input type="text" className="input" placeholder={t('programs.stampConfig.rewardPlaceholder')} value={meta.reward_description as string ?? ''}
          onChange={e => set('reward_description', e.target.value)} />

        {/* Reward Type Selector */}
        <div className="mt-3">
          <label className="label text-xs">{t('programs.stampConfig.rewardType')}</label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {([
              { value: 'dollar', label: t('programs.stampConfig.rewardTypeDollar'), icon: '$' },
              { value: 'percent', label: t('programs.stampConfig.rewardTypePercent'), icon: '%' },
              { value: 'reward', label: t('programs.stampConfig.rewardTypeReward'), icon: '★' },
            ] as const).map(opt => (
              <label key={opt.value} className={`flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer transition-all text-xs ${
                rewardType === opt.value
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                  : 'border-surface-200 dark:border-surface-700'
              }`}>
                <input type="radio" name="reward_type" value={opt.value}
                  checked={rewardType === opt.value}
                  onChange={() => set('reward_type', opt.value)} className="accent-brand-500" />
                <span className="font-medium">{opt.icon} {opt.label}</span>
              </label>
            ))}
          </div>
          {rewardType === 'dollar' && (
            <div className="mt-2 flex items-center gap-2">
              <span className="font-bold text-surface-500">$</span>
              <input type="number" min={0} step={0.5} className="input w-24" placeholder="10"
                value={meta.reward_dollar_amount as number ?? ''}
                onChange={e => set('reward_dollar_amount', parseFloat(e.target.value) || 0)} />
            </div>
          )}
          {rewardType === 'percent' && (
            <div className="mt-2 flex items-center gap-2">
              <input type="number" min={1} max={100} className="input w-20" placeholder="10"
                value={meta.reward_percent as number ?? ''}
                onChange={e => set('reward_percent', parseInt(e.target.value) || 0)} />
              <span className="font-bold text-surface-500">%</span>
            </div>
          )}
        </div>
      </div>

      {/* Expiry Options */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="label mb-0">{t('programs.stampConfig.cardExpiry')}</label>
          <Tooltip text={t('programs.stampConfig.cardExpiryTooltip')} />
        </div>
        <div className="space-y-2">
          {(['unlimited', 'period'] as const).map(expiryType => (
            <label key={expiryType} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
              (meta.stamp_expiry ?? 'unlimited') === expiryType
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                : 'border-surface-200 dark:border-surface-700'
            }`}>
              <input type="radio" name="stamp_expiry" value={expiryType}
                checked={(meta.stamp_expiry ?? 'unlimited') === expiryType}
                onChange={() => set('stamp_expiry', expiryType)} className="accent-brand-500" />
              <span className="text-sm text-surface-900 dark:text-white font-medium">
                {expiryType === 'unlimited' ? t('common.unlimited') : t('programs.stampConfig.period')}
              </span>
              {expiryType === 'unlimited' && (
                <Tooltip text={t('programs.stampConfig.unlimitedTooltip')} />
              )}
            </label>
          ))}
        </div>
        {meta.stamp_expiry === 'period' && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="label">{t('common.startDate')}</label>
              <input type="date" className="input" value={meta.stamp_start_date as string ?? ''}
                onChange={e => set('stamp_start_date', e.target.value)} />
            </div>
            <div>
              <label className="label">{t('common.endDate')}</label>
              <input type="date" className="input" value={meta.stamp_end_date as string ?? ''}
                min={meta.stamp_start_date as string ?? ''}
                onChange={e => set('stamp_end_date', e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* Additional Config */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { key: 'stamps_at_issue', label: t('programs.stampConfig.stampsAtIssue'), tooltip: t('programs.stampConfig.stampsAtIssueTooltip'), min: 0, max: 10, default: 0 },
          { key: 'daily_stamp_limit', label: t('programs.stampConfig.dailyLimit'), tooltip: t('programs.stampConfig.dailyLimitTooltip'), min: 1, max: 99, default: 5 },
          { key: 'birthday_stamps', label: t('programs.stampConfig.birthdayStamps'), tooltip: t('programs.stampConfig.birthdayStampsTooltip'), min: 0, max: 10, default: 0 },
        ].map(field => (
          <div key={field.key}>
            <div className="flex items-center gap-2 mb-1">
              <label className="label mb-0">{field.label}</label>
              <Tooltip text={field.tooltip} />
            </div>
            <input type="number" min={field.min} max={field.max} className="input"
              value={meta[field.key] as number ?? field.default}
              onChange={e => set(field.key, parseInt(e.target.value) || field.default)} />
          </div>
        ))}
      </div>
    </div>
  );
});

/**
 * @description Stamp card configuration form with visit/consumption modes, expiry, and bonus settings.
 * @param {ConfigProps} props - Component props
 * @returns JSX.Element
 */
export default StampConfig;
