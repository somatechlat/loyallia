/* designerV2/RightEditorPanel.tsx — Context-aware right panel */

'use client';

import React from 'react';
import type { WalletDesignState, DesignerNavItem } from './types';
import { DesignSection } from './sections/DesignSection';
import { DataSection } from './sections/DataSection';
import { LocationsSection } from './sections/LocationsSection';
import { LinksSection } from './sections/LinksSection';
import { BarcodeSection } from './sections/BarcodeSection';
import { AdvancedSection } from './sections/AdvancedSection';

export interface RightEditorPanelProps {
  activeNav: DesignerNavItem;
  walletDesign: WalletDesignState;
  onWalletDesignChange: (state: WalletDesignState) => void;
  form: {
    name: string;
    description: string;
    background_color: string;
    text_color: string;
    card_type: string;
  };
  onFormChange: (patch: Partial<{ background_color: string; text_color: string }>) => void;
  barcodeType: string;
  onBarcodeTypeChange: (type: string) => void;
  onHoverZone?: (zone: string | null) => void;
}

export function RightEditorPanel({
  activeNav,
  walletDesign,
  onWalletDesignChange,
  form,
  onFormChange,
  barcodeType,
  onBarcodeTypeChange,
  onHoverZone,
}: RightEditorPanelProps) {
  return (
    <div className="h-full">
      {activeNav === 'design' && (
        <DesignSection
          walletDesign={walletDesign}
          onWalletDesignChange={onWalletDesignChange}
          form={form}
          onFormChange={onFormChange}
        />
      )}
      {activeNav === 'data' && (
        <DataSection
          walletDesign={walletDesign}
          onWalletDesignChange={onWalletDesignChange}
          onHoverZone={onHoverZone}
        />
      )}
      {activeNav === 'locations' && (
        <LocationsSection
          walletDesign={walletDesign}
          onWalletDesignChange={onWalletDesignChange}
        />
      )}
      {activeNav === 'links' && (
        <LinksSection
          walletDesign={walletDesign}
          onWalletDesignChange={onWalletDesignChange}
        />
      )}
      {activeNav === 'barcode' && (
        <BarcodeSection
          barcodeType={barcodeType}
          onBarcodeTypeChange={onBarcodeTypeChange}
        />
      )}
      {activeNav === 'advanced' && (
        <AdvancedSection
          walletDesign={walletDesign}
          onWalletDesignChange={onWalletDesignChange}
        />
      )}
    </div>
  );
}
