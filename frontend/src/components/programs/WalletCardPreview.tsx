import { useState, useEffect } from 'react';
import { BARCODE_TYPES, CARD_TYPES, CardTypeIcon, APPLE_PASS_STYLES, GOOGLE_WALLET_TYPES, APPLE_IMAGE_SUPPORT } from './constants';

/* ─── Barcode SVG Previews ────────────────────────────────────────── */
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
  if (type === 'data_matrix') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16">
        <rect width="16" height="16" fill="white" rx={1} />
        <rect x="0" y="0" width="16" height="1" fill="#111" />
        <rect x="0" y="0" width="1" height="16" fill="#111" />
        {[2,4,6,8,10,12,14].map(v => <rect key={`b${v}`} x={0} y={v} width="1" height="1" fill="#111" />)}
        {[1,3,5,7,9,11,13,15].map(v => <rect key={`r${v}`} x={v} y="15" width="1" height="1" fill="#111" />)}
        {[3,5,8,10,12].map((v,i) => <rect key={`d${i}`} x={v} y={v-1} width="2" height="2" fill="#111" />)}
      </svg>
    );
  }
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
      <h2 className="text-base font-bold text-surface-900 dark:text-white">Tipo de código</h2>
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

export interface AppleWalletFeatureConfig {
  nfc_enabled: boolean;
  nfc_requires_authentication: boolean;
}

