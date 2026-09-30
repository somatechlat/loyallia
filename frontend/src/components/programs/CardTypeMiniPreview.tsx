'use client';

/**
 * Apple Wallet–quality mini pass previews for the program card-type selector.
 * Pure CSS + SVG — no images, no emoji. Shared visual language with
 * WalletPreviewContent (themes, QR, type personality, field anatomy).
 */

import React from 'react';
import { useI18n } from '@/lib/i18n';
import { APPLE_PASS_STYLES } from './constants';
import { BarcodeSvg } from '@/components/wallet/BarcodeRenderer';

/* ── Type color systems (aligned with existing card-type color standards) ── */

export interface CardTypeTheme {
  accent: string;
  accentSoft: string;
  bgFrom: string;
  bgVia: string;
  bgTo: string;
  glow: string;
  sheen: string;
}

export const CARD_TYPE_THEMES: Record<string, CardTypeTheme> = {
  stamp:              { accent: '#fbbf24', accentSoft: 'rgba(251,191,36,0.18)',  bgFrom: '#211608', bgVia: '#3a270c', bgTo: '#160f05', glow: 'rgba(251,191,36,0.28)',  sheen: 'rgba(253,230,138,0.55)' },
  cashback:           { accent: '#34d399', accentSoft: 'rgba(52,211,153,0.18)',  bgFrom: '#062018', bgVia: '#0d3526', bgTo: '#041610', glow: 'rgba(52,211,153,0.28)',  sheen: 'rgba(167,243,208,0.5)'  },
  coupon:             { accent: '#fb7185', accentSoft: 'rgba(251,113,133,0.18)', bgFrom: '#280a14', bgVia: '#451222', bgTo: '#1c060e', glow: 'rgba(251,113,133,0.28)', sheen: 'rgba(254,205,211,0.5)'  },
  affiliate:          { accent: '#a78bfa', accentSoft: 'rgba(167,139,250,0.18)', bgFrom: '#1a1030', bgVia: '#2c1a52', bgTo: '#120a22', glow: 'rgba(167,139,250,0.28)', sheen: 'rgba(221,214,254,0.5)'  },
  discount:           { accent: '#fb923c', accentSoft: 'rgba(251,146,60,0.18)',  bgFrom: '#241208', bgVia: '#3d1e0c', bgTo: '#180c05', glow: 'rgba(251,146,60,0.28)',  sheen: 'rgba(254,215,170,0.5)'  },
  gift_certificate:   { accent: '#f472b6', accentSoft: 'rgba(244,114,182,0.18)', bgFrom: '#2a0c1e', bgVia: '#451430', bgTo: '#1c0814', glow: 'rgba(244,114,182,0.28)', sheen: 'rgba(251,207,232,0.5)'  },
  vip_membership:     { accent: '#fde047', accentSoft: 'rgba(253,224,71,0.16)',  bgFrom: '#1c1606', bgVia: '#33280a', bgTo: '#120e04', glow: 'rgba(253,224,71,0.26)',  sheen: 'rgba(254,249,195,0.55)' },
  corporate_discount: { accent: '#93c5fd', accentSoft: 'rgba(147,197,253,0.16)', bgFrom: '#081428', bgVia: '#122848', bgTo: '#060e1c', glow: 'rgba(147,197,253,0.26)', sheen: 'rgba(191,219,254,0.5)'  },
  referral_pass:      { accent: '#86efac', accentSoft: 'rgba(134,239,172,0.16)', bgFrom: '#0a2212', bgVia: '#143820', bgTo: '#06160c', glow: 'rgba(134,239,172,0.26)', sheen: 'rgba(187,247,208,0.5)'  },
  multipass:          { accent: '#22d3ee', accentSoft: 'rgba(34,211,238,0.18)',  bgFrom: '#062028', bgVia: '#0c3542', bgTo: '#04141a', glow: 'rgba(34,211,238,0.28)',  sheen: 'rgba(165,243,252,0.5)'  },
};

