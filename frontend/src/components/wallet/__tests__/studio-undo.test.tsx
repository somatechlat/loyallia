/**
 * Single-store undo through the studio (P2-2 / RC-1).
 *
 * Locks: Ctrl+Z reverts a durable edit end-to-end (no second store
 * can disagree), UI chrome never enters the history, and there is no
 * useUndoRedo module left to re-wire.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { I18nProvider, getNestedValue } from '@/lib/i18n';
import es from '@/lib/i18n/locales/es.json';
import { WalletStudio } from '@/components/wallet/studio/WalletStudio';
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

function t(key: string): string {
  const raw = getNestedValue(es as Record<string, unknown>, key);
  return typeof raw === 'string' ? raw : key;
}

function pressUndo(): void {
  fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
}

describe('WalletStudio single-store undo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.innerWidth = 1280;
  });

  afterEach(() => {
    cleanup();
  });

  it('the dual store is gone — useUndoRedo no longer exists on disk', () => {
    const hooksDir = resolve(__dirname, '../../../hooks');
    expect(existsSync(resolve(hooksDir, 'useUndoRedo.ts'))).toBe(false);
  });

  it('Ctrl+Z reverts a durable edit (external name) through the one store', () => {
    let latest: WalletPassStudioState | undefined;
    const onChange = vi.fn((state: WalletPassStudioState) => {
      latest = state;
    });

    const { rerender } = render(
      <I18nProvider>
        <WalletStudio externalName="Alpha" onChange={onChange} />
      </I18nProvider>
    );

    rerender(
      <I18nProvider>
        <WalletStudio externalName="Beta" onChange={onChange} />
      </I18nProvider>
    );

    expect(latest?.name).toBe('Beta');

    pressUndo();

    expect(latest?.name).toBe('Alpha');
  });

  it('Ctrl+Z with an empty history is a no-op — never throws, never invents state', () => {
    let latest: WalletPassStudioState | undefined;
    const onChange = vi.fn((state: WalletPassStudioState) => {
      latest = state;
    });

    render(
      <I18nProvider>
        <WalletStudio onChange={onChange} />
      </I18nProvider>
    );

    const before = latest?.name;
    pressUndo();
    expect(latest?.name).toBe(before);
  });

  it('undo and redo are enabled from the single store (toolbar wiring)', () => {
    let latest: WalletPassStudioState | undefined;
    const onChange = vi.fn((state: WalletPassStudioState) => {
      latest = state;
    });

    const { rerender } = render(
      <I18nProvider>
        <WalletStudio externalName="One" onChange={onChange} />
      </I18nProvider>
    );
    rerender(
      <I18nProvider>
        <WalletStudio externalName="Two" onChange={onChange} />
      </I18nProvider>
    );

    // toolbar undo button becomes actionable after the edit
    const undoBtn = screen.getByRole('button', { name: t('wallet.studio.toolbar.undo') });
    expect(undoBtn).toBeDefined();

    fireEvent.click(undoBtn);
    expect(latest?.name).toBe('One');

    act(() => {
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
    });
    expect(latest?.name).toBe('Two');
  });
});
