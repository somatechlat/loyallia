/* ─── Shared Constants & Icons for Program Wizard ─────────────────── */

/* ─── Flat SVG Icon Component ─────────────────────────────────────── */
const ICON_PATHS: Record<string, string> = {
  stamp: 'M3 3h18v18H3zM9 12h6M12 9v6',
  dollar: 'M12 2a10 10 0 100 20 10 10 0 000-20zM16 8h-6a2 2 0 100 4h4a2 2 0 110 4H8M12 18V6',
  ticket: 'M2 9a3 3 0 010 6v2a2 2 0 002 2h16a2 2 0 002-2v-2a3 3 0 010-6V7a2 2 0 00-2-2H4a2 2 0 00-2 2z',
  handshake: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  layers: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  gift: 'M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 110-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 100-5C13 2 12 7 12 7z',
  crown: 'M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zM3 20h18',
  building: 'M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01',
  megaphone: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
};

/**
 * @description Renders a flat SVG icon for a given card type.
 * @param {Object} props - Component props
 * @param {string} props.icon - Icon key from ICON_PATHS
 * @param {string} [props.className='w-5 h-5'] - Tailwind classes
 * @returns JSX.Element
 */
export function CardTypeIcon({ icon, className = 'w-5 h-5' }: { icon: string; className?: string }) {
  const d = ICON_PATHS[icon] ?? ICON_PATHS.stamp ?? '';
  const segments = d.split('z');
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {d.split(/(?=[A-Z])/).length > 3 ?
        segments.map((seg, i) => seg.trim() ? <path key={i} d={seg.trim() + (i < segments.length - 1 ? 'z' : '')} /> : null)
        : <path d={d} />
      }
    </svg>
  );
}

/* ─── Card Type Registry ──────────────────────────────────────────── */
export const CARD_TYPES = [
  { value: 'stamp',              label: 'Tarjeta de Sellos',           icon: 'stamp', desc: 'Compra X, obtén 1 gratis' },
  { value: 'cashback',           label: 'Cashback / Puntos',           icon: 'dollar', desc: 'Devuelve un porcentaje de cada compra' },
  { value: 'coupon',             label: 'Cupón de Descuento',          icon: 'ticket', desc: 'Cupón al registrarse en el programa' },
  { value: 'affiliate',          label: 'Afiliación',                  icon: 'handshake', desc: 'Regístrate para recibir promociones' },
  { value: 'discount',           label: 'Descuento por Niveles',       icon: 'layers', desc: 'Descuentos progresivos por gasto acumulado' },
  { value: 'gift_certificate',   label: 'Certificado de Regalo',       icon: 'gift', desc: 'Certificados de regalo digitales' },
  { value: 'vip_membership',     label: 'Membresía VIP',               icon: 'crown', desc: 'Club VIP con pagos recurrentes' },
  { value: 'corporate_discount', label: 'Descuento Corporativo',       icon: 'building', desc: 'Descuentos especiales para empresas' },
  { value: 'referral_pass',      label: 'Programa de Referidos',       icon: 'megaphone', desc: 'Recompensa por traer nuevos clientes' },
  { value: 'multipass',          label: 'Multipase Prepagado',         icon: 'refresh', desc: 'Sellos prepagados en paquete' },
];

/** Translation key mappings for CARD_TYPES (use with t() in components). */
export const CARD_TYPE_LABEL_KEYS: Record<string, { labelKey: string; descKey: string }> = {
  stamp:              { labelKey: 'portal.cardTypes.stamp',           descKey: 'programs.cardTypeDescs.stamp' },
  cashback:           { labelKey: 'programs.cardTypes.cashback',      descKey: 'programs.cardTypeDescs.cashback' },
  coupon:             { labelKey: 'portal.cardTypes.coupon',          descKey: 'programs.cardTypeDescs.coupon' },
  affiliate:          { labelKey: 'programs.cardTypes.affiliate',     descKey: 'programs.cardTypeDescs.affiliate' },
  discount:           { labelKey: 'portal.cardTypes.discount',        descKey: 'programs.cardTypeDescs.discount' },
  gift_certificate:   { labelKey: 'portal.cardTypes.gift_certificate', descKey: 'programs.cardTypeDescs.gift_certificate' },
  vip_membership:     { labelKey: 'portal.cardTypes.vip_membership',  descKey: 'programs.cardTypeDescs.vip_membership' },
  corporate_discount: { labelKey: 'programs.cardTypes.corporate_discount', descKey: 'programs.cardTypeDescs.corporate_discount' },
  referral_pass:      { labelKey: 'portal.cardTypes.referral_pass',   descKey: 'programs.cardTypeDescs.referral_pass' },
  multipass:          { labelKey: 'portal.cardTypes.multipass',       descKey: 'programs.cardTypeDescs.multipass' },
};

