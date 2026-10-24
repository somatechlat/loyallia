/**
 * Session recovery hook for Wallet Pass Studio.
 *
 * Detects unsaved drafts from a crashed or closed session and offers
 * recovery on mount. Clears recovery after successful save.
 */

import { useState, useCallback, useEffect } from 'react';
import type { WalletPassStudioState } from '@/components/wallet/types/unified-state';

const RECOVERY_KEY = 'wallet-studio-session-recovery';

export interface UseSessionRecoveryReturn {
  hasRecovery: boolean;
  recover: () => Partial<WalletPassStudioState> | null;
  clearRecovery: () => void;
}

export function useSessionRecovery(): UseSessionRecoveryReturn {
  const [hasRecovery, setHasRecovery] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(RECOVERY_KEY);
    setHasRecovery(raw !== null);
  }, []);

  const recover = useCallback((): Partial<WalletPassStudioState> | null => {
    if (typeof window === 'undefined') return null;

    try {
      const raw = localStorage.getItem(RECOVERY_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as { state: Partial<WalletPassStudioState>; timestamp: number };
      return parsed.state ?? null;
    } catch {
      return null;
    }
  }, []);

  const clearRecovery = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(RECOVERY_KEY);
    setHasRecovery(false);
  }, []);

  return {
    hasRecovery,
    recover,
    clearRecovery,
  };
}

/**
 * Persist current state as recoverable session data.
 * Call this before unmount or periodically to enable crash recovery.
 */
export function persistSessionState(state: Partial<WalletPassStudioState>): void {
  if (typeof window === 'undefined') return;
  try {
    const payload = JSON.stringify({
      state,
      timestamp: Date.now(),
    });
    localStorage.setItem(RECOVERY_KEY, payload);
  } catch {
    // Silently fail on localStorage errors (e.g. quota exceeded)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-flow draft autosave (additive).
//
// Same localStorage pattern as the studio recovery above, but keyed per flow so
// several wizards can keep independent drafts. Each flow persists its snapshot
// periodically + on `beforeunload`, offers a "Recuperar borrador" / "Descartar"
// banner on mount, and clears the draft ONLY after a successful submit (or an
// explicit discard).
// ─────────────────────────────────────────────────────────────────────────────

/** Per-flow localStorage draft keys. */
export const DRAFT_KEYS = {
  /** campaigns/CampaignWizard */
  campaignWizard: 'campaign-wizard-draft',
  /** automation/AutomationModal */
  automationModal: 'automation-modal-draft',
  /** programs/new wizard page */
  programNew: 'program-new-draft',
} as const;

/** Shape of a persisted draft payload. */
interface DraftPayload<T> {
  state: T;
  timestamp: number;
}

/** Recovery surface for one flow-scoped draft. */
export interface DraftRecovery<T> {
  /** True when a persisted draft exists (checked on mount). */
  hasDraft: boolean;
  /** Read the persisted draft (or null when absent/corrupt). */
  recoverDraft: () => T | null;
  /** Explicitly discard the persisted draft. */
  discardDraft: () => void;
  /** Persist the current state as the flow's draft. */
  persistDraft: (state: T) => void;
}

/** Read a flow draft from localStorage. Returns null when absent or corrupt. */
export function readDraftState<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftPayload<T>;
    return (parsed?.state ?? null) as T | null;
  } catch {
    return null;
  }
}

/** Persist a flow draft to localStorage. Silently ignores quota errors. */
export function persistDraftState<T>(key: string, state: T): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: DraftPayload<T> = { state, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Silently fail on localStorage errors (e.g. quota exceeded)
  }
}

/** Remove a flow draft from localStorage. */
export function clearDraftState(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Silently fail on localStorage errors
  }
}

/**
 * Per-flow draft recovery hook (same contract as {@link useSessionRecovery},
 * scoped by `key`). Detects unsaved drafts from a crashed or closed session and
 * offers recovery on mount.
 */
export function useDraftRecovery<T>(key: string): DraftRecovery<T> {
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(key);
    setHasDraft(raw !== null);
  }, [key]);

  const recoverDraft = useCallback((): T | null => readDraftState<T>(key), [key]);

  const discardDraft = useCallback(() => {
    clearDraftState(key);
    setHasDraft(false);
  }, [key]);

  const persistDraft = useCallback((state: T) => persistDraftState<T>(key, state), [key]);

  return { hasDraft, recoverDraft, discardDraft, persistDraft };
}
