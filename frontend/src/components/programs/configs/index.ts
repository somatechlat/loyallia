/**
 * Barrel export for program type configuration components.
 *
 * @module components/programs/configs
 */
export type { ConfigProps } from './types';
export { default as StampConfig } from './StampConfig';
export { default as CouponConfig } from './CouponConfig';
export {
  CashbackConfig,
  DiscountConfig,
  GiftCertificateConfig,
  VipMembershipConfig,
  ReferralPassConfig,
  MultipassConfig,
} from './SmallConfigs';
