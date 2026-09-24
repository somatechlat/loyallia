/**
 * Honest-save contract for Wallet Studio (U2).
 *
 * Locks: Guardar only claims "Guardado" after a real async persist,
 * never destroys the crash draft on a failed or local-only save,
 * save-as-template never touches the program draft, and there is
 * exactly one draft key (no wallet-studio-draft-* twin).
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { walletTemplatesApi } from '@/lib/api';
import { I18nProvider, getNestedValue } from '@/lib/i18n';
import es from '@/lib/i18n/locales/es.json';
import { WalletStudio } from '@/components/wallet/studio/WalletStudio';
import { persistSessionState } from '@/hooks/useSessionRecovery';
import type { WalletPassStudioState } from '@/components/wallet/types/unified-state';

vi.mock('@/components/wallet/services/export', () => ({
  generatePreviewPass: vi.fn(),
  triggerDownload: vi.fn(),
  openGoogleSaveUrl: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  walletTemplatesApi: {
    create: vi.fn().mockResolvedValue({ data: {} }),
    list: vi.fn().mockResolvedValue({ data: [] }),
    update: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
  programsApi: {
    update: vi.fn().mockResolvedValue({ data: {} }),
    get: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

const RECOVERY_KEY = 'wallet-studio-session-recovery';

function t(key: string, vars?: Record<string, string | number>): string {
  const raw = getNestedValue(es as Record<string, unknown>, key);
  if (typeof raw !== 'string') return key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name: string) =>
    name in vars ? String(vars[name]) : m
  );
}

function seedDraft(): void {
  persistSessionState({ name: 'draft-before-save' } as unknown as WalletPassStudioState);
}

function draftPresent(): boolean {
  return localStorage.getItem(RECOVERY_KEY) !== null;
}

function twinDraftWrites(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls
    .map((call) => String(call[0]))
    .filter((k) => k.startsWith('wallet-studio-draft-'));
}

function renderStudio(props: {
  onSave?: (state: WalletPassStudioState) => void | Promise<void>;
} = {}) {
  return render(
    <I18nProvider>
      <WalletStudio {...props} />
    </I18nProvider>
  );
}

function clickSave(): void {
  fireEvent.click(screen.getByRole('button', { name: t('wallet.studio.toolbar.save') }));
}

describe('WalletStudio honest save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.innerWidth = 1280;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('clears the crash draft and reports saved only after an async onSave resolves', async () => {
    seedDraft();
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderStudio({ onSave });

    clickSave();
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(draftPresent()).toBe(false));
    expect(screen.getByText(/Guardado/)).toBeDefined();
  });

  it('keeps the crash draft and reports error when onSave rejects', async () => {
    seedDraft();
    const onSave = vi.fn().mockRejectedValue(new Error('network down'));
    renderStudio({ onSave });

    clickSave();
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    // draft must survive the failed persist — that is the whole point of it
    expect(draftPresent()).toBe(true);
    expect(screen.queryByText(/Guardado/)).toBeNull();
  });

  it('never destroys the crash draft when there is no persist target', () => {
    seedDraft();
    renderStudio();

    clickSave();
    expect(draftPresent()).toBe(true);
    expect(screen.queryByText(/Guardado/)).toBeNull();
  });

  it('never claims saved for a synchronous local-only onSave', () => {
    seedDraft();
    const onSave = vi.fn((state: WalletPassStudioState) => {
      // wizard pages accept state into React only — not a persist
      void state;
    });
    renderStudio({ onSave });

    clickSave();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(draftPresent()).toBe(true);
    expect(screen.queryByText(/Guardado/)).toBeNull();
  });

  it('save-as-template never wipes the program crash draft', async () => {
    seedDraft();
    renderStudio();

    fireEvent.click(screen.getByTestId('toolbar-save-template-btn'));
    fireEvent.change(screen.getByTestId('template-name-input'), {
      target: { value: 'Mi plantilla' },
    });
    fireEvent.click(screen.getByTestId('template-save-btn'));

    // Wait until the create request is out, then let the rest of the
    // handler settle — a trailing clearRecovery() lands in that window.
    await waitFor(() => expect(walletTemplatesApi.create).toHaveBeenCalledTimes(1));
    await act(async () => {
      await Promise.resolve();
    });
    expect(draftPresent()).toBe(true);
    expect(screen.queryByText(/Guardado/)).toBeNull();
  });

  it('never paints a false Guardado from local draft writes alone', () => {
    vi.useFakeTimers();
    renderStudio();

    // the old useAutoSave interval used to write localStorage and paint
    // "Guardado: HH:MM" after 30s without any API call
    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(screen.queryByText(/Guardado/)).toBeNull();
  });

  it('keeps exactly one draft key — no wallet-studio-draft-* twin', () => {
    vi.useFakeTimers();
    const setItem = vi.spyOn(localStorage, 'setItem');
    seedDraft(); // positive control: the spy must see the real draft write
    expect(setItem.mock.calls.map((c) => String(c[0]))).toContain(RECOVERY_KEY);

    renderStudio();
    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(twinDraftWrites(setItem)).toHaveLength(0);
    setItem.mockRestore();
  });
});