export const DEFAULT_CARD_THEME: CardTypeTheme = CARD_TYPE_THEMES.stamp ?? {
  accent: '#fbbf24', accentSoft: 'rgba(251,191,36,0.18)', bgFrom: '#211608', bgVia: '#3a270c', bgTo: '#160f05', glow: 'rgba(251,191,36,0.28)', sheen: 'rgba(253,230,138,0.55)',
};

export function resolveCardTheme(type: string): CardTypeTheme {
  return CARD_TYPE_THEMES[type] ?? DEFAULT_CARD_THEME;
}

export function passBackground(theme: CardTypeTheme): React.CSSProperties {
  return {
    backgroundImage: [
      `radial-gradient(120% 90% at 85% 0%, ${theme.glow} 0%, transparent 55%)`,
      `linear-gradient(145deg, ${theme.bgFrom} 0%, ${theme.bgVia} 48%, ${theme.bgTo} 100%)`,
    ].join(', '),
  };
}

/* ── QR barcode (BarcodeRenderer) ─────────────────────────────────────── */

export function MiniQr({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={`bg-white rounded-[4px] shadow-[0_2px_8px_rgba(0,0,0,0.28)] ring-1 ring-black/5 ${className}`}
      style={{ padding: Math.max(2, Math.round(size * 0.1)) }}
    >
      <BarcodeSvg type="qr_code" size={size} />
    </div>
  );
}

/* ── Compact SVG ornament set (no emoji) ──────────────────────────────── */

const ORNAMENT_PATHS: Record<string, string> = {
  crown:  'M3 18h18M4 17l-1.2-9L8 12l4-8 4 8 5.2-4-1.2 9',
  star:   'M12 2.6l2.9 5.88 6.5.95-4.7 4.58 1.1 6.46L12 17.4l-5.8 3.07 1.1-6.46-4.7-4.58 6.5-.95L12 2.6z',
  gift:   'M20 12v9H4v-9M2 7h20v5H2zM12 7v14M12 7H7.8A2.3 2.3 0 018 2.6C11 2.2 12 7 12 7zM12 7h4.2A2.3 2.3 0 0016 2.6C13 2.2 12 7 12 7z',
  building: 'M3 21h18M6 21V6a1 1 0 011-1h6a1 1 0 011 1v15M14 10h3a1 1 0 011 1v10M9 9h2M9 13h2M9 17h2',
  users:  'M9 8a3.2 3.2 0 100-6.4A3.2 3.2 0 009 8zM17 9.5a2.4 2.4 0 100-4.8 2.4 2.4 0 000 4.8zM2.8 19c.6-3.2 3-5 6.2-5s5.6 1.8 6.2 5M15.5 14.2c2.3.3 4 1.7 4.5 4',
  coin:   'M12 3a9 9 0 100 18 9 9 0 000-18zM12 6.5v11M15 9.2c-.6-1-1.7-1.5-3-1.5-1.7 0-3 .8-3 2.1 0 2.8 6 1.5 6 4.2 0 1.3-1.3 2.1-3 2.1-1.4 0-2.6-.6-3.2-1.6',
  ticket: 'M3 8.5A1.5 1.5 0 014.5 7h15A1.5 1.5 0 0121 8.5v1.2a2 2 0 000 4v1.8A1.5 1.5 0 0119.5 17h-15A1.5 1.5 0 013 15.5v-1.8a2 2 0 000-4V8.5zM12 8v2M12 14v2',
  stamp:  'M5 5h14v14H5zM9 12.2l2.1 2.1L15.5 10',
  layers: 'M12 3l9 4.5-9 4.5-9-4.5L12 3zM3 12l9 4.5L21 12M3 16.5L12 21l9-4.5',
  refresh: 'M20 7v5h-5M4 17v-5h5M5.5 9.5A7 7 0 0118 7.2L20 12M4 12l2 4.8a7 7 0 0012.5-2.3',
};

