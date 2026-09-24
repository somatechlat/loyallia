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
import toast from 'react-hot-toast';
import { useWalletStudio } from '@/hooks/useWalletStudio';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSessionRecovery, persistSessionState } from '@/hooks/useSessionRecovery';
import { useI18n } from '@/lib/i18n';
import { useDesignScore } from '@/hooks/useDesignScore';
import { generatePreviewPass, triggerDownload, openGoogleSaveUrl } from '@/components/wallet/services/export';

import { StudioToolbar } from './StudioToolbar';
import { StudioCanvas } from './StudioCanvas';
import { StudioSidebar } from './StudioSidebar';
import { ActivityBar } from './ActivityBar';
import { PropertiesPanel } from './PropertiesPanel';
import { TemplateGallery } from './TemplateGallery';
import { SaveTemplateModal } from './SaveTemplateModal';
import { DesignScore } from './DesignScore';
import { AIChatModal } from './AIChatModal';
import { MobileBottomSheet } from './MobileBottomSheet';
import { ErrorBoundary } from './ErrorBoundary';

import type { WalletPassStudioState, CardTypeConfig, PlatformView } from '@/components/wallet/types/unified-state';
import type { WalletTemplate } from '@/components/wallet/types/templates';
import type { AIVariation } from '@/hooks/useAI';

export interface WalletStudioProps {
  initialState?: Partial<WalletPassStudioState>;
  programId?: string;
  /**
   * Persist the design. Return a Promise to mean "saved to the server" —
   * only then does the studio clear the crash draft and report Guardado.
   * A synchronous return means the parent accepted state locally (wizard);
   * the draft is kept and nothing is claimed as saved.
   */
  onSave?: (state: WalletPassStudioState) => void | Promise<void>;
  /** Called on every state change (colors, images, fields, etc.). Keeps parent in sync. */
  onChange?: (state: WalletPassStudioState) => void;
  /** External name override (e.g. from program creation wizard form). Synced live into preview. */
  externalName?: string;
  /** External description override. Synced live into preview. */
  externalDescription?: string;
}

