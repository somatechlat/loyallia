/**
 * Gift certificate configuration tab.
 */

'use client';

import React, { useCallback } from 'react';
import type { GiftCertificateCardConfig } from '@/components/wallet/types/card-type-config';
import { IconPicker } from '@/components/wallet/studio/IconPicker';

export interface GiftTabProps {
  config: GiftCertificateCardConfig;
  onChange: (config: Partial<GiftCertificateCardConfig>) => void;
}

const OCCASIONS = ['Cumpleaños', 'Navidad', 'Aniversario', 'Gracias', 'San Valentín', 'Graduación'];

export function GiftTab({ config, onChange }: GiftTabProps) {
  const handleNumberChange = useCallback(
    (field: keyof GiftCertificateCardConfig, min: number, max: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      if (!Number.isNaN(value) && value >= min && value <= max) {
        onChange({ [field]: value } as Partial<GiftCertificateCardConfig>);
      }
    },
    [onChange]
  );

  const addDenomination = useCallback(
    (value: number) => {
      if (!config.denominations.includes(value)) {
        onChange({ denominations: [...config.denominations, value].sort((a, b) => a - b) });
      }
    },
    [config.denominations, onChange]
  );

  const removeDenomination = useCallback(
    (index: number) => {
      const next = [...config.denominations];
      next.splice(index, 1);
      onChange({ denominations: next });
    },
    [config.denominations, onChange]
  );

  const [newDenomination, setNewDenomination] = React.useState('');

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">
        Configuración de Tarjeta Regalo
      </h3>

      {/* Denominations */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Denominaciones
        </label>
        <div className="flex flex-wrap gap-1.5">
          {config.denominations.map((denom, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-[11px] border border-green-200 dark:border-green-800"
            >
              ${denom}
              <button
                type="button"
                onClick={() => removeDenomination(i)}
                className="hover:text-green-900 dark:hover:text-green-100"
                data-testid={`remove-denomination-${i}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            value={newDenomination}
            onChange={(e) => setNewDenomination(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const value = parseFloat(newDenomination);
                if (!Number.isNaN(value) && value > 0) {
                  addDenomination(value);
                  setNewDenomination('');
                }
              }
            }}
            placeholder="Monto"
            className="flex-1 px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            data-testid="denomination-input"
          />
          <button
            type="button"
            onClick={() => {
              const value = parseFloat(newDenomination);
              if (!Number.isNaN(value) && value > 0) {
                addDenomination(value);
                setNewDenomination('');
              }
            }}
            className="px-2 py-1 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
            data-testid="add-denomination-btn"
          >
            +
          </button>
        </div>
      </div>

      {/* Expiry days */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Días de expiración
        </label>
        <input
          type="number"
          min={1}
          value={config.expiryDays}
          onChange={handleNumberChange('expiryDays', 1, 9999)}
          className="w-full px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="expiry-days-input"
        />
      </div>

      {/* Box graphic */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Gráfico de caja
        </label>
        <IconPicker
          value={config.boxGraphic}
          onChange={(iconId) => onChange({ boxGraphic: iconId })}
          category="decorative"
        />
      </div>

      {/* Ribbon color */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Color de listón
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={config.ribbonColor}
            onChange={(e) => onChange({ ribbonColor: e.target.value })}
            className="w-10 h-10 rounded-lg border border-neutral-300 dark:border-neutral-700 cursor-pointer p-0 overflow-hidden"
            data-testid="ribbon-color-input"
          />
          <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">{config.ribbonColor}</span>
        </div>
      </div>

      {/* Occasion */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Ocasión
        </label>
        <select
          value={config.occasion ?? ''}
          onChange={(e) => onChange({ occasion: e.target.value || undefined })}
          className="w-full px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="occasion-select"
        >
          <option value="">Seleccionar…</option>
          {OCCASIONS.map((occ) => (
            <option key={occ} value={occ}>
              {occ}
            </option>
          ))}
        </select>
      </div>

      {/* Denomination badge */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Estilo de insignia de denominación
        </label>
        <input
          type="text"
          value={config.denominationBadge}
          onChange={(e) => onChange({ denominationBadge: e.target.value })}
          placeholder="Ej: Círculo, Tag, Banner"
          className="w-full px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="denomination-badge-input"
        />
      </div>
    </div>
  );
}
