/**
 * Visual decoration components for Wallet Pass Studio phone mockups.
 *
 * Each card type gets a distinct visual identity in the preview.
 * Used by AppleWalletPreview and GoogleWalletPreview.
 */

'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';

/* ── Helpers ──────────────────────────────────────────────────────── */

const SHAPE_PATHS: Record<string, string> = {
  circle: 'M12 12 m-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0',
  square: 'M2 2 h20 v20 h-20 z',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  heart: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  diamond: 'M12 2l10 10-10 10L2 12z',
  hexagon: 'M21 16.5l-9 5.2-9-5.2v-9l9-5.2 9 5.2z',
};

function getShapeClass(shape: string): string {
  switch (shape) {
    case 'circle': return 'rounded-full';
    case 'square': return 'rounded-sm';
    case 'star': case 'heart': case 'diamond': case 'hexagon': return 'rounded-none';
    default: return 'rounded-full';
  }
}

function getGridLayout(layout: string, total: number): { cols: number; rows: number } {
  switch (layout) {
    case '3x3': return { cols: 3, rows: 3 };
    case '4x4': return { cols: 4, rows: 4 };
    case '5x2': return { cols: 5, rows: 2 };
    case '6x2': return { cols: 6, rows: 2 };
    default: return { cols: Math.min(total, 5), rows: Math.ceil(total / 5) };
  }
}

/* ── Stamp Card ──────────────────────────────────────────────────── */

interface StampGridDecorationProps {
  current: number;
  total: number;
  color: string;
  stampShape?: string;
  stampColor?: string;
  stampIcon?: string;
  stampFilledIcon?: string;
  stampGridLayout?: string;
}

export function StampGridDecoration({
  current, total, color, stampShape, stampColor, stampIcon, stampFilledIcon, stampGridLayout,
}: StampGridDecorationProps) {
  const shape = stampShape || 'circle';
  const fillColor = stampColor || color;
  const layout = getGridLayout(stampGridLayout || 'dynamic', total);
  const shapePath = SHAPE_PATHS[shape];
  const isSvgShape = shape === 'star' || shape === 'heart' || shape === 'diamond' || shape === 'hexagon';

  return (
    <div
      className="grid gap-1.5 justify-center py-2 px-1"
      style={{ gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))` }}
      data-testid="stamp-grid-decoration"
    >
      {Array.from({ length: Math.min(total, layout.cols * layout.rows) }).map((_, i) => {
        const filled = i < current;
        const iconUrl = filled ? stampFilledIcon : stampIcon;
        return (
          <div
            key={i}
            className={`w-5 h-5 border-2 flex items-center justify-center transition-all ${getShapeClass(shape)} ${
              filled ? 'scale-105' : 'opacity-40'
            }`}
            style={{
              borderColor: fillColor,
              backgroundColor: filled ? fillColor : 'transparent',
            }}
          >
            {iconUrl ? (
              <img src={iconUrl} alt="" className="w-3 h-3 object-contain" style={{ filter: filled ? 'none' : 'grayscale(1) opacity(0.5)' }} />
            ) : isSvgShape ? (
              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                <path d={shapePath} />
              </svg>
            ) : filled ? (
              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : null}
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
          <img src={coinIcon} alt="" className="w-6 h-6 object-contain" />
        ) : (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" style={{ color }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <text x="12" y="16" textAnchor="middle" fill="currentColor" fontSize="10" fontWeight="bold">{currencySymbol}</text>
          </svg>
        )}
        <span className="text-sm font-bold" style={{ color }}>{percentage}%</span>
        {tierBadge && <img src={tierBadge} alt="" className="w-4 h-4 object-contain" />}
      </div>
      <div className="w-full max-w-[140px] h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(percentage * 5, 100)}%`, backgroundColor: ringColor }} />
      </div>
      <span className="text-[9px] uppercase tracking-wider opacity-60" style={{ color }}>{tierName}</span>
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
        <span className="text-sm font-bold" style={{ color }}>{displayValue}</span>
      </div>
      {offerTag && (
        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/10" style={{ color }}>{offerTag}</span>
      )}
      <div className="flex items-center gap-1 text-[8px] opacity-50">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color }}>
          <circle cx="6" cy="6" r="3" />
          <path d="M8.12 8.12 12 12" />
          <path d="M20 4 8.12 15.88" />
          <circle cx="6" cy="18" r="3" />
          <path d="M14.8 14.8 20 20" />
        </svg>
        <span style={{ color }}>{t('wallet.preview.validUntil')} {validUntil}</span>
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
}

const BADGE_COLORS: Record<string, string> = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  platinum: '#E5E4E2',
  bronze: '#CD7F32',
};

