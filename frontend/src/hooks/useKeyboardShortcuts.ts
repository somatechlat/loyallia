/**
 * Keyboard shortcuts hook for Wallet Pass Studio.
 *
 * Binds global keydown listeners for studio actions per SRS-003 Section 11.
 */

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcutsConfig {
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
  onExport?: () => void;
  onAIOpen?: () => void;
  onToggleBack?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onEscape?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onNudge?: (direction: 'up' | 'down' | 'left' | 'right', amount: number) => void;
  onToggleGrid?: () => void;
  onNextField?: () => void;
  onPrevField?: () => void;
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const { key, ctrlKey, metaKey, shiftKey } = event;
      const mod = ctrlKey || metaKey;

      // Ignore shortcuts when typing in inputs, textareas, or contenteditable
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
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

      if (key.toLowerCase() === 'b' && !mod) {
        event.preventDefault();
        config.onToggleBack?.();
        return;
      }

      if (mod && key.toLowerCase() === 'd') {
        event.preventDefault();
        config.onDuplicate?.();
        return;
      }

      if (key === 'Delete' || key === 'Backspace') {
        event.preventDefault();
        config.onDelete?.();
        return;
      }

      if (mod && key.toLowerCase() === 'g') {
        event.preventDefault();
        config.onToggleGrid?.();
        return;
      }

      if (key === 'Tab') {
        event.preventDefault();
        if (shiftKey) {
          config.onPrevField?.();
        } else {
          config.onNextField?.();
        }
        return;
      }

      // Nudge: arrow keys (with optional Shift for 10px)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        event.preventDefault();
        const directionMap: Record<string, 'up' | 'down' | 'left' | 'right'> = {
          ArrowUp: 'up',
          ArrowDown: 'down',
          ArrowLeft: 'left',
          ArrowRight: 'right',
        };
        const amount = shiftKey ? 10 : 1;
        config.onNudge?.(directionMap[key], amount);
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
