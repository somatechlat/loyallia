import React from 'react';
import { useI18n } from '@/lib/i18n';
import { APPLE_PASS_STYLES, CardTypeIcon } from './constants';
import { BarcodeSvg } from '@/components/wallet/BarcodeRenderer';
import { cropToStyle, type ImageCrop } from '@/components/wallet/utils/crop-style';
import {
  resolveCardTheme,
  passBackground,
  TypePersonality,
  type CardTypeTheme,
} from './CardTypeMiniPreview';

export interface PreviewWalletDesign {
  provider?: 'apple' | 'google';
  appleLogoUrl?: string;
  appleStripUrl?: string;
  googleProgramLogoUrl?: string;
  googleHeroImageUrl?: string;
  /** Non-destructive crops paired with the URL fields */
  imageCrops?: {
    logo?: ImageCrop;
    strip?: ImageCrop;
    heroImage?: ImageCrop;
  };
  colors?: {
    background?: string;
    foreground?: string;
  };
}

/* ── Field row (label ≥8px, opacity ≥60) ───────────────────────────────── */

function PassFields({
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
  accent,
}: {
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
  accent: string;
}) {
  return (
    <div className="flex justify-between items-start gap-3">
      <div className="min-w-0">
        <p className="text-[8px] font-semibold uppercase tracking-[0.14em] opacity-60">{leftLabel}</p>
        <p className="text-[11px] font-bold opacity-90 truncate">{leftValue}</p>
      </div>
      <div className="text-right min-w-0">
        <p className="text-[8px] font-semibold uppercase tracking-[0.14em] opacity-60">{rightLabel}</p>
        <p className="text-[11px] font-bold truncate" style={{ color: accent }}>{rightValue}</p>
      </div>
    </div>
  );
}

/* ── Coupon perforation ────────────────────────────────────────────────── */

function Perforation() {
  return (
    <div className="relative h-[3px] mx-4 my-1" aria-hidden="true">
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            'repeating-linear-gradient(90deg, rgba(255,255,255,0.35) 0px, rgba(255,255,255,0.35) 5px, transparent 5px, transparent 10px)',
        }}
      />
    </div>
  );
}

/* ── Type-specific copy (i18n only) ────────────────────────────────────── */

interface TypeCopy {
  title: string;
  headerLabel: string;
  headerValue: string;
  detail: string;
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
  auxiliaryLabel: string;
  auxiliaryValue: string;
}

