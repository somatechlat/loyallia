/* ─── Shared Constants & Icons for Program Wizard ─────────────────── */

/* ─── Flat SVG Icon Component ─────────────────────────────────────── */
const ICON_PATHS: Record<string, string> = {
  // Stamp/seal with ribbon (award stamp) — single path, capital Z only
  stamp: 'M12 2l2.1 4.3 4.7.7-3.4 3.3.8 4.7L12 12.8 7.8 15l.8-4.7-3.4-3.3 4.7-.7L12 2ZM8.2 15.2L7 22l5-2.2L17 22l-1.2-6.8',
  dollar: 'M12 2a10 10 0 100 20 10 10 0 000-20ZM16 8h-6a2 2 0 100 4h4a2 2 0 110 4H8M12 18V6',
  ticket: 'M2 9a3 3 0 010 6v2a2 2 0 002 2h16a2 2 0 002-2v-2a3 3 0 010-6V7a2 2 0 00-2-2H4a2 2 0 00-2 2ZM12 8v2M12 14v2',
  // Partnership / affiliate (two linked people) — capital Z only
  handshake: 'M8 11a3 3 0 100-6 3 3 0 000 6ZM16 11a3 3 0 100-6 3 3 0 000 6ZM2 20c0-2.8 2.7-4.5 6-4.5M22 20c0-2.8-2.7-4.5-6-4.5M8.5 17l2 2 2-1 2 1 2-2',
  layers: 'M12 2L2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5',
  gift: 'M20 12v10H4V12M2 7h20v5H2ZM12 22V7M12 7H7.5a2.5 2.5 0 110-5C11 2 12 7 12 7ZM12 7h4.5a2.5 2.5 0 100-5C13 2 12 7 12 7Z',
  crown: 'M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7ZM3 20h18',
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
/** Card type options — labels and descriptions come from i18n via CARD_TYPE_LABEL_KEYS. */
export const CARD_TYPES: Array<{ value: string; icon: string }> = [
  { value: 'stamp',              icon: 'stamp' },
  { value: 'cashback',           icon: 'dollar' },
  { value: 'coupon',             icon: 'ticket' },
  { value: 'affiliate',          icon: 'handshake' },
  { value: 'discount',           icon: 'layers' },
  { value: 'gift_certificate',   icon: 'gift' },
  { value: 'vip_membership',     icon: 'crown' },
  { value: 'corporate_discount', icon: 'building' },
  { value: 'referral_pass',      icon: 'megaphone' },
  { value: 'multipass',          icon: 'refresh' },
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

/* ─── Default metadata per card type ──────────────────────────────── */
export function defaultMeta(type: string): Record<string, unknown> {
  switch (type) {
    case 'stamp':             return { stamps_required: 10, reward_description: '', stamp_type: 'visit', consumption_per_stamp: 10, stamp_expiry: 'unlimited', stamp_start_date: '', stamp_end_date: '', stamps_at_issue: 0, daily_stamp_limit: 5, birthday_stamps: 0 };
    case 'cashback':          return { cashback_percentage: 5, minimum_purchase: 0, credit_expiry_days: 365 };
    case 'coupon':            return { discount_type: 'fixed_amount', discount_value: 10, usage_limit_per_customer: 1, coupon_description: '', special_promotion_text: '', coupon_expiry: 'unlimited', coupon_start_date: '', coupon_end_date: '', push_message: '' };
    case 'affiliate':         return {};
    case 'discount':          return { tiers: [{ tier_name: 'bronze', threshold: 0, discount_percentage: 5 }, { tier_name: 'silver', threshold: 100, discount_percentage: 10 }, { tier_name: 'gold', threshold: 500, discount_percentage: 15 }] };
    case 'gift_certificate':  return { denominations: [10, 25, 50], expiry_days: 365 };
    case 'vip_membership':    return { membership_name: '', monthly_fee: 9.99, annual_fee: 99, validity_period: 'monthly' };
    case 'corporate_discount':return {};
    case 'referral_pass':     return { referrer_reward: '', referee_reward: '', max_referrals_per_customer: 10 };
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
  multipass: 'eventTicket',
};

/* ─── Google Wallet Type per Card Type (mirrors backend _resolve_gw_type) ── */
/** Google Wallet pass type labels come from i18n via labelKey. */
export const GOOGLE_WALLET_TYPES: Record<string, { type: string; labelKey: string }> = {
  stamp:              { type: 'LoyaltyClass',  labelKey: 'programs.googleWalletTypes.loyaltyProgram' },
  cashback:           { type: 'LoyaltyClass',  labelKey: 'programs.googleWalletTypes.cashback' },
  coupon:             { type: 'OfferClass',    labelKey: 'programs.googleWalletTypes.offer' },
  discount:           { type: 'LoyaltyClass',  labelKey: 'programs.googleWalletTypes.loyaltyProgram' },
  affiliate:          { type: 'GenericClass',  labelKey: 'programs.googleWalletTypes.generic' },
  gift_certificate:   { type: 'GiftCardClass', labelKey: 'programs.googleWalletTypes.giftCard' },
  vip_membership:     { type: 'LoyaltyClass',  labelKey: 'programs.googleWalletTypes.loyaltyProgram' },
  corporate_discount: { type: 'GenericClass',  labelKey: 'programs.googleWalletTypes.generic' },
  referral_pass:      { type: 'GenericClass',  labelKey: 'programs.googleWalletTypes.generic' },
  multipass:          { type: 'GenericClass',  labelKey: 'programs.googleWalletTypes.generic' },
};

/* ─── Apple Image Support per Pass Style (per official Apple docs) ── */
export const APPLE_IMAGE_SUPPORT: Record<string, { strip: boolean; thumbnail: boolean }> = {
  storeCard:   { strip: true,  thumbnail: false },
  coupon:      { strip: true,  thumbnail: false },
  generic:     { strip: false, thumbnail: true },
  eventTicket: { strip: true,  thumbnail: true },
};

/* ═════════════════════════════════════════════════════════════════════
   PLATFORM-SPECIFIC WALLET DESIGN SPECIFICATIONS
   ═════════════════════════════════════════════════════════════════════ */

/** Predefined Google Wallet field paths for cardTemplateOverride */
/** Apple PassKit field groups — labels and descriptions come from i18n via labelKey/descKey. */
export const APPLE_FIELD_GROUPS = [
  { key: 'headerFields', labelKey: 'programs.appleFieldGroups.headerFields', descKey: 'programs.appleFieldGroups.headerFieldsDesc', max: 3 },
  { key: 'primaryFields', labelKey: 'programs.appleFieldGroups.primaryFields', descKey: 'programs.appleFieldGroups.primaryFieldsDesc', max: 1 },
  { key: 'secondaryFields', labelKey: 'programs.appleFieldGroups.secondaryFields', descKey: 'programs.appleFieldGroups.secondaryFieldsDesc', max: 4 },
  { key: 'auxiliaryFields', labelKey: 'programs.appleFieldGroups.auxiliaryFields', descKey: 'programs.appleFieldGroups.auxiliaryFieldsDesc', max: 4 },
  { key: 'backFields', labelKey: 'programs.appleFieldGroups.backFields', descKey: 'programs.appleFieldGroups.backFieldsDesc', max: 99 },
] as const;
