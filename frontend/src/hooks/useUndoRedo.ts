/**
 * Undo/redo hook with configurable history cap.
 *
 * Maintains a linear history of state snapshots. Supports undo, redo,
 * and structural deduplication via JSON.stringify comparison.
 *
 * All state reads inside setState use React functional updaters to
 * avoid stale-closure bugs when multiple updates are batched.
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
  const currentIndexRef = useRef(0);
  const lastUpdateRef = useRef<number>(0);
  const pendingRef = useRef<T | null>(null);

  // Keep ref in sync with state so setHistory functional updater can read it
  currentIndexRef.current = currentIndex;

  const setState = useCallback(
    (newState: T | ((prev: T) => T)) => {
      if (debounceMs > 0) {
        const now = Date.now();
        if (now - lastUpdateRef.current < debounceMs) {
          // Resolve and stash the pending value using the latest state from ref
          const latestIndex = currentIndexRef.current;
          setHistory((prev) => {
            const current = prev[latestIndex] ?? prev[prev.length - 1]!;
            const resolved =
              typeof newState === 'function'
                ? (newState as (prev: T) => T)(current)
                : newState;
            pendingRef.current = resolved;
            return prev; // don't change history yet
          });
          return;
        }
        lastUpdateRef.current = now;
      }

      // Both setHistory and setCurrentIndex use functional updaters only.
      // No closure-captured history/currentIndex reads.
      setHistory((prevHistory) => {
        const idx = currentIndexRef.current;
        const current = prevHistory[idx] ?? prevHistory[prevHistory.length - 1]!;
        const resolved =
          typeof newState === 'function'
            ? (newState as (prev: T) => T)(current)
            : newState;

        // Structural deduplication
        if (JSON.stringify(resolved) === JSON.stringify(current)) {
          return prevHistory;
        }

        // Truncate future history if not at the end, then append
        const base = prevHistory.slice(0, idx + 1);
        const next = [...base, resolved];
        if (next.length > maxHistory) {
          next.shift();
        }
        return next;
      });

      setCurrentIndex((prev) => Math.min(prev + 1, maxHistory - 1));
    },
    [maxHistory, debounceMs]
  );

  const undo = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const redo = useCallback(() => {
    setCurrentIndex((prev) => {
      // Read history length from the functional updater context isn't available,
      // so we use the ref-safe approach: the component re-renders with new
      // history.length, and canRedo is recomputed. The redo just increments;
      // the clamp happens via canRedo guard in the caller.
      return prev + 1;
    });
  }, []);

  // Clamp redo index against actual history length on render
  const clampedIndex = Math.min(currentIndex, history.length - 1);
  const canUndo = clampedIndex > 0;
  const canRedo = clampedIndex < history.length - 1;

  return {
    state: history[clampedIndex]!,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    historyLength: history.length,
  };
}
