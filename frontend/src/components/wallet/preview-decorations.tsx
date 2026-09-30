/**
 * Visual decoration components for Wallet Pass Studio phone mockups.
 *
 * Each card type gets a distinct visual identity in the preview.
 * Palette, type scale, radii and shadow come from `design-system.ts` —
 * never ad-hoc hex, never sub-11px type, never low-opacity text.
 */

'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';
import { resolvePerkLabel } from '@/components/wallet/studio/tabs/VIPTab';
import { IconRenderer } from './IconRenderer';
import {
  getCardPalette,
  CARD_TYPE_SCALE,
  CARD_RADIUS,
} from './design-system';
import {
  STAMP_SHAPE_PATHS,
  getShapeClass,
  SVG_SLOT_SHAPES,
  type StampShapeId,
} from './icons/shapes';

/* ── Shape paths (stamp silhouettes) ──────────────────────────────── */

export const SHAPE_PATHS: Record<string, string> = {
  circle: STAMP_SHAPE_PATHS.circle,
  square: STAMP_SHAPE_PATHS.square,
  rounded: STAMP_SHAPE_PATHS.rounded,
  heart: STAMP_SHAPE_PATHS.heart,
  star: STAMP_SHAPE_PATHS.star,
  shield: STAMP_SHAPE_PATHS.shield,
  hexagon: STAMP_SHAPE_PATHS.hexagon,
  diamond: STAMP_SHAPE_PATHS.diamond,
  ticket: STAMP_SHAPE_PATHS.ticket,
  flower: STAMP_SHAPE_PATHS.flower,
};

export { getShapeClass };

/* ── Stamp grid ───────────────────────────────────────────────────── */

export type StampGridLayout = '5x2' | '3x3' | '10x1' | '4x2' | '6x2' | '4x4' | 'dynamic';

const LAYOUT_GRID: Record<string, { cols: number; rows: number }> = {
  '5x2': { cols: 5, rows: 2 },
  '3x3': { cols: 3, rows: 3 },
  '10x1': { cols: 10, rows: 1 },
  '4x2': { cols: 4, rows: 2 },
  '6x2': { cols: 6, rows: 2 },
  '4x4': { cols: 4, rows: 4 },
};

function getGridLayout(layout: string, total: number): { cols: number; rows: number } {
  const named = LAYOUT_GRID[layout];
  if (named) return named;
  const cols = Math.min(Math.max(total, 1), 10);
  return { cols, rows: Math.ceil(total / cols) };
}

/** Slot count for a layout: the grid capacity, capped by `total`. */
export function getStampSlotCount(layout: string, total: number): number {
  const safeTotal = Math.max(0, Math.floor(total));
  if (layout === 'dynamic') return safeTotal;
  const { cols, rows } = getGridLayout(layout, safeTotal);
  return Math.min(safeTotal, cols * rows);
}

interface StampGridDecorationProps {
  current: number;
  total: number;
  color: string;
  stampShape?: string;
  stampColor?: string;
  stampIcon?: string;
  stampFilledIcon?: string;
  stampGridLayout?: string;
  /** Card type for design-system palette roles. */
  cardType?: string;
}

/**
 * Stamp progress grid — filled slots punchy (`palette.accent`), empty slots
 * recessed (`palette.accentSoft`). Consistent stroke weight across shapes.
 */
