/**
 * Studio sidebar with tabbed panels.
 *
 * Displays 7 tabs from STUDIO_TABS constant. Each tab content is
 * currently a placeholder to be filled in during later phases.
 */

'use client';

import React from 'react';
import type { WalletPassStudioState, WalletColors, WalletImages, BarcodeConfig, BackContent, CardTypeConfig, AppleSpecificConfig, GoogleSpecificConfig, UnifiedField } from '@/components/wallet/types/unified-state';
import { STUDIO_TABS } from '@/components/wallet/constants';

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

function TabIcon({ icon, className }: { icon: string; className?: string }) {
  switch (icon) {
    case 'Image':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      );
    case 'CreditCard':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
      );
    case 'Text':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 6.1H3V19h14V6.1z" />
          <path d="M21 6.1V19" />
          <path d="M8 12h4" />
        </svg>
      );
    case 'RotateCcw':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      );
    case 'QrCode':
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
    case 'Palette':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
          <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
          <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
          <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.01 17.461 2 12 2z" />
        </svg>
      );
    case 'Settings':
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
  }
}

export function StudioSidebar({
  state,
  updateColors,
  updateImages: _updateImages,
  updateFields: _updateFields,
  updateBarcode,
  updateBackContent,
  updateCardTypeConfig: _updateCardTypeConfig,
  updateAppleConfig: _updateAppleConfig,
  updateGoogleConfig: _updateGoogleConfig,
  updateUI,
}: StudioSidebarProps) {
  const activeTab = state.ui.activeTab;

  return (
    <aside className="w-[360px] flex-shrink-0 flex flex-col h-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800">
      {/* Tab strip */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto">
        {STUDIO_TABS.map((tab) => {
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
              <TabIcon icon={tab.icon} className="w-4 h-4" />
              <span className="truncate max-w-full">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            {STUDIO_TABS.find((t) => t.id === activeTab)?.label ?? 'Panel'}
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Contenido de la pestaña <strong className="text-neutral-700 dark:text-neutral-300">{STUDIO_TABS.find((t) => t.id === activeTab)?.label}</strong> se implementará en la siguiente fase.
          </p>

          {/* Debug info for active tab context */}
          <div className="mt-6 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
            <p className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">
              Tab: {activeTab}
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 font-mono mt-1">
              CardType: {state.cardType}
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 font-mono mt-1">
              Industry: {state.industry}
            </p>
          </div>

          {/* Temporary preview of updater functions being available */}
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Acciones rápidas
            </p>
            <button
              type="button"
              onClick={() => updateColors({ accent: '#3B82F6' })}
              className="w-full px-3 py-2 text-xs text-left rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              Restaurar color de acento
            </button>
            <button
              type="button"
              onClick={() => updateBarcode({ format: 'QR_CODE' })}
              className="w-full px-3 py-2 text-xs text-left rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              Establecer código QR
            </button>
            <button
              type="button"
              onClick={() => updateBackContent({ fields: [] })}
              className="w-full px-3 py-2 text-xs text-left rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              Limpiar contenido trasero
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
