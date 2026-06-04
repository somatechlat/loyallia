/**
 * Referral pass configuration tab.
 */

'use client';

import React, { useCallback } from 'react';
import type { ReferralPassCardConfig } from '@/components/wallet/types/card-type-config';
import { IconPicker } from '@/components/wallet/studio/IconPicker';

export interface ReferralTabProps {
  config: ReferralPassCardConfig;
  onChange: (config: Partial<ReferralPassCardConfig>) => void;
}

function ReferralPreview({ config }: { config: ReferralPassCardConfig }) {
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 space-y-3">
      <div className="flex items-center justify-center">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ backgroundColor: config.shareButtonColor + '22' }}
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={config.shareButtonColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
            <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
          </svg>
        </div>
      </div>
      <div className="space-y-2">
        {config.referrerReward && (
          <div className="text-center">
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Recompensa del referidor
            </p>
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
              {config.referrerReward}
            </p>
          </div>
        )}
        {config.refereeReward && (
          <div className="text-center">
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Recompensa del referido
            </p>
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
              {config.refereeReward}
            </p>
          </div>
        )}
        <div className="flex items-center justify-center gap-2 text-[10px] text-neutral-500 dark:text-neutral-400">
          <span>Máx. {config.maxReferralsPerCustomer} referidos</span>
          {config.referralCodePattern && (
            <span className="font-mono bg-neutral-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded">
              {config.referralCodePattern}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReferralTab({ config, onChange }: ReferralTabProps) {
  const handleNumberChange = useCallback(
    (field: keyof ReferralPassCardConfig, min: number, max: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      if (!Number.isNaN(value) && value >= min && value <= max) {
        onChange({ [field]: value } as Partial<ReferralPassCardConfig>);
      }
    },
    [onChange]
  );

  const handleTextChange = useCallback(
    (field: keyof ReferralPassCardConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ [field]: e.target.value } as Partial<ReferralPassCardConfig>);
    },
    [onChange]
  );

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        Configuración de Pase de Referido
      </h3>

      {/* Referrer reward */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Recompensa del referidor
        </label>
        <input
          type="text"
          value={config.referrerReward}
          onChange={handleTextChange('referrerReward')}
          placeholder="Ej: $10 de crédito"
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="referrer-reward-input"
        />
      </div>

      {/* Referee reward */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Recompensa del referido
        </label>
        <input
          type="text"
          value={config.refereeReward}
          onChange={handleTextChange('refereeReward')}
          placeholder="Ej: 20% de descuento"
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="referee-reward-input"
        />
      </div>

      {/* Max referrals */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Máximo de referidos por cliente
        </label>
        <input
          type="number"
          min={1}
          max={999}
          value={config.maxReferralsPerCustomer}
          onChange={handleNumberChange('maxReferralsPerCustomer', 1, 999)}
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="max-referrals-input"
        />
      </div>

      {/* Referral code pattern */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Patrón de código de referido
        </label>
        <input
          type="text"
          value={config.referralCodePattern}
          onChange={handleTextChange('referralCodePattern')}
          placeholder="Ej: REF-{name}-{number}"
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="referral-code-input"
        />
      </div>

      {/* Share button color */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Color del botón de compartir
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={config.shareButtonColor}
            onChange={(e) => onChange({ shareButtonColor: e.target.value })}
            className="w-10 h-10 rounded-lg border border-neutral-300 dark:border-neutral-700 cursor-pointer p-0 overflow-hidden"
            data-testid="share-color-input"
          />
          <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">{config.shareButtonColor}</span>
        </div>
      </div>

      {/* Referral icon */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Icono de referido
        </label>
        <IconPicker
          value={config.referralIcon ?? ''}
          onChange={(iconId) => onChange({ referralIcon: iconId })}
          category="social"
        />
      </div>

      {/* Gift/reward icon */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Icono de regalo/recompensa
        </label>
        <IconPicker
          value={config.rewardBadgeIcon}
          onChange={(iconId) => onChange({ rewardBadgeIcon: iconId })}
          category="badge"
        />
      </div>

      {/* Live preview */}
      <div className="space-y-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 p-4">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Vista previa
        </label>
        <ReferralPreview config={config} />
      </div>
    </div>
  );
}
