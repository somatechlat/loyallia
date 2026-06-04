/**
 * Constants and metadata for the Wallet Pass Studio.
 *
 * All platform-specific mappings, card type metadata, industry presets,
 * field group limits, barcode format support, and default design values.
 */

import type {
  CardType,
  Industry,
  FieldGroup,
  BarcodeFormat,
  PassStyle,
  GooglePassType,
  WalletColors,
  BarcodeConfig,
  BackContent,
} from './types';
import { defaultBackContentDefaults } from './types/back-content';

/* ------------------------------------------------------------------ */
/*  Card Type Metadata                                                */
/* ------------------------------------------------------------------ */

export const CARD_TYPE_METADATA: Record<
  CardType,
  {
    label: string;
    description: string;
    applePassStyle: PassStyle;
    googlePassType: GooglePassType;
    defaultIndustry: Industry;
    maxHeaderFields: number;
    maxPrimaryFields: number;
    maxSecondaryFields: number;
    maxAuxiliaryFields: number;
    maxBackFields: number;
    supportsStripImage: boolean;
    supportsThumbnail: boolean;
    defaultBackContent: BackContent;
    visualElements: string[];
  }
> = {
  stamp: {
    label: 'Tarjeta de Sellos',
    description:
      'Programa de sellos: acumula visitas o consumos para obtener una recompensa.',
    applePassStyle: 'storeCard',
    googlePassType: 'LoyaltyClass',
    defaultIndustry: 'food',
    maxHeaderFields: 3,
    maxPrimaryFields: 1,
    maxSecondaryFields: 4,
    maxAuxiliaryFields: 4,
    maxBackFields: Infinity,
    supportsStripImage: true,
    supportsThumbnail: true,
    defaultBackContent: defaultBackContentDefaults.stamp,
    visualElements: ['stamp_grid', 'progress_ring', 'reward_badge'],
  },
  cashback: {
    label: 'Cashback',
    description: 'Devolución de porcentaje en cada compra.',
    applePassStyle: 'storeCard',
    googlePassType: 'LoyaltyClass',
    defaultIndustry: 'retail',
    maxHeaderFields: 3,
    maxPrimaryFields: 1,
    maxSecondaryFields: 4,
    maxAuxiliaryFields: 4,
    maxBackFields: Infinity,
    supportsStripImage: true,
    supportsThumbnail: true,
    defaultBackContent: defaultBackContentDefaults.cashback,
    visualElements: ['progress_ring', 'coin_stack', 'tier_badge'],
  },
  coupon: {
    label: 'Cupón',
    description: 'Descuento fijo o porcentaje para una compra.',
    applePassStyle: 'coupon',
    googlePassType: 'OfferClass',
    defaultIndustry: 'retail',
    maxHeaderFields: 3,
    maxPrimaryFields: 1,
    maxSecondaryFields: 4,
    maxAuxiliaryFields: 4,
    maxBackFields: Infinity,
    supportsStripImage: true,
    supportsThumbnail: false,
    defaultBackContent: defaultBackContentDefaults.coupon,
    visualElements: ['cut_line', 'discount_badge', 'offer_tag'],
  },
  affiliate: {
    label: 'Afiliado',
    description: 'Programa de referidos con código de afiliado.',
    applePassStyle: 'generic',
    googlePassType: 'GenericClass',
    defaultIndustry: 'services',
    maxHeaderFields: 3,
    maxPrimaryFields: 1,
    maxSecondaryFields: 4,
    maxAuxiliaryFields: 4,
    maxBackFields: Infinity,
    supportsStripImage: false,
    supportsThumbnail: true,
    defaultBackContent: defaultBackContentDefaults.affiliate,
    visualElements: ['referral_badge', 'partner_logo', 'qr_code'],
  },
  discount: {
    label: 'Descuento por Niveles',
    description: 'Descuentos progresivos según nivel de gasto.',
    applePassStyle: 'storeCard',
    googlePassType: 'LoyaltyClass',
    defaultIndustry: 'retail',
    maxHeaderFields: 3,
    maxPrimaryFields: 1,
    maxSecondaryFields: 4,
    maxAuxiliaryFields: 4,
    maxBackFields: Infinity,
    supportsStripImage: true,
    supportsThumbnail: true,
    defaultBackContent: defaultBackContentDefaults.discount,
    visualElements: ['tier_progress_bar', 'tier_badges', 'discount_banner'],
  },
  gift_certificate: {
    label: 'Tarjeta Regalo',
    description: 'Certificado de regalo con saldo o valor fijo.',
    applePassStyle: 'storeCard',
    googlePassType: 'GiftCardClass',
    defaultIndustry: 'retail',
    maxHeaderFields: 3,
    maxPrimaryFields: 1,
    maxSecondaryFields: 4,
    maxAuxiliaryFields: 4,
    maxBackFields: Infinity,
    supportsStripImage: true,
    supportsThumbnail: true,
    defaultBackContent: defaultBackContentDefaults.gift_certificate,
    visualElements: ['gift_box', 'ribbon', 'denomination_badge'],
  },
  vip_membership: {
    label: 'Membresía VIP',
    description:
      'Acceso exclusivo con beneficios y tarifa mensual/anual.',
    applePassStyle: 'generic',
    googlePassType: 'LoyaltyClass',
    defaultIndustry: 'entertainment',
    maxHeaderFields: 3,
    maxPrimaryFields: 1,
    maxSecondaryFields: 4,
    maxAuxiliaryFields: 4,
    maxBackFields: Infinity,
    supportsStripImage: true,
    supportsThumbnail: true,
    defaultBackContent: defaultBackContentDefaults.vip_membership,
    visualElements: ['crown', 'member_badge', 'benefits_list'],
  },
  corporate_discount: {
    label: 'Descuento Corporativo',
    description: 'Descuentos exclusivos para empleados de empresa.',
    applePassStyle: 'generic',
    googlePassType: 'GenericClass',
    defaultIndustry: 'services',
    maxHeaderFields: 3,
    maxPrimaryFields: 1,
    maxSecondaryFields: 4,
    maxAuxiliaryFields: 4,
    maxBackFields: Infinity,
    supportsStripImage: false,
    supportsThumbnail: true,
    defaultBackContent: defaultBackContentDefaults.corporate_discount,
    visualElements: ['id_badge', 'company_logo', 'corporate_banner'],
  },
  referral_pass: {
    label: 'Pase de Referido',
    description: 'Recompensas por referir amigos al negocio.',
    applePassStyle: 'generic',
    googlePassType: 'GenericClass',
    defaultIndustry: 'services',
    maxHeaderFields: 3,
    maxPrimaryFields: 1,
    maxSecondaryFields: 4,
    maxAuxiliaryFields: 4,
    maxBackFields: Infinity,
    supportsStripImage: false,
    supportsThumbnail: true,
    defaultBackContent: defaultBackContentDefaults.referral_pass,
    visualElements: ['share_button', 'reward_badge', 'friend_avatar'],
  },
  multipass: {
    label: 'Multi-Pase',
    description: 'Paquete de entradas o sesiones prepagadas.',
    applePassStyle: 'eventTicket',
    googlePassType: 'GenericClass',
    defaultIndustry: 'entertainment',
    maxHeaderFields: 3,
    maxPrimaryFields: 1,
    maxSecondaryFields: 4,
    maxAuxiliaryFields: 4,
    maxBackFields: Infinity,
    supportsStripImage: true,
    supportsThumbnail: true,
    defaultBackContent: defaultBackContentDefaults.multipass,
    visualElements: ['ticket_bundle', 'punch_grid', 'session_counter'],
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Industry Metadata                                                 */
/* ------------------------------------------------------------------ */

export const INDUSTRY_METADATA: Record<
  Industry,
  {
    label: string;
    icon: string;
    colorPresets: Array<{
      background: string;
      foreground: string;
      label: string;
      accent: string;
    }>;
  }
> = {
  food: {
    label: 'Alimentación y Bebidas',
    icon: 'UtensilsCrossed',
    colorPresets: [
      {
        background: '#6B4226',
        foreground: '#FFFFFF',
        label: '#F5DEB3',
        accent: '#D2691E',
      },
      {
        background: '#FFF8E1',
        foreground: '#3E2723',
        label: '#8D6E63',
        accent: '#FF6F00',
      },
      {
        background: '#2E1A0F',
        foreground: '#FFFFFF',
        label: '#D7CCC8',
        accent: '#A1887F',
      },
    ],
  },
  retail: {
    label: 'Retail y Comercio',
    icon: 'ShoppingBag',
    colorPresets: [
      {
        background: '#2E8B57',
        foreground: '#FFFFFF',
        label: '#90EE90',
        accent: '#3CB371',
      },
      {
        background: '#FFFFFF',
        foreground: '#1A1A1A',
        label: '#666666',
        accent: '#E53935',
      },
      {
        background: '#1A237E',
        foreground: '#FFFFFF',
        label: '#C5CAE9',
        accent: '#FF4081',
      },
    ],
  },
  services: {
    label: 'Servicios Profesionales',
    icon: 'Briefcase',
    colorPresets: [
      {
        background: '#263238',
        foreground: '#FFFFFF',
        label: '#B0BEC5',
        accent: '#00BCD4',
      },
      {
        background: '#F5F5F5',
        foreground: '#212121',
        label: '#757575',
        accent: '#607D8B',
      },
    ],
  },
  health: {
    label: 'Salud y Bienestar',
    icon: 'Heart',
    colorPresets: [
      {
        background: '#E3F2FD',
        foreground: '#0D47A1',
        label: '#1976D2',
        accent: '#2196F3',
      },
      {
        background: '#1A1A2E',
        foreground: '#FFFFFF',
        label: '#E94560',
        accent: '#E94560',
      },
      {
        background: '#E8F5E9',
        foreground: '#1B5E20',
        label: '#388E3C',
        accent: '#4CAF50',
      },
    ],
  },
  entertainment: {
    label: 'Entretenimiento',
    icon: 'Music',
    colorPresets: [
      {
        background: '#311B92',
        foreground: '#FFFFFF',
        label: '#D1C4E9',
        accent: '#E040FB',
      },
      {
        background: '#000000',
        foreground: '#FFFFFF',
        label: '#FFD700',
        accent: '#FF1744',
      },
    ],
  },
  transport: {
    label: 'Transporte',
    icon: 'Bus',
    colorPresets: [
      {
        background: '#01579B',
        foreground: '#FFFFFF',
        label: '#B3E5FC',
        accent: '#03A9F4',
      },
      {
        background: '#212121',
        foreground: '#FFFFFF',
        label: '#FFEB3B',
        accent: '#FFC107',
      },
    ],
  },
  education: {
    label: 'Educación',
    icon: 'GraduationCap',
    colorPresets: [
      {
        background: '#FFF3E0',
        foreground: '#E65100',
        label: '#F57C00',
        accent: '#FF9800',
      },
      {
        background: '#1B5E20',
        foreground: '#FFFFFF',
        label: '#C8E6C9',
        accent: '#69F0AE',
      },
    ],
  },
  technology: {
    label: 'Tecnología',
    icon: 'Cpu',
    colorPresets: [
      {
        background: '#0D1117',
        foreground: '#C9D1D9',
        label: '#8B949E',
        accent: '#58A6FF',
      },
      {
        background: '#F3E5F5',
        foreground: '#4A148C',
        label: '#7B1FA2',
        accent: '#9C27B0',
      },
    ],
  },
  generic: {
    label: 'Genérico',
    icon: 'Sparkles',
    colorPresets: [
      {
        background: '#FAFAFA',
        foreground: '#212121',
        label: '#9E9E9E',
        accent: '#616161',
      },
      {
        background: '#37474F',
        foreground: '#FFFFFF',
        label: '#B0BEC5',
        accent: '#26A69A',
      },
    ],
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Field Group Metadata                                              */
/* ------------------------------------------------------------------ */

export const FIELD_GROUP_METADATA: Record<
  FieldGroup,
  {
    label: string;
    description: string;
    maxFields: number;
    appleFieldGroup: string;
    googleRowType: string;
  }
> = {
  header: {
    label: 'Encabezado',
    description:
      'Campos visibles en la parte superior de la tarjeta.',
    maxFields: 3,
    appleFieldGroup: 'headerFields',
    googleRowType: 'row1',
  },
  primary: {
    label: 'Primario',
    description:
      'Campo principal con el valor más destacado de la tarjeta.',
    maxFields: 1,
    appleFieldGroup: 'primaryFields',
    googleRowType: 'row2',
  },
  secondary: {
    label: 'Secundario',
    description:
      'Campos secundarios ubicados debajo del campo primario.',
    maxFields: 4,
    appleFieldGroup: 'secondaryFields',
    googleRowType: 'row3',
  },
  auxiliary: {
    label: 'Auxiliar',
    description:
      'Campos auxiliares con información adicional complementaria.',
    maxFields: 5,
    appleFieldGroup: 'auxiliaryFields',
    googleRowType: 'row4',
  },
  back: {
    label: 'Reverso',
    description:
      'Campos que aparecen en la parte trasera de la tarjeta.',
    maxFields: 8,
    appleFieldGroup: 'backFields',
    googleRowType: 'back',
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Barcode Format Metadata                                           */
/* ------------------------------------------------------------------ */

export const BARCODE_FORMAT_METADATA: Record<
  BarcodeFormat,
  {
    label: string;
    appleSupported: boolean;
    googleSupported: boolean;
    description: string;
  }
> = {
  QR_CODE: {
    label: 'QR Code',
    appleSupported: true,
    googleSupported: true,
    description: 'Código QR 2D, ideal para escaneo rápido con cualquier dispositivo.',
  },
  AZTEC: {
    label: 'Aztec',
    appleSupported: true,
    googleSupported: false,
    description:
      'Código 2D Aztec, compatible con Apple Wallet.',
  },
  PDF417: {
    label: 'PDF417',
    appleSupported: true,
    googleSupported: true,
    description:
      'Código de barras 2D de alta densidad para muchos datos.',
  },
  CODE128: {
    label: 'Code 128',
    appleSupported: true,
    googleSupported: true,
    description:
      'Código de barras lineal de alta densidad, muy versátil.',
  },
  DATA_MATRIX: {
    label: 'Data Matrix',
    appleSupported: false,
    googleSupported: true,
    description:
      'Matriz de datos 2D, compatible con Google Wallet.',
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Color Presets                                                     */
/* ------------------------------------------------------------------ */

export const COLOR_PRESETS = [
  {
    name: 'Café Cálido',
    background: '#6B4226',
    foreground: '#FFFFFF',
    label: '#F5DEB3',
    accent: '#D2691E',
  },
  {
    name: 'Retail Fresh',
    background: '#2E8B57',
    foreground: '#FFFFFF',
    label: '#90EE90',
    accent: '#3CB371',
  },
  {
    name: 'Gym Energy',
    background: '#1A1A2E',
    foreground: '#FFFFFF',
    label: '#E94560',
    accent: '#E94560',
  },
  {
    name: 'Tech Midnight',
    background: '#0D1117',
    foreground: '#C9D1D9',
    label: '#8B949E',
    accent: '#58A6FF',
  },
  {
    name: 'Elegant Noir',
    background: '#1A1A1A',
    foreground: '#FFFFFF',
    label: '#B0B0B0',
    accent: '#C0A062',
  },
  {
    name: 'Pastel Dream',
    background: '#F3E5F5',
    foreground: '#4A148C',
    label: '#7B1FA2',
    accent: '#9C27B0',
  },
  {
    name: 'Ocean Breeze',
    background: '#E3F2FD',
    foreground: '#0D47A1',
    label: '#1976D2',
    accent: '#2196F3',
  },
  {
    name: 'Sunset Glow',
    background: '#FFF3E0',
    foreground: '#E65100',
    label: '#F57C00',
    accent: '#FF9800',
  },
  {
    name: 'Minimal Light',
    background: '#FAFAFA',
    foreground: '#212121',
    label: '#9E9E9E',
    accent: '#616161',
  },
  {
    name: 'Corporate Slate',
    background: '#37474F',
    foreground: '#FFFFFF',
    label: '#B0BEC5',
    accent: '#26A69A',
  },
  {
    name: 'Cherry Pop',
    background: '#FFFFFF',
    foreground: '#1A1A1A',
    label: '#666666',
    accent: '#E53935',
  },
  {
    name: 'Berry Smoothie',
    background: '#880E4F',
    foreground: '#FFFFFF',
    label: '#F8BBD0',
    accent: '#FF4081',
  },
  {
    name: 'Forest Deep',
    background: '#1B5E20',
    foreground: '#FFFFFF',
    label: '#C8E6C9',
    accent: '#69F0AE',
  },
  {
    name: 'Lavender Soft',
    background: '#EDE7F6',
    foreground: '#311B92',
    label: '#5E35B1',
    accent: '#7C4DFF',
  },
  {
    name: 'Golden Ticket',
    background: '#000000',
    foreground: '#FFFFFF',
    label: '#FFD700',
    accent: '#FF1744',
  },
  {
    name: 'Citrus Fresh',
    background: '#F9FBE7',
    foreground: '#33691E',
    label: '#689F38',
    accent: '#AEEA00',
  },
  {
    name: 'Rose Gold',
    background: '#FFF0F5',
    foreground: '#880E4F',
    label: '#C2185B',
    accent: '#F48FB1',
  },
  {
    name: 'Arctic Chill',
    background: '#E0F7FA',
    foreground: '#006064',
    label: '#00838F',
    accent: '#00BCD4',
  },
  {
    name: 'Terra Cotta',
    background: '#3E2723',
    foreground: '#FFFFFF',
    label: '#D7CCC8',
    accent: '#FF7043',
  },
  {
    name: 'Neon Night',
    background: '#212121',
    foreground: '#FFFFFF',
    label: '#FFEB3B',
    accent: '#00E676',
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Studio Tabs                                                       */
/* ------------------------------------------------------------------ */

export const STUDIO_TABS = [
  { id: 'images', label: 'Imágenes', icon: 'Image' },
  { id: 'cardType', label: 'Tipo de Tarjeta', icon: 'CreditCard' },
  { id: 'fields', label: 'Campos', icon: 'Text' },
  { id: 'back', label: 'Reverso', icon: 'RotateCcw' },
  { id: 'barcode', label: 'Código', icon: 'QrCode' },
  { id: 'colors', label: 'Colores', icon: 'Palette' },
  { id: 'advanced', label: 'Avanzado', icon: 'Settings' },
] as const;

/* ------------------------------------------------------------------ */
/*  Platform Mappings                                                 */
/* ------------------------------------------------------------------ */

/** Apple PassStyle → GooglePassType mapping (preferred default). */
export const APPLE_TO_GOOGLE_PASS_TYPE: Record<PassStyle, GooglePassType> = {
  generic: 'GenericClass',
  coupon: 'OfferClass',
  storeCard: 'LoyaltyClass',
  boardingPass: 'GenericClass',
  eventTicket: 'GenericClass',
  transitStyle: 'GenericClass',
} as const;

/** FieldGroup → Apple Wallet field group key. */
export const FIELD_GROUP_TO_APPLE: Record<FieldGroup, string> = {
  header: 'headerFields',
  primary: 'primaryFields',
  secondary: 'secondaryFields',
  auxiliary: 'auxiliaryFields',
  back: 'backFields',
} as const;

/** FieldGroup → Google Wallet row type key. */
export const FIELD_GROUP_TO_GOOGLE: Record<FieldGroup, string> = {
  header: 'row1',
  primary: 'row2',
  secondary: 'row3',
  auxiliary: 'row4',
  back: 'back',
} as const;

/* ------------------------------------------------------------------ */
/*  Default Design Values                                             */
/* ------------------------------------------------------------------ */

export const DEFAULT_COLORS: WalletColors = {
  background: '#1A1A1A',
  foreground: '#FFFFFF',
  label: '#9CA3AF',
  accent: '#3B82F6',
};

export const DEFAULT_BARCODE: BarcodeConfig = {
  format: 'QR_CODE',
  message: '',
  messageEncoding: 'iso-8859-1',
};

/* ------------------------------------------------------------------ */
/*  Default Back Content per Card Type                                */
/* ------------------------------------------------------------------ */

export { defaultBackContentDefaults as DEFAULT_BACK_CONTENT_DEFAULTS };