/* ─── Design Templates ──────────────────────────────────────────── */
export const DESIGN_TEMPLATES = [
  { id: 'midnight',  name: 'Medianoche',     bg: '#1A1A2E', text: '#FFFFFF', accent: '#E2E8F0' },
  { id: 'ocean',     name: 'Océano',         bg: '#0F3460', text: '#FFFFFF', accent: '#16C79A' },
  { id: 'sunset',    name: 'Atardecer',      bg: '#FF6B35', text: '#FFFFFF', accent: '#FFF5EE' },
  { id: 'forest',    name: 'Bosque',         bg: '#0F766E', text: '#FFFFFF', accent: '#CCFBF1' },
  { id: 'royal',     name: 'Realeza',        bg: '#4C1D95', text: '#FFFFFF', accent: '#DDD6FE' },
  { id: 'rose',      name: 'Rosa',           bg: '#9F1239', text: '#FFFFFF', accent: '#FFF1F2' },
  { id: 'gold',      name: 'Dorado',         bg: '#78350F', text: '#F9D923', accent: '#FFFBEB' },
  { id: 'arctic',    name: 'Ártico',         bg: '#1E40AF', text: '#FFFFFF', accent: '#BFDBFE' },
  { id: 'slate',     name: 'Pizarra',        bg: '#334155', text: '#F8FAFC', accent: '#94A3B8' },
  { id: 'emerald',   name: 'Esmeralda',      bg: '#065F46', text: '#FFFFFF', accent: '#A7F3D0' },
  { id: 'cherry',    name: 'Cereza',         bg: '#BE123C', text: '#FFFFFF', accent: '#FFE4E6' },
  { id: 'custom',    name: 'Personalizado',  bg: '', text: '', accent: '' },
];

/** Translation key mappings for DESIGN_TEMPLATES (use with t() in components). */
export const DESIGN_TEMPLATE_NAME_KEYS: Record<string, string> = {
  midnight: 'programs.design.midnight',
  ocean: 'programs.design.ocean',
  sunset: 'programs.design.sunset',
  forest: 'programs.design.forest',
  royal: 'programs.design.royal',
  rose: 'programs.design.rose',
  gold: 'programs.design.gold',
  arctic: 'programs.design.arctic',
  slate: 'programs.design.slate',
  emerald: 'programs.design.emerald',
  cherry: 'programs.design.cherry',
  custom: 'programs.design.custom',
};

/* ─── Default metadata per card type ──────────────────────────────── */
export function defaultMeta(type: string): Record<string, unknown> {
  switch (type) {
    case 'stamp':             return { stamps_required: 10, reward_description: 'Recompensa especial al completar la tarjeta', stamp_type: 'visit', consumption_per_stamp: 10, stamp_expiry: 'unlimited', stamp_start_date: '', stamp_end_date: '', stamps_at_issue: 0, daily_stamp_limit: 5, birthday_stamps: 0 };
    case 'cashback':          return { cashback_percentage: 5, minimum_purchase: 0, credit_expiry_days: 365 };
    case 'coupon':            return { discount_type: 'fixed_amount', discount_value: 10, usage_limit_per_customer: 1, coupon_description: '', special_promotion_text: '', coupon_expiry: 'unlimited', coupon_start_date: '', coupon_end_date: '', push_message: '' };
    case 'affiliate':         return {};
    case 'discount':          return { tiers: [{ tier_name: 'Bronce', threshold: 0, discount_percentage: 5 }, { tier_name: 'Plata', threshold: 100, discount_percentage: 10 }, { tier_name: 'Oro', threshold: 500, discount_percentage: 15 }] };
    case 'gift_certificate':  return { denominations: [10, 25, 50], expiry_days: 365 };
    case 'vip_membership':    return { membership_name: 'Club VIP', monthly_fee: 9.99, annual_fee: 99, validity_period: 'monthly' };
    case 'corporate_discount':return {};
    case 'referral_pass':     return { referrer_reward: 'Descuento del 10%', referee_reward: '5% de descuento', max_referrals_per_customer: 10 };
    case 'multipass':         return { bundle_size: 10, bundle_price: 25 };
    default:                  return {};
  }
}

