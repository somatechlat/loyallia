/**
 * Seeds default UnifiedFields when a card type has an empty studio field list.
 * Keeps Apple/Google generation and previews aligned with the designer.
 */

import type { UnifiedField, FieldGroup } from '@/components/wallet/types/unified-field';
import type { CardType } from '@/components/wallet/types/unified-state';

function field(
  id: string,
  label: string,
  value: string,
  fieldGroup: FieldGroup,
  order: number,
  extras: Partial<UnifiedField> = {}
): UnifiedField {
  return {
    id,
    label,
    value,
    fieldGroup,
    order,
    isDynamic: value.includes('{{') || /(?<!\{)\{[a-zA-Z0-9_]+\}(?!\})/.test(value),
    showOnApple: true,
    showOnGoogle: true,
    dataType: 'text',
    appleOptions: {},
    googleOptions: { isPredefined: false },
    notifications: {},
    formatting: { isLink: false },
    ...extras,
  };
}

/** Minimal but complete default fields per card type (PassKit groups). */
export function seedDefaultWalletFields(cardType: CardType): UnifiedField[] {
  const common = [
    field('customer_name', 'Cliente', '{{customer.firstName}} {{customer.lastName}}', 'header', 0),
    field('program_name', 'Programa', '{{program.name}}', 'primary', 0),
  ];

  const byType: Record<CardType, UnifiedField[]> = {
    stamp: [
      ...common,
      field('stamps', 'Sellos', '{{stamp.current}}/{{stamp.required}}', 'secondary', 0, {
        notifications: {
          appleChangeMessage: { enabled: true, message: '¡Nuevo sello! Ahora tienes %@' },
        },
      }),
      field('reward', 'Recompensa', '{{stamp.reward}}', 'auxiliary', 0),
    ],
    cashback: [
      ...common,
      field('balance', 'Saldo', '{{cashback.balance}}', 'secondary', 0),
      field('rate', '% Cashback', '{{cashback.percentage}}', 'auxiliary', 0),
    ],
    coupon: [
      ...common,
      field('status', 'Estado', '{{coupon.used}} / {{coupon.limit}}', 'secondary', 0),
      field('discount', 'Descuento', '{{coupon.discount}}', 'auxiliary', 0),
    ],
    gift_certificate: [
      ...common,
      field('balance', 'Saldo', '{{gift.balance}}', 'secondary', 0),
    ],
    multipass: [
      ...common,
      field('remaining', 'Usos', '{{multipass.remaining}}', 'secondary', 0),
    ],
    vip_membership: [
      ...common,
      field('tier', 'Nivel', '{{membership.tier}}', 'secondary', 0),
    ],
    discount: [
      ...common,
      field('discount', 'Descuento', '{{discount.percentage}}', 'secondary', 0),
    ],
    referral_pass: [
      ...common,
      field('refs', 'Referidos', '{{referral.count}}', 'secondary', 0),
      field('code', 'Código', '{{referral.code}}', 'auxiliary', 0),
    ],
    affiliate: [
      ...common,
      field('code', 'Código', '{{referral.code}}', 'secondary', 0),
    ],
    corporate_discount: [
      ...common,
      field('discount', 'Descuento', '{{discount.percentage}}', 'secondary', 0),
    ],
  };

  const fields = byType[cardType] ?? byType.stamp;
  return [
    ...fields,
    field('last_message', 'Mensaje', '{{pass.last_message}}', 'auxiliary', 50, {
      notifications: {
        appleChangeMessage: { enabled: true, message: 'Nuevo mensaje: %@' },
      },
    }),
  ];
}

/** Ensure wallet_studio.fields is non-empty before serialize/generate. */
export function ensureWalletFields(
  fields: UnifiedField[] | undefined,
  cardType: CardType
): UnifiedField[] {
  if (Array.isArray(fields) && fields.length > 0) return fields;
  return seedDefaultWalletFields(cardType);
}
