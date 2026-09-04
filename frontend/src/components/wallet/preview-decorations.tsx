/**
 * Visual decoration components for Wallet Pass Studio phone mockups.
 *
 * Each card type gets a distinct visual identity in the preview.
 * Used by AppleWalletPreview and GoogleWalletPreview.
 */

'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';

/* ── Stamp Card ──────────────────────────────────────────────────── */

interface StampGridDecorationProps {
  current: number;
  total: number;
  color: string;
}

export function StampGridDecoration({ current, total, color }: StampGridDecorationProps) {
  return (
    <div className="flex flex-wrap gap-1.5 justify-center py-2 px-1">
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < current;
        return (
          <div
            key={i}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              filled ? 'scale-105' : 'opacity-40'
            }`}
            style={{
              borderColor: color,
              backgroundColor: filled ? color : 'transparent',
            }}
          >
            {filled && (
              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
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
}

export function CashbackDecoration({ percentage, tierName, color }: CashbackDecorationProps) {
  const { t } = useI18n();
  const currencySymbol = t('wallet.studio.currency.symbol');
  return (
    <div className="flex flex-col items-center gap-1.5 py-2">
      <div className="flex items-center gap-2">
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" style={{ color }}>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
          <text x="12" y="16" textAnchor="middle" fill="currentColor" fontSize="10" fontWeight="bold">{currencySymbol}</text>
        </svg>
        <span className="text-sm font-bold" style={{ color }}>{percentage}%</span>
      </div>
      <div className="w-full max-w-[140px] h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(percentage * 5, 100)}%`, backgroundColor: color }} />
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
}

export function CouponDecoration({ discount, discountType, validUntil, color }: CouponDecorationProps) {
  const { t } = useI18n();
  const displayValue = discountType === 'percentage' ? `${discount}%` : `${t('wallet.studio.currency.symbol')}${discount}`;
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <div className="relative flex items-center justify-center">
        <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none">
          <polygon points="24,4 28,18 44,18 32,28 36,44 24,34 12,44 16,28 4,18 20,18" fill="currentColor" opacity="0.15" style={{ color }} />
          <polygon points="24,4 28,18 44,18 32,28 36,44 24,34 12,44 16,28 4,18 20,18" stroke="currentColor" strokeWidth="1" fill="none" style={{ color }} />
        </svg>
        <span className="absolute text-sm font-bold" style={{ color }}>{displayValue}</span>
      </div>
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
}

export function VIPMembershipDecoration({ tierName, perks, color }: VIPMembershipDecorationProps) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-2">
      <div className="flex items-center gap-1.5">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" style={{ color, opacity: 0.9 }}>
          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
        </svg>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{tierName}</span>
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
}

export function GiftCertificateDecoration({ balance, color }: GiftCertificateDecorationProps) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <div className="flex items-center gap-1.5">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color }}>
          <rect x="3" y="8" width="18" height="13" rx="2" />
          <path d="M12 8v13" />
          <path d="M19 12a3 3 0 1 0-6 0 3 3 0 0 0 6 0z" />
          <path d="M5 12a3 3 0 1 1 6 0 3 3 0 0 1-6 0z" />
          <path d="M12 8V6a2 2 0 0 1 2-2h.5" />
          <path d="M12 8V6a2 2 0 0 0-2-2h-.5" />
        </svg>
        <span className="text-sm font-bold" style={{ color }}>{balance}</span>
      </div>
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
}

export function ReferralPassDecoration({ code, referralsMade, maxReferrals, color }: ReferralPassDecorationProps) {
  const { t } = useI18n();
  const progress = maxReferrals > 0 ? (referralsMade / maxReferrals) * 100 : 0;
  return (
    <div className="flex flex-col items-center gap-1.5 py-2">
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/10">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color }}>
          <path d="M18 8a3 3 0 1 0-6 0 3 3 0 0 0 6 0z" />
          <path d="M6 8a3 3 0 1 0-6 0 3 3 0 0 0 6 0z" />
          <path d="M9 14h6" />
          <path d="M12 11v6" />
        </svg>
        <span className="text-[10px] font-mono font-semibold" style={{ color }}>{code}</span>
      </div>
      <div className="w-full max-w-[140px] h-1 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: color }} />
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
}

export function DiscountDecoration({ tiers, color }: DiscountDecorationProps) {
  const activeTier = tiers[0];
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      {activeTier && (
        <div className="flex items-center gap-1.5">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color }}>
            <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
          </svg>
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
}

export function AffiliateDecoration({ code, color }: AffiliateDecorationProps) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/10">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color }}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <span className="text-[10px] font-mono font-semibold" style={{ color }}>{code}</span>
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
}

export function CorporateDiscountDecoration({ companyName, discountPercentage, color }: CorporateDiscountDecorationProps) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <div className="flex items-center gap-1.5">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color }}>
          <path d="M3 21h18" />
          <path d="M5 21V7l8-4 8 4v14" />
          <path d="M9 21v-6h6v6" />
          <path d="M10 9h4" />
          <path d="M10 13h4" />
        </svg>
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold" style={{ color }}>{companyName}</span>
          <span className="text-[8px] opacity-60" style={{ color }}>{discountPercentage}% {t('wallet.preview.discount')}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Multipass Card ──────────────────────────────────────────────── */

interface MultipassDecorationProps {
  remaining: number;
  total: number;
  color: string;
}

export function MultipassDecoration({ remaining, total, color }: MultipassDecorationProps) {
  const { t } = useI18n();
  const progress = total > 0 ? (remaining / total) * 100 : 0;
  return (
    <div className="flex flex-col items-center gap-1.5 py-2">
      <div className="flex items-center gap-1.5">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color }}>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M6 6v12" strokeDasharray="2 2" />
          <path d="M12 10h4" />
          <path d="M12 14h4" />
        </svg>
        <span className="text-sm font-bold" style={{ color }}>{remaining}</span>
        <span className="text-[10px] opacity-50" style={{ color }}>/ {total}</span>
      </div>
      <div className="w-full max-w-[140px] h-1 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: color }} />
      </div>
      <span className="text-[8px] uppercase tracking-wider opacity-50" style={{ color }}>{t('wallet.preview.sessionsRemaining')}</span>
    </div>
  );
}
