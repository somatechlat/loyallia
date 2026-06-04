/**
 * Main Wallet Pass Studio container.
 *
 * Composes the toolbar, canvas, and sidebar into a unified layout.
 * Wraps state management with undo/redo and auto-save.
 * Adds mobile responsiveness, keyboard shortcuts, session recovery,
 * and error boundaries per Phase 9.
 */

'use client';

import React from 'react';
import { useWalletStudio } from '@/hooks/useWalletStudio';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSessionRecovery, persistSessionState } from '@/hooks/useSessionRecovery';
import { useI18n } from '@/lib/i18n';
import { StudioToolbar } from './StudioToolbar';
import { StudioCanvas } from './StudioCanvas';
import { StudioSidebar } from './StudioSidebar';
import { TemplateGallery } from './TemplateGallery';
import { SaveTemplateModal } from './SaveTemplateModal';
import { AIChatModal } from './AIChatModal';
import { MobileBottomSheet } from './MobileBottomSheet';
import { ErrorBoundary } from './ErrorBoundary';
import type { WalletPassStudioState, CardTypeConfig, PlatformView } from '@/components/wallet/types/unified-state';
import type { WalletTemplate } from '@/components/wallet/types/templates';
import type { AIVariation } from '@/hooks/useAI';

export interface WalletStudioProps {
  initialState?: Partial<WalletPassStudioState>;
  onSave?: (state: WalletPassStudioState) => void;
  onSaveAsTemplate?: (state: WalletPassStudioState) => void;
}

