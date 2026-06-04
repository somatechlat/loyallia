'use client';

/**
 * TypeConfig — Dispatcher component that renders the correct configuration form
 * for a given program type (stamp, cashback, coupon, etc.).
 *
 * Decomposed from a 582-line mega-component (LYL-C-FE-002) into individual config files:
 * - configs/StampConfig.tsx
 * - configs/CouponConfig.tsx
 * - configs/SmallConfigs.tsx (Cashback, Discount, GiftCertificate, VipMembership, ReferralPass, Multipass)
 *
 * @param type - The program type key (e.g. 'stamp', 'cashback', 'coupon')
 * @param meta - Current program metadata
 * @param setMeta - State setter for metadata
 */
import { useI18n } from '@/lib/i18n';
import type { ConfigProps } from '@/components/programs/configs';
import {
  StampConfig,
  CashbackConfig,
  CouponConfig,
  DiscountConfig,
  GiftCertificateConfig,
  VipMembershipConfig,
  ReferralPassConfig,
  MultipassConfig,
} from '@/components/programs/configs';

const TYPE_COMPONENTS: Record<string, React.ComponentType<ConfigProps>> = {
  stamp: StampConfig,
  cashback: CashbackConfig,
  coupon: CouponConfig,
  discount: DiscountConfig,
  gift_certificate: GiftCertificateConfig,
  vip_membership: VipMembershipConfig,
  referral_pass: ReferralPassConfig,
  multipass: MultipassConfig,
};

/**
 * @description Renders the configuration form for a specific program type.
 * Falls back to a "no config needed" message for unknown types.
 * @param {Object} props - Component props
 * @param {string} props.type - The program type key
 * @param {Record<string, unknown>} props.meta - Current program metadata
 * @param {(prev: Record<string, unknown>) => Record<string, unknown>} props.setMeta - State setter for metadata
 * @returns JSX.Element
 */
function TypeConfig({ type, meta, setMeta }: { type: string } & ConfigProps) {
  const { t } = useI18n();
  const Component = TYPE_COMPONENTS[type];
  if (!Component) {
    return (
      <div className="card p-8 text-center">
        <p className="text-surface-500">{t('programs.noConfigNeeded')}</p>
      </div>
    );
  }
  return <Component meta={meta} setMeta={setMeta} />;
}

/**
 * @description Dispatcher component that renders the correct configuration form for a given program type.
 * @param {Object} props - Component props
 * @param {string} props.type - The program type key
 * @param {Record<string, unknown>} props.meta - Current program metadata
 * @param {(prev: Record<string, unknown>) => Record<string, unknown>} props.setMeta - State setter for metadata
 * @returns JSX.Element
 */
export default TypeConfig;
