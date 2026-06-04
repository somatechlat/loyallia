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
