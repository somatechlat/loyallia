/**
 * Studio tool panel.
 *
 * Renders the content of the active tool only. Tool selection lives in
 * ActivityBar (desktop) / the mobile tool switcher — never here (D-U1).
 */

'use client';

import React from 'react';
import type { WalletPassStudioState, WalletColors, WalletImages, BarcodeConfig, BackContent, CardTypeConfig, AppleSpecificConfig, GoogleSpecificConfig, UnifiedField } from '@/components/wallet/types/unified-state';
import { ImagesTab } from './ImagesTab';
import { FieldStudio } from './FieldStudio';
import { BarcodeTab } from './BarcodeTab';
import { ColorsTab } from './ColorsTab';
import { CardTypeTab } from './CardTypeTab';
import { BackDesignTab } from './BackDesignTab';
import { AdvancedTab } from './AdvancedTab';

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
  onOpenAI?: () => void;
}

export function StudioSidebar({
  state,
  updateColors,
  updateImages,
  updateFields,
  updateBarcode,
  updateBackContent,
  updateCardTypeConfig,
  updateAppleConfig,
  updateGoogleConfig,
  onOpenAI,
}: StudioSidebarProps) {
  const activeTab = state.ui.activeTab;

  // Exhaustive by construction: a new StudioToolId without a panel is a type
  // error here, not a silently empty cockpit at runtime.
  const renderPanel = (): React.ReactNode => {
    switch (activeTab) {
      case 'images':
        return (
          <ImagesTab
            images={state.images}
            onUpdateImages={updateImages}
            onOpenAI={onOpenAI}
            cardType={state.cardType}
          />
        );
      case 'cardType':
        return (
          <CardTypeTab
            cardType={state.cardType}
            config={state.cardTypeConfig}
            onChange={updateCardTypeConfig}
          />
        );
      case 'fields':
        return (
          <FieldStudio
            fields={state.fields}
            cardType={state.cardType}
            barcodeFormat={state.barcode.format}
            onUpdateFields={updateFields}
          />
        );
      case 'back':
        return (
          <BackDesignTab
            backContent={state.backContent}
            onUpdateBackContent={updateBackContent}
            appleConfig={state.apple}
            googleConfig={state.google}
          />
        );
      case 'barcode':
        return <BarcodeTab barcode={state.barcode} onUpdateBarcode={updateBarcode} />;
      case 'colors':
        return <ColorsTab colors={state.colors} onUpdateColors={updateColors} />;
      case 'advanced':
        return (
          <AdvancedTab
            appleConfig={state.apple}
            googleConfig={state.google}
            onUpdateAppleConfig={updateAppleConfig}
            onUpdateGoogleConfig={updateGoogleConfig}
          />
        );
      default: {
        const _exhaustive: never = activeTab;
        return _exhaustive;
      }
    }
  };

  return (
    <aside
      className="w-full flex flex-col h-full bg-white dark:bg-neutral-900"
      data-testid="studio-tool-panel"
    >
      <div className="flex-1 overflow-y-auto p-3">
        <div data-testid={`studio-panel-${activeTab}`}>{renderPanel()}</div>
      </div>
    </aside>
  );
}
