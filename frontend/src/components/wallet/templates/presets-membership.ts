/**
 * VIP membership + gift certificate system presets.
 */

import type { WalletTemplate } from '@/components/wallet/types/templates';
import type {
  VipMembershipCardConfig,
  GiftCertificateCardConfig,
} from '@/components/wallet/types/card-type-config';
import {
  accentFromPalette,
  buildSystemTemplate,
  makeBackContent,
  makeBarcode,
  makeField,
} from './palette-utils';

function vipConfig(
  paletteKey: Parameters<typeof accentFromPalette>[0],
  overrides: Omit<VipMembershipCardConfig, 'cardType' | 'crownIcon'>,
): VipMembershipCardConfig {
  return {
    cardType: 'vip_membership',
    crownIcon: paletteKey === 'corporate_discount' ? 'crown-platinum' : 'crown-gold',
    ...overrides,
  };
}

function giftConfig(
  paletteKey: Parameters<typeof accentFromPalette>[0],
  overrides: Omit<GiftCertificateCardConfig, 'cardType' | 'ribbonColor'>,
): GiftCertificateCardConfig {
  return {
    cardType: 'gift_certificate',
    ribbonColor: accentFromPalette(paletteKey),
    ...overrides,
  };
}

export const VIP_PRESETS: WalletTemplate[] = [
  /* ── Club Dorado — classic gold VIP ─────────────────────────────── */
  buildSystemTemplate({
    id: 'vip-club-dorado',
    name: 'Club Dorado',
    description: 'Membresía anual con beneficios exclusivos.',
    cardType: 'vip_membership',
    industry: 'services',
    paletteKey: 'vip_membership',
    fields: [
      makeField({ id: 'v1', label: 'MIEMBRO', value: 'Club Dorado', fieldGroup: 'primary', order: 0 }),
      makeField({ id: 'v2', label: 'DESDE', value: '2026', fieldGroup: 'header', order: 1 }),
      makeField({ id: 'v3', label: 'VENCIMIENTO', value: '31 Dic 2026', fieldGroup: 'secondary', order: 2 }),
      makeField({ id: 'v4', label: 'TITULAR', value: 'Socio fundador', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: vipConfig('vip_membership', {
      membershipName: 'Club Dorado',
      monthlyFee: 29,
      annualFee: 290,
      validityPeriod: 'annual',
      perks: ['Acceso prioritario', '10% en tienda', 'Eventos exclusivos', 'Regalo de cumpleaños'],
      memberBadgeStyle: 'gold',
      benefitsListIcons: ['star', 'gift', 'calendar', 'heart'],
    }),
    barcode: makeBarcode('QR_CODE', 'Carné Club Dorado'),
    backContent: makeBackContent({
      rules: 'La membresía Club Dorado otorga acceso prioritario, descuento permanente del 10% y acceso a eventos exclusivos.',
      terms: 'Membresía anual no reembolsable. Beneficios no transferibles. Sujeta a disponibilidad en eventos.',
      contactEmail: 'socios@clubdorado.es',
      websiteUrl: 'https://clubdorado.es',
      websiteLabel: 'Área de socios',
    }),
    apple: {
      passStyle: 'generic',
      description: 'Membresía Club Dorado',
      organizationName: 'Club Dorado',
    },
    google: {
      passType: 'LoyaltyClass',
      programName: 'Club Dorado Membership',
    },
    tags: ['vip', 'membership', 'gold', 'exclusive'],
  }),

  /* ── Platinum Circle — corporate slate VIP ──────────────────────── */
  buildSystemTemplate({
    id: 'vip-platinum-circle',
    name: 'Platinum Circle',
    description: 'Membresía ejecutiva con acceso corporativo.',
    cardType: 'vip_membership',
    industry: 'services',
    paletteKey: 'corporate_discount',
    fields: [
      makeField({ id: 'v1', label: 'MEMBRESÍA', value: 'Platinum', fieldGroup: 'primary', order: 0 }),
      makeField({ id: 'v2', label: 'ID', value: 'PC-2026-0841', fieldGroup: 'header', order: 1 }),
      makeField({ id: 'v3', label: 'VALIDEZ', value: 'Anual', fieldGroup: 'secondary', order: 2 }),
      makeField({ id: 'v4', label: 'ACCESO', value: 'Global', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: vipConfig('corporate_discount', {
      membershipName: 'Platinum Circle',
      monthlyFee: 79,
      annualFee: 790,
      validityPeriod: 'annual',
      perks: ['Acceso global', 'Concierge 24/7', 'Upgrade prioritario', 'Salas de reunión'],
      memberBadgeStyle: 'platinum',
      benefitsListIcons: ['globe', 'clock', 'arrow-up', 'briefcase'],
    }),
    barcode: makeBarcode('CODE128', 'ID Platinum Circle'),
    backContent: makeBackContent({
      rules: 'Platinum Circle incluye acceso global, concierge 24/7 y prioridad en upgrades. Presenta este pase en la recepción.',
      terms: 'Contrato anual. El acceso está sujeto a la política del establecimiento. Contacta con tu gestor para cambios.',
      contactEmail: 'concierge@platinumcircle.es',
      websiteUrl: 'https://platinumcircle.es',
      websiteLabel: 'Concierge',
    }),
    apple: {
      passStyle: 'generic',
      description: 'Membresía Platinum Circle',
      organizationName: 'Platinum Circle',
    },
    google: {
      passType: 'LoyaltyClass',
      programName: 'Platinum Circle',
    },
    tags: ['vip', 'membership', 'platinum', 'corporate'],
  }),

  /* ── Wellness Black — mono premium health ───────────────────────── */
  buildSystemTemplate({
    id: 'vip-wellness-black',
    name: 'Wellness Black',
    description: 'Membresía premium de bienestar y recuperación.',
    cardType: 'vip_membership',
    industry: 'health',
    paletteKey: 'corporate_discount',
    fields: [
      makeField({ id: 'v1', label: 'PLAN', value: 'Wellness Black', fieldGroup: 'primary', order: 0 }),
      makeField({ id: 'v2', label: 'ESTADO', value: 'Activo', fieldGroup: 'header', order: 1 }),
      makeField({ id: 'v3', label: 'RENOVACIÓN', value: '01 Ene 2027', fieldGroup: 'secondary', order: 2 }),
      makeField({ id: 'v4', label: 'SESIONES', value: 'Ilimitadas', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: vipConfig('corporate_discount', {
      membershipName: 'Wellness Black',
      monthlyFee: 99,
      annualFee: 990,
      validityPeriod: 'annual',
      perks: ['Sesiones ilimitadas', 'Recuperación avanzada', 'Nutrición personal', 'Acceso 24/7'],
      memberBadgeStyle: 'platinum',
      benefitsListIcons: ['infinity', 'activity', 'apple', 'clock'],
    }),
    barcode: makeBarcode('QR_CODE', 'Acceso Wellness Black'),
    backContent: makeBackContent({
      rules: 'Wellness Black permite sesiones ilimitadas de recuperación, acceso 24/7 y seguimiento nutricional personalizado.',
      terms: 'Membresía anual. Cancelación con 30 días de preaviso. El acceso 24/7 requiere verificación de identidad.',
      contactEmail: 'black@wellnessblack.es',
      websiteUrl: 'https://wellnessblack.es',
      websiteLabel: 'Bienvenida',
    }),
    apple: {
      passStyle: 'generic',
      description: 'Membresía Wellness Black',
      organizationName: 'Wellness Black',
    },
    google: {
      passType: 'LoyaltyClass',
      programName: 'Wellness Black Club',
    },
    tags: ['vip', 'membership', 'health', 'black', 'premium'],
  }),
];

export const GIFT_PRESETS: WalletTemplate[] = [
  /* ── Regalo Celeste — sky gift card ─────────────────────────────── */
  buildSystemTemplate({
    id: 'gift-regalo-celeste',
    name: 'Regalo Celeste',
    description: 'Tarjeta regalo en denominaciones flexibles.',
    cardType: 'gift_certificate',
    industry: 'retail',
    paletteKey: 'gift_certificate',
    fields: [
      makeField({ id: 'g1', label: 'SALDO', value: '50 €', fieldGroup: 'primary', order: 0, dataType: 'currency' }),
      makeField({ id: 'g2', label: 'PARA', value: 'Un regalo especial', fieldGroup: 'secondary', order: 1 }),
      makeField({ id: 'g3', label: 'EMITIDA', value: '15 Sep 2026', fieldGroup: 'header', order: 2 }),
      makeField({ id: 'g4', label: 'VÁLIDA', value: '12 meses', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: giftConfig('gift_certificate', {
      denominations: [25, 50, 100, 150],
      expiryDays: 365,
      boxGraphic: 'gift-box',
      denominationBadge: 'Celeste',
      occasion: 'Cumpleaños',
    }),
    barcode: makeBarcode('QR_CODE', 'Canjear Regalo Celeste'),
    backContent: makeBackContent({
      rules: 'Presenta esta tarjeta regalo en caja o al pagar online. El saldo restante puede usarse en compras posteriores.',
      terms: 'Válida 12 meses desde la emisión. No canjeable por efectivo. No recargable.',
      contactEmail: 'regalos@regaloceleste.es',
      websiteUrl: 'https://regaloceleste.es',
      websiteLabel: 'Cómo regalar',
    }),
    apple: {
      passStyle: 'storeCard',
      description: 'Tarjeta regalo Regalo Celeste',
      organizationName: 'Regalo Celeste',
    },
    google: {
      passType: 'GiftCardClass',
      programName: 'Regalo Celeste',
    },
    tags: ['gift', 'retail', 'celeste', 'present'],
  }),

  /* ── Tarjeta Rosa — pink occasion card ──────────────────────────── */
  buildSystemTemplate({
    id: 'gift-tarjeta-rosa',
    name: 'Tarjeta Rosa',
    description: 'Regalo romántico con diseño rosa y lazo.',
    cardType: 'gift_certificate',
    industry: 'retail',
    paletteKey: 'referral_pass',
    fields: [
      makeField({ id: 'g1', label: 'VALOR', value: '75 €', fieldGroup: 'primary', order: 0, dataType: 'currency' }),
      makeField({ id: 'g2', label: 'OCASIÓN', value: 'Aniversario', fieldGroup: 'secondary', order: 1 }),
      makeField({ id: 'g3', label: 'DE', value: 'Con cariño', fieldGroup: 'header', order: 2 }),
      makeField({ id: 'g4', label: 'VÁLIDA', value: '12 meses', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: giftConfig('referral_pass', {
      denominations: [50, 75, 100, 200],
      expiryDays: 365,
      boxGraphic: 'gift-box',
      denominationBadge: 'Rosa',
      occasion: 'Aniversario',
    }),
    barcode: makeBarcode('QR_CODE', 'Canjear Tarjeta Rosa'),
    backContent: makeBackContent({
      rules: 'Esta tarjeta regalo puede canjearse en cualquier tienda adherida o en la tienda online.',
      terms: 'Válida 12 meses. No reembolsable. Si el importe de la compra supera el saldo, abona la diferencia.',
      contactEmail: 'hola@tarjetarosa.es',
      websiteUrl: 'https://tarjetarosa.es',
      websiteLabel: 'Tienda online',
    }),
    apple: {
      passStyle: 'storeCard',
      description: 'Tarjeta regalo Tarjeta Rosa',
      organizationName: 'Tarjeta Rosa',
    },
    google: {
      passType: 'GiftCardClass',
      programName: 'Tarjeta Rosa Regalo',
    },
    tags: ['gift', 'retail', 'pink', 'romantic'],
  }),

  /* ── Vale Esmeralda — emerald gift voucher ──────────────────────── */
  buildSystemTemplate({
    id: 'gift-vale-esmeralda',
    name: 'Vale Esmeralda',
    description: 'Vale regalo premium en tiendas de experiencia.',
    cardType: 'gift_certificate',
    industry: 'services',
    paletteKey: 'cashback',
    fields: [
      makeField({ id: 'g1', label: 'VALE', value: '120 €', fieldGroup: 'primary', order: 0, dataType: 'currency' }),
      makeField({ id: 'g2', label: 'EXPERIENCIA', value: 'A elegir', fieldGroup: 'secondary', order: 1 }),
      makeField({ id: 'g3', label: 'SERIE', value: 'EM-2026', fieldGroup: 'header', order: 2 }),
      makeField({ id: 'g4', label: 'VÁLIDO', value: '18 meses', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: giftConfig('cashback', {
      denominations: [80, 120, 180, 250],
      expiryDays: 548,
      boxGraphic: 'gift-box',
      denominationBadge: 'Esmeralda',
      occasion: 'Experiencia',
    }),
    barcode: makeBarcode('PDF417', 'Vale Esmeralda'),
    backContent: makeBackContent({
      rules: 'El Vale Esmeralda puede canjearse por cualquier experiencia del catálogo. Reserva previa recomendada.',
      terms: 'Válido 18 meses. Las experiencias están sujetas a disponibilidad. No acumulable con otros vales.',
      contactEmail: 'experiencias@valeesmeralda.es',
      websiteUrl: 'https://valeesmeralda.es',
      websiteLabel: 'Catálogo',
    }),
    apple: {
      passStyle: 'storeCard',
      description: 'Vale regalo Vale Esmeralda',
      organizationName: 'Vale Esmeralda',
    },
    google: {
      passType: 'GiftCardClass',
      programName: 'Vale Esmeralda',
    },
    tags: ['gift', 'services', 'emerald', 'experience'],
  }),
];