/* ─── Helper: adjust color brightness ─────────────────────────────── */
export function adjustColor(hex: string, amount: number): string {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const num = parseInt(hex, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/* ─── Barcode Types Registry ──────────────────────────────────────── */
export const BARCODE_TYPES = [
  {
    value: 'qr_code',
    label: 'QR Code',
    desc: 'Compatible con Apple Wallet, Google Wallet y watchOS',
    shape: 'square' as const,
  },
  {
    value: 'aztec',
    label: 'Aztec',
    desc: 'Compatible con Apple Wallet, Google Wallet y watchOS',
    shape: 'square' as const,
  },
  {
    value: 'pdf417',
    label: 'PDF417',
    desc: 'Compatible con Apple Wallet y Google Wallet',
    shape: 'rect' as const,
  },
  {
    value: 'code_128',
    label: 'Code 128',
    desc: 'Compatible con Apple Wallet y Google Wallet. No soportado en watchOS',
    shape: 'rect' as const,
  },
  {
    value: 'data_matrix',
    label: 'Data Matrix',
    desc: 'Compatible con Google Wallet. En Apple Wallet se muestra como QR Code',
    shape: 'square' as const,
  },
];

/** Translation key mappings for BARCODE_TYPES (use with t() in components). */
export const BARCODE_TYPE_LABEL_KEYS: Record<string, { labelKey: string; descKey: string }> = {
  qr_code:    { labelKey: 'programs.barcodeTypes.qrCode',    descKey: 'programs.barcodeTypes.qrCodeDesc' },
  aztec:      { labelKey: 'programs.barcodeTypes.aztec',     descKey: 'programs.barcodeTypes.aztecDesc' },
  pdf417:     { labelKey: 'programs.barcodeTypes.pdf417',    descKey: 'programs.barcodeTypes.pdf417Desc' },
  code_128:   { labelKey: 'programs.barcodeTypes.code128',   descKey: 'programs.barcodeTypes.code128Desc' },
  data_matrix:{ labelKey: 'programs.barcodeTypes.dataMatrix', descKey: 'programs.barcodeTypes.dataMatrixDesc' },
};

/* ─── Apple Pass Style per Card Type ──────────────────────────────── */
export const APPLE_PASS_STYLES: Record<string, string> = {
  stamp: 'storeCard',
  cashback: 'storeCard',
  coupon: 'coupon',
  discount: 'storeCard',
  affiliate: 'generic',
  gift_certificate: 'storeCard',
  vip_membership: 'generic',
  corporate_discount: 'generic',
  referral_pass: 'generic',
  multipass: 'storeCard',
};

/* ─── Google Wallet Type per Card Type (mirrors backend _resolve_gw_type) ── */
export const GOOGLE_WALLET_TYPES: Record<string, { type: string; label: string }> = {
  stamp:              { type: 'LoyaltyClass',  label: 'Programa de Lealtad' },
  cashback:           { type: 'LoyaltyClass',  label: 'Cashback' },
  coupon:             { type: 'OfferClass',    label: 'Oferta' },
  discount:           { type: 'OfferClass',    label: 'Oferta' },
  affiliate:          { type: 'LoyaltyClass',  label: 'Programa de Lealtad' },
  gift_certificate:   { type: 'GiftCardClass', label: 'Tarjeta de Regalo' },
  vip_membership:     { type: 'LoyaltyClass',  label: 'Programa de Lealtad' },
  corporate_discount: { type: 'OfferClass',    label: 'Oferta' },
  referral_pass:      { type: 'OfferClass',    label: 'Oferta' },
  multipass:          { type: 'LoyaltyClass',  label: 'Multipase' },
};

/** Translation key mappings for GOOGLE_WALLET_TYPES (use with t() in components). */
export const GOOGLE_WALLET_TYPE_LABEL_KEYS: Record<string, string> = {
  stamp:              'programs.walletTypes.loyalty',
  cashback:           'programs.walletTypes.cashback',
  coupon:             'programs.walletTypes.offer',
  discount:           'programs.walletTypes.offer',
  affiliate:          'programs.walletTypes.loyalty',
  gift_certificate:   'programs.walletTypes.giftCard',
  vip_membership:     'programs.walletTypes.loyalty',
  corporate_discount: 'programs.walletTypes.offer',
  referral_pass:      'programs.walletTypes.offer',
  multipass:          'programs.walletTypes.multipass',
};

/* ─── Apple Image Support per Pass Style (per official Apple docs) ── */
export const APPLE_IMAGE_SUPPORT: Record<string, { strip: boolean; thumbnail: boolean }> = {
  storeCard: { strip: true,  thumbnail: false },
  coupon:    { strip: true,  thumbnail: false },
  generic:   { strip: false, thumbnail: true },
};

/* ═════════════════════════════════════════════════════════════════════
   PLATFORM-SPECIFIC WALLET DESIGN SPECIFICATIONS
   ═════════════════════════════════════════════════════════════════════ */

/** Apple Wallet image dimensions (per Apple PassKit docs) */
export const APPLE_IMAGE_SPECS = {
  icon:     { pt: '29×29',   px: '58×58',   px2x: '58×58',   label: 'Ícono', required: true, desc: 'Icono pequeño en listas y notificaciones' },
  icon2x:   { pt: '29×29',   px: '58×58',   px2x: '58×58',   label: 'Ícono @2x', required: true, desc: 'Retina display' },
  logo:     { pt: '160×50',  px: '320×100', px2x: '320×100', label: 'Logo', required: true, desc: 'Logo del negocio en la parte superior' },
  logo2x:   { pt: '160×50',  px: '320×100', px2x: '320×100', label: 'Logo @2x', required: true, desc: 'Retina display' },
  strip:    { pt: '375×123', px: '750×246', px2x: '750×246', label: 'Strip', required: false, desc: 'Imagen panorámica (solo storeCard y coupon)' },
  strip2x:  { pt: '375×123', px: '750×246', px2x: '750×246', label: 'Strip @2x', required: false, desc: 'Retina display' },
  thumbnail:{ pt: '90×90',   px: '180×180', px2x: '180×180', label: 'Thumbnail', required: false, desc: 'Miniatura (solo generic)' },
  thumbnail2x:{ pt: '90×90', px: '180×180', px2x: '180×180', label: 'Thumbnail @2x', required: false, desc: 'Retina display' },
} as const;

/** Translation key mappings for APPLE_IMAGE_SPECS (use with t() in components). */
export const APPLE_IMAGE_SPEC_LABEL_KEYS: Record<string, { labelKey: string; descKey: string }> = {
  icon:      { labelKey: 'programs.walletPreview.icon',      descKey: 'programs.imageSpecs.iconDesc' },
  icon2x:    { labelKey: 'programs.walletPreview.icon2x',    descKey: 'programs.imageSpecs.icon2xDesc' },
  logo:      { labelKey: 'programs.walletPreview.logo',      descKey: 'programs.imageSpecs.logoDesc' },
  logo2x:    { labelKey: 'programs.walletPreview.logo2x',    descKey: 'programs.imageSpecs.logo2xDesc' },
  strip:     { labelKey: 'programs.walletPreview.strip',     descKey: 'programs.imageSpecs.stripDesc' },
  strip2x:   { labelKey: 'programs.walletPreview.strip2x',   descKey: 'programs.imageSpecs.strip2xDesc' },
  thumbnail: { labelKey: 'programs.walletPreview.thumbnail', descKey: 'programs.imageSpecs.thumbnailDesc' },
  thumbnail2x:{ labelKey: 'programs.walletPreview.thumbnail2x', descKey: 'programs.imageSpecs.thumbnail2xDesc' },
};

/** Google Wallet image dimensions (per Google Wallet API docs) */
export const GOOGLE_IMAGE_SPECS = {
  programLogo: { px: '660×660', label: 'Logo del programa', required: true, desc: 'Logo cuadrado visible en la tarjeta' },
  heroImage:   { px: '1032×336', label: 'Imagen Hero', required: false, desc: 'Banner de ancho completo en la parte superior' },
  wideLogo:    { px: '1032×150', label: 'Logo ancho', required: false, desc: 'Logo extendido en la parte superior' },
  imageModule: { px: '660×660', label: 'Imagen adicional', required: false, desc: 'Imagen adicional en detalles de la tarjeta' },
} as const;

/** Translation key mappings for GOOGLE_IMAGE_SPECS (use with t() in components). */
export const GOOGLE_IMAGE_SPEC_LABEL_KEYS: Record<string, { labelKey: string; descKey: string }> = {
  programLogo: { labelKey: 'programs.walletDesigner.programLogo', descKey: 'programs.imageSpecs.programLogoDesc' },
  heroImage:   { labelKey: 'programs.walletDesigner.heroImage',   descKey: 'programs.imageSpecs.heroImageDesc' },
  wideLogo:    { labelKey: 'programs.walletDesigner.wideLogo',    descKey: 'programs.imageSpecs.wideLogoDesc' },
  imageModule: { labelKey: 'programs.walletDesigner.additionalImage', descKey: 'programs.imageSpecs.imageModuleDesc' },
};

/** Google Wallet cardTemplateOverride row types */
export const GOOGLE_ROW_TYPES = [
  { value: 'oneItem', label: '1 campo', desc: 'Un solo campo por fila (máximo ancho)' },
  { value: 'twoItems', label: '2 campos', desc: 'Dos campos por fila (divididos 50/50)' },
  { value: 'threeItems', label: '3 campos', desc: 'Tres campos por fila (divididos 33/33/33)' },
] as const;

/** Translation key mappings for GOOGLE_ROW_TYPES (use with t() in components). */
export const GOOGLE_ROW_TYPE_LABEL_KEYS: Record<string, { labelKey: string; descKey: string }> = {
  oneItem:    { labelKey: 'programs.googleRowTypes.oneItem',    descKey: 'programs.googleRowTypes.oneItemDesc' },
  twoItems:   { labelKey: 'programs.googleRowTypes.twoItems',   descKey: 'programs.googleRowTypes.twoItemsDesc' },
  threeItems: { labelKey: 'programs.googleRowTypes.threeItems', descKey: 'programs.googleRowTypes.threeItemsDesc' },
};

/** Predefined Google Wallet field paths for cardTemplateOverride */
export const GOOGLE_PREDEFINED_FIELDS = [
  { path: 'object.accountName', label: 'Nombre del cliente', source: 'object' },
  { path: 'object.loyaltyPoints.label', label: 'Etiqueta de puntos', source: 'object' },
  { path: 'object.loyaltyPoints.balance', label: 'Balance de puntos', source: 'object' },
  { path: 'object.secondaryLoyaltyPoints.label', label: 'Etiqueta secundaria', source: 'object' },
  { path: 'object.secondaryLoyaltyPoints.balance', label: 'Balance secundario', source: 'object' },
  { path: 'class.rewardsTierLabel', label: 'Etiqueta de nivel', source: 'class' },
  { path: 'class.rewardsTier', label: 'Nivel actual', source: 'class' },
  { path: 'class.programName', label: 'Nombre del programa', source: 'class' },
  { path: 'class.issuerName', label: 'Nombre del negocio', source: 'class' },
] as const;

/** Translation key mappings for GOOGLE_PREDEFINED_FIELDS (use with t() in components). */
export const GOOGLE_PREDEFINED_FIELD_LABEL_KEYS: Record<string, string> = {
  'object.accountName': 'programs.googlePredefinedFields.customerName',
  'object.loyaltyPoints.label': 'programs.googlePredefinedFields.pointsLabel',
  'object.loyaltyPoints.balance': 'programs.googlePredefinedFields.pointsBalance',
  'object.secondaryLoyaltyPoints.label': 'programs.googlePredefinedFields.secondaryLabel',
  'object.secondaryLoyaltyPoints.balance': 'programs.googlePredefinedFields.secondaryBalance',
  'class.rewardsTierLabel': 'programs.googlePredefinedFields.tierLabel',
  'class.rewardsTier': 'programs.googlePredefinedFields.currentTier',
  'class.programName': 'programs.googlePredefinedFields.programName',
  'class.issuerName': 'programs.googlePredefinedFields.businessName',
};

/** Apple PassKit field groups */
export const APPLE_FIELD_GROUPS = [
  { key: 'headerFields', label: 'Campos de cabecera', desc: 'Pequeños campos en la parte superior (1-3 campos)', max: 3 },
  { key: 'primaryFields', label: 'Campos principales', desc: 'Campo grande y prominente (1 campo)', max: 1 },
  { key: 'secondaryFields', label: 'Campos secundarios', desc: 'Campos medianos debajo del principal (1-4 campos)', max: 4 },
  { key: 'auxiliaryFields', label: 'Campos auxiliares', desc: 'Campos más pequeños debajo de los secundarios (1-4 campos)', max: 4 },
  { key: 'backFields', label: 'Campos traseros', desc: 'Campos en la parte de atrás de la tarjeta (ilimitados)', max: 99 },
] as const;

/** Translation key mappings for APPLE_FIELD_GROUPS (use with t() in components). */
export const APPLE_FIELD_GROUP_LABEL_KEYS: Record<string, { labelKey: string; descKey: string }> = {
  headerFields:    { labelKey: 'programs.appleFieldGroups.headerFields',    descKey: 'programs.appleFieldGroups.headerFieldsDesc' },
  primaryFields:   { labelKey: 'programs.appleFieldGroups.primaryFields',   descKey: 'programs.appleFieldGroups.primaryFieldsDesc' },
  secondaryFields: { labelKey: 'programs.appleFieldGroups.secondaryFields', descKey: 'programs.appleFieldGroups.secondaryFieldsDesc' },
  auxiliaryFields: { labelKey: 'programs.appleFieldGroups.auxiliaryFields', descKey: 'programs.appleFieldGroups.auxiliaryFieldsDesc' },
  backFields:      { labelKey: 'programs.appleFieldGroups.backFields',      descKey: 'programs.appleFieldGroups.backFieldsDesc' },
};

/** Default Apple field templates per card type (Spanish labels) */
export const APPLE_DEFAULT_FIELDS: Record<string, Record<string, Array<{key: string; label: string; value: string}>>> = {
  stamp: {
    headerFields: [{ key: 'stamps', label: 'SELLOS', value: '{stamp_count}/{stamps_required}' }],
    primaryFields: [{ key: 'reward', label: 'RECOMPENSA', value: '{reward_description}' }],
    secondaryFields: [{ key: 'progress', label: 'PROGRESO', value: '{stamp_display}' }],
    backFields: [
      { key: 'name', label: 'Cliente', value: '{customer_name}' },
      { key: 'program', label: 'Programa', value: '{program_name}' },
      { key: 'desc', label: 'Descripción', value: '{description}' },
    ],
  },
  cashback: {
    headerFields: [{ key: 'balance', label: 'CRÉDITO', value: '${cashback_balance}' }],
    primaryFields: [{ key: 'program', label: 'PROGRAMA', value: '{program_name}' }],
    secondaryFields: [
      { key: 'rate', label: '% CASHBACK', value: '{cashback_percentage}%' },
      { key: 'customer', label: 'CLIENTE', value: '{customer_name}' },
    ],
    backFields: [{ key: 'desc', label: 'Descripción', value: '{description}' }],
  },
  coupon: {
    headerFields: [{ key: 'offer', label: 'OFERTA', value: '{program_name}' }],
    primaryFields: [{ key: 'discount', label: 'DESCUENTO', value: '{description}' }],
    secondaryFields: [{ key: 'customer', label: 'CLIENTE', value: '{customer_name}' }],
    backFields: [{ key: 'desc', label: 'Descripción', value: '{description}' }],
  },
  vip_membership: {
    headerFields: [{ key: 'tier', label: 'MEMBRESÍA', value: '{membership_tier}' }],
    primaryFields: [{ key: 'name', label: 'MIEMBRO', value: '{customer_name}' }],
    secondaryFields: [{ key: 'program', label: 'CLUB', value: '{program_name}' }],
    backFields: [{ key: 'perks', label: 'Beneficios', value: '{perks}' }],
  },
  gift_certificate: {
    headerFields: [{ key: 'balance', label: 'SALDO', value: '${gift_balance}' }],
    primaryFields: [{ key: 'program', label: 'CERTIFICADO', value: '{program_name}' }],
    secondaryFields: [{ key: 'recipient', label: 'BENEFICIARIO', value: '{customer_name}' }],
    backFields: [
      { key: 'expiry', label: 'Expira en', value: '{expiry_days} días desde la emisión' },
      { key: 'desc', label: 'Descripción', value: '{description}' },
    ],
  },
  discount: {
    headerFields: [{ key: 'tier', label: 'NIVEL', value: '{discount_tier}' }],
    primaryFields: [{ key: 'discount', label: 'DESCUENTO', value: '{discount_percentage}%' }],
    secondaryFields: [
      { key: 'customer', label: 'CLIENTE', value: '{customer_name}' },
      { key: 'program', label: 'PROGRAMA', value: '{program_name}' },
    ],
    backFields: [
      { key: 'tiers_info', label: 'Niveles de descuento', value: '{tiers_list}' },
      { key: 'desc', label: 'Descripción', value: '{description}' },
    ],
  },
  referral_pass: {
    headerFields: [{ key: 'refs', label: 'REFERIDOS', value: '{referrals_made}' }],
    primaryFields: [{ key: 'code', label: 'TU CÓDIGO', value: '{referral_code}' }],
    secondaryFields: [{ key: 'customer', label: 'EMBAJADOR', value: '{customer_name}' }],
    backFields: [{ key: 'desc', label: 'Cómo funciona', value: '{description}' }],
  },
  affiliate: {
    headerFields: [{ key: 'program', label: 'PROGRAMA', value: '{program_name}' }],
    primaryFields: [{ key: 'member', label: 'AFILIADO', value: '{customer_name}' }],
    secondaryFields: [
      { key: 'code', label: 'CÓDIGO', value: '{affiliate_code}' },
      { key: 'since', label: 'MIEMBRO DESDE', value: '{enrolled_date}' },
    ],
    backFields: [{ key: 'benefits', label: 'Beneficios', value: '{benefits}' }],
  },
  corporate_discount: {
    headerFields: [{ key: 'discount', label: 'DESCUENTO', value: '{corporate_discount}%' }],
    primaryFields: [{ key: 'company', label: 'EMPRESA', value: '{company_name}' }],
    secondaryFields: [{ key: 'employee', label: 'EMPLEADO', value: '{customer_name}' }],
    backFields: [{ key: 'desc', label: 'Condiciones', value: '{description}' }],
  },
  multipass: {
    headerFields: [{ key: 'remaining', label: 'USOS RESTANTES', value: '{multipass_remaining}/{bundle_size}' }],
    primaryFields: [{ key: 'bundle', label: 'MULTIPASE', value: '{program_name}' }],
    secondaryFields: [{ key: 'customer', label: 'CLIENTE', value: '{customer_name}' }],
    backFields: [
      { key: 'price', label: 'Precio del paquete', value: '${bundle_price}' },
      { key: 'desc', label: 'Descripción', value: '{description}' },
    ],
  },
};

/** Translation key mappings for APPLE_DEFAULT_FIELDS labels (use with t() in components). */
export const APPLE_DEFAULT_FIELD_LABEL_KEYS: Record<string, Record<string, string>> = {
  stamp: {
    SELLOS: 'programs.walletPreview.stamps',
    RECOMPENSA: 'programs.walletPreview.reward',
    PROGRESO: 'programs.walletPreview.progress',
    Cliente: 'scanner.defaults.customerName',
    Programa: 'programs.walletPreview.program',
    Descripción: 'programs.description',
  },
  cashback: {
    CRÉDITO: 'programs.walletPreview.credit',
    PROGRAMA: 'programs.walletPreview.program',
    '% CASHBACK': 'programs.walletPreview.cashbackPercent',
    CLIENTE: 'scanner.defaults.customerName',
    Descripción: 'programs.description',
  },
  coupon: {
    OFERTA: 'programs.walletPreview.offer',
    DESCUENTO: 'programs.walletPreview.discount',
    CLIENTE: 'scanner.defaults.customerName',
    Descripción: 'programs.description',
  },
  vip_membership: {
    MEMBRESÍA: 'programs.walletPreview.membership',
    MIEMBRO: 'programs.walletPreview.member',
    CLUB: 'programs.walletPreview.club',
    Beneficios: 'programs.walletPreview.benefits',
  },
  gift_certificate: {
    SALDO: 'programs.walletPreview.balance',
    CERTIFICADO: 'programs.walletPreview.certificate',
    BENEFICIARIO: 'programs.walletPreview.recipient',
    'Expira en': 'programs.walletPreview.expiresIn',
    Descripción: 'programs.description',
  },
  discount: {
    NIVEL: 'programs.walletPreview.level',
    DESCUENTO: 'programs.walletPreview.discount',
    CLIENTE: 'scanner.defaults.customerName',
    PROGRAMA: 'programs.walletPreview.program',
    'Niveles de descuento': 'programs.metaLabels.tiers',
    Descripción: 'programs.description',
  },
  referral_pass: {
    REFERIDOS: 'programs.walletPreview.referrals',
    'TU CÓDIGO': 'programs.walletPreview.yourCode',
    EMBAJADOR: 'programs.walletPreview.ambassador',
    'Cómo funciona': 'programs.walletPreview.howItWorks',
  },
  affiliate: {
    PROGRAMA: 'programs.walletPreview.program',
    AFILIADO: 'programs.walletPreview.affiliate',
    CÓDIGO: 'programs.walletPreview.code',
    'MIEMBRO DESDE': 'programs.walletPreview.memberSince',
    Beneficios: 'programs.walletPreview.benefits',
  },
  corporate_discount: {
    DESCUENTO: 'programs.walletPreview.discount',
    EMPRESA: 'programs.walletPreview.company',
    EMPLEADO: 'programs.walletPreview.employee',
    Condiciones: 'programs.walletPreview.terms',
  },
  multipass: {
    'USOS RESTANTES': 'programs.walletPreview.remainingUses',
    MULTIPASE: 'programs.walletPreview.multipass',
    CLIENTE: 'scanner.defaults.customerName',
    'Precio del paquete': 'programs.walletPreview.bundlePrice',
    Descripción: 'programs.description',
  },
};

/** Human-friendly field value presets for Apple/Google Wallet fields */
export const FIELD_VALUE_PRESETS = [
  { label: 'Texto personalizado', value: '' },
  { label: 'Nombre del cliente', value: '{customer_name}' },
  { label: 'Nombre del programa', value: '{program_name}' },
  { label: 'Sellos actuales / requeridos', value: '{stamp_count}/{stamps_required}' },
  { label: 'Saldo de cashback', value: '${cashback_balance}' },
  { label: 'Porcentaje de cashback', value: '{cashback_percentage}%' },
  { label: 'Puntos actuales', value: '{loyalty_points}' },
  { label: 'Nivel / Tier', value: '{membership_tier}' },
  { label: 'Descuento actual', value: '{discount_percentage}%' },
  { label: 'Código de referido', value: '{referral_code}' },
  { label: 'Usos restantes (multipase)', value: '{multipass_remaining}/{bundle_size}' },
  { label: 'Saldo de regalo', value: '${gift_balance}' },
  { label: 'Fecha de inscripción', value: '{enrolled_date}' },
  { label: 'Nombre del negocio', value: '{issuer_name}' },
  { label: 'Descripción del programa', value: '{description}' },
] as const;

/** Translation key mappings for FIELD_VALUE_PRESETS (use with t() in components). */
export const FIELD_VALUE_PRESET_LABEL_KEYS: Record<string, string> = {
  '': 'programs.fieldPresets.customText',
  '{customer_name}': 'programs.fieldPresets.customerName',
  '{program_name}': 'programs.fieldPresets.programName',
  '{stamp_count}/{stamps_required}': 'programs.fieldPresets.stamps',
  '${cashback_balance}': 'programs.fieldPresets.cashbackBalance',
  '{cashback_percentage}%': 'programs.fieldPresets.cashbackPercent',
  '{loyalty_points}': 'programs.fieldPresets.loyaltyPoints',
  '{membership_tier}': 'programs.fieldPresets.membershipTier',
  '{discount_percentage}%': 'programs.fieldPresets.discountPercent',
  '{referral_code}': 'programs.fieldPresets.referralCode',
  '{multipass_remaining}/{bundle_size}': 'programs.fieldPresets.multipassUses',
  '${gift_balance}': 'programs.fieldPresets.giftBalance',
  '{enrolled_date}': 'programs.fieldPresets.enrolledDate',
  '{issuer_name}': 'programs.fieldPresets.businessName',
  '{description}': 'programs.fieldPresets.programDescription',
};

/** Google Wallet multipleDevicesAndHoldersAllowedStatus options */
export const GOOGLE_DEVICE_SHARING_OPTIONS = [
  { value: 'ONE_USER_ALL_DEVICES', label: 'Un usuario, todos sus dispositivos', desc: 'El mismo usuario puede tener la tarjeta en múltiples dispositivos' },
  { value: 'ONE_USER_ONE_DEVICE', label: 'Un usuario, un dispositivo', desc: 'Solo un dispositivo por usuario' },
  { value: 'MULTIPLE_USERS', label: 'Múltiples usuarios', desc: 'La tarjeta puede ser compartida entre usuarios' },
] as const;

/** Translation key mappings for GOOGLE_DEVICE_SHARING_OPTIONS (use with t() in components). */
export const GOOGLE_DEVICE_SHARING_OPTION_LABEL_KEYS: Record<string, { labelKey: string; descKey: string }> = {
  ONE_USER_ALL_DEVICES: { labelKey: 'programs.deviceSharing.oneUserAllDevices', descKey: 'programs.deviceSharing.oneUserAllDevicesDesc' },
  ONE_USER_ONE_DEVICE:  { labelKey: 'programs.deviceSharing.oneUserOneDevice',  descKey: 'programs.deviceSharing.oneUserOneDeviceDesc' },
  MULTIPLE_USERS:       { labelKey: 'programs.deviceSharing.multipleUsers',     descKey: 'programs.deviceSharing.multipleUsersDesc' },
};
