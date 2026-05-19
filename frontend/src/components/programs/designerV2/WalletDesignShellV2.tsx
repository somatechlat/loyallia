/* designerV2/WalletDesignShellV2.tsx — Main 3-column layout shell */

'use client';

import React, { useState, useCallback } from 'react';
import { TopBar } from './TopBar';
import { LeftNav } from './LeftNav';
import { CenterPreview } from './CenterPreview';
import { RightEditorPanel } from './RightEditorPanel';
import type { WalletDesignState, DesignerUIState, DesignerNavItem } from './types';
import { defaultDesignerUIState } from './types';

/* ─── Types ───────────────────────────────────────────────────────── */
export interface WalletDesignShellV2Props {
  /* Program info */
  programName: string;
  programStatus?: 'draft' | 'published' | 'suspended';
  onBack?: () => void;

  /* Card / form data (for preview) */
  form: {
    name: string;
    description: string;
    background_color: string;
    text_color: string;
    card_type: string;
    strip_image_url?: string;
  };
  onFormChange: (patch: Partial<{ background_color: string; text_color: string }>) => void;
  selectedType?: { icon: string; label: string };
  logoPreview?: string | null;
  stripPreview?: string | null;
  barcodeType: string;
  onBarcodeTypeChange: (type: string) => void;
  customerName?: string;

  /* Wallet design state */
  walletDesign: WalletDesignState;
  onWalletDesignChange: (state: WalletDesignState) => void;

  /* Save */
  onSave: () => void;
  isSaving?: boolean;
}

/* ─── Main Shell ──────────────────────────────────────────────────── */
export function WalletDesignShellV2({
  programName,
  programStatus = 'draft',
  onBack,
  form,
  selectedType,
  logoPreview,
  stripPreview,
  barcodeType,
  customerName,
  walletDesign,
  onWalletDesignChange,
  onSave,
  isSaving,
  onFormChange,
  onBarcodeTypeChange,
}: WalletDesignShellV2Props) {
  const [ui, setUi] = useState<DesignerUIState>(defaultDesignerUIState);

  /* Platform change (syncs with walletDesign.provider) */
  const handlePlatformChange = useCallback((platform: 'apple' | 'google') => {
    onWalletDesignChange({ ...walletDesign, provider: platform });
  }, [walletDesign, onWalletDesignChange]);

  /* Nav change */
  const handleNavChange = useCallback((nav: DesignerNavItem) => {
    setUi(prev => ({ ...prev, activeNav: nav }));
  }, []);

  /* Preview mode change */
  const handlePreviewModeChange = useCallback((mode: 'flat' | 'phone') => {
    setUi(prev => ({ ...prev, previewMode: mode }));
  }, []);

  /* Apple view change */
  const handleAppleViewChange = useCallback((view: 'front' | 'back') => {
    setUi(prev => ({ ...prev, appleView: view }));
  }, []);

  /* Zone hover */
  const handleHoverZone = useCallback((zone: string | null) => {
    setUi(prev => ({ ...prev, hoveredZone: zone }));
  }, []);

  /* Zone map toggle */
  const handleToggleZoneMap = useCallback(() => {
    setUi(prev => ({ ...prev, showZoneMap: !prev.showZoneMap }));
  }, []);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top bar */}
      <TopBar
        programName={programName}
        status={programStatus}
        onBack={onBack}
      />

      {/* Main content: 3-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left nav */}
        <LeftNav
          platform={walletDesign.provider}
          activeNav={ui.activeNav}
          onPlatformChange={handlePlatformChange}
          onNavChange={handleNavChange}
          onSave={onSave}
          isSaving={isSaving}
        />

        {/* Center preview */}
        <div className="flex-1 min-w-0">
          <CenterPreview
            platform={walletDesign.provider}
            previewMode={ui.previewMode}
            appleView={ui.appleView}
            onPlatformChange={handlePlatformChange}
            onPreviewModeChange={handlePreviewModeChange}
            onAppleViewChange={handleAppleViewChange}
            form={form}
            selectedType={selectedType}
            logoPreview={logoPreview}
            stripPreview={stripPreview}
            barcodeType={barcodeType}
            customerName={customerName}
            walletDesign={walletDesign}
            hoveredZone={ui.hoveredZone}
            showZoneMap={ui.showZoneMap}
            onToggleZoneMap={handleToggleZoneMap}
          />
        </div>

        {/* Right editor panel */}
        <div className="w-[420px] min-w-[380px] max-w-[480px] shrink-0 border-l border-border bg-card overflow-y-auto">
          <RightEditorPanel
            activeNav={ui.activeNav}
            walletDesign={walletDesign}
            onWalletDesignChange={onWalletDesignChange}
            form={form}
            onFormChange={onFormChange}
            barcodeType={barcodeType}
            onBarcodeTypeChange={onBarcodeTypeChange}
            onHoverZone={handleHoverZone}
          />
        </div>
      </div>
    </div>
  );
}
