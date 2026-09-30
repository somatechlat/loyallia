/**
 * Full-screen shell around the existing WalletStudio.
 *
 * Re-layout only: every studio element (toolbar, activity rail, tool panel,
 * canvas, properties, status bar) is reused exactly as-is. This component
 * just gives the designer the whole viewport and a door back to the wizard.
 *
 * Contracts:
 * - Guardar (studio onSave) = persist only, designer STAYS OPEN.
 * - Listo (header Done) = persist then close.
 * - Escape closes one open modal (LIFO); only then the designer.
 * - html + body overflow locked while open (no page scroll).
 */

'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';
import { bindStudioEscapeFallback } from '@/hooks/useModalStack';
import { WalletStudio } from './WalletStudio';
import type { WalletPassStudioState } from '@/components/wallet/types/unified-state';

export interface WalletDesignerOverlayProps {
  open: boolean;
  /** Return to the wizard step. State is preserved by the parent. */
  onClose: () => void;
  /** Persist only — designer stays open (Guardar). */
  onSave?: (state: WalletPassStudioState) => void | Promise<void>;
  /** Persist, then return to the wizard (Listo). */
  onSaveAndClose?: (state: WalletPassStudioState) => void | Promise<void>;
  /** Called on every state change so the parent summary stays live. */
  onChange?: (state: WalletPassStudioState) => void;
  initialState?: Partial<WalletPassStudioState>;
  programId?: string;
  externalName?: string;
  externalDescription?: string;
  /** Step label shown in the shell (e.g. "Paso 3 · Diseño"). */
  contextLabel?: string;
}

export function WalletDesignerOverlay({
  open,
  onClose,
  onSave,
  onSaveAndClose,
  onChange,
  initialState,
  programId,
  externalName,
  externalDescription,
  contextLabel,
}: WalletDesignerOverlayProps) {
  const { t } = useI18n();
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const lastStateRef = React.useRef<WalletPassStudioState | null>(null);

  const handleChange = React.useCallback(
    (state: WalletPassStudioState) => {
      lastStateRef.current = state;
      onChange?.(state);
    },
    [onChange]
  );

  // Single Escape owner while the designer is open: closes ONE studio modal
  // (LIFO); only when none is open does it close the designer.
  React.useEffect(() => {
    if (!open) return;
    return bindStudioEscapeFallback(onClose);
  }, [open, onClose]);

  // Lock html + body scroll while the designer owns the screen.
  React.useEffect(() => {
    if (!open) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [open]);

  React.useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  const handleDone = React.useCallback(async () => {
    const state = lastStateRef.current;
    if (onSaveAndClose && state) {
      await onSaveAndClose(state);
    }
    onClose();
  }, [onSaveAndClose, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('wallet.studio.overlay.title')}
      data-testid="wallet-designer-overlay"
      className="fixed inset-0 z-[100] flex flex-col bg-surface-50 dark:bg-surface-950"
    >
      {/* Shell chrome — the door back to the wizard. Studio chrome lives inside WalletStudio. */}
      <header className="flex items-center justify-between gap-3 px-4 py-2 border-b border-surface-200 dark:border-surface-800 bg-white/90 dark:bg-surface-900/90 backdrop-blur shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            data-testid="wallet-designer-back"
            className="btn-ghost text-sm flex items-center gap-1.5 shrink-0"
            aria-label={t('wallet.studio.overlay.back')}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {t('wallet.studio.overlay.back')}
          </button>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-surface-900 dark:text-white truncate">
              {t('wallet.studio.overlay.title')}
            </p>
            {contextLabel ? (
              <p className="text-[11px] text-surface-400 truncate">{contextLabel}</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden md:inline text-[11px] text-surface-400">{t('wallet.studio.overlay.escHint')}</span>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-sm"
            data-testid="wallet-designer-close"
          >
            {t('wallet.studio.overlay.close')}
          </button>
          <button
            type="button"
            onClick={() => {
              void handleDone();
            }}
            className="btn-primary text-sm"
            data-testid="wallet-designer-done"
          >
            {t('wallet.studio.overlay.done')}
          </button>
        </div>
      </header>

      {/* The existing studio, unchanged, filling every remaining pixel. */}
      <div className="flex-1 min-h-0" data-testid="wallet-designer-stage">
        <WalletStudio
          initialState={initialState}
          programId={programId}
          externalName={externalName}
          externalDescription={externalDescription}
          onChange={handleChange}
          onSave={onSave ?? onSaveAndClose}
          /* Non-null tells the studio the shell owns Escape (no double-bind). */
          escapeFallback={onClose}
        />
      </div>
    </div>
  );
}
