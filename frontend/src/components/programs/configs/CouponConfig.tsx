'use client';

/**
 * CouponConfig — Configuration for coupon-type loyalty cards.
 *
 * Extracted from TypeConfig.tsx (LYL-C-FE-002: mega-component decomposition).
 *
 * @param meta - Program metadata object
 * @param setMeta - State setter for metadata
 */
import React, { useCallback } from 'react';
import Tooltip from '@/components/ui/Tooltip';
import type { ConfigProps } from './types';

/** Coupon card configuration with discount types, dates, push notifications. */
const CouponConfig = React.memo(function CouponConfig({ meta, setMeta }: ConfigProps) {
  const set = useCallback((k: string, v: unknown) => setMeta((prev: Record<string, unknown>) => ({ ...prev, [k]: v })), [setMeta]);

  return (
    <div className="space-y-5">
      {/* Discount Type Selection */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="label mb-0">Tipo de descuento</label>
          <Tooltip text="Crea un cupón para ofrecer beneficios directos a tus clientes. Elige el tipo de descuento que mejor se adapte a tu estrategia." />
        </div>
        <div className="grid grid-cols-1 gap-2">
          {[
            { value: 'fixed_amount', label: 'Descuento de valor fijo', tooltip: 'Define un monto fijo que se descontará del total de la compra del cliente.' },
            { value: 'percentage', label: 'Descuento porcentual', tooltip: 'Aplica un porcentaje de descuento sobre el total de la compra del cliente.' },
            { value: 'special_promotion', label: 'Promoción especial', tooltip: 'Escribe el beneficio exacto que recibirá el cliente, como 2x1 o producto gratis.' },
          ].map(opt => (
            <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
              meta.discount_type === opt.value
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'
            }`}>
              <input type="radio" name="discount_type" value={opt.value}
                checked={meta.discount_type === opt.value}
                onChange={() => set('discount_type', opt.value)} className="accent-brand-500" />
              <span className="font-medium text-sm text-surface-900 dark:text-white">{opt.label}</span>
              <Tooltip text={opt.tooltip} />
            </label>
          ))}
        </div>
      </div>

      {/* Dynamic Fields Based on Type */}
      {meta.discount_type === 'fixed_amount' && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label className="label mb-0">Monto del descuento</label>
            <Tooltip text="Ingresa el valor en dólares que deseas descontar." />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500 font-bold">$</span>
            <input type="number" min={0.01} step={0.01} className="input pl-8" placeholder="5.00"
              value={meta.discount_value as number ?? ''}
              onChange={e => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val >= 0) set('discount_value', val);
                else if (e.target.value === '') set('discount_value', '');
              }} required />
          </div>
        </div>
      )}

      {meta.discount_type === 'percentage' && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label className="label mb-0">Porcentaje de descuento</label>
            <Tooltip text="Ingresa el porcentaje de descuento (entre 1 y 100)." />
          </div>
          <div className="relative">
            <input type="number" min={1} max={100} step={0.01} className="input pr-8" placeholder="15"
              value={meta.discount_value as number ?? ''}
              onChange={e => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val >= 0 && val <= 100) set('discount_value', val);
                else if (e.target.value === '') set('discount_value', '');
              }} required />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 font-bold">%</span>
          </div>
        </div>
      )}

      {meta.discount_type === 'special_promotion' && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label className="label mb-0">Descripción de la promoción</label>
            <Tooltip text="Describe la promoción tal como la verá el cliente." />
          </div>
          <input type="text" className="input" placeholder="Ej: 2x1 en cervezas artesanales" maxLength={100}
            value={meta.special_promotion_text as string ?? ''}
            onChange={e => set('special_promotion_text', e.target.value)} required />
          <p className="text-xs text-surface-400 mt-1 text-right">
            {(meta.special_promotion_text as string ?? '').length}/100 caracteres
          </p>
        </div>
      )}

      {/* Help Section */}
      <details className="group">
        <summary className="cursor-pointer text-xs font-semibold text-brand-500 hover:text-brand-600 flex items-center gap-1">
          <svg className="w-4 h-4 transition-transform group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
          ¿Cuál es la diferencia entre monto fijo y porcentual?
        </summary>
        <div className="mt-2 p-4 bg-surface-50 dark:bg-surface-800 rounded-xl text-xs text-surface-600 dark:text-surface-300 space-y-2">
          <p><strong className="text-surface-900 dark:text-white">Monto fijo:</strong> El valor que especifiques será el valor monetario exacto que obsequiarás a tu cliente.</p>
          <p><strong className="text-surface-900 dark:text-white">Porcentual:</strong> El descuento será calculado a partir del consumo que tenga el cliente.</p>
          <p><strong className="text-surface-900 dark:text-white">Promoción especial:</strong> Texto libre para promociones como &quot;2x1&quot;, &quot;Postre gratis&quot;, o &quot;Bebida de cortesía&quot;.</p>
        </div>
      </details>

      {/* Dates */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="label mb-0">Vigencia del cupón</label>
          <Tooltip text="Define desde cuándo y hasta cuándo el cupón estará disponible para los clientes." />
        </div>
        <div className="space-y-2">
          {(['unlimited', 'dates'] as const).map(expiryType => (
            <label key={expiryType} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
              (meta.coupon_expiry === expiryType || (!meta.coupon_expiry && expiryType === 'unlimited'))
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                : 'border-surface-200 dark:border-surface-700'
            }`}>
              <input type="radio" name="coupon_expiry" value={expiryType}
                checked={meta.coupon_expiry === expiryType || (!meta.coupon_expiry && expiryType === 'unlimited')}
                onChange={() => set('coupon_expiry', expiryType)} className="accent-brand-500" />
              <span className="text-sm text-surface-900 dark:text-white font-medium">
                {expiryType === 'unlimited' ? 'Ilimitado (no vence)' : 'Fechas específicas'}
              </span>
            </label>
          ))}
        </div>
        {meta.coupon_expiry === 'dates' && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="label">Fecha de inicio</label>
              <input type="date" className="input" value={meta.coupon_start_date as string ?? ''} required
                onChange={e => set('coupon_start_date', e.target.value)} />
            </div>
            <div>
              <label className="label">Fecha de fin</label>
              <input type="date" className="input" value={meta.coupon_end_date as string ?? ''} required
                min={meta.coupon_start_date as string ?? ''}
                onChange={e => set('coupon_end_date', e.target.value)} />
              {Boolean(meta.coupon_end_date && meta.coupon_start_date && (meta.coupon_end_date as string) < (meta.coupon_start_date as string)) && (
                <p className="text-xs text-red-500 mt-1">⚠️ La fecha de fin no puede ser anterior a la fecha de inicio</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Uses per customer */}
      <div>
        <label className="label">Usos máximos por cliente</label>
        <input type="number" min={1} className="input" value={meta.usage_limit_per_customer as number ?? 1}
          onChange={e => set('usage_limit_per_customer', parseInt(e.target.value) || 1)} />
      </div>

      {/* Coupon Description */}
      <div>
        <label className="label">Descripción del cupón</label>
        <input type="text" className="input" value={meta.coupon_description as string ?? ''}
          onChange={e => set('coupon_description', e.target.value)} />
      </div>

      {/* Coupon Image */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="label mb-0">Imagen del cupón (URL)</label>
          <Tooltip text="Sube o pega la URL de una imagen que represente el cupón. Se mostrará en la tarjeta de wallet del cliente." />
        </div>
        <input type="url" className="input" placeholder="https://example.com/coupon-image.jpg" value={meta.coupon_image_url as string ?? ''}
          onChange={e => set('coupon_image_url', e.target.value)} />
      </div>

      {/* Push Notification Module */}
      <div className="border-t border-surface-200 dark:border-surface-700 pt-5 mt-5">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-bold text-surface-900 dark:text-white">Notificación automática al guardar el cupón</h3>
          <Tooltip text="Define el título y mensaje que recibirá el cliente cuando guarde este cupón en su wallet." />
        </div>
        <p className="text-xs text-surface-500 mb-3">
          Permite definir un mensaje de notificación push que el cliente recibirá automáticamente cuando agregue o descargue el cupón en su wallet.
        </p>
        <div className="mb-3">
          <label className="label">Título de la notificación</label>
          <input type="text" className="input" placeholder="¡Tu cupón está listo!" maxLength={60}
            value={meta.push_title as string ?? ''}
            onChange={e => set('push_title', e.target.value)} />
          <span className="text-[10px] text-surface-400 mt-0.5 block">{(meta.push_title as string ?? '').length}/60</span>
        </div>
        <div className="relative">
          <textarea className="input min-h-[80px] resize-none"
            placeholder="Tu cupón ya está activo. Disfruta $5 de descuento en tu próxima compra 🍕"
            maxLength={178} value={meta.push_message as string ?? ''}
            onChange={e => set('push_message', e.target.value)} />
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-1">
              <Tooltip text="Este mensaje se enviará automáticamente una sola vez cuando el cliente active el cupón." />
              <span className="text-[10px] text-surface-400">Este campo es opcional</span>
            </div>
            <span className={`text-xs font-mono ${
              (meta.push_message as string ?? '').length > 160 ? 'text-amber-500' : 'text-surface-400'
            }`}>
              {(meta.push_message as string ?? '').length}/178
            </span>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <input type="checkbox" id="push_expiry_reminder" className="w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-500"
            checked={!!meta.push_expiry_reminder}
            onChange={e => set('push_expiry_reminder', e.target.checked)} />
          <label htmlFor="push_expiry_reminder" className="text-sm text-surface-700 dark:text-surface-300">
            Enviar recordatorio push antes de que expire el cupón
          </label>
          <Tooltip text="Se enviará un push de recordatorio 24 horas antes de que el cupón expire." />
        </div>
      </div>
    </div>
  );
});

export default CouponConfig;
