/**
 * Persisting a wallet design onto a program (U2 — Design page had no save path).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { persistProgramDesign } from '@/components/wallet/services/program-design';
import { programsApi } from '@/lib/api';
import { buildWalletDesignMetadata } from '@/components/wallet/serialization';
import { createDefaultState } from '@/hooks/useWalletStudio';
import type { WalletPassStudioState } from '@/components/wallet/types/unified-state';

vi.mock('@/lib/api', () => ({
  programsApi: {
    update: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

describe('persistProgramDesign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PATCHes the program with wallet metadata merged over existing metadata', async () => {
    const state = {
      ...createDefaultState(),
      name: 'Tarjeta Café',
    } as WalletPassStudioState;

    await persistProgramDesign('prog-1', state, { locale: 'es', theme: 'dark' });

    expect(programsApi.update).toHaveBeenCalledTimes(1);
    const [id, payload] = (programsApi.update as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(id).toBe('prog-1');
    expect(payload.metadata.locale).toBe('es');
    expect(payload.metadata.theme).toBe('dark');
    expect(payload.metadata.wallet_studio).toEqual(
      buildWalletDesignMetadata(state).wallet_studio
    );
    expect(payload.metadata.wallet_provider).toBe('both');
  });

  it('lets wallet keys win over stale existing metadata', async () => {
    const state = { ...createDefaultState(), name: 'Nuevo' } as WalletPassStudioState;

    await persistProgramDesign('prog-2', state, {
      wallet_studio: { name: 'Viejo' },
      keep: 1,
    });

    const [, payload] = (programsApi.update as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(payload.metadata.keep).toBe(1);
    expect(payload.metadata.wallet_studio.name).toBe('Nuevo');
  });

  it('propagates API failures so the caller can keep the local draft', async () => {
    (programsApi.update as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('boom')
    );
    const state = createDefaultState() as WalletPassStudioState;

    await expect(persistProgramDesign('prog-3', state, {})).rejects.toThrow('boom');
  });
});
