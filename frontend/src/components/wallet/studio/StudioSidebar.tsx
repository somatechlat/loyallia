/**
 * Studio sidebar with tabbed panels.
 *
 * Displays 7 tabs with dynamic card-type label. Each tab renders its
 * actual component per SRS-003 Section 4 and Section 8.
 */

'use client';

import React from 'react';
import type { WalletPassStudioState, WalletColors, WalletImages, BarcodeConfig, BackContent, CardTypeConfig, AppleSpecificConfig, GoogleSpecificConfig, UnifiedField } from '@/components/wallet/types/unified-state';
import { ImagesTab } from './ImagesTab';
import { FieldStudio } from './FieldStudio';
import { BarcodeTab } from './BarcodeTab';
import { ColorsTab } from './ColorsTab';
import { CardTypeTab } from './CardTypeTab';
import { useDesignScore } from '@/hooks/useDesignScore';
import { DesignScore } from './DesignScore';

export interface StudioSidebarProps {
  state: WalletPassStudioState;
  updateColors: (colors: Partial<WalletColors>) => void;
  updateImages: (images: Partial<WalletImages>) => void;
  updateFields: (fields: UnifiedField[] | ((prev: UnifiedField[]) => UnifiedField[])) => void;
  updateBarcode: (barcode: Partial<BarcodeConfig>) => void;
  updateBackContent: (backContent: Partial<BackContent>) => void;
  updateCardTypeConfig: (config: Partial<CardTypeConfig>) => void;
  updateAppleConfig: (config: Partial<AppleSpecificConfig>) => void;
  updateGoogleConfig: (config: Partial<GoogleSpecificConfig>) => void;
  updateUI: (ui: Partial<WalletPassStudioState['ui']>) => void;
}

/* ── Icon components ─────────────────────────────────────────────── */

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

function TextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 6.1H3V19h14V6.1z" />
      <path d="M21 6.1V19" />
      <path d="M8 12h4" />
    </svg>
  );
}

function RotateCcwIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function QrCodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="5" height="5" x="3" y="3" rx="1" />
      <rect width="5" height="5" x="16" y="3" rx="1" />
      <rect width="5" height="5" x="3" y="16" rx="1" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      <path d="M21 21v.01" />
      <path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <path d="M3 12h.01" />
      <path d="M12 3h.01" />
      <path d="M12 16v.01" />
      <path d="M16 12h1" />
      <path d="M21 12v.01" />
      <path d="M12 21v-1" />
    </svg>
  );
}

function PaletteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.01 17.461 2 12 2z" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/* ── Dynamic card-type icons ─────────────────────────────────────── */

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function ScissorsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" />
      <path d="M8.12 8.12 12 12" />
      <path d="M20 4 8.12 15.88" />
      <circle cx="6" cy="18" r="3" />
      <path d="M14.8 14.8 20 20" />
    </svg>
  );
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
      <path d="M7 7h.01" />
    </svg>
  );
}

function GiftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" rx="1" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function TicketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" />
      <path d="M13 17v2" />
      <path d="M13 11v2" />
    </svg>
  );
}

/* ── Tab configuration ───────────────────────────────────────────── */

type TabId = 'images' | 'cardType' | 'fields' | 'back' | 'barcode' | 'colors' | 'advanced';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

function getCardTypeTabConfig(cardType: WalletPassStudioState['cardType']): { label: string; icon: React.ReactNode } {
  switch (cardType) {
    case 'stamp':
      return { label: 'Sellos', icon: <TargetIcon className="w-4 h-4" /> };
    case 'cashback':
      return { label: 'Puntos', icon: <TrophyIcon className="w-4 h-4" /> };
    case 'coupon':
      return { label: 'Cupón', icon: <ScissorsIcon className="w-4 h-4" /> };
    case 'discount':
      return { label: 'Descuento', icon: <TagIcon className="w-4 h-4" /> };
    case 'gift_certificate':
      return { label: 'Regalo', icon: <GiftIcon className="w-4 h-4" /> };
    case 'vip_membership':
      return { label: 'VIP', icon: <CrownIcon className="w-4 h-4" /> };
    case 'affiliate':
      return { label: 'Afiliado', icon: <LinkIcon className="w-4 h-4" /> };
    case 'corporate_discount':
      return { label: 'Corp', icon: <BuildingIcon className="w-4 h-4" /> };
    case 'referral_pass':
      return { label: 'Referido', icon: <UsersIcon className="w-4 h-4" /> };
    case 'multipass':
      return { label: 'Multi', icon: <TicketIcon className="w-4 h-4" /> };
    default:
      return { label: 'Tarjeta', icon: <TargetIcon className="w-4 h-4" /> };
  }
}

