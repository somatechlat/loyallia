/**
 * Corporate discount configuration tab.
 */

'use client';

import React, { useCallback } from 'react';
import type { CorporateDiscountCardConfig } from '@/components/wallet/types/card-type-config';
import { IconPicker } from '@/components/wallet/studio/IconPicker';
import { useI18n } from '@/lib/i18n';

export interface CorporateTabProps {
  config: CorporateDiscountCardConfig;
  onChange: (config: Partial<CorporateDiscountCardConfig>) => void;
}

const BADGE_STYLES: Array<{ value: CorporateDiscountCardConfig['badgeStyle']; labelKey: string }> = [
  { value: 'corporate', labelKey: 'wallet.studio.corporate.corporate' },
  { value: 'standard', labelKey: 'wallet.studio.corporate.standard' },
  { value: 'minimal', labelKey: 'wallet.studio.corporate.minimal' },
];

export function CorporateTab({ config, onChange }: CorporateTabProps) {
  const { t } = useI18n();
  const handleNumberChange = useCallback(
    (field: keyof CorporateDiscountCardConfig, min: number, max: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      if (!Number.isNaN(value) && value >= min && value <= max) {
        onChange({ [field]: value } as Partial<CorporateDiscountCardConfig>);
      }
    },
    [onChange]
  );

  const handleTextChange = useCallback(
    (field: keyof CorporateDiscountCardConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ [field]: e.target.value } as Partial<CorporateDiscountCardConfig>);
    },
    [onChange]
  );

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">
        {t('wallet.studio.corporate.title')}
      </h3>

      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.corporate.companyName')}
        </label>
        <input
          type="text"
          value={config.companyName}
          onChange={handleTextChange('companyName')}
          placeholder={t('wallet.studio.corporate.namePlaceholder')}
          className="w-full px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="company-name-input"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.corporate.companyLogoUrl')}
        </label>
        <input
          type="text"
          value={config.companyLogoUrl ?? ''}
          onChange={handleTextChange('companyLogoUrl')}
          placeholder={t('wallet.studio.corporate.companyLogoUrlPlaceholder')}
          className="w-full px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="company-logo-url-input"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.corporate.discountPercentage')}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            value={config.corporateDiscountPercentage}
            onChange={handleNumberChange('corporateDiscountPercentage', 0, 100)}
            className="flex-1"
            data-testid="corporate-discount-slider"
          />
          <input
            type="number"
            min={0}
            max={100}
            value={config.corporateDiscountPercentage}
            onChange={handleNumberChange('corporateDiscountPercentage', 0, 100)}
            className="w-16 px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 text-center"
            data-testid="corporate-discount-input"
          />
          <span className="text-xs text-neutral-500 dark:text-neutral-400">%</span>
        </div>
      </div>

      <div className="space-y-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.employeeIdRequired}
            onChange={(e) => onChange({ employeeIdRequired: e.target.checked })}
            className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-700 text-blue-600 focus:ring-blue-500"
            data-testid="employee-id-toggle"
          />
          <span className="text-xs text-neutral-700 dark:text-neutral-300">
            {t('wallet.studio.corporate.employeeIdRequired')}
          </span>
        </label>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.corporate.buildingIcon')}
        </label>
        <IconPicker
          value={config.buildingIcon ?? ''}
          onChange={(iconId) => onChange({ buildingIcon: iconId })}
          category="finance"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.corporate.departmentBadge')}
        </label>
        <IconPicker
          value={config.departmentBadge ?? ''}
          onChange={(iconId) => onChange({ departmentBadge: iconId })}
          category="badge"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.corporate.idBadgeColor')}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={config.idBadgeColor}
            onChange={(e) => onChange({ idBadgeColor: e.target.value })}
            className="w-10 h-10 rounded-lg border border-neutral-300 dark:border-neutral-700 cursor-pointer p-0 overflow-hidden"
            data-testid="id-badge-color-input"
          />
          <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">{config.idBadgeColor}</span>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.corporate.badgeStyle')}
        </label>
        <div className="flex gap-2">
          {BADGE_STYLES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ badgeStyle: opt.value })}
              className={`flex-1 px-2 py-1 rounded-lg border text-xs font-medium transition-colors ${
                config.badgeStyle === opt.value
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500'
              }`}
              data-testid={`badge-style-${opt.value}`}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.securitySeal ?? false}
            onChange={(e) => onChange({ securitySeal: e.target.checked })}
            className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-700 text-blue-600 focus:ring-blue-500"
            data-testid="security-seal-toggle"
          />
          <span className="text-xs text-neutral-700 dark:text-neutral-300">
            {t('wallet.studio.corporate.securitySeal')}
          </span>
        </label>
      </div>
    </div>
  );
}
