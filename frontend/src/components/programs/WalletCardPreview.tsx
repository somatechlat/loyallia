import { useState } from 'react';
import { BARCODE_TYPES, CARD_TYPES, CardTypeIcon, APPLE_PASS_STYLES, adjustColor } from './constants';

/* ─── Barcode SVG Previews ────────────────────────────────────────── */
function BarcodeSvg({ type, size = 48 }: { type: string; size?: number }) {
  if (type === 'code_128' || type === 'pdf417') {
    // Rectangular barcode
    const h = type === 'pdf417' ? size * 0.6 : size * 0.5;
    return (
      <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`}>
        <rect width={size} height={h} fill="white" rx={3} />
        {Array.from({ length: 24 }).map((_, i) => {
          const w = [2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 1, 3, 1, 2, 1, 1, 2, 3, 1, 2, 1, 1, 2][i];
          const x = i * 2 + 1;
          return <rect key={i} x={x} y={2} width={w} height={h - 4} fill="#111" />;
        })}
      </svg>
    );
  }
  if (type === 'aztec') {
    return (
      <svg width={size} height={size} viewBox="0 0 21 21">
        <rect width="21" height="21" fill="white" rx={1.5} />
        <rect x="7" y="7" width="7" height="7" fill="none" stroke="#111" strokeWidth="1" />
        <rect x="9" y="9" width="3" height="3" fill="#111" />
        <rect x="5" y="5" width="11" height="11" fill="none" stroke="#111" strokeWidth="0.7" />
        {[3,5,7,9,11,13,15,17].map(v => <rect key={`h${v}`} x={v} y={0} width="1" height="1" fill="#111" />)}
        {[3,5,7,9,11,13,15,17].map(v => <rect key={`v${v}`} x={0} y={v} width="1" height="1" fill="#111" />)}
      </svg>
    );
  }
  if (type === 'data_matrix') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16">
        <rect width="16" height="16" fill="white" rx={1} />
        <rect x="0" y="0" width="16" height="1" fill="#111" />
        <rect x="0" y="0" width="1" height="16" fill="#111" />
        {[2,4,6,8,10,12,14].map(v => <rect key={`b${v}`} x={0} y={v} width="1" height="1" fill="#111" />)}
        {[1,3,5,7,9,11,13,15].map(v => <rect key={`r${v}`} x={v} y={15} width="1" height="1" fill="#111" />)}
        {[3,5,8,10,12].map((v,i) => <rect key={`d${i}`} x={v} y={v-1} width="2" height="2" fill="#111" />)}
      </svg>
    );
  }
  // Default: QR Code
  return (
    <svg width={size} height={size} viewBox="0 0 21 21">
      <rect width="21" height="21" fill="white" rx={1.5} />
      <rect x="1" y="1" width="7" height="7" fill="none" stroke="#111" strokeWidth="1.5" />
      <rect x="3" y="3" width="3" height="3" fill="#111" />
      <rect x="13" y="1" width="7" height="7" fill="none" stroke="#111" strokeWidth="1.5" />
      <rect x="15" y="3" width="3" height="3" fill="#111" />
      <rect x="1" y="13" width="7" height="7" fill="none" stroke="#111" strokeWidth="1.5" />
      <rect x="3" y="15" width="3" height="3" fill="#111" />
      <rect x="13" y="13" width="2" height="2" fill="#111" />
      <rect x="16" y="13" width="2" height="2" fill="#111" />
      <rect x="13" y="16" width="2" height="2" fill="#111" />
      <rect x="16" y="16" width="2" height="2" fill="#111" />
    </svg>
  );
}

/* ─── Barcode Type Selector (used in Step 2) ──────────────────────── */
export function BarcodeTypeSelector({ value, onChange }: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="card p-6 space-y-4">
      <h2 className="text-base font-bold text-surface-900">Tipo de código</h2>
      <p className="text-sm text-surface-500">Selecciona el tipo de código que se mostrará en la tarjeta digital del cliente.</p>
      <div className="grid grid-cols-5 gap-2">
        {BARCODE_TYPES.map(bt => (
          <button
            key={bt.value}
            type="button"
            onClick={() => onChange(bt.value)}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200
              ${value === bt.value
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-glow'
                : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'
              }`}
            id={`barcode-type-${bt.value}`}
          >
            <div className="w-10 h-10 flex items-center justify-center">
              <BarcodeSvg type={bt.value} size={38} />
            </div>
            <span className="text-[10px] font-semibold text-surface-700 dark:text-surface-300 text-center leading-tight">{bt.label}</span>
          </button>
        ))}
      </div>
      {value && (
        <p className="text-xs text-surface-400 italic mt-1">
          {BARCODE_TYPES.find(b => b.value === value)?.desc}
        </p>
      )}
    </div>
  );
}