export function StampGridDecoration({
  current, total, stampShape, stampColor, stampIcon, stampFilledIcon, stampGridLayout,
  cardType = 'stamp',
}: StampGridDecorationProps) {
  const palette = getCardPalette(cardType);
  const shape = (stampShape || 'circle') as StampShapeId;
  // Design-system roles win; `stampColor` is the user override, `color` is legacy.
  const filledColor = stampColor || palette.accent;
  const emptyColor = palette.accentSoft;
  const layoutKey = stampGridLayout || 'dynamic';
  const layout = getGridLayout(layoutKey, total);
  const shapePath = SHAPE_PATHS[shape] ?? SHAPE_PATHS.circle;
  const isSvgShape = SVG_SLOT_SHAPES.has(shape);
  const slotCount = getStampSlotCount(layoutKey, total);
  const filledCount = Math.min(Math.max(0, Math.floor(current)), slotCount);

  return (
    <div
      className="grid justify-center py-2 px-1 gap-1.5"
      style={{ gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))` }}
      data-testid="stamp-grid-decoration"
      data-layout={layoutKey}
      data-slot-count={slotCount}
    >
      {Array.from({ length: slotCount }).map((_, i) => {
        const filled = i < filledCount;
        const iconId = filled ? stampFilledIcon : stampIcon;
        const wellColor = filled ? filledColor : emptyColor;
        return (
          <div
            key={i}
            data-testid="stamp-slot"
            data-slot-state={filled ? 'filled' : 'empty'}
            className={`w-5 h-5 flex items-center justify-center ${getShapeClass(shape)}`}
            style={{
              backgroundColor: wellColor,
              border: isSvgShape ? 'none' : `2px solid ${filled ? filledColor : emptyColor}`,
              opacity: filled ? 1 : 1,
            }}
          >
            {iconId ? (
              <IconRenderer
                iconId={iconId}
                outline={!filled}
                className="w-3 h-3"
                style={{ color: filled ? palette.text : filledColor }}
              />
            ) : isSvgShape ? (
              <svg
                className="w-3 h-3"
                viewBox="0 0 24 24"
                fill={filled ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={2}
                strokeLinejoin="round"
                style={{ color: filled ? palette.text : filledColor }}
                aria-hidden="true"
              >
                <path d={shapePath} />
              </svg>
            ) : filled ? (
              <svg
                className="w-3 h-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: palette.text }}
                aria-hidden="true"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <svg
                className="w-2.5 h-2.5"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ color: filledColor }}
                aria-hidden="true"
              >
                <path d={shapePath} />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Cashback Card ───────────────────────────────────────────────── */

interface CashbackDecorationProps {
  percentage: number;
  tierName: string;
  color: string;
  coinIcon?: string;
  tierBadge?: string;
  progressRingColor?: string;
}

export function CashbackDecoration({ percentage, tierName, color, coinIcon, tierBadge, progressRingColor }: CashbackDecorationProps) {
  const { t } = useI18n();
  const currencySymbol = t('wallet.studio.currency.symbol');
  const ringColor = progressRingColor || color;
  return (
    <div className="flex flex-col items-center gap-1.5 py-2">
      <div className="flex items-center gap-2">
        {coinIcon ? (
          <IconRenderer iconId={coinIcon} className="w-6 h-6" style={{ color }} />
        ) : (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" style={{ color }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <text x="12" y="16" textAnchor="middle" fill="currentColor" fontSize="10" fontWeight="bold">{currencySymbol}</text>
          </svg>
        )}
        <span className={`${CARD_TYPE_SCALE.sm} font-bold`} style={{ color }}>{percentage}%</span>
        {tierBadge && <IconRenderer iconId={tierBadge} className="w-4 h-4" style={{ color }} />}
      </div>
      <div className="w-full max-w-[140px] h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(percentage * 5, 100)}%`, backgroundColor: ringColor }} />
      </div>
      <span className={`${CARD_TYPE_SCALE.xs} uppercase tracking-wider`} style={{ color, opacity: 0.8 }}>{tierName}</span>
    </div>
  );
}

/* ── Coupon Card ─────────────────────────────────────────────────── */

interface CouponDecorationProps {
  discount: number;
  discountType: string;
  validUntil: string;
  color: string;
  cutLineStyle?: string;
  discountBadgeStyle?: string;
  offerTag?: string;
}

function CutLinePreview({ style }: { style: string }) {
  if (style === 'zigzag') {
    return (
      <svg height="8" width="100%" viewBox="0 0 200 8" preserveAspectRatio="none">
        <polyline points="0,4 8,0 16,4 24,0 32,4 40,0 48,4 56,0 64,4 72,0 80,4 88,0 96,4 104,0 112,4 120,0 128,4 136,0 144,4 152,0 160,4 168,0 176,4 184,0 192,4 200,0" fill="none" stroke="currentColor" strokeWidth="1" className="text-white/20" />
      </svg>
    );
  }
  const dashArray = { dashed: '6 3', dotted: '2 3', solid: 'none' }[style] || '6 3';
  return (
    <svg height="8" width="100%">
      <line x1="0" y1="4" x2="100%" y2="4" stroke="currentColor" strokeWidth="1" strokeDasharray={dashArray} className="text-white/20" />
    </svg>
  );
}

