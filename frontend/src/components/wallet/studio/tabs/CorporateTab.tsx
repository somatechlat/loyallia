/**
 * Corporate discount configuration tab.
 */

'use client';

import React, { useCallback } from 'react';
import type { CorporateDiscountCardConfig } from '@/components/wallet/types/card-type-config';
import { IconPicker } from '@/components/wallet/studio/IconPicker';

export interface CorporateTabProps {
  config: CorporateDiscountCardConfig;
  onChange: (config: Partial<CorporateDiscountCardConfig>) => void;
}

const BADGE_STYLES: Array<{ value: CorporateDiscountCardConfig['badgeStyle']; label: string }> = [
  { value: 'corporate', label: 'Corporativo' },
  { value: 'standard', label: 'Estándar' },
  { value: 'minimal', label: 'Minimal' },
];

function CorporatePreview({ config }: { config: CorporateDiscountCardConfig }) {
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: config.idBadgeColor }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
            <path d="M9 22v-4h6v4" />
            <path d="M8 6h.01" />
            <path d="M16 6h.01" />
            <path d="M8 10h.01" />
            <path d="M16 10h.01" />
            <path d="M12 14h.01" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            {config.companyName || 'Empresa'}
          </p>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {config.corporateDiscountPercentage}% descuento corporativo
          </p>
        </div>
      </div>
      {config.employeeIdRequired && (
        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Requiere ID de empleado
        </div>
      )}
      {config.securitySeal && (
        <div className="flex items-center gap-1.5 text-[11px] text-green-600 dark:text-green-400">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          Sello de seguridad activo
        </div>
      )}
    </div>
  );
}

export function CorporateTab({ config, onChange }: CorporateTabProps) {
  const handleNumberChange = useCallback(
    (field: keyof CorporateDiscountCardConfig, min: number, max: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      if (!Number.isNaN(value) && value >= min && value <= max) {
        onChange({ [field]: value } as Partial<CorporateDiscountCardConfig>);
      }
    },
    [onChange]
  );

  const handleTextChange = useCallback(
    (field: keyof CorporateDiscountCardConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ [field]: e.target.value } as Partial<CorporateDiscountCardConfig>);
    },
    [onChange]
  );

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        Configuración de Descuento Corporativo
      </h3>

      {/* Company name */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Nombre de la empresa
        </label>
        <input
          type="text"
          value={config.companyName}
          onChange={handleTextChange('companyName')}
          placeholder="Ej: Acme Corp"
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="company-name-input"
        />
      </div>

      {/* Corporate discount percentage */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Porcentaje de descuento corporativo
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            value={config.corporateDiscountPercentage}
            onChange={handleNumberChange('corporateDiscountPercentage', 0, 100)}
            className="flex-1"
            data-testid="corporate-discount-slider"
          />
          <input
            type="number"
            min={0}
            max={100}
            value={config.corporateDiscountPercentage}
            onChange={handleNumberChange('corporateDiscountPercentage', 0, 100)}
            className="w-16 px-2 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 text-center"
            data-testid="corporate-discount-input"
          />
          <span className="text-sm text-neutral-500 dark:text-neutral-400">%</span>
        </div>
      </div>

      {/* Employee ID required */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.employeeIdRequired}
            onChange={(e) => onChange({ employeeIdRequired: e.target.checked })}
            className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-700 text-blue-600 focus:ring-blue-500"
            data-testid="employee-id-toggle"
          />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            Requiere ID de empleado
          </span>
        </label>
      </div>

      {/* Building icon */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Icono de edificio
        </label>
        <IconPicker
          value={config.buildingIcon ?? ''}
          onChange={(iconId) => onChange({ buildingIcon: iconId })}
          category="finance"
        />
      </div>

      {/* Department badge */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Insignia de departamento
        </label>
        <IconPicker
          value={config.departmentBadge ?? ''}
          onChange={(iconId) => onChange({ departmentBadge: iconId })}
          category="badge"
        />
      </div>

      {/* ID badge color */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Color de insignia ID
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={config.idBadgeColor}
            onChange={(e) => onChange({ idBadgeColor: e.target.value })}
            className="w-10 h-10 rounded-lg border border-neutral-300 dark:border-neutral-700 cursor-pointer p-0 overflow-hidden"
            data-testid="id-badge-color-input"
          />
          <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">{config.idBadgeColor}</span>
        </div>
      </div>

      {/* Badge style */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Estilo de insignia
        </label>
        <div className="flex gap-2">
          {BADGE_STYLES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ badgeStyle: opt.value })}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                config.badgeStyle === opt.value
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500'
              }`}
              data-testid={`badge-style-${opt.value}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Security seal */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.securitySeal ?? false}
            onChange={(e) => onChange({ securitySeal: e.target.checked })}
            className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-700 text-blue-600 focus:ring-blue-500"
            data-testid="security-seal-toggle"
          />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            Sello de seguridad
          </span>
        </label>
      </div>

      {/* Live preview */}
      <div className="space-y-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 p-4">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Vista previa
        </label>
        <CorporatePreview config={config} />
      </div>
    </div>
  );
}
