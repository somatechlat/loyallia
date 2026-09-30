/**
 * Discount tiers + affiliate system presets.
 */

import type { WalletTemplate } from '@/components/wallet/types/templates';
import type {
  DiscountCardConfig,
  AffiliateCardConfig,
} from '@/components/wallet/types/card-type-config';
import {
  accentFromPalette,
  buildSystemTemplate,
  makeBackContent,
  makeBarcode,
  makeField,
} from './palette-utils';

function discountConfig(
  paletteKey: Parameters<typeof accentFromPalette>[0],
  overrides: Omit<DiscountCardConfig, 'cardType' | 'progressBarColor'>,
): DiscountCardConfig {
  return {
    cardType: 'discount',
    progressBarColor: accentFromPalette(paletteKey),
    ...overrides,
  };
}

function affiliateConfig(
  paletteKey: Parameters<typeof accentFromPalette>[0],
  overrides: Omit<AffiliateCardConfig, 'cardType' | 'badgeColor'>,
): AffiliateCardConfig {
  return {
    cardType: 'affiliate',
    badgeColor: accentFromPalette(paletteKey),
    ...overrides,
  };
}

export const DISCOUNT_PRESETS: WalletTemplate[] = [
  /* ── Escalera Retail — lime growth tiers ────────────────────────── */
  buildSystemTemplate({
    id: 'discount-escalera-retail',
    name: 'Escalera Retail',
    description: 'Descuentos progresivos por nivel de compra.',
    cardType: 'discount',
    industry: 'retail',
    paletteKey: 'discount',
    fields: [
      makeField({ id: 'd1', label: 'DESCUENTO', value: '10%', fieldGroup: 'primary', order: 0 }),
      makeField({ id: 'd2', label: 'NIVEL', value: 'Plata', fieldGroup: 'header', order: 1 }),
      makeField({ id: 'd3', label: 'SIGUIENTE', value: 'Oro · 15%', fieldGroup: 'secondary', order: 2 }),
      makeField({ id: 'd4', label: 'GASTO', value: '640 €', fieldGroup: 'auxiliary', order: 3, dataType: 'currency' }),
    ],
    cardTypeConfig: discountConfig('discount', {
      tiers: [
        { tierName: 'Bronce', threshold: 0, discountPercentage: 5 },
        { tierName: 'Plata', threshold: 500, discountPercentage: 10 },
        { tierName: 'Oro', threshold: 1500, discountPercentage: 15 },
      ],
      tierBadgeIcons: ['badge-bronze', 'badge-silver', 'badge-gold'],
      percentageDisplayStyle: 'badge',
      discountBannerText: 'Más compras, más ahorro',
    }),
    barcode: makeBarcode('QR_CODE', 'Nivel Escalera Retail'),
    backContent: makeBackContent({
      rules: 'Tu nivel de descuento crece con el gasto acumulado del año. Bronze 5%, Plata 10%, Oro 15%.',
      terms: 'El gasto se revisa cada año natural. Los descuentos no son acumulables con otras promociones.',
      contactEmail: 'niveles@escaleraretail.es',
      websiteUrl: 'https://escaleraretail.es',
      websiteLabel: 'Ver niveles',
    }),
    apple: {
      passStyle: 'storeCard',
      description: 'Descuentos por niveles — Escalera Retail',
      organizationName: 'Escalera Retail',
    },
    google: {
      passType: 'LoyaltyClass',
      programName: 'Escalera Retail VIP',
    },
    tags: ['retail', 'discount', 'tiers', 'lime'],
  }),

  /* ── Farmacia Ahorro — teal health discount ─────────────────────── */
  buildSystemTemplate({
    id: 'discount-farmacia-ahorro',
    name: 'Farmacia Ahorro',
    description: 'Ahorro progresivo en productos de salud.',
    cardType: 'discount',
    industry: 'health',
    paletteKey: 'cashback',
    fields: [
      makeField({ id: 'd1', label: 'AHORRO', value: '7%', fieldGroup: 'primary', order: 0 }),
      makeField({ id: 'd2', label: 'CATEGORÍA', value: 'Frecuente', fieldGroup: 'header', order: 1 }),
      makeField({ id: 'd3', label: 'BENEFICIO', value: 'Envío gratis +7%', fieldGroup: 'secondary', order: 2 }),
      makeField({ id: 'd4', label: 'VÁLIDO', value: 'Todo 2026', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: discountConfig('cashback', {
      tiers: [
        { tierName: 'Cliente', threshold: 0, discountPercentage: 3 },
        { tierName: 'Frecuente', threshold: 300, discountPercentage: 7 },
        { tierName: 'VIP', threshold: 800, discountPercentage: 12 },
      ],
      tierBadgeIcons: ['badge-green', 'badge-teal', 'badge-emerald'],
      percentageDisplayStyle: 'expanded',
      discountBannerText: 'Tu salud, tu ahorro',
    }),
    barcode: makeBarcode('QR_CODE', 'Ahorro Farmacia'),
    backContent: makeBackContent({
      rules: 'El ahorro aplica a productos de farmacia y parafarmacia. Los niveles se recalculan cada trimestre.',
      terms: 'No aplicable a medicamentos con receta. Consulta exclusiones en el mostrador de la farmacia.',
      contactEmail: 'ahorro@farmaciaahorro.es',
      websiteUrl: 'https://farmaciaahorro.es',
      websiteLabel: 'Consejos',
    }),
    apple: {
      passStyle: 'storeCard',
      description: 'Descuentos Farmacia Ahorro',
      organizationName: 'Farmacia Ahorro',
    },
    google: {
      passType: 'LoyaltyClass',
      programName: 'Farmacia Ahorro VIP',
    },
    tags: ['health', 'discount', 'pharmacy', 'teal'],
  }),

  /* ── Moda Joven — pink fashion tiers ────────────────────────────── */
  buildSystemTemplate({
    id: 'discount-moda-joven',
    name: 'Moda Joven',
    description: 'Niveles de descuento para moda y accesorios.',
    cardType: 'discount',
    industry: 'retail',
    paletteKey: 'referral_pass',
    fields: [
      makeField({ id: 'd1', label: 'TU DESCUENTO', value: '12%', fieldGroup: 'primary', order: 0 }),
      makeField({ id: 'd2', label: 'CLUB', value: 'Style Insider', fieldGroup: 'header', order: 1 }),
      makeField({ id: 'd3', label: 'NUEVA TEMPORADA', value: 'Acceso anticipado', fieldGroup: 'secondary', order: 2 }),
      makeField({ id: 'd4', label: 'PUNTOS', value: '1.280', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: discountConfig('referral_pass', {
      tiers: [
        { tierName: 'Insider', threshold: 0, discountPercentage: 8 },
        { tierName: 'Icon', threshold: 400, discountPercentage: 12 },
        { tierName: 'Legend', threshold: 1200, discountPercentage: 18 },
      ],
      tierBadgeIcons: ['badge-pink', 'badge-magenta', 'badge-rose'],
      percentageDisplayStyle: 'compact',
      discountBannerText: 'Style que premia tu estilo',
    }),
    barcode: makeBarcode('QR_CODE', 'Club Moda Joven'),
    backContent: makeBackContent({
      rules: 'Acumula puntos con cada compra y desbloquea descuentos crecientes. Los miembros Icon acceden antes a las rebajas.',
      terms: 'Los puntos caducan a los 24 meses. Descuentos no acumulables con códigos promocionales.',
      contactEmail: 'club@modajoven.es',
      websiteUrl: 'https://modajoven.es',
      websiteLabel: 'Nueva colección',
    }),
    apple: {
      passStyle: 'storeCard',
      description: 'Descuentos Moda Joven',
      organizationName: 'Moda Joven',
    },
    google: {
      passType: 'LoyaltyClass',
      programName: 'Moda Joven Club',
    },
    tags: ['retail', 'discount', 'fashion', 'pink'],
  }),
];

export const AFFILIATE_PRESETS: WalletTemplate[] = [
  /* ── Embajador Azul — sky ambassador program ────────────────────── */
  buildSystemTemplate({
    id: 'affiliate-embajador-azul',
    name: 'Embajador Azul',
    description: 'Programa de embajadores con comisiones y beneficios.',
    cardType: 'affiliate',
    industry: 'services',
    paletteKey: 'affiliate',
    fields: [
      makeField({ id: 'a1', label: 'CÓDIGO', value: 'AZUL-2026', fieldGroup: 'primary', order: 0 }),
      makeField({ id: 'a2', label: 'COMISIÓN', value: '12%', fieldGroup: 'header', order: 1 }),
      makeField({ id: 'a3', label: 'REFERIDOS', value: '28 activos', fieldGroup: 'secondary', order: 2 }),
      makeField({ id: 'a4', label: 'NIVEL', value: 'Embajador', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: affiliateConfig('affiliate', {
      affiliateCodePattern: 'AZUL-{YEAR}',
      benefitsDescription: '12% de comisión por cada referido que complete su primera compra',
      referralBannerText: 'Comparte tu código y gana',
    }),
    barcode: makeBarcode('QR_CODE', 'Código Embajador Azul'),
    backContent: makeBackContent({
      rules: 'Comparte tu código único. Cuando un referido complete su primera compra recibes un 12% de comisión.',
      terms: 'Las comisiones se liquidan mensualmente. Cuentas duplicadas o fraudulentas serán suspendidas.',
      contactEmail: 'embajadores@embajadorazul.es',
      websiteUrl: 'https://embajadorazul.es',
      websiteLabel: 'Panel de embajador',
    }),
    apple: {
      passStyle: 'generic',
      description: 'Carné de embajador',
      organizationName: 'Embajador Azul',
    },
    google: {
      passType: 'LoyaltyClass',
      programName: 'Embajador Azul Program',
    },
    tags: ['affiliate', 'services', 'ambassador', 'blue'],
  }),

  /* ── Partner Pro — violet B2B affiliate ─────────────────────────── */
  buildSystemTemplate({
    id: 'affiliate-partner-pro',
    name: 'Partner Pro',
    description: 'Alianzas B2B con tarjeta de socio profesional.',
    cardType: 'affiliate',
    industry: 'technology',
    paletteKey: 'vip_membership',
    fields: [
      makeField({ id: 'a1', label: 'SOCIO', value: 'Partner Pro', fieldGroup: 'primary', order: 0 }),
      makeField({ id: 'a2', label: 'CUOTA', value: '15%', fieldGroup: 'header', order: 1 }),
      makeField({ id: 'a3', label: 'PIPELINE', value: '42 leads', fieldGroup: 'secondary', order: 2 }),
      makeField({ id: 'a4', label: 'ID', value: 'PP-00482', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: affiliateConfig('vip_membership', {
      affiliateCodePattern: 'PP-{ID}',
      benefitsDescription: 'Hasta un 15% de comisión recurrente en licencias referidas',
      referralBannerText: 'Crece con Partner Pro',
    }),
    barcode: makeBarcode('CODE128', 'ID Partner Pro'),
    backContent: makeBackContent({
      rules: 'Partner Pro obtiene comisiones recurrentes sobre licencias referidas y acceso al portal de partners.',
      terms: 'Acuerdo de partner anual. Pago a 30 días tras validación. Sujeto a auditoría de leads.',
      contactEmail: 'partners@partnerpro.es',
      websiteUrl: 'https://partnerpro.es',
      websiteLabel: 'Portal partners',
    }),
    apple: {
      passStyle: 'generic',
      description: 'Carné Partner Pro',
      organizationName: 'Partner Pro',
    },
    google: {
      passType: 'LoyaltyClass',
      programName: 'Partner Pro Alliance',
    },
    tags: ['affiliate', 'technology', 'partner', 'b2b'],
  }),

  /* ── Influencer Gold — amber creator pass ───────────────────────── */
  buildSystemTemplate({
    id: 'affiliate-influencer-gold',
    name: 'Influencer Gold',
    description: 'Pase de creador con códigos y recompensas.',
    cardType: 'affiliate',
    industry: 'entertainment',
    paletteKey: 'multipass',
    fields: [
      makeField({ id: 'a1', label: 'HANDLE', value: '@creador', fieldGroup: 'primary', order: 0 }),
      makeField({ id: 'a2', label: 'ALCANCE', value: '15%', fieldGroup: 'header', order: 1 }),
      makeField({ id: 'a3', label: 'CAMPaña', value: 'Otoño 2026', fieldGroup: 'secondary', order: 2 }),
      makeField({ id: 'a4', label: 'RECOMPENSAS', value: '4 pendientes', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: affiliateConfig('multipass', {
      affiliateCodePattern: 'GOLD-{HANDLE}',
      benefitsDescription: '15% de recompensa por venta y acceso anticipado a campañas',
      referralBannerText: 'Tu audiencia, tus recompensas',
    }),
    barcode: makeBarcode('QR_CODE', 'Pase Influencer Gold'),
    backContent: makeBackContent({
      rules: 'Los creadores Gold reciben un 15% por venta atribuida y acceso anticipado a campañas de temporada.',
      terms: 'Las atribuciones se cierran cada mes. Contenido no patrocinado debe declararse según la normativa vigente.',
      contactEmail: 'creators@influencergold.es',
      websiteUrl: 'https://influencergold.es',
      websiteLabel: 'Kit de creador',
    }),
    apple: {
      passStyle: 'generic',
      description: 'Pase Influencer Gold',
      organizationName: 'Influencer Gold',
    },
    google: {
      passType: 'LoyaltyClass',
      programName: 'Influencer Gold Club',
    },
    tags: ['affiliate', 'entertainment', 'influencer', 'gold'],
  }),
];
