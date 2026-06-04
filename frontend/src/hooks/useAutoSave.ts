/**
 * Auto-save hook that persists state to localStorage at a configurable interval.
 *
 * Provides manual save, recovery, and cleanup controls.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseAutoSaveReturn<T> {
  lastSaved: Date | null;
  isSaving: boolean;
  hasRecovery: boolean;
  saveNow: () => void;
  recover: () => T | null;
  clearRecovery: () => void;
}

export function useAutoSave<T>(
  state: T,
  options?: { key?: string; intervalMs?: number; enabled?: boolean }
): UseAutoSaveReturn<T> {
  const key = options?.key ?? 'default';
  const intervalMs = options?.intervalMs ?? 30000;
  const enabled = options?.enabled ?? true;

  const storageKey = `wallet-studio-draft-${key}`;

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasRecovery, setHasRecovery] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(storageKey) !== null;
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const persist = useCallback(() => {
    if (typeof window === 'undefined') return;

    setIsSaving(true);
    try {
      const payload = JSON.stringify({
        data: stateRef.current,
        timestamp: Date.now(),
      });
      localStorage.setItem(storageKey, payload);
      setLastSaved(new Date());
      setHasRecovery(true);
    } catch {
      // localStorage quota exceeded or other error — silently fail
    } finally {
      setIsSaving(false);
    }
  }, [storageKey]);

  // Interval-based auto-save
  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(() => {
      persist();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [enabled, intervalMs, persist]);

  const saveNow = useCallback(() => {
    persist();
  }, [persist]);

  const recover = useCallback((): T | null => {
    if (typeof window === 'undefined') return null;

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as { data: T; timestamp: number };
      return parsed.data;
    } catch {
      return null;
    }
  }, [storageKey]);

  const clearRecovery = useCallback(() => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(storageKey);
    setHasRecovery(false);
  }, [storageKey]);

  return {
    lastSaved,
    isSaving,
    hasRecovery,
    saveNow,
    recover,
    clearRecovery,
  };
}