/* ─── Platform Toggle ─────────────────────────────────────────────── */
function PlatformToggle({ platform, onChange }: {
  platform: 'apple' | 'google';
  onChange: (p: 'apple' | 'google') => void;
}) {
  return (
    <div className="flex justify-center mb-3">
      <div className="inline-flex bg-surface-100 dark:bg-surface-800 rounded-full p-1 gap-0.5">
        <button
          type="button"
          onClick={() => onChange('apple')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200
            ${platform === 'apple'
              ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm'
              : 'text-surface-500 hover:text-surface-700'}`}
          id="toggle-apple"
        >
          <svg className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
          Apple
        </button>
        <button
          type="button"
          onClick={() => onChange('google')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200
            ${platform === 'google'
              ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm'
              : 'text-surface-500 hover:text-surface-700'}`}
          id="toggle-google"
        >
          <svg className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 12c0-4.97 4.03-9 9-9s9 4.03 9 9-4.03 9-9 9-9-4.03-9-9zm9-7c-3.87 0-7 3.13-7 7s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7z"/><path d="M12 8l4 4-4 4-1.4-1.4L13.2 12l-2.6-2.6z"/></svg>
          Google
        </button>
      </div>
    </div>
  );
}

/* ─── Apple Wallet Card (storeCard / coupon / generic) ────────────── */
function AppleWalletCard({ form, selectedType, logoPreview, stripPreview, barcodeType }: CardProps) {
  const bgColor = form.background_color || '#1a1a2e';
  const textColor = form.text_color || '#ffffff';
  const passStyle = APPLE_PASS_STYLES[form.card_type] || 'generic';
  const heroImage = stripPreview || form.strip_image_url;
  const gradBg = bgColor.startsWith('#') && bgColor.length === 7
    ? `linear-gradient(135deg, ${bgColor} 0%, ${adjustColor(bgColor, -20)} 50%, ${bgColor} 100%)`
    : bgColor;

  return (
    <div className="bg-gray-900 rounded-[3rem] p-3 shadow-2xl border-4 border-gray-800">
      <div className="bg-gray-900 rounded-[2.5rem] overflow-hidden relative">
        {/* Dynamic Island */}
        <div className="bg-black/80 px-6 py-3 flex justify-center">
          <div className="w-24 h-6 bg-black rounded-full border border-gray-800" />
        </div>
        {/* Status bar */}
        <div className="px-5 py-1 flex justify-between text-[9px] text-white/50">
          <span>9:41</span>
          <div className="flex gap-1 items-center">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg>
          </div>
        </div>
        {/* Wallet header */}
        <div className="px-4 py-1">
          <p className="text-[10px] text-white/40 font-semibold tracking-wider">WALLET</p>
        </div>
        {/* Pass card */}
        <div className="px-4 pb-6 pt-1">
          <div
            className="rounded-2xl overflow-hidden shadow-2xl relative"
            style={{ background: gradBg, color: textColor, boxShadow: `0 16px 32px -8px ${bgColor}60` }}
          >
            {/* Coupon top edge */}
            {passStyle === 'coupon' && (
              <div className="w-full h-1.5" style={{ background: `repeating-linear-gradient(90deg, transparent 0px, transparent 4px, ${textColor}20 4px, ${textColor}20 8px)` }} />
            )}
            {/* Strip/Hero image */}
            {heroImage && (passStyle === 'storeCard' || passStyle === 'coupon') && (
              <img src={heroImage} alt="Strip" className="w-full h-14 object-cover" />
            )}
            {/* Header: Logo + Org Name */}
            <div className="px-4 pt-3 flex items-center gap-2.5">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-10 h-10 rounded-xl object-cover border border-white/20 shadow" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/10">
                  <CardTypeIcon icon={selectedType?.icon || 'stamp'} className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[8px] font-bold uppercase tracking-[0.15em] opacity-50">
                  {passStyle === 'coupon' ? 'CUPÓN' : passStyle === 'storeCard' ? 'TARJETA' : 'PASE'}
                </p>
                <p className="text-sm font-bold truncate leading-tight">{form.name || 'Nombre del Programa'}</p>
              </div>
              {/* Header field (visible when stacked) */}
              <div className="text-right shrink-0">
                <p className="text-[7px] font-semibold uppercase tracking-wider opacity-40">PUNTOS</p>
                <p className="text-sm font-black">150</p>
              </div>
            </div>
            {/* Primary / Secondary Fields */}
            <div className="px-4 py-2.5 space-y-1.5">
              <div className="flex justify-between">
                <div>
                  <p className="text-[7px] font-semibold uppercase tracking-wider opacity-40">CLIENTE</p>
                  <p className="text-xs font-bold opacity-90">Juan Pérez</p>
                </div>
                <div className="text-right">
                  <p className="text-[7px] font-semibold uppercase tracking-wider opacity-40">MIEMBRO</p>
                  <p className="text-xs font-bold opacity-90">2024</p>
                </div>
              </div>
              {form.description && (
                <p className="text-[9px] opacity-50 line-clamp-1">{form.description}</p>
              )}
            </div>
            {/* Barcode */}
            <div className="flex justify-center pb-3 pt-1">
              <div className="bg-white/95 rounded-xl p-2 shadow-lg">
                <BarcodeSvg type={barcodeType} size={barcodeType === 'code_128' || barcodeType === 'pdf417' ? 100 : 56} />
              </div>
            </div>
          </div>
        </div>
        {/* Home indicator */}
        <div className="flex justify-center pb-2">
          <div className="w-28 h-1 bg-white/20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/* ─── Google Wallet Card (Material You) ───────────────────────────── */
function GoogleWalletCard({ form, selectedType, logoPreview, stripPreview, barcodeType }: CardProps) {
  const bgColor = form.background_color || '#1a1a2e';
  const textColor = form.text_color || '#ffffff';
  const heroImage = stripPreview || form.strip_image_url;

  return (
    <div className="bg-gray-900 rounded-[2.2rem] p-2.5 shadow-2xl border-4 border-gray-800">
      <div className="bg-gray-950 rounded-[1.8rem] overflow-hidden relative">
        {/* Android status bar with pill */}
        <div className="flex justify-between items-center px-5 pt-2.5 pb-1">
          <span className="text-[9px] text-white/50 font-medium">9:41</span>
          <div className="w-16 h-5 bg-black rounded-full border border-gray-800" />
          <div className="flex gap-1 items-center">
            <svg className="w-3 h-3 text-white/50" viewBox="0 0 24 24" fill="currentColor"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
            <svg className="w-3 h-3 text-white/50" viewBox="0 0 24 24" fill="currentColor"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg>
          </div>
        </div>
        {/* Google Wallet header */}
        <div className="px-4 py-1.5 flex items-center gap-2">
          <svg className="w-4 h-4 text-white/40" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
          <span className="text-[10px] text-white/40 font-medium">Google Wallet</span>
        </div>
        {/* Card */}
        <div className="px-3 pb-6 pt-1">
          <div className="rounded-3xl overflow-hidden shadow-2xl" style={{ background: bgColor, color: textColor }}>
            {/* Hero image full width */}
            {heroImage && (
              <img src={heroImage} alt="Hero" className="w-full h-16 object-cover" />
            )}
            {/* Centered logo + title */}
            <div className="flex flex-col items-center pt-4 pb-2 px-4">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-14 h-14 rounded-2xl object-cover border-2 border-white/20 shadow-lg mb-2" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center border border-white/10 mb-2">
                  <CardTypeIcon icon={selectedType?.icon || 'stamp'} className="w-7 h-7" />
                </div>
              )}
              <p className="text-base font-bold text-center leading-tight">{form.name || 'Nombre del Programa'}</p>
              <p className="text-[10px] opacity-50 mt-0.5">{selectedType?.label || 'Programa de Fidelidad'}</p>
            </div>
            {/* Info rows — Material You style */}
            <div className="px-4 py-2 space-y-2 border-t border-white/10 mx-3">
              <div className="flex justify-between">
                <span className="text-[9px] opacity-40 font-medium">Miembro</span>
                <span className="text-[10px] font-semibold">Juan Pérez</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[9px] opacity-40 font-medium">Puntos</span>
                <span className="text-[10px] font-semibold">150</span>
              </div>
              {form.description && (
                <p className="text-[9px] opacity-40 line-clamp-1 pt-1">{form.description}</p>
              )}
            </div>
            {/* Barcode */}
            <div className="flex justify-center py-3">
              <div className="bg-white rounded-2xl p-2.5 shadow">
                <BarcodeSvg type={barcodeType} size={barcodeType === 'code_128' || barcodeType === 'pdf417' ? 100 : 56} />
              </div>
            </div>
          </div>
        </div>
        {/* Android nav bar */}
        <div className="flex justify-center pb-1.5">
          <div className="w-24 h-1 bg-white/15 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/* ─── Type definitions ────────────────────────────────────────────── */
interface CardProps {
  form: {
    name: string;
    description: string;
    background_color: string;
    text_color: string;
    card_type: string;
    strip_image_url?: string;
  };
  selectedType: typeof CARD_TYPES[0] | undefined;
  logoPreview: string | null;
  stripPreview?: string | null;
  barcodeType: string;
}

/* ─── Main Wallet Preview (exported) ──────────────────────────────── */
export default function WalletCardPreview({ form, selectedType, logoPreview, stripPreview, barcodeType = 'qr_code', walletPlatform = 'apple' }: CardProps & { walletPlatform?: 'apple' | 'google' }) {
  const [platform, setPlatform] = useState(walletPlatform);

  // Sync external prop changes
  if (walletPlatform !== platform && walletPlatform !== 'apple') {
    setPlatform(walletPlatform);
  }

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <PlatformToggle platform={platform} onChange={setPlatform} />
      {platform === 'apple' ? (
        <AppleWalletCard form={form} selectedType={selectedType} logoPreview={logoPreview} stripPreview={stripPreview} barcodeType={barcodeType} />
      ) : (
        <GoogleWalletCard form={form} selectedType={selectedType} logoPreview={logoPreview} stripPreview={stripPreview} barcodeType={barcodeType} />
      )}
      <p className="text-center text-xs text-surface-400 mt-3 font-medium">
        Vista previa — {platform === 'apple' ? 'Apple Wallet' : 'Google Wallet'}
      </p>
    </div>
  );
}

