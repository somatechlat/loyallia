'use client';

/**
 * Smaller program type config components: Cashback, Discount, GiftCertificate, VipMembership, ReferralPass, Multipass.
 *
 * Extracted from TypeConfig.tsx (LYL-C-FE-002: mega-component decomposition).
 */
import React, { useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import type { ConfigProps } from './types';

const setMetaHelper = (k: string, v: unknown) => (prev: Record<string, unknown>) => ({ ...prev, [k]: v });

/** Cashback card configuration. */
export const CashbackConfig = React.memo(function CashbackConfig({ meta, setMeta }: ConfigProps) {
  const { t } = useI18n();
  const set = useCallback((k: string, v: unknown) => setMeta(setMetaHelper(k, v)), [setMeta]);
  return (
    <div className="space-y-4">
      <div>
        <label className="label">{t('programs.cashbackConfig.percentage')}</label>
        <input type="number" min={0.01} max={99.99} step={0.01} className="input" value={meta.cashback_percentage as number ?? 5}
          onChange={e => set('cashback_percentage', parseFloat(e.target.value) || 5)} />
      </div>
      <div>
        <label className="label">{t('programs.cashbackConfig.minimumPurchase')}</label>
        <input type="number" min={0} step={0.01} className="input" value={meta.minimum_purchase as number ?? 0}
          onChange={e => set('minimum_purchase', parseFloat(e.target.value) || 0)} />
      </div>
      <div>
        <label className="label">{t('programs.cashbackConfig.creditExpiryDays')}</label>
        <input type="number" min={1} className="input" value={meta.credit_expiry_days as number ?? 365}
          onChange={e => set('credit_expiry_days', parseInt(e.target.value) || 365)} />
      </div>
    </div>
  );
});

/** Discount tier card configuration. */
export const DiscountConfig = React.memo(function DiscountConfig({ meta, setMeta }: ConfigProps) {
  const { t } = useI18n();
  const set = useCallback((k: string, v: unknown) => setMeta(setMetaHelper(k, v)), [setMeta]);
  const tiers = (meta.tiers as Array<{ tier_name: string; threshold: number; discount_percentage: number }> ?? []);

  return (
    <div className="space-y-4">
      <label className="label">{t('programs.discountConfig.tiers')}</label>
      {tiers.map((tier, i) => (
        <div key={i} className="flex gap-2">
          <input type="text" className="input flex-1" placeholder={t('programs.discountConfig.tierNamePlaceholder')} value={tier.tier_name}
            onChange={e => {
              const newTiers = [...tiers];
              newTiers[i] = { ...newTiers[i]!, tier_name: e.target.value };
              set('tiers', newTiers);
            }} />
          <input type="number" className="input w-28" placeholder={t('programs.discountConfig.minPlaceholder')} value={tier.threshold}
            onChange={e => {
              const newTiers = [...tiers];
              newTiers[i] = { ...newTiers[i]!, threshold: parseFloat(e.target.value) || 0 };
              set('tiers', newTiers);
            }} />
          <input type="number" className="input w-20" placeholder="%" value={tier.discount_percentage}
            onChange={e => {
              const newTiers = [...tiers];
              newTiers[i] = { ...newTiers[i]!, discount_percentage: parseFloat(e.target.value) || 0 };
              set('tiers', newTiers);
            }} />
          <button type="button" className="btn-ghost text-red-500 px-2" onClick={() => {
            const newTiers = [...tiers];
            newTiers.splice(i, 1);
            set('tiers', newTiers);
          }}>{t('common.delete')}</button>
        </div>
      ))}
      {tiers.length < 5 && (
        <button type="button" className="btn-secondary text-xs" onClick={() => {
          set('tiers', [...tiers, { tier_name: '', threshold: 0, discount_percentage: 0 }]);
        }}>{t('programs.discountConfig.addTier')}</button>
      )}
    </div>
  );
});

/** Gift certificate configuration. */
export const GiftCertificateConfig = React.memo(function GiftCertificateConfig({ meta, setMeta }: ConfigProps) {
  const { t } = useI18n();
  const set = useCallback((k: string, v: unknown) => setMeta(setMetaHelper(k, v)), [setMeta]);
  return (
    <div className="space-y-4">
      <div>
        <label className="label">{t('programs.giftConfig.denominations')}</label>
        <input type="text" className="input" placeholder={t('programs.giftConfig.denominationsPlaceholder')}
          value={(meta.denominations as number[])?.join(', ') ?? ''}
          onChange={e => set('denominations', e.target.value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n)))} />
        <p className="text-xs text-surface-400 mt-1 ml-1">{t('programs.giftConfig.denominationsHint')}</p>
      </div>
      <div>
        <label className="label">{t('programs.giftConfig.expiryDays')}</label>
        <input type="number" min={1} className="input" value={meta.expiry_days as number ?? 365}
          onChange={e => set('expiry_days', parseInt(e.target.value) || 365)} />
      </div>
    </div>
  );
});

