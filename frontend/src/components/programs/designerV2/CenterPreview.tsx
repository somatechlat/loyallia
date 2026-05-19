/* designerV2/CenterPreview.tsx — Flat card preview with controls */

'use client';

import React from 'react';
import { Smartphone, RotateCw } from 'lucide-react';
import { FlatAppleCard } from './cards/FlatAppleCard';
import { FlatGoogleCard } from './cards/FlatGoogleCard';
import type { WalletDesignState } from './types';

/* ─── Checkerboard background pattern ─────────────────────────────── */
function CheckerboardBg() {
  return (
    <div
      className="absolute inset-0 -z-10"
      style={{
        backgroundImage: `
          linear-gradient(45deg, #f5f5f5 25%, transparent 25%),
          linear-gradient(-45deg, #f5f5f5 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #f5f5f5 75%),
          linear-gradient(-45deg, transparent 75%, #f5f5f5 75%)
        `,
        backgroundSize: '16px 16px',
        backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
      }}
    />
  );
}

/* ─── Platform toggle (mini, above card) ──────────────────────────── */
function PlatformToggleMini({
  platform,
  onChange,
}: {
  platform: 'apple' | 'google';
  onChange: (p: 'apple' | 'google') => void;
}) {
  return (
    <div className="flex justify-center mb-4">
      <div className="inline-flex bg-muted rounded-full p-1 gap-1">
        <button
          type="button"
          onClick={() => onChange('apple')}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-150 flex items-center gap-1.5
            ${platform === 'apple'
              ? 'bg-white shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          Apple Wallet
        </button>
        <button
          type="button"
          onClick={() => onChange('google')}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-150 flex items-center gap-1.5
            ${platform === 'google'
              ? 'bg-white shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C6.477 2 1.545 6.932 1.545 13s4.932 11 11 11c6.068 0 11-4.932 11-11 0-.73-.074-1.44-.213-2.128H12.545z" />
          </svg>
          Google Wallet
        </button>
      </div>
    </div>
  );
}

/* ─── iPhone 15 Pro Frame (for phone mode) ────────────────────────── */
function IPhone15ProFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto" style={{ width: 288, height: 622 }}>
      <div
        className="absolute inset-0 rounded-[52px] shadow-2xl border-2 border-neutral-400 overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #b0b0b0, #888888, #a8a8a8)' }}
      >
        {/* Side buttons */}
        <div className="absolute -left-[3px] top-[14%] w-[3px] h-7 bg-neutral-500 rounded-l" />
        <div className="absolute -left-[3px] top-[20%] w-[3px] h-10 bg-neutral-500 rounded-l" />
        <div className="absolute -left-[3px] top-[28%] w-[3px] h-10 bg-neutral-500 rounded-l" />
        <div className="absolute -right-[3px] top-[20%] w-[3px] h-16 bg-neutral-500 rounded-r" />

        {/* Screen */}
        <div className="absolute inset-[3px] rounded-[48px] overflow-hidden flex flex-col" style={{ background: 'linear-gradient(to bottom, #0f0f0f, #1a1a1a)' }}>
          {/* Dynamic Island */}
          <div className="flex justify-center pt-3 pb-1 z-20 shrink-0">
            <div className="bg-black rounded-full border border-neutral-800 relative flex items-center justify-end" style={{ width: 84, height: 26 }}>
              <div className="rounded-full bg-neutral-950 border border-neutral-800" style={{ width: 8, height: 8, marginRight: 12 }} />
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

          {/* Wallet header */}
          <div className="px-4 pt-3 pb-1 z-10 shrink-0">
            <p className="text-[9px] text-white text-opacity-25 font-semibold tracking-widest uppercase">Wallet</p>
          </div>

          {/* Content */}
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

/* ─── Pixel 7 Frame (for phone mode) ──────────────────────────────── */
function Pixel7Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto" style={{ width: 288, height: 600 }}>
      <div className="absolute inset-0 rounded-[48px] shadow-2xl border-2 border-neutral-700 bg-neutral-800 overflow-hidden">
        {/* Side buttons */}
        <div className="absolute -left-[3px] top-[14%] w-[3px] h-10 bg-neutral-600 rounded-l" />
        <div className="absolute -left-[3px] top-[24%] w-[3px] h-10 bg-neutral-600 rounded-l" />
        <div className="absolute -right-[3px] top-[20%] w-[3px] h-14 bg-neutral-600 rounded-r" />

        {/* Screen */}
        <div className="absolute inset-[3px] rounded-[44px] overflow-hidden flex flex-col bg-black">
          {/* Camera bar */}
          <div className="flex justify-center pt-3 pb-1 z-20 shrink-0">
            <div className="bg-neutral-700 rounded-full flex items-center gap-2 px-3 py-1">
              <div className="w-2 h-2 rounded-full bg-neutral-600" />
              <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-600" />
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

/* ─── Lock Screen Notification ────────────────────────────────────── */
function LockScreenNotification({ platform }: { platform: 'apple' | 'google' }) {
  return (
    <div className="mt-4 w-[240px] mx-auto">
      <div className="bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm rounded-2xl p-3 shadow-lg border border-white/20">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center shrink-0">
            {platform === 'apple' ? (
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C6.477 2 1.545 6.932 1.545 13s4.932 11 11 11c6.068 0 11-4.932 11-11 0-.73-.074-1.44-.213-2.128H12.545z" />
              </svg>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-foreground">{platform === 'apple' ? 'Apple Wallet' : 'Google Wallet'}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Tu pase está listo para usar</p>
            <p className="text-[9px] text-muted-foreground mt-0.5 opacity-60">Ahora · Cerca de ti</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Types ───────────────────────────────────────────────────────── */
export interface CenterPreviewProps {
  platform: 'apple' | 'google';
  previewMode: 'flat' | 'phone';
  appleView: 'front' | 'back';
  onPlatformChange: (p: 'apple' | 'google') => void;
  onPreviewModeChange: (mode: 'flat' | 'phone') => void;
  onAppleViewChange: (view: 'front' | 'back') => void;
  form: {
    name: string;
    description: string;
    background_color: string;
    text_color: string;
    card_type: string;
    strip_image_url?: string;
  };
  selectedType?: { icon: string; label: string };
  logoPreview?: string | null;
  stripPreview?: string | null;
  barcodeType: string;
  customerName?: string;
  walletDesign?: WalletDesignState;
}

/* ─── Main Component ──────────────────────────────────────────────── */
export function CenterPreview({
  platform,
  previewMode,
  appleView,
  onPlatformChange,
  onPreviewModeChange,
  onAppleViewChange,
  form,
  selectedType,
  logoPreview,
  stripPreview,
  barcodeType,
  customerName,
  walletDesign,
}: CenterPreviewProps) {
  const cardContent = platform === 'apple' ? (
    <FlatAppleCard
      form={form}
      selectedType={selectedType}
      logoPreview={logoPreview}
      stripPreview={stripPreview}
      barcodeType={barcodeType}
      customerName={customerName}
      walletDesign={walletDesign}
      view={appleView}
    />
  ) : (
    <FlatGoogleCard
      form={form}
      selectedType={selectedType}
      logoPreview={logoPreview}
      stripPreview={stripPreview}
      barcodeType={barcodeType}
      customerName={customerName}
      walletDesign={walletDesign}
    />
  );

  return (
    <div className="relative flex flex-col items-center justify-center h-full p-6 overflow-y-auto">
      <CheckerboardBg />

      {/* Platform toggle */}
      <PlatformToggleMini platform={platform} onChange={onPlatformChange} />

      {/* Card container */}
      <div className="relative" style={{ width: 380 }}>
        {previewMode === 'phone' ? (
          platform === 'apple' ? (
            <IPhone15ProFrame>{cardContent}</IPhone15ProFrame>
          ) : (
            <Pixel7Frame>{cardContent}</Pixel7Frame>
          )
        ) : (
          <div className="w-full" style={{ maxWidth: 380 }}>
            {cardContent}
          </div>
        )}
      </div>

      {/* Controls below card */}
      <div className="mt-4 flex items-center gap-3">
        {/* Apple front/back toggle */}
        {platform === 'apple' && (
          <button
            type="button"
            onClick={() => onAppleViewChange(appleView === 'front' ? 'back' : 'front')}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-100 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80"
          >
            <RotateCw className="w-3.5 h-3.5" strokeWidth={1.5} />
            {appleView === 'front' ? 'Ver trasera' : 'Ver frente'}
          </button>
        )}

        {/* Phone mode toggle */}
        <button
          type="button"
          onClick={() => onPreviewModeChange(previewMode === 'flat' ? 'phone' : 'flat')}
          className={`flex items-center gap-1.5 text-xs transition-colors duration-100 px-3 py-1.5 rounded-full
            ${previewMode === 'phone'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80'
            }`}
        >
          <Smartphone className="w-3.5 h-3.5" strokeWidth={1.5} />
          {previewMode === 'phone' ? 'Modo teléfono' : 'Vista plana'}
        </button>
      </div>

      {/* Lock screen notification */}
      <LockScreenNotification platform={platform} />
    </div>
  );
}
