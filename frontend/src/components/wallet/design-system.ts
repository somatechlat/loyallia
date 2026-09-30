/**
 * Wallet card design system.
 *
 * Single source of truth for how a loyalty card looks on Apple Wallet and
 * Google Wallet. Every preview component must pull from here — no ad-hoc hex,
 * no `text-[8px]`, no `opacity-30` on text.
 *
 * Standards enforced by `__tests__/design-system.rules.test.ts`:
 * - Minimum 11px type anywhere on a card
 * - Minimum 60% effective contrast on text
 * - One gradient + one accent per card type
 */

export type CardTypeKey =
  | 'stamp'
  | 'cashback'
  | 'coupon'
  | 'vip_membership'
  | 'gift_certificate'
  | 'discount'
  | 'affiliate'
  | 'corporate_discount'
  | 'referral_pass'
  | 'multipass';

export interface CardPalette {
  /** CSS `background-image` value for the card face. */
  gradient: string;
  /** Solid fallback painted under the gradient. */
  base: string;
  /** Accent for progress, stamps and call-outs. */
  accent: string;
  /** Accent at low alpha, for chips and wells. */
  accentSoft: string;
  /** Text on the card face. */
  text: string;
  /** Secondary text — never below 0.72 effective contrast. */
  textMuted: string;
  /** Glass overlay used on the header strip. */
  glass: string;
}

const CARD_PALETTES: Record<CardTypeKey, CardPalette> = {
  stamp: {
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #F43F5E 100%)',
    base: '#B45309',
    accent: '#FBBF24',
    accentSoft: 'rgba(251, 191, 36, 0.22)',
    text: '#FFFBEB',
    textMuted: 'rgba(255, 251, 235, 0.82)',
    glass: 'rgba(255, 255, 255, 0.14)',
  },
  cashback: {
    gradient: 'linear-gradient(135deg, #10B981 0%, #0D9488 100%)',
    base: '#047857',
    accent: '#34D399',
    accentSoft: 'rgba(52, 211, 153, 0.22)',
    text: '#ECFDF5',
    textMuted: 'rgba(236, 253, 245, 0.82)',
    glass: 'rgba(255, 255, 255, 0.14)',
  },
  coupon: {
    gradient: 'linear-gradient(135deg, #D946EF 0%, #F97316 100%)',
    base: '#A21CAF',
    accent: '#F0ABFC',
    accentSoft: 'rgba(240, 171, 252, 0.24)',
    text: '#FDF4FF',
    textMuted: 'rgba(253, 244, 255, 0.82)',
    glass: 'rgba(255, 255, 255, 0.14)',
  },
  vip_membership: {
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #4F46E5 100%)',
    base: '#5B21B6',
    accent: '#C4B5FD',
    accentSoft: 'rgba(196, 181, 253, 0.24)',
    text: '#F5F3FF',
    textMuted: 'rgba(245, 243, 255, 0.82)',
    glass: 'rgba(255, 255, 255, 0.14)',
  },
  gift_certificate: {
    gradient: 'linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%)',
    base: '#0369A1',
    accent: '#7DD3FC',
    accentSoft: 'rgba(125, 211, 252, 0.24)',
    text: '#F0F9FF',
    textMuted: 'rgba(240, 249, 255, 0.82)',
    glass: 'rgba(255, 255, 255, 0.14)',
  },
  discount: {
    gradient: 'linear-gradient(135deg, #84CC16 0%, #10B981 100%)',
    base: '#4D7C0F',
    accent: '#BEF264',
    accentSoft: 'rgba(190, 242, 100, 0.22)',
    text: '#F7FEE7',
    textMuted: 'rgba(247, 254, 231, 0.82)',
    glass: 'rgba(255, 255, 255, 0.14)',
  },
  affiliate: {
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
    base: '#1D4ED8',
    accent: '#93C5FD',
    accentSoft: 'rgba(147, 197, 253, 0.24)',
    text: '#EFF6FF',
    textMuted: 'rgba(239, 246, 255, 0.82)',
    glass: 'rgba(255, 255, 255, 0.14)',
  },
  corporate_discount: {
    gradient: 'linear-gradient(135deg, #475569 0%, #1E293B 100%)',
    base: '#0F172A',
    accent: '#94A3B8',
    accentSoft: 'rgba(148, 163, 184, 0.24)',
    text: '#F1F5F9',
    textMuted: 'rgba(241, 245, 249, 0.82)',
    glass: 'rgba(255, 255, 255, 0.12)',
  },
  referral_pass: {
    gradient: 'linear-gradient(135deg, #EC4899 0%, #F43F5E 100%)',
    base: '#BE185D',
    accent: '#F9A8D4',
    accentSoft: 'rgba(249, 168, 212, 0.24)',
    text: '#FDF2F8',
    textMuted: 'rgba(253, 242, 248, 0.82)',
    glass: 'rgba(255, 255, 255, 0.14)',
  },
  multipass: {
    gradient: 'linear-gradient(135deg, #F97316 0%, #EAB308 100%)',
    base: '#C2410C',
    accent: '#FDBA74',
    accentSoft: 'rgba(253, 186, 116, 0.24)',
    text: '#FFF7ED',
    textMuted: 'rgba(255, 247, 237, 0.82)',
    glass: 'rgba(255, 255, 255, 0.14)',
  },
};

