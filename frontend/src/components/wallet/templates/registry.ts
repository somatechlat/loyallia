/**
 * System template registry for the Wallet Pass Studio.
 *
 * 32 built-in presets covering all 10 card types with distinct art
 * directions. Display labels are i18n keys — UI chrome always goes
 * through `t()`.
 */

import type { WalletTemplate } from '@/components/wallet/types/templates';
import type { CardType } from '@/components/wallet/types/unified-state';
import { STAMP_PRESETS } from './presets-stamp';
import { CASHBACK_PRESETS, COUPON_PRESETS } from './presets-loyalty';
import { VIP_PRESETS, GIFT_PRESETS } from './presets-membership';
import { DISCOUNT_PRESETS, AFFILIATE_PRESETS } from './presets-growth';
import {
  CORPORATE_PRESETS,
  REFERRAL_PRESETS,
  MULTIPASS_PRESETS,
} from './presets-advanced';

/** Combined array of all system templates. */
export const SYSTEM_TEMPLATES: WalletTemplate[] = [
  ...STAMP_PRESETS,
  ...CASHBACK_PRESETS,
  ...COUPON_PRESETS,
  ...VIP_PRESETS,
  ...GIFT_PRESETS,
  ...DISCOUNT_PRESETS,
  ...AFFILIATE_PRESETS,
  ...CORPORATE_PRESETS,
  ...REFERRAL_PRESETS,
  ...MULTIPASS_PRESETS,
];

/** Every card type, in gallery chip order. */
export const CARD_TYPE_ORDER: CardType[] = [
  'stamp',
  'cashback',
  'coupon',
  'vip_membership',
  'gift_certificate',
  'discount',
  'affiliate',
  'corporate_discount',
  'referral_pass',
  'multipass',
];

export interface TemplateCategory {
  id: string;
  /** i18n key for the chip label. */
  labelKey: string;
  filter: (t: WalletTemplate) => boolean;
}

/** Gallery category chips: Todos + one per card type. */
export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  { id: 'all', labelKey: 'templateGallery.categoryAll', filter: () => true },
  ...CARD_TYPE_ORDER.map((cardType) => ({
    id: cardType,
    labelKey: `programs.cardTypes.${cardType}`,
    filter: (t: WalletTemplate) => t.cardType === cardType,
  })),
];

/** Industry options for the dropdown filter (label = i18n key). */
export const INDUSTRY_FILTER_OPTIONS: Array<{ value: string; labelKey: string }> = [
  { value: 'all', labelKey: 'templateGallery.industryAll' },
  { value: 'food', labelKey: 'templateGallery.industryFood' },
  { value: 'retail', labelKey: 'templateGallery.industryRetail' },
  { value: 'services', labelKey: 'templateGallery.industryServices' },
  { value: 'health', labelKey: 'templateGallery.industryHealth' },
  { value: 'entertainment', labelKey: 'templateGallery.industryEntertainment' },
  { value: 'transport', labelKey: 'templateGallery.industryTransport' },
  { value: 'technology', labelKey: 'templateGallery.industryTechnology' },
  { value: 'generic', labelKey: 'templateGallery.industryGeneric' },
];

/** Card type options for the dropdown filter (label = i18n key). */
export const CARD_TYPE_FILTER_OPTIONS: Array<{ value: string; labelKey: string }> = [
  { value: 'all', labelKey: 'templateGallery.cardTypeAll' },
  ...CARD_TYPE_ORDER.map((cardType) => ({
    value: cardType,
    labelKey: `programs.cardTypes.${cardType}`,
  })),
];

/** i18n key for a card type display label. */
export function getCardTypeLabelKey(cardType: WalletTemplate['cardType']): string {
  return `programs.cardTypes.${cardType}`;
}