export function WalletStudio({ initialState, programId, onSave, onChange, externalName, externalDescription }: WalletStudioProps) {
  const { t } = useI18n();
  const studio = useWalletStudio(initialState);
  const { state: undoableState, setState: setUndoableState, undo, redo, canUndo, canRedo } = useUndoRedo(
    studio.state,
    { maxHistory: 50 }
  );

  // Sync external name/description changes into the live preview state
  const prevExternalNameRef = React.useRef(externalName);
  const prevExternalDescRef = React.useRef(externalDescription);
  React.useEffect(() => {
    const nameChanged = externalName !== undefined && externalName !== prevExternalNameRef.current;
    const descChanged = externalDescription !== undefined && externalDescription !== prevExternalDescRef.current;
    if (nameChanged || descChanged) {
      prevExternalNameRef.current = externalName;
      prevExternalDescRef.current = externalDescription;
      setUndoableState((prev: WalletPassStudioState) => ({
        ...prev,
        ...(nameChanged ? { name: externalName! } : {}),
        ...(descChanged ? { apple: { ...prev.apple, description: externalDescription! } } : {}),
      }));
    }
  }, [externalName, externalDescription, setUndoableState]);

  // Override studio.state with undoable state for rendering
  const displayState = undoableState;

  // Sync displayState changes to parent via onChange callback
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  React.useEffect(() => {
    onChangeRef.current?.(displayState);
  }, [displayState]);

  // Score the DISPLAY state (not the frozen studio.state) so the design
  // score updates live as the user edits colors, images, fields, etc.
  const designScoreResult = useDesignScore(displayState);

  // Sync studio state into undo/redo when studio state changes externally
  // (e.g. setCardType, resetState)
  const prevStudioStateRef = React.useRef(studio.state);
  React.useEffect(() => {
    if (studio.state !== prevStudioStateRef.current) {
      prevStudioStateRef.current = studio.state;
      setUndoableState(studio.state);
    }
  }, [studio.state, setUndoableState]);

  // Wire updaters to go through undo/redo
  const wrappedUpdateColors = React.useCallback(
    (colors: Parameters<typeof studio.updateColors>[0]) => {
      setUndoableState((prev: WalletPassStudioState) => ({
        ...prev,
        colors: { ...prev.colors, ...colors },
        google: {
          ...prev.google,
          hexBackgroundColor: colors.background ?? prev.google.hexBackgroundColor,
        },
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

  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = React.useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const platform = displayState.ui.platformView === 'google' ? 'google' : 'apple';
      const payload: Record<string, unknown> = { platform };
      if (programId) {
        payload.program_id = programId;
      } else {
        // For new programs, serialize the studio state
        const { buildWalletDesignMetadata } = await import('@/components/wallet/serialization');
        payload.studio_state = buildWalletDesignMetadata(displayState);
      }
      const result = await generatePreviewPass(payload as { platform: 'apple' | 'google'; program_id?: string; studio_state?: Record<string, unknown> });
      if (result.message && !result.download_url && !result.save_url) {
        toast.error(result.message);
        return;
      }
      if (platform === 'apple' && result.download_url) {
        await triggerDownload(result.download_url, `${displayState.name || 'preview'}.pkpass`);
        toast.success(t('wallet.studio.export.appleSuccess'));
      } else if (platform === 'google' && result.save_url) {
        openGoogleSaveUrl(result.save_url);
        toast.success(t('wallet.studio.export.googleSuccess'));
      } else {
        toast.error(t('wallet.studio.export.error'));
      }
    } catch (err) {
      toast.error(t('wallet.studio.export.error'));
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, programId, displayState, t]);

  const [isTemplateGalleryOpen, setIsTemplateGalleryOpen] = React.useState(false);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = React.useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = React.useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = React.useState(false);
  const [isScorePanelOpen, setIsScorePanelOpen] = React.useState(false);

  // Mobile detection
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Session recovery — one draft key for the whole studio.
  const sessionRecovery = useSessionRecovery();
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null);
  // Identity of the state last accepted by an async onSave. While the live
  // state is that same object there is nothing unsaved to snapshot.
  const lastSavedStateRef = React.useRef<WalletPassStudioState | null>(null);

  React.useEffect(() => {
    const persistDraft = () => {
      if (lastSavedStateRef.current === displayState) return;
      persistSessionState(displayState);
    };
    const timer = setInterval(persistDraft, 30000);
    window.addEventListener('beforeunload', persistDraft);
    return () => {
      clearInterval(timer);
      window.removeEventListener('beforeunload', persistDraft);
    };
  }, [displayState]);

  // Keyboard shortcuts -- defined after handleSave to avoid use-before-declaration
  // (moved below handleSave definition)

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

  const handleSave = React.useCallback(async () => {
    if (!onSave) {
      // Nowhere to persist to — keep the local crash draft, claim nothing.
      persistSessionState(displayState);
      return;
    }
    try {
      const result = onSave(displayState);
      const isAsync = typeof (result as Promise<void> | undefined)?.then === 'function';
      if (!isAsync) {
        // Parent accepted state into React only (e.g. create wizard).
        persistSessionState(displayState);
        return;
      }
      await result;
      lastSavedStateRef.current = displayState;
      sessionRecovery.clearRecovery();
      setLastSavedAt(new Date());
      toast.success(t('wallet.studio.save.success'));
    } catch {
      toast.error(t('wallet.studio.save.error'));
      // Failed persist — make sure the work is still snapshotted locally.
      persistSessionState(displayState);
    }
  }, [onSave, displayState, sessionRecovery, t]);

  // Keyboard shortcuts -- memoize config to avoid re-registering listeners on every render
  const keyboardConfig = React.useMemo(() => ({
    onUndo: undo,
    onRedo: redo,
    onSave: () => {
      void handleSave();
    },
    onExport: handleExport,
    onAIOpen: () => setIsAIModalOpen(true),
    onZoomIn: () => wrappedUpdateUI({ zoom: Math.min((displayState.ui.zoom ?? 1) + 0.1, 2) }),
    onZoomOut: () => wrappedUpdateUI({ zoom: Math.max((displayState.ui.zoom ?? 1) - 0.1, 0.5) }),
    onResetZoom: () => wrappedUpdateUI({ zoom: 1 }),
    onEscape: () => {
      setIsTemplateGalleryOpen(false);
      setIsSaveTemplateModalOpen(false);
      setIsAIModalOpen(false);
      setIsBottomSheetOpen(false);
      studio.setSelectedFieldId(null);
    },
    onDuplicate: () => {
      if (studio.selectedFieldId) studio.duplicateField(studio.selectedFieldId, t('wallet.studio.field.duplicateSuffix'));
    },
    onDelete: () => {
      if (!studio.selectedFieldId) return;
      // Never destroy a field silently.
      if (!window.confirm(t('wallet.studio.field.deleteConfirm'))) return;
      studio.deleteField(studio.selectedFieldId);
    },
    onNudge: (direction: 'up' | 'down' | 'left' | 'right', amount: number) => {
      if (studio.selectedFieldId) studio.nudgeField(studio.selectedFieldId, direction, amount);
    },
    onToggleGrid: () => wrappedUpdateUI({ showGrid: !displayState.ui.showGrid }),
    hasSelection: Boolean(studio.selectedFieldId),
  }), [undo, redo, handleSave, handleExport, wrappedUpdateUI, displayState.ui.zoom, displayState.ui.showGrid, studio]);
  useKeyboardShortcuts(keyboardConfig);

  const handleSaveAsTemplate = React.useCallback(() => {
    setIsSaveTemplateModalOpen(true);
  }, []);

  const handleConfirmSaveTemplate = React.useCallback(
    async (name: string, description: string) => {
      setIsSaveTemplateModalOpen(false);
      try {
        const { buildWalletDesignMetadata } = await import('@/components/wallet/serialization');
        const { walletTemplatesApi } = await import('@/lib/api');
        await walletTemplatesApi.create({
          name,
          description,
          card_type: displayState.cardType,
          industry: displayState.industry,
          design_state: buildWalletDesignMetadata(displayState) as Record<string, unknown>,
          include_back_content: true,
        });
        toast.success(t('wallet.studio.template.saved'));
      } catch {
        toast.error(t('wallet.studio.template.saveError'));
      }
      // Saving a template is NOT saving the program — never touch the draft.
    },
    [displayState, t]
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

  const handleOpenTemplates = React.useCallback(() => {
    setIsTemplateGalleryOpen(true);
  }, []);

  const handleSelectTemplate = React.useCallback(
    (template: WalletTemplate) => {
      if (displayState.ui.isModified) {
        const confirmed = window.confirm(t('wallet.studio.unsavedChanges.confirm'));
        if (!confirmed) return;
      }
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
      <div className="relative flex flex-col h-full bg-surface-50 dark:bg-surface-950">
        {/* Recovery banner */}
        {sessionRecovery.hasRecovery && (
          <div className="flex items-center justify-between px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
            <span>{t('wallet.studio.recovery.unsavedSession')}</span>
            <button
              type="button"
              onClick={handleRecoverSession}
              className="px-3 py-1 rounded-md bg-amber-100 dark:bg-amber-800 hover:bg-amber-200 dark:hover:bg-amber-700 font-medium text-xs"
              data-testid="recovery-recover-btn"
            >
              {t('wallet.studio.recovery.recover')}
            </button>
          </div>
        )}

        <StudioToolbar
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          platformView={displayState.ui.platformView}
          onPlatformViewChange={(view) => {
            wrappedUpdateUI({ platformView: view });
            // Auto-transfer Apple images to Google when switching to Google view
            if (view === 'google') {
              const imgs = displayState.images;
              const patch: Partial<typeof imgs> = {};
              if (imgs.strip && !imgs.heroImage) patch.heroImage = imgs.strip;
              if (imgs.logo && !imgs.wideLogo) patch.wideLogo = imgs.logo;
              if (imgs.icon && !imgs.icon2x) patch.icon2x = imgs.icon;
              if (Object.keys(patch).length > 0) {
                wrappedUpdateImages(patch);
                toast.success(t('wallet.studio.images.autoTransferred'));
              }
            }
          }}
          zoom={displayState.ui.zoom}
          onZoomChange={(z) => wrappedUpdateUI({ zoom: z })}
          showBack={displayState.ui.showBack}
          onToggleBack={() => wrappedUpdateUI({ showBack: !displayState.ui.showBack })}
          designScore={designScoreResult.score}
          onScoreClick={() => setIsScorePanelOpen(true)}
          onOpenTemplates={handleOpenTemplates}
          onSave={() => {
            void handleSave();
          }}
          onSaveAsTemplate={handleSaveAsTemplate}
          onExport={handleExport}
          isExporting={isExporting}
          onAIGenerate={handleAIGenerate}
          isModified={displayState.ui.isModified}
        />

        <div className="flex-1 flex overflow-hidden">
          {/* Activity Bar — labeled tool rail (IDE-style), sole chooser on desktop */}
          {!isMobile && (
            <div className="hidden md:block">
              <ActivityBar
                activeTool={displayState.ui.activeTab}
                onSelect={(tool) => wrappedUpdateUI({ activeTab: tool })}
              />
            </div>
          )}

          {/* Tool panel — always open on desktop (never a blank cockpit) */}
          {!isMobile && (
            <div
              className="hidden md:flex flex-shrink-0 h-full w-[340px] lg:w-[400px] xl:w-[460px] border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
              data-testid="studio-tool-panel-wrapper"
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
                onOpenAI={() => setIsAIModalOpen(true)}
              />
            </div>
          )}

          {/* Canvas — center, takes remaining space */}
          <div
            className="flex-1 flex overflow-hidden"
            {...(isMobile ? { onTouchStart: handleTouchStart, onTouchEnd: handleTouchEnd } : {})}
          >
            <StudioCanvas
              state={displayState}
              platformView={effectivePlatformView}
              showBack={displayState.ui.showBack}
              zoom={displayState.ui.zoom}
            />
          </div>

          {/* Properties Panel — right side, context-sensitive */}
          <div className="hidden lg:block">
            <PropertiesPanel
              state={displayState}
              selectedFieldId={studio.selectedFieldId}
              designScore={designScoreResult.score}
            />
          </div>
        </div>

        {/* Bottom status bar (Adobe-style) */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 text-[10px] text-neutral-500 dark:text-neutral-400 shrink-0">
          <div className="flex items-center gap-3">
            <span>{displayState.cardType ? t(`programs.cardTypes.${displayState.cardType}`) : ''}</span>
            <span className="text-neutral-300 dark:text-neutral-600">|</span>
            <span>{displayState.fields.length} {t('wallet.studio.statusBar.fields')}</span>
            <span className="text-neutral-300 dark:text-neutral-600">|</span>
            <span>{Math.round((displayState.ui.zoom ?? 1) * 100)}%</span>
          </div>
          <div className="flex items-center gap-3">
            {lastSavedAt && (
              <span data-testid="studio-saved-at">{t('wallet.studio.save.savedAt', { time: lastSavedAt.toLocaleTimeString() })}</span>
            )}
            {displayState.ui.isModified && (
              <span className="text-amber-500">{t('wallet.studio.statusBar.unsaved')}</span>
            )}
          </div>
        </div>

        {/* Mobile floating button (opens the bottom sheet) */}
        {isMobile && (
          <button
            type="button"
            onClick={() => setIsBottomSheetOpen(true)}
            className="fixed bottom-4 right-4 z-40 w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={t('wallet.studio.mobile.openEditor')}
            data-testid="mobile-sheet-toggle"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
        )}

        {/* Mobile bottom sheet — same STUDIO_TOOLS registry, horizontal orientation */}
        {isMobile && isBottomSheetOpen && (
          <MobileBottomSheet
            isOpen={isBottomSheetOpen}
            onClose={() => setIsBottomSheetOpen(false)}
            title={t('wallet.studio.mobile.editor')}
          >
            <div data-testid="mobile-tool-switcher" className="mb-2">
              <ActivityBar
                activeTool={displayState.ui.activeTab}
                onSelect={(tool) => wrappedUpdateUI({ activeTab: tool })}
                orientation="horizontal"
              />
            </div>
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
              onOpenAI={() => setIsAIModalOpen(true)}
            />
          </MobileBottomSheet>
        )}

        {/* Template Gallery */}
        <TemplateGallery
          isOpen={isTemplateGalleryOpen}
          onClose={() => setIsTemplateGalleryOpen(false)}
          onSelectTemplate={handleSelectTemplate}
          onCreateBlank={handleCreateBlank}
        />

        {/* Save Template Modal */}
        <SaveTemplateModal
          isOpen={isSaveTemplateModalOpen}
          onClose={() => setIsSaveTemplateModalOpen(false)}
          onSave={handleConfirmSaveTemplate}
          defaultName={displayState.name}
        />

        {/* Design Score detail panel */}
        {isScorePanelOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsScorePanelOpen(false)}
              data-testid="design-score-backdrop"
            />
            <div className="relative z-10 w-full max-w-lg mx-4 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                  {t('wallet.studio.properties.designScore')}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsScorePanelOpen(false)}
                  className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  aria-label={t('common.close')}
                  data-testid="design-score-close"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
              <div className="max-h-[70vh] overflow-y-auto p-4">
                <DesignScore result={designScoreResult} />
              </div>
            </div>
          </div>
        )}

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