export function WalletProviderSelector({
  value,
  onChange,
  appleConfig,
  onAppleConfigChange,
  cardType,
}: {
  value: 'apple' | 'google';
  onChange: (provider: 'apple' | 'google') => void;
  appleConfig: AppleWalletFeatureConfig;
  onAppleConfigChange: (config: AppleWalletFeatureConfig) => void;
  cardType: string;
}) {
  const applePassStyle = APPLE_PASS_STYLES[cardType] || 'generic';

  return (
    <div className="card p-6 space-y-4">
      <div>
        <h2 className="text-base font-bold text-surface-900 dark:text-white">Billetera digital</h2>
        <p className="text-sm text-surface-500">
          Selecciona la plataforma principal para esta tarjeta. La vista previa y la entrega publica seguiran esta seleccion.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange('apple')}
          className={`text-left rounded-xl border-2 p-4 transition-all ${
            value === 'apple'
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-glow'
              : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'
          }`}
          id="wallet-provider-apple"
        >
          <span className="block text-sm font-bold text-surface-900 dark:text-white">Apple Wallet</span>
          <span className="block text-xs text-surface-500 mt-1">PKPass firmado para iPhone y Apple Wallet.</span>
        </button>
        <button
          type="button"
          onClick={() => onChange('google')}
          className={`text-left rounded-xl border-2 p-4 transition-all ${
            value === 'google'
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-glow'
              : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'
          }`}
          id="wallet-provider-google"
        >
          <span className="block text-sm font-bold text-surface-900 dark:text-white">Google Wallet</span>
          <span className="block text-xs text-surface-500 mt-1">Usa el flujo Google Wallet existente sin cambios.</span>
        </button>
      </div>

      {value === 'apple' && (
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 p-4 space-y-3 bg-surface-50 dark:bg-surface-900/40">
          <div className="flex justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-surface-900 dark:text-white">Estilo Apple Pass</p>
              <p className="text-xs text-surface-500">Derivado del tipo de programa: <span className="font-mono text-brand-600">{applePassStyle}</span></p>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-600 bg-brand-100 dark:bg-brand-900/30 rounded-full px-2 py-1 h-fit">
              PKPass
            </span>
          </div>

          <div className="text-xs text-surface-500 bg-surface-100 dark:bg-surface-800 rounded-lg p-2.5">
            <p className="font-semibold text-surface-700 dark:text-surface-300 mb-1">Imagen:</p>
            {APPLE_IMAGE_SUPPORT[applePassStyle]?.strip
              ? <p><span className="font-medium">strip.png</span> — imagen panorámica (375x123pt). Visible en iPhone.</p>
              : <p><span className="font-medium">thumbnail.png</span> — miniatura (90x90pt). Visible en iPhone.</p>
            }
            <p className="mt-1 opacity-70">Apple Watch: las imagenes no se muestran.</p>
          </div>

          <label className="flex items-start justify-between gap-4">
            <span>
              <span className="block text-xs font-semibold text-surface-800 dark:text-surface-100">Activar NFC Apple</span>
              <span className="block text-xs text-surface-500">Solo funciona si Apple aprobo NFC y la clave publica NFC esta en Vault.</span>
            </span>
            <input
              type="checkbox"
              className="mt-1 w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-500"
              checked={appleConfig.nfc_enabled}
              onChange={e => onAppleConfigChange({ ...appleConfig, nfc_enabled: e.target.checked })}
              id="apple-nfc-enabled"
            />
          </label>

          <label className={`flex items-start justify-between gap-4 ${!appleConfig.nfc_enabled ? 'opacity-50' : ''}`}>
            <span>
              <span className="block text-xs font-semibold text-surface-800 dark:text-surface-100">Requerir autenticacion para NFC</span>
              <span className="block text-xs text-surface-500">Solicita Face ID, Touch ID o codigo antes de presentar NFC.</span>
            </span>
            <input
              type="checkbox"
              className="mt-1 w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-500"
              checked={appleConfig.nfc_requires_authentication}
              disabled={!appleConfig.nfc_enabled}
              onChange={e => onAppleConfigChange({ ...appleConfig, nfc_requires_authentication: e.target.checked })}
              id="apple-nfc-auth-required"
            />
          </label>
        </div>
      )}

      {value === 'google' && (
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 p-4 space-y-3 bg-surface-50 dark:bg-surface-900/40">
          <div className="flex justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-surface-900 dark:text-white">Tipo Google Wallet</p>
              <p className="text-xs text-surface-500">
                <span className="font-mono text-brand-600">{GOOGLE_WALLET_TYPES[cardType]?.type || 'LoyaltyClass'}</span>
                {' — '}{GOOGLE_WALLET_TYPES[cardType]?.label || 'Programa'}
              </p>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-green-600 bg-green-100 dark:bg-green-900/30 rounded-full px-2 py-1 h-fit">
              JWT
            </span>
          </div>
          <div className="text-xs text-surface-500 bg-surface-100 dark:bg-surface-800 rounded-lg p-2.5">
            <p className="font-semibold text-surface-700 dark:text-surface-300 mb-1">Hero Image:</p>
            <p>Imagen de ancho completo soportada en todos los tipos Google.</p>
            <p className="mt-1">Layout: <span className="font-mono">cardTemplateOverride</span> con filas de 1-3 campos.</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   APPLE WALLET CARD — Pixel-perfect PassKit preview
   Based on official Apple WalletCompanionFiles sample passes
   ════════════════════════════════════════════════════════════════════ */
function AppleWalletCard({ form, selectedType, logoPreview, stripPreview, barcodeType, customerName }: CardProps) {
  const bgColor = form.background_color || '#1a1a2e';
  const textColor = form.text_color || '#ffffff';
  const passStyle = APPLE_PASS_STYLES[form.card_type] || 'generic';
  const heroImage = stripPreview || form.strip_image_url;
  const hasStrip = heroImage && (passStyle === 'storeCard' || passStyle === 'coupon');
  const isCoupon = passStyle === 'coupon';
  const isGeneric = passStyle === 'generic';

  /* ── Per-type field data (mirrors real pass.json structure) ── */
  const primaryField: { label: string; value: string } = {
    stamp:             { label: 'Sellos acumulados', value: '0 / 10' },
    cashback:          { label: 'Saldo disponible', value: '$0.00' },
    coupon:            { label: form.description || 'Descuento especial', value: '20% OFF' },
    vip_membership:    { label: 'Membresía', value: 'Club VIP' },
    referral_pass:     { label: 'Tu código de referido', value: 'REF-XXXX' },
    discount:          { label: 'Descuento actual', value: '5%' },
    gift_certificate:  { label: 'Saldo del regalo', value: '$0.00' },
    affiliate:         { label: 'Programa', value: form.name || 'Afiliación' },
    corporate_discount:{ label: 'Descuento corporativo', value: '0%' },
    multipass:         { label: 'Usos restantes', value: '10' },
  }[form.card_type] || { label: '', value: '—' };

  const auxiliaryFields: { label: string; value: string }[] = [
    { label: 'CLIENTE', value: customerName || 'Cliente' },
    { label: 'VÁLIDO HASTA', value: '31/12/2026' },
  ];

  const headerValue: Record<string, string> = {
    stamp: '0/10', cashback: '$0.00', coupon: 'Cupón', vip_membership: 'VIP',
    referral_pass: '0', discount: 'Bronce', gift_certificate: '$0',
    affiliate: form.name?.slice(0, 6) || '—', corporate_discount: '0%', multipass: '10/10',
  };

  const headerLabel: Record<string, string> = {
    stamp: 'SELLOS', cashback: 'SALDO', coupon: 'OFERTA', vip_membership: 'NIVEL',
    referral_pass: 'REFERIDOS', discount: 'NIVEL', gift_certificate: 'SALDO',
    affiliate: 'PROGRAMA', corporate_discount: 'DESC.', multipass: 'USOS',
  };

  return (
    <div className="relative mx-auto w-full max-w-[240px]" style={{ aspectRatio: '393/852' }}>
      {/* ── iPhone 15 Pro frame ── */}
      <div className="absolute inset-0 bg-[#151515] rounded-[44px] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.65)] border-[2px] border-[#2d2d2d]" />
      {/* Side buttons */}
      <div className="absolute -left-[2px] top-[14.5%] w-[2px] h-6 bg-[#3a3a3a] rounded-l-[1px]" />
      <div className="absolute -left-[2px] top-[19.5%] w-[2px] h-10 bg-[#3a3a3a] rounded-l-[1px]" />
      <div className="absolute -left-[2px] top-[27%] w-[2px] h-10 bg-[#3a3a3a] rounded-l-[1px]" />
      <div className="absolute -right-[2px] top-[19%] w-[2px] h-14 bg-[#3a3a3a] rounded-r-[1px]" />

      {/* ── Screen ── */}
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

        {/* ── Pass Card ── */}
        <div className="flex-1 overflow-y-auto px-3 pt-1 pb-1.5 min-h-0">
          <div
            className="rounded-[14px] overflow-hidden relative"
            style={{
              background: bgColor,
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

            {/* Strip image — Apple spec: 375×123pt */}
            {hasStrip && (
              <div className="relative w-full" style={{ aspectRatio: '375/123' }}>
                <img src={heroImage} alt="Strip" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 h-10" style={{ background: `linear-gradient(to bottom, transparent, ${bgColor})` }} />
              </div>
            )}

            {/* ── Header: Logo | Org Name | Header Field ── */}
            <div className={`px-3 flex items-start gap-2 ${hasStrip ? 'pt-2.5 pb-1.5' : 'pt-3 pb-1.5'}`}>
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-7 h-7 rounded-md object-cover border border-white/15 shadow-sm shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-md bg-white/12 flex items-center justify-center border border-white/8 shrink-0">
                  <CardTypeIcon icon={selectedType?.icon || 'stamp'} className="w-3.5 h-3.5" />
                </div>
              )}
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-[10px] font-bold truncate leading-tight">{form.name || 'Nombre del Programa'}</p>
              </div>
              {headerValue[form.card_type] && (
                <div className="text-right shrink-0 pt-0.5">
                  <p className="text-[5px] font-semibold uppercase tracking-[0.1em] opacity-30 leading-none mb-0.5">{headerLabel[form.card_type]}</p>
                  <p className="text-[11px] font-black leading-none">{headerValue[form.card_type]}</p>
                </div>
              )}
              {/* Thumbnail — generic only (90×90pt per Apple docs) */}
              {isGeneric && heroImage && (
                <img src={heroImage} alt="Thumbnail" className="w-9 h-9 rounded-md object-cover border border-white/15 shadow-sm shrink-0" />
              )}
            </div>

            {/* ── Primary Field — label above, large value below ── */}
            <div className="px-3 pt-1 pb-1">
              <p className="text-[6px] font-semibold uppercase tracking-[0.1em] opacity-35 leading-none mb-1">
                {primaryField.label}
              </p>
              <p className="text-[20px] font-black leading-none tracking-tight">
                {primaryField.value}
              </p>
            </div>

            {/* ── Auxiliary / Secondary Fields ── */}
            <div className="px-3 pt-2 pb-2 flex justify-between gap-2">
              {auxiliaryFields.map((f, i) => (
                <div key={i} className={i === 1 ? 'text-right' : ''}>
                  <p className="text-[5px] font-semibold uppercase tracking-[0.1em] opacity-30 leading-none mb-0.5">{f.label}</p>
                  <p className="text-[9px] font-semibold opacity-85 leading-tight">{f.value}</p>
                </div>
              ))}
            </div>

            {/* ── Barcode — white rounded container per Apple spec ── */}
            <div className="px-3 pb-2.5 pt-0.5">
              <div className="bg-white rounded-lg p-1.5 shadow-sm flex flex-col items-center gap-0.5">
                <BarcodeSvg type={barcodeType} size={barcodeType === 'code_128' || barcodeType === 'pdf417' ? 68 : 38} />
                <span className="text-[6px] text-black/40 font-mono tracking-wider">0000 0000 0000</span>
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
  );
}

/* ════════════════════════════════════════════════════════════════════
   GOOGLE WALLET CARD — Pixel-perfect Material You preview
   Based on Google Wallet API cardTemplateOverride spec
   ════════════════════════════════════════════════════════════════════ */
function GoogleWalletCard({ form, selectedType, logoPreview, stripPreview, barcodeType, customerName }: CardProps) {
  const bgColor = form.background_color || '#1a1a2e';
  const textColor = form.text_color || '#ffffff';
  const heroImage = stripPreview || form.strip_image_url;

  const rows: { label: string; value: string }[] = [
    { label: 'Miembro', value: customerName || 'Cliente' },
  ];

  switch (form.card_type) {
    case 'stamp':             rows.push({ label: 'Sellos', value: '0 / 10' }); break;
    case 'cashback':          rows.push({ label: 'Saldo', value: '$0.00' }); break;
    case 'coupon':            rows.push({ label: 'Descuento', value: form.description || 'Especial' }); break;
    case 'vip_membership':    rows.push({ label: 'Nivel', value: 'Club VIP' }); break;
    case 'referral_pass':     rows.push({ label: 'Código', value: 'REF-XXXX' }); break;
    case 'discount':          rows.push({ label: 'Descuento actual', value: '5%' }); break;
    case 'gift_certificate':  rows.push({ label: 'Saldo', value: '$0.00' }); break;
    case 'affiliate':         rows.push({ label: 'Programa', value: form.name || 'Afiliación' }); break;
    case 'corporate_discount':rows.push({ label: 'Descuento', value: '0%' }); break;
    case 'multipass':         rows.push({ label: 'Usos restantes', value: '10' }); break;
  }

  rows.push({ label: 'Tipo', value: GOOGLE_WALLET_TYPES[form.card_type]?.label || 'Programa' });

  return (
    <div className="relative mx-auto w-full max-w-[240px]" style={{ aspectRatio: '412/915' }}>
      {/* ── Pixel 7 Pro frame ── */}
      <div className="absolute inset-0 bg-[#151515] rounded-[40px] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.65)] border-[2px] border-[#2d2d2d]" />
      <div className="absolute -left-[2px] top-[13%] w-[2px] h-9 bg-[#3a3a3a] rounded-l-[1px]" />
      <div className="absolute -left-[2px] top-[22%] w-[2px] h-9 bg-[#3a3a3a] rounded-l-[1px]" />
      <div className="absolute -right-[2px] top-[18%] w-[2px] h-12 bg-[#3a3a3a] rounded-r-[1px]" />

      {/* ── Screen ── */}
      <div className="absolute inset-[4px] bg-[#0a0a0a] rounded-[36px] overflow-hidden flex flex-col">
        {/* Status bar */}
        <div className="flex justify-between items-center px-4 pt-2.5 pb-1">
          <span className="text-[8px] text-white/40 font-medium">9:41</span>
          <div className="flex gap-[3px] items-center">
            <svg className="w-[11px] h-[11px] text-white/40" viewBox="0 0 24 24" fill="currentColor"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
            <svg className="w-[11px] h-[11px] text-white/40" viewBox="0 0 24 24" fill="currentColor"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg>
          </div>
        </div>
        {/* Google Wallet header */}
        <div className="px-3.5 py-1 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-white/30" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
          <span className="text-[9px] text-white/30 font-medium">Google Wallet</span>
        </div>

        {/* ── Card ── */}
        <div className="flex-1 overflow-y-auto px-2.5 pt-1 pb-1.5 min-h-0">
          <div
            className="rounded-[28px] overflow-hidden relative"
            style={{
              background: bgColor,
              color: textColor,
              boxShadow: '0 8px 24px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.2)',
            }}
          >
            {/* Hero image */}
            {heroImage && (
              <div className="relative w-full" style={{ aspectRatio: '16/7' }}>
                <img src={heroImage} alt="Hero" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 h-10" style={{ background: `linear-gradient(to bottom, transparent, ${bgColor})` }} />
              </div>
            )}

            {/* Logo — centered, overlapping hero image */}
            <div className="flex flex-col items-center px-4 relative z-10" style={{ marginTop: heroImage ? '-20px' : '12px' }}>
              <div className="w-14 h-14 rounded-[18px] overflow-hidden border-[1.5px] border-white/15 shadow-lg bg-[#1a1a1a]">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/10">
                    <CardTypeIcon icon={selectedType?.icon || 'stamp'} className="w-7 h-7" />
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <div className="px-4 pt-2 pb-1 text-center">
              <p className="text-[13px] font-bold leading-tight">{form.name || 'Nombre del Programa'}</p>
              <p className="text-[8px] opacity-40 mt-0.5 font-medium">{selectedType?.label || 'Programa de Fidelidad'}</p>
            </div>

            {/* Info rows — Material You style */}
            <div className="px-3 pt-1.5 pb-1">
              {rows.map((row, i) => (
                <div key={i}>
                  <div className="flex justify-between items-baseline py-[5px]">
                    <span className="text-[8px] opacity-35 font-medium">{row.label}</span>
                    <span className="text-[10px] font-semibold text-right max-w-[60%] truncate">{row.value}</span>
                  </div>
                  {i < rows.length - 1 && <div className="h-px bg-white/10" />}
                </div>
              ))}
              {form.description && (
                <>
                  <div className="h-px bg-white/10" />
                  <p className="text-[8px] opacity-30 line-clamp-2 pt-[5px] pb-[3px]">{form.description}</p>
                </>
              )}
            </div>

            {/* Barcode — white rounded container */}
            <div className="px-3 pb-3 pt-0.5">
              <div className="bg-white rounded-2xl p-2 shadow-sm flex flex-col items-center gap-1">
                <BarcodeSvg type={barcodeType} size={barcodeType === 'code_128' || barcodeType === 'pdf417' ? 68 : 38} />
                <span className="text-[6px] text-black/40 font-mono tracking-wider">0000 0000 0000</span>
              </div>
            </div>
          </div>
        </div>

        {/* Android nav bar */}
        <div className="flex justify-center pb-1.5 shrink-0">
          <div className="w-[100px] h-[3px] bg-white/12 rounded-full" />
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
  customerName?: string;
}

/* ─── Main Wallet Preview (exported) ──────────────────────────────── */
export default function WalletCardPreview({
  form,
  selectedType,
  logoPreview,
  stripPreview,
  barcodeType = 'qr_code',
  walletPlatform = 'apple',
  onWalletPlatformChange,
  customerName,
}: CardProps & {
  walletPlatform?: 'apple' | 'google';
  onWalletPlatformChange?: (platform: 'apple' | 'google') => void;
  customerName?: string;
}) {
  const [platform, setPlatform] = useState(walletPlatform);

  useEffect(() => {
    if (walletPlatform !== platform) {
      setPlatform(walletPlatform);
    }
  }, [walletPlatform, platform]);

  const handlePlatformChange = (next: 'apple' | 'google') => {
    setPlatform(next);
    onWalletPlatformChange?.(next);
  };

  return (
    <div className="relative w-full max-w-[320px]">
      <PlatformToggle platform={platform} onChange={handlePlatformChange} />
      {platform === 'apple' ? (
        <AppleWalletCard form={form} selectedType={selectedType} logoPreview={logoPreview} stripPreview={stripPreview} barcodeType={barcodeType} customerName={customerName} />
      ) : (
        <GoogleWalletCard form={form} selectedType={selectedType} logoPreview={logoPreview} stripPreview={stripPreview} barcodeType={barcodeType} customerName={customerName} />
      )}
      <p className="text-center text-xs text-surface-400 mt-3 font-medium">
        Vista previa — {platform === 'apple' ? 'Apple Wallet' : 'Google Wallet'}
      </p>
    </div>
  );
}
