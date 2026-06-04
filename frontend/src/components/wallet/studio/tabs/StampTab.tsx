/**
 * Stamp card configuration tab.
 */

'use client';

import React, { useCallback } from 'react';
import type { StampCardConfig } from '@/components/wallet/types/card-type-config';
import { IconPicker } from '@/components/wallet/studio/IconPicker';
import { StampGrid } from '@/components/wallet/studio/StampGrid';

export interface StampTabProps {
  config: StampCardConfig;
  onChange: (config: Partial<StampCardConfig>) => void;
}

const SHAPE_OPTIONS: Array<{ value: StampCardConfig['stampShape']; label: string }> = [
  { value: 'circle', label: 'Círculo' },
  { value: 'square', label: 'Cuadrado' },
  { value: 'star', label: 'Estrella' },
  { value: 'heart', label: 'Corazón' },
  { value: 'diamond', label: 'Diamante' },
  { value: 'hexagon', label: 'Hexágono' },
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
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        Configuración de Sellos
      </h3>

      {/* Stamps required */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Sellos necesarios
        </label>
        <input
          type="number"
          min={1}
          max={20}
          value={config.stampsRequired}
          onChange={handleNumberChange('stampsRequired', 1, 20)}
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="stamps-required-input"
        />
      </div>

      {/* Reward description */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Descripción de recompensa
        </label>
        <input
          type="text"
          value={config.rewardDescription}
          onChange={handleTextChange('rewardDescription')}
          placeholder="Ej: Café gratis"
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="reward-description-input"
        />
      </div>

      {/* Stamp shape */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Forma del sello
        </label>
        <div className="grid grid-cols-3 gap-2">
          {SHAPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleShapeChange(opt.value)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${
                config.stampShape === opt.value
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500'
              }`}
              data-testid={`shape-option-${opt.value}`}
            >
              <ShapePreview shape={opt.value} color={config.stampColor} />
              <span className="text-[10px] text-neutral-600 dark:text-neutral-400">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stamp icon */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Icono del sello
        </label>
        <IconPicker
          value={config.stampFilledIcon}
          onChange={(iconId) => onChange({ stampFilledIcon: iconId })}
          category="stamp"
        />
      </div>

      {/* Stamp color */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Color del sello
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={config.stampColor}
            onChange={(e) => onChange({ stampColor: e.target.value })}
            className="w-10 h-10 rounded-lg border border-neutral-300 dark:border-neutral-700 cursor-pointer p-0 overflow-hidden"
            data-testid="stamp-color-input"
          />
          <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">{config.stampColor}</span>
        </div>
      </div>

      {/* Grid layout */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Disposición
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleGridLayoutChange(true)}
            className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              config.stampGridLayout !== 'dynamic'
                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500'
            }`}
            data-testid="layout-grid"
          >
            Cuadrícula
          </button>
          <button
            type="button"
            onClick={() => handleGridLayoutChange(false)}
            className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              config.stampGridLayout === 'dynamic'
                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500'
            }`}
            data-testid="layout-linear"
          >
            Lineal
          </button>
        </div>
      </div>

      {/* Stamp type */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Tipo de sello
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleStampTypeChange('visit')}
            className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              config.stampType === 'visit'
                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500'
            }`}
            data-testid="stamp-type-visit"
          >
            Visita
          </button>
          <button
            type="button"
            onClick={() => handleStampTypeChange('consumption')}
            className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              config.stampType === 'consumption'
                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500'
            }`}
            data-testid="stamp-type-consumption"
          >
            Consumo
          </button>
        </div>
      </div>

      {/* Consumption per stamp */}
      {config.stampType === 'consumption' && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
            Consumo por sello
          </label>
          <input
            type="number"
            min={1}
            value={config.consumptionPerStamp}
            onChange={handleNumberChange('consumptionPerStamp', 1, 9999)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            data-testid="consumption-per-stamp-input"
          />
        </div>
      )}

      {/* Daily stamp limit */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Límite diario de sellos
        </label>
        <input
          type="number"
          min={0}
          max={100}
          value={config.dailyStampLimit}
          onChange={handleNumberChange('dailyStampLimit', 0, 100)}
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="daily-stamp-limit-input"
        />
      </div>

      {/* Birthday stamps */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Sellos de cumpleaños
        </label>
        <input
          type="number"
          min={0}
          max={20}
          value={config.birthdayStamps}
          onChange={handleNumberChange('birthdayStamps', 0, 20)}
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="birthday-stamps-input"
        />
      </div>

      {/* Live preview */}
      <div className="space-y-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 p-4">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Vista previa
        </label>
        <StampGrid
          stampsRequired={config.stampsRequired}
          stampsEarned={Math.min(3, config.stampsRequired)}
          stampShape={config.stampShape}
          stampIcon={config.stampFilledIcon}
          stampColor={config.stampColor}
          layout={config.stampGridLayout === 'dynamic' ? 'linear' : 'grid'}
        />
      </div>
    </div>
  );
}
