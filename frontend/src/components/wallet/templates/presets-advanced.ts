/**
 * Corporate discount + referral pass + multipass system presets.
 */

import type { WalletTemplate } from '@/components/wallet/types/templates';
import type {
  CorporateDiscountCardConfig,
  ReferralPassCardConfig,
  MultipassCardConfig,
} from '@/components/wallet/types/card-type-config';
import {
  accentFromPalette,
  buildSystemTemplate,
  makeBackContent,
  makeBarcode,
  makeField,
} from './palette-utils';

function corporateConfig(
  paletteKey: Parameters<typeof accentFromPalette>[0],
  overrides: Omit<CorporateDiscountCardConfig, 'cardType' | 'idBadgeColor'>,
): CorporateDiscountCardConfig {
  return {
    cardType: 'corporate_discount',
    idBadgeColor: accentFromPalette(paletteKey),
    ...overrides,
  };
}

function referralConfig(
  paletteKey: Parameters<typeof accentFromPalette>[0],
  overrides: Omit<ReferralPassCardConfig, 'cardType' | 'shareButtonColor' | 'rewardBadgeIcon' | 'friendAvatarPlaceholder'>,
): ReferralPassCardConfig {
  return {
    cardType: 'referral_pass',
    shareButtonColor: accentFromPalette(paletteKey),
    rewardBadgeIcon: 'gift',
    friendAvatarPlaceholder: 'avatar-placeholder',
    ...overrides,
  };
}

function multipassConfig(
  paletteKey: Parameters<typeof accentFromPalette>[0],
  overrides: Omit<MultipassCardConfig, 'cardType' | 'ticketGraphic' | 'punchIcon'>,
): MultipassCardConfig {
  return {
    cardType: 'multipass',
    ticketGraphic: 'ticket',
    punchIcon: paletteKey === 'vip_membership' ? 'star' : 'check',
    ...overrides,
  };
}

