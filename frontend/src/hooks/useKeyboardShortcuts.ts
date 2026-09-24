/**
 * Keyboard shortcuts hook for Wallet Pass Studio.
 *
 * Binds global keydown listeners for studio actions per SRS-003 Section 11.
 * The browser keeps ownership of Tab, page scrolling, and typing in any
 * form control — shortcuts only claim a key when they will actually act.
 */

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcutsConfig {
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
  onExport?: () => void;
  onAIOpen?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onEscape?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onNudge?: (direction: 'up' | 'down' | 'left' | 'right', amount: number) => void;
  onToggleGrid?: () => void;
  /**
   * True while a canvas field is selected. Gates Delete and the nudge
   * arrows so they never steal keys from the page around the studio.
   */
  hasSelection?: boolean;
}

/** Any element the user can be typing or operating in with the keyboard. */
function isEditingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  if (typeof el.closest === 'function') {
    return Boolean(
      el.closest(
        'input, textarea, select, button, [contenteditable=""], [contenteditable="true"]'
      )
    );
  }
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON';
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const { key, ctrlKey, metaKey, shiftKey } = event;
      const mod = ctrlKey || metaKey;

      // Ignore shortcuts when typing in or operating any form control.
      if (isEditingTarget(event.target)) {
        // Allow Escape even in inputs
        if (key !== 'Escape') return;
      }

      if (mod && shiftKey && key.toLowerCase() === 'z') {
        event.preventDefault();
        config.onRedo?.();
        return;
      }

      if (mod && key.toLowerCase() === 'z') {
        event.preventDefault();
        config.onUndo?.();
        return;
      }

      if (mod && key.toLowerCase() === 's') {
        event.preventDefault();
        config.onSave?.();
        return;
      }

      if (mod && key.toLowerCase() === 'e') {
        event.preventDefault();
        config.onExport?.();
        return;
      }

      if (mod && key.toLowerCase() === 'i') {
        event.preventDefault();
        config.onAIOpen?.();
        return;
      }

      if (mod && (key === '+' || key === '=')) {
        event.preventDefault();
        config.onZoomIn?.();
        return;
      }

      if (mod && key === '-') {
        event.preventDefault();
        config.onZoomOut?.();
        return;
      }

      if (mod && key === '0') {
        event.preventDefault();
        config.onResetZoom?.();
        return;
      }

      if (mod && key.toLowerCase() === 'd') {
        if (!config.hasSelection) return;
        event.preventDefault();
        config.onDuplicate?.();
        return;
      }

      if (key === 'Delete' || key === 'Backspace') {
        // Only claim the key when there is something to delete — otherwise
        // Backspace must keep working as browser history.
        if (!config.hasSelection || !config.onDelete) return;
        event.preventDefault();
        config.onDelete();
        return;
      }

      if (mod && key.toLowerCase() === 'g') {
        event.preventDefault();
        config.onToggleGrid?.();
        return;
      }

      // Nudge: arrow keys (with optional Shift for 10px). Only while a
      // field is selected — otherwise the page must keep scrolling.
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        if (!config.hasSelection || !config.onNudge) return;
        event.preventDefault();
        const directionMap: Record<string, 'up' | 'down' | 'left' | 'right'> = {
          ArrowUp: 'up',
          ArrowDown: 'down',
          ArrowLeft: 'left',
          ArrowRight: 'right',
        };
        const amount = shiftKey ? 10 : 1;
        config.onNudge(directionMap[key]!, amount);
        return;
      }

      if (key === 'Escape') {
        config.onEscape?.();
        return;
      }
    },
    [config]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