/** VIP membership configuration. */
export const VipMembershipConfig = React.memo(function VipMembershipConfig({ meta, setMeta }: ConfigProps) {
  const { t } = useI18n();
  const set = useCallback((k: string, v: unknown) => setMeta(setMetaHelper(k, v)), [setMeta]);
  return (
    <div className="space-y-4">
      <div>
        <label className="label">{t('programs.vipConfig.membershipName')}</label>
        <input type="text" className="input" value={meta.membership_name as string ?? ''} placeholder={t('programs.vipConfig.membershipNamePlaceholder')}
          onChange={e => set('membership_name', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">{t('programs.vipConfig.monthlyFee')}</label>
          <input type="number" min={0} step={0.01} className="input" value={meta.monthly_fee as number ?? 0}
            onChange={e => set('monthly_fee', parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <label className="label">{t('programs.vipConfig.annualFee')}</label>
          <input type="number" min={0} step={0.01} className="input" value={meta.annual_fee as number ?? 0}
            onChange={e => set('annual_fee', parseFloat(e.target.value) || 0)} />
        </div>
      </div>
      <div>
        <label className="label">{t('programs.vipConfig.validityPeriod')}</label>
        <select className="input" value={meta.validity_period as string ?? 'monthly'}
          onChange={e => set('validity_period', e.target.value)}>
          <option value="monthly">{t('programs.vipConfig.monthly')}</option>
          <option value="quarterly">{t('programs.vipConfig.quarterly')}</option>
          <option value="annual">{t('programs.vipConfig.annual')}</option>
          <option value="lifetime">{t('programs.vipConfig.lifetime')}</option>
        </select>
      </div>
    </div>
  );
});

/** Referral pass configuration. */
export const ReferralPassConfig = React.memo(function ReferralPassConfig({ meta, setMeta }: ConfigProps) {
  const { t } = useI18n();
  const set = useCallback((k: string, v: unknown) => setMeta(setMetaHelper(k, v)), [setMeta]);
  return (
    <div className="space-y-4">
      <div>
        <label className="label">{t('programs.referralConfig.referrerReward')}</label>
        <input type="text" className="input" value={meta.referrer_reward as string ?? ''}
          onChange={e => set('referrer_reward', e.target.value)} placeholder={t('programs.referralConfig.referrerRewardPlaceholder')} />
      </div>
      <div>
        <label className="label">{t('programs.referralConfig.refereeReward')}</label>
        <input type="text" className="input" value={meta.referee_reward as string ?? ''}
          onChange={e => set('referee_reward', e.target.value)} placeholder={t('programs.referralConfig.refereeRewardPlaceholder')} />
      </div>
      <div>
        <label className="label">{t('programs.referralConfig.maxReferrals')}</label>
        <input type="number" min={0} className="input" value={meta.max_referrals_per_customer as number ?? 10}
          onChange={e => set('max_referrals_per_customer', parseInt(e.target.value) || 10)} />
      </div>
    </div>
  );
});

/** Multipass bundle configuration. */
export const MultipassConfig = React.memo(function MultipassConfig({ meta, setMeta }: ConfigProps) {
  const { t } = useI18n();
  const set = useCallback((k: string, v: unknown) => setMeta(setMetaHelper(k, v)), [setMeta]);
  return (
    <div className="space-y-4">
      <div>
        <label className="label">{t('programs.multipassConfig.bundleSize')}</label>
        <input type="number" min={1} className="input" value={meta.bundle_size as number ?? 10}
          onChange={e => set('bundle_size', parseInt(e.target.value) || 10)} />
      </div>
      <div>
        <label className="label">{t('programs.multipassConfig.bundlePrice')}</label>
        <input type="number" min={0.01} step={0.01} className="input" value={meta.bundle_price as number ?? 25}
          onChange={e => set('bundle_price', parseFloat(e.target.value) || 25)} />
      </div>
    </div>
  );
});
