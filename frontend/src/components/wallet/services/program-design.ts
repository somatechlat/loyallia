/**
 * Persist a wallet design onto its program.
 *
 * The Design page had no save path at all; this is the one place that
 * merges designer metadata over whatever the program already carries.
 */

import { programsApi } from '@/lib/api';
import { buildWalletDesignMetadata } from '@/components/wallet/serialization';
import type { WalletPassStudioState } from '@/components/wallet/types/unified-state';

export async function persistProgramDesign(
  programId: string,
  state: WalletPassStudioState,
  existingMetadata: Record<string, unknown>
): Promise<void> {
  const walletMeta = buildWalletDesignMetadata(state);
  await programsApi.update(programId, {
    metadata: { ...existingMetadata, ...walletMeta },
  });
}