export function CouponDecoration({ discount, discountType, validUntil, color, cutLineStyle, discountBadgeStyle, offerTag }: CouponDecorationProps) {
  const { t } = useI18n();
  const displayValue = discountType === 'percentage' ? `${discount}%` : `${t('wallet.studio.currency.symbol')}${discount}`;
  const badgeStyle = discountBadgeStyle || 'pill';

  const badgeClass = {
    pill: 'px-2 py-0.5 rounded-full',
    banner: 'px-3 py-0.5 rounded-sm',
    circle: 'w-10 h-10 rounded-full flex items-center justify-center',
    tag: 'px-2 py-0.5 rounded-sm',
  }[badgeStyle] || 'px-2 py-0.5 rounded-full';

  return (
    <div className="flex flex-col items-center gap-1 py-2">
      {cutLineStyle && cutLineStyle !== 'solid' && (
        <div className="w-full px-2">
          <CutLinePreview style={cutLineStyle} />
        </div>
      )}
      <div className={`flex items-center justify-center ${badgeClass}`} style={{ backgroundColor: badgeStyle === 'circle' ? 'transparent' : `${color}20`, border: badgeStyle === 'circle' ? `2px solid ${color}` : 'none' }}>
        <span className={`${CARD_TYPE_SCALE.sm} font-bold`} style={{ color }}>{displayValue}</span>
      </div>
      {offerTag && (
        <span className={`${CARD_TYPE_SCALE.xs} px-1.5 py-0.5 rounded-full bg-white/10`} style={{ color }}>{offerTag}</span>
      )}
      <div className={`flex items-center gap-1 ${CARD_TYPE_SCALE.xs}`} style={{ color, opacity: 0.75 }}>
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="6" cy="6" r="3" />
          <path d="M8.12 8.12 12 12" />
          <path d="M20 4 8.12 15.88" />
          <circle cx="6" cy="18" r="3" />
          <path d="M14.8 14.8 20 20" />
        </svg>
        <span>{t('wallet.preview.validUntil')} {validUntil}</span>
      </div>
    </div>
  );
}

/* ── VIP Membership Card ─────────────────────────────────────────── */

interface VIPMembershipDecorationProps {
  tierName: string;
  perks: string[];
  color: string;
  crownIcon?: string;
  memberBadgeStyle?: string;
  benefitsListIcons?: string[];
}

/** Metal tints derived from the card accent — no raw hex. */
function metalTint(base: string, style: string): string {
  switch (style) {
    case 'silver':
      return `color-mix(in srgb, ${base} 55%, white)`;
    case 'platinum':
      return `color-mix(in srgb, ${base} 35%, white)`;
    case 'bronze':
      return `color-mix(in srgb, ${base} 80%, black)`;
    case 'gold':
    default:
      return base;
  }
}

