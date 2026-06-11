/**
 * Coupon card configuration tab.
 */

'use client';

import React, { useCallback } from 'react';
import type { CouponCardConfig } from '@/components/wallet/types/card-type-config';

export interface CouponTabProps {
  config: CouponCardConfig;
  onChange: (config: Partial<CouponCardConfig>) => void;
}

const CUT_LINE_OPTIONS: Array<{ value: CouponCardConfig['cutLineStyle']; label: string }> = [
  { value: 'dashed', label: 'Discontinua' },
  { value: 'dotted', label: 'Punteada' },
  { value: 'solid', label: 'Sólida' },
  { value: 'zigzag', label: 'Zigzag' },
];

const BADGE_STYLE_OPTIONS: Array<{ value: CouponCardConfig['discountBadgeStyle']; label: string }> = [
  { value: 'pill', label: 'Píldora' },
  { value: 'banner', label: 'Banner' },
  { value: 'circle', label: 'Círculo' },
  { value: 'tag', label: 'Etiqueta' },
];

function CutLinePreview({ style }: { style: CouponCardConfig['cutLineStyle'] }) {
  const dashArray = {
    dashed: '8 4',
    dotted: '2 4',
    solid: 'none',
    zigzag: 'none',
  }[style];

  if (style === 'zigzag') {
    return (
      <svg height="12" width="100%" viewBox="0 0 200 12" preserveAspectRatio="none">
        <polyline
          points="0,6 10,0 20,6 30,0 40,6 50,0 60,6 70,0 80,6 90,0 100,6 110,0 120,6 130,0 140,6 150,0 160,6 170,0 180,6 190,0 200,6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-neutral-400 dark:text-neutral-500"
        />
      </svg>
    );
  }

  return (
    <svg height="12" width="100%">
      <line
        x1="0"
        y1="6"
        x2="100%"
        y2="6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray={dashArray}
        className="text-neutral-400 dark:text-neutral-500"
      />
    </svg>
  );
}

