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
 * Renders the configuration form for a specific program type.
 * Falls back to a "no config needed" message for unknown types.
 */
function TypeConfig({ type, meta, setMeta }: { type: string; meta: Record<string, unknown>; setMeta: (m: Record<string, unknown>) => void }) {
  const Component = TYPE_COMPONENTS[type];
  if (!Component) {
    return (
      <div className="card p-8 text-center">
        <p className="text-surface-500">Este tipo de tarjeta no requiere configuración adicional.</p>
      </div>
    );
  }
  return <Component meta={meta} setMeta={setMeta} />;
}

export default TypeConfig;
