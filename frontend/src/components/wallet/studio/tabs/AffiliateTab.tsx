/**
 * Affiliate configuration tab.
 */

'use client';

import React, { useCallback } from 'react';
import type { AffiliateCardConfig } from '@/components/wallet/types/card-type-config';
import { IconPicker } from '@/components/wallet/studio/IconPicker';

export interface AffiliateTabProps {
  config: AffiliateCardConfig;
  onChange: (config: Partial<AffiliateCardConfig>) => void;
}

function AffiliatePreview({ config }: { config: AffiliateCardConfig }) {
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: config.badgeColor }}
        >
          A
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Programa de Afiliados</p>
          {config.affiliateCodePattern && (
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
              Código: {config.affiliateCodePattern}
            </p>
          )}
        </div>
      </div>
      {config.benefitsDescription && (
        <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
          {config.benefitsDescription}
        </p>
      )}
      {config.referralBannerText && (
        <p className="text-[10px] text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-700 px-2 py-1 rounded">
          {config.referralBannerText}
        </p>
      )}
    </div>
  );
}

export function AffiliateTab({ config, onChange }: AffiliateTabProps) {
  const handleTextChange = useCallback(
    (field: keyof AffiliateCardConfig) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ [field]: e.target.value } as Partial<AffiliateCardConfig>);
    },
    [onChange]
  );

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        Configuración de Afiliado
      </h3>

      {/* Affiliate code pattern */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Patrón de código de afiliado
        </label>
        <input
          type="text"
          value={config.affiliateCodePattern}
          onChange={handleTextChange('affiliateCodePattern')}
          placeholder="Ej: AFF-{number}"
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="affiliate-code-input"
        />
      </div>

      {/* Benefits description */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Descripción de beneficios
        </label>
        <textarea
          value={config.benefitsDescription}
          onChange={handleTextChange('benefitsDescription')}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          data-testid="benefits-description-input"
        />
      </div>

      {/* Badge color */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Color de insignia
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={config.badgeColor}
            onChange={(e) => onChange({ badgeColor: e.target.value })}
            className="w-10 h-10 rounded-lg border border-neutral-300 dark:border-neutral-700 cursor-pointer p-0 overflow-hidden"
            data-testid="badge-color-input"
          />
          <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">{config.badgeColor}</span>
        </div>
      </div>

      {/* Referral banner text */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Texto del banner de referido
        </label>
        <input
          type="text"
          value={config.referralBannerText}
          onChange={handleTextChange('referralBannerText')}
          placeholder="Ej: Invita y gana"
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="banner-text-input"
        />
      </div>

      {/* Referral chain icon */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Icono de cadena de referidos
        </label>
        <IconPicker
          value={config.referralChainIcon ?? ''}
          onChange={(iconId) => onChange({ referralChainIcon: iconId })}
          category="social"
        />
      </div>

      {/* Ambassador badge */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Insignia de embajador
        </label>
        <IconPicker
          value={config.ambassadorBadge ?? ''}
          onChange={(iconId) => onChange({ ambassadorBadge: iconId })}
          category="badge"
        />
      </div>

      {/* Live preview */}
      <div className="space-y-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 p-4">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Vista previa
        </label>
        <AffiliatePreview config={config} />
      </div>
    </div>
  );
}
