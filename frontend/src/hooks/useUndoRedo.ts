/**
 * Undo/redo hook with configurable history cap.
 *
 * Maintains a linear history of state snapshots. Supports undo, redo,
 * and structural deduplication via JSON.stringify comparison.
 */

import { useState, useCallback, useRef } from 'react';

export interface UseUndoRedoReturn<T> {
  state: T;
  setState: (newState: T | ((prev: T) => T)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyLength: number;
}

export function useUndoRedo<T>(
  initialState: T,
  options?: { maxHistory?: number; debounceMs?: number }
): UseUndoRedoReturn<T> {
  const maxHistory = options?.maxHistory ?? 50;
  const debounceMs = options?.debounceMs ?? 0;

  const [history, setHistory] = useState<T[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const lastUpdateRef = useRef<number>(0);
  const pendingRef = useRef<T | null>(null);

  const state = history[currentIndex]!;

  const setState = useCallback(
    (newState: T | ((prev: T) => T)) => {
      const current = history[currentIndex]!;
      const resolved =
        typeof newState === 'function'
          ? (newState as (prev: T) => T)(current)
          : newState;

      // Structural deduplication
      if (JSON.stringify(resolved) === JSON.stringify(current)) {
        return;
      }

      if (debounceMs > 0) {
        const now = Date.now();
        if (now - lastUpdateRef.current < debounceMs) {
          pendingRef.current = resolved;
          return;
        }
        lastUpdateRef.current = now;
      }

      setHistory((prev) => {
        // Truncate future history if not at the end
        const base = prev.slice(0, currentIndex + 1);
        const next = [...base, resolved];
        if (next.length > maxHistory) {
          next.shift();
        }
        return next;
      });

      setCurrentIndex((prev) => {
        const nextIndex = Math.min(prev + 1, maxHistory - 1);
        // If we truncated history due to maxHistory, adjust index
        return nextIndex;
      });
    },
    [currentIndex, history, maxHistory, debounceMs]
  );

  const undo = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const redo = useCallback(() => {
    setCurrentIndex((prev) => Math.min(history.length - 1, prev + 1));
  }, [history.length]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  return {
    state,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    historyLength: history.length,
  };
}
