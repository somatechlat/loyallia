'use client';

import { useMemo, useCallback } from 'react';
import { WalletStudio } from '@/components/wallet/studio/WalletStudio';
import { migrateV1ToV2 } from '@/components/wallet/migrations/v1-to-v2';
import { migrateV2ToV1 } from '@/components/wallet/migrations/v2-to-v1';
import type { WalletDesignState } from '@/components/wallet/types-v1';
import type { WalletPassStudioState } from '@/components/wallet/types';

export interface WalletStudioIntegrationProps {
  cardType: string;
  state: WalletDesignState;
  onChange: (state: WalletDesignState) => void;
  provider: 'apple' | 'google';
}

export function WalletStudioIntegration({ cardType, state, onChange }: WalletStudioIntegrationProps) {
  const v2State = useMemo(() => migrateV1ToV2(state), [state]);

  const handleSave = useCallback((studioState: WalletPassStudioState) => {
    const v1State = migrateV2ToV1(studioState);
    onChange(v1State);
  }, [onChange]);

  return (
    <WalletStudio
      initialState={v2State}
      onSave={handleSave}
      onSaveAsTemplate={(s) => console.log('Save as template', s)}
    />
  );
}
