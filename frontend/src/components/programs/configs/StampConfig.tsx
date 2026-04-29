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
import Tooltip from '@/components/ui/Tooltip';
import type { ConfigProps } from './types';

/** Stamp card configuration form with visit/consumption modes, expiry, and bonus settings. */
const StampConfig = React.memo(function StampConfig({ meta, setMeta }: ConfigProps) {
  const set = useCallback((k: string, v: unknown) => setMeta((prev: Record<string, unknown>) => ({ ...prev, [k]: v })), [setMeta]);

  return (
    <div className="space-y-5">
      {/* Stamp Type Selector */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="label mb-0">Tipo de sello</label>
          <Tooltip text="Elige cómo tus clientes ganarán sellos: por cada visita individual o basado en el consumo monetario." />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(['visit', 'consumption'] as const).map(stampType => (
            <label key={stampType} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              (meta.stamp_type ?? 'visit') === stampType
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                : 'border-surface-200 dark:border-surface-700'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <input type="radio" name="stamp_type" value={stampType}
                  checked={(meta.stamp_type ?? 'visit') === stampType}
                  onChange={() => set('stamp_type', stampType)} className="accent-brand-500" />
                <span className="font-semibold text-sm text-surface-900 dark:text-white">
                  {stampType === 'visit' ? 'Otorgar sello por visita' : 'Otorgar sello por consumo'}
                </span>
                <Tooltip text={stampType === 'visit'
                  ? 'Por cada consumo que tenga tu cliente, independientemente del monto, se le otorgará un sello.'
                  : 'Tú decides cuánto consumo equivale a un sello. Es obligatorio poner la equivalencia.'
                } />
              </div>
              <p className="text-xs text-surface-500 ml-5">
                {stampType === 'visit' ? '1 visita = 1 sello' : '$X consumo = 1 sello'}
              </p>
            </label>
          ))}
        </div>
        {/* Consumption Equivalence */}
        {meta.stamp_type === 'consumption' && (
          <div className="mt-3 p-4 bg-surface-50 dark:bg-surface-800 rounded-xl">
            <label className="label">Equivalencia consumo-sello</label>
            <div className="flex items-center gap-2">
              <span className="font-bold text-surface-500">$</span>
              <input type="number" min={1} step={0.01} className="input w-24"
                value={meta.consumption_per_stamp as number ?? 10}
                onChange={e => set('consumption_per_stamp', parseFloat(e.target.value) || 10)} />
              <span className="text-sm text-surface-600 dark:text-surface-400">dólares en consumo equivale a 1 sello</span>
            </div>
          </div>
        )}
      </div>

      {/* Stamps Required */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <label className="label mb-0">Sellos requeridos para la recompensa</label>
          <Tooltip text="Cantidad total de sellos que el cliente debe acumular para obtener su recompensa." />
        </div>
        <input type="number" min={1} max={99} className="input" value={meta.stamps_required as number ?? 10}
          onChange={e => set('stamps_required', parseInt(e.target.value) || 10)} />
      </div>

      {/* Reward Description */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <label className="label mb-0">Descripción de la recompensa</label>
          <Tooltip text="El premio que obtendrá el cliente al completar todos los sellos." />
        </div>
        <input type="text" className="input" placeholder="Ej: Plato a la carta gratis" value={meta.reward_description as string ?? ''}
          onChange={e => set('reward_description', e.target.value)} />
      </div>

      {/* Expiry Options */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="label mb-0">Vigencia de la tarjeta</label>
          <Tooltip text="Define si la tarjeta tiene vencimiento o es ilimitada. Si es ilimitada, se reinicia al completar todos los sellos." />
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
                {expiryType === 'unlimited' ? 'Ilimitado' : 'Por periodo de tiempo'}
              </span>
              {expiryType === 'unlimited' && (
                <Tooltip text="La tarjeta no tiene fecha de vencimiento. Al completar los sellos, se reinicia de nuevo a 0." />
              )}
            </label>
          ))}
        </div>
        {meta.stamp_expiry === 'period' && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="label">Fecha de inicio</label>
              <input type="date" className="input" value={meta.stamp_start_date as string ?? ''}
                onChange={e => set('stamp_start_date', e.target.value)} />
            </div>
            <div>
              <label className="label">Fecha de fin</label>
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
          { key: 'stamps_at_issue', label: 'Sellos al emitir', tooltip: 'Cantidad de sellos de bonificación que se otorgan cuando el cliente agrega la tarjeta a su wallet.', min: 0, max: 10, default: 0 },
          { key: 'daily_stamp_limit', label: 'Límite por día', tooltip: 'Cantidad máxima de sellos que un cliente puede ganar en un solo día.', min: 1, max: 99, default: 5 },
          { key: 'birthday_stamps', label: 'Sellos cumpleaños', tooltip: 'Sellos extra que se otorgan al cliente el día de su cumpleaños. Requiere fecha de nacimiento en el formulario de registro.', min: 0, max: 10, default: 0 },
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

export default StampConfig;