export function VIPMembershipDecoration({ tierName, perks, color, crownIcon, memberBadgeStyle }: VIPMembershipDecorationProps) {
  const badgeColor = BADGE_COLORS[memberBadgeStyle || 'gold'] || color;
  return (
    <div className="flex flex-col items-center gap-1.5 py-2">
      <div className="flex items-center gap-1.5">
        {crownIcon ? (
          <img src={crownIcon} alt="" className="w-5 h-5 object-contain" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" style={{ color: badgeColor, opacity: 0.9 }}>
            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
          </svg>
        )}
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: badgeColor }}>{tierName}</span>
      </div>
      {perks.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center">
          {perks.slice(0, 3).map((perk, i) => (
            <span key={i} className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/10" style={{ color }}>
              {perk}
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
        <span className="text-sm font-bold" style={{ color }}>{balance}</span>
      </div>
      {denominationBadge && (
        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/10" style={{ color: accentColor }}>{denominationBadge}</span>
      )}
      <span className="text-[8px] uppercase tracking-wider opacity-50" style={{ color }}>{t('wallet.preview.availableBalance')}</span>
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
}

export function ReferralPassDecoration({ code, referralsMade, maxReferrals, color, referralIcon, shareButtonColor, rewardBadgeIcon }: ReferralPassDecorationProps) {
  const { t } = useI18n();
  const progress = maxReferrals > 0 ? (referralsMade / maxReferrals) * 100 : 0;
  const barColor = shareButtonColor || color;
  return (
    <div className="flex flex-col items-center gap-1.5 py-2">
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/10">
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
        <span className="text-[10px] font-mono font-semibold" style={{ color }}>{code}</span>
        {rewardBadgeIcon && <img src={rewardBadgeIcon} alt="" className="w-3 h-3 object-contain" />}
      </div>
      <div className="w-full max-w-[140px] h-1 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: barColor }} />
      </div>
      <span className="text-[8px] opacity-50" style={{ color }}>{referralsMade} / {maxReferrals} {t('wallet.preview.referrals')}</span>
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
}

export function DiscountDecoration({ tiers, color, tierBadgeIcons, progressBarColor, discountBannerText }: DiscountDecorationProps) {
  const activeTier = tiers[0];
  const barColor = progressBarColor || color;
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      {discountBannerText && (
        <span className="text-[8px] px-2 py-0.5 rounded-full bg-white/10 font-medium" style={{ color }}>{discountBannerText}</span>
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
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold" style={{ color }}>{activeTier.discountPercentage}%</span>
            <span className="text-[8px] opacity-60" style={{ color }}>{activeTier.tierName}</span>
          </div>
        </div>
      )}
      {tiers.length > 1 && (
        <div className="flex gap-1">
          {tiers.slice(1, 3).map((tier, i) => (
            <span key={i} className="text-[7px] px-1 py-0.5 rounded bg-white/5 opacity-50" style={{ color }}>
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
}

export function AffiliateDecoration({ code, color, referralChainIcon, badgeColor, referralBannerText }: AffiliateDecorationProps) {
  const { t } = useI18n();
  const accentColor = badgeColor || color;
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      {referralBannerText && (
        <span className="text-[8px] px-2 py-0.5 rounded-full bg-white/10 font-medium" style={{ color: accentColor }}>{referralBannerText}</span>
      )}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/10">
        {referralChainIcon ? (
          <img src={referralChainIcon} alt="" className="w-4 h-4 object-contain" />
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: accentColor }}>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        )}
        <span className="text-[10px] font-mono font-semibold" style={{ color: accentColor }}>{code}</span>
      </div>
      <span className="text-[8px] uppercase tracking-wider opacity-50" style={{ color }}>{t('wallet.preview.affiliateCode')}</span>
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
  badgeStyle?: string;
  idBadgeColor?: string;
  securitySeal?: boolean;
}

export function CorporateDiscountDecoration({ companyName, discountPercentage, color, companyLogoUrl, buildingIcon, badgeStyle: _badgeStyle, idBadgeColor, securitySeal }: CorporateDiscountDecorationProps) {
  const { t } = useI18n();
  const accentColor = idBadgeColor || color;
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <div className="flex items-center gap-1.5">
        {companyLogoUrl ? (
          <img src={companyLogoUrl} alt="" className="w-5 h-5 rounded object-contain" />
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
          <span className="text-[10px] font-semibold" style={{ color: accentColor }}>{companyName}</span>
          <span className="text-[8px] opacity-60" style={{ color }}>{discountPercentage}% {t('wallet.preview.discount')}</span>
        </div>
        {securitySeal && (
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" style={{ color: accentColor, opacity: 0.7 }}>
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
          </svg>
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
              <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: i < remaining ? color : 'transparent', border: `1px solid ${color}`, opacity: i < remaining ? 1 : 0.3 }} />
            ))}
          </div>
        ) : (
          <>
            <span className="text-sm font-bold" style={{ color }}>{remaining}</span>
            <span className="text-[10px] opacity-50" style={{ color }}>/ {total}</span>
          </>
        )}
        {punchIcon && <img src={punchIcon} alt="" className="w-3 h-3 object-contain" />}
      </div>
      <div className="w-full max-w-[140px] h-1 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: color }} />
      </div>
      <span className="text-[8px] uppercase tracking-wider opacity-50" style={{ color }}>{t('wallet.preview.sessionsRemaining')}</span>
    </div>
  );
}
