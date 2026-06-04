/**
 * VIP membership configuration tab.
 */

'use client';

import React, { useCallback } from 'react';
import type { VipMembershipCardConfig } from '@/components/wallet/types/card-type-config';
import { IconPicker } from '@/components/wallet/studio/IconPicker';
import { useI18n } from '@/lib/i18n';

export interface VIPTabProps {
  config: VipMembershipCardConfig;
  onChange: (config: Partial<VipMembershipCardConfig>) => void;
}

const COMMON_PERKS = [
  'Acceso prioritario',
  'Envío gratis',
  'Descuentos exclusivos',
  'Atención personalizada',
  'Regalos de cumpleaños',
  'Eventos exclusivos',
  'Ampliación de garantía',
];

const BADGE_COLORS: Record<string, string> = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  platinum: '#E5E4E2',
  bronze: '#CD7F32',
};

function CrownIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  );
}

function VIPPreview({ config }: { config: VipMembershipCardConfig }) {
  const { t } = useI18n();
  const badgeColor = BADGE_COLORS[config.memberBadgeStyle] ?? '#FFD700';

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: badgeColor + '33' }}
        >
          <CrownIcon className="w-5 h-5" style={{ color: badgeColor }} />
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            {config.membershipName || t('wallet.studio.vip.defaultName')}
          </p>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {config.validityPeriod === 'lifetime'
              ? t('wallet.studio.vip.lifetimeLabel')
              : config.validityPeriod === 'annual'
                ? t('wallet.studio.vip.annualLabel', { fee: config.annualFee })
                : t('wallet.studio.vip.monthlyLabel', { fee: config.monthlyFee })}
          </p>
        </div>
      </div>
      {config.perks.length > 0 && (
        <ul className="space-y-1">
          {config.perks.slice(0, 3).map((perk, i) => (
            <li key={i} className="text-[11px] text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
              <svg className="w-3 h-3 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              {perk}
            </li>
          ))}
          {config.perks.length > 3 && (
            <li className="text-[10px] text-neutral-400 dark:text-neutral-500">
              {t('wallet.studio.vip.morePerks', { count: config.perks.length - 3 })}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export function VIPTab({ config, onChange }: VIPTabProps) {
  const { t } = useI18n();

  const BADGE_STYLES = [
    { value: 'gold' as const, label: t('wallet.studio.vip.badgeGold'), color: BADGE_COLORS.gold },
    { value: 'silver' as const, label: t('wallet.studio.vip.badgeSilver'), color: BADGE_COLORS.silver },
    { value: 'platinum' as const, label: t('wallet.studio.vip.badgePlatinum'), color: BADGE_COLORS.platinum },
    { value: 'bronze' as const, label: t('wallet.studio.vip.badgeBronze'), color: BADGE_COLORS.bronze },
  ];

  const handleNumberChange = useCallback(
    (field: keyof VipMembershipCardConfig, min: number, max: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      if (!Number.isNaN(value) && value >= min && value <= max) {
        onChange({ [field]: value } as Partial<VipMembershipCardConfig>);
      }
    },
    [onChange]
  );

  const handleTextChange = useCallback(
    (field: keyof VipMembershipCardConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ [field]: e.target.value } as Partial<VipMembershipCardConfig>);
    },
    [onChange]
  );

  const handleValidityChange = useCallback(
    (validityPeriod: VipMembershipCardConfig['validityPeriod']) => {
      onChange({ validityPeriod });
    },
    [onChange]
  );

  const addPerk = useCallback(
    (perk: string) => {
      if (!config.perks.includes(perk)) {
        onChange({ perks: [...config.perks, perk] });
      }
    },
    [config.perks, onChange]
  );

  const removePerk = useCallback(
    (index: number) => {
      const next = [...config.perks];
      next.splice(index, 1);
      onChange({ perks: next });
    },
    [config.perks, onChange]
  );

  const [customPerk, setCustomPerk] = React.useState('');

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        {t('wallet.studio.vip.title')}
      </h3>

      {/* Membership name */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.vip.membershipName')}
        </label>
        <input
          type="text"
          value={config.membershipName}
          onChange={handleTextChange('membershipName')}
          placeholder={t('wallet.studio.vip.namePlaceholder')}
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="membership-name-input"
        />
      </div>

      {/* Monthly fee */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.vip.monthlyFee')}
        </label>
        <input
          type="number"
          min={0}
          value={config.monthlyFee}
          onChange={handleNumberChange('monthlyFee', 0, 999999)}
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="monthly-fee-input"
        />
      </div>

      {/* Annual fee */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.vip.annualFee')}
        </label>
        <input
          type="number"
          min={0}
          value={config.annualFee}
          onChange={handleNumberChange('annualFee', 0, 999999)}
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="annual-fee-input"
        />
      </div>

      {/* Validity period */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.vip.validityPeriod')}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['monthly', 'annual', 'lifetime'] as const).map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => handleValidityChange(period)}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                config.validityPeriod === period
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500'
              }`}
              data-testid={`validity-${period}`}
            >
              {period === 'monthly' ? t('wallet.studio.vip.monthly') : period === 'annual' ? t('wallet.studio.vip.annual') : t('wallet.studio.vip.lifetime')}
            </button>
          ))}
        </div>
      </div>

      {/* Perks */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.vip.perks')}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {config.perks.map((perk, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-[11px] border border-blue-200 dark:border-blue-800"
            >
              {perk}
              <button
                type="button"
                onClick={() => removePerk(i)}
                className="hover:text-blue-900 dark:hover:text-blue-100"
                data-testid={`remove-perk-${i}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customPerk}
            onChange={(e) => setCustomPerk(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customPerk.trim()) {
                e.preventDefault();
                addPerk(customPerk.trim());
                setCustomPerk('');
              }
            }}
            placeholder={t('wallet.studio.vip.addPerk')}
            className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            data-testid="custom-perk-input"
          />
          <button
            type="button"
            onClick={() => {
              if (customPerk.trim()) {
                addPerk(customPerk.trim());
                setCustomPerk('');
              }
            }}
            className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            data-testid="add-perk-btn"
          >
            +
          </button>
        </div>
      </div>

      {/* Common perks checklist */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.vip.commonPerks')}
        </label>
        <div className="space-y-1">
          {COMMON_PERKS.map((perk) => {
            const checked = config.perks.includes(perk);
            return (
              <label
                key={perk}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    if (checked) {
                      removePerk(config.perks.indexOf(perk));
                    } else {
                      addPerk(perk);
                    }
                  }}
                  className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-700 text-blue-600 focus:ring-blue-500"
                  data-testid={`perk-check-${perk.replace(/\s+/g, '-').toLowerCase()}`}
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">{perk}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Crown icon */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.vip.crownIcon')}
        </label>
        <IconPicker
          value={config.crownIcon}
          onChange={(iconId) => onChange({ crownIcon: iconId })}
          category="badge"
        />
      </div>

      {/* Member badge style */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.vip.badgeStyle')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {BADGE_STYLES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ memberBadgeStyle: opt.value })}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                config.memberBadgeStyle === opt.value
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500'
              }`}
              data-testid={`badge-style-${opt.value}`}
            >
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: opt.color }} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live preview */}
      <div className="space-y-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 p-4">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.vip.preview')}
        </label>
        <VIPPreview config={config} />
      </div>
    </div>
  );
}
