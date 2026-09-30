/**
 * Stamp card system presets — four distinct art directions.
 */

import type { WalletTemplate } from '@/components/wallet/types/templates';
import type { StampCardConfig } from '@/components/wallet/types/card-type-config';
import {
  accentFromPalette,
  buildSystemTemplate,
  makeBackContent,
  makeBarcode,
  makeField,
} from './palette-utils';

function stampConfig(
  paletteKey: Parameters<typeof accentFromPalette>[0],
  overrides: Omit<StampCardConfig, 'cardType' | 'stampColor'>,
): StampCardConfig {
  return {
    cardType: 'stamp',
    stampColor: accentFromPalette(paletteKey),
    ...overrides,
  };
}

export const STAMP_PRESETS: WalletTemplate[] = [
  /* ── Café Artesanal — warm amber/rose ───────────────────────────── */
  buildSystemTemplate({
    id: 'stamp-cafe-artesanal',
    name: 'Café Artesanal',
    description: 'Sellos de visita con recompensa de café de especialidad.',
    cardType: 'stamp',
    industry: 'food',
    paletteKey: 'stamp',
    fields: [
      makeField({ id: 's1', label: 'SELLOS', value: '3 / 10', fieldGroup: 'primary', order: 0 }),
      makeField({ id: 's2', label: 'RECOMPENSA', value: 'Café de especialidad', fieldGroup: 'secondary', order: 1 }),
      makeField({ id: 's3', label: 'MIEMBRO DESDE', value: 'Ene 2026', fieldGroup: 'header', order: 2 }),
      makeField({ id: 's4', label: 'VÁLIDO HASTA', value: '31 Dic 2026', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: stampConfig('stamp', {
      stampsRequired: 10,
      rewardDescription: 'Café de especialidad gratis',
      stampType: 'visit',
      consumptionPerStamp: 1,
      stampExpiry: 'unlimited',
      stampsAtIssue: 0,
      dailyStampLimit: 2,
      birthdayStamps: 2,
      stampShape: 'circle',
      stampIcon: 'coffee',
      stampFilledIcon: 'coffee-filled',
      stampGridLayout: '5x2',
    }),
    barcode: makeBarcode('QR_CODE', 'Escanea para acumular sellos'),
    backContent: makeBackContent({
      rules: 'Acumula un sello por cada visita. Al completar 10 sellos recibes un café de especialidad gratis. Los sellos no son transferibles.',
      terms: 'Promoción válida del 1 de enero al 31 de diciembre de 2026. La recompensa no canjeable por dinero en efectivo. Sujeto a disponibilidad.',
      contactEmail: 'hola@cafeartesanal.es',
      websiteUrl: 'https://cafeartesanal.es',
      websiteLabel: 'Visítanos',
    }),
    apple: {
      passStyle: 'storeCard',
      description: 'Tarjeta de sellos — Café Artesanal',
      organizationName: 'Café Artesanal',
    },
    google: {
      passType: 'LoyaltyClass',
      programName: 'Café Artesanal Club',
    },
    tags: ['café', 'food', 'stamp', 'warm', 'artesanal'],
  }),

  /* ── Lavado Premium — cool sky/cyan ─────────────────────────────── */
  buildSystemTemplate({
    id: 'stamp-lavado-premium',
    name: 'Lavado Premium',
    description: 'Programa de lavados con sellos y acabado premium.',
    cardType: 'stamp',
    industry: 'services',
    paletteKey: 'gift_certificate',
    fields: [
      makeField({ id: 's1', label: 'LAVADOS', value: '4 / 8', fieldGroup: 'primary', order: 0 }),
      makeField({ id: 's2', label: 'PREMIO', value: 'Lavado premium', fieldGroup: 'secondary', order: 1 }),
      makeField({ id: 's3', label: 'CLIENTE', value: 'Plan Platino', fieldGroup: 'header', order: 2 }),
      makeField({ id: 's4', label: 'PRÓXIMO', value: '15 Oct 2026', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: stampConfig('gift_certificate', {
      stampsRequired: 8,
      rewardDescription: 'Lavado premium sin coste',
      stampType: 'visit',
      consumptionPerStamp: 1,
      stampExpiry: 'unlimited',
      stampsAtIssue: 1,
      dailyStampLimit: 1,
      birthdayStamps: 1,
      stampShape: 'square',
      stampIcon: 'droplet',
      stampFilledIcon: 'droplet-filled',
      stampGridLayout: '4x4',
    }),
    barcode: makeBarcode('CODE128', 'Código de cliente'),
    backContent: makeBackContent({
      rules: 'Un sello por cada lavado estándar o superior. Completa 8 sellos y obtén un lavado premium gratuito.',
      terms: 'Válido durante 12 meses desde la emisión. No acumulable con otras promociones. Consulta condiciones en el local.',
      contactEmail: 'reservas@lavadoPremium.es',
      websiteUrl: 'https://lavadoPremium.es',
      websiteLabel: 'Reservar',
    }),
    apple: {
      passStyle: 'storeCard',
      description: 'Tarjeta de lavados — Lavado Premium',
      organizationName: 'Lavado Premium',
    },
    google: {
      passType: 'LoyaltyClass',
      programName: 'Lavado Premium Club',
    },
    tags: ['car', 'services', 'stamp', 'cool', 'premium'],
  }),

  /* ── Fidelidad Minimal — mono slate ─────────────────────────────── */
  buildSystemTemplate({
    id: 'stamp-fidelidad-minimal',
    name: 'Fidelidad Minimal',
    description: 'Diseño monocromo para programas de fidelidad discretos.',
    cardType: 'stamp',
    industry: 'retail',
    paletteKey: 'corporate_discount',
    fields: [
      makeField({ id: 's1', label: 'PUNTOS', value: '7 / 12', fieldGroup: 'primary', order: 0 }),
      makeField({ id: 's2', label: 'BENEFICIO', value: '−20% próxima compra', fieldGroup: 'secondary', order: 1 }),
      makeField({ id: 's3', label: 'NIVEL', value: 'Estándar', fieldGroup: 'header', order: 2 }),
      makeField({ id: 's4', label: 'EMISIÓN', value: '01 Mar 2026', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: stampConfig('corporate_discount', {
      stampsRequired: 12,
      rewardDescription: '20% de descuento',
      stampType: 'consumption',
      consumptionPerStamp: 25,
      stampExpiry: 'unlimited',
      stampsAtIssue: 0,
      dailyStampLimit: 4,
      birthdayStamps: 0,
      stampShape: 'hexagon',
      stampIcon: 'circle',
      stampFilledIcon: 'circle-filled',
      stampGridLayout: '6x2',
    }),
    barcode: makeBarcode('QR_CODE', 'Identificador de fidelidad'),
    backContent: makeBackContent({
      rules: 'Cada 25 € de compra equivalen a un sello. Con 12 sellos obtienes un 20% de descuento en tu próxima compra.',
      terms: 'Descuento no acumulable con otras ofertas. Los sellos caducan a los 18 meses. Consulta condiciones en tienda.',
      contactEmail: 'fidelidad@minimalstore.es',
      websiteUrl: 'https://minimalstore.es',
      websiteLabel: 'Tienda',
    }),
    apple: {
      passStyle: 'storeCard',
      description: 'Programa de fidelidad minimalista',
      organizationName: 'Minimal Store',
    },
    google: {
      passType: 'LoyaltyClass',
      programName: 'Minimal Fidelidad',
    },
    tags: ['retail', 'stamp', 'mono', 'minimal', 'slate'],
  }),

  /* ── Panadería Sol — bakery / heart stamps ──────────────────────── */
  buildSystemTemplate({
    id: 'stamp-panaderia-sol',
    name: 'Panadería Sol',
    description: 'Sellos con forma de corazón para panadería artesanal.',
    cardType: 'stamp',
    industry: 'food',
    paletteKey: 'referral_pass',
    fields: [
      makeField({ id: 's1', label: 'MASAS', value: '5 / 9', fieldGroup: 'primary', order: 0 }),
      makeField({ id: 's2', label: 'REGALO', value: 'Barra de masa madre', fieldGroup: 'secondary', order: 1 }),
      makeField({ id: 's3', label: 'FRECUENCIA', value: 'Semanal', fieldGroup: 'header', order: 2 }),
      makeField({ id: 's4', label: 'VÁLIDO HASTA', value: '30 Jun 2026', fieldGroup: 'auxiliary', order: 3 }),
    ],
    cardTypeConfig: stampConfig('referral_pass', {
      stampsRequired: 9,
      rewardDescription: 'Barra de masa madre gratis',
      stampType: 'visit',
      consumptionPerStamp: 1,
      stampExpiry: 'unlimited',
      stampsAtIssue: 0,
      dailyStampLimit: 2,
      birthdayStamps: 3,
      stampShape: 'heart',
      stampIcon: 'wheat',
      stampFilledIcon: 'wheat-filled',
      stampGridLayout: '3x3',
    }),
    barcode: makeBarcode('QR_CODE', 'Escanea en caja'),
    backContent: makeBackContent({
      rules: 'Un sello por compra. Al reunir 9 sellos te regalamos una barra de masa madre. Los sellos de cumpleaños se aplican automáticamente.',
      terms: 'Promoción válida en tiendas físicas. No transferible. Panadería Sol se reserva el derecho de modificar las condiciones.',
      contactEmail: 'hola@panaderiasol.es',
      websiteUrl: 'https://panaderiasol.es',
      websiteLabel: 'Nuestra historia',
    }),
    apple: {
      passStyle: 'storeCard',
      description: 'Tarjeta de sellos — Panadería Sol',
      organizationName: 'Panadería Sol',
    },
    google: {
      passType: 'LoyaltyClass',
      programName: 'Panadería Sol Rewards',
    },
    tags: ['bakery', 'food', 'stamp', 'heart', 'warm'],
  }),
];