function useTypeCopy(type: string): TypeCopy {
  const { t } = useI18n();
  const P = 'programs.walletPreview.';
  switch (type) {
    case 'cashback':
      return {
        title: t('programs.cardTypes.cashback'),
        headerLabel: t(`${P}credit`),
        headerValue: '$12.50',
        detail: t(`${P}cashbackDetail`),
        primaryLabel: t(`${P}cashbackRate`),
        primaryValue: '5%',
        secondaryLabel: t(`${P}credit`),
        secondaryValue: '$12.50',
        auxiliaryLabel: t(`${P}since`),
        auxiliaryValue: '2024',
      };
    case 'coupon':
      return {
        title: t('portal.cardTypes.coupon'),
        headerLabel: t(`${P}offer`),
        headerValue: '$10',
        detail: t(`${P}couponDetail`),
        primaryLabel: t(`${P}discount`),
        primaryValue: '-$10',
        secondaryLabel: t(`${P}offer`),
        secondaryValue: '$10',
        auxiliaryLabel: t(`${P}since`),
        auxiliaryValue: '2024',
      };
    case 'affiliate':
      return {
        title: t('programs.cardTypes.affiliate'),
        headerLabel: t(`${P}status`),
        headerValue: t('common.active'),
        detail: t(`${P}affiliateDetail`),
        primaryLabel: t(`${P}member`),
        primaryValue: t('common.active'),
        secondaryLabel: t(`${P}status`),
        secondaryValue: t('common.active'),
        auxiliaryLabel: t(`${P}since`),
        auxiliaryValue: '2024',
      };
    case 'discount':
      return {
        title: t('portal.cardTypes.discount'),
        headerLabel: t(`${P}level`),
        headerValue: t(`${P}gold`),
        detail: t(`${P}discountDetail`),
        primaryLabel: t(`${P}level`),
        primaryValue: t(`${P}gold`),
        secondaryLabel: t(`${P}discount`),
        secondaryValue: '15%',
        auxiliaryLabel: t(`${P}since`),
        auxiliaryValue: '2024',
      };
    case 'gift_certificate':
      return {
        title: t('portal.cardTypes.gift_certificate'),
        headerLabel: t(`${P}balance`),
        headerValue: '$25',
        detail: t(`${P}giftDetail`),
        primaryLabel: t(`${P}giftBalance`),
        primaryValue: '$25',
        secondaryLabel: t(`${P}balance`),
        secondaryValue: '$25',
        auxiliaryLabel: t(`${P}since`),
        auxiliaryValue: '2024',
      };
    case 'vip_membership':
      return {
        title: t('portal.cardTypes.vip_membership'),
        headerLabel: t(`${P}membership`),
        headerValue: 'VIP',
        detail: t(`${P}vipDetail`),
        primaryLabel: t(`${P}membership`),
        primaryValue: 'VIP',
        secondaryLabel: t(`${P}level`),
        secondaryValue: t(`${P}gold`),
        auxiliaryLabel: t(`${P}since`),
        auxiliaryValue: '2024',
      };
    case 'corporate_discount':
      return {
        title: t('programs.cardTypes.corporate_discount'),
        headerLabel: t(`${P}company`),
        headerValue: 'CORP',
        detail: t(`${P}corporateDetail`),
        primaryLabel: t(`${P}corporateDiscount`),
        primaryValue: '15%',
        secondaryLabel: t(`${P}company`),
        secondaryValue: 'CORP',
        auxiliaryLabel: t(`${P}since`),
        auxiliaryValue: '2024',
      };
    case 'referral_pass':
      return {
        title: t('portal.cardTypes.referral_pass'),
        headerLabel: t(`${P}referrals`),
        headerValue: '3',
        detail: t(`${P}referralDetail`),
        primaryLabel: t(`${P}referrals`),
        primaryValue: '3',
        secondaryLabel: t(`${P}invited`),
        secondaryValue: '3',
        auxiliaryLabel: t(`${P}since`),
        auxiliaryValue: '2024',
      };
    case 'multipass':
      return {
        title: t('portal.cardTypes.multipass'),
        headerLabel: t(`${P}remaining`),
        headerValue: '7/10',
        detail: t(`${P}multipassDetail`),
        primaryLabel: t(`${P}remaining`),
        primaryValue: '7/10',
        secondaryLabel: t(`${P}remaining`),
        secondaryValue: '7/10',
        auxiliaryLabel: t(`${P}since`),
        auxiliaryValue: '2024',
      };
    default:
      return {
        title: t('portal.cardTypes.stamp'),
        headerLabel: t(`${P}stamps`),
        headerValue: '3/10',
        detail: t(`${P}stampDetail`),
        primaryLabel: t(`${P}stamps`),
        primaryValue: '3/10',
        secondaryLabel: t(`${P}stamps`),
        secondaryValue: '3/10',
        auxiliaryLabel: t(`${P}since`),
        auxiliaryValue: '2024',
      };
  }
}

/* ── Icon resolver for card types ───────────────────────────────────── */

function resolveIcon(type: string): string {
  return type === 'stamp' ? 'stamp'
    : type === 'cashback' ? 'dollar'
    : type === 'coupon' ? 'ticket'
    : type === 'vip_membership' ? 'crown'
    : type === 'referral_pass' ? 'megaphone'
    : type === 'gift_certificate' ? 'gift'
    : type === 'discount' ? 'layers'
    : type === 'corporate_discount' ? 'building'
    : type === 'multipass' ? 'refresh'
    : 'handshake';
}

/* ── Pass body shared by Apple & Google chrome ─────────────────────────── */

