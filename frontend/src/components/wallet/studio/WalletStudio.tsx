/**
 * Main Wallet Pass Studio container.
 *
 * Composes the toolbar, canvas, and sidebar into a unified layout.
 * Wraps state management with undo/redo and auto-save.
 */

'use client';

import React from 'react';
import { useWalletStudio } from '@/hooks/useWalletStudio';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useI18n } from '@/lib/i18n';
import { StudioToolbar } from './StudioToolbar';
import { StudioCanvas } from './StudioCanvas';
import { StudioSidebar } from './StudioSidebar';
import type { WalletPassStudioState, CardTypeConfig } from '@/components/wallet/types/unified-state';

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

  const handleSave = React.useCallback(() => {
    onSave?.(displayState);
  }, [onSave, displayState]);

  const handleSaveAsTemplate = React.useCallback(() => {
    onSaveAsTemplate?.(displayState);
  }, [onSaveAsTemplate, displayState]);

  const handleAIGenerate = React.useCallback(() => {
    // Placeholder for AI generation — will be wired in a later phase
    // eslint-disable-next-line no-console
    console.log('AI Generate triggered');
  }, []);

  const handleOpenTemplates = React.useCallback(() => {
    // Placeholder for template gallery — will be wired in a later phase
    // eslint-disable-next-line no-console
    console.log('Open templates triggered');
  }, []);

  // Auto-save hook
  const autoSave = useAutoSave(displayState, {
    key: displayState.id,
    intervalMs: 30000,
    enabled: true,
  });

  return (
    <div className="flex flex-col h-full bg-neutral-50 dark:bg-neutral-950">
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
        onAIGenerate={handleAIGenerate}
        isModified={displayState.ui.isModified}
      />

      <div className="flex-1 flex overflow-hidden">
        <StudioCanvas
          state={displayState}
          platformView={displayState.ui.platformView}
          showBack={displayState.ui.showBack}
        />
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

      {/* Auto-save indicator */}
      {autoSave.lastSaved && (
        <div className="absolute bottom-3 right-[372px] z-20 px-2 py-1 rounded-md bg-neutral-800/80 dark:bg-white/10 text-[10px] text-white dark:text-neutral-300 backdrop-blur-sm">
          {t('wallet.studio.autoSave.savedAt', { time: autoSave.lastSaved.toLocaleTimeString() })}
        </div>
      )}
    </div>
  );
}
