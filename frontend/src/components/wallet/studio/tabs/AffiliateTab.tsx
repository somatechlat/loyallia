/**
 * Affiliate configuration tab.
 */

'use client';

import React, { useCallback } from 'react';
import type { AffiliateCardConfig } from '@/components/wallet/types/card-type-config';
import { IconPicker } from '@/components/wallet/studio/IconPicker';
import { useI18n } from '@/lib/i18n';

export interface AffiliateTabProps {
  config: AffiliateCardConfig;
  onChange: (config: Partial<AffiliateCardConfig>) => void;
}

export function AffiliateTab({ config, onChange }: AffiliateTabProps) {
  const { t } = useI18n();
  const handleTextChange = useCallback(
    (field: keyof AffiliateCardConfig) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ [field]: e.target.value } as Partial<AffiliateCardConfig>);
    },
    [onChange]
  );

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">
        {t('wallet.studio.affiliate.title')}
      </h3>

      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.affiliate.codePattern')}
        </label>
        <input
          type="text"
          value={config.affiliateCodePattern}
          onChange={handleTextChange('affiliateCodePattern')}
          placeholder={t('wallet.studio.affiliate.codePlaceholder')}
          maxLength={50} className="w-full px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="affiliate-code-input"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.affiliate.benefitsDescription')}
        </label>
        <textarea
          value={config.benefitsDescription}
          onChange={handleTextChange('benefitsDescription')}
          rows={3}
          maxLength={500}
          className="w-full px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          data-testid="benefits-description-input"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.affiliate.partnerLogo')}
        </label>
        <input
          type="text"
          value={config.partnerLogoUrl ?? ''}
          onChange={handleTextChange('partnerLogoUrl')}
          placeholder={t('wallet.studio.affiliate.partnerLogoPlaceholder')}
          maxLength={500} className="w-full px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="partner-logo-url-input"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.affiliate.badgeColor')}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={config.badgeColor}
            onChange={(e) => onChange({ badgeColor: e.target.value })}
            className="w-10 h-10 rounded-lg border border-neutral-300 dark:border-neutral-700 cursor-pointer p-0 overflow-hidden"
            data-testid="badge-color-input"
          />
          <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">{config.badgeColor}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.affiliate.bannerText')}
        </label>
        <input
          type="text"
          value={config.referralBannerText}
          onChange={handleTextChange('referralBannerText')}
          placeholder={t('wallet.studio.affiliate.bannerPlaceholder')}
          maxLength={100} className="w-full px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="banner-text-input"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.affiliate.referralChainIcon')}
        </label>
        <IconPicker
          value={config.referralChainIcon ?? ''}
          onChange={(iconId) => onChange({ referralChainIcon: iconId })}
          category="social"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.affiliate.ambassadorBadge')}
        </label>
        <IconPicker
          value={config.ambassadorBadge ?? ''}
          onChange={(iconId) => onChange({ ambassadorBadge: iconId })}
          category="badge"
        />
      </div>
    </div>
  );
}