function PassBody({
  type,
  theme,
  copy,
  bgColor,
  textColor,
  logoUrl,
  stripUrl,
  logoCrop,
  stripCrop,
  isCoupon,
  hasStrip,
  isGeneric,
  passStyleLabel,
}: {
  type: string;
  theme: CardTypeTheme;
  copy: TypeCopy;
  bgColor: string;
  textColor: string;
  logoUrl?: string;
  stripUrl?: string;
  logoCrop?: ImageCrop;
  stripCrop?: ImageCrop;
  isCoupon: boolean;
  hasStrip: boolean;
  isGeneric: boolean;
  passStyleLabel: string;
}) {
  const bg = walletBackground(theme, bgColor);

  return (
    <div
      className="rounded-2xl overflow-hidden relative"
      style={{
        background: bg,
        color: textColor,
        boxShadow: '0 10px 30px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.25)',
      }}
    >
      {/* Sheen (chrome only) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(118deg, rgba(255,255,255,0.08) 0%, transparent 32%, transparent 68%, rgba(255,255,255,0.04) 100%)',
        }}
      />

      {isCoupon && <Perforation />}

      {/* Strip / hero image */}
      {hasStrip && stripUrl ? (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '375/123' }}>
          <img
            src={stripUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={cropToStyle(stripCrop)}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-12"
            style={{ background: `linear-gradient(to bottom, transparent, ${bgColor})` }}
          />
        </div>
      ) : isGeneric ? (
        /* Thumbnail block for generic passes */
        <div className="flex items-center gap-2.5 px-3 pt-3 pb-1">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'rgba(255,255,255,0.12)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.16), 0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            <CardTypeIcon icon={resolveIcon(type)} className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-semibold uppercase tracking-[0.18em] opacity-60">{passStyleLabel}</p>
            <p className="text-[12px] font-bold truncate">{copy.title}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[8px] font-semibold uppercase tracking-[0.14em] opacity-60">{copy.headerLabel}</p>
            <p className="text-[13px] font-black" style={{ color: theme.accent }}>{copy.headerValue}</p>
          </div>
        </div>
      ) : null}

      {/* Header: Logo | Title | Header Field */}
      <div className={`px-3 flex items-start gap-2 ${hasStrip || isGeneric ? 'pt-2 pb-1.5' : 'pt-3.5 pb-1.5'}`}>
        {logoUrl ? (
          <div className="w-[58px] h-[22px] rounded-md overflow-hidden border border-white/15 shadow-sm shrink-0">
            <img
              src={logoUrl}
              alt=""
              className="w-full h-full object-cover"
              style={cropToStyle(logoCrop)}
            />
          </div>
        ) : (
          <div
            className="w-[58px] h-[22px] rounded-md flex items-center justify-center shrink-0"
            style={{
              background: 'rgba(255,255,255,0.10)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)',
            }}
          >
            <CardTypeIcon icon={resolveIcon(type)} className="w-3.5 h-3.5" />
          </div>
        )}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-[8px] font-bold uppercase tracking-[0.14em] opacity-60">{passStyleLabel}</p>
          <p className="text-[11px] font-bold truncate leading-tight">{copy.title}</p>
        </div>
        {!isGeneric && (
          <div className="text-right shrink-0 pt-0.5">
            <p className="text-[8px] font-semibold uppercase tracking-[0.12em] opacity-60">{copy.headerLabel}</p>
            <p className="text-[12px] font-black" style={{ color: theme.accent }}>{copy.headerValue}</p>
          </div>
        )}
      </div>

      {/* Primary field — large, Apple primaryFields */}
      <div className="px-3 pt-1.5 pb-1">
        <p className="text-[8px] opacity-60 mb-1.5">{copy.detail}</p>
        <div className="flex items-baseline gap-2">
          <div>
            <p className="text-[8px] font-semibold uppercase tracking-[0.14em] opacity-60">{copy.primaryLabel}</p>
            <p className="text-[22px] font-black tracking-tight leading-none" style={{ color: theme.accent, textShadow: `0 0 20px ${theme.glow}` }}>
              {copy.primaryValue}
            </p>
          </div>
        </div>
      </div>

      {/* Type personality visual */}
      <div className="px-3 py-2">
        <TypePersonality type={type} theme={theme} scale="md" />
      </div>

      {/* Secondary + auxiliary field rows */}
      <div className="mx-3 h-px" style={{ background: 'rgba(255,255,255,0.10)' }} />
      <div className="px-3 py-2 space-y-1.5">
        <PassFields
          leftLabel={copy.secondaryLabel}
          leftValue={copy.secondaryValue}
          rightLabel={copy.auxiliaryLabel}
          rightValue={copy.auxiliaryValue}
          accent={theme.accent}
        />
      </div>

      {/* Barcode */}
      <div className="flex justify-center pb-3 pt-1">
        <div className="bg-white rounded-lg p-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.28)] ring-1 ring-black/5">
          <BarcodeSvg type="qr_code" size={28} message={copy.primaryValue} />
        </div>
      </div>
    </div>
  );
}

