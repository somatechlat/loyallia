import { useState, useEffect } from 'react';
import {
  BARCODE_TYPES,
  CARD_TYPES,
  CardTypeIcon,
  APPLE_PASS_STYLES,
  GOOGLE_WALLET_TYPES,
  APPLE_IMAGE_SUPPORT,
} from './constants';
import type { WalletDesignState } from './WalletDesigner';

/* ─── Barcode SVG Previews ────────────────────────────────────────── */
export function BarcodeSvg({ type, size = 48 }: { type: string; size?: number }) {
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

/* ─── Big Platform Toggle (above phone preview only) ──────────────── */
function PlatformToggle({ platform, onChange }: {
  platform: 'apple' | 'google';
  onChange: (p: 'apple' | 'google') => void;
}) {
  return (
    <div className="flex justify-center mb-4">
      <div className="inline-flex bg-surface-200 dark:bg-surface-700 rounded-full p-1.5 gap-1">
        <button
          type="button"
          onClick={() => onChange('apple')}
          className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-2
            ${platform === 'apple'
              ? 'bg-white dark:bg-surface-600 text-surface-900 dark:text-white shadow-md'
              : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'}`}
          id="toggle-apple"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
          Apple Wallet
        </button>
        <button
          type="button"
          onClick={() => onChange('google')}
          className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-2
            ${platform === 'google'
              ? 'bg-white dark:bg-surface-600 text-surface-900 dark:text-white shadow-md'
              : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'}`}
          id="toggle-google"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C6.477 2 1.545 6.932 1.545 13s4.932 11 11 11c6.068 0 11-4.932 11-11 0-.73-.074-1.44-.213-2.128H12.545z"/></svg>
          Google Wallet
        </button>
      </div>
    </div>
  );
}

/* ─── Wallet Provider Selector ────────────────────────────────────── */
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

/* ─── Template resolver for preview values ────────────────────────── */
function resolveTemplate(value: string, ctx: Record<string, string>): string {
  return value.replace(/\{(\w+)\}/g, (_, key) => ctx[key] ?? `{${key}}`);
}

function buildContext(form: CardProps['form'], customerName?: string): Record<string, string> {
  return {
    customer_name: customerName || 'Cliente',
    program_name: form.name || 'Programa',
    description: form.description || '',
    stamp_count: '0',
    stamps_required: '10',
    reward_description: 'Recompensa especial',
    cashback_balance: '0.00',
    cashback_percentage: '5',
    membership_tier: 'Club VIP',
    referral_code: 'REF-XXXX',
    referrals_made: '0',
    discount_percentage: '5',
    discount_tier: 'Bronce',
    gift_balance: '0.00',
    affiliate_code: 'AFIL-001',
    enrolled_date: '01/01/2025',
    benefits: 'Beneficios exclusivos',
    company_name: 'Empresa',
    corporate_discount: '10',
    multipass_remaining: '10',
    bundle_size: '10',
    bundle_price: '25.00',
    stamp_display: '0 / 10',
    perks: 'Acceso prioritario',
    expiry_days: '365',
    tiers_list: 'Bronce 5%, Plata 10%, Oro 15%',
  };
}

function getGoogleSampleValue(fieldPath: string, ctx: Record<string, string>): string {
  const map: Record<string, string> = {
    'object.accountName': ctx.customer_name || 'Cliente',
    'object.loyaltyPoints.balance': '1,250',
    'object.loyaltyPoints.label': 'Puntos',
    'object.secondaryLoyaltyPoints.balance': '500',
    'object.secondaryLoyaltyPoints.label': 'Estrellas',
    'class.rewardsTier': 'Oro',
    'class.rewardsTierLabel': 'Nivel',
    'class.programName': ctx.program_name || 'Programa',
    'class.issuerName': 'Negocio',
    'object.balance.money': '$25.00',
  };
  return map[fieldPath] || ctx[fieldPath.replace(/\./g, '_')] || '—';
}

/* ════════════════════════════════════════════════════════════════════
   iPHONE 15 PRO MOCKUP — Realistic proportions (19.5:9 aspect)
   Width: 260px, Height: ~562px for correct iPhone 15 Pro ratio
   ════════════════════════════════════════════════════════════════════ */
function IPhone15ProFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto" style={{ width: 260, height: 562 }}>
      {/* Outer bezel with titanium gradient */}
      <div
        className="absolute inset-0 rounded-[48px] shadow-2xl border-2 border-neutral-500 overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #a1a1a1, #7a7a7a, #9a9a9a)' }}
      >
        {/* Side buttons */}
        <div className="absolute -left-[3px] top-[14%] w-[3px] h-7 bg-neutral-600 rounded-l" />
        <div className="absolute -left-[3px] top-[20%] w-[3px] h-10 bg-neutral-600 rounded-l" />
        <div className="absolute -left-[3px] top-[28%] w-[3px] h-10 bg-neutral-600 rounded-l" />
        <div className="absolute -right-[3px] top-[20%] w-[3px] h-16 bg-neutral-600 rounded-r" />

        {/* Screen */}
        <div className="absolute inset-[3px] rounded-[44px] overflow-hidden flex flex-col" style={{ background: 'linear-gradient(to bottom, #0f0f0f, #1a1a1a)' }}>
          {/* Dynamic Island */}
          <div className="flex justify-center pt-3 pb-1 z-20 shrink-0">
            <div
              className="bg-black rounded-full border border-neutral-800 relative flex items-center justify-end"
              style={{ width: 80, height: 24 }}
            >
              <div
                className="rounded-full bg-neutral-950 border border-neutral-800"
                style={{ width: 7, height: 7, marginRight: 10 }}
              />
            </div>
          </div>

          {/* Status bar */}
          <div className="px-5 flex justify-between items-center text-white text-opacity-40 z-10 shrink-0">
            <span className="text-[9px] font-medium tracking-wide">9:41</span>
            <div className="flex gap-1 items-center">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg>
            </div>
          </div>

          {/* Wallet header label */}
          <div className="px-4 pt-3 pb-1 z-10 shrink-0">
            <p className="text-[9px] text-white text-opacity-25 font-semibold tracking-widest uppercase">Wallet</p>
          </div>

          {/* Content (pass card) */}
          <div className="flex-1 px-3 pt-1 pb-2 overflow-hidden min-h-0">
            {children}
          </div>

          {/* Home indicator */}
          <div className="flex justify-center pb-3 pt-1 shrink-0 z-10">
            <div className="w-24 h-[3px] bg-white rounded-full opacity-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   PIXEL 7 MOCKUP — Dark rounded frame, correct proportions
   ════════════════════════════════════════════════════════════════════ */
function Pixel7Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto" style={{ width: 260, height: 540 }}>
      {/* Outer bezel */}
      <div className="absolute inset-0 rounded-[44px] shadow-2xl border-2 border-neutral-800 bg-neutral-900 overflow-hidden">
        {/* Side buttons */}
        <div className="absolute -left-[3px] top-[14%] w-[3px] h-10 bg-neutral-700 rounded-l" />
        <div className="absolute -left-[3px] top-[24%] w-[3px] h-10 bg-neutral-700 rounded-l" />
        <div className="absolute -right-[3px] top-[20%] w-[3px] h-14 bg-neutral-700 rounded-r" />

        {/* Screen */}
        <div className="absolute inset-[3px] rounded-[40px] overflow-hidden flex flex-col bg-black">
          {/* Camera bar */}
          <div className="flex justify-center pt-3 pb-1 z-20 shrink-0">
            <div className="bg-neutral-800 rounded-full flex items-center gap-2 px-3 py-1">
              <div className="w-2 h-2 rounded-full bg-neutral-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-700" />
            </div>
          </div>

          {/* Status bar */}
          <div className="px-4 flex justify-between items-center text-white text-opacity-40 z-10 shrink-0">
            <span className="text-[9px] font-medium tracking-wide">9:41</span>
            <div className="flex gap-1 items-center">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg>
            </div>
          </div>

          {/* Google Wallet header */}
          <div className="px-3.5 py-1.5 flex items-center gap-1.5 z-10 shrink-0">
            <svg className="w-4 h-4 text-white opacity-30" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
            <span className="text-[10px] text-white opacity-30 font-medium">Google Wallet</span>
          </div>

          {/* Content */}
          <div className="flex-1 px-2.5 pt-1 pb-2 overflow-hidden min-h-0">
            {children}
          </div>

          {/* Nav pill */}
          <div className="flex justify-center pb-3 pt-1 shrink-0 z-10">
            <div className="w-28 h-[3px] bg-white rounded-full opacity-15" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   APPLE WALLET CARD — Non-overlapping PassKit layout
   ════════════════════════════════════════════════════════════════════ */
function AppleWalletCard({
  form, selectedType, logoPreview, stripPreview, barcodeType, customerName, walletDesign,
}: CardProps & { walletDesign?: WalletDesignState }) {
  const bgColor = form.background_color || '#1a1a2e';
  const textColor = form.text_color || '#ffffff';
  const passStyle = APPLE_PASS_STYLES[form.card_type] || 'generic';
  const heroImage = walletDesign?.appleStripUrl || walletDesign?.appleStrip2xUrl || stripPreview || form.strip_image_url;
  const hasStrip = heroImage && (passStyle === 'storeCard' || passStyle === 'coupon');
  const isCoupon = passStyle === 'coupon';
  const isGeneric = passStyle === 'generic';
  const ctx = buildContext(form, customerName);

  const appleFields = walletDesign?.appleFields;
  const headerFields = appleFields?.headerFields?.length ? appleFields.headerFields : undefined;
  const primaryFields = appleFields?.primaryFields?.length ? appleFields.primaryFields : undefined;
  const secondaryFields = appleFields?.secondaryFields?.length ? appleFields.secondaryFields : undefined;
  const auxiliaryFields = appleFields?.auxiliaryFields?.length ? appleFields.auxiliaryFields : undefined;
  const backFields = appleFields?.backFields?.length ? appleFields.backFields : undefined;

  const defaultPrimary: { label: string; value: string } = {
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

  const defaultAux: Array<{ label: string; value: string }> = [
    { label: 'CLIENTE', value: customerName || 'Cliente' },
    { label: 'VÁLIDO HASTA', value: '31/12/2026' },
  ];

  const defaultHeaderValue: Record<string, string> = {
    stamp: '0/10', cashback: '$0.00', coupon: 'Cupón', vip_membership: 'VIP',
    referral_pass: '0', discount: 'Bronce', gift_certificate: '$0',
    affiliate: form.name?.slice(0, 6) || '—', corporate_discount: '0%', multipass: '10/10',
  };
  const defaultHeaderLabel: Record<string, string> = {
    stamp: 'SELLOS', cashback: 'SALDO', coupon: 'OFERTA', vip_membership: 'NIVEL',
    referral_pass: 'REFERIDOS', discount: 'NIVEL', gift_certificate: 'SALDO',
    affiliate: 'PROGRAMA', corporate_discount: 'DESC.', multipass: 'USOS',
  };

  const auxItems: Array<{ label: string; value: string }> = auxiliaryFields || defaultAux;

  return (
    <IPhone15ProFrame>
      <div
        className="rounded-2xl overflow-hidden flex flex-col shadow-lg h-full"
        style={{
          background: bgColor,
          color: textColor,
          boxShadow: '0 10px 30px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.25)',
        }}
      >
        {/* Perforated edge for coupon */}
        {isCoupon && (
          <div
            className="absolute top-2 left-3 right-3 h-0.5 z-20"
            style={{ background: `repeating-linear-gradient(90deg, ${textColor}30 0px, ${textColor}30 5px, transparent 5px, transparent 9px)` }}
          />
        )}

        {/* Strip image */}
        {hasStrip && (
          <div className="relative w-full shrink-0" style={{ aspectRatio: '375/123' }}>
            <img src={heroImage} alt="Strip" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-10" style={{ background: `linear-gradient(to bottom, transparent, ${bgColor})` }} />
          </div>
        )}

        {/* ── HEADER ── */}
        <div className={`px-3 flex items-center gap-2.5 shrink-0 ${hasStrip ? 'pt-2.5 pb-1.5' : 'pt-3 pb-1.5'}`}>
          {/* Logo — wide rectangle like real Apple PassKit logo (160×50pt) */}
          {(walletDesign?.appleLogoUrl || walletDesign?.appleLogo2xUrl || logoPreview) ? (
            <div className="shrink-0 w-[60px] h-[22px] rounded overflow-hidden border border-white/10 shadow-sm bg-white/5 flex items-center justify-center">
              <img
                src={walletDesign?.appleLogoUrl || walletDesign?.appleLogo2xUrl || logoPreview!}
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="shrink-0 w-[60px] h-[22px] rounded bg-white/10 flex items-center justify-center border border-white/5">
              <CardTypeIcon icon={selectedType?.icon || 'stamp'} className="w-3.5 h-3.5" />
            </div>
          )}

          {/* Program name */}
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-[10px] font-bold truncate leading-tight">{form.name || 'Nombre del Programa'}</p>
          </div>

          {/* Header fields — right aligned */}
          {headerFields ? (
            <div className="flex gap-2.5 shrink-0 pt-0.5">
              {headerFields.slice(0, 3).map((f, i) => (
                <div key={f.key || i} className="text-right shrink-0">
                  <p className="text-[7px] font-semibold uppercase tracking-wider opacity-30 leading-none mb-0.5 truncate max-w-[52px]">{f.label}</p>
                  <p className="text-[10px] font-black leading-none truncate max-w-[52px]">{resolveTemplate(f.value, ctx)}</p>
                </div>
              ))}
            </div>
          ) : (
            defaultHeaderValue[form.card_type] && (
              <div className="text-right shrink-0 pt-0.5">
                <p className="text-[7px] font-semibold uppercase tracking-wider opacity-30 leading-none mb-0.5">{defaultHeaderLabel[form.card_type]}</p>
                <p className="text-[10px] font-black leading-none">{defaultHeaderValue[form.card_type]}</p>
              </div>
            )
          )}

          {/* Thumbnail — generic only */}
          {isGeneric && (walletDesign?.appleThumbnailUrl || walletDesign?.appleThumbnail2xUrl || heroImage) && (
            <img
              src={walletDesign?.appleThumbnailUrl || walletDesign?.appleThumbnail2xUrl || heroImage}
              alt="Thumbnail"
              className="w-9 h-9 rounded object-cover border border-white/10 shadow-sm shrink-0"
            />
          )}
        </div>

        {/* ── PRIMARY FIELD ── */}
        <div className="px-3 pt-1 pb-1 shrink-0 min-h-[48px] overflow-hidden">
          {primaryFields ? (
            primaryFields.map((f, i) => (
              <div key={f.key || i}>
                <p className="text-[8px] font-semibold uppercase tracking-wider opacity-35 leading-none mb-1 truncate">{f.label}</p>
                <p className="text-[22px] font-black leading-none tracking-tight truncate">{resolveTemplate(f.value, ctx)}</p>
              </div>
            ))
          ) : (
            <div>
              <p className="text-[8px] font-semibold uppercase tracking-wider opacity-35 leading-none mb-1 truncate">{defaultPrimary.label}</p>
              <p className="text-[22px] font-black leading-none tracking-tight truncate">{defaultPrimary.value}</p>
            </div>
          )}
        </div>

        {/* ── SECONDARY FIELDS ── */}
        {secondaryFields && secondaryFields.length > 0 && (
          <div className="px-3 pt-1.5 pb-1 shrink-0 min-h-[34px] overflow-hidden">
            <div className="grid grid-cols-4 gap-2">
              {secondaryFields.slice(0, 4).map((f, i) => (
                <div key={f.key || i} className="min-w-0 overflow-hidden">
                  <p className="text-[7px] font-semibold uppercase tracking-wider opacity-30 leading-none mb-0.5 truncate">{f.label}</p>
                  <p className="text-[11px] font-semibold opacity-85 leading-tight truncate">{resolveTemplate(f.value, ctx)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── AUXILIARY FIELDS ── */}
        <div className={`px-3 shrink-0 min-h-[30px] overflow-hidden ${secondaryFields && secondaryFields.length > 0 ? 'pt-1.5 pb-2' : 'pt-2 pb-2'}`}>
          <div className="grid grid-cols-4 gap-2">
            {auxItems.slice(0, 4).map((f, i) => (
              <div key={(f as any).key || i} className="min-w-0 overflow-hidden">
                <p className="text-[6px] font-semibold uppercase tracking-wider opacity-30 leading-none mb-0.5 truncate">{f.label}</p>
                <p className="text-[10px] font-semibold opacity-85 leading-tight truncate">{resolveTemplate(f.value, ctx)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Spacer to push barcode to bottom */}
        <div className="flex-1 min-h-0" />

        {/* ── BARCODE ── */}
        <div className="px-3 pb-3 pt-1 shrink-0">
          <div className="bg-white rounded-lg p-2 shadow-sm flex flex-col items-center gap-1">
            <BarcodeSvg type={barcodeType} size={barcodeType === 'code_128' || barcodeType === 'pdf417' ? 68 : 38} />
            <span className="text-[6px] text-black text-opacity-40 font-mono tracking-wider">0000 0000 0000</span>
          </div>
        </div>

        {/* ── BACK FIELDS ── */}
        {backFields && backFields.length > 0 && (
          <div className="px-3 pb-3 pt-1 border-t border-white/10 shrink-0">
            <p className="text-[6px] font-semibold uppercase tracking-widest opacity-25 mb-1.5">Detalles traseros</p>
            <div className="space-y-1">
              {backFields.slice(0, 6).map((f, i) => (
                <div key={f.key || i} className="flex justify-between gap-2">
                  <span className="text-[7px] opacity-40 truncate">{f.label}</span>
                  <span className="text-[7px] font-medium opacity-80 text-right truncate max-w-[55%]">{resolveTemplate(f.value, ctx)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </IPhone15ProFrame>
  );
}

/* ════════════════════════════════════════════════════════════════════
   GOOGLE WALLET CARD — Non-overlapping layout with dividers
   ════════════════════════════════════════════════════════════════════ */
function GoogleWalletCard({
  form, selectedType, logoPreview, stripPreview, barcodeType, customerName, walletDesign,
}: CardProps & { walletDesign?: WalletDesignState }) {
  const bgColor = form.background_color || '#1a1a2e';
  const textColor = form.text_color || '#ffffff';
  const heroImage = walletDesign?.googleHeroImageUrl || stripPreview || form.strip_image_url;
  const logoImage = walletDesign?.googleProgramLogoUrl || logoPreview;
  const ctx = buildContext(form, customerName);

  const googleRows = walletDesign?.googleRows;
  const hasCustomRows = googleRows && googleRows.length > 0;

  const defaultRows: Array<{ label: string; value: string }> = [
    { label: 'Miembro', value: customerName || 'Cliente' },
  ];
  switch (form.card_type) {
    case 'stamp':             defaultRows.push({ label: 'Sellos', value: '0 / 10' }); break;
    case 'cashback':          defaultRows.push({ label: 'Saldo', value: '$0.00' }); break;
    case 'coupon':            defaultRows.push({ label: 'Descuento', value: form.description || 'Especial' }); break;
    case 'vip_membership':    defaultRows.push({ label: 'Nivel', value: 'Club VIP' }); break;
    case 'referral_pass':     defaultRows.push({ label: 'Código', value: 'REF-XXXX' }); break;
    case 'discount':          defaultRows.push({ label: 'Descuento actual', value: '5%' }); break;
    case 'gift_certificate':  defaultRows.push({ label: 'Saldo', value: '$0.00' }); break;
    case 'affiliate':         defaultRows.push({ label: 'Programa', value: form.name || 'Afiliación' }); break;
    case 'corporate_discount':defaultRows.push({ label: 'Descuento', value: '0%' }); break;
    case 'multipass':         defaultRows.push({ label: 'Usos restantes', value: '10' }); break;
  }
  defaultRows.push({ label: 'Tipo', value: GOOGLE_WALLET_TYPES[form.card_type]?.label || 'Programa' });

  return (
    <Pixel7Frame>
      <div
        className="rounded-[28px] overflow-hidden flex flex-col shadow-lg h-full"
        style={{
          background: bgColor,
          color: textColor,
          boxShadow: '0 8px 24px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.2)',
        }}
      >
        {/* Hero image */}
        {heroImage && (
          <div className="relative w-full shrink-0" style={{ aspectRatio: '16/7' }}>
            <img src={heroImage} alt="Hero" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-10" style={{ background: `linear-gradient(to bottom, transparent, ${bgColor})` }} />
          </div>
        )}

        {/* Logo circle */}
        <div className="flex flex-col items-center px-4 relative z-10 shrink-0" style={{ marginTop: heroImage ? -28 : 12 }}>
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
        <div className="px-4 pt-2 pb-1 text-center shrink-0">
          <p className="text-[15px] font-bold leading-tight truncate">{form.name || 'Nombre del Programa'}</p>
          <p className="text-[10px] opacity-40 mt-0.5 font-medium truncate">{selectedType?.label || 'Programa de Fidelidad'}</p>
        </div>

        {/* Info rows with dividers */}
        <div className="px-3 pt-1.5 pb-1 shrink-0">
          {hasCustomRows ? (
            googleRows!.map((row, rIdx) => (
              <div key={row.id}>
                <div
                  className="grid gap-2 py-2"
                  style={{ gridTemplateColumns: `repeat(${row.type === 'oneItem' ? 1 : row.type === 'twoItems' ? 2 : 3}, 1fr)` }}
                >
                  {row.items.map((item, iIdx) => (
                    <div key={item.id} className={`min-w-0 overflow-hidden ${row.type !== 'oneItem' && iIdx > 0 ? 'text-right' : ''}`}>
                      <p className="text-[8px] opacity-35 font-medium leading-none mb-0.5 truncate">{item.displayName || item.label || 'Campo'}</p>
                      <p className="text-[10px] font-semibold leading-tight truncate">
                        {getGoogleSampleValue(item.fieldPath, ctx)}
                      </p>
                    </div>
                  ))}
                </div>
                {rIdx < googleRows!.length - 1 && <div className="h-px bg-white/10" />}
              </div>
            ))
          ) : (
            defaultRows.map((row, i) => (
              <div key={i}>
                <div className="flex justify-between items-baseline py-2">
                  <span className="text-[8px] opacity-35 font-medium truncate max-w-[50%]">{row.label}</span>
                  <span className="text-[10px] font-semibold text-right truncate max-w-[50%]">{row.value}</span>
                </div>
                {i < defaultRows.length - 1 && <div className="h-px bg-white/10" />}
              </div>
            ))
          )}
          {form.description && !hasCustomRows && (
            <>
              <div className="h-px bg-white/10" />
              <p className="text-[8px] opacity-30 line-clamp-2 pt-2 pb-1">{form.description}</p>
            </>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1 min-h-0" />

        {/* Barcode */}
        <div className="px-3 pb-3 pt-1 shrink-0">
          <div className="bg-white rounded-2xl p-2 shadow-sm flex flex-col items-center gap-1">
            <BarcodeSvg type={barcodeType} size={barcodeType === 'code_128' || barcodeType === 'pdf417' ? 68 : 38} />
            <span className="text-[6px] text-black text-opacity-40 font-mono tracking-wider">0000 0000 0000</span>
          </div>
        </div>
      </div>
    </Pixel7Frame>
  );
}

/* ─── Type definitions ────────────────────────────────────────────── */
export interface CardProps {
  form: {
    name: string;
    description: string;
    background_color: string;
    text_color: string;
    card_type: string;
    strip_image_url?: string;
  };
  selectedType?: typeof CARD_TYPES[0];
  logoPreview?: string | null;
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
  walletDesign,
}: {
  form: { name: string; description: string; background_color: string; text_color: string; card_type: string; strip_image_url?: string };
  selectedType?: typeof CARD_TYPES[0];
  logoPreview?: string | null;
  stripPreview?: string | null;
  barcodeType?: string;
  walletPlatform?: 'apple' | 'google';
  onWalletPlatformChange?: (platform: 'apple' | 'google') => void;
  customerName?: string;
  walletDesign?: WalletDesignState;
}) {
  const [platform, setPlatform] = useState(walletPlatform);

  useEffect(() => {
    if (walletPlatform !== platform) {
      setPlatform(walletPlatform);
    }
  }, [walletPlatform]);

  const handlePlatformChange = (next: 'apple' | 'google') => {
    setPlatform(next);
    onWalletPlatformChange?.(next);
  };

  return (
    <div className="relative w-full flex flex-col items-center" style={{ maxWidth: 320 }}>
      <PlatformToggle platform={platform} onChange={handlePlatformChange} />
      {platform === 'apple' ? (
        <AppleWalletCard
          form={form}
          selectedType={selectedType}
          logoPreview={logoPreview}
          stripPreview={stripPreview}
          barcodeType={barcodeType}
          customerName={customerName}
          walletDesign={walletDesign}
        />
      ) : (
        <GoogleWalletCard
          form={form}
          selectedType={selectedType}
          logoPreview={logoPreview}
          stripPreview={stripPreview}
          barcodeType={barcodeType}
          customerName={customerName}
          walletDesign={walletDesign}
        />
      )}
      <p className="text-center text-xs text-surface-400 mt-4 font-medium">
        Vista previa — {platform === 'apple' ? 'Apple Wallet' : 'Google Wallet'}
      </p>
    </div>
  );
}
