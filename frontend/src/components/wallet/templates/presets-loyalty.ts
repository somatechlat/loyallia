/**
 * Cashback + coupon system presets.
 */

import type { WalletTemplate } from '@/components/wallet/types/templates';
import type {
  CashbackCardConfig,
  CouponCardConfig,
} from '@/components/wallet/types/card-type-config';
import {
  accentFromPalette,
  buildSystemTemplate,
  makeBackContent,
  makeBarcode,
  makeField,
} from './palette-utils';

function cashbackConfig(
  paletteKey: Parameters<typeof accentFromPalette>[0],
  overrides: Omit<CashbackCardConfig, 'cardType' | 'progressRingColor'>,
): CashbackCardConfig {
  return {
    cardType: 'cashback',
    progressRingColor: accentFromPalette(paletteKey),
    ...overrides,
  };
}

function couponConfig(overrides: Omit<CouponCardConfig, 'cardType'>): CouponCardConfig {
  return { cardType: 'coupon', ...overrides };
}

export const CASHBACK_PRESETS: WalletTemplate[] = [
  /* ── Verde Mercado — emerald cashback ───────────────────────────── */
  buildSystemTemplate({
    id: 'cashback-verde-mercado',
    name: 'Verde Mercado',
    description: 'Reembolso del 5% en cada compra de fruta y verdura.',
    cardType: 'cashback',
    industry: 'food',
    paletteKey: 'cashback',
    fields: [
      makeField({ id: 'c1', label: 'SALDO', value: '12,40 €', fieldGroup: 'primary', order: 0, dataType: 'currency' }),
      makeField({ id: 'c2', label: 'REEMBOLSO', value: '5%', fieldGroup: 'header', order: 1 }),
      makeField({ id: 'c3', label: 'NIVEL', value: 'Amigo Verde', fieldGroup: 'secondary', order: 2 }),
      makeField({ id: 'c4', label: 'VÁLIDO HASTA', value: '90 días', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: cashbackConfig('cashback', {
      cashbackPercentage: 5,
      minimumPurchase: 20,
      creditExpiryDays: 90,
      creditExpiryType: 'defined_period',
      tierName: 'Amigo Verde',
      coinIcon: 'coin',
      tierBadge: 'badge-bronze',
    }),
    barcode: makeBarcode('QR_CODE', 'Identificador de cashback'),
    backContent: makeBackContent({
      rules: 'Recibes un 5% de reembolso en cada compra a partir de 20 €. El saldo se acumula automáticamente en tu tarjeta.',
      terms: 'El crédito caduca a los 90 días desde su emisión. No canjeable por efectivo. Consulta condiciones en tienda.',
      contactEmail: 'hola@verdemercado.es',
      websiteUrl: 'https://verdemercado.es',
      websiteLabel: 'Ver catálogo',
    }),
    apple: {
      passStyle: 'storeCard',
      description: 'Cashback Verde Mercado',
      organizationName: 'Verde Mercado',
    },
    google: {
      passType: 'LoyaltyClass',
      programName: 'Verde Mercado Cashback',
    },
    tags: ['food', 'cashback', 'green', 'market'],
  }),

  /* ── Tech Rewards — indigo affiliate-cool cashback ──────────────── */
  buildSystemTemplate({
    id: 'cashback-tech-rewards',
    name: 'Tech Rewards',
    description: 'Cashback progresivo en electrónica y accesorios.',
    cardType: 'cashback',
    industry: 'technology',
    paletteKey: 'affiliate',
    fields: [
      makeField({ id: 'c1', label: 'SALDO', value: '48,00 €', fieldGroup: 'primary', order: 0, dataType: 'currency' }),
      makeField({ id: 'c2', label: 'REEMBOLSO', value: '8%', fieldGroup: 'header', order: 1 }),
      makeField({ id: 'c3', label: 'TIER', value: 'Tech Gold', fieldGroup: 'secondary', order: 2 }),
      makeField({ id: 'c4', label: 'GASTO ANUAL', value: '1.250 €', fieldGroup: 'auxiliary', order: 3, dataType: 'currency' }),
    ],
    cardTypeConfig: cashbackConfig('affiliate', {
      cashbackPercentage: 8,
      minimumPurchase: 100,
      creditExpiryDays: 365,
      creditExpiryType: 'defined_period',
      tierName: 'Tech Gold',
      coinIcon: 'coin',
      tierBadge: 'badge-gold',
    }),
    barcode: makeBarcode('CODE128', 'ID Tech Rewards'),
    backContent: makeBackContent({
      rules: 'El porcentaje de reembolso depende de tu tier. Tech Gold recibe un 8% en compras superiores a 100 €.',
      terms: 'El saldo es válido 365 días. No acumulable con descuentos de empleado. Sujeto a revisión de tier anual.',
      contactEmail: 'soporte@techrewards.es',
      websiteUrl: 'https://techrewards.es',
      websiteLabel: 'Soporte',
    }),
    apple: {
      passStyle: 'storeCard',
      description: 'Programa Tech Rewards',
      organizationName: 'Tech Rewards',
    },
    google: {
      passType: 'LoyaltyClass',
      programName: 'Tech Rewards Club',
    },
    tags: ['technology', 'cashback', 'tech', 'gold'],
  }),

  /* ── Spa Cashback — violet wellness ─────────────────────────────── */
  buildSystemTemplate({
    id: 'cashback-spa-wellness',
    name: 'Spa Cashback',
    description: 'Reembolso en tratamientos y bienestar.',
    cardType: 'cashback',
    industry: 'health',
    paletteKey: 'vip_membership',
    fields: [
      makeField({ id: 'c1', label: 'SALDO', value: '25,50 €', fieldGroup: 'primary', order: 0, dataType: 'currency' }),
      makeField({ id: 'c2', label: 'REEMBOLSO', value: '10%', fieldGroup: 'header', order: 1 }),
      makeField({ id: 'c3', label: 'ESTADO', value: 'Serenidad', fieldGroup: 'secondary', order: 2 }),
      makeField({ id: 'c4', label: 'PRÓXIMA CITA', value: '12 Nov 2026', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: cashbackConfig('vip_membership', {
      cashbackPercentage: 10,
      minimumPurchase: 60,
      creditExpiryDays: 180,
      creditExpiryType: 'defined_period',
      tierName: 'Serenidad',
      coinIcon: 'coin',
      tierBadge: 'badge-silver',
    }),
    barcode: makeBarcode('QR_CODE', 'Acceso Spa Cashback'),
    backContent: makeBackContent({
      rules: 'Obtén un 10% de reembolso en tratamientos a partir de 60 €. El saldo se aplica en tu siguiente visita.',
      terms: 'Crédito válido 180 días. No transferible entre personas. Reserva previa obligatoria para canjear el saldo.',
      contactEmail: 'reservas@spacashback.es',
      websiteUrl: 'https://spacashback.es',
      websiteLabel: 'Reservar',
    }),
    apple: {
      passStyle: 'storeCard',
      description: 'Cashback Spa Wellness',
      organizationName: 'Spa Cashback',
    },
    google: {
      passType: 'LoyaltyClass',
      programName: 'Spa Cashback Club',
    },
    tags: ['health', 'cashback', 'spa', 'wellness', 'violet'],
  }),
];

export const COUPON_PRESETS: WalletTemplate[] = [
  /* ── Brunch 2×1 — magenta/orange ────────────────────────────────── */
  buildSystemTemplate({
    id: 'coupon-brunch-2x1',
    name: 'Brunch 2×1',
    description: 'Cupón 2×1 en brunch de fin de semana.',
    cardType: 'coupon',
    industry: 'food',
    paletteKey: 'coupon',
    fields: [
      makeField({ id: 'p1', label: 'OFERTA', value: '2×1', fieldGroup: 'primary', order: 0 }),
      makeField({ id: 'p2', label: 'DESCRIPCIÓN', value: 'Brunch de fin de semana', fieldGroup: 'secondary', order: 1 }),
      makeField({ id: 'p3', label: 'VÁLIDO', value: 'Sáb · Dom', fieldGroup: 'header', order: 2 }),
      makeField({ id: 'p4', label: 'CADUCA', value: '31 Dic 2026', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: couponConfig({
      discountType: 'percentage',
      discountValue: 50,
      usageLimitPerCustomer: 2,
      couponDescription: '2×1 en todos los brunchs de fin de semana',
      specialPromotionText: 'Válido sábados y domingos de 10:00 a 14:00',
      couponExpiry: 'unlimited',
      pushMessage: '¡Tu brunch 2×1 te espera este fin de semana!',
      cutLineStyle: 'dashed',
      discountBadgeStyle: 'pill',
      offerTag: '2×1',
    }),
    barcode: makeBarcode('QR_CODE', 'Canjear cupón Brunch'),
    backContent: makeBackContent({
      rules: 'Presenta este cupón en caja. Válido para 2 personas. El artículo de menor precio es gratuito.',
      terms: 'No acumulable con otras promociones. Un uso por persona y visita. Reserva recomendada en fin de semana.',
      contactEmail: 'reservas@brunch2x1.es',
      websiteUrl: 'https://brunch2x1.es',
      websiteLabel: 'Menú',
    }),
    apple: {
      passStyle: 'coupon',
      description: 'Cupón Brunch 2×1',
      organizationName: 'Brunch 2×1',
    },
    google: {
      passType: 'OfferClass',
      programName: 'Brunch 2×1 Ofertas',
    },
    tags: ['food', 'coupon', 'brunch', 'offer'],
  }),

  /* ── Outlet Flash — lime urgency ────────────────────────────────── */
  buildSystemTemplate({
    id: 'coupon-outlet-flash',
    name: 'Outlet Flash',
    description: 'Descuento flash del 30% en outlet seleccionado.',
    cardType: 'coupon',
    industry: 'retail',
    paletteKey: 'discount',
    fields: [
      makeField({ id: 'p1', label: 'DESCUENTO', value: '−30%', fieldGroup: 'primary', order: 0 }),
      makeField({ id: 'p2', label: 'COLECCIÓN', value: 'Outlet seleccionado', fieldGroup: 'secondary', order: 1 }),
      makeField({ id: 'p3', label: 'SOLO', value: '48 horas', fieldGroup: 'header', order: 2 }),
      makeField({ id: 'p4', label: 'USOS', value: '1 por cliente', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: couponConfig({
      discountType: 'percentage',
      discountValue: 30,
      usageLimitPerCustomer: 1,
      couponDescription: '30% de descuento en piezas de outlet seleccionadas',
      specialPromotionText: 'Solo 48 horas — hasta agotar stock',
      couponExpiry: 2,
      pushMessage: 'Flash: 30% en outlet, solo 48 horas.',
      cutLineStyle: 'zigzag',
      discountBadgeStyle: 'banner',
      offerTag: 'FLASH',
    }),
    barcode: makeBarcode('QR_CODE', 'Código Outlet Flash'),
    backContent: makeBackContent({
      rules: 'Descuento aplicable únicamente en artículos marcados como Outlet. Stock limitado. Un uso por cliente.',
      terms: 'Válido 48 horas desde la activación del cupón. No reembolsable en efectivo. Excluye liquidaciones.',
      contactEmail: 'ayuda@outletflash.es',
      websiteUrl: 'https://outletflash.es',
      websiteLabel: 'Ver outlet',
    }),
    apple: {
      passStyle: 'coupon',
      description: 'Cupón Outlet Flash',
      organizationName: 'Outlet Flash',
    },
    google: {
      passType: 'OfferClass',
      programName: 'Outlet Flash Ofertas',
    },
    tags: ['retail', 'coupon', 'flash', 'outlet'],
  }),

  /* ── Cine Noche — amber evening offer ───────────────────────────── */
  buildSystemTemplate({
    id: 'coupon-cine-noche',
    name: 'Cine Noche',
    description: 'Entrada reducida y palomitas en sesiones de noche.',
    cardType: 'coupon',
    industry: 'entertainment',
    paletteKey: 'multipass',
    fields: [
      makeField({ id: 'p1', label: 'PRECIO', value: '6,50 €', fieldGroup: 'primary', order: 0, dataType: 'currency' }),
      makeField({ id: 'p2', label: 'INCLUYE', value: 'Entrada + palomitas', fieldGroup: 'secondary', order: 1 }),
      makeField({ id: 'p3', label: 'SESIONES', value: 'Después de las 21:00', fieldGroup: 'header', order: 2 }),
      makeField({ id: 'p4', label: 'CADUCA', value: '28 Feb 2027', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: couponConfig({
      discountType: 'fixed_amount',
      discountValue: 6.5,
      usageLimitPerCustomer: 4,
      couponDescription: 'Entrada nocturna a 6,50 € con palomitas incluidas',
      specialPromotionText: 'Sesiones a partir de las 21:00',
      couponExpiry: 'unlimited',
      pushMessage: 'Cine de noche: entrada + palomitas a 6,50 €.',
      cutLineStyle: 'solid',
      discountBadgeStyle: 'circle',
      offerTag: 'NOCHE',
    }),
    barcode: makeBarcode('QR_CODE', 'Canjear Cine Noche'),
    backContent: makeBackContent({
      rules: 'Presenta el cupón en la taquilla antes de la sesión. Incluye una entrada estándar y palomitas medianas.',
      terms: 'No válido en estrenos ni funciones especiales. Máximo 4 usos por cliente. Sujeto a aforo.',
      contactEmail: 'entradas@cineNoche.es',
      websiteUrl: 'https://cineNoche.es',
      websiteLabel: 'Cartelera',
    }),
    apple: {
      passStyle: 'coupon',
      description: 'Cupón Cine Noche',
      organizationName: 'Cine Noche',
    },
    google: {
      passType: 'OfferClass',
      programName: 'Cine Noche Ofertas',
    },
    tags: ['entertainment', 'coupon', 'cinema', 'night'],
  }),
];
