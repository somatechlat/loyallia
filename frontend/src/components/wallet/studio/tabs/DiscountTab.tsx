/**
 * Discount card configuration tab.
 */

'use client';

import React, { useCallback } from 'react';
import type { DiscountCardConfig } from '@/components/wallet/types/card-type-config';
import { IconPicker } from '@/components/wallet/studio/IconPicker';

export interface DiscountTabProps {
  config: DiscountCardConfig;
  onChange: (config: Partial<DiscountCardConfig>) => void;
}

const DISPLAY_STYLES: Array<{ value: NonNullable<DiscountCardConfig['percentageDisplayStyle']>; label: string }> = [
  { value: 'compact', label: 'Compacto' },
  { value: 'expanded', label: 'Expandido' },
  { value: 'badge', label: 'Insignia' },
];

export function DiscountTab({ config, onChange }: DiscountTabProps) {
  const addTier = useCallback(() => {
    const next = [
      ...config.tiers,
      { tierName: `Nivel ${config.tiers.length + 1}`, threshold: 0, discountPercentage: 5 },
    ];
    onChange({ tiers: next });
  }, [config.tiers, onChange]);

  const removeTier = useCallback(
    (index: number) => {
      const next = [...config.tiers];
      next.splice(index, 1);
      onChange({ tiers: next });
    },
    [config.tiers, onChange]
  );

  const updateTier = useCallback(
    (index: number, field: 'tierName' | 'threshold' | 'discountPercentage', value: string | number) => {
      const next = config.tiers.map((tier, i) => (i === index ? { ...tier, [field]: value } : tier));
      onChange({ tiers: next });
    },
    [config.tiers, onChange]
  );

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">
        Configuración de Descuentos por Niveles
      </h3>

      {/* Discount banner text */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Texto del banner de descuento
        </label>
        <input
          type="text"
          value={config.discountBannerText}
          onChange={(e) => onChange({ discountBannerText: e.target.value })}
          placeholder="Ej: ¡Descuentos exclusivos por nivel!"
          className="w-full px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="discount-banner-text-input"
        />
      </div>

      {/* Tiers */}
      <div className="space-y-2">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Niveles
        </label>
        {config.tiers.map((tier, i) => (
          <div
            key={i}
            className="flex items-center gap-2 p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            data-testid={`tier-row-${i}`}
          >
            <input
              type="text"
              value={tier.tierName}
              onChange={(e) => updateTier(i, 'tierName', e.target.value)}
              placeholder="Nombre"
              className="flex-1 min-w-0 px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              data-testid={`tier-name-${i}`}
            />
            <input
              type="number"
              min={0}
              value={tier.threshold}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!Number.isNaN(value) && value >= 0) {
                  updateTier(i, 'threshold', value);
                }
              }}
              placeholder="Desde $"
              className="w-20 px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              data-testid={`tier-threshold-${i}`}
            />
            <input
              type="number"
              min={0}
              max={100}
              value={tier.discountPercentage}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!Number.isNaN(value) && value >= 0 && value <= 100) {
                  updateTier(i, 'discountPercentage', value);
                }
              }}
              placeholder="%"
              className="w-16 px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500 text-center"
              data-testid={`tier-percentage-${i}`}
            />
            <button
              type="button"
              onClick={() => removeTier(i)}
              className="p-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              aria-label="Eliminar nivel"
              data-testid={`remove-tier-${i}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addTier}
          className="w-full px-2 py-1 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 text-xs text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
          data-testid="add-tier-btn"
        >
          + Agregar nivel
        </button>
      </div>

      {/* Tier badge icon */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Icono de insignia de nivel
        </label>
        <IconPicker
          value={config.tierBadgeIcons?.[0] ?? ''}
          onChange={(iconId) => onChange({ tierBadgeIcons: [iconId] })}
          category="badge"
        />
      </div>

      {/* Tier indicator ring color */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Color de indicador de nivel
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={config.progressBarColor}
            onChange={(e) => onChange({ progressBarColor: e.target.value })}
            className="w-10 h-10 rounded-lg border border-neutral-300 dark:border-neutral-700 cursor-pointer p-0 overflow-hidden"
            data-testid="tier-color-input"
          />
          <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">{config.progressBarColor}</span>
        </div>
      </div>

      {/* Percentage display style */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Estilo de visualización de porcentaje
        </label>
        <div className="grid grid-cols-3 gap-2">
          {DISPLAY_STYLES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ percentageDisplayStyle: opt.value })}
              className={`px-2 py-1 rounded-lg border text-xs font-medium transition-colors ${
                config.percentageDisplayStyle === opt.value
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500'
              }`}
              data-testid={`display-style-${opt.value}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