export function VIPMembershipDecoration({ tierName, perks, color, crownIcon, memberBadgeStyle, benefitsListIcons }: VIPMembershipDecorationProps) {
  const { t } = useI18n();
  const badgeColor = metalTint(color, memberBadgeStyle || 'gold');
  return (
    <div className="flex flex-col items-center gap-1.5 py-2">
      <div className="flex items-center gap-1.5">
        {crownIcon ? (
          <IconRenderer iconId={crownIcon} className="w-5 h-5" style={{ color: badgeColor }} />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" style={{ color: badgeColor, opacity: 0.9 }}>
            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
          </svg>
        )}
        <span className={`${CARD_TYPE_SCALE.xs} font-bold uppercase tracking-wider`} style={{ color: badgeColor }}>{tierName}</span>
      </div>
      {perks.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center">
          {perks.slice(0, 3).map((perk, i) => (
            <span key={i} className={`flex items-center gap-0.5 ${CARD_TYPE_SCALE.xs} px-1.5 py-0.5 rounded-full bg-white/10`} style={{ color }}>
              {benefitsListIcons?.[i] && <img src={benefitsListIcons[i]} alt="" className="w-2.5 h-2.5 object-contain" />}
              {resolvePerkLabel(perk, t)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Gift Certificate Card ───────────────────────────────────────── */

interface GiftCertificateDecorationProps {
  balance: string;
  color: string;
  boxGraphic?: string;
  ribbonColor?: string;
  denominationBadge?: string;
}

export function GiftCertificateDecoration({ balance, color, boxGraphic, ribbonColor, denominationBadge }: GiftCertificateDecorationProps) {
  const { t } = useI18n();
  const accentColor = ribbonColor || color;
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <div className="flex items-center gap-1.5">
        {boxGraphic ? (
          <img src={boxGraphic} alt="" className="w-5 h-5 object-contain" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: accentColor }}>
            <rect x="3" y="8" width="18" height="13" rx="2" />
            <path d="M12 8v13" />
            <path d="M19 12a3 3 0 1 0-6 0 3 3 0 0 0 6 0z" />
            <path d="M5 12a3 3 0 1 1 6 0 3 3 0 0 1-6 0z" />
            <path d="M12 8V6a2 2 0 0 1 2-2h.5" />
            <path d="M12 8V6a2 2 0 0 0-2-2h-.5" />
          </svg>
        )}
        <span className={`${CARD_TYPE_SCALE.sm} font-bold`} style={{ color }}>{balance}</span>
      </div>
      {denominationBadge && (
        <span className={`${CARD_TYPE_SCALE.xs} px-1.5 py-0.5 rounded-full bg-white/10`} style={{ color: accentColor }}>{denominationBadge}</span>
      )}
      <span className={`${CARD_TYPE_SCALE.xs} uppercase tracking-wider`} style={{ color, opacity: 0.7 }}>{t('wallet.preview.availableBalance')}</span>
    </div>
  );
}

/* ── Referral Pass Card ──────────────────────────────────────────── */

interface ReferralPassDecorationProps {
  code: string;
  referralsMade: number;
  maxReferrals: number;
  color: string;
  referralIcon?: string;
  shareButtonColor?: string;
  rewardBadgeIcon?: string;
  friendAvatarPlaceholder?: string;
}

export function ReferralPassDecoration({ code, referralsMade, maxReferrals, color, referralIcon, shareButtonColor, rewardBadgeIcon, friendAvatarPlaceholder }: ReferralPassDecorationProps) {
  const { t } = useI18n();
  const progress = maxReferrals > 0 ? (referralsMade / maxReferrals) * 100 : 0;
  const barColor = shareButtonColor || color;
  return (
    <div className="flex flex-col items-center gap-1.5 py-2">
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/10 ${CARD_RADIUS.chip}`}>
        {referralIcon ? (
          <img src={referralIcon} alt="" className="w-4 h-4 object-contain" />
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color }}>
            <path d="M18 8a3 3 0 1 0-6 0 3 3 0 0 0 6 0z" />
            <path d="M6 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
            <path d="M9 14h6" />
            <path d="M12 11v6" />
          </svg>
        )}
        <span className={`${CARD_TYPE_SCALE.xs} font-mono font-semibold`} style={{ color }}>{code}</span>
        {rewardBadgeIcon && <img src={rewardBadgeIcon} alt="" className="w-3 h-3 object-contain" />}
      </div>
      <div className="flex items-center gap-1 w-full max-w-[140px]">
        {friendAvatarPlaceholder && (
          <img src={friendAvatarPlaceholder} alt="" className="w-3 h-3 rounded-full object-contain" style={{ opacity: 0.7 }} />
        )}
        <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: barColor }} />
        </div>
      </div>
      <span className={`${CARD_TYPE_SCALE.xs}`} style={{ color, opacity: 0.7 }}>{referralsMade} / {maxReferrals} {t('wallet.preview.referrals')}</span>
    </div>
  );
}

/* ── Discount Tiered Card ────────────────────────────────────────── */

interface DiscountTier {
  tierName: string;
  discountPercentage: number;
}

interface DiscountDecorationProps {
  tiers: DiscountTier[];
  color: string;
  tierBadgeIcons?: string[];
  progressBarColor?: string;
  discountBannerText?: string;
  percentageDisplayStyle?: 'compact' | 'expanded' | 'badge';
}

export function DiscountDecoration({ tiers, color, tierBadgeIcons, progressBarColor, discountBannerText, percentageDisplayStyle }: DiscountDecorationProps) {
  const activeTier = tiers[0];
  const barColor = progressBarColor || color;
  const displayStyle = percentageDisplayStyle || 'compact';
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      {discountBannerText && (
        <span className={`${CARD_TYPE_SCALE.xs} px-2 py-0.5 rounded-full bg-white/10 font-medium`} style={{ color }}>{discountBannerText}</span>
      )}
      {activeTier && (
        <div className="flex items-center gap-1.5">
          {tierBadgeIcons?.[0] ? (
            <img src={tierBadgeIcons[0]} alt="" className="w-5 h-5 object-contain" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: barColor }}>
              <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
            </svg>
          )}
          {displayStyle === 'badge' ? (
            <span className={`px-2 py-1 rounded-full ${CARD_TYPE_SCALE.sm} font-black`} style={{ backgroundColor: `${color}20`, color }}>{activeTier.discountPercentage}%</span>
          ) : displayStyle === 'expanded' ? (
            <div className="flex flex-col items-center">
              <span className={`${CARD_TYPE_SCALE.lg} font-black leading-none`} style={{ color }}>{activeTier.discountPercentage}%</span>
              <span className={`${CARD_TYPE_SCALE.xs} font-semibold mt-0.5`} style={{ color, opacity: 0.85 }}>{activeTier.tierName}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className={`${CARD_TYPE_SCALE.sm} font-bold`} style={{ color }}>{activeTier.discountPercentage}%</span>
              <span className={`${CARD_TYPE_SCALE.xs}`} style={{ color, opacity: 0.8 }}>{activeTier.tierName}</span>
            </div>
          )}
        </div>
      )}
      {tiers.length > 1 && (
        <div className="flex gap-1">
          {tiers.slice(1, 3).map((tier, i) => (
            <span key={i} className={`${CARD_TYPE_SCALE.xs} px-1 py-0.5 rounded bg-white/5`} style={{ color, opacity: 0.7 }}>
              {tier.tierName} {tier.discountPercentage}%
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Affiliate Card ──────────────────────────────────────────────── */

interface AffiliateDecorationProps {
  code: string;
  color: string;
  referralChainIcon?: string;
  badgeColor?: string;
  referralBannerText?: string;
  ambassadorBadge?: string;
  partnerLogoUrl?: string;
}

export function AffiliateDecoration({ code, color, referralChainIcon, badgeColor, referralBannerText, ambassadorBadge, partnerLogoUrl }: AffiliateDecorationProps) {
  const { t } = useI18n();
  const accentColor = badgeColor || color;
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      {referralBannerText && (
        <span className={`${CARD_TYPE_SCALE.xs} px-2 py-0.5 rounded-full bg-white/10 font-medium`} style={{ color: accentColor }}>{referralBannerText}</span>
      )}
      {partnerLogoUrl && (
        <img src={partnerLogoUrl} alt="" className="w-5 h-5 rounded object-contain" />
      )}
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/10 ${CARD_RADIUS.chip}`}>
        {referralChainIcon ? (
          <img src={referralChainIcon} alt="" className="w-4 h-4 object-contain" />
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: accentColor }}>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        )}
        <span className={`${CARD_TYPE_SCALE.xs} font-mono font-semibold`} style={{ color: accentColor }}>{code}</span>
        {ambassadorBadge && <img src={ambassadorBadge} alt="" className="w-3 h-3 object-contain" />}
      </div>
      <span className={`${CARD_TYPE_SCALE.xs} uppercase tracking-wider`} style={{ color, opacity: 0.7 }}>{t('wallet.preview.affiliateCode')}</span>
    </div>
  );
}

/* ── Corporate Discount Card ─────────────────────────────────────── */

interface CorporateDiscountDecorationProps {
  companyName: string;
  discountPercentage: number;
  color: string;
  companyLogoUrl?: string;
  buildingIcon?: string;
  badgeStyle?: 'corporate' | 'standard' | 'minimal';
  idBadgeColor?: string;
  securitySeal?: boolean;
  departmentBadge?: string;
}

export function CorporateDiscountDecoration({ companyName, discountPercentage, color, companyLogoUrl, buildingIcon, badgeStyle, idBadgeColor, securitySeal, departmentBadge }: CorporateDiscountDecorationProps) {
  const { t } = useI18n();
  const accentColor = idBadgeColor || color;
  const style = badgeStyle || 'corporate';
  return (
    <div className={`flex ${style === 'minimal' ? 'flex-row items-center' : 'flex-col items-center'} gap-1 py-2`}>
      <div className="flex items-center gap-1.5">
        {companyLogoUrl ? (
          <img src={companyLogoUrl} alt="" className={`${style === 'corporate' ? 'w-6 h-6 rounded-lg' : 'w-5 h-5 rounded'} object-contain`} />
        ) : buildingIcon ? (
          <img src={buildingIcon} alt="" className="w-5 h-5 object-contain" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: accentColor }}>
            <path d="M3 21h18" />
            <path d="M5 21V7l8-4 8 4v14" />
            <path d="M9 21v-6h6v6" />
            <path d="M10 9h4" />
            <path d="M10 13h4" />
          </svg>
        )}
        <div className="flex flex-col">
          <span className={`${CARD_TYPE_SCALE.xs} font-semibold`} style={{ color: accentColor }}>{companyName}</span>
          <span className={`${CARD_TYPE_SCALE.xs}`} style={{ color, opacity: 0.8 }}>{discountPercentage}% {t('wallet.preview.discount')}</span>
        </div>
        {securitySeal && (
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" style={{ color: accentColor, opacity: 0.75 }}>
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
          </svg>
        )}
        {departmentBadge && (
          <img src={departmentBadge} alt="" className="w-3 h-3 object-contain" />
        )}
      </div>
    </div>
  );
}

