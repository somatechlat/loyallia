'use client';

/**
 * Smaller program type config components: Cashback, Discount, GiftCertificate, VipMembership, ReferralPass, Multipass.
 *
 * Extracted from TypeConfig.tsx (LYL-C-FE-002: mega-component decomposition).
 */
import React, { useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { NumberInput } from '@/components/ui/NumberInput';
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
        <NumberInput min={0.01} max={99.99} step={0.01} className="input" value={meta.cashback_percentage as number ?? 5}
          onValueChange={v => set('cashback_percentage', v ?? 5)} />
      </div>
      <div>
        <label className="label">{t('programs.cashbackConfig.minimumPurchase')}</label>
        <NumberInput min={0} step={0.01} className="input" value={meta.minimum_purchase as number ?? 0}
          onValueChange={v => set('minimum_purchase', v ?? 0)} />
      </div>
      <div>
        <label className="label">{t('programs.cashbackConfig.creditExpiryDays')}</label>
        <NumberInput integer min={1} className="input" value={meta.credit_expiry_days as number ?? 365}
          onValueChange={v => set('credit_expiry_days', v ?? 365)} />
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
          <NumberInput className="input w-28" placeholder={t('programs.discountConfig.minPlaceholder')} value={tier.threshold}
            onValueChange={v => {
              const newTiers = [...tiers];
              newTiers[i] = { ...newTiers[i]!, threshold: v ?? 0 };
              set('tiers', newTiers);
            }} />
          <NumberInput className="input w-20" placeholder="%" value={tier.discount_percentage}
            onValueChange={v => {
              const newTiers = [...tiers];
              newTiers[i] = { ...newTiers[i]!, discount_percentage: v ?? 0 };
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
        <NumberInput integer min={1} className="input" value={meta.expiry_days as number ?? 365}
          onValueChange={v => set('expiry_days', v ?? 365)} />
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
          <NumberInput min={0} step={0.01} className="input" value={meta.monthly_fee as number ?? 0}
            onValueChange={v => set('monthly_fee', v ?? 0)} />
        </div>
        <div>
          <label className="label">{t('programs.vipConfig.annualFee')}</label>
          <NumberInput min={0} step={0.01} className="input" value={meta.annual_fee as number ?? 0}
            onValueChange={v => set('annual_fee', v ?? 0)} />
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
        <NumberInput integer min={0} className="input" value={meta.max_referrals_per_customer as number ?? 10}
          onValueChange={v => set('max_referrals_per_customer', v ?? 10)} />
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
        <NumberInput integer min={1} className="input" value={meta.bundle_size as number ?? 10}
          onValueChange={v => set('bundle_size', v ?? 10)} />
      </div>
      <div>
        <label className="label">{t('programs.multipassConfig.bundlePrice')}</label>
        <NumberInput min={0.01} step={0.01} className="input" value={meta.bundle_price as number ?? 25}
          onValueChange={v => set('bundle_price', v ?? 25)} />
      </div>
    </div>
  );
});
