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
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">
        Configuración de Pase de Referido
      </h3>

      {/* Referrer reward */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Recompensa del referidor
        </label>
        <input
          type="text"
          value={config.referrerReward}
          onChange={handleTextChange('referrerReward')}
          placeholder="Ej: $10 de crédito"
          className="w-full px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="referrer-reward-input"
        />
      </div>

      {/* Referee reward */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Recompensa del referido
        </label>
        <input
          type="text"
          value={config.refereeReward}
          onChange={handleTextChange('refereeReward')}
          placeholder="Ej: 20% de descuento"
          className="w-full px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="referee-reward-input"
        />
      </div>

      {/* Max referrals */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Máximo de referidos por cliente
        </label>
        <input
          type="number"
          min={1}
          max={999}
          value={config.maxReferralsPerCustomer}
          onChange={handleNumberChange('maxReferralsPerCustomer', 1, 999)}
          className="w-full px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="max-referrals-input"
        />
      </div>

      {/* Referral code pattern */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Patrón de código de referido
        </label>
        <input
          type="text"
          value={config.referralCodePattern}
          onChange={handleTextChange('referralCodePattern')}
          placeholder="Ej: REF-{name}-{number}"
          className="w-full px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="referral-code-input"
        />
      </div>

      {/* Share button color */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
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
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Icono de referido
        </label>
        <IconPicker
          value={config.referralIcon ?? ''}
          onChange={(iconId) => onChange({ referralIcon: iconId })}
          category="social"
        />
      </div>

      {/* Friend avatar placeholder */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Avatar de amigo placeholder
        </label>
        <IconPicker
          value={config.friendAvatarPlaceholder ?? ''}
          onChange={(iconId) => onChange({ friendAvatarPlaceholder: iconId })}
          category="social"
        />
      </div>

      {/* Gift/reward icon */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Icono de regalo/recompensa
        </label>
        <IconPicker
          value={config.rewardBadgeIcon}
          onChange={(iconId) => onChange({ rewardBadgeIcon: iconId })}
          category="badge"
        />
      </div>
    </div>
  );
}