/* ── Multipass Card ──────────────────────────────────────────────── */

interface MultipassDecorationProps {
  remaining: number;
  total: number;
  color: string;
  ticketGraphic?: string;
  punchIcon?: string;
  bundleBadgeStyle?: string;
  indicatorStyle?: string;
}

export function MultipassDecoration({ remaining, total, color, ticketGraphic, punchIcon, bundleBadgeStyle, indicatorStyle }: MultipassDecorationProps) {
  const { t } = useI18n();
  const progress = total > 0 ? (remaining / total) * 100 : 0;
  const style = indicatorStyle || bundleBadgeStyle || 'numeric';

  return (
    <div className="flex flex-col items-center gap-1.5 py-2">
      <div className="flex items-center gap-1.5">
        {ticketGraphic ? (
          <img src={ticketGraphic} alt="" className="w-5 h-5 object-contain" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color }}>
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <path d="M6 6v12" strokeDasharray="2 2" />
            <path d="M12 10h4" />
            <path d="M12 14h4" />
          </svg>
        )}
        {style === 'visual' ? (
          <div className="flex gap-0.5">
            {Array.from({ length: Math.min(total, 10) }).map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: i < remaining ? color : 'transparent',
                  border: `1px solid ${color}`,
                  opacity: i < remaining ? 1 : 0.55,
                }}
              />
            ))}
          </div>
        ) : (
          <>
            <span className={`${CARD_TYPE_SCALE.sm} font-bold`} style={{ color }}>{remaining}</span>
            <span className={`${CARD_TYPE_SCALE.xs}`} style={{ color, opacity: 0.7 }}>/ {total}</span>
          </>
        )}
        {punchIcon && <img src={punchIcon} alt="" className="w-3 h-3 object-contain" />}
      </div>
      <div className="w-full max-w-[140px] h-1 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: color }} />
      </div>
      <span className={`${CARD_TYPE_SCALE.xs} uppercase tracking-wider`} style={{ color, opacity: 0.7 }}>{t('wallet.preview.sessionsRemaining')}</span>
    </div>
  );
}