/* ── Placeholder tabs ────────────────────────────────────────────── */

function BackDesignTabPlaceholder() {
  return (
    <div className="p-4 text-sm text-neutral-500 dark:text-neutral-400">
      BackDesignTab — implementado en FIX-8
    </div>
  );
}

function AdvancedTabPlaceholder() {
  return (
    <div className="p-4 text-sm text-neutral-500 dark:text-neutral-400">
      AdvancedTab — implementado en FIX-8
    </div>
  );
}

/* ── Design Score sub-component ──────────────────────────────────── */

function StudioSidebarDesignScore({
  state,
  updateUI,
}: {
  state: WalletPassStudioState;
  updateUI: (ui: Partial<WalletPassStudioState['ui']>) => void;
}) {
  const designScore = useDesignScore(state);

  return (
    <DesignScore
      result={designScore}
      onViewDetails={() => updateUI({ activeTab: 'advanced' })}
    />
  );
}

/* ── Component ───────────────────────────────────────────────────── */

export function StudioSidebar({
  state,
  updateColors,
  updateImages,
  updateFields,
  updateBarcode,
  updateBackContent: _updateBackContent,
  updateCardTypeConfig,
  updateAppleConfig: _updateAppleConfig,
  updateGoogleConfig: _updateGoogleConfig,
  updateUI,
}: StudioSidebarProps) {
  const activeTab = state.ui.activeTab;
  const cardTypeConfig = getCardTypeTabConfig(state.cardType);

  // Build ordered tab list: images, cardType, fields, back, barcode, colors, advanced
  const allTabs: TabConfig[] = [
    { id: 'images', label: 'Imágenes', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'cardType', label: cardTypeConfig.label, icon: cardTypeConfig.icon },
    { id: 'fields', label: 'Campos', icon: <TextIcon className="w-4 h-4" /> },
    { id: 'back', label: 'Reverso', icon: <RotateCcwIcon className="w-4 h-4" /> },
    { id: 'barcode', label: 'Código', icon: <QrCodeIcon className="w-4 h-4" /> },
    { id: 'colors', label: 'Colores', icon: <PaletteIcon className="w-4 h-4" /> },
    { id: 'advanced', label: 'Avanzado', icon: <SettingsIcon className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-[360px] flex-shrink-0 flex flex-col h-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800">
      {/* Tab strip */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto">
        {allTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => updateUI({ activeTab: tab.id as WalletPassStudioState['ui']['activeTab'] })}
              className={`
                flex-1 min-w-[48px] flex flex-col items-center justify-center gap-1 py-3 px-2 text-[10px] font-medium transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset
                ${isActive
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }
              `}
              title={tab.label}
            >
              {tab.icon}
              <span className="truncate max-w-full">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content area */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'images' && (
          <ImagesTab images={state.images} onUpdateImages={updateImages} />
        )}
        {activeTab === 'cardType' && (
          <CardTypeTab
            cardType={state.cardType}
            config={state.cardTypeConfig}
            onChange={updateCardTypeConfig}
          />
        )}
        {activeTab === 'fields' && (
          <FieldStudio
            fields={state.fields}
            cardType={state.cardType}
            onUpdateFields={updateFields}
          />
        )}
        {activeTab === 'back' && (
          <BackDesignTabPlaceholder />
        )}
        {activeTab === 'barcode' && (
          <BarcodeTab barcode={state.barcode} onUpdateBarcode={updateBarcode} />
        )}
        {activeTab === 'colors' && (
          <ColorsTab colors={state.colors} onUpdateColors={updateColors} />
        )}
        {activeTab === 'advanced' && (
          <AdvancedTabPlaceholder />
        )}
      </div>

      {/* Design Score — sticky footer */}
      <StudioSidebarDesignScore state={state} updateUI={updateUI} />
    </aside>
  );
}
