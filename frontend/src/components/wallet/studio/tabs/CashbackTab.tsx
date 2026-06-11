/**
 * Cashback card configuration tab.
 */

'use client';

import React, { useCallback, useMemo } from 'react';
import type { CashbackCardConfig } from '@/components/wallet/types/card-type-config';
import { IconPicker } from '@/components/wallet/studio/IconPicker';

export interface CashbackTabProps {
  config: CashbackCardConfig;
  onChange: (config: Partial<CashbackCardConfig>) => void;
}

export function CashbackTab({ config, onChange }: CashbackTabProps) {
  const handleNumberChange = useCallback(
    (field: keyof CashbackCardConfig, min: number, max: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      if (!Number.isNaN(value) && value >= min && value <= max) {
        onChange({ [field]: value } as Partial<CashbackCardConfig>);
      }
    },
    [onChange]
  );

  const handleTextChange = useCallback(
    (field: keyof CashbackCardConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ [field]: e.target.value } as Partial<CashbackCardConfig>);
    },
    [onChange]
  );

  const percentage = useMemo(() => {
    return Math.max(0, Math.min(100, config.cashbackPercentage));
  }, [config.cashbackPercentage]);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">Configuración de Cashback</h3>

      <div className="space-y-0.5">
        <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Porcentaje de cashback</label>
        <div className="flex items-center gap-2">
          <input type="range" min={0} max={100} value={percentage} onChange={handleNumberChange('cashbackPercentage', 0, 100)} className="flex-1 h-1.5" data-testid="cashback-percentage-slider" />
          <input type="number" min={0} max={100} value={percentage} onChange={handleNumberChange('cashbackPercentage', 0, 100)} className="w-12 px-1.5 py-0.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 text-center" data-testid="cashback-percentage-input" />
          <span className="text-xs text-neutral-500">%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Compra mínima</label>
          <input type="number" min={0} value={config.minimumPurchase} onChange={handleNumberChange('minimumPurchase', 0, 999999)} className="w-full px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500" data-testid="minimum-purchase-input" />
        </div>
        <div className="space-y-0.5">
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Expiración (días)</label>
          <input type="number" min={0} value={config.creditExpiryDays} onChange={handleNumberChange('creditExpiryDays', 0, 9999)} className="w-full px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500" data-testid="credit-expiry-input" />
        </div>
      </div>

      <div className="space-y-0.5">
        <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Nombre del nivel</label>
        <input type="text" value={config.tierName ?? ''} onChange={handleTextChange('tierName')} placeholder="Ej: Oro" className="w-full px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500" data-testid="tier-name-input" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Color anillo</label>
          <div className="flex items-center gap-2">
            <input type="color" value={config.progressRingColor} onChange={(e) => onChange({ progressRingColor: e.target.value })} className="w-7 h-7 rounded-md border border-neutral-300 dark:border-neutral-700 cursor-pointer p-0 overflow-hidden" data-testid="progress-ring-color-input" />
            <span className="text-[10px] font-mono text-neutral-500">{config.progressRingColor}</span>
          </div>
        </div>
        <div className="space-y-0.5">
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Insignia</label>
          <IconPicker value={config.tierBadge} onChange={(iconId) => onChange({ tierBadge: iconId })} category="badge" />
        </div>
      </div>

      <div className="space-y-0.5">
        <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Icono de moneda</label>
        <IconPicker value={config.coinIcon} onChange={(iconId) => onChange({ coinIcon: iconId })} category="finance" />
      </div>
    </div>
  );
}
