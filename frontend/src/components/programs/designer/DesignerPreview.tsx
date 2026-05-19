'use client';

import React, { useState } from 'react';
import {
  CardTypeIcon,
  APPLE_PASS_STYLES,
  GOOGLE_WALLET_TYPES,
} from '../constants';
import type { WalletDesignState } from '../WalletDesigner';

/* ─── Barcode SVG (copied from WalletCardPreview) ─────────────────── */
function BarcodeSvg({ type, size = 48 }: { type: string; size?: number }) {
  if (type === 'code_128' || type === 'pdf417') {
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
  // Default QR
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

/* ─── Template resolver ───────────────────────────────────────────── */
function resolveTemplate(value: string, ctx: Record<string, string>): string {
  return value.replace(/\{(\w+)\}/g, (_, key) => ctx[key] ?? `{${key}}`);
}

function buildContext(form: { name: string; description: string; card_type: string }, customerName?: string): Record<string, string> {
  return {
    customer_name: customerName || 'Cliente',
    program_name: form.name || 'Programa',
    description: form.description || '',
    stamp_count: '0', stamps_required: '10',
    reward_description: 'Recompensa especial',
    cashback_balance: '0.00', cashback_percentage: '5',
    discount_tier: 'Bronce', discount_percentage: '5',
    gift_balance: '0.00',
    customerName: customerName || 'Cliente',
    enrolled_date: '01/01/2025',
    expiry_days: '365',
  };
}

/* ════════════════════════════════════════════════════════════════════
   FLAT APPLE PASS CARD — No phone frame, just the card
   ════════════════════════════════════════════════════════════════════ */
function AppleFlatCard({
  form, selectedType, walletDesign, barcodeType, customerName,
}: {
  form: { name: string; description: string; background_color: string; text_color: string; card_type: string; strip_image_url?: string };
  selectedType?: { icon: string; label: string };
  walletDesign?: WalletDesignState;
  barcodeType: string;
  customerName?: string;
}) {
  const bgColor = form.background_color || '#1a1a2e';
  const textColor = form.text_color || '#ffffff';
  const passStyle = APPLE_PASS_STYLES[form.card_type] || 'generic';
  const heroImage = walletDesign?.appleStripUrl || walletDesign?.appleStrip2xUrl || form.strip_image_url;
  const hasStrip = heroImage && (passStyle === 'storeCard' || passStyle === 'coupon');
  const ctx = buildContext(form, customerName);

  const appleFields = walletDesign?.appleFields;
  const headerFields = appleFields?.headerFields?.length ? appleFields.headerFields : undefined;
  const primaryFields = appleFields?.primaryFields?.length ? appleFields.primaryFields : undefined;
  const secondaryFields = appleFields?.secondaryFields?.length ? appleFields.secondaryFields : undefined;
  const auxiliaryFields = appleFields?.auxiliaryFields?.length ? appleFields.auxiliaryFields : undefined;

  const defaultHeader = {
    stamp: { label: 'SELLOS', value: '0/10' },
    cashback: { label: 'SALDO', value: '$0.00' },
    coupon: { label: 'OFERTA', value: 'Cupón' },
  }[form.card_type] || { label: 'PROGRAMA', value: form.name?.slice(0, 8) || '—' };

  const defaultPrimary = {
    stamp: { label: 'Sellos acumulados', value: '0 / 10' },
    cashback: { label: 'Saldo disponible', value: '$0.00' },
    coupon: { label: form.description || 'Descuento especial', value: '20% OFF' },
  }[form.card_type] || { label: '', value: '—' };

  const defaultAux = [
    { label: 'CLIENTE', value: customerName || 'Cliente' },
    { label: 'VÁLIDO HASTA', value: '31/12/2026' },
  ];

  return (
    <div className="w-[320px] rounded-2xl overflow-hidden shadow-2xl flex flex-col" style={{ background: bgColor, color: textColor }}>
      {/* Strip image */}
      {hasStrip && heroImage && (
        <div className="relative w-full" style={{ aspectRatio: '375/123' }}>
          <img src={heroImage} alt="Strip" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-12" style={{ background: `linear-gradient(to bottom, transparent, ${bgColor})` }} />
        </div>
      )}

      {/* Header */}
      <div className={`px-4 flex items-center gap-3 ${hasStrip ? 'pt-3 pb-2' : 'pt-4 pb-2'}`}>
        {(walletDesign?.appleLogoUrl || walletDesign?.appleLogo2xUrl) ? (
          <div className="w-[60px] h-[22px] rounded overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
            <img src={walletDesign?.appleLogoUrl || walletDesign?.appleLogo2xUrl} alt="Logo" className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center shrink-0">
            <CardTypeIcon icon={selectedType?.icon || 'stamp'} className="w-4 h-4" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold truncate">{form.name || 'Programa'}</p>
        </div>
        {headerFields ? (
          <div className="flex gap-3 shrink-0">
            {headerFields.slice(0, 3).map((f, i) => (
              <div key={f.key || i} className="text-right">
                <p className="text-[9px] font-semibold uppercase tracking-wider opacity-30 truncate max-w-[60px]">{f.label}</p>
                <p className="text-xs font-black truncate max-w-[60px]">{resolveTemplate(f.value, ctx)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-right shrink-0">
            <p className="text-[9px] font-semibold uppercase tracking-wider opacity-30">{defaultHeader.label}</p>
            <p className="text-xs font-black">{defaultHeader.value}</p>
          </div>
        )}
      </div>

      {/* Primary */}
      <div className="px-4 pt-1 pb-1">
        {primaryFields ? primaryFields.map((f, i) => (
          <div key={f.key || i}>
            <p className="text-[9px] font-semibold uppercase tracking-wider opacity-35 mb-1 truncate">{f.label}</p>
            <p className="text-[26px] font-black leading-none tracking-tight truncate">{resolveTemplate(f.value, ctx)}</p>
          </div>
        )) : (
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider opacity-35 mb-1 truncate">{defaultPrimary.label}</p>
            <p className="text-[26px] font-black leading-none tracking-tight truncate">{defaultPrimary.value}</p>
          </div>
        )}
      </div>

      {/* Secondary */}
      {secondaryFields && secondaryFields.length > 0 && (
        <div className="px-4 pt-2 pb-1">
          <div className="grid grid-cols-4 gap-2">
            {secondaryFields.slice(0, 4).map((f, i) => (
              <div key={f.key || i} className="min-w-0">
                <p className="text-[8px] font-semibold uppercase tracking-wider opacity-30 truncate">{f.label}</p>
                <p className="text-xs font-semibold opacity-85 truncate">{resolveTemplate(f.value, ctx)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auxiliary */}
      <div className={`px-4 pb-2 ${secondaryFields && secondaryFields.length > 0 ? 'pt-1' : 'pt-2'}`}>
        <div className="grid grid-cols-4 gap-2">
          {(auxiliaryFields || defaultAux).slice(0, 4).map((f: any, i: number) => (
            <div key={f.key || i} className="min-w-0">
              <p className="text-[7px] font-semibold uppercase tracking-wider opacity-30 truncate">{f.label}</p>
              <p className="text-xs font-semibold opacity-85 truncate">{resolveTemplate(f.value, ctx)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Barcode */}
      <div className="px-4 pb-3 pt-2 mt-auto">
        <div className="bg-white rounded-lg p-2 shadow-sm flex flex-col items-center gap-1">
          <BarcodeSvg type={barcodeType} size={barcodeType === 'code_128' || barcodeType === 'pdf417' ? 72 : 42} />
          <span className="text-[7px] text-black/40 font-mono tracking-wider">0000 0000 0000</span>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   FLAT GOOGLE PASS CARD — No phone frame
   ════════════════════════════════════════════════════════════════════ */
function GoogleFlatCard({
  form, selectedType, walletDesign, barcodeType, customerName,
}: {
  form: { name: string; description: string; background_color: string; text_color: string; card_type: string; strip_image_url?: string };
  selectedType?: { icon: string; label: string };
  walletDesign?: WalletDesignState;
  barcodeType: string;
  customerName?: string;
}) {
  const bgColor = form.background_color || '#1a1a2e';
  const textColor = form.text_color || '#ffffff';
  const heroImage = walletDesign?.googleHeroImageUrl || form.strip_image_url;
  const logoImage = walletDesign?.googleProgramLogoUrl;

  const defaultRows = [
    { label: 'Miembro', value: customerName || 'Cliente' },
    { label: GOOGLE_WALLET_TYPES[form.card_type]?.label || 'Programa', value: form.name || 'Programa' },
  ];

  return (
    <div className="w-[320px] rounded-[28px] overflow-hidden shadow-2xl flex flex-col" style={{ background: bgColor, color: textColor }}>
      {/* Hero */}
      {heroImage && (
        <div className="relative w-full" style={{ aspectRatio: '16/7' }}>
          <img src={heroImage} alt="Hero" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-10" style={{ background: `linear-gradient(to bottom, transparent, ${bgColor})` }} />
        </div>
      )}

      {/* Logo */}
      <div className="flex justify-center px-4 relative z-10" style={{ marginTop: heroImage ? -28 : 16 }}>
        <div className="w-14 h-14 rounded-[18px] overflow-hidden border-2 border-white/10 shadow-lg bg-neutral-900">
          {logoImage ? (
            <img src={logoImage} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/10">
              <CardTypeIcon icon={selectedType?.icon || 'stamp'} className="w-7 h-7" />
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="px-4 pt-2 pb-1 text-center">
        <p className="text-base font-bold truncate">{form.name || 'Programa'}</p>
        <p className="text-xs opacity-40 mt-0.5 font-medium truncate">{selectedType?.label || 'Programa de Fidelidad'}</p>
      </div>

      {/* Rows */}
      <div className="px-3 pt-1 pb-1">
        {defaultRows.map((row, i) => (
          <div key={i}>
            <div className="flex justify-between items-baseline py-2">
              <span className="text-xs opacity-35 font-medium truncate">{row.label}</span>
              <span className="text-sm font-semibold text-right truncate">{row.value}</span>
            </div>
            {i < defaultRows.length - 1 && <div className="h-px bg-white/10" />}
          </div>
        ))}
      </div>

      {/* Barcode */}
      <div className="px-3 pb-3 pt-1 mt-auto">
        <div className="bg-white rounded-2xl p-2 shadow-sm flex flex-col items-center gap-1">
          <BarcodeSvg type={barcodeType} size={barcodeType === 'code_128' || barcodeType === 'pdf417' ? 72 : 42} />
          <span className="text-[7px] text-black/40 font-mono tracking-wider">0000 0000 0000</span>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   MAIN DESIGNER PREVIEW COMPONENT
   ════════════════════════════════════════════════════════════════════ */
interface DesignerPreviewProps {
  platform: 'apple' | 'google';
  form: { name: string; description: string; background_color: string; text_color: string; card_type: string; strip_image_url?: string };
  selectedType?: { icon: string; label: string };
  walletDesign?: WalletDesignState;
  barcodeType: string;
  customerName?: string;
  activeSection?: string;
  onZoneClick?: (section: string) => void;
}

export default function DesignerPreview({
  platform,
  form,
  selectedType,
  walletDesign,
  barcodeType,
  customerName,
}: DesignerPreviewProps) {
  const [viewMode, setViewMode] = useState<'flat' | 'phone'>('flat');
  const [showBack, setShowBack] = useState(false);

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {/* Platform tabs below preview */}
      <div className="flex items-center gap-2">
        <div className="inline-flex bg-surface-200 dark:bg-surface-700 rounded-full p-1">
          <span className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${platform === 'apple' ? 'bg-white dark:bg-surface-600 shadow-sm' : 'text-surface-500'}`}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            Apple
          </span>
          <span className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${platform === 'google' ? 'bg-white dark:bg-surface-600 shadow-sm' : 'text-surface-500'}`}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C6.477 2 1.545 6.932 1.545 13s4.932 11 11 11c6.068 0 11-4.932 11-11 0-.73-.074-1.44-.213-2.128H12.545z"/></svg>
            Google
          </span>
        </div>
      </div>

      {/* The Card */}
      <div className="relative">
        {platform === 'apple' ? (
          <AppleFlatCard
            form={form}
            selectedType={selectedType}
            walletDesign={walletDesign}
            barcodeType={barcodeType}
            customerName={customerName}
          />
        ) : (
          <GoogleFlatCard
            form={form}
            selectedType={selectedType}
            walletDesign={walletDesign}
            barcodeType={barcodeType}
            customerName={customerName}
          />
        )}
      </div>

      {/* View controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowBack(!showBack)}
          className="text-xs text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 1l4 4-4 4"/>
            <path d="M3 11V9a4 4 0 014-4h14"/>
            <path d="M7 23l-4-4 4-4"/>
            <path d="M21 13v2a4 4 0 01-4 4H3"/>
          </svg>
          {showBack ? 'Ver frente' : 'Ver atrás'}
        </button>
        <div className="w-px h-4 bg-surface-300 dark:bg-surface-600" />
        <button
          onClick={() => setViewMode(viewMode === 'flat' ? 'phone' : 'flat')}
          className="text-xs text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
            <line x1="12" y1="18" x2="12.01" y2="18"/>
          </svg>
          {viewMode === 'flat' ? 'Modo teléfono' : 'Modo tarjeta'}
        </button>
      </div>
    </div>
  );
}
