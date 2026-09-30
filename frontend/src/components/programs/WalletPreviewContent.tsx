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
import { StampProgressGrid, type StampShape } from '@/components/ui/StampIcons';
import {
  getCardPalette,
  CARD_TYPE_SCALE,
  CARD_SPACE,
  CARD_RADIUS,
  CARD_SHADOW,
  CARD_CHROME,
  DEFAULT_CARD_BACKGROUND,
  DEVICE_CHROME,
} from '@/components/wallet/design-system';

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

/* ── Field cell (design-system type scale, line-clamp not truncate) ── */

function PassFieldCell({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="min-w-0">
      <p
        className={`${CARD_TYPE_SCALE.xs} font-semibold uppercase tracking-wider leading-tight`}
        style={{ color: 'var(--card-text-muted)' }}
      >
        {label}
      </p>
      <p
        className={`${CARD_TYPE_SCALE.sm} font-bold leading-snug line-clamp-2 break-words`}
        style={{ color: valueColor ?? 'var(--card-text)' }}
      >
        {value}
      </p>
    </div>
  );
}

/* ── Coupon perforation ────────────────────────────────────────────────── */

function Perforation() {
  return (
    <div className="relative h-[3px] mx-4 my-1" aria-hidden="true">
      <div
        className="absolute inset-0"
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
        headerValue: `${t('wallet.studio.currency.symbol')}12.50`,
        detail: t(`${P}cashbackDetail`),
        primaryLabel: t(`${P}cashbackRate`),
        primaryValue: t('wallet.preview.samplePercent'),
        secondaryLabel: t(`${P}credit`),
        secondaryValue: `${t('wallet.studio.currency.symbol')}12.50`,
        auxiliaryLabel: t(`${P}since`),
        auxiliaryValue: t('wallet.preview.sampleYear'),
      };
    case 'coupon':
      return {
        title: t('portal.cardTypes.coupon'),
        headerLabel: t(`${P}offer`),
        headerValue: `${t('wallet.studio.currency.symbol')}10`,
        detail: t(`${P}couponDetail`),
        primaryLabel: t(`${P}discount`),
        primaryValue: `-${t('wallet.studio.currency.symbol')}10`,
        secondaryLabel: t(`${P}offer`),
        secondaryValue: `${t('wallet.studio.currency.symbol')}10`,
        auxiliaryLabel: t(`${P}since`),
        auxiliaryValue: t('wallet.preview.sampleYear'),
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
        auxiliaryValue: t('wallet.preview.sampleYear'),
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
        auxiliaryValue: t('wallet.preview.sampleYear'),
      };
    case 'gift_certificate':
      return {
        title: t('portal.cardTypes.gift_certificate'),
        headerLabel: t(`${P}balance`),
        headerValue: `${t('wallet.studio.currency.symbol')}25`,
        detail: t(`${P}giftDetail`),
        primaryLabel: t(`${P}giftBalance`),
        primaryValue: `${t('wallet.studio.currency.symbol')}25`,
        secondaryLabel: t(`${P}balance`),
        secondaryValue: `${t('wallet.studio.currency.symbol')}25`,
        auxiliaryLabel: t(`${P}since`),
        auxiliaryValue: t('wallet.preview.sampleYear'),
      };
    case 'vip_membership':
      return {
        title: t('portal.cardTypes.vip_membership'),
        headerLabel: t(`${P}membership`),
        headerValue: t('wallet.preview.vip'),
        detail: t(`${P}vipDetail`),
        primaryLabel: t(`${P}membership`),
        primaryValue: t('wallet.preview.vip'),
        secondaryLabel: t(`${P}level`),
        secondaryValue: t(`${P}gold`),
        auxiliaryLabel: t(`${P}since`),
        auxiliaryValue: t('wallet.preview.sampleYear'),
      };
    case 'corporate_discount':
      return {
        title: t('programs.cardTypes.corporate_discount'),
        headerLabel: t(`${P}company`),
        headerValue: t('wallet.preview.sampleCompany'),
        detail: t(`${P}corporateDetail`),
        primaryLabel: t(`${P}corporateDiscount`),
        primaryValue: '15%',
        secondaryLabel: t(`${P}company`),
        secondaryValue: t('wallet.preview.sampleCompany'),
        auxiliaryLabel: t(`${P}since`),
        auxiliaryValue: t('wallet.preview.sampleYear'),
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
        auxiliaryValue: t('wallet.preview.sampleYear'),
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
        auxiliaryValue: t('wallet.preview.sampleYear'),
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
        auxiliaryValue: t('wallet.preview.sampleYear'),
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

/* ── Apple pass body (design-system driven) ─────────────────────────── */

function ApplePassBody({
  type,
  copy,
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
  copy: TypeCopy;
  logoUrl?: string;
  stripUrl?: string;
  logoCrop?: ImageCrop;
  stripCrop?: ImageCrop;
  isCoupon: boolean;
  hasStrip: boolean;
  isGeneric: boolean;
  passStyleLabel: string;
}) {
  const palette = getCardPalette(type);
  const stampDemoFilled = 3;
  const stampDemoTotal = 10;

  return (
    <div
      className={`${CARD_RADIUS.apple} ${CARD_SHADOW.card} overflow-hidden relative`}
      style={{
        backgroundImage: palette.gradient,
        backgroundColor: palette.base,
        color: palette.text,
        ['--card-text' as string]: palette.text,
        ['--card-text-muted' as string]: palette.textMuted,
        border: '1px solid rgba(255,255,255,0.12)',
      }}
      data-testid="apple-pass-body"
    >
      <div className={`absolute inset-x-0 top-0 h-20 pointer-events-none ${CARD_CHROME.gloss}`} aria-hidden />

      {isCoupon && <Perforation />}

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
            style={{ background: `linear-gradient(to bottom, transparent, ${palette.base})` }}
          />
        </div>
      ) : null}

      {/* Header glass strip */}
      <div className={`relative px-3 flex items-center gap-2.5 ${CARD_CHROME.headerGlass} ${hasStrip || isGeneric ? 'pt-2.5 pb-2' : 'pt-3.5 pb-2'}`}>
        {logoUrl ? (
          <div className={`shrink-0 w-[52px] h-[36px] ${CARD_RADIUS.chip} overflow-hidden ${CARD_CHROME.logoRing} bg-white/10`}>
            <img src={logoUrl} alt="" className="w-full h-full object-cover" style={cropToStyle(logoCrop)} />
          </div>
        ) : (
          <div className={`shrink-0 w-[52px] h-[36px] ${CARD_RADIUS.chip} ${CARD_CHROME.logoRing} bg-white/10 flex items-center justify-center`}>
            <CardTypeIcon icon={resolveIcon(type)} className="w-5 h-5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={`${CARD_TYPE_SCALE.xs} font-semibold uppercase tracking-wider leading-tight`} style={{ color: palette.textMuted }}>
            {passStyleLabel}
          </p>
          <p className={`${CARD_TYPE_SCALE.md} font-bold leading-tight line-clamp-2 break-words`}>{copy.title}</p>
        </div>
        <div className="shrink-0 text-right max-w-[88px]">
          <p className={`${CARD_TYPE_SCALE.xs} font-semibold uppercase tracking-wider leading-tight`} style={{ color: palette.textMuted }}>
            {copy.headerLabel}
          </p>
          <p className={`${CARD_TYPE_SCALE.sm} font-black leading-none line-clamp-2 break-words`} style={{ color: palette.accent }}>
            {copy.headerValue}
          </p>
        </div>
      </div>

      {/* Hero / primary */}
      <div className="px-3 pt-2.5 pb-1">
        <p className={`${CARD_TYPE_SCALE.xs} leading-snug line-clamp-2 mb-1.5`} style={{ color: palette.textMuted }}>
          {copy.detail}
        </p>
        <p className={`${CARD_TYPE_SCALE.xs} font-semibold uppercase tracking-wider leading-tight`} style={{ color: palette.textMuted }}>
          {copy.primaryLabel}
        </p>
        <p className={`${CARD_TYPE_SCALE.xl} font-black tracking-tight leading-none line-clamp-2 break-words`} style={{ color: palette.accent }}>
          {copy.primaryValue}
        </p>
      </div>

      {/* Stamp / progress — real icons, never block glyphs */}
      {type === 'stamp' ? (
        <div className="px-3 py-2">
          <StampProgressGrid
            filled={stampDemoFilled}
            total={stampDemoTotal}
            shape={'circle' as StampShape}
            filledColor={palette.accent}
            emptyColor={palette.accentSoft}
            label={`${copy.primaryLabel}: ${copy.primaryValue}`}
            className="justify-start"
          />
        </div>
      ) : (
        <div className="px-3 py-2">
          <TypePersonality type={type} theme={resolveCardTheme(type)} scale="md" />
        </div>
      )}

      {/* Secondary + auxiliary */}
      <div className="mx-3 h-px bg-white/10" />
      <div className={`px-3 py-2 grid grid-cols-2 ${CARD_SPACE.sm}`}>
        <PassFieldCell label={copy.secondaryLabel} value={copy.secondaryValue} valueColor={palette.accent} />
        <PassFieldCell label={copy.auxiliaryLabel} value={copy.auxiliaryValue} />
      </div>

      {/* Barcode on white plate */}
      <div className="relative px-3 pb-3 pt-2">
        <div
          className="absolute inset-x-3 bottom-3 top-1 rounded-xl pointer-events-none"
          style={{ background: palette.accentSoft }}
          aria-hidden
        />
        <div className={`relative ${CARD_CHROME.barcodePlate} flex justify-center`}>
          <BarcodeSvg type="qr_code" size={28} message={copy.primaryValue} />
        </div>
      </div>
    </div>
  );
}

/* ── Pass body shared by Google chrome ─────────────────────────────────── */

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
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(118deg, rgba(255,255,255,0.08) 0%, transparent 32%, transparent 68%, rgba(255,255,255,0.04) 100%)',
        }}
      />

      {isCoupon && <Perforation />}

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
            <p className={`${CARD_TYPE_SCALE.xs} font-semibold uppercase tracking-wider`} style={{ color: 'rgba(255,255,255,0.72)' }}>
              {passStyleLabel}
            </p>
            <p className={`${CARD_TYPE_SCALE.sm} font-bold line-clamp-2 break-words`}>{copy.title}</p>
          </div>
          <div className="text-right shrink-0">
            <p className={`${CARD_TYPE_SCALE.xs} font-semibold uppercase tracking-wider`} style={{ color: 'rgba(255,255,255,0.72)' }}>
              {copy.headerLabel}
            </p>
            <p className={`${CARD_TYPE_SCALE.sm} font-black`} style={{ color: theme.accent }}>{copy.headerValue}</p>
          </div>
        </div>
      ) : null}

      {/* Header: Logo | Title | Header Field */}
      <div className={`px-3 flex items-start gap-2 ${hasStrip || isGeneric ? 'pt-2 pb-1.5' : 'pt-3.5 pb-1.5'}`}>
        {logoUrl ? (
          <div className="w-[58px] h-[22px] rounded-md overflow-hidden border border-white/15 shadow-sm shrink-0">
            <img src={logoUrl} alt="" className="w-full h-full object-cover" style={cropToStyle(logoCrop)} />
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
          <p className={`${CARD_TYPE_SCALE.xs} font-bold uppercase tracking-wider`} style={{ color: 'rgba(255,255,255,0.72)' }}>
            {passStyleLabel}
          </p>
          <p className={`${CARD_TYPE_SCALE.sm} font-bold leading-tight line-clamp-2 break-words`}>{copy.title}</p>
        </div>
        {!isGeneric && (
          <div className="text-right shrink-0 pt-0.5 max-w-[88px]">
            <p className={`${CARD_TYPE_SCALE.xs} font-semibold uppercase tracking-wider`} style={{ color: 'rgba(255,255,255,0.72)' }}>
              {copy.headerLabel}
            </p>
            <p className={`${CARD_TYPE_SCALE.sm} font-black line-clamp-2 break-words`} style={{ color: theme.accent }}>
              {copy.headerValue}
            </p>
          </div>
        )}
      </div>

      {/* Primary field */}
      <div className="px-3 pt-1.5 pb-1">
        <p className={`${CARD_TYPE_SCALE.xs} mb-1.5 line-clamp-2`} style={{ color: 'rgba(255,255,255,0.72)' }}>{copy.detail}</p>
        <p className={`${CARD_TYPE_SCALE.xs} font-semibold uppercase tracking-wider`} style={{ color: 'rgba(255,255,255,0.72)' }}>
          {copy.primaryLabel}
        </p>
        <p
          className={`${CARD_TYPE_SCALE.xl} font-black tracking-tight leading-none line-clamp-2 break-words`}
          style={{ color: theme.accent, textShadow: `0 0 20px ${theme.glow}` }}
        >
          {copy.primaryValue}
        </p>
      </div>

      {/* Type personality visual */}
      <div className="px-3 py-2">
        {type === 'stamp' ? (
          <StampProgressGrid
            filled={3}
            total={10}
            shape={'circle' as StampShape}
            filledColor={theme.accent}
            emptyColor={theme.accentSoft}
            label={`${copy.primaryLabel}: ${copy.primaryValue}`}
            className="justify-start"
          />
        ) : (
          <TypePersonality type={type} theme={theme} scale="md" />
        )}
      </div>

      {/* Secondary + auxiliary */}
      <div className="mx-3 h-px bg-white/10" />
      <div className="px-3 py-2">
        <div className="flex justify-between items-start gap-3">
          <PassFieldCell label={copy.secondaryLabel} value={copy.secondaryValue} valueColor={theme.accent} />
          <div className="text-right min-w-0">
            <p className={`${CARD_TYPE_SCALE.xs} font-semibold uppercase tracking-wider`} style={{ color: 'rgba(255,255,255,0.72)' }}>
              {copy.auxiliaryLabel}
            </p>
            <p className={`${CARD_TYPE_SCALE.sm} font-bold line-clamp-2 break-words`}>{copy.auxiliaryValue}</p>
          </div>
        </div>
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
  if (override && override !== DEFAULT_CARD_BACKGROUND) {
    return `linear-gradient(145deg, ${override} 0%, ${override}cc 50%, ${override} 100%)`;
  }
  return passBackground(theme).backgroundImage ?? theme.bgFrom;
}

/* ── Device status-bar furniture (shared, min 11px type) ──────────────── */

function StatusIcons() {
  return (
    <div className="flex gap-[3px] items-center">
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
      </svg>
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z" />
      </svg>
    </div>
  );
}

/* ── Apple iPhone chrome ───────────────────────────────────────────────── */

function AppleChrome({
  type,
  copy,
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
  copy: TypeCopy;
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
    <div className="relative w-[260px]" style={{ aspectRatio: '393/852' }}>
      <div style={{background: DEVICE_CHROME.iphoneBody, borderColor: DEVICE_CHROME.iphoneBezel}} className="absolute inset-0 rounded-[44px] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.65)] border-2" />
      <div style={{background: DEVICE_CHROME.iphoneSideButton}} className="absolute -left-[2px] top-[14.5%] w-[2px] h-6 rounded-l-[1px]" />
      <div style={{background: DEVICE_CHROME.iphoneSideButton}} className="absolute -left-[2px] top-[19.5%] w-[2px] h-10 rounded-l-[1px]" />
      <div style={{background: DEVICE_CHROME.iphoneSideButton}} className="absolute -left-[2px] top-[27%] w-[2px] h-10 rounded-l-[1px]" />
      <div style={{background: DEVICE_CHROME.iphoneSideButton}} className="absolute -right-[2px] top-[19%] w-[2px] h-14 rounded-r-[1px]" />

      <div className="absolute inset-[4px] bg-black rounded-[40px] overflow-hidden flex flex-col">
        <div className="flex justify-center pt-2.5 pb-1.5">
          <div className="w-[78px] h-[22px] bg-black rounded-full border border-[#222] relative z-10">
            <div style={{background: DEVICE_CHROME.iphoneCameraDot, borderColor: DEVICE_CHROME.iphoneCameraRing}} className="absolute right-[10px] top-1/2 -translate-y-1/2 w-[6px] h-[6px] rounded-full border" />
          </div>
        </div>
        <div className="px-5 flex justify-between items-center text-white/70 font-medium leading-none tracking-wide">
          <span className={CARD_TYPE_SCALE.xs}>9:41</span>
          <StatusIcons />
        </div>
        <div className="px-4 pt-2.5 pb-1">
          <p className={`${CARD_TYPE_SCALE.xs} text-white/70 font-semibold tracking-[0.22em] uppercase`}>{walletLabel}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pt-1 pb-1.5 min-h-0">
          <ApplePassBody
            type={type}
            copy={copy}
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

        <div className="flex justify-center pb-1.5 shrink-0">
          <div className="w-[90px] h-[3px] rounded-full bg-white/25" />
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
      <div style={{background: DEVICE_CHROME.androidBody, borderColor: DEVICE_CHROME.androidBezel}} className="absolute inset-0 rounded-[36px] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.65)] border-2" />
      <div style={{background: DEVICE_CHROME.iphoneSideButton}} className="absolute -right-[2px] top-[22%] w-[2px] h-12 rounded-r-[1px]" />

      <div style={{background: DEVICE_CHROME.androidScreen}} className="absolute inset-[4px] rounded-[32px] overflow-hidden flex flex-col">
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-[9px] h-[9px] rounded-full bg-black border border-[#222]" />
        </div>
        <div className="px-5 flex justify-between items-center text-white/70 font-medium leading-none tracking-wide">
          <span className={CARD_TYPE_SCALE.xs}>9:41</span>
          <StatusIcons />
        </div>

        <div className="px-4 pt-2.5 pb-1.5 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
          </svg>
          <p className={`${CARD_TYPE_SCALE.xs} text-white/70 font-semibold tracking-[0.16em] uppercase`}>{walletLabel}</p>
        </div>

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

        <div className="flex justify-center pb-1.5 shrink-0">
          <div className="w-[90px] h-[3px] rounded-full bg-white/25" />
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
  const textColor = walletDesign?.colors?.foreground || theme.accent;

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
      {isApple ? (
        <AppleChrome {...shared} />
      ) : (
        <GoogleChrome {...shared} theme={theme} />
      )}
    </div>
  );
}

export default WalletPreviewContent;
