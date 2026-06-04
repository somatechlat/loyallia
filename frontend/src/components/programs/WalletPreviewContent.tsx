import React from 'react';
import { useI18n } from '@/lib/i18n';
import { APPLE_PASS_STYLES, CardTypeIcon, adjustColor } from './constants';
import type { WalletDesignState } from '@/components/wallet/types-v1';

/* ── Type-specific visual content for hover preview ─────────────────── */
function useTypeVisuals(t: (key: string) => string): Record<string, { title: string; headerLabel: string; headerValue: string; detail: string; visual: React.ReactNode }> {
  return {
    stamp: {
      title: t('portal.cardTypes.stamp'),
      headerLabel: t('programs.walletPreview.stamps'),
      headerValue: '3/10',
      detail: t('programs.walletPreview.stampDetail'),
      visual: (
        <div className="flex flex-wrap gap-1 mt-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className={`w-4 h-4 rounded-full border-[1.5px] ${i < 3 ? 'bg-amber-400 border-amber-500' : 'bg-white/10 border-white/20'}`} />
          ))}
        </div>
      ),
    },
    cashback: {
      title: t('portal.cardTypes.cashback'),
      headerLabel: t('programs.walletPreview.credit'),
      headerValue: '$12.50',
      detail: t('programs.walletPreview.cashbackDetail'),
      visual: <p className="text-2xl font-black mt-1 text-emerald-400">5%</p>,
    },
    coupon: {
      title: t('portal.cardTypes.coupon'),
      headerLabel: t('programs.walletPreview.offer'),
      headerValue: '$10',
      detail: t('programs.walletPreview.couponDetail'),
      visual: <p className="text-2xl font-black mt-1 text-amber-300">-$10</p>,
    },
    affiliate: {
      title: t('programs.cardTypes.affiliate'),
      headerLabel: t('programs.walletPreview.status'),
      headerValue: t('common.active').toUpperCase(),
      detail: t('programs.walletPreview.affiliateDetail'),
      visual: <p className="text-xl font-bold mt-1 text-blue-300">★ {t('programs.walletPreview.member')}</p>,
    },
    discount: {
      title: t('portal.cardTypes.discount'),
      headerLabel: t('programs.walletPreview.level'),
      headerValue: t('programs.walletPreview.gold'),
      detail: t('programs.walletPreview.discountDetail'),
      visual: (
        <div className="flex gap-1 mt-1">
          {['5%', '10%', '15%'].map(v => (
            <span key={v} className="px-1.5 py-0.5 bg-white/15 rounded-full text-[8px] font-bold">{v}</span>
          ))}
        </div>
      ),
    },
    gift_certificate: {
      title: t('portal.cardTypes.gift_certificate'),
      headerLabel: t('programs.walletPreview.balance'),
      headerValue: '$25',
      detail: t('programs.walletPreview.giftDetail'),
      visual: <p className="text-2xl font-black mt-1 text-pink-300">$25</p>,
    },
    vip_membership: {
      title: t('portal.cardTypes.vip_membership'),
      headerLabel: t('programs.walletPreview.membership'),
      headerValue: 'VIP',
      detail: t('programs.walletPreview.vipDetail'),
      visual: <p className="text-xl font-black mt-1 text-yellow-300">VIP</p>,
    },
    corporate_discount: {
      title: t('programs.cardTypes.corporate_discount'),
      headerLabel: t('programs.walletPreview.company'),
      headerValue: 'CORP',
      detail: t('programs.walletPreview.corporateDetail'),
      visual: <p className="text-xl font-bold mt-1 text-blue-200">15% Corp</p>,
    },
    referral_pass: {
      title: t('portal.cardTypes.referral_pass'),
      headerLabel: t('programs.walletPreview.referrals'),
      headerValue: '3',
      detail: t('programs.walletPreview.referralDetail'),
      visual: <p className="text-xl font-bold mt-1 text-green-300">3 {t('programs.walletPreview.invited')}</p>,
    },
    multipass: {
      title: t('portal.cardTypes.multipass'),
      headerLabel: t('programs.walletPreview.remaining'),
      headerValue: '7/10',
      detail: t('programs.walletPreview.multipassDetail'),
      visual: (
        <div className="flex gap-0.5 mt-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className={`w-3 h-6 rounded-sm ${i < 7 ? 'bg-cyan-400' : 'bg-white/10'}`} />
          ))}
        </div>
      ),
    },
  };
}