export const CORPORATE_PRESETS: WalletTemplate[] = [
  /* ── Corp Slate — mono corporate ────────────────────────────────── */
  buildSystemTemplate({
    id: 'corp-corp-slate',
    name: 'Corp Slate',
    description: 'Descuento corporativo con identificación de empleado.',
    cardType: 'corporate_discount',
    industry: 'services',
    paletteKey: 'corporate_discount',
    fields: [
      makeField({ id: 'k1', label: 'DESCUENTO', value: '20%', fieldGroup: 'primary', order: 0 }),
      makeField({ id: 'k2', label: 'EMPRESA', value: 'Slate Corp', fieldGroup: 'header', order: 1 }),
      makeField({ id: 'k3', label: 'EMPLEADO', value: 'SC-10482', fieldGroup: 'secondary', order: 2 }),
      makeField({ id: 'k4', label: 'DEPARTAMENTO', value: 'Operaciones', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: corporateConfig('corporate_discount', {
      corporateDiscountPercentage: 20,
      companyName: 'Slate Corp',
      employeeIdRequired: true,
      badgeStyle: 'corporate',
      securitySeal: true,
    }),
    barcode: makeBarcode('CODE128', 'ID empleado Slate Corp'),
    backContent: makeBackContent({
      rules: 'El descuento corporativo se aplica presentando este pase y un documento de identidad válido.',
      terms: 'Uso exclusivo del empleado. No transferible. Slate Corp se reserva el derecho de verificar la vigencia.',
      contactEmail: 'rrhh@slatecorp.es',
      websiteUrl: 'https://slatecorp.es',
      websiteLabel: 'Portal empleado',
    }),
    apple: {
      passStyle: 'generic',
      description: 'Pase corporativo Slate',
      organizationName: 'Slate Corp',
    },
    google: {
      passType: 'GenericClass',
      programName: 'Slate Corp Benefits',
    },
    tags: ['corporate', 'services', 'slate', 'employee'],
  }),

  /* ── Enterprise Navy — indigo enterprise pass ───────────────────── */
  buildSystemTemplate({
    id: 'corp-enterprise-navy',
    name: 'Enterprise Navy',
    description: 'Beneficios enterprise con sello de seguridad.',
    cardType: 'corporate_discount',
    industry: 'technology',
    paletteKey: 'affiliate',
    fields: [
      makeField({ id: 'k1', label: 'BENEFICIO', value: '25%', fieldGroup: 'primary', order: 0 }),
      makeField({ id: 'k2', label: 'CUENTA', value: 'Enterprise', fieldGroup: 'header', order: 1 }),
      makeField({ id: 'k3', label: 'TITULAR', value: 'Cuenta corporativa', fieldGroup: 'secondary', order: 2 }),
      makeField({ id: 'k4', label: 'VIGENCIA', value: '2026–2027', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: corporateConfig('affiliate', {
      corporateDiscountPercentage: 25,
      companyName: 'Enterprise Navy',
      employeeIdRequired: true,
      badgeStyle: 'standard',
      securitySeal: true,
    }),
    barcode: makeBarcode('PDF417', 'Pase Enterprise Navy'),
    backContent: makeBackContent({
      rules: 'Los titulares Enterprise reciben un 25% en licencias y soporte prioritario con este pase.',
      terms: 'Pase ligado a la cuenta corporativa. La baja laboral o de contrato suspende los beneficios.',
      contactEmail: 'enterprise@enterprisenavy.es',
      websiteUrl: 'https://enterprisenavy.es',
      websiteLabel: 'Soporte enterprise',
    }),
    apple: {
      passStyle: 'generic',
      description: 'Pase Enterprise Navy',
      organizationName: 'Enterprise Navy',
    },
    google: {
      passType: 'GenericClass',
      programName: 'Enterprise Navy Benefits',
    },
    tags: ['corporate', 'technology', 'enterprise', 'navy'],
  }),

  /* ── Office Mono — minimal office perk ──────────────────────────── */
  buildSystemTemplate({
    id: 'corp-office-mono',
    name: 'Office Mono',
    description: 'Perks de oficina en un pase minimalista.',
    cardType: 'corporate_discount',
    industry: 'services',
    paletteKey: 'corporate_discount',
    fields: [
      makeField({ id: 'k1', label: 'PERK', value: '15%', fieldGroup: 'primary', order: 0 }),
      makeField({ id: 'k2', label: 'SEDE', value: 'Madrid Centro', fieldGroup: 'header', order: 1 }),
      makeField({ id: 'k3', label: 'ÁREA', value: 'Diseño', fieldGroup: 'secondary', order: 2 }),
      makeField({ id: 'k4', label: 'ACCESO', value: '24/7', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: corporateConfig('corporate_discount', {
      corporateDiscountPercentage: 15,
      companyName: 'Office Mono',
      employeeIdRequired: false,
      badgeStyle: 'minimal',
      securitySeal: false,
    }),
    barcode: makeBarcode('QR_CODE', 'Acceso Office Mono'),
    backContent: makeBackContent({
      rules: 'Office Mono incluye un 15% en cafetería y acceso 24/7 a las instalaciones.',
      terms: 'El acceso fuera de horario requiere tarjeta activa. Los perks pueden actualizarse cada semestre.',
      contactEmail: 'office@officemono.es',
      websiteUrl: 'https://officemono.es',
      websiteLabel: 'Mapa de oficinas',
    }),
    apple: {
      passStyle: 'generic',
      description: 'Pase Office Mono',
      organizationName: 'Office Mono',
    },
    google: {
      passType: 'GenericClass',
      programName: 'Office Mono Perks',
    },
    tags: ['corporate', 'services', 'office', 'mono'],
  }),
];

export const REFERRAL_PRESETS: WalletTemplate[] = [
  /* ── Refiere y Gana — pink referral ─────────────────────────────── */
  buildSystemTemplate({
    id: 'referral-refiere-y-gana',
    name: 'Refiere y Gana',
    description: 'Pase de referidos con recompensas dobles.',
    cardType: 'referral_pass',
    industry: 'services',
    paletteKey: 'referral_pass',
    fields: [
      makeField({ id: 'r1', label: 'CÓDIGO', value: 'GANA-2026', fieldGroup: 'primary', order: 0 }),
      makeField({ id: 'r2', label: 'TU PREMIO', value: '15 €', fieldGroup: 'header', order: 1 }),
      makeField({ id: 'r3', label: 'PARA TU AMIGO', value: '10 €', fieldGroup: 'secondary', order: 2 }),
      makeField({ id: 'r4', label: 'REFERIDOS', value: '6 / 12', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: referralConfig('referral_pass', {
      referrerReward: '15 € de saldo',
      refereeReward: '10 € de bienvenida',
      maxReferralsPerCustomer: 12,
      referralCodePattern: 'GANA-{YEAR}',
    }),
    barcode: makeBarcode('QR_CODE', 'Código Refiere y Gana'),
    backContent: makeBackContent({
      rules: 'Comparte tu código. Cuando tu amigo haga su primera compra, ambos recibís saldo en la tarjeta.',
      terms: 'Máximo 12 referidos activos. Los saldos caducan a los 90 días. Prohibido el autobonificación.',
      contactEmail: 'refiere@refiereygana.es',
      websiteUrl: 'https://refiereygana.es',
      websiteLabel: 'Cómo funciona',
    }),
    apple: {
      passStyle: 'generic',
      description: 'Pase de referidos',
      organizationName: 'Refiere y Gana',
    },
    google: {
      passType: 'LoyaltyClass',
      programName: 'Refiere y Gana Club',
    },
    tags: ['referral', 'services', 'pink', 'rewards'],
  }),

  /* ── Amigo Amigo — magenta social referral ──────────────────────── */
  buildSystemTemplate({
    id: 'referral-amigo-amigo',
    name: 'Amigo Amigo',
    description: 'Red de amigos con ventajas compartidas.',
    cardType: 'referral_pass',
    industry: 'entertainment',
    paletteKey: 'coupon',
    fields: [
      makeField({ id: 'r1', label: 'INVITACIÓN', value: 'AMIGO-88', fieldGroup: 'primary', order: 0 }),
      makeField({ id: 'r2', label: 'BONUS', value: '2 entradas', fieldGroup: 'header', order: 1 }),
      makeField({ id: 'r3', label: 'PARA AMIGOS', value: '20% dto.', fieldGroup: 'secondary', order: 2 }),
      makeField({ id: 'r4', label: 'VÁLIDO', value: 'Este mes', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: referralConfig('coupon', {
      referrerReward: '2 entradas gratis',
      refereeReward: '20% de descuento',
      maxReferralsPerCustomer: 6,
      referralCodePattern: 'AMIGO-{CODE}',
    }),
    barcode: makeBarcode('QR_CODE', 'Invitación Amigo Amigo'),
    backContent: makeBackContent({
      rules: 'Invita hasta 6 amigos al mes. Cada alta válida te da 2 entradas y a tu amigo un 20% de descuento.',
      terms: 'Las entradas son para sesiones estándar. No transferibles. Válido solo en el mes en curso.',
      contactEmail: 'hola@amigoamigo.es',
      websiteUrl: 'https://amigoamigo.es',
      websiteLabel: 'Invitar',
    }),
    apple: {
      passStyle: 'generic',
      description: 'Pase Amigo Amigo',
      organizationName: 'Amigo Amigo',
    },
    google: {
      passType: 'OfferClass',
      programName: 'Amigo Amigo Invita',
    },
    tags: ['referral', 'entertainment', 'social', 'magenta'],
  }),

  /* ── Comparte Premium — amber share pass ────────────────────────── */
  buildSystemTemplate({
    id: 'referral-comparte-premium',
    name: 'Comparte Premium',
    description: 'Comparte tu plan premium y crece juntos.',
    cardType: 'referral_pass',
    industry: 'technology',
    paletteKey: 'multipass',
    fields: [
      makeField({ id: 'r1', label: 'ENLACE', value: 'PREM-2026', fieldGroup: 'primary', order: 0 }),
      makeField({ id: 'r2', label: 'TU PREMIO', value: '1 mes gratis', fieldGroup: 'header', order: 1 }),
      makeField({ id: 'r3', label: 'PARA AMIGOS', value: '50% primer mes', fieldGroup: 'secondary', order: 2 }),
      makeField({ id: 'r4', label: 'ESTADO', value: 'Activo', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: referralConfig('multipass', {
      referrerReward: '1 mes de premium gratis',
      refereeReward: '50% el primer mes',
      maxReferralsPerCustomer: 20,
      referralCodePattern: 'PREM-{YEAR}',
    }),
    barcode: makeBarcode('QR_CODE', 'Enlace Comparte Premium'),
    backContent: makeBackContent({
      rules: 'Comparte tu enlace premium. Si tu amigo se suscribe, ambos recibís la recompensa indicada.',
      terms: 'Las recompensas se aplican en el siguiente ciclo de facturación. Cuentas duplicadas no son válidas.',
      contactEmail: 'premium@compartepremium.es',
      websiteUrl: 'https://compartepremium.es',
      websiteLabel: 'Mi enlace',
    }),
    apple: {
      passStyle: 'generic',
      description: 'Pase Comparte Premium',
      organizationName: 'Comparte Premium',
    },
    google: {
      passType: 'LoyaltyClass',
      programName: 'Comparte Premium',
    },
    tags: ['referral', 'technology', 'premium', 'share'],
  }),
];

export const MULTIPASS_PRESETS: WalletTemplate[] = [
  /* ── Bono 10 Visitas — orange multi-visit ───────────────────────── */
  buildSystemTemplate({
    id: 'multipass-bono-10-visitas',
    name: 'Bono 10 Visitas',
    description: 'Bono multipase de 10 visitas con seguimiento visual.',
    cardType: 'multipass',
    industry: 'services',
    paletteKey: 'multipass',
    fields: [
      makeField({ id: 'm1', label: 'VISITAS', value: '6 / 10', fieldGroup: 'primary', order: 0 }),
      makeField({ id: 'm2', label: 'TIPO', value: 'Bono flexible', fieldGroup: 'header', order: 1 }),
      makeField({ id: 'm3', label: 'PRECIO', value: '89 €', fieldGroup: 'secondary', order: 2, dataType: 'currency' }),
      makeField({ id: 'm4', label: 'RESTANTES', value: '4 visitas', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: multipassConfig('multipass', {
      bundleSize: 10,
      bundlePrice: 89,
      passTypeLabel: 'Bono de visitas',
      bundleBadgeStyle: 'visual',
      indicatorStyle: 'visual',
    }),
    barcode: makeBarcode('QR_CODE', 'Bono 10 Visitas'),
    backContent: makeBackContent({
      rules: 'Este bono incluye 10 visitas. Cada visita se marca al canjear. Las visitas no usadas no son reembolsables.',
      terms: 'Bono personal y no transferible. Validez de 12 meses desde la primera visita.',
      contactEmail: 'bonos@bono10visitas.es',
      websiteUrl: 'https://bono10visitas.es',
      websiteLabel: 'Reservar visita',
    }),
    apple: {
      passStyle: 'storeCard',
      description: 'Bono de 10 visitas',
      organizationName: 'Bono 10 Visitas',
    },
    google: {
      passType: 'LoyaltyClass',
      programName: 'Bono 10 Visitas',
    },
    tags: ['multipass', 'services', 'visits', 'bundle'],
  }),

  /* ── Carné Multiservicio — cyan multi-service ───────────────────── */
  buildSystemTemplate({
    id: 'multipass-carne-multiservicio',
    name: 'Carné Multiservicio',
    description: 'Acceso a varios servicios con un solo pase.',
    cardType: 'multipass',
    industry: 'retail',
    paletteKey: 'gift_certificate',
    fields: [
      makeField({ id: 'm1', label: 'SERVICIOS', value: '3 activos', fieldGroup: 'primary', order: 0 }),
      makeField({ id: 'm2', label: 'CARNÉ', value: 'Multi+', fieldGroup: 'header', order: 1 }),
      makeField({ id: 'm3', label: 'INCLUYE', value: 'Lavandería · Café · Gym', fieldGroup: 'secondary', order: 2 }),
      makeField({ id: 'm4', label: 'RENOVA', value: '01 Ene 2027', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: multipassConfig('gift_certificate', {
      bundleSize: 3,
      bundlePrice: 29,
      passTypeLabel: 'Multiservicio',
      bundleBadgeStyle: 'minimal',
      indicatorStyle: 'minimal',
    }),
    barcode: makeBarcode('CODE128', 'Carné Multiservicio'),
    backContent: makeBackContent({
      rules: 'El Carné Multiservicio da acceso a los tres servicios adheridos. Presenta el pase en cada local.',
      terms: 'La baja de un servicio no reduce la cuota anual. Renovación automática salvo cancelación.',
      contactEmail: 'multi@carneMultiservicio.es',
      websiteUrl: 'https://carneMultiservicio.es',
      websiteLabel: 'Servicios incluidos',
    }),
    apple: {
      passStyle: 'generic',
      description: 'Carné Multiservicio',
      organizationName: 'Carné Multiservicio',
    },
    google: {
      passType: 'GenericClass',
      programName: 'Multiservicio Pass',
    },
    tags: ['multipass', 'retail', 'multi', 'services'],
  }),

  /* ── Pass Anual — violet annual access ──────────────────────────── */
  buildSystemTemplate({
    id: 'multipass-pass-anual',
    name: 'Pass Anual',
    description: 'Acceso anual ilimitado con indicador de uso.',
    cardType: 'multipass',
    industry: 'entertainment',
    paletteKey: 'vip_membership',
    fields: [
      makeField({ id: 'm1', label: 'ACCESOS', value: '24 / 50', fieldGroup: 'primary', order: 0 }),
      makeField({ id: 'm2', label: 'PASS', value: 'Anual Unlimited', fieldGroup: 'header', order: 1 }),
      makeField({ id: 'm3', label: 'PERIODO', value: 'Ene – Dic 2026', fieldGroup: 'secondary', order: 2 }),
      makeField({ id: 'm4', label: 'RESTANTES', value: '26 accesos', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: multipassConfig('vip_membership', {
      bundleSize: 50,
      bundlePrice: 199,
      passTypeLabel: 'Acceso anual',
      bundleBadgeStyle: 'numeric',
      indicatorStyle: 'numeric',
    }),
    barcode: makeBarcode('QR_CODE', 'Pass Anual Unlimited'),
    backContent: makeBackContent({
      rules: 'El Pass Anual incluye hasta 50 accesos en el año calendario. Cada acceso se registra automáticamente.',
      terms: 'Los accesos no usados no se acumulan al siguiente año. El pase es personal e intransferible.',
      contactEmail: 'pases@passanual.es',
      websiteUrl: 'https://passanual.es',
      websiteLabel: 'Calendario',
    }),
    apple: {
      passStyle: 'storeCard',
      description: 'Pass anual de accesos',
      organizationName: 'Pass Anual',
    },
    google: {
      passType: 'LoyaltyClass',
      programName: 'Pass Anual Unlimited',
    },
    tags: ['multipass', 'entertainment', 'annual', 'access'],
  }),
];
