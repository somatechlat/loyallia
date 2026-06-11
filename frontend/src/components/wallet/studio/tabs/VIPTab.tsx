/**
 * VIP membership configuration tab.
 */

'use client';

import React, { useCallback } from 'react';
import type { VipMembershipCardConfig } from '@/components/wallet/types/card-type-config';
import { IconPicker } from '@/components/wallet/studio/IconPicker';

export interface VIPTabProps {
  config: VipMembershipCardConfig;
  onChange: (config: Partial<VipMembershipCardConfig>) => void;
}

const BADGE_STYLES: Array<{ value: VipMembershipCardConfig['memberBadgeStyle']; label: string; color: string }> = [
  { value: 'gold', label: 'Oro', color: '#FFD700' },
  { value: 'silver', label: 'Plata', color: '#C0C0C0' },
  { value: 'platinum', label: 'Platino', color: '#E5E4E2' },
  { value: 'bronze', label: 'Bronce', color: '#CD7F32' },
];

const COMMON_PERKS = [
  'Acceso prioritario',
  'Envío gratis',
  'Descuentos exclusivos',
  'Atención personalizada',
  'Regalos de cumpleaños',
  'Eventos exclusivos',
  'Ampliación de garantía',
];

export function VIPTab({ config, onChange }: VIPTabProps) {
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
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">
        Configuración de Membresía VIP
      </h3>

      {/* Membership name */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Nombre de la membresía
        </label>
        <input
          type="text"
          value={config.membershipName}
          onChange={handleTextChange('membershipName')}
          placeholder="Ej: Club Premium"
          className="w-full px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="membership-name-input"
        />
      </div>

      {/* Monthly fee */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Cuota mensual
        </label>
        <input
          type="number"
          min={0}
          value={config.monthlyFee}
          onChange={handleNumberChange('monthlyFee', 0, 999999)}
          className="w-full px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="monthly-fee-input"
        />
      </div>

      {/* Annual fee */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Cuota anual
        </label>
        <input
          type="number"
          min={0}
          value={config.annualFee}
          onChange={handleNumberChange('annualFee', 0, 999999)}
          className="w-full px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="annual-fee-input"
        />
      </div>

      {/* Validity period */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Periodo de validez
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['monthly', 'annual', 'lifetime'] as const).map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => handleValidityChange(period)}
              className={`px-2 py-1 rounded-lg border text-xs font-medium transition-colors ${
                config.validityPeriod === period
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500'
              }`}
              data-testid={`validity-${period}`}
            >
              {period === 'monthly' ? 'Mensual' : period === 'annual' ? 'Anual' : 'Vitalicia'}
            </button>
          ))}
        </div>
      </div>

      {/* Perks */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Beneficios
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
            placeholder="Agregar beneficio…"
            className="flex-1 px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="px-2 py-1 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
            data-testid="add-perk-btn"
          >
            +
          </button>
        </div>
      </div>

      {/* Common perks checklist */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Beneficios comunes
        </label>
        <div className="space-y-1">
          {COMMON_PERKS.map((perk) => {
            const checked = config.perks.includes(perk);
            return (
              <label
                key={perk}
                className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer"
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
                <span className="text-xs text-neutral-700 dark:text-neutral-300">{perk}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Crown icon */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Icono de corona
        </label>
        <IconPicker
          value={config.crownIcon}
          onChange={(iconId) => onChange({ crownIcon: iconId })}
          category="badge"
        />
      </div>

      {/* Member badge style */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Estilo de insignia de miembro
        </label>
        <div className="grid grid-cols-2 gap-2">
          {BADGE_STYLES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ memberBadgeStyle: opt.value })}
              className={`flex items-center gap-2 px-2 py-1 rounded-lg border text-xs font-medium transition-colors ${
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

      {/* Benefits list icons */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Icono para beneficios
        </label>
        <IconPicker
          value={config.benefitsListIcons?.[0] ?? ''}
          onChange={(iconId) => onChange({ benefitsListIcons: [iconId] })}
          category="decorative"
        />
      </div>
    </div>
  );
}