/**
 * Card type used for styling. Unknown values fall back to the brand-neutral
 * stamp palette so a bad `cardType` can never render as a blank card.
 */
export function getCardPalette(cardType: string | undefined): CardPalette {
  const key = (cardType ?? '') as CardTypeKey;
  return CARD_PALETTES[key] ?? CARD_PALETTES.stamp;
}

export const CARD_PALETTES_ALL = CARD_PALETTES;

/**
 * Type scale for cards. Anything smaller than `xs` is banned on a card —
 * it is unreadable at the rendered card width.
 */
export const CARD_TYPE_SCALE = {
  /** Overlines, field labels, timestamps. */
  xs: 'text-[11px]',
  /** Field values, secondary copy. */
  sm: 'text-[13px]',
  /** Body, program name. */
  md: 'text-[15px]',
  /** Card title, secondary hero. */
  lg: 'text-[20px]',
  /** Primary hero value (balance, 3/5, 15%). */
  xl: 'text-[28px]',
} as const;

/** Floor for any text on a card. Enforced by tests. */
export const MIN_CARD_FONT_PX = 11;

/** Floor for text opacity. Anything dimmer fails contrast on a gradient. */
export const MIN_TEXT_OPACITY = 72;

/** Layout rhythm — 4px base. */
export const CARD_SPACE = {
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-3',
  lg: 'gap-4',
  page: 'p-4',
} as const;

/** Radii. */
export const CARD_RADIUS = {
  /** Apple PassKit card corner. */
  apple: 'rounded-[18px]',
  /** Google Wallet pass corner. */
  google: 'rounded-[28px]',
  /** Chips and wells. */
  chip: 'rounded-lg',
  plate: 'rounded-2xl',
} as const;

/** Depth. */
export const CARD_SHADOW = {
  card: 'shadow-[0_10px_30px_-12px_rgba(0,0,0,0.45)]',
  lift: 'shadow-[0_18px_44px_-16px_rgba(0,0,0,0.55)]',
} as const;

/** Shared chrome. */
export const CARD_CHROME = {
  /** Frosted header strip over the gradient. */
  headerGlass: 'backdrop-blur-xl bg-white/[0.14] border-b border-white/15',
  /** Gloss sweep across the top of the card. */
  gloss: 'bg-gradient-to-b from-white/20 to-transparent',
  /** Ring used around logo plates. */
  logoRing: 'ring-2 ring-white/25',
  /** Barcode plate — white so scanners read it. */
  barcodePlate: 'bg-white rounded-xl px-3 py-2 shadow-inner',
} as const;

/**
 * Device chrome for the phone frames the card is previewed inside.
 *
 * These are the bezel, buttons and camera of the handset — not card
 * styling — but they are still design tokens so no component carries raw
 * hex. The only permitted literal colours anywhere are official brand
 * marks (e.g. the Google logo), which are artwork and must not be recoloured.
 */
export const DEVICE_CHROME = {
  /** iPhone body / bezel. */
  iphoneBody: '#151515',
  iphoneBezel: '#2d2d2d',
  iphoneSideButton: '#3a3a3a',
  iphoneCameraRing: '#1a1a1a',
  iphoneCameraDot: '#0a0a0a',
  iphoneScreen: '#000000',
  /** Android body / bezel. */
  androidBody: '#1b1b1b',
  androidBezel: '#2a2a2a',
  androidSideButton: '#3a3a3a',
  androidScreen: '#121212',
} as const;

/** Default card background when a program has not chosen one. */
export const DEFAULT_CARD_BACKGROUND = '#1a1a2e';

/** Stamp / progress glyphs (real icons are rendered by `ui/StampIcons`). */
export const PROGRESS_SLOT = {
  filled: 'filled',
  empty: 'empty',
} as const;

/** Build a bar of `filled / total` slot descriptors. */
export function progressSlots(
  filled: number,
  total: number,
): Array<'filled' | 'empty'> {
  const safeTotal = Math.max(0, Math.floor(total));
  const safeFilled = Math.min(Math.max(0, Math.floor(filled)), safeTotal);
  return [
    ...Array.from({ length: safeFilled }, () => 'filled' as const),
    ...Array.from({ length: safeTotal - safeFilled }, () => 'empty' as const),
  ];
}