/* ── Icon resolver for card types ───────────────────────────────────── */
function resolveIcon(type: string) {
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

/**
 * @description Full phone-frame hover preview rendered per card type.
 * @param {Object} props - Component props
 * @param {string} props.type - Card type key
 * @param {import('@/components/wallet/types').WalletDesignState} [props.walletDesign] - Wallet design state
 * @returns JSX.Element | null
 */
function WalletPreviewContent({ type, walletDesign }: { type: string; walletDesign?: WalletDesignState }) {
  const { t } = useI18n();
  const TYPE_VISUALS = useTypeVisuals(t);
  const cfg = TYPE_VISUALS[type] ?? TYPE_VISUALS.stamp;
  if (!cfg) return null;
  const passStyle = APPLE_PASS_STYLES[type] || 'generic';
  const bgColor = '#1a1a2e';
  const textColor = '#ffffff';
  const gradBg = `linear-gradient(135deg, ${bgColor} 0%, ${adjustColor(bgColor, -20)} 50%, ${bgColor} 100%)`;

  const isApple = !walletDesign || walletDesign.provider === 'apple';
  const logoUrl = isApple ? walletDesign?.appleLogoUrl : walletDesign?.googleProgramLogoUrl;
  const stripUrl = isApple ? walletDesign?.appleStripUrl : walletDesign?.googleHeroImageUrl;
  const hasStrip = stripUrl && (passStyle === 'storeCard' || passStyle === 'coupon');
  const isCoupon = passStyle === 'coupon';

  return (
    <div className="flex flex-col items-center">
      {/* iPhone 15 Pro Frame — realistic with side buttons and dynamic island */}
      <div className="relative w-[220px]" style={{ aspectRatio: '393/852' }}>
        {/* Outer frame */}
        <div className="absolute inset-0 bg-[#151515] rounded-[44px] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.65)] border-[2px] border-[#2d2d2d]" />
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
          <div className="px-5 flex justify-between items-center text-[8px] text-white/40 font-medium leading-none tracking-wide">
            <span>9:41</span>
            <div className="flex gap-[3px] items-center">
              <svg className="w-[11px] h-[11px]" viewBox="0 0 24 24" fill="currentColor"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
              <svg className="w-[11px] h-[11px]" viewBox="0 0 24 24" fill="currentColor"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg>
            </div>
          </div>
          {/* Wallet header */}
          <div className="px-4 pt-2.5 pb-1">
            <p className="text-[8px] text-white/25 font-semibold tracking-[0.22em]">WALLET</p>
          </div>

          {/* Pass Card */}
          <div className="flex-1 overflow-y-auto px-3 pt-1 pb-1.5 min-h-0">
            <div
              className="rounded-[14px] overflow-hidden relative"
              style={{
                background: gradBg,
                color: textColor,
                boxShadow: '0 10px 30px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.25)',
              }}
            >
              {/* Perforated edge for coupon */}
              {isCoupon && (
                <div
                  className="absolute top-[7px] left-3 right-3 h-[2px] z-20"
                  style={{ background: `repeating-linear-gradient(90deg, ${textColor}30 0px, ${textColor}30 5px, transparent 5px, transparent 9px)` }}
                />
              )}

              {/* Strip image */}
              {hasStrip && (
                <div className="relative w-full" style={{ aspectRatio: '375/123' }}>
                  <img src={stripUrl} alt="Strip" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 h-10" style={{ background: `linear-gradient(to bottom, transparent, ${bgColor})` }} />
                </div>
              )}

              {/* Header: Logo | Title | Header Field */}
              <div className={`px-2.5 flex items-start gap-2 ${hasStrip ? 'pt-2.5 pb-1.5' : 'pt-3 pb-1.5'}`}>
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-7 h-7 rounded-md object-cover border border-white/15 shadow-sm shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-md bg-white/12 flex items-center justify-center border border-white/8 shrink-0">
                    <CardTypeIcon icon={resolveIcon(type)} className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-[7px] font-bold uppercase tracking-[0.12em] opacity-40">
                    {passStyle === 'coupon' ? t('programs.walletPreview.coupon') : passStyle === 'storeCard' ? t('programs.walletPreview.card') : t('programs.walletPreview.pass')}
                  </p>
                  <p className="text-[10px] font-bold truncate leading-tight">{cfg.title}</p>
                </div>
                <div className="text-right shrink-0 pt-0.5">
                  <p className="text-[5px] font-semibold uppercase tracking-wider opacity-30">{cfg.headerLabel}</p>
                  <p className="text-[11px] font-black">{cfg.headerValue}</p>
                </div>
              </div>

              {/* Type-specific visual */}
              <div className="px-2.5 py-1.5">
                <p className="text-[7px] opacity-50">{cfg.detail}</p>
                {cfg.visual}
              </div>

              {/* Fields */}
              <div className="px-2.5 pb-1.5 flex justify-between">
                <div>
                  <p className="text-[5px] font-semibold uppercase opacity-30">{t('customers.customer')}</p>
                  <p className="text-[8px] font-bold opacity-80">{t('scanner.defaults.customerName')}</p>
                </div>
                <div className="text-right">
                  <p className="text-[5px] font-semibold uppercase opacity-30">{t('programs.walletPreview.since')}</p>
                  <p className="text-[8px] font-bold opacity-80">2024</p>
                </div>
              </div>

              {/* QR */}
              <div className="flex justify-center pb-2">
                <div className="bg-[#ffffff]/90 rounded-lg p-1">
                  <svg width="24" height="24" viewBox="0 0 21 21">
                    <rect width="21" height="21" fill="white" rx={1} />
                    <rect x="1" y="1" width="7" height="7" fill="none" stroke="#111" strokeWidth="1.2" />
                    <rect x="3" y="3" width="3" height="3" fill="#111" />
                    <rect x="13" y="1" width="7" height="7" fill="none" stroke="#111" strokeWidth="1.2" />
                    <rect x="15" y="3" width="3" height="3" fill="#111" />
                    <rect x="1" y="13" width="7" height="7" fill="none" stroke="#111" strokeWidth="1.2" />
                    <rect x="3" y="15" width="3" height="3" fill="#111" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Home indicator */}
          <div className="flex justify-center pb-1.5 shrink-0">
            <div className="w-[90px] h-[3px] bg-white/18 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * @description Default export of the wallet preview content component.
 * @param {Object} props - Component props
 * @param {string} props.type - Card type key
 * @param {import('@/components/wallet/types').WalletDesignState} [props.walletDesign] - Wallet design state
 * @returns JSX.Element | null
 */
export default WalletPreviewContent;