function walletBackground(theme: CardTypeTheme, override?: string): string {
  if (override && override !== '#1a1a2e') {
    return `linear-gradient(145deg, ${override} 0%, ${override}cc 50%, ${override} 100%)`;
  }
  return passBackground(theme).backgroundImage ?? theme.bgFrom;
}

/* ── Apple iPhone chrome ───────────────────────────────────────────────── */

function AppleChrome({
  type,
  theme,
  copy,
  bgColor,
  textColor,
  logoUrl,
  stripUrl,
  logoCrop,
  stripCrop,
  isCoupon,
  hasStrip,
  isGeneric,
  passStyleLabel,
  walletLabel,
}: {
  type: string;
  theme: CardTypeTheme;
  copy: TypeCopy;
  bgColor: string;
  textColor: string;
  logoUrl?: string;
  stripUrl?: string;
  logoCrop?: ImageCrop;
  stripCrop?: ImageCrop;
  isCoupon: boolean;
  hasStrip: boolean;
  isGeneric: boolean;
  passStyleLabel: string;
  walletLabel: string;
}) {
  return (
    <div className="relative w-[220px]" style={{ aspectRatio: '393/852' }}>
      {/* Outer frame */}
      <div className="absolute inset-0 bg-[#151515] rounded-[44px] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.65)] border-2 border-[#2d2d2d]" />
      {/* Side buttons */}
      <div className="absolute -left-[2px] top-[14.5%] w-[2px] h-6 bg-[#3a3a3a] rounded-l-[1px]" />
      <div className="absolute -left-[2px] top-[19.5%] w-[2px] h-10 bg-[#3a3a3a] rounded-l-[1px]" />
      <div className="absolute -left-[2px] top-[27%] w-[2px] h-10 bg-[#3a3a3a] rounded-l-[1px]" />
      <div className="absolute -right-[2px] top-[19%] w-[2px] h-14 bg-[#3a3a3a] rounded-r-[1px]" />

      {/* Screen */}
      <div className="absolute inset-[4px] bg-black rounded-[40px] overflow-hidden flex flex-col">
        {/* Dynamic Island */}
        <div className="flex justify-center pt-2.5 pb-1.5">
          <div className="w-[78px] h-[22px] bg-black rounded-full border border-[#222] relative z-10">
            <div className="absolute right-[10px] top-1/2 -translate-y-1/2 w-[6px] h-[6px] rounded-full bg-[#0a0a0a] border border-[#1a1a1a]" />
          </div>
        </div>
        {/* Status bar */}
        <div className="px-5 flex justify-between items-center text-[8px] text-white/50 font-medium leading-none tracking-wide">
          <span>9:41</span>
          <div className="flex gap-[3px] items-center">
            <svg className="w-[11px] h-[11px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
            </svg>
            <svg className="w-[11px] h-[11px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z" />
            </svg>
          </div>
        </div>
        {/* Wallet header */}
        <div className="px-4 pt-2.5 pb-1">
          <p className="text-[8px] text-white/50 font-semibold tracking-[0.22em] uppercase">{walletLabel}</p>
        </div>

        {/* Pass Card */}
        <div className="flex-1 overflow-y-auto px-3 pt-1 pb-1.5 min-h-0">
          <PassBody
            type={type}
            theme={theme}
            copy={copy}
            bgColor={bgColor}
            textColor={textColor}
            logoUrl={logoUrl}
            stripUrl={stripUrl}
            logoCrop={logoCrop}
            stripCrop={stripCrop}
            isCoupon={isCoupon}
            hasStrip={hasStrip}
            isGeneric={isGeneric}
            passStyleLabel={passStyleLabel}
          />
        </div>

        {/* Home indicator */}
        <div className="flex justify-center pb-1.5 shrink-0">
          <div className="w-[90px] h-[3px] rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  );
}

/* ── Google Wallet chrome ──────────────────────────────────────────────── */

function GoogleChrome({
  type,
  theme,
  copy,
  bgColor,
  textColor,
  logoUrl,
  stripUrl,
  logoCrop,
  stripCrop,
  isCoupon,
  hasStrip,
  isGeneric,
  passStyleLabel,
  walletLabel,
}: {
  type: string;
  theme: CardTypeTheme;
  copy: TypeCopy;
  bgColor: string;
  textColor: string;
  logoUrl?: string;
  stripUrl?: string;
  logoCrop?: ImageCrop;
  stripCrop?: ImageCrop;
  isCoupon: boolean;
  hasStrip: boolean;
  isGeneric: boolean;
  passStyleLabel: string;
  walletLabel: string;
}) {
  return (
    <div className="relative w-[220px]" style={{ aspectRatio: '393/852' }}>
      {/* Pixel-style frame */}
      <div className="absolute inset-0 bg-[#1b1b1b] rounded-[36px] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.65)] border-2 border-[#2a2a2a]" />
      <div className="absolute -right-[2px] top-[22%] w-[2px] h-12 bg-[#3a3a3a] rounded-r-[1px]" />

      {/* Screen */}
      <div className="absolute inset-[4px] bg-[#121212] rounded-[32px] overflow-hidden flex flex-col">
        {/* Punch-hole camera */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-[9px] h-[9px] rounded-full bg-black border border-[#222]" />
        </div>
        {/* Status bar */}
        <div className="px-5 flex justify-between items-center text-[8px] text-white/50 font-medium leading-none tracking-wide">
          <span>9:41</span>
          <div className="flex gap-[3px] items-center">
            <svg className="w-[11px] h-[11px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
            </svg>
            <svg className="w-[11px] h-[11px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z" />
            </svg>
          </div>
        </div>

        {/* Google Wallet header with G mark */}
        <div className="px-4 pt-2.5 pb-1.5 flex items-center gap-1.5">
          <svg className="w-3 h-3" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
          </svg>
          <p className="text-[8px] text-white/50 font-semibold tracking-[0.16em] uppercase">{walletLabel}</p>
        </div>

        {/* Pass Card — Google rounded hero style */}
        <div className="flex-1 overflow-y-auto px-3 pt-1 pb-1.5 min-h-0">
          <PassBody
            type={type}
            theme={theme}
            copy={copy}
            bgColor={bgColor}
            textColor={textColor}
            logoUrl={logoUrl}
            stripUrl={stripUrl}
            logoCrop={logoCrop}
            stripCrop={stripCrop}
            isCoupon={isCoupon}
            hasStrip={hasStrip}
            isGeneric={isGeneric}
            passStyleLabel={passStyleLabel}
          />
        </div>

        {/* Home indicator */}
        <div className="flex justify-center pb-1.5 shrink-0">
          <div className="w-[90px] h-[3px] rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  );
}

/* ── Main export ───────────────────────────────────────────────────────── */

function WalletPreviewContent({ type, walletDesign }: { type: string; walletDesign?: PreviewWalletDesign }) {
  const { t } = useI18n();
  const copy = useTypeCopy(type);
  const theme = resolveCardTheme(type);
  const passStyle = APPLE_PASS_STYLES[type] || 'generic';
  const bgColor = walletDesign?.colors?.background || theme.bgFrom;
  const textColor = walletDesign?.colors?.foreground || '#ffffff';

  const isApple = !walletDesign || walletDesign.provider !== 'google';
  const logoUrl = isApple ? walletDesign?.appleLogoUrl : walletDesign?.googleProgramLogoUrl;
  const stripUrl = isApple ? walletDesign?.appleStripUrl : walletDesign?.googleHeroImageUrl;
  const hasStrip = Boolean(stripUrl) && (passStyle === 'storeCard' || passStyle === 'coupon' || passStyle === 'eventTicket');
  const isCoupon = passStyle === 'coupon';
  const isGeneric = passStyle === 'generic';

  const passStyleLabel =
    passStyle === 'coupon'
      ? t('programs.walletPreview.coupon')
      : passStyle === 'storeCard'
        ? t('programs.walletPreview.card')
        : t('programs.walletPreview.pass');

  const walletLabel = isApple
    ? t('wallet.preview.wallet')
    : t('wallet.preview.googleWallet');

  const shared = {
    type,
    theme,
    copy,
    bgColor,
    textColor,
    logoUrl,
    stripUrl,
    logoCrop: walletDesign?.imageCrops?.logo,
    stripCrop: walletDesign?.imageCrops?.strip ?? walletDesign?.imageCrops?.heroImage,
    isCoupon,
    hasStrip,
    isGeneric,
    passStyleLabel,
    walletLabel,
  };

  return (
    <div className="flex flex-col items-center">
      {isApple ? <AppleChrome {...shared} /> : <GoogleChrome {...shared} />}
    </div>
  );
}

export default WalletPreviewContent;
