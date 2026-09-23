/**
 * System template registry for the Wallet Pass Studio.
 *
 * 20 built-in templates covering a wide range of industries and card types.
 * Template definitions are split into two batches to stay under the 650-line limit.
 */

import type { WalletTemplate } from '@/components/wallet/types/templates';
import { SYSTEM_TEMPLATES_01 } from './templates-01';
import { SYSTEM_TEMPLATES_02 } from './templates-02';

/** Combined array of all system templates. */
export const SYSTEM_TEMPLATES: WalletTemplate[] = [
  ...SYSTEM_TEMPLATES_01,
  ...SYSTEM_TEMPLATES_02,
];

/** Display categories for the template gallery filter pills. */
export const TEMPLATE_CATEGORIES = [
  { id: 'all', label: 'Todas', filter: () => true },
  { id: 'cafe', label: 'Café', filter: (t: WalletTemplate) => t.industry === 'food' || t.tags.includes('café') || t.tags.includes('bakery') },
  { id: 'retail', label: 'Retail', filter: (t: WalletTemplate) => t.industry === 'retail' || t.tags.includes('retail') },
  { id: 'gym', label: 'Gym', filter: (t: WalletTemplate) => t.tags.includes('gym') || t.industry === 'health' },
  { id: 'salon', label: 'Salón', filter: (t: WalletTemplate) => t.tags.includes('salón') || t.tags.includes('barber') || t.tags.includes('spa') || t.tags.includes('laundry') },
  { id: 'hotel', label: 'Hotel', filter: (t: WalletTemplate) => t.tags.includes('hotel') },
] as const;

/** Industry options for the dropdown filter. */
export const INDUSTRY_FILTER_OPTIONS = [
  { value: 'all', label: 'Todas las industrias' },
  { value: 'food', label: 'Alimentación y Bebidas' },
  { value: 'retail', label: 'Retail y Comercio' },
  { value: 'services', label: 'Servicios Profesionales' },
  { value: 'health', label: 'Salud y Bienestar' },
  { value: 'entertainment', label: 'Entretenimiento' },
  { value: 'transport', label: 'Transporte' },
  { value: 'technology', label: 'Tecnología' },
  { value: 'generic', label: 'Genérico' },
];

/** Card type options for the dropdown filter. */
export const CARD_TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'stamp', label: 'Tarjeta de Sellos' },
  { value: 'cashback', label: 'Cashback' },
  { value: 'coupon', label: 'Cupón' },
  { value: 'discount', label: 'Descuento por Niveles' },
  { value: 'vip_membership', label: 'Membresía VIP' },
  { value: 'gift_certificate', label: 'Tarjeta Regalo' },
  { value: 'multipass', label: 'Multi-Pase' },
];

/** Map card type to display label. */
export function getCardTypeLabel(cardType: WalletTemplate['cardType']): string {
  const option = CARD_TYPE_FILTER_OPTIONS.find((o) => o.value === cardType);
  return option?.label ?? cardType;
}