const TYPE_ORNAMENT: Record<string, string> = {
  stamp: 'stamp', cashback: 'coin', coupon: 'ticket', affiliate: 'star',
  discount: 'layers', gift_certificate: 'gift', vip_membership: 'crown',
  corporate_discount: 'building', referral_pass: 'users', multipass: 'refresh',
};

export function Ornament({ name, className = 'w-3.5 h-3.5', color, filled = false }: {
  name: string; className?: string; color?: string; filled?: boolean;
}) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? (color ?? 'currentColor') : 'none'}
      stroke={color ?? 'currentColor'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ORNAMENT_PATHS[name] ?? ORNAMENT_PATHS.stamp ?? ''} />
    </svg>
  );
}

/* ── Type personality visuals ─────────────────────────────────────────── */

function StampMarks({ theme, total = 10, filled = 3, compact = false }: { theme: CardTypeTheme; total?: number; filled?: number; compact?: boolean }) {
  const size = compact ? 7 : 11;
  return (
    <div className="flex flex-wrap justify-center" style={{ gap: compact ? 3 : 5 }}>
      {Array.from({ length: total }).map((_, i) => {
        const on = i < filled;
        return (
          <div key={i} className="rounded-full" style={{
            width: size, height: size,
            background: on ? `linear-gradient(160deg, ${theme.sheen}, ${theme.accent})` : 'rgba(255,255,255,0.10)',
            boxShadow: on ? `0 0 6px ${theme.glow}, inset 0 1px 1px rgba(255,255,255,0.35)` : 'inset 0 0 0 1px rgba(255,255,255,0.12)',
          }} />
        );
      })}
    </div>
  );
}