export function WalletStudio({ initialState, onSave, onSaveAsTemplate }: WalletStudioProps) {
  const { t } = useI18n();
  const studio = useWalletStudio(initialState);
  const { state: undoableState, setState: setUndoableState, undo, redo, canUndo, canRedo } = useUndoRedo(
    studio.state,
    { maxHistory: 50 }
  );

  // Sync studio state into undo/redo when studio state changes externally
  const prevStudioStateRef = React.useRef(studio.state);
  React.useEffect(() => {
    if (studio.state !== prevStudioStateRef.current) {
      prevStudioStateRef.current = studio.state;
      // Only push if it's meaningfully different from current undoable state
      if (JSON.stringify(studio.state) !== JSON.stringify(undoableState)) {
        setUndoableState(studio.state);
      }
    }
  }, [studio.state, undoableState, setUndoableState]);

  // Override studio.state with undoable state for rendering
  const displayState = undoableState;

  // Wire updaters to go through undo/redo
  const wrappedUpdateColors = React.useCallback(
    (colors: Parameters<typeof studio.updateColors>[0]) => {
      setUndoableState((prev: WalletPassStudioState) => ({
        ...prev,
        colors: { ...prev.colors, ...colors },
        ui: { ...prev.ui, isModified: true },
      }));
    },
    [setUndoableState]
  );

  const wrappedUpdateImages = React.useCallback(
    (images: Parameters<typeof studio.updateImages>[0]) => {
      setUndoableState((prev: WalletPassStudioState) => ({
        ...prev,
        images: { ...prev.images, ...images },
        ui: { ...prev.ui, isModified: true },
      }));
    },
    [setUndoableState]
  );

  const wrappedUpdateFields = React.useCallback(
    (fields: Parameters<typeof studio.updateFields>[0]) => {
      setUndoableState((prev: WalletPassStudioState) => ({
        ...prev,
        fields: typeof fields === 'function' ? fields(prev.fields) : fields,
        ui: { ...prev.ui, isModified: true },
      }));
    },
    [setUndoableState]
  );

  const wrappedUpdateBarcode = React.useCallback(
    (barcode: Parameters<typeof studio.updateBarcode>[0]) => {
      setUndoableState((prev: WalletPassStudioState) => ({
        ...prev,
        barcode: { ...prev.barcode, ...barcode },
        ui: { ...prev.ui, isModified: true },
      }));
    },
    [setUndoableState]
  );

  const wrappedUpdateBackContent = React.useCallback(
    (backContent: Parameters<typeof studio.updateBackContent>[0]) => {
      setUndoableState((prev: WalletPassStudioState) => ({
        ...prev,
        backContent: { ...prev.backContent, ...backContent },
        ui: { ...prev.ui, isModified: true },
      }));
    },
    [setUndoableState]
  );

  const wrappedUpdateCardTypeConfig = React.useCallback(
    (config: Parameters<typeof studio.updateCardTypeConfig>[0]) => {
      setUndoableState((prev: WalletPassStudioState) => ({
        ...prev,
        cardTypeConfig: { ...prev.cardTypeConfig, ...config } as CardTypeConfig,
        ui: { ...prev.ui, isModified: true },
      }));
    },
    [setUndoableState]
  );

  const wrappedUpdateAppleConfig = React.useCallback(
    (config: Parameters<typeof studio.updateAppleConfig>[0]) => {
      setUndoableState((prev: WalletPassStudioState) => ({
        ...prev,
        apple: { ...prev.apple, ...config },
        ui: { ...prev.ui, isModified: true },
      }));
    },
    [setUndoableState]
  );

  const wrappedUpdateGoogleConfig = React.useCallback(
    (config: Parameters<typeof studio.updateGoogleConfig>[0]) => {
      setUndoableState((prev: WalletPassStudioState) => ({
        ...prev,
        google: { ...prev.google, ...config },
        ui: { ...prev.ui, isModified: true },
      }));
    },
    [setUndoableState]
  );

  const wrappedUpdateUI = React.useCallback(
    (ui: Parameters<typeof studio.updateUI>[0]) => {
      setUndoableState((prev: WalletPassStudioState) => ({
        ...prev,
        ui: { ...prev.ui, ...ui },
      }));
    },
    [setUndoableState]
  );

  const [isTemplateGalleryOpen, setIsTemplateGalleryOpen] = React.useState(false);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = React.useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = React.useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = React.useState(false);

  // Mobile detection
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Session recovery
  const sessionRecovery = useSessionRecovery();

  // Persist session state for crash recovery
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      persistSessionState(displayState);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [displayState]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onUndo: undo,
    onRedo: redo,
    onSave: () => handleSave(),
    onExport: handleExport,
    onAIOpen: () => setIsAIModalOpen(true),
    onToggleBack: () => wrappedUpdateUI({ showBack: !displayState.ui.showBack }),
    onZoomIn: () => wrappedUpdateUI({ zoom: Math.min((displayState.ui.zoom ?? 1) + 0.1, 2) }),
    onZoomOut: () => wrappedUpdateUI({ zoom: Math.max((displayState.ui.zoom ?? 1) - 0.1, 0.5) }),
    onResetZoom: () => wrappedUpdateUI({ zoom: 1 }),
    onEscape: () => {
      setIsTemplateGalleryOpen(false);
      setIsSaveTemplateModalOpen(false);
      setIsAIModalOpen(false);
      setIsBottomSheetOpen(false);
    },
  });

  // Swipe detection for mobile platform switching
  const touchStartXRef = React.useRef(0);
  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? 0;
  }, []);

  const handleTouchEnd = React.useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile) return;
      const endX = e.changedTouches[0]?.clientX ?? 0;
      const deltaX = endX - touchStartXRef.current;
      const threshold = 50;
      if (Math.abs(deltaX) < threshold) return;

      const nextView: PlatformView = deltaX > 0 ? 'apple' : 'google';
      wrappedUpdateUI({ platformView: nextView });
    },
    [isMobile, wrappedUpdateUI]
  );

  const handleSave = React.useCallback(() => {
    onSave?.(displayState);
    sessionRecovery.clearRecovery();
  }, [onSave, displayState, sessionRecovery]);

  const handleSaveAsTemplate = React.useCallback(() => {
    setIsSaveTemplateModalOpen(true);
  }, []);

  const handleConfirmSaveTemplate = React.useCallback(
    (name: string, description: string) => {
      setIsSaveTemplateModalOpen(false);
      onSaveAsTemplate?.(displayState);
      sessionRecovery.clearRecovery();
      // eslint-disable-next-line no-console
      console.log('Template saved:', { name, description });
    },
    [onSaveAsTemplate, displayState, sessionRecovery]
  );

  const handleAIGenerate = React.useCallback(() => {
    setIsTemplateGalleryOpen(false);
    setIsAIModalOpen(true);
  }, []);

  const handleApplyTemplate = React.useCallback(
    (variation: AIVariation) => {
      setUndoableState((prev: WalletPassStudioState) => ({
        ...prev,
        ...(variation.design.cardType && { cardType: variation.design.cardType }),
        ...(variation.design.industry && { industry: variation.design.industry }),
        ...(variation.design.colors && { colors: { ...prev.colors, ...variation.design.colors } }),
        ...(variation.design.name && { name: variation.design.name }),
        ui: {
          ...prev.ui,
          isModified: true,
        },
      }));
    },
    [setUndoableState]
  );

  const handleCloseAIModal = React.useCallback(() => {
    setIsAIModalOpen(false);
  }, []);

  const handleExport = React.useCallback(() => {
    // Placeholder for export — will be wired in a later phase
    // eslint-disable-next-line no-console
    console.log('Export triggered');
  }, []);

  const handleOpenTemplates = React.useCallback(() => {
    setIsTemplateGalleryOpen(true);
  }, []);

  const handleSelectTemplate = React.useCallback(
    (template: WalletTemplate) => {
      setUndoableState((prev: WalletPassStudioState) => ({
        ...prev,
        name: template.name,
        cardType: template.cardType,
        industry: template.industry,
        colors: template.colors,
        cardTypeConfig: template.cardTypeConfig as CardTypeConfig,
        barcode: template.barcode,
        backContent: template.backContent,
        apple: { ...prev.apple, ...template.apple },
        google: { ...prev.google, ...template.google },
        ui: { ...prev.ui, appliedTemplateId: template.id, isModified: true },
      }));
      setIsTemplateGalleryOpen(false);
    },
    [setUndoableState]
  );

  const handleCreateBlank = React.useCallback(() => {
    setIsTemplateGalleryOpen(false);
  }, []);

  // Auto-save hook
  const autoSave = useAutoSave(displayState, {
    key: displayState.id,
    intervalMs: 30000,
    enabled: true,
  });

  // On mobile, force single preview when view is 'both'
  const effectivePlatformView: PlatformView =
    isMobile && displayState.ui.platformView === 'both' ? 'apple' : displayState.ui.platformView;

  const handleRecoverSession = React.useCallback(() => {
    const recovered = sessionRecovery.recover();
    if (recovered) {
      setUndoableState((prev) => ({
        ...prev,
        ...recovered,
        ui: { ...prev.ui, ...recovered.ui, isModified: true },
      }));
    }
    sessionRecovery.clearRecovery();
  }, [sessionRecovery, setUndoableState]);

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full bg-neutral-50 dark:bg-neutral-950">
        {/* Recovery banner */}
        {sessionRecovery.hasRecovery && (
          <div className="flex items-center justify-between px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
            <span>Se detectó una sesión anterior sin guardar.</span>
            <button
              type="button"
              onClick={handleRecoverSession}
              className="px-3 py-1 rounded-md bg-amber-100 dark:bg-amber-800 hover:bg-amber-200 dark:hover:bg-amber-700 font-medium text-xs"
              data-testid="recovery-recover-btn"
            >
              Recuperar
            </button>
          </div>
        )}

        <StudioToolbar
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          platformView={displayState.ui.platformView}
          onPlatformViewChange={(view) => wrappedUpdateUI({ platformView: view })}
          zoom={displayState.ui.zoom}
          onZoomChange={(z) => wrappedUpdateUI({ zoom: z })}
          showBack={displayState.ui.showBack}
          onToggleBack={() => wrappedUpdateUI({ showBack: !displayState.ui.showBack })}
          designScore={undefined}
          onOpenTemplates={handleOpenTemplates}
          onSave={handleSave}
          onSaveAsTemplate={handleSaveAsTemplate}
          onExport={handleExport}
          onAIGenerate={handleAIGenerate}
          isModified={displayState.ui.isModified}
        />

        <div className="flex-1 flex overflow-hidden">
          <div
            className="flex-1 flex overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <StudioCanvas
              state={displayState}
              platformView={effectivePlatformView}
              showBack={displayState.ui.showBack}
            />
          </div>

          {/* Sidebar — hidden on mobile, narrower on tablet */}
          <div className="hidden md:flex flex-shrink-0 md:w-[280px] lg:w-[360px]">
            <StudioSidebar
              state={displayState}
              updateColors={wrappedUpdateColors}
              updateImages={wrappedUpdateImages}
              updateFields={wrappedUpdateFields}
              updateBarcode={wrappedUpdateBarcode}
              updateBackContent={wrappedUpdateBackContent}
              updateCardTypeConfig={wrappedUpdateCardTypeConfig}
              updateAppleConfig={wrappedUpdateAppleConfig}
              updateGoogleConfig={wrappedUpdateGoogleConfig}
              updateUI={wrappedUpdateUI}
            />
          </div>
        </div>

        {/* Auto-save indicator */}
        {autoSave.lastSaved && (
          <div className="absolute bottom-3 right-3 md:right-[292px] lg:right-[372px] z-20 px-2 py-1 rounded-md bg-neutral-800/80 dark:bg-white/10 text-[10px] text-white dark:text-neutral-300 backdrop-blur-sm">
            {t('wallet.studio.autoSave.savedAt', { time: autoSave.lastSaved.toLocaleTimeString() })}
          </div>
        )}

        {/* Mobile floating button */}
        {isMobile && (
          <button
            type="button"
            onClick={() => setIsBottomSheetOpen(true)}
            className="fixed bottom-4 right-4 z-40 w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Open editor"
            data-testid="mobile-sheet-toggle"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
        )}

        {/* Mobile bottom sheet */}
        <MobileBottomSheet
          isOpen={isBottomSheetOpen}
          onClose={() => setIsBottomSheetOpen(false)}
          title="Editor"
        >
          <StudioSidebar
            state={displayState}
            updateColors={wrappedUpdateColors}
            updateImages={wrappedUpdateImages}
            updateFields={wrappedUpdateFields}
            updateBarcode={wrappedUpdateBarcode}
            updateBackContent={wrappedUpdateBackContent}
            updateCardTypeConfig={wrappedUpdateCardTypeConfig}
            updateAppleConfig={wrappedUpdateAppleConfig}
            updateGoogleConfig={wrappedUpdateGoogleConfig}
            updateUI={wrappedUpdateUI}
          />
        </MobileBottomSheet>

        {/* Template Gallery */}
        <TemplateGallery
          isOpen={isTemplateGalleryOpen}
          onClose={() => setIsTemplateGalleryOpen(false)}
          onSelectTemplate={handleSelectTemplate}
          onCreateBlank={handleCreateBlank}
          onAIGenerate={handleAIGenerate}
        />

        {/* Save Template Modal */}
        <SaveTemplateModal
          isOpen={isSaveTemplateModalOpen}
          onClose={() => setIsSaveTemplateModalOpen(false)}
          onSave={handleConfirmSaveTemplate}
          defaultName={displayState.name}
        />

        {/* AI Design Assistant Modal */}
        <AIChatModal
          isOpen={isAIModalOpen}
          onClose={handleCloseAIModal}
          onApplyTemplate={handleApplyTemplate}
          initialCardType={displayState.cardType}
          initialIndustry={displayState.industry}
        />
      </div>
    </ErrorBoundary>
  );
}
