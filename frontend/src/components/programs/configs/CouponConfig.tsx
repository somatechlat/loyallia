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
import { useI18n } from '@/lib/i18n';
import Tooltip from '@/components/ui/Tooltip';
import EmojiPickerButton from '@/components/ui/EmojiPickerButton';
import ImageUploadField from '@/components/ui/ImageUploadField';
import type { ConfigProps } from './types';

/**
 * @description Coupon card configuration with discount types, dates, and push notifications.
 * @param {ConfigProps} props - Component props
 * @returns JSX.Element
 */
const CouponConfig = React.memo(function CouponConfig({ meta, setMeta }: ConfigProps) {
  const { t } = useI18n();
  const set = useCallback((k: string, v: unknown) => setMeta((prev: Record<string, unknown>) => ({ ...prev, [k]: v })), [setMeta]);

  return (
    <div className="space-y-5">
      {/* Discount Type Selection */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="label mb-0">{t('programs.couponConfig.discountType')}</label>
          <Tooltip text={t('programs.couponConfig.discountTypeTooltip')} />
        </div>
        <div className="grid grid-cols-1 gap-2">
          {[
            { value: 'fixed_amount', label: t('programs.couponConfig.fixedAmount'), tooltip: t('programs.couponConfig.fixedAmountTooltip') },
            { value: 'percentage', label: t('programs.couponConfig.percentage'), tooltip: t('programs.couponConfig.percentageTooltip') },
            { value: 'special_promotion', label: t('programs.couponConfig.specialPromotion'), tooltip: t('programs.couponConfig.specialPromotionTooltip') },
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
            <label className="label mb-0">{t('programs.couponConfig.discountAmount')}</label>
            <Tooltip text={t('programs.couponConfig.discountAmountTooltip')} />
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
            <label className="label mb-0">{t('programs.couponConfig.discountPercentage')}</label>
            <Tooltip text={t('programs.couponConfig.discountPercentageTooltip')} />
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
            <label className="label mb-0">{t('programs.couponConfig.promotionDescription')}</label>
            <Tooltip text={t('programs.couponConfig.promotionDescriptionTooltip')} />
          </div>
          <input type="text" className="input" placeholder={t('programs.couponConfig.promotionPlaceholder')} maxLength={100}
            value={meta.special_promotion_text as string ?? ''}
            onChange={e => set('special_promotion_text', e.target.value)} required />
          <p className="text-xs text-surface-400 mt-1 text-right">
            {(meta.special_promotion_text as string ?? '').length}/100 {t('common.characters')}
          </p>
        </div>
      )}

      {/* Help Section */}
      <details className="group">
        <summary className="cursor-pointer text-xs font-semibold text-brand-500 hover:text-brand-600 flex items-center gap-1">
          <svg className="w-4 h-4 transition-transform group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
          {t('programs.couponConfig.differenceTitle')}
        </summary>
        <div className="mt-2 p-4 bg-surface-50 dark:bg-surface-800 rounded-xl text-xs text-surface-600 dark:text-surface-300 space-y-2">
          <p><strong className="text-surface-900 dark:text-white">{t('programs.couponConfig.fixedAmount')}:</strong> {t('programs.couponConfig.fixedAmountDesc')}</p>
          <p><strong className="text-surface-900 dark:text-white">{t('programs.couponConfig.percentage')}:</strong> {t('programs.couponConfig.percentageDesc')}</p>
          <p><strong className="text-surface-900 dark:text-white">{t('programs.couponConfig.specialPromotion')}:</strong> {t('programs.couponConfig.specialPromotionDesc')}</p>
        </div>
      </details>

      {/* Dates */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="label mb-0">{t('programs.couponConfig.couponExpiry')}</label>
          <Tooltip text={t('programs.couponConfig.couponExpiryTooltip')} />
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
                {expiryType === 'unlimited' ? t('common.unlimited') : t('programs.couponConfig.specificDates')}
              </span>
            </label>
          ))}
        </div>
        {meta.coupon_expiry === 'dates' && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="label">{t('common.startDate')}</label>
              <input type="date" className="input" value={meta.coupon_start_date as string ?? ''} required
                onChange={e => set('coupon_start_date', e.target.value)} />
            </div>
            <div>
              <label className="label">{t('common.endDate')}</label>
              <input type="date" className="input" value={meta.coupon_end_date as string ?? ''} required
                min={meta.coupon_start_date as string ?? ''}
                onChange={e => set('coupon_end_date', e.target.value)} />
              {Boolean(meta.coupon_end_date && meta.coupon_start_date && (meta.coupon_end_date as string) < (meta.coupon_start_date as string)) && (
                <p className="text-xs text-red-500 mt-1">{t('programs.couponConfig.endDateBeforeStart')}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Uses per customer */}
      <div>
        <label className="label">{t('programs.couponConfig.maxUsesPerCustomer')}</label>
        <input type="number" min={1} className="input" value={meta.usage_limit_per_customer as number ?? 1}
          onChange={e => set('usage_limit_per_customer', parseInt(e.target.value) || 1)} />
      </div>

      {/* Coupon Description */}
      <div>
        <label className="label">{t('programs.couponConfig.couponDescription')}</label>
        <input type="text" className="input" value={meta.coupon_description as string ?? ''}
          onChange={e => set('coupon_description', e.target.value)} />
      </div>

      {/* Coupon Image */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="label mb-0">{t('programs.couponConfig.couponImage')}</label>
          <Tooltip text={t('programs.couponConfig.couponImageTooltip')} />
        </div>
        <ImageUploadField
          label={t('programs.couponConfig.couponImage')}
          specs={t('programs.couponConfig.imageSpecs')}
          value={(meta.coupon_image_url as string) || ''}
          onChange={url => set('coupon_image_url', url)}
          compact
        />
      </div>

      {/* Push Notification Module */}
      <div className="border-t border-surface-200 dark:border-surface-700 pt-5 mt-5">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-bold text-surface-900 dark:text-white">{t('programs.couponConfig.pushNotificationTitle')}</h3>
          <Tooltip text={t('programs.couponConfig.pushNotificationTooltip')} />
        </div>
        <p className="text-xs text-surface-500 mb-3">
          {t('programs.couponConfig.pushNotificationDescription')}
        </p>
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <label className="label">{t('programs.couponConfig.notificationTitle')}</label>
            <EmojiPickerButton
              onEmojiSelect={emoji => set('push_title', ((meta.push_title as string) || '') + emoji)}
            />
          </div>
          <input type="text" className="input" placeholder={t('programs.couponConfig.notificationTitlePlaceholder')} maxLength={60}
            value={meta.push_title as string ?? ''}
            onChange={e => set('push_title', e.target.value)} />
          <span className="text-[10px] text-surface-400 mt-0.5 block">{(meta.push_title as string ?? '').length}/60</span>
        </div>
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <label className="label mb-0">{t('programs.couponConfig.notificationMessage')}</label>
            <EmojiPickerButton
              onEmojiSelect={emoji => set('push_message', ((meta.push_message as string) || '') + emoji)}
            />
          </div>
          <textarea className="input min-h-[80px] resize-none"
            placeholder={t('programs.couponConfig.notificationMessagePlaceholder')}
            maxLength={178} value={meta.push_message as string ?? ''}
            onChange={e => set('push_message', e.target.value)} />
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-1">
              <Tooltip text={t('programs.couponConfig.messageSentOnceTooltip')} />
              <span className="text-[10px] text-surface-400">{t('common.optional')}</span>
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
            {t('programs.couponConfig.expiryReminder')}
          </label>
          <Tooltip text={t('programs.couponConfig.expiryReminderTooltip')} />
        </div>
      </div>
    </div>
  );
});

/**
 * @description Coupon card configuration with discount types, dates, and push notifications.
 * @param {ConfigProps} props - Component props
 * @returns JSX.Element
 */
export default CouponConfig;