function RingPercent({ theme, percent = 5, size = 42 }: { theme: CardTypeTheme; percent?: number; size?: number }) {
  const stroke = 3.2;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const min = Math.min(percent * 8, 100);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={theme.accent} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${(c * min) / 100} ${c}`} style={{ filter: `drop-shadow(0 0 4px ${theme.glow})` }} />
      </svg>
      <span className="absolute font-black tracking-tight" style={{ color: theme.accent, fontSize: size * 0.28 }}>{percent}%</span>
    </div>
  );
}

function TierSteps({ theme, steps = ['5%', '10%', '15%'], activeIndex = 2 }: { theme: CardTypeTheme; steps?: string[]; activeIndex?: number }) {
  return (
    <div className="flex items-end justify-center" style={{ gap: 6 }}>
      {steps.map((v, i) => {
        const active = i === activeIndex;
        return (
          <div key={v} className="rounded-[4px] flex items-end justify-center" style={{
            width: 22, height: 14 + i * 7, paddingBottom: 2,
            background: active ? `linear-gradient(180deg, ${theme.sheen}, ${theme.accent})` : 'rgba(255,255,255,0.10)',
            boxShadow: active ? `0 2px 10px ${theme.glow}` : 'inset 0 0 0 1px rgba(255,255,255,0.1)',
            color: active ? '#111' : 'rgba(255,255,255,0.55)', fontSize: 8, fontWeight: 800,
          }}>{v}</div>
        );
      })}
    </div>
  );
}

function OfferBadge({ theme, value = '-$10', label }: { theme: CardTypeTheme; value?: string; label?: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="rounded-full flex items-center justify-center font-black tracking-tight" style={{
        background: `linear-gradient(155deg, ${theme.sheen}, ${theme.accent})`, color: '#1a0810',
        boxShadow: `0 6px 18px ${theme.glow}, inset 0 1px 1px rgba(255,255,255,0.45)`,
        minWidth: 58, height: 36, padding: '0 12px', fontSize: 15,
      }}>{value}</div>
      {label ? <p className="mt-1 uppercase tracking-[0.18em] font-semibold" style={{ color: theme.accent, fontSize: 8, opacity: 0.75 }}>{label}</p> : null}
    </div>
  );
}

function BalanceBlock({ theme, value = '$25', label, icon }: { theme: CardTypeTheme; value?: string; label?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center" style={{ gap: 6 }}>
        {icon}
        <p className="font-black tracking-tight leading-none" style={{ color: theme.accent, fontSize: 22, textShadow: `0 0 18px ${theme.glow}` }}>{value}</p>
      </div>
      {label ? <p className="mt-1 uppercase tracking-[0.18em] font-semibold" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 8 }}>{label}</p> : null}
    </div>
  );
}

function VipCrest({ theme, label = 'VIP' }: { theme: CardTypeTheme; label?: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="rounded-full flex items-center justify-center" style={{
        width: 34, height: 34, background: `linear-gradient(150deg, ${theme.sheen}, ${theme.accent})`,
        boxShadow: `0 4px 16px ${theme.glow}, inset 0 1px 1px rgba(255,255,255,0.5)`,
      }}>
        <Ornament name="crown" className="w-4 h-4" color="#3a2c05" />
      </div>
      <p className="mt-1 font-black tracking-[0.28em]" style={{ color: theme.accent, fontSize: 11 }}>{label}</p>
      <div className="flex mt-1" style={{ gap: 3 }}>
        {[0, 1, 2].map((i) => (
          <Ornament key={i} name="star" className="w-2.5 h-2.5" filled={i === 2} color={i === 2 ? theme.accent : 'rgba(255,255,255,0.25)'} />
        ))}
      </div>
    </div>
  );
}

function AffiliateStar({ theme, label }: { theme: CardTypeTheme; label?: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="rounded-full flex items-center justify-center" style={{
        width: 34, height: 34, background: `radial-gradient(circle at 35% 30%, ${theme.sheen}, ${theme.accent})`, boxShadow: `0 4px 16px ${theme.glow}`,
      }}>
        <Ornament name="star" className="w-4 h-4" filled color="#2a1248" />
      </div>
      {label ? <p className="mt-1 font-bold uppercase tracking-[0.16em]" style={{ color: theme.accent, fontSize: 8, opacity: 0.85 }}>{label}</p> : null}
    </div>
  );
}

function CorporateMark({ theme, value = '15%', label }: { theme: CardTypeTheme; value?: string; label?: string }) {
  return (
    <div className="flex items-center justify-center" style={{ gap: 10 }}>
      <div className="rounded-[8px] flex items-center justify-center" style={{
        width: 32, height: 32, background: 'rgba(255,255,255,0.10)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)',
      }}>
        <Ornament name="building" className="w-4 h-4" color={theme.accent} />
      </div>
      <div>
        <p className="font-black leading-none tracking-tight" style={{ color: theme.accent, fontSize: 18 }}>{value}</p>
        {label ? <p className="uppercase tracking-[0.14em] font-semibold" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8 }}>{label}</p> : null}
      </div>
    </div>
  );
}

function ReferralNodes({ theme, count = 3, label }: { theme: CardTypeTheme; count?: number; label?: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-full border flex items-center justify-center" style={{
            width: 22, height: 22, marginLeft: i === 0 ? 0 : -7, zIndex: i,
            borderColor: 'rgba(255,255,255,0.2)',
            background: i === count - 1 ? `linear-gradient(150deg, ${theme.sheen}, ${theme.accent})` : 'rgba(255,255,255,0.12)',
          }}>
            <Ornament name="users" className="w-2.5 h-2.5" color={i === count - 1 ? '#062012' : 'rgba(255,255,255,0.75)'} />
          </div>
        ))}
        <div className="rounded-full border flex items-center justify-center font-black" style={{
          width: 22, height: 22, marginLeft: -7, zIndex: count + 1,
          borderColor: theme.accent, background: 'rgba(255,255,255,0.10)', color: theme.accent, fontSize: 9,
        }}>+{count}</div>
      </div>
      {label ? <p className="mt-1 uppercase tracking-[0.16em] font-semibold" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8 }}>{label}</p> : null}
    </div>
  );
}

function MultipassSlots({ theme, total = 10, used = 3, compact = false }: { theme: CardTypeTheme; total?: number; used?: number; compact?: boolean }) {
  return (
    <div className="flex justify-center" style={{ gap: compact ? 2 : 3 }}>
      {Array.from({ length: total }).map((_, i) => {
        const on = i < used;
        return (
          <div key={i} className="rounded-[3px]" style={{
            width: compact ? 6 : 9, height: compact ? 18 : 26,
            background: on ? `linear-gradient(180deg, ${theme.sheen}, ${theme.accent})` : 'rgba(255,255,255,0.10)',
            boxShadow: on ? `0 2px 8px ${theme.glow}, inset 0 1px 1px rgba(255,255,255,0.35)` : 'inset 0 0 0 1px rgba(255,255,255,0.08)',
          }} />
        );
      })}
    </div>
  );
}

/* ── Shared pass chrome ───────────────────────────────────────────────── */

function PassTopBar({ theme, type, passStyleLabel, title, headerLabel, headerValue, compact = false }: {
  theme: CardTypeTheme; type: string; passStyleLabel: string; title: string; headerLabel: string; headerValue: string; compact?: boolean;
}) {
  return (
    <div className={`flex items-start justify-between ${compact ? 'gap-1.5' : 'gap-2'}`}>
      <div className="flex items-center min-w-0" style={{ gap: compact ? 5 : 7 }}>
        <div className="rounded-[6px] flex items-center justify-center shrink-0" style={{
          width: compact ? 18 : 26, height: compact ? 18 : 26,
          background: 'rgba(255,255,255,0.12)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.16), 0 1px 3px rgba(0,0,0,0.2)',
        }}>
          <Ornament name={TYPE_ORNAMENT[type] ?? 'stamp'} className={compact ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} color={theme.accent} />
        </div>
        <div className="min-w-0">
          <p className="uppercase tracking-[0.18em] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.45)', fontSize: compact ? 6 : 8 }}>{passStyleLabel}</p>
          <p className="font-bold truncate leading-tight" style={{ color: 'rgba(255,255,255,0.92)', fontSize: compact ? 8 : 11 }}>{title}</p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="uppercase tracking-[0.14em] font-semibold" style={{ color: 'rgba(255,255,255,0.42)', fontSize: compact ? 6 : 8 }}>{headerLabel}</p>
        <p className="font-black tracking-tight" style={{ color: theme.accent, fontSize: compact ? 9 : 12 }}>{headerValue}</p>
      </div>
    </div>
  );
}

function Perforation({ compact = false }: { compact?: boolean }) {
  return (
    <div className="relative" style={{ height: compact ? 2 : 3, margin: compact ? '4px 8px' : '8px 16px' }} aria-hidden="true">
      <div className="absolute inset-0 opacity-70" style={{
        background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.32) 0px, rgba(255,255,255,0.32) 4px, transparent 4px, transparent 8px)',
      }} />
    </div>
  );
}

function FieldPair({ leftLabel, leftValue, rightLabel, rightValue, theme, compact = false }: {
  leftLabel: string; leftValue: string; rightLabel: string; rightValue: string; theme: CardTypeTheme; compact?: boolean;
}) {
  const labelSize = compact ? 6 : 8;
  const valueSize = compact ? 8 : 10;
  return (
    <div className="flex justify-between items-start" style={{ gap: 8 }}>
      <div className="min-w-0">
        <p className="uppercase tracking-[0.14em] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.42)', fontSize: labelSize }}>{leftLabel}</p>
        <p className="font-bold truncate" style={{ color: 'rgba(255,255,255,0.85)', fontSize: valueSize }}>{leftValue}</p>
      </div>
      <div className="text-right min-w-0">
        <p className="uppercase tracking-[0.14em] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.42)', fontSize: labelSize }}>{rightLabel}</p>
        <p className="font-bold truncate" style={{ color: theme.accent, fontSize: valueSize }}>{rightValue}</p>
      </div>
    </div>
  );
}

/* ── Type copy (i18n) ─────────────────────────────────────────────────── */

export interface TypeCopy {
  title: string; headerLabel: string; headerValue: string; detail: string;
  leftLabel: string; leftValue: string; rightLabel: string; rightValue: string;
}

export function useTypeCopy(type: string): TypeCopy {
  const { t } = useI18n();
  const P = 'programs.walletPreview.';
  const base = (over: Partial<TypeCopy>): TypeCopy => ({
    title: t('portal.cardTypes.stamp'), headerLabel: t(`${P}stamps`), headerValue: '3/10',
    detail: t(`${P}stampDetail`), leftLabel: t(`${P}stamps`), leftValue: '3/10',
    rightLabel: t(`${P}since`), rightValue: '2024', ...over,
  });
  switch (type) {
    case 'cashback': return base({
      title: t('programs.cardTypes.cashback'), headerLabel: t(`${P}credit`), headerValue: '$12.50',
      detail: t(`${P}cashbackDetail`), leftLabel: t(`${P}cashbackRate`), leftValue: '5%',
    });
    case 'coupon': return base({
      title: t('portal.cardTypes.coupon'), headerLabel: t(`${P}offer`), headerValue: '$10',
      detail: t(`${P}couponDetail`), leftLabel: t(`${P}discount`), leftValue: '-$10',
    });
    case 'affiliate': return base({
      title: t('programs.cardTypes.affiliate'), headerLabel: t(`${P}status`), headerValue: t('common.active'),
      detail: t(`${P}affiliateDetail`), leftLabel: t(`${P}member`), leftValue: t('common.active'),
    });
    case 'discount': return base({
      title: t('portal.cardTypes.discount'), headerLabel: t(`${P}level`), headerValue: t(`${P}gold`),
      detail: t(`${P}discountDetail`), leftLabel: t(`${P}level`), leftValue: t(`${P}gold`),
      rightLabel: t(`${P}discount`), rightValue: '15%',
    });
    case 'gift_certificate': return base({
      title: t('portal.cardTypes.gift_certificate'), headerLabel: t(`${P}balance`), headerValue: '$25',
      detail: t(`${P}giftDetail`), leftLabel: t(`${P}giftBalance`), leftValue: '$25',
    });
    case 'vip_membership': return base({
      title: t('portal.cardTypes.vip_membership'), headerLabel: t(`${P}membership`), headerValue: 'VIP',
      detail: t(`${P}vipDetail`), leftLabel: t(`${P}membership`), leftValue: 'VIP',
    });
    case 'corporate_discount': return base({
      title: t('programs.cardTypes.corporate_discount'), headerLabel: t(`${P}company`), headerValue: 'CORP',
      detail: t(`${P}corporateDetail`), leftLabel: t(`${P}corporateDiscount`), leftValue: '15%',
      rightLabel: t(`${P}company`), rightValue: 'CORP',
    });
    case 'referral_pass': return base({
      title: t('portal.cardTypes.referral_pass'), headerLabel: t(`${P}referrals`), headerValue: '3',
      detail: t(`${P}referralDetail`), leftLabel: t(`${P}referrals`), leftValue: '3',
      rightLabel: t(`${P}invited`), rightValue: '3',
    });
    case 'multipass': return base({
      title: t('portal.cardTypes.multipass'), headerLabel: t(`${P}remaining`), headerValue: '7/10',
      detail: t(`${P}multipassDetail`), leftLabel: t(`${P}remaining`), leftValue: '7/10',
    });
    default: return base({});
  }
}

/* ── Type personality (exported for WalletPreviewContent) ─────────────── */

export function TypePersonality({ type, theme, scale = 'md' }: { type: string; theme: CardTypeTheme; scale?: 'sm' | 'md' }) {
  const { t } = useI18n();
  const compact = scale === 'sm';
  const P = 'programs.walletPreview.';
  switch (type) {
    case 'cashback':
      return (
        <div className="flex items-center justify-center" style={{ gap: 10 }}>
          <RingPercent theme={theme} percent={5} size={compact ? 36 : 48} />
          <div className="text-left">
            <p className="font-black tracking-tight leading-none" style={{ color: theme.accent, fontSize: compact ? 16 : 22 }}>$12.50</p>
            <p className="uppercase tracking-[0.16em] font-semibold" style={{ color: 'rgba(255,255,255,0.5)', fontSize: compact ? 8 : 8 }}>{t(`${P}credit`)}</p>
          </div>
        </div>
      );
    case 'coupon':
      return <OfferBadge theme={theme} value="-$10" label={t(`${P}discount`)} />;
    case 'affiliate':
      return <AffiliateStar theme={theme} label={t(`${P}member`)} />;
    case 'discount':
      return <TierSteps theme={theme} />;
    case 'gift_certificate':
      return <BalanceBlock theme={theme} value="$25" label={t(`${P}giftBalance`)} icon={<Ornament name="gift" className={compact ? 'w-3 h-3' : 'w-4 h-4'} color={theme.accent} />} />;
    case 'vip_membership':
      return <VipCrest theme={theme} />;
    case 'corporate_discount':
      return <CorporateMark theme={theme} value="15%" label={t(`${P}corporateDiscount`)} />;
    case 'referral_pass':
      return <ReferralNodes theme={theme} count={3} label={t(`${P}invited`)} />;
    case 'multipass':
      return <MultipassSlots theme={theme} total={10} used={3} compact={compact} />;
    default:
      return <StampMarks theme={theme} total={10} filled={3} compact={compact} />;
  }
}

/* ── Mini pass (tile preview) ─────────────────────────────────────────── */

export interface CardTypeMiniPreviewProps {
  /** Card type key (stamp, cashback, coupon, …) */
  type: string;
  /** Whether this tile is the selected card type */
  selected?: boolean;
}

export function CardTypeMiniPreview({ type, selected = false }: CardTypeMiniPreviewProps) {
  const { t } = useI18n();
  const theme = resolveCardTheme(type);
  const copy = useTypeCopy(type);
  const passStyle = APPLE_PASS_STYLES[type] ?? 'generic';
  const isCoupon = passStyle === 'coupon';
  const passStyleLabel =
    passStyle === 'coupon' ? t('programs.walletPreview.coupon')
      : passStyle === 'storeCard' ? t('programs.walletPreview.card')
        : t('programs.walletPreview.pass');

  return (
    <div
      className="relative w-full overflow-hidden rounded-[14px] select-none"
      style={{
        aspectRatio: '2.15 / 1',
        ...passBackground(theme),
        color: '#fff',
        boxShadow: selected
          ? `0 12px 28px rgba(0,0,0,0.35), 0 0 0 1px ${theme.accent}88, 0 0 24px ${theme.glow}`
          : '0 8px 20px rgba(0,0,0,0.28), inset 0 0 0 1px rgba(255,255,255,0.1)',
        transition: 'box-shadow 200ms ease, transform 200ms ease',
        transform: selected ? 'translateY(-1px)' : undefined,
      }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'linear-gradient(118deg, rgba(255,255,255,0.1) 0%, transparent 32%, transparent 68%, rgba(255,255,255,0.05) 100%)',
      }} />

      <div className="relative h-full flex flex-col" style={{ padding: '10px 12px 8px' }}>
        {isCoupon && <Perforation compact />}
        <PassTopBar theme={theme} type={type} passStyleLabel={passStyleLabel}
          title={copy.title} headerLabel={copy.headerLabel} headerValue={copy.headerValue} compact />
        <div className="flex-1 flex items-center justify-center" style={{ paddingTop: 4, paddingBottom: 2 }}>
          <TypePersonality type={type} theme={theme} scale="sm" />
        </div>
        <div style={{ opacity: 0.9 }}>
          <FieldPair leftLabel={copy.leftLabel} leftValue={copy.leftValue}
            rightLabel={copy.rightLabel} rightValue={copy.rightValue} theme={theme} compact />
        </div>
        <div className="flex justify-center" style={{ marginTop: 6 }}>
          <MiniQr size={28} />
        </div>
      </div>
    </div>
  );
}

export default CardTypeMiniPreview;