export function CouponTab({ config, onChange }: CouponTabProps) {
  const handleNumberChange = useCallback(
    (field: keyof CouponCardConfig, min: number, max: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      if (!Number.isNaN(value) && value >= min && value <= max) {
        onChange({ [field]: value } as Partial<CouponCardConfig>);
      }
    },
    [onChange]
  );

  const handleTextChange = useCallback(
    (field: keyof CouponCardConfig) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ [field]: e.target.value } as Partial<CouponCardConfig>);
    },
    [onChange]
  );

  const handleDiscountTypeChange = useCallback(
    (discountType: CouponCardConfig['discountType']) => {
      onChange({ discountType });
    },
    [onChange]
  );

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">
        Configuración de Cupón
      </h3>

      {/* Discount type */}
      <div className="space-y-0.5">
        <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          Tipo de descuento
        </label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => handleDiscountTypeChange('percentage')}
            className={`flex-1 px-2 py-1 rounded-md border text-xs font-medium transition-colors ${
              config.discountType === 'percentage'
                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500'
            }`}
            data-testid="discount-type-percentage"
          >
            Porcentaje
          </button>
          <button
            type="button"
            onClick={() => handleDiscountTypeChange('fixed_amount')}
            className={`flex-1 px-2 py-1 rounded-md border text-xs font-medium transition-colors ${
              config.discountType === 'fixed_amount'
                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500'
            }`}
            data-testid="discount-type-fixed"
          >
            Monto fijo
          </button>
        </div>
      </div>

      {/* Discount value */}
      <div className="space-y-0.5">
        <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          Valor del descuento
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={config.discountType === 'percentage' ? 100 : 999999}
            value={config.discountValue}
            onChange={handleNumberChange('discountValue', 0, config.discountType === 'percentage' ? 100 : 999999)}
            className="w-full px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="discount-value-input"
          />
          <span className="text-xs text-neutral-500 dark:text-neutral-400 w-8">
            {config.discountType === 'percentage' ? '%' : '$'}
          </span>
        </div>
      </div>

      {/* Usage limit */}
      <div className="space-y-0.5">
        <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          Límite de uso por cliente
        </label>
        <input
          type="number"
          min={1}
          max={999}
          value={config.usageLimitPerCustomer}
          onChange={handleNumberChange('usageLimitPerCustomer', 1, 999)}
          className="w-full px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="usage-limit-input"
        />
      </div>

      {/* Coupon description */}
      <div className="space-y-0.5">
        <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          Descripción del cupón
        </label>
        <textarea
          value={config.couponDescription}
          onChange={handleTextChange('couponDescription')}
          rows={3}
          className="w-full px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          data-testid="coupon-description-input"
        />
      </div>

      {/* Push message */}
      <div className="space-y-0.5">
        <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          Mensaje push
        </label>
        <input
          type="text"
          value={config.pushMessage}
          onChange={handleTextChange('pushMessage')}
          placeholder="Ej: ¡Nueva oferta disponible!"
          className="w-full px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="push-message-input"
        />
      </div>

      {/* Special promotion text */}
      <div className="space-y-0.5">
        <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          Texto promocional especial
        </label>
        <input
          type="text"
          value={config.specialPromotionText}
          onChange={handleTextChange('specialPromotionText')}
          placeholder="Ej: ¡Solo por tiempo limitado!"
          className="w-full px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="promotion-text-input"
        />
      </div>

      {/* Expiry */}
      <div className="space-y-0.5">
        <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          Vencimiento
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange({ couponExpiry: 'unlimited' })}
            className={`flex-1 px-2 py-1 rounded-md border text-xs font-medium transition-colors ${
              config.couponExpiry === 'unlimited'
                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500'
            }`}
            data-testid="expiry-unlimited"
          >
            Ilimitado
          </button>
          <div className="flex-1 flex items-center gap-2 px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700">
            <input
              type="number"
              min={1}
              value={typeof config.couponExpiry === 'number' ? config.couponExpiry : ''}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                if (!Number.isNaN(value) && value >= 1) {
                  onChange({ couponExpiry: value });
                }
              }}
              placeholder="Días"
              className="w-full text-xs text-neutral-800 dark:text-neutral-100 bg-transparent focus:outline-none"
              data-testid="expiry-days-input"
            />
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 whitespace-nowrap">días</span>
          </div>
        </div>
      </div>

      {/* Start/End dates */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Fecha de inicio
          </label>
          <input
            type="date"
            value={config.couponStartDate ?? ''}
            onChange={(e) => onChange({ couponStartDate: e.target.value || undefined })}
            className="w-full px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="coupon-start-date-input"
          />
        </div>
        <div className="space-y-0.5">
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Fecha de fin
          </label>
          <input
            type="date"
            value={config.couponEndDate ?? ''}
            onChange={(e) => onChange({ couponEndDate: e.target.value || undefined })}
            className="w-full px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="coupon-end-date-input"
          />
        </div>
      </div>

      {/* Cut line style */}
      <div className="space-y-0.5">
        <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          Estilo de línea de corte
        </label>
        <div className="grid grid-cols-2 gap-2">
          {CUT_LINE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ cutLineStyle: opt.value })}
              className={`flex flex-col items-center gap-0.5 p-1 rounded-md border transition-colors ${
                config.cutLineStyle === opt.value
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500'
              }`}
              data-testid={`cut-line-${opt.value}`}
            >
              <CutLinePreview style={opt.value} />
              <span className="text-[10px] text-neutral-600 dark:text-neutral-400">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Discount badge style */}
      <div className="space-y-0.5">
        <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          Estilo de insignia de descuento
        </label>
        <div className="grid grid-cols-2 gap-2">
          {BADGE_STYLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ discountBadgeStyle: opt.value })}
              className={`px-2 py-1 rounded-md border text-xs font-medium transition-colors ${
                config.discountBadgeStyle === opt.value
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

      {/* Offer tag */}
      <div className="space-y-0.5">
        <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          Etiqueta de oferta
        </label>
        <input
          type="text"
          value={config.offerTag}
          onChange={handleTextChange('offerTag')}
          placeholder="Ej: FLASH SALE"
          className="w-full px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="offer-tag-input"
        />
      </div>
    </div>
  );
}
