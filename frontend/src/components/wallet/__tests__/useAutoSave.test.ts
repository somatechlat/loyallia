/**
 * Unit tests for useAutoSave hook.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutoSave } from '@/hooks/useAutoSave';

describe('useAutoSave', () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          store = {};
        },
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initial hasRecovery false when no draft exists', () => {
    const { result } = renderHook(() => useAutoSave({ count: 0 }, { key: 'test' }));

    expect(result.current.hasRecovery).toBe(false);
    expect(result.current.lastSaved).toBeNull();
    expect(result.current.isSaving).toBe(false);
  });

  it('state saved after interval', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result, rerender } = renderHook(
      ({ state }) => useAutoSave(state, { key: 'test', intervalMs: 5000 }),
      { initialProps: { state: { count: 0 } } }
    );

    expect(result.current.hasRecovery).toBe(false);

    rerender({ state: { count: 1 } });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(result.current.hasRecovery).toBe(true);
      expect(result.current.lastSaved).not.toBeNull();
    });

    vi.useRealTimers();
  });

  it('recover returns saved state', () => {
    const savedState = { count: 42 };
    store['wallet-studio-draft-test'] = JSON.stringify({
      data: savedState,
      timestamp: Date.now(),
    });

    const { result } = renderHook(() => useAutoSave({ count: 0 }, { key: 'test' }));

    expect(result.current.hasRecovery).toBe(true);

    const recovered = result.current.recover();
    expect(recovered).toEqual(savedState);
  });

  it('recover returns null when no draft exists', () => {
    const { result } = renderHook(() => useAutoSave({ count: 0 }, { key: 'test' }));

    const recovered = result.current.recover();
    expect(recovered).toBeNull();
  });

  it('clearRecovery removes from localStorage', () => {
    store['wallet-studio-draft-test'] = JSON.stringify({
      data: { count: 5 },
      timestamp: Date.now(),
    });

    const { result } = renderHook(() => useAutoSave({ count: 0 }, { key: 'test' }));

    expect(result.current.hasRecovery).toBe(true);

    act(() => {
      result.current.clearRecovery();
    });

    expect(result.current.hasRecovery).toBe(false);
    expect(store['wallet-studio-draft-test']).toBeUndefined();
  });

  it('saveNow immediately persists state', () => {
    const { result } = renderHook(() => useAutoSave({ count: 7 }, { key: 'test' }));

    act(() => {
      result.current.saveNow();
    });

    expect(result.current.hasRecovery).toBe(true);
    expect(result.current.lastSaved).not.toBeNull();

    const recovered = result.current.recover();
    expect(recovered).toEqual({ count: 7 });
  });

  it('handles localStorage errors gracefully', () => {
    const setItemSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded');
    });

    const { result } = renderHook(() => useAutoSave({ count: 0 }, { key: 'test' }));

    act(() => {
      result.current.saveNow();
    });

    expect(setItemSpy).toHaveBeenCalled();
    expect(result.current.isSaving).toBe(false);

    setItemSpy.mockRestore();
  });

  it('enabled=false disables auto-save', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result, rerender } = renderHook(
      ({ state }) => useAutoSave(state, { key: 'test', intervalMs: 1000, enabled: false }),
      { initialProps: { state: { count: 0 } } }
    );

    rerender({ state: { count: 1 } });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Should still be false because auto-save is disabled
    expect(result.current.hasRecovery).toBe(false);

    vi.useRealTimers();
  });
});
